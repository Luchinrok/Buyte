/* ============================================
   Buyte — js/impact.js
   Pantalla "El meu impacte": agrega les dades de
   l'historial de consum (eatmefirst_consumption_history)
   per mostrar diners estalviats, CO₂ evitat, taxa
   d'aprofitament, ratxa, gràfic mensual i top de
   productes llençats.
   ============================================ */


let impactPeriod = 'month';

const STREAK_KEY = 'eatmefirst_streak_record';
const KM_PER_KG_CO2 = 5; // 1 kg CO₂ ≈ 5 km en cotxe mitjà


function loadConsumptionHistory() {
  try {
    const raw = localStorage.getItem('eatmefirst_consumption_history');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}

function loadStreakRecord() {
  const v = parseInt(localStorage.getItem(STREAK_KEY), 10);
  return isNaN(v) ? 0 : v;
}

function saveStreakRecord(v) {
  localStorage.setItem(STREAK_KEY, String(v));
}

function periodRange(period) {
  const now = new Date();
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }
  return { start: new Date(0), end: now };
}

function previousPeriodRange(period) {
  const now = new Date();
  if (period === 'week') {
    const end = new Date(now); end.setDate(now.getDate() - 7); end.setHours(23, 59, 59, 999);
    const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start, end };
  }
  return null;
}

function filterByRange(entries, range) {
  return entries.filter(e => {
    const d = new Date(e.date);
    return d >= range.start && d <= range.end;
  });
}

// Resol preu: prioritza el preu guardat a l'entrada, si no usa la mitjana
// per categoria d'emoji (getDefaultPrice de js/product-data.js).
function resolvePrice(entry) {
  if (typeof entry.price === 'number' && entry.price >= 0) return entry.price;
  if (typeof getDefaultPrice === 'function') return getDefaultPrice(entry.productEmoji);
  return 2;
}

function resolveCO2(entry) {
  if (typeof getCO2 === 'function') return getCO2(entry.productEmoji);
  return 2;
}

function computeMetrics(entries) {
  let savedEur = 0, wastedEur = 0, savedCo2 = 0, wastedCo2 = 0;
  let consumedCount = 0, wastedCount = 0;
  entries.forEach(e => {
    const price = resolvePrice(e);
    const co2 = resolveCO2(e);
    const factor = Math.max(0, Math.min(100, e.percent || 0)) / 100;
    if (e.action === 'consumed') {
      savedEur += price * factor;
      savedCo2 += co2 * factor;
      consumedCount++;
    } else if (e.action === 'trashed') {
      wastedEur += price * factor;
      wastedCo2 += co2 * factor;
      wastedCount++;
    }
  });
  const totalEur = savedEur + wastedEur;
  const utilization = totalEur > 0 ? Math.round((savedEur / totalEur) * 100) : 100;
  return { savedEur, wastedEur, savedCo2, wastedCo2, utilization, consumedCount, wastedCount };
}

// Dies des de l'últim 'trashed' amb percent >= 5. Si no n'hi ha cap,
// retorna els dies des del primer registre (l'usuari mai ha llençat res).
function computeStreak(history) {
  const trashes = history
    .filter(e => e.action === 'trashed' && (e.percent || 0) >= 5)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (trashes.length === 0) {
    if (history.length === 0) return 0;
    let first = null;
    history.forEach(e => {
      const d = new Date(e.date);
      if (!first || d < first) first = d;
    });
    if (!first) return 0;
    return Math.floor((Date.now() - first.getTime()) / 86400000);
  }
  const last = new Date(trashes[0].date);
  return Math.floor((Date.now() - last.getTime()) / 86400000);
}

function topWasted(history, limit) {
  const map = {};
  history.forEach(e => {
    if (e.action !== 'trashed') return;
    const key = (e.productName || '').toLowerCase().trim();
    if (!key) return;
    if (!map[key]) {
      map[key] = { name: e.productName, emoji: e.productEmoji || '🥫', count: 0, eurLost: 0 };
    }
    map[key].count += 1;
    map[key].eurLost += resolvePrice(e) * (e.percent || 0) / 100;
  });
  return Object.values(map)
    .sort((a, b) => b.count - a.count || b.eurLost - a.eurLost)
    .slice(0, limit);
}

function getMonthShort(idx) {
  const labels = ['G', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return labels[idx] || '?';
}

function getMonthFull(idx) {
  const names = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
                 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
  return names[idx] || '';
}

function monthlyChartData(history) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), savedEur: 0, wastedEur: 0 });
  }
  history.forEach(e => {
    const d = new Date(e.date);
    const found = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (!found) return;
    const eur = resolvePrice(e) * (e.percent || 0) / 100;
    if (e.action === 'consumed') found.savedEur += eur;
    else if (e.action === 'trashed') found.wastedEur += eur;
  });
  return months.map(m => ({
    label: getMonthShort(m.month),
    fullLabel: getMonthFull(m.month) + ' ' + m.year,
    savedEur: m.savedEur,
    wastedEur: m.wastedEur
  }));
}

function fmtEur(n) {
  if (!n || n === 0) return '0 €';
  if (n < 1) return n.toFixed(2) + ' €';
  if (n < 10) return n.toFixed(1).replace(/\.0$/, '') + ' €';
  return Math.round(n) + ' €';
}

function fmtCo2(n) {
  if (!n || n === 0) return '0 kg';
  if (n < 1) return n.toFixed(2) + ' kg';
  if (n < 10) return n.toFixed(1).replace(/\.0$/, '') + ' kg';
  return Math.round(n) + ' kg';
}


function openImpact() {
  impactPeriod = 'month';
  document.querySelectorAll('#impact-period-pills .impact-period-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.period === impactPeriod);
  });
  renderImpact();
  showScreen('impact');
}

function setImpactPeriod(period) {
  impactPeriod = period;
  document.querySelectorAll('#impact-period-pills .impact-period-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.period === period);
  });
  renderImpact();
}

function renderImpact() {
  const history = loadConsumptionHistory();
  const empty = document.getElementById('impact-empty');
  const body = document.getElementById('impact-body');

  if (history.length === 0) {
    if (empty) empty.style.display = 'block';
    if (body) body.style.display = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (body) body.style.display = 'block';

  const range = periodRange(impactPeriod);
  const periodEntries = filterByRange(history, range);
  const m = computeMetrics(periodEntries);

  // Card: estalvi en €
  document.getElementById('impact-saved-num').textContent = fmtEur(m.savedEur);
  const savedComp = document.getElementById('impact-saved-comparison');
  const prevRange = previousPeriodRange(impactPeriod);
  if (prevRange) {
    const prev = computeMetrics(filterByRange(history, prevRange));
    if (prev.savedEur > 0) {
      const pct = Math.round(((m.savedEur - prev.savedEur) / prev.savedEur) * 100);
      if (pct !== 0) {
        const cls = pct > 0 ? 'positive' : 'negative';
        const arrow = pct > 0 ? '↑' : '↓';
        const txt = pct > 0 ? t('moreThanLast') : t('lessThanLast');
        savedComp.innerHTML = `<span class="${cls}">${arrow} ${Math.abs(pct)}%</span> ${escapeHtml(txt)}`;
        savedComp.style.display = 'block';
      } else {
        savedComp.style.display = 'none';
      }
    } else {
      savedComp.style.display = 'none';
    }
  } else {
    savedComp.style.display = 'none';
  }

  // Card: CO₂
  document.getElementById('impact-co2-num').textContent = fmtCo2(m.savedCo2);
  document.getElementById('impact-co2-equiv').textContent = '≈ ' + Math.round(m.savedCo2 * KM_PER_KG_CO2) + ' ' + t('kmInCar');

  // Card: aprofitament %
  document.getElementById('impact-util-num').textContent = m.utilization + '%';
  const bar = document.getElementById('impact-util-bar');
  if (bar) bar.style.width = m.utilization + '%';
  document.getElementById('impact-util-wasted').textContent = t('wastedOnly') + ' ' + fmtEur(m.wastedEur);

  // Card: ratxa (sempre sobre tot l'historial)
  const streak = computeStreak(history);
  let record = loadStreakRecord();
  if (streak > record) { record = streak; saveStreakRecord(record); }
  document.getElementById('impact-streak-num').textContent = streak;
  document.getElementById('impact-streak-record').textContent = t('streakRecord') + ': ' + record + ' ' + t('days');

  renderMonthlyChart(history);
  renderTopWasted(history);
}

function renderMonthlyChart(history) {
  const container = document.getElementById('impact-chart');
  if (!container) return;
  const data = monthlyChartData(history);

  // Si no hi ha dades a cap mes, amaguem el contingut
  let firstActiveIdx = data.findIndex(m => m.savedEur > 0 || m.wastedEur > 0);
  if (firstActiveIdx === -1) {
    container.innerHTML = '';
    return;
  }
  const visible = data.slice(firstActiveIdx);
  const maxEur = Math.max(1, ...visible.flatMap(m => [m.savedEur, m.wastedEur]));

  container.innerHTML = '';
  visible.forEach(m => {
    const col = document.createElement('div');
    col.className = 'impact-chart-col';
    const savedH = Math.max(2, Math.round((m.savedEur / maxEur) * 100));
    const wastedH = Math.max(2, Math.round((m.wastedEur / maxEur) * 100));
    const tip = m.fullLabel + ': ' + fmtEur(m.savedEur) + ' consumit, ' + fmtEur(m.wastedEur) + ' llençat';
    col.innerHTML = `
      <div class="impact-chart-bars" title="${escapeHtml(tip)}">
        <div class="impact-bar impact-bar-saved" style="height:${m.savedEur > 0 ? savedH : 0}%"></div>
        <div class="impact-bar impact-bar-wasted" style="height:${m.wastedEur > 0 ? wastedH : 0}%"></div>
      </div>
      <p class="impact-chart-label">${m.label}</p>
    `;
    col.addEventListener('click', () => showToast(tip));
    container.appendChild(col);
  });
}

function renderTopWasted(history) {
  const section = document.getElementById('impact-top-wasted-section');
  const list = document.getElementById('impact-top-wasted-list');
  if (!section || !list) return;
  const top = topWasted(history, 3);
  if (top.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  list.innerHTML = '';
  top.forEach(p => {
    const row = document.createElement('div');
    row.className = 'impact-wasted-row';
    row.innerHTML = `
      <span class="impact-wasted-emoji">${p.emoji}</span>
      <span class="impact-wasted-name">${escapeHtml(p.name)}</span>
      <span class="impact-wasted-stats">${p.count} ${escapeHtml(t('wastedTimes'))} (${fmtEur(p.eurLost)})</span>
    `;
    list.appendChild(row);
  });
}

// Resum curt per la card de configuració.
function updateImpactSub() {
  const el = document.getElementById('impact-sub');
  if (!el) return;
  const history = loadConsumptionHistory();
  if (history.length === 0) {
    el.textContent = '-';
    return;
  }
  const m = computeMetrics(history);
  el.textContent = fmtEur(m.savedEur) + ' · ' + fmtCo2(m.savedCo2);
}
