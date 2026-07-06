/* ============================================
   Buyte — js/expenses.js
   Pantalla "Despeses" (sub-tab a Settings → Activitat).
   Agrega purchase_history (eatmefirst_purchase_history) per
   mostrar: total al període, evolució mensual, comparativa per
   super, top productes per cost acumulat.

   Diferent d'impact.js (que tracta sostenibilitat: €/CO₂ aprofitats
   vs llençats des de consumption_history). Aquí l'enfocament és
   la DESPESA real feta al BuyMe.

   3 estats de render:
     1. Sense cap entrada al history → empty state global
     2. Hi ha entrades però cap al període → render amb 0 al total
        + chart 6 mesos (que sí pot tenir dades) + placeholders a
        les cards "Per super" i "Top productes"
     3. Entrades al període → render normal amb totes les cards
   ============================================ */

let _expensesCurrentRange = 'month';

function openExpenses(origin) {
  _expensesCurrentRange = 'month';
  const backBtn = document.querySelector('#screen-expenses .back-btn');
  if (backBtn) {
    const isSettings = origin === 'settings' || (typeof origin === 'string' && origin.indexOf('settings-') === 0);
    backBtn.dataset.back = isSettings ? origin : 'settings';
  }
  document.querySelectorAll('#expenses-period-pills .impact-period-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.period === _expensesCurrentRange);
  });
  renderExpenses();
  showScreen('expenses');
}

function setExpensesPeriod(period) {
  _expensesCurrentRange = period;
  document.querySelectorAll('#expenses-period-pills .impact-period-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.period === period);
  });
  renderExpenses();
}

// Assigna .pct ENTERS que sumen exactament 100 (mètode del residu major):
// floor de cada quota total/grandTotal*100 i reparteix les unitats que
// falten (100 − suma de floors) als ítems amb el residu decimal més gran.
// grandTotal 0 → tots pct=0. Muta i retorna el mateix array.
function _assignPctLargestRemainder(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  const grand = arr.reduce((s, x) => s + (typeof x.total === 'number' ? x.total : 0), 0);
  if (grand <= 0) { arr.forEach(x => { x.pct = 0; }); return arr; }
  let assigned = 0;
  const withRem = arr.map(x => {
    const exact = (x.total / grand) * 100;
    const floor = Math.floor(exact);
    x.pct = floor;
    assigned += floor;
    return { x: x, rem: exact - floor };
  });
  let leftover = 100 - assigned;
  withRem.sort((a, b) => b.rem - a.rem);   // residu decimal més gran primer
  for (let i = 0; i < withRem.length && leftover > 0; i++) {
    withRem[i].x.pct += 1;
    leftover--;
  }
  return arr;
}

// === Agregació de dades des de purchase_history ===
function _expensesGetData(rangeKey) {
  let history = {};
  try {
    const raw = localStorage.getItem('eatmefirst_purchase_history');
    if (raw) history = JSON.parse(raw) || {};
  } catch (e) { history = {}; }

  // Flatten: history és { popularId: [entries] }. Convertir a array
  // pla amb popularId injectat a cada entrada.
  const allEntries = [];
  Object.keys(history).forEach(popId => {
    const entries = Array.isArray(history[popId]) ? history[popId] : [];
    entries.forEach(e => {
      if (!e || typeof e !== 'object') return;
      allEntries.push(Object.assign({ popularId: popId }, e));
    });
  });

  // Filtre temporal per a Card 1, 3, 4 — períodes NATURALS (de calendari),
  // no rolling. Card 2 (chart 6 mesos) sempre usa allEntries.
  //   month: mateix any+mes que now (mateix predicat que byMonth) → data.total
  //          queda idèntic a data.monthSpent i la card "Aquest mes" quadra
  //          amb el pressupost.
  //   week:  setmana natural, del dilluns d'aquesta setmana fins ara.
  //   all:   tot.
  const now = new Date();
  let inPeriod;
  if (rangeKey === 'month') {
    inPeriod = (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  } else if (rangeKey === 'week') {
    // Dilluns de la setmana en curs (00:00 local). getDay(): 0=Diu…6=Dis.
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = monday.getDay();
    monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
    const mondayMs = monday.getTime();
    inPeriod = (d) => d.getTime() >= mondayMs;
  } else {
    inPeriod = () => true; // all
  }
  const filtered = allEntries.filter(e => {
    const d = new Date(e.date);
    return Number.isFinite(d.getTime()) && inPeriod(d);
  });

  // Import d'una línia (cistella exacta v2): el total REAL registrat
  // (preu × unitats) si existeix; si no (entrades velles), el price
  // per-unitat com a fallback. S'usa a TOTS els sumatoris perquè els
  // desglossaments (per súper/categoria/producte/mes) segueixin sumant
  // el mateix total.
  const _lineAmount = (e) => (typeof e.totalPrice === 'number') ? e.totalPrice
    : (typeof e.price === 'number' ? e.price : 0);

  // total i count del PERÍODE. count compta tots els ARTICLES del
  // període; total suma l'import real de cada línia.
  const total = filtered.reduce((s, e) => s + _lineAmount(e), 0);
  const count = filtered.length;

  // Cistella mitjana (v1): no hi ha sessió de compra al model, així que
  // agrupem els articles per (dia + supermercat) com a proxy d'una
  // "cistella". avgBasket = despesa total / nombre de cistelles.
  const basketKeys = {};
  filtered.forEach(e => {
    // Cistella exacta v2: agrupa per basketId real (anada a comprar) quan
    // existeix; si no (entrades velles o altes manuals), fallback al proxy
    // (dia + súper). avgBasket = despesa total / nombre de cistelles.
    const key = e.basketId
      ? ('b:' + e.basketId)
      : ((e.date || '?') + '|' + (e.supermarket || '(sense super)'));
    basketKeys[key] = true;
  });
  const basketCount = Object.keys(basketKeys).length;
  const avgBasket = basketCount ? total / basketCount : 0;

  // Per super (al període)
  const bySuperMap = {};
  filtered.forEach(e => {
    const key = e.supermarket || '(sense super)';
    if (!bySuperMap[key]) bySuperMap[key] = { name: key, total: 0, count: 0 };
    bySuperMap[key].total += _lineAmount(e);
    bySuperMap[key].count += 1;
  });
  const bySuper = Object.values(bySuperMap).sort((a, b) => b.total - a.total);
  _assignPctLargestRemainder(bySuper);

  // Per producte popular (al període, resol nom + emoji des de la cache)
  const populars = (typeof getPopularProducts === 'function')
    ? (getPopularProducts() || []) : [];
  const popById = new Map();
  populars.forEach(p => { if (p && p.id) popById.set(p.id, p); });

  const byPopularMap = {};
  filtered.forEach(e => {
    const key = e.popularId || '__unknown__';
    if (!byPopularMap[key]) {
      const popular = popById.get(key);
      byPopularMap[key] = {
        id: key,
        name: popular ? popular.name : 'Producte desconegut',
        emoji: popular ? popular.emoji : '📦',
        total: 0,
        count: 0
      };
    }
    byPopularMap[key].total += _lineAmount(e);
    byPopularMap[key].count += 1;
  });
  const byPopular = Object.values(byPopularMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Per categoria (al període). Reusa popById per a emoji/nom; resol amb
  // el mapa explícit d'assignacions de l'usuari i, si manca, l'endevina
  // per emoji/nom (detectCategoryForItem). Els no resolts → cat_other
  // ("Altres"), el catch-all del sistema de categories.
  const _CS = (typeof window !== 'undefined') ? window.CategoriesSystem : null;
  const itemCats = (_CS && typeof _CS.getItemCategories === 'function') ? _CS.getItemCategories() : {};
  const byCategoryMap = {};
  filtered.forEach(e => {
    const pop = popById.get(e.popularId);
    let catId = itemCats[e.popularId];
    if (!catId && _CS && typeof _CS.detectCategoryForItem === 'function') {
      catId = _CS.detectCategoryForItem({ name: pop ? pop.name : e.name, emoji: pop ? pop.emoji : null });
    }
    catId = catId || 'cat_other';
    if (!byCategoryMap[catId]) {
      const cat = (_CS && typeof _CS.getCategoryById === 'function') ? _CS.getCategoryById(catId) : null;
      byCategoryMap[catId] = {
        id: catId,
        name: cat ? cat.name : 'Altres',
        icon: cat ? cat.icon : '📦',
        total: 0,
        count: 0
      };
    }
    byCategoryMap[catId].total += _lineAmount(e);
    byCategoryMap[catId].count += 1;
  });
  const byCategory = Object.values(byCategoryMap).sort((a, b) => b.total - a.total);
  _assignPctLargestRemainder(byCategory);

  // Per mes: SEMPRE últims 6 mesos des d'allEntries (independent del
  // filtre temporal — el chart mostra evolució que persisteix encara
  // que no hi hagi compres al període seleccionat).
  const byMonth = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i, 1);
    byMonth.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: monthShortLetter(d.getMonth()),
      fullLabel: monthFullName(d.getMonth()),
      total: 0
    });
  }
  allEntries.forEach(e => {
    const t = new Date(e.date).getTime();
    if (!Number.isFinite(t)) return;
    const d = new Date(t);
    const idx = byMonth.findIndex(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (idx >= 0) byMonth[idx].total += _lineAmount(e);
  });

  // Pressupost mensual + despesa del MES NATURAL en curs (byMonth[últim],
  // independent del filtre week/month/all — "month" del filtre és rolling 30d).
  const monthlyBudget = Number(localStorage.getItem('eatmefirst_monthly_budget')) || 0;
  const monthSpent = byMonth.length ? byMonth[byMonth.length - 1].total : 0;

  // Compres recents / anades (Despeses v2, Fase 3): agrupa els records del
  // període per anada — mateix criteri que la cistella mitjana: `b:basketId`
  // si existeix, si no proxy (dia + súper). Cada anada porta els recordIds
  // (per editar/esborrar via helpers genèrics). Ordenat per data DESC.
  const tripsMap = {};
  filtered.forEach(e => {
    const hasBasket = !!e.basketId;
    const key = hasBasket
      ? ('b:' + e.basketId)
      : ((e.date || '?') + '|' + (e.supermarket || '(sense super)'));
    if (!tripsMap[key]) {
      tripsMap[key] = {
        key: key,
        basketId: hasBasket ? e.basketId : null,
        recordIds: [],
        date: e.date || '',
        supermarket: e.supermarket || null,
        itemCount: 0,
        total: 0
      };
    }
    const trip = tripsMap[key];
    if (e.recordId) trip.recordIds.push(e.recordId);
    trip.itemCount += 1;
    trip.total += _lineAmount(e);
    // Data més recent del grup (rellevant per al proxy, tot i que hi comparteix dia).
    if ((e.date || '') > trip.date) trip.date = e.date || trip.date;
  });
  const trips = Object.values(tripsMap).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return {
    rangeKey,
    total,
    count,
    basketCount,
    avgBasket,
    monthlyBudget,
    monthSpent,
    totalEntries: allEntries.length, // history global, independent del filtre
    bySuper,
    byCategory,
    byPopular,
    byMonth,
    trips
  };
}

// === Render ===
function renderExpenses() {
  const empty = document.getElementById('expenses-empty');
  const cards = document.getElementById('expenses-cards');
  const pills = document.getElementById('expenses-period-pills');
  if (!cards) return;

  const data = _expensesGetData(_expensesCurrentRange);

  // Estat 1: sense cap entrada al history → empty global
  if (data.totalEntries === 0) {
    if (empty) empty.style.display = 'block';
    if (pills) pills.style.display = 'none';
    cards.innerHTML = '';
    return;
  }

  // Estat 2 i 3: hi ha entrades → render cards (amb placeholder a
  // per-super/top quan data.count===0).
  if (empty) empty.style.display = 'none';
  if (pills) pills.style.display = '';

  cards.innerHTML = [
    _renderExpensesTotalCard(data),
    _renderExpensesBudgetCard(data),
    _renderExpensesMonthlyCard(data),
    _renderExpensesBySupCard(data),
    _renderExpensesByCategoryCard(data),
    _renderExpensesTopProductsCard(data),
    _renderExpensesTripsCard(data)
  ].join('');
}

function _expensesRangeLabel(rangeKey) {
  if (rangeKey === 'week') return 'Aquesta setmana';
  if (rangeKey === 'month') return 'Aquest mes';
  return 'Tot el temps';
}

// Card 1 — Total del període. Mostra 0,00 € + 0 compres si no hi ha
// res al període (però sí al history global) — això és intencional
// per evidenciar que no s'ha comprat res últimament.
function _renderExpensesTotalCard(data) {
  const articles = data.count === 1 ? 'article' : 'articles';
  const compresAvg = data.basketCount === 1 ? 'compra' : 'compres';
  // Compra mitjana: només si hi ha alguna compra al període.
  const basketLine = data.basketCount > 0
    ? '<p class="stats-card-v2-sub">🧺 Compra mitjana: ' + fmtEur(data.avgBasket)
        + ' ' + data.basketCount + ' ' + compresAvg + '</p>'
    : '';
  return '<div class="stats-card-v2">'
    + '<h3 class="stats-card-v2-title">💰 <span>' + escapeHtml(_expensesRangeLabel(data.rangeKey)) + '</span></h3>'
    + '<p style="font-size:36px;font-weight:800;color:var(--primary);margin:8px 0 4px;">' + fmtEur(data.total) + '</p>'
    + '<p class="stats-card-v2-sub">en ' + data.count + ' ' + articles + '</p>'
    + basketLine
    + '</div>';
}

// Card — Pressupost mensual. Compara la despesa del MES NATURAL en curs
// (data.monthSpent) amb el límit fixat (data.monthlyBudget). Estats de
// color: ok (<80%), a prop (80–<100%), passat (≥100%). El botó obre el
// modal d'edició (delegat a _onExpensesClick).
function _renderExpensesBudgetCard(data) {
  const budget = data.monthlyBudget;
  if (!(budget > 0)) {
    return '<div class="stats-card-v2">'
      + '<h3 class="stats-card-v2-title">🎯 <span>Pressupost mensual</span></h3>'
      + '<div class="stats-chart-empty">Encara no has fixat cap pressupost</div>'
      + '<button type="button" class="primary-btn" id="expenses-budget-edit" style="margin-top:10px">🎯 Fixa un pressupost mensual</button>'
      + '</div>';
  }
  const spent = data.monthSpent;
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const ratio = spent / budget;
  const barClass = ratio >= 1 ? 'budget-bar-over' : (ratio >= 0.8 ? 'budget-bar-near' : 'budget-bar-ok');
  let statusLine;
  if (ratio >= 1) {
    statusLine = '<p class="stats-card-v2-sub" style="color:#C62828">⚠️ Has superat el pressupost en ' + fmtEur(spent - budget) + '</p>';
  } else {
    statusLine = '<p class="stats-card-v2-sub">Et queden ' + fmtEur(budget - spent) + '</p>';
  }
  return '<div class="stats-card-v2">'
    + '<h3 class="stats-card-v2-title">🎯 <span>Pressupost mensual</span></h3>'
    + '<p class="stats-card-v2-sub" style="font-size:15px">Gastat <strong>' + fmtEur(spent) + '</strong> de <strong>' + fmtEur(budget) + '</strong></p>'
    + '<div class="impact-card-progress-track" style="margin:8px 0"><div class="budget-bar ' + barClass + '" style="width:' + pct + '%"></div></div>'
    + statusLine
    + '<button type="button" class="secondary-btn" id="expenses-budget-edit" style="margin-top:10px">🎯 Edita pressupost</button>'
    + '</div>';
}

// Card 2 — Evolució 6 mesos. Independent del filtre del període; pot
// tenir dades encara que data.count === 0 (compres antigues).
function _renderExpensesMonthlyCard(data) {
  const maxEur = Math.max(0, ...data.byMonth.map(m => m.total));
  if (maxEur <= 0) {
    return '<div class="stats-card-v2">'
      + '<h3 class="stats-card-v2-title">📊 <span>Evolució 6 mesos</span></h3>'
      + '<div class="stats-chart-empty">Encara no hi ha prou dades</div>'
      + '</div>';
  }
  const bars = data.byMonth.map(m => {
    const h = m.total > 0 ? Math.max(4, Math.round((m.total / maxEur) * 100)) : 0;
    const tip = m.fullLabel + ': ' + fmtEur(m.total);
    return '<div class="stats-bar-col" title="' + escapeHtml(tip) + '">'
      + '<div class="stats-bar-track"><div class="stats-bar-fill" style="height:' + h + '%"></div></div>'
      + '<p class="stats-bar-label">' + m.label + '</p>'
      + '</div>';
  }).join('');
  return '<div class="stats-card-v2">'
    + '<h3 class="stats-card-v2-title">📊 <span>Evolució 6 mesos</span></h3>'
    + '<div class="stats-bar-chart">' + bars + '</div>'
    + '</div>';
}

// Card 3 — Per super. bySuper.length === 0 vol dir cap compra al
// període (perquè a renderExpenses ja hem garantit totalEntries > 0).
function _renderExpensesBySupCard(data) {
  if (data.bySuper.length === 0) {
    return '<div class="stats-card-v2">'
      + '<h3 class="stats-card-v2-title">🛒 <span>Per supermercat</span></h3>'
      + '<div class="stats-chart-empty">Cap compra al període seleccionat</div>'
      + '</div>';
  }
  const rows = data.bySuper.map(s =>
    '<div class="stats-zone-row">'
    + '<span class="stats-zone-emoji">🛒</span>'
    + '<span class="stats-zone-name">' + escapeHtml(s.name) + '</span>'
    + '<div class="stats-zone-bar"><div class="stats-zone-bar-fill" style="width:' + s.pct + '%"></div></div>'
    + '<span class="stats-zone-count">' + fmtEur(s.total) + ' (' + s.pct + '%)</span>'
    + '</div>'
  ).join('');
  return '<div class="stats-card-v2">'
    + '<h3 class="stats-card-v2-title">🛒 <span>Per supermercat</span></h3>'
    + '<div class="stats-zone-list">' + rows + '</div>'
    + '</div>';
}

// Card — Per categoria. Mateix patró que la card "Per supermercat":
// barres + percentatges, però amb icona + nom de la categoria.
function _renderExpensesByCategoryCard(data) {
  if (!data.byCategory || data.byCategory.length === 0) {
    return '<div class="stats-card-v2">'
      + '<h3 class="stats-card-v2-title">🏷️ <span>Per categoria</span></h3>'
      + '<div class="stats-chart-empty">Cap compra al període seleccionat</div>'
      + '</div>';
  }
  const rows = data.byCategory.map(c =>
    '<div class="stats-zone-row">'
    + '<span class="stats-zone-emoji">' + (c.icon || '📦') + '</span>'
    + '<span class="stats-zone-name">' + escapeHtml(c.name) + '</span>'
    + '<div class="stats-zone-bar"><div class="stats-zone-bar-fill" style="width:' + c.pct + '%"></div></div>'
    + '<span class="stats-zone-count">' + fmtEur(c.total) + ' (' + c.pct + '%)</span>'
    + '</div>'
  ).join('');
  return '<div class="stats-card-v2">'
    + '<h3 class="stats-card-v2-title">🏷️ <span>Per categoria</span></h3>'
    + '<div class="stats-zone-list">' + rows + '</div>'
    + '</div>';
}

// Card 4 — Top productes. Igual que la card 3: empty vol dir cap
// compra al període.
function _renderExpensesTopProductsCard(data) {
  if (data.byPopular.length === 0) {
    return '<div class="stats-card-v2">'
      + '<h3 class="stats-card-v2-title">🏆 <span>Top productes</span></h3>'
      + '<div class="stats-chart-empty">Cap compra al període seleccionat</div>'
      + '</div>';
  }
  const rows = data.byPopular.map(p => {
    const compres = p.count === 1 ? 'compra' : 'compres';
    return '<div class="stats-top-row">'
      + '<span class="stats-top-emoji">' + p.emoji + '</span>'
      + '<span class="stats-top-name">' + escapeHtml(p.name) + '</span>'
      + '<span class="stats-top-count">' + fmtEur(p.total) + ' ' + p.count + ' ' + compres + '</span>'
      + '</div>';
  }).join('');
  return '<div class="stats-card-v2">'
    + '<h3 class="stats-card-v2-title">🏆 <span>Top productes</span></h3>'
    + '<div class="stats-top-list">' + rows + '</div>'
    + '</div>';
}

// Formata la data d'una anada (string YYYY-MM-DD) de forma llegible.
// Reutilitza parseDateLocal (core.js) per evitar desfasos UTC; mateix
// toLocaleDateString('ca-ES') que la resta de l'app (patró biteme.js).
function _expensesFormatTripDate(dateStr) {
  const d = (typeof parseDateLocal === 'function') ? parseDateLocal(dateStr) : null;
  if (!d || !Number.isFinite(d.getTime())) return dateStr || '';
  try { return d.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' }); }
  catch (e) { return dateStr || ''; }
}

// Card — Compres recents (anades). Una fila per anada del període (data ·
// súper · N articles · total), editable (tap/✏️) i esborrable (🗑️). Si no
// hi ha cap anada al període, no es pinta la card. Les files porten data-*
// per identificar-les; el wiring va per delegació a _attachExpensesListeners.
function _renderExpensesTripsCard(data) {
  if (!data.trips || data.trips.length === 0) return '';
  const rows = data.trips.map(tr => {
    const dateLbl = _expensesFormatTripDate(tr.date);
    const supLbl = tr.supermarket || '(sense súper)';
    const items = tr.itemCount === 1 ? '1 article' : (tr.itemCount + ' articles');
    return '<div class="expenses-trip-row" '
      + 'data-trip-key="' + escapeHtml(tr.key) + '" '
      + 'data-record-ids="' + escapeHtml(tr.recordIds.join(',')) + '" '
      + 'data-basket-id="' + escapeHtml(tr.basketId || '') + '" '
      + 'data-total="' + tr.total.toFixed(2) + '">'
      + '<div class="expenses-trip-info">'
      + '<span class="expenses-trip-date">' + escapeHtml(dateLbl) + '</span>'
      + '<span class="expenses-trip-sup">🛒 ' + escapeHtml(supLbl) + '</span>'
      + '<span class="expenses-trip-meta">' + items + '</span>'
      + '</div>'
      + '<span class="expenses-trip-total">' + fmtEur(tr.total) + '</span>'
      + '<button type="button" class="expenses-trip-del" aria-label="' + escapeHtml(t('expensesTripDelete')) + '">🗑️</button>'
      + '</div>';
  }).join('');
  return '<div class="stats-card-v2">'
    + '<h3 class="stats-card-v2-title">🧾 <span>' + escapeHtml(t('expensesTripsTitle')) + '</span></h3>'
    + '<div class="expenses-trip-list">' + rows + '</div>'
    + '</div>';
}

// Editar el total d'una anada (Fase 3). Precarrega el total actual; si el
// valor és > 0 i diferent → reparteix amb el helper adequat (per basketId si
// en té, si no per recordIds). Cancel·lar/buit/≤0/igual → no toca res.
function _promptEditTrip(rowEl) {
  if (!rowEl) return;
  const basketId = rowEl.dataset.basketId || '';
  const recordIds = (rowEl.dataset.recordIds || '').split(',').filter(Boolean);
  const curTotal = Math.round((parseFloat(rowEl.dataset.total) || 0) * 100) / 100;
  const apply = (raw) => {
    const v = parseFloat(String(raw == null ? '' : raw).replace(',', '.'));
    if (!Number.isFinite(v) || !(v > 0)) return;
    const newTotal = Math.round(v * 100) / 100;
    if (newTotal === curTotal) return;
    let ok = false;
    if (basketId && typeof updateBasketTotal === 'function') {
      ok = updateBasketTotal(basketId, newTotal);
    } else if (typeof updateBasketByRecordIds === 'function') {
      ok = updateBasketByRecordIds(recordIds, newTotal);
    }
    if (ok) renderExpenses();
  };
  if (typeof showInputModal === 'function') {
    showInputModal('🧾', t('expensesTripEditTitle'), t('expensesTripEditMsg'), t('ticketTotalPlaceholder'),
      apply, { initialValue: curTotal > 0 ? String(curTotal) : '', confirmLabel: t('ticketTotalConfirm') });
  }
}

// Esborrar una anada (Fase 3). Confirmació abans; després treu tots els seus
// records del purchase_history i re-renderitza.
function _confirmDeleteTrip(rowEl) {
  if (!rowEl) return;
  const recordIds = (rowEl.dataset.recordIds || '').split(',').filter(Boolean);
  if (recordIds.length === 0) return;
  const doDelete = () => {
    if (typeof removeBasketByRecordIds === 'function') removeBasketByRecordIds(recordIds);
    renderExpenses();
  };
  if (typeof showConfirmDangerModal === 'function') {
    showConfirmDangerModal('🗑️', t('expensesTripDeleteTitle'), t('expensesTripDeleteMsg'), doDelete);
  } else {
    doDelete();
  }
}

// Obre el modal d'edició del pressupost mensual. Reusa showInputModal
// (numèric, precarregat). Buit/0 = sense pressupost. Desa + sync + re-render.
function _promptMonthlyBudget() {
  const current = Number(localStorage.getItem('eatmefirst_monthly_budget')) || 0;
  const apply = (raw) => {
    const v = parseFloat(String(raw == null ? '' : raw).replace(',', '.'));
    const budget = (Number.isFinite(v) && v > 0) ? Math.round(v * 100) / 100 : 0;
    if (budget > 0) localStorage.setItem('eatmefirst_monthly_budget', String(budget));
    else localStorage.removeItem('eatmefirst_monthly_budget');
    if (typeof pushToServer === 'function') pushToServer();
    renderExpenses();
  };
  if (typeof showInputModal === 'function') {
    showInputModal('🎯', 'Pressupost mensual', 'Límit de despesa per mes (en €). Deixa-ho buit per treure el pressupost.',
      'Ex: 300', apply, { initialValue: current > 0 ? String(current) : '', confirmLabel: 'Desar' });
  } else {
    const raw = window.prompt('Pressupost mensual (€):', current > 0 ? String(current) : '');
    if (raw !== null) apply(raw);
  }
}

// Listeners dels pills temporals + botó d'editar pressupost — IIFE idempotent.
(function _attachExpensesListeners() {
  if (typeof document === 'undefined') return;
  if (window.__expensesPillListeners) return;
  window.__expensesPillListeners = true;
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#expenses-period-pills .impact-period-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const period = btn.dataset.period;
        if (period) setExpensesPeriod(period);
      });
    });
  });
  // Delegació: el botó del pressupost i les files d'anades es repinten a
  // cada renderExpenses → un sol listener global, sense listeners per fila.
  document.addEventListener('click', (e) => {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest('#expenses-budget-edit')) {
      _promptMonthlyBudget();
      return;
    }
    const tripRow = e.target.closest('.expenses-trip-row');
    if (tripRow) {
      // 🗑️ dins la fila → esborrar; qualsevol altre punt → editar.
      if (e.target.closest('.expenses-trip-del')) _confirmDeleteTrip(tripRow);
      else _promptEditTrip(tripRow);
    }
  });
})();
