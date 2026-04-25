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
  return POPULAR_PRODUCTS.map(p => ({
    name: p[lang] || p.en,
    emoji: p.emoji,
    days: p.days
  }));
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
const CATEGORY_TO_EMOJI = {
  'milk': '🥛', 'milks': '🥛', 'dairy': '🥛', 'yogurt': '🥛', 'yoghurt': '🥛',
  'cheese': '🧀',
  'egg': '🥚',
  'meat': '🥩', 'beef': '🥩', 'pork': '🥩',
  'chicken': '🍗', 'poultry': '🍗',
  'bacon': '🥓',
  'fish': '🐟', 'seafood': '🐟',
  'shrimp': '🦐',
  'canned': '🥫', 'conserve': '🥫',
  'pasta': '🍝',
  'bread': '🍞', 'baguette': '🥖',
  'croissant': '🥐',
  'butter': '🧈',
  'salad': '🥗', 'lettuce': '🥬',
  'cucumber': '🥒',
  'tomato': '🍅',
  'carrot': '🥕',
  'corn': '🌽',
  'potato': '🥔',
  'onion': '🧅',
  'apple': '🍎',
  'banana': '🍌',
  'strawberr': '🍓',
  'grape': '🍇',
  'orange': '🍊',
  'lemon': '🍋',
  'pizza': '🍕',
  'burger': '🍔',
  'sausage': '🌭',
  'sushi': '🍣',
  'cake': '🍰',
  'cookie': '🍪', 'biscuit': '🍪',
  'chocolate': '🍫',
  'candy': '🍬', 'sweet': '🍬',
  'ice cream': '🍦',
  'honey': '🍯',
  'coffee': '☕', 'tea': '☕'
};

// Dies de caducitat per defecte segons la categoria
const CATEGORY_DEFAULT_DAYS = {
  'milk': 7, 'dairy': 7, 'yogurt': 14, 'yoghurt': 14,
  'cheese': 21,
  'egg': 21,
  'meat': 2, 'beef': 2, 'pork': 2,
  'chicken': 2, 'poultry': 2,
  'fish': 2, 'seafood': 2,
  'canned': 180, 'conserve': 180,
  'pasta': 180,
  'bread': 3, 'baguette': 2,
  'salad': 5, 'lettuce': 5,
  'fruit': 7,
  'vegetable': 10,
  'chocolate': 90,
  'cookie': 60, 'biscuit': 60,
  'honey': 365,
  'coffee': 180, 'tea': 365
};

// ESTAT
let products = [];
let stats = { consumed: 0, trashed: 0 };
let currentLevel = null;
let currentProduct = null;
let selectedEmoji = '🥛';

// DADES
function saveData() {
  localStorage.setItem('eatmefirst_products', JSON.stringify(products));
  localStorage.setItem('eatmefirst_stats', JSON.stringify(stats));
}

function loadData() {
  const p = localStorage.getItem('eatmefirst_products');
  const s = localStorage.getItem('eatmefirst_stats');
  if (p) { try { products = JSON.parse(p); } catch(e){ products = []; } }
  if (s) { try { stats = JSON.parse(s); } catch(e){ stats = {consumed:0,trashed:0}; } }
}

// DIES
function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

function getLevel(days) {
  if (days <= 0) return 'red';
  if (days <= 2) return 'orange';
  if (days <= 7) return 'yellow';
  return 'green';
}

function daysText(days) {
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

// HOME
function renderHome() {
  const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
  products.forEach(p => { counts[getLevel(daysUntil(p.date))]++; });

  document.getElementById('count-green').textContent = counts.green;
  document.getElementById('count-yellow').textContent = counts.yellow;
  document.getElementById('count-orange').textContent = counts.orange;
  document.getElementById('count-red').textContent = counts.red;

  const total = products.length;
  const urgent = counts.orange + counts.red;
  let summary;
  if (total === 0) {
    summary = t('noProducts');
  } else {
    summary = t('productCount', total);
    if (urgent > 0) summary += ' · ' + t('urgent', urgent);
  }
  document.getElementById('top-summary').textContent = summary;
}

// LLISTA
function openShelf(level) {
  currentLevel = level;
  const titleMap = { green: t('shelfGreen'), yellow: t('shelfYellow'), orange: t('shelfOrange'), red: t('shelfRed') };
  const subMap = { green: t('shelfGreenSub'), yellow: t('shelfYellowSub'), orange: t('shelfOrangeSub'), red: t('shelfRedSub') };
  document.getElementById('list-title').textContent = titleMap[level] + ' · ' + subMap[level];

  const shelfProducts = products
    .map(p => ({ ...p, days: daysUntil(p.date) }))
    .filter(p => getLevel(p.days) === level)
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
      item.innerHTML = '<span class="product-item-emoji">' + p.emoji + '</span><div class="product-item-info"><div class="product-item-name"></div><div class="product-item-days"></div></div><span class="product-item-arrow">›</span>';
      item.querySelector('.product-item-name').textContent = p.name;
      item.querySelector('.product-item-days').textContent = daysText(p.days);
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
  document.getElementById('product-emoji').textContent = p.emoji;
  document.getElementById('product-name').textContent = p.name;
  document.getElementById('product-days').textContent = daysText(days);
  showScreen('product');
}

// ACCIONS
function handleAction(action) {
  if (!currentProduct) return;
  products = products.filter(p => p.id !== currentProduct.id);

  if (action === 'consumed') { stats.consumed++; showToast(t('consumedMsg')); }
  else if (action === 'trashed') { stats.trashed++; showToast(t('trashedMsg')); }
  else showToast(t('deletedMsg'));

  saveData();
  renderHome();
  updateStatsSub();
  showScreen('home');
  currentProduct = null;
}

// FORMULARI MANUAL
function openAddForm(prefill) {
  const nameInput = document.getElementById('input-name');
  nameInput.value = prefill && prefill.name ? prefill.name : '';
  nameInput.placeholder = t('productNamePlaceholder');

  const d = new Date();
  d.setDate(d.getDate() + (prefill && prefill.days ? prefill.days : 7));
  document.getElementById('input-date').value = formatDateForInput(d);

  selectedEmoji = prefill && prefill.emoji ? prefill.emoji : '🥛';
  renderEmojiPicker();

  showScreen('add');
  if (!prefill || !prefill.name) {
    setTimeout(() => nameInput.focus(), 250);
  }
}

function renderEmojiPicker() {
  const container = document.getElementById('emoji-picker');
  container.innerHTML = '';
  EMOJIS.forEach(e => {
    const btn = document.createElement('button');
    btn.className = 'emoji-option' + (e === selectedEmoji ? ' selected' : '');
    btn.textContent = e;
    btn.addEventListener('click', () => {
      selectedEmoji = e;
      renderEmojiPicker();
    });
    container.appendChild(btn);
  });
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

  if (!name) { showToast(t('needName')); return; }
  if (!date) { showToast(t('needDate')); return; }

  products.push({
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    name: name,
    emoji: selectedEmoji,
    date: date,
    addedAt: new Date().toISOString()
  });

  saveData();
  renderHome();
  showScreen('home');
  showToast(selectedEmoji + ' ' + name + ' ' + t('added'));
}

// ============ ESCÀNER DE CODI DE BARRES (Quagga2) ============
let scannerRunning = false;
let lastScannedCode = null;
let lastScanTime = 0;

async function startScanner() {
  const status = document.getElementById('scanner-status');
  status.textContent = '';

  if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
    status.textContent = t('cameraError');
    return;
  }

  if (typeof Quagga === 'undefined') {
    status.textContent = t('cameraError');
    return;
  }

  // Contenidor on Quagga posarà el vídeo
  const videoContainer = document.getElementById('scanner-video-container');
  if (!videoContainer) return;

  // Netejar qualsevol vídeo anterior
  videoContainer.innerHTML = '';

  try {
    await new Promise((resolve, reject) => {
      Quagga.init({
        inputStream: {
          type: 'LiveStream',
          target: videoContainer,
          constraints: {
            facingMode: 'environment',
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            aspectRatio: { min: 1, max: 2 }
          },
          area: { top: '25%', right: '10%', left: '10%', bottom: '25%' }
        },
        locator: { patchSize: 'medium', halfSample: true },
        numOfWorkers: navigator.hardwareConcurrency || 2,
        frequency: 10,
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'upc_reader',
            'upc_e_reader',
            'code_128_reader',
            'code_39_reader'
          ]
        },
        locate: true
      }, (err) => {
        if (err) { reject(err); return; }
        resolve();
      });
    });

    Quagga.start();
    scannerRunning = true;
    lastScannedCode = null;

    // Quan Quagga detecta un codi
    Quagga.onDetected(handleQuaggaDetection);

  } catch (e) {
    console.error('Quagga error:', e);
    status.textContent = t('cameraError');
  }
}

function handleQuaggaDetection(result) {
  if (!scannerRunning) return;
  const code = result && result.codeResult && result.codeResult.code;
  if (!code) return;

  // Evita dobles detections del mateix codi
  const now = Date.now();
  if (code === lastScannedCode && (now - lastScanTime) < 2000) return;
  lastScannedCode = code;
  lastScanTime = now;

  // Vibrar si es pot (feedback tàctil)
  if (navigator.vibrate) navigator.vibrate(100);

  stopScanner();
  onBarcodeDetected(code);
}

function stopScanner() {
  if (!scannerRunning) return;
  scannerRunning = false;
  try {
    Quagga.offDetected(handleQuaggaDetection);
    Quagga.stop();
  } catch(e) { console.warn(e); }
}

async function onBarcodeDetected(code) {
  const status = document.getElementById('scanner-status');
  status.textContent = t('searching');

  try {
    const data = await fetchFromOpenFoodFacts(code);

    if (data) {
      status.textContent = t('productFound');
      setTimeout(() => {
        openAddForm({
          name: data.name,
          emoji: data.emoji,
          days: data.days
        });
      }, 500);
    } else {
      status.textContent = t('productNotFound');
      setTimeout(() => {
        openAddForm({});
      }, 1200);
    }
  } catch (e) {
    console.error(e);
    status.textContent = t('productNotFound');
    setTimeout(() => openAddForm({}), 1200);
  }
}

async function fetchFromOpenFoodFacts(barcode) {
  try {
    const lang = getCurrentLang();
    const res = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(barcode) + '.json');
    if (!res.ok) return null;
    const json = await res.json();

    if (json.status !== 1 || !json.product) return null;
    const p = json.product;

    // Nom del producte (preferir idioma de l'usuari)
    let name = p['product_name_' + lang] || p.product_name || p.generic_name || '';
    if (p.brands && name) {
      // No repetim la marca si ja hi és
      if (!name.toLowerCase().includes(p.brands.toLowerCase().split(',')[0])) {
        name = p.brands.split(',')[0].trim() + ' - ' + name;
      }
    }
    if (!name) return null;

    // Emoji suggerit segons categoria
    const categories = (p.categories || '').toLowerCase() + ' ' + (p.categories_tags || []).join(' ').toLowerCase();
    let emoji = '🥫';
    for (const key in CATEGORY_TO_EMOJI) {
      if (categories.includes(key)) { emoji = CATEGORY_TO_EMOJI[key]; break; }
    }

    // Dies per defecte
    let days = 7;
    for (const key in CATEGORY_DEFAULT_DAYS) {
      if (categories.includes(key)) { days = CATEGORY_DEFAULT_DAYS[key]; break; }
    }

    return { name: name.trim().slice(0, 50), emoji: emoji, days: days };
  } catch (e) {
    console.error('OFF error', e);
    return null;
  }
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

function renderLangList() {
  const container = document.getElementById('lang-list');
  container.innerHTML = '';
  const currentLang = getCurrentLang();

  // Bandera SVG de Catalunya (es veu a tots els mòbils)
  const catalanFlagSVG = '<svg viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg" style="width:36px;height:24px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.2);"><rect width="9" height="6" fill="#FCDD09"/><rect y="0.67" width="9" height="0.67" fill="#DA121A"/><rect y="2" width="9" height="0.67" fill="#DA121A"/><rect y="3.33" width="9" height="0.67" fill="#DA121A"/><rect y="4.67" width="9" height="0.67" fill="#DA121A"/></svg>';

  const LANG_DATA = {
    ca: { flag: catalanFlagSVG, native: 'Català', isSvg: true },
    en: { flag: '🇬🇧', native: 'English' },
    ja: { flag: '🇯🇵', native: '日本語' },
    zh: { flag: '🇨🇳', native: '中文' },
    ko: { flag: '🇰🇷', native: '한국어' },
    de: { flag: '🇩🇪', native: 'Deutsch' },
    fr: { flag: '🇫🇷', native: 'Français' },
    es: { flag: '🇪🇸', native: 'Español' },
    it: { flag: '🇮🇹', native: 'Italiano' },
    pt: { flag: '🇵🇹', native: 'Português' },
    nl: { flag: '🇳🇱', native: 'Nederlands' }
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

  Object.keys(LANG_DATA).forEach(code => {
    const data = LANG_DATA[code];
    const btn = document.createElement('button');
    btn.className = 'lang-item' + (code === currentLang ? ' active' : '');

    const flag = document.createElement('span');
    flag.className = 'lang-flag';
    if (data.isSvg) {
      flag.innerHTML = data.flag;
    } else {
      flag.textContent = data.flag;
    }

    const info = document.createElement('div');
    info.className = 'lang-info';

    const name = document.createElement('div');
    name.className = 'lang-name';
    name.textContent = data.native;

    const sub = document.createElement('div');
    sub.className = 'lang-native';
    if (code !== currentLang && data.native !== labels[code]) {
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
      showToast('✓ ' + data.native);
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
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  const savedTheme = localStorage.getItem('eatmefirst_theme') || 'auto';
  applyTheme(savedTheme);

  translatePage();

  document.querySelectorAll('.shelf').forEach(s => {
    s.addEventListener('click', () => openShelf(s.dataset.level));
  });

  document.getElementById('add-btn').addEventListener('click', () => showScreen('add-choice'));
  document.getElementById('choice-scan').addEventListener('click', () => {
    showScreen('scan');
    setTimeout(startScanner, 200);
  });
  document.getElementById('choice-manual').addEventListener('click', () => openAddForm({}));

  document.getElementById('menu-btn').addEventListener('click', () => showScreen('settings'));

  document.querySelectorAll('.back-btn').forEach(b => {
    b.addEventListener('click', () => showScreen(b.dataset.back));
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

  // Productes populars
  document.getElementById('popular-btn').addEventListener('click', () => {
    renderPopularList();
    showScreen('popular');
  });
});

function renderPopularList() {
  const container = document.getElementById('popular-list');
  container.innerHTML = '';
  const items = getPopularProducts();
  items.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'popular-item';
    btn.innerHTML = '<span class="popular-emoji"></span><span class="popular-name"></span><span class="popular-days"></span>';
    btn.querySelector('.popular-emoji').textContent = p.emoji;
    btn.querySelector('.popular-name').textContent = p.name;
    btn.querySelector('.popular-days').textContent = '+' + p.days + 'd';
    btn.addEventListener('click', () => {
      openAddForm({ name: p.name, emoji: p.emoji, days: p.days });
    });
    container.appendChild(btn);
  });
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderHome();
  else stopScanner();
});
