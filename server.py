import os, sqlite3, json, hmac, hashlib
from datetime import datetime
from contextlib import asynccontextmanager
from urllib.parse import parse_qs, unquote

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, Response

load_dotenv()

BOT_TOKEN = os.getenv('BOT_TOKEN', '')
ADMIN_IDS = [int(x.strip()) for x in os.getenv('ADMIN_IDS', '0').split(',') if x.strip()]
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///data/shop.db')

# ============================================================
# Database
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'data', 'shop.db')
os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA foreign_keys=ON')
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon TEXT DEFAULT 'folder',
            sort INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            subtitle TEXT DEFAULT '',
            description TEXT DEFAULT '',
            price REAL NOT NULL,
            old_price REAL,
            category_id INTEGER REFERENCES categories(id),
            icon TEXT DEFAULT 'package',
            badge TEXT DEFAULT '',
            delivery_type TEXT DEFAULT 'text',
            content TEXT DEFAULT '',
            active INTEGER DEFAULT 1,
            sort INTEGER DEFAULT 0,
            sales INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS stock_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER REFERENCES products(id),
            value TEXT NOT NULL,
            sold INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            first_name TEXT DEFAULT '',
            username TEXT DEFAULT '',
            photo_url TEXT DEFAULT '',
            is_banned INTEGER DEFAULT 0,
            spent REAL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            total REAL NOT NULL,
            discount REAL DEFAULT 0,
            promo_code TEXT DEFAULT '',
            invoice_id TEXT DEFAULT '',
            pay_url TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER REFERENCES orders(id),
            product_id INTEGER,
            name TEXT,
            price REAL,
            qty INTEGER,
            delivery TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_name TEXT DEFAULT '',
            text TEXT NOT NULL,
            rating INTEGER DEFAULT 5,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
        CREATE TABLE IF NOT EXISTS promos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            percent INTEGER NOT NULL,
            max_uses INTEGER DEFAULT 0,
            used INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1
        );
        INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_name', 'HOMONOVSKI MARKET');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('tagline', 'разработка под ключ');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('currency_symbol', '$');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('support', '@homonovski');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('webapp_url', '');
    ''')
    conn.commit()
    conn.close()

init_db()

# Migration: add status column to reviews if missing
conn = get_db()
try:
    conn.execute("ALTER TABLE reviews ADD COLUMN status TEXT DEFAULT 'active'")
    conn.commit()
except:
    pass
conn.close()

# ============================================================
# Telegram Auth
# ============================================================

def verify_telegram_init(data: str) -> dict:
    if not data or not BOT_TOKEN:
        return {'id': 0, 'first_name': 'Guest'}
    params = parse_qs(data)
    result = {}
    for k, v in params.items():
        if k != 'hash':
            result[k] = unquote(v[0]) if v else ''
    check_str = '\n'.join(f'{k}={v}' for k, v in sorted(result.items()))
    secret = hmac.new(b'WebAppData', BOT_TOKEN.encode(), hashlib.sha256).digest()
    sig = hmac.new(secret, check_str.encode(), hashlib.sha256).hexdigest()
    if sig != params.get('hash', [''])[0]:
        return {'id': 0, 'first_name': 'Guest'}
    user_raw = params.get('user', [None])[0]
    if user_raw:
        try:
            return json.loads(unquote(user_raw))
        except:
            pass
    return {'id': 0, 'first_name': 'Guest'}

# ============================================================
# FastAPI
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.exception_handler(Exception)
async def global_handler(request, exc):
    return JSONResponse({'error': str(exc)}, status_code=500)

# ============================================================
# Helpers
# ============================================================

def get_setting(key):
    conn = get_db()
    row = conn.execute('SELECT value FROM settings WHERE key = ?', (key,)).fetchone()
    conn.close()
    return row[0] if row else ''

def get_settings():
    conn = get_db()
    rows = conn.execute('SELECT key, value FROM settings').fetchall()
    conn.close()
    return {r['key']: r['value'] for r in rows}

async def get_user(request: Request):
    init_data = request.headers.get('X-Init-Data', '')
    user_data = verify_telegram_init(init_data)
    uid = user_data.get('id', 0)
    if not uid:
        raise HTTPException(401, 'Unauthorized')
    conn = get_db()
    existing = conn.execute('SELECT * FROM users WHERE id = ?', (uid,)).fetchone()
    if not existing:
        conn.execute('INSERT OR IGNORE INTO users (id, first_name, username, photo_url) VALUES (?, ?, ?, ?)',
                     (uid, user_data.get('first_name', ''), user_data.get('username', ''), user_data.get('photo_url', '')))
        conn.commit()
    else:
        if existing['is_banned']:
            conn.close()
            raise HTTPException(403, 'Доступ заблокирован')
    conn.close()
    return user_data

# ============================================================
# Auth
# ============================================================

@app.post('/api/auth')
async def auth(request: Request):
    user_data = await get_user(request)
    uid = user_data.get('id', 0)
    s = get_settings()
    return {
        'user': {'id': uid, 'first_name': user_data.get('first_name', ''), 'username': user_data.get('username', ''),
                 'photo_url': user_data.get('photo_url', '')},
        'is_admin': uid in ADMIN_IDS,
        'settings': s,
    }

# ============================================================
# Shop
# ============================================================

@app.get('/api/shop')
async def shop():
    conn = get_db()
    cats = conn.execute('SELECT * FROM categories ORDER BY sort').fetchall()
    prods = conn.execute('SELECT * FROM products WHERE active=1 ORDER BY sort').fetchall()
    conn.close()
    return {
        'categories': [dict(c) for c in cats],
        'products': [dict(p) for p in prods],
        'settings': get_settings(),
    }

# ============================================================
# Promo
# ============================================================

@app.post('/api/promo/check')
async def promo_check(body: dict, request: Request):
    await get_user(request)
    code = body.get('code', '').strip().upper()
    conn = get_db()
    p = conn.execute('SELECT * FROM promos WHERE code=? AND active=1', (code,)).fetchone()
    conn.close()
    if not p:
        raise HTTPException(404, 'Промокод не найден')
    if p['max_uses'] and p['used'] >= p['max_uses']:
        raise HTTPException(400, 'Лимит использования исчерпан')
    return {'code': p['code'], 'percent': p['percent']}

# ============================================================
# Orders
# ============================================================

@app.post('/api/orders')
async def create_order(body: dict, request: Request):
    user_data = await get_user(request)
    uid = user_data.get('id', 0)
    items = body.get('items', [])
    promo_code = body.get('promo')
    if not items:
        raise HTTPException(400, 'Корзина пуста')
    conn = get_db()
    total = 0
    order_items = []
    for item in items:
        p = conn.execute('SELECT * FROM products WHERE id=? AND active=1', (item['id'],)).fetchone()
        if not p:
            conn.close()
            raise HTTPException(404, f'Товар {item["id"]} не найден')
        qty = item.get('qty', 1)
        price = p['price'] * qty
        total += price
        order_items.append({'product_id': p['id'], 'name': p['name'], 'price': p['price'], 'qty': qty})
    discount = 0
    if promo_code:
        p = conn.execute('SELECT * FROM promos WHERE code=? AND active=1', (promo_code.upper(),)).fetchone()
        if p and (not p['max_uses'] or p['used'] < p['max_uses']):
            discount = total * p['percent'] / 100
            conn.execute('UPDATE promos SET used=used+1 WHERE id=?', (p['id'],))
    final = total - discount
    conn.execute('INSERT INTO orders (user_id, status, total, discount, promo_code) VALUES (?,?,?,?,?)',
                 (uid, 'paid', final, discount, promo_code or ''))
    order_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    for oi in order_items:
        conn.execute('INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?,?,?,?,?)',
                     (order_id, oi['product_id'], oi['name'], oi['price'], oi['qty']))
    delivery = []
    for oi in order_items:
        p = conn.execute('SELECT * FROM products WHERE id=?', (oi['product_id'],)).fetchone()
        if p and p['delivery_type'] == 'text' and p['content']:
            delivery.append({'name': p['name'], 'icon': p['icon'], 'qty': oi['qty'],
                            'content': [p['content']]})
            conn.execute('UPDATE products SET sales=sales+? WHERE id=?', (oi['qty'], p['id']))
        elif p and p['delivery_type'] == 'keys':
            keys = conn.execute('SELECT * FROM stock_keys WHERE product_id=? AND sold=0 LIMIT ?',
                                (p['id'], oi['qty'])).fetchall()
            if len(keys) < oi['qty']:
                conn.close()
                raise HTTPException(400, f'Недостаточно ключей для {p["name"]}')
            key_vals = [k['value'] for k in keys]
            for k in keys:
                conn.execute('UPDATE stock_keys SET sold=1 WHERE id=?', (k['id'],))
            delivery.append({'name': p['name'], 'icon': p['icon'], 'qty': oi['qty'], 'content': key_vals})
            conn.execute('UPDATE products SET sales=sales+? WHERE id=?', (oi['qty'], p['id']))
    conn.execute('UPDATE order_items SET delivery=? WHERE order_id=?',
                 (json.dumps(delivery, ensure_ascii=False), order_id))
    conn.execute('UPDATE users SET spent=spent+?, first_name=COALESCE(NULLIF(?,\'\'),first_name) WHERE id=?',
                 (final, user_data.get('first_name', ''), uid))
    conn.commit()
    conn.close()
    return {'id': order_id, 'status': 'paid', 'total': final, 'pay_url': '', 'delivery': delivery}

@app.get('/api/orders/{order_id}')
async def get_order(order_id: int, request: Request):
    await get_user(request)
    conn = get_db()
    o = conn.execute('SELECT * FROM orders WHERE id=?', (order_id,)).fetchone()
    conn.close()
    if not o:
        raise HTTPException(404, 'Заказ не найден')
    items = conn.execute('SELECT * FROM order_items WHERE order_id=?', (order_id,)).fetchall()
    delivery = []
    for item in items:
        if item['delivery']:
            delivery = json.loads(item['delivery'])
    return {'id': o['id'], 'status': o['status'], 'total': o['total'],
            'pay_url': o['pay_url'], 'delivery': delivery,
            'items': [dict(i) for i in items]}

@app.get('/api/my/orders')
async def my_orders(request: Request):
    user_data = await get_user(request)
    uid = user_data.get('id', 0)
    conn = get_db()
    orders = conn.execute('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', (uid,)).fetchall()
    result = []
    for o in orders:
        items = conn.execute('SELECT * FROM order_items WHERE order_id=?', (o['id'],)).fetchall()
        delivery = []
        for item in items:
            if item['delivery']:
                delivery = json.loads(item['delivery'])
        result.append({
            'id': o['id'], 'status': o['status'], 'total': o['total'],
            'pay_url': o['pay_url'], 'created_at': o['created_at'],
            'items': [dict(i) for i in items],
            'delivery': delivery,
        })
    conn.close()
    return {'orders': result}

# ============================================================
# Reviews
# ============================================================

@app.get('/api/reviews')
async def get_reviews():
    conn = get_db()
    rows = conn.execute("SELECT * FROM reviews WHERE status='active' ORDER BY created_at DESC").fetchall()
    conn.close()
    return {'reviews': [dict(r) for r in rows]}

@app.get('/api/my/reviews')
async def get_my_reviews(request: Request):
    user_data = await get_user(request)
    uid = user_data.get('id', 0)
    conn = get_db()
    rows = conn.execute('SELECT * FROM reviews WHERE user_id=? ORDER BY created_at DESC', (uid,)).fetchall()
    conn.close()
    return {'reviews': [dict(r) for r in rows]}

@app.post('/api/reviews')
async def create_review(body: dict, request: Request):
    user_data = await get_user(request)
    uid = user_data.get('id', 0)
    text = body.get('text', '').strip()
    if not text:
        raise HTTPException(400, 'Текст отзыва не может быть пустым')
    rating = min(max(int(body.get('rating', 5)), 1), 5)
    name = user_data.get('first_name', '') or 'Аноним'
    conn = get_db()
    conn.execute('INSERT INTO reviews (user_id, user_name, text, rating, status) VALUES (?,?,?,?,?)',
                 (uid, name, text, rating, 'active'))
    conn.commit()
    conn.close()
    return {'ok': True}

# ============================================================
# Admin
# ============================================================

async def require_admin(request: Request):
    user_data = await get_user(request)
    if user_data.get('id', 0) not in ADMIN_IDS:
        raise HTTPException(403, 'Только для администратора')

@app.get('/api/admin/overview')
async def admin_overview(request: Request):
    await require_admin(request)
    conn = get_db()
    revenue = conn.execute("SELECT COALESCE(SUM(total),0) FROM orders WHERE status='paid'").fetchone()[0]
    rev_today = conn.execute("SELECT COALESCE(SUM(total),0) FROM orders WHERE status='paid' AND date(created_at)=date('now')").fetchone()[0]
    orders_paid = conn.execute("SELECT COUNT(*) FROM orders WHERE status='paid'").fetchone()[0]
    orders_pending = conn.execute("SELECT COUNT(*) FROM orders WHERE status='pending'").fetchone()[0]
    users_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    stock_total = conn.execute("SELECT COUNT(*) FROM stock_keys WHERE sold=0").fetchone()[0]
    products_count = conn.execute("SELECT COUNT(*) FROM products WHERE active=1").fetchone()[0]
    top = conn.execute("SELECT * FROM products WHERE sales>0 ORDER BY sales DESC LIMIT 5").fetchall()
    recent = conn.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 10").fetchall()
    recent_list = []
    for o in recent:
        items = conn.execute("SELECT * FROM order_items WHERE order_id=?", (o['id'],)).fetchall()
        recent_list.append({
            'id': o['id'], 'user_id': o['user_id'], 'total': o['total'],
            'status': o['status'], 'created_at': o['created_at'],
            'username': '', 'items': [{'name': i['name']} for i in items],
        })
    conn.close()
    return {
        'revenue_total': revenue, 'revenue_today': rev_today,
        'orders_paid': orders_paid, 'orders_pending': orders_pending,
        'users_count': users_count, 'stock_total': stock_total,
        'products_count': products_count,
        'top_products': [dict(t) for t in top],
        'recent_orders': recent_list,
    }

@app.get('/api/admin/products')
async def admin_products(request: Request):
    await require_admin(request)
    conn = get_db()
    prods = conn.execute('''SELECT p.*, COALESCE(s.cnt,0) as stock_left
        FROM products p
        LEFT JOIN (SELECT product_id, COUNT(*) as cnt FROM stock_keys WHERE sold=0 GROUP BY product_id) s ON s.product_id=p.id
        ORDER BY p.sort''').fetchall()
    conn.close()
    return {'products': [dict(p) for p in prods]}

@app.post('/api/admin/products')
async def admin_create_product(body: dict, request: Request):
    await require_admin(request)
    conn = get_db()
    cur = conn.execute('''INSERT INTO products (name, subtitle, description, price, old_price, category_id, icon, badge, delivery_type, content, sort, active)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
        (body['name'], body.get('subtitle',''), body.get('description',''), body['price'],
         body.get('old_price'), body.get('category_id'), body.get('icon','package'),
         body.get('badge',''), body.get('delivery_type','text'), body.get('content',''),
         body.get('sort',0), body.get('active',1)))
    pid = cur.lastrowid
    conn.commit()
    conn.close()
    return {'id': pid}

@app.put('/api/admin/products/{pid}')
async def admin_update_product(pid: int, body: dict, request: Request):
    await require_admin(request)
    conn = get_db()
    conn.execute('''UPDATE products SET name=?, subtitle=?, description=?, price=?, old_price=?,
        category_id=?, icon=?, badge=?, delivery_type=?, content=?, sort=?, active=? WHERE id=?''',
        (body['name'], body.get('subtitle',''), body.get('description',''), body['price'],
         body.get('old_price'), body.get('category_id'), body.get('icon','package'),
         body.get('badge',''), body.get('delivery_type','text'), body.get('content',''),
         body.get('sort',0), body.get('active',1), pid))
    conn.commit()
    conn.close()
    return {'ok': True}

@app.delete('/api/admin/products/{pid}')
async def admin_delete_product(pid: int, request: Request):
    await require_admin(request)
    conn = get_db()
    conn.execute('DELETE FROM products WHERE id=?', (pid,))
    conn.execute('DELETE FROM stock_keys WHERE product_id=?', (pid,))
    conn.commit()
    conn.close()
    return {'ok': True}

@app.post('/api/admin/products/{pid}/stock')
async def admin_add_stock(pid: int, body: dict, request: Request):
    await require_admin(request)
    keys = body.get('keys', [])
    conn = get_db()
    for k in keys:
        conn.execute('INSERT INTO stock_keys (product_id, value) VALUES (?,?)', (pid, k))
    conn.commit()
    conn.close()
    return {'added': len(keys)}

@app.get('/api/admin/categories')
async def admin_categories(request: Request):
    await require_admin(request)
    conn = get_db()
    cats = conn.execute('SELECT * FROM categories ORDER BY sort').fetchall()
    conn.close()
    return {'categories': [dict(c) for c in cats]}

@app.post('/api/admin/categories')
async def admin_create_category(body: dict, request: Request):
    await require_admin(request)
    conn = get_db()
    cur = conn.execute('INSERT INTO categories (name, icon, sort) VALUES (?,?,?)',
                       (body['name'], body.get('icon','folder'), body.get('sort',0)))
    conn.commit()
    conn.close()
    return {'id': cur.lastrowid}

@app.put('/api/admin/categories/{cid}')
async def admin_update_category(cid: int, body: dict, request: Request):
    await require_admin(request)
    conn = get_db()
    conn.execute('UPDATE categories SET name=?, icon=?, sort=? WHERE id=?',
                 (body['name'], body.get('icon','folder'), body.get('sort',0), cid))
    conn.commit()
    conn.close()
    return {'ok': True}

@app.delete('/api/admin/categories/{cid}')
async def admin_delete_category(cid: int, request: Request):
    await require_admin(request)
    conn = get_db()
    conn.execute('UPDATE products SET category_id=NULL WHERE category_id=?', (cid,))
    conn.execute('DELETE FROM categories WHERE id=?', (cid,))
    conn.commit()
    conn.close()
    return {'ok': True}

@app.get('/api/admin/orders')
async def admin_orders(request: Request):
    await require_admin(request)
    conn = get_db()
    orders = conn.execute('SELECT * FROM orders ORDER BY created_at DESC').fetchall()
    result = []
    for o in orders:
        items = conn.execute('SELECT * FROM order_items WHERE order_id=?', (o['id'],)).fetchall()
        result.append({
            'id': o['id'], 'user_id': o['user_id'], 'total': o['total'],
            'status': o['status'], 'created_at': o['created_at'],
            'username': '', 'items': [dict(i) for i in items],
            'discount': o['discount'], 'promo_code': o['promo_code'],
        })
    conn.close()
    return {'orders': result}

@app.get('/api/admin/promos')
async def admin_promos(request: Request):
    await require_admin(request)
    conn = get_db()
    promos = conn.execute('SELECT * FROM promos ORDER BY code').fetchall()
    conn.close()
    return {'promos': [dict(p) for p in promos]}

@app.post('/api/admin/promos')
async def admin_create_promo(body: dict, request: Request):
    await require_admin(request)
    conn = get_db()
    try:
        cur = conn.execute('INSERT INTO promos (code, percent, max_uses) VALUES (?,?,?)',
                          (body['code'].upper(), body['percent'], body.get('max_uses', 0)))
        conn.commit()
        conn.close()
        return {'id': cur.lastrowid}
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(400, 'Промокод уже существует')

@app.put('/api/admin/promos/{pid}')
async def admin_update_promo(pid: int, body: dict, request: Request):
    await require_admin(request)
    conn = get_db()
    conn.execute('UPDATE promos SET active=? WHERE id=?', (body.get('active', True), pid))
    conn.commit()
    conn.close()
    return {'ok': True}

@app.delete('/api/admin/promos/{pid}')
async def admin_delete_promo(pid: int, request: Request):
    await require_admin(request)
    conn = get_db()
    conn.execute('DELETE FROM promos WHERE id=?', (pid,))
    conn.commit()
    conn.close()
    return {'ok': True}

@app.get('/api/admin/reviews')
async def admin_reviews(request: Request):
    await require_admin(request)
    conn = get_db()
    rows = conn.execute('SELECT * FROM reviews ORDER BY created_at DESC').fetchall()
    conn.close()
    return {'reviews': [dict(r) for r in rows]}

@app.post('/api/admin/reviews/{rid}/toggle')
async def admin_toggle_review(rid: int, request: Request):
    await require_admin(request)
    conn = get_db()
    r = conn.execute('SELECT * FROM reviews WHERE id=?', (rid,)).fetchone()
    if not r:
        conn.close()
        raise HTTPException(404, 'Отзыв не найден')
    new_status = 'deleted' if r['status'] == 'active' else 'active'
    conn.execute('UPDATE reviews SET status=? WHERE id=?', (new_status, rid))
    conn.commit()
    conn.close()
    return {'ok': True, 'status': new_status}

@app.get('/api/admin/users')
async def admin_users(request: Request):
    await require_admin(request)
    conn = get_db()
    users = conn.execute('''
        SELECT u.*, COALESCE(o.cnt,0) as orders_count
        FROM users u
        LEFT JOIN (SELECT user_id, COUNT(*) as cnt FROM orders WHERE status='paid' GROUP BY user_id) o ON o.user_id=u.id
        ORDER BY u.id''').fetchall()
    conn.close()
    return {'users': [dict(u) for u in users]}

@app.post('/api/admin/users/{uid}/ban')
async def admin_ban_user(uid: int, body: dict, request: Request):
    await require_admin(request)
    conn = get_db()
    conn.execute('UPDATE users SET is_banned=? WHERE id=?', (body.get('banned', True), uid))
    conn.commit()
    conn.close()
    return {'ok': True}

@app.get('/api/admin/settings')
async def admin_get_settings(request: Request):
    await require_admin(request)
    return get_settings()

@app.put('/api/admin/settings')
async def admin_save_settings(body: dict, request: Request):
    await require_admin(request)
    conn = get_db()
    for key in ('shop_name', 'tagline', 'currency_symbol', 'support', 'webapp_url'):
        if key in body:
            conn.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', (key, body[key]))
    conn.commit()
    conn.close()
    return get_settings()

# ============================================================
# Static files (Mini App frontend)
# ============================================================

CACHE_EXTS = {'.html', '.css', '.js'}

@app.middleware('http')
async def static_or_spa(request, call_next):
    path = request.url.path
    if path.startswith('/api/'):
        return await call_next(request)
    if path == '/' or not path:
        resp = FileResponse(os.path.join(BASE_DIR, 'webapp', 'index.html'))
        resp.headers['Cache-Control'] = 'no-cache'
        return resp
    full = os.path.join(BASE_DIR, 'webapp', path.lstrip('/'))
    if os.path.isfile(full):
        resp = FileResponse(full)
        _, ext = os.path.splitext(full)
        if ext.lower() in CACHE_EXTS:
            resp.headers['Cache-Control'] = 'no-cache'
        return resp
    return FileResponse(os.path.join(BASE_DIR, 'webapp', 'index.html'))

# ============================================================
# Entry point
# ============================================================

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 8877))
    uvicorn.run('server:app', host='0.0.0.0', port=port)
