/* ============================================
   Buyte — js/populars.js
   Mòdul dels productes populars: catàleg per defecte +
   personalitzacions guardades a localStorage. Inclou
   editor i pantalla de gestió.
   ============================================ */



// Construeix un mapa nom-en-minúscules → entrada canònica del catàleg,
// indexant TOTS els noms en TOTS els idiomes per cada producte. Així podem
// trobar la zona canònica encara que la cache vingui en un altre idioma.
function buildPopularNameIndex() {
  const idx = {};
  const langs = ['ca','es','en','fr','it','de','pt','nl','ja','zh','ko'];
  POPULAR_PRODUCTS.forEach(p => {
    langs.forEach(lg => {
      if (p[lg]) idx[p[lg].toLowerCase()] = p;
    });
  });
  return idx;
}

function getPopularProducts() {
  const lang = getCurrentLang();
  const canonicalByName = buildPopularNameIndex();
  const customRaw = localStorage.getItem('eatmefirst_popular_custom');
  if (customRaw) {
    try {
      const custom = JSON.parse(customRaw);
      // Normalització: si un item de la cache coincideix amb un producte del
      // catàleg pel nom, forcem la zona canònica (corregeix caches antigues
      // que tenien Formatge a congelador, etc.). Items personalitzats per
      // l'usuari (no al catàleg) es deixen intactes.
      let migrated = false;
      custom.forEach(it => {
        if (!it || !it.name) return;
        const canon = canonicalByName[it.name.toLowerCase()];
        if (canon && canon.location && it.location !== canon.location) {
          it.location = canon.location;
          migrated = true;
        }
        // Si encara no té zona, intenta deduir-la
        if (!it.location) {
          if (canon && canon.location) {
            it.location = canon.location;
          } else if (typeof guessLocationFromName === 'function') {
            it.location = guessLocationFromName(it.name) || 'pantry';
          } else {
            it.location = 'pantry';
          }
          migrated = true;
        }
      });
      if (migrated) {
        localStorage.setItem('eatmefirst_popular_custom', JSON.stringify(custom));
      }
      return custom;
    } catch(e) {}
  }
  // Per defecte: del catàleg, usant la zona canònica
  return POPULAR_PRODUCTS.map((p, idx) => {
    const name = p[lang] || p.en;
    let location = p.location;
    if (!location && typeof guessLocationFromName === 'function') {
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
  // Defensiu: re-aplicar la zona de "tornar" segons popularOrigin per si
  // s'ha quedat desactualitzada (ex: ve d'una drecera que no passa per openPopular).
  const backBtn = document.querySelector('#screen-popular .back-btn');
  if (backBtn) {
    if (popularOrigin === 'settings') backBtn.dataset.back = 'settings';
    else if (popularOrigin === 'shopping') backBtn.dataset.back = 'shopping';
    else backBtn.dataset.back = 'add';
  }

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

  // Helper: badge de zona (emoji + nom curt) per inserir a cada fila
  const locBadge = (locId) => {
    if (typeof getLocationById !== 'function') return '';
    const loc = getLocationById(locId);
    if (!loc) return '';
    const name = (typeof getLocationName === 'function') ? getLocationName(loc) : (loc.id || '');
    return `<span class="popular-loc">${loc.emoji} ${escapeHtml(name)}</span>`;
  };

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
          ${locBadge(p.location)}
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
        openAddForm({ name: p.name, emoji: p.emoji, days: p.days, location: p.location, noExpiry: !!p.noExpiry });
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
          ${locBadge(p.location)}
          <span class="popular-days">+${p.days}d</span>
        </button>
      `;
      row.querySelector('.popular-item-main').addEventListener('click', () => {
        openAddForm({ name: p.name, emoji: p.emoji, days: p.days, location: p.location, noExpiry: !!p.noExpiry });
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
