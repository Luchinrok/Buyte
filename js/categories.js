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

const DEFAULT_CATEGORIES = [
  { id: 'cat_dairy',      name: 'Làctics',                icon: '🥛', isDefault: true, order: 1 },
  { id: 'cat_meat',       name: 'Carns',                  icon: '🍖', isDefault: true, order: 2 },
  { id: 'cat_fish',       name: 'Peixos i marisc',        icon: '🐟', isDefault: true, order: 3 },
  { id: 'cat_vegetables', name: 'Verdures',               icon: '🥬', isDefault: true, order: 4 },
  { id: 'cat_fruits',     name: 'Fruites',                icon: '🍎', isDefault: true, order: 5 },
  { id: 'cat_bakery',     name: 'Forn i pa',              icon: '🥖', isDefault: true, order: 6 },
  { id: 'cat_canned',     name: 'Conserves',              icon: '🥫', isDefault: true, order: 7 },
  { id: 'cat_sweets',     name: 'Dolços i postres',       icon: '🍫', isDefault: true, order: 8 },
  { id: 'cat_drinks',     name: 'Begudes',                icon: '🥤', isDefault: true, order: 9 },
  { id: 'cat_frozen',     name: 'Congelats',              icon: '❄️', isDefault: true, order: 10 },
  { id: 'cat_spices',     name: 'Espècies i condiments',  icon: '🌶️', isDefault: true, order: 11 },
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
  '🌶️': 'cat_spices', '🧂': 'cat_spices', '🌿': 'cat_spices'
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
  'salsa': 'cat_spices'
};

function getCategories() {
  const stored = localStorage.getItem(POPULAR_CATEGORIES_KEY);
  if (!stored) {
    saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES.map(c => ({ ...c }));
  }
  try {
    return JSON.parse(stored);
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

window.CategoriesSystem = {
  DEFAULT_CATEGORIES,
  EMOJI_TO_CATEGORY,
  KEYWORDS_TO_CATEGORY,
  getCategories,
  saveCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getItemCategories,
  saveItemCategories,
  setItemCategory,
  getItemCategory,
  detectCategoryForItem,
  migrateExistingPopulars
};

})();
