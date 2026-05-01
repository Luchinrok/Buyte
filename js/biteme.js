/* ============================================
   Buyte — js/biteme.js
   Mòdul del tracker de caducitats: estat dels productes,
   ubicacions, pantalles inicial / seccions / detall,
   formulari manual i historial d'aprenentatge.
   ============================================ */


// ESTAT
let products = [];
let stats = { consumed: 0, trashed: 0 };
let currentLevel = null;
let currentProduct = null;
let selectedEmoji = '🥛';
let selectedLocation = 'fridge';
let locations = []; // Carregades de localStorage o per defecte

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
  // Migració: afegir Farmaciola si no existeix
  if (!locations.find(l => l.id === 'medicine')) {
    locations.push({ id: 'medicine', emoji: '💊', nameKey: 'locMedicine', category: 'pantry' });
    migrated = true;
  }
  if (migrated) saveLocations();
}

function saveLocations() {
  localStorage.setItem('eatmefirst_locations', JSON.stringify(locations));
  if (typeof pushToServer === 'function') pushToServer();
}

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
      <p class="view-all-name">${formatProductLine(p.name, p.qty)}</p>
      <p class="view-all-meta">${loc ? loc.emoji + ' ' + getLocationName(loc) : ''} · ${daysText(days)}</p>
    </div>
    <span class="view-all-arrow">›</span>
  `;
  row.addEventListener('click', () => openProductDetail(p));
  return row;
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



// Ajuda: dóna el nivell d'un producte segons la seva ubicació
function getProductLevel(product) {
  const loc = getLocationById(product.location || 'fridge');
  const cat = loc ? loc.category : 'fridge';
  return getLevel(daysUntil(product.date), cat);
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

function renderHome() {
  // Activar animació de la campana un sol cop
  const bell = document.getElementById('bell-icon');
  if (bell) {
    bell.classList.remove('bell-shake');
    // Force reflow per reiniciar l'animació
    void bell.offsetWidth;
    bell.classList.add('bell-shake');
  }

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
    item.querySelector('.product-item-name').innerHTML = formatProductLine(p.name, p.qty);
    item.querySelector('.product-item-days').textContent = locLabel + daysText(p.days);
    item.addEventListener('click', () => { productDetailBack = 'alerts'; openProduct(p.id); });
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
      item.querySelector('.product-item-name').innerHTML = formatProductLine(p.name, p.qty);
      item.querySelector('.product-item-days').textContent = locLabel + daysText(p.days);
      item.addEventListener('click', () => { productDetailBack = 'list'; openProduct(p.id); });
      listEl.appendChild(item);
    });
  }

  setNevi(level);
  showScreen('list');
}

// DETALL
let productDetailBack = 'list';

function openProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentProduct = p;
  const days = daysUntil(p.date);
  const loc = getLocationById(p.location || 'fridge');
  document.getElementById('product-emoji').textContent = p.emoji;
  document.getElementById('product-name').innerHTML = formatProductLine(p.name, p.qty);
  const locStr = loc ? loc.emoji + ' ' + getLocationName(loc) + ' · ' : '';
  document.getElementById('product-days').textContent = locStr + daysText(days);
  const backBtn = document.querySelector('#screen-product .back-btn');
  if (backBtn) backBtn.dataset.back = productDetailBack;
  showScreen('product');
}

// Obre el detall del producte des de la pantalla "Veure-ho tot" (BuyTe)
function openProductDetail(p) {
  productDetailBack = 'view-all';
  openProduct(p.id);
}

// ACCIONS
function handleAction(action) {
  if (!currentProduct) return;

  // "Esborrar" (deleted): comportament directe, sense slider
  if (action === 'deleted') {
    products = products.filter(p => p.id !== currentProduct.id);
    showToast(t('deletedMsg'));
    saveData();
    renderHome();
    updateStatsSub();
    showScreen('home');
    currentProduct = null;
    return;
  }

  // Consumed / Trashed: obrim slider de consum parcial
  if (action === 'consumed' || action === 'trashed') {
    const product = currentProduct;
    showConsumptionSliderModal(product, action, (percent) => {
      finalizeConsumption(product, action, percent);
    });
  }
}

function finalizeConsumption(product, action, percent) {
  recordConsumption(product, action, percent);
  products = products.filter(p => p.id !== product.id);

  if (action === 'consumed') stats.consumed++;
  else stats.trashed++;

  const label = action === 'consumed' ? t('consumedToast') : t('wastedToast');
  showToast('✓ ' + label + ' ' + percent + '%');

  saveData();
  renderHome();
  updateStatsSub();
  showScreen('home');
  currentProduct = null;

  setTimeout(() => askAddToShoppingList(product), 600);
}

// Historial detallat de consum/llençaments per a futures estadístiques d'estalvi.
function recordConsumption(product, action, percent) {
  let hist = [];
  try {
    const raw = localStorage.getItem('eatmefirst_consumption_history');
    if (raw) hist = JSON.parse(raw);
    if (!Array.isArray(hist)) hist = [];
  } catch (e) { hist = []; }

  let daysFromExpiry = null;
  if (!product.noExpiry && product.date) {
    const d = daysUntil(product.date);
    if (d !== Infinity) daysFromExpiry = d;
  }

  hist.push({
    productName: product.name,
    productEmoji: product.emoji,
    action: action,
    percent: percent,
    date: new Date().toISOString(),
    location: product.location || null,
    daysFromExpiry: daysFromExpiry
  });

  // Limitem a les últimes 500 entrades per evitar bloat de localStorage
  if (hist.length > 500) hist = hist.slice(-500);

  localStorage.setItem('eatmefirst_consumption_history', JSON.stringify(hist));
  if (typeof pushToServer === 'function') pushToServer();
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

  // Preu (opcional): si ve d'un popular/historial amb preu, el pre-fillem
  const priceInput = document.getElementById('input-price');
  if (priceInput) {
    priceInput.value = (prefill && typeof prefill.price === 'number' && prefill.price >= 0)
      ? String(prefill.price)
      : '';
  }

  // Reset checkbox "sense data" — restaurat si el prefill ho indica (popular/historial)
  const noExpiry = document.getElementById('input-no-expiry');
  if (noExpiry) noExpiry.checked = !!(prefill && prefill.noExpiry);

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

  const dateInputEl = document.getElementById('input-date');
  if (prefill && prefill.noExpiry) {
    dateInputEl.value = '';
    dateInputEl.dataset.baseDays = '';
  } else {
    const d = new Date();
    d.setDate(d.getDate() + finalDays);
    dateInputEl.value = formatDateForInput(d);
    dateInputEl.dataset.baseDays = baseDays;
  }

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
          // Recupera el flag "no caduca" i la data si la sabem
          const shopNoExp = document.getElementById('input-shopping-no-expiry');
          const shopDate = document.getElementById('input-shopping-date');
          if (m.noExpiry) {
            if (shopNoExp) shopNoExp.checked = true;
            if (shopDate) shopDate.value = '';
          } else {
            if (shopNoExp) shopNoExp.checked = false;
            if (m.days && shopDate) {
              const d = new Date();
              d.setDate(d.getDate() + m.days);
              shopDate.value = formatDateForInput(d);
            }
          }
        } else {
          selectedEmoji = m.emoji;
          renderEmojiPicker();
          // Recupera el flag "no caduca" si el tenim guardat al popular o l'historial
          const noExpiryInput = document.getElementById('input-no-expiry');
          const dateInput = document.getElementById('input-date');
          if (m.noExpiry) {
            if (noExpiryInput) {
              noExpiryInput.checked = true;
              noExpiryInput.dispatchEvent(new Event('change'));
            }
            if (dateInput) dateInput.value = '';
          } else {
            if (noExpiryInput && noExpiryInput.checked) {
              noExpiryInput.checked = false;
              noExpiryInput.dispatchEvent(new Event('change'));
            }
            // Si ve d'un popular o de l'historial, prefillem la data
            if (m.days && dateInput) {
              const d = new Date();
              d.setDate(d.getDate() + m.days);
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

function saveNewProduct() {
  const name = document.getElementById('input-name').value.trim();
  const date = document.getElementById('input-date').value;
  const noExpiry = document.getElementById('input-no-expiry');
  const noExpiryChecked = noExpiry && noExpiry.checked;
  const qtyInput = document.getElementById('input-qty');
  const qty = qtyInput ? qtyInput.value.trim() : '';

  // Preu (opcional). Només el guardem si l'usuari l'ha informat.
  const priceInput = document.getElementById('input-price');
  let price = null;
  if (priceInput && priceInput.value.trim() !== '') {
    const parsed = parseFloat(priceInput.value);
    if (!isNaN(parsed) && parsed >= 0) price = Math.round(parsed * 100) / 100;
  }

  if (!name) { showToast(t('needName')); return; }
  if (!date && !noExpiryChecked) { showToast(t('needDate')); return; }

  // Calcula dies aproximats per a l'aprenentatge automàtic
  let approxDays = null;
  if (date) {
    const d = new Date(date);
    const now = new Date();
    approxDays = Math.round((d - now) / (1000 * 60 * 60 * 24));
  }

  recordProductInHistory(name, selectedEmoji, selectedLocation, approxDays, noExpiryChecked, price);

  const newProduct = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    name: name,
    emoji: selectedEmoji,
    date: noExpiryChecked ? null : date,
    noExpiry: noExpiryChecked,
    location: selectedLocation,
    qty: qty,
    addedAt: new Date().toISOString()
  };
  if (price !== null) newProduct.price = price;
  products.push(newProduct);

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
function recordProductInHistory(name, emoji, location, days, noExpiry, price) {
  const key = name.toLowerCase().trim();
  const hasPrice = typeof price === 'number' && price >= 0;
  const existing = productHistory.find(p => p.name.toLowerCase() === key);
  if (existing) {
    existing.count++;
    existing.lastUsed = Date.now();
    if (emoji) existing.emoji = emoji;
    if (location) existing.location = location;
    if (days) existing.days = days;
    existing.noExpiry = !!noExpiry;
    if (hasPrice) existing.price = price;
  } else {
    const entry = { name, emoji: emoji || '🥛', location, days, noExpiry: !!noExpiry, count: 1, lastUsed: Date.now() };
    if (hasPrice) entry.price = price;
    productHistory.push(entry);
  }
  productHistory.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
  if (productHistory.length > 50) productHistory = productHistory.slice(0, 50);
  localStorage.setItem('eatmefirst_product_history', JSON.stringify(productHistory));

  // APRENENTATGE: cada cop que es desa un producte, l'afegim als populars
  // (o actualitzem l'entrada existent amb l'emoji, la zona, els dies, si caduca i el preu)
  addToCustomPopular(name, emoji, days, location, noExpiry, price);
}

function addToCustomPopular(name, emoji, days, location, noExpiry, price) {
  const list = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
  const safeEmoji = emoji || '🥛';
  const safeDays = (typeof days === 'number' && days > 0) ? days : 7;
  const safeLoc = location || (typeof guessLocationFromName === 'function' ? guessLocationFromName(name) : null) || 'pantry';
  const noExp = !!noExpiry;
  const hasPrice = typeof price === 'number' && price >= 0;

  const existing = list.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.emoji = safeEmoji;
    existing.days = safeDays;
    existing.location = safeLoc;
    existing.noExpiry = noExp;
    if (hasPrice) existing.price = price;
  } else {
    const entry = {
      id: 'pop-learned-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name,
      emoji: safeEmoji,
      days: safeDays,
      location: safeLoc,
      noExpiry: noExp
    };
    if (hasPrice) entry.price = price;
    list.push(entry);
  }
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
    .map(p => ({ name: p.name, emoji: p.emoji, days: p.days, noExpiry: !!p.noExpiry, isPopular: true }));

  // Combinem sense duplicats (mateix nom)
  const result = [...fromHistory];
  fromPopular.forEach(pop => {
    if (!result.find(r => r.name.toLowerCase() === pop.name.toLowerCase())) {
      result.push(pop);
    }
  });

  return result.slice(0, 6);
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
  } else if (target === 'special-item') {
    currentEmoji = selectedSpecialItemEmoji;
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
      } else if (target === 'special-item') {
        selectedSpecialItemEmoji = e;
        const btn = document.getElementById('special-item-emoji-current');
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

// EVENTS

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
