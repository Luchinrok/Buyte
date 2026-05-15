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

  // Filtre temporal per a Card 1, 3, 4. Card 2 (chart 6 mesos)
  // sempre usa allEntries.
  const now = new Date();
  let cutoff = null;
  if (rangeKey === 'week') {
    cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7);
  } else if (rangeKey === 'month') {
    cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
  }
  const filtered = cutoff
    ? allEntries.filter(e => {
        const t = new Date(e.date).getTime();
        return Number.isFinite(t) && t >= cutoff.getTime();
      })
    : allEntries;

  // total i count del PERÍODE. count compta totes les compres del
  // període; total només suma les que tenen price numèric.
  const total = filtered.reduce((s, e) =>
    s + (typeof e.price === 'number' ? e.price : 0), 0);
  const count = filtered.length;

  // Per super (al període)
  const bySuperMap = {};
  filtered.forEach(e => {
    const key = e.supermarket || '(sense super)';
    if (!bySuperMap[key]) bySuperMap[key] = { name: key, total: 0, count: 0 };
    bySuperMap[key].total += (typeof e.price === 'number' ? e.price : 0);
    bySuperMap[key].count += 1;
  });
  const bySuper = Object.values(bySuperMap).sort((a, b) => b.total - a.total);
  const bySuperTotal = bySuper.reduce((s, x) => s + x.total, 0);
  bySuper.forEach(x => { x.pct = bySuperTotal > 0 ? Math.round((x.total / bySuperTotal) * 100) : 0; });

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
    byPopularMap[key].total += (typeof e.price === 'number' ? e.price : 0);
    byPopularMap[key].count += 1;
  });
  const byPopular = Object.values(byPopularMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

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
    if (idx >= 0) byMonth[idx].total += (typeof e.price === 'number' ? e.price : 0);
  });

  return {
    rangeKey,
    total,
    count,
    totalEntries: allEntries.length, // history global, independent del filtre
    bySuper,
    byPopular,
    byMonth
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
    _renderExpensesMonthlyCard(data),
    _renderExpensesBySupCard(data),
    _renderExpensesTopProductsCard(data)
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
  const compres = data.count === 1 ? 'compra' : 'compres';
  return '<div class="stats-card-v2">'
    + '<h3 class="stats-card-v2-title">💰 <span>' + escapeHtml(_expensesRangeLabel(data.rangeKey)) + '</span></h3>'
    + '<p style="font-size:36px;font-weight:800;color:var(--primary);margin:8px 0 4px;">' + fmtEur(data.total) + '</p>'
    + '<p class="stats-card-v2-sub">en ' + data.count + ' ' + compres + '</p>'
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
      + '<span class="stats-top-count">' + fmtEur(p.total) + ' · ' + p.count + ' ' + compres + '</span>'
      + '</div>';
  }).join('');
  return '<div class="stats-card-v2">'
    + '<h3 class="stats-card-v2-title">🏆 <span>Top productes</span></h3>'
    + '<div class="stats-top-list">' + rows + '</div>'
    + '</div>';
}

// Listeners dels pills temporals — IIFE idempotent.
(function _attachExpensesPillListeners() {
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
})();
