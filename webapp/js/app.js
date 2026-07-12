/* ============================================================
   HOMONOVSKI MARKET — ядро мини-аппа
   ============================================================ */

const tg = window.Telegram ? window.Telegram.WebApp : null;
const IN_TG = !!(tg && tg.initData);
const ADMIN_IDS = [1061012449];

const state = {
  user: null,
  isAdmin: false,
  settings: {},
  categories: [],
  products: [],
  cart: [],
  promo: null,
  activeCat: 0,
  search: '',
  view: 'home',
  myOrders: [],
};

/* ---------- утилиты ---------- */

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function money(v) {
  const sym = state.settings.currency_symbol || '$';
  return sym + Number(v || 0).toFixed(2);
}

function haptic(type = 'light') {
  try {
    if (!tg || !tg.HapticFeedback) return;
    if (type === 'success' || type === 'error' || type === 'warning') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch (e) { /* не критично */ }
}

function toast(text, dark = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (dark ? ' dark' : '');
  el.innerHTML = `${dark ? ic('info', 16) : icDark('check', 16)}<span>${esc(text)}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 2400);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
  }
  haptic('light');
  toast('Скопировано');
}

/* ---------- шторка ---------- */

let sheetCloseCb = null;

function openSheet(html, onClose) {
  sheetCloseCb = onClose || null;
  $('#sheet-content').innerHTML = html;
  $('#sheet').classList.remove('hidden');
  $('#sheet-backdrop').classList.remove('hidden');
  if (IN_TG) { try { tg.BackButton.show(); } catch (e) {} }
  haptic('light');
}

function closeSheet() {
  $('#sheet').classList.add('hidden');
  $('#sheet-backdrop').classList.add('hidden');
  if (IN_TG) { try { tg.BackButton.hide(); } catch (e) {} }
  if (sheetCloseCb) { const cb = sheetCloseCb; sheetCloseCb = null; cb(); }
}

function confirmDialog(text, onYes) {
  openSheet(`
    <div class="center" style="padding:10px 4px">
      <div class="empty-icon" style="margin:0 auto 16px">${ic('circle-alert', 34)}</div>
      <div class="sheet-title" style="margin-bottom:18px">${esc(text)}</div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="cfNo">Отмена</button>
        <button class="btn" id="cfYes">Да</button>
      </div>
    </div>`);
  $('#cfNo').onclick = closeSheet;
  $('#cfYes').onclick = () => { closeSheet(); onYes(); };
}

/* ---------- корзина (localStorage) ---------- */

function cartKey() { return 'hmono_cart_' + (state.user ? state.user.id : 'anon'); }

function loadCart() {
  try { state.cart = JSON.parse(localStorage.getItem(cartKey()) || '[]'); }
  catch (e) { state.cart = []; }
}

function cleanCart() {
  if (!state.products.length) return;
  const before = state.cart.length;
  state.cart = state.cart.filter(i => state.products.some(p => p.id === i.id));
  if (state.cart.length !== before) saveCart();
}

function saveCart() {
  localStorage.setItem(cartKey(), JSON.stringify(state.cart));
  updateNavDot();
}

function cartCount() { return state.cart.reduce((s, i) => s + i.qty, 0); }

function addToCart(productId, qty = 1) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  const existing = state.cart.find((i) => i.id === productId);
  if (p.delivery_type === 'text') {
    if (!existing) state.cart.push({ id: productId, qty: 1 });
  } else {
    const max = p.stock_left ?? 50;
    if (existing) existing.qty = Math.min(existing.qty + qty, max);
    else state.cart.push({ id: productId, qty: Math.min(qty, max) });
  }
  saveCart();
  haptic('medium');
  toast('Добавлено в корзину');
}

/* ---------- навигация ---------- */

const NAV = [
  { id: 'home', icon: 'store', label: 'Магазин' },
  { id: 'reviews', icon: 'message-square', label: 'Отзывы' },
  { id: 'cart', icon: 'shopping-cart', label: 'Корзина' },
  { id: 'profile', icon: 'user-round', label: 'Профиль' },
  { id: 'admin', icon: 'shield-half', label: 'Админ', adminOnly: true },
];

function renderNav() {
  $('#bottomnav').innerHTML = NAV
    .filter((n) => !n.adminOnly || state.isAdmin)
    .map((n) => `
      <button class="nav-item ${state.view === n.id ? 'active' : ''}" data-view="${n.id}">
        ${ic(n.icon, 22, state.view === n.id ? '#f5f5f5' : '#5a5a5a')}
        <span>${n.label}</span>
        ${n.id === 'cart' && cartCount() ? `<b class="nav-dot">${cartCount()}</b>` : ''}
      </button>`)
    .join('');
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.onclick = () => switchView(btn.dataset.view);
  });
}

function updateNavDot() { renderNav(); }

function switchView(view) {
  state.view = view;
  haptic('light');
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $('#view-' + view).classList.add('active');
  $('#marquee').style.display = view === 'home' ? '' : 'none';
  $('#searchBar').classList.toggle('hidden', view !== 'home' || !state.search);
  renderNav();
  if (view === 'home') renderHome();
  if (view === 'cart') renderCart();
  if (view === 'reviews') renderReviews();
  if (view === 'profile') renderProfile();
  if (view === 'admin' && state.isAdmin) Admin.render();
  window.scrollTo({ top: 0 });
}

/* ---------- главная ---------- */

function visibleProducts() {
  let list = state.products;
  if (state.activeCat) list = list.filter((p) => p.category_id === state.activeCat);
  if (state.search) {
    const q = state.search.toLowerCase();
    list = list.filter((p) =>
      (p.name + ' ' + p.subtitle + ' ' + p.description).toLowerCase().includes(q));
  }
  return list;
}

function productCard(p) {
  const out = p.delivery_type === 'keys' && p.stock_left === 0;
  const stockLabel = p.delivery_type === 'keys'
    ? (out ? '<div class="p-stock out">нет в наличии</div>'
           : `<div class="p-stock">в наличии: ${p.stock_left}</div>`)
    : '<div class="p-stock">∞ моментальная выдача</div>';
  return `
    <div class="p-card" data-id="${p.id}" style="${out ? 'opacity:.45' : ''}">
      ${p.badge ? `<div class="p-badge">${esc(p.badge)}</div>` : ''}
      <div class="p-icon">${ic(p.icon, 26)}</div>
      <div>
        <div class="p-name">${esc(p.name)}</div>
        <div class="p-sub">${esc(p.subtitle)}</div>
      </div>
      <div class="p-bottom">
        <div class="p-price">${money(p.price)}</div>
        ${p.old_price ? `<div class="p-old">${money(p.old_price)}</div>` : ''}
      </div>
      ${stockLabel}
    </div>`;
}

function renderHome() {
  const cats = state.categories
    .map((c) => ({ ...c, count: state.products.filter((p) => p.category_id === c.id).length }))
    .filter((c) => c.count > 0);
  const list = visibleProducts();
  $('#view-home').innerHTML = `
    <div class="chips" id="chips">
      <button class="chip ${!state.activeCat ? 'active' : ''}" data-cat="0">
        ${ic('layout-grid', 15, !state.activeCat ? '#000' : '#f5f5f5')} Все
        <span class="count">${state.products.length}</span>
      </button>
      ${cats.map((c) => `
        <button class="chip ${state.activeCat === c.id ? 'active' : ''}" data-cat="${c.id}">
          ${ic(c.icon, 15, state.activeCat === c.id ? '#000' : '#f5f5f5')} ${esc(c.name)}
          <span class="count">${c.count}</span>
        </button>`).join('')}
    </div>
    <div class="section-title">${state.search ? 'Результаты поиска' : 'Каталог'}</div>
    ${list.length
      ? `<div class="grid">${list.map(productCard).join('')}</div>`
      : `<div class="empty">
           <div class="empty-icon">${icMuted('search-x', 36)}</div>
           <div class="empty-title">Ничего не найдено</div>
           <div class="empty-text">Попробуйте изменить запрос или выбрать другую категорию</div>
         </div>`}
  `;
  document.querySelectorAll('#chips .chip').forEach((chip) => {
    chip.onclick = () => { state.activeCat = Number(chip.dataset.cat); haptic('light'); renderHome(); };
  });
  document.querySelectorAll('.p-card').forEach((card) => {
    card.onclick = () => openProduct(Number(card.dataset.id));
  });
}

/* ---------- карточка товара ---------- */

function openProduct(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const cat = state.categories.find((c) => c.id === p.category_id);
  const out = p.delivery_type === 'keys' && p.stock_left === 0;
  const maxQty = p.delivery_type === 'keys' ? p.stock_left : 1;
  let qty = 1;

  const save = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  openSheet(`
    <div class="pd-head">
      <div class="pd-icon">${ic(p.icon, 32)}</div>
      <div>
        <div class="pd-cat">${esc(cat ? cat.name : 'Товар')}</div>
        <div class="sheet-title">${esc(p.name)}</div>
      </div>
    </div>
    <div class="pd-price-row">
      <div class="pd-price">${money(p.price)}</div>
      ${p.old_price ? `<div class="pd-old">${money(p.old_price)}</div><div class="pd-save">−${save}%</div>` : ''}
    </div>
    <div class="pd-desc">${esc(p.description || p.subtitle)}</div>
    ${p.delivery_type === 'keys' && !out ? `
      <div class="qty-row">
        <div>
          <div style="font-weight:600;font-size:13.5px">Количество</div>
          <div class="small muted">в наличии: ${p.stock_left}</div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" id="qMinus">−</button>
          <div class="qty-val" id="qVal">1</div>
          <button class="qty-btn" id="qPlus">+</button>
        </div>
      </div>` : ''}
    ${out
      ? `<button class="btn" disabled>${icDark('package-x', 17)} Нет в наличии</button>`
      : `<div class="btn-row">
           <button class="btn btn-ghost" id="pdCart">${ic('shopping-cart', 17)} В корзину</button>
           <button class="btn" id="pdBuy">${icDark('zap', 17)} Купить <span id="pdTotal">${money(p.price)}</span></button>
         </div>`}
  `);

  if (!out) {
    const refresh = () => {
      const el = $('#qVal'); if (el) el.textContent = qty;
      const t = $('#pdTotal'); if (t) t.textContent = money(p.price * qty);
    };
    const minus = $('#qMinus'), plus = $('#qPlus');
    if (minus) minus.onclick = () => { if (qty > 1) { qty--; haptic('light'); refresh(); } };
    if (plus) plus.onclick = () => { if (qty < maxQty) { qty++; haptic('light'); refresh(); } };
    $('#pdCart').onclick = () => { addToCart(p.id, qty); closeSheet(); };
    $('#pdBuy').onclick = () => buyNow(p.id, qty);
  }
}

/* ---------- оплата ---------- */

async function buyNow(productId, qty) {
  await checkout([{ id: productId, qty }], null);
}

async function checkout(items, promoCode) {
  const subtotal = items.reduce((s, i) => {
    const p = state.products.find(x => x.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);
  const percent = state.promo ? state.promo.percent : 0;
  const discount = subtotal * percent / 100;
  const total = subtotal - discount;

  openSheet(`
    <div class="pay-wait" style="padding:18px 6px 10px">
      <div class="empty-icon" style="margin:0 auto">${icMuted('wallet', 36)}</div>
      <div class="sheet-title">Способ оплаты</div>
      <div class="muted small" style="margin-bottom:14px">Итого: <b>${money(total)}</b></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn" id="payCard" style="width:100%">${icDark('credit-card', 17)} Банковская карта</button>
        <button class="btn" id="paySbp" style="width:100%">${icDark('smartphone', 17)} СБП (QR-код)</button>
      </div>
      <button class="btn btn-ghost btn-sm" id="payMethodCancel" style="margin-top:12px">Отмена</button>
    </div>`);
  haptic('light');

  $('#payMethodCancel').onclick = closeSheet;
  $('#payCard').onclick = () => createPayment(items, promoCode, 'bank_card');
  $('#paySbp').onclick = () => createPayment(items, promoCode, 'sbp');
}

async function createPayment(items, promoCode, method) {
  openSheet(`
    <div class="pay-wait" style="padding:22px 6px 10px">
      <div class="empty-icon" style="margin:0 auto">${icMuted('loader', 36)}</div>
      <div class="sheet-title">Создаём платёж…</div>
      <div class="muted small">Подождите, идёт запрос к ЮKassa</div>
    </div>`);
  haptic('light');

  try {
    const data = await API.post('/api/pay/create', { items, promo: promoCode, payment_method: method });
    const orderId = data.order_id;
    const confirmUrl = data.confirmation_url;

    if (method === 'bank_card') {
      openSheet(`
        <div class="pay-wait" style="padding:18px 6px 10px">
          <div class="empty-icon" style="margin:0 auto">${icMuted('credit-card', 36)}</div>
          <div class="sheet-title">Оплата картой</div>
          <div class="muted small" style="max-width:280px;margin-bottom:10px">
            Нажмите кнопку ниже, чтобы перейти на страницу оплаты
          </div>
          <div style="font-size:14px;margin-bottom:6px;color:#aaa">Заказ <span class="mono">#${orderId}</span> · ${money(data.total)}</div>
          <button class="btn" id="payOpen">${icDark('external-link', 17)} Перейти к оплате</button>
          <button class="btn btn-ghost" id="payCheck">${ic('refresh-cw', 17)} Проверить оплату</button>
          <button class="btn btn-ghost btn-sm" id="payCancel">Отмена</button>
        </div>`);
    } else {
      openSheet(`
        <div class="pay-wait" style="padding:18px 6px 10px">
          <div class="empty-icon" style="margin:0 auto">${icMuted('smartphone', 36)}</div>
          <div class="sheet-title">Оплата через СБП</div>
          <div class="muted small" style="max-width:280px;margin-bottom:10px">
            Отсканируйте QR-код в приложении банка или нажмите кнопку ниже
          </div>
          <div style="font-size:14px;margin-bottom:6px;color:#aaa">Заказ <span class="mono">#${orderId}</span> · ${money(data.total)}</div>
          <button class="btn" id="payOpen">${icDark('external-link', 17)} Открыть страницу оплаты</button>
          <button class="btn btn-ghost" id="payCheck">${ic('refresh-cw', 17)} Проверить оплату</button>
          <button class="btn btn-ghost btn-sm" id="payCancel">Отмена</button>
        </div>`);
    }
    haptic('success');

    $('#payOpen').onclick = () => openPayUrl(confirmUrl);

    let polling = true;
    const poll = async () => {
      if (!polling) return;
      try {
        const result = await API.get('/api/pay/status/' + orderId);
        if (result.status === 'paid') {
          polling = false;
          afterPaid(result);
          return;
        }
      } catch (e) { /* retry */ }
      if (polling) setTimeout(poll, 3000);
    };
    setTimeout(poll, 4000);

    $('#payCheck').onclick = async () => {
      try {
        const result = await API.get('/api/pay/status/' + orderId);
        if (result.status === 'paid') {
          polling = false;
          afterPaid(result);
        } else {
          toast('Оплата ещё не поступила', true);
        }
      } catch (e) {
        toast(e.message, true);
      }
    };

    $('#payCancel').onclick = () => { polling = false; closeSheet(); };

  } catch (e) {
    haptic('error');
    const support = (state.settings.support || '@homonovski').replace('@', '');
    openSheet(`
      <div class="pay-wait" style="padding:22px 6px 10px">
        <div class="empty-icon" style="margin:0 auto">${icMuted('circle-alert', 36)}</div>
        <div class="sheet-title">Ошибка оплаты</div>
        <div class="muted small" style="max-width:280px">${esc(e.message)}</div>
        <button class="btn" id="payErrSupport">${icDark('send', 17)} Написать @${support}</button>
        <button class="btn btn-ghost btn-sm" id="payErrClose">Закрыть</button>
      </div>`);
    $('#payErrSupport').onclick = () => {
      copyText(`Здравствуйте! Проблема с оплатой: ${e.message}`);
      openPayUrl('https://t.me/' + support);
      closeSheet();
    };
    $('#payErrClose').onclick = closeSheet;
  }
}

function openPayUrl(url) {
  if (IN_TG && /^https:\/\/t\.me\//.test(url)) {
    try { tg.openTelegramLink(url); return; } catch (e) { /* fallback ниже */ }
  }
  window.open(url, '_blank');
}



function deliveryBlock(order) {
  if (!order.delivery) return '';
  return order.delivery.map((d) => `
    <div class="delivery-box">
      <div class="dl-name">${ic(d.icon, 13, '#8f8f8f')} ${esc(d.name)} ×${d.qty}</div>
      ${d.content.map((c) => `
        <div class="dl-key">
          <span>${esc(c)}</span>
          <button class="dl-copy" data-copy="${esc(c)}">${ic('copy', 14)}</button>
        </div>`).join('')}
    </div>`).join('');
}

function bindCopyButtons(root) {
  (root || document).querySelectorAll('[data-copy]').forEach((btn) => {
    btn.onclick = (e) => { e.stopPropagation(); copyText(btn.dataset.copy); };
  });
}

function afterPaid(order) {
  state.cart = [];
  state.promo = null;
  saveCart();
  haptic('success');
  refreshShop();
  openSheet(`
    <div class="pay-wait" style="padding-bottom:8px">
      <div class="success-burst">${icDark('check', 40)}</div>
      <div class="sheet-title">Оплачено!</div>
      <div class="muted small">Заказ <span class="mono">#${order.id}</span> · ${money(order.total)}<br>Ваш товар ниже — он также сохранён в профиле</div>
    </div>
    <div id="successDelivery">${deliveryBlock(order)}</div>
    <button class="btn mt16" id="successOk">${icDark('check', 17)} Отлично</button>
  `);
  bindCopyButtons($('#successDelivery'));
  $('#successOk').onclick = () => { closeSheet(); switchView('profile'); };
}

/* ---------- корзина ---------- */

function renderCart() {
  cleanCart();
  const view = $('#view-cart');
  if (!state.cart.length) {
    view.innerHTML = `
      <div class="empty" style="padding-top:90px">
        <div class="empty-icon">${icMuted('shopping-cart', 36)}</div>
        <div class="empty-title">Корзина пуста</div>
        <div class="empty-text">Добавьте товары из каталога</div>
        <button class="btn btn-sm" id="goShop" style="width:auto">${icDark('store', 15)} В каталог</button>
      </div>`;
    $('#goShop').onclick = () => switchView('home');
    return;
  }

  const rows = state.cart.map((item) => {
    const p = state.products.find((x) => x.id === item.id);
    if (!p) return '';
    return `
      <div class="cart-item" data-id="${p.id}">
        <div class="ci-icon">${ic(p.icon, 22)}</div>
        <div class="ci-info">
          <div class="ci-name">${esc(p.name)}</div>
          <div class="ci-price">${money(p.price)} ${p.delivery_type === 'keys' ? '· шт' : ''}</div>
        </div>
        <div class="ci-actions">
          ${p.delivery_type === 'keys' ? `
            <button class="ci-btn" data-act="minus">−</button>
            <div class="ci-qty">${item.qty}</div>
            <button class="ci-btn" data-act="plus">+</button>` : ''}
          <button class="ci-btn" data-act="remove">${ic('trash-2', 13)}</button>
        </div>
      </div>`;
  }).join('');

  const subtotal = state.cart.reduce((s, item) => {
    const p = state.products.find((x) => x.id === item.id);
    return s + (p ? p.price * item.qty : 0);
  }, 0);
  const percent = state.promo ? state.promo.percent : 0;
  const discount = subtotal * percent / 100;
  const total = subtotal - discount;

  view.innerHTML = `
    <div class="section-title">Корзина · ${cartCount()}</div>
    ${rows}
    <div class="promo-row">
      <input type="text" id="promoInput" placeholder="ПРОМОКОД"
        value="${state.promo ? esc(state.promo.code) : ''}" ${state.promo ? 'disabled' : ''}>
      <button class="btn btn-sm" id="promoBtn" style="width:auto">
        ${state.promo ? icDark('x', 15) : icDark('ticket-percent', 15)} ${state.promo ? 'Убрать' : 'Применить'}
      </button>
    </div>
    <div class="totals">
      <div class="t-row"><span>Товары</span><span>${money(subtotal)}</span></div>
      ${percent ? `<div class="t-row"><span>Скидка ${percent}% (${esc(state.promo.code)})</span><span>−${money(discount)}</span></div>` : ''}
      <div class="t-row total"><span>Итого</span><span>${money(total)}</span></div>
    </div>
    ${`<button class="btn" id="checkoutBtn">${icDark('wallet', 17)} Оплатить</button>`}
  `;

  document.querySelectorAll('.cart-item').forEach((row) => {
    const id = Number(row.dataset.id);
    row.querySelectorAll('.ci-btn').forEach((btn) => {
      btn.onclick = () => {
        const item = state.cart.find((i) => i.id === id);
        const p = state.products.find((x) => x.id === id);
        if (!item) return;
        if (btn.dataset.act === 'plus') item.qty = Math.min(item.qty + 1, p?.stock_left ?? 50);
        if (btn.dataset.act === 'minus') item.qty = Math.max(1, item.qty - 1);
        if (btn.dataset.act === 'remove') state.cart = state.cart.filter((i) => i.id !== id);
        haptic('light');
        saveCart();
        renderCart();
      };
    });
  });

  $('#promoBtn').onclick = async () => {
    if (state.promo) {
      state.promo = null;
      renderCart();
      return;
    }
    const code = $('#promoInput').value.trim().toUpperCase();
    if (!code) { toast('Введите промокод', true); return; }
    try {
      state.promo = await API.post('/api/promo/check', { code });
      haptic('success');
      toast(`Промокод применён: −${state.promo.percent}%`);
      renderCart();
    } catch (e) {
      haptic('error');
      toast(e.message, true);
    }
  };

  const checkoutBtn = $('#checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      checkout(state.cart.map((i) => ({ id: i.id, qty: i.qty })),
               state.promo ? state.promo.code : null);
    };
  }
}

/* ---------- отзывы ---------- */

function starsHTML(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < rating ? 'filled' : ''}">★</span>`
  ).join('');
}

async function renderReviews() {
  const view = $('#view-reviews');
  view.innerHTML = `
    <div class="section-title">Отзывы</div>
    <div id="reviewsList"><div class="skeleton" style="height:74px;margin-bottom:9px"></div></div>
    <button class="btn mt16" id="addReviewBtn">${icDark('message-square-plus', 17)} Оставить отзыв</button>
  `;

  let publicReviews = [];
  let myReviews = [];
  try {
    const data = await API.get('/api/reviews');
    publicReviews = data.reviews || [];
  } catch (e) { /* server недоступен */ }
  try {
    const data = await API.get('/api/my/reviews');
    myReviews = data.reviews || [];
  } catch (e) { /* ignore */ }
  const myIds = new Set(myReviews.filter(r => r.status === 'deleted').map(r => r.id));
  const reviews = publicReviews.map(r => ({ ...r, _mine: false, _deleted: false }))
    .concat(myReviews.filter(r => r.status === 'deleted').map(r => ({ ...r, _mine: true, _deleted: true })))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const list = $('#reviewsList');
  if (!reviews.length) {
    list.innerHTML = `
      <div class="empty" style="padding:32px 20px">
        <div class="empty-icon">${icMuted('message-square', 32)}</div>
        <div class="empty-text">Отзывов пока нет — будьте первым!</div>
      </div>`;
  } else {
    list.innerHTML = reviews.map((r, i) => `
      <div class="review-card ${r._deleted ? 'review-deleted' : ''}" style="animation-delay:${i * .05}s">
        <div class="rc-head">
          <div class="rc-avatar">${esc((r.user_name || 'A').slice(0, 1).toUpperCase())}</div>
          <div>
            <div class="rc-name">${esc(r.user_name || 'Аноним')}</div>
            <div class="rc-date">${new Date(r.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
          <div class="rc-stars">${starsHTML(r.rating)}</div>
        </div>
        <div class="rc-text">${esc(r.text)}</div>
        ${r._deleted ? '<div class="rc-deleted-note">✕ Отзыв скрыт администратором</div>' : ''}
      </div>`).join('');
  }

  $('#addReviewBtn').onclick = () => {
    let rating = 5;
    openSheet(`
      <div class="sheet-title mb16">Оставить отзыв</div>
      <div class="field">
        <label>Оценка</label>
        <div class="rating-select" id="ratingSelect">
          ${[1,2,3,4,5].map(i => `<span class="star-rating" data-r="${i}">★</span>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Текст отзыва</label>
        <textarea id="reviewText" rows="4" placeholder="Напишите, что вам понравилось…" style="font-family:var(--font-text)"></textarea>
      </div>
      <button class="btn" id="reviewSubmit">${icDark('send', 17)} Отправить</button>
    `);

    document.querySelectorAll('.star-rating').forEach(el => {
      el.onclick = () => {
        rating = Number(el.dataset.r);
        document.querySelectorAll('.star-rating').forEach((s, idx) => {
          s.classList.toggle('filled', idx < rating);
        });
      };
    });
    document.querySelectorAll('.star-rating').forEach((s, idx) => {
      if (idx < rating) s.classList.add('filled');
    });

    $('#reviewSubmit').onclick = async () => {
      const text = $('#reviewText').value.trim();
      if (!text) { toast('Напишите текст отзыва', true); return; }
      try {
        await API.post('/api/reviews', { text, rating });
        haptic('success');
        toast('Спасибо за отзыв!');
        closeSheet();
        renderReviews();
      } catch (e) {
        haptic('error');
        toast(e.message, true);
      }
    };
  };
}

/* ---------- профиль ---------- */

function statusBadge(s) {
  const map = { paid: 'Оплачен', pending: 'Ожидает', expired: 'Истёк' };
  return `<span class="status ${s}">${map[s] || s}</span>`;
}

async function renderProfile() {
  const view = $('#view-profile');
  const u = state.user || {};
  const initial = (u.first_name || 'U').slice(0, 1).toUpperCase();
  view.innerHTML = `
    <div class="profile-card">
      <div class="avatar">${u.photo_url ? `<img src="${esc(u.photo_url)}" alt="">` : initial}</div>
      <div>
        <div class="profile-name">${esc(u.first_name || 'Гость')} ${state.isAdmin ? ic('badge-check', 16) : ''}</div>
        <div class="profile-sub">${u.username ? '@' + esc(u.username) : 'ID ' + u.id}</div>
      </div>
    </div>
    <div class="section-title">Мои покупки</div>
    <div id="ordersList">
      <div class="skeleton" style="height:74px;margin-bottom:9px"></div>
      <div class="skeleton" style="height:74px"></div>
    </div>
    <div class="section-title">Поддержка</div>
    <button class="btn btn-ghost" id="supportBtn">${ic('message-circle', 17)} Написать в поддержку</button>
  `;

  $('#supportBtn').onclick = () => {
    const support = (state.settings.support || 'homonovski').replace('@', '');
    if (support) openPayUrl('https://t.me/' + support);
  };

  let orders = [];
  try {
    orders = (await API.get('/api/my/orders')).orders;
    state.myOrders = orders;
  } catch (e) {
    $('#ordersList').innerHTML = `<div class="empty-text muted center">${esc(e.message)}</div>`;
    return;
  }

  if (!orders.length) {
    $('#ordersList').innerHTML = `
      <div class="empty" style="padding:28px 20px">
        <div class="empty-icon">${icMuted('package-open', 32)}</div>
        <div class="empty-text">Покупок пока нет — самое время выбрать что-нибудь в каталоге</div>
      </div>`;
    return;
  }

  $('#ordersList').innerHTML = orders.map((o, oi) => `
    <div class="order-card" data-id="${o.id}" style="animation-delay:${oi * .05}s">
      <div class="oc-head">
        <div>
          <span class="oc-id">#${o.id} · ${new Date(o.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          <div class="oc-total">${money(o.total)}</div>
        </div>
        ${statusBadge(o.status)}
      </div>
      <div class="oc-items">${o.items.map((i) => `${esc(i.name)} ×${i.qty}`).join(' · ')}</div>
      <div class="oc-body" data-body="${o.id}">
        ${o.status === 'paid' ? deliveryBlock(o) : ''}
        ${o.status === 'pending' && o.pay_url ? `
          <div class="btn-row mt8">
            <button class="btn btn-ghost btn-sm" data-check="${o.id}">${ic('refresh-cw', 14)} Проверить</button>
            <button class="btn btn-sm" data-pay="${esc(o.pay_url)}">${icDark('wallet', 14)} Оплатить</button>
          </div>` : ''}
      </div>
    </div>`).join('');

  bindCopyButtons($('#ordersList'));
  document.querySelectorAll('[data-pay]').forEach((btn) => {
    btn.onclick = () => openPayUrl(btn.dataset.pay);
  });
  document.querySelectorAll('[data-check]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const order = await API.get('/api/orders/' + btn.dataset.check);
        if (order.status === 'paid') { afterPaid(order); renderProfile(); }
        else { toast(order.status === 'expired' ? 'Счёт истёк' : 'Оплата пока не поступила', true); renderProfile(); }
      } catch (e) { toast(e.message, true); btn.disabled = false; }
    };
  });
}

/* ---------- поиск ---------- */

function initSearch() {
  $('#searchBtn').innerHTML = ic('search', 19);
  $('#searchIcon').innerHTML = icMuted('search', 17);
  $('#searchBtn').onclick = () => {
    if (state.view !== 'home') switchView('home');
    const bar = $('#searchBar');
    bar.classList.toggle('hidden');
    if (!bar.classList.contains('hidden')) $('#searchInput').focus();
    else { state.search = ''; $('#searchInput').value = ''; renderHome(); }
  };
  $('#searchInput').oninput = (e) => {
    state.search = e.target.value.trim();
    $('#searchClear').classList.toggle('hidden', !state.search);
    renderHome();
  };
  $('#searchClear').onclick = () => {
    state.search = '';
    $('#searchInput').value = '';
    $('#searchClear').classList.add('hidden');
    renderHome();
  };
}

/* ---------- данные ---------- */

async function refreshShop() {
  try {
    const shop = await API.get('/api/shop');
    state.categories = shop.categories;
    state.products = shop.products;
    state.settings = shop.settings;
    cleanCart();
    applyBranding();
    if (state.view === 'home') renderHome();
  } catch (e) {
    /* silently ignore */
  }
}

function applyBranding() {
  const s = state.settings;
  $('#brandName').textContent = s.shop_name || 'HOMONOVSKI MARKET';
  $('#brandTag').textContent = s.tagline || '';
  $('#brandMark').classList.add('hidden');
  const words = `${s.shop_name || 'HOMONOVSKI MARKET'} ✦ ${s.tagline || ''} ✦ разработка под ключ ✦ `;
  $('#marqueeTrack').textContent = words.repeat(4);
  document.title = s.shop_name || 'HOMONOVSKI MARKET';
}

/* ---------- запуск ---------- */

function fatal(icon, title, text) {
  $('#splash').classList.add('done');
  $('#fatal').classList.remove('hidden');
  $('#fatalIcon').innerHTML = `<div class="empty-icon">${icMuted(icon, 38)}</div>`;
  $('#fatalTitle').textContent = title;
  $('#fatalText').textContent = text;
}

async function boot() {
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#050505');
      tg.setBackgroundColor('#050505');
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
      tg.BackButton.onClick(closeSheet);
    } catch (e) { /* старые клиенты */ }
  }
  $('#sheet-backdrop').onclick = closeSheet;
  initSearch();

  let auth;
  try {
    auth = await API.post('/api/auth');
  } catch (e) {
    if (e.status === 403) fatal('ban', 'Доступ ограничен', e.message);
    else fatal('wifi-off', 'Сервер недоступен', 'Откройте мини-апп через Telegram-бота');
    return;
  }
  state.user = auth.user;
  state.isAdmin = auth.is_admin;
  state.settings = auth.settings;
  loadCart();

  try {
    await refreshShop();
  } catch (e) {
    applyBranding();
    renderNav();
    renderHome();
    setTimeout(() => $('#splash').classList.add('done'), 350);
    return;
  }

  applyBranding();
  renderNav();
  renderHome();
  setTimeout(() => $('#splash').classList.add('done'), 350);
}

boot();
