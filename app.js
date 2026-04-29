/* ============================================
   EATMEFIRST v3 - Lògica de l'app
   ============================================ */






// LLISTA DE LA COMPRA
let supermarkets = []; // Array de {id, name, emoji}
let shoppingItems = []; // Array de {id, supermarketId, name, emoji, qty, notes, addedAt}
let currentSupermarketId = null;
let editingSupermarket = null; // null = nou, objecte = editant
let editingShoppingItem = null;
let selectedSupermarketEmoji = '🛒';
let selectedShoppingEmoji = '🥛';




let currentCountry = 'ES'; // país actual de l'usuari





// ============ LLISTA DE LA COMPRA ============


// Inicialitza els supermercats per a un país (només en marca els 4 primers)
// Quan l'usuari canvia de país, afegeix els nous supermercats sense esborrar els personalitzats






// Pantalla principal: llista de supermercats
// ============ PANTALLA VEURE-HO TOT ============


// ============ LLISTES ESPECIALS ============



// ============ PANTALLA VEURE-HO TOT ============


// ============ LLISTES ESPECIALS ============

// Llistes especials per defecte (es poden editar i guardar a localStorage)
const DEFAULT_SPECIAL_LISTS = [
  {
    id: 'picnic', emoji: '🧺', nameKey: 'listPicnic',
    items: [
      { name: 'Pa', emoji: '🥖', qty: '' },
      { name: 'Embotit', emoji: '🥓', qty: '' },
      { name: 'Formatge', emoji: '🧀', qty: '' },
      { name: 'Tomàquet', emoji: '🍅', qty: '' },
      { name: 'Aigua', emoji: '💧', qty: '' },
      { name: 'Fruita', emoji: '🍎', qty: '' },
      { name: 'Galetes', emoji: '🍪', qty: '' },
      { name: 'Suc', emoji: '🧃', qty: '' },
      { name: 'Tovalloletes', emoji: '🧻', qty: '' }
    ]
  },
  {
    id: 'birthday', emoji: '🎂', nameKey: 'listBirthday',
    items: [
      { name: 'Pastís', emoji: '🎂', qty: '' },
      { name: 'Espelmes', emoji: '🕯️', qty: '' },
      { name: 'Globus', emoji: '🎈', qty: '' },
      { name: 'Aperitius', emoji: '🥨', qty: '' },
      { name: 'Refrescos', emoji: '🥤', qty: '' },
      { name: 'Patates', emoji: '🍟', qty: '' },
      { name: 'Olives', emoji: '🫒', qty: '' },
      { name: 'Plats i gots', emoji: '🍽️', qty: '' },
      { name: 'Regal', emoji: '🎁', qty: '' }
    ]
  },
  {
    id: 'calcotada', emoji: '🌱', nameKey: 'listCalcotada',
    items: [
      { name: 'Calçots', emoji: '🌱', qty: '' },
      { name: 'Salsa romesco', emoji: '🥫', qty: '' },
      { name: 'Carn brasa', emoji: '🥩', qty: '' },
      { name: 'Botifarra', emoji: '🌭', qty: '' },
      { name: 'Pa', emoji: '🥖', qty: '' },
      { name: 'Vi', emoji: '🍷', qty: '' },
      { name: 'Mongetes', emoji: '🫘', qty: '' },
      { name: 'Crema catalana', emoji: '🍮', qty: '' }
    ]
  },
  {
    id: 'breakfast', emoji: '☕', nameKey: 'listBreakfast',
    items: [
      { name: 'Llet', emoji: '🥛', qty: '' },
      { name: 'Cafè', emoji: '☕', qty: '' },
      { name: 'Pa de motlle', emoji: '🍞', qty: '' },
      { name: 'Mantega', emoji: '🧈', qty: '' },
      { name: 'Melmelada', emoji: '🍓', qty: '' },
      { name: 'Cereals', emoji: '🥣', qty: '' },
      { name: 'Suc taronja', emoji: '🧃', qty: '' }
    ]
  },
  {
    id: 'bbq', emoji: '🔥', nameKey: 'listBBQ',
    items: [
      { name: 'Carn vermella', emoji: '🥩', qty: '' },
      { name: 'Pollastre', emoji: '🍗', qty: '' },
      { name: 'Salsitxes', emoji: '🌭', qty: '' },
      { name: 'Hamburgueses', emoji: '🍔', qty: '' },
      { name: 'Carbó', emoji: '⚫', qty: '' },
      { name: 'Cervesa', emoji: '🍺', qty: '' },
      { name: 'Amanida', emoji: '🥗', qty: '' },
      { name: 'Pa', emoji: '🥖', qty: '' }
    ]
  },
  {
    id: 'pasta', emoji: '🍝', nameKey: 'listPasta',
    items: [
      { name: 'Espaguetis', emoji: '🍝', qty: '' },
      { name: 'Tomàquet fregit', emoji: '🥫', qty: '' },
      { name: 'Carn picada', emoji: '🥩', qty: '' },
      { name: 'Formatge ratllat', emoji: '🧀', qty: '' },
      { name: 'All', emoji: '🧄', qty: '' },
      { name: 'Ceba', emoji: '🧅', qty: '' },
      { name: 'Vi negre', emoji: '🍷', qty: '' }
    ]
  }
];

let specialListsData = null;
let specialListsMode = 'view'; // 'view' o 'edit'
let currentSpecialList = null;
let specialListItemMode = 'view';

function loadSpecialLists() {
  const saved = localStorage.getItem('eatmefirst_special_lists');
  if (saved) {
    try { specialListsData = JSON.parse(saved); }
    catch(e) { specialListsData = JSON.parse(JSON.stringify(DEFAULT_SPECIAL_LISTS)); }
  } else {
    specialListsData = JSON.parse(JSON.stringify(DEFAULT_SPECIAL_LISTS));
  }
  specialListsData.forEach(list => {
    if (typeof list.enabled === 'undefined') list.enabled = true;
    if (!Array.isArray(list.items)) list.items = [];
    list.items.forEach(it => {
      if (typeof it.qty === 'undefined') it.qty = '';
    });
  });
}

function saveSpecialLists() {
  localStorage.setItem('eatmefirst_special_lists', JSON.stringify(specialListsData));
  if (typeof pushToServer === 'function') pushToServer();
}

function openSpecialLists() {
  if (!specialListsData) loadSpecialLists();
  specialListsMode = 'view';
  renderSpecialLists();
  showScreen('special-lists');
}

function renderSpecialLists() {
  if (!specialListsData) loadSpecialLists();
  const container = document.getElementById('special-lists-grid');
  if (!container) return;
  container.innerHTML = '';

  specialListsData.forEach((list, idx) => {
    if (specialListsMode === 'view' && list.enabled === false) return;

    const isFirst = idx === 0;
    const isLast = idx === specialListsData.length - 1;
    const card = document.createElement('div');
    card.className = 'special-list-card';
    const displayName = list.nameKey ? t(list.nameKey) : (list.name || '-');

    if (specialListsMode === 'edit') {
      card.style.position = 'relative';
      card.innerHTML = '<label class="manage-sm-checkbox" style="position:absolute;top:6px;left:6px"><input type="checkbox" data-idx="' + idx + '" ' + (list.enabled !== false ? 'checked' : '') + '><span class="checkmark"></span></label>'
        + '<span class="special-list-emoji">' + list.emoji + '</span>'
        + '<span class="special-list-name">' + escapeHtml(displayName) + '</span>'
        + '<span class="special-list-count">' + list.items.length + ' ' + t('items') + '</span>'
        + '<div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;justify-content:center">'
        + '<button class="arrow-btn ' + (isFirst ? 'arrow-disabled' : '') + '" data-action="up" ' + (isFirst ? 'disabled' : '') + '>▲</button>'
        + '<button class="arrow-btn ' + (isLast ? 'arrow-disabled' : '') + '" data-action="down" ' + (isLast ? 'disabled' : '') + '>▼</button>'
        + '<button class="popular-edit-btn" data-action="edit-list">✏️</button>'
        + (list.id.startsWith('custom-') ? '<button class="popular-delete-btn" data-action="del-list">✕</button>' : '')
        + '</div>';
      const cb = card.querySelector('input[type="checkbox"]');
      if (cb) cb.addEventListener('change', (e) => {
        list.enabled = e.target.checked;
        saveSpecialLists();
      });
      const upBtn = card.querySelector('[data-action="up"]');
      const downBtn = card.querySelector('[data-action="down"]');
      if (upBtn && !isFirst) upBtn.addEventListener('click', (e) => { e.stopPropagation(); moveSpecialList(idx, -1); });
      if (downBtn && !isLast) downBtn.addEventListener('click', (e) => { e.stopPropagation(); moveSpecialList(idx, 1); });
      card.querySelector('[data-action="edit-list"]').addEventListener('click', (e) => { e.stopPropagation(); openSpecialDetail(list, true); });
      const delBtn = card.querySelector('[data-action="del-list"]');
      if (delBtn) delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteSpecialList(idx); });
    } else {
      card.innerHTML = '<span class="special-list-emoji">' + list.emoji + '</span>'
        + '<span class="special-list-name">' + escapeHtml(displayName) + '</span>'
        + '<span class="special-list-count">' + list.items.length + ' ' + t('items') + '</span>';
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => openSpecialDetail(list, false));
    }
    container.appendChild(card);
  });

  updateSpecialListsButtons();
}

function updateSpecialListsButtons() {
  const editBtn = document.getElementById('btn-toggle-edit-special-lists');
  const addBtn = document.getElementById('btn-add-custom-special-list');
  const saveBtn = document.getElementById('btn-save-special-lists');
  if (specialListsMode === 'edit') {
    if (editBtn) editBtn.style.display = 'none';
    if (addBtn) addBtn.style.display = 'flex';
    if (saveBtn) saveBtn.style.display = 'block';
  } else {
    if (editBtn) editBtn.style.display = 'flex';
    if (addBtn) addBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
  }
}

function toggleEditSpecialListsMode() {
  specialListsMode = specialListsMode === 'view' ? 'edit' : 'view';
  renderSpecialLists();
}

function moveSpecialList(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= specialListsData.length) return;
  [specialListsData[idx], specialListsData[newIdx]] = [specialListsData[newIdx], specialListsData[idx]];
  saveSpecialLists();
  renderSpecialLists();
}

function deleteSpecialList(idx) {
  if (!confirm(t('confirmDeleteList') || 'Esborrar?')) return;
  specialListsData.splice(idx, 1);
  saveSpecialLists();
  renderSpecialLists();
}

function addCustomSpecialList() {
  const name = prompt(t('newListName') || 'Nom de la nova llista:');
  if (!name || !name.trim()) return;
  specialListsData.push({
    id: 'custom-' + Date.now(),
    emoji: '📋',
    name: name.trim(),
    enabled: true,
    items: []
  });
  saveSpecialLists();
  renderSpecialLists();
}

function openSpecialDetail(list, editMode) {
  currentSpecialList = list;
  specialListItemMode = editMode ? 'edit' : 'view';
  const displayName = list.nameKey ? t(list.nameKey) : (list.name || '-');
  document.getElementById('special-detail-title').textContent = list.emoji + ' ' + displayName;
  renderSpecialDetail();
  showScreen('special-detail');
}

function renderSpecialDetail() {
  if (!currentSpecialList) return;
  const container = document.getElementById('special-detail-list');
  container.innerHTML = '';

  currentSpecialList.items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'special-detail-item';

    if (specialListItemMode === 'edit') {
      row.style.gridTemplateColumns = 'auto 1fr 80px auto';
      row.innerHTML = '<span class="special-item-emoji">' + item.emoji + '</span>'
        + '<span class="special-item-name">' + escapeHtml(item.name) + '</span>'
        + '<input type="text" class="special-qty-input" placeholder="' + (t('quantity') || 'Qty') + '" value="' + escapeHtml(item.qty || '') + '" maxlength="15">'
        + '<button class="popular-delete-btn">✕</button>';
      row.querySelector('.special-qty-input').addEventListener('input', (e) => {
        item.qty = e.target.value.trim();
        saveSpecialLists();
      });
      row.querySelector('.popular-delete-btn').addEventListener('click', () => {
        currentSpecialList.items.splice(idx, 1);
        saveSpecialLists();
        renderSpecialDetail();
      });
    } else {
      row.innerHTML = '<span class="special-item-emoji">' + item.emoji + '</span>'
        + '<span class="special-item-name">' + escapeHtml(item.name) + (item.qty ? ' · ' + escapeHtml(item.qty) : '') + '</span>';
    }
    container.appendChild(row);
  });

  const addItemBtn = document.getElementById('btn-add-list-item');
  const addAllBtn = document.getElementById('btn-add-all-to-shopping');
  if (specialListItemMode === 'edit') {
    if (addItemBtn) addItemBtn.style.display = 'flex';
    if (addAllBtn) addAllBtn.style.display = 'none';
  } else {
    if (addItemBtn) addItemBtn.style.display = 'none';
    if (addAllBtn) addAllBtn.style.display = 'flex';
  }
}

function toggleEditListItems() {
  specialListItemMode = specialListItemMode === 'view' ? 'edit' : 'view';
  renderSpecialDetail();
}

let selectedSpecialItemEmoji = '🥛';

function addItemToCurrentList() {
  openSpecialItemEdit();
}

function openSpecialItemEdit() {
  selectedSpecialItemEmoji = '🥛';
  const titleEl = document.getElementById('special-item-edit-title');
  if (titleEl) titleEl.textContent = t('addItem');
  const nameInput = document.getElementById('input-special-item-name');
  if (nameInput) nameInput.value = '';
  const qtyInput = document.getElementById('input-special-item-qty');
  if (qtyInput) qtyInput.value = '';
  const emojiCurrent = document.getElementById('special-item-emoji-current');
  if (emojiCurrent) emojiCurrent.textContent = selectedSpecialItemEmoji;
  showScreen('special-item-edit');
  setTimeout(() => { if (nameInput) nameInput.focus(); }, 100);
}

function saveSpecialItem() {
  const name = (document.getElementById('input-special-item-name').value || '').trim();
  if (!name) { showToast(t('nameRequired') || t('needName')); return; }
  const qty = (document.getElementById('input-special-item-qty').value || '').trim();
  if (!currentSpecialList) return;
  currentSpecialList.items.push({ name, emoji: selectedSpecialItemEmoji, qty });
  saveSpecialLists();
  renderSpecialDetail();
  showScreen('special-detail');
}

function addAllSpecialToShopping() {
  if (!currentSpecialList) return;
  const enabled = getEnabledSupermarkets();
  if (enabled.length === 0) {
    showToast(t('noActiveSupermarkets'));
    return;
  }
  // Pas 1: selecció dels items que es volen afegir (deselecciona els que no)
  showSpecialSelectionStep();
}

let specialSelectedItems = []; // items seleccionats abans d'afegir

function showSpecialSelectionStep() {
  const list = currentSpecialList;
  // Per defecte tots seleccionats; mantenim la quantitat existent perquè es pugui editar
  specialSelectedItems = list.items.map(it => ({ ...it, selected: true, qty: it.qty || '' }));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const itemsHtml = specialSelectedItems.map((it, idx) => `
    <div class="special-select-row" data-idx="${idx}">
      <label class="manage-sm-checkbox">
        <input type="checkbox" data-idx="${idx}" checked>
        <span class="checkmark"></span>
      </label>
      <span class="special-item-emoji">${it.emoji}</span>
      <span class="special-item-name">${escapeHtml(it.name)}</span>
      <input type="text" class="special-qty-input" data-idx="${idx}" placeholder="${t('quantity') || 'Qty'}" value="${escapeHtml(it.qty || '')}" maxlength="15">
    </div>
  `).join('');

  overlay.innerHTML = `
    <div class="modal-content modal-content-tall">
      <div class="modal-emoji-big">${list.emoji}</div>
      <p class="modal-title">${t(list.nameKey)}</p>
      <p class="modal-sub">${t('selectItemsToAdd') || 'Tria els productes a afegir'}</p>
      <div class="special-select-list">${itemsHtml}</div>
      <div class="modal-buttons" style="margin-top:14px">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('next') || 'Següent'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Listeners checkboxes
  overlay.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      specialSelectedItems[idx].selected = e.target.checked;
    });
  });

  // Listeners qty inputs
  overlay.querySelectorAll('.special-qty-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      specialSelectedItems[idx].qty = e.target.value.trim();
    });
  });

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    const selected = specialSelectedItems.filter(it => it.selected);
    if (selected.length === 0) {
      showToast(t('noItemsSelected') || 'Cap producte seleccionat');
      return;
    }
    document.body.removeChild(overlay);
    // Pas 2: triar el supermercat
    const enabled = getEnabledSupermarkets();
    if (enabled.length === 1) {
      addSpecialListToSupermarket(enabled[0].id);
    } else {
      showSupermarketPickerForSpecial();
    }
  });
}

function addSpecialListToSupermarket(supermarketId) {
  const items = (specialSelectedItems && specialSelectedItems.length > 0)
    ? specialSelectedItems.filter(it => it.selected)
    : currentSpecialList.items.map(it => ({ ...it, qty: it.qty || '' }));

  if (items.length === 0) {
    showToast(t('noItemsSelected') || 'Cap producte seleccionat');
    return;
  }

  let counter = 0;
  items.forEach(item => {
    counter++;
    const id = 'si-' + Date.now() + '-' + counter + '-' + Math.random().toString(36).slice(2, 8);
    shoppingItems.push({
      id, supermarketId, name: item.name, emoji: item.emoji,
      qty: item.qty || '', notes: '', addedAt: Date.now()
    });
  });
  saveShoppingData();
  specialSelectedItems = [];
  showToast('🎉 ' + items.length + ' ' + t('itemsAdded'));
  // Quedar-se a la pantalla del detall de la llista (no anar al super)
}

function showSupermarketPickerForSpecial() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const enabled = getEnabledSupermarkets();
  const list = enabled.map(sm => `
    <button class="modal-supermarket-option" data-id="${sm.id}">
      <span style="font-size:24px;margin-right:10px">${sm.emoji}</span>
      <span>${escapeHtml(sm.name)}</span>
    </button>
  `).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">🛒</div>
      <p class="modal-title">${t('chooseSupermarket')}</p>
      <p class="modal-sub">${t('whichSupermarket')}</p>
      <div class="modal-supermarket-list">${list}</div>
      <button class="modal-cancel" id="modal-no-btn" style="margin-top:10px">${t('cancel')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.modal-supermarket-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      document.body.removeChild(overlay);
      addSpecialListToSupermarket(id);
    });
  });

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}





// TRADUCCIONS - actualitzar tots els textos
function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  const nameInput = document.getElementById('input-name');
  if (nameInput) nameInput.placeholder = t('productNamePlaceholder');

  document.documentElement.lang = getCurrentLang();
  renderHome();
  updateThemeStatus();
  updateLangStatus();
  updateStatsSub();
  updateLocationsCount();
  updatePopularCount();
}


// ============ SINCRONITZACIÓ FIREBASE ============

let syncEnabled = false;
let applyingRemote = false;

async function initSync() {
  const code = localStorage.getItem('eatmefirst_sync_code');
  if (!code) return;

  const ok = await window.FBSync.init();
  if (!ok) {
    console.warn('Firebase no disponible (sense internet?)');
    updateSyncStatus();
    return;
  }

  try {
    await window.FBSync.connectToList(code, onRemoteData);
    syncEnabled = true;
    updateSyncStatus();
  } catch (e) {
    console.error('Error reconnectant:', e);
  }
}

function onRemoteData(remoteData) {
  if (!remoteData) return;
  applyingRemote = true;

  if (Array.isArray(remoteData.products)) products = remoteData.products;
  if (Array.isArray(remoteData.locations) && remoteData.locations.length > 0) locations = remoteData.locations;
  if (remoteData.stats && typeof remoteData.stats === 'object') stats = remoteData.stats;
  if (Array.isArray(remoteData.supermarkets)) supermarkets = remoteData.supermarkets;
  if (Array.isArray(remoteData.shoppingItems)) shoppingItems = remoteData.shoppingItems;

  localStorage.setItem('eatmefirst_products', JSON.stringify(products));
  localStorage.setItem('eatmefirst_locations', JSON.stringify(locations));
  localStorage.setItem('eatmefirst_stats', JSON.stringify(stats));
  localStorage.setItem('eatmefirst_supermarkets', JSON.stringify(supermarkets));
  localStorage.setItem('eatmefirst_shopping_items', JSON.stringify(shoppingItems));

  if (typeof renderHome === 'function') renderHome();
  const sectionScreen = document.getElementById('screen-section');
  if (typeof renderSection === 'function' && sectionScreen && sectionScreen.classList.contains('active')) {
    renderSection();
  }
  // Refresca les pantalles de la llista de la compra si estan visibles
  const shoppingScr = document.getElementById('screen-shopping');
  if (shoppingScr && shoppingScr.classList.contains('active') && typeof renderSupermarkets === 'function') {
    renderSupermarkets();
  }
  const supermarketScr = document.getElementById('screen-supermarket');
  if (supermarketScr && supermarketScr.classList.contains('active') && typeof renderShoppingItems === 'function') {
    renderShoppingItems();
  }

  applyingRemote = false;
  updateSyncStatus();
}

function pushToServer() {
  if (syncEnabled && !applyingRemote && window.FBSync) {
    window.FBSync.upload({
      products: products,
      locations: locations,
      stats: stats,
      supermarkets: supermarkets,
      shoppingItems: shoppingItems
    });
  }
}

function updateSyncStatus() {
  const subEl = document.getElementById('sync-status');
  if (!subEl) return;

  if (syncEnabled) {
    const code = window.FBSync.getCurrentListId();
    subEl.textContent = '✓ ' + (code || '');
  } else {
    subEl.textContent = t('syncNotActive');
  }
}

function updateSyncScreen() {
  const notConn = document.getElementById('sync-not-connected');
  const conn = document.getElementById('sync-connected');
  if (!notConn || !conn) return;

  if (syncEnabled) {
    notConn.style.display = 'none';
    conn.style.display = 'block';
    const code = window.FBSync.getCurrentListId();
    document.getElementById('sync-code-display').textContent = code;
    document.getElementById('sync-last-update').textContent = t('syncLastUpdate', new Date().toLocaleTimeString());
  } else {
    notConn.style.display = 'block';
    conn.style.display = 'none';
  }
}

function openSyncScreen() {
  updateSyncScreen();
  showScreen('sync');
}

async function createNewList() {
  showToast(t('syncConnecting'));

  const ok = await window.FBSync.init();
  if (!ok) {
    showToast(t('syncErrorOffline'));
    return;
  }

  let code, attempts = 0;
  do {
    code = window.FBSync.generateCode();
    attempts++;
    if (attempts > 5) break;
  } while (await window.FBSync.codeExists(code));

  try {
    await window.FBSync.createList(code, {
      products: products,
      locations: locations,
      stats: stats,
      supermarkets: supermarkets,
      shoppingItems: shoppingItems
    });
    await window.FBSync.connectToList(code, onRemoteData);

    localStorage.setItem('eatmefirst_sync_code', code);
    syncEnabled = true;
    updateSyncStatus();
    updateSyncScreen();
    showToast('✅ ' + t('syncCreated'));
  } catch (e) {
    console.error(e);
    showToast(t('syncErrorCreate'));
  }
}

async function joinExistingList() {
  let code = document.getElementById('input-sync-code').value.trim().toUpperCase();
  if (!code) { showToast(t('syncCodeRequired')); return; }

  if (!code.startsWith('EMF-')) code = 'EMF-' + code;
  if (code.length === 12 && code.charAt(7) !== '-') {
    code = code.slice(0, 8) + '-' + code.slice(8);
  }
  if (code.length !== 13) { showToast(t('syncCodeInvalid')); return; }

  showToast(t('syncConnecting'));

  const ok = await window.FBSync.init();
  if (!ok) {
    showToast(t('syncErrorOffline'));
    return;
  }

  const exists = await window.FBSync.codeExists(code);
  if (!exists) {
    showToast(t('syncCodeNotFound'));
    return;
  }

  if (products.length > 0) {
    if (!confirm(t('syncReplaceWarning'))) return;
  }

  try {
    await window.FBSync.connectToList(code, onRemoteData);
    localStorage.setItem('eatmefirst_sync_code', code);
    syncEnabled = true;
    updateSyncStatus();
    showScreen('sync');
    updateSyncScreen();
    showToast('✅ ' + t('syncJoined'));
  } catch (e) {
    console.error(e);
    showToast(t('syncErrorJoin'));
  }
}

function disconnectSync() {
  if (!confirm(t('syncDisconnectConfirm'))) return;
  if (window.FBSync) window.FBSync.disconnect();
  localStorage.removeItem('eatmefirst_sync_code');
  syncEnabled = false;
  updateSyncStatus();
  updateSyncScreen();
  showToast(t('syncDisconnected'));
}

async function copyCodeToClipboard() {
  const code = window.FBSync.getCurrentListId();
  if (!code) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      const tmp = document.createElement('input');
      tmp.value = code;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
    }
    showToast('✓ ' + t('codeCopied'));
  } catch (e) {
    showToast(code);
  }
}

// ============ NOTIFICACIONS ============

function exposeForNotifications() {
  window.products = products;
  window.daysUntil = daysUntil;
  window.getLevel = getLevel;
  window.getLocationById = getLocationById;
  window.t = t;
}

function initNotifications() {
  if (!window.Notif) return;
  exposeForNotifications();
  window.Notif.init();
  updateNotifStatus();
}

function updateNotifStatus() {
  const subEl = document.getElementById('notif-status');
  if (!subEl || !window.Notif) return;

  const perm = window.Notif.permissionStatus();
  const s = window.Notif.get();

  if (perm === 'unsupported') {
    subEl.textContent = t('notifNotSupportedShort');
  } else if (perm !== 'granted' || !s.enabled) {
    subEl.textContent = t('notifInactive');
  } else {
    subEl.textContent = '✓ ' + s.dailyTime;
  }
}

function openNotificationsScreen() {
  exposeForNotifications();
  if (!window.Notif) return;

  const status = window.Notif.permissionStatus();
  const noPerm = document.getElementById('notif-no-permission');
  const blocked = document.getElementById('notif-blocked');
  const config = document.getElementById('notif-config');

  if (noPerm) noPerm.style.display = 'none';
  if (blocked) blocked.style.display = 'none';
  if (config) config.style.display = 'none';

  if (status === 'unsupported' || status === 'denied') {
    if (blocked) blocked.style.display = 'block';
  } else if (status === 'default') {
    if (noPerm) noPerm.style.display = 'block';
  } else {
    if (config) config.style.display = 'block';
    fillNotifConfig();
  }

  showScreen('notifications');
}

function fillNotifConfig() {
  if (!window.Notif) return;
  const s = window.Notif.get();
  const enabled = document.getElementById('notif-toggle-enabled');
  const time = document.getElementById('notif-daily-time');
  const onopen = document.getElementById('notif-toggle-onopen');
  const orange = document.getElementById('notif-toggle-orange');
  const red = document.getElementById('notif-toggle-red');
  if (enabled) enabled.checked = !!s.enabled;
  if (time) time.value = s.dailyTime || '13:00';
  if (onopen) onopen.checked = !!s.notifyOnOpen;
  if (orange) orange.checked = !!s.includeOrange;
  if (red) red.checked = !!s.includeRed;
}

async function handleRequestPermission() {
  if (!window.Notif) return;
  const result = await window.Notif.requestPermission();
  if (result === 'granted') {
    window.Notif.set({ enabled: true });
    showToast('✅ ' + t('notifPermissionGranted'));
    updateNotifStatus();
    openNotificationsScreen();
  } else if (result === 'denied') {
    showToast('🚫 ' + t('notifPermissionDenied'));
    openNotificationsScreen();
  }
}

function testNotificationNow() {
  if (!window.Notif) return;
  if (window.Notif.permissionStatus() !== 'granted') {
    showToast(t('notifPermRequired'));
    return;
  }
  const ok = window.Notif.testNotification();
  if (ok) showToast('🔔 ' + t('notifTestSent'));
  else showToast(t('notifTestError'));
}



// Pregunta a l'usuari si vol afegir el producte consumit a la llista de la compra



function renderLocationsList() {
  const container = document.getElementById('locations-list');
  if (!container) return;
  container.innerHTML = '';

  locations.forEach((loc, index) => {
    const item = document.createElement('div');
    item.className = 'location-item';
    const isFirst = index === 0;
    const isLast = index === locations.length - 1;
    item.innerHTML = `
      <div class="loc-arrows">
        <button class="loc-move-btn" data-action="up" ${isFirst ? 'disabled' : ''} aria-label="Up">▲</button>
        <button class="loc-move-btn" data-action="down" ${isLast ? 'disabled' : ''} aria-label="Down">▼</button>
      </div>
      <span class="loc-item-emoji"></span>
      <div class="loc-item-info">
        <div class="loc-item-name"></div>
        <div class="loc-item-mult"></div>
      </div>
      <button class="loc-edit-btn" data-action="edit" aria-label="Edit">✏️</button>
    `;
    item.querySelector('.loc-item-emoji').textContent = loc.emoji;
    item.querySelector('.loc-item-name').textContent = getLocationName(loc);
    item.querySelector('.loc-item-mult').textContent =
      loc.category === 'freezer' ? '❄️ ' + t('catFreezer') :
      loc.category === 'pantry' ? '🥫 ' + t('catPantry') :
      '🧊 ' + t('catFridge');

    item.querySelector('[data-action="up"]').addEventListener('click', (e) => {
      e.stopPropagation(); moveLocation(index, -1);
    });
    item.querySelector('[data-action="down"]').addEventListener('click', (e) => {
      e.stopPropagation(); moveLocation(index, +1);
    });
    item.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
      e.stopPropagation(); openLocationEditor(index);
    });
    container.appendChild(item);
  });
}

function moveLocation(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= locations.length) return;
  // Intercanvi
  const tmp = locations[index];
  locations[index] = locations[newIndex];
  locations[newIndex] = tmp;
  saveLocations();
  renderLocationsList();
}

let editingLocationIndex = -1;
let tempLocCategory = 'fridge';

function openLocationEditor(index) {
  editingLocationIndex = index;
  const isNew = index < 0;
  const loc = isNew ? { emoji: '📍', customName: '', category: 'fridge' } : locations[index];

  document.getElementById('loc-edit-title').textContent =
    isNew ? t('newLocation') : t('editLocation');
  document.getElementById('loc-edit-emoji').textContent = loc.emoji;
  document.getElementById('loc-edit-name').value = isNew ? '' : getLocationName(loc);
  tempLocCategory = loc.category || 'fridge';

  const delBtn = document.getElementById('loc-edit-delete');
  if (delBtn) delBtn.style.display = isNew ? 'none' : 'block';

  renderLocationEmojiPicker(loc.emoji);
  renderCategoryPicker();
  showScreen('location-edit');
}

function renderCategoryPicker() {
  const container = document.getElementById('storage-type-picker');
  if (!container) return;
  container.innerHTML = '';

  const cats = [
    { id: 'fridge', emoji: '🧊', labelKey: 'catFridge', descKey: 'catFridgeDesc' },
    { id: 'freezer', emoji: '❄️', labelKey: 'catFreezer', descKey: 'catFreezerDesc' },
    { id: 'pantry', emoji: '🥫', labelKey: 'catPantry', descKey: 'catPantryDesc' }
  ];

  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'storage-type-option' + (c.id === tempLocCategory ? ' selected' : '');
    btn.innerHTML = `
      <span class="storage-type-emoji"></span>
      <div class="storage-type-info">
        <div class="storage-type-label"></div>
        <div class="storage-type-desc"></div>
      </div>
    `;
    btn.querySelector('.storage-type-emoji').textContent = c.emoji;
    btn.querySelector('.storage-type-label').textContent = t(c.labelKey);
    btn.querySelector('.storage-type-desc').textContent = t(c.descKey);
    btn.addEventListener('click', () => {
      tempLocCategory = c.id;
      renderCategoryPicker();
    });
    container.appendChild(btn);
  });
}

let tempLocEmoji = '📍';

function renderLocationEmojiPicker(currentEmoji) {
  tempLocEmoji = currentEmoji;
  const locEmojis = ['🧊','❄️','🥫','🍎','🏠','🍽️','🥤','🍷','🍞','🌶️','🚪','🏪','🛒','📦','🗄️','🪟','🌿','🥖','🍯','🍫','📍','🎒','💼','🚗'];
  const container = document.getElementById('loc-edit-emoji-picker');
  container.innerHTML = '';
  locEmojis.forEach(e => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-option' + (e === tempLocEmoji ? ' selected' : '');
    btn.textContent = e;
    btn.addEventListener('click', () => {
      tempLocEmoji = e;
      document.getElementById('loc-edit-emoji').textContent = e;
      renderLocationEmojiPicker(e);
    });
    container.appendChild(btn);
  });
}

function saveLocationEdit() {
  const name = document.getElementById('loc-edit-name').value.trim();
  if (!name) { showToast(t('needName')); return; }

  if (editingLocationIndex < 0) {
    locations.push({
      id: 'custom_' + Date.now(),
      emoji: tempLocEmoji,
      customName: name,
      category: tempLocCategory
    });
  } else {
    locations[editingLocationIndex].emoji = tempLocEmoji;
    locations[editingLocationIndex].customName = name;
    locations[editingLocationIndex].category = tempLocCategory;
  }

  saveLocations();
  renderLocationsList();
  showScreen('locations');
  showToast(t('saved'));
}

function deleteLocation(index) {
  if (locations.length <= 1) {
    showToast(t('needOneLocation'));
    return;
  }
  if (!confirm(t('confirmDeleteLocation'))) return;
  const removed = locations[index];
  locations.splice(index, 1);
  // Si algun producte usava aquesta ubicació, l'assignem a la primera disponible
  products.forEach(p => {
    if (p.location === removed.id) p.location = locations[0].id;
  });
  saveLocations();
  saveData();
  renderLocationsList();
  showToast(t('deleted'));
}

function recalcDateByLocation() {
  const dateInput = document.getElementById('input-date');
  const baseDays = parseInt(dateInput.dataset.baseDays || '7');
  const finalDays = computeDaysForLocation(selectedLocation, baseDays, currentCategories);
  const d = new Date();
  d.setDate(d.getDate() + finalDays);
  dateInput.value = formatDateForInput(d);
}

// Obre la pantalla d'ubicacions recordant d'on s'ha cridat
// origin: 'add' (des del formulari) o 'settings' (des de la configuració)
function openLocations(origin) {
  const backBtn = document.getElementById('locations-back-btn');
  if (backBtn) backBtn.dataset.back = (origin === 'settings') ? 'settings' : 'add';
  renderLocationsList();
  showScreen('locations');
}

// Obre la pantalla de configuració recordant d'on s'ha cridat
// origin: 'home' (des del tracker) o 'launcher' (des de la pantalla inicial)
function openSettings(origin) {
  const backBtn = document.getElementById('settings-back-btn');
  if (backBtn) backBtn.dataset.back = (origin === 'launcher') ? 'launcher' : 'home';

  if (typeof updateThemeStatus === 'function') updateThemeStatus();
  if (typeof updateLangStatus === 'function') updateLangStatus();
  if (typeof updateStatsSub === 'function') updateStatsSub();
  if (typeof updateLocationsCount === 'function') updateLocationsCount();
  if (typeof updatePopularCount === 'function') updatePopularCount();
  if (typeof updateSyncStatus === 'function') updateSyncStatus();
  if (typeof updateNotifStatus === 'function') updateNotifStatus();
  if (typeof updateCountryStatus === 'function') updateCountryStatus();
  if (typeof updateSupermarketsStatus === 'function') updateSupermarketsStatus();
  showScreen('settings');
}

function updateSupermarketsStatus() {
  const el = document.getElementById('supermarkets-status');
  if (!el) return;
  const enabled = getEnabledSupermarkets().length;
  const total = supermarkets.length;
  el.textContent = enabled + ' / ' + total + ' ' + t('active');
}

function renderLocationPicker() {
  const container = document.getElementById('location-picker');
  if (!container) return;
  container.innerHTML = '';

  locations.forEach(loc => {
    const btn = document.createElement('button');
    btn.className = 'loc-option' + (loc.id === selectedLocation ? ' selected' : '');
    btn.type = 'button';
    btn.innerHTML = '<span class="loc-option-emoji"></span><span class="loc-option-name"></span>';
    btn.querySelector('.loc-option-emoji').textContent = loc.emoji;
    btn.querySelector('.loc-option-name').textContent = getLocationName(loc);
    btn.addEventListener('click', () => {
      selectedLocation = loc.id;
      renderLocationPicker();
      recalcDateByLocation();
    });
    container.appendChild(btn);
  });

  // Botó "edita ubicacions"
  const editBtn = document.createElement('button');
  editBtn.className = 'loc-option loc-edit';
  editBtn.type = 'button';
  editBtn.innerHTML = '<span class="loc-option-emoji">⚙️</span><span class="loc-option-name"></span>';
  editBtn.querySelector('.loc-option-name').textContent = t('editLocations');
  editBtn.addEventListener('click', () => openLocations('add'));
  container.appendChild(editBtn);
}

function renderEmojiPicker() {
  // Actualitza només el botó (mostra l'emoji actual)
  const btn = document.getElementById('emoji-button-current');
  if (btn) btn.textContent = selectedEmoji;
}

function renderSupermarketEmojiPickerBtn() {
  const btn = document.getElementById('supermarket-emoji-current');
  if (btn) btn.textContent = selectedSupermarketEmoji;
}

function renderShoppingEmojiPickerBtn() {
  const btn = document.getElementById('shopping-emoji-current');
  if (btn) btn.textContent = selectedShoppingEmoji;
}

// Variables per saber quin camp està seleccionant emoji
let emojiPickerTarget = null; // 'product', 'supermarket', 'shopping'
let emojiPickerOrigin = null; // pantalla a la qual tornar

function openEmojiPicker(target, origin) {
  emojiPickerTarget = target;
  emojiPickerOrigin = origin;
  const backBtn = document.getElementById('emoji-picker-back-btn');
  if (backBtn) backBtn.dataset.back = origin;

  // Tria quina llista d'emojis mostrar
  let emojisToShow = EMOJIS;
  let currentEmoji = selectedEmoji;
  if (target === 'supermarket') {
    emojisToShow = SUPERMARKET_EMOJIS;
    currentEmoji = selectedSupermarketEmoji;
  } else if (target === 'shopping') {
    currentEmoji = selectedShoppingEmoji;
  } else if (target === 'popular') {
    currentEmoji = selectedPopularEmoji;
  } else if (target === 'special-item') {
    currentEmoji = selectedSpecialItemEmoji;
  }

  const container = document.getElementById('emoji-picker-full');
  if (!container) return;
  container.innerHTML = '';
  emojisToShow.forEach(e => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-option-big' + (e === currentEmoji ? ' selected' : '');
    btn.textContent = e;
    btn.addEventListener('click', () => {
      // Aplica la selecció segons el target
      if (target === 'supermarket') {
        selectedSupermarketEmoji = e;
        renderSupermarketEmojiPickerBtn();
      } else if (target === 'shopping') {
        selectedShoppingEmoji = e;
        renderShoppingEmojiPickerBtn();
      } else if (target === 'popular') {
        selectedPopularEmoji = e;
        const btn = document.getElementById('popular-emoji-current');
        if (btn) btn.textContent = e;
      } else if (target === 'special-item') {
        selectedSpecialItemEmoji = e;
        const btn = document.getElementById('special-item-emoji-current');
        if (btn) btn.textContent = e;
      } else {
        selectedEmoji = e;
        renderEmojiPicker();
      }
      // Torna a la pantalla anterior
      showScreen(origin);
    });
    container.appendChild(btn);
  });
  showScreen('emoji-picker');
}




// ============ ESCÀNER DE CODI DE BARRES (html5-qrcode) ============
let html5QrScanner = null;
let lastScannedCode = null;
let lastScanTime = 0;

async function startScanner() {
  const status = document.getElementById('scanner-status');
  status.textContent = '';

  if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
    status.textContent = t('cameraError');
    return;
  }

  if (typeof Html5Qrcode === 'undefined') {
    status.textContent = t('cameraError');
    return;
  }

  // Netejar instàncies anteriors
  await stopScanner();

  try {
    html5QrScanner = new Html5Qrcode('scanner-video-container');

    const config = {
      fps: 15,
      qrbox: function(viewfinderWidth, viewfinderHeight) {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdge * 0.85);
        return { width: qrboxSize, height: Math.floor(qrboxSize * 0.55) };
      },
      aspectRatio: 1.0,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39
      ]
    };

    await html5QrScanner.start(
      { facingMode: 'environment' },
      config,
      onScanSuccess,
      onScanFailure
    );

    lastScannedCode = null;
  } catch (e) {
    console.error('Scanner error:', e);
    status.textContent = t('cameraError');
  }
}

function onScanSuccess(decodedText, decodedResult) {
  // Evita dobles deteccions del mateix codi
  const now = Date.now();
  if (decodedText === lastScannedCode && (now - lastScanTime) < 2000) return;
  lastScannedCode = decodedText;
  lastScanTime = now;

  if (navigator.vibrate) navigator.vibrate(100);

  stopScanner();
  onBarcodeDetected(decodedText);
}

function onScanFailure(error) {
  // Errors normals durant l'escaneig: ignorem (busca cada frame)
}

async function stopScanner() {
  if (html5QrScanner) {
    try {
      if (html5QrScanner.isScanning) {
        await html5QrScanner.stop();
      }
      await html5QrScanner.clear();
    } catch (e) { console.warn('Stop scanner:', e); }
    html5QrScanner = null;
  }
}

// Cerca a múltiples bases de dades
async function fetchProductByBarcode(barcode) {
  // Primer intent: Open Food Facts (gratis, sense límits, principalment menjar)
  try {
    const res = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(barcode) + '.json');
    if (res.ok) {
      const json = await res.json();
      if (json.status === 1 && json.product) {
        return parseOpenFoodFactsProduct(json.product);
      }
    }
  } catch (e) { console.warn('OFF error:', e); }

  // Segon intent: UPCitemdb (cobreix més productes no-menjar)
  try {
    const res = await fetch('https://api.upcitemdb.com/prod/trial/lookup?upc=' + encodeURIComponent(barcode));
    if (res.ok) {
      const json = await res.json();
      if (json.code === 'OK' && json.items && json.items.length > 0) {
        const item = json.items[0];
        return {
          name: (item.title || '').slice(0, 50),
          emoji: '🥫',
          days: 30
        };
      }
    }
  } catch (e) { console.warn('UPCitemdb error:', e); }

  return null;
}

function parseOpenFoodFactsProduct(p) {
  const lang = getCurrentLang();
  let name = p['product_name_' + lang] || p.product_name || p.generic_name || '';
  if (p.brands && name) {
    if (!name.toLowerCase().includes(p.brands.toLowerCase().split(',')[0])) {
      name = p.brands.split(',')[0].trim() + ' - ' + name;
    }
  }
  if (!name) return null;

  // Recopilem TOTS els tags i text de categoria com a array net
  // categories_tags ve com ['en:spreads', 'en:hazelnut-spreads', ...]
  const tagsArr = (p.categories_tags || []).map(x => String(x).toLowerCase());
  const catText = (p.categories || '').toLowerCase();

  // Funció que mira si una paraula clau apareix en CATEGORIES o TAGS
  function categoryMatches(key) {
    const k = key.toLowerCase();
    // Mira en text de categories
    if (catText.includes(k)) return true;
    // Mira en cada tag
    for (const tag of tagsArr) {
      if (tag.includes(k)) return true;
    }
    return false;
  }

  // Per a l'emoji: ordre normal (es queda amb el primer match)
  let emoji = '🥫';
  for (const key in CATEGORY_TO_EMOJI) {
    if (categoryMatches(key)) { emoji = CATEGORY_TO_EMOJI[key]; break; }
  }

  // Per als dies: agafem el VALOR MÉS GRAN dels matches.
  // Així si un producte té tags "fresh-foods" (poc) i "spreads" (molt),
  // ens quedem amb el de més vida útil (que és el correcte per al producte tancat).
  let days = 0;
  for (const key in CATEGORY_DEFAULT_DAYS) {
    if (categoryMatches(key)) {
      const d = CATEGORY_DEFAULT_DAYS[key];
      if (d > days) days = d;
    }
  }
  if (days === 0) days = 14; // fallback raonable per producte envasat

  return {
    name: name.trim().slice(0, 50),
    emoji: emoji,
    days: days,
    categories: tagsArr.concat([catText]) // per usar a la taula de congelació
  };
}

async function onBarcodeDetected(code) {
  const status = document.getElementById('scanner-status');
  if (status) status.textContent = t('searching');

  // Detectem si veníem de la llista de la compra
  const isShoppingScan = pendingShoppingScanContext;
  pendingShoppingScanContext = false;

  try {
    const data = await fetchProductByBarcode(code);

    if (data) {
      if (status) status.textContent = t('productFound');
      setTimeout(() => {
        if (isShoppingScan) {
          // Obrim el formulari de BuyMe amb el producte trobat
          openShoppingItemEdit(null);
          setTimeout(() => {
            const ni = document.getElementById('input-shopping-name');
            if (ni) ni.value = data.name;
            selectedShoppingEmoji = data.emoji || '🥛';
            renderShoppingEmojiPickerBtn();
          }, 100);
        } else {
          openAddForm({
            name: data.name,
            emoji: data.emoji,
            days: data.days,
            categories: data.categories || [],
            fromScan: true
          });
        }
      }, 500);
    } else {
      if (status) status.textContent = t('productNotFound');
      setTimeout(() => {
        if (isShoppingScan) openShoppingItemEdit(null);
        else openAddForm({});
      }, 1200);
    }
  } catch (e) {
    console.error(e);
    if (status) status.textContent = t('productNotFound');
    setTimeout(() => {
      if (isShoppingScan) openShoppingItemEdit(null);
      else openAddForm({});
    }, 1200);
  }
}

// Cercar producte per codi escrit a mà
async function searchManualBarcode() {
  const code = document.getElementById('input-barcode').value.trim();
  if (!code || code.length < 6) {
    showToast(t('invalidCode'));
    return;
  }
  showToast(t('searching'));
  await onBarcodeDetected(code);
}

// CONFIGURACIÓ
function applyTheme(mode) {
  const root = document.documentElement;
  // Si rebem 'auto' (de versions anteriors), forcem 'light'
  if (mode === 'auto') mode = 'light';
  root.setAttribute('data-theme', mode);
  localStorage.setItem('eatmefirst_theme', mode);
  updateThemeStatus();
}

function updateThemeStatus() {
  let mode = localStorage.getItem('eatmefirst_theme') || 'light';
  if (mode === 'auto') mode = 'light';
  const key = mode === 'light' ? 'themeLight' : 'themeDark';
  const el = document.getElementById('theme-status');
  if (el) el.textContent = t(key);
}

function cycleTheme() {
  let current = localStorage.getItem('eatmefirst_theme') || 'light';
  if (current === 'auto') current = 'light';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
}

function updateLangStatus() {
  const lang = getCurrentLang();
  const el = document.getElementById('language-status');
  if (el) el.textContent = LANGUAGE_NAMES[lang];
}

function updateStatsSub() {
  const el = document.getElementById('stats-sub');
  if (!el) return;
  const total = stats.consumed + stats.trashed;
  if (total > 0) el.textContent = t('statsText', stats.consumed, stats.trashed);
  else el.textContent = t('statsEmpty');
}

function updateLocationsCount() {
  const el = document.getElementById('locations-count');
  if (!el) return;
  el.textContent = locations.length + ' ' + (locations.length === 1 ? t('locationSingular') : t('locationPlural'));
}

function updatePopularCount() {
  const el = document.getElementById('popular-count');
  if (!el) return;
  const n = (typeof getPopularProducts === 'function') ? getPopularProducts().length : 0;
  el.textContent = n + ' ' + (n === 1 ? t('productSingular') : t('productPlural'));
}

function renderLangList() {
  const container = document.getElementById('lang-list');
  container.innerHTML = '';

  // Mentre fem el refactor només deixem català.
  // La resta d'idiomes tornaran un cop polida l'app.
  const FLAG_CA = '<svg viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg"><rect width="9" height="6" fill="#FCDD09"/><rect y="0.67" width="9" height="0.67" fill="#DA121A"/><rect y="2" width="9" height="0.67" fill="#DA121A"/><rect y="3.33" width="9" height="0.67" fill="#DA121A"/><rect y="4.67" width="9" height="0.67" fill="#DA121A"/></svg>';

  const btn = document.createElement('button');
  btn.className = 'lang-item active';

  const flag = document.createElement('span');
  flag.className = 'lang-flag';
  flag.innerHTML = FLAG_CA;

  const info = document.createElement('div');
  info.className = 'lang-info';

  const name = document.createElement('div');
  name.className = 'lang-name';
  name.textContent = 'Català';

  const check = document.createElement('span');
  check.className = 'lang-check';
  check.textContent = '✓';

  info.appendChild(name);
  btn.appendChild(flag);
  btn.appendChild(info);
  btn.appendChild(check);

  btn.addEventListener('click', () => {
    showToast('✓ Català');
  });

  container.appendChild(btn);
}

function showStats() {
  const saved = stats.consumed;
  const wasted = stats.trashed;
  const total = saved + wasted;
  let msg;
  if (total === 0) msg = t('statsEmpty2');
  else {
    const pct = Math.round((saved / total) * 100);
    msg = t('statsSummary', saved, wasted, pct);
  }
  alert(msg);
}

function resetAll() {
  if (confirm(t('resetConfirm'))) {
    products = [];
    stats = { consumed: 0, trashed: 0 };
    saveData();
    renderHome();
    updateStatsSub();
    showScreen('home');
    showToast(t('resetDone'));
  }
}


// EVENTS
// Navegació per swipe horitzontal a la pantalla de secció
function setupSwipeNavigation() {
  const screen = document.getElementById('screen-section');
  if (!screen) return;

  let startX = 0;
  let startY = 0;
  let isTracking = false;
  const MIN_DISTANCE = 60;   // Mínim de píxels horitzontals per detectar swipe
  const MAX_VERTICAL = 50;   // Màxim moviment vertical (perquè no es confongui amb scroll)

  screen.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { isTracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isTracking = true;
  }, { passive: true });

  screen.addEventListener('touchend', (e) => {
    if (!isTracking) return;
    isTracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = Math.abs(t.clientY - startY);

    if (dy > MAX_VERTICAL) return; // moviment massa vertical → ignorem
    if (Math.abs(dx) < MIN_DISTANCE) return; // moviment massa curt

    if (dx > 0) navigateSection(-1); // swipe dreta = anterior
    else navigateSection(+1);         // swipe esquerra = següent
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadLocations();
  loadShoppingData();
  if (typeof loadSpecialLists === 'function') loadSpecialLists();
  loadProductHistory();

  const savedTheme = localStorage.getItem('eatmefirst_theme') || 'light';
  applyTheme(savedTheme);

  translatePage();

  // Anima l'engranatge del launcher un cop a l'arrencada
  const initialGear = document.querySelector('#launcher-menu-btn .gear-spin');
  if (initialGear) initialGear.classList.add('gear-spin-once');

  // Mostra la pantalla de benvinguda si no l'hem fet servir mai
  showWelcomeIfNeeded();

  // Configura l'autocomplete del formulari d'afegir producte
  setupNameAutocomplete();

  // Botó "Afegeix al BuyMe" des del detall del producte
  const btnAddToBuyMe = document.getElementById('btn-add-to-buyme');
  if (btnAddToBuyMe) btnAddToBuyMe.addEventListener('click', () => {
    if (!currentProduct) return;
    manualAddToBuyMe(currentProduct);
  });

  // Botó "Editar quantitat" del detall del producte
  const btnEditQty = document.getElementById('btn-edit-product-qty');
  if (btnEditQty) btnEditQty.addEventListener('click', () => {
    if (!currentProduct) return;
    showEditQtyModal(currentProduct);
  });

  // Botó "Canviar de zona"
  const btnChangeZone = document.getElementById('btn-change-zone');
  if (btnChangeZone) btnChangeZone.addEventListener('click', () => {
    if (!currentProduct) return;
    showChangeZoneModal(currentProduct);
  });

  // Botó "Editar data de caducitat"
  const btnChangeDate = document.getElementById('btn-change-date');
  if (btnChangeDate) btnChangeDate.addEventListener('click', () => {
    if (!currentProduct) return;
    showChangeDateModal(currentProduct);
  });

  // Botons de selector d'emoji
  const btnPickEmoji = document.getElementById('btn-pick-emoji');
  if (btnPickEmoji) btnPickEmoji.addEventListener('click', () => openEmojiPicker('product', 'add'));

  const btnPickSmEmoji = document.getElementById('btn-pick-supermarket-emoji');
  if (btnPickSmEmoji) btnPickSmEmoji.addEventListener('click', () => openEmojiPicker('supermarket', 'supermarket-edit'));

  const btnPickShopEmoji = document.getElementById('btn-pick-shopping-emoji');
  if (btnPickShopEmoji) btnPickShopEmoji.addEventListener('click', () => openEmojiPicker('shopping', 'shopping-item-edit'));

  // Productes populars: editar
  const btnPickPopularEmoji = document.getElementById('btn-pick-popular-emoji');
  if (btnPickPopularEmoji) btnPickPopularEmoji.addEventListener('click', () => openEmojiPicker('popular', 'popular-edit'));

  const btnSavePopular = document.getElementById('btn-save-popular');
  if (btnSavePopular) btnSavePopular.addEventListener('click', savePopularEdit);

  const btnDeletePopular = document.getElementById('btn-delete-popular');
  if (btnDeletePopular) btnDeletePopular.addEventListener('click', deletePopularEdit);

  // Botons de seccions a la pantalla principal
  document.querySelectorAll('.section-btn').forEach(b => {
    b.addEventListener('click', () => openSection(b.dataset.cat));
  });

  // Clic als prestatges DINS de la secció
  document.querySelectorAll('#screen-section .shelf').forEach(s => {
    s.addEventListener('click', () => openShelf(s.dataset.level));
  });

  // Botons de navegació entre seccions (fletxes a la capçalera)
  const prevBtn = document.getElementById('section-prev');
  const nextBtn = document.getElementById('section-next');
  if (prevBtn) prevBtn.addEventListener('click', () => navigateSection(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => navigateSection(+1));

  // Swipe horitzontal entre seccions
  setupSwipeNavigation();

  document.getElementById('add-btn').addEventListener('click', () => showScreen('add-choice'));
  document.getElementById('choice-scan').addEventListener('click', () => {
    showScreen('scan');
    setTimeout(startScanner, 200);
  });
  document.getElementById('choice-manual').addEventListener('click', () => openAddForm({}));

  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', () => openSettings('home'));

  document.querySelectorAll('.back-btn').forEach(b => {
    b.addEventListener('click', () => {
      const target = b.dataset.back;
      if (target === 'shopping') renderSupermarkets();
      if (target === 'supermarket') renderShoppingItems();
      showScreen(target);
    });
  });

  document.querySelectorAll('.action-btn').forEach(b => {
    b.addEventListener('click', () => handleAction(b.dataset.action));
  });

  document.getElementById('save-btn').addEventListener('click', saveNewProduct);

  document.querySelectorAll('.quick-date').forEach(b => {
    b.addEventListener('click', () => {
      const days = parseInt(b.dataset.days);
      const d = new Date();
      d.setDate(d.getDate() + days);
      document.getElementById('input-date').value = formatDateForInput(d);
    });
  });

  document.getElementById('settings-theme').addEventListener('click', cycleTheme);
  document.getElementById('settings-language').addEventListener('click', () => {
    renderLangList();
    showScreen('language');
  });
  document.getElementById('settings-stats').addEventListener('click', showStats);
  document.getElementById('settings-reset').addEventListener('click', resetAll);

  // Ubicacions des de configuració
  const settingsLoc = document.getElementById('settings-locations');
  if (settingsLoc) settingsLoc.addEventListener('click', () => openLocations('settings'));

  // SINCRONITZACIÓ
  const settingsSync = document.getElementById('settings-sync');
  if (settingsSync) settingsSync.addEventListener('click', openSyncScreen);

  // País i Supermercats
  const settingsCountry = document.getElementById('settings-country');
  if (settingsCountry) settingsCountry.addEventListener('click', openCountryScreen);

  const settingsSupermarkets = document.getElementById('settings-supermarkets');
  if (settingsSupermarkets) settingsSupermarkets.addEventListener('click', () => openManageSupermarkets('settings'));

  // Botó Editar les meves botigues
  const btnToggleEditShops = document.getElementById('btn-toggle-edit-shops');
  if (btnToggleEditShops) btnToggleEditShops.addEventListener('click', toggleEditShopsMode);

  // Botó Guardar canvis (surt del mode edició)
  const btnSaveShops = document.getElementById('btn-save-shops');
  if (btnSaveShops) btnSaveShops.addEventListener('click', () => {
    manageSupermarketsMode = 'view';
    renderManageSupermarkets();
    showToast(t('saved'));
  });

  // Productes populars: edit/sort/add/save
  const btnTogglePopular = document.getElementById('btn-toggle-edit-popular');
  if (btnTogglePopular) btnTogglePopular.addEventListener('click', togglePopularEditMode);

  const btnSortAlpha = document.getElementById('popular-sort-alpha');
  if (btnSortAlpha) btnSortAlpha.addEventListener('click', () => {
    sortPopularAlpha();
    renderPopularList();
    showToast('🔤 ' + t('sorted'));
  });

  const btnAddCustomPopular = document.getElementById('popular-add-custom');
  if (btnAddCustomPopular) btnAddCustomPopular.addEventListener('click', addCustomPopular);

  const btnSavePopularChanges = document.getElementById('btn-save-popular-changes');
  if (btnSavePopularChanges) btnSavePopularChanges.addEventListener('click', () => {
    popularMode = 'view';
    renderPopularList();
    showToast(t('saved'));
  });

  // Productes populars des de configuració
  const settingsPopular = document.getElementById('settings-popular');
  if (settingsPopular) settingsPopular.addEventListener('click', () => {
    if (typeof openPopular === 'function') openPopular('settings');
    else { showScreen('popular'); renderPopularList(); }
  });

  // Llistes especials
  const btnSpecial = document.getElementById('btn-special-lists');
  if (btnSpecial) btnSpecial.addEventListener('click', openSpecialLists);

  const btnAddAllSpecial = document.getElementById('btn-add-all-to-shopping');
  if (btnAddAllSpecial) btnAddAllSpecial.addEventListener('click', addAllSpecialToShopping);

  // Llistes especials: edit mode
  const btnToggleEditSpecial = document.getElementById('btn-toggle-edit-special-lists');
  if (btnToggleEditSpecial) btnToggleEditSpecial.addEventListener('click', toggleEditSpecialListsMode);

  const btnAddCustomSpecial = document.getElementById('btn-add-custom-special-list');
  if (btnAddCustomSpecial) btnAddCustomSpecial.addEventListener('click', addCustomSpecialList);

  const btnSaveSpecial = document.getElementById('btn-save-special-lists');
  if (btnSaveSpecial) btnSaveSpecial.addEventListener('click', () => {
    specialListsMode = 'view';
    renderSpecialLists();
    showToast(t('saved'));
  });

  // Edició d'una llista (items)
  const btnToggleEditListItems = document.getElementById('btn-toggle-edit-list-items');
  if (btnToggleEditListItems) btnToggleEditListItems.addEventListener('click', toggleEditListItems);

  const btnAddListItem = document.getElementById('btn-add-list-item');
  if (btnAddListItem) btnAddListItem.addEventListener('click', addItemToCurrentList);

  // Edició d'item (especial): emoji i guardar
  const btnPickSpecialItemEmoji = document.getElementById('btn-pick-special-item-emoji');
  if (btnPickSpecialItemEmoji) btnPickSpecialItemEmoji.addEventListener('click', () => openEmojiPicker('special-item', 'special-item-edit'));

  const btnSaveSpecialItem = document.getElementById('btn-save-special-item');
  if (btnSaveSpecialItem) btnSaveSpecialItem.addEventListener('click', saveSpecialItem);

  // Botó Veure-ho tot
  const btnViewAll = document.getElementById('btn-view-all');
  if (btnViewAll) btnViewAll.addEventListener('click', openViewAll);

  const btnSortExpiry = document.getElementById('btn-sort-by-expiry');
  if (btnSortExpiry) btnSortExpiry.addEventListener('click', () => {
    viewAllSortMode = 'expiry';
    renderViewAll();
  });

  const btnSortZone = document.getElementById('btn-sort-by-zone');
  if (btnSortZone) btnSortZone.addEventListener('click', () => {
    viewAllSortMode = 'zone';
    renderViewAll();
  });

  // NOTIFICACIONS: targeta a la configuració
  const settingsNotif = document.getElementById('settings-notifications');
  if (settingsNotif) settingsNotif.addEventListener('click', openNotificationsScreen);

  // Botó "Demanar permís"
  const btnReqPerm = document.getElementById('btn-request-permission');
  if (btnReqPerm) btnReqPerm.addEventListener('click', handleRequestPermission);

  // Toggles de configuració de notificacions
  const togEnabled = document.getElementById('notif-toggle-enabled');
  if (togEnabled) togEnabled.addEventListener('change', (e) => {
    window.Notif.set({ enabled: e.target.checked });
    updateNotifStatus();
    showToast(e.target.checked ? '✅ ' + t('notifActivated') : t('notifDeactivated'));
  });

  const inpTime = document.getElementById('notif-daily-time');
  if (inpTime) inpTime.addEventListener('change', (e) => {
    window.Notif.set({ dailyTime: e.target.value });
    updateNotifStatus();
  });

  const togOnOpen = document.getElementById('notif-toggle-onopen');
  if (togOnOpen) togOnOpen.addEventListener('change', (e) => {
    window.Notif.set({ notifyOnOpen: e.target.checked });
  });

  const togOrange = document.getElementById('notif-toggle-orange');
  if (togOrange) togOrange.addEventListener('change', (e) => {
    window.Notif.set({ includeOrange: e.target.checked });
  });

  const togRed = document.getElementById('notif-toggle-red');
  if (togRed) togRed.addEventListener('change', (e) => {
    window.Notif.set({ includeRed: e.target.checked });
  });

  // Botó "Provar notificació"
  const btnTest = document.getElementById('btn-test-notif');
  if (btnTest) btnTest.addEventListener('click', testNotificationNow);

  const btnCreate = document.getElementById('btn-create-list');
  if (btnCreate) btnCreate.addEventListener('click', createNewList);

  const btnJoin = document.getElementById('btn-join-list');
  if (btnJoin) btnJoin.addEventListener('click', () => {
    document.getElementById('input-sync-code').value = '';
    showScreen('sync-join');
    setTimeout(() => document.getElementById('input-sync-code').focus(), 250);
  });

  const btnConfirmJoin = document.getElementById('btn-confirm-join');
  if (btnConfirmJoin) btnConfirmJoin.addEventListener('click', joinExistingList);

  const btnDisconnect = document.getElementById('btn-disconnect');
  if (btnDisconnect) btnDisconnect.addEventListener('click', disconnectSync);

  const btnCopy = document.getElementById('btn-copy-code');
  if (btnCopy) btnCopy.addEventListener('click', copyCodeToClipboard);

  // ===== LLISTA DE LA COMPRA =====
  // Botons del launcher
  const launcherShopping = document.getElementById('launcher-shopping');
  if (launcherShopping) launcherShopping.addEventListener('click', openShoppingList);

  const launcherTracker = document.getElementById('launcher-tracker');
  if (launcherTracker) launcherTracker.addEventListener('click', () => {
    renderHome();
    showScreen('home');
  });

  const launcherMenuBtn = document.getElementById('launcher-menu-btn');
  if (launcherMenuBtn) launcherMenuBtn.addEventListener('click', () => openSettings('launcher'));

  // Pantalla de supermercats
  const btnManageSm = document.getElementById('btn-manage-supermarkets');
  if (btnManageSm) btnManageSm.addEventListener('click', () => openManageSupermarkets('shopping'));

  // Pantalla de gestió de supermercats
  const btnAddCustomSm = document.getElementById('btn-add-custom-supermarket');
  if (btnAddCustomSm) btnAddCustomSm.addEventListener('click', () => openSupermarketEdit(null));

  // Editar supermercat (botó al header)
  const btnEditSupermarket = document.getElementById('supermarket-edit-btn');
  if (btnEditSupermarket) btnEditSupermarket.addEventListener('click', () => {
    const sm = getSupermarketById(currentSupermarketId);
    if (sm) openSupermarketEdit(sm);
  });

  // Pantalla d'edició de supermercat
  const btnSaveSm = document.getElementById('btn-save-supermarket');
  if (btnSaveSm) btnSaveSm.addEventListener('click', saveSupermarket);

  const btnDelSm = document.getElementById('btn-delete-supermarket');
  if (btnDelSm) btnDelSm.addEventListener('click', deleteSupermarket);

  // Pantalla d'items
  const btnAddItem = document.getElementById('btn-add-shopping-item');
  if (btnAddItem) btnAddItem.addEventListener('click', () => {
    showScreen('shopping-add-choice');
  });

  // Botons de la pantalla de tria d'afegir a BuyMe
  const choiceShopScan = document.getElementById('shop-choice-scan');
  if (choiceShopScan) choiceShopScan.addEventListener('click', () => {
    pendingShoppingScanContext = true;
    if (typeof startShoppingScanner === 'function') startShoppingScanner();
  });

  const choiceShopManual = document.getElementById('shop-choice-manual');
  if (choiceShopManual) choiceShopManual.addEventListener('click', () => openShoppingItemEdit(null));

  const choiceShopPopular = document.getElementById('shop-choice-popular');
  if (choiceShopPopular) choiceShopPopular.addEventListener('click', () => {
    renderPopularListForShopping();
    showScreen('shopping-popular');
  });

  // Pantalla d'edició d'item
  const btnSaveItem = document.getElementById('btn-save-shopping-item');
  if (btnSaveItem) btnSaveItem.addEventListener('click', saveShoppingItem);

  const btnDelItem = document.getElementById('btn-delete-shopping-item');
  if (btnDelItem) btnDelItem.addEventListener('click', deleteShoppingItem);

  // Inicia sincronització si ja teníem codi guardat
  initSync();

  // Inicia notificacions
  initNotifications();

  // Productes populars
  document.getElementById('popular-btn').addEventListener('click', () => {
    renderPopularList();
    showScreen('popular');
  });

  // Codi a mà
  document.getElementById('manual-code-btn').addEventListener('click', () => {
    document.getElementById('input-barcode').value = '';
    showScreen('manual-code');
    setTimeout(() => document.getElementById('input-barcode').focus(), 250);
  });
  document.getElementById('search-barcode-btn').addEventListener('click', searchManualBarcode);

  // Ubicacions: gestió
  const newLocBtn = document.getElementById('new-location-btn');
  if (newLocBtn) newLocBtn.addEventListener('click', () => openLocationEditor(-1));

  const saveLocBtn = document.getElementById('save-location-btn');
  if (saveLocBtn) saveLocBtn.addEventListener('click', saveLocationEdit);

  const delLocBtn = document.getElementById('loc-edit-delete');
  if (delLocBtn) delLocBtn.addEventListener('click', () => {
    if (editingLocationIndex >= 0) {
      deleteLocation(editingLocationIndex);
      showScreen('locations');
    }
  });
});


document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderHome();
  else stopScanner();
});
