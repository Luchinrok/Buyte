/* ============================================
   Buyte — js/recent-purchases.js

   Vista #screen-recent-purchases: editar les últimes compres fetes
   des del BuyMe. Llegeix `products` (EatMe inventory) filtrant per
   `addedAt`. Permet a l'usuari corregir preu / pes / caducitat;
   en Desar canvis, propaga a:
     - producte EatMe (products → saveData)
     - purchaseHistory (updateHistoryRecord / recordPurchase)
     - cache de populars (savePopularProducts) seguint regles:
         · Preu: enriqueix popular sense preu; override si diff > 20%
         · Days: mitjana mòbil de les últimes 5 compres
         · Sempre que els weights siguin compatibles
   ============================================ */
(function() {
  let _rpCurrentRange = 'today';
  let _rpCustomRange = { from: null, to: null }; // YYYY-MM-DD strings
  let _rpEditStates = {}; // { productId: { price?, weight?, date?, noExpiry? } }

  function openRecentPurchases() {
    _rpCurrentRange = 'today';
    _rpCustomRange = { from: null, to: null };
    _rpEditStates = {};
    _rpUpdateFilterButtons();
    _rpUpdateCustomBtnLabel();
    _rpUpdateSaveBtn();
    _rpRender();
    if (typeof showScreen === 'function') showScreen('recent-purchases');
  }

  // === Filtrat temporal ===
  function _rpRangeBounds(range) {
    const now = new Date();
    if (range === 'today') {
      const from = new Date(now); from.setHours(0, 0, 0, 0);
      return { from, to: now };
    }
    if (range === 'week') {
      const from = new Date(now); from.setDate(from.getDate() - 7);
      return { from, to: now };
    }
    if (range === 'month') {
      const from = new Date(now); from.setDate(from.getDate() - 30);
      return { from, to: now };
    }
    if (range === 'custom') {
      if (!_rpCustomRange.from || !_rpCustomRange.to) return null;
      const from = new Date(_rpCustomRange.from + 'T00:00:00');
      const to = new Date(_rpCustomRange.to + 'T23:59:59');
      return { from, to };
    }
    return null;
  }

  function _rpFilterProducts(range) {
    if (!Array.isArray(products)) return [];
    const bounds = _rpRangeBounds(range);
    if (!bounds) return [];
    const fromTs = bounds.from.getTime();
    const toTs = bounds.to.getTime();
    const filtered = products.filter(p => {
      if (!p || !p.addedAt) return false;
      const t = new Date(p.addedAt).getTime();
      if (!Number.isFinite(t)) return false;
      return t >= fromTs && t <= toTs;
    });
    filtered.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    return filtered;
  }

  // === Format de data per al header de la card ===
  function _rpFormatAddedAt(addedAt) {
    if (!addedAt) return '';
    const d = new Date(addedAt);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return 'Avui ' + hh + ':' + mm;
    const today0 = new Date(now); today0.setHours(0, 0, 0, 0);
    const d0 = new Date(d); d0.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today0.getTime() - d0.getTime()) / 86400000);
    if (diffDays === 1) return 'Ahir ' + hh + ':' + mm;
    if (diffDays >= 2 && diffDays <= 7) return 'Fa ' + diffDays + ' dies';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function _rpUpdateFilterButtons() {
    document.querySelectorAll('.rp-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.range === _rpCurrentRange);
    });
  }

  function _rpUpdateCustomBtnLabel() {
    const btn = document.querySelector('.rp-filter-btn[data-range="custom"]');
    if (!btn) return;
    if (_rpCurrentRange === 'custom' && _rpCustomRange.from && _rpCustomRange.to) {
      const fmt = (ymd) => {
        const parts = ymd.split('-');
        return parts[2] + '/' + parts[1];
      };
      btn.textContent = fmt(_rpCustomRange.from) + ' - ' + fmt(_rpCustomRange.to);
    } else {
      btn.textContent = 'Personalitzar';
    }
  }

  function _rpUpdateSaveBtn() {
    const btn = document.querySelector('#screen-recent-purchases .rp-save-btn');
    if (!btn) return;
    const count = Object.keys(_rpEditStates).length;
    btn.disabled = count === 0;
    btn.textContent = count > 0 ? ('Desar canvis (' + count + ')') : 'Desar canvis';
  }

  // === Render de cards (mode editable) ===
  function _rpRender() {
    const list = document.getElementById('rp-list');
    if (!list) return;
    const filtered = _rpFilterProducts(_rpCurrentRange);
    if (filtered.length === 0) {
      list.innerHTML = '<div class="rp-empty">No hi ha compres en aquest rang.</div>';
      return;
    }
    list.innerHTML = '';
    filtered.forEach(p => list.appendChild(_rpBuildCard(p)));
  }

  function _rpBuildCard(p) {
    const card = document.createElement('div');
    card.className = 'rp-card';
    card.dataset.productId = p.id;

    // Header
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
    date.textContent = _rpFormatAddedAt(p.addedAt);
    nameWrap.appendChild(name);
    nameWrap.appendChild(date);
    header.appendChild(emoji);
    header.appendChild(nameWrap);
    card.appendChild(header);

    // Body: 3 fields (price, weight, expiry-control)
    const body = document.createElement('div');
    body.className = 'rp-card-body';

    // Preu
    const priceField = document.createElement('div');
    priceField.className = 'rp-field';
    priceField.innerHTML = '<label>Preu pagat (€)</label>';
    const priceInput = document.createElement('input');
    priceInput.type = 'text';
    priceInput.inputMode = 'decimal';
    priceInput.value = (typeof p.price === 'number') ? String(p.price) : '';
    priceInput.addEventListener('input', () => _rpOnFieldChange(p, 'price', priceInput.value));
    priceField.appendChild(priceInput);

    // Pes
    const weightField = document.createElement('div');
    weightField.className = 'rp-field';
    weightField.innerHTML = '<label>Pes / Qtat</label>';
    const weightInput = document.createElement('input');
    weightInput.type = 'text';
    weightInput.value = p.weight || '';
    weightInput.addEventListener('input', () => _rpOnFieldChange(p, 'weight', weightInput.value));
    weightField.appendChild(weightInput);

    // Caducitat amb toggle "No caduca"
    const expiryField = document.createElement('div');
    expiryField.className = 'rp-field rp-field-expiry';
    expiryField.innerHTML = '<label>Caducitat</label>';
    const ctrl = document.createElement('div');
    ctrl.className = 'rp-expiry-control';
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'rp-expiry-date';
    dateInput.value = p.date || '';
    dateInput.style.display = p.noExpiry ? 'none' : '';
    dateInput.addEventListener('input', () => _rpOnFieldChange(p, 'date', dateInput.value));
    const badge = document.createElement('span');
    badge.className = 'rp-no-expiry-badge';
    badge.textContent = 'No caduca';
    badge.style.display = p.noExpiry ? '' : 'none';
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'rp-no-expiry-toggle';
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = !!p.noExpiry;
    toggleInput.addEventListener('change', () => {
      const v = toggleInput.checked;
      // Show/hide date input inline (no full re-render).
      dateInput.style.display = v ? 'none' : '';
      badge.style.display = v ? '' : 'none';
      if (v) dateInput.value = '';
      _rpOnFieldChange(p, 'noExpiry', v);
      if (v) _rpOnFieldChange(p, 'date', '');
    });
    const toggleText = document.createTextNode(' No caduca');
    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleText);
    ctrl.appendChild(dateInput);
    ctrl.appendChild(badge);
    ctrl.appendChild(toggleLabel);
    expiryField.appendChild(ctrl);

    body.appendChild(priceField);
    body.appendChild(weightField);
    body.appendChild(expiryField);
    card.appendChild(body);
    return card;
  }

  // === Tracking de canvis ===
  function _rpGetOriginal(product, field) {
    if (field === 'price') return (typeof product.price === 'number') ? String(product.price) : '';
    if (field === 'weight') return product.weight || '';
    if (field === 'date') return product.date || '';
    if (field === 'noExpiry') return !!product.noExpiry;
    return undefined;
  }

  function _rpOnFieldChange(product, field, newValue) {
    const original = _rpGetOriginal(product, field);
    const state = _rpEditStates[product.id] || {};
    // Normalitza string-vs-bool per a comparació
    const isUnchanged = (field === 'noExpiry')
      ? (!!newValue === original)
      : (String(newValue) === String(original));
    if (isUnchanged) {
      delete state[field];
    } else {
      state[field] = newValue;
    }
    if (Object.keys(state).length === 0) {
      delete _rpEditStates[product.id];
    } else {
      _rpEditStates[product.id] = state;
    }
    _rpUpdateSaveBtn();
  }

  // === Helpers ===
  function _rpSameWeight(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    const na = String(a).toLowerCase().trim().replace(/\s+/g, '');
    const nb = String(b).toLowerCase().trim().replace(/\s+/g, '');
    return na === nb;
  }

  function _rpCalcDaysReal(addedAt, expiryDate) {
    if (!addedAt || !expiryDate) return null;
    const dCompra = new Date(addedAt);
    const dCaduc = new Date(expiryDate);
    if (isNaN(dCompra.getTime()) || isNaN(dCaduc.getTime())) return null;
    const ms = dCaduc.getTime() - dCompra.getTime();
    return Math.round(ms / 86400000);
  }

  function _rpResolvePopularId(product) {
    // Prefer: clau del purchaseHistory (ja resolta a recordPurchase)
    if (typeof findRecordByProductId === 'function') {
      const hist = findRecordByProductId(product.id);
      if (hist && hist.key && hist.key.indexOf('__') !== 0) {
        // Verificar que la clau és un popularId real (no nom fallback)
        const populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
        if (populars.some(p => p.id === hist.key)) return hist.key;
      }
    }
    // Fallback: match per nom contra cache popular
    const populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
    const nkey = String(product.name || '').toLowerCase().trim();
    const matched = populars.find(p => p.name && p.name.toLowerCase().trim() === nkey);
    return matched ? matched.id : null;
  }

  // === Desar canvis ===
  function _rpSaveAll() {
    const editedIds = Object.keys(_rpEditStates);
    if (editedIds.length === 0) return;

    // Llegim el popular cache UNA vegada per fer N edits in-memory i 1 sol save al final
    const populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
    let popularsTouched = false;

    editedIds.forEach(productId => {
      const product = (Array.isArray(products) ? products : []).find(p => p.id === productId);
      if (!product) return;
      const edits = _rpEditStates[productId];

      // === A) Actualitzar producte EatMe ===
      if ('price' in edits) {
        const v = edits.price;
        if (v === '' || v === null) {
          delete product.price;
        } else {
          // Coma decimal → punt (espanyol/català escriuen "1,20").
          // Inline perquè no hi ha helper centralitzat (mateix patró
          // que biteme.js:2107, buyme.js:1232, populars.js:386).
          const cleaned = String(v).replace(',', '.').trim();
          const n = parseFloat(cleaned);
          if (Number.isFinite(n) && n >= 0) product.price = n;
        }
      }
      if ('weight' in edits) {
        if (edits.weight) product.weight = edits.weight;
        else delete product.weight;
      }
      if ('noExpiry' in edits) {
        product.noExpiry = !!edits.noExpiry;
        if (product.noExpiry) product.date = null;
      }
      if ('date' in edits && !product.noExpiry) {
        product.date = edits.date || null;
      }

      // === B) Actualitzar purchaseHistory ===
      const histRef = (typeof findRecordByProductId === 'function') ? findRecordByProductId(productId) : null;
      const newDaysReal = product.noExpiry ? null : _rpCalcDaysReal(product.addedAt, product.date);
      if (histRef) {
        const partial = {};
        if ('price' in edits) partial.price = (typeof product.price === 'number') ? product.price : null;
        if ('weight' in edits) partial.weight = product.weight || null;
        if ('date' in edits || 'noExpiry' in edits) partial.days_real = newDaysReal;
        if (typeof updateHistoryRecord === 'function') updateHistoryRecord(productId, partial);
      } else if (typeof recordPurchase === 'function') {
        // Producte vell sense entry al history: crear-ne una.
        recordPurchase({
          popularId: _rpResolvePopularId(product),
          name: product.name,
          price: (typeof product.price === 'number') ? product.price : undefined,
          weight: product.weight || undefined,
          days_calc: null,
          days_real: newDaysReal,
          supermarket: null,
          productId: productId
        });
      }

      // === C) Enriquir el popular cache ===
      const popularId = _rpResolvePopularId(product);
      if (!popularId) return;
      const popular = populars.find(p => p.id === popularId);
      if (!popular) return;

      // --- PREU ---
      if ('price' in edits && typeof product.price === 'number') {
        const sameWeight = _rpSameWeight(product.weight, popular.weight);
        if (sameWeight) {
          if (typeof popular.price !== 'number') {
            popular.price = product.price;
            popularsTouched = true;
          } else {
            const diffPct = Math.abs(product.price - popular.price) / popular.price * 100;
            if (diffPct > 20) {
              popular.price = product.price;
              popularsTouched = true;
            }
          }
        }
      }

      // --- CADUCITAT (només si popular NO és noExpiry intrínsec) ---
      if (('date' in edits || 'noExpiry' in edits) && !popular.noExpiry) {
        if (product.noExpiry) {
          // L'usuari ha convertit aquest producte a noExpiry: no toquem
          // el popular (és un cas concret, no patró general).
        } else {
          const realDays = newDaysReal;
          if (typeof realDays === 'number' && realDays > 0) {
            if (typeof popular.days !== 'number') {
              popular.days = realDays;
              popularsTouched = true;
            } else {
              // Mitjana de les últimes 5 compres (history) + aquesta
              const hist = (typeof getHistoryForPopular === 'function')
                ? getHistoryForPopular(popularId) : [];
              const series = hist
                .filter(h => typeof h.days_real === 'number' && h.days_real > 0)
                .slice(0, 5)
                .map(h => h.days_real);
              series.push(realDays);
              const avg = series.reduce((s, d) => s + d, 0) / series.length;
              popular.days = Math.round(avg);
              popularsTouched = true;
            }
          }
        }
      }
    });

    // LIMITACIÓ — last-write-wins: si dos usuaris (parella amb sync
    // actiu) editen el mateix producte simultàniament, l'últim que
    // crida saveData() guanya. Firebase NO fa merge a nivell de camp
    // dins d'arrays (products) ni de map (purchaseHistory). Mateixa
    // limitació que el sync general de l'app, no específic d'aquesta
    // vista. Sense resolució de conflictes per ara.

    if (typeof saveData === 'function') saveData();
    if (popularsTouched && typeof savePopularProducts === 'function') savePopularProducts(populars);
    // purchaseHistory ja ha estat persistit dins de updateHistoryRecord
    // i recordPurchase (cada un crida savePurchaseHistory).

    const count = editedIds.length;
    _rpEditStates = {};
    _rpUpdateSaveBtn();
    if (typeof showToast === 'function') {
      showToast('✓ ' + count + (count === 1 ? ' producte actualitzat' : ' productes actualitzats'));
    }
    // Simula click del back-btn perquè respecti data-back i la
    // delegació central d'app.js. Si en el futur la pantalla d'origen
    // canvia (data-back), aquesta navegació seguirà essent correcta
    // sense haver de tocar aquest fitxer. El listener capture-phase
    // del back-btn ja no para res perquè _rpEditStates = {}.
    const _backBtnPost = document.querySelector('#screen-recent-purchases .back-btn');
    if (_backBtnPost) _backBtnPost.click();
    else if (typeof showScreen === 'function') showScreen('home');
  }

  // === Custom range modal ===
  function _rpOpenCustomRangeModal() {
    const today = new Date();
    const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);
    const toYmd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const defaultFrom = _rpCustomRange.from || toYmd(monthAgo);
    const defaultTo = _rpCustomRange.to || toYmd(today);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal-content rp-range-modal">' +
        '<p class="modal-title">Rang personalitzat</p>' +
        '<div class="rp-range-field"><label>Des de</label><input type="date" id="rp-range-from" value="' + defaultFrom + '"></div>' +
        '<div class="rp-range-field"><label>Fins a</label><input type="date" id="rp-range-to" value="' + defaultTo + '"></div>' +
        '<div class="modal-buttons">' +
          '<button class="modal-cancel" id="rp-range-cancel">Cancel·lar</button>' +
          '<button class="modal-confirm" id="rp-range-apply">Aplicar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
    overlay.querySelector('#rp-range-cancel').addEventListener('click', close);
    overlay.querySelector('#rp-range-apply').addEventListener('click', () => {
      const from = overlay.querySelector('#rp-range-from').value;
      const to = overlay.querySelector('#rp-range-to').value;
      if (!from || !to) {
        if (typeof showToast === 'function') showToast('Has d\'omplir les dues dates');
        return;
      }
      if (from > to) {
        if (typeof showToast === 'function') showToast('"Des de" ha d\'anar abans de "Fins a"');
        return;
      }
      _rpCustomRange = { from, to };
      _rpCurrentRange = 'custom';
      _rpUpdateFilterButtons();
      _rpUpdateCustomBtnLabel();
      _rpRender();
      close();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  // === Wiring (DOMContentLoaded) ===
  document.addEventListener('DOMContentLoaded', function() {
    const accessBtn = document.getElementById('btn-recent-purchases');
    if (accessBtn) accessBtn.addEventListener('click', openRecentPurchases);

    document.querySelectorAll('.rp-filter-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const range = this.dataset.range;
        if (range === 'custom') {
          _rpOpenCustomRangeModal();
          return;
        }
        _rpCurrentRange = range;
        _rpUpdateFilterButtons();
        _rpUpdateCustomBtnLabel();
        _rpRender();
      });
    });

    // Save button
    const saveBtn = document.querySelector('#screen-recent-purchases .rp-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', _rpSaveAll);

    // Cancel button (manual nav, no és .back-btn)
    const cancelBtn = document.querySelector('#screen-recent-purchases .rp-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', function() {
      const count = Object.keys(_rpEditStates).length;
      if (count > 0) {
        const msg = 'Tens ' + count + ' canvi' + (count === 1 ? '' : 's')
                  + ' sense desar. Si surts es perdran. Continuar?';
        if (!confirm(msg)) return;
        _rpEditStates = {};
      }
      if (typeof showScreen === 'function') showScreen('home');
    });

    // Back-btn (gestionat per delegació central a app.js). Intercepta amb
    // capture phase ABANS que la delegació s'executi per fer confirm si
    // hi ha canvis pendents.
    const backBtn = document.querySelector('#screen-recent-purchases .back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function(e) {
        const count = Object.keys(_rpEditStates).length;
        if (count === 0) return;
        const msg = 'Tens ' + count + ' canvi' + (count === 1 ? '' : 's')
                  + ' sense desar. Si surts es perdran. Continuar?';
        if (!confirm(msg)) {
          e.stopImmediatePropagation();
          e.preventDefault();
          return;
        }
        _rpEditStates = {};
      }, true); // capture
    }
  });

  window.openRecentPurchases = openRecentPurchases;
})();
