/* ============================================
   Buyte — js/buyme.js
   Mòdul de la llista de la compra: estat dels items,
   pantalla principal de supermercats, navegació amb swipe,
   afegir / editar / comprar items, modals "ja en tens".
   ============================================ */


function getShoppingItemsBySupermarket(supermarketId) {
  return shoppingItems.filter(it => it.supermarketId === supermarketId);
}

function openShoppingList() {
  renderSupermarkets();
  updateWhatIHaveCount();
  showScreen('shopping');
}

// ============ "QUÈ TINC A CASA" ============
let whatIHaveFilter = 'all';

function updateWhatIHaveCount() {
  const el = document.getElementById('what-i-have-count');
  if (el) el.textContent = '(' + (Array.isArray(products) ? products.length : 0) + ')';
}

function openWhatIHaveScreen() {
  whatIHaveFilter = 'all';
  // Reset visual de les pestanyes
  document.querySelectorAll('#what-i-have-filters .filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === 'all');
  });
  renderWhatIHave();
  showScreen('what-i-have');
}

function setWhatIHaveFilter(filter) {
  whatIHaveFilter = filter;
  document.querySelectorAll('#what-i-have-filters .filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === filter);
  });
  renderWhatIHave();
}

function buildWhatIHaveRow(p) {
  const row = document.createElement('button');
  row.className = 'view-all-row';
  const days = daysUntil(p.date);
  const loc = getLocationById(p.location || 'fridge');

  let daysClass = '';
  if (days !== Infinity) {
    if (days <= 2) daysClass = 'days-urgent';
    else if (days <= 5) daysClass = 'days-soon';
  }

  const locLabel = loc ? loc.emoji + ' ' + getLocationName(loc) : '';
  row.innerHTML = `
    <span class="view-all-emoji">${p.emoji}</span>
    <div class="view-all-info">
      <p class="view-all-name">${formatProductLine(p.name, p.qty)}</p>
      <p class="view-all-meta">${locLabel}${locLabel ? ' · ' : ''}<span class="${daysClass}">${daysText(days)}</span></p>
    </div>
    <span class="view-all-arrow">›</span>
  `;
  row.addEventListener('click', () => openProductDetail(p, 'what-i-have'));
  return row;
}

function renderWhatIHave() {
  const container = document.getElementById('what-i-have-list');
  const empty = document.getElementById('what-i-have-empty');
  if (!container) return;
  container.innerHTML = '';

  if (!Array.isArray(products) || products.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  if (whatIHaveFilter === 'zone') {
    // Agrupat per zona, dins cada zona ordenat per dies
    const sorted = [...products].sort((a, b) => {
      const la = getLocationById(a.location || 'fridge');
      const lb = getLocationById(b.location || 'fridge');
      const na = la ? getLocationName(la) : '';
      const nb = lb ? getLocationName(lb) : '';
      const cmp = na.localeCompare(nb);
      if (cmp !== 0) return cmp;
      return daysUntil(a.date) - daysUntil(b.date);
    });

    let lastZone = null;
    sorted.forEach(p => {
      const loc = getLocationById(p.location || 'fridge');
      const zone = loc ? loc.emoji + ' ' + getLocationName(loc) : '';
      if (zone !== lastZone) {
        const header = document.createElement('div');
        header.className = 'view-all-zone-header';
        header.textContent = zone;
        container.appendChild(header);
        lastZone = zone;
      }
      container.appendChild(buildWhatIHaveRow(p));
    });
    return;
  }

  // Mode 'all' o 'urgent': llista plana ordenada per dies fins caducar
  let list = [...products];
  if (whatIHaveFilter === 'urgent') {
    list = list.filter(p => {
      const d = daysUntil(p.date);
      return d !== Infinity && d <= 5;
    });
  }
  list.sort((a, b) => daysUntil(a.date) - daysUntil(b.date));

  if (list.length === 0) {
    // En mode 'urgent' sense res urgent: missatge curt
    const note = document.createElement('p');
    note.className = 'empty-state';
    note.textContent = '🎉 ' + (typeof t === 'function' ? t('shoppingDone') : '');
    container.appendChild(note);
    return;
  }

  list.forEach(p => container.appendChild(buildWhatIHaveRow(p)));
}

function renderSupermarkets() {
  const container = document.getElementById('shopping-supermarkets');
  if (!container) return;
  container.innerHTML = '';

  const visibleSupermarkets = getBuyMeVisibleSupermarkets();

  if (visibleSupermarkets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noActiveSupermarkets');
    container.appendChild(empty);
    return;
  }

  // Colors rotatius (gradients) per supermercat segons posició
  const gradients = [
    ['#42A5F5', '#1565C0'],   // blau
    ['#26A69A', '#00695C'],   // teal
    ['#FFA726', '#E65100'],   // taronja
    ['#AB47BC', '#7B1FA2'],   // violeta
    ['#EF5350', '#C62828'],   // vermell
    ['#66BB6A', '#388E3C'],   // verd
    ['#5C6BC0', '#3949AB']    // indigo
  ];

  visibleSupermarkets.forEach((sm, idx) => {
    const items = getShoppingItemsBySupermarket(sm.id);
    const [c1, c2] = gradients[idx % gradients.length];

    const card = document.createElement('button');
    card.className = 'supermarket-card';
    card.style.background = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    card.style.boxShadow = `0 4px 14px ${c2}40`;
    card.innerHTML = `
      <div class="supermarket-emoji">${sm.emoji}</div>
      <div class="supermarket-info">
        <p class="supermarket-name">${escapeHtml(sm.name)}</p>
        <p class="supermarket-count">${formatItemCount(items.length)}</p>
      </div>
      <span class="supermarket-arrow">›</span>
    `;
    card.addEventListener('click', () => openSupermarket(sm.id));
    container.appendChild(card);
  });
}


function formatItemCount(n) {
  if (n === 0) return t('emptyList');
  if (n === 1) return t('oneItem');
  return t('manyItems', n);
}

function openSupermarket(id, options) {
  const opts = options || {};
  currentSupermarketId = id;
  const sm = getSupermarketById(id);
  if (!sm) return;
  // Per defecte, en obrir un super, comencem en mode visualització.
  // Si tornem d'editar/eliminar un item, conservem el mode amb preserveMode.
  if (!opts.preserveMode) supermarketItemsMode = 'view';
  updateSupermarketEditBtn();
  renderShoppingItems();
  renderSupermarketDots();
  _updateSupermarketHeader();
  showScreen('supermarket');
  // Salt instantani a la pàgina del super escollit un cop el slider és
  // visible (cal layout per saber clientWidth).
  requestAnimationFrame(() => _scrollToSupermarket(currentSupermarketId, false));
}

function _scrollToSupermarket(id, smooth) {
  const slider = document.getElementById('shops-slider');
  if (!slider) return;
  const supers = getBuyMeVisibleSupermarkets();
  const idx = supers.findIndex(s => s.id === id);
  if (idx < 0) return;
  const apply = () => {
    const w = slider.clientWidth;
    if (!w) { requestAnimationFrame(apply); return; }
    const x = Math.round(idx * w);
    if (smooth) slider.scrollTo({ left: x, behavior: 'smooth' });
    else slider.scrollLeft = x;
  };
  apply();
}

(function _wireShopsResnap() {
  if (typeof window === 'undefined') return;
  if (window.__shopsSliderResizeWired) return;
  window.__shopsSliderResizeWired = true;
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const screen = document.getElementById('screen-supermarket');
      if (!screen || !screen.classList.contains('active')) return;
      _scrollToSupermarket(currentSupermarketId, false);
    }, 120);
  });
})();

function _updateSupermarketHeader() {
  const sm = getSupermarketById(currentSupermarketId);
  if (!sm) return;
  const titleEl = document.getElementById('supermarket-title');
  if (titleEl) titleEl.textContent = sm.emoji + ' ' + sm.name;
  const summaryEl = document.getElementById('supermarket-summary');
  if (summaryEl) {
    const items = getShoppingItemsBySupermarket(currentSupermarketId);
    summaryEl.textContent = items.length === 0
      ? t('shoppingEmptyHint')
      : t('shoppingItemsCount', items.length);
  }
}

let supermarketItemsMode = 'view';

function toggleSupermarketItemsMode() {
  supermarketItemsMode = supermarketItemsMode === 'view' ? 'edit' : 'view';
  updateSupermarketEditBtn();
  renderShoppingItems();
}

function updateSupermarketEditBtn() {
  const btn = document.getElementById('supermarket-edit-btn');
  if (!btn) return;
  btn.textContent = supermarketItemsMode === 'edit' ? '✓' : '✏️';
}

function renderSupermarketDots() {
  const dotsContainer = document.getElementById('supermarket-dots');
  if (!dotsContainer) return;
  dotsContainer.innerHTML = '';
  const visible = getBuyMeVisibleSupermarkets();
  visible.forEach(sm => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'sm-dot' + (sm.id === currentSupermarketId ? ' active' : '');
    dot.setAttribute('aria-label', sm.name);
    if (sm.id === currentSupermarketId) dot.setAttribute('aria-current', 'true');
    dot.addEventListener('click', () => {
      if (sm.id === currentSupermarketId) return;
      // El scroll listener actualitzarà currentSupermarketId i la
      // resta d'UI quan acabi el snap.
      _scrollToSupermarket(sm.id, true);
    });
    dotsContainer.appendChild(dot);
  });
}

// El swipe entre supermercats ara el gestiona scroll-snap natiu del
// .shops-slider (vegeu styles.css). Conservem la funció com a hook
// buit perquè openSupermarket encara la crida.
function setupSupermarketSwipe() {}

// Construeix les pàgines del slider (#shops-slider) i ompla cadascuna
// amb els items del seu supermercat. Només la pàgina del supermercat
// actual mostra el mode d'edició actiu (la resta es renderitzen en
// mode 'view' per evitar UI inconsistent en pàgines no-visibles).
function renderShoppingItems() {
  const slider = document.getElementById('shops-slider');
  if (!slider) return;

  const supers = getBuyMeVisibleSupermarkets();

  // Construïm les pàgines un sol cop (o si canvia el conjunt de supers).
  const existingIds = Array.from(slider.children).map(c => c.dataset.smId);
  const wantedIds = supers.map(s => s.id);
  const sameSet = existingIds.length === wantedIds.length
    && existingIds.every((id, i) => id === wantedIds[i]);
  if (!sameSet) {
    slider.innerHTML = '';
    supers.forEach(sm => {
      const page = document.createElement('div');
      page.className = 'shop-page';
      page.dataset.smId = sm.id;
      const list = document.createElement('div');
      list.className = 'shopping-items-list';
      page.appendChild(list);
      slider.appendChild(page);
    });
    _setupShopsSliderScrollListener(slider);
  }

  // Renderitzem els items de cada pàgina.
  supers.forEach(sm => {
    const page = slider.querySelector('.shop-page[data-sm-id="' + sm.id + '"]');
    if (!page) return;
    const list = page.querySelector('.shopping-items-list');
    if (!list) return;
    const mode = (sm.id === currentSupermarketId) ? supermarketItemsMode : 'view';
    _renderShopPageItems(sm.id, list, mode);
  });

  _updateSupermarketHeader();
}

function _renderShopPageItems(smId, listEl, mode) {
  listEl.innerHTML = '';
  const items = getShoppingItemsBySupermarket(smId);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'shopping-empty-celebration';
    empty.innerHTML = `
      <div class="celebrate-emoji">🎉</div>
      <p class="celebrate-title">${t('shoppingDone')}</p>
      <p class="celebrate-sub">${t('shoppingDoneSub')}</p>
    `;
    listEl.appendChild(empty);
    return;
  }

  items.forEach((item, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === items.length - 1;
    const div = document.createElement('div');
    div.className = 'shopping-item' + (mode === 'edit' ? ' shopping-item-edit-mode' : '');
    const meta = item.notes
      ? `<p class="shopping-item-meta">${escapeHtml(item.notes)}</p>`
      : '';

    if (mode === 'edit') {
      div.innerHTML = `
        <div class="shopping-item-emoji">${item.emoji}</div>
        <div class="shopping-item-info">
          <p class="shopping-item-name">${formatProductLine(item.name, item.qty)}</p>
          ${meta}
        </div>
        <div class="shopping-item-arrows">
          <button class="arrow-btn ${isFirst ? 'arrow-disabled' : ''}" data-action="up" ${isFirst ? 'disabled' : ''} aria-label="Up">▲</button>
          <button class="arrow-btn ${isLast ? 'arrow-disabled' : ''}" data-action="down" ${isLast ? 'disabled' : ''} aria-label="Down">▼</button>
        </div>
        <button class="shopping-item-edit" data-action="edit" data-id="${item.id}" aria-label="Edit">✏️</button>
      `;
      div.querySelector('[data-action="edit"]').addEventListener('click', () => openShoppingItemEdit(item));
      const upBtn = div.querySelector('[data-action="up"]');
      const downBtn = div.querySelector('[data-action="down"]');
      if (upBtn && !isFirst) upBtn.addEventListener('click', () => moveShoppingItem(idx, -1));
      if (downBtn && !isLast) downBtn.addEventListener('click', () => moveShoppingItem(idx, 1));
    } else {
      div.innerHTML = `
        <div class="shopping-item-emoji">${item.emoji}</div>
        <div class="shopping-item-info">
          <p class="shopping-item-name">${formatProductLine(item.name, item.qty)}</p>
          ${meta}
        </div>
        <button class="shopping-item-bought" data-action="bought" data-id="${item.id}" aria-label="Bought">
          <span style="font-size:18px">✅</span>
          <span data-i18n="bought">${t('bought')}</span>
        </button>
      `;
      div.querySelector('[data-action="bought"]').addEventListener('click', () => buyShoppingItem(item));
    }

    listEl.appendChild(div);
  });
}

let _shopsSliderScrollListenerWired = false;
function _setupShopsSliderScrollListener(slider) {
  if (_shopsSliderScrollListenerWired) return;
  _shopsSliderScrollListenerWired = true;
  let scrollTimer = null;
  slider.addEventListener('scroll', () => {
    // Efecte cub 3D: helper compartit (js/core.js), batched amb rAF.
    applyCubeSliderEffect(slider);
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const w = slider.clientWidth;
      if (!w) return;
      const idx = Math.round(slider.scrollLeft / w);
      const supers = getBuyMeVisibleSupermarkets();
      const sm = supers[idx];
      if (sm && sm.id !== currentSupermarketId) {
        currentSupermarketId = sm.id;
        // En canviar de super, sortim del mode d'edició: cada super
        // hauria de començar net en mode visualització.
        supermarketItemsMode = 'view';
        updateSupermarketEditBtn();
        // Re-renderitzem per assegurar que la pàgina anterior queda en
        // mode view (per si tenia edició) i actualitzem títol/comptador.
        renderShoppingItems();
        renderSupermarketDots();
      }
    }, 80);
  }, { passive: true });
  // Estat inicial del cub: pàgina 0 al davant, la resta als laterals.
  applyCubeSliderEffect(slider);
}

// Afegir/editar supermercat
function openSupermarketEdit(sm) {
  editingSupermarket = sm; // null = nou
  const isNew = !sm;
  document.getElementById('supermarket-edit-title').textContent =
    isNew ? t('newSupermarket') : t('editSupermarket');
  document.getElementById('input-supermarket-name').value = isNew ? '' : sm.name;
  selectedSupermarketEmoji = isNew ? '🛒' : sm.emoji;

  const delBtn = document.getElementById('btn-delete-supermarket');
  if (delBtn) delBtn.style.display = isNew ? 'none' : 'block';

  renderSupermarketEmojiPicker();
  showScreen('supermarket-edit');
}

function renderSupermarketEmojiPicker() {
  renderSupermarketEmojiPickerBtn();
}

function saveSupermarket() {
  const name = document.getElementById('input-supermarket-name').value.trim();
  if (!name) { showToast(t('nameRequired')); return; }

  if (editingSupermarket) {
    editingSupermarket.name = name;
    editingSupermarket.emoji = selectedSupermarketEmoji;
  } else {
    const id = 'sm-custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    supermarkets.push({ id, name, emoji: selectedSupermarketEmoji, enabled: true });
  }
  saveShoppingData();
  showToast(t('saved'));
  // Tornem a la pantalla de gestió si estàvem editant des d'allà
  openManageSupermarkets('shopping');
}

function deleteSupermarket() {
  if (!editingSupermarket) return;
  const itemsCount = getShoppingItemsBySupermarket(editingSupermarket.id).length;
  const msg = itemsCount > 0 ? t('confirmDeleteSupermarketWithItems', itemsCount) : t('confirmDeleteSupermarket');
  if (!confirm(msg)) return;
  // Esborra items associats
  shoppingItems = shoppingItems.filter(it => it.supermarketId !== editingSupermarket.id);
  // Esborra supermercat
  supermarkets = supermarkets.filter(s => s.id !== editingSupermarket.id);
  saveShoppingData();
  showToast(t('deleted'));
  openShoppingList();
}

// Afegir/editar item
function openShoppingItemEdit(item) {
  editingShoppingItem = item;
  const isNew = !item;
  document.getElementById('shopping-item-edit-title').textContent =
    isNew ? t('newShoppingItem') : t('editShoppingItem');
  document.getElementById('input-shopping-name').value = isNew ? '' : item.name;
  document.getElementById('input-shopping-qty').value = isNew ? '' : (item.qty || '');
  document.getElementById('input-shopping-notes').value = isNew ? '' : (item.notes || '');
  selectedShoppingEmoji = isNew ? '🥛' : item.emoji;

  const dateInput = document.getElementById('input-shopping-date');
  const noExpInput = document.getElementById('input-shopping-no-expiry');
  if (dateInput && noExpInput) {
    if (isNew) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dateInput.value = formatDateForInput(d);
      noExpInput.checked = false;
    } else {
      noExpInput.checked = !!item.noExpiry;
      dateInput.value = (!item.noExpiry && item.date) ? item.date : '';
    }
  }

  const delBtn = document.getElementById('btn-delete-shopping-item');
  if (delBtn) delBtn.style.display = isNew ? 'none' : 'block';

  // Selector de botiga: només si estem editant
  const shopGroup = document.getElementById('shop-selector-group');
  const shopSelect = document.getElementById('input-shopping-shop');
  if (shopGroup && shopSelect) {
    if (isNew) {
      shopGroup.style.display = 'none';
    } else {
      shopGroup.style.display = 'block';
      shopSelect.innerHTML = '';
      const enabled = getEnabledSupermarkets();
      enabled.forEach(sm => {
        const opt = document.createElement('option');
        opt.value = sm.id;
        opt.textContent = sm.emoji + ' ' + sm.name;
        if (sm.id === item.supermarketId) opt.selected = true;
        shopSelect.appendChild(opt);
      });
    }
  }

  renderShoppingEmojiPicker();
  showScreen('shopping-item-edit');
}

function renderShoppingEmojiPicker() {
  renderShoppingEmojiPickerBtn();
}

// Cerca productes al BiteMe amb nom similar (substring en qualsevol direcció).
// S'utilitza per avisar abans d'afegir duplicats a la llista de la compra.
function findExistingAtHome(name) {
  if (!name) return [];
  const lowerName = name.toLowerCase();
  return products.filter(p => p.name.toLowerCase().includes(lowerName) || lowerName.includes(p.name.toLowerCase()));
}

// Quan ve marcat a true, saveShoppingItem salta la comprovació "ja en tens"
// (perquè l'usuari ja l'ha vista i confirmada en un pas previ).
let skipExistingCheckOnNextSave = false;

function saveShoppingItem() {
  const name = document.getElementById('input-shopping-name').value.trim();
  if (!name) { showToast(t('nameRequired')); return; }
  const qty = document.getElementById('input-shopping-qty').value.trim();
  const notes = document.getElementById('input-shopping-notes').value.trim();
  const dateInput = document.getElementById('input-shopping-date');
  const noExpInput = document.getElementById('input-shopping-no-expiry');
  const noExpiry = !!(noExpInput && noExpInput.checked);
  const date = (!noExpiry && dateInput) ? dateInput.value : '';

  // Aprenentatge: si l'usuari ha posat data o "no caduca", desem el producte
  // als populars per recordar emoji + dies + flag noExpiry per la propera vegada.
  const learnPopular = () => {
    if (typeof addToCustomPopular !== 'function') return;
    let days = null;
    if (date) {
      const diff = daysUntil(date);
      if (Number.isFinite(diff) && diff > 0) days = diff;
    }
    if (noExpiry || days) {
      addToCustomPopular(name, selectedShoppingEmoji, days, null, noExpiry);
    }
  };

  if (editingShoppingItem) {
    const originalSupermarketId = editingShoppingItem.supermarketId;
    editingShoppingItem.name = name;
    editingShoppingItem.emoji = selectedShoppingEmoji;
    editingShoppingItem.qty = qty;
    editingShoppingItem.notes = notes;
    editingShoppingItem.date = noExpiry ? null : (date || null);
    editingShoppingItem.noExpiry = noExpiry;
    // Aplicar canvi de botiga si l'usuari l'ha canviada
    const shopSelect = document.getElementById('input-shopping-shop');
    if (shopSelect && shopSelect.value) {
      editingShoppingItem.supermarketId = shopSelect.value;
    }
    saveShoppingData();
    learnPopular();
    showToast(t('saved'));
    // Tornem al super ORIGINAL (no al nou) preservant el mode
    openSupermarket(originalSupermarketId, { preserveMode: true });
    return;
  }

  // Nou item: comprovem si ja en té a casa (BiteMe), tret que ja s'hagi
  // confirmat en un pas previ (popular pre-check, barcode pre-check).
  const existingAtHome = skipExistingCheckOnNextSave ? [] : findExistingAtHome(name);
  skipExistingCheckOnNextSave = false;

  if (existingAtHome.length > 0) {
    showAlreadyHaveModal(name, existingAtHome, () => {
      const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      shoppingItems.push({
        id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
        qty, notes, addedAt: Date.now(),
        date: noExpiry ? null : (date || null),
        noExpiry
      });
      saveShoppingData();
      learnPopular();
      showToast(t('saved'));
      openSupermarket(currentSupermarketId);
    });
    return;
  }

  const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  shoppingItems.push({
    id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
    qty, notes, addedAt: Date.now(),
    date: noExpiry ? null : (date || null),
    noExpiry
  });
  saveShoppingData();
  learnPopular();
  showToast(t('saved'));
  openSupermarket(currentSupermarketId);
}

function showAlreadyHaveModal(itemName, existingProducts, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const list = existingProducts.slice(0, 3).map(p => {
    const days = daysUntil(p.date);
    return `<div class="already-have-row">${p.emoji} ${formatProductLine(p.name, p.qty)} <span class="already-have-days">${daysText(days)}</span></div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">⚠️</div>
      <p class="modal-title">${t('alreadyHaveTitle')}</p>
      <p class="modal-sub">${existingProducts.length === 1 ? t('alreadyHaveSubOne') : t('alreadyHaveSubMany', existingProducts.length)}</p>
      <div class="already-have-list">${list}</div>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('addAnyway')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    onConfirm();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function deleteShoppingItem() {
  if (!editingShoppingItem) return;
  if (!confirm(t('confirmDeleteShoppingItem'))) return;
  shoppingItems = shoppingItems.filter(it => it.id !== editingShoppingItem.id);
  saveShoppingData();
  showToast(t('deleted'));
  openSupermarket(currentSupermarketId, { preserveMode: true });
}

// Quan l'usuari prem "Comprat" → obre el formulari del tracker amb el nom prefilfat
function buyShoppingItem(item) {
  pendingShoppingItemId = item.id;
  pendingShoppingSupermarketId = item.supermarketId;

  // Cerquem si aquest producte és a la llista de populars per pre-fillar dies + zona
  const populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
  const fromPopular = populars.find(p => p.name.toLowerCase().trim() === item.name.toLowerCase().trim());

  // També cerquem a l'historial
  const fromHistory = productHistory.find(p => p.name.toLowerCase().trim() === item.name.toLowerCase().trim());

  // Si el propi item té data, calculem els dies que falten
  let itemDays = null;
  if (item.date) {
    const diff = daysUntil(item.date);
    if (Number.isFinite(diff) && diff > 0) itemDays = diff;
  }

  const prefill = {
    name: item.name,
    emoji: item.emoji,
    qty: item.qty,
    days: itemDays || (fromPopular && fromPopular.days) || (fromHistory && fromHistory.days) || null,
    location: (fromPopular && fromPopular.location) || (fromHistory && fromHistory.location) || null,
    noExpiry: !!(item.noExpiry || (fromPopular && fromPopular.noExpiry) || (fromHistory && fromHistory.noExpiry)),
    price: (fromPopular && typeof fromPopular.price === 'number') ? fromPopular.price
         : (fromHistory && typeof fromHistory.price === 'number') ? fromHistory.price
         : undefined
  };

  if (typeof openAddForm === 'function') {
    openAddForm(prefill);
  } else {
    showToast(t('error'));
  }
}

let pendingShoppingItemId = null; // si està definit, després de guardar producte traiem aquest item
let pendingShoppingSupermarketId = null; // si està definit, tornem a aquest supermercat després de guardar
let pendingShoppingScanContext = false; // true si l'escànner s'obre des de BuyMe

// Inicia l'escànner en mode "afegir a BuyMe"
async function startShoppingScanner() {
  pendingShoppingScanContext = true;
  showScreen('scan');
  if (typeof startScanner === 'function') {
    await startScanner();
  }
}

// Prefilla el formulari del BuyMe (screen-shopping-item-edit) amb les dades
// d'un popular. Es crida quan l'usuari selecciona un popular des del flux
// d'afegir a un supermercat.
function prefillShoppingItemFromPopular(p) {
  if (!p) return;
  // Marquem que estem creant nou (no editant) perquè saveShoppingItem
  // tracti el resultat com a item nou al supermercat actual.
  editingShoppingItem = null;
  const titleEl = document.getElementById('shopping-item-edit-title');
  if (titleEl) titleEl.textContent = t('newShoppingItem');

  document.getElementById('input-shopping-name').value = p.name || '';
  document.getElementById('input-shopping-qty').value = '';
  document.getElementById('input-shopping-notes').value = '';
  selectedShoppingEmoji = p.emoji || '🥛';
  renderShoppingEmojiPicker();

  const dateInput = document.getElementById('input-shopping-date');
  const noExpInput = document.getElementById('input-shopping-no-expiry');
  if (noExpInput) noExpInput.checked = !!p.noExpiry;
  if (dateInput) {
    if (p.noExpiry) {
      dateInput.value = '';
    } else if (p.days) {
      const d = new Date();
      d.setDate(d.getDate() + p.days);
      dateInput.value = formatDateForInput(d);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dateInput.value = formatDateForInput(d);
    }
  }

  const delBtn = document.getElementById('btn-delete-shopping-item');
  if (delBtn) delBtn.style.display = 'none';
  const shopGroup = document.getElementById('shop-selector-group');
  if (shopGroup) shopGroup.style.display = 'none';
}


function askAddToShoppingList(product) {
  // Si no hi ha cap supermercat, no preguntem (no té sentit)
  if (!supermarkets || supermarkets.length === 0) return;

  // Mostrem un modal en estil de l'app (no el confirm nadiu del navegador)
  showAddToShoppingModal(product);
}

function showAddToShoppingModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">🛒</div>
      <p class="modal-title">${t('askAddToShoppingTitle')}</p>
      <p class="modal-product-name">${escapeHtml(product.emoji + ' ' + product.name)}</p>
      <p class="modal-sub">${t('askAddToShoppingSub')}</p>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('noThanks')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('addToList')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    // Sempre mostrem el modal complet (qty + selector de super amb tots
    // els actius, preferits i no preferits). Així l'usuari pot ajustar
    // la quantitat abans d'afegir, no només el super.
    showManualAddToBuyMeModal(product);
  });

  // Click fora del modal el tanca (= cancel·lar)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function addToShoppingList(supermarketId, product, qty) {
  const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  shoppingItems.push({
    id, supermarketId,
    name: product.name,
    emoji: product.emoji,
    qty: qty || '',
    notes: '',
    addedAt: Date.now()
  });
  saveShoppingData();
  // Gamificació: 1 XP per item afegit al BuyMe + comptador històric.
  if (typeof bumpBuymeAddedCounter === 'function') bumpBuymeAddedCounter(1);
  if (typeof addXp === 'function') addXp(1, 'buyme-add');
}

// Flux manual: pregunta quantitat i supermercat per afegir al BuyMe
function manualAddToBuyMe(product) {
  if (!supermarkets || supermarkets.length === 0) {
    showToast(t('noActiveSupermarkets'));
    return;
  }
  showManualAddToBuyMeModal(product);
}

function showManualAddToBuyMeModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const gradients = [
    ['#42A5F5', '#1565C0'], ['#26A69A', '#00695C'], ['#FFA726', '#E65100'],
    ['#AB47BC', '#7B1FA2'], ['#EF5350', '#C62828'], ['#66BB6A', '#388E3C'],
    ['#5C6BC0', '#3949AB']
  ];

  // Preferides primer, després la resta
  const preferred = getEnabledSupermarkets();
  const preferredIds = new Set(preferred.map(s => s.id));
  const others = supermarkets.filter(s => !preferredIds.has(s.id));
  const ordered = [...preferred, ...others];

  const renderBtn = (sm, idx) => {
    const [c1, c2] = gradients[idx % gradients.length];
    return `
      <button class="modal-supermarket-btn" data-id="${sm.id}" style="background:linear-gradient(135deg, ${c1} 0%, ${c2} 100%)">
        <span class="modal-sm-emoji">${sm.emoji}</span>
        <span class="modal-sm-name">${escapeHtml(sm.name)}</span>
      </button>
    `;
  };

  const sectionHeader = (label) => `
    <p class="modal-sub" style="margin:10px 0 6px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.7">${label}</p>
  `;

  let smButtons = '';
  let counter = 0;
  if (preferred.length > 0) {
    smButtons += sectionHeader(t('preferredShops'));
    smButtons += preferred.map(sm => renderBtn(sm, counter++)).join('');
  }
  if (others.length > 0) {
    smButtons += sectionHeader(t('otherShops'));
    smButtons += others.map(sm => renderBtn(sm, counter++)).join('');
  }

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">🛒</div>
      <p class="modal-title">${t('addToList')}</p>
      <p class="modal-product-name">${escapeHtml(product.emoji + ' ' + product.name)}</p>
      <label style="display:block;text-align:left;font-size:13px;color:var(--text-muted);margin:14px 0 4px">${t('quantity')}</label>
      <input type="text" id="modal-qty-input" class="select-input" placeholder="${t('quantityPlaceholder')}" value="${escapeHtml(product.qty || '')}" style="margin-bottom:14px">
      <p class="modal-sub" style="margin:0 0 6px">${t('chooseSupermarket')}</p>
      <div class="modal-options">${smButtons}</div>
      <button class="modal-cancel" id="modal-cancel-btn" style="margin-top:10px">${t('cancel')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.modal-supermarket-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const smId = btn.dataset.id;
      const qty = (overlay.querySelector('#modal-qty-input').value || '').trim();
      const sm = getSupermarketById(smId);
      addToShoppingList(smId, product, qty);
      document.body.removeChild(overlay);
      showToast('🛒 ' + t('addedToShopping', sm ? sm.name : ''));
    });
  });

  overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}


let shoppingItems = []; // Array de {id, supermarketId, name, emoji, qty, notes, addedAt}

let editingShoppingItem = null;

let selectedShoppingEmoji = '🥛';

function renderShoppingEmojiPickerBtn() {
  const btn = document.getElementById('shopping-emoji-current');
  if (btn) btn.textContent = selectedShoppingEmoji;
}

// Variables per saber quin camp està seleccionant emoji
