const Admin = {
  tab: 'dash',

  TABS: [
    { id: 'dash', icon: 'gauge', label: 'Дашборд' },
    { id: 'products', icon: 'package', label: 'Товары' },
    { id: 'cats', icon: 'folder', label: 'Категории' },
    { id: 'orders', icon: 'receipt', label: 'Заказы' },
    { id: 'promos', icon: 'ticket-percent', label: 'Промо' },
    { id: 'users', icon: 'users-round', label: 'Юзеры' },
    { id: 'settings', icon: 'settings-2', label: 'Настройки' },
  ],

  render() {
    Admin.loadLocal();
    const view = $('#view-admin');
    view.innerHTML = `
      <div class="chips admin-tabs" id="adminTabs">
        ${Admin.TABS.map((t) => `
          <button class="chip ${Admin.tab === t.id ? 'active' : ''}" data-tab="${t.id}">
            ${ic(t.icon, 15, Admin.tab === t.id ? '#000' : '#f5f5f5')} ${t.label}
          </button>`).join('')}
      </div>
      <div id="adminBody">
        <div class="skeleton" style="height:110px;margin-bottom:10px"></div>
        <div class="skeleton" style="height:110px"></div>
      </div>`;
    view.querySelectorAll('[data-tab]').forEach((chip) => {
      chip.onclick = () => { Admin.tab = chip.dataset.tab; haptic('light'); Admin.render(); };
    });
    Admin.renderTab().catch((e) => {
      $('#adminBody').innerHTML = `<div class="empty-text muted center mt16">${esc(e.message)}</div>`;
    });
  },

  async renderTab() {
    const map = {
      dash: Admin.tabDash, products: Admin.tabProducts, cats: Admin.tabCats,
      orders: Admin.tabOrders, promos: Admin.tabPromos, users: Admin.tabUsers,
      settings: Admin.tabSettings,
    };
    await map[Admin.tab]();
  },

  /* ---------- localStorage ---------- */

  loadLocal() {
    const raw = localStorage.getItem('hm_admin');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      Admin._products = data.products || [];
      Admin._cats = data.cats || [];
      Admin._orders = data.orders || [];
      Admin._promos = data.promos || [];
    } catch (e) {}
  },

  saveLocal() {
    localStorage.setItem('hm_admin', JSON.stringify({
      products: Admin._products || [],
      cats: Admin._cats || [],
      orders: Admin._orders || [],
      promos: Admin._promos || [],
    }));
  },

  seedLocal() {
    Admin._products = JSON.parse(JSON.stringify(state.products.length ? state.products : SEED_PRODUCTS));
    Admin._cats = JSON.parse(JSON.stringify(state.categories.length ? state.categories : SEED_CATEGORIES));
    Admin._orders = Admin._orders || [];
    Admin._promos = Admin._promos || [];
    Admin.saveLocal();
  },

  syncState() {
    if (Admin._products) {
      state.products = Admin._products;
      state.categories = Admin._cats || [];
    }
  },

  nextId(arr) {
    return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
  },

  /* ---------- дашборд ---------- */

  async tabDash() {
    Admin.seedLocal();
    Admin.syncState();
    const prods = Admin._products.filter(p => p.active);
    const paid = Admin._orders.filter(o => o.status === 'paid');
    const total = paid.reduce((s, o) => s + o.total, 0);
    const top = [...Admin._products].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 5);
    const recent = [...Admin._orders].reverse().slice(0, 10);
    $('#adminBody').innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">${icMuted('banknote', 14)} Выручка</div>
          <div class="stat-value">${money(total)}</div>
          <div class="stat-sub">всего продаж: ${paid.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${icMuted('receipt', 14)} Заказы</div>
          <div class="stat-value">${paid.length}</div>
          <div class="stat-sub">${Admin._orders.length} всего</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${icMuted('users-round', 14)} Пользователи</div>
          <div class="stat-value">${state.user ? 1 : 0}</div>
          <div class="stat-sub">текущий: ${esc(state.user?.first_name || '—')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${icMuted('boxes', 14)} Склад</div>
          <div class="stat-value">${prods.length}</div>
          <div class="stat-sub">активных товаров</div>
        </div>
      </div>
      ${top.length ? `
        <div class="section-title">Топ продаж</div>
        ${top.map((p, i) => `
          <div class="admin-row">
            <div class="ar-icon">${ic(p.icon, 20)}</div>
            <div class="ar-main">
              <div class="ar-title">${i + 1}. ${esc(p.name)}</div>
              <div class="ar-sub">${money(p.price)}</div>
            </div>
            <div class="ar-side"><b>${p.sales || 0}</b> <span class="muted small">прод.</span></div>
          </div>`).join('')}` : ''}
      <div class="section-title">Последние заказы</div>
      ${recent.length ? recent.map((o) => `
        <div class="admin-row">
          <div class="ar-icon">${ic(o.status === 'paid' ? 'check' : 'clock', 18)}</div>
          <div class="ar-main">
            <div class="ar-title">#${o.id} · ${esc(o.user_name || o.user_id)}</div>
            <div class="ar-sub">${o.items.map((i) => esc(i.name)).join(', ')}</div>
          </div>
          <div class="ar-side">
            <div><b>${money(o.total)}</b></div>
            ${statusBadge(o.status)}
          </div>
        </div>`).join('') : '<div class="muted small center">Заказов пока нет</div>'}
    `;
  },

  /* ---------- товары ---------- */

  async tabProducts() {
    Admin.seedLocal();
    Admin.syncState();
    const products = Admin._products;
    $('#adminBody').innerHTML = `
      ${products.map((p) => `
        <div class="admin-row ${p.active ? '' : 'inactive-row'}">
          <div class="ar-icon">${ic(p.icon, 20)}</div>
          <div class="ar-main">
            <div class="ar-title">${esc(p.name)}</div>
            <div class="ar-sub">${money(p.price)} · ${p.delivery_type === 'keys'
              ? `склад: ${p.stock_left ?? 0}` : 'текст ∞'} · продаж: ${p.sales || 0}</div>
          </div>
          <div class="ar-actions">
            <button class="icon-btn" data-edit="${p.id}">${ic('pencil', 15)}</button>
            <button class="icon-btn" data-del="${p.id}">${ic('trash-2', 15)}</button>
          </div>
        </div>`).join('')}
      <button class="add-fab" id="addProduct">${icDark('plus', 26)}</button>
    `;
    $('#addProduct').onclick = () => Admin.productEditor(null);
    document.querySelectorAll('[data-edit]').forEach((b) => {
      b.onclick = () => Admin.productEditor(Admin._products.find((p) => p.id === Number(b.dataset.edit)));
    });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = () => confirmDialog('Удалить товар безвозвратно?', () => {
        Admin._products = Admin._products.filter(p => p.id !== Number(b.dataset.del));
        Admin.saveLocal();
        Admin.syncState();
        toast('Товар удалён');
        Admin.render();
      });
    });
  },

  productEditor(p) {
    const isNew = !p;
    p = p || { name: '', subtitle: '', description: '', price: '', old_price: '', icon: 'package',
               badge: '', delivery_type: 'text', content: '', active: 1, sort: 0, category_id: '' };
    openSheet(`
      <div class="sheet-title mb16">${isNew ? 'Новый товар' : 'Редактировать товар'}</div>
      <div class="field"><label>Название</label><input id="fName" value="${esc(p.name)}"></div>
      <div class="field"><label>Подзаголовок</label><input id="fSub" value="${esc(p.subtitle)}"></div>
      <div class="field"><label>Описание</label><textarea id="fDesc" style="font-family:var(--font-text)">${esc(p.description)}</textarea></div>
      <div class="field-row">
        <div class="field"><label>Цена, $</label><input id="fPrice" type="number" step="0.01" min="0.01" value="${p.price}"></div>
        <div class="field"><label>Старая цена</label><input id="fOld" type="number" step="0.01" value="${p.old_price ?? ''}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Категория</label>
          <select id="fCat">
            <option value="">Без категории</option>
            ${Admin._cats.map((c) => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Бейдж</label><input id="fBadge" value="${esc(p.badge)}" placeholder="ХИТ / -50% / NEW"></div>
      </div>
      <div class="field">
        <label>Иконка (SVG по API)</label>
        <input id="fIcon" value="${esc(p.icon)}" placeholder="key-round или ph:fire-bold">
        <div class="icon-preview">
          <div class="ar-icon" id="iconPrev">${ic(p.icon, 20)}</div>
          <div class="txt">Имя иконки lucide или set:name — грузится с api.iconify.design</div>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Тип выдачи</label>
          <select id="fType">
            <option value="text" ${p.delivery_type === 'text' ? 'selected' : ''}>Текст (всем одинаковый)</option>
            <option value="keys" ${p.delivery_type === 'keys' ? 'selected' : ''}>Ключи (уникальные, со склада)</option>
          </select>
        </div>
        <div class="field"><label>Сортировка</label><input id="fSort" type="number" value="${p.sort}"></div>
      </div>
      <div class="field" id="contentField">
        <label id="contentLabel"></label>
        <textarea id="fContent" placeholder=""></textarea>
        <div class="hint" id="contentHint"></div>
      </div>
      ${!isNew && p.delivery_type === 'keys' ? `<div class="hint mb8" style="font-size:12px;color:var(--muted)">На складе сейчас: <b>${p.stock_left}</b> шт.</div>` : ''}
      <div class="switch-row">
        <span>Товар активен (виден в каталоге)</span>
        <label class="switch"><input type="checkbox" id="fActive" ${p.active ? 'checked' : ''}><i></i></label>
      </div>
      <button class="btn" id="fSave">${icDark('save', 17)} ${isNew ? 'Создать товар' : 'Сохранить'}</button>
    `);

    const syncType = () => {
      const isKeys = $('#fType').value === 'keys';
      $('#contentLabel').textContent = isKeys ? 'Добавить ключи на склад' : 'Содержимое (выдаётся после оплаты)';
      $('#fContent').placeholder = isKeys ? 'Один ключ = одна строка\nKEY-0001\nKEY-0002' : 'Текст, ссылка или инструкция…';
      $('#contentHint').textContent = isKeys
        ? 'Каждая строка станет отдельной единицей склада. Уже добавленные ключи остаются.'
        : 'Этот текст получает каждый покупатель после оплаты.';
      $('#fContent').value = isKeys ? '' : (p.content || '');
    };
    syncType();
    $('#fType').onchange = syncType;
    $('#fIcon').oninput = () => { $('#iconPrev').innerHTML = ic($('#fIcon').value || 'package', 20); };

    $('#fSave').onclick = () => {
      const isKeys = $('#fType').value === 'keys';
      const body = {
        name: $('#fName').value,
        subtitle: $('#fSub').value,
        description: $('#fDesc').value,
        price: Number($('#fPrice').value),
        old_price: $('#fOld').value ? Number($('#fOld').value) : null,
        category_id: $('#fCat').value || null,
        badge: $('#fBadge').value,
        icon: $('#fIcon').value,
        delivery_type: $('#fType').value,
        content: isKeys ? (p.content || '') : $('#fContent').value,
        sort: Number($('#fSort').value),
        active: $('#fActive').checked,
      };
      try {
        if (isNew) {
          body.id = Admin.nextId(Admin._products);
          body.sales = 0;
          body.stock_left = 0;
          Admin._products.push(body);
        } else {
          Object.assign(p, body);
        }
        if (isKeys) {
          const keys = $('#fContent').value.split('\n').map((s) => s.trim()).filter(Boolean);
          if (keys.length) {
            p.stock_left = (p.stock_left || 0) + keys.length;
          }
        }
        Admin.saveLocal();
        Admin.syncState();
        haptic('success');
        toast(isNew ? 'Товар создан' : 'Сохранено');
        closeSheet();
        Admin.render();
      } catch (e) {
        haptic('error');
        toast(e.message, true);
      }
    };
  },

  /* ---------- категории ---------- */

  async tabCats() {
    Admin.seedLocal();
    Admin.syncState();
    const cats = Admin._cats;
    $('#adminBody').innerHTML = `
      ${cats.map((c) => `
        <div class="admin-row">
          <div class="ar-icon">${ic(c.icon, 20)}</div>
          <div class="ar-main">
            <div class="ar-title">${esc(c.name)}</div>
            <div class="ar-sub">товаров: ${Admin._products.filter(p => p.category_id === c.id).length} · сортировка: ${c.sort}</div>
          </div>
          <div class="ar-actions">
            <button class="icon-btn" data-edit="${c.id}">${ic('pencil', 15)}</button>
            <button class="icon-btn" data-del="${c.id}">${ic('trash-2', 15)}</button>
          </div>
        </div>`).join('')}
      <button class="add-fab" id="addCat">${icDark('plus', 26)}</button>
    `;
    $('#addCat').onclick = () => Admin.catEditor(null);
    document.querySelectorAll('[data-edit]').forEach((b) => {
      b.onclick = () => Admin.catEditor(Admin._cats.find((c) => c.id === Number(b.dataset.edit)));
    });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = () => confirmDialog('Удалить категорию? Товары останутся без категории.', () => {
        Admin._cats = Admin._cats.filter(c => c.id !== Number(b.dataset.del));
        Admin._products.forEach(p => { if (p.category_id === Number(b.dataset.del)) p.category_id = null; });
        Admin.saveLocal();
        Admin.syncState();
        toast('Категория удалена');
        Admin.render();
      });
    });
  },

  catEditor(c) {
    const isNew = !c;
    c = c || { name: '', icon: 'folder', sort: 0 };
    openSheet(`
      <div class="sheet-title mb16">${isNew ? 'Новая категория' : 'Категория'}</div>
      <div class="field"><label>Название</label><input id="cName" value="${esc(c.name)}"></div>
      <div class="field-row">
        <div class="field"><label>Иконка</label><input id="cIcon" value="${esc(c.icon)}"></div>
        <div class="field"><label>Сортировка</label><input id="cSort" type="number" value="${c.sort}"></div>
      </div>
      <div class="icon-preview mb16">
        <div class="ar-icon" id="cIconPrev">${ic(c.icon, 20)}</div>
        <div class="txt">SVG-иконка с api.iconify.design</div>
      </div>
      <button class="btn" id="cSave">${icDark('save', 17)} Сохранить</button>
    `);
    $('#cIcon').oninput = () => { $('#cIconPrev').innerHTML = ic($('#cIcon').value || 'folder', 20); };
    $('#cSave').onclick = () => {
      const body = { name: $('#cName').value, icon: $('#cIcon').value, sort: Number($('#cSort').value) };
      try {
        if (isNew) {
          body.id = Admin.nextId(Admin._cats);
          Admin._cats.push(body);
        } else {
          Object.assign(c, body);
        }
        Admin.saveLocal();
        Admin.syncState();
        toast('Сохранено');
        closeSheet();
        Admin.render();
      } catch (e) { toast(e.message, true); }
    };
  },

  /* ---------- заказы ---------- */

  async tabOrders() {
    Admin.seedLocal();
    const orders = Admin._orders;
    $('#adminBody').innerHTML = orders.length ? orders.map((o) => `
      <div class="admin-row" data-order="${o.id}" style="cursor:pointer">
        <div class="ar-icon">${ic(o.status === 'paid' ? 'badge-check' : 'clock', 19)}</div>
        <div class="ar-main">
          <div class="ar-title">#${o.id} · ${esc(o.user_name || o.user_id)}</div>
          <div class="ar-sub">${new Date(o.created_at).toLocaleString('ru-RU')} · ${o.items.length} поз.</div>
        </div>
        <div class="ar-side">
          <div><b>${money(o.total)}</b></div>
          ${statusBadge(o.status)}
        </div>
      </div>`).join('')
      : `<div class="empty"><div class="empty-icon">${icMuted('receipt', 32)}</div>
         <div class="empty-text">Заказов пока нет</div></div>`;
    document.querySelectorAll('[data-order]').forEach((row) => {
      row.onclick = () => Admin.orderSheet(Number(row.dataset.order));
    });
  },

  orderSheet(id) {
    const o = Admin._orders.find((x) => x.id === id);
    if (!o) return;
    openSheet(`
      <div class="sheet-title">Заказ #${o.id} ${statusBadge(o.status)}</div>
      <div class="muted small mb16">${new Date(o.created_at).toLocaleString('ru-RU')} ·
        покупатель: ${esc(o.user_name || o.user_id)} (ID ${o.user_id})</div>
      <div class="totals">
        ${o.items.map((i) => `<div class="t-row"><span>${esc(i.name)} ×${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}
        ${o.discount ? `<div class="t-row"><span>Скидка (${esc(o.promo_code || '')})</span><span>−${money(o.discount)}</span></div>` : ''}
        <div class="t-row total"><span>Итого</span><span>${money(o.total)}</span></div>
      </div>
      ${o.status === 'paid' && o.delivery ? `<div class="section-title">Выдано</div>${deliveryBlock(o)}` : ''}
    `);
    bindCopyButtons();
  },

  /* ---------- промокоды ---------- */

  async tabPromos() {
    Admin.seedLocal();
    const promos = Admin._promos;
    $('#adminBody').innerHTML = `
      ${promos.length ? promos.map((p) => `
        <div class="admin-row ${p.active ? '' : 'inactive-row'}">
          <div class="ar-icon">${ic('ticket-percent', 19)}</div>
          <div class="ar-main">
            <div class="ar-title mono">${esc(p.code)}</div>
            <div class="ar-sub">−${p.percent}% · использован: ${p.used}${p.max_uses ? ' / ' + p.max_uses : ''}</div>
          </div>
          <div class="ar-actions">
            <button class="icon-btn" data-toggle="${p.id}" data-active="${p.active ? 1 : 0}">${ic(p.active ? 'pause' : 'play', 15)}</button>
            <button class="icon-btn" data-del="${p.id}">${ic('trash-2', 15)}</button>
          </div>
        </div>`).join('')
        : `<div class="empty"><div class="empty-icon">${icMuted('ticket-percent', 32)}</div>
           <div class="empty-text">Промокодов нет — создайте первый</div></div>`}
      <button class="add-fab" id="addPromo">${icDark('plus', 26)}</button>
    `;
    $('#addPromo').onclick = () => {
      openSheet(`
        <div class="sheet-title mb16">Новый промокод</div>
        <div class="field"><label>Код</label><input id="prCode" placeholder="SALE20" style="text-transform:uppercase;font-family:var(--font-mono)"></div>
        <div class="field-row">
          <div class="field"><label>Скидка, %</label><input id="prPercent" type="number" min="1" max="100" value="10"></div>
          <div class="field"><label>Лимит (0 = ∞)</label><input id="prMax" type="number" min="0" value="0"></div>
        </div>
        <button class="btn" id="prSave">${icDark('save', 17)} Создать</button>
      `);
      $('#prSave').onclick = () => {
        try {
          const code = $('#prCode').value.toUpperCase().trim();
          if (!code) { toast('Введите код', true); return; }
          if (Admin._promos.find(p => p.code === code)) { toast('Промокод уже существует', true); return; }
          Admin._promos.push({
            id: Admin.nextId(Admin._promos),
            code,
            percent: Number($('#prPercent').value),
            max_uses: Number($('#prMax').value),
            used: 0,
            active: 1,
          });
          Admin.saveLocal();
          toast('Промокод создан');
          closeSheet();
          Admin.render();
        } catch (e) { toast(e.message, true); }
      };
    };
    document.querySelectorAll('[data-toggle]').forEach((b) => {
      b.onclick = () => {
        const p = Admin._promos.find(x => x.id === Number(b.dataset.toggle));
        if (p) p.active = !p.active;
        Admin.saveLocal();
        Admin.render();
      };
    });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = () => confirmDialog('Удалить промокод?', () => {
        Admin._promos = Admin._promos.filter(p => p.id !== Number(b.dataset.del));
        Admin.saveLocal();
        Admin.render();
      });
    });
  },

  /* ---------- пользователи ---------- */

  async tabUsers() {
    const users = state.user ? [state.user] : [];
    $('#adminBody').innerHTML = users.length ? users.map((u) => `
      <div class="admin-row">
        <div class="ar-icon">${ic('user-round', 19)}</div>
        <div class="ar-main">
          <div class="ar-title">${esc(u.first_name || 'Без имени')} ${u.username ? '· @' + esc(u.username) : ''}</div>
          <div class="ar-sub">ID ${u.id} · ${Admin._orders.filter(o => o.user_id === u.id).length} заказов</div>
        </div>
      </div>`).join('')
      : `<div class="empty"><div class="empty-icon">${icMuted('users-round', 32)}</div>
         <div class="empty-text">Пока никто не открывал магазин</div></div>`;
  },

  /* ---------- настройки ---------- */

  async tabSettings() {
    const s = state.settings;
    $('#adminBody').innerHTML = `
      <div class="section-title">Настройки магазина</div>
      <div class="field"><label>Название</label><input id="sName" value="${esc(s.shop_name || 'HOMONOVSKI MARKET')}"></div>
      <div class="field"><label>Слоган</label><input id="sTag" value="${esc(s.tagline || '')}"></div>
      <div class="field-row">
        <div class="field"><label>Символ валюты</label><input id="sCur" value="${esc(s.currency_symbol || '$')}"></div>
        <div class="field"><label>Поддержка (@username)</label><input id="sSup" value="${esc(s.support || '@homonovski')}"></div>
      </div>
      <div class="field">
        <label>URL мини-аппа (https)</label>
        <input id="sWeb" value="${esc(s.webapp_url || '')}" placeholder="https://your-domain.com">
        <div class="hint">Публичный адрес магазина.</div>
      </div>
      <button class="btn" id="sSave">${icDark('save', 17)} Сохранить</button>
      <div class="section-title mt16">Система</div>
      <div class="admin-row">
        <div class="ar-icon">${ic('image', 19)}</div>
        <div class="ar-main">
          <div class="ar-title">Иконки: api.iconify.design</div>
          <div class="ar-sub">SVG по API · наборы lucide, ph, mdi и 150+ других</div>
        </div>
      </div>
    `;
    $('#sSave').onclick = () => {
      try {
        state.settings = {
          shop_name: $('#sName').value,
          tagline: $('#sTag').value,
          currency_symbol: $('#sCur').value,
          support: $('#sSup').value,
          webapp_url: $('#sWeb').value,
        };
        localStorage.setItem('hm_settings', JSON.stringify(state.settings));
        applyBranding();
        haptic('success');
        toast('Настройки сохранены');
      } catch (e) { toast(e.message, true); }
    };
  },
};
