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

// Estat compartit per a la vista calendari de Tots els productes.
// mode: 'week' | 'month' | 'day' — què es mostra dins del contenidor.
// currentDate: Date — l'ancoratge temporal (inici de setmana, mes,
// o dia concret segons el mode).
// Vegeu resetCalendarState i les funcions navigateCalendarPrev/Next.
let calendarState = { mode: 'week', currentDate: null };

function resetCalendarState() {
  calendarState.mode = 'week';
  calendarState.currentDate = _calendarStartOfDay(new Date());
}

function _calendarStartOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function openViewAll() {
  // Placeholder traduït (mateix patró que openEmojiPicker amb
  // searchEmojiPlaceholder).
  const search = document.getElementById('view-all-search');
  if (search) search.placeholder = t('searchProduct');
  // Cerca neteja a cada entrada de la pantalla (decisió de l'usuari).
  _resetViewAllSearch();
  renderViewAll();
  showScreen('view-all');
}

// Buidar el cercador i amagar el botó X. Cridat a cada entrada
// (botó menú, smart-notifications, back-btn, navigateAfterAction).
function _resetViewAllSearch() {
  const search = document.getElementById('view-all-search');
  const clearBtn = document.getElementById('view-all-search-clear');
  if (search) search.value = '';
  if (clearBtn) clearBtn.hidden = true;
}

// Helpers de cerca: cas-insensitive + diacrítics ignorats.
function _normalizeForSearch(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function _getViewAllSearchQuery() {
  const el = document.getElementById('view-all-search');
  if (!el) return '';
  return String(el.value || '').trim();
}

// Llista de productes filtrada per la query actual del cercador
// view-all. Si la query és buida, retorna `products` tal qual.
// Usat per renderViewAll (modes expiry/zone) i _productsForDate
// (mode calendar) perquè el filtre s'aplica a TOTS els modes.
function _getFilteredViewAllProducts() {
  const q = _getViewAllSearchQuery();
  if (!q) return products;
  const nq = _normalizeForSearch(q);
  return products.filter(p => _normalizeForSearch(p.name).includes(nq));
}

function renderViewAll() {
  const container = document.getElementById('view-all-list');
  if (!container) return;
  container.innerHTML = '';

  // Subratlla quin botó d'ordenació està actiu (visualment subtil però
  // útil ara que en tenim tres). El delegate de clicks viu a app.js.
  document.querySelectorAll('#screen-view-all .view-all-toolbar .popular-tool-btn').forEach(b => {
    b.classList.remove('is-active');
  });
  const activeBtnId = viewAllSortMode === 'expiry' ? 'btn-sort-by-expiry'
    : viewAllSortMode === 'zone' ? 'btn-sort-by-zone'
    : viewAllSortMode === 'calendar' ? 'btn-sort-by-calendar' : '';
  if (activeBtnId) {
    const b = document.getElementById(activeBtnId);
    if (b) b.classList.add('is-active');
  }

  if (viewAllSortMode === 'calendar') {
    if (!calendarState.currentDate) resetCalendarState();
    _renderViewAllCalendar(container);
    return;
  }

  const filteredProducts = _getFilteredViewAllProducts();
  const hasQuery = _getViewAllSearchQuery().length > 0;

  if (filteredProducts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = hasQuery ? 'Cap producte coincideix amb la cerca.' : t('noProducts');
    container.appendChild(empty);
    return;
  }

  let sorted = [...filteredProducts];
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

// =============================================================
//   VISTA CALENDARI a Tots els productes (3a opció d'ordenació)
//   Modes: setmanal (per defecte) / mensual / diari
// =============================================================

// Bounds de navegació: l'usuari pot mirar fins a 30 dies enrere
// (productes ja caducats) i 1 any endavant (congelador a llarg termini).
const _CAL_MIN_DAYS = -30;
const _CAL_MAX_DAYS = 365;

function _calendarBoundsClamp() {
  const today = _calendarStartOfDay(new Date());
  const min = new Date(today); min.setDate(min.getDate() + _CAL_MIN_DAYS);
  const max = new Date(today); max.setDate(max.getDate() + _CAL_MAX_DAYS);
  return { today, min, max };
}

function _renderViewAllCalendar(container) {
  const wrap = document.createElement('div');
  wrap.className = 'calendar-view';

  // Selector de mode: ordre [Diari | Setmanal | Mensual] de menor a
  // major granularitat. Setmanal és el centre i el mode per defecte
  // (resetCalendarState el posa cada cop que s'entra al calendari, no
  // es recorda l'última tria entre visites).
  const modes = [
    { id: 'day',   label: t('calendarModeDay') },
    { id: 'week',  label: t('calendarModeWeek') },
    { id: 'month', label: t('calendarModeMonth') }
  ];
  const modeBar = document.createElement('div');
  modeBar.className = 'calendar-mode-selector';
  modes.forEach(m => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'calendar-mode-btn' + (calendarState.mode === m.id ? ' is-active' : '');
    b.textContent = m.label;
    b.addEventListener('click', () => {
      calendarState.mode = m.id;
      // Quan canviem a "day", ancorem a today si no estàvem ja en un dia
      // específic d'aquest últim mes — així evitem aterrar en un dia
      // sense productes per defecte.
      renderViewAll();
    });
    modeBar.appendChild(b);
  });
  wrap.appendChild(modeBar);

  // Navegació prev / label / next + atall "Avui"
  const nav = document.createElement('div');
  nav.className = 'calendar-navigation';
  const bounds = _calendarBoundsClamp();
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'calendar-nav-btn';
  prev.textContent = '‹';
  prev.disabled = !_canNavigateCalendar(-1, bounds);
  prev.addEventListener('click', () => { _navigateCalendar(-1); });
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'calendar-nav-btn';
  next.textContent = '›';
  next.disabled = !_canNavigateCalendar(+1, bounds);
  next.addEventListener('click', () => { _navigateCalendar(+1); });
  const label = document.createElement('span');
  label.className = 'calendar-nav-label';
  label.textContent = _calendarNavLabel();
  const todayBtn = document.createElement('button');
  todayBtn.type = 'button';
  todayBtn.className = 'calendar-today-btn';
  todayBtn.textContent = t('calendarBackToToday');
  todayBtn.addEventListener('click', () => {
    resetCalendarState();
    // Conserva el mode actual (resetCalendarState el posa a 'week';
    // restaurem el mode triat per l'usuari).
    const currentMode = calendarState.mode;
    calendarState.mode = currentMode;
    renderViewAll();
  });
  nav.appendChild(prev);
  nav.appendChild(label);
  nav.appendChild(next);
  nav.appendChild(todayBtn);
  wrap.appendChild(nav);

  // Contingut segons el mode
  const content = document.createElement('div');
  content.className = 'calendar-content';
  if (calendarState.mode === 'week') {
    _renderCalendarWeek(content, bounds);
  } else if (calendarState.mode === 'month') {
    _renderCalendarMonth(content, bounds);
  } else {
    _renderCalendarDay(content);
  }
  wrap.appendChild(content);

  container.appendChild(wrap);
}

function _canNavigateCalendar(dir, bounds) {
  const probe = new Date(calendarState.currentDate);
  if (calendarState.mode === 'week') probe.setDate(probe.getDate() + dir * 7);
  else if (calendarState.mode === 'month') probe.setMonth(probe.getMonth() + dir);
  else probe.setDate(probe.getDate() + dir);
  return probe >= bounds.min && probe <= bounds.max;
}

function _navigateCalendar(dir) {
  const bounds = _calendarBoundsClamp();
  if (!_canNavigateCalendar(dir, bounds)) return;
  if (calendarState.mode === 'week') {
    calendarState.currentDate.setDate(calendarState.currentDate.getDate() + dir * 7);
  } else if (calendarState.mode === 'month') {
    calendarState.currentDate.setMonth(calendarState.currentDate.getMonth() + dir);
  } else {
    calendarState.currentDate.setDate(calendarState.currentDate.getDate() + dir);
  }
  renderViewAll();
}

function _calendarNavLabel() {
  const d = calendarState.currentDate;
  if (calendarState.mode === 'week') {
    const end = new Date(d); end.setDate(end.getDate() + 6);
    const fmt = (x) => x.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
    return fmt(d) + ' – ' + fmt(end);
  }
  if (calendarState.mode === 'month') {
    return d.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Productes que caduquen exactament un dia donat (Date local).
// Respecta el filtre de cerca de la pantalla "Tot" — així el
// calendari també filtra per la query activa.
function _productsForDate(date) {
  const target = formatDateLocal(date);
  return _getFilteredViewAllProducts().filter(p => p.date === target);
}

// Etiqueta "Avui" / "Demà" / nom del dia segons l'offset respecte avui.
function _dayLabel(date) {
  const today = _calendarStartOfDay(new Date());
  const diffDays = Math.round((_calendarStartOfDay(date) - today) / 86400000);
  if (diffDays === 0) return t('calendarToday');
  if (diffDays === 1) return t('calendarTomorrow');
  if (diffDays === -1) return t('calendarYesterday');
  return date.toLocaleDateString('ca-ES', { weekday: 'long' });
}

function _renderCalendarWeek(container, bounds) {
  const start = calendarState.currentDate;
  let totalProducts = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(start); date.setDate(date.getDate() + i);
    const dayProducts = _productsForDate(date);
    totalProducts += dayProducts.length;
    const block = document.createElement('div');
    block.className = 'calendar-day-block';
    if (date.getTime() === bounds.today.getTime()) block.classList.add('is-today');
    if (dayProducts.length === 0) block.classList.add('is-empty');
    const header = document.createElement('div');
    header.className = 'calendar-day-block-header';
    const name = document.createElement('span');
    name.className = 'calendar-day-name';
    name.textContent = _dayLabel(date);
    const dateLbl = document.createElement('span');
    dateLbl.className = 'calendar-day-date';
    dateLbl.textContent = date.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' });
    header.appendChild(name);
    header.appendChild(dateLbl);
    if (dayProducts.length > 0) {
      const count = document.createElement('span');
      count.className = 'calendar-day-count';
      count.textContent = t('calendarProductsCount', dayProducts.length);
      header.appendChild(count);
    }
    block.appendChild(header);
    if (dayProducts.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'calendar-empty-day';
      empty.textContent = t('calendarNoProductsDay');
      block.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'calendar-day-products';
      dayProducts.forEach(p => list.appendChild(_buildCalendarProductRow(p, 'mini')));
      block.appendChild(list);
    }
    container.appendChild(block);
  }
  if (totalProducts === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state calendar-empty-state';
    empty.textContent = t('calendarNoProductsWeek');
    container.appendChild(empty);
  }
}

function _renderCalendarMonth(container, bounds) {
  const monthStart = new Date(calendarState.currentDate.getFullYear(), calendarState.currentDate.getMonth(), 1);
  const monthEnd = new Date(calendarState.currentDate.getFullYear(), calendarState.currentDate.getMonth() + 1, 0);
  // dilluns = 1 a Date.getDay (0=diumenge). Volem que la setmana
  // comenci en dilluns. Calculem el primer dia visible (dilluns
  // anterior o igual a monthStart).
  const firstDay = new Date(monthStart);
  const dow = (monthStart.getDay() + 6) % 7; // dl=0 ... dg=6
  firstDay.setDate(firstDay.getDate() - dow);
  // Última cel·la: després de monthEnd, omplim fins a diumenge.
  const lastDay = new Date(monthEnd);
  const dowLast = (monthEnd.getDay() + 6) % 7;
  lastDay.setDate(lastDay.getDate() + (6 - dowLast));

  const grid = document.createElement('div');
  grid.className = 'calendar-month-grid';
  // Capçaleres de dia de la setmana (Dl Dt Dc Dj Dv Ds Dg)
  const weekdayHeaders = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];
  weekdayHeaders.forEach(w => {
    const h = document.createElement('div');
    h.className = 'calendar-weekday-header';
    h.textContent = w;
    grid.appendChild(h);
  });

  let totalProductsInMonth = 0;
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const cellDate = new Date(d);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-day-cell';
    if (cellDate.getMonth() !== monthStart.getMonth()) cell.classList.add('is-other-month');
    if (cellDate.getTime() === bounds.today.getTime()) cell.classList.add('is-today');
    const dayProducts = _productsForDate(cellDate);
    if (cellDate.getMonth() === monthStart.getMonth()) totalProductsInMonth += dayProducts.length;
    const num = document.createElement('span');
    num.className = 'calendar-day-num';
    num.textContent = String(cellDate.getDate());
    cell.appendChild(num);
    if (dayProducts.length > 0) {
      const dots = document.createElement('span');
      dots.className = 'calendar-day-dots';
      const cnt = dayProducts.length;
      let level, text;
      if (cnt <= 2)      { level = 'low';  text = '●'; }
      else if (cnt <= 5) { level = 'mid';  text = '●●'; }
      else               { level = 'high'; text = '●●●'; }
      dots.classList.add('level-' + level);
      dots.textContent = text;
      cell.appendChild(dots);
    }
    cell.addEventListener('click', () => {
      calendarState.mode = 'day';
      calendarState.currentDate = _calendarStartOfDay(cellDate);
      renderViewAll();
    });
    grid.appendChild(cell);
  }
  container.appendChild(grid);

  if (totalProductsInMonth === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state calendar-empty-state';
    empty.textContent = t('calendarNoProductsMonth');
    container.appendChild(empty);
  }
}

function _renderCalendarDay(container) {
  const dayProducts = _productsForDate(calendarState.currentDate);
  const head = document.createElement('div');
  head.className = 'calendar-day-large-header';
  const dayName = document.createElement('p');
  dayName.className = 'calendar-day-large-name';
  dayName.textContent = _dayLabel(calendarState.currentDate);
  const dayDate = document.createElement('p');
  dayDate.className = 'calendar-day-large-date';
  dayDate.textContent = calendarState.currentDate.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const cnt = document.createElement('p');
  cnt.className = 'calendar-day-large-count';
  cnt.textContent = dayProducts.length === 0
    ? t('calendarNoProductsDay')
    : t('calendarProductsCount', dayProducts.length);
  head.appendChild(dayName);
  head.appendChild(dayDate);
  head.appendChild(cnt);
  container.appendChild(head);

  if (dayProducts.length === 0) return;

  const list = document.createElement('div');
  list.className = 'calendar-day-products-large';
  dayProducts.forEach(p => list.appendChild(_buildCalendarProductRow(p, 'large')));
  container.appendChild(list);
}

function _buildCalendarProductRow(p, size) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'calendar-product-row calendar-product-row-' + (size || 'mini');
  const loc = getLocationById(p.location || 'fridge');
  const days = daysUntil(p.date);
  const locText = loc ? (loc.emoji + ' ' + getLocationName(loc)) : '';
  row.innerHTML =
    '<span class="calendar-product-emoji">' + (p.emoji || '🍽️') + '</span>' +
    '<div class="calendar-product-info">' +
      '<strong class="calendar-product-name">' + escapeHtml(p.name || '') + (p.qty ? ' <span class="calendar-product-qty">(' + escapeHtml(p.qty) + ')</span>' : '') + '</strong>' +
      '<small class="calendar-product-meta">' + escapeHtml(locText) + ' ' + escapeHtml(daysText(days)) + '</small>' +
    '</div>' +
    '<span class="calendar-product-arrow">›</span>';
  row.addEventListener('click', () => openProductDetail(p));
  return row;
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

// =============================================================
//   MIGRACIÓ v2 — Productes agrupats amb lots[] + mirrors
//   Fase A v2: el producte té lots[] PERÒ també manté camps mirror
//   (date, location, qty, price, weight, frozenDate, noExpiry,
//   addedAt, consumedPercent) sincronitzats amb el lot més urgent.
//   Els callers existents que llegeixen p.date / p.location etc.
//   directament segueixen funcionant sense canvis. Els helpers
//   (getLots / getPrimaryLot / ...) també hi tenen accés via lots[].
//   Vegeu memory/feedback-data-model-migration-needs-mirror.md per
//   la lliçó apresa que justifica aquesta arquitectura.
// =============================================================

const _PRODUCTS_V2_BACKUP_KEY = 'eatmefirst_backup_pre_v2_migration';
const _PRODUCTS_V2_MIGRATION_FLAG = 'eatmefirst_products_v2_migration_done';
const _APP_VERSION_FOR_BACKUP = 'v2.0';

// Mateixa normalització que findExistingAtHome (buyme.js:1346) per
// coherència entre detecció de duplicats al runtime i el merge del
// moment de la migració.
function _normForGrouping(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// Construeix un lot v2 a partir dels camps d'un producte legacy.
// Compartit entre la migració one-shot i el fallback de getLots().
function _buildLotFromLegacy(product) {
  const qtyStr = (product && product.qty) || '';
  const qtyNum = (typeof parseQtyNumber === 'function') ? parseQtyNumber(qtyStr) : null;

  const lot = {
    id: 'lot-legacy-' + (product && product.id ? product.id : Date.now().toString() + Math.random().toString(36).slice(2, 6)),
    date: (product && product.date) || null,
    noExpiry: !!(product && product.noExpiry),
    location: (product && product.location) || 'pantry',
    addedAt: (product && product.addedAt) || new Date().toISOString(),
    frozenDate: (product && product.frozenDate) || null,
    supermarket: null
  };
  if (product && typeof product.price === 'number' && product.price >= 0) lot.price = product.price;
  if (product && product.weight) lot.weight = product.weight;

  if (qtyNum !== null) {
    lot.consumptionMode = 'quantity';
    lot.qtyInitial = qtyNum;
    lot.qtyRemaining = qtyNum;
    lot.unit = 'units';
    return lot;
  }

  const trimmed = qtyStr.trim();
  const m = trimmed && trimmed.match(/^([\d.,]+)\s*(ml|l|g|kg)$/i);
  if (m) {
    const num = parseFloat(m[1].replace(',', '.'));
    if (Number.isFinite(num)) {
      lot.consumptionMode = 'quantity';
      lot.qtyInitial = num;
      lot.qtyRemaining = num;
      lot.unit = m[2].toLowerCase();
      return lot;
    }
  }

  lot.consumptionMode = 'percent';
  lot.percentRemaining = Math.max(0, Math.min(100, 100 - ((product && product.consumedPercent) || 0)));
  return lot;
}

// Converteix un producte legacy (planet) al format v2 amb lots[] +
// mirrors. El primer lot és el derivat del producte legacy; els
// mirrors al nivell producte preserven els camps que els callers
// llegeixen directament.
function _migrateLegacyProduct(legacy) {
  const lot = _buildLotFromLegacy(legacy);
  // ID estable nou per al lot (no el prefix 'lot-legacy-' que el
  // fallback runtime fa servir per a lots virtuals).
  lot.id = 'lot-' + Date.now().toString() + '-' + Math.random().toString(36).slice(2, 6);

  const migrated = {
    id: (legacy && legacy.id) || (Date.now().toString() + Math.random().toString(36).slice(2, 6)),
    popularId: (legacy && legacy.popularId) || null,
    name: legacy ? legacy.name : '',
    emoji: (legacy && legacy.emoji) || '🥫',
    __v: 2,
    lots: [lot],
    // MIRRORS — backward-compat per a callers existents.
    date: lot.date,
    noExpiry: !!lot.noExpiry,
    location: lot.location,
    qty: (legacy && legacy.qty) || '',
    addedAt: lot.addedAt,
    frozenDate: lot.frozenDate,
    consumedPercent: (legacy && legacy.consumedPercent) || 0
  };
  if (typeof lot.price === 'number') migrated.price = lot.price;
  if (lot.weight) migrated.weight = lot.weight;
  return migrated;
}

// Re-sincronitza els camps mirror al nivell producte amb el lot
// més urgent + qty agregat. Cridada per la migració després d'un
// auto-merge, per _addLotToProduct (Fase C) i per
// _removeLotFromProduct (undo de fusió). addedAt NO es regenera
// (és la data d'alta del producte agrupat). qty SÍ es regenera
// agregant els lots (Fase C+).
function _refreshProductMirrors(product) {
  if (!product || !Array.isArray(product.lots) || product.lots.length === 0) return;
  const primary = getPrimaryLot(product);
  if (!primary) return;
  product.date = primary.date;
  product.noExpiry = !!primary.noExpiry;
  product.location = primary.location;
  product.frozenDate = primary.frozenDate;
  if (typeof primary.price === 'number') product.price = primary.price;
  else delete product.price;
  if (primary.weight) product.weight = primary.weight;
  else delete product.weight;
  product.qty = _computeAggregatedQty(product.lots);
}

// Convenció de display per a les unitats: lowercase internament,
// però liter en majúscula (convenció SI). La resta es deixen tal qual.
function _displayUnit(unit) {
  if (unit === 'l') return 'L';
  return unit || '';
}

// Helper centralitzat per a mostrar la quantitat d'un lot. Retorna
// "0.75 kg" / "125 g" / "0.187 L" / "4" (unitats) / "60%" segons
// el mode. Arrodoneix a 3 decimals per a coherència amb el valor
// desat a lot.qtyRemaining (vegeu _confirmLotConsume, _confirmLotEdit).
function _formatLotQty(lot) {
  if (!lot) return '';
  if (lot.consumptionMode === 'quantity' && Number.isFinite(lot.qtyRemaining)) {
    const val = Math.round(lot.qtyRemaining * 1000) / 1000;
    const unit = (lot.unit && lot.unit !== 'units') ? _displayUnit(lot.unit) : '';
    return val + unit;
  }
  if (lot.consumptionMode === 'percent' && Number.isFinite(lot.percentRemaining)) {
    return lot.percentRemaining + '%';
  }
  return '';
}

// Genera el string qty agregat a partir dels lots. Estratègia:
//   - Suma unitats COMPATIBLES (g+kg → grams interns; ml+L → ml interns)
//     i tria la unitat de display segons el total:
//       gramsTotal >= 1000 → "X kg"; altrament → "X g"
//       mlTotal    >= 1000 → "X L";  altrament → "X ml"
//     'units' va sense unitat ("12").
//   - Multiples tipus mesurables (ex: kg+L) → "1.5 kg + 500 ml"
//   - Lots percent: si HI HA quantitats mesurables → " (i N lot(s) més)"
//                   si NOMÉS percent → "N lot(s)"
//   - Sense res (ni quantity ni percent) → ""
function _computeAggregatedQty(lots) {
  if (!Array.isArray(lots) || lots.length === 0) return '';

  let gramsTotal = 0;
  let mlTotal = 0;
  let unitsTotal = 0;
  let hasGrams = false;
  let hasMl = false;
  let hasUnits = false;
  let percentCount = 0;

  for (const lot of lots) {
    if (!lot) continue;
    if (lot.consumptionMode === 'quantity' && Number.isFinite(lot.qtyRemaining)) {
      const unit = (lot.unit || 'units').toLowerCase();
      if (unit === 'kg') {
        gramsTotal += lot.qtyRemaining * 1000;
        hasGrams = true;
      } else if (unit === 'g') {
        gramsTotal += lot.qtyRemaining;
        hasGrams = true;
      } else if (unit === 'l') {
        mlTotal += lot.qtyRemaining * 1000;
        hasMl = true;
      } else if (unit === 'ml') {
        mlTotal += lot.qtyRemaining;
        hasMl = true;
      } else {
        // unit='units' o desconegut. Si té weight parsejable
        // ('500g', '1L', etc.), agregem qtyRemaining × weight a
        // la suma de kg/L corresponent. Si no, queda com a unitats.
        let derived = false;
        if (lot.weight) {
          const wMatch = String(lot.weight).trim().match(/^([\d.,]+)\s*(ml|l|g|kg)$/i);
          if (wMatch) {
            const wNum = parseFloat(wMatch[1].replace(',', '.'));
            const wUnit = wMatch[2].toLowerCase();
            if (Number.isFinite(wNum)) {
              const totalPerUnit = lot.qtyRemaining * wNum;
              if (wUnit === 'kg') { gramsTotal += totalPerUnit * 1000; hasGrams = true; derived = true; }
              else if (wUnit === 'g') { gramsTotal += totalPerUnit; hasGrams = true; derived = true; }
              else if (wUnit === 'l') { mlTotal += totalPerUnit * 1000; hasMl = true; derived = true; }
              else if (wUnit === 'ml') { mlTotal += totalPerUnit; hasMl = true; derived = true; }
            }
          }
        }
        if (!derived) {
          unitsTotal += lot.qtyRemaining;
          hasUnits = true;
        }
      }
    } else if (lot.consumptionMode === 'percent') {
      percentCount++;
    }
  }

  const measurableParts = [];
  if (hasGrams) {
    if (gramsTotal >= 1000) {
      const kg = gramsTotal / 1000;
      measurableParts.push((Number.isInteger(kg) ? String(kg) : String(Math.round(kg * 100) / 100)) + ' kg');
    } else {
      measurableParts.push(Math.round(gramsTotal) + ' g');
    }
  }
  if (hasMl) {
    if (mlTotal >= 1000) {
      const l = mlTotal / 1000;
      measurableParts.push((Number.isInteger(l) ? String(l) : String(Math.round(l * 100) / 100)) + ' L');
    } else {
      measurableParts.push(Math.round(mlTotal) + ' ml');
    }
  }
  if (hasUnits) {
    measurableParts.push(String(unitsTotal));
  }

  const measurableStr = measurableParts.join(' + ');
  if (percentCount === 0) return measurableStr;
  if (measurableParts.length === 0) return percentCount + ' lot' + (percentCount === 1 ? '' : 's');
  return measurableStr + ' (i ' + percentCount + ' lot' + (percentCount === 1 ? '' : 's') + ' més)';
}

// Transformació PURA d'un array de productes (legacy o v2 barrejats)
// a v2 amb auto-merge de duplicats 1-lot per (nom, emoji, location).
// Productes ja v2 amb múltiples lots passen sense tocar.
function _transformProductsToV2(rawArr) {
  if (!Array.isArray(rawArr)) return { products: [], mergedCount: 0 };

  const migrated = [];
  for (const p of rawArr) {
    if (!p || typeof p !== 'object') continue;
    if (p.__v === 2 && Array.isArray(p.lots)) {
      migrated.push(p);
    } else {
      migrated.push(_migrateLegacyProduct(p));
    }
  }

  let mergedCount = 0;
  const groups = new Map();
  const result = [];
  const mergedHosts = new Set();
  for (const prod of migrated) {
    if (!Array.isArray(prod.lots) || prod.lots.length !== 1) {
      result.push(prod);
      continue;
    }
    const lot = prod.lots[0];
    const key = _normForGrouping(prod.name) + '|' + (prod.emoji || '') + '|' + (lot && lot.location ? lot.location : '');
    if (groups.has(key)) {
      const host = groups.get(key);
      host.lots.push(...prod.lots);
      mergedCount++;
      mergedHosts.add(host);
    } else {
      groups.set(key, prod);
      result.push(prod);
    }
  }

  // Post-merge: re-sincronitzar mirrors als hosts que han rebut lots
  // fusionats — el lot més urgent pot venir d'un dels productes que
  // s'ha incorporat, no del host original.
  for (const host of mergedHosts) {
    _refreshProductMirrors(host);
  }

  return { products: result, mergedCount };
}

// Auto-backup indelible abans de la migració. Idempotent: només crea
// la clau si encara no existeix. Cobrim products + popularCustom +
// consumption_history per cobertura preventiva.
function _createMigrationBackup() {
  try {
    if (localStorage.getItem(_PRODUCTS_V2_BACKUP_KEY)) return;
    const payload = {
      timestamp: new Date().toISOString(),
      appVersion: _APP_VERSION_FOR_BACKUP,
      products: JSON.parse(localStorage.getItem('eatmefirst_products') || '[]'),
      popularCustom: JSON.parse(localStorage.getItem('eatmefirst_popular_custom') || '[]'),
      consumptionHistory: JSON.parse(localStorage.getItem('eatmefirst_consumption_history') || '[]')
    };
    localStorage.setItem(_PRODUCTS_V2_BACKUP_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('[v2 migration] backup failed:', e);
  }
}

// One-shot per a Fase C+: refresca els qty mirrors dels productes
// multi-lot existents. Necessari perquè la Fase A v2 va deixar qty
// = legacy.qty del host (no agregat). Després d'aquest one-shot,
// p.qty representa la suma agregada dels lots (vegeu
// _computeAggregatedQty). Idempotent via flag separat — no
// invalida la flag de la migració v2 ni torna a fer backup.
const _QTY_MIRROR_REFRESH_FLAG = 'eatmefirst_qty_mirror_refresh_done';
function runQtyMirrorRefresh() {
  try {
    if (localStorage.getItem(_QTY_MIRROR_REFRESH_FLAG) === '1') {
      return { skipped: true };
    }
    const raw = JSON.parse(localStorage.getItem('eatmefirst_products') || '[]');
    if (!Array.isArray(raw)) {
      localStorage.setItem(_QTY_MIRROR_REFRESH_FLAG, '1');
      return { skipped: false, processed: 0 };
    }
    let processed = 0;
    for (const p of raw) {
      if (p && Array.isArray(p.lots) && p.lots.length > 1) {
        _refreshProductMirrors(p);
        processed++;
      }
    }
    localStorage.setItem('eatmefirst_products', JSON.stringify(raw));
    localStorage.setItem(_QTY_MIRROR_REFRESH_FLAG, '1');
    console.log('[qty mirror refresh] done: processed=' + processed);
    return { skipped: false, processed: processed };
  } catch (e) {
    console.error('[qty mirror refresh] failed:', e);
    return { skipped: false, error: String(e) };
  }
}

// One-shot 2026-05-22: re-agregació de qty per a lots units+weight.
// El fix a _computeAggregatedQty multiplica qtyRemaining × weight
// quan el lot és unit='units' amb weight parsejable ("500g", "1L"...).
// Sense aquest one-shot, els productes ja existents conserven el
// product.qty agregat antic fins al pròxim refreshProductMirrors
// (consum, edició, etc.). Aquest one-shot força el refresc per a
// TOTS els productes v2 (1 o N lots — el cas amb 1 lot també hi cap
// quan és pack contable amb weight). Idempotent via flag propi.
const _QTY_AGG_UNITS_WEIGHT_FLAG = 'eatmefirst_qty_agg_units_weight_20260522_done';
function runQtyAggregateUnitsWeightRefresh() {
  try {
    if (localStorage.getItem(_QTY_AGG_UNITS_WEIGHT_FLAG) === '1') {
      return { skipped: true };
    }
    const raw = JSON.parse(localStorage.getItem('eatmefirst_products') || '[]');
    if (!Array.isArray(raw)) {
      localStorage.setItem(_QTY_AGG_UNITS_WEIGHT_FLAG, '1');
      return { skipped: false, processed: 0 };
    }
    let processed = 0;
    for (const p of raw) {
      if (p && p.__v === 2 && Array.isArray(p.lots) && p.lots.length > 0) {
        _refreshProductMirrors(p);
        processed++;
      }
    }
    localStorage.setItem('eatmefirst_products', JSON.stringify(raw));
    localStorage.setItem(_QTY_AGG_UNITS_WEIGHT_FLAG, '1');
    console.log('[qty agg units+weight refresh] done: processed=' + processed);
    return { skipped: false, processed: processed };
  } catch (e) {
    console.error('[qty agg units+weight refresh] failed:', e);
    return { skipped: false, error: String(e) };
  }
}

// One-shot 2026-05-23: refresh complet de mirrors per a tots els
// productes v2. Bug: saveNewProduct cas 1-lot no cridava
// _refreshProductMirrors després de _createV2ProductWithLot, deixant
// product.qty al text literal del formulari (ex: "4") en lloc del
// càlcul agregat (ex: "2 kg" per a units × weight). Aquest one-shot
// rescata productes creats abans del fix amb mirror stale.
// Idempotent via flag propi.
const _MIRROR_REFRESH_ALL_FLAG = 'eatmefirst_mirror_refresh_all_products_20260523_done';
function runMirrorRefreshAllProductsRefresh() {
  try {
    if (localStorage.getItem(_MIRROR_REFRESH_ALL_FLAG) === '1') {
      return { skipped: true };
    }
    const raw = JSON.parse(localStorage.getItem('eatmefirst_products') || '[]');
    if (!Array.isArray(raw)) {
      localStorage.setItem(_MIRROR_REFRESH_ALL_FLAG, '1');
      return { skipped: false, processed: 0 };
    }
    let processed = 0;
    for (const p of raw) {
      if (p && p.__v === 2 && Array.isArray(p.lots) && p.lots.length > 0) {
        _refreshProductMirrors(p);
        processed++;
      }
    }
    localStorage.setItem('eatmefirst_products', JSON.stringify(raw));
    localStorage.setItem(_MIRROR_REFRESH_ALL_FLAG, '1');
    console.log('[mirror refresh all products] done: processed=' + processed);
    return { skipped: false, processed: processed };
  } catch (e) {
    console.error('[mirror refresh all products] failed:', e);
    return { skipped: false, error: String(e) };
  }
}

// Migració one-shot al boot. Flag a localStorage garanteix execució
// única per dispositiu. La transformació és idempotent — re-executar-la
// sobre dades ja v2 dóna el mateix resultat — però el flag evita el
// treball innecessari i un segon backup.
function runProductsV2Migration() {
  try {
    if (localStorage.getItem(_PRODUCTS_V2_MIGRATION_FLAG) === '1') {
      return { skipped: true };
    }
    _createMigrationBackup();
    const raw = JSON.parse(localStorage.getItem('eatmefirst_products') || '[]');
    const { products: migrated, mergedCount } = _transformProductsToV2(raw);
    localStorage.setItem('eatmefirst_products', JSON.stringify(migrated));
    localStorage.setItem(_PRODUCTS_V2_MIGRATION_FLAG, '1');
    console.log('[v2 migration] done: total=' + migrated.length + ' merged=' + mergedCount);
    return { skipped: false, total: migrated.length, merged: mergedCount };
  } catch (e) {
    console.error('[v2 migration] failed:', e);
    return { skipped: false, error: String(e) };
  }
}

// =============================================================
//   FUSIÓ EN CREACIÓ — Fase C
//   Quan un nou producte coincideix amb un d'existent per
//   (nom normalitzat + emoji + location), afegim un lot al
//   producte existent enlloc de duplicar.
// =============================================================

// Normalitza un string de pes/volum al format canònic del catàleg
// POPULAR_PRODUCTS: sense espai entre número i unitat, decimal punt,
// "L" majúscula (convenció SI), resta lowercase. Si la cadena no
// encaixa amb el patró pes/volum, retorna el text trim-ed sense
// modificar — preserva "mig kg", "12u", "6x33cl", text lliure.
function _normalizeWeightString(s) {
  if (typeof s !== 'string') return s;
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  const m = trimmed.match(/^([\d.,]+)\s*(ml|l|g|kg)$/i);
  if (!m) return trimmed;
  const num = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(num) || num < 0) return trimmed;
  const numStr = String(num);
  const unitLower = m[2].toLowerCase();
  const unitCanon = (unitLower === 'l') ? 'L' : unitLower;
  return numStr + unitCanon;
}

// Cerca un producte v2 existent que coincideixi exactament per
// (nom normalitzat, emoji, location). Retorna null si no n'hi ha.
// La location comparada és la del producte (mirror) — equival al
// lot més urgent.
function _findGroupedProductForFusion(name, emoji, location) {
  if (!Array.isArray(products)) return null;
  const nameKey = _normForGrouping(name);
  const emojiKey = emoji || '';
  const locKey = location || '';
  return products.find(p => {
    if (!p || p.__v !== 2) return false;
    if (_normForGrouping(p.name) !== nameKey) return false;
    if ((p.emoji || '') !== emojiKey) return false;
    if ((p.location || '') !== locKey) return false;
    return true;
  }) || null;
}

// Construeix un lot v2 des de les dades d'una compra/formulari nou.
// Mateixa estructura que la migració però des de productData (plain
// object amb els camps tal com avui es passarien a products.push).
function _buildLotFromNewProduct(productData) {
  const qtyStr = (productData && productData.qty) || '';
  const qtyNum = (typeof parseQtyNumber === 'function') ? parseQtyNumber(qtyStr) : null;

  const lot = {
    id: 'lot-' + Date.now().toString() + '-' + Math.random().toString(36).slice(2, 6),
    date: (productData && productData.date) || null,
    noExpiry: !!(productData && productData.noExpiry),
    location: (productData && productData.location) || 'pantry',
    addedAt: (productData && productData.addedAt) || new Date().toISOString(),
    frozenDate: (productData && productData.frozenDate) || null,
    supermarket: (productData && productData.supermarket) || null
  };
  if (productData && typeof productData.price === 'number' && productData.price >= 0) lot.price = productData.price;
  if (productData && productData.weight) lot.weight = _normalizeWeightString(productData.weight);

  if (qtyNum !== null) {
    lot.consumptionMode = 'quantity';
    lot.qtyInitial = qtyNum;
    lot.qtyRemaining = qtyNum;
    lot.unit = 'units';
    return lot;
  }
  const trimmed = qtyStr.trim();
  const m = trimmed && trimmed.match(/^([\d.,]+)\s*(ml|l|g|kg)$/i);
  if (m) {
    const num = parseFloat(m[1].replace(',', '.'));
    if (Number.isFinite(num)) {
      lot.consumptionMode = 'quantity';
      lot.qtyInitial = num;
      lot.qtyRemaining = num;
      lot.unit = m[2].toLowerCase();
      return lot;
    }
  }
  lot.consumptionMode = 'percent';
  lot.percentRemaining = 100;
  return lot;
}

// Crea un producte v2 amb un únic lot. Mateix esquema que
// _migrateLegacyProduct però partint de productData + el lot ja
// construït. Mirrors copiats del lot (date, location, etc.) i del
// productData (qty, addedAt).
function _createV2ProductWithLot(productData, lot) {
  const product = {
    id: (productData && productData.id) || (Date.now().toString() + Math.random().toString(36).slice(2, 6)),
    popularId: (productData && productData.popularId) || null,
    name: productData ? productData.name : '',
    emoji: (productData && productData.emoji) || '🥫',
    __v: 2,
    lots: [lot],
    date: lot.date,
    noExpiry: !!lot.noExpiry,
    location: lot.location,
    qty: (productData && productData.qty) || '',
    addedAt: lot.addedAt,
    frozenDate: lot.frozenDate,
    consumedPercent: 0
  };
  if (typeof lot.price === 'number') product.price = lot.price;
  if (lot.weight) product.weight = lot.weight;
  return product;
}

// Afegeix un lot a un producte existent i re-sincronitza els mirrors
// al lot més urgent. Mutació in-place: NO desa NO renderitza (callers
// agrupen).
function _addLotToProduct(existingProduct, newLot) {
  if (!existingProduct || !newLot) return;
  if (!Array.isArray(existingProduct.lots)) existingProduct.lots = [];
  existingProduct.lots.push(newLot);
  _refreshProductMirrors(existingProduct);
}

// Treu un lot d'un producte existent per id. Si el producte queda
// sense lots, retorna { productRemoved: true } perquè el caller
// l'elimini de products[]. Altrament re-sincronitza mirrors i
// retorna { productRemoved: false }.
function _removeLotFromProduct(product, lotId) {
  if (!product || !Array.isArray(product.lots)) return { productRemoved: false };
  product.lots = product.lots.filter(l => l && l.id !== lotId);
  if (product.lots.length === 0) {
    return { productRemoved: true };
  }
  _refreshProductMirrors(product);
  return { productRemoved: false };
}

// =============================================================
//   HELPERS de producte agrupat
//   Resilients a productes legacy via fallback transparent:
//   getLots(legacyProd) retorna [lot-virtual] sense mutar el producte.
//   Fase A v2 no els consumeix encara; fases B+ els integraran als
//   reads gradualment, i les fases finals retiraran els mirrors.
// =============================================================

function getLots(product) {
  if (!product || typeof product !== 'object') return [];
  if (product.__v === 2 && Array.isArray(product.lots)) return product.lots;
  return [_buildLotFromLegacy(product)];
}

function getPrimaryLot(product) {
  const lots = getLots(product);
  if (lots.length === 0) return null;
  if (lots.length === 1) return lots[0];
  const sorted = lots.slice().sort((a, b) => {
    if (a.noExpiry && b.noExpiry) return 0;
    if (a.noExpiry) return 1;
    if (b.noExpiry) return -1;
    const da = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
    const db = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
    return da - db;
  });
  return sorted[0];
}

function getPrimaryDate(product) {
  const lot = getPrimaryLot(product);
  return lot ? lot.date : null;
}

function getPrimaryLocation(product) {
  const lot = getPrimaryLot(product);
  return lot ? lot.location : null;
}

function getLotById(product, lotId) {
  if (!product || !lotId) return null;
  const lots = getLots(product);
  return lots.find(l => l && l.id === lotId) || null;
}

// Suma agregada per unitat + comptador de lots 'percent'. Útil per a
// futurs displays tipus "Tens 3 lots: 1.5L + 500g + 2u (+ 1 lot al 60%)".
function getTotalQty(product) {
  const out = { byUnit: Object.create(null), percentLots: 0, percentAvg: 0 };
  const lots = getLots(product);
  let pctSum = 0;
  let pctCount = 0;
  for (const lot of lots) {
    if (!lot) continue;
    if (lot.consumptionMode === 'quantity' && Number.isFinite(lot.qtyRemaining)) {
      const u = lot.unit || 'units';
      out.byUnit[u] = (out.byUnit[u] || 0) + lot.qtyRemaining;
    } else if (lot.consumptionMode === 'percent' && Number.isFinite(lot.percentRemaining)) {
      pctSum += lot.percentRemaining;
      pctCount++;
    }
  }
  out.percentLots = pctCount;
  out.percentAvg = pctCount > 0 ? pctSum / pctCount : 0;
  return out;
}

function getLotsByLocation(product, location) {
  return getLots(product).filter(l => l && l.location === location);
}

// =============================================================
//   RENDER de la secció "Lots" al detall del producte (Fase C+)
//   Només lectura: cap interacció per lot (consumir/editar per lot
//   es deixa per a Fase D). Es mostra només si lots.length > 1.
// =============================================================

function _renderLotsSection(product) {
  const lots = getLots(product);
  if (lots.length === 0) return '';

  // Ordenar lots: més urgent primer (mateix criteri que getPrimaryLot).
  const sorted = lots.slice().sort((a, b) => {
    if (a.noExpiry && b.noExpiry) return 0;
    if (a.noExpiry) return 1;
    if (b.noExpiry) return -1;
    const da = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
    const db = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
    return da - db;
  });

  const title = lots.length === 1
    ? '📦 Lot'
    : '📦 Lots (' + lots.length + ')';
  const rowsHtml = sorted.map(_renderLotRow).join('');
  return '<div class="lots-section">'
    + '<h3 class="lots-section-title">' + title + '</h3>'
    + '<div class="lots-list">' + rowsHtml + '</div>'
    + '</div>';
}

function _renderLotRow(lot) {
  if (!lot) return '';

  // Quantitat formatejada (helper centralitzat — vegeu _formatLotQty).
  let qtyText = _formatLotQty(lot);
  if (!qtyText && lot.consumptionMode === 'percent') {
    qtyText = '100%';
  }

  // Data
  let dateText = '';
  if (lot.noExpiry) {
    dateText = 'No caduca';
  } else if (lot.date) {
    const d = new Date(lot.date);
    if (!isNaN(d.getTime())) {
      dateText = 'Caduca ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    }
  }

  const superText = lot.supermarket || '';
  const priceText = (typeof lot.price === 'number') ? lot.price.toFixed(2) + ' €' : '';

  // Data d'alta relativa
  let addedText = '';
  if (lot.addedAt) {
    const d = new Date(lot.addedAt);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays === 0) addedText = 'Comprat avui';
      else if (diffDays === 1) addedText = 'Comprat ahir';
      else addedText = 'Comprat fa ' + diffDays + ' dies';
    }
  }

  // Weight visible només si difereix del qtyText (evita "500g × 500g"
  // en lots legacy on lot.weight duplica el qty parsejat). Normalitzem
  // espais perquè "500g" i "500 g" comptin com a iguals. Text lliure
  // no parsejable (ex: "mig kg") es pinta tal qual.
  const weightText = lot.weight ? String(lot.weight) : '';
  const _normWQ = s => String(s || '').trim().toLowerCase().replace(/\s+/g, '');
  const weightDiffersFromQty = !!weightText && _normWQ(weightText) !== _normWQ(qtyText);

  // qty i weight es combinen amb "×" (multiplicació semàntica) en un sol
  // segment "lot-qty". La resta de segments (data, supermercat) viuen en
  // segments propis separats per `gap` CSS — sense punt mig "·".
  const qtyWeightParts = [];
  if (qtyText) qtyWeightParts.push(qtyText);
  if (weightDiffersFromQty) qtyWeightParts.push(weightText);
  const qtyWeightCombined = qtyWeightParts.join(' × ');

  const parts1 = [];
  if (qtyWeightCombined) parts1.push('<span class="lot-qty">' + escapeHtml(qtyWeightCombined) + '</span>');
  if (dateText) parts1.push('<span class="lot-date">' + escapeHtml(dateText) + '</span>');
  if (superText) parts1.push('<span class="lot-supermarket">' + escapeHtml(superText) + '</span>');

  const parts2 = [];
  if (priceText) parts2.push('<span class="lot-price">' + escapeHtml(priceText) + '</span>');
  if (addedText) parts2.push('<span class="lot-added">' + escapeHtml(addedText) + '</span>');

  const lotIdAttr = lot.id ? ' data-lot-id="' + escapeHtml(lot.id) + '"' : '';
  const actionsHtml = lot.id
    ? '<div class="lot-actions">'
      + '<button class="lot-action-btn lot-eat-btn" data-lot-action="eat" data-lot-id="' + escapeHtml(lot.id) + '" aria-label="Menjar">✓</button>'
      + '<button class="lot-action-btn lot-trash-btn" data-lot-action="trash" data-lot-id="' + escapeHtml(lot.id) + '" aria-label="Llençar">🗑️</button>'
      + '<button class="lot-action-btn lot-edit-btn" data-lot-action="edit" data-lot-id="' + escapeHtml(lot.id) + '" aria-label="Editar">✏️</button>'
      + '<button class="lot-action-btn lot-more-btn" data-lot-action="more" data-lot-id="' + escapeHtml(lot.id) + '" aria-label="Més accions">⋯</button>'
      + '</div>'
    : '';
  return '<div class="lot-row"' + lotIdAttr + '>'
    + '<div class="lot-info">' + parts1.join('') + '</div>'
    + (parts2.length > 0 ? '<div class="lot-meta">' + parts2.join('') + '</div>' : '')
    + actionsHtml
    + '</div>';
}

// =============================================================
//   FASE D v2 — Accions per lot + modals + bind d'accions
// =============================================================

// Helper modal de confirmació genèric. Patró similar al modal
// "Canvis sense desar" d'Editar compres recents (recent-purchases.js).
function _confirmModal(message, onConfirm, options) {
  const opts = options || {};
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const confirmLabel = opts.confirmLabel || 'Sí';
  const cancelLabel = opts.cancelLabel || 'Cancel·lar';
  const danger = opts.danger !== false;
  overlay.innerHTML =
    '<div class="modal-content">' +
      '<p class="modal-title">' + escapeHtml(opts.title || 'Confirma') + '</p>' +
      '<p class="modal-sub">' + escapeHtml(message) + '</p>' +
      '<div class="modal-buttons">' +
        '<button class="modal-cancel" id="cm-cancel">' + escapeHtml(cancelLabel) + '</button>' +
        '<button class="modal-confirm' + (danger ? ' modal-confirm-danger' : '') + '" id="cm-confirm">' + escapeHtml(confirmLabel) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#cm-cancel').addEventListener('click', close);
  overlay.querySelector('#cm-confirm').addEventListener('click', () => {
    close();
    if (typeof onConfirm === 'function') onConfirm();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// Delegació click per a la llista de lots. Re-bind cada cop que es
// re-renderitza (clone+replace).
function _bindLotActions(container, product) {
  if (!container) return null;
  const clone = container.cloneNode(true);
  container.parentNode.replaceChild(clone, container);
  clone.addEventListener('click', function(e) {
    const btn = e.target && e.target.closest ? e.target.closest('.lot-action-btn') : null;
    if (!btn) return;
    const lotId = btn.getAttribute('data-lot-id');
    const action = btn.getAttribute('data-lot-action');
    if (!lotId || !action) return;
    const lot = getLotById(product, lotId);
    if (!lot) return;
    if (action === 'eat')        openLotConsumeModal(product, lot, 'eat');
    else if (action === 'trash') openLotConsumeModal(product, lot, 'trash');
    else if (action === 'edit')  openLotEditModal(product, lot);
    else if (action === 'more')  _openLotMoreMenu(btn, product, lot);
  });
  return clone;
}

// Menú flotant ⋯. Conté "Moure" (Fase D2) i "Esborrar lot" (Fase D v2).
function _openLotMoreMenu(anchorBtn, product, lot) {
  document.querySelectorAll('.lot-more-menu').forEach(m => m.parentNode.removeChild(m));

  const menu = document.createElement('div');
  menu.className = 'lot-more-menu open';
  menu.innerHTML =
      '<button type="button" data-action="move-lot">🚚 Moure</button>'
    + '<button type="button" class="lot-delete-btn" data-action="delete-lot">❌ Esborrar lot</button>';

  document.body.appendChild(menu);

  const rect = anchorBtn.getBoundingClientRect();
  menu.style.position = 'absolute';
  menu.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  menu.style.left = Math.max(8, rect.right + window.scrollX - menu.offsetWidth) + 'px';

  const closeMenu = () => {
    if (menu.parentNode) menu.parentNode.removeChild(menu);
    document.removeEventListener('click', onDocClick, true);
  };
  function onDocClick(ev) {
    if (menu.contains(ev.target)) return;
    if (ev.target === anchorBtn) return;
    closeMenu();
  }
  setTimeout(() => document.addEventListener('click', onDocClick, true), 0);

  menu.querySelector('[data-action="move-lot"]').addEventListener('click', () => {
    closeMenu();
    _openMoveLotModal(product, lot);
  });
  menu.querySelector('[data-action="delete-lot"]').addEventListener('click', () => {
    closeMenu();
    _deleteLot(product, lot.id);
  });
}

function openLotConsumeModal(product, lot, action) {
  if (!product || !lot) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const isEat = (action === 'eat');
  const verbInf = isEat ? 'Menjar' : 'Llençar';
  const verbPp  = isEat ? 'menjat' : 'llençat';
  const icon    = isEat ? '✓' : '🗑️';

  let bodyHtml;
  if (lot.consumptionMode === 'quantity') {
    const unit = lot.unit || 'units';
    const unitDisplay = unit === 'units' ? '' : _displayUnit(unit);
    const qtyRem = Number.isFinite(lot.qtyRemaining) ? lot.qtyRemaining : 0;
    const qtyInit = Number.isFinite(lot.qtyInitial) ? lot.qtyInitial : qtyRem;
    let step = '1';
    if (unit === 'kg' || unit === 'l') step = '0.1';
    else if (unit === 'g' || unit === 'ml') step = '50';
    const fmtNum = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
    const unitLbl = unitDisplay || 'unitats';
    bodyHtml = '<p class="modal-sub">Lot: ' + escapeHtml(fmtNum(qtyInit) + (unitDisplay || ' u')) + ' inicial, queda ' + escapeHtml(fmtNum(qtyRem) + (unitDisplay || ' u')) + '</p>'
      + '<div class="lot-consume-chips">'
      + '<button type="button" class="cook-chip" data-pct="25">25%</button>'
      + '<button type="button" class="cook-chip" data-pct="50">50%</button>'
      + '<button type="button" class="cook-chip" data-pct="75">75%</button>'
      + '<button type="button" class="cook-chip active" data-pct="100">100%</button>'
      + '</div>'
      + '<p class="lot-consume-or">o</p>'
      + '<div class="lot-consume-input">'
      + '<label>Quants ' + escapeHtml(unitLbl) + ' has ' + verbPp + '?</label>'
      + '<div class="lot-consume-input-row">'
      + '<input type="number" id="lot-consume-amount" min="0" max="' + qtyRem + '" value="' + qtyRem + '" step="' + step + '" inputmode="decimal">'
      + (unitDisplay ? '<span class="lot-consume-unit">' + escapeHtml(unitDisplay) + '</span>' : '')
      + '</div></div>'
      + '<p class="lot-consume-info">Quedaran: <span id="lot-remaining-after">0</span> ' + escapeHtml(unitLbl) + '</p>';
  } else {
    const pctRem = Number.isFinite(lot.percentRemaining) ? Math.round(lot.percentRemaining) : 100;
    bodyHtml = '<p class="modal-sub">Lot: ' + pctRem + '% restant</p>'
      + '<div class="lot-consume-chips">'
      + '<button type="button" class="cook-chip" data-pct="25">25%</button>'
      + '<button type="button" class="cook-chip" data-pct="50">50%</button>'
      + '<button type="button" class="cook-chip" data-pct="75">75%</button>'
      + '<button type="button" class="cook-chip active" data-pct="100">100%</button>'
      + '</div>'
      + '<p class="lot-consume-info">Quedarà: <span id="lot-remaining-after">0</span>%</p>';
  }

  overlay.innerHTML = '<div class="modal-content lot-consume-modal">'
    + '<div class="modal-emoji-big">' + (product.emoji || '🥫') + '</div>'
    + '<p class="modal-title">' + icon + ' ' + verbInf + ' ' + escapeHtml(product.name) + '</p>'
    + bodyHtml
    + '<div class="modal-buttons">'
    + '<button class="modal-cancel" id="lot-consume-cancel">Cancel·lar</button>'
    + '<button class="modal-confirm" id="lot-consume-confirm">Confirmar</button>'
    + '</div></div>';

  document.body.appendChild(overlay);

  const remainingAfterEl = overlay.querySelector('#lot-remaining-after');
  let selectedAmount;

  if (lot.consumptionMode === 'quantity') {
    const input = overlay.querySelector('#lot-consume-amount');
    selectedAmount = parseFloat(input.value) || 0;
    const chips = overlay.querySelectorAll('.lot-consume-chips .cook-chip');

    const updateRemainingDisplay = () => {
      const after = Math.max(0, (lot.qtyRemaining || 0) - selectedAmount);
      remainingAfterEl.textContent = Number.isInteger(after) ? String(after) : String(Math.round(after * 1000) / 1000);
    };

    // Marca el chip que coincideix EXACTAMENT amb la qty triada.
    // Cap si no n'hi ha (l'usuari ha posat un valor lliure).
    const refreshChipState = () => {
      const total = lot.qtyRemaining || 0;
      if (!total) { chips.forEach(c => c.classList.remove('active')); return; }
      const pct = (selectedAmount / total) * 100;
      let matched = null;
      chips.forEach(c => {
        const cp = parseFloat(c.dataset.pct);
        if (Math.abs(cp - pct) < 0.5) matched = c;
      });
      chips.forEach(c => c.classList.toggle('active', c === matched));
    };

    // Click chip → valor exacte (pct/100 del total), només arrodonit
    // a 3 decimals per evitar imprecisions de floats. NO s'arrodoneix
    // al step de l'input — el chip ha de retornar el valor exacte
    // (25% de 1 kg = 0.25 kg, no 0.3 kg).
    chips.forEach(c => {
      c.addEventListener('click', () => {
        const pct = parseInt(c.dataset.pct, 10) || 0;
        const total = lot.qtyRemaining || 0;
        // 100% mapeja directament a qtyRemaining per evitar drift
        // d'arrodoniment quan qtyRemaining no és múltiple net.
        let amt = pct === 100 ? total : Math.round((total * pct / 100) * 1000) / 1000;
        amt = Math.max(0, Math.min(total, amt));
        selectedAmount = amt;
        input.value = Number.isInteger(amt) ? String(amt) : String(Math.round(amt * 1000) / 1000);
        chips.forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        updateRemainingDisplay();
      });
    });

    const update = () => {
      const v = parseFloat(input.value);
      selectedAmount = Number.isFinite(v) && v >= 0 ? v : 0;
      refreshChipState();
      updateRemainingDisplay();
    };
    updateRemainingDisplay();
    refreshChipState(); // 100% actiu per defecte (selectedAmount = qtyRemaining)
    input.addEventListener('input', update);
  } else {
    selectedAmount = 100;
    const update = () => {
      const after = Math.max(0, (lot.percentRemaining || 100) - selectedAmount);
      remainingAfterEl.textContent = String(after);
    };
    update();
    overlay.querySelectorAll('.cook-chip').forEach(c => {
      c.addEventListener('click', () => {
        overlay.querySelectorAll('.cook-chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        selectedAmount = parseInt(c.dataset.pct, 10) || 0;
        update();
      });
    });
  }

  overlay.querySelector('#lot-consume-cancel').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  overlay.querySelector('#lot-consume-confirm').addEventListener('click', () => {
    const amount = selectedAmount;
    if (lot.consumptionMode === 'quantity') {
      if (!Number.isFinite(amount) || amount <= 0) {
        showToast('Quantitat invàlida');
        return;
      }
      if (amount > (lot.qtyRemaining || 0) + 0.0001) {
        showToast('Quantitat superior al disponible (' + _formatLotQty(lot) + ')');
        return;
      }
    } else {
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
        showToast('Percentatge invàlid');
        return;
      }
    }
    document.body.removeChild(overlay);
    _confirmLotConsume(product, lot, action, amount);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function _confirmLotConsume(product, lot, action, amount) {
  if (!product || !lot) return;

  // Re-busca referències vives dins de products[]. openProduct
  // reconstrueix currentProduct entre edicions successives → la
  // closure pot capturar una referència obsoleta (vegeu fix Fase D v2).
  const realProduct = products.find(p => p.id === product.id);
  if (!realProduct) {
    console.warn('[_confirmLotConsume] producte no trobat:', product.id);
    return;
  }
  const realLot = realProduct.lots && realProduct.lots.find(l => l.id === lot.id);
  if (!realLot) {
    console.warn('[_confirmLotConsume] lot no trobat:', lot.id);
    return;
  }

  let consumedPercent;
  if (realLot.consumptionMode === 'quantity') {
    const startQty = realLot.qtyRemaining;
    const newQty = startQty - amount;
    if (newQty <= 0.001) {
      consumedPercent = 100;
      _registerConsumption(realProduct, realLot, action, consumedPercent);
      _removeLotFromProduct(realProduct, realLot.id);
    } else {
      consumedPercent = startQty > 0 ? Math.round((amount / startQty) * 100) : 100;
      // Arrodoniment a 3 decimals per evitar drift de float (0.74999... → 0.75)
      realLot.qtyRemaining = Math.round(newQty * 1000) / 1000;
      _registerConsumption(realProduct, realLot, action, consumedPercent);
      _refreshProductMirrors(realProduct);
    }
  } else {
    const startPct = realLot.percentRemaining || 100;
    const newPct = startPct - amount;
    consumedPercent = amount;
    if (newPct <= 0) {
      _registerConsumption(realProduct, realLot, action, consumedPercent);
      _removeLotFromProduct(realProduct, realLot.id);
    } else {
      realLot.percentRemaining = newPct;
      _registerConsumption(realProduct, realLot, action, consumedPercent);
      _refreshProductMirrors(realProduct);
    }
  }

  if (action === 'eat') stats.consumed++;
  else stats.trashed++;

  if (typeof addXp === 'function' && action === 'eat') {
    let xp = Math.round(10 * consumedPercent / 100);
    const days = (typeof daysUntil === 'function' && realLot.date) ? daysUntil(realLot.date) : null;
    if (typeof days === 'number' && isFinite(days) && days <= 1) xp += 5;
    addXp(xp, 'consumed');
  } else if (typeof checkBadges === 'function' && action === 'trash') {
    checkBadges();
  }

  if (!Array.isArray(realProduct.lots) || realProduct.lots.length === 0) {
    products = products.filter(p => p.id !== realProduct.id);
    saveData();
    if (typeof updateStatsSub === 'function') updateStatsSub();
    showToast('✓ Producte consumit del tot');
    if (typeof renderHome === 'function') renderHome();
    navigateAfterAction();
    currentProduct = null;
    // Oferir afegir al BuyMe (mateix patró que finalizeConsumption del
    // camí legacy). Skip si ja és al BuyMe.
    if (!_isProductInBuyMe(realProduct.name) && typeof askAddToShoppingList === 'function') {
      setTimeout(() => askAddToShoppingList(realProduct), 600);
    }
    return;
  }

  saveData();
  if (typeof updateStatsSub === 'function') updateStatsSub();
  openProduct(realProduct.id);
  showToast(action === 'eat' ? '✓ Lot consumit' : '🗑️ Lot llençat');
}

// Comprovació "ja és al BuyMe" per evitar oferir afegir-lo dues vegades
// quan consumes l'últim lot. Match case-insensitive per nom — coherent
// amb la resta de matches de l'app.
function _isProductInBuyMe(name) {
  if (!name || typeof shoppingItems === 'undefined' || !Array.isArray(shoppingItems)) return false;
  const key = String(name).toLowerCase().trim();
  return shoppingItems.some(it => it && it.name && String(it.name).toLowerCase().trim() === key);
}

function _registerConsumption(product, lot, action, consumedPercent) {
  if (typeof recordConsumption !== 'function') return;
  const productForRecord = Object.assign({}, product, {
    price: lot.price,
    qty: ''
  });
  recordConsumption(productForRecord, action === 'eat' ? 'consumed' : 'trashed', consumedPercent);
}

function openLotEditModal(product, lot) {
  if (!product || !lot) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  let qtyFieldHtml;
  if (lot.consumptionMode === 'quantity') {
    const unit = lot.unit || 'units';
    const unitDisplay = unit === 'units' ? '' : _displayUnit(unit);
    let step = '1';
    if (unit === 'kg' || unit === 'l') step = '0.1';
    else if (unit === 'g' || unit === 'ml') step = '50';
    const qtyRem = Number.isFinite(lot.qtyRemaining) ? lot.qtyRemaining : 0;
    qtyFieldHtml = '<div class="lot-edit-field">'
      + '<label>Quantitat actual</label>'
      + '<div class="lot-consume-input-row">'
      + '<input type="number" id="lot-edit-qty" min="0" step="' + step + '" value="' + qtyRem + '" inputmode="decimal">'
      + (unitDisplay ? '<span class="lot-consume-unit">' + escapeHtml(unitDisplay) + '</span>' : '')
      + '</div></div>';
  } else {
    const pct = Number.isFinite(lot.percentRemaining) ? Math.round(lot.percentRemaining) : 100;
    qtyFieldHtml = '<div class="lot-edit-field"><label>Quantitat actual</label>'
      + '<div class="lot-consume-chips" id="lot-edit-qty-chips">'
      + [100, 75, 50, 25].map(v =>
          '<button type="button" class="cook-chip' + (v === pct ? ' active' : '') + '" data-pct="' + v + '">' + v + '%</button>'
        ).join('')
      + '</div>'
      + '<input type="hidden" id="lot-edit-qty" value="' + pct + '">'
      + '</div>';
  }

  const smList = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets)) ? supermarkets : [];
  const currentSmName = lot.supermarket || '';
  // lot.supermarket desa el NAME (contracte actual); resolem l'id
  // per a pre-seleccionar el picker.
  let currentSmId = '';
  if (currentSmName) {
    const matched = smList.find(s => s && s.name === currentSmName);
    if (matched) currentSmId = matched.id;
  }
  const smPickerOptions = [{ id: '', icon: '🚫', label: '(Cap)' }]
    .concat(smList.map(sm => ({ id: sm.id, icon: sm.emoji || '🛒', label: sm.name })));

  const dateVal = lot.date || '';
  const noExpiry = !!lot.noExpiry;
  const priceVal = (typeof lot.price === 'number') ? String(lot.price) : '';
  const weightVal = lot.weight ? String(lot.weight) : '';

  overlay.innerHTML = '<div class="modal-content lot-edit-modal">'
    + '<p class="modal-title">✏️ Editar lot</p>'
    + qtyFieldHtml
    + '<div class="lot-edit-field">'
    + '<label>Data de caducitat</label>'
    + '<input type="date" id="lot-edit-date" value="' + escapeHtml(dateVal) + '"' + (noExpiry ? ' disabled' : '') + '>'
    + '<label class="lot-noexpiry-toggle">'
    + '<input type="checkbox" id="lot-edit-noexpiry"' + (noExpiry ? ' checked' : '') + '> No caduca'
    + '</label></div>'
    + '<div class="lot-edit-field"><label>Preu (€)</label>'
    + '<input type="text" id="lot-edit-price" inputmode="decimal" value="' + escapeHtml(priceVal) + '"></div>'
    + '<div class="lot-edit-field"><label>Contingut per envàs (opcional)</label>'
    + '<input type="text" id="lot-edit-weight" placeholder="500g, 1L, 1kg..." maxlength="15" value="' + escapeHtml(weightVal) + '"></div>'
    + '<div class="lot-edit-field"><label>Supermercat</label>'
    + '<div class="category-picker-wrap">'
    + '<button type="button" class="category-picker-btn" id="lot-edit-supermarket-picker-btn">'
    + '<span class="picker-icon"></span>'
    + '<span class="picker-label"></span>'
    + '<span class="picker-arrow">▾</span>'
    + '</button>'
    + '<div class="category-picker-dropdown" id="lot-edit-supermarket-picker-dropdown" hidden></div>'
    + '</div></div>'
    + '<div class="modal-buttons">'
    + '<button class="modal-cancel" id="lot-edit-cancel">Cancel·lar</button>'
    + '<button class="modal-confirm" id="lot-edit-confirm">Desar canvis</button>'
    + '</div></div>';

  document.body.appendChild(overlay);

  const chipsEl = overlay.querySelector('#lot-edit-qty-chips');
  if (chipsEl) {
    chipsEl.querySelectorAll('.cook-chip').forEach(c => {
      c.addEventListener('click', () => {
        chipsEl.querySelectorAll('.cook-chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        const hidden = overlay.querySelector('#lot-edit-qty');
        if (hidden) hidden.value = c.dataset.pct;
      });
    });
  }

  const noExpiryEl = overlay.querySelector('#lot-edit-noexpiry');
  const dateEl = overlay.querySelector('#lot-edit-date');
  noExpiryEl.addEventListener('change', () => {
    dateEl.disabled = !!noExpiryEl.checked;
  });

  // Picker supermarket (helper genèric, mateix patró que category-picker)
  const destroySmPicker = _buildPickerDropdown(
    'lot-edit-supermarket-picker-btn',
    'lot-edit-supermarket-picker-dropdown',
    smPickerOptions,
    currentSmId
  );

  overlay.querySelector('#lot-edit-cancel').addEventListener('click', () => {
    destroySmPicker();
    document.body.removeChild(overlay);
  });
  overlay.querySelector('#lot-edit-confirm').addEventListener('click', () => {
    const smBtn = overlay.querySelector('#lot-edit-supermarket-picker-btn');
    const values = {
      qtyRaw: overlay.querySelector('#lot-edit-qty').value,
      date: overlay.querySelector('#lot-edit-date').value || null,
      noExpiry: !!overlay.querySelector('#lot-edit-noexpiry').checked,
      priceRaw: overlay.querySelector('#lot-edit-price').value,
      weightRaw: overlay.querySelector('#lot-edit-weight').value,
      supermarketId: smBtn ? (smBtn.dataset.value || '') : ''
    };
    destroySmPicker();
    document.body.removeChild(overlay);
    _confirmLotEdit(product, lot, values);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      destroySmPicker();
      document.body.removeChild(overlay);
    }
  });
}

function _confirmLotEdit(product, lot, v) {
  if (!product || !lot || !v) return;

  // Re-busca referències vives dins de products[]. La closure pot
  // haver capturat una referència obsoleta — openProduct reconstrueix
  // currentProduct després de cada edició (fix Fase D v2).
  const realProduct = products.find(p => p.id === product.id);
  if (!realProduct) {
    console.warn('[_confirmLotEdit] producte no trobat:', product.id);
    return;
  }
  const realLot = realProduct.lots && realProduct.lots.find(l => l.id === lot.id);
  if (!realLot) {
    console.warn('[_confirmLotEdit] lot no trobat:', lot.id);
    return;
  }

  const newQty = parseFloat(String(v.qtyRaw).replace(',', '.'));
  if (realLot.consumptionMode === 'quantity') {
    // Arrodoniment a 3 decimals (mateix patró que _confirmLotConsume).
    if (Number.isFinite(newQty) && newQty >= 0) realLot.qtyRemaining = Math.round(newQty * 1000) / 1000;
  } else {
    if (Number.isFinite(newQty) && newQty >= 0 && newQty <= 100) realLot.percentRemaining = newQty;
  }

  realLot.noExpiry = !!v.noExpiry;
  realLot.date = v.noExpiry ? null : v.date;

  if (v.priceRaw && String(v.priceRaw).trim()) {
    const cleaned = String(v.priceRaw).replace(',', '.').trim();
    const num = parseFloat(cleaned);
    if (Number.isFinite(num) && num >= 0) realLot.price = num;
    else delete realLot.price;
  } else {
    delete realLot.price;
  }

  if (v.supermarketId) {
    const sm = (typeof getSupermarketById === 'function') ? getSupermarketById(v.supermarketId) : null;
    realLot.supermarket = sm ? sm.name : null;
  } else {
    realLot.supermarket = null;
  }

  // Weight (text lliure: "500g", "1L", "12u"...). Buit → eliminem el
  // camp. Normalitzem al format canònic ("1l" → "1L", "500 g" → "500g").
  // Text lliure no parsejable es manté tal qual.
  const weightTrimmed = (typeof v.weightRaw === 'string') ? v.weightRaw.trim() : '';
  if (weightTrimmed) realLot.weight = _normalizeWeightString(weightTrimmed);
  else delete realLot.weight;

  if (realLot.consumptionMode === 'quantity' && realLot.qtyRemaining <= 0) {
    _removeLotFromProduct(realProduct, realLot.id);
  } else if (realLot.consumptionMode === 'percent' && realLot.percentRemaining <= 0) {
    _removeLotFromProduct(realProduct, realLot.id);
  } else {
    _refreshProductMirrors(realProduct);
  }

  if (!Array.isArray(realProduct.lots) || realProduct.lots.length === 0) {
    products = products.filter(p => p.id !== realProduct.id);
    saveData();
    showToast('Producte eliminat');
    if (typeof renderHome === 'function') renderHome();
    navigateAfterAction();
    currentProduct = null;
    return;
  }

  saveData();
  openProduct(realProduct.id);
  showToast('✓ Lot actualitzat');
}

function openProductEditModal(product, restoreState) {
  if (!product) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const initialName = restoreState ? restoreState.name : (product.name || '');
  const initialEmoji = restoreState ? restoreState.emoji : (product.emoji || '🥫');

  const catKey = product.popularId || product.id;
  let initialCatId = restoreState ? restoreState.categoryId : 'cat_other';
  let cats = [];
  if (window.CategoriesSystem) {
    if (!restoreState && typeof window.CategoriesSystem.getItemCategory === 'function') {
      initialCatId = window.CategoriesSystem.getItemCategory(catKey) || 'cat_other';
    }
    if (typeof window.CategoriesSystem.getCategories === 'function') {
      cats = window.CategoriesSystem.getCategories().slice().sort((a, b) =>
        (a.order || 0) - (b.order || 0)
      );
    }
  }
  const catOptions = cats.map(c => ({ id: c.id, icon: c.icon || '📦', label: c.name || c.id }));

  // Mateix patró visual que el botó d'emoji del formulari Afegir
  // (#btn-pick-emoji). Reusa .emoji-button + .emoji-button-current.
  const currentEmojiSelected = initialEmoji;

  overlay.innerHTML = '<div class="modal-content product-edit-modal">'
    + '<p class="modal-title">✏️ Editar producte</p>'
    + '<div class="lot-edit-field"><label>Nom</label>'
    + '<input type="text" id="product-edit-name" value="' + escapeHtml(initialName) + '"></div>'
    + '<div class="lot-edit-field"><label>Emoji</label>'
    + '<button type="button" class="emoji-button" id="product-edit-emoji-btn">'
    + '<span class="emoji-button-current" id="product-edit-emoji-display">' + escapeHtml(currentEmojiSelected) + '</span>'
    + '</button>'
    + '</div>'
    + (catOptions.length > 0
        ? '<div class="lot-edit-field"><label>Categoria</label>'
          + '<div class="category-picker-wrap">'
          + '<button type="button" class="category-picker-btn" id="product-edit-category-picker-btn">'
          + '<span class="picker-icon"></span>'
          + '<span class="picker-label"></span>'
          + '<span class="picker-arrow">▾</span>'
          + '</button>'
          + '<div class="category-picker-dropdown" id="product-edit-category-picker-dropdown" hidden></div>'
          + '</div></div>'
        : '')
    + '<p class="lot-edit-note">ℹ️ Quantitat, preu, data i supermercat es gestionen per lot.</p>'
    + '<div class="modal-buttons">'
    + '<button class="modal-cancel" id="product-edit-cancel">Cancel·lar</button>'
    + '<button class="modal-confirm" id="product-edit-confirm">Desar canvis</button>'
    + '</div></div>';

  document.body.appendChild(overlay);

  // Picker categoria (helper genèric)
  let destroyCatPicker = function () {};
  if (catOptions.length > 0) {
    destroyCatPicker = _buildPickerDropdown(
      'product-edit-category-picker-btn',
      'product-edit-category-picker-dropdown',
      catOptions,
      initialCatId
    );
  }

  // Botó emoji → desa estat + tanca modal + obre picker complet
  // (mateix patró que #btn-pick-emoji del formulari Afegir).
  overlay.querySelector('#product-edit-emoji-btn').addEventListener('click', () => {
    const catBtn = overlay.querySelector('#product-edit-category-picker-btn');
    _editProductModalState = {
      productId: product.id,
      name: overlay.querySelector('#product-edit-name').value,
      emoji: currentEmojiSelected,
      categoryId: catBtn ? (catBtn.dataset.value || initialCatId) : initialCatId
    };
    destroyCatPicker();
    document.body.removeChild(overlay);
    if (typeof openEmojiPicker === 'function') {
      openEmojiPicker('product-edit-emoji', 'product');
    }
  });

  overlay.querySelector('#product-edit-cancel').addEventListener('click', () => {
    destroyCatPicker();
    document.body.removeChild(overlay);
  });
  overlay.querySelector('#product-edit-confirm').addEventListener('click', () => {
    const catBtn = overlay.querySelector('#product-edit-category-picker-btn');
    const values = {
      name: overlay.querySelector('#product-edit-name').value.trim(),
      emoji: currentEmojiSelected,
      categoryId: catBtn ? (catBtn.dataset.value || null) : null
    };
    if (!values.name) {
      showToast('El nom és obligatori');
      return;
    }
    destroyCatPicker();
    document.body.removeChild(overlay);
    _confirmProductEdit(product, values);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      destroyCatPicker();
      document.body.removeChild(overlay);
    }
  });
}

function _confirmProductEdit(product, v) {
  if (!product || !v) return;

  // Re-busca referència viva (fix Fase D v2: closures poden tenir
  // referències obsoletes després de successius openProduct).
  const realProduct = products.find(p => p.id === product.id);
  if (!realProduct) {
    console.warn('[_confirmProductEdit] producte no trobat:', product.id);
    return;
  }

  realProduct.name = v.name;
  if (v.emoji) realProduct.emoji = v.emoji;

  if (v.categoryId && window.CategoriesSystem && typeof window.CategoriesSystem.setItemCategory === 'function') {
    const catKey = realProduct.popularId || realProduct.id;
    window.CategoriesSystem.setItemCategory(catKey, v.categoryId);
  }

  saveData();
  openProduct(realProduct.id);
  showToast('✓ Producte actualitzat');
}

function _deleteLot(product, lotId) {
  if (!product || !lotId) return;
  _confirmModal('Esborrar aquest lot?', () => {
    // Re-busca referència viva al moment de confirmar (fix Fase D v2).
    const realProduct = products.find(p => p.id === product.id);
    if (!realProduct) {
      console.warn('[_deleteLot] producte no trobat:', product.id);
      return;
    }
    _removeLotFromProduct(realProduct, lotId);
    if (!Array.isArray(realProduct.lots) || realProduct.lots.length === 0) {
      products = products.filter(p => p.id !== realProduct.id);
      saveData();
      showToast('Producte eliminat');
      if (typeof renderHome === 'function') renderHome();
      navigateAfterAction();
      currentProduct = null;
      return;
    }
    saveData();
    openProduct(realProduct.id);
    showToast('Lot eliminat');
  }, { title: 'Esborrar lot', confirmLabel: 'Esborrar', cancelLabel: 'Cancel·lar', danger: true });
}

// =============================================================
//   FASE D2 — Moure lot entre locations (mateix espai o un altre)
// =============================================================

// Cerca un producte v2 a una llista QUALSEVOL (no només el global
// products[]) per (name normalitzat, emoji, location). Necessari
// per a la fusió cross-space — la llista origen ve via FBSync.
function _findProductForFusionInList(list, name, emoji, location) {
  if (!Array.isArray(list)) return null;
  const nameKey = _normForGrouping(name);
  const emojiKey = emoji || '';
  const locKey = location || '';
  return list.find(p => {
    if (!p || p.__v !== 2) return false;
    if (_normForGrouping(p.name) !== nameKey) return false;
    if ((p.emoji || '') !== emojiKey) return false;
    if ((p.location || '') !== locKey) return false;
    return true;
  }) || null;
}

function _openMoveLotModal(product, lot) {
  if (!product || !lot) return;
  const SS = window.SpacesSystem;

  // Llista d'espais al picker: actiu primer + tots els que tenen syncCode
  const activeSpace = SS ? SS.getActiveSpace() : null;
  const allSpaces = SS ? SS.getSpaces() : [];
  const spaceOptions = [];
  if (activeSpace) {
    spaceOptions.push({
      id: activeSpace.id,
      icon: activeSpace.icon || '🏠',
      label: activeSpace.name + ' (actual)'
    });
  }
  allSpaces.forEach(s => {
    if (activeSpace && s.id === activeSpace.id) return;
    if (!s.syncCode) return;
    spaceOptions.push({ id: s.id, icon: s.icon || '🏠', label: s.name });
  });

  if (spaceOptions.length === 0) {
    showToast('No hi ha cap espai disponible');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  // Display via helper centralitzat (3 decimals, mateix format que
  // la fila del lot al detall).
  const lotQtyDisplay = _formatLotQty(lot) || ((lot.percentRemaining || 100) + '%');
  overlay.innerHTML = '<div class="modal-content move-lot-modal">'
    + '<p class="modal-title">🚚 Moure lot</p>'
    + '<p class="modal-sub">' + escapeHtml(lotQtyDisplay) + ' de '
    + escapeHtml((product.emoji || '') + ' ' + (product.name || '')) + '</p>'
    + '<div class="lot-edit-field"><label>Espai destí</label>'
    + '<div class="category-picker-wrap">'
    + '<button type="button" class="category-picker-btn" id="move-lot-space-picker-btn">'
    + '<span class="picker-icon"></span><span class="picker-label"></span><span class="picker-arrow">▾</span>'
    + '</button>'
    + '<div class="category-picker-dropdown" id="move-lot-space-picker-dropdown" hidden></div>'
    + '</div></div>'
    + '<div class="lot-edit-field"><label>Ubicació destí</label>'
    + '<div class="category-picker-wrap">'
    + '<button type="button" class="category-picker-btn" id="move-lot-location-picker-btn" disabled>'
    + '<span class="picker-icon">⏳</span><span class="picker-label">Carregant…</span><span class="picker-arrow">▾</span>'
    + '</button>'
    + '<div class="category-picker-dropdown" id="move-lot-location-picker-dropdown" hidden></div>'
    + '</div></div>'
    + '<p class="lot-edit-note">ℹ️ Si al destí ja existeix un producte amb el mateix nom i emoji, el lot s\'hi fusionarà automàticament.</p>'
    + '<div class="modal-buttons">'
    + '<button class="modal-cancel" id="move-lot-cancel">Cancel·lar</button>'
    + '<button class="modal-confirm" id="move-lot-confirm" disabled>Moure</button>'
    + '</div></div>';

  document.body.appendChild(overlay);

  let destroySpacePicker = function () {};
  let destroyLocPicker = function () {};
  let currentTargetSpaceId = (activeSpace && activeSpace.id) || null;
  let currentTargetLocationId = null;

  const confirmBtn = overlay.querySelector('#move-lot-confirm');
  const refreshConfirm = () => {
    if (!currentTargetSpaceId || !currentTargetLocationId) {
      confirmBtn.disabled = true;
      return;
    }
    const sameSpace = currentTargetSpaceId === (activeSpace && activeSpace.id);
    if (sameSpace && currentTargetLocationId === lot.location) {
      confirmBtn.disabled = true;
      return;
    }
    confirmBtn.disabled = false;
  };

  const populateLocationPicker = async (spaceId) => {
    destroyLocPicker();
    let availableLocations = [];
    const locBtn = overlay.querySelector('#move-lot-location-picker-btn');
    if (locBtn) {
      locBtn.disabled = true;
      const iconEl = locBtn.querySelector('.picker-icon'); if (iconEl) iconEl.textContent = '⏳';
      const lblEl = locBtn.querySelector('.picker-label'); if (lblEl) lblEl.textContent = 'Carregant…';
    }

    const sameSpace = spaceId === (activeSpace && activeSpace.id);
    if (sameSpace) {
      availableLocations = (typeof locations !== 'undefined' && Array.isArray(locations))
        ? locations.slice() : [];
    } else {
      const target = SS ? SS.getSpaceById(spaceId) : null;
      if (!target || !target.syncCode || !window.FBSync) {
        availableLocations = [];
      } else {
        try {
          const remote = await window.FBSync.readListData(target.syncCode, 'locations');
          if (Array.isArray(remote) && remote.length > 0) {
            availableLocations = remote;
          } else if (typeof DEFAULT_LOCATIONS !== 'undefined') {
            availableLocations = JSON.parse(JSON.stringify(DEFAULT_LOCATIONS));
          }
        } catch (e) {
          console.warn('[MoveLot] error llegint locations destí:', e);
          availableLocations = (typeof DEFAULT_LOCATIONS !== 'undefined')
            ? JSON.parse(JSON.stringify(DEFAULT_LOCATIONS)) : [];
        }
      }
    }

    const locOptions = availableLocations.map(l => ({
      id: l.id,
      icon: l.emoji || '📦',
      label: (typeof getLocationName === 'function')
        ? getLocationName(l)
        : (l.customName || (l.nameKey ? l.nameKey : l.id))
    }));
    if (locOptions.length === 0) {
      if (locBtn) {
        const iconEl = locBtn.querySelector('.picker-icon'); if (iconEl) iconEl.textContent = '⚠️';
        const lblEl = locBtn.querySelector('.picker-label'); if (lblEl) lblEl.textContent = 'Cap ubicació disponible';
      }
      currentTargetLocationId = null;
      refreshConfirm();
      return;
    }
    // Selecció inicial: si same-space, evitar la location actual del lot
    let initial = locOptions[0].id;
    if (sameSpace && lot.location) {
      const firstDifferent = locOptions.find(o => o.id !== lot.location);
      if (firstDifferent) initial = firstDifferent.id;
    }
    currentTargetLocationId = initial;
    if (locBtn) locBtn.disabled = false;
    destroyLocPicker = _buildPickerDropdown(
      'move-lot-location-picker-btn',
      'move-lot-location-picker-dropdown',
      locOptions,
      initial,
      (id) => {
        currentTargetLocationId = id;
        refreshConfirm();
      }
    );
    refreshConfirm();
  };

  destroySpacePicker = _buildPickerDropdown(
    'move-lot-space-picker-btn',
    'move-lot-space-picker-dropdown',
    spaceOptions,
    currentTargetSpaceId,
    (id) => {
      currentTargetSpaceId = id;
      populateLocationPicker(id);
    }
  );

  populateLocationPicker(currentTargetSpaceId);

  const close = () => {
    destroySpacePicker();
    destroyLocPicker();
    if (overlay.parentNode) document.body.removeChild(overlay);
  };
  overlay.querySelector('#move-lot-cancel').addEventListener('click', close);
  overlay.querySelector('#move-lot-confirm').addEventListener('click', () => {
    const tSpace = currentTargetSpaceId;
    const tLoc = currentTargetLocationId;
    close();
    _executeMoveLot(product, lot, tSpace, tLoc);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

async function _executeMoveLot(product, lot, targetSpaceId, targetLocationId) {
  if (!product || !lot || !targetLocationId) return;
  const SS = window.SpacesSystem;
  const activeSpace = SS ? SS.getActiveSpace() : null;
  const sameSpace = !targetSpaceId || (activeSpace && targetSpaceId === activeSpace.id);

  // Re-busca referències vives (patró feedback-closure-vs-live-array)
  const realProduct = products.find(p => p.id === product.id);
  if (!realProduct) { console.warn('[_executeMoveLot] producte no trobat:', product.id); return; }
  const realLot = realProduct.lots && realProduct.lots.find(l => l.id === lot.id);
  if (!realLot) { console.warn('[_executeMoveLot] lot no trobat:', lot.id); return; }

  if (sameSpace) {
    // ----- CAS A: same-space → operació local -----
    if (realLot.location === targetLocationId) {
      showToast('El lot ja és en aquesta ubicació');
      return;
    }

    realProduct.lots = realProduct.lots.filter(l => l.id !== realLot.id);
    const movedLot = Object.assign({}, realLot, { location: targetLocationId });

    const host = _findGroupedProductForFusion(realProduct.name, realProduct.emoji, targetLocationId);
    if (host) {
      _addLotToProduct(host, movedLot);
    } else {
      const newProduct = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        popularId: realProduct.popularId || null,
        name: realProduct.name,
        emoji: realProduct.emoji,
        __v: 2,
        lots: [movedLot],
        date: movedLot.date,
        noExpiry: !!movedLot.noExpiry,
        location: movedLot.location,
        qty: '',
        addedAt: movedLot.addedAt,
        frozenDate: movedLot.frozenDate,
        consumedPercent: 0
      };
      if (typeof movedLot.price === 'number') newProduct.price = movedLot.price;
      if (movedLot.weight) newProduct.weight = movedLot.weight;
      products.push(newProduct);
      _refreshProductMirrors(newProduct);
    }

    const originRemoved = !realProduct.lots || realProduct.lots.length === 0;
    if (originRemoved) {
      products = products.filter(p => p.id !== realProduct.id);
    } else {
      _refreshProductMirrors(realProduct);
    }

    saveData();
    showToast('✓ Lot mogut');
    if (originRemoved) {
      if (typeof renderHome === 'function') renderHome();
      navigateAfterAction();
      currentProduct = null;
    } else {
      openProduct(realProduct.id);
    }
    return;
  }

  // ----- CAS B: cross-space → FBSync read/write al destí -----
  const target = SS ? SS.getSpaceById(targetSpaceId) : null;
  if (!target || !target.syncCode || !window.FBSync) {
    showToast('No s\'ha pogut connectar al destí');
    return;
  }

  const progressOv = document.createElement('div');
  progressOv.className = 'modal-overlay';
  progressOv.innerHTML = '<div class="modal-content"><p class="modal-title">📦 Movent lot…</p>'
    + '<p class="modal-sub">' + escapeHtml((target.icon || '') + ' ' + (target.name || '')) + '</p></div>';
  document.body.appendChild(progressOv);

  try {
    const ok = await window.FBSync.init();
    if (!ok) throw new Error('Firebase init failed');

    const remote = await window.FBSync.readListData(target.syncCode, 'products');
    const targetList = Array.isArray(remote) ? remote.slice() : [];

    const movedLot = Object.assign({}, realLot, { location: targetLocationId });

    const host = _findProductForFusionInList(targetList, realProduct.name, realProduct.emoji, targetLocationId);
    if (host) {
      if (!Array.isArray(host.lots)) host.lots = [];
      host.lots.push(movedLot);
      // Refresh mirrors sobre l'objecte al destí (no podem cridar
      // _refreshProductMirrors perquè usa getPrimaryLot del MEU producte;
      // re-implementem la lògica aquí sobre l'objecte plain del destí).
      const sorted = host.lots.slice().sort((a, b) => {
        if (a.noExpiry && b.noExpiry) return 0;
        if (a.noExpiry) return 1; if (b.noExpiry) return -1;
        const da = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
        const db = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
        return da - db;
      });
      const primary = sorted[0];
      if (primary) {
        host.date = primary.date;
        host.noExpiry = !!primary.noExpiry;
        host.location = primary.location;
        host.frozenDate = primary.frozenDate;
        if (typeof primary.price === 'number') host.price = primary.price; else delete host.price;
        if (primary.weight) host.weight = primary.weight; else delete host.weight;
        host.qty = _computeAggregatedQty(host.lots);
      }
    } else {
      const newProduct = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        popularId: realProduct.popularId || null,
        name: realProduct.name,
        emoji: realProduct.emoji,
        __v: 2,
        lots: [movedLot],
        date: movedLot.date,
        noExpiry: !!movedLot.noExpiry,
        location: movedLot.location,
        qty: _computeAggregatedQty([movedLot]),
        addedAt: movedLot.addedAt,
        frozenDate: movedLot.frozenDate,
        consumedPercent: 0
      };
      if (typeof movedLot.price === 'number') newProduct.price = movedLot.price;
      if (movedLot.weight) newProduct.weight = movedLot.weight;
      targetList.push(newProduct);
    }

    await window.FBSync.writeListData(target.syncCode, 'products', targetList);

    // Èxit remot: treure lot del cache local
    realProduct.lots = realProduct.lots.filter(l => l.id !== realLot.id);
    const originRemoved = !realProduct.lots || realProduct.lots.length === 0;
    if (originRemoved) {
      products = products.filter(p => p.id !== realProduct.id);
    } else {
      _refreshProductMirrors(realProduct);
    }
    saveData();

    if (progressOv.parentNode) document.body.removeChild(progressOv);
    showToast('✓ Lot mogut a ' + (target.icon || '') + ' ' + (target.name || ''));
    if (originRemoved) {
      if (typeof renderHome === 'function') renderHome();
      navigateAfterAction();
      currentProduct = null;
    } else {
      openProduct(realProduct.id);
    }
  } catch (e) {
    console.error('[_executeMoveLot] error cross-space:', e);
    if (progressOv.parentNode) document.body.removeChild(progressOv);
    // Missatge més específic segons l'estat de xarxa i el tipus d'error.
    let msg = 'Error movent el lot';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      msg = 'Sense connexió — el lot no s\'ha mogut';
    } else if (e && /init failed/i.test(String(e.message || e))) {
      msg = 'No s\'ha pogut connectar a Firebase';
    } else if (e && /permission/i.test(String(e.message || e))) {
      msg = 'Sense permís per a l\'espai destí';
    }
    showToast(msg);
  }
}

// API exposada per a altres mòduls. settings.js:onRemoteData fa servir
// _transformProductsToV2 i _createMigrationBackup per processar dades
// remotes abans d'aplicar-les localment. _refreshProductMirrors
// s'exposa per a Fase B (no es crida des de UI a Fase A v2).
if (typeof window !== 'undefined') {
  window.PRODUCT_HELPERS = {
    getLots: getLots,
    getPrimaryLot: getPrimaryLot,
    getPrimaryDate: getPrimaryDate,
    getPrimaryLocation: getPrimaryLocation,
    getLotById: getLotById,
    getTotalQty: getTotalQty,
    getLotsByLocation: getLotsByLocation,
    refreshMirrors: _refreshProductMirrors,
    findGroupedForFusion: _findGroupedProductForFusion,
    buildLotFromNew: _buildLotFromNewProduct,
    createV2Product: _createV2ProductWithLot,
    addLotToProduct: _addLotToProduct,
    removeLotFromProduct: _removeLotFromProduct,
    computeAggregatedQty: _computeAggregatedQty,
    renderLotsSection: _renderLotsSection
  };
  window.runProductsV2Migration = runProductsV2Migration;
  window.runQtyMirrorRefresh = runQtyMirrorRefresh;
  window.runQtyAggregateUnitsWeightRefresh = runQtyAggregateUnitsWeightRefresh;
  window.runMirrorRefreshAllProductsRefresh = runMirrorRefreshAllProductsRefresh;
  window._transformProductsToV2 = _transformProductsToV2;
  window._createMigrationBackup = _createMigrationBackup;
  window._refreshProductMirrors = _refreshProductMirrors;
  window._findGroupedProductForFusion = _findGroupedProductForFusion;
  window._buildLotFromNewProduct = _buildLotFromNewProduct;
  window._createV2ProductWithLot = _createV2ProductWithLot;
  window._addLotToProduct = _addLotToProduct;
  window._removeLotFromProduct = _removeLotFromProduct;
  // Fase D v2 — modals per lot + edició mínima de producte
  window.openLotConsumeModal = openLotConsumeModal;
  window.openLotEditModal = openLotEditModal;
  window.openProductEditModal = openProductEditModal;
  // Fase D2 — moure lot entre locations / espais
  window._openMoveLotModal = _openMoveLotModal;
}

// DADES
function saveData() {
  localStorage.setItem('eatmefirst_products', JSON.stringify(products));
  localStorage.setItem('eatmefirst_stats', JSON.stringify(stats));
  if (typeof pushToServer === 'function') pushToServer();
}

function loadData() {
  runProductsV2Migration();
  runQtyMirrorRefresh();
  runQtyAggregateUnitsWeightRefresh();
  runMirrorRefreshAllProductsRefresh();
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

// Formata la informació de congelació per mostrar-la al detall i al
// llistat. Retorna null si el producte no té frozenDate (no s'ha
// d'imprimir res). El format és:
//   "❄️ Congelat el d/m/yyyy (fa N dies)"
//   "❄️ Congelat el d/m/yyyy (fa N mesos)"
// Només té sentit cridar-ho quan el producte ÉS al congelador
// actualment; el caller ja ha de comprovar la zona.
function formatFrozenInfo(product) {
  if (!product || !product.frozenDate) return null;
  const frozen = new Date(product.frozenDate + 'T00:00:00');
  if (isNaN(frozen.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  frozen.setHours(0, 0, 0, 0);
  const ms = today - frozen;
  const days = Math.max(0, Math.floor(ms / 86400000));
  let dateStr;
  try { dateStr = frozen.toLocaleDateString('ca-ES'); }
  catch (e) { dateStr = product.frozenDate; }
  let ago;
  if (days === 0) ago = 'avui';
  else if (days === 1) ago = 'fa 1 dia';
  else if (days < 60) ago = 'fa ' + days + ' dies';
  else {
    const months = Math.floor(days / 30);
    ago = 'fa ' + months + (months === 1 ? ' mes' : ' mesos');
  }
  return '❄️ Congelat el ' + dateStr + ' (' + ago + ')';
}

// NEVI — colors del cos i la vora del mascot per nivell. Han de
// coincidir amb els gradients de les urgency cards (.shelf-N) perquè
// l'usuari vegi el mateix codi de color a tota l'experiència del
// nivell. Paleta:
//   green  → verds  (Material Green / personal palette)
//   yellow → BLAUS  (no grocs!) — alineat amb .shelf-yellow
//                                 (#42A5F5 → #1565C0)
//   orange → TARONJA pur — alineat amb .shelf-orange
//                          (#FFA000 → #F57C00) — sense tirar a vermell
//   red    → vermells — alineat amb .shelf-red
//                       (#EF5350 → #C62828)
const neviMoods = {
  green: { body: '#C0DD97', border: '#639922', eyes: '#173404', mouth: 'M 25 54 Q 35 70 45 54' },
  yellow:{ body: '#90CAF9', border: '#1565C0', eyes: '#0D47A1', mouth: 'M 25 58 Q 35 64 45 58' },
  orange:{ body: '#FFCC80', border: '#F57C00', eyes: '#BF360C', mouth: 'M 26 61 L 44 61' },
  red:   { body: '#F09595', border: '#C62828', eyes: '#501313', mouth: 'M 25 64 Q 35 56 45 64' }
};

// Missatges del mascot Nevi.
//
// La versió històrica (flat: { green, yellow, orange, red }) servia
// per a la nevera. Però els llindars de freezer i pantry són molt
// diferents (vegeu ALERT_SCALES a js/core.js): "orange" al congelador
// són 8-29 dies — dir "Avui o demà toca menjar això" és incorrecte.
//
// Ara la versió `ca` és nested per zona; la resta de llengües es
// mantenen flat com a fallback (totes les zones comparteixen text)
// fins que es tradueixin. _getNeviMessage gestiona els dos formats.
const neviMessages = {
  ca: {
    fridge: {
      green:  'Tens temps de sobres per consumir aquests productes',
      yellow: 'Aviat caduquen. Planeja el menú dels propers dies',
      orange: "S'han d'usar en 1-2 dies. Què cuinaràs?",
      red:    'Avui o ja caducat! Consumeix-ho com sigui'
    },
    freezer: {
      green:  'Encara tenen molt marge al congelador',
      yellow: 'Comencen a tenir mesos. Considera fer-los servir aviat',
      orange: "S'estan apropant al límit. Fes-los servir en setmanes",
      red:    'Convé descongelar-los i consumir aquesta setmana'
    },
    pantry: {
      green:  'Productes amb molt de marge',
      yellow: 'Fes-los servir aviat',
      orange: "Comencen a apropar-se al límit",
      red:    'Convé fer-los servir aquesta setmana'
    }
  },
  es: { green: '¡Todo bien! Nada caduca próximamente.', yellow: 'Empieza a pensar qué hacer con estos.', orange: '¡Hoy o mañana hay que comerlos!', red: '¡Tenemos que actuar rápido!' },
  en: { green: 'All good! Nothing expiring soon.', yellow: 'Start thinking what to do with these.', orange: 'Today or tomorrow we eat these!', red: 'Oh no! We need to act fast!' },
  fr: { green: 'Tout va bien !', yellow: 'Commence à réfléchir à quoi faire.', orange: 'Aujourd\'hui ou demain !', red: 'Oh non ! Il faut faire vite !' },
  it: { green: 'Tutto bene!', yellow: 'Inizia a pensare cosa farne.', orange: 'Oggi o domani!', red: 'Dobbiamo fare in fretta!' },
  de: { green: 'Alles in Ordnung!', yellow: 'Überleg dir, was damit zu tun ist.', orange: 'Heute oder morgen!', red: 'Schnell handeln!' },
  ru: { green: 'Всё хорошо!', yellow: 'Подумай, что с ними делать.', orange: 'Сегодня или завтра!', red: 'Надо действовать быстро!' },
  zh: { green: '一切都好!', yellow: '开始考虑怎么处理。', orange: '今天或明天!', red: '需要快速行动!' }
};

function _getNeviMessage(lang, cat, level) {
  const langMsgs = neviMessages[lang] || neviMessages.ca;
  if (!langMsgs) return '';
  // Format nested per zona (ca actualment): { fridge: {green: ...}, ... }
  const zoneMsgs = langMsgs[cat || 'fridge'];
  if (zoneMsgs && typeof zoneMsgs === 'object' && zoneMsgs[level]) {
    return zoneMsgs[level];
  }
  // Format flat (la resta de llengües, encara per traduir per zona).
  return langMsgs[level] || '';
}

function setNevi(level, cat) {
  const m = neviMoods[level];
  const lang = getCurrentLang();
  document.getElementById('nevi-body').setAttribute('fill', m.body);
  document.getElementById('nevi-body').setAttribute('stroke', m.border);
  document.getElementById('nevi-divider').setAttribute('stroke', m.border);
  document.getElementById('nevi-eye-left').setAttribute('fill', m.eyes);
  document.getElementById('nevi-eye-right').setAttribute('fill', m.eyes);
  document.getElementById('nevi-mouth').setAttribute('stroke', m.eyes);
  document.getElementById('nevi-mouth').setAttribute('d', m.mouth);
  document.getElementById('nevi-message').textContent = _getNeviMessage(lang, cat, level);
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

const SECTION_TITLE_EMOJI = { fridge: '🧊', freezer: '❄️', pantry: '🥫' };

function openSection(category) {
  currentSection = category;
  if (category === 'alerts') {
    renderAlerts();
    showScreen('alerts');
    return;
  }
  renderSection();
  showScreen('section');
  // Salt instantani a la pàgina de la zona escollida un cop el slider
  // és visible (cal layout calculat per saber clientWidth).
  requestAnimationFrame(() => _scrollToSection(currentSection, false));
}

// Instància única de Swiper per a #zones-slider. Es crea peresosament
// (a _ensureZonesSwiper) la primera vegada que el slider té dimensions
// (ergo el screen-section és .active) — Swiper necessita conèixer
// l'amplada/altura del contenidor per col·locar i transformar les
// cares. Mai destruïda: la mateixa instància gestiona tot el cicle de
// vida de la pantalla.
let _zonesSwiper = null;

function _ensureZonesSwiper() {
  if (_zonesSwiper) return _zonesSwiper;
  const slider = document.getElementById('zones-slider');
  if (!slider || !slider.clientWidth) return null;
  // Configuració "creative effect" tipus Stories d'Instagram: la cara
  // sortint/entrant es desplaça 100% i recula -200px en Z amb una
  // rotació suau de 30° al voltant de Y. opacity 0.5 per fondre les
  // cares no centrals (efecte "card stack" més suau que un cub real).
  _zonesSwiper = new Swiper('#zones-slider', {
    // Cub real estil galeria 3D (Swiper EffectCube). Cada cara és una
    // zona; el cub rota 90° entre cares. shadowOffset i shadowScale
    // ajustats per a un efecte més suau que el cub-pur de demo (no
    // ombres exagerades sota la cara activa). speed: 600ms perquè la
    // rotació de 90° tingui temps de "respirar".
    effect: 'cube',
    cubeEffect: {
      // shadow:false → desactivem la "ground shadow" projectada sota
      // el cub. Era la principal causa visual de la "ombra lletja a
      // baix": una el·lipse fosca que apareixia centrada al peu del
      // slider, no integrada amb el disseny de la pantalla. Mantenim
      // slideShadows: true perquè és el que dóna profunditat ENTRE
      // cares (gradient subtil sobre les cares laterals) — això sí
      // que ajuda a la sensació 3D.
      shadow: false,
      slideShadows: true,
      shadowOffset: 20,
      shadowScale: 0.94
    },
    speed: 600,
    grabCursor: true,
    // Sensibilitat del swipe — molt permissiva. Amb els defaults de
    // Swiper (longSwipesRatio 0.5) cal arrossegar més de la meitat
    // del cub abans que es comprometi a avançar; per sota d'aquest
    // llindar el cub torna enrere. Combinat amb effect: 'cube' i
    // loop:true, en algunes configuracions el snap es queda atrapat
    // a mig camí (rotació al 50°, ni avança ni torna). Aquests valors
    // baixen els llindars al màxim raonable:
    //   threshold: 5          — descarta moviments < 5px (jitter)
    //   longSwipesRatio: 0.2  — 20% d'arrossegament ja compromet
    //                            l'avanç (default Swiper: 0.5)
    //   longSwipesMs: 200     — temps mínim que defineix "swipe llarg"
    //                            (default 300; més baix = resposta
    //                            més ràpida)
    //   resistanceRatio: 0.85 — quant rebot hi ha en arribar a un
    //                            extrem; amb loop:true gairebé no
    //                            aplica però el deixem explícit.
    //   shortSwipes / longSwipes / followFinger — defaults explícits
    //                            per a documentació.
    threshold: 5,
    touchRatio: 1,
    longSwipes: true,
    longSwipesRatio: 0.2,
    longSwipesMs: 200,
    shortSwipes: true,
    followFinger: true,
    resistanceRatio: 0.85,
    // preventClicks defaults to true en Swiper; bloqueja el click
    // event posterior si durant el touch hi ha hagut qualsevol
    // moviment. En desktop el ratolí no jitter, però en mòbil el dit
    // SÍ — qualsevol micromoviment durant un tap es classifica com
    // a swipe i el click sobre un .shelf es perd. Per això el
    // Congelador "deixa de funcionar" en format mòbil tot i que
    // funciona en desktop. Desactivem preventClicks i la seva
    // propagació així el browser sempre dispara el click esperat.
    preventClicks: false,
    preventClicksPropagation: false,
    // touchStartPreventDefault: false — el default de Swiper a Android
    // és true, que crida preventDefault al touchstart i suprimeix la
    // generació natural del click event que el browser fa després del
    // touchend. Símptoma: "primer clic no respon, segon clic sí" — el
    // primer touch només "activa" el slide, el segon ja sí dispara
    // click. Posant-ho a false el browser dispara el click event
    // normalment a tots dos casos.
    touchStartPreventDefault: false,
    // loop: true → Swiper duplica les primeres/últimes diapositives
    // perquè la transició final → primera (i viceversa) sigui contínua
    // i no salti. Conseqüència: this.activeIndex inclou els duplicats;
    // per accedir a SECTION_ORDER cal usar this.realIndex (sense
    // duplicats), i per navegar programàticament cal slideToLoop()
    // en comptes de slideTo() (vegeu _scrollToSection).
    loop: true,
    pagination: {
      el: '#section-dots',
      clickable: true,
      // Pestanyes amb el nom de cada zona (Nevera / Congelador / Rebost),
      // mateix patró que els nivells (.levels-pagination → .levels-dot
      // a la pantalla d'urgència). El nom és més clar que un dot anònim
      // i deixa veure d'un cop d'ull les zones disponibles.
      bulletClass: 'zones-tab',
      bulletActiveClass: 'zones-tab-active',
      renderBullet: function(index, className) {
        // Swiper passa l'índex REAL aquí (no els duplicats), així que
        // mapeja directament a SECTION_ORDER.
        const cat = SECTION_ORDER[index] || '';
        const labelKey = cat === 'fridge' ? 'locFridge'
          : cat === 'freezer' ? 'locFreezer'
          : cat === 'pantry' ? 'locPantry' : '';
        const label = labelKey ? t(labelKey) : cat;
        return '<button class="' + className + '" type="button" data-zone="' + cat + '" aria-label="' + escapeHtml(label) + '">' + escapeHtml(label) + '</button>';
      }
    },
    on: {
      slideChange: function() {
        const cat = SECTION_ORDER[this.realIndex];
        if (cat && cat !== currentSection) {
          currentSection = cat;
          _updateSectionTitle();
        }
      },
      // Fallback per al bug "primer clic no respon a Congelador":
      // tot i preventClicks:false i touchStartPreventDefault:false,
      // el primer tap després d'un swipe a un slide no inicial no
      // disparava openShelf. Forcem explícitament pointer-events:auto
      // al slide just acabat de transitionar, perquè el sistema de
      // hit-testing no tingui dubte que aquest és l'element clicable.
      slideChangeTransitionEnd: function() {
        const swiper = this;
        const active = swiper.slides && swiper.slides[swiper.activeIndex];
        if (active) active.style.pointerEvents = 'auto';
      }
      // touchEnd safety net ELIMINAT. La idea era forçar un slideTo
      // 50ms després de cada touch per a casos de cub mig girat. Però
      // aquest slideTo, en cridar-se DESPRÉS de cada toc (incloent
      // taps purs sobre un shelf), feia entrar Swiper en mode
      // "transitioning"; combinat amb el default preventClicks:true,
      // això suprimia el click event posterior de manera intermitent
      // (típicament en zones a les quals s'havia arribat amb swipe
      // previ — Nevera funcionava perquè era el slide inicial sense
      // tocar, Congelador fallava perquè calia un swipe per arribar-hi
      // i la xarxa de seguretat deixava state residual). Amb
      // longSwipesRatio: 0.2 ja prou permissiu, els cubs mig girats
      // són rars; preferim arriscar un mig-gir ocasional abans que
      // perdre clicks de navegació.
    }
  });
  return _zonesSwiper;
}

// Salta a la pàgina de la zona indicada. `smooth=false` ⇒ salt instantani
// (durada 0); `smooth=true` ⇒ animació de 400ms (paral·lela al
// `speed` configurat al Swiper). Si Swiper encara no s'ha pogut
// instanciar (slider sense dimensions perquè la pantalla no és .active),
// reintenta al següent frame fins que el layout estigui calculat.
function _scrollToSection(cat, smooth) {
  const idx = SECTION_ORDER.indexOf(cat);
  if (idx < 0) return;
  const swiper = _ensureZonesSwiper();
  if (!swiper) {
    requestAnimationFrame(() => _scrollToSection(cat, smooth));
    return;
  }
  // update() abans del slideTo: si el slider acaba d'esdevenir
  // visible (showScreen al frame anterior), Swiper pot tenir
  // dimensions cachejades obsoletes. Sense això, l'efecte cube
  // calculava les rotacions sobre una mida incorrecta i el primer
  // swipe no avançava completament — l'usuari havia de lliscar dues
  // vegades.
  swiper.update();
  // slideToLoop (no slideTo) perquè loop:true està activat: slideTo
  // opera sobre l'array intern amb duplicats, slideToLoop sobre els
  // índexs originals (que és el que volem aquí).
  swiper.slideToLoop(idx, smooth ? 600 : 0);
  // Segon update() amb un petit delay: cobreix el cas en què la
  // primera entrada a la pantalla aplica height: 70vh però el layout
  // del .screen encara està estabilitzant-se (canvi de viewport
  // virtual a iOS, rotació, etc.).
  setTimeout(() => {
    if (_zonesSwiper === swiper) swiper.update();
  }, 120);
}

// Resize: Swiper té el seu propi ResizeObserver intern, així que no
// cal fer res. Mantenim la funció buida per si algun caller hereta del
// codi anterior.
(function _wireSectionResnap() {
  if (typeof window === 'undefined') return;
  if (window.__zonesSliderResizeWired) return;
  window.__zonesSliderResizeWired = true;
  // Swiper s'auto-ajusta amb el seu ResizeObserver intern.
})();

function renderSection() {
  const slider = document.getElementById('zones-slider');
  if (!slider) return;
  const wrapper = slider.querySelector('.swiper-wrapper');
  if (!wrapper) return;

  // Construïm les pàgines (.swiper-slide) un sol cop. La majoria de
  // re-renders només actualitzen comptadors i subtítols dins de cada
  // slide ja existent — Swiper conserva la seva instància intacta.
  //
  // CRÍTIC: amb loop:true, Swiper afegeix slides duplicats al wrapper
  // (clones de primera/última per a la transició cíclica). Comptem
  // només els slides ORIGINALS per detectar canvis de mida real;
  // sense aquest filtre, qualsevol re-render post-init veuria 5
  // children (3 originals + 2 duplicats) ≠ 3 SECTION_ORDER, dispararia
  // un rebuild + destrucció de la instància de Swiper viva, amb
  // Swiper encara intentant accedir als slides ja esborrats. (No era
  // un loop a BiteMe perquè slideChange no crida renderSection, però
  // sí podia causar errors al afegir productes.)
  const originalSlides = wrapper.querySelectorAll(':scope > .swiper-slide:not(.swiper-slide-duplicate)');
  if (originalSlides.length !== SECTION_ORDER.length) {
    wrapper.innerHTML = '';
    SECTION_ORDER.forEach(cat => {
      const page = document.createElement('div');
      page.className = 'zone-page swiper-slide';
      page.dataset.zone = cat;
      const fridge = document.createElement('div');
      fridge.className = 'fridge';
      ['green', 'yellow', 'orange', 'red'].forEach(level => {
        const shelf = document.createElement('div');
        shelf.className = 'shelf shelf-' + level;
        shelf.dataset.level = level;
        shelf.dataset.zone = cat;
        const titleKey = 'shelf' + level.charAt(0).toUpperCase() + level.slice(1);
        shelf.innerHTML =
          '<div class="shelf-text">' +
            '<p class="shelf-title">' + t(titleKey) + '</p>' +
            '<p class="shelf-sub" data-shelf-sub></p>' +
          '</div>' +
          '<div class="shelf-count">' +
            '<span data-shelf-count>0</span>' +
            '<span class="shelf-arrow">›</span>' +
          '</div>';
        fridge.appendChild(shelf);
      });
      page.appendChild(fridge);
      wrapper.appendChild(page);
    });
  }

  // Actualitzem comptadors i subtítols per a totes les zones.
  // querySelectorAll perquè amb loop:true Swiper té duplicats de
  // primera/última al wrapper, i tots dos (original + clone) han de
  // mostrar comptadors actualitzats — sense això, el clone visible
  // a la costura del loop quedaria amb números obsolets.
  SECTION_ORDER.forEach(cat => {
    const pages = wrapper.querySelectorAll('.zone-page[data-zone="' + cat + '"]');
    if (!pages.length) return;
    const scale = ALERT_SCALES[cat];

    const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
    products.forEach(p => {
      const loc = getLocationById(p.location || 'fridge');
      const pcat = loc ? loc.category : 'fridge';
      if (pcat !== cat) return;
      counts[getLevel(daysUntil(p.date), cat)]++;
    });

    pages.forEach(page => page.querySelectorAll('.shelf').forEach(shelf => {
      const level = shelf.dataset.level;
      const subEl = shelf.querySelector('[data-shelf-sub]');
      const countEl = shelf.querySelector('[data-shelf-count]');
      if (countEl) countEl.textContent = counts[level];
      if (!subEl) return;
      if (level === 'green') subEl.textContent = t('moreThan', scale.green) + ' ' + t('days');
      else if (level === 'yellow') subEl.textContent = scale.yellow + '-' + scale.green + ' ' + t('days');
      else if (level === 'orange') subEl.textContent = scale.orange + '-' + (scale.yellow - 1) + ' ' + t('days');
      else if (level === 'red') {
        subEl.textContent = scale.orange === 1 ? t('todayOrExpired') : t('lessThan', scale.orange) + ' ' + t('days');
      }
    }));
  });

  _updateSectionTitle();
}

function _updateSectionTitle() {
  const titleEl = document.getElementById('section-title');
  if (!titleEl) return;
  const titles = {
    fridge: SECTION_TITLE_EMOJI.fridge + ' ' + t('catFridge'),
    freezer: SECTION_TITLE_EMOJI.freezer + ' ' + t('catFreezer'),
    pantry: SECTION_TITLE_EMOJI.pantry + ' ' + t('catPantry')
  };
  titleEl.textContent = titles[currentSection] || '';
}

// Hooks deixats buits per backward compat: la lògica de tots dos
// (escolta de scroll-snap i rebuild manual de dots) viu ara dins de
// la instància Swiper a _ensureZonesSwiper. Si algun caller heretat
// invoca aquestes funcions, no fa res.
function _setupSliderScrollListener() {}
function renderSectionDots() {}

function goToSection(cat) {
  if (cat === currentSection) return;
  if (SECTION_ORDER.indexOf(cat) < 0) return;
  _scrollToSection(cat, true);
  // currentSection s'actualitzarà via slideChange del Swiper quan
  // acabi l'animació.
}

function navigateSection(direction) {
  const idx = SECTION_ORDER.indexOf(currentSection);
  if (idx < 0) return;
  let newIdx = idx + direction;
  if (newIdx < 0) newIdx = SECTION_ORDER.length - 1;
  if (newIdx >= SECTION_ORDER.length) newIdx = 0;
  _scrollToSection(SECTION_ORDER[newIdx], true);
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
    const locLabel = p.loc ? p.loc.emoji + ' ' + getLocationName(p.loc) + ' ' : '';
    item.innerHTML = '<span class="product-item-emoji">' + p.emoji + '</span><div class="product-item-info"><div class="product-item-name"></div><div class="product-item-days"></div></div><span class="product-item-arrow">›</span>';
    item.querySelector('.product-item-name').innerHTML = formatProductLine(p.name, p.qty);
    item.querySelector('.product-item-days').textContent = locLabel + daysText(p.days);
    item.addEventListener('click', () => { productDetailBack = 'alerts'; openProduct(p.id); });
    list.appendChild(item);
  });
}

// LLISTA - mostra productes d'un nivell DINS de la secció actual
// Empty states per nivell — icona + títol + missatge curt amb to
// positiu (especialment a Alerta: és bo no tenir res aquí).
const SHELF_EMPTY_STATES = {
  green:  { icon: '🌿', title: 'Cap producte tranquil aquí', message: 'Tot el que tens està més proper a caducar' },
  yellow: { icon: '✨', title: 'Res a vigilar de moment!',   message: 'No hi ha productes en aquest rang de dates' },
  orange: { icon: '🌟', title: 'Cap urgència!',              message: 'No tens res que caduqui aviat' },
  red:    { icon: '🎉', title: 'Excel·lent!',                 message: 'No tens cap producte caducat ni que caduqui avui' }
};

// Ordre dels nivells al cub: el mateix que l'ordre dels prestatges
// dintre d'una zona (de menys urgent a més urgent). LEVEL_ORDER[i]
// correspon a la cara `i` del cub i a l'i-èssim bullet de paginació.
const LEVEL_ORDER = ['green', 'yellow', 'orange', 'red'];

// Pinta tot el contingut d'un slide (llista de productes o empty-state)
// per al `level` i `cat` (zona) donats. Reutilitzable: cada vegada que
// canvia la zona o que canvien els productes, recridem-ho per a tots
// 4 nivells.
function _renderShelfProducts(slide, level, cat) {
  const listEl = slide.querySelector('.product-list');
  const emptyEl = slide.querySelector('.empty-state');
  if (!listEl || !emptyEl) return;

  const shelfProducts = products
    .map(p => {
      const loc = getLocationById(p.location || 'fridge');
      const pcat = loc ? loc.category : 'fridge';
      return { ...p, days: daysUntil(p.date), pcat: pcat, loc: loc };
    })
    .filter(p => p.pcat === cat && getLevel(p.days, cat) === level)
    .sort((a, b) => a.days - b.days);

  listEl.innerHTML = '';
  if (shelfProducts.length === 0) {
    const state = SHELF_EMPTY_STATES[level] || SHELF_EMPTY_STATES.green;
    const iconEl = emptyEl.querySelector('.empty-state-icon');
    const titleEl = emptyEl.querySelector('.empty-state-title');
    const msgEl = emptyEl.querySelector('.empty-state-message');
    if (iconEl) iconEl.textContent = state.icon;
    if (titleEl) titleEl.textContent = state.title;
    if (msgEl) msgEl.textContent = state.message;
    emptyEl.style.display = 'flex';
  } else {
    emptyEl.style.display = 'none';
    shelfProducts.forEach(p => {
      const item = document.createElement('div');
      item.className = 'product-item';
      // data-product-id habilita la delegation a nivell de #levels-slider
      // (vegeu _initLevelsActionsDelegate). Cal perquè amb Swiper loop:true
      // els slides es clonen amb tot el seu DOM intern, però cloneNode()
      // NO copia listeners afegits via addEventListener — un click sobre
      // un producte d'un slide-clone es perdria. La delegation captura el
      // click al pare i deriva el producte del data-attribute.
      item.dataset.productId = p.id;
      const locLabel = p.loc ? p.loc.emoji + ' ' + getLocationName(p.loc) + ' ' : '';
      // Subtítol addicional amb la data de congelació quan el producte
      // és al congelador (NOMÉS al congelador — a la resta no aporta
      // res, el frozenDate pot existir d'una sessió anterior).
      const isFreezer = p.loc && p.loc.category === 'freezer';
      const frozenLine = isFreezer ? formatFrozenInfo(p) : null;
      item.innerHTML = '<span class="product-item-emoji">' + p.emoji + '</span><div class="product-item-info"><div class="product-item-name"></div><div class="product-item-days"></div>' + (frozenLine ? '<div class="product-item-frozen"></div>' : '') + '</div><span class="product-item-arrow">›</span>';
      item.querySelector('.product-item-name').innerHTML = formatProductLine(p.name, p.qty);
      item.querySelector('.product-item-days').textContent = locLabel + daysText(p.days);
      if (frozenLine) {
        const frozenEl = item.querySelector('.product-item-frozen');
        if (frozenEl) frozenEl.textContent = frozenLine;
      }
      // Cap addEventListener per-item: el click es processa per delegation
      // al contenidor #levels-slider (vegeu _initLevelsActionsDelegate),
      // que funciona tant per als items dels slides originals com per als
      // dels seus clones de loop.
      listEl.appendChild(item);
    });
  }
}

// Delegation per als clicks dels productes dins de #levels-slider.
// Cal perquè amb Swiper loop:true els slides originals es clonen i
// cloneNode() NO copia listeners addEventListener afegits per-item.
//
// El listener viu a DOCUMENT (no al slider) i s'enganxa una sola
// vegada al carregar l'script. Document no es destrueix mai, així
// que el listener sobreviu a qualsevol cicle destroy/recreate de
// Swiper i a qualsevol manipulació DOM (incloent embed dins Settings).
// Filtrem amb closest('#levels-slider') perquè només actuï per clicks
// dins el cub de nivells.
function _onLevelsSliderClick(e) {
  if (!e.target.closest('#levels-slider')) return;
  const item = e.target.closest('.product-item');
  if (!item) return;
  const id = item.dataset.productId;
  if (!id) return;
  // Suprimeix el click sintètic que el navegador dispara després d'un
  // long-press exitós (touchstart → 600ms timer → touchend genera
  // click). Sense aquest guard, el toggle de la selecció es desfaria
  // immediatament o openProduct es dispararia.
  if (_levelsLongPressTriggered) {
    _levelsLongPressTriggered = false;
    return;
  }
  if (_levelsSelectionMode) {
    _toggleLevelsSelection(id);
    return;
  }
  productDetailBack = 'list';
  openProduct(id);
}
// Mantenim _initLevelsActionsDelegate com a no-op per compatibilitat
// amb la crida des de _ensureLevelsSwiper.
function _initLevelsActionsDelegate(_slider) { /* listener viu a document */ }
if (typeof document !== 'undefined') {
  document.addEventListener('click', _onLevelsSliderClick);
}


// =========================================================
//   SELECCIÓ MÚLTIPLE A EATMe (long press) — Fase C de Spaces
// =========================================================
// Un long-press sobre un .product-item dins #levels-slider entra en
// "mode selecció" i el marca. A partir d'aquí, taps simples toggle
// la selecció d'altres items. La toolbar fixa a dalt mostra el
// comptador i el botó "📦 Moure" que obre el modal multi-espai (a
// js/spaces-ui.js).
//
// Tot l'estat viu aquí (no a SpacesSystem) perquè és lligat a la UI
// de #levels-slider, no a les dades dels Espais.
let _levelsSelectionMode = false;
let _levelsSelectedIds = new Set();
let _levelsLongPressTimer = null;
let _levelsLongPressTriggered = false;
const _LEVELS_LONG_PRESS_MS = 600;

function _exitLevelsSelectionMode() {
  if (!_levelsSelectionMode) return;
  _levelsSelectionMode = false;
  _levelsSelectedIds.clear();
  document.body.classList.remove('selection-mode-active');
  const toolbar = document.getElementById('selection-toolbar');
  if (toolbar) toolbar.style.display = 'none';
  document.querySelectorAll('#levels-slider .product-item.is-selected').forEach(el => {
    el.classList.remove('is-selected');
  });
}

function _enterLevelsSelectionMode(initialId) {
  // Defensiu: surt de qualsevol altra selecció activa abans (BuyMe).
  if (window.ShoppingSelection && window.ShoppingSelection.isActive && window.ShoppingSelection.isActive()) {
    window.ShoppingSelection.exit();
  }
  _levelsSelectionMode = true;
  _levelsSelectedIds.clear();
  document.body.classList.add('selection-mode-active');
  const toolbar = document.getElementById('selection-toolbar');
  if (toolbar) toolbar.style.display = 'flex';
  if (initialId) _toggleLevelsSelection(initialId);
}

function _toggleLevelsSelection(id) {
  if (!id) return;
  if (_levelsSelectedIds.has(id)) _levelsSelectedIds.delete(id);
  else _levelsSelectedIds.add(id);
  // Marca visualment a TOTS els nodes amb aquest id (originals i
  // clones de Swiper).
  document.querySelectorAll('#levels-slider .product-item[data-product-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]').forEach(el => {
    el.classList.toggle('is-selected', _levelsSelectedIds.has(id));
  });
  const counter = document.getElementById('selection-count');
  if (counter) counter.textContent = (typeof t === 'function')
    ? t('selectionCount', _levelsSelectedIds.size)
    : String(_levelsSelectedIds.size);
  if (_levelsSelectedIds.size === 0) _exitLevelsSelectionMode();
}

function _onLevelsTouchStart(e) {
  const item = e.target.closest && e.target.closest('#levels-slider .product-item');
  if (!item || !item.dataset.productId) return;
  if (_levelsLongPressTimer) clearTimeout(_levelsLongPressTimer);
  _levelsLongPressTriggered = false;
  const targetId = item.dataset.productId;
  _levelsLongPressTimer = setTimeout(() => {
    _levelsLongPressTimer = null;
    _levelsLongPressTriggered = true;
    if (!_levelsSelectionMode) _enterLevelsSelectionMode(targetId);
    else _toggleLevelsSelection(targetId);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(40); } catch (e) {}
    }
  }, _LEVELS_LONG_PRESS_MS);
}

function _cancelLevelsLongPress() {
  if (_levelsLongPressTimer) {
    clearTimeout(_levelsLongPressTimer);
    _levelsLongPressTimer = null;
  }
}

if (typeof document !== 'undefined') {
  // Touch (mòbil): si l'usuari mou el dit, cancel·lem el long-press
  // — això evita activar el mode quan en realitat estava lliscant pel
  // cube. La sensibilitat la marca el threshold de Swiper (5px),
  // però aquí n'hi ha prou amb cancel·lar a qualsevol touchmove.
  document.addEventListener('touchstart', _onLevelsTouchStart, { passive: true });
  document.addEventListener('touchend', _cancelLevelsLongPress);
  document.addEventListener('touchmove', _cancelLevelsLongPress, { passive: true });
  document.addEventListener('touchcancel', _cancelLevelsLongPress);
  // Mouse (desktop / dev tools)
  document.addEventListener('mousedown', _onLevelsTouchStart);
  document.addEventListener('mouseup', _cancelLevelsLongPress);
  document.addEventListener('mouseleave', _cancelLevelsLongPress);
}

// API exposada per a app.js (botons de la toolbar) i js/spaces-ui.js
// (multi-move modal). Mantenim els vars internament; aquí només
// donem accessors funcionals.
window.LevelsSelection = {
  exit: _exitLevelsSelectionMode,
  isActive: () => _levelsSelectionMode,
  count: () => _levelsSelectedIds.size,
  getSelectedIds: () => Array.from(_levelsSelectedIds)
};

// Al sortir de la pantalla #screen-list (back, navegació via
// notificacions, etc.) sortim del mode selecció perquè la toolbar no
// quedi flotant sobre altres pantalles. Embolcalla showScreen una sola
// vegada — same pattern que el wrapper de l'embed de Settings.
(function _wrapShowScreenForLevelsSelection() {
  if (typeof window === 'undefined' || typeof window.showScreen !== 'function') return;
  if (window.__levelsSelectionWrapped) return;
  window.__levelsSelectionWrapped = true;
  const original = window.showScreen;
  window.showScreen = function (name) {
    const listEl = document.getElementById('screen-list');
    const wasListActive = !!(listEl && listEl.classList.contains('active'));
    if (wasListActive && name !== 'list' && _levelsSelectionMode) {
      _exitLevelsSelectionMode();
    }
    return original.apply(this, arguments);
  };
})();

// Construeix els 4 slides .level-page dins de #levels-slider (un sol
// cop per session). Crida idempotent — si els 4 originals ja existeixen,
// torna sense fer res. (Filtra .swiper-slide-duplicate per no comptar
// els clones que Swiper afegeix amb loop:true.)
function _buildLevelSlides() {
  const slider = document.getElementById('levels-slider');
  if (!slider) return;
  const wrapper = slider.querySelector('.swiper-wrapper');
  if (!wrapper) return;
  const originals = wrapper.querySelectorAll(':scope > .swiper-slide:not(.swiper-slide-duplicate)');
  if (originals.length === LEVEL_ORDER.length) return;
  wrapper.innerHTML = '';
  LEVEL_ORDER.forEach(level => {
    const slide = document.createElement('div');
    slide.className = 'level-page swiper-slide';
    slide.dataset.level = level;
    slide.innerHTML =
      '<div class="product-list"></div>' +
      '<div class="empty-state" style="display:none">' +
        '<div class="empty-state-icon">📦</div>' +
        '<h3 class="empty-state-title"></h3>' +
        '<p class="empty-state-message"></p>' +
      '</div>';
    wrapper.appendChild(slide);
  });
}

// Actualitza el títol del header (zona + nivell) i la mascota nevi
// segons el nivell i la zona actuals.
function _updateLevelHeaderAndNevi(level) {
  const cat = currentSection;
  const titles = { green: t('shelfGreen'), yellow: t('shelfYellow'), orange: t('shelfOrange'), red: t('shelfRed') };
  const catEmoji = { fridge: '🧊', freezer: '❄️', pantry: '🥫' }[cat] || '';
  const titleEl = document.getElementById('list-title');
  if (titleEl) titleEl.textContent = catEmoji + ' ' + (titles[level] || '');
  if (typeof setNevi === 'function') setNevi(level, cat);
}

// Instància única del Swiper de nivells. Es crea peresosament la primera
// vegada que el slider té dimensions (#screen-list .active). El conjunt
// de slides és sempre el mateix (4 nivells), per tant la instància
// sobreviu entre obertures de pantalla; només actualitzem el contingut
// dels slides quan canvia currentSection.
let _levelsSwiper = null;

function _ensureLevelsSwiper() {
  if (_levelsSwiper) return _levelsSwiper;
  const slider = document.getElementById('levels-slider');
  if (!slider || !slider.clientWidth) return null;
  _levelsSwiper = new Swiper('#levels-slider', {
    // Mateixa configuració base que els altres dos cubs (zones i shops)
    // per coherència visual i de comportament. Vegeu els comentaris
    // extensos a _ensureZonesSwiper d'aquest mateix fitxer per al
    // raonament darrere de cada paràmetre.
    effect: 'cube',
    cubeEffect: {
      shadow: false,
      slideShadows: true,
      shadowOffset: 20,
      shadowScale: 0.94
    },
    speed: 600,
    grabCursor: true,
    threshold: 5,
    touchRatio: 1,
    longSwipes: true,
    longSwipesRatio: 0.2,
    longSwipesMs: 200,
    shortSwipes: true,
    followFinger: true,
    resistanceRatio: 0.85,
    // Vegeu el comentari paral·lel a _ensureZonesSwiper: el dit
    // jitter en mòbil + preventClicks:true (default) suprimeix
    // taps legítims. Als slides dels nivells els product-items
    // tenen click handlers; els necessitem fiables.
    preventClicks: false,
    preventClicksPropagation: false,
    // touchStartPreventDefault: false — vegeu el comentari a
    // _ensureZonesSwiper. Cal per evitar el bug del "primer clic no
    // respon" en mòbils Android al cube + loop.
    touchStartPreventDefault: false,
    loop: true,
    pagination: {
      el: '#levels-dots',
      clickable: true,
      bulletClass: 'levels-dot',
      bulletActiveClass: 'active',
      renderBullet: function(index, className) {
        const level = LEVEL_ORDER[index] || '';
        const titleKey = 'shelf' + level.charAt(0).toUpperCase() + level.slice(1);
        const label = (typeof t === 'function' && level) ? t(titleKey) : level;
        return '<button class="' + className + '" type="button" data-level="' + level + '" aria-label="' + label + '">' + label + '</button>';
      }
    },
    on: {
      slideChange: function() {
        const level = LEVEL_ORDER[this.realIndex];
        if (level && level !== currentLevel) {
          currentLevel = level;
          _updateLevelHeaderAndNevi(level);
        }
      },
      // Mateix fallback que a _ensureZonesSwiper: pointer-events:auto
      // explícit al slide actiu post-transició perquè els taps a
      // product-items registrin al primer toc.
      slideChangeTransitionEnd: function() {
        const swiper = this;
        const active = swiper.slides && swiper.slides[swiper.activeIndex];
        if (active) active.style.pointerEvents = 'auto';
      }
    }
  });
  // Click delegation a nivell del slider — sobreviu a destroy/recreate
  // (el listener s'enganxa al node DOM, que és el mateix; el guard de
  // dataset.actionsDelegated evita re-enganxar-lo a futures crides).
  _initLevelsActionsDelegate(slider);
  return _levelsSwiper;
}

function openShelf(level) {
  // Defensiu: si l'usuari arriba amb un mode selecció pendent (poc
  // probable amb el wrapper de showScreen, però per si de cas), el
  // tanquem abans de renderitzar.
  if (typeof _exitLevelsSelectionMode === 'function') _exitLevelsSelectionMode();
  currentLevel = level;
  const cat = currentSection;
  // Construïm els 4 slides un sol cop.
  _buildLevelSlides();
  const slider = document.getElementById('levels-slider');
  if (!slider) return;
  // CRÍTIC: destruïm la instància de Swiper existent abans de tornar
  // a renderitzar contingut. Sense això, després de diverses
  // navegacions (entrar a un nivell → enrere → entrar a un altre → ...)
  // la cube geometry de Swiper pot acumular drift: dimensions
  // cachejades de slides amb contingut diferent, classes
  // .swiper-slide-active orfes, duplicats sincronitzats amb una
  // currentSection antiga. El símptoma final és que els clicks deixen
  // d'arribar al shelf (Swiper només posa pointer-events:auto sobre
  // active+prev+next, i si l'estat queda corromput cap slide té la
  // classe .swiper-slide-active). Recrear la instància cada cop és
  // barat (4 slides) i garanteix un estat net. També neteja els
  // duplicats abans de la nostra render — quan _ensureLevelsSwiper
  // crei la nova instància ja farà nous duplicats clonant les slides
  // amb el contingut just renderitzat.
  if (_levelsSwiper) {
    _levelsSwiper.destroy(true, true);
    _levelsSwiper = null;
  }
  // Re-renderitzem el contingut de TOTS 4 slides perquè currentSection
  // pot haver canviat des de l'última obertura. (Després del destroy
  // de dalt, no hi ha duplicats — només els 4 originals — així que
  // un querySelector per slide n'hi ha prou; mantinc querySelectorAll
  // per simetria amb el patró d'altres llocs i defensiu en cas que
  // alguna altra via de codi posi duplicats.)
  LEVEL_ORDER.forEach(lvl => {
    const slides = slider.querySelectorAll('.level-page[data-level="' + lvl + '"]');
    slides.forEach(slide => _renderShelfProducts(slide, lvl, cat));
  });
  // Title/nevi a l'instant per evitar flash al header durant l'animació.
  _updateLevelHeaderAndNevi(level);
  showScreen('list');
  // Inicialitzem el Swiper de nou en el següent frame, quan
  // .screen.active ja li dóna dimensions al slider.
  const apply = () => {
    const swiper = _ensureLevelsSwiper();
    if (!swiper) { requestAnimationFrame(apply); return; }
    swiper.update();
    const idx = LEVEL_ORDER.indexOf(level);
    if (idx >= 0) swiper.slideToLoop(idx, 0);
    setTimeout(() => {
      if (_levelsSwiper === swiper) swiper.update();
    }, 120);
  };
  requestAnimationFrame(apply);
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
  const locStr = loc ? loc.emoji + ' ' + getLocationName(loc) + ' ' : '';
  document.getElementById('product-days').textContent = locStr + daysText(days);

  // Línia frozenDate: només si el producte té data de congelació guardada
  // I actualment és al congelador. Si l'han mogut a una altra zona,
  // ocultem la informació però NO esborrem el camp (pot tornar al
  // congelador més tard i la mateixa data segueix sent vàlida).
  const frozenEl = document.getElementById('product-frozen');
  if (frozenEl) {
    const isFreezer = loc && loc.category === 'freezer';
    const frozenText = isFreezer ? formatFrozenInfo(p) : null;
    if (frozenText) {
      frozenEl.textContent = frozenText;
      frozenEl.style.display = '';
    } else {
      frozenEl.style.display = 'none';
    }
  }

  // Bloc "Has consumit X% · Queda Y%": només té sentit per qty no numèrica
  // (les numèriques ja es veuen reduïdes directament a la qty visible).
  const consumedBlock = document.getElementById('product-consumed-block');
  const qtyNum = (typeof parseQtyNumber === 'function') ? parseQtyNumber(p.qty) : null;
  const consumedPct = Math.max(0, Math.min(99, p.consumedPercent || 0));
  if (consumedBlock) {
    if (consumedPct > 0 && qtyNum === null) {
      const remainingPct = 100 - consumedPct;
      document.getElementById('product-consumed-value').textContent = consumedPct + '%';
      document.getElementById('product-remaining-value').textContent = remainingPct + '%';
      const fill = document.getElementById('product-consumed-bar-fill');
      if (fill) fill.style.width = consumedPct + '%';
      consumedBlock.style.display = 'block';
    } else {
      consumedBlock.style.display = 'none';
    }
  }

  const backBtn = document.querySelector('#screen-product .back-btn');
  if (backBtn) backBtn.dataset.back = productDetailBack;
  // Visibilitat del botó "Moure a un altre Espai" — depèn de si hi
  // ha algun altre Espai amb syncCode disponible (Fase A de Spaces) i,
  // per a productes v2 multi-lot, també queda amagat (Fase D2 final:
  // moure tot el producte amb el botó central no té sentit; cal usar
  // "🚚 Moure" del menú "⋯" de cada lot).
  if (typeof window.refreshMoveProductBtn === 'function') {
    try { window.refreshMoveProductBtn(p); } catch (e) {}
  }

  // Secció "Lots" (Fase D v2): cada fila té botons interactius
  // (✓ Menjar / 🗑️ Llençar / ✏️ Editar / ⋯ Més). _bindLotActions
  // delega click sobre tots ells. Per a productes legacy (no __v:2)
  // _renderLotsSection retorna '' (només es mostra si lots.length > 1).
  const lotsContainer = document.getElementById('product-lots-section');
  if (lotsContainer) {
    lotsContainer.innerHTML = _renderLotsSection(p);
    _bindLotActions(lotsContainer, p);
  }

  // Fase D v2: per a productes __v:2 amaguem els 3 botons centrals
  // d'acció (✓/🗑/✕) i el label "Què vols fer?". Les accions de consum
  // viuen per lot. Els botons add-to-buyme, recipes-from-product i
  // move-product queden visibles per a tots els productes.
  const isV2 = p.__v === 2 && Array.isArray(p.lots);
  const actionsEl = document.querySelector('#screen-product .actions');
  const whatToDoEl = document.querySelector('#screen-product .section-label[data-i18n="whatToDo"]');
  if (actionsEl) actionsEl.style.display = isV2 ? 'none' : '';
  if (whatToDoEl) whatToDoEl.style.display = isV2 ? 'none' : '';

  // Fase D v2: el botó "Editar producte" central té un dataset que
  // indica si és v2 o legacy. El handler a app.js fa la branca.
  const editBtn = document.getElementById('btn-edit-product');
  if (editBtn) editBtn.dataset.v2 = isV2 ? '1' : '0';

  showScreen('product');
}

// Obre el detall d'un producte recordant d'on s'ha entrat per poder
// tornar-hi després d'una acció (consumir/llençar). Per defecte 'view-all'.
function openProductDetail(p, fromScreen) {
  productDetailBack = fromScreen || 'view-all';
  openProduct(p.id);
}

// Després d'una acció (consumed/trashed/deleted), torna a la pantalla
// d'origen i refresca la seva llista. Si no s'ha registrat origen, va a home.
function navigateAfterAction() {
  const target = productDetailBack || 'home';
  switch (target) {
    case 'list':
      if (typeof openShelf === 'function' && currentLevel) {
        openShelf(currentLevel);
        return;
      }
      break;
    case 'alerts':
      if (typeof renderAlerts === 'function') renderAlerts();
      showScreen('alerts');
      return;
    case 'view-all':
      if (typeof _resetViewAllSearch === 'function') _resetViewAllSearch();
      if (typeof renderViewAll === 'function') renderViewAll();
      showScreen('view-all');
      return;
    case 'what-i-have':
      if (typeof renderWhatIHave === 'function') renderWhatIHave();
      showScreen('what-i-have');
      return;
  }
  // home (default)
  showScreen('home');
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
    navigateAfterAction();
    currentProduct = null;
    return;
  }

  // Consumed / Trashed: obrim slider de consum parcial.
  // Si ja s'ha consumit part (consumedPercent), el slider és relatiu al que queda.
  if (action === 'consumed' || action === 'trashed') {
    const product = currentProduct;
    const alreadyConsumed = product.consumedPercent || 0;
    showConsumptionSliderModal(product, action, (absolutePercent, sliderPercent) => {
      finalizeConsumption(product, action, absolutePercent, sliderPercent);
    }, alreadyConsumed);
  }
}

// Si la qty és un número pur (ex: "4", "12", "2.5"), retorna el valor.
// Per a unitats com "1L", "500g" o quantitats buides, retorna null.
function parseQtyNumber(qty) {
  if (typeof qty !== 'string') return null;
  const trimmed = qty.trim();
  if (!trimmed) return null;
  if (!/^\d+(?:[.,]\d+)?$/.test(trimmed)) return null;
  return parseFloat(trimmed.replace(',', '.'));
}

function finalizeConsumption(product, action, percent, displayPercent) {
  // 'percent'        — % real respecte al producte original (per a stats i acumulació)
  // 'displayPercent' — el que l'usuari ha vist al slider (per al toast)
  // Sempre desem el percentatge real a l'historial (per a estadístiques
  // d'estalvi i CO₂), independentment de si el producte queda o desapareix.
  recordConsumption(product, action, percent);

  // XP de gamificació: només per "consumed" (aprofitament). +5 XP bonus
  // si el producte caducava avui o demà (premi al rescat d'última hora).
  if (typeof addXp === 'function') {
    if (action === 'consumed') {
      let xp = Math.round(10 * percent / 100);
      const days = (typeof daysUntil === 'function' && product.date) ? daysUntil(product.date) : null;
      if (typeof days === 'number' && isFinite(days) && days <= 1) xp += 5;
      addXp(xp, 'consumed');
    } else {
      // "trashed" no atorga XP, però volem revisar insignies de constància/streak.
      if (typeof checkBadges === 'function') checkBadges();
    }
  }
  const shown = (typeof displayPercent === 'number') ? displayPercent : percent;

  // Regla per quan el producte es queda a l'EatMe:
  //   Numèric (qty=4): es redueix per unitats per a CONSUMED i TRASHED.
  //                    Si nova_qty > 0 → es queda; si <= 0 → desapareix.
  //   No numèric (1L): consumed acumula consumedPercent; trashed sempre desapareix
  //                    (si has llençat part d'una unitat única, ja no la tens).
  let stayInEatMe = false;
  if (percent < 100) {
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      const p = products[idx];
      const qtyNum = parseQtyNumber(p.qty);
      if (qtyNum !== null) {
        // Quantitat numèrica pura: reduir proporcionalment per a consumed i trashed
        const newQty = Math.round(qtyNum * (100 - percent) / 100);
        if (newQty > 0) {
          p.qty = String(newQty);
          stayInEatMe = true;
        }
      } else if (action === 'consumed') {
        // Quantitat amb unitat o buida: només acumulem per a consumed
        const accumulated = (p.consumedPercent || 0) + percent;
        if (accumulated < 100) {
          p.consumedPercent = accumulated;
          stayInEatMe = true;
        }
      }
    }
  }

  if (!stayInEatMe) {
    products = products.filter(p => p.id !== product.id);
  }

  if (action === 'consumed') stats.consumed++;
  else stats.trashed++;

  const actionLabel = action === 'consumed' ? t('consumedToast') : t('wastedToast');
  let toastMsg;
  if (stayInEatMe) {
    toastMsg = '✓ ' + actionLabel + ' ' + shown + '%, ' + t('stillAtBiteme');
  } else {
    toastMsg = '✓ ' + actionLabel + ' ' + shown + '%';
  }
  showToast(toastMsg);

  saveData();
  renderHome();
  updateStatsSub();
  navigateAfterAction();
  currentProduct = null;

  // Si el producte encara és a l'EatMe, no oferim afegir-lo a la llista
  if (!stayInEatMe) {
    setTimeout(() => askAddToShoppingList(product), 600);
  }
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

  // Capturem preu/qty/pes en el moment del consum perquè els càlculs
  // d'impacte siguin estables encara que canviï el catàleg / mitjanes.
  const entry = {
    productName: product.name,
    productEmoji: product.emoji,
    action: action,
    percent: percent,
    date: new Date().toISOString(),
    location: product.location || null,
    daysFromExpiry: daysFromExpiry
  };
  if (typeof product.price === 'number' && product.price >= 0) entry.price = product.price;
  if (product.qty) entry.qty = product.qty;
  if (product.weight) entry.weight = product.weight;
  hist.push(entry);

  // Limitem a les últimes 500 entrades per evitar bloat de localStorage
  if (hist.length > 500) hist = hist.slice(-500);

  localStorage.setItem('eatmefirst_consumption_history', JSON.stringify(hist));
  if (typeof pushToServer === 'function') pushToServer();
}

// Estat global d'edició: si està definit, saveNewProduct() actualitza el
// producte existent en lloc de crear-ne un de nou.
let editingProductId = null;

// Obre el formulari en mode "editar producte existent" reutilitzant screen-add.
function openEditProductForm(product) {
  openAddForm({
    name: product.name,
    emoji: product.emoji,
    qty: product.qty,
    price: product.price,
    weight: product.weight,
    location: product.location,
    noExpiry: !!product.noExpiry,
    date: product.date,
    _editingId: product.id
  });
}

// FORMULARI MANUAL
function openAddForm(prefill) {
  // Mode edició: només quan openEditProductForm passa _editingId.
  // Qualsevol altra entrada (afegir nou, prefill de popular, escaneig...)
  // surt del mode edició automàticament.
  editingProductId = (prefill && prefill._editingId) ? prefill._editingId : null;

  // Info de congelació al formulari d'edició: visible només si estem
  // editant un producte que té frozenDate guardat. Si l'usuari ha
  // canviat la zona FORA del congelador, la info es manté visible
  // (és informatiu — recorda quan el producte va estar al congelador).
  const frozenInfoEl = document.getElementById('form-frozen-info');
  if (frozenInfoEl) {
    let frozenText = null;
    if (editingProductId) {
      const editingProduct = products.find(pp => pp.id === editingProductId);
      if (editingProduct) frozenText = formatFrozenInfo(editingProduct);
    }
    if (frozenText) {
      frozenInfoEl.textContent = frozenText;
      frozenInfoEl.style.display = '';
    } else {
      frozenInfoEl.style.display = 'none';
    }
  }

  // Configurem títol, botó tornar i botó "popular" segons mode (afegir/editar)
  const titleEl = document.getElementById('screen-add-title');
  const backBtn = document.getElementById('screen-add-back');
  const popularBtn = document.getElementById('popular-btn');
  const saveBtnEl = document.getElementById('save-btn');
  if (editingProductId) {
    if (titleEl) {
      titleEl.removeAttribute('data-i18n');
      titleEl.textContent = t('editProduct');
    }
    if (backBtn) backBtn.dataset.back = 'product';
    if (popularBtn) popularBtn.style.display = 'none';
    if (saveBtnEl) {
      saveBtnEl.removeAttribute('data-i18n');
      saveBtnEl.textContent = t('saveChanges');
    }
  } else {
    if (titleEl) {
      titleEl.setAttribute('data-i18n', 'addProductTitle');
      titleEl.textContent = t('addProductTitle');
    }
    // Si venim del flux "Comprat" del BuyMe (un item del supermercat
    // que estem comprant), back ha de tornar a la pantalla del super,
    // no a la tria genèrica "Afegir producte" de l'EatMe.
    if (backBtn) {
      backBtn.dataset.back = pendingShoppingItemId ? 'supermarket' : 'add-choice';
    }
    if (popularBtn) popularBtn.style.display = '';
    if (saveBtnEl) {
      saveBtnEl.setAttribute('data-i18n', 'save');
      saveBtnEl.textContent = t('save');
    }
  }

  const nameInput = document.getElementById('input-name');
  const productName = prefill && prefill.name ? prefill.name : '';
  nameInput.value = productName;
  nameInput.placeholder = t('productNamePlaceholder');

  // Quantitat (envasos). Default = 1 si no hi ha prefill — refactor
  // formulari: l'app crearà N lots separats si el toggle multi-lots
  // està marcat i qty > 1.
  const qtyInput = document.getElementById('input-qty');
  if (qtyInput) qtyInput.value = (prefill && prefill.qty) ? String(prefill.qty) : '1';

  // Toggle multi-lots: sempre desmarcat al obrir (l'usuari decideix
  // explícitament cada vegada).
  const multiLotsEl = document.getElementById('input-multi-lots');
  if (multiLotsEl) multiLotsEl.checked = false;

  // Preu (opcional): si ve d'un popular/historial amb preu, el pre-fillem
  const priceInput = document.getElementById('input-price');
  if (priceInput) {
    priceInput.value = (prefill && typeof prefill.price === 'number' && prefill.price >= 0)
      ? String(prefill.price)
      : '';
  }

  // Pes (opcional, en text lliure: "500g", "1kg", "1L"...). Pre-fillem
  // si ve d'un popular/historial amb pes guardat.
  const weightInput = document.getElementById('input-weight');
  if (weightInput) {
    weightInput.value = (prefill && prefill.weight) ? String(prefill.weight) : '';
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
  } else if (editingProductId && prefill && prefill.date) {
    // En mode edició, no recalculem la data: respectem el que ja estava guardat.
    dateInputEl.value = prefill.date;
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
  // Refresc del preview dinàmic amb l'estat inicial dels camps.
  _updateAddProductPreview();
}

// Preview dinàmic sota els camps qty + weight + toggle (refactor formulari).
// Decideix segons el checkbox #input-multi-lots: marcat = N lots
// separats, desmarcat = 1 lot amb qty unitats.
function _updateAddProductPreview() {
  const previewEl = document.getElementById('add-product-preview-text');
  if (!previewEl) return;
  const qtyInput = document.getElementById('input-qty');
  const weightInput = document.getElementById('input-weight');
  const multiLotsEl = document.getElementById('input-multi-lots');
  const qty = qtyInput ? qtyInput.value.trim() : '';
  const weight = weightInput ? weightInput.value.trim() : '';
  const multiLots = !!(multiLotsEl && multiLotsEl.checked);

  if (!qty) {
    previewEl.textContent = t('addProductPreviewEmpty');
    return;
  }

  const qtyAsInt = parseInt(qty, 10);
  if (!Number.isFinite(qtyAsInt) || qtyAsInt < 0) {
    previewEl.textContent = 'Quantitat no vàlida';
    return;
  }

  if (multiLots && qtyAsInt > 1) {
    if (weight) {
      previewEl.textContent = 'Es crearan ' + qtyAsInt + ' lots de ' + weight + ' cadascun';
    } else {
      previewEl.textContent = 'Es crearan ' + qtyAsInt + ' lots independents';
    }
    return;
  }

  // Mode comptador (1 lot amb N unitats) — cas per defecte
  if (qtyAsInt > 1) {
    previewEl.textContent = 'Es crearà 1 lot amb ' + qtyAsInt + ' unitats'
      + (weight ? ' de ' + weight + ' cadascuna' : '');
  } else {
    // 1 unitat o 0
    previewEl.textContent = weight ? 'Es crearà 1 lot de ' + weight : 'Es crearà 1 lot';
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

  // Refactor formulari: preview dinàmic oninput de qty + weight,
  // i onchange del toggle multi-lots.
  const qtyInput = document.getElementById('input-qty');
  const weightInput = document.getElementById('input-weight');
  const multiLotsEl = document.getElementById('input-multi-lots');
  if (qtyInput) qtyInput.addEventListener('input', _updateAddProductPreview);
  if (weightInput) weightInput.addEventListener('input', _updateAddProductPreview);
  if (multiLotsEl) multiLotsEl.addEventListener('change', _updateAddProductPreview);
}

// Cerca un nom (case-insensitive) als populars i a l'historial. Retorna
// l'entrada amb totes les pistes que tinguem (emoji, dies, zona, preu, pes,
// noExpiry). Els populars tenen prioritat perquè estan curats.
function findKnownProductByName(name) {
  if (!name) return null;
  const q = name.toLowerCase().trim();
  if (!q) return null;
  const populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
  const fromPopular = populars.find(p => p.name.toLowerCase().trim() === q);
  if (fromPopular) {
    return {
      name: fromPopular.name,
      emoji: fromPopular.emoji,
      days: fromPopular.days,
      location: fromPopular.location,
      price: fromPopular.price,
      weight: fromPopular.weight,
      noExpiry: !!fromPopular.noExpiry,
      source: 'popular'
    };
  }
  const fromHistory = (typeof productHistory !== 'undefined' ? productHistory : [])
    .find(p => p.name.toLowerCase().trim() === q);
  if (fromHistory) {
    return {
      name: fromHistory.name,
      emoji: fromHistory.emoji,
      days: fromHistory.days,
      location: fromHistory.location,
      price: fromHistory.price,
      weight: fromHistory.weight,
      noExpiry: !!fromHistory.noExpiry,
      source: 'history'
    };
  }
  return null;
}

// Aplica al formulari de l'EatMe (screen-add) tot el que sapiguem d'un
// producte conegut: emoji, zona, dies (data), preu, pes, "no caduca".
// No esborra res que l'usuari ja hagi escrit a preu/pes si la match no en porta.
function applyKnownProductToForm(m) {
  if (!m) return;
  selectedEmoji = m.emoji || selectedEmoji;
  if (typeof renderEmojiPicker === 'function') renderEmojiPicker();

  const guessedLoc = m.location || (typeof guessLocationFromName === 'function' ? guessLocationFromName(m.name) : null);
  if (guessedLoc && getLocationById(guessedLoc)) {
    selectedLocation = guessedLoc;
    if (typeof renderLocationPicker === 'function') renderLocationPicker();
  }

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
    if (m.days && dateInput) {
      const d = new Date();
      d.setDate(d.getDate() + m.days);
      dateInput.value = formatDateForInput(d);
      dateInput.dataset.baseDays = m.days;
    }
  }

  const priceInput = document.getElementById('input-price');
  if (priceInput && !priceInput.value.trim() && typeof m.price === 'number' && m.price >= 0) {
    priceInput.value = String(m.price);
  }

  // Weight i Qty: cas especial "Xu" (X dígits + "u") al weight del
  // popular vol dir "X unitats" (ex: Ous "12u"). L'interpretem com a
  // qty=X amb pes buit, perquè és un comptador d'unitats (no un pes
  // per envàs). Protecció habitual: només omplim camps si l'usuari
  // no els ha modificat.
  const weightInput = document.getElementById('input-weight');
  const qtyInput = document.getElementById('input-qty');
  const weightVal = m.weight ? String(m.weight) : '';
  const matchUnits = weightVal.match(/^(\d+)u$/i);

  if (matchUnits) {
    if (qtyInput && (!qtyInput.value.trim() || qtyInput.value.trim() === '1')) {
      qtyInput.value = matchUnits[1];
    }
    // Weight queda buit (l'usuari ja sap que són X unitats via qty)
    if (weightInput && !weightInput.value.trim()) {
      weightInput.value = '';
    }
  } else {
    if (weightInput && !weightInput.value.trim() && weightVal) {
      weightInput.value = weightVal;
    }
    if (qtyInput && !qtyInput.value.trim()) {
      qtyInput.value = '1';
    }
  }

  // Refresc del preview dinàmic després d'omplir camps.
  if (typeof _updateAddProductPreview === 'function') _updateAddProductPreview();
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
          // Autoomplert centralitzat: emoji + weight + price +
          // date/noExpiry. Helper a js/buyme.js que respecta camps
          // ja tocats per l'usuari.
          if (typeof _autofillShoppingFromPopular === 'function') {
            _autofillShoppingFromPopular(m.name);
          }
        } else {
          // Cerquem el match exacte als populars/historial per agafar tot
          // (preu, pes...) i caiem al m que ens venia com a fallback.
          const known = findKnownProductByName(m.name) || m;
          applyKnownProductToForm(known);
        }
        suggBox.innerHTML = '';
      });
      suggBox.appendChild(item);
    });
  });

  // Quan l'usuari acaba d'escriure (blur), si el nom coincideix exactament
  // amb un popular o un producte de l'historial, prefillem la resta de camps.
  if (mode !== 'shopping') {
    input.addEventListener('blur', () => {
      setTimeout(() => { suggBox.innerHTML = ''; }, 200);
      const name = input.value.trim();
      if (!name) return;
      const known = findKnownProductByName(name);
      if (known) applyKnownProductToForm(known);
    });
  } else {
    input.addEventListener('blur', () => {
      setTimeout(() => { suggBox.innerHTML = ''; }, 200);
      // Si el nom coincideix amb un popular, autoomplim els camps
      // buits del formulari (mateix patró que el mode 'product').
      const name = input.value.trim();
      if (name && typeof _autofillShoppingFromPopular === 'function') {
        _autofillShoppingFromPopular(name);
      }
    });
  }
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
  // Normalització: si qty és parsejable com a pes/volum ("500 g", "1l"),
  // s'aplica el format canònic. Si és pur numèric o text lliure, queda
  // tal qual (només trim).
  const qty = qtyInput ? _normalizeWeightString(qtyInput.value.trim()) : '';

  // Preu (opcional). Només el guardem si l'usuari l'ha informat. Acceptem
  // tant punt com coma com a separador decimal: en alguns inputs type=number
  // amb locale ca/es, "2,50" no es parsa bé per parseFloat per defecte.
  const priceInput = document.getElementById('input-price');
  let price = null;
  if (priceInput) {
    const raw = String(priceInput.value || '').trim().replace(',', '.');
    if (raw !== '') {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed >= 0) price = Math.round(parsed * 100) / 100;
    }
  }

  if (!name) { showToast(t('needName')); return; }
  if (!date && !noExpiryChecked) { showToast(t('needDate')); return; }

  // Calcula dies aproximats per a l'aprenentatge automàtic
  let approxDays = null;
  if (date) {
    approxDays = daysUntil(date);
    if (approxDays === Infinity) approxDays = null;
  }

  // Pes (opcional). Normalitzem al format canònic del catàleg:
  // "1l"/"1 l"/"1L" → "1L", "500 g" → "500g", "1,5L" → "1.5L".
  // Text lliure no parsejable ("mig kg") queda tal qual.
  const weightInput = document.getElementById('input-weight');
  const weight = weightInput ? _normalizeWeightString(String(weightInput.value || '')) : '';

  // Aprenentatge: registra historial i propaga al catàleg de populars
  // (creant entrada nova o actualitzant la existent amb les dades fresques).
  recordProductInHistory(name, selectedEmoji, selectedLocation, approxDays, noExpiryChecked, price, weight);

  // Mode edició: actualitzem el producte existent i tornem al detall
  if (editingProductId) {
    const idx = products.findIndex(p => p.id === editingProductId);
    if (idx >= 0) {
      const p = products[idx];
      const oldLocation = p.location;
      p.name = name;
      p.emoji = selectedEmoji;
      p.date = noExpiryChecked ? null : date;
      p.noExpiry = noExpiryChecked;
      p.location = selectedLocation;
      p.qty = qty;
      if (price !== null) p.price = price; else delete p.price;
      if (weight) p.weight = weight; else delete p.weight;
      // frozenDate: si el producte ENTRA al congelador per primera
      // vegada (no en tenia abans), registrem la data d'avui. Si ja
      // en tenia (l'havia tret i ara hi torna, o ja era al congelador
      // i només edita altres camps), mantenim la data antiga: és la
      // data DE CONGELACIÓ, no de l'última edició.
      const newCatLoc = getLocationById(p.location);
      if (newCatLoc && newCatLoc.category === 'freezer' && !p.frozenDate) {
        p.frozenDate = formatDateLocal(new Date());
      }
      currentProduct = p;
      saveData();

      // Si la zona ha canviat, ajustem la pantalla d'origen perquè tornar
      // enrere ensenyi el producte on és ara, no on era abans.
      const zoneChanged = oldLocation !== p.location;
      if (zoneChanged) {
        const oldLoc = getLocationById(oldLocation);
        const newLoc = getLocationById(p.location);
        const oldCat = oldLoc ? oldLoc.category : null;
        const newCat = newLoc ? newLoc.category : null;
        if (productDetailBack === 'list') {
          // El nivell del producte (verd/groc/...) també pot haver canviat
          // i no podem endevinar fàcilment el nou prestatge: tornem a home.
          productDetailBack = 'home';
        } else if (productDetailBack === 'section' && oldCat !== newCat && newCat) {
          currentSection = newCat;
        }
      }

      // Refresquem totes les pantalles "llistat" perquè l'usuari les trobi
      // actualitzades quan torni enrere des del detall.
      renderHome();
      if (typeof renderViewAll === 'function') renderViewAll();
      if (typeof renderWhatIHave === 'function') renderWhatIHave();
      if (typeof renderSection === 'function') renderSection();
      if (typeof renderAlerts === 'function') renderAlerts();

      const editedId = editingProductId;
      editingProductId = null;
      showToast('✓ ' + t('saved'));
      openProduct(editedId);
      return;
    }
    // Si no el trobem (estranyíssim), caiem a la creació normal
    editingProductId = null;
  }

  // Construïm productData (l'objecte "tal com seria" un push legacy)
  // i provem de fusionar amb un producte existent abans de crear-ne
  // un de nou. fusedInto != null indica fusió; els toasts finals
  // s'adapten en conseqüència.
  const productData = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    name: name,
    emoji: selectedEmoji,
    date: noExpiryChecked ? null : date,
    noExpiry: noExpiryChecked,
    location: selectedLocation,
    qty: qty,
    addedAt: new Date().toISOString()
  };
  if (price !== null) productData.price = price;
  if (weight) productData.weight = weight;
  // frozenDate: si el producte es crea directament al congelador,
  // registrem la data d'avui com a "data de congelació". Productes a
  // altres zones no en tenen — només es crea si la primera ubicació
  // (o una edició posterior) és el congelador.
  const newProductLoc = getLocationById(selectedLocation);
  if (newProductLoc && newProductLoc.category === 'freezer') {
    productData.frozenDate = formatDateLocal(new Date());
  }

  // Lògica multiplicadora EXPLÍCITA: la decideix l'usuari amb el
  // checkbox #input-multi-lots (replantejament: l'auto-detecció
  // ambigua confonia packs vs envasos separats).
  // Marcat = N envasos físics separats (1 lot per envàs amb el seu
  // pes i preu). Desmarcat = 1 sol lot amb qty=N unitats.
  const multiLotsEl = document.getElementById('input-multi-lots');
  const isMultiLotsChecked = !!(multiLotsEl && multiLotsEl.checked);
  const qtyAsInt = parseInt(qty, 10);
  const isMultiplier = isMultiLotsChecked && Number.isFinite(qtyAsInt) && qtyAsInt > 1;

  const lotsToCreate = [];
  if (isMultiplier) {
    // N envasos separats: cada lot té qty=weight (per ex. "500g") si
    // l'usuari ha posat pes amb unitat; altrament cada lot serà mode
    // percent (cas defensiu — checkbox marcat sense pes amb unitat).
    const perPackageData = Object.assign({}, productData, {
      qty: (weight && /^[\d.,]+\s*(ml|l|g|kg)$/i.test(weight)) ? weight : ''
    });
    for (let i = 0; i < qtyAsInt; i++) {
      lotsToCreate.push(_buildLotFromNewProduct(perPackageData));
    }
  } else {
    lotsToCreate.push(_buildLotFromNewProduct(productData));
  }

  const existing = _findGroupedProductForFusion(productData.name, productData.emoji, productData.location);
  let newProduct;
  let fusedInto = null;
  if (existing) {
    lotsToCreate.forEach(l => _addLotToProduct(existing, l));
    newProduct = existing;
    fusedInto = existing;
  } else {
    newProduct = _createV2ProductWithLot(productData, lotsToCreate[0]);
    products.push(newProduct);
    for (let i = 1; i < lotsToCreate.length; i++) {
      _addLotToProduct(newProduct, lotsToCreate[i]);
    }
    // _createV2ProductWithLot setja product.qty al text literal del
    // formulari ("4"); cal refresh per recalcular l'agregat (cas
    // units × weight: "4 × 500g" → "2 kg"). _addLotToProduct ja
    // refresca per als lots i>=1, però per al cas 1-lot mai s'invoca.
    _refreshProductMirrors(newProduct);
  }

  saveData();

  // Gamificació: comptador històric + 2 XP per producte afegit a l'EatMe.
  if (typeof bumpProductsAddedCounter === 'function') bumpProductsAddedCounter();
  if (typeof addXp === 'function') addXp(2, 'eatme-add');

  // Si veníem de la llista de la compra, traiem l'item d'allà i tornem a comprar
  if (pendingShoppingItemId) {
    const fromShopping = pendingShoppingSupermarketId; // recordem el supermercat
    shoppingItems = shoppingItems.filter(it => it.id !== pendingShoppingItemId);
    saveShoppingData();
    pendingShoppingItemId = null;

    // Registre al purchase history (path fallback amb form manual).
    // Resol popularId via match per nom contra la cache de populars;
    // calcula days_calc dels valors realment desats al producte.
    //
    // days_calc = daysUntil(newProduct.date) representa la durada de
    // vida útil estimada des de la compra. Coincideix amb "dies fins
    // a caducitat" perquè la compra és avui. Si en el futur s'implementa
    // "compra retroactiva" amb data anterior a avui, caldrà ajustar
    // aquest càlcul.
    if (typeof recordPurchase === 'function') {
      const _populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
      const _nkey = String(newProduct.name || '').toLowerCase().trim();
      const _matched = _populars.find(p => p.name && p.name.toLowerCase().trim() === _nkey);
      let _daysCalc = null;
      if (!newProduct.noExpiry && newProduct.date && typeof daysUntil === 'function') {
        const d = daysUntil(newProduct.date);
        if (Number.isFinite(d)) _daysCalc = d;
      }
      const _sm = (typeof getSupermarketById === 'function') ? getSupermarketById(fromShopping) : null;
      // N crides — 1 per cada lot creat (lots multiplicador són envasos
      // independents, cada un = una compra). Per a 1 sol lot, 1 crida.
      const _purchaseCount = lotsToCreate.length || 1;
      for (let _i = 0; _i < _purchaseCount; _i++) {
        recordPurchase({
          popularId: _matched ? _matched.id : null,
          name: newProduct.name,
          price: (typeof price === 'number') ? price : (typeof newProduct.price === 'number' ? newProduct.price : undefined),
          weight: (isMultiplier ? weight : newProduct.weight) || undefined,
          days_calc: _daysCalc,
          days_real: null,
          supermarket: (_sm && _sm.name) || null,
          productId: newProduct.id
        });
      }
    }

    // Si estem en mode de compra guiada, continuem comprant
    if (fromShopping) {
      pendingShoppingSupermarketId = null;
      currentSupermarketId = fromShopping;
      renderShoppingItems();
      showScreen('supermarket');
      showToast(_buildAddToast(name, selectedEmoji, isMultiplier, qtyAsInt, weight, fusedInto, t('addedFromShopping')));
      return;
    }

    pendingShoppingSupermarketId = null;
    renderHome();
    showScreen('home');
    showToast(_buildAddToast(name, selectedEmoji, isMultiplier, qtyAsInt, weight, fusedInto, t('addedFromShopping')));
  } else {
    renderHome();
    showScreen('home');
    showToast(_buildAddToast(name, selectedEmoji, isMultiplier, qtyAsInt, weight, fusedInto, t('added')));
  }
}

// Toast diferenciat segons N lots i si hi ha fusió (Fase refactor formulari).
function _buildAddToast(name, emoji, isMultiplier, qtyAsInt, weight, fusedInto, defaultSuffix) {
  if (isMultiplier && qtyAsInt > 1) {
    if (fusedInto) {
      return '✅ ' + qtyAsInt + ' lots afegits a ' + name + ' (' + fusedInto.lots.length + ' lots en total)';
    }
    return '✅ ' + qtyAsInt + ' lots de ' + weight + ' afegits a ' + name;
  }
  if (fusedInto) {
    return '✅ Lot afegit a ' + name + ' (' + fusedInto.lots.length + ' lots)';
  }
  return '✅ ' + (emoji || '') + ' ' + name + ' ' + defaultSuffix;
}

// Historial de productes ja escrits/comprats per recuperar com a suggeriments
let productHistory = []; // [{name, emoji, count, lastUsed}]

function loadProductHistory() {
  try {
    const raw = localStorage.getItem('eatmefirst_product_history');
    if (raw) productHistory = JSON.parse(raw);
  } catch(e) { productHistory = []; }
}

// Historial de productes que ha escrit l'usuari. Ens serveix per:
//   1) Suggerir noms a l'autocomplete del formulari.
//   2) Propagar els valors al catàleg de populars (aprenentatge automàtic).
function recordProductInHistory(name, emoji, location, days, noExpiry, price, weight) {
  const key = name.toLowerCase().trim();
  const hasPrice = typeof price === 'number' && price >= 0;
  const hasWeight = typeof weight === 'string' && weight.trim() !== '';
  const existing = productHistory.find(p => p.name.toLowerCase() === key);
  if (existing) {
    existing.count++;
    existing.lastUsed = Date.now();
    if (emoji) existing.emoji = emoji;
    if (location) existing.location = location;
    if (days) existing.days = days;
    existing.noExpiry = !!noExpiry;
    if (hasPrice) existing.price = price;
    if (hasWeight) existing.weight = weight;
  } else {
    const entry = { name, emoji: emoji || '🥛', location, days, noExpiry: !!noExpiry, count: 1, lastUsed: Date.now() };
    if (hasPrice) entry.price = price;
    if (hasWeight) entry.weight = weight;
    productHistory.push(entry);
  }
  productHistory.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
  if (productHistory.length > 50) productHistory = productHistory.slice(0, 50);
  localStorage.setItem('eatmefirst_product_history', JSON.stringify(productHistory));

  // APRENENTATGE: cada cop que es desa un producte, l'afegim als populars
  // (o actualitzem l'entrada existent amb tot el que sapiguem).
  addToCustomPopular(name, emoji, days, location, noExpiry, price, weight);
}

function addToCustomPopular(name, emoji, days, location, noExpiry, price, weight) {
  const list = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
  const safeEmoji = emoji || '🥛';
  const safeDays = (typeof days === 'number' && days > 0) ? days : 7;
  const safeLoc = location || (typeof guessLocationFromName === 'function' ? guessLocationFromName(name) : null) || 'pantry';
  const noExp = !!noExpiry;
  const hasPrice = typeof price === 'number' && price >= 0;
  const hasWeight = typeof weight === 'string' && weight.trim() !== '';

  const existing = list.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    // Si l'usuari ha tocat aquesta entrada explícitament des de Configuració,
    // no la sobreescrivim amb dades aproximades de l'aprenentatge automàtic:
    // hi ha valors curats (ex: "Pa 4 dies") que volem preservar contra càlculs
    // derivats d'una compra concreta on l'usuari pot haver-hi posat altres dies.
    if (existing.userEdited) {
      // Només omplim camps que estaven completament absents.
      if (!existing.emoji) existing.emoji = safeEmoji;
      if (!existing.location) existing.location = safeLoc;
      if (typeof existing.price !== 'number' && hasPrice) existing.price = price;
      if (!existing.weight && hasWeight) existing.weight = weight;
    } else {
      existing.emoji = safeEmoji;
      existing.days = safeDays;
      existing.location = safeLoc;
      existing.noExpiry = noExp;
      // Weight i price del popular són la "veritat canònica" del catàleg.
      // No els sobreescrivim amb cada compra concreta — només omplim si
      // estan buits (cas legítim d'aprenentatge inicial). Si l'usuari vol
      // canviar el popular, ho fa explícitament a Configuració → Populars.
      if (typeof existing.price !== 'number' && hasPrice) existing.price = price;
      if (!existing.weight && hasWeight) existing.weight = weight;
    }
  } else {
    const entry = {
      id: 'pop-learned-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name,
      emoji: safeEmoji,
      days: safeDays,
      location: safeLoc,
      noExpiry: noExp,
      autoCreated: true
    };
    if (hasPrice) entry.price = price;
    if (hasWeight) entry.weight = weight;
    list.push(entry);
  }
  if (typeof savePopularProducts === 'function') savePopularProducts(list);
}

// Endevina la zona segons el nom del producte
// Comprova si una paraula curta apareix com a token complet a un text
// (evita que "pa" matchegi "patata" o "lapa"). Per a paraules llargues
// preferim simple substring perquè és més tolerant a plurals/derivacions.
function nameContainsWord(text, word) {
  const w = word.toLowerCase();
  if (w.length > 3) return text.includes(w);
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(^|[^a-zàáâãäåçèéêëìíîïñòóôõöùúûü])' + escaped + '($|[^a-zàáâãäåçèéêëìíîïñòóôõöùúûü])', 'i');
  return re.test(text);
}

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
    'conserva', 'sardina', 'tonyina', 'atun', 'tuna',
    // Pa i forn
    'pa', 'pan', 'bread', 'baguette', 'baguet', 'croissant', 'crois', 'panet', 'bagel',
    'bollo', 'bolleria', 'bizcocho', 'magdalena', 'donut', 'dònut',
    // Caramels i dolços
    'caramel', 'caramelo', 'candy', 'llaminadura', 'gominola', 'pastís', 'pastel', 'cake',
    // Conserves i envasats
    'pot', 'lata', 'can', 'frasco',
    // Fruita seca
    'ametlla', 'almendra', 'almond', 'avellana', 'hazelnut', 'nou', 'nuez', 'walnut',
    'pistatxo', 'pistacho', 'pistachio', 'cacauet', 'cacahuete', 'peanut',
    // Salses estables
    'mostassa', 'mostaza', 'mustard', 'ketchup', 'soja', 'soy',
    // Begudes estables
    'aigua', 'agua', 'water', 'refresc', 'refresco', 'soda'];

  const dairy = ['llet', 'leche', 'milk', 'iogurt', 'yogur', 'yoghurt', 'formatge', 'queso', 'cheese',
    'mantega', 'mantequilla', 'butter', 'nata', 'cream', 'ou', 'huevo', 'egg'];

  const medicine = ['paracetamol', 'ibuprofen', 'aspirina', 'aspirin', 'pastilla', 'pill', 'medicina',
    'medicine', 'xarop', 'jarabe', 'venda', 'tirita', 'apósito'];

  for (const w of medicine) if (nameContainsWord(n, w)) return 'medicine';
  for (const w of fruitsVeg) if (nameContainsWord(n, w)) return 'fruit_bowl';
  for (const w of meatFish) if (nameContainsWord(n, w)) return 'fridge';
  for (const w of dairy) if (nameContainsWord(n, w)) return 'fridge';
  for (const w of pantryItems) if (nameContainsWord(n, w)) return 'pantry';

  return null;
}

function searchProductHistory(query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();

  // Combina historial + productes populars
  const fromHistory = productHistory.filter(p => p.name.toLowerCase().includes(q));
  const fromPopular = getPopularProducts()
    .filter(p => p.name.toLowerCase().includes(q))
    .map(p => ({ name: p.name, emoji: p.emoji, days: p.days, location: p.location, noExpiry: !!p.noExpiry, isPopular: true }));

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
let emojiPickerCategory = 'all';
let emojiPickerQuery = '';

function _emojiPickerCurrentEmoji(target) {
  if (target === 'supermarket') return selectedSupermarketEmoji;
  if (target === 'shopping') return selectedShoppingEmoji;
  if (target === 'popular') return selectedPopularEmoji;
  if (target === 'special-item') return selectedSpecialItemEmoji;
  if (target === 'recipe') return (typeof selectedRecipeEmoji !== 'undefined') ? selectedRecipeEmoji : '🍳';
  if (target === 'recipe-ingredient') {
    if (typeof editingRecipeData !== 'undefined' && editingRecipeData
        && Array.isArray(editingRecipeData.ingredients)
        && typeof editingRecipeIngredientIdx === 'number'
        && editingRecipeData.ingredients[editingRecipeIngredientIdx]) {
      return editingRecipeData.ingredients[editingRecipeIngredientIdx].emoji || '🥕';
    }
    return '🥕';
  }
  // FASE D polish: emoji actual al modal d'editar producte (mentre
  // l'usuari navega cap al picker complet)
  if (target === 'product-edit-emoji') {
    return _editProductModalState ? _editProductModalState.emoji : '';
  }
  return selectedEmoji;
}

function _emojiPickerApply(target, e) {
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
  } else if (target === 'recipe') {
    selectedRecipeEmoji = e;
    const btn = document.getElementById('recipe-emoji-current');
    if (btn) btn.textContent = e;
  } else if (target === 'recipe-ingredient') {
    if (typeof editingRecipeData !== 'undefined' && editingRecipeData
        && Array.isArray(editingRecipeData.ingredients)
        && typeof editingRecipeIngredientIdx === 'number'
        && editingRecipeData.ingredients[editingRecipeIngredientIdx]) {
      editingRecipeData.ingredients[editingRecipeIngredientIdx].emoji = e;
      if (typeof renderRecipeEditIngredients === 'function') renderRecipeEditIngredients();
    }
  } else if (target === 'product-edit-emoji') {
    // FASE D polish: l'usuari ha aplicat un emoji. Neteja el back
    // listener (ja no cal el fallback de cancel·lació) i re-obre
    // el modal amb l'estat preservat + el nou emoji.
    const backBtn = document.getElementById('emoji-picker-back-btn');
    if (backBtn && _editProductModalBackListener) {
      backBtn.removeEventListener('click', _editProductModalBackListener);
      _editProductModalBackListener = null;
    }
    if (_editProductModalState) {
      const state = _editProductModalState;
      state.emoji = e;
      _editProductModalState = null;
      const product = products.find(p => p.id === state.productId);
      if (product) openProductEditModal(product, state);
    }
  } else {
    selectedEmoji = e;
    renderEmojiPicker();
  }
}

function renderEmojiPickerGrid() {
  const target = emojiPickerTarget;
  const currentEmoji = _emojiPickerCurrentEmoji(target);

  // Per a supermercats fem servir un set propi (no menjar) i no oferim
  // categories ni cerca: la llista és curta i temàtica.
  if (target === 'supermarket') {
    const cats = document.getElementById('emoji-categories');
    const search = document.getElementById('emoji-search');
    if (cats) cats.style.display = 'none';
    if (search) search.style.display = 'none';
    const container = document.getElementById('emoji-picker-full');
    if (!container) return;
    container.innerHTML = '';
    SUPERMARKET_EMOJIS.forEach(e => container.appendChild(_makeEmojiBtn(e, currentEmoji, target)));
    return;
  }

  const cats = document.getElementById('emoji-categories');
  const search = document.getElementById('emoji-search');
  if (cats) cats.style.display = '';
  if (search) search.style.display = '';

  let emojisToShow;
  if (emojiPickerQuery) {
    emojisToShow = searchEmojiByName(emojiPickerQuery);
  } else if (emojiPickerCategory && emojiPickerCategory !== 'all') {
    const cat = EMOJI_CATEGORIES.find(c => c.id === emojiPickerCategory);
    emojisToShow = cat ? cat.emojis.slice() : EMOJIS;
  } else {
    emojisToShow = EMOJIS;
  }

  const container = document.getElementById('emoji-picker-full');
  if (!container) return;
  container.innerHTML = '';
  if (emojisToShow.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noResults');
    container.appendChild(empty);
    return;
  }
  emojisToShow.forEach(e => container.appendChild(_makeEmojiBtn(e, currentEmoji, target)));
}

function _makeEmojiBtn(e, currentEmoji, target) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'emoji-option-big' + (e === currentEmoji ? ' selected' : '');
  btn.textContent = e;
  btn.addEventListener('click', () => {
    _emojiPickerApply(target, e);
    showScreen(emojiPickerOrigin);
  });
  return btn;
}

// =============================================================
//   FASE D polish — emoji grid inline + picker dropdown genèric
// =============================================================

// State temporal per a restaurar el modal d'editar producte quan
// l'usuari torna del picker complet d'emojis (sigui aplicant o
// cancel·lant). _editProductModalBackListener captura el cas
// cancel·lació (back-btn del picker sense tria d'emoji).
let _editProductModalState = null;
let _editProductModalBackListener = null;

// Helper genèric: lliga un picker dropdown (botó + opcions ocultes
// amb scroll). Reusa el patró .category-picker-* ja existent
// (vegeu _populatePopularCategorySelect a js/populars.js).
// Retorna una funció destroy() per netejar el listener global de
// click-fora quan el modal es tanca.
function _buildPickerDropdown(btnId, dropdownId, options, currentId, onSelect) {
  const btn = document.getElementById(btnId);
  const dropdown = document.getElementById(dropdownId);
  if (!btn || !dropdown) return function () {};

  const applySelection = (id) => {
    const sel = options.find(o => o.id === id) || options[0];
    if (!sel) return;
    const iconEl = btn.querySelector('.picker-icon');
    const labelEl = btn.querySelector('.picker-label');
    if (iconEl) iconEl.textContent = sel.icon || '';
    if (labelEl) labelEl.textContent = sel.label || '';
    btn.dataset.value = sel.id;
  };
  applySelection(currentId);

  dropdown.innerHTML = options.map(o =>
    '<button type="button" class="category-option" data-id="' + escapeHtml(o.id) + '">'
    + '<span class="cat-option-icon">' + escapeHtml(o.icon || '') + '</span>'
    + '<span class="cat-option-name">' + escapeHtml(o.label || '') + '</span>'
    + '</button>'
  ).join('');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdown.hasAttribute('hidden');
    if (isHidden) {
      // Tancar tots els altres pickers oberts (modal o no). Convenció
      // d'IDs: <prefix>-btn / <prefix>-dropdown perquè el lookup
      // creuat funcioni.
      document.querySelectorAll('.category-picker-dropdown').forEach(d => {
        if (d === dropdown) return;
        if (d.hasAttribute('hidden')) return;
        d.setAttribute('hidden', '');
        if (d.id) {
          const otherBtnId = d.id.replace(/-dropdown$/, '-btn');
          const otherBtn = document.getElementById(otherBtnId);
          if (otherBtn) otherBtn.classList.remove('open');
        }
      });
      dropdown.removeAttribute('hidden');
      btn.classList.add('open');
    } else {
      dropdown.setAttribute('hidden', '');
      btn.classList.remove('open');
    }
  });

  dropdown.querySelectorAll('.category-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      applySelection(opt.dataset.id);
      dropdown.setAttribute('hidden', '');
      btn.classList.remove('open');
      if (typeof onSelect === 'function') onSelect(opt.dataset.id);
    });
  });

  const onDocClick = (e) => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.setAttribute('hidden', '');
      btn.classList.remove('open');
    }
  };
  document.addEventListener('click', onDocClick);

  return function destroy() {
    document.removeEventListener('click', onDocClick);
  };
}

function renderEmojiCategoriesTabs() {
  const wrap = document.getElementById('emoji-categories');
  if (!wrap) return;
  const target = emojiPickerTarget;
  if (target === 'supermarket') { wrap.innerHTML = ''; return; }

  wrap.innerHTML = '';
  const tabs = [{ id: 'all', label: t('filterAll') || 'Tots' }].concat(
    EMOJI_CATEGORIES.map(c => ({ id: c.id, label: c.label }))
  );
  tabs.forEach(t2 => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-category-tab' + ((emojiPickerCategory === t2.id) ? ' active' : '');
    btn.textContent = t2.label;
    btn.addEventListener('click', () => {
      emojiPickerCategory = t2.id;
      emojiPickerQuery = '';
      const search = document.getElementById('emoji-search');
      if (search) search.value = '';
      renderEmojiCategoriesTabs();
      renderEmojiPickerGrid();
    });
    wrap.appendChild(btn);
  });
}

function openEmojiPicker(target, origin) {
  emojiPickerTarget = target;
  emojiPickerOrigin = origin;
  emojiPickerCategory = 'all';
  emojiPickerQuery = '';
  const backBtn = document.getElementById('emoji-picker-back-btn');
  if (backBtn) backBtn.dataset.back = origin;

  // FASE D polish: si hi havia un listener pendent d'una sessió
  // anterior del modal d'editar producte, netejar-lo abans
  // d'instal·lar-ne un de nou (o cap, si el target ja no és el
  // de l'edit producte).
  if (backBtn && _editProductModalBackListener) {
    backBtn.removeEventListener('click', _editProductModalBackListener);
    _editProductModalBackListener = null;
  }
  if (backBtn && target === 'product-edit-emoji') {
    _editProductModalBackListener = function () {
      // L'usuari ha cancel·lat la tria. Re-obre el modal amb l'estat
      // original. El handler genèric del back-btn ja ha fet
      // showScreen('product') abans (ordre d'addEventListener).
      const listener = _editProductModalBackListener;
      _editProductModalBackListener = null;
      if (listener && backBtn) backBtn.removeEventListener('click', listener);
      if (_editProductModalState) {
        const state = _editProductModalState;
        _editProductModalState = null;
        const product = products.find(p => p.id === state.productId);
        if (product) setTimeout(() => openProductEditModal(product, state), 0);
      }
    };
    backBtn.addEventListener('click', _editProductModalBackListener);
  }

  const search = document.getElementById('emoji-search');
  if (search) {
    search.value = '';
    search.placeholder = t('searchEmojiPlaceholder');
  }

  renderEmojiCategoriesTabs();
  renderEmojiPickerGrid();
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
          // Comprovem abans d'obrir el formulari si ja en tenim a l'EatMe
          const existing = (typeof findExistingAtHome === 'function') ? findExistingAtHome(data.name) : [];
          const proceedToForm = () => {
            if (existing.length > 0) skipExistingCheckOnNextSave = true;
            openShoppingItemEdit(null);
            setTimeout(() => {
              const ni = document.getElementById('input-shopping-name');
              if (ni) ni.value = data.name;
              selectedShoppingEmoji = data.emoji || '🥛';
              renderShoppingEmojiPickerBtn();
            }, 100);
          };
          if (existing.length > 0) {
            // Tornem al super perquè el modal floti per sobre d'una pantalla coherent
            showScreen('supermarket');
            showAlreadyHaveModal(data.name, existing, proceedToForm);
          } else {
            proceedToForm();
          }
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

// El swipe entre zones ara el gestiona scroll-snap natiu del .zones-slider
// (vegeu styles.css). Conservem la funció com a no-op perquè app.js encara
// la crida durant la inicialització, i altres scripts poden referenciar-la.
function setupSwipeNavigation() {}
