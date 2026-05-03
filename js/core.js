/* ============================================
   Buyte — js/core.js
   Constants globals i helpers compartits.
   Carregat abans de la resta de mòduls.
   ============================================ */


// Base de dades de productes populars del supermercat
// Format: nom en cada idioma, emoji, dies de caducitat per defecte, location (zona d'emmagatzematge canònica)
const POPULAR_PRODUCTS = [
  // Làctics → nevera
  { ca: 'Llet', es: 'Leche', en: 'Milk', fr: 'Lait', it: 'Latte', de: 'Milch', pt: 'Leite', nl: 'Melk', ja: '牛乳', zh: '牛奶', ko: '우유', emoji: '🥛', days: 7, location: 'fridge', price: 1.20, weight: '1L' },
  { ca: 'Iogurt natural', es: 'Yogur natural', en: 'Plain yogurt', fr: 'Yaourt nature', it: 'Yogurt naturale', de: 'Naturjoghurt', pt: 'Iogurte natural', nl: 'Yoghurt', ja: 'ヨーグルト', zh: '酸奶', ko: '요구르트', emoji: '🥛', days: 14, location: 'fridge', price: 0.40, weight: '125g' },
  { ca: 'Formatge', es: 'Queso', en: 'Cheese', fr: 'Fromage', it: 'Formaggio', de: 'Käse', pt: 'Queijo', nl: 'Kaas', ja: 'チーズ', zh: '奶酪', ko: '치즈', emoji: '🧀', days: 21, location: 'fridge', price: 3.00, weight: '250g' },
  { ca: 'Mantega', es: 'Mantequilla', en: 'Butter', fr: 'Beurre', it: 'Burro', de: 'Butter', pt: 'Manteiga', nl: 'Boter', ja: 'バター', zh: '黄油', ko: '버터', emoji: '🧈', days: 30, location: 'fridge', price: 2.00, weight: '250g' },
  // Fresc → nevera
  { ca: 'Ous', es: 'Huevos', en: 'Eggs', fr: 'Œufs', it: 'Uova', de: 'Eier', pt: 'Ovos', nl: 'Eieren', ja: '卵', zh: '鸡蛋', ko: '계란', emoji: '🥚', days: 21, location: 'fridge', price: 2.00 },
  { ca: 'Pollastre', es: 'Pollo', en: 'Chicken', fr: 'Poulet', it: 'Pollo', de: 'Hähnchen', pt: 'Frango', nl: 'Kip', ja: '鶏肉', zh: '鸡肉', ko: '닭고기', emoji: '🍗', days: 3, location: 'fridge', price: 6.00, weight: '1kg' },
  { ca: 'Carn picada', es: 'Carne picada', en: 'Ground beef', fr: 'Viande hachée', it: 'Carne macinata', de: 'Hackfleisch', pt: 'Carne moída', nl: 'Gehakt', ja: 'ひき肉', zh: '绞肉', ko: '다진 고기', emoji: '🥩', days: 3, location: 'fridge', price: 6.00, weight: '500g' },
  { ca: 'Peix fresc', es: 'Pescado fresco', en: 'Fresh fish', fr: 'Poisson frais', it: 'Pesce fresco', de: 'Frischer Fisch', pt: 'Peixe fresco', nl: 'Verse vis', ja: '魚', zh: '鱼', ko: '생선', emoji: '🐟', days: 2, location: 'fridge', price: 7.00, weight: '500g' },
  // Fruites → fruiter (taula); maduixa millor a la nevera
  { ca: 'Plàtans', es: 'Plátanos', en: 'Bananas', fr: 'Bananes', it: 'Banane', de: 'Bananen', pt: 'Bananas', nl: 'Bananen', ja: 'バナナ', zh: '香蕉', ko: '바나나', emoji: '🍌', days: 5, location: 'fruit_bowl', price: 0.20 },
  { ca: 'Pomes', es: 'Manzanas', en: 'Apples', fr: 'Pommes', it: 'Mele', de: 'Äpfel', pt: 'Maçãs', nl: 'Appels', ja: 'りんご', zh: '苹果', ko: '사과', emoji: '🍎', days: 14, location: 'fruit_bowl', price: 0.30 },
  { ca: 'Maduixes', es: 'Fresas', en: 'Strawberries', fr: 'Fraises', it: 'Fragole', de: 'Erdbeeren', pt: 'Morangos', nl: 'Aardbeien', ja: 'いちご', zh: '草莓', ko: '딸기', emoji: '🍓', days: 3, location: 'fridge', price: 3.00, weight: '500g' },
  { ca: 'Taronges', es: 'Naranjas', en: 'Oranges', fr: 'Oranges', it: 'Arance', de: 'Orangen', pt: 'Laranjas', nl: 'Sinaasappels', ja: 'オレンジ', zh: '橙子', ko: '오렌지', emoji: '🍊', days: 14, location: 'fruit_bowl', price: 0.30 },
  // Verdures → tomàquet a fruiter; la resta a la nevera; patates/cebes al rebost
  { ca: 'Tomàquets', es: 'Tomates', en: 'Tomatoes', fr: 'Tomates', it: 'Pomodori', de: 'Tomaten', pt: 'Tomates', nl: 'Tomaten', ja: 'トマト', zh: '番茄', ko: '토마토', emoji: '🍅', days: 5, location: 'fruit_bowl', price: 0.30 },
  { ca: 'Enciam', es: 'Lechuga', en: 'Lettuce', fr: 'Laitue', it: 'Lattuga', de: 'Salat', pt: 'Alface', nl: 'Sla', ja: 'レタス', zh: '生菜', ko: '상추', emoji: '🥬', days: 5, location: 'fruit_bowl', price: 1.50 },
  { ca: 'Pastanagues', es: 'Zanahorias', en: 'Carrots', fr: 'Carottes', it: 'Carote', de: 'Karotten', pt: 'Cenouras', nl: 'Wortels', ja: 'にんじん', zh: '胡萝卜', ko: '당근', emoji: '🥕', days: 14, location: 'fruit_bowl', price: 0.20 },
  { ca: 'Patates', es: 'Patatas', en: 'Potatoes', fr: 'Pommes de terre', it: 'Patate', de: 'Kartoffeln', pt: 'Batatas', nl: 'Aardappels', ja: 'じゃがいも', zh: '土豆', ko: '감자', emoji: '🥔', days: 30, location: 'pantry', price: 0.20 },
  { ca: 'Cebes', es: 'Cebollas', en: 'Onions', fr: 'Oignons', it: 'Cipolle', de: 'Zwiebeln', pt: 'Cebolas', nl: 'Uien', ja: '玉ねぎ', zh: '洋葱', ko: '양파', emoji: '🧅', days: 30, location: 'pantry', price: 0.20 },
  // Forn → rebost
  { ca: 'Pa', es: 'Pan', en: 'Bread', fr: 'Pain', it: 'Pane', de: 'Brot', pt: 'Pão', nl: 'Brood', ja: 'パン', zh: '面包', ko: '빵', emoji: '🥖', days: 4, location: 'pantry', price: 1.20, weight: '250g' },
  { ca: 'Pa de motlle', es: 'Pan de molde', en: 'Sliced bread', fr: 'Pain de mie', it: 'Pancarré', de: 'Toastbrot', pt: 'Pão de fôrma', nl: 'Casinobrood', ja: '食パン', zh: '吐司面包', ko: '식빵', emoji: '🍞', days: 7, location: 'pantry', price: 2.00, weight: '500g' },
  // Rebost
  { ca: 'Pasta', es: 'Pasta', en: 'Pasta', fr: 'Pâtes', it: 'Pasta', de: 'Nudeln', pt: 'Massa', nl: 'Pasta', ja: 'パスタ', zh: '意面', ko: '파스타', emoji: '🍝', days: 365, location: 'pantry', price: 1.00, weight: '500g' },
  { ca: 'Arròs', es: 'Arroz', en: 'Rice', fr: 'Riz', it: 'Riso', de: 'Reis', pt: 'Arroz', nl: 'Rijst', ja: '米', zh: '大米', ko: '쌀', emoji: '🍚', days: 365, location: 'pantry', price: 2.00, weight: '1kg' },
  { ca: 'Oli d\'oliva', es: 'Aceite de oliva', en: 'Olive oil', fr: 'Huile d\'olive', it: 'Olio d\'oliva', de: 'Olivenöl', pt: 'Azeite', nl: 'Olijfolie', ja: 'オリーブオイル', zh: '橄榄油', ko: '올리브유', emoji: '🫒', days: 365, location: 'pantry', price: 8.00, weight: '1L' },
  { ca: 'Conserva (tonyina)', es: 'Conserva (atún)', en: 'Canned tuna', fr: 'Thon en conserve', it: 'Tonno in scatola', de: 'Thunfisch in Dose', pt: 'Atum em lata', nl: 'Tonijn in blik', ja: 'ツナ缶', zh: '金枪鱼罐头', ko: '참치캔', emoji: '🥫', days: 365, location: 'pantry', price: 1.50 },
  // Dolços → rebost
  { ca: 'Xocolata', es: 'Chocolate', en: 'Chocolate', fr: 'Chocolat', it: 'Cioccolato', de: 'Schokolade', pt: 'Chocolate', nl: 'Chocolade', ja: 'チョコレート', zh: '巧克力', ko: '초콜릿', emoji: '🍫', days: 60, location: 'pantry', price: 1.50, weight: '100g' },
  { ca: 'Galetes', es: 'Galletas', en: 'Cookies', fr: 'Biscuits', it: 'Biscotti', de: 'Kekse', pt: 'Bolachas', nl: 'Koekjes', ja: 'クッキー', zh: '饼干', ko: '쿠키', emoji: '🍪', days: 90, location: 'pantry', price: 1.50, weight: '300g' },
  // Begudes → aigua al rebost; suc a la nevera
  { ca: 'Aigua', es: 'Agua', en: 'Water', fr: 'Eau', it: 'Acqua', de: 'Wasser', pt: 'Água', nl: 'Water', ja: '水', zh: '水', ko: '물', emoji: '💧', days: 365, location: 'pantry', price: 0.50, weight: '1.5L' },
  { ca: 'Suc de taronja', es: 'Zumo de naranja', en: 'Orange juice', fr: 'Jus d\'orange', it: 'Succo d\'arancia', de: 'Orangensaft', pt: 'Suco de laranja', nl: 'Sinaasappelsap', ja: 'オレンジジュース', zh: '橙汁', ko: '오렌지 주스', emoji: '🧃', days: 7, location: 'fridge', price: 2.00, weight: '1L' }
];

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

// Botigues bàsiques (les mateixes per a tots els països)
const BASIC_SHOPS = [
  { id: 'sm-shop-butcher', nameKey: 'shopButcher', emoji: '🥩' },
  { id: 'sm-shop-fishmonger', nameKey: 'shopFishmonger', emoji: '🐟' },
  { id: 'sm-shop-greengrocer', nameKey: 'shopGreengrocer', emoji: '🥬' },
  { id: 'sm-shop-pharmacy', nameKey: 'shopPharmacy', emoji: '💊' },
  { id: 'sm-shop-bakery', nameKey: 'shopBakery', emoji: '🥖' }
];

// Banderes SVG per al picker de país (es veuen a tots els dispositius, inclòs Windows)
const COUNTRY_FLAG_SVG = {
  ES: '<svg viewBox="0 0 5 3" xmlns="http://www.w3.org/2000/svg"><rect width="5" height="3" fill="#AA151B"/><rect width="5" height="1.5" y="0.75" fill="#F1BF00"/></svg>',
  FR: '<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="2" x="0" fill="#0055A4"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2" x="2" fill="#EF4135"/></svg>',
  IT: '<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="2" x="0" fill="#009246"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2" x="2" fill="#CE2B37"/></svg>',
  DE: '<svg viewBox="0 0 5 3" xmlns="http://www.w3.org/2000/svg"><rect width="5" height="1" y="0" fill="#000"/><rect width="5" height="1" y="1" fill="#DD0000"/><rect width="5" height="1" y="2" fill="#FFCE00"/></svg>',
  PT: '<svg viewBox="0 0 6 4" xmlns="http://www.w3.org/2000/svg"><rect width="6" height="4" fill="#FF0000"/><rect width="2.4" height="4" fill="#006600"/><circle cx="2.4" cy="2" r="0.7" fill="#FFE500" stroke="#000" stroke-width="0.05"/><circle cx="2.4" cy="2" r="0.4" fill="#FF0000"/></svg>',
  NL: '<svg viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg"><rect width="9" height="2" y="0" fill="#AE1C28"/><rect width="9" height="2" y="2" fill="#fff"/><rect width="9" height="2" y="4" fill="#21468B"/></svg>',
  GB: '<svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg"><clipPath id="t-gb"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#t-gb)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></svg>',
  US: '<svg viewBox="0 0 19 10" xmlns="http://www.w3.org/2000/svg"><rect width="19" height="10" fill="#FFFFFF"/><rect width="19" height="0.77" y="0" fill="#B22234"/><rect width="19" height="0.77" y="1.54" fill="#B22234"/><rect width="19" height="0.77" y="3.08" fill="#B22234"/><rect width="19" height="0.77" y="4.62" fill="#B22234"/><rect width="19" height="0.77" y="6.15" fill="#B22234"/><rect width="19" height="0.77" y="7.69" fill="#B22234"/><rect width="19" height="0.77" y="9.23" fill="#B22234"/><rect width="7.6" height="5.38" fill="#3C3B6E"/></svg>',
  JP: '<svg viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg"><rect width="9" height="6" fill="#fff"/><circle cx="4.5" cy="3" r="1.8" fill="#BC002D"/></svg>',
  CN: '<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#DE2910"/><polygon points="5,2 5.6,3.8 7.5,3.8 6,4.9 6.6,6.7 5,5.6 3.4,6.7 4,4.9 2.5,3.8 4.4,3.8" fill="#FFDE00"/><polygon points="10,1 10.2,1.6 10.8,1.6 10.3,2 10.5,2.6 10,2.2 9.5,2.6 9.7,2 9.2,1.6 9.8,1.6" fill="#FFDE00"/><polygon points="12,3 12.2,3.6 12.8,3.6 12.3,4 12.5,4.6 12,4.2 11.5,4.6 11.7,4 11.2,3.6 11.8,3.6" fill="#FFDE00"/><polygon points="12,6 12.2,6.6 12.8,6.6 12.3,7 12.5,7.6 12,7.2 11.5,7.6 11.7,7 11.2,6.6 11.8,6.6" fill="#FFDE00"/><polygon points="10,8 10.2,8.6 10.8,8.6 10.3,9 10.5,9.6 10,9.2 9.5,9.6 9.7,9 9.2,8.6 9.8,8.6" fill="#FFDE00"/></svg>',
  KR: '<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#fff"/><g transform="translate(15,10) rotate(-56.31)"><circle r="4" fill="#fff" stroke="#000" stroke-width="0.05"/><path d="M-4,0 a4,4 0 0,1 8,0 a2,2 0 0,1 -4,0 a2,2 0 0,0 -4,0z" fill="#CD2E3A"/><path d="M-4,0 a4,4 0 0,0 8,0 a2,2 0 0,0 -4,0 a2,2 0 0,1 -4,0z" fill="#0047A0"/></g><g fill="#000" stroke="none"><g transform="translate(15,10) rotate(33.69) translate(7.5,0)"><rect x="-1.4" y="-0.4" width="2.8" height="0.5"/><rect x="-1.4" y="0.3" width="2.8" height="0.5"/><rect x="-1.4" y="-1.1" width="2.8" height="0.5"/></g><g transform="translate(15,10) rotate(33.69) translate(-7.5,0)"><rect x="-1.4" y="-1.1" width="2.8" height="0.5"/><rect x="-1.4" y="-0.4" width="1.2" height="0.5"/><rect x="0.2" y="-0.4" width="1.2" height="0.5"/><rect x="-1.4" y="0.3" width="1.2" height="0.5"/><rect x="0.2" y="0.3" width="1.2" height="0.5"/></g><g transform="translate(15,10) rotate(-33.69) translate(7.5,0)"><rect x="-1.4" y="-1.1" width="2.8" height="0.5"/><rect x="-1.4" y="-0.4" width="1.2" height="0.5"/><rect x="0.2" y="-0.4" width="1.2" height="0.5"/><rect x="-1.4" y="0.3" width="2.8" height="0.5"/></g><g transform="translate(15,10) rotate(-33.69) translate(-7.5,0)"><rect x="-1.4" y="-1.1" width="1.2" height="0.5"/><rect x="0.2" y="-1.1" width="1.2" height="0.5"/><rect x="-1.4" y="-0.4" width="1.2" height="0.5"/><rect x="0.2" y="-0.4" width="1.2" height="0.5"/><rect x="-1.4" y="0.3" width="1.2" height="0.5"/><rect x="0.2" y="0.3" width="1.2" height="0.5"/></g></g></svg>'
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// Renderitza "nom + quantitat" amb separació visual neta (sense punt mig
// ni símbol ×). Si la qty és buida retorna només el nom escapat.
function formatProductLine(name, qty) {
  const safeName = escapeHtml(name);
  if (qty === null || qty === undefined || String(qty).trim() === '') return safeName;
  return safeName + '<span class="prod-qty">' + escapeHtml(String(qty).trim()) + '</span>';
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

  // Engranatge del launcher: gira un cop quan s'entra a la pantalla inicial
  if (name === 'launcher') {
    const gear = document.querySelector('#launcher-menu-btn .gear-spin');
    if (gear) {
      gear.classList.remove('gear-spin-once');
      void gear.offsetWidth;
      gear.classList.add('gear-spin-once');
    }
  }
}

function formatDateForInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
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
