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
  // Llistes d'idiomes per al fallback de nom i per detectar duplicats
  // a la injecció catàleg→cache (vegeu sota).
  const LANGS = ['ca','es','en','fr','it','de','pt','nl','ja','zh','ko'];
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
      // Injecció catàleg→cache: assegura que tot producte del catàleg
      // POPULAR_PRODUCTS està representat a la cache. Sense això, usuaris
      // amb cache existent (a 'eatmefirst_popular_custom') no veurien mai
      // els productes nous afegits al catàleg en versions posteriors
      // (vegeu 'ampliació catàleg 2026' a core.js). Match per QUALSEVOL
      // idioma per no afegir duplicats quan l'usuari ja té el producte
      // amb un nom traduït diferent al canònic.
      const customNamesLower = new Set();
      custom.forEach(it => {
        if (it && typeof it.name === 'string') {
          customNamesLower.add(it.name.toLowerCase().trim());
        }
      });
      POPULAR_PRODUCTS.forEach((p, idx) => {
        const matchesExisting = LANGS.some(lg => p[lg] && customNamesLower.has(p[lg].toLowerCase()));
        if (matchesExisting) return;
        const name = p[lang] || p.en || p.ca || p.es ||
          Object.values(p).find(v => typeof v === 'string') || '???';
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
        custom.push(entry);
        migrated = true;
      });
      if (migrated) {
        localStorage.setItem('eatmefirst_popular_custom', JSON.stringify(custom));
      }
      return custom;
    } catch(e) {}
  }
  // Per defecte: del catàleg, usant la zona canònica
  return POPULAR_PRODUCTS.map((p, idx) => {
    // Fallback robust: idioma actiu → en → ca → es → primer string
    // disponible → '???'. Evita render literal de "undefined" i
    // corrupció a Firestore quan algun producte només té alguns
    // idiomes definits (cas dels productes locals/intraduïbles).
    const name = p[lang] || p.en || p.ca || p.es ||
      Object.values(p).find(v => typeof v === 'string') || '???';
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
  const item = list[idx];
  if (!item) return;
  showConfirmDangerModal(
    item.emoji || '🗑️',
    item.name || 'Producte popular',
    t('confirmDeletePopular'),
    () => {
      // Re-llegim per si la llista ha canviat entre el click i el confirm.
      const fresh = getPopularProducts();
      fresh.splice(idx, 1);
      savePopularProducts(fresh);
      renderPopularList();
    }
  );
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
  // El camp days només té sentit si l'item caduca. Si !item.noExpiry,
  // amaguem el wrapper #popular-days-row sencer (label + input) i deixem
  // value al default 7 perquè si l'usuari desmarca "No caduca" reaparegui
  // amb un valor sa. Si item té days numèric, el carreguem; sinó (cas
  // típic dels productes noExpiry residuals), fallback a 7.
  const noExpInput = document.getElementById('input-popular-no-expiry');
  const daysInput = document.getElementById('input-popular-days');
  const daysRow = document.getElementById('popular-days-row');
  const itemNoExpiry = !!(item && item.noExpiry);
  if (noExpInput) noExpInput.checked = itemNoExpiry;
  if (daysInput) daysInput.value = (item && typeof item.days === 'number') ? item.days : 7;
  if (daysRow) daysRow.style.display = itemNoExpiry ? 'none' : '';

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

  // Categoria (FASE 3-bis): popular el select amb totes les categories i
  // marquem la categoria que té assignada manualment (o "" per fer servir
  // la detecció automàtica). El render del filtre a renderPopularList ja
  // dóna prioritat a l'assignació manual sobre la detecció — vegeu el
  // bloc `if (isCatFiltering && window.CategoriesSystem)`.
  _populatePopularCategorySelect(isNew ? null : item);

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

// Helper per a openPopularEdit: omple el picker visual de categoria amb
// la llista actual + opció "Detecció automàtica" i marca la categoria
// assignada manualment al popular (si en té). En cas de NEW (item null),
// es deixa la detecció automàtica.
//
// El picker és un botó + dropdown amagat (no un <select> nadiu) per ser
// coherent amb la resta de pickers de l'app. La selecció es persisteix al
// dataset.selectedCatId del botó; savePopularEdit el llegeix d'allà.
function _populatePopularCategorySelect(item) {
  const btn = document.getElementById('popular-category-picker-btn');
  const dropdown = document.getElementById('popular-category-picker-dropdown');
  if (!btn || !dropdown) return;
  if (!window.CategoriesSystem || typeof window.CategoriesSystem.getCategories !== 'function') {
    dropdown.innerHTML = '';
    return;
  }

  const cats = window.CategoriesSystem.getCategories().slice().sort((a, b) => {
    const oa = (typeof a.order === 'number') ? a.order : 999;
    const ob = (typeof b.order === 'number') ? b.order : 999;
    return oa - ob;
  });

  // "Detecció automàtica" sempre primer; després totes les categories.
  const opts = [{ id: '', icon: '📋', name: 'Detecció automàtica' }];
  cats.forEach(c => opts.push({ id: c.id, icon: c.icon || '📦', name: c.name || c.id }));

  dropdown.innerHTML = opts.map(o =>
    '<button type="button" class="category-option" data-cat-id="' + escapeHtml(o.id) + '">' +
      '<span class="cat-option-icon">' + escapeHtml(o.icon) + '</span>' +
      '<span class="cat-option-name">' + escapeHtml(o.name) + '</span>' +
    '</button>'
  ).join('');

  // Determina la selecció actual a partir del mapa d'assignacions manuals.
  let current = '';
  if (item && item.id && typeof window.CategoriesSystem.getItemCategories === 'function') {
    current = window.CategoriesSystem.getItemCategories()[item.id] || '';
  }
  _setPopularCategoryPickerSelection(current);

  // Re-bind dels handlers d'opció — el dropdown s'ha re-renderitzat.
  dropdown.querySelectorAll('.category-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      _setPopularCategoryPickerSelection(opt.dataset.catId || '');
      _closePopularCategoryPickerDropdown();
    });
  });

  // Sempre tancat al obrir el formulari.
  _closePopularCategoryPickerDropdown();
}

function _setPopularCategoryPickerSelection(catId) {
  const btn = document.getElementById('popular-category-picker-btn');
  if (!btn) return;
  btn.dataset.selectedCatId = catId || '';
  const iconEl = btn.querySelector('.picker-icon');
  const labelEl = btn.querySelector('.picker-label');
  if (!catId) {
    if (iconEl) iconEl.textContent = '📋';
    if (labelEl) labelEl.textContent = 'Detecció automàtica';
    return;
  }
  const cat = (typeof window.CategoriesSystem.getCategoryById === 'function')
    ? window.CategoriesSystem.getCategoryById(catId) : null;
  if (cat) {
    if (iconEl) iconEl.textContent = cat.icon || '📦';
    if (labelEl) labelEl.textContent = cat.name || catId;
  }
}

function _togglePopularCategoryPickerDropdown() {
  const dropdown = document.getElementById('popular-category-picker-dropdown');
  const btn = document.getElementById('popular-category-picker-btn');
  if (!dropdown || !btn) return;
  if (dropdown.hasAttribute('hidden')) {
    dropdown.removeAttribute('hidden');
    btn.classList.add('open');
  } else {
    _closePopularCategoryPickerDropdown();
  }
}

function _closePopularCategoryPickerDropdown() {
  const dropdown = document.getElementById('popular-category-picker-dropdown');
  const btn = document.getElementById('popular-category-picker-btn');
  if (dropdown) dropdown.setAttribute('hidden', '');
  if (btn) btn.classList.remove('open');
}

// Listeners globals per al picker — toggle del botó, click-fora i Escape.
// Idempotents via guard (amb `id` el grep és barat); s'enganxen una sola
// vegada al càrrec del DOM.
(function _attachPopularCategoryPickerListeners() {
  if (typeof document === 'undefined') return;
  if (window.__popCatPickerListeners) return;
  window.__popCatPickerListeners = true;
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('popular-category-picker-btn');
    if (btn) btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _togglePopularCategoryPickerDropdown();
    });
  });
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('popular-category-picker-dropdown');
    const btn = document.getElementById('popular-category-picker-btn');
    if (!dropdown || dropdown.hasAttribute('hidden')) return;
    if (btn && btn.contains(e.target)) return;
    if (dropdown.contains(e.target)) return;
    _closePopularCategoryPickerDropdown();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closePopularCategoryPickerDropdown();
  });
})();

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

  // Pes opcional — validat i normalitzat al format canònic (abans no
  // es normalitzava). Rebutja text lliure / números sense unitat / ≤0.
  const weightInput = document.getElementById('input-popular-weight');
  let weight = '';
  if (weightInput) {
    const wv = validateWeight(weightInput.value);
    if (!wv.valid) {
      weightInput.classList.add('input-invalid');
      showToast(t('weightInvalid'));
      return;
    }
    weightInput.classList.remove('input-invalid');
    weight = wv.normalized;
  }

  const location = selectedPopularLocation || 'pantry';

  const list = getPopularProducts();
  let savedItemId = null;
  if (editingPopularIdx === null) {
    const entry = {
      id: 'pop-custom-' + Date.now(),
      name, emoji: selectedPopularEmoji, noExpiry, location,
      // Marca que aquesta entrada té valors explícits posats per l'usuari,
      // perquè l'aprenentatge automàtic (addToCustomPopular) no els
      // sobreescrigui sense voler la propera vegada que es desi un producte
      // amb el mateix nom.
      userEdited: true
    };
    // days només si l'item caduca — sino contaminaríem productes noExpiry
    // amb el default 7 que el form sempre té carregat al fons (és l'origen
    // del bug que la migració v3 a categories.js neteja a posteriori).
    if (!noExpiry) entry.days = days;
    if (price !== null) entry.price = price;
    if (weight) entry.weight = weight;
    list.push(entry);
    savedItemId = entry.id;
  } else {
    list[editingPopularIdx].name = name;
    list[editingPopularIdx].emoji = selectedPopularEmoji;
    list[editingPopularIdx].noExpiry = noExpiry;
    list[editingPopularIdx].location = location;
    list[editingPopularIdx].userEdited = true;
    // days: si l'usuari ha marcat noExpiry, eliminem el camp existent
    // perquè el cache quedi coherent. Si !noExpiry, escrivim el days
    // capturat del form.
    if (noExpiry) delete list[editingPopularIdx].days;
    else list[editingPopularIdx].days = days;
    if (price !== null) list[editingPopularIdx].price = price;
    else delete list[editingPopularIdx].price;
    if (weight) list[editingPopularIdx].weight = weight;
    else delete list[editingPopularIdx].weight;
    savedItemId = list[editingPopularIdx].id;
  }
  savePopularProducts(list);

  // Categoria (FASE 3-bis): persisteix l'assignació manual o, si l'usuari
  // ha tornat a "Detecció automàtica", elimina l'entrada del mapa
  // perquè el filtre torni a fer servir detectCategoryForItem.
  // El valor seleccionat viu al dataset del botó del picker — vegeu
  // _setPopularCategoryPickerSelection.
  const catBtn = document.getElementById('popular-category-picker-btn');
  if (catBtn && savedItemId && window.CategoriesSystem &&
      typeof window.CategoriesSystem.getItemCategories === 'function') {
    const chosen = catBtn.dataset.selectedCatId || '';
    if (chosen) {
      window.CategoriesSystem.setItemCategory(savedItemId, chosen);
    } else {
      const map = window.CategoriesSystem.getItemCategories();
      if (Object.prototype.hasOwnProperty.call(map, savedItemId)) {
        delete map[savedItemId];
        window.CategoriesSystem.saveItemCategories(map);
      }
    }
    // Repintem la barra de pestanyes a screen-popular si està al DOM —
    // evita que un canvi de categoria recent quedi invisible fins al
    // pròxim render espontani.
    if (typeof renderCategoryTabs === 'function') renderCategoryTabs();
  }

  showToast(t('saved'));
  _returnFromPopularEdit();
}

function deletePopularEdit() {
  if (editingPopularIdx === null) return;
  // Capturem l'index al moment del click (el modal és asíncron — si
  // editingPopularIdx canviés durant el modal, faríem servir el valor
  // antic). El item.emoji/name del modal els llegim ara mateix.
  const idxAtClick = editingPopularIdx;
  const list = getPopularProducts();
  const item = list[idxAtClick];
  if (!item) return;
  showConfirmDangerModal(
    item.emoji || '🗑️',
    item.name || 'Producte popular',
    t('confirmDeletePopular'),
    () => {
      const fresh = getPopularProducts();
      fresh.splice(idxAtClick, 1);
      savePopularProducts(fresh);
      _returnFromPopularEdit();
    }
  );
}

// Després de guardar / esborrar des de popular-edit, tornem a la
// pantalla d'origen: si venim de Configuració > Contingut > Productes
// re-renderitzem la sub-pantalla; si venim de la llista standalone hi
// tornem.
function _returnFromPopularEdit() {
  if (popularOrigin === 'settings') {
    if (typeof renderSettingsContent === 'function') renderSettingsContent();
    showScreen('settings-content');
    return;
  }
  showScreen('popular');
  renderPopularList();
}

let popularMode = 'view'; // 'view' o 'edit'
let popularOrigin = 'home'; // d'on s'ha obert: 'home', 'shopping', 'settings'

function openPopular(origin) {
  popularOrigin = origin || 'home';
  popularMode = 'view';
  popularSearchQuery = '';
  // FASE 2: cada vegada que s'obre la pantalla, reset del filtre de
  // categoria a "Tots". Si l'usuari surt i torna, no recordem el filtre.
  popularCategoryFilter = 'all';
  const searchInput = document.getElementById('popular-search');
  if (searchInput) searchInput.value = '';
  // Reset back-button: 'settings' o sub-pantalla 'settings-*' des de
  // Configuració, 'shopping-item-edit' des del BuyMe, 'add' (formulari del
  // EatMe) per defecte.
  const backBtn = document.querySelector('#screen-popular .back-btn');
  if (backBtn) {
    if (popularOrigin === 'settings' || (typeof popularOrigin === 'string' && popularOrigin.indexOf('settings-') === 0)) {
      backBtn.dataset.back = popularOrigin;
    } else if (popularOrigin === 'shopping') backBtn.dataset.back = 'shopping-item-edit';
    else backBtn.dataset.back = 'add';
  }
  renderCategoryTabs();
  renderPopularList();
  showScreen('popular');
}

// Filtre de cerca actual a la pantalla de productes populars.
let popularSearchQuery = '';
// FASE 2: filtre de categoria. 'all' = totes; o el id d'una categoria
// (cat_dairy, cat_meat, cat_user_*, cat_other...). Es reseteja cada cop
// que s'obre la pantalla via openPopular.
let popularCategoryFilter = 'all';

// Renderitza la barra de pestanyes a dalt de la pantalla de populars.
// Idempotent: la primera pestanya és sempre "Tots", la resta venen de
// CategoriesSystem.getCategories(). Reordena segons el camp `order` de
// cada categoria (ascendent). Click → setPopularCategoryFilter.
function renderCategoryTabs() {
  const scroll = document.getElementById('categories-tabs-scroll');
  if (!scroll) return;
  if (!window.CategoriesSystem || typeof window.CategoriesSystem.getCategories !== 'function') {
    // Capa de dades no carregada — sense pestanyes és més robust que
    // ensenyar només "Tots" sense que faci res.
    scroll.innerHTML = '';
    return;
  }
  const cats = window.CategoriesSystem.getCategories().slice().sort((a, b) => {
    const oa = (typeof a.order === 'number') ? a.order : 999;
    const ob = (typeof b.order === 'number') ? b.order : 999;
    return oa - ob;
  });

  const active = popularCategoryFilter || 'all';

  // "Tots" inline en català (l'app és Catalan-only a runtime — vegeu
  // la nota a tryQuickBuyShoppingItem a buyme.js sobre caches velles).
  let html = '<button type="button" class="cat-tab' + (active === 'all' ? ' cat-tab-active' : '') + '" data-cat-id="all">' +
             '<span class="cat-tab-icon">📋</span>' +
             '<span class="cat-tab-name">Tots</span>' +
             '</button>';
  cats.forEach(c => {
    const isAct = c.id === active;
    html += '<button type="button" class="cat-tab' + (isAct ? ' cat-tab-active' : '') + '" data-cat-id="' + escapeHtml(c.id) + '">' +
            '<span class="cat-tab-icon">' + escapeHtml(c.icon || '📦') + '</span>' +
            '<span class="cat-tab-name">' + escapeHtml(c.name || c.id) + '</span>' +
            '</button>';
  });
  scroll.innerHTML = html;

  scroll.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => setPopularCategoryFilter(btn.dataset.catId));
  });
}

function setPopularCategoryFilter(catId) {
  popularCategoryFilter = catId || 'all';
  // Actualització ràpida de l'estat actiu sense regenerar el DOM (evita
  // perdre la posició de scroll horitzontal de la barra).
  document.querySelectorAll('#categories-tabs-scroll .cat-tab').forEach(t => {
    t.classList.toggle('cat-tab-active', t.dataset.catId === popularCategoryFilter);
  });
  // La pestanya activa ha de quedar visible — útil sobretot quan l'usuari
  // ha tocat una pestanya parcialment fora del viewport horitzontal.
  const active = document.querySelector('#categories-tabs-scroll .cat-tab.cat-tab-active');
  if (active && typeof active.scrollIntoView === 'function') {
    try { active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
    catch (e) { /* navegadors antics sense les opcions */ }
  }
  renderPopularList();
}

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
  // Cerca insensible a accents + majúscules + espais (reutilitza el
  // helper compartit normalizeForSearch definit a biteme.js i exposat
  // a window). Cobreix accents agudes/greus/dièresi via NFD + regex de
  // combining diacritical marks; també ç → c (NFD ç = c + cedilla).
  const q = normalizeForSearch(popularSearchQuery);
  const catFilter = popularCategoryFilter || 'all';
  const isCatFiltering = (catFilter && catFilter !== 'all');

  // Filtrat combinat: text + categoria. Apliquem-los seqüencialment.
  let items = q ? allItems.filter(p => normalizeForSearch(p.name).includes(q)) : allItems.slice();
  if (isCatFiltering && window.CategoriesSystem) {
    const itemCats = (typeof window.CategoriesSystem.getItemCategories === 'function')
      ? window.CategoriesSystem.getItemCategories() : {};
    items = items.filter(p => {
      let cid = p && p.id ? itemCats[p.id] : null;
      // Si el popular encara no està categoritzat (FASE 1 no feia migració
      // automàtica — es farà a la FASE 4), detectem la categoria al moment.
      if (!cid && typeof window.CategoriesSystem.detectCategoryForItem === 'function') {
        cid = window.CategoriesSystem.detectCategoryForItem(p);
      }
      return cid === catFilter;
    });
  }

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    // Missatge específic per categoria (l'app és Catalan-only a runtime).
    if (isCatFiltering) empty.textContent = 'No hi ha productes en aquesta categoria.';
    else empty.textContent = q ? t('noResults') : t('noPopular');
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
    // En vistes filtrades (cerca o categoria) no permetem reordenar amb
    // fletxes — l'ordre canviaria en la llista global de manera confusa
    // perquè l'usuari només veu un subconjunt.
    const showArrows = !q && !isCatFiltering;
    const row = document.createElement('div');
    row.className = 'popular-row';

    // Des de Configuració, clicar una fila obre l'edició del popular (gestió
    // del catàleg). Des del BuyMe, prefilla el formulari de la llista de la
    // compra. Des de la resta (add/home), prefilla el formulari de l'EatMe.
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
  const toolbar = document.getElementById('popular-toolbar');

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
    if (toolbar) toolbar.classList.remove('is-empty');
  } else {
    if (addBtn) addBtn.style.display = 'none';
    if (sortBtn) sortBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
    // En mode view la barra no té cap botó visible: la col·lapsem
    // perquè no deixi un buit entre el cercador i la llista.
    if (toolbar) toolbar.classList.add('is-empty');
  }

  // Manté el botó d'acció de la sub-pantalla Configuració > Contingut
  // sincronitzat quan el mode canvia des de fora (p.e. "Guardar canvis").
  const subActionBtn = document.getElementById('settings-content-action-btn');
  if (subActionBtn && subActionBtn.dataset.role === 'popular') {
    subActionBtn.textContent = popularMode === 'edit' ? '✓' : '✏️';
    subActionBtn.classList.toggle('is-active', popularMode === 'edit');
    subActionBtn.setAttribute('aria-label', popularMode === 'edit' ? 'Done' : 'Edit');
  }
}

function togglePopularEditMode() {
  popularMode = popularMode === 'view' ? 'edit' : 'view';
  renderPopularList();
}

/* ============================================================
   FASE 3 — Gestió de categories (crear, editar, eliminar)
   Pantalles: #screen-manage-categories (llista)
              #screen-category-edit    (formulari, reusat per crear/editar)
   Origen: 'popular' (botó ⚙️ Gestionar a #screen-popular)
           'settings' (sub-tab a Configuració > Contingut > Categories)
   ============================================================ */

// Selector d'emoji limitat — la decisió FASE 3 és no oferir el picker
// complet aquí. Aquests són els 24 més rellevants per categoritzar.
const CATEGORY_EMOJI_OPTIONS = [
  '🥛', '🍖', '🐟', '🥬', '🍎', '🥖', '🥫', '🍫',
  '🥤', '❄️', '🌶️', '📦', '🍕', '🥗', '🍱', '🌮',
  '🍝', '🍣', '☕', '🍷', '🌾', '🥚', '🍯', '🧀'
];

let editingCategoryId = null;       // null = crear nou; id = editar existent
let selectedCategoryEmoji = '📦';   // emoji actiu al picker
let manageCategoriesOrigin = 'popular'; // 'popular' o 'settings'

function openManageCategories(origin) {
  manageCategoriesOrigin = origin || 'popular';
  // back-btn: 'popular' si venim de la pantalla de populars; si l'embed
  // de Configuració > Contingut està actiu, _embedStandaloneBody ja
  // sobreescriurà el data-back per fer que torni al sub-pàgina, així que
  // posar 'popular' aquí és el default segur per a l'obertura standalone.
  const backBtn = document.querySelector('#screen-manage-categories .back-btn');
  if (backBtn) backBtn.dataset.back = 'popular';
  renderCategoriesList();
  showScreen('manage-categories');
}

function renderCategoriesList() {
  const container = document.getElementById('categories-mgmt-list');
  if (!container) return;
  if (!window.CategoriesSystem || typeof window.CategoriesSystem.getCategories !== 'function') {
    container.innerHTML = '<p class="empty-state">Sistema de categories no disponible</p>';
    return;
  }

  const cats = window.CategoriesSystem.getCategories().slice().sort((a, b) => {
    const oa = (typeof a.order === 'number') ? a.order : 999;
    const ob = (typeof b.order === 'number') ? b.order : 999;
    return oa - ob;
  });

  // Identifiquem la primera i última categoria "movibles" (excloent
  // cat_other que sempre queda fixa a baix). Servirà per deshabilitar
  // els botons ▲ a la primera i ▼ a la última.
  const movables = cats.filter(c => !c.isCatchAll);
  const firstMovableId = movables.length > 0 ? movables[0].id : null;
  const lastMovableId = movables.length > 0 ? movables[movables.length - 1].id : null;

  // Comptem productes per categoria per ensenyar-ho a la fila (informatiu).
  const itemCats = (typeof window.CategoriesSystem.getItemCategories === 'function')
    ? window.CategoriesSystem.getItemCategories() : {};
  const counts = {};
  Object.values(itemCats).forEach(cid => { counts[cid] = (counts[cid] || 0) + 1; });

  container.innerHTML = cats.map(cat => {
    const isCatchAll = !!cat.isCatchAll;
    const isFirstMovable = cat.id === firstMovableId;
    const isLastMovable = cat.id === lastMovableId;
    const n = counts[cat.id] || 0;
    const countLabel = n === 0 ? 'Sense productes' : (n === 1 ? '1 producte' : n + ' productes');
    // Fletxes només per a categories movibles (no cat_other). Disabled
    // a la primera (no es pot pujar) i a l'última (no es pot baixar).
    const moveBtns = isCatchAll ? '' : (
      '<button type="button" class="cat-move-btn cat-move-up" data-cat-id="' + escapeHtml(cat.id) + '"' + (isFirstMovable ? ' disabled' : '') + ' aria-label="Pujar">▲</button>' +
      '<button type="button" class="cat-move-btn cat-move-down" data-cat-id="' + escapeHtml(cat.id) + '"' + (isLastMovable ? ' disabled' : '') + ' aria-label="Baixar">▼</button>'
    );
    return (
      '<div class="category-row" data-cat-id="' + escapeHtml(cat.id) + '">' +
        '<div class="category-row-main">' +
          '<span class="category-row-icon">' + escapeHtml(cat.icon || '📦') + '</span>' +
          '<div class="category-row-text">' +
            '<strong class="category-row-name">' + escapeHtml(cat.name || cat.id) + '</strong>' +
            '<small class="category-row-count">' + countLabel + (isCatchAll ? ' · Sistema' : '') + '</small>' +
          '</div>' +
        '</div>' +
        '<div class="category-row-actions">' +
          moveBtns +
          '<button type="button" class="cat-edit-btn" data-cat-id="' + escapeHtml(cat.id) + '" aria-label="Editar">✏️</button>' +
          (isCatchAll ? '' : '<button type="button" class="cat-delete-btn" data-cat-id="' + escapeHtml(cat.id) + '" aria-label="Eliminar">🗑️</button>') +
        '</div>' +
      '</div>'
    );
  }).join('');

  container.querySelectorAll('.cat-move-up').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (window.CategoriesSystem.moveCategoryUp(btn.dataset.catId)) {
        renderCategoriesList();
        // Si l'usuari té la pantalla de populars oberta, els tabs de
        // categoria poden haver canviat d'ordre — repintem.
        if (typeof renderCategoryTabs === 'function') renderCategoryTabs();
      }
    });
  });
  container.querySelectorAll('.cat-move-down').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (window.CategoriesSystem.moveCategoryDown(btn.dataset.catId)) {
        renderCategoriesList();
        if (typeof renderCategoryTabs === 'function') renderCategoryTabs();
      }
    });
  });
  container.querySelectorAll('.cat-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openCategoryEdit(btn.dataset.catId));
  });
  container.querySelectorAll('.cat-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCategoryFromList(btn.dataset.catId));
  });
}

function openCategoryEdit(catId) {
  editingCategoryId = catId || null;
  const isNew = !catId;
  const cat = isNew ? null : (typeof window.CategoriesSystem.getCategoryById === 'function'
    ? window.CategoriesSystem.getCategoryById(catId) : null);

  // Títol + camps
  const titleEl = document.getElementById('category-edit-title');
  if (titleEl) titleEl.textContent = isNew ? '➕ Nova categoria' : ('✏️ Editar "' + (cat ? cat.name : '') + '"');
  const nameInput = document.getElementById('input-category-name');
  if (nameInput) nameInput.value = (cat && cat.name) || '';
  selectedCategoryEmoji = (cat && cat.icon) || '📦';
  renderCategoryEmojiPicker();

  // Botó eliminar: només en edició i mai per a la "Altres" (catch-all).
  const delBtn = document.getElementById('btn-delete-category');
  if (delBtn) {
    const showDelete = !isNew && cat && !cat.isCatchAll;
    delBtn.style.display = showDelete ? 'block' : 'none';
  }

  showScreen('category-edit');
  // L'auto-focus al nom només quan creem (en editar és sorollós).
  if (isNew && nameInput) {
    setTimeout(() => { try { nameInput.focus(); } catch (e) {} }, 50);
  }
}

function renderCategoryEmojiPicker() {
  const picker = document.getElementById('category-emoji-picker');
  if (!picker) return;

  // Si l'emoji actual no està als 24 predefinits, l'afegim al final perquè
  // l'usuari pugui veure'l com a "actiu" en editar (en lloc d'un que no és).
  const list = CATEGORY_EMOJI_OPTIONS.slice();
  if (selectedCategoryEmoji && list.indexOf(selectedCategoryEmoji) === -1) {
    list.push(selectedCategoryEmoji);
  }

  picker.innerHTML = list.map(emoji => {
    const isSel = emoji === selectedCategoryEmoji;
    return '<button type="button" class="cat-emoji-option' + (isSel ? ' selected' : '') + '" data-emoji="' + escapeHtml(emoji) + '">' + escapeHtml(emoji) + '</button>';
  }).join('');

  picker.querySelectorAll('.cat-emoji-option').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategoryEmoji = btn.dataset.emoji;
      picker.querySelectorAll('.cat-emoji-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

function saveCategoryEdit() {
  const nameInput = document.getElementById('input-category-name');
  const name = nameInput ? String(nameInput.value || '').trim() : '';
  if (!name) {
    showToast('Cal posar un nom');
    if (nameInput) try { nameInput.focus(); } catch (e) {}
    return;
  }
  const icon = selectedCategoryEmoji || '📦';

  try {
    if (editingCategoryId) {
      window.CategoriesSystem.updateCategory(editingCategoryId, { name, icon });
      showToast('✅ "' + name + '" actualitzada');
    } else {
      window.CategoriesSystem.createCategory(name, icon);
      showToast('✅ Categoria "' + name + '" creada');
    }
  } catch (err) {
    console.warn('[Categories] save error', err);
    showToast('Error guardant la categoria');
    return;
  }

  // Re-renderitzem la llista i les pestanyes de la pantalla populars
  // (sempre que existeixin al DOM — són compartides entre l'obertura
  //  standalone i l'embedded).
  renderCategoriesList();
  if (typeof renderCategoryTabs === 'function') renderCategoryTabs();

  editingCategoryId = null;
  _returnFromCategoryEdit();
}

// Tornar a la pantalla d'origen després de Save/Delete des de
// #screen-category-edit. Si veníem de Configuració > Contingut >
// Categories, re-embedim el sub-pàgina (mateix patró que
// _returnFromPopularEdit). Si veníem del botó ⚙️ Gestionar de la
// pantalla de populars, anem a la llista standalone — i el seu back
// el deixem a 'popular' perquè així torni amb els tabs visibles.
function _returnFromCategoryEdit() {
  if (manageCategoriesOrigin === 'settings') {
    if (typeof renderSettingsContent === 'function') renderSettingsContent();
    showScreen('settings-content');
    return;
  }
  const backBtn = document.querySelector('#screen-manage-categories .back-btn');
  if (backBtn) backBtn.dataset.back = 'popular';
  showScreen('manage-categories');
}

function deleteCategoryFromEdit() {
  if (!editingCategoryId) return;
  const cat = window.CategoriesSystem.getCategoryById(editingCategoryId);
  if (!cat) return;
  if (cat.isCatchAll) {
    showToast('No es pot eliminar la categoria "Altres"');
    return;
  }
  _confirmDeleteCategory(cat, () => {
    editingCategoryId = null;
    _returnFromCategoryEdit();
  });
}

function deleteCategoryFromList(catId) {
  const cat = window.CategoriesSystem.getCategoryById(catId);
  if (!cat) return;
  if (cat.isCatchAll) {
    showToast('No es pot eliminar la categoria "Altres"');
    return;
  }
  _confirmDeleteCategory(cat, null);
}

// Confirma l'eliminació amb showConfirmDangerModal (UX coherent amb la
// resta de l'app). Si l'usuari accepta, elimina la categoria, repinta
// llistes i pestanyes, i opcionalment crida onAfter (útil quan venim
// del formulari d'edició per tornar a la llista).
function _confirmDeleteCategory(cat, onAfter) {
  const itemCats = (typeof window.CategoriesSystem.getItemCategories === 'function')
    ? window.CategoriesSystem.getItemCategories() : {};
  const affected = Object.values(itemCats).filter(cid => cid === cat.id).length;
  const tail = affected > 0
    ? ' ' + affected + ' producte' + (affected === 1 ? '' : 's') + ' passar' + (affected === 1 ? 'à' : 'an') + ' a "Altres".'
    : '';
  const msg = 'Eliminar la categoria "' + cat.name + '"?' + tail + ' Aquesta acció no es pot desfer.';
  showConfirmDangerModal(
    cat.icon || '🏷️',
    cat.name || 'Categoria',
    msg,
    () => {
      try {
        window.CategoriesSystem.deleteCategory(cat.id);
      } catch (err) {
        showToast(err && err.message ? err.message : 'Error eliminant la categoria');
        return;
      }
      showToast('Categoria "' + cat.name + '" eliminada');
      // Si la categoria eliminada era el filtre actiu de pestanyes, tornem a "Tots".
      if (typeof popularCategoryFilter !== 'undefined' && popularCategoryFilter === cat.id) {
        popularCategoryFilter = 'all';
      }
      renderCategoriesList();
      if (typeof renderCategoryTabs === 'function') renderCategoryTabs();
      if (typeof renderPopularList === 'function') {
        // Si l'usuari està a la pantalla de populars en aquest moment (cas
        // probable: ha vingut via ⚙️ Gestionar) els seus productes filtrats
        // poden haver canviat — repintem.
        const popScreen = document.getElementById('screen-popular');
        if (popScreen && popScreen.classList.contains('active')) renderPopularList();
      }
      if (typeof onAfter === 'function') onAfter();
    }
  );
}

// Listeners — s'enganxen al càrrec del DOM (idempotents via guard).
(function _attachCategoryEditListeners() {
  if (typeof document === 'undefined') return;
  if (window.__categoryEditListenersAttached) return;
  window.__categoryEditListenersAttached = true;
  document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('btn-save-category');
    const delBtn = document.getElementById('btn-delete-category');
    const createBtn = document.getElementById('btn-create-category');
    const manageBtn = document.getElementById('btn-manage-categories');
    if (saveBtn) saveBtn.addEventListener('click', saveCategoryEdit);
    if (delBtn) delBtn.addEventListener('click', deleteCategoryFromEdit);
    if (createBtn) createBtn.addEventListener('click', () => openCategoryEdit(null));
    if (manageBtn) manageBtn.addEventListener('click', () => openManageCategories('popular'));

    // Botó "Re-categoritzar tots els productes" (FASE 4). Crida directament
    // migrateExistingPopulars saltant el flag — la migració respecta les
    // assignacions manuals (només omple categories que no existeixin al
    // mapa popular_item_categories).
    const rerunBtn = document.getElementById('btn-rerun-migration');
    if (rerunBtn) rerunBtn.addEventListener('click', () => {
      if (!window.CategoriesSystem || typeof window.CategoriesSystem.migrateExistingPopulars !== 'function') {
        showToast('Sistema de categories no disponible');
        return;
      }
      const onConfirm = () => {
        const result = window.CategoriesSystem.migrateExistingPopulars();
        showToast('✅ ' + result.migrated + '/' + result.total + ' productes re-categoritzats');
        renderCategoriesList();
        if (typeof renderCategoryTabs === 'function') renderCategoryTabs();
        const popScreen = document.getElementById('screen-popular');
        if (popScreen && popScreen.classList.contains('active')) renderPopularList();
      };
      if (typeof showConfirmModal === 'function') {
        showConfirmModal(
          '🔄',
          'Re-categoritzar tots els productes?',
          'L\'app tornarà a aplicar la detecció automàtica als productes que NO tinguis categoritzats manualment. Les teves assignacions manuals es mantindran intactes.',
          { confirmLabel: 'Re-categoritzar', cancelLabel: 'Cancel·lar' },
          onConfirm
        );
      } else {
        onConfirm();
      }
    });
  });
})();

// Listener al toggle "No caduca" del form d'edició de populars:
// mostra/amaga inline el camp days segons l'estat del checkbox. Wire
// UNA sola vegada al DOMContentLoaded (idempotent via flag global).
// Patró simètric a l'usat a la vista "Editar últimes compres"
// (vegeu js/recent-purchases.js _rpBuildRow → toggle "No caduca").
(function _wirePopularNoExpiryToggle() {
  if (typeof document === 'undefined') return;
  if (window.__popularNoExpiryToggleWired) return;
  window.__popularNoExpiryToggleWired = true;
  document.addEventListener('DOMContentLoaded', () => {
    const noExpInput = document.getElementById('input-popular-no-expiry');
    const daysRow = document.getElementById('popular-days-row');
    if (!noExpInput || !daysRow) return;
    noExpInput.addEventListener('change', () => {
      daysRow.style.display = noExpInput.checked ? 'none' : '';
    });
  });
})();
