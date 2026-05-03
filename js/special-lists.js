/* ============================================
   Buyte — js/special-lists.js
   Mòdul de llistes especials (pícnic, viatge, etc.):
   catàleg per defecte + personalitzacions, edició,
   selecció d'items, addició al BuyMe.
   ============================================ */


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
        + '<span class="special-item-name">' + formatProductLine(item.name, item.qty) + '</span>';
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
    if (supermarkets.length === 1) {
      addSpecialListToSupermarket(supermarkets[0].id);
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
  // Gamificació: 30 XP per haver "Comprat" una llista especial.
  if (typeof bumpSpecialListsUsedCounter === 'function') bumpSpecialListsUsedCounter();
  if (typeof addXp === 'function') addXp(30, 'special-list-used');
  // Quedar-se a la pantalla del detall de la llista (no anar al super)
}

function showSupermarketPickerForSpecial() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const enabled = getEnabledSupermarkets();
  const enabledIds = new Set(enabled.map(s => s.id));
  const others = supermarkets.filter(s => !enabledIds.has(s.id));

  const renderRow = (sm) => `
    <button class="modal-supermarket-option" data-id="${sm.id}">
      <span style="font-size:24px;margin-right:10px">${sm.emoji}</span>
      <span>${escapeHtml(sm.name)}</span>
    </button>
  `;
  const sectionHeader = (label) => `
    <p class="modal-sub" style="margin:10px 0 6px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.7">${label}</p>
  `;

  let listHtml = '';
  if (enabled.length > 0) {
    listHtml += sectionHeader(t('preferredShops'));
    listHtml += enabled.map(renderRow).join('');
  }
  if (others.length > 0) {
    listHtml += sectionHeader(t('otherShops'));
    listHtml += others.map(renderRow).join('');
  }

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">🛒</div>
      <p class="modal-title">${t('chooseSupermarket')}</p>
      <p class="modal-sub">${t('whichSupermarket')}</p>
      <div class="modal-supermarket-list">${listHtml}</div>
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
