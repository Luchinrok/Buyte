/* ============================================
   Buyte — js/recent-purchases.js

   Vista #screen-recent-purchases: pantalla per editar (en mode
   lectura en aquest commit 3a; edició arriba al 3b) les últimes
   compres fetes des del BuyMe. Llegeix `products` (EatMe inventory)
   filtrant per `addedAt` segons el rang triat. Productes sense
   `addedAt` són exclosos silenciosament (decisió d'spec).

   Aquest commit (3a) construeix només la UI en mode read-only:
     - 4 botons de filtre temporal (Avui / Setmana / Mes / Personalitzar)
     - Llista de cards amb emoji + nom + data de compra
     - Inputs amb price/weight/date tots disabled
     - "Personalitzar" mostra toast "Disponible aviat"
     - Botó "Desar canvis" sempre disabled

   El Commit 3b activarà els inputs, la lògica de "Desar canvis", el
   date range picker, i la propagació al catàleg popular i al
   purchaseHistory (vegeu js/purchase-history.js).
   ============================================ */
(function() {
  let _rpCurrentRange = 'today';

  function openRecentPurchases() {
    _rpCurrentRange = 'today';
    _rpUpdateFilterButtons();
    _rpRender();
    if (typeof showScreen === 'function') showScreen('recent-purchases');
  }

  function _rpRangeStart(range) {
    const now = new Date();
    if (range === 'today') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (range === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    if (range === 'month') { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    return null;
  }

  function _rpFilterProducts(range) {
    if (!Array.isArray(products)) return [];
    const start = _rpRangeStart(range);
    if (!start) return [];
    const startTs = start.getTime();
    const filtered = products.filter(p => {
      if (!p || !p.addedAt) return false;
      const t = new Date(p.addedAt).getTime();
      if (!Number.isFinite(t)) return false;
      return t >= startTs;
    });
    filtered.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    return filtered;
  }

  function _rpFormatAddedAt(addedAt) {
    if (!addedAt) return '';
    const d = new Date(addedAt);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return 'Avui a les ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function _rpUpdateFilterButtons() {
    document.querySelectorAll('.rp-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.range === _rpCurrentRange);
    });
  }

  function _rpRender() {
    const list = document.getElementById('rp-list');
    if (!list) return;
    const filtered = _rpFilterProducts(_rpCurrentRange);
    if (filtered.length === 0) {
      list.innerHTML = '<div class="rp-empty">No hi ha compres en aquest rang.</div>';
      return;
    }
    list.innerHTML = '';
    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'rp-card';
      card.dataset.productId = p.id;

      const header = document.createElement('div');
      header.className = 'rp-card-header';
      const emoji = document.createElement('span');
      emoji.className = 'rp-card-emoji';
      emoji.textContent = p.emoji || '📦';
      const nameWrap = document.createElement('div');
      nameWrap.className = 'rp-card-name-wrap';
      const name = document.createElement('div');
      name.className = 'rp-card-name';
      name.textContent = p.name || '';
      const date = document.createElement('div');
      date.className = 'rp-card-date';
      date.textContent = 'Comprat: ' + _rpFormatAddedAt(p.addedAt);
      nameWrap.appendChild(name);
      nameWrap.appendChild(date);
      header.appendChild(emoji);
      header.appendChild(nameWrap);

      const body = document.createElement('div');
      body.className = 'rp-card-body';

      const priceField = document.createElement('div');
      priceField.className = 'rp-field';
      priceField.innerHTML = '<label>Preu pagat (€)</label>';
      const priceInput = document.createElement('input');
      priceInput.type = 'text';
      priceInput.inputMode = 'decimal';
      priceInput.value = (typeof p.price === 'number') ? String(p.price) : '';
      priceInput.disabled = true;
      priceField.appendChild(priceInput);

      const weightField = document.createElement('div');
      weightField.className = 'rp-field';
      weightField.innerHTML = '<label>Pes / Quantitat</label>';
      const weightInput = document.createElement('input');
      weightInput.type = 'text';
      weightInput.value = p.weight || '';
      weightInput.disabled = true;
      weightField.appendChild(weightInput);

      const expiryField = document.createElement('div');
      expiryField.className = 'rp-field rp-field-expiry';
      expiryField.innerHTML = '<label>Caducitat</label>';
      if (p.noExpiry) {
        const badge = document.createElement('span');
        badge.className = 'rp-no-expiry';
        badge.textContent = 'No caduca';
        expiryField.appendChild(badge);
      } else {
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.value = p.date || '';
        dateInput.disabled = true;
        expiryField.appendChild(dateInput);
      }

      body.appendChild(priceField);
      body.appendChild(weightField);
      body.appendChild(expiryField);

      card.appendChild(header);
      card.appendChild(body);
      list.appendChild(card);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    const accessBtn = document.getElementById('btn-recent-purchases');
    if (accessBtn) accessBtn.addEventListener('click', openRecentPurchases);

    document.querySelectorAll('.rp-filter-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const range = this.dataset.range;
        if (range === 'custom') {
          if (typeof showToast === 'function') showToast('Disponible aviat');
          return;
        }
        _rpCurrentRange = range;
        _rpUpdateFilterButtons();
        _rpRender();
      });
    });

    const cancelBtn = document.querySelector('#screen-recent-purchases .rp-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', function() {
      if (typeof showScreen === 'function') showScreen('home');
    });
  });

  window.openRecentPurchases = openRecentPurchases;
})();
