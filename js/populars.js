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
        // Omple preu/pes per defecte des del catàleg si l'usuari no els té,
        // però respectem qualsevol valor que ell hagi posat manualment.
        if (canon) {
          if (typeof it.price !== 'number' && typeof canon.price === 'number') {
            it.price = canon.price;
            migrated = true;
          }
          if (!it.weight && canon.weight) {
            it.weight = canon.weight;
            migrated = true;
          }
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
    const entry = {
      id: 'pop-' + idx,
      name: name,
      emoji: p.emoji,
      days: p.days,
      location: location || 'pantry'
    };
    if (typeof p.price === 'number') entry.price = p.price;
    if (p.weight) entry.weight = p.weight;
    return entry;
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
let selectedPopularLocation = 'pantry';

function renderPopularLocationPicker() {
  const container = document.getElementById('popular-location-picker');
  if (!container || typeof locations === 'undefined') return;
  container.innerHTML = '';
  locations.forEach(loc => {
    const btn = document.createElement('button');
    btn.className = 'loc-option' + (loc.id === selectedPopularLocation ? ' selected' : '');
    btn.type = 'button';
    btn.innerHTML = '<span class="loc-option-emoji"></span><span class="loc-option-name"></span>';
    btn.querySelector('.loc-option-emoji').textContent = loc.emoji;
    btn.querySelector('.loc-option-name').textContent = getLocationName(loc);
    btn.addEventListener('click', () => {
      selectedPopularLocation = loc.id;
      renderPopularLocationPicker();
    });
    container.appendChild(btn);
  });
}

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

  const priceInput = document.getElementById('input-popular-price');
  if (priceInput) {
    priceInput.value = (!isNew && item && typeof item.price === 'number' && item.price >= 0)
      ? String(item.price)
      : '';
  }

  const weightInput = document.getElementById('input-popular-weight');
  if (weightInput) {
    weightInput.value = (!isNew && item && item.weight) ? String(item.weight) : '';
  }

  selectedPopularLocation = (item && item.location) ? item.location : 'pantry';
  if (typeof getLocationById === 'function' && !getLocationById(selectedPopularLocation)) {
    selectedPopularLocation = (typeof locations !== 'undefined' && locations[0]) ? locations[0].id : 'pantry';
  }
  renderPopularLocationPicker();

  selectedPopularEmoji = isNew ? '🥛' : item.emoji;
  document.getElementById('popular-emoji-current').textContent = selectedPopularEmoji;

  const delBtn = document.getElementById('btn-delete-popular');
  if (delBtn) delBtn.style.display = isNew ? 'none' : 'block';

  // Defensiu: el back de popular-edit torna a la llista de populars,
  // EXCEPTE si la sub-pantalla de Configuració > Contingut ha redirigit el
  // back a 'settings-content' (embed actiu) — en aquest cas el respectem
  // perquè el back retorni a la sub-pàgina i no a la llista standalone.
  const editBack = document.querySelector('#screen-popular-edit .back-btn');
  if (editBack) {
    const cur = editBack.dataset.back || '';
    if (cur.indexOf('settings-') !== 0) editBack.dataset.back = 'popular';
  }

  showScreen('popular-edit');
}

function savePopularEdit() {
  const name = document.getElementById('input-popular-name').value.trim();
  // 'days' és un nombre enter de dies fins caducar — no fem cap conversió
  // a data per evitar que la zona horària afegeixi/tregui un dia. Acceptem
  // tant punt com coma per si el navegador hi ha posat alguna cosa rara.
  const rawDays = String(document.getElementById('input-popular-days').value || '').trim();
  let days = parseInt(rawDays, 10);
  if (!Number.isFinite(days) || days <= 0) days = 7;
  const noExpInput = document.getElementById('input-popular-no-expiry');
  const noExpiry = !!(noExpInput && noExpInput.checked);
  if (!name) { showToast(t('needName')); return; }

  // Preu opcional
  const priceInput = document.getElementById('input-popular-price');
  let price = null;
  if (priceInput && priceInput.value.trim() !== '') {
    const raw = String(priceInput.value).trim().replace(',', '.');
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) price = Math.round(parsed * 100) / 100;
  }

  // Pes opcional
  const weightInput = document.getElementById('input-popular-weight');
  const weight = (weightInput && weightInput.value.trim()) || '';

  const location = selectedPopularLocation || 'pantry';

  const list = getPopularProducts();
  if (editingPopularIdx === null) {
    const entry = {
      id: 'pop-custom-' + Date.now(),
      name, emoji: selectedPopularEmoji, days, noExpiry, location,
      // Marca que aquesta entrada té valors explícits posats per l'usuari,
      // perquè l'aprenentatge automàtic (addToCustomPopular) no els
      // sobreescrigui sense voler la propera vegada que es desi un producte
      // amb el mateix nom.
      userEdited: true
    };
    if (price !== null) entry.price = price;
    if (weight) entry.weight = weight;
    list.push(entry);
  } else {
    list[editingPopularIdx].name = name;
    list[editingPopularIdx].emoji = selectedPopularEmoji;
    list[editingPopularIdx].days = days;
    list[editingPopularIdx].noExpiry = noExpiry;
    list[editingPopularIdx].location = location;
    list[editingPopularIdx].userEdited = true;
    if (price !== null) list[editingPopularIdx].price = price;
    else delete list[editingPopularIdx].price;
    if (weight) list[editingPopularIdx].weight = weight;
    else delete list[editingPopularIdx].weight;
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
  popularSearchQuery = '';
  const searchInput = document.getElementById('popular-search');
  if (searchInput) searchInput.value = '';
  // Reset back-button: 'settings' o sub-pantalla 'settings-*' des de
  // Configuració, 'shopping-item-edit' des del BuyMe, 'add' (formulari del
  // BiteMe) per defecte.
  const backBtn = document.querySelector('#screen-popular .back-btn');
  if (backBtn) {
    if (popularOrigin === 'settings' || (typeof popularOrigin === 'string' && popularOrigin.indexOf('settings-') === 0)) {
      backBtn.dataset.back = popularOrigin;
    } else if (popularOrigin === 'shopping') backBtn.dataset.back = 'shopping-item-edit';
    else backBtn.dataset.back = 'add';
  }
  renderPopularList();
  showScreen('popular');
}

// Filtre de cerca actual a la pantalla de productes populars.
let popularSearchQuery = '';

function renderPopularList() {
  // Defensiu: re-aplicar la zona de "tornar" segons popularOrigin per si
  // s'ha quedat desactualitzada (ex: ve d'una drecera que no passa per openPopular).
  const backBtn = document.querySelector('#screen-popular .back-btn');
  if (backBtn) {
    if (popularOrigin === 'settings') backBtn.dataset.back = 'settings';
    else if (popularOrigin === 'shopping') backBtn.dataset.back = 'shopping-item-edit';
    else backBtn.dataset.back = 'add';
  }

  // Placeholder del cercador (només es pot fer aquí perquè depèn de t())
  const searchInput = document.getElementById('popular-search');
  if (searchInput) {
    searchInput.placeholder = t('searchPlaceholder');
    if (searchInput.value !== popularSearchQuery) searchInput.value = popularSearchQuery;
  }

  const container = document.getElementById('popular-list');
  container.innerHTML = '';
  const allItems = getPopularProducts();
  const q = popularSearchQuery.toLowerCase().trim();
  const items = q ? allItems.filter(p => p.name.toLowerCase().includes(q)) : allItems;

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = q ? t('noResults') : t('noPopular');
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

  items.forEach((p) => {
    // Quan hi ha cerca activa, items està filtrat: necessitem l'índex original
    // dins de la llista completa per a editar/moure/esborrar.
    const realIdx = allItems.indexOf(p);
    const isFirst = realIdx === 0;
    const isLast = realIdx === allItems.length - 1;
    // En mode cerca filtrat, no permetem reordenar amb fletxes (no té sentit).
    const showArrows = !q;
    const row = document.createElement('div');
    row.className = 'popular-row';

    // Des de Configuració, clicar una fila obre l'edició del popular (gestió
    // del catàleg). Des del BuyMe, prefilla el formulari de la llista de la
    // compra. Des de la resta (add/home), prefilla el formulari del BiteMe.
    const onRowClick = () => {
      if (popularOrigin === 'settings') {
        editPopularItem(realIdx);
      } else if (popularOrigin === 'shopping') {
        if (typeof prefillShoppingItemFromPopular === 'function') {
          prefillShoppingItemFromPopular(p);
        }
        showScreen('shopping-item-edit');
      } else {
        openAddForm({
          name: p.name, emoji: p.emoji, days: p.days,
          location: p.location, noExpiry: !!p.noExpiry,
          price: p.price, weight: p.weight
        });
      }
    };

     if (popularMode === 'edit') {
      const arrowsHtml = showArrows ? `
        <div class="popular-arrows">
          <button class="arrow-btn ${isFirst ? 'arrow-disabled' : ''}" data-action="up" ${isFirst ? 'disabled' : ''} aria-label="Up">▲</button>
          <button class="arrow-btn ${isLast ? 'arrow-disabled' : ''}" data-action="down" ${isLast ? 'disabled' : ''} aria-label="Down">▼</button>
        </div>
      ` : '';
      row.innerHTML = `
        <button class="popular-item-main">
          <span class="popular-emoji">${p.emoji}</span>
          <span class="popular-name">${escapeHtml(p.name)}</span>
          ${locBadge(p.location)}
          <span class="popular-days">+${p.days}d</span>
        </button>
        ${arrowsHtml}
        <button class="popular-edit-btn" aria-label="Edit">✏️</button>
        <button class="popular-delete-btn" aria-label="Delete">✕</button>
      `;
      row.querySelector('.popular-item-main').addEventListener('click', onRowClick);
      row.querySelector('.popular-edit-btn').addEventListener('click', () => editPopularItem(realIdx));
      row.querySelector('.popular-delete-btn').addEventListener('click', () => deletePopularItem(realIdx));
      const upBtn = row.querySelector('[data-action="up"]');
      const downBtn = row.querySelector('[data-action="down"]');
      if (upBtn && !isFirst) upBtn.addEventListener('click', () => movePopularItem(realIdx, -1));
      if (downBtn && !isLast) downBtn.addEventListener('click', () => movePopularItem(realIdx, 1));
    } else {
      row.innerHTML = `
        <button class="popular-item-main popular-item-full">
          <span class="popular-emoji">${p.emoji}</span>
          <span class="popular-name">${escapeHtml(p.name)}</span>
          ${locBadge(p.location)}
          <span class="popular-days">+${p.days}d</span>
        </button>
      `;
      row.querySelector('.popular-item-main').addEventListener('click', onRowClick);
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

  // El botó del header sempre visible: actua com a toggle (edita/desa).
  if (editBtn) {
    editBtn.style.display = 'flex';
    editBtn.classList.toggle('active', popularMode === 'edit');
    editBtn.textContent = popularMode === 'edit' ? '✓' : '✏️';
    editBtn.setAttribute('aria-label', popularMode === 'edit' ? 'Done' : 'Edit');
  }
  if (popularMode === 'edit') {
    if (addBtn) addBtn.style.display = 'flex';
    if (sortBtn) sortBtn.style.display = 'flex';
    if (saveBtn) saveBtn.style.display = 'block';
  } else {
    if (addBtn) addBtn.style.display = 'none';
    if (sortBtn) sortBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
  }
}

function togglePopularEditMode() {
  popularMode = popularMode === 'view' ? 'edit' : 'view';
  renderPopularList();
}
