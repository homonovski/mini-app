/* ============================================================
   HOMONOVSKI MARKET — ядро мини-аппа
   ============================================================ */

const tg = window.Telegram ? window.Telegram.WebApp : null;
const IN_TG = !!(tg && tg.initData);
const ADMIN_IDS = [1061012449];

const SEED_CATEGORIES = [
  { id: 1, name: 'Боты', icon: 'bot', sort: 1 },
  { id: 2, name: 'Веб-сайты', icon: 'globe', sort: 2 },
  { id: 3, name: 'Разработка', icon: 'code', sort: 3 },
  { id: 4, name: 'Автоматизация', icon: 'cpu', sort: 4 },
  { id: 5, name: 'Консультации', icon: 'circle-help', sort: 5 },
];

const SEED_PRODUCTS = [
  { id: 1, name: 'Telegram-бот для записи клиентов', subtitle: 'Автоматическая запись, напоминания, админ-панель', description: 'Полноценный бот для записи клиентов. Автоматическое подтверждение, напоминания о визите, админ-панель для управления расписанием.', price: 50, icon: 'calendar-clock', category_id: 1, delivery_type: 'text', content: 'Свяжитесь с @homonovski для передачи исходного кода и инструкции по установке.', active: true, sort: 1, badge: '' },
  { id: 2, name: 'Telegram-бот-консультант', subtitle: 'Ответы на частые вопросы, информация о товарах', description: 'Бот-консультант отвечает на частые вопросы клиентов, выдаёт информацию о товарах и услугах, работает 24/7.', price: 35, icon: 'message-circle', category_id: 1, delivery_type: 'text', content: 'Свяжитесь с @homonovski для получения исходного кода.', active: true, sort: 2, badge: '' },
  { id: 3, name: 'Telegram-бот для рассылок', subtitle: 'Массовые уведомления, новости, акции', description: 'Сервис массовых рассылок через Telegram. Сегментация подписчиков, статистика доставки, отложенные отправки.', price: 30, icon: 'megaphone', category_id: 1, delivery_type: 'text', content: 'Свяжитесь с @homonovski для получения доступа.', active: true, sort: 3, badge: '' },
  { id: 4, name: 'Telegram-бот для сбора заявок', subtitle: 'Сбор данных в Google Sheets или CRM', description: 'Бот собирает заявки от клиентов, сохраняет данные в Google Sheets или вашу CRM. Уведомления о новых заявках.', price: 40, icon: 'clipboard-check', category_id: 1, delivery_type: 'text', content: 'После оплаты напишите @homonovski для настройки интеграции.', active: true, sort: 4, badge: '' },
  { id: 5, name: 'Telegram-бот для интернет-магазина', subtitle: 'Каталог, корзина, оплата через CryptoBot', description: 'Полноценный бот-магазин с каталогом, корзиной и приёмом оплаты через CryptoBot. Аналог нашего Mini App.', price: 100, icon: 'shopping-cart', category_id: 1, delivery_type: 'text', content: 'Свяжитесь с @homonovski для обсуждения деталей.', active: true, sort: 5, badge: 'ХИТ' },
  { id: 6, name: 'Бот-парсер', subtitle: 'Сбор данных с сайтов по расписанию', description: 'Бот собирает данные с сайтов, маркетплейсов и соцсетей по расписанию и отправляет их вам в Telegram.', price: 60, icon: 'database', category_id: 1, delivery_type: 'text', content: 'После оплаты согласуйте источники данных с @homonovski.', active: true, sort: 6, badge: '' },
  { id: 7, name: 'Сайт-визитка', subtitle: 'Одностраничный сайт с портфолио', description: 'Современный одностраничный сайт с контактами, портфолио и анимациями. Адаптивный дизайн, быстрая загрузка.', price: 40, icon: 'monitor', category_id: 2, delivery_type: 'text', content: 'Исходный код будет передан после оплаты. Домен и хостинг оплачиваются отдельно.', active: true, sort: 7, badge: '' },
  { id: 8, name: 'Портфолио-сайт', subtitle: 'С анимациями и 3D-эффектами', description: 'Интерактивный сайт-портфолио с 3D-сценами, частицами и плавными анимациями. Произведёт впечатление на любого клиента.', price: 120, icon: 'layout-dashboard', category_id: 2, delivery_type: 'text', content: 'Свяжитесь с @homonovski для обсуждения дизайн-концепции.', active: true, sort: 8, badge: '' },
  { id: 9, name: 'Лендинг', subtitle: 'Продающая страница для товара или услуги', description: 'Продающий одностраничный сайт с современным дизайном, формой захвата и аналитикой.', price: 80, icon: 'filter', category_id: 2, delivery_type: 'text', content: 'Цена зависит от сложности. Напишите @homonovski для обсуждения.', active: true, sort: 9, badge: '' },
  { id: 10, name: 'API (FastAPI / Flask)', subtitle: 'Бэкенд для приложений и ботов', description: 'Разработка серверной части на FastAPI или Flask. REST API, авторизация, база данных, документация Swagger.', price: 70, icon: 'code', category_id: 3, delivery_type: 'text', content: 'Свяжитесь с @homonovski для обсуждения технического задания.', active: true, sort: 10, badge: '' },
  { id: 11, name: 'Парсинг сайтов', subtitle: 'Сбор данных с маркетплейсов и соцсетей', description: 'Сбор и структурирование данных с любых сайтов. Выгрузка в Excel, CSV, JSON. Регулярные обновления.', price: 55, icon: 'search', category_id: 3, delivery_type: 'text', content: 'После оплаты согласуйте источники и формат данных с @homonovski.', active: true, sort: 11, badge: '' },
  { id: 12, name: 'Автоматизация Excel / CSV', subtitle: 'Обработка и преобразование табличных данных', description: 'Автоматическая обработка таблиц: объединение, фильтрация, трансформация. Экономит часы ручной работы.', price: 25, icon: 'table', category_id: 4, delivery_type: 'text', content: 'Пришлите пример ваших данных @homonovski после оплаты.', active: true, sort: 12, badge: '' },
  { id: 13, name: 'Настройка сервера (VPS)', subtitle: 'Установка ботов, БД и окружения', description: 'Полная настройка сервера: установка Python, Node.js, PostgreSQL, Nginx, деплой ботов и приложений.', price: 20, icon: 'server', category_id: 4, delivery_type: 'text', content: 'После оплаты предоставьте доступ к VPS через @homonovski.', active: true, sort: 13, badge: '' },
  { id: 14, name: 'Админ-панель', subtitle: 'Управление пользователями, заказами и контентом', description: 'Кастомная админ-панель для вашего проекта. Аналитика, управление контентом, пользователями и заказами.', price: 120, icon: 'shield-check', category_id: 5, delivery_type: 'text', content: 'Свяжитесь с @homonovski для обсуждения функционала.', active: true, sort: 14, badge: '' },
  { id: 15, name: 'Помощь с кодом / консультация', subtitle: 'Разбор ошибок, рефакторинг, помощь с задачами', description: 'Индивидуальная консультация по программированию. Разбор кода, помощь с багами, рефакторинг, code review.', price: 25, icon: 'circle-help', category_id: 5, delivery_type: 'text', content: 'Напишите @homonovski — цена за час консультации.', active: true, sort: 15, badge: '' },
];

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
  offline: false,
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
  const cats = state.categories.filter((c) => c.count > 0);
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
  const support = (state.settings.support || '@homonovski').replace('@', '');
  const itemList = items.map(i => {
    const p = state.products.find(x => x.id === i.id);
    return p ? `${p.name} ×${i.qty} = ${money(p.price * i.qty)}` : '';
  }).join('\n');
  const msg = `Здравствуйте! Хочу заказать:\n${itemList}`;
  openSheet(`
    <div class="pay-wait" style="padding:22px 6px 10px">
      <div class="empty-icon" style="margin:0 auto">${icMuted('message-circle', 36)}</div>
      <div class="sheet-title">Оплата временно недоступна</div>
      <div class="muted small" style="max-width:280px">Напишите в поддержку — вам помогут оформить заказ</div>
      <button class="btn" id="paySupport">${icDark('send', 17)} Написать @${support}</button>
      <button class="btn btn-ghost btn-sm" id="paySupportCancel">Закрыть</button>
    </div>`);
  haptic('warning');
  $('#paySupport').onclick = () => {
    copyText(msg);
    openPayUrl('https://t.me/' + support);
    haptic('medium');
    toast('Сообщение скопировано');
    closeSheet();
  };
  $('#paySupportCancel').onclick = closeSheet;
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
    ${state.offline
      ? `<button class="btn btn-ghost" id="orderViaSupport">${ic('message-circle', 17)} Написать @homonovski</button>`
      : `<button class="btn" id="checkoutBtn">${icDark('wallet', 17)} Оплатить</button>`}
    <div class="center small muted mt8">Оплата криптовалютой: USDT, TON, BTC и др.</div>
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
    if (state.offline) {
      const saved = localStorage.getItem('hm_admin');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          const p = (data.promos || []).find(x => x.code === code && x.active);
          if (p && (!p.max_uses || p.used < p.max_uses)) {
            state.promo = { code: p.code, percent: p.percent };
            haptic('success');
            toast(`Промокод применён: −${state.promo.percent}%`);
            renderCart();
            return;
          }
        } catch (e) {}
      }
      haptic('error');
      toast('Промокод не найден', true);
      return;
    }
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

  const supportBtn = $('#orderViaSupport');
  if (supportBtn) {
    supportBtn.onclick = () => {
      const items = state.cart.map((item) => {
        const p = state.products.find((x) => x.id === item.id);
        return p ? `${p.name} ×${item.qty} = ${money(p.price * item.qty)}` : '';
      }).join('\n');
      const msg = `Здравствуйте! Хочу заказать:\n${items}\n\nИтого: ${money(total)}`;
      copyText(msg);
      toast('Список скопирован — отправьте @homonovski');
    };
  }
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

  if (state.offline) {
    $('#ordersList').innerHTML = `
      <div class="empty" style="padding:28px 20px">
        <div class="empty-icon">${icMuted('package-open', 32)}</div>
        <div class="empty-text">Для отслеживания заказов подключите серверную часть</div>
      </div>`;
    return;
  }

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
  if (state.offline) {
    const saved = localStorage.getItem('hm_admin');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.products && data.products.length) {
          state.products = data.products;
          state.categories = data.cats || [];
        }
      } catch (e) {}
    }
    state.categories.forEach(c => c.count = state.products.filter(p => p.category_id === c.id).length);
    applyBranding();
    if (state.view === 'home') renderHome();
    return;
  }
  try {
    const shop = await API.get('/api/shop');
    state.categories = shop.categories;
    state.products = shop.products;
    state.settings = shop.settings;
    applyBranding();
    if (state.view === 'home') renderHome();
  } catch (e) {
    /* silently ignore */
  }
}

function loadSeedData() {
  const saved = localStorage.getItem('hm_admin');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.products && data.products.length) {
        state.products = data.products;
        state.categories = data.cats || [];
        const s = localStorage.getItem('hm_settings');
        if (s) Object.assign(state.settings, JSON.parse(s));
        return;
      }
    } catch (e) {}
  }
  state.categories = SEED_CATEGORIES.map((c) => ({
    ...c,
    count: SEED_PRODUCTS.filter((p) => p.category_id === c.id).length,
  }));
  state.products = SEED_PRODUCTS;
  const s = localStorage.getItem('hm_settings');
  if (s) {
    state.settings = { ...state.settings, ...JSON.parse(s) };
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
    else {
      /* сервер недоступен — загружаем seed данные для просмотра */
      state.offline = true;
      loadSeedData();
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const u = tg.initDataUnsafe.user;
        state.user = { id: u.id, first_name: u.first_name || '', username: u.username || '', photo_url: u.photo_url || '' };
        state.isAdmin = ADMIN_IDS.includes(u.id);
      } else {
        state.user = { id: 0, first_name: 'Гость' };
        state.isAdmin = false;
      }
      loadCart();
      applyBranding();
      renderNav();
      renderHome();
      setTimeout(() => $('#splash').classList.add('done'), 350);
      return;
    }
  }
  state.user = auth.user;
  state.isAdmin = auth.is_admin;
  state.settings = auth.settings;
  loadCart();

  try {
    await refreshShop();
  } catch (e) {
    loadSeedData();
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
