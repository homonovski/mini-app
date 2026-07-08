const Admin = {
  tab: 'dash',

  TABS: [
    { id: 'dash', icon: 'gauge', label: 'Дашборд' },
    { id: 'products', icon: 'package', label: 'Товары' },
    { id: 'cats', icon: 'folder', label: 'Категории' },
    { id: 'orders', icon: 'receipt', label: 'Заказы' },
    { id: 'promos', icon: 'ticket-percent', label: 'Промо' },
    { id: 'reviews', icon: 'message-square', label: 'Отзывы' },
    { id: 'users', icon: 'users-round', label: 'Юзеры' },
    { id: 'settings', icon: 'settings-2', label: 'Настройки' },
  ],

  isOnline() { return !state.offline; },

  async api(method, path, body) {
    return await API.request(method, '/api/admin' + path, body);
  },

  /* ---------- загрузка данных ---------- */

  async ensureData() {
    if (this.isOnline()) {
      try {
        const [p, c, o, r] = await Promise.all([
          this.api('GET', '/products'),
          this.api('GET', '/categories'),
          this.api('GET', '/orders'),
          this.api('GET', '/promos'),
        ]);
        this._products = p.products || [];
        this._cats = c.categories || [];
        this._orders = o.orders || [];
        this._promos = r.promos || [];
        return;
      } catch (e) { /* fallback to local */ }
    }
    this._loadLocal();
  },

  /* ---------- localStorage (offline fallback) ---------- */

  _loadLocal() {
    const raw = localStorage.getItem('hm_admin');
    if (!raw) { this._seedLocal(); return; }
    try {
      const d = JSON.parse(raw);
      this._products = d.products || [];
      this._cats = d.cats || [];
      this._orders = d.orders || [];
      this._promos = d.promos || [];
    } catch (e) { this._seedLocal(); }
  },

  _saveLocal() {
    localStorage.setItem('hm_admin', JSON.stringify({
      products: this._products || [],
      cats: this._cats || [],
      orders: this._orders || [],
      promos: this._promos || [],
    }));
  },

  _seedLocal() {
    this._products = JSON.parse(JSON.stringify(state.products.length ? state.products : SEED_PRODUCTS));
    this._cats = JSON.parse(JSON.stringify(state.categories.length ? state.categories : SEED_CATEGORIES));
    this._orders = this._orders || [];
    this._promos = this._promos || [];
    this._saveLocal();
  },

  _syncState() {
    if (this._products) {
      state.products = this._products;
      state.categories = this._cats || [];
    }
  },

  _nextId(arr) {
    return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
  },

  /* ---------- render ---------- */

  render() {
    const view = $('#view-admin');
    view.innerHTML = `
      <div class="chips admin-tabs" id="adminTabs">
        ${this.TABS.map(t => `
          <button class="chip ${this.tab === t.id ? 'active' : ''}" data-tab="${t.id}">
            ${ic(t.icon, 15, this.tab === t.id ? '#000' : '#f5f5f5')} ${t.label}
          </button>`).join('')}
      </div>
      <div id="adminBody"><div class="skeleton" style="height:110px;margin-bottom:10px"></div><div class="skeleton" style="height:110px"></div></div>`;
    view.querySelectorAll('[data-tab]').forEach(chip => {
      chip.onclick = () => { this.tab = chip.dataset.tab; haptic('light'); this.render(); };
    });
    this._renderTab().catch(e => {
      $('#adminBody').innerHTML = `<div class="empty-text muted center mt16">${esc(e.message)}</div>`;
    });
  },

  async _renderTab() {
    const map = {
      dash: () => this._tabDash(),
      products: () => this._tabProducts(),
      cats: () => this._tabCats(),
      orders: () => this._tabOrders(),
      promos: () => this._tabPromos(),
      reviews: () => this._tabReviews(),
      users: () => this._tabUsers(),
      settings: () => this._tabSettings(),
    };
    await map[this.tab]();
  },

  /* ---------- дашборд ---------- */

  async _tabDash() {
    await this.ensureData();
    this._syncState();
    let html;
    if (this.isOnline()) {
      try {
        const d = await this.api('GET', '/overview');
        html = this._dashHTML(d);
      } catch (e) { html = this._dashLocalHTML(); }
    } else {
      html = this._dashLocalHTML();
    }
    $('#adminBody').innerHTML = html;
  },

  _dashHTML(d) {
    const top = (d.top_products || []).map((p, i) => `
      <div class="admin-row">
        <div class="ar-icon">${ic(p.icon, 20)}</div>
        <div class="ar-main">
          <div class="ar-title">${i + 1}. ${esc(p.name)}</div>
          <div class="ar-sub">${money(p.price)}</div>
        </div>
        <div class="ar-side"><b>${p.sales || 0}</b> <span class="muted small">прод.</span></div>
      </div>`).join('');
    const recent = (d.recent_orders || []).map(o => `
      <div class="admin-row">
        <div class="ar-icon">${ic(o.status === 'paid' ? 'check' : 'clock', 18)}</div>
        <div class="ar-main">
          <div class="ar-title">#${o.id} · ${esc(o.username || o.user_id)}</div>
          <div class="ar-sub">${(o.items || []).map(i => esc(i.name)).join(', ')}</div>
        </div>
        <div class="ar-side"><div><b>${money(o.total)}</b></div>${statusBadge(o.status)}</div>
      </div>`).join('');
    return `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">${icMuted('banknote', 14)} Выручка</div><div class="stat-value">${money(d.revenue_total)}</div><div class="stat-sub">всего продаж: ${d.orders_paid}</div></div>
        <div class="stat-card"><div class="stat-label">${icMuted('receipt', 14)} Заказы</div><div class="stat-value">${d.orders_paid}</div><div class="stat-sub">${d.orders_pending} ожидают</div></div>
        <div class="stat-card"><div class="stat-label">${icMuted('users-round', 14)} Пользователи</div><div class="stat-value">${d.users_count}</div><div class="stat-sub">всего в боте</div></div>
        <div class="stat-card"><div class="stat-label">${icMuted('boxes', 14)} Склад</div><div class="stat-value">${d.products_count}</div><div class="stat-sub">активных товаров</div></div>
      </div>
      ${top ? `<div class="section-title">Топ продаж</div>${top}` : ''}
      <div class="section-title">Последние заказы</div>
      ${recent || '<div class="muted small center">Заказов пока нет</div>'}`;
  },

  _dashLocalHTML() {
    const prods = this._products.filter(p => p.active);
    const paid = this._orders.filter(o => o.status === 'paid');
    const total = paid.reduce((s, o) => s + o.total, 0);
    const top = [...this._products].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 5);
    const recent = [...this._orders].reverse().slice(0, 10);
    return `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">${icMuted('banknote', 14)} Выручка</div><div class="stat-value">${money(total)}</div><div class="stat-sub">всего продаж: ${paid.length}</div></div>
        <div class="stat-card"><div class="stat-label">${icMuted('receipt', 14)} Заказы</div><div class="stat-value">${paid.length}</div><div class="stat-sub">${this._orders.length} всего</div></div>
        <div class="stat-card"><div class="stat-label">${icMuted('users-round', 14)} Пользователи</div><div class="stat-value">${state.user ? 1 : 0}</div><div class="stat-sub">текущий: ${esc(state.user?.first_name || '—')}</div></div>
        <div class="stat-card"><div class="stat-label">${icMuted('boxes', 14)} Склад</div><div class="stat-value">${prods.length}</div><div class="stat-sub">активных товаров</div></div>
      </div>
      ${top.length ? `<div class="section-title">Топ продаж</div>${top.map((p, i) => `
        <div class="admin-row">
          <div class="ar-icon">${ic(p.icon, 20)}</div>
          <div class="ar-main"><div class="ar-title">${i + 1}. ${esc(p.name)}</div><div class="ar-sub">${money(p.price)}</div></div>
          <div class="ar-side"><b>${p.sales || 0}</b> <span class="muted small">прод.</span></div>
        </div>`).join('')}` : ''}
      <div class="section-title">Последние заказы</div>
      ${recent.length ? recent.map(o => `
        <div class="admin-row">
          <div class="ar-icon">${ic(o.status === 'paid' ? 'check' : 'clock', 18)}</div>
          <div class="ar-main"><div class="ar-title">#${o.id} · ${esc(o.user_name || o.user_id)}</div><div class="ar-sub">${o.items.map(i => esc(i.name)).join(', ')}</div></div>
          <div class="ar-side"><div><b>${money(o.total)}</b></div>${statusBadge(o.status)}</div>
        </div>`).join('') : '<div class="muted small center">Заказов пока нет</div>'}`;
  },

  /* ---------- товары ---------- */

  async _tabProducts() {
    await this.ensureData();
    this._syncState();
    const products = this._products;
    $('#adminBody').innerHTML = `
      ${products.map(p => `
        <div class="admin-row ${p.active ? '' : 'inactive-row'}">
          <div class="ar-icon">${ic(p.icon, 20)}</div>
          <div class="ar-main">
            <div class="ar-title">${esc(p.name)}</div>
            <div class="ar-sub">${money(p.price)} · ${p.delivery_type === 'keys' ? 'склад: ' + (p.stock_left ?? 0) : 'текст ∞'} · продаж: ${p.sales || 0}</div>
          </div>
          <div class="ar-actions">
            <button class="icon-btn" data-edit="${p.id}">${ic('pencil', 15)}</button>
            <button class="icon-btn" data-del="${p.id}">${ic('trash-2', 15)}</button>
          </div>
        </div>`).join('')}
      <button class="add-fab" id="addProduct">${icDark('plus', 26)}</button>`;
    $('#addProduct').onclick = () => this._productEditor(null);
    document.querySelectorAll('[data-edit]').forEach(b => {
      b.onclick = () => this._productEditor(this._products.find(p => p.id === Number(b.dataset.edit)));
    });
    document.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = () => confirmDialog('Удалить товар безвозвратно?', async () => {
        const id = Number(b.dataset.del);
        if (this.isOnline()) {
          try { await this.api('DELETE', '/products/' + id); } catch (e) { toast(e.message, true); return; }
        } else {
          this._products = this._products.filter(p => p.id !== id);
          this._saveLocal();
        }
        this._syncState();
        toast('Товар удалён');
        this.render();
      });
    });
  },

  async _productEditor(p) {
    const isNew = !p;
    p = p || { name: '', subtitle: '', description: '', price: '', old_price: '', icon: 'package', badge: '', delivery_type: 'text', content: '', active: 1, sort: 0, category_id: '' };
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
            ${this._cats.map(c => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
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
      <button class="btn" id="fSave">${icDark('save', 17)} ${isNew ? 'Создать товар' : 'Сохранить'}</button>`);

    const syncType = () => {
      const isKeys = $('#fType').value === 'keys';
      $('#contentLabel').textContent = isKeys ? 'Добавить ключи на склад' : 'Содержимое (выдаётся после оплаты)';
      $('#fContent').placeholder = isKeys ? 'Один ключ = одна строка\nKEY-0001\nKEY-0002' : 'Текст, ссылка или инструкция…';
      $('#contentHint').textContent = isKeys ? 'Каждая строка станет отдельной единицей склада. Уже добавленные ключи остаются.' : 'Этот текст получает каждый покупатель после оплаты.';
      $('#fContent').value = isKeys ? '' : (p.content || '');
    };
    syncType();
    $('#fType').onchange = syncType;
    $('#fIcon').oninput = () => { $('#iconPrev').innerHTML = ic($('#fIcon').value || 'package', 20); };

    $('#fSave').onclick = async () => {
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
        if (this.isOnline()) {
          if (isNew) {
            const res = await this.api('POST', '/products', body);
            body.id = res.id;
          } else {
            await this.api('PUT', '/products/' + p.id, body);
            Object.assign(p, body);
          }
          if (isKeys) {
            const keys = $('#fContent').value.split('\n').map(s => s.trim()).filter(Boolean);
            if (keys.length) {
              await this.api('POST', '/products/' + (isNew ? body.id : p.id) + '/stock', { keys });
            }
          }
          await this.ensureData();
        } else {
          if (isNew) {
            body.id = this._nextId(this._products);
            body.sales = 0;
            body.stock_left = 0;
            this._products.push(body);
          } else {
            Object.assign(p, body);
          }
          if (isKeys) {
            const keys = $('#fContent').value.split('\n').map(s => s.trim()).filter(Boolean);
            if (keys.length) p.stock_left = (p.stock_left || 0) + keys.length;
          }
          this._saveLocal();
        }
        this._syncState();
        haptic('success');
        toast(isNew ? 'Товар создан' : 'Сохранено');
        closeSheet();
        this.render();
      } catch (e) {
        haptic('error');
        toast(e.message, true);
      }
    };
  },

  /* ---------- категории ---------- */

  async _tabCats() {
    await this.ensureData();
    this._syncState();
    const cats = this._cats;
    $('#adminBody').innerHTML = `
      ${cats.map(c => `
        <div class="admin-row">
          <div class="ar-icon">${ic(c.icon, 20)}</div>
          <div class="ar-main">
            <div class="ar-title">${esc(c.name)}</div>
            <div class="ar-sub">товаров: ${this._products.filter(p => p.category_id === c.id).length} · сортировка: ${c.sort}</div>
          </div>
          <div class="ar-actions">
            <button class="icon-btn" data-edit="${c.id}">${ic('pencil', 15)}</button>
            <button class="icon-btn" data-del="${c.id}">${ic('trash-2', 15)}</button>
          </div>
        </div>`).join('')}
      <button class="add-fab" id="addCat">${icDark('plus', 26)}</button>`;
    $('#addCat').onclick = () => this._catEditor(null);
    document.querySelectorAll('[data-edit]').forEach(b => {
      b.onclick = () => this._catEditor(this._cats.find(c => c.id === Number(b.dataset.edit)));
    });
    document.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = () => confirmDialog('Удалить категорию? Товары останутся без категории.', async () => {
        const id = Number(b.dataset.del);
        if (this.isOnline()) {
          try { await this.api('DELETE', '/categories/' + id); } catch (e) { toast(e.message, true); return; }
        } else {
          this._cats = this._cats.filter(c => c.id !== id);
          this._products.forEach(p => { if (p.category_id === id) p.category_id = null; });
          this._saveLocal();
        }
        this._syncState();
        toast('Категория удалена');
        this.render();
      });
    });
  },

  _catEditor(c) {
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
      <button class="btn" id="cSave">${icDark('save', 17)} Сохранить</button>`);
    $('#cIcon').oninput = () => { $('#cIconPrev').innerHTML = ic($('#cIcon').value || 'folder', 20); };
    $('#cSave').onclick = async () => {
      const body = { name: $('#cName').value, icon: $('#cIcon').value, sort: Number($('#cSort').value) };
      try {
        if (this.isOnline()) {
          if (isNew) {
            await this.api('POST', '/categories', body);
          } else {
            await this.api('PUT', '/categories/' + c.id, body);
            Object.assign(c, body);
          }
          await this.ensureData();
        } else {
          if (isNew) { body.id = this._nextId(this._cats); this._cats.push(body); }
          else { Object.assign(c, body); }
          this._saveLocal();
        }
        this._syncState();
        toast('Сохранено');
        closeSheet();
        this.render();
      } catch (e) { toast(e.message, true); }
    };
  },

  /* ---------- заказы ---------- */

  async _tabOrders() {
    await this.ensureData();
    const orders = this._orders;
    $('#adminBody').innerHTML = orders.length ? orders.map(o => `
      <div class="admin-row" data-order="${o.id}" style="cursor:pointer">
        <div class="ar-icon">${ic(o.status === 'paid' ? 'badge-check' : 'clock', 19)}</div>
        <div class="ar-main">
          <div class="ar-title">#${o.id} · ${esc(o.username || o.user_name || o.user_id)}</div>
          <div class="ar-sub">${new Date(o.created_at).toLocaleString('ru-RU')} · ${o.items ? o.items.length : 0} поз.</div>
        </div>
        <div class="ar-side"><div><b>${money(o.total)}</b></div>${statusBadge(o.status)}</div>
      </div>`).join('')
      : `<div class="empty"><div class="empty-icon">${icMuted('receipt', 32)}</div><div class="empty-text">Заказов пока нет</div></div>`;
    document.querySelectorAll('[data-order]').forEach(row => {
      row.onclick = () => this._orderSheet(Number(row.dataset.order));
    });
  },

  _orderSheet(id) {
    const o = this._orders.find(x => x.id === id);
    if (!o) return;
    openSheet(`
      <div class="sheet-title">Заказ #${o.id} ${statusBadge(o.status)}</div>
      <div class="muted small mb16">${new Date(o.created_at).toLocaleString('ru-RU')} · покупатель: ${esc(o.username || o.user_name || o.user_id)} (ID ${o.user_id})</div>
      <div class="totals">
        ${(o.items || []).map(i => `<div class="t-row"><span>${esc(i.name)} ×${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}
        ${o.discount ? `<div class="t-row"><span>Скидка (${esc(o.promo_code || '')})</span><span>−${money(o.discount)}</span></div>` : ''}
        <div class="t-row total"><span>Итого</span><span>${money(o.total)}</span></div>
      </div>
      ${o.status === 'paid' && o.delivery ? `<div class="section-title">Выдано</div>${deliveryBlock(o)}` : ''}`);
    bindCopyButtons();
  },

  /* ---------- промокоды ---------- */

  async _tabPromos() {
    await this.ensureData();
    const promos = this._promos;
    $('#adminBody').innerHTML = `
      ${promos.length ? promos.map(p => `
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
        : `<div class="empty"><div class="empty-icon">${icMuted('ticket-percent', 32)}</div><div class="empty-text">Промокодов нет — создайте первый</div></div>`}
      <button class="add-fab" id="addPromo">${icDark('plus', 26)}</button>`;
    $('#addPromo').onclick = () => {
      openSheet(`
        <div class="sheet-title mb16">Новый промокод</div>
        <div class="field"><label>Код</label><input id="prCode" placeholder="SALE20" style="text-transform:uppercase;font-family:var(--font-mono)"></div>
        <div class="field-row">
          <div class="field"><label>Скидка, %</label><input id="prPercent" type="number" min="1" max="100" value="10"></div>
          <div class="field"><label>Лимит (0 = ∞)</label><input id="prMax" type="number" min="0" value="0"></div>
        </div>
        <button class="btn" id="prSave">${icDark('save', 17)} Создать</button>`);
      $('#prSave').onclick = async () => {
        try {
          const code = $('#prCode').value.toUpperCase().trim();
          if (!code) { toast('Введите код', true); return; }
          if (this.isOnline()) {
            await this.api('POST', '/promos', { code, percent: Number($('#prPercent').value), max_uses: Number($('#prMax').value) });
            await this.ensureData();
          } else {
            if (this._promos.find(p => p.code === code)) { toast('Промокод уже существует', true); return; }
            this._promos.push({ id: this._nextId(this._promos), code, percent: Number($('#prPercent').value), max_uses: Number($('#prMax').value), used: 0, active: 1 });
            this._saveLocal();
          }
          toast('Промокод создан');
          closeSheet();
          this.render();
        } catch (e) { toast(e.message, true); }
      };
    };
    document.querySelectorAll('[data-toggle]').forEach(b => {
      b.onclick = async () => {
        const promo = this._promos.find(x => x.id === Number(b.dataset.toggle));
        if (!promo) return;
        if (this.isOnline()) {
          try { await this.api('PUT', '/promos/' + promo.id, { active: !promo.active }); } catch (e) { toast(e.message, true); return; }
          await this.ensureData();
        } else {
          promo.active = !promo.active;
          this._saveLocal();
        }
        this.render();
      };
    });
    document.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = () => confirmDialog('Удалить промокод?', async () => {
        const id = Number(b.dataset.del);
        if (this.isOnline()) {
          try { await this.api('DELETE', '/promos/' + id); } catch (e) { toast(e.message, true); return; }
          await this.ensureData();
        } else {
          this._promos = this._promos.filter(p => p.id !== id);
          this._saveLocal();
        }
        this.render();
      });
    });
  },

  /* ---------- отзывы ---------- */

  async _tabReviews() {
    await this.ensureData();
    let reviews = [];
    if (this.isOnline()) {
      try {
        const d = await this.api('GET', '/reviews');
        reviews = d.reviews || [];
      } catch (e) { /* ignore */ }
    }
    const saved = localStorage.getItem('hm_reviews');
    if (saved) {
      try {
        const local = JSON.parse(saved);
        if (local.length > reviews.length) reviews = local;
      } catch (e) {}
    }
    $('#adminBody').innerHTML = reviews.length ? reviews.map(r => `
      <div class="admin-row">
        <div class="ar-icon">${ic('message-square', 19)}</div>
        <div class="ar-main">
          <div class="ar-title">${esc(r.user_name || 'Аноним')} ${starsHTML(r.rating)}</div>
          <div class="ar-sub">${esc(r.text)} · ${new Date(r.created_at).toLocaleString('ru-RU')}</div>
        </div>
        <div class="ar-actions">
          <button class="icon-btn" data-del="${r.id}">${ic('trash-2', 15)}</button>
        </div>
      </div>`).join('')
      : `<div class="empty"><div class="empty-icon">${icMuted('message-square', 32)}</div><div class="empty-text">Отзывов пока нет</div></div>`;
    document.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = () => confirmDialog('Удалить отзыв?', async () => {
        const id = Number(b.dataset.del);
        if (this.isOnline()) {
          try { await this.api('DELETE', '/reviews/' + id); } catch (e) { toast(e.message, true); return; }
        }
        const saved = localStorage.getItem('hm_reviews');
        if (saved) {
          const all = JSON.parse(saved).filter(x => x.id !== id);
          localStorage.setItem('hm_reviews', JSON.stringify(all));
        }
        toast('Отзыв удалён');
        this.render();
      });
    });
  },

  /* ---------- пользователи ---------- */

  async _tabUsers() {
    await this.ensureData();
    let users;
    if (this.isOnline()) {
      try {
        const d = await this.api('GET', '/users');
        users = d.users || [];
      } catch (e) { users = state.user ? [state.user] : []; }
    } else {
      users = state.user ? [state.user] : [];
    }
    $('#adminBody').innerHTML = users.length ? users.map(u => `
      <div class="admin-row">
        <div class="ar-icon">${ic('user-round', 19)}</div>
        <div class="ar-main">
          <div class="ar-title">${esc(u.first_name || 'Без имени')} ${u.username ? '· @' + esc(u.username) : ''}</div>
          <div class="ar-sub">ID ${u.id} · ${this._orders.filter(o => o.user_id === u.id).length} заказов</div>
        </div>
        ${this.isOnline() ? `
        <div class="ar-actions">
          <button class="icon-btn ${u.is_banned ? 'active' : ''}" data-ban="${u.id}" data-banned="${u.is_banned ? 1 : 0}">${ic(u.is_banned ? 'shield-off' : 'shield', 15)}</button>
        </div>` : ''}
      </div>`).join('')
      : `<div class="empty"><div class="empty-icon">${icMuted('users-round', 32)}</div><div class="empty-text">Пока никто не открывал магазин</div></div>`;
    document.querySelectorAll('[data-ban]').forEach(b => {
      b.onclick = async () => {
        const id = Number(b.dataset.ban);
        const banned = b.dataset.banned === '1';
        try {
          await this.api('POST', '/users/' + id + '/ban', { banned: !banned });
          toast(banned ? 'Пользователь разбанен' : 'Пользователь забанен');
          this.render();
        } catch (e) { toast(e.message, true); }
      };
    });
  },

  /* ---------- настройки ---------- */

  async _tabSettings() {
    let s = state.settings;
    if (this.isOnline()) {
      try {
        s = await this.api('GET', '/settings');
      } catch (e) { /* use local */ }
    }
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
      </div>`;
    $('#sSave').onclick = async () => {
      const body = {
        shop_name: $('#sName').value,
        tagline: $('#sTag').value,
        currency_symbol: $('#sCur').value,
        support: $('#sSup').value,
        webapp_url: $('#sWeb').value,
      };
      try {
        if (this.isOnline()) {
          await this.api('PUT', '/settings', body);
          const fresh = await this.api('GET', '/settings');
          Object.assign(state.settings, fresh);
        } else {
          Object.assign(state.settings, body);
          localStorage.setItem('hm_settings', JSON.stringify(state.settings));
        }
        applyBranding();
        haptic('success');
        toast('Настройки сохранены');
      } catch (e) { toast(e.message, true); }
    };
  },
};
