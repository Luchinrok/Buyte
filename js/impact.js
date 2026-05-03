/* ============================================
   Buyte — js/impact.js
   Pantalla "El meu impacte": agrega les dades de
   l'historial de consum (eatmefirst_consumption_history)
   per mostrar diners aprofitats vs llençats, CO₂ evitat,
   ratxa, gràfic mensual i top de productes llençats.

   Càlculs:
   - Per cada entrada, fem servir getProductPrice/getProductCO2
     amb el preu/qty/pes guardats en el moment del consum.
   - El "% de l'entrada" multiplica el preu/CO2 total del producte.
   - Aprofitat = sumatori de consumed × percent
   - Llençat = sumatori de trashed × percent
   - CO₂ evitat només compta el consumed (el llençat ja s'ha emès).
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

function filterByRange(entries, range) {
  return entries.filter(e => {
    const d = new Date(e.date);
    return d >= range.start && d <= range.end;
  });
}

// Reconstrueix el "producte" a partir de l'entrada de l'historial
// per poder cridar getProductPrice / getProductCO2.
function entryAsProduct(e) {
  return {
    name: e.productName,
    emoji: e.productEmoji,
    price: (typeof e.price === 'number' && e.price >= 0) ? e.price : undefined,
    qty: e.qty,
    weight: e.weight
  };
}

function entryFactor(e) {
  return Math.max(0, Math.min(100, e.percent || 0)) / 100;
}

function computeMetrics(entries) {
  let savedEur = 0, wastedEur = 0;
  let savedCo2 = 0, wastedCo2 = 0;
  let consumedCount = 0, wastedCount = 0;

  entries.forEach(e => {
    const product = entryAsProduct(e);
    const totalPrice = (typeof getProductPrice === 'function') ? getProductPrice(product) : 0;
    const totalCo2 = (typeof getProductCO2 === 'function') ? getProductCO2(product) : 0;
    const factor = entryFactor(e);

    if (e.action === 'consumed') {
      savedEur += totalPrice * factor;
      savedCo2 += totalCo2 * factor;
      consumedCount++;
    } else if (e.action === 'trashed') {
      wastedEur += totalPrice * factor;
      wastedCo2 += totalCo2 * factor;
      wastedCount++;
    }
  });

  const totalEur = savedEur + wastedEur;
  const utilization = totalEur > 0 ? Math.round((savedEur / totalEur) * 100) : 100;
  return { savedEur, wastedEur, savedCo2, wastedCo2, utilization, consumedCount, wastedCount, totalEur };
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
    const product = entryAsProduct(e);
    const total = (typeof getProductPrice === 'function') ? getProductPrice(product) : 0;
    map[key].count += 1;
    map[key].eurLost += total * entryFactor(e);
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
    const product = entryAsProduct(e);
    const total = (typeof getProductPrice === 'function') ? getProductPrice(product) : 0;
    const eur = total * entryFactor(e);
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
  if (!isFinite(n) || n === 0) return '0,00 €';
  // Format català: 1.234,56 €
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return withThousands + ',' + decPart + ' €';
}

function fmtCo2(n) {
  if (!isFinite(n) || n === 0) return '0,0 kg';
  if (n < 10) return n.toFixed(1).replace('.', ',') + ' kg';
  return Math.round(n) + ' kg';
}

function fmtKm(n) {
  if (!isFinite(n) || n <= 0) return '0';
  if (n < 10) return n.toFixed(1).replace('.', ',');
  return String(Math.round(n));
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

function moneyTitleFor(period) {
  if (period === 'week') return t('foodMoneyWeek');
  if (period === 'all') return t('foodMoneyAll');
  return t('foodMoneyMonth');
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

  // Card 1 — Diners
  const moneyTitleEl = document.getElementById('impact-money-title');
  if (moneyTitleEl) moneyTitleEl.textContent = moneyTitleFor(impactPeriod);

  document.getElementById('impact-saved-num').textContent = fmtEur(m.savedEur);
  document.getElementById('impact-wasted-num').textContent = fmtEur(m.wastedEur);

  const savedBar = document.getElementById('impact-saved-bar');
  const wastedBar = document.getElementById('impact-wasted-bar');
  if (m.totalEur > 0) {
    if (savedBar) savedBar.style.width = (m.savedEur / m.totalEur * 100).toFixed(1) + '%';
    if (wastedBar) wastedBar.style.width = (m.wastedEur / m.totalEur * 100).toFixed(1) + '%';
  } else {
    if (savedBar) savedBar.style.width = '0%';
    if (wastedBar) wastedBar.style.width = '0%';
  }
  document.getElementById('impact-util-line').textContent = t('totalUtilization') + ': ' + m.utilization + '%';

  // Card 2 — CO2 evitat (consumed) + malgastat (trashed)
  const co2SavedEl = document.getElementById('impact-co2-saved');
  if (co2SavedEl) co2SavedEl.textContent = fmtCo2(m.savedCo2);
  const co2WastedEl = document.getElementById('impact-co2-wasted');
  if (co2WastedEl) co2WastedEl.textContent = fmtCo2(m.wastedCo2);
  const co2TotalKm = (m.savedCo2 + m.wastedCo2) * KM_PER_KG_CO2;
  document.getElementById('impact-co2-equiv').textContent = '≈ ' + fmtKm(co2TotalKm) + ' ' + t('kmInCar');

  // Card 3 — Ratxa (sempre sobre tot l'historial)
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
    const tip = m.fullLabel + ': ' + fmtEur(m.savedEur) + ' aprofitat, ' + fmtEur(m.wastedEur) + ' llençat';
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

// Modal d'explicació de càlculs (clic ⓘ).
// Renderitza les seccions estructurades de i18n (infoCalcMoneySections /
// infoCalcCo2Sections). Cau cap a les explicacions textuals si no n'hi ha.
function showImpactInfoModal(kind) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay info-modal';

  const sectionsKey = (kind === 'co2') ? 'infoCalcCo2Sections' : 'infoCalcMoneySections';
  const sections = t(sectionsKey);
  let bodyHtml;
  if (Array.isArray(sections) && sections.length > 0) {
    bodyHtml = sections.map(s => {
      const bullets = Array.isArray(s.bullets) && s.bullets.length > 0
        ? '<ul class="info-bullets">' + s.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('') + '</ul>'
        : '';
      const intro = s.intro ? `<p class="info-section-intro">${escapeHtml(s.intro)}</p>` : '';
      const example = s.example
        ? `<div class="info-example">${escapeHtml(s.example).replace(/\n/g, '<br>')}</div>`
        : '';
      return `
        <section class="info-section">
          <header class="info-section-head">
            <span class="info-section-emoji">${s.emoji}</span>
            <h3 class="info-section-title">${escapeHtml(s.title)}</h3>
          </header>
          ${intro}
          ${bullets}
          ${example}
        </section>
      `;
    }).join('');
  } else {
    const text = (kind === 'co2') ? t('calcExplanationCO2') : t('calcExplanationMoney');
    bodyHtml = `<p class="info-modal-body">${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
  }

  overlay.innerHTML = `
    <div class="modal-content info-modal-content">
      <div class="info-modal-header">
        <span class="info-modal-icon">💡</span>
        <h2 class="info-modal-heading">${escapeHtml(t('howCalculated'))}</h2>
      </div>
      <div class="info-modal-sections">
        ${bodyHtml}
      </div>
      <div class="modal-buttons" style="margin-top:14px">
        <button class="modal-confirm" id="info-modal-close">${escapeHtml(t('close'))}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#info-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// Resum curt per la card de configuració.
function updateImpactSub() {
  const el = document.getElementById('impact-sub');
  if (!el) return;
  const history = loadConsumptionHistory();
  if (history.length === 0) {
    el.textContent = t('impactEmpty');
    return;
  }
  const m = computeMetrics(history);
  el.textContent = fmtEur(m.savedEur) + ' · ' + fmtCo2(m.savedCo2);
}
