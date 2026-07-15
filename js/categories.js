/* ============================================
   Buyte — js/categories.js
   Sistema de categories per a productes populars.
   FASE 1: només capa de dades (la UI vindrà a la FASE 2).

   Storage:
     eatmefirst_popular_categories      → array de categories
     eatmefirst_popular_item_categories → mapa { itemId: categoryId }

   Namespace global: window.CategoriesSystem

   Tot el fitxer va embolcallat en un IIFE per no contaminar el global
   scope: js/product-data.js ja té un `EMOJI_TO_CATEGORY` (mapatge a
   categories d'impacte/CO2), i com que els scripts es carreguen com a
   classics — no mòduls — un `const` al top-level col·lisionaria.
   ============================================ */

(function () {
'use strict';

const POPULAR_CATEGORIES_KEY = 'eatmefirst_popular_categories';
const POPULAR_ITEM_CATEGORIES_KEY = 'eatmefirst_popular_item_categories';
const MIGRATION_DONE_KEY = 'eatmefirst_categories_migration_done';

const DEFAULT_CATEGORIES = [
  { id: 'cat_dairy',      name: 'Làctics',                icon: '🥛', isDefault: true, order: 1 },
  { id: 'cat_meat',       name: 'Carns',                  icon: '🍖', isDefault: true, order: 2 },
  { id: 'cat_fish',       name: 'Peixos i marisc',        icon: '🐟', isDefault: true, order: 3 },
  { id: 'cat_vegetables', name: 'Verdures',               icon: '🥬', isDefault: true, order: 4 },
  { id: 'cat_fruits',     name: 'Fruites',                icon: '🍎', isDefault: true, order: 5 },
  { id: 'cat_bakery',     name: 'Forn i pa',              icon: '🥖', isDefault: true, order: 6 },
  // v2 (2026): cat_grains afegit entre cat_bakery i cat_canned. Per a
  // usuaris existents amb el catàleg ja al localStorage, getCategories()
  // detecta la seva absència i l'insereix idempotentment + reordena.
  { id: 'cat_grains',     name: 'Arròs i pasta',          icon: '🍚', isDefault: true, order: 7 },
  { id: 'cat_canned',     name: 'Conserves',              icon: '🥫', isDefault: true, order: 8 },
  { id: 'cat_sweets',     name: 'Dolços i postres',       icon: '🍫', isDefault: true, order: 9 },
  { id: 'cat_drinks',     name: 'Begudes',                icon: '🥤', isDefault: true, order: 10 },
  { id: 'cat_frozen',     name: 'Congelats',              icon: '❄️', isDefault: true, order: 11 },
  { id: 'cat_spices',     name: 'Espècies i condiments',  icon: '🌶️', isDefault: true, order: 12 },
  { id: 'cat_other',      name: 'Altres',                 icon: '📦', isDefault: true, order: 99, isCatchAll: true }
];

// Detecció per emoji. Nota: '🍅' (tomàquet) i '🌶️' (pebrot picant) tenen
// resolució explícita aquí — el primer que es defineix per a un emoji guanya.
const EMOJI_TO_CATEGORY = {
  // Làctics
  '🥛': 'cat_dairy', '🧀': 'cat_dairy', '🍦': 'cat_dairy',
  // Carns
  '🥩': 'cat_meat', '🍗': 'cat_meat', '🥓': 'cat_meat', '🍖': 'cat_meat',
  // Peixos i marisc
  '🐟': 'cat_fish', '🍣': 'cat_fish', '🦐': 'cat_fish', '🦞': 'cat_fish',
  '🐠': 'cat_fish', '🦑': 'cat_fish',
  // Verdures
  '🥬': 'cat_vegetables', '🥦': 'cat_vegetables', '🌽': 'cat_vegetables',
  '🥕': 'cat_vegetables', '🍅': 'cat_vegetables', '🥒': 'cat_vegetables',
  '🍆': 'cat_vegetables', '🥔': 'cat_vegetables', '🧄': 'cat_vegetables',
  '🧅': 'cat_vegetables', '🫑': 'cat_vegetables', '🥗': 'cat_vegetables',
  '🍄': 'cat_vegetables',
  // Fruites
  '🍎': 'cat_fruits', '🍌': 'cat_fruits', '🍊': 'cat_fruits',
  '🍇': 'cat_fruits', '🍓': 'cat_fruits', '🥝': 'cat_fruits',
  '🍑': 'cat_fruits', '🍐': 'cat_fruits', '🍒': 'cat_fruits',
  '🍍': 'cat_fruits', '🥭': 'cat_fruits', '🍈': 'cat_fruits',
  '🍉': 'cat_fruits', '🍋': 'cat_fruits',
  // Forn i pa
  '🥖': 'cat_bakery', '🍞': 'cat_bakery', '🥐': 'cat_bakery',
  '🥨': 'cat_bakery', '🥯': 'cat_bakery',
  // Conserves
  '🥫': 'cat_canned',
  // Dolços i postres
  '🍫': 'cat_sweets', '🍬': 'cat_sweets', '🍭': 'cat_sweets',
  '🍪': 'cat_sweets', '🎂': 'cat_sweets', '🍰': 'cat_sweets',
  '🧁': 'cat_sweets', '🍮': 'cat_sweets', '🍩': 'cat_sweets',
  '🍯': 'cat_sweets', '🍨': 'cat_sweets',
  // Begudes
  '🥤': 'cat_drinks', '☕': 'cat_drinks', '🍵': 'cat_drinks',
  '🍷': 'cat_drinks', '🍺': 'cat_drinks', '🧃': 'cat_drinks',
  '🍹': 'cat_drinks', '🥂': 'cat_drinks', '🍸': 'cat_drinks',
  '🥃': 'cat_drinks',
  // Congelats
  '❄️': 'cat_frozen', '🧊': 'cat_frozen',
  // Espècies i condiments
  '🌶️': 'cat_spices', '🧂': 'cat_spices', '🌿': 'cat_spices',
  // === Catàleg v2 (2026): nous emojis ===
  // Saltats (mateix valor que la versió anterior): 🍮, ☕, 🍷, 🍺, 🥗, 🧄, 🧃
  '🍚': 'cat_grains', '🍝': 'cat_grains',
  '🌱': 'cat_vegetables',
  '🫘': 'cat_canned',
  '🥣': 'cat_bakery',
  '🍔': 'cat_meat', '🌭': 'cat_meat'
};

// Detecció per paraules clau (en cas que l'emoji no sigui prou específic).
// Tot en minúscula; matching per `includes` sobre el nom en minúscula.
const KEYWORDS_TO_CATEGORY = {
  // Làctics
  'iogurt': 'cat_dairy', 'mantega': 'cat_dairy', 'crema': 'cat_dairy',
  'nata': 'cat_dairy', 'formatge': 'cat_dairy', 'fromatge': 'cat_dairy',
  'gelat': 'cat_dairy', 'requesón': 'cat_dairy', 'mato': 'cat_dairy',
  'kefir': 'cat_dairy',
  // Carns
  'pollastre': 'cat_meat', 'vedella': 'cat_meat', 'porc': 'cat_meat',
  'be': 'cat_meat', 'xai': 'cat_meat', 'salsitxa': 'cat_meat',
  'hamburguesa': 'cat_meat', 'bistec': 'cat_meat', 'embotit': 'cat_meat',
  'pernil': 'cat_meat', 'fuet': 'cat_meat', 'xoriço': 'cat_meat',
  'llonganissa': 'cat_meat', 'sobrasada': 'cat_meat',
  // Peixos
  'salmó': 'cat_fish', 'tonyina': 'cat_fish', 'bacallà': 'cat_fish',
  'lluç': 'cat_fish', 'sardina': 'cat_fish', 'gambes': 'cat_fish',
  'musclos': 'cat_fish', 'sípia': 'cat_fish', 'calamars': 'cat_fish',
  'pop': 'cat_fish', 'anxoves': 'cat_fish',
  // Verdures
  'enciam': 'cat_vegetables', 'espinacs': 'cat_vegetables',
  'pastanaga': 'cat_vegetables', 'coliflor': 'cat_vegetables',
  'porro': 'cat_vegetables', 'api': 'cat_vegetables',
  'carbassó': 'cat_vegetables', 'carbassa': 'cat_vegetables',
  'mongetes': 'cat_vegetables', 'pesols': 'cat_vegetables',
  'fava': 'cat_vegetables',
  // Forn
  'pa': 'cat_bakery', 'baguette': 'cat_bakery', 'coca': 'cat_bakery',
  'magdalena': 'cat_bakery',
  // Begudes
  'aigua': 'cat_drinks', 'suc': 'cat_drinks', 'cervesa': 'cat_drinks',
  'vi': 'cat_drinks', 'cola': 'cat_drinks', 'llet': 'cat_drinks',
  'café': 'cat_drinks', 'cafè': 'cat_drinks', 'te': 'cat_drinks',
  'refresc': 'cat_drinks',
  // Espècies / condiments
  'sal': 'cat_spices', 'pebre': 'cat_spices', 'oli': 'cat_spices',
  'vinagre': 'cat_spices', 'mostassa': 'cat_spices', 'maionesa': 'cat_spices',
  'salsa': 'cat_spices',
  // === Catàleg v2 (2026): nous keywords ===
  // SKIPS (exact match ja existeix): 'cafè', 'vi', 'cervesa', 'suc', 'embotit'
  // SKIPS PER CONFLICTE (no overwriteejem; la migració v2 assigna per nom
  // explícit als productes específics afectats):
  //   'crema' (existent cat_dairy; v2 vol cat_sweets per "Crema catalana")
  //   'mongetes' (existent cat_vegetables; v2 vol cat_canned per "Mongetes en pot")
  'pasta': 'cat_grains', 'arròs': 'cat_grains', 'espaguetis': 'cat_grains',
  'cereals': 'cat_bakery',
  'refrescos': 'cat_drinks',
  'botifarra': 'cat_meat', 'salsitxes': 'cat_meat', 'hamburgueses': 'cat_meat',
  'calçots': 'cat_vegetables', 'amanida': 'cat_vegetables', 'all': 'cat_vegetables',
  'olives': 'cat_canned', 'romesco': 'cat_canned',
  'pastís': 'cat_sweets', 'melmelada': 'cat_sweets'
};

function getCategories() {
  const stored = localStorage.getItem(POPULAR_CATEGORIES_KEY);
  if (!stored) {
    saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES.map(c => ({ ...c }));
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('not an array');
    // Migració idempotent per a usuaris existents: si manca cat_grains
    // (afegit a v2), l'inserim i reescrivim els `order` de les categories
    // per defecte segons la llista canònica. Les categories CUSTOM
    // (id 'cat_user_*') es deixen intactes — només actualitzem els
    // orders dels defaults. Flag separat de la migració de productes
    // (CATALOG_V2_FLAG_KEY); aquest path es disparé sol quan l'usuari
    // ja tenia el catàleg de categories al localStorage abans de v2.
    const hasGrains = parsed.some(c => c && c.id === 'cat_grains');
    if (!hasGrains) {
      const grainsDef = DEFAULT_CATEGORIES.find(c => c.id === 'cat_grains');
      if (grainsDef) parsed.push({ ...grainsDef });
      DEFAULT_CATEGORIES.forEach(defCat => {
        const existing = parsed.find(c => c && c.id === defCat.id);
        if (existing) existing.order = defCat.order;
      });
      saveCategories(parsed);
    }
    return parsed;
  } catch (e) {
    saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES.map(c => ({ ...c }));
  }
}

function saveCategories(categories) {
  localStorage.setItem(POPULAR_CATEGORIES_KEY, JSON.stringify(categories));
}

function getCategoryById(id) {
  const cats = getCategories();
  return cats.find(c => c.id === id) || cats.find(c => c.id === 'cat_other') || null;
}

// Reorder: intercanvi de l'`order` entre dues categories veïnes per
// permetre que l'usuari controli l'ordre amb fletxes ▲▼ a la UI de
// gestió. cat_other (isCatchAll) queda exclosa — sempre l'última.
//
// Implementació via swap d'`order`: més robust que reassignar tot
// l'array perquè preserva els ordres existents de les categories no
// involucrades i no toca cat_other (que té order:99 fixe).
function _swapOrderWithNeighbor(catId, direction) {
  const cats = getCategories();
  const sorted = cats.slice().sort((a, b) => {
    const oa = (typeof a.order === 'number') ? a.order : 999;
    const ob = (typeof b.order === 'number') ? b.order : 999;
    return oa - ob;
  });
  const idx = sorted.findIndex(c => c && c.id === catId);
  if (idx < 0) return false;
  const current = sorted[idx];
  if (current.isCatchAll) return false; // Altres no es mou
  const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (neighborIdx < 0 || neighborIdx >= sorted.length) return false;
  const neighbor = sorted[neighborIdx];
  if (neighbor.isCatchAll) return false; // No saltar per sobre/sota de Altres
  const tmp = current.order;
  current.order = neighbor.order;
  neighbor.order = tmp;
  // `sorted` conté referències als mateixos objectes de `cats`; les
  // mutacions ja s'han aplicat. Persistim l'array original.
  saveCategories(cats);
  return true;
}

function moveCategoryUp(catId) {
  return _swapOrderWithNeighbor(catId, 'up');
}

function moveCategoryDown(catId) {
  return _swapOrderWithNeighbor(catId, 'down');
}

function createCategory(name, icon) {
  const categories = getCategories();
  const newCat = {
    id: 'cat_user_' + Date.now(),
    name: String(name || '').trim(),
    icon: icon || '📦',
    isDefault: false,
    order: categories.length
  };
  categories.push(newCat);
  saveCategories(categories);
  return newCat;
}

function updateCategory(id, updates) {
  const categories = getCategories().map(c => (c.id === id ? { ...c, ...updates } : c));
  saveCategories(categories);
}

function deleteCategory(id) {
  const cat = getCategoryById(id);
  if (cat && cat.isCatchAll) {
    throw new Error('No es pot eliminar la categoria "Altres"');
  }

  // Reassignar els productes d'aquesta categoria a "Altres".
  const itemCategories = getItemCategories();
  Object.keys(itemCategories).forEach(itemId => {
    if (itemCategories[itemId] === id) itemCategories[itemId] = 'cat_other';
  });
  saveItemCategories(itemCategories);

  const categories = getCategories().filter(c => c.id !== id);
  saveCategories(categories);
}

function getItemCategories() {
  try {
    return JSON.parse(localStorage.getItem(POPULAR_ITEM_CATEGORIES_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveItemCategories(map) {
  localStorage.setItem(POPULAR_ITEM_CATEGORIES_KEY, JSON.stringify(map));
}

function setItemCategory(itemId, categoryId) {
  const map = getItemCategories();
  map[itemId] = categoryId;
  saveItemCategories(map);
}

function getItemCategory(itemId) {
  const map = getItemCategories();
  return map[itemId] || 'cat_other';
}

function detectCategoryForItem(item) {
  if (!item) return 'cat_other';

  if (item.emoji && EMOJI_TO_CATEGORY[item.emoji]) {
    return EMOJI_TO_CATEGORY[item.emoji];
  }

  if (item.name) {
    // Match per paraules senceres, no per subcadenes: "Detergent" no ha
    // de coincidir amb "te", "Vinagre" no ha de coincidir amb "vi", etc.
    const words = String(item.name).toLowerCase().split(/[\s,.\-_]+/);
    for (const keyword in KEYWORDS_TO_CATEGORY) {
      if (words.indexOf(keyword) !== -1) return KEYWORDS_TO_CATEGORY[keyword];
    }
  }

  return 'cat_other';
}

// Migració: categoritzar tots els productes populars existents que encara
// no tinguin categoria assignada. La FASE 1 NO crida aquesta funció
// automàticament — es reservarà per a la FASE 4 amb banner de revisió.
// La clau real dels populars personalitzats és 'eatmefirst_popular_custom'
// (vegeu js/populars.js).
function migrateExistingPopulars() {
  let populars = [];
  if (typeof getPopularProducts === 'function') {
    try { populars = getPopularProducts() || []; } catch (e) { populars = []; }
  } else {
    const raw = localStorage.getItem('eatmefirst_popular_custom');
    if (raw) {
      try { populars = JSON.parse(raw) || []; } catch (e) { populars = []; }
    }
  }

  const itemCategories = getItemCategories();
  let migrated = 0;
  populars.forEach(item => {
    if (!item || !item.id) return;
    if (!itemCategories[item.id]) {
      itemCategories[item.id] = detectCategoryForItem(item);
      migrated++;
    }
  });
  saveItemCategories(itemCategories);
  return { migrated, total: populars.length };
}

function isMigrationDone() {
  return localStorage.getItem(MIGRATION_DONE_KEY) === '1';
}

function markMigrationDone() {
  localStorage.setItem(MIGRATION_DONE_KEY, '1');
}

// Crida segura per al boot: si la migració ja s'ha fet aquesta versió,
// no fa res. La FASE 4 la crida des d'app.js després que els populars
// ja existeixen al localStorage. El botó "Re-categoritzar" de
// Configuració crida directament `migrateExistingPopulars()` (saltant
// el flag) per permetre re-execució manual.
function runMigrationIfNeeded() {
  if (isMigrationDone()) {
    console.log('[Categories] Migració ja feta, saltant');
    return { skipped: true };
  }
  const result = migrateExistingPopulars();
  markMigrationDone();
  console.log('[Categories] Migració completada: ' + result.migrated + '/' + result.total + ' productes categoritzats');
  return result;
}

// === Catàleg v2 (2026): migració one-shot ===
// Assigna categoria als 34 productes nous afegits a POPULAR_PRODUCTS i
// força el moviment de Pasta/Arròs de cat_other → cat_grains. Resolt
// el match per NOM canònic (no per id), perquè els ids dels productes
// nous depenen de la posició a l'array i no són estables si es
// reordena el catàleg. Flag dedicat: CATALOG_V2_FLAG_KEY.
const CATALOG_V2_FLAG_KEY = 'eatmefirst_catalog_v2_migration_done';

const CATALOG_V2_TARGETS = {
  'pasta': 'cat_grains',
  'arròs': 'cat_grains',
  'embotit': 'cat_meat',
  'fruita': 'cat_fruits',
  'suc': 'cat_drinks',
  'tovalloletes': 'cat_other',
  'pastís': 'cat_sweets',
  'espelmes': 'cat_other',
  'globus': 'cat_other',
  'aperitius': 'cat_other',
  'refrescos': 'cat_drinks',
  'olives': 'cat_canned',
  'plats i gots': 'cat_other',
  'regal': 'cat_other',
  'patates xips': 'cat_other',
  'calçots': 'cat_vegetables',
  'salsa romesco': 'cat_canned',
  'carn brasa': 'cat_meat',
  'botifarra': 'cat_meat',
  'vi': 'cat_drinks',
  'mongetes': 'cat_canned',
  'crema catalana': 'cat_sweets',
  'cafè': 'cat_drinks',
  'melmelada': 'cat_sweets',
  'cereals': 'cat_other',
  'carn vermella': 'cat_meat',
  'salsitxes': 'cat_meat',
  'hamburgueses': 'cat_meat',
  'carbó': 'cat_other',
  'cervesa': 'cat_drinks',
  'amanida': 'cat_vegetables',
  'espaguetis': 'cat_grains',
  'tomàquet fregit': 'cat_canned',
  'all': 'cat_vegetables',
  'vi negre': 'cat_drinks',
  'formatge ratllat': 'cat_dairy'
};

// Productes que poden haver estat assignats a cat_other per la
// migració v1 (perquè no tenien match a EMOJI_TO_CATEGORY ni a
// KEYWORDS_TO_CATEGORY abans de v2). v2 els força a la seva categoria
// correcta encara que ja tinguin un valor.
const CATALOG_V2_FORCE_MOVES = new Set(['pasta', 'arròs']);

function runCatalogV2Migration() {
  if (localStorage.getItem(CATALOG_V2_FLAG_KEY) === '1') {
    return { skipped: true };
  }
  let populars = [];
  if (typeof getPopularProducts === 'function') {
    try { populars = getPopularProducts() || []; } catch (e) { populars = []; }
  }
  const PRODUCTS = (typeof POPULAR_PRODUCTS !== 'undefined') ? POPULAR_PRODUCTS : [];
  const LANGS = ['ca','es','en','fr','it','de','pt','nl','ja','zh','ko'];
  const itemCategories = getItemCategories();
  let assigned = 0, moved = 0;
  populars.forEach(item => {
    if (!item || !item.id || typeof item.name !== 'string') return;
    const lower = item.name.toLowerCase().trim();
    // Match directe pel nom de l'usuari (en l'idioma actiu)
    let canonicalKey = CATALOG_V2_TARGETS[lower] ? lower : null;
    // Si no troba directe: busca al catàleg el producte que té aquest
    // nom en algun idioma i pren el seu `ca` per consultar el mapa.
    if (!canonicalKey) {
      for (const p of PRODUCTS) {
        const hit = LANGS.some(lg => p[lg] && p[lg].toLowerCase() === lower);
        if (hit && p.ca && CATALOG_V2_TARGETS[p.ca.toLowerCase()]) {
          canonicalKey = p.ca.toLowerCase();
          break;
        }
      }
    }
    if (!canonicalKey) return;
    const targetCat = CATALOG_V2_TARGETS[canonicalKey];
    const current = itemCategories[item.id];
    if (current === targetCat) return;
    // Force-override per Pasta/Arròs si venien de cat_other
    if (CATALOG_V2_FORCE_MOVES.has(canonicalKey) && current === 'cat_other') {
      itemCategories[item.id] = targetCat;
      moved++;
      return;
    }
    // Resta: només assigna si no hi havia res (respecta tria manual)
    if (!current) {
      itemCategories[item.id] = targetCat;
      assigned++;
    }
  });
  saveItemCategories(itemCategories);
  localStorage.setItem(CATALOG_V2_FLAG_KEY, '1');
  console.log('[Categories v2] Assignats: ' + assigned + ', moguts: ' + moved);
  return { skipped: false, assigned, moved };
}

// === Migració v3 (neteja del cache d'usuari) ===
// Detectat als usuaris existents: entrades a 'eatmefirst_popular_custom'
// amb dades inconsistents (productes que no caduquen amb days:7 absurd
// per defecte del formulari, o sense weight quan en el catàleg sí n'hi
// ha). Aquesta migració:
//   - Treu camps `days` als 4 productes no-aliment que els tenen per
//     accident (Tovalloletes, Espelmes, Globus, Plats i gots).
//   - Afegeix `noExpiry:true` als 6 productes no-aliment (els 4
//     anteriors + Regal + Carbó) si no el tenen.
//   - Afegeix `weight` per defecte als 5 productes que en pràctica es
//     compren per unitat/pack (Ous, Crema catalana, Hamburgueses,
//     Cervesa, All).
// IMPORTANT: respecta personalitzacions de l'usuari → només AFEGEIX
// camps quan no existeixen, però SÍ elimina `days` quan és incoherent
// amb noExpiry:true (no és una personalització; és contaminació).
// Flag dedicat perquè s'executi una sola vegada per usuari.
const CATALOG_V3_FLAG_KEY = 'eatmefirst_catalog_v3_migration_done';

const CATALOG_V3_FIXES = {
  'tovalloletes':   { remove: ['days'], add: { noExpiry: true } },
  'espelmes':       { remove: ['days'], add: { noExpiry: true } },
  'globus':         { remove: ['days'], add: { noExpiry: true } },
  'plats i gots':   { remove: ['days'], add: { noExpiry: true } },
  'regal':          { remove: [],       add: { noExpiry: true } },
  'carbó':          { remove: [],       add: { noExpiry: true } },
  'ous':            { remove: [],       add: { weight: '12u' } },
  'crema catalana': { remove: [],       add: { weight: '4u' } },
  'hamburgueses':   { remove: [],       add: { weight: '4u' } },
  'cervesa':        { remove: [],       add: { weight: '6x33cl' } },
  'all':            { remove: [],       add: { weight: '3u' } }
};

function runCatalogV3Migration() {
  if (localStorage.getItem(CATALOG_V3_FLAG_KEY) === '1') {
    return { skipped: true };
  }
  const customRaw = localStorage.getItem('eatmefirst_popular_custom');
  if (!customRaw) {
    localStorage.setItem(CATALOG_V3_FLAG_KEY, '1');
    return { skipped: false, updated: 0 };
  }
  let custom;
  try { custom = JSON.parse(customRaw); } catch (e) {
    localStorage.setItem(CATALOG_V3_FLAG_KEY, '1');
    return { skipped: false, error: 'parse' };
  }
  if (!Array.isArray(custom)) {
    localStorage.setItem(CATALOG_V3_FLAG_KEY, '1');
    return { skipped: false, error: 'not array' };
  }
  let updated = 0;
  custom.forEach(item => {
    if (!item || typeof item.name !== 'string') return;
    const key = item.name.toLowerCase().trim();
    const fix = CATALOG_V3_FIXES[key];
    if (!fix) return;
    let touched = false;
    fix.remove.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        delete item[field];
        touched = true;
      }
    });
    Object.keys(fix.add).forEach(field => {
      if (!Object.prototype.hasOwnProperty.call(item, field) || item[field] === undefined) {
        item[field] = fix.add[field];
        touched = true;
      }
    });
    if (touched) updated++;
  });
  localStorage.setItem('eatmefirst_popular_custom', JSON.stringify(custom));
  localStorage.setItem(CATALOG_V3_FLAG_KEY, '1');
  console.log('[Catalog v3] Updated ' + updated + ' items');
  return { skipped: false, updated };
}

// Etiqueta a MOSTRAR d'una categoria (DISPLAY-ONLY). Accepta l'objecte
// categoria O el seu id/codi (`cat_dairy`…). Categories de SISTEMA (id
// conegut de DEFAULT_CATEGORIES) → traducció via t(id) (la clau i18n ÉS
// l'id). Categories CUSTOM de l'usuari (cat_user_*) → el `name` tal qual,
// sense traduir. Fallback segur al nom o l'id. NO toca dades, claus ni
// comparacions: només serveix per pintar.
const _SYSTEM_CATEGORY_IDS = new Set(DEFAULT_CATEGORIES.map(c => c.id));
function categoryLabel(catOrId) {
  if (!catOrId) return '';
  const isStr = (typeof catOrId === 'string');
  const id = isStr ? catOrId : (catOrId && catOrId.id);
  if (id && _SYSTEM_CATEGORY_IDS.has(id) && typeof t === 'function') {
    const label = t(id);
    if (label && label !== id) return label;   // traducció de sistema
  }
  if (!isStr && catOrId.name) return catOrId.name;   // custom (objecte)
  if (isStr) {
    const cat = getCategoryById(id);
    return (cat && cat.name) || id;                  // custom (per id)
  }
  return id || '';
}

window.categoryLabel = categoryLabel;

window.CategoriesSystem = {
  DEFAULT_CATEGORIES,
  EMOJI_TO_CATEGORY,
  KEYWORDS_TO_CATEGORY,
  categoryLabel,
  getCategories,
  saveCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategoryUp,
  moveCategoryDown,
  getItemCategories,
  saveItemCategories,
  setItemCategory,
  getItemCategory,
  detectCategoryForItem,
  migrateExistingPopulars,
  runMigrationIfNeeded,
  runCatalogV2Migration,
  runCatalogV3Migration,
  isMigrationDone
};

})();
