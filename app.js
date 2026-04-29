/* ============================================
   EATMEFIRST v3 - Lògica de l'app
   ============================================ */

// Base de dades de productes populars del supermercat
// Format: nom en cada idioma, emoji, dies de caducitat per defecte
const POPULAR_PRODUCTS = [
  // Làctics
  { ca: 'Llet', es: 'Leche', en: 'Milk', fr: 'Lait', it: 'Latte', de: 'Milch', pt: 'Leite', nl: 'Melk', ja: '牛乳', zh: '牛奶', ko: '우유', emoji: '🥛', days: 7 },
  { ca: 'Iogurt natural', es: 'Yogur natural', en: 'Plain yogurt', fr: 'Yaourt nature', it: 'Yogurt naturale', de: 'Naturjoghurt', pt: 'Iogurte natural', nl: 'Yoghurt', ja: 'ヨーグルト', zh: '酸奶', ko: '요구르트', emoji: '🥛', days: 14 },
  { ca: 'Formatge', es: 'Queso', en: 'Cheese', fr: 'Fromage', it: 'Formaggio', de: 'Käse', pt: 'Queijo', nl: 'Kaas', ja: 'チーズ', zh: '奶酪', ko: '치즈', emoji: '🧀', days: 21 },
  { ca: 'Mantega', es: 'Mantequilla', en: 'Butter', fr: 'Beurre', it: 'Burro', de: 'Butter', pt: 'Manteiga', nl: 'Boter', ja: 'バター', zh: '黄油', ko: '버터', emoji: '🧈', days: 30 },
  // Fresc
  { ca: 'Ous', es: 'Huevos', en: 'Eggs', fr: 'Œufs', it: 'Uova', de: 'Eier', pt: 'Ovos', nl: 'Eieren', ja: '卵', zh: '鸡蛋', ko: '계란', emoji: '🥚', days: 21 },
  { ca: 'Pollastre', es: 'Pollo', en: 'Chicken', fr: 'Poulet', it: 'Pollo', de: 'Hähnchen', pt: 'Frango', nl: 'Kip', ja: '鶏肉', zh: '鸡肉', ko: '닭고기', emoji: '🍗', days: 2 },
  { ca: 'Carn picada', es: 'Carne picada', en: 'Ground beef', fr: 'Viande hachée', it: 'Carne macinata', de: 'Hackfleisch', pt: 'Carne moída', nl: 'Gehakt', ja: 'ひき肉', zh: '绞肉', ko: '다진 고기', emoji: '🥩', days: 2 },
  { ca: 'Peix fresc', es: 'Pescado fresco', en: 'Fresh fish', fr: 'Poisson frais', it: 'Pesce fresco', de: 'Frischer Fisch', pt: 'Peixe fresco', nl: 'Verse vis', ja: '魚', zh: '鱼', ko: '생선', emoji: '🐟', days: 2 },
  // Fruites
  { ca: 'Plàtans', es: 'Plátanos', en: 'Bananas', fr: 'Bananes', it: 'Banane', de: 'Bananen', pt: 'Bananas', nl: 'Bananen', ja: 'バナナ', zh: '香蕉', ko: '바나나', emoji: '🍌', days: 5 },
  { ca: 'Pomes', es: 'Manzanas', en: 'Apples', fr: 'Pommes', it: 'Mele', de: 'Äpfel', pt: 'Maçãs', nl: 'Appels', ja: 'りんご', zh: '苹果', ko: '사과', emoji: '🍎', days: 14 },
  { ca: 'Maduixes', es: 'Fresas', en: 'Strawberries', fr: 'Fraises', it: 'Fragole', de: 'Erdbeeren', pt: 'Morangos', nl: 'Aardbeien', ja: 'いちご', zh: '草莓', ko: '딸기', emoji: '🍓', days: 3 },
  { ca: 'Taronges', es: 'Naranjas', en: 'Oranges', fr: 'Oranges', it: 'Arance', de: 'Orangen', pt: 'Laranjas', nl: 'Sinaasappels', ja: 'オレンジ', zh: '橙子', ko: '오렌지', emoji: '🍊', days: 14 },
  // Verdures
  { ca: 'Tomàquets', es: 'Tomates', en: 'Tomatoes', fr: 'Tomates', it: 'Pomodori', de: 'Tomaten', pt: 'Tomates', nl: 'Tomaten', ja: 'トマト', zh: '番茄', ko: '토마토', emoji: '🍅', days: 7 },
  { ca: 'Enciam', es: 'Lechuga', en: 'Lettuce', fr: 'Laitue', it: 'Lattuga', de: 'Salat', pt: 'Alface', nl: 'Sla', ja: 'レタス', zh: '生菜', ko: '상추', emoji: '🥬', days: 5 },
  { ca: 'Pastanagues', es: 'Zanahorias', en: 'Carrots', fr: 'Carottes', it: 'Carote', de: 'Karotten', pt: 'Cenouras', nl: 'Wortels', ja: 'にんじん', zh: '胡萝卜', ko: '당근', emoji: '🥕', days: 21 },
  { ca: 'Patates', es: 'Patatas', en: 'Potatoes', fr: 'Pommes de terre', it: 'Patate', de: 'Kartoffeln', pt: 'Batatas', nl: 'Aardappels', ja: 'じゃがいも', zh: '土豆', ko: '감자', emoji: '🥔', days: 30 },
  { ca: 'Cebes', es: 'Cebollas', en: 'Onions', fr: 'Oignons', it: 'Cipolle', de: 'Zwiebeln', pt: 'Cebolas', nl: 'Uien', ja: '玉ねぎ', zh: '洋葱', ko: '양파', emoji: '🧅', days: 30 },
  // Forn
  { ca: 'Pa', es: 'Pan', en: 'Bread', fr: 'Pain', it: 'Pane', de: 'Brot', pt: 'Pão', nl: 'Brood', ja: 'パン', zh: '面包', ko: '빵', emoji: '🍞', days: 3 },
  // Rebost
  { ca: 'Pasta', es: 'Pasta', en: 'Pasta', fr: 'Pâtes', it: 'Pasta', de: 'Nudeln', pt: 'Massa', nl: 'Pasta', ja: 'パスタ', zh: '意面', ko: '파스타', emoji: '🍝', days: 180 },
  { ca: 'Arròs', es: 'Arroz', en: 'Rice', fr: 'Riz', it: 'Riso', de: 'Reis', pt: 'Arroz', nl: 'Rijst', ja: '米', zh: '大米', ko: '쌀', emoji: '🍚', days: 180 },
  { ca: 'Oli d\'oliva', es: 'Aceite de oliva', en: 'Olive oil', fr: 'Huile d\'olive', it: 'Olio d\'oliva', de: 'Olivenöl', pt: 'Azeite', nl: 'Olijfolie', ja: 'オリーブオイル', zh: '橄榄油', ko: '올리브유', emoji: '🫒', days: 365 },
  { ca: 'Conserva (tonyina)', es: 'Conserva (atún)', en: 'Canned tuna', fr: 'Thon en conserve', it: 'Tonno in scatola', de: 'Thunfisch in Dose', pt: 'Atum em lata', nl: 'Tonijn in blik', ja: 'ツナ缶', zh: '金枪鱼罐头', ko: '참치캔', emoji: '🥫', days: 365 },
  // Dolços
  { ca: 'Xocolata', es: 'Chocolate', en: 'Chocolate', fr: 'Chocolat', it: 'Cioccolato', de: 'Schokolade', pt: 'Chocolate', nl: 'Chocolade', ja: 'チョコレート', zh: '巧克力', ko: '초콜릿', emoji: '🍫', days: 180 },
  { ca: 'Galetes', es: 'Galletas', en: 'Cookies', fr: 'Biscuits', it: 'Biscotti', de: 'Kekse', pt: 'Bolachas', nl: 'Koekjes', ja: 'クッキー', zh: '饼干', ko: '쿠키', emoji: '🍪', days: 90 },
  // Begudes
  { ca: 'Aigua', es: 'Agua', en: 'Water', fr: 'Eau', it: 'Acqua', de: 'Wasser', pt: 'Água', nl: 'Water', ja: '水', zh: '水', ko: '물', emoji: '💧', days: 365 },
  { ca: 'Suc de taronja', es: 'Zumo de naranja', en: 'Orange juice', fr: 'Jus d\'orange', it: 'Succo d\'arancia', de: 'Orangensaft', pt: 'Suco de laranja', nl: 'Sinaasappelsap', ja: 'オレンジジュース', zh: '橙汁', ko: '오렌지 주스', emoji: '🧃', days: 30 }
];

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
  selectedPopularEmoji = isNew ? '🥛' : item.emoji;
  document.getElementById('popular-emoji-current').textContent = selectedPopularEmoji;

  const delBtn = document.getElementById('btn-delete-popular');
  if (delBtn) delBtn.style.display = isNew ? 'none' : 'block';

  showScreen('popular-edit');
}

function savePopularEdit() {
  const name = document.getElementById('input-popular-name').value.trim();
  const days = parseInt(document.getElementById('input-popular-days').value, 10) || 7;
  if (!name) { showToast(t('needName')); return; }

  const list = getPopularProducts();
  if (editingPopularIdx === null) {
    list.push({
      id: 'pop-custom-' + Date.now(),
      name, emoji: selectedPopularEmoji, days
    });
  } else {
    list[editingPopularIdx].name = name;
    list[editingPopularIdx].emoji = selectedPopularEmoji;
    list[editingPopularIdx].days = days;
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

const EMOJIS = [
  '🥛','🧀','🥚','🍖','🥩','🍗','🥓','🐟',
  '🦐','🥫','🍝','🍞','🥖','🥐','🥨','🧈',
  '🥗','🥬','🥒','🍅','🥕','🌽','🥔','🧅',
  '🍎','🍌','🍓','🫐','🍇','🍊','🍋','🍉',
  '🍕','🍔','🌭','🌮','🥪','🍣','🍱','🍜',
  '🍰','🧁','🍪','🍫','🍬','🍦','🍯','☕'
];

// Suggereix emoji segons categoria del producte
// Buscar primer les paraules més específiques (chocolate-spread abans que spread)
const CATEGORY_TO_EMOJI = {
  // Cremes per untar (Nutella, etc.) — abans que res!
  'hazelnut-spread': '🍫', 'chocolate-spread': '🍫',
  'sweet-spread': '🍫', 'spread': '🍫',
  'cocoa': '🍫',
  // Làctics
  'milk': '🥛', 'dairy': '🥛', 'yogurt': '🥛', 'yoghurt': '🥛',
  'cheese': '🧀',
  'egg': '🥚',
  // Carn
  'meat': '🥩', 'beef': '🥩', 'pork': '🥩',
  'chicken': '🍗', 'poultry': '🍗',
  'bacon': '🥓',
  'sausage': '🌭',
  // Peix
  'fish': '🐟', 'seafood': '🐟', 'tuna': '🥫', 'sardine': '🥫',
  'shrimp': '🦐',
  // Conserves i envasats
  'canned': '🥫', 'conserve': '🥫', 'preserved': '🥫',
  // Pasta i arròs
  'pasta': '🍝', 'noodle': '🍜',
  'rice': '🍚', 'cereal': '🥣', 'flour': '🌾', 'sugar': '🍬',
  // Forn
  'bread': '🍞', 'baguette': '🥖',
  'croissant': '🥐',
  'butter': '🧈',
  'biscuit': '🍪', 'cookie': '🍪',
  'cake': '🍰',
  // Verdures
  'salad': '🥗', 'lettuce': '🥬',
  'cucumber': '🥒',
  'tomato': '🍅',
  'carrot': '🥕',
  'corn': '🌽',
  'potato': '🥔',
  'onion': '🧅',
  // Fruites
  'apple': '🍎',
  'banana': '🍌',
  'strawberr': '🍓',
  'grape': '🍇',
  'orange': '🍊',
  'lemon': '🍋',
  'pineapple': '🍍',
  'watermelon': '🍉',
  // Plats preparats
  'pizza': '🍕',
  'burger': '🍔',
  'sushi': '🍣',
  // Dolços
  'chocolate': '🍫',
  'candy': '🍬', 'sweet': '🍬',
  'ice-cream': '🍦', 'ice cream': '🍦',
  'honey': '🍯',
  'jam': '🍯', 'marmalade': '🍯',
  // Begudes
  'coffee': '☕', 'tea': '☕',
  'juice': '🧃', 'soda': '🥤',
  'beer': '🍺', 'wine': '🍷', 'water': '💧',
  // Olis i salses
  'olive-oil': '🫒', 'oil': '🫒', 'vinegar': '🫗',
  'sauce': '🥫', 'ketchup': '🍅', 'mayonnaise': '🥚', 'mustard': '🟡'
};

// Dies de caducitat per defecte (suposem producte TANCAT)
// Es busquen TOTS els matches i s'agafa el màxim
const CATEGORY_DEFAULT_DAYS = {
  // Cremes per untar tancades duren mesos
  'hazelnut-spread': 90, 'chocolate-spread': 90,
  'sweet-spread': 90, 'spread': 90,
  'cocoa': 180,
  // Làctics
  'milk': 7, 'dairy': 7,
  'yogurt': 21, 'yoghurt': 21,
  'cheese': 30,
  'butter': 60,
  'egg': 28,
  // Carn fresca
  'fresh-meat': 3, 'meat': 3, 'beef': 3, 'pork': 3,
  'chicken': 2, 'poultry': 2,
  'bacon': 14, 'sausage': 7,
  // Peix
  'fresh-fish': 2, 'fish': 2, 'seafood': 2,
  // Conserves: mesos a anys
  'canned': 730, 'canned-foods': 730,
  'conserve': 730, 'preserved': 365,
  'tuna': 730, 'sardine': 730,
  // Sec - duren molt
  'pasta': 365, 'noodle': 365,
  'rice': 365, 'cereal': 180, 'flour': 180, 'sugar': 730,
  // Forn (fresc dura poc)
  'bread': 4, 'baguette': 2, 'croissant': 4,
  'biscuit': 180, 'cookie': 180,
  'cake': 5,
  // Verdures fresques
  'salad': 5, 'lettuce': 7,
  'cucumber': 10, 'tomato': 7,
  'carrot': 21, 'corn': 5,
  'potato': 30, 'onion': 30,
  // Fruites
  'fruit': 7,
  'apple': 21, 'banana': 5, 'strawberr': 3,
  'grape': 7, 'orange': 14, 'lemon': 21,
  'pineapple': 5, 'watermelon': 7,
  // Plats preparats (fresc)
  'pizza': 3, 'burger': 2, 'sushi': 1,
  // Dolços (tancats duren molt)
  'chocolate': 365, 'candy': 365, 'sweet': 365,
  'ice-cream': 180, 'ice cream': 180,
  'honey': 730, 'jam': 365, 'marmalade': 365,
  // Begudes tancades
  'coffee': 365, 'tea': 730,
  'juice': 60, 'soda': 270,
  'beer': 180, 'wine': 1825, 'water': 730,
  // Olis i salses
  'olive-oil': 730, 'oil': 730, 'vinegar': 1825,
  'sauce': 180, 'ketchup': 180, 'mayonnaise': 90, 'mustard': 365
};

// ESTAT
let products = [];
let stats = { consumed: 0, trashed: 0 };
let currentLevel = null;
let currentProduct = null;
let selectedEmoji = '🥛';
let selectedLocation = 'fridge';
let locations = []; // Carregades de localStorage o per defecte

// LLISTA DE LA COMPRA
let supermarkets = []; // Array de {id, name, emoji}
let shoppingItems = []; // Array de {id, supermarketId, name, emoji, qty, notes, addedAt}
let currentSupermarketId = null;
let editingSupermarket = null; // null = nou, objecte = editant
let editingShoppingItem = null;
let selectedSupermarketEmoji = '🛒';
let selectedShoppingEmoji = '🥛';

// SUPERMERCATS PER PAÍS
// Cada supermercat té id únic, nom i emoji
// Els 4 primers de cada país són els que es marquen automàticament el primer cop
const SUPERMARKETS_BY_COUNTRY = {
  ES: [
    { id: 'sm-mercadona', name: 'Mercadona', emoji: '🛒' },
    { id: 'sm-carrefour', name: 'Carrefour', emoji: '🛒' },
    { id: 'sm-lidl', name: 'Lidl', emoji: '🛍️' },
    { id: 'sm-dia', name: 'Dia', emoji: '🛒' },
    { id: 'sm-caprabo', name: 'Caprabo', emoji: '🛍️' },
    { id: 'sm-esclat', name: 'Esclat', emoji: '🛍️' },
    { id: 'sm-bonpreu', name: 'Bonpreu', emoji: '🛒' },
    { id: 'sm-aldi', name: 'Aldi', emoji: '🛒' },
    { id: 'sm-eroski', name: 'Eroski', emoji: '🏪' },
    { id: 'sm-consum', name: 'Consum', emoji: '🛍️' },
    { id: 'sm-alcampo', name: 'Alcampo', emoji: '🏬' }
  ],
  FR: [
    { id: 'sm-fr-carrefour', name: 'Carrefour', emoji: '🛒' },
    { id: 'sm-fr-leclerc', name: 'E.Leclerc', emoji: '🛒' },
    { id: 'sm-fr-auchan', name: 'Auchan', emoji: '🏬' },
    { id: 'sm-fr-intermarche', name: 'Intermarché', emoji: '🛍️' },
    { id: 'sm-fr-casino', name: 'Casino', emoji: '🛍️' },
    { id: 'sm-fr-monoprix', name: 'Monoprix', emoji: '🛒' },
    { id: 'sm-fr-lidl', name: 'Lidl', emoji: '🛍️' },
    { id: 'sm-fr-aldi', name: 'Aldi', emoji: '🛒' },
    { id: 'sm-fr-super-u', name: 'Super U', emoji: '🛒' },
    { id: 'sm-fr-franprix', name: 'Franprix', emoji: '🏪' }
  ],
  IT: [
    { id: 'sm-it-esselunga', name: 'Esselunga', emoji: '🛒' },
    { id: 'sm-it-coop', name: 'Coop', emoji: '🛒' },
    { id: 'sm-it-conad', name: 'Conad', emoji: '🛍️' },
    { id: 'sm-it-carrefour', name: 'Carrefour', emoji: '🛒' },
    { id: 'sm-it-lidl', name: 'Lidl', emoji: '🛍️' },
    { id: 'sm-it-eurospin', name: 'Eurospin', emoji: '🛒' },
    { id: 'sm-it-pam', name: 'Pam', emoji: '🏪' },
    { id: 'sm-it-md', name: 'MD', emoji: '🛍️' },
    { id: 'sm-it-iper', name: 'Iper', emoji: '🏬' }
  ],
  DE: [
    { id: 'sm-de-edeka', name: 'Edeka', emoji: '🛒' },
    { id: 'sm-de-rewe', name: 'Rewe', emoji: '🛒' },
    { id: 'sm-de-aldi', name: 'Aldi', emoji: '🛒' },
    { id: 'sm-de-lidl', name: 'Lidl', emoji: '🛍️' },
    { id: 'sm-de-kaufland', name: 'Kaufland', emoji: '🏬' },
    { id: 'sm-de-penny', name: 'Penny', emoji: '🛍️' },
    { id: 'sm-de-netto', name: 'Netto', emoji: '🛒' },
    { id: 'sm-de-real', name: 'Real', emoji: '🏬' },
    { id: 'sm-de-norma', name: 'Norma', emoji: '🛍️' }
  ],
  PT: [
    { id: 'sm-pt-continente', name: 'Continente', emoji: '🛒' },
    { id: 'sm-pt-pingo-doce', name: 'Pingo Doce', emoji: '🛒' },
    { id: 'sm-pt-lidl', name: 'Lidl', emoji: '🛍️' },
    { id: 'sm-pt-auchan', name: 'Auchan', emoji: '🏬' },
    { id: 'sm-pt-intermarche', name: 'Intermarché', emoji: '🛍️' },
    { id: 'sm-pt-mini-preco', name: 'Minipreço', emoji: '🛒' },
    { id: 'sm-pt-aldi', name: 'Aldi', emoji: '🛒' },
    { id: 'sm-pt-froiz', name: 'Froiz', emoji: '🏪' }
  ],
  NL: [
    { id: 'sm-nl-albert-heijn', name: 'Albert Heijn', emoji: '🛒' },
    { id: 'sm-nl-jumbo', name: 'Jumbo', emoji: '🛒' },
    { id: 'sm-nl-lidl', name: 'Lidl', emoji: '🛍️' },
    { id: 'sm-nl-aldi', name: 'Aldi', emoji: '🛒' },
    { id: 'sm-nl-plus', name: 'Plus', emoji: '🛍️' },
    { id: 'sm-nl-dirk', name: 'Dirk', emoji: '🛒' },
    { id: 'sm-nl-coop', name: 'Coop', emoji: '🏪' }
  ],
  GB: [
    { id: 'sm-gb-tesco', name: 'Tesco', emoji: '🛒' },
    { id: 'sm-gb-sainsburys', name: "Sainsbury's", emoji: '🛒' },
    { id: 'sm-gb-asda', name: 'ASDA', emoji: '🛒' },
    { id: 'sm-gb-morrisons', name: 'Morrisons', emoji: '🛍️' },
    { id: 'sm-gb-aldi', name: 'Aldi', emoji: '🛒' },
    { id: 'sm-gb-lidl', name: 'Lidl', emoji: '🛍️' },
    { id: 'sm-gb-waitrose', name: 'Waitrose', emoji: '🏬' },
    { id: 'sm-gb-coop', name: 'Co-op', emoji: '🏪' },
    { id: 'sm-gb-iceland', name: 'Iceland', emoji: '❄️' },
    { id: 'sm-gb-mns', name: 'M&S', emoji: '🛍️' }
  ],
  US: [
    { id: 'sm-us-walmart', name: 'Walmart', emoji: '🛒' },
    { id: 'sm-us-target', name: 'Target', emoji: '🎯' },
    { id: 'sm-us-kroger', name: 'Kroger', emoji: '🛒' },
    { id: 'sm-us-costco', name: 'Costco', emoji: '🏬' },
    { id: 'sm-us-aldi', name: 'Aldi', emoji: '🛒' },
    { id: 'sm-us-trader-joes', name: "Trader Joe's", emoji: '🛍️' },
    { id: 'sm-us-whole-foods', name: 'Whole Foods', emoji: '🥬' },
    { id: 'sm-us-publix', name: 'Publix', emoji: '🛒' },
    { id: 'sm-us-safeway', name: 'Safeway', emoji: '🛒' },
    { id: 'sm-us-wegmans', name: 'Wegmans', emoji: '🏪' }
  ],
  JP: [
    { id: 'sm-jp-aeon', name: 'イオン (Aeon)', emoji: '🛒' },
    { id: 'sm-jp-seiyu', name: '西友 (Seiyu)', emoji: '🛒' },
    { id: 'sm-jp-life', name: 'ライフ (Life)', emoji: '🛍️' },
    { id: 'sm-jp-ito-yokado', name: 'イトーヨーカドー', emoji: '🏬' },
    { id: 'sm-jp-summit', name: 'サミット', emoji: '🛒' },
    { id: 'sm-jp-maruetsu', name: 'マルエツ', emoji: '🏪' },
    { id: 'sm-jp-don-quijote', name: 'ドン・キホーテ', emoji: '🛍️' }
  ],
  CN: [
    { id: 'sm-cn-yonghui', name: '永辉 (Yonghui)', emoji: '🛒' },
    { id: 'sm-cn-rt-mart', name: '大润发 (RT-Mart)', emoji: '🏬' },
    { id: 'sm-cn-walmart', name: '沃尔玛 (Walmart)', emoji: '🛒' },
    { id: 'sm-cn-carrefour', name: '家乐福 (Carrefour)', emoji: '🛒' },
    { id: 'sm-cn-hema', name: '盒马 (Hema)', emoji: '🛍️' },
    { id: 'sm-cn-vanguard', name: '华润万家', emoji: '🏬' },
    { id: 'sm-cn-aldi', name: '奥乐齐 (Aldi)', emoji: '🛒' }
  ],
  KR: [
    { id: 'sm-kr-emart', name: '이마트 (E-Mart)', emoji: '🛒' },
    { id: 'sm-kr-homeplus', name: '홈플러스 (Homeplus)', emoji: '🛒' },
    { id: 'sm-kr-lotte', name: '롯데마트 (Lotte Mart)', emoji: '🏬' },
    { id: 'sm-kr-costco', name: '코스트코 (Costco)', emoji: '🏬' },
    { id: 'sm-kr-gs', name: 'GS25', emoji: '🏪' },
    { id: 'sm-kr-cu', name: 'CU', emoji: '🏪' }
  ]
};

// Llista de països disponibles
const COUNTRIES = [
  { code: 'ES', flag: '🇪🇸', nameKey: 'countryES' },
  { code: 'FR', flag: '🇫🇷', nameKey: 'countryFR' },
  { code: 'IT', flag: '🇮🇹', nameKey: 'countryIT' },
  { code: 'DE', flag: '🇩🇪', nameKey: 'countryDE' },
  { code: 'PT', flag: '🇵🇹', nameKey: 'countryPT' },
  { code: 'NL', flag: '🇳🇱', nameKey: 'countryNL' },
  { code: 'GB', flag: '🇬🇧', nameKey: 'countryGB' },
  { code: 'US', flag: '🇺🇸', nameKey: 'countryUS' },
  { code: 'JP', flag: '🇯🇵', nameKey: 'countryJP' },
  { code: 'CN', flag: '🇨🇳', nameKey: 'countryCN' },
  { code: 'KR', flag: '🇰🇷', nameKey: 'countryKR' }
];

const SUPERMARKET_EMOJIS = ['🛒','🛍️','🏪','🥖','🥬','🍎','🧺','💰','🏬','🎯','❄️','🥩','🐟','💊','🍞','🧀','🥛','🍷','🍕','🥗','🥦','🍰','☕','🛒','🎁','📦','🎈','🌽','🍌','🍓','🥕','🌶️','🥑','🌭','🍔','🍟','🍪','🍫','🥤','🍶','🥫','🥟','🍱','🍣','🥨','🌮','🍝','🍳','🍯','🧈','🍿','🥜','🥥','🍇','🥝','🍒','🥒','🍆','🍑','🍊','🍋','🥭','🥖','🍩','🥯','🌰','🍵','🥃','🍻','🥂','🧃','🛸','📱','🧴','🧼','🧹','🧻','🪣','🛁','🧪','💉','🩹','🌿'];

let currentCountry = 'ES'; // país actual de l'usuari

// UBICACIONS PER DEFECTE
// Cada ubicació pertany a una de 3 categories fixes:
//  - 'fridge': nevera (productes refrigerats frescos)
//  - 'freezer': congelador (productes congelats)
//  - 'pantry': rebost (temperatura ambient)
const DEFAULT_LOCATIONS = [
  { id: 'fridge', emoji: '🧊', nameKey: 'locFridge', category: 'fridge' },
  { id: 'freezer', emoji: '❄️', nameKey: 'locFreezer', category: 'freezer' },
  { id: 'pantry', emoji: '🥫', nameKey: 'locPantry', category: 'pantry' },
  { id: 'fruit_bowl', emoji: '🍎', nameKey: 'locFruitBowl', category: 'pantry' },
  { id: 'counter', emoji: '🏠', nameKey: 'locCounter', category: 'pantry' },
  { id: 'medicine', emoji: '💊', nameKey: 'locMedicine', category: 'pantry' }
];

// ESCALES D'ALERTES per categoria (en dies)
// Quan es passa per sota d'aquests valors, salta el nivell d'alerta
const ALERT_SCALES = {
  fridge: {
    green: 5,    // > 5 dies: tranquil
    yellow: 3,   // 3-5 dies: atenció
    orange: 1    // 1-2 dies: urgent
    // < 1 dia: vermell (alerta!)
  },
  freezer: {
    green: 60,   // > 60 dies (2+ mesos): tranquil
    yellow: 30,  // 30-60 dies (1-2 mesos): atenció
    orange: 8    // 8-29 dies (~2-4 setmanes): urgent
    // < 8 dies (última setmana): vermell
  },
  pantry: {
    green: 30,   // > 30 dies: tranquil
    yellow: 14,  // 14-30 dies: atenció
    orange: 3    // 3-13 dies: urgent
    // < 3 dies: vermell
  }
};

// Temps recomanat de CONGELACIÓ per categoria (en dies)
// Basat en recomanacions FDA/USDA/AESAN
const FREEZER_DAYS = {
  // Carn
  'fresh-meat': 240, 'meat': 240, 'beef': 240, 'pork': 180,
  'ground-meat': 120, 'minced': 120,
  'chicken': 270, 'poultry': 270,
  'bacon': 30, 'sausage': 60,
  'ham': 60,
  // Peix
  'fresh-fish': 90, 'fish': 90, 'lean-fish': 180,
  'fatty-fish': 90, 'salmon': 90,
  'seafood': 90, 'shrimp': 180,
  // Làctics (no tot es congela bé!)
  'milk': 90, 'butter': 270, 'cheese': 180,
  // Pa i bolleria
  'bread': 90, 'baguette': 60, 'croissant': 60, 'cake': 90,
  // Fruites i verdures (millor blanquejades)
  'fruit': 240, 'berries': 270, 'strawberr': 270,
  'banana': 90, 'apple': 240,
  'vegetable': 240, 'green-bean': 240, 'pea': 240,
  'broccoli': 240, 'spinach': 240,
  'corn': 240,
  // Plats preparats
  'soup': 90, 'stew': 90, 'sauce': 180,
  'pizza': 60, 'pasta-meal': 60, 'lasagna': 90,
  // Gelats i postres congelats
  'ice-cream': 60, 'ice cream': 60,
  // Conserves: NO es congelen normalment, però per si de cas
  'canned': 365
};

function loadLocations() {
  const saved = localStorage.getItem('eatmefirst_locations');
  if (saved) {
    try { locations = JSON.parse(saved); }
    catch(e) { locations = JSON.parse(JSON.stringify(DEFAULT_LOCATIONS)); }
  } else {
    locations = JSON.parse(JSON.stringify(DEFAULT_LOCATIONS));
  }

  // Migració: dels sistemes antics (multiplier i type) al nou (category)
  let migrated = false;
  locations.forEach(loc => {
    if (!loc.category) {
      // Sistema antic amb 'type'
      if (loc.type === 'freezer') {
        loc.category = 'freezer';
      } else if (loc.multiplier && loc.multiplier >= 4) {
        loc.category = 'freezer';
      } else if (loc.id === 'fridge') {
        loc.category = 'fridge';
      } else if (loc.id === 'freezer') {
        loc.category = 'freezer';
      } else if (loc.id === 'pantry' || loc.id === 'fruit_bowl' || loc.id === 'counter') {
        loc.category = 'pantry';
      } else {
        // Per defecte, qualsevol cosa que no és nevera ni congelador → rebost
        loc.category = 'pantry';
      }
      delete loc.type;
      delete loc.multiplier;
      migrated = true;
    }
  });
  if (migrated) saveLocations();
}

function saveLocations() {
  localStorage.setItem('eatmefirst_locations', JSON.stringify(locations));
  if (typeof pushToServer === 'function') pushToServer();
}

// ============ LLISTA DE LA COMPRA ============

function loadShoppingData() {
  // Carrega el país
  const savedCountry = localStorage.getItem('eatmefirst_country');
  if (savedCountry) currentCountry = savedCountry;

  // Supermercats
  const sm = localStorage.getItem('eatmefirst_supermarkets');
  if (sm) {
    try {
      supermarkets = JSON.parse(sm);
      // Migració: si els supermercats antics no tenen 'enabled', els marquem tots com a true
      let needsSave = false;
      supermarkets.forEach(s => {
        if (typeof s.enabled === 'undefined') {
          s.enabled = true;
          needsSave = true;
        }
      });
      if (needsSave) saveShoppingData();
    } catch(e) { supermarkets = []; }
  } else {
    // Primer cop: si ja tenim país guardat (de la pantalla de benvinguda), inicialitzem
    // Si no tenim país, deixem la llista buida (la pantalla de benvinguda l'inicialitzarà)
    supermarkets = [];
  }

  // Items de la compra
  const items = localStorage.getItem('eatmefirst_shopping_items');
  if (items) {
    try { shoppingItems = JSON.parse(items); }
    catch(e) { shoppingItems = []; }
  } else {
    shoppingItems = [];
  }
}

// Botigues bàsiques (les mateixes per a tots els països)
const BASIC_SHOPS = [
  { id: 'sm-shop-butcher', nameKey: 'shopButcher', emoji: '🥩' },
  { id: 'sm-shop-fishmonger', nameKey: 'shopFishmonger', emoji: '🐟' },
  { id: 'sm-shop-greengrocer', nameKey: 'shopGreengrocer', emoji: '🥬' },
  { id: 'sm-shop-pharmacy', nameKey: 'shopPharmacy', emoji: '💊' },
  { id: 'sm-shop-bakery', nameKey: 'shopBakery', emoji: '🥖' }
];

function getBasicShops() {
  return BASIC_SHOPS.map(s => ({
    id: s.id,
    name: t(s.nameKey),
    emoji: s.emoji,
    enabled: false
  }));
}

// Inicialitza els supermercats per a un país (només en marca els 4 primers)
function initSupermarketsForCountry(countryCode) {
  const list = SUPERMARKETS_BY_COUNTRY[countryCode] || SUPERMARKETS_BY_COUNTRY.ES;
  supermarkets = [
    ...list.map((sm, idx) => ({ ...sm, enabled: idx < 4 })),
    ...getBasicShops()
  ];
  currentCountry = countryCode;
  localStorage.setItem('eatmefirst_country', countryCode);
  saveShoppingData();
}

// Quan l'usuari canvia de país, afegeix els nous supermercats sense esborrar els personalitzats
function changeCountry(countryCode) {
  const newList = SUPERMARKETS_BY_COUNTRY[countryCode] || SUPERMARKETS_BY_COUNTRY.ES;

  // Mantenim els supers personalitzats i les botigues bàsiques
  const customSupers = supermarkets.filter(s =>
    s.id.startsWith('sm-custom-') || s.id.startsWith('sm-shop-')
  );

  // També mantenim els supers que tenen productes pendents per comprar
  const supersWithItems = new Set(shoppingItems.map(it => it.supermarketId));
  const pendingSupers = supermarkets.filter(s =>
    supersWithItems.has(s.id) &&
    !s.id.startsWith('sm-custom-') &&
    !s.id.startsWith('sm-shop-') &&
    !newList.some(n => n.id === s.id)
  ).map(s => ({ ...s, enabled: true })); // sempre actius si tenen items

  // Botigues bàsiques que no existeixin encara
  const existingShopIds = new Set(customSupers.map(s => s.id));
  const missingBasicShops = getBasicShops().filter(s => !existingShopIds.has(s.id));

  supermarkets = [
    ...newList.map((sm, idx) => ({ ...sm, enabled: idx < 4 })),
    ...customSupers,
    ...missingBasicShops,
    ...pendingSupers
  ];

  currentCountry = countryCode;
  localStorage.setItem('eatmefirst_country', countryCode);
  saveShoppingData();
}

// Retorna només els supermercats actius (visibles a la llista de la compra)
function getEnabledSupermarkets() {
  return supermarkets.filter(s => s.enabled !== false);
}

function saveShoppingData() {
  localStorage.setItem('eatmefirst_supermarkets', JSON.stringify(supermarkets));
  localStorage.setItem('eatmefirst_shopping_items', JSON.stringify(shoppingItems));
  if (typeof pushToServer === 'function') pushToServer();
}

function getSupermarketById(id) {
  return supermarkets.find(s => s.id === id);
}

function getShoppingItemsBySupermarket(supermarketId) {
  return shoppingItems.filter(it => it.supermarketId === supermarketId);
}

// Pantalla principal: llista de supermercats
// ============ PANTALLA VEURE-HO TOT ============


// ============ LLISTES ESPECIALS ============



// ============ PANTALLA VEURE-HO TOT ============

let viewAllSortMode = 'expiry';

function openViewAll() {
  renderViewAll();
  showScreen('view-all');
}

function renderViewAll() {
  const container = document.getElementById('view-all-list');
  if (!container) return;
  container.innerHTML = '';

  if (products.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noProducts');
    container.appendChild(empty);
    return;
  }

  let sorted = [...products];
  if (viewAllSortMode === 'expiry') {
    sorted.sort((a, b) => {
      const da = daysUntil(a.date);
      const db = daysUntil(b.date);
      return da - db;
    });
  } else {
    sorted.sort((a, b) => {
      const la = getLocationById(a.location || 'fridge');
      const lb = getLocationById(b.location || 'fridge');
      const na = la ? getLocationName(la) : '';
      const nb = lb ? getLocationName(lb) : '';
      return na.localeCompare(nb);
    });
  }

  if (viewAllSortMode === 'zone') {
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
      container.appendChild(buildViewAllRow(p));
    });
  } else {
    sorted.forEach(p => container.appendChild(buildViewAllRow(p)));
  }
}

function buildViewAllRow(p) {
  const days = daysUntil(p.date);
  const loc = getLocationById(p.location || 'fridge');
  const row = document.createElement('button');
  row.className = 'view-all-row';
  row.innerHTML = `
    <span class="view-all-emoji">${p.emoji}</span>
    <div class="view-all-info">
      <p class="view-all-name">${escapeHtml(p.name)}${p.qty ? ' · ' + escapeHtml(p.qty) : ''}</p>
      <p class="view-all-meta">${loc ? loc.emoji + ' ' + getLocationName(loc) : ''} · ${daysText(days)}</p>
    </div>
    <span class="view-all-arrow">›</span>
  `;
  row.addEventListener('click', () => openProductDetail(p));
  return row;
}

// ============ LLISTES ESPECIALS ============

const SPECIAL_LISTS = [
  {
    id: 'picnic', emoji: '🧺', nameKey: 'listPicnic',
    items: [
      { name: 'Pa', emoji: '🥖' },
      { name: 'Embotit', emoji: '🥓' },
      { name: 'Formatge', emoji: '🧀' },
      { name: 'Tomàquet', emoji: '🍅' },
      { name: 'Aigua', emoji: '💧' },
      { name: 'Fruita', emoji: '🍎' },
      { name: 'Galetes', emoji: '🍪' },
      { name: 'Suc', emoji: '🧃' },
      { name: 'Tovalloletes', emoji: '🧻' }
    ]
  },
  {
    id: 'birthday', emoji: '🎂', nameKey: 'listBirthday',
    items: [
      { name: 'Pastís', emoji: '🎂' },
      { name: 'Espelmes', emoji: '🕯️' },
      { name: 'Globus', emoji: '🎈' },
      { name: 'Aperitius', emoji: '🥨' },
      { name: 'Refrescos', emoji: '🥤' },
      { name: 'Patates', emoji: '🍟' },
      { name: 'Olives', emoji: '🫒' },
      { name: 'Plats i gots', emoji: '🍽️' },
      { name: 'Regal', emoji: '🎁' }
    ]
  },
  {
    id: 'calcotada', emoji: '🌱', nameKey: 'listCalcotada',
    items: [
      { name: 'Calçots', emoji: '🌱' },
      { name: 'Salsa romesco', emoji: '🥫' },
      { name: 'Carn brasa', emoji: '🥩' },
      { name: 'Botifarra', emoji: '🌭' },
      { name: 'Pa', emoji: '🥖' },
      { name: 'Vi', emoji: '🍷' },
      { name: 'Mongetes', emoji: '🫘' },
      { name: 'Crema catalana', emoji: '🍮' }
    ]
  },
  {
    id: 'breakfast', emoji: '☕', nameKey: 'listBreakfast',
    items: [
      { name: 'Llet', emoji: '🥛' },
      { name: 'Cafè', emoji: '☕' },
      { name: 'Pa de motlle', emoji: '🍞' },
      { name: 'Mantega', emoji: '🧈' },
      { name: 'Melmelada', emoji: '🍓' },
      { name: 'Cereals', emoji: '🥣' },
      { name: 'Suc taronja', emoji: '🧃' }
    ]
  },
  {
    id: 'bbq', emoji: '🔥', nameKey: 'listBBQ',
    items: [
      { name: 'Carn vermella', emoji: '🥩' },
      { name: 'Pollastre', emoji: '🍗' },
      { name: 'Salsitxes', emoji: '🌭' },
      { name: 'Hamburgueses', emoji: '🍔' },
      { name: 'Carbó', emoji: '⚫' },
      { name: 'Cervesa', emoji: '🍺' },
      { name: 'Amanida', emoji: '🥗' },
      { name: 'Pa', emoji: '🥖' }
    ]
  },
  {
    id: 'pasta', emoji: '🍝', nameKey: 'listPasta',
    items: [
      { name: 'Espaguetis', emoji: '🍝' },
      { name: 'Tomàquet fregit', emoji: '🥫' },
      { name: 'Carn picada', emoji: '🥩' },
      { name: 'Formatge ratllat', emoji: '🧀' },
      { name: 'All', emoji: '🧄' },
      { name: 'Ceba', emoji: '🧅' },
      { name: 'Vi negre', emoji: '🍷' }
    ]
  }
];

let currentSpecialList = null;

function openSpecialLists() {
  renderSpecialLists();
  showScreen('special-lists');
}

function renderSpecialLists() {
  const container = document.getElementById('special-lists-grid');
  if (!container) return;
  container.innerHTML = '';
  SPECIAL_LISTS.forEach(list => {
    const btn = document.createElement('button');
    btn.className = 'special-list-card';
    btn.innerHTML = `
      <span class="special-list-emoji">${list.emoji}</span>
      <span class="special-list-name">${t(list.nameKey)}</span>
      <span class="special-list-count">${list.items.length} ${t('items')}</span>
    `;
    btn.addEventListener('click', () => openSpecialDetail(list));
    container.appendChild(btn);
  });
}

function openSpecialDetail(list) {
  currentSpecialList = list;
  document.getElementById('special-detail-title').textContent = list.emoji + ' ' + t(list.nameKey);
  const container = document.getElementById('special-detail-list');
  container.innerHTML = '';
  list.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'special-detail-item';
    row.innerHTML = `
      <span class="special-item-emoji">${item.emoji}</span>
      <span class="special-item-name">${escapeHtml(item.name)}</span>
    `;
    container.appendChild(row);
  });
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
  // Per defecte tots seleccionats
  specialSelectedItems = list.items.map(it => ({ ...it, selected: true, qty: '' }));

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
      <input type="text" class="special-qty-input" data-idx="${idx}" placeholder="${t('quantity') || 'Qty'}" maxlength="15">
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
    : currentSpecialList.items.map(it => ({ ...it, qty: '' }));

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
  specialSelectedItems = []; // reset
  showToast('🎉 ' + items.length + ' ' + t('itemsAdded'));
  showScreen('shopping');
  renderSupermarkets();
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

function showWelcomeIfNeeded() {
  const onboarded = localStorage.getItem('eatmefirst_onboarded');
  if (onboarded === 'true') return false;

  // Detecta país per defecte segons l'idioma
  const lang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'ca';
  const langToCountry = { ca: 'ES', es: 'ES', en: 'GB', fr: 'FR', it: 'IT', de: 'DE', pt: 'PT', nl: 'NL', ja: 'JP', zh: 'CN', ko: 'KR' };
  currentCountry = langToCountry[lang] || 'ES';

  renderWelcomeCountryList();
  showScreen('welcome');
  return true;
}

function renderWelcomeCountryList() {
  const container = document.getElementById('welcome-country-list');
  if (!container) return;
  container.innerHTML = '';

  COUNTRIES.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'country-card' + (c.code === currentCountry ? ' selected' : '');
    btn.innerHTML = `
      <span class="country-flag">${c.flag}</span>
      <span class="country-name">${t(c.nameKey)}</span>
      ${c.code === currentCountry ? '<span class="country-check">✓</span>' : ''}
    `;
    btn.addEventListener('click', () => selectCountryFromWelcome(c.code));
    container.appendChild(btn);
  });
}

function selectCountryFromWelcome(countryCode) {
  // Inicialitza supermercats per al país triat
  initSupermarketsForCountry(countryCode);
  localStorage.setItem('eatmefirst_onboarded', 'true');
  // Va al launcher
  showScreen('launcher');
  setTimeout(() => showToast('🎉 ' + t('welcomeReady')), 300);
}

// ============ PANTALLA PAÍS (des de configuració) ============

function openCountryScreen() {
  renderCountryList();
  showScreen('country');
}

function renderCountryList() {
  const container = document.getElementById('country-list');
  if (!container) return;
  container.innerHTML = '';

  COUNTRIES.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'country-card' + (c.code === currentCountry ? ' selected' : '');
    btn.innerHTML = `
      <span class="country-flag">${c.flag}</span>
      <span class="country-name">${t(c.nameKey)}</span>
      ${c.code === currentCountry ? '<span class="country-check">✓</span>' : ''}
    `;
    btn.addEventListener('click', () => selectCountryFromSettings(c.code));
    container.appendChild(btn);
  });
}

function selectCountryFromSettings(countryCode) {
  if (countryCode === currentCountry) {
    showScreen('settings');
    return;
  }
  // Confirma el canvi de país
  showCountryChangeModal(countryCode);
}

function showCountryChangeModal(countryCode) {
  const country = COUNTRIES.find(c => c.code === countryCode);
  if (!country) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">${country.flag}</div>
      <p class="modal-title">${t('changeCountryTitle')}</p>
      <p class="modal-product-name">${t(country.nameKey)}</p>
      <p class="modal-sub">${t('changeCountrySub')}</p>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('changeCountryConfirm')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    changeCountry(countryCode);
    updateCountryStatus();
    renderCountryList();
    showToast('✓ ' + t(country.nameKey));
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function updateCountryStatus() {
  const el = document.getElementById('country-status');
  if (!el) return;
  const c = COUNTRIES.find(c => c.code === currentCountry);
  if (c) el.textContent = c.flag + ' ' + t(c.nameKey);
}

// ============ PANTALLA GESTIÓ DE SUPERMERCATS ============

function openManageSupermarkets(origin) {
  manageSupermarketsMode = 'view';
  const backBtn = document.getElementById('manage-supermarkets-back-btn');
  if (backBtn) backBtn.dataset.back = (origin === 'settings') ? 'settings' : 'shopping';
  renderManageSupermarkets();
  showScreen('manage-supermarkets');
}

// Mode actual: 'view' (només checkbox + nom) o 'edit' (amb fletxes, editar, esborrar)
let manageSupermarketsMode = 'view';

function renderManageSupermarkets() {
  const container = document.getElementById('manage-supermarkets-list');
  if (!container) return;
  container.innerHTML = '';

  if (supermarkets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noSupermarketsManage');
    container.appendChild(empty);
    updateManageSupermarketsButtons();
    return;
  }

  supermarkets.forEach((sm, idx) => {
    const row = document.createElement('div');
    row.className = 'manage-sm-row';
    const isFirst = idx === 0;
    const isLast = idx === supermarkets.length - 1;

    if (manageSupermarketsMode === 'edit') {
      // Mode edició: checkbox + emoji + nom + fletxes + editar + esborrar
      row.innerHTML = `
        <label class="manage-sm-checkbox">
          <input type="checkbox" data-id="${sm.id}" ${sm.enabled !== false ? 'checked' : ''}>
          <span class="checkmark"></span>
        </label>
        <div class="manage-sm-emoji">${sm.emoji}</div>
        <div class="manage-sm-name">${escapeHtml(sm.name)}</div>
        <div class="manage-sm-arrows">
          <button class="arrow-btn ${isFirst ? 'arrow-disabled' : ''}" data-action="up" ${isFirst ? 'disabled' : ''} aria-label="Up">▲</button>
          <button class="arrow-btn ${isLast ? 'arrow-disabled' : ''}" data-action="down" ${isLast ? 'disabled' : ''} aria-label="Down">▼</button>
        </div>
        <button class="manage-sm-edit" aria-label="Edit">✏️</button>
        <button class="manage-sm-delete" aria-label="Delete">✕</button>
      `;
      row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
        sm.enabled = e.target.checked;
        saveShoppingData();
      });
      row.querySelector('.manage-sm-edit').addEventListener('click', () => openSupermarketEdit(sm));
      row.querySelector('.manage-sm-delete').addEventListener('click', () => askDeleteSupermarket(sm));
      const upBtn = row.querySelector('[data-action="up"]');
      const downBtn = row.querySelector('[data-action="down"]');
      if (upBtn && !isFirst) upBtn.addEventListener('click', () => moveSupermarket(idx, -1));
      if (downBtn && !isLast) downBtn.addEventListener('click', () => moveSupermarket(idx, 1));
    } else {
      // Mode visualització: només checkbox + emoji + nom
      row.innerHTML = `
        <label class="manage-sm-checkbox">
          <input type="checkbox" data-id="${sm.id}" ${sm.enabled !== false ? 'checked' : ''}>
          <span class="checkmark"></span>
        </label>
        <div class="manage-sm-emoji">${sm.emoji}</div>
        <div class="manage-sm-name">${escapeHtml(sm.name)}</div>
      `;
      row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
        sm.enabled = e.target.checked;
        saveShoppingData();
      });
    }

    container.appendChild(row);
  });

  updateManageSupermarketsButtons();
}

function updateManageSupermarketsButtons() {
  const editBtn = document.getElementById('btn-toggle-edit-shops');
  const addBtn = document.getElementById('btn-add-custom-supermarket');
  const saveBtn = document.getElementById('btn-save-shops');
  if (!editBtn) return;

  if (manageSupermarketsMode === 'edit') {
    editBtn.style.display = 'none';
    if (addBtn) addBtn.style.display = 'flex';
    if (saveBtn) saveBtn.style.display = 'block';
  } else {
    editBtn.style.display = 'flex';
    if (addBtn) addBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
  }
}

function toggleEditShopsMode() {
  manageSupermarketsMode = manageSupermarketsMode === 'view' ? 'edit' : 'view';
  renderManageSupermarkets();
}

function moveSupermarket(idx, direction) {
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= supermarkets.length) return;
  [supermarkets[idx], supermarkets[newIdx]] = [supermarkets[newIdx], supermarkets[idx]];
  saveShoppingData();
  renderManageSupermarkets();
}

function moveShoppingItem(idx, direction) {
  const items = getShoppingItemsBySupermarket(currentSupermarketId);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= items.length) return;

  const itemA = items[idx];
  const itemB = items[newIdx];
  // Trobem els seus índexs reals al global
  const realA = shoppingItems.findIndex(it => it.id === itemA.id);
  const realB = shoppingItems.findIndex(it => it.id === itemB.id);
  if (realA < 0 || realB < 0) return;
  [shoppingItems[realA], shoppingItems[realB]] = [shoppingItems[realB], shoppingItems[realA]];
  saveShoppingData();
  renderShoppingItems();
}

function askDeleteSupermarket(sm) {
  const itemsCount = getShoppingItemsBySupermarket(sm.id).length;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">🗑️</div>
      <p class="modal-title">${t('confirmDeleteSupermarket')}</p>
      <p class="modal-product-name">${escapeHtml(sm.emoji + ' ' + sm.name)}</p>
      <p class="modal-sub">${itemsCount > 0 ? t('confirmDeleteSupermarketWithItems', itemsCount) : t('confirmDeleteSupermarketSub')}</p>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm modal-confirm-danger" id="modal-yes-btn">${t('delete')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    shoppingItems = shoppingItems.filter(it => it.supermarketId !== sm.id);
    supermarkets = supermarkets.filter(s => s.id !== sm.id);
    saveShoppingData();
    renderManageSupermarkets();
    showToast(t('deleted'));
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function openShoppingList() {
  renderSupermarkets();
  showScreen('shopping');
}

function renderSupermarkets() {
  const container = document.getElementById('shopping-supermarkets');
  if (!container) return;
  container.innerHTML = '';

  const visibleSupermarkets = getEnabledSupermarkets();

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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatItemCount(n) {
  if (n === 0) return t('emptyList');
  if (n === 1) return t('oneItem');
  return t('manyItems', n);
}

function openSupermarket(id) {
  currentSupermarketId = id;
  const sm = getSupermarketById(id);
  if (!sm) return;
  document.getElementById('supermarket-title').textContent = sm.emoji + ' ' + sm.name;
  renderShoppingItems();
  renderSupermarketDots();
  showScreen('supermarket');
  setupSupermarketSwipe();
}

function renderSupermarketDots() {
  const dotsContainer = document.getElementById('supermarket-dots');
  if (!dotsContainer) return;
  dotsContainer.innerHTML = '';
  const enabled = getEnabledSupermarkets();
  enabled.forEach(sm => {
    const dot = document.createElement('div');
    dot.className = 'sm-dot' + (sm.id === currentSupermarketId ? ' active' : '');
    dotsContainer.appendChild(dot);
  });
}

// Configuració del swipe
let _swipeSetup = false;
function setupSupermarketSwipe() {
  if (_swipeSetup) return;
  _swipeSetup = true;

  const screen = document.getElementById('screen-supermarket');
  if (!screen) return;

  let startX = 0, startY = 0, currentX = 0, isSwiping = false;

  screen.addEventListener('touchstart', (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    isSwiping = true;
  }, { passive: true });

  screen.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    currentX = e.touches[0].clientX;
    const dx = currentX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 20) {
      isSwiping = false;
      screen.style.transform = '';
      screen.style.opacity = '';
      return;
    }
    // Mou la pantalla amb el dit
    if (Math.abs(dx) > 10) {
      screen.style.transform = `translateX(${dx * 0.5}px)`;
      screen.style.opacity = `${1 - Math.abs(dx) / 800}`;
    }
  }, { passive: true });

  screen.addEventListener('touchend', () => {
    if (!isSwiping) return;
    isSwiping = false;
    const dx = currentX - startX;

    // Animació de retorn suau
    screen.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
    screen.style.transform = '';
    screen.style.opacity = '';
    setTimeout(() => { screen.style.transition = ''; }, 250);

    if (Math.abs(dx) < 80) return;

    const enabled = getEnabledSupermarkets();
    const idx = enabled.findIndex(s => s.id === currentSupermarketId);
    if (idx < 0) return;

    if (dx < 0 && idx < enabled.length - 1) {
      // Swipe esquerra → següent: animació d'entrada des de la dreta
      animateScreenSlide(screen, 'left', () => openSupermarket(enabled[idx + 1].id));
    } else if (dx > 0 && idx > 0) {
      // Swipe dreta → anterior: animació d'entrada des de l'esquerra
      animateScreenSlide(screen, 'right', () => openSupermarket(enabled[idx - 1].id));
    }
  });

  screen.addEventListener('touchcancel', () => {
    isSwiping = false;
    screen.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
    screen.style.transform = '';
    screen.style.opacity = '';
    setTimeout(() => { screen.style.transition = ''; }, 200);
  });
}

function animateScreenSlide(screen, direction, callback) {
  const distance = direction === 'left' ? -100 : 100;
  screen.style.transition = 'transform 0.2s ease-in, opacity 0.2s ease-in';
  screen.style.transform = `translateX(${distance}%)`;
  screen.style.opacity = '0';

  setTimeout(() => {
    callback();
    // Apareix des de l'altre costat
    screen.style.transition = '';
    screen.style.transform = `translateX(${-distance}%)`;
    screen.style.opacity = '0';
    requestAnimationFrame(() => {
      screen.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
      screen.style.transform = '';
      screen.style.opacity = '';
      setTimeout(() => { screen.style.transition = ''; }, 250);
    });
  }, 200);
}

// Indicadors (punts) a la part superior, estil Stories
// Configuració del swipe
function renderShoppingItems() {
  const container = document.getElementById('shopping-items-list');
  const summary = document.getElementById('supermarket-summary');
  if (!container) return;
  container.innerHTML = '';

  const items = getShoppingItemsBySupermarket(currentSupermarketId);

  if (summary) {
    summary.textContent = items.length === 0 ? t('shoppingEmptyHint') : t('shoppingItemsCount', items.length);
  }

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'shopping-empty-celebration';
    empty.innerHTML = `
      <div class="celebrate-emoji">🎉</div>
      <p class="celebrate-title">${t('shoppingDone')}</p>
      <p class="celebrate-sub">${t('shoppingDoneSub')}</p>
    `;
    container.appendChild(empty);
    return;
  }

  items.forEach((item, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === items.length - 1;
    const div = document.createElement('div');
    div.className = 'shopping-item';
    div.innerHTML = `
      <div class="shopping-item-emoji">${item.emoji}</div>
      <div class="shopping-item-info">
        <p class="shopping-item-name">${escapeHtml(item.name)}</p>
        ${item.qty || item.notes ? `<p class="shopping-item-meta">${item.qty ? escapeHtml(item.qty) : ''}${item.qty && item.notes ? ' · ' : ''}${item.notes ? escapeHtml(item.notes) : ''}</p>` : ''}
      </div>
      <div class="shopping-item-arrows">
        <button class="arrow-btn ${isFirst ? 'arrow-disabled' : ''}" data-action="up" ${isFirst ? 'disabled' : ''} aria-label="Up">▲</button>
        <button class="arrow-btn ${isLast ? 'arrow-disabled' : ''}" data-action="down" ${isLast ? 'disabled' : ''} aria-label="Down">▼</button>
      </div>
      <button class="shopping-item-edit" data-action="edit" data-id="${item.id}" aria-label="Edit">✏️</button>
      <button class="shopping-item-bought" data-action="bought" data-id="${item.id}" aria-label="Bought">
        <span style="font-size:18px">✅</span>
        <span data-i18n="bought">${t('bought')}</span>
      </button>
    `;
    div.querySelector('[data-action="edit"]').addEventListener('click', () => openShoppingItemEdit(item));
    div.querySelector('[data-action="bought"]').addEventListener('click', () => buyShoppingItem(item));

    const upBtn = div.querySelector('[data-action="up"]');
    const downBtn = div.querySelector('[data-action="down"]');
    if (upBtn && !isFirst) upBtn.addEventListener('click', () => moveShoppingItem(idx, -1));
    if (downBtn && !isLast) downBtn.addEventListener('click', () => moveShoppingItem(idx, 1));

    container.appendChild(div);
  });
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

function saveShoppingItem() {
  const name = document.getElementById('input-shopping-name').value.trim();
  if (!name) { showToast(t('nameRequired')); return; }
  const qty = document.getElementById('input-shopping-qty').value.trim();
  const notes = document.getElementById('input-shopping-notes').value.trim();

  if (editingShoppingItem) {
    editingShoppingItem.name = name;
    editingShoppingItem.emoji = selectedShoppingEmoji;
    editingShoppingItem.qty = qty;
    editingShoppingItem.notes = notes;
    // Aplicar canvi de botiga si l'usuari l'ha canviada
    const shopSelect = document.getElementById('input-shopping-shop');
    if (shopSelect && shopSelect.value) {
      editingShoppingItem.supermarketId = shopSelect.value;
    }
    saveShoppingData();
    showToast(t('saved'));
    openSupermarket(editingShoppingItem.supermarketId);
    return;
  }

  // Nou item: comprovem si ja en té a casa (BiteMe)
  const lowerName = name.toLowerCase();
  const existingAtHome = products.filter(p => p.name.toLowerCase().includes(lowerName) || lowerName.includes(p.name.toLowerCase()));

  if (existingAtHome.length > 0) {
    showAlreadyHaveModal(name, existingAtHome, () => {
      const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      shoppingItems.push({
        id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
        qty, notes, addedAt: Date.now()
      });
      saveShoppingData();
      showToast(t('saved'));
      openSupermarket(currentSupermarketId);
    });
    return;
  }

  const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  shoppingItems.push({
    id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
    qty, notes, addedAt: Date.now()
  });
  saveShoppingData();
  showToast(t('saved'));
  openSupermarket(currentSupermarketId);
}

function showAlreadyHaveModal(itemName, existingProducts, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const list = existingProducts.slice(0, 3).map(p => {
    const days = daysUntil(p.date);
    return `<div class="already-have-row">${p.emoji} ${escapeHtml(p.name)}${p.qty ? ' · ' + escapeHtml(p.qty) : ''} <span class="already-have-days">${daysText(days)}</span></div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">⚠️</div>
      <p class="modal-title">${t('alreadyHaveTitle')}</p>
      <p class="modal-sub">${t('alreadyHaveSub', existingProducts.length)}</p>
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
  openSupermarket(currentSupermarketId);
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

  const prefill = {
    name: item.name,
    emoji: item.emoji,
    qty: item.qty,
    days: (fromPopular && fromPopular.days) || (fromHistory && fromHistory.days) || null,
    location: (fromPopular && fromPopular.location) || (fromHistory && fromHistory.location) || null
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

// Renderitza els productes populars per afegir a BuyMe (sense caducitat, només nom + emoji)
function renderPopularListForShopping() {
  const container = document.getElementById('shopping-popular-list');
  if (!container) return;
  container.innerHTML = '';
  const items = getPopularProducts();

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noPopular');
    container.appendChild(empty);
    return;
  }

  items.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'popular-item';
    btn.innerHTML = `
      <span class="popular-emoji">${p.emoji}</span>
      <span class="popular-name">${escapeHtml(p.name)}</span>
    `;
    btn.addEventListener('click', () => {
      // Afegim directament a la llista del supermercat actual
      const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      shoppingItems.push({
        id, supermarketId: currentSupermarketId,
        name: p.name, emoji: p.emoji, qty: '', notes: '',
        addedAt: Date.now()
      });
      saveShoppingData();
      showToast('🛒 ' + p.emoji + ' ' + p.name);
      renderShoppingItems();
      showScreen('supermarket');
    });
    container.appendChild(btn);
  });
}

function getLocationName(loc) {
  // Si té nom personalitzat, l'usa; sinó, agafa el de l'idioma
  return loc.customName || (loc.nameKey ? t(loc.nameKey) : loc.id);
}

function getLocationById(id) {
  return locations.find(l => l.id === id) || locations[0];
}

// DADES
function saveData() {
  localStorage.setItem('eatmefirst_products', JSON.stringify(products));
  localStorage.setItem('eatmefirst_stats', JSON.stringify(stats));
  if (typeof pushToServer === 'function') pushToServer();
}

function loadData() {
  const p = localStorage.getItem('eatmefirst_products');
  const s = localStorage.getItem('eatmefirst_stats');
  if (p) { try { products = JSON.parse(p); } catch(e){ products = []; } }
  if (s) { try { stats = JSON.parse(s); } catch(e){ stats = {consumed:0,trashed:0}; } }
}

// DIES
function daysUntil(dateStr) {
  if (!dateStr) return Infinity; // Sense data → mai caduca
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

function getLevel(days, category) {
  const cat = category || 'fridge';
  const scale = ALERT_SCALES[cat] || ALERT_SCALES.fridge;
  if (days <= 0) return 'red';
  if (days < scale.orange) return 'red';      // Sota el llindar taronja → vermell
  if (days < scale.yellow) return 'orange';   // Entre orange i yellow → taronja
  if (days < scale.green) return 'yellow';    // Entre yellow i green → groc
  return 'green';                              // Per sobre de green → verd
}

// Ajuda: dóna el nivell d'un producte segons la seva ubicació
function getProductLevel(product) {
  const loc = getLocationById(product.location || 'fridge');
  const cat = loc ? loc.category : 'fridge';
  return getLevel(daysUntil(product.date), cat);
}

function daysText(days) {
  if (days === Infinity) return t('noExpiryShort');
  if (days < 0) return t('expiredDays', Math.abs(days));
  if (days === 0) return t('expiresToday');
  if (days === 1) return t('expiresTomorrow');
  return t('daysLeft', days);
}

// PANTALLES
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  window.scrollTo(0, 0);

  // Aturar escàner si no som a la pantalla d'escaneig
  if (name !== 'scan') stopScanner();
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
}

// NEVI
const neviMoods = {
  green: { body: '#C0DD97', border: '#639922', eyes: '#173404', mouth: 'M 25 54 Q 35 70 45 54' },
  yellow:{ body: '#FAC775', border: '#BA7517', eyes: '#412402', mouth: 'M 25 58 Q 35 64 45 58' },
  orange:{ body: '#F0997B', border: '#D85A30', eyes: '#4A1B0C', mouth: 'M 26 61 L 44 61' },
  red:   { body: '#F09595', border: '#E24B4A', eyes: '#501313', mouth: 'M 25 64 Q 35 56 45 64' }
};

const neviMessages = {
  ca: { green: 'Tot guai! Res no caduca pròximament.', yellow: 'Comença a pensar què fer amb aquests productes.', orange: 'Avui o demà toca menjar això!', red: 'Oh! Hem d\'actuar ràpid!' },
  es: { green: '¡Todo bien! Nada caduca próximamente.', yellow: 'Empieza a pensar qué hacer con estos.', orange: '¡Hoy o mañana hay que comerlos!', red: '¡Tenemos que actuar rápido!' },
  en: { green: 'All good! Nothing expiring soon.', yellow: 'Start thinking what to do with these.', orange: 'Today or tomorrow we eat these!', red: 'Oh no! We need to act fast!' },
  fr: { green: 'Tout va bien !', yellow: 'Commence à réfléchir à quoi faire.', orange: 'Aujourd\'hui ou demain !', red: 'Oh non ! Il faut faire vite !' },
  it: { green: 'Tutto bene!', yellow: 'Inizia a pensare cosa farne.', orange: 'Oggi o domani!', red: 'Dobbiamo fare in fretta!' },
  de: { green: 'Alles in Ordnung!', yellow: 'Überleg dir, was damit zu tun ist.', orange: 'Heute oder morgen!', red: 'Schnell handeln!' },
  ru: { green: 'Всё хорошо!', yellow: 'Подумай, что с ними делать.', orange: 'Сегодня или завтра!', red: 'Надо действовать быстро!' },
  zh: { green: '一切都好!', yellow: '开始考虑怎么处理。', orange: '今天或明天!', red: '需要快速行动!' }
};

function setNevi(level) {
  const m = neviMoods[level];
  const lang = getCurrentLang();
  document.getElementById('nevi-body').setAttribute('fill', m.body);
  document.getElementById('nevi-body').setAttribute('stroke', m.border);
  document.getElementById('nevi-divider').setAttribute('stroke', m.border);
  document.getElementById('nevi-eye-left').setAttribute('fill', m.eyes);
  document.getElementById('nevi-eye-right').setAttribute('fill', m.eyes);
  document.getElementById('nevi-mouth').setAttribute('stroke', m.eyes);
  document.getElementById('nevi-mouth').setAttribute('d', m.mouth);
  document.getElementById('nevi-message').textContent = (neviMessages[lang] || neviMessages.ca)[level];
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

function renderHome() {
  const counts = { fridge: 0, freezer: 0, pantry: 0 };
  const alerts = { fridge: 0, freezer: 0, pantry: 0, total: 0 };

  products.forEach(p => {
    const loc = getLocationById(p.location || 'fridge');
    const cat = loc ? loc.category : 'fridge';
    if (counts[cat] !== undefined) counts[cat]++;

    const level = getLevel(daysUntil(p.date), cat);
    if (level === 'orange' || level === 'red') {
      if (alerts[cat] !== undefined) alerts[cat]++;
      alerts.total++;
    }
  });

  document.getElementById('count-fridge').textContent = formatCount(counts.fridge);
  document.getElementById('count-freezer').textContent = formatCount(counts.freezer);
  document.getElementById('count-pantry').textContent = formatCount(counts.pantry);
  document.getElementById('count-alerts').textContent = formatCount(alerts.total);

  setBadge('badge-fridge', alerts.fridge);
  setBadge('badge-freezer', alerts.freezer);
  setBadge('badge-pantry', alerts.pantry);
  setBadge('badge-alerts', alerts.total);

  const total = products.length;
  let summary;
  if (total === 0) {
    summary = t('noProducts');
  } else {
    summary = t('productCount', total);
    if (alerts.total > 0) summary += ' · ' + t('urgent', alerts.total);
  }
  document.getElementById('top-summary').textContent = summary;
}

function formatCount(n) {
  if (n === 0) return t('emptySection');
  return t('productCount', n);
}

function setBadge(elemId, count) {
  const el = document.getElementById(elemId);
  if (!el) return;
  if (count > 0) {
    el.textContent = count;
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

// Variable: quina secció estem mirant
let currentSection = 'fridge';
const SECTION_ORDER = ['fridge', 'freezer', 'pantry'];

function openSection(category) {
  currentSection = category;
  if (category === 'alerts') {
    renderAlerts();
    showScreen('alerts');
    return;
  }
  renderSection();
  showScreen('section');
}

function renderSection() {
  const cat = currentSection;
  const scale = ALERT_SCALES[cat];

  // Títol
  const titles = {
    fridge: '🧊 ' + t('catFridge'),
    freezer: '❄️ ' + t('catFreezer'),
    pantry: '🥫 ' + t('catPantry')
  };
  document.getElementById('section-title').textContent = titles[cat];

  // Subtítols dels prestatges adaptats a l'escala
  document.getElementById('shelf-sub-green').textContent = t('moreThan', scale.green) + ' ' + t('days');
  document.getElementById('shelf-sub-yellow').textContent = scale.yellow + '-' + scale.green + ' ' + t('days');
  document.getElementById('shelf-sub-orange').textContent = scale.orange + '-' + (scale.yellow - 1) + ' ' + t('days');
  if (scale.orange === 1) {
    document.getElementById('shelf-sub-red').textContent = t('todayOrExpired');
  } else {
    document.getElementById('shelf-sub-red').textContent = t('lessThan', scale.orange) + ' ' + t('days');
  }

  // Comptem productes filtrats per categoria
  const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
  products.forEach(p => {
    const loc = getLocationById(p.location || 'fridge');
    const pcat = loc ? loc.category : 'fridge';
    if (pcat !== cat) return;
    counts[getLevel(daysUntil(p.date), cat)]++;
  });

  document.getElementById('count-green').textContent = counts.green;
  document.getElementById('count-yellow').textContent = counts.yellow;
  document.getElementById('count-orange').textContent = counts.orange;
  document.getElementById('count-red').textContent = counts.red;

  // Punts indicadors
  renderSectionDots();
}

function renderSectionDots() {
  const dots = document.getElementById('section-dots');
  if (!dots) return;
  dots.innerHTML = '';
  SECTION_ORDER.forEach(cat => {
    const dot = document.createElement('span');
    dot.className = 'section-dot' + (cat === currentSection ? ' active' : '');
    dots.appendChild(dot);
  });
}

function navigateSection(direction) {
  const idx = SECTION_ORDER.indexOf(currentSection);
  if (idx < 0) return;
  let newIdx = idx + direction;
  if (newIdx < 0) newIdx = SECTION_ORDER.length - 1;
  if (newIdx >= SECTION_ORDER.length) newIdx = 0;
  currentSection = SECTION_ORDER[newIdx];

  // Animació de transició (slide)
  const screen = document.getElementById('screen-section');
  if (screen) {
    screen.classList.remove('slide-in-left', 'slide-in-right');
    void screen.offsetWidth; // reset animation
    screen.classList.add(direction > 0 ? 'slide-in-right' : 'slide-in-left');
  }

  renderSection();
}

// PANTALLA D'ALERTES
function renderAlerts() {
  const list = document.getElementById('alerts-list');
  const empty = document.getElementById('alerts-empty');
  const summary = document.getElementById('alerts-summary');
  list.innerHTML = '';

  // Productes amb nivell taronja o vermell, ordenats pels més urgents
  const alertProducts = products
    .map(p => {
      const loc = getLocationById(p.location || 'fridge');
      const cat = loc ? loc.category : 'fridge';
      return {
        ...p,
        days: daysUntil(p.date),
        level: getLevel(daysUntil(p.date), cat),
        loc: loc,
        cat: cat
      };
    })
    .filter(p => p.level === 'orange' || p.level === 'red')
    .sort((a, b) => a.days - b.days);

  if (alertProducts.length === 0) {
    empty.style.display = 'block';
    summary.textContent = '';
    return;
  }

  empty.style.display = 'none';
  summary.textContent = t('alertsCount', alertProducts.length);

  alertProducts.forEach(p => {
    const item = document.createElement('div');
    item.className = 'product-item product-item-alert product-item-' + p.level;
    const locLabel = p.loc ? p.loc.emoji + ' ' + getLocationName(p.loc) + ' · ' : '';
    item.innerHTML = '<span class="product-item-emoji">' + p.emoji + '</span><div class="product-item-info"><div class="product-item-name"></div><div class="product-item-days"></div></div><span class="product-item-arrow">›</span>';
    item.querySelector('.product-item-name').textContent = p.name;
    item.querySelector('.product-item-days').textContent = locLabel + daysText(p.days);
    item.addEventListener('click', () => openProduct(p.id));
    list.appendChild(item);
  });
}

// LLISTA - mostra productes d'un nivell DINS de la secció actual
function openShelf(level) {
  currentLevel = level;
  const cat = currentSection;
  const titles = { green: t('shelfGreen'), yellow: t('shelfYellow'), orange: t('shelfOrange'), red: t('shelfRed') };
  const catEmoji = { fridge: '🧊', freezer: '❄️', pantry: '🥫' }[cat] || '';
  document.getElementById('list-title').textContent = catEmoji + ' ' + titles[level];

  const shelfProducts = products
    .map(p => {
      const loc = getLocationById(p.location || 'fridge');
      const pcat = loc ? loc.category : 'fridge';
      return { ...p, days: daysUntil(p.date), pcat: pcat, loc: loc };
    })
    .filter(p => p.pcat === cat && getLevel(p.days, cat) === level)
    .sort((a, b) => a.days - b.days);

  const listEl = document.getElementById('product-list');
  const emptyEl = document.getElementById('empty-list');
  listEl.innerHTML = '';

  if (shelfProducts.length === 0) {
    emptyEl.style.display = 'block';
  } else {
    emptyEl.style.display = 'none';
    shelfProducts.forEach(p => {
      const item = document.createElement('div');
      item.className = 'product-item';
      const locLabel = p.loc ? p.loc.emoji + ' ' + getLocationName(p.loc) + ' · ' : '';
      item.innerHTML = '<span class="product-item-emoji">' + p.emoji + '</span><div class="product-item-info"><div class="product-item-name"></div><div class="product-item-days"></div></div><span class="product-item-arrow">›</span>';
      item.querySelector('.product-item-name').textContent = p.name;
      item.querySelector('.product-item-days').textContent = locLabel + daysText(p.days);
      item.addEventListener('click', () => openProduct(p.id));
      listEl.appendChild(item);
    });
  }

  setNevi(level);
  showScreen('list');
}

// DETALL
function openProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentProduct = p;
  const days = daysUntil(p.date);
  const loc = getLocationById(p.location || 'fridge');
  document.getElementById('product-emoji').textContent = p.emoji;
  document.getElementById('product-name').textContent = p.name;
  const locStr = loc ? loc.emoji + ' ' + getLocationName(loc) + ' · ' : '';
  const qtyStr = p.qty ? ' · ' + p.qty : '';
  document.getElementById('product-days').textContent = locStr + daysText(days) + qtyStr;
  showScreen('product');
}

// ACCIONS
function handleAction(action) {
  if (!currentProduct) return;
  const consumedProduct = currentProduct; // guardem referència abans d'esborrar
  products = products.filter(p => p.id !== currentProduct.id);

  if (action === 'consumed') { stats.consumed++; showToast(t('consumedMsg')); }
  else if (action === 'trashed') { stats.trashed++; showToast(t('trashedMsg')); }
  else showToast(t('deletedMsg'));

  saveData();
  renderHome();
  updateStatsSub();
  showScreen('home');
  currentProduct = null;

  // Pop-up: si s'ha consumit O llençat, oferir afegir a la llista de la compra
  if ((action === 'consumed' || action === 'trashed') && consumedProduct) {
    setTimeout(() => askAddToShoppingList(consumedProduct), 600);
  }
}

// Pregunta a l'usuari si vol afegir el producte consumit a la llista de la compra
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
    // Si només hi ha 1 supermercat, l'afegim directament
    if (supermarkets.length === 1) {
      addToShoppingList(supermarkets[0].id, product);
      showToast('🛒 ' + t('addedToShopping', supermarkets[0].name));
      return;
    }
    // Si n'hi ha més, mostrem el selector de supermercats
    showSupermarketPicker(product);
  });

  // Click fora del modal el tanca (= cancel·lar)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function addToShoppingList(supermarketId, product) {
  const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  shoppingItems.push({
    id, supermarketId,
    name: product.name,
    emoji: product.emoji,
    qty: '',
    notes: '',
    addedAt: Date.now()
  });
  saveShoppingData();
}

function showChangeZoneModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const zonesList = locations.map(loc => {
    const isSelected = loc.id === product.location;
    return `
      <button class="modal-zone-option${isSelected ? ' selected' : ''}" data-zone="${loc.id}">
        <span style="font-size:24px;margin-right:10px">${loc.emoji}</span>
        <span>${escapeHtml(getLocationName(loc))}</span>
      </button>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">📍</div>
      <p class="modal-title">${t('changeZone')}</p>
      <p class="modal-product-name">${escapeHtml(product.emoji + ' ' + product.name)}</p>
      <div class="modal-supermarket-list">${zonesList}</div>
      <button class="modal-cancel" id="modal-no-btn" style="margin-top:10px">${t('cancel')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.modal-zone-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const newZone = btn.dataset.zone;
      document.body.removeChild(overlay);
      if (newZone === product.location) return;
      // Pregunta si vol recalcular caducitat
      askRecalcExpiry(product, newZone);
    });
  });

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function askRecalcExpiry(product, newZone) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">📅</div>
      <p class="modal-title">${t('recalcExpiry')}</p>
      <p class="modal-sub">${t('recalcExpirySub')}</p>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('keepDate')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('recalc')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Aplicar canvi de zona en ambdós casos
  const applyZoneChange = (recalc) => {
    const p = products.find(x => x.id === product.id);
    if (!p) return;
    p.location = newZone;
    if (recalc) {
      // Si tenim baseDays a l'historial o als populars, recalcular
      const baseDays = (function() {
        const h = productHistory.find(x => x.name.toLowerCase() === p.name.toLowerCase());
        if (h && h.days) return h.days;
        const pop = (typeof getPopularProducts === 'function' ? getPopularProducts() : [])
          .find(x => x.name.toLowerCase() === p.name.toLowerCase());
        if (pop && pop.days) return pop.days;
        return 7;
      })();
      const finalDays = (typeof computeDaysForLocation === 'function')
        ? computeDaysForLocation(newZone, baseDays, [])
        : baseDays;
      const d = new Date();
      d.setDate(d.getDate() + finalDays);
      p.date = formatDateForInput(d);
    }
    saveData();
    // Refresc del detall
    openProductDetail(p);
    showToast('✓ ' + t('movedToZone') + ' ' + getLocationName(getLocationById(newZone)));
  };

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    applyZoneChange(false);
  });
  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    applyZoneChange(true);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      applyZoneChange(false);
    }
  });
}

function showEditQtyModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">${product.emoji}</div>
      <p class="modal-title">${t('editQtyTitle')}</p>
      <p class="modal-product-name">${escapeHtml(product.name)}</p>
      <p class="modal-sub">${t('editQtySub')}</p>
      <input type="text" id="modal-qty-input" class="modal-qty-input" placeholder="${t('quantityPlaceholder')}" value="${escapeHtml(product.qty || '')}" maxlength="20">
      <div class="modal-qty-suggestions">
        <button class="modal-qty-chip" data-val="100%">100%</button>
        <button class="modal-qty-chip" data-val="3/4">3/4</button>
        <button class="modal-qty-chip" data-val="1/2">1/2</button>
        <button class="modal-qty-chip" data-val="1/4">1/4</button>
      </div>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#modal-qty-input');
  setTimeout(() => input.focus(), 100);

  overlay.querySelectorAll('.modal-qty-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.val;
    });
  });

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    const newQty = input.value.trim();
    const p = products.find(x => x.id === product.id);
    if (p) {
      p.qty = newQty;
      saveData();
      const days = daysUntil(p.date);
      const loc = getLocationById(p.location || 'fridge');
      const locStr = loc ? loc.emoji + ' ' + getLocationName(loc) + ' · ' : '';
      const qtyStr = p.qty ? ' · ' + p.qty : '';
      document.getElementById('product-days').textContent = locStr + daysText(days) + qtyStr;
    }
    document.body.removeChild(overlay);
    showToast('✓ ' + t('saved'));
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function showSupermarketPicker(product) {
  // Crea modal dinàmic
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <p class="modal-title">${t('chooseSupermarket')}</p>
      <p class="modal-sub">${escapeHtml(product.emoji + ' ' + product.name)}</p>
      <div class="modal-options" id="modal-supermarket-options"></div>
      <button class="modal-cancel" id="modal-cancel-btn">${t('cancel')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const optionsContainer = overlay.querySelector('#modal-supermarket-options');
  const gradients = [
    ['#42A5F5', '#1565C0'], ['#26A69A', '#00695C'], ['#FFA726', '#E65100'],
    ['#AB47BC', '#7B1FA2'], ['#EF5350', '#C62828'], ['#66BB6A', '#388E3C'],
    ['#5C6BC0', '#3949AB']
  ];
  supermarkets.forEach((sm, idx) => {
    const [c1, c2] = gradients[idx % gradients.length];
    const btn = document.createElement('button');
    btn.className = 'modal-supermarket-btn';
    btn.style.background = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    btn.innerHTML = `<span class="modal-sm-emoji">${sm.emoji}</span><span class="modal-sm-name">${escapeHtml(sm.name)}</span>`;
    btn.addEventListener('click', () => {
      addToShoppingList(sm.id, product);
      showToast('🛒 ' + t('addedToShopping', sm.name));
      document.body.removeChild(overlay);
    });
    optionsContainer.appendChild(btn);
  });

  overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // Click fora del modal el tanca
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

// FORMULARI MANUAL
function openAddForm(prefill) {
  const nameInput = document.getElementById('input-name');
  const productName = prefill && prefill.name ? prefill.name : '';
  nameInput.value = productName;
  nameInput.placeholder = t('productNamePlaceholder');

  // Quantitat (si ve de la llista)
  const qtyInput = document.getElementById('input-qty');
  if (qtyInput) qtyInput.value = (prefill && prefill.qty) ? prefill.qty : '';

  // Reset checkbox "sense data"
  const noExpiry = document.getElementById('input-no-expiry');
  if (noExpiry) noExpiry.checked = false;

  // Amaga els suggeriments
  const suggBox = document.getElementById('name-suggestions');
  if (suggBox) suggBox.innerHTML = '';

  // Ubicació per defecte: prefill > història > endevinar > nevera
  let defaultLocation = prefill && prefill.location;
  if (!defaultLocation && productName) {
    const historyMatch = productHistory.find(p => p.name.toLowerCase() === productName.toLowerCase());
    if (historyMatch && historyMatch.location) {
      defaultLocation = historyMatch.location;
    }
    if (!defaultLocation) {
      defaultLocation = guessLocationFromName(productName);
    }
  }
  selectedLocation = defaultLocation || 'fridge';
  if (!getLocationById(selectedLocation)) selectedLocation = locations[0].id;
  renderLocationPicker();

  // Categories detectades del producte (per a la taula de congelació)
  currentCategories = (prefill && prefill.categories) || [];

  // Dies "normals" (a nevera/rebost) que ens dóna OFF o el manual
  const baseDays = (prefill && prefill.days) ? prefill.days : 7;

  // Calculem dies finals segons el tipus d'ubicació
  const finalDays = computeDaysForLocation(selectedLocation, baseDays, currentCategories);

  const d = new Date();
  d.setDate(d.getDate() + finalDays);
  document.getElementById('input-date').value = formatDateForInput(d);
  document.getElementById('input-date').dataset.baseDays = baseDays;

  selectedEmoji = prefill && prefill.emoji ? prefill.emoji : '🥛';
  renderEmojiPicker();

  // Avís especial quan ve d'escanejar
  const scanWarning = document.getElementById('scan-warning');
  if (scanWarning) {
    scanWarning.style.display = (prefill && prefill.fromScan) ? 'flex' : 'none';
  }

  showScreen('add');
  if (!prefill || !prefill.name) {
    setTimeout(() => nameInput.focus(), 250);
  }
}

// Configura l'input de nom amb suggeriments de l'historial
function setupNameAutocomplete() {
  const nameInput = document.getElementById('input-name');
  const suggBox = document.getElementById('name-suggestions');
  if (nameInput && suggBox) {
    setupAutocompleteFor(nameInput, suggBox, 'product');
  }

  // Mateix autocomplete a la pantalla de la llista de la compra
  const shopInput = document.getElementById('input-shopping-name');
  const shopSuggBox = document.getElementById('shopping-name-suggestions');
  if (shopInput && shopSuggBox) {
    setupAutocompleteFor(shopInput, shopSuggBox, 'shopping');
  }
}

function setupAutocompleteFor(input, suggBox, mode) {
  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length < 1) {
      suggBox.innerHTML = '';
      return;
    }
    const matches = searchProductHistory(q);
    if (matches.length === 0) {
      suggBox.innerHTML = '';
      return;
    }
    suggBox.innerHTML = '';
    matches.forEach(m => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'autocomplete-item';
      item.innerHTML = `<span>${m.emoji}</span> <span>${escapeHtml(m.name)}</span>`;
      item.addEventListener('click', () => {
        input.value = m.name;
        if (mode === 'shopping') {
          selectedShoppingEmoji = m.emoji;
          renderShoppingEmojiPickerBtn();
        } else {
          selectedEmoji = m.emoji;
          renderEmojiPicker();
          // Si ve d'un popular, també prefillem la data
          if (m.isPopular && m.days) {
            const d = new Date();
            d.setDate(d.getDate() + m.days);
            const dateInput = document.getElementById('input-date');
            if (dateInput) {
              dateInput.value = formatDateForInput(d);
              dateInput.dataset.baseDays = m.days;
            }
          }
        }
        suggBox.innerHTML = '';
      });
      suggBox.appendChild(item);
    });
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { suggBox.innerHTML = ''; }, 200);
  });
}

// Variable global per recordar les categories del producte actual
let currentCategories = [];

// Calcula dies segons la categoria de la ubicació
function computeDaysForLocation(locationId, baseDays, categories) {
  const loc = getLocationById(locationId);
  if (!loc) return baseDays;

  if (loc.category === 'freezer') {
    const freezerDays = lookupFreezerDays(categories);
    if (freezerDays > 0) return freezerDays;
    return 180; // 6 mesos per defecte si no detecta categoria
  }
  return baseDays;
}

// Busca a la taula FREEZER_DAYS (agafa el màxim que coincideixi)
function lookupFreezerDays(categories) {
  if (!categories || categories.length === 0) return 0;
  const allText = categories.map(c => String(c).toLowerCase()).join(' ');
  let maxDays = 0;
  for (const key in FREEZER_DAYS) {
    if (allText.includes(key.toLowerCase())) {
      if (FREEZER_DAYS[key] > maxDays) maxDays = FREEZER_DAYS[key];
    }
  }
  return maxDays;
}

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

function formatDateForInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

function saveNewProduct() {
  const name = document.getElementById('input-name').value.trim();
  const date = document.getElementById('input-date').value;
  const noExpiry = document.getElementById('input-no-expiry');
  const noExpiryChecked = noExpiry && noExpiry.checked;
  const qtyInput = document.getElementById('input-qty');
  const qty = qtyInput ? qtyInput.value.trim() : '';

  if (!name) { showToast(t('needName')); return; }
  if (!date && !noExpiryChecked) { showToast(t('needDate')); return; }

  // Calcula dies aproximats per a l'aprenentatge automàtic
  let approxDays = null;
  if (date) {
    const d = new Date(date);
    const now = new Date();
    approxDays = Math.round((d - now) / (1000 * 60 * 60 * 24));
  }

  recordProductInHistory(name, selectedEmoji, selectedLocation, approxDays);

  products.push({
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    name: name,
    emoji: selectedEmoji,
    date: noExpiryChecked ? null : date,
    noExpiry: noExpiryChecked,
    location: selectedLocation,
    qty: qty,
    addedAt: new Date().toISOString()
  });

  saveData();

  // Si veníem de la llista de la compra, traiem l'item d'allà i tornem a comprar
  if (pendingShoppingItemId) {
    const fromShopping = pendingShoppingSupermarketId; // recordem el supermercat
    shoppingItems = shoppingItems.filter(it => it.id !== pendingShoppingItemId);
    saveShoppingData();
    pendingShoppingItemId = null;

    // Si estem en mode de compra guiada, continuem comprant
    if (fromShopping) {
      pendingShoppingSupermarketId = null;
      currentSupermarketId = fromShopping;
      renderShoppingItems();
      showScreen('supermarket');
      showToast('✅ ' + selectedEmoji + ' ' + name + ' ' + t('addedFromShopping'));
      return;
    }

    pendingShoppingSupermarketId = null;
    renderHome();
    showScreen('home');
    showToast('✅ ' + selectedEmoji + ' ' + name + ' ' + t('addedFromShopping'));
  } else {
    renderHome();
    showScreen('home');
    showToast(selectedEmoji + ' ' + name + ' ' + t('added'));
  }
}

// Historial de productes ja escrits/comprats per recuperar com a suggeriments
let productHistory = []; // [{name, emoji, count, lastUsed}]

function loadProductHistory() {
  try {
    const raw = localStorage.getItem('eatmefirst_product_history');
    if (raw) productHistory = JSON.parse(raw);
  } catch(e) { productHistory = []; }
}

// Endevina la zona d'emmagatzematge segons el nom del producte
function recordProductInHistory(name, emoji, location, days) {
  const key = name.toLowerCase().trim();
  const existing = productHistory.find(p => p.name.toLowerCase() === key);
  if (existing) {
    existing.count++;
    existing.lastUsed = Date.now();
    if (emoji) existing.emoji = emoji;
    if (location) existing.location = location;
    if (days) existing.days = days;
  } else {
    productHistory.push({ name, emoji: emoji || '🥛', location, days, count: 1, lastUsed: Date.now() });
  }
  productHistory.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
  if (productHistory.length > 50) productHistory = productHistory.slice(0, 50);
  localStorage.setItem('eatmefirst_product_history', JSON.stringify(productHistory));

  // APRENENTATGE: 2+ vegades → es converteix en popular
  if (existing && existing.count >= 2) {
    addToCustomPopular(name, emoji || existing.emoji, days || existing.days || 7);
  }
}

function addToCustomPopular(name, emoji, days) {
  const list = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
  if (list.find(p => p.name.toLowerCase() === name.toLowerCase())) return;
  list.push({
    id: 'pop-learned-' + Date.now(),
    name, emoji, days
  });
  if (typeof savePopularProducts === 'function') savePopularProducts(list);
}

// Endevina la zona segons el nom del producte
function guessLocationFromName(name) {
  const n = name.toLowerCase();

  const fruitsVeg = ['poma', 'pera', 'plàtan', 'platano', 'banana', 'taronja', 'mandarina', 'maduixa', 'fresa',
    'kiwi', 'pinya', 'mango', 'raïm', 'uva', 'cirera', 'cereza', 'préssec', 'melocoton',
    'meló', 'síndria', 'sandia', 'tomàquet', 'tomate', 'enciam', 'lechuga', 'pastanaga', 'zanahoria',
    'pebrot', 'pimiento', 'cogombre', 'pepino', 'ceba', 'cebolla', 'all', 'patata',
    'carbassó', 'calabacin', 'bròquil', 'brocoli', 'coliflor', 'espinac', 'espinacas',
    'apple', 'orange', 'strawberry', 'tomato', 'lettuce', 'carrot', 'pepper', 'onion', 'garlic'];

  const meatFish = ['pollastre', 'pollo', 'carn', 'carne', 'vedella', 'ternera', 'porc', 'cerdo',
    'salsitxa', 'salchicha', 'embotit', 'embutido', 'pernil', 'jamon', 'xoriço', 'chorizo',
    'peix', 'pescado', 'salmó', 'salmon', 'tonyina', 'atun', 'bacallà', 'bacalao', 'lluç', 'merluza',
    'gamba', 'sípia', 'pop', 'calamar',
    'chicken', 'beef', 'pork', 'fish', 'shrimp'];

  const pantryItems = ['pasta', 'espagueti', 'macarroni', 'arròs', 'arroz', 'rice',
    'farina', 'harina', 'flour', 'sucre', 'azucar', 'sugar', 'sal', 'salt',
    'oli', 'aceite', 'oil', 'vinagre', 'vinegar', 'cigró', 'garbanzo', 'llentia', 'lenteja',
    'mongeta', 'judia', 'galeta', 'galleta', 'cookie', 'cereal', 'cafe', 'café', 'coffee',
    'te', 'tea', 'xocolata', 'chocolate', 'cacau', 'cacao', 'mel', 'miel', 'honey',
    'conserva', 'sardina'];

  const dairy = ['llet', 'leche', 'milk', 'iogurt', 'yogur', 'yoghurt', 'formatge', 'queso', 'cheese',
    'mantega', 'mantequilla', 'butter', 'nata', 'cream', 'ou', 'huevo', 'egg'];

  const medicine = ['paracetamol', 'ibuprofen', 'aspirina', 'aspirin', 'pastilla', 'pill', 'medicina',
    'medicine', 'xarop', 'jarabe', 'venda', 'tirita', 'apósito'];

  for (const w of medicine) if (n.includes(w)) return 'medicine';
  for (const w of fruitsVeg) if (n.includes(w)) return 'fruit_bowl';
  for (const w of meatFish) if (n.includes(w)) return 'fridge';
  for (const w of dairy) if (n.includes(w)) return 'fridge';
  for (const w of pantryItems) if (n.includes(w)) return 'pantry';

  return null;
}

function searchProductHistory(query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();

  // Combina historial + productes populars
  const fromHistory = productHistory.filter(p => p.name.toLowerCase().includes(q));
  const fromPopular = getPopularProducts()
    .filter(p => p.name.toLowerCase().includes(q))
    .map(p => ({ name: p.name, emoji: p.emoji, days: p.days, isPopular: true }));

  // Combinem sense duplicats (mateix nom)
  const result = [...fromHistory];
  fromPopular.forEach(pop => {
    if (!result.find(r => r.name.toLowerCase() === pop.name.toLowerCase())) {
      result.push(pop);
    }
  });

  return result.slice(0, 6);
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
  if (mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  localStorage.setItem('eatmefirst_theme', mode);
  updateThemeStatus();
}

function updateThemeStatus() {
  const mode = localStorage.getItem('eatmefirst_theme') || 'auto';
  const key = mode === 'auto' ? 'themeAuto' : mode === 'light' ? 'themeLight' : 'themeDark';
  const el = document.getElementById('theme-status');
  if (el) el.textContent = t(key);
}

function cycleTheme() {
  const current = localStorage.getItem('eatmefirst_theme') || 'auto';
  const next = current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
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

function renderLangList() {
  const container = document.getElementById('lang-list');
  container.innerHTML = '';
  const currentLang = getCurrentLang();

  // Banderes SVG (es veuen a TOTS els dispositius, inclòs Windows)
  const FLAGS = {
    ca: '<svg viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg"><rect width="9" height="6" fill="#FCDD09"/><rect y="0.67" width="9" height="0.67" fill="#DA121A"/><rect y="2" width="9" height="0.67" fill="#DA121A"/><rect y="3.33" width="9" height="0.67" fill="#DA121A"/><rect y="4.67" width="9" height="0.67" fill="#DA121A"/></svg>',
    en: '<svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg"><clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#t)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></svg>',
    ja: '<svg viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg"><rect width="9" height="6" fill="#fff"/><circle cx="4.5" cy="3" r="1.8" fill="#BC002D"/></svg>',
    zh: '<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#DE2910"/><polygon points="5,2 5.6,3.8 7.5,3.8 6,4.9 6.6,6.7 5,5.6 3.4,6.7 4,4.9 2.5,3.8 4.4,3.8" fill="#FFDE00"/><polygon points="10,1 10.2,1.6 10.8,1.6 10.3,2 10.5,2.6 10,2.2 9.5,2.6 9.7,2 9.2,1.6 9.8,1.6" fill="#FFDE00"/><polygon points="12,3 12.2,3.6 12.8,3.6 12.3,4 12.5,4.6 12,4.2 11.5,4.6 11.7,4 11.2,3.6 11.8,3.6" fill="#FFDE00"/><polygon points="12,6 12.2,6.6 12.8,6.6 12.3,7 12.5,7.6 12,7.2 11.5,7.6 11.7,7 11.2,6.6 11.8,6.6" fill="#FFDE00"/><polygon points="10,8 10.2,8.6 10.8,8.6 10.3,9 10.5,9.6 10,9.2 9.5,9.6 9.7,9 9.2,8.6 9.8,8.6" fill="#FFDE00"/></svg>',
    ko: '<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#fff"/><g transform="translate(15,10) rotate(-56.31)"><circle r="4" fill="#fff" stroke="#000" stroke-width="0.05"/><path d="M-4,0 a4,4 0 0,1 8,0 a2,2 0 0,1 -4,0 a2,2 0 0,0 -4,0z" fill="#CD2E3A"/><path d="M-4,0 a4,4 0 0,0 8,0 a2,2 0 0,0 -4,0 a2,2 0 0,1 -4,0z" fill="#0047A0"/></g><g fill="#000" stroke="none"><g transform="translate(15,10) rotate(33.69) translate(7.5,0)"><rect x="-1.4" y="-0.4" width="2.8" height="0.5"/><rect x="-1.4" y="0.3" width="2.8" height="0.5"/><rect x="-1.4" y="-1.1" width="2.8" height="0.5"/></g><g transform="translate(15,10) rotate(33.69) translate(-7.5,0)"><rect x="-1.4" y="-1.1" width="2.8" height="0.5"/><rect x="-1.4" y="-0.4" width="1.2" height="0.5"/><rect x="0.2" y="-0.4" width="1.2" height="0.5"/><rect x="-1.4" y="0.3" width="1.2" height="0.5"/><rect x="0.2" y="0.3" width="1.2" height="0.5"/></g><g transform="translate(15,10) rotate(-33.69) translate(7.5,0)"><rect x="-1.4" y="-1.1" width="2.8" height="0.5"/><rect x="-1.4" y="-0.4" width="1.2" height="0.5"/><rect x="0.2" y="-0.4" width="1.2" height="0.5"/><rect x="-1.4" y="0.3" width="2.8" height="0.5"/></g><g transform="translate(15,10) rotate(-33.69) translate(-7.5,0)"><rect x="-1.4" y="-1.1" width="1.2" height="0.5"/><rect x="0.2" y="-1.1" width="1.2" height="0.5"/><rect x="-1.4" y="-0.4" width="1.2" height="0.5"/><rect x="0.2" y="-0.4" width="1.2" height="0.5"/><rect x="-1.4" y="0.3" width="1.2" height="0.5"/><rect x="0.2" y="0.3" width="1.2" height="0.5"/></g></g></svg>',
    de: '<svg viewBox="0 0 5 3" xmlns="http://www.w3.org/2000/svg"><rect width="5" height="1" y="0" fill="#000"/><rect width="5" height="1" y="1" fill="#DD0000"/><rect width="5" height="1" y="2" fill="#FFCE00"/></svg>',
    fr: '<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="2" x="0" fill="#0055A4"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2" x="2" fill="#EF4135"/></svg>',
    es: '<svg viewBox="0 0 5 3" xmlns="http://www.w3.org/2000/svg"><rect width="5" height="3" fill="#AA151B"/><rect width="5" height="1.5" y="0.75" fill="#F1BF00"/></svg>',
    it: '<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="2" x="0" fill="#009246"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2" x="2" fill="#CE2B37"/></svg>',
    pt: '<svg viewBox="0 0 6 4" xmlns="http://www.w3.org/2000/svg"><rect width="6" height="4" fill="#FF0000"/><rect width="2.4" height="4" fill="#006600"/><circle cx="2.4" cy="2" r="0.7" fill="#FFE500" stroke="#000" stroke-width="0.05"/><circle cx="2.4" cy="2" r="0.4" fill="#FF0000"/></svg>',
    nl: '<svg viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg"><rect width="9" height="2" y="0" fill="#AE1C28"/><rect width="9" height="2" y="2" fill="#fff"/><rect width="9" height="2" y="4" fill="#21468B"/></svg>'
  };

  const NATIVE = {
    ca: 'Català', en: 'English', ja: '日本語', zh: '中文', ko: '한국어',
    de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano',
    pt: 'Português', nl: 'Nederlands'
  };

  const LANG_LABELS = {
    ca: { ca: 'Català', en: 'Anglès', ja: 'Japonès', zh: 'Xinès', ko: 'Coreà', de: 'Alemany', fr: 'Francès', es: 'Espanyol', it: 'Italià', pt: 'Portuguès', nl: 'Neerlandès' },
    en: { ca: 'Catalan', en: 'English', ja: 'Japanese', zh: 'Chinese', ko: 'Korean', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese', nl: 'Dutch' },
    es: { ca: 'Catalán', en: 'Inglés', ja: 'Japonés', zh: 'Chino', ko: 'Coreano', de: 'Alemán', fr: 'Francés', es: 'Español', it: 'Italiano', pt: 'Portugués', nl: 'Neerlandés' },
    fr: { ca: 'Catalan', en: 'Anglais', ja: 'Japonais', zh: 'Chinois', ko: 'Coréen', de: 'Allemand', fr: 'Français', es: 'Espagnol', it: 'Italien', pt: 'Portugais', nl: 'Néerlandais' },
    de: { ca: 'Katalanisch', en: 'Englisch', ja: 'Japanisch', zh: 'Chinesisch', ko: 'Koreanisch', de: 'Deutsch', fr: 'Französisch', es: 'Spanisch', it: 'Italienisch', pt: 'Portugiesisch', nl: 'Niederländisch' },
    it: { ca: 'Catalano', en: 'Inglese', ja: 'Giapponese', zh: 'Cinese', ko: 'Coreano', de: 'Tedesco', fr: 'Francese', es: 'Spagnolo', it: 'Italiano', pt: 'Portoghese', nl: 'Olandese' },
    pt: { ca: 'Catalão', en: 'Inglês', ja: 'Japonês', zh: 'Chinês', ko: 'Coreano', de: 'Alemão', fr: 'Francês', es: 'Espanhol', it: 'Italiano', pt: 'Português', nl: 'Holandês' },
    nl: { ca: 'Catalaans', en: 'Engels', ja: 'Japans', zh: 'Chinees', ko: 'Koreaans', de: 'Duits', fr: 'Frans', es: 'Spaans', it: 'Italiaans', pt: 'Portugees', nl: 'Nederlands' },
    ja: { ca: 'カタルーニャ語', en: '英語', ja: '日本語', zh: '中国語', ko: '韓国語', de: 'ドイツ語', fr: 'フランス語', es: 'スペイン語', it: 'イタリア語', pt: 'ポルトガル語', nl: 'オランダ語' },
    zh: { ca: '加泰罗尼亚语', en: '英语', ja: '日语', zh: '中文', ko: '韩语', de: '德语', fr: '法语', es: '西班牙语', it: '意大利语', pt: '葡萄牙语', nl: '荷兰语' },
    ko: { ca: '카탈루냐어', en: '영어', ja: '일본어', zh: '중국어', ko: '한국어', de: '독일어', fr: '프랑스어', es: '스페인어', it: '이탈리아어', pt: '포르투갈어', nl: '네덜란드어' }
  };

  const labels = LANG_LABELS[currentLang] || LANG_LABELS.en;

  Object.keys(NATIVE).forEach(code => {
    const btn = document.createElement('button');
    btn.className = 'lang-item' + (code === currentLang ? ' active' : '');

    const flag = document.createElement('span');
    flag.className = 'lang-flag';
    flag.innerHTML = FLAGS[code];

    const info = document.createElement('div');
    info.className = 'lang-info';

    const name = document.createElement('div');
    name.className = 'lang-name';
    name.textContent = NATIVE[code];

    const sub = document.createElement('div');
    sub.className = 'lang-native';
    if (code !== currentLang && NATIVE[code] !== labels[code]) {
      sub.textContent = labels[code];
    }

    const check = document.createElement('span');
    check.className = 'lang-check';
    check.textContent = '✓';

    info.appendChild(name);
    if (sub.textContent) info.appendChild(sub);
    btn.appendChild(flag);
    btn.appendChild(info);
    btn.appendChild(check);

    btn.addEventListener('click', () => {
      localStorage.setItem('eatmefirst_lang', code);
      translatePage();
      renderLangList();
      showToast('✓ ' + NATIVE[code]);
      setTimeout(() => showScreen('settings'), 400);
    });

    container.appendChild(btn);
  });
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

// TOAST
let toastTimer = null;
function showToast(msg) {
  const tt = document.getElementById('toast');
  tt.textContent = msg;
  tt.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => tt.classList.remove('show'), 2000);
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
  loadProductHistory();

  const savedTheme = localStorage.getItem('eatmefirst_theme') || 'auto';
  applyTheme(savedTheme);

  translatePage();

  // Mostra la pantalla de benvinguda si no l'hem fet servir mai
  showWelcomeIfNeeded();

  // Configura l'autocomplete del formulari d'afegir producte
  setupNameAutocomplete();

  // Botó "Afegeix al BuyMe" des del detall del producte
  const btnAddToBuyMe = document.getElementById('btn-add-to-buyme');
  if (btnAddToBuyMe) btnAddToBuyMe.addEventListener('click', () => {
    if (!currentProduct) return;
    askAddToShoppingList(currentProduct);
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

let popularMode = 'view'; // 'view' o 'edit'
let popularOrigin = 'home'; // d'on s'ha obert: 'home', 'shopping', 'settings'

function openPopular(origin) {
  popularOrigin = origin || 'home';
  popularMode = 'view';
  const backBtn = document.querySelector('#screen-popular .back-btn');
  if (backBtn) backBtn.dataset.back = popularOrigin === 'settings' ? 'settings' : 'home';
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

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderHome();
  else stopScanner();
});
