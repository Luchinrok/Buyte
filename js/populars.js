/* ============================================
   Buyte — js/populars.js
   Mòdul dels productes populars: catàleg per defecte +
   personalitzacions guardades a localStorage. Inclou
   editor i pantalla de gestió.
   ============================================ */



function getPopularProducts() {
  const lang = getCurrentLang();
  const customRaw = localStorage.getItem('eatmefirst_popular_custom');
  if (customRaw) {
    try {
      const custom = JSON.parse(customRaw);
      return custom;
    } catch(e) {}
  }
  // Per defecte: del catàleg, amb zona deduïda automàticament
  return POPULAR_PRODUCTS.map((p, idx) => {
    const name = p[lang] || p.en;
    let location = null;
    if (typeof guessLocationFromName === 'function') {
      location = guessLocationFromName(name);
    }
    return {
      id: 'pop-' + idx,
      name: name,
      emoji: p.emoji,
      days: p.days,
      location: location || 'pantry'
    };
  });
}

function savePopularProducts(list) {
  localStorage.setItem('eatmefirst_popular_custom', JSON.stringify(list));
  if (typeof pushToServer === 'function') pushToServer();
}

function sortPopularAlpha() {
  const list = getPopularProducts();
  list.sort((a, b) => a.name.localeCompare(b.name));
  savePopularProducts(list);
}

function movePopularItem(idx, direction) {
  const list = getPopularProducts();
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= list.length) return;
  [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
  savePopularProducts(list);
  renderPopularList();
}

function deletePopularItem(idx) {
  const list = getPopularProducts();
  if (!confirm(t('confirmDeletePopular'))) return;
  list.splice(idx, 1);
  savePopularProducts(list);
  renderPopularList();
}

function addCustomPopular() {
  openPopularEdit(null);
}

function editPopularItem(idx) {
  const list = getPopularProducts();
  openPopularEdit(idx);
}

let editingPopularIdx = null;
let selectedPopularEmoji = '🥛';

function openPopularEdit(idx) {
  editingPopularIdx = idx;
  const list = getPopularProducts();
  const isNew = idx === null;
  const item = isNew ? null : list[idx];

  document.getElementById('popular-edit-title').textContent = isNew ? t('newPopular') : t('editPopular');
  document.getElementById('input-popular-name').value = isNew ? '' : item.name;
  document.getElementById('input-popular-days').value = isNew ? '7' : item.days;
  const noExpInput = document.getElementById('input-popular-no-expiry');
  if (noExpInput) noExpInput.checked = !!(item && item.noExpiry);
  selectedPopularEmoji = isNew ? '🥛' : item.emoji;
  document.getElementById('popular-emoji-current').textContent = selectedPopularEmoji;

  const delBtn = document.getElementById('btn-delete-popular');
  if (delBtn) delBtn.style.display = isNew ? 'none' : 'block';

  showScreen('popular-edit');
}

function savePopularEdit() {
  const name = document.getElementById('input-popular-name').value.trim();
  const days = parseInt(document.getElementById('input-popular-days').value, 10) || 7;
  const noExpInput = document.getElementById('input-popular-no-expiry');
  const noExpiry = !!(noExpInput && noExpInput.checked);
  if (!name) { showToast(t('needName')); return; }

  const list = getPopularProducts();
  if (editingPopularIdx === null) {
    list.push({
      id: 'pop-custom-' + Date.now(),
      name, emoji: selectedPopularEmoji, days, noExpiry
    });
  } else {
    list[editingPopularIdx].name = name;
    list[editingPopularIdx].emoji = selectedPopularEmoji;
    list[editingPopularIdx].days = days;
    list[editingPopularIdx].noExpiry = noExpiry;
  }
  savePopularProducts(list);
  showToast(t('saved'));
  showScreen('popular');
  renderPopularList();
}

function deletePopularEdit() {
  if (editingPopularIdx === null) return;
  if (!confirm(t('confirmDeletePopular'))) return;
  const list = getPopularProducts();
  list.splice(editingPopularIdx, 1);
  savePopularProducts(list);
  showScreen('popular');
  renderPopularList();
}

let popularMode = 'view'; // 'view' o 'edit'
let popularOrigin = 'home'; // d'on s'ha obert: 'home', 'shopping', 'settings'

function openPopular(origin) {
  popularOrigin = origin || 'home';
  popularMode = 'view';
  // Reset back-button: per defecte 'add', des de configuració 'settings'
  const backBtn = document.querySelector('#screen-popular .back-btn');
  if (backBtn) {
    if (popularOrigin === 'settings') backBtn.dataset.back = 'settings';
    else backBtn.dataset.back = 'add';
  }
  renderPopularList();
  showScreen('popular');
}

function renderPopularList() {
  const container = document.getElementById('popular-list');
  container.innerHTML = '';
  const items = getPopularProducts();

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noPopular');
    container.appendChild(empty);
    updatePopularButtons();
    return;
  }

  items.forEach((p, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === items.length - 1;
    const row = document.createElement('div');
    row.className = 'popular-row';

    if (popularMode === 'edit') {
      row.innerHTML = `
        <button class="popular-item-main">
          <span class="popular-emoji">${p.emoji}</span>
          <span class="popular-name">${escapeHtml(p.name)}</span>
          <span class="popular-days">+${p.days}d</span>
        </button>
        <div class="popular-arrows">
          <button class="arrow-btn ${isFirst ? 'arrow-disabled' : ''}" data-action="up" ${isFirst ? 'disabled' : ''} aria-label="Up">▲</button>
          <button class="arrow-btn ${isLast ? 'arrow-disabled' : ''}" data-action="down" ${isLast ? 'disabled' : ''} aria-label="Down">▼</button>
        </div>
        <button class="popular-edit-btn" aria-label="Edit">✏️</button>
        <button class="popular-delete-btn" aria-label="Delete">✕</button>
      `;
      row.querySelector('.popular-item-main').addEventListener('click', () => {
        openAddForm({ name: p.name, emoji: p.emoji, days: p.days, location: p.location });
      });
      row.querySelector('.popular-edit-btn').addEventListener('click', () => editPopularItem(idx));
      row.querySelector('.popular-delete-btn').addEventListener('click', () => deletePopularItem(idx));
      const upBtn = row.querySelector('[data-action="up"]');
      const downBtn = row.querySelector('[data-action="down"]');
      if (upBtn && !isFirst) upBtn.addEventListener('click', () => movePopularItem(idx, -1));
      if (downBtn && !isLast) downBtn.addEventListener('click', () => movePopularItem(idx, 1));
    } else {
      // Mode visualització (net): només producte i clic per afegir
      row.innerHTML = `
        <button class="popular-item-main popular-item-full">
          <span class="popular-emoji">${p.emoji}</span>
          <span class="popular-name">${escapeHtml(p.name)}</span>
          <span class="popular-days">+${p.days}d</span>
        </button>
      `;
      row.querySelector('.popular-item-main').addEventListener('click', () => {
        openAddForm({ name: p.name, emoji: p.emoji, days: p.days, location: p.location });
      });
    }

    container.appendChild(row);
  });

  updatePopularButtons();
}

function updatePopularButtons() {
  const editBtn = document.getElementById('btn-toggle-edit-popular');
  const addBtn = document.getElementById('popular-add-custom');
  const sortBtn = document.getElementById('popular-sort-alpha');
  const saveBtn = document.getElementById('btn-save-popular-changes');

  if (popularMode === 'edit') {
    if (editBtn) editBtn.style.display = 'none';
    if (addBtn) addBtn.style.display = 'flex';
    if (sortBtn) sortBtn.style.display = 'flex';
    if (saveBtn) saveBtn.style.display = 'block';
  } else {
    if (editBtn) editBtn.style.display = 'flex';
    if (addBtn) addBtn.style.display = 'none';
    if (sortBtn) sortBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
  }
}

function togglePopularEditMode() {
  popularMode = popularMode === 'view' ? 'edit' : 'view';
  renderPopularList();
}
