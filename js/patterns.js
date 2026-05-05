/* ============================================
   Buyte — js/patterns.js
   "L'app que pensa": analitza l'historial de consum,
   els items del BuyMe i l'activitat per suggerir
   ajustaments a l'usuari. Cap dada surt del dispositiu;
   tota l'anàlisi és estadística local.

   Storage:
     eatmefirst_consumption_history  → font (existent)
     eatmefirst_shopping_items       → font (existent)
     eatmefirst_install_date         → font (existent, gamificació)
     eatmefirst_app_activity         → nou (timestamps d'obertures)
     eatmefirst_pattern_dismissed    → nou ({id: 'YYYY-MM-DD'})
     eatmefirst_pattern_applied      → nou ({id: 'YYYY-MM-DD'})

   API pública:
     analyzePatterns()           → array de suggeriments ordenats
     getPatternReadiness()       → {ready, days, entries, ...}
     getHighPrioritySuggestions()→ subset HIGH (banners/push)
     dismissPattern(id)
     applyPattern(id)
     resetPatternData()
   ============================================ */

const PATTERN_MIN_DAYS = 14;
const PATTERN_MIN_HISTORY = 20;
const PATTERN_DISMISS_TTL_DAYS = 30;

const PATTERN_PRIORITY_ORDER = { high: 0, medium: 1, low: 2, info: 3 };

// ---------- Storage helpers ----------

function _readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (e) { return fallback; }
}

function _writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

function loadPatternDismissed() {
  const map = _readJSON('eatmefirst_pattern_dismissed', {});
  return (map && typeof map === 'object' && !Array.isArray(map)) ? map : {};
}

function savePatternDismissed(map) {
  _writeJSON('eatmefirst_pattern_dismissed', map || {});
}

function loadPatternApplied() {
  const map = _readJSON('eatmefirst_pattern_applied', {});
  return (map && typeof map === 'object' && !Array.isArray(map)) ? map : {};
}

function savePatternApplied(map) {
  _writeJSON('eatmefirst_pattern_applied', map || {});
}

function _todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function dismissPattern(id) {
  if (!id) return;
  const map = loadPatternDismissed();
  map[id] = _todayKey();
  savePatternDismissed(map);
}

// Suggeriments descartats reapareixen passats PATTERN_DISMISS_TTL_DAYS dies
// si la condició continua. Mentrestant queden ocults.
function isPatternDismissed(id) {
  if (!id) return false;
  const map = loadPatternDismissed();
  const stamp = map[id];
  if (!stamp) return false;
  const dismissedAt = new Date(stamp + 'T00:00:00');
  if (isNaN(dismissedAt.getTime())) return false;
  const diffDays = Math.floor((Date.now() - dismissedAt.getTime()) / 86400000);
  if (diffDays >= PATTERN_DISMISS_TTL_DAYS) {
    delete map[id];
    savePatternDismissed(map);
    return false;
  }
  return true;
}

function applyPattern(id) {
  if (!id) return;
  const map = loadPatternApplied();
  map[id] = _todayKey();
  savePatternApplied(map);
}

function isPatternApplied(id) {
  if (!id) return false;
  const map = loadPatternApplied();
  return !!map[id];
}

function resetPatternData() {
  try {
    localStorage.removeItem('eatmefirst_app_activity');
    localStorage.removeItem('eatmefirst_pattern_dismissed');
    localStorage.removeItem('eatmefirst_pattern_applied');
  } catch (e) {}
}

// ---------- Activity tracking ----------
// Registre minimalista d'obertures de l'app per detectar l'hora i el dia
// preferits de l'usuari. Cada entrada: { timestamp, dayOfWeek, hour }.
// Política: ignorem entrades a menys de 5 minuts de l'última (per no inflar
// el comptador quan l'usuari canvia de pestanya). Auto-purge a 90 dies.
const APP_ACTIVITY_MIN_GAP_MS = 5 * 60 * 1000;
const APP_ACTIVITY_MAX_AGE_DAYS = 90;

function _loadAppActivity() {
  const list = _readJSON('eatmefirst_app_activity', []);
  return Array.isArray(list) ? list : [];
}

function _saveAppActivity(list) {
  _writeJSON('eatmefirst_app_activity', list);
}

function purgeOldActivity() {
  const list = _loadAppActivity();
  const cutoff = Date.now() - APP_ACTIVITY_MAX_AGE_DAYS * 86400000;
  const filtered = list.filter(a => a && typeof a.timestamp === 'number' && a.timestamp >= cutoff);
  if (filtered.length !== list.length) _saveAppActivity(filtered);
  return filtered;
}

function recordAppActivity() {
  try {
    const list = purgeOldActivity();
    const now = Date.now();
    const last = list.length ? list[list.length - 1] : null;
    if (last && typeof last.timestamp === 'number' && (now - last.timestamp) < APP_ACTIVITY_MIN_GAP_MS) return;
    const d = new Date(now);
    list.push({ timestamp: now, dayOfWeek: d.getDay(), hour: d.getHours() });
    _saveAppActivity(list);
  } catch (e) {}
}

function getActiveHours() {
  const list = purgeOldActivity();
  const out = new Array(24).fill(0);
  list.forEach(a => {
    if (!a) return;
    const h = (typeof a.hour === 'number') ? a.hour : new Date(a.timestamp || 0).getHours();
    if (isFinite(h) && h >= 0 && h <= 23) out[h]++;
  });
  return out;
}

function getActiveDays() {
  const list = purgeOldActivity();
  const out = new Array(7).fill(0);
  list.forEach(a => {
    if (!a) return;
    const d = (typeof a.dayOfWeek === 'number') ? a.dayOfWeek : new Date(a.timestamp || 0).getDay();
    if (isFinite(d) && d >= 0 && d <= 6) out[d]++;
  });
  return out;
}

function getMostActiveHour() {
  const counts = getActiveHours();
  const total = counts.reduce((a, b) => a + b, 0);
  if (total < 5) return null;
  let best = 0, bestCount = -1;
  for (let i = 0; i < 24; i++) {
    if (counts[i] > bestCount) { bestCount = counts[i]; best = i; }
  }
  return best;
}

// ---------- Readiness ----------

function _loadConsumptionHistorySafe() {
  if (typeof loadConsumptionHistory === 'function') {
    try { return loadConsumptionHistory(); } catch (e) {}
  }
  return _readJSON('eatmefirst_consumption_history', []);
}

function _loadShoppingItemsSafe() {
  if (typeof shoppingItems !== 'undefined' && Array.isArray(shoppingItems)) return shoppingItems;
  return _readJSON('eatmefirst_shopping_items', []);
}

function _loadInstallDate() {
  const raw = localStorage.getItem('eatmefirst_install_date');
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function getPatternReadiness() {
  const history = _loadConsumptionHistorySafe();
  const entries = Array.isArray(history) ? history.length : 0;
  const install = _loadInstallDate();
  let days = 0;
  if (install) {
    days = Math.max(0, Math.floor((Date.now() - install.getTime()) / 86400000));
  }
  return {
    days,
    daysRequired: PATTERN_MIN_DAYS,
    entries,
    entriesRequired: PATTERN_MIN_HISTORY,
    ready: days >= PATTERN_MIN_DAYS && entries >= PATTERN_MIN_HISTORY
  };
}

// ---------- Suggestion factory ----------

function _makeSuggestion(opts) {
  return {
    id: opts.id,
    type: opts.type,
    priority: opts.priority || 'low',
    title: opts.title || '',
    description: opts.description || '',
    emoji: opts.emoji || '🧠',
    action: opts.action || null,
    canDismiss: opts.canDismiss !== false,
    showAsBanner: !!opts.showAsBanner,
    showAsPush: !!opts.showAsPush
  };
}

// ---------- Detectors ----------
// Cada funció retorna 0 o més suggeriments.
// Els 4 restants (weekly/category/activeHours/favoriteRecipes) són FASE 4.

// 1. PRODUCTES QUE SEMPRE LLENCES
// ≥3 entrades 'trashed' significatives (≥5%) del mateix producte en 60 dies.
function analyzeFrequentlyTrashed(history) {
  const cutoff = Date.now() - 60 * 86400000;
  const trashes = {};
  history.forEach(e => {
    if (e.action !== 'trashed') return;
    if (!e.percent || e.percent < 5) return;
    const d = new Date(e.date).getTime();
    if (!isFinite(d) || d < cutoff) return;
    const key = (e.productName || '').toLowerCase().trim();
    if (!key) return;
    if (!trashes[key]) {
      trashes[key] = { name: e.productName, emoji: e.productEmoji || '🥫', count: 0 };
    }
    trashes[key].count += 1;
  });

  const out = [];
  Object.values(trashes).forEach(rec => {
    if (rec.count < 3) return;
    const id = 'pattern-frequentlyTrashed-' + rec.name.toLowerCase().trim().replace(/\s+/g, '-');
    out.push(_makeSuggestion({
      id,
      type: 'frequentlyTrashed',
      priority: 'high',
      title: rec.emoji + ' ' + rec.name,
      description: 'Has llençat ' + rec.name.toLowerCase() + ' ' + rec.count + ' cops aquest mes. '
        + (rec.count >= 5
            ? "Suggerim comprar-ne menys o avisar-te abans que caduqui."
            : "Compra'n menys o adapta la quantitat."),
      emoji: rec.emoji,
      showAsBanner: true,
      action: {
        label: 'Activa avís 4 dies abans',
        handler: 'patternEnableEarlyAlert',
        payload: { productName: rec.name }
      }
    }));
  });
  return out;
}

// 2. PRODUCTES QUE CADUQUEN A L'ÚLTIM DIA
// 70%+ del consum del mateix producte té daysFromExpiry ∈ {0, 1}, mín 4 mostres.
function analyzeLastMinuteConsume(history) {
  const buckets = {};
  history.forEach(e => {
    if (e.action !== 'consumed') return;
    if (e.daysFromExpiry === null || e.daysFromExpiry === undefined) return;
    const key = (e.productName || '').toLowerCase().trim();
    if (!key) return;
    if (!buckets[key]) {
      buckets[key] = { name: e.productName, emoji: e.productEmoji || '🥫', total: 0, lastMinute: 0 };
    }
    buckets[key].total += 1;
    if (e.daysFromExpiry <= 1) buckets[key].lastMinute += 1;
  });

  const out = [];
  Object.values(buckets).forEach(rec => {
    if (rec.total < 4) return;
    const ratio = rec.lastMinute / rec.total;
    if (ratio < 0.7) return;
    const id = 'pattern-lastMinuteConsume-' + rec.name.toLowerCase().trim().replace(/\s+/g, '-');
    out.push(_makeSuggestion({
      id,
      type: 'lastMinuteConsume',
      priority: 'high',
      title: rec.emoji + ' ' + rec.name,
      description: "Sempre menges " + rec.name.toLowerCase() + " l'últim dia. Vols comprar-ne quantitats més petites?",
      emoji: rec.emoji,
      action: {
        label: 'Editar producte popular',
        handler: 'patternOpenPopularEditor',
        payload: { productName: rec.name }
      }
    }));
  });
  return out;
}

// 7. TENDÈNCIA D'ESTALVI
// Compara % aprofitament aquesta setmana vs l'anterior. Llindar ±10%.
function analyzeSavingsTrend(history) {
  const now = Date.now();
  const day = 86400000;
  const thisWeekStart = now - 7 * day;
  const lastWeekStart = now - 14 * day;
  const lastWeekEnd = thisWeekStart;

  let thisSaved = 0, thisWasted = 0;
  let lastSaved = 0, lastWasted = 0;
  history.forEach(e => {
    const d = new Date(e.date).getTime();
    if (!isFinite(d)) return;
    const f = Math.max(0, Math.min(100, e.percent || 0)) / 100;
    if (f === 0) return;
    if (d >= thisWeekStart && d <= now) {
      if (e.action === 'consumed') thisSaved += f;
      else if (e.action === 'trashed') thisWasted += f;
    } else if (d >= lastWeekStart && d < lastWeekEnd) {
      if (e.action === 'consumed') lastSaved += f;
      else if (e.action === 'trashed') lastWasted += f;
    }
  });

  const thisTotal = thisSaved + thisWasted;
  const lastTotal = lastSaved + lastWasted;
  // Necessitem prou dades a totes dues setmanes per comparar.
  if (thisTotal < 1 || lastTotal < 1) return [];

  const thisPct = (thisSaved / thisTotal) * 100;
  const lastPct = (lastSaved / lastTotal) * 100;
  const diff = Math.round(thisPct - lastPct);

  if (diff >= 10) {
    return [_makeSuggestion({
      id: 'pattern-savingsTrend-up',
      type: 'savingsTrend',
      priority: 'info',
      title: 'Has millorat un ' + diff + '%!',
      description: 'Aquesta setmana has aprofitat un ' + diff + '% més de menjar que la setmana passada. Bona feina! 🎉',
      emoji: '🎉',
      action: null
    })];
  }
  if (diff <= -10) {
    const drop = Math.abs(diff);
    return [_makeSuggestion({
      id: 'pattern-savingsTrend-down',
      type: 'savingsTrend',
      priority: 'high',
      title: 'Estem llençant un ' + drop + '% més',
      description: "Aquesta setmana has llençat un " + drop + "% més que la setmana passada. Què ha passat? Revisa què tens a punt de caducar.",
      emoji: '⚠️',
      showAsBanner: true,
      action: null
    })];
  }
  return [];
}

// 8. PRODUCTES OBLIDATS
// Items al BuyMe amb addedAt > 14 dies (i no comprats encara).
function analyzeForgottenItems(shopping) {
  const cutoff = Date.now() - 14 * 86400000;
  const out = [];
  shopping.forEach(item => {
    if (!item || !item.addedAt) return;
    if (item.addedAt > cutoff) return;
    const days = Math.floor((Date.now() - item.addedAt) / 86400000);
    const id = 'pattern-forgottenItems-' + item.id;
    out.push(_makeSuggestion({
      id,
      type: 'forgottenItems',
      priority: 'medium',
      title: (item.emoji || '🛒') + ' ' + (item.name || 'Item'),
      description: "Tens " + (item.name || 'aquest item').toLowerCase() + " al BuyMe des de fa " + days + " dies sense comprar-lo. Vols treure'l?",
      emoji: item.emoji || '🛒',
      action: {
        label: 'Esborrar del BuyMe',
        handler: 'patternRemoveShoppingItem',
        payload: { itemId: item.id }
      }
    }));
  });
  return out;
}

// 3. PATRONS DE COMPRA SETMANALS
// Heurística: un producte amb ≥3 entrades a l'historial els últims 90 dies
// i interval mediana ∈ [5, 10] dies suggereix compra setmanal. Usem el dia
// de la setmana més freqüent com a etiqueta. (No tenim historial de compres
// real — usem el de consum com a proxy.)
const _CA_WEEKDAYS = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];

function _median(arr) {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function analyzeWeeklyShopping(history /*, shopping */) {
  const cutoff = Date.now() - 90 * 86400000;
  const byProduct = {};
  history.forEach(e => {
    if (!e || !e.date) return;
    const t = new Date(e.date).getTime();
    if (!isFinite(t) || t < cutoff) return;
    const key = (e.productName || '').toLowerCase().trim();
    if (!key) return;
    if (!byProduct[key]) {
      byProduct[key] = { name: e.productName, emoji: e.productEmoji || '🥫', dates: [] };
    }
    byProduct[key].dates.push(t);
  });

  const out = [];
  Object.values(byProduct).forEach(rec => {
    if (rec.dates.length < 3) return;
    rec.dates.sort((a, b) => a - b);
    const intervals = [];
    for (let i = 1; i < rec.dates.length; i++) {
      intervals.push((rec.dates[i] - rec.dates[i - 1]) / 86400000);
    }
    const med = _median(intervals);
    if (med == null || med < 5 || med > 10) return;

    // Dia de la setmana més freqüent
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    rec.dates.forEach(t => { weekdayCounts[new Date(t).getDay()]++; });
    let bestDay = 0, bestCount = -1;
    for (let i = 0; i < 7; i++) {
      if (weekdayCounts[i] > bestCount) { bestCount = weekdayCounts[i]; bestDay = i; }
    }
    const dayLabel = _CA_WEEKDAYS[bestDay];
    const id = 'pattern-weeklyShopping-' + rec.name.toLowerCase().trim().replace(/\s+/g, '-');
    out.push(_makeSuggestion({
      id,
      type: 'weeklyShopping',
      priority: 'medium',
      title: rec.emoji + ' ' + rec.name,
      description: 'Cada ' + dayLabel + ' sembla que toca ' + rec.name.toLowerCase() + '. Vols un recordatori automàtic?',
      emoji: rec.emoji,
      action: {
        label: 'Activa recordatori setmanal',
        handler: 'patternEnableWeeklyReminder',
        payload: { productName: rec.name, dayOfWeek: bestDay }
      }
    }));
  });
  return out;
}

// 4. CATEGORIES PREFERIDES
// Distribució per categoria d'emoji dels productes consumits l'última setmana.
// Si una categoria és >70% del total, suggerim varietat.
const _CA_CATEGORY_LABEL = {
  dairy: 'lacti', redMeat: 'carn vermella', whiteMeat: 'carn blanca',
  fish: 'peix', fruit: 'fruita', vegetable: 'verdura',
  bread: 'pa', pasta: 'pasta', drinks: 'begudes',
  sweets: 'dolços', canned: 'conserves', default: 'altres'
};

function analyzeCategoryBalance(history) {
  const cutoff = Date.now() - 7 * 86400000;
  const counts = {};
  let total = 0;
  history.forEach(e => {
    if (e.action !== 'consumed') return;
    const t = new Date(e.date).getTime();
    if (!isFinite(t) || t < cutoff) return;
    const cat = (typeof getCategoryFromEmoji === 'function')
      ? getCategoryFromEmoji(e.productEmoji)
      : 'default';
    counts[cat] = (counts[cat] || 0) + 1;
    total += 1;
  });
  if (total < 5) return [];

  const ranked = Object.keys(counts)
    .map(k => ({ cat: k, count: counts[k], pct: Math.round((counts[k] / total) * 100) }))
    .sort((a, b) => b.count - a.count);
  const summary = ranked.slice(0, 3)
    .map(r => r.pct + '% ' + (_CA_CATEGORY_LABEL[r.cat] || r.cat))
    .join(' · ');

  // Si la més gran té >70% suggerim equilibri; si no, només resum informatiu.
  const top = ranked[0];
  if (top && top.pct > 70) {
    // Recomanem la més absent dins del trio "saludable"
    const targets = ['vegetable', 'fruit', 'fish'].filter(c => c !== top.cat);
    const missing = targets.find(c => !counts[c]) || targets[0];
    return [_makeSuggestion({
      id: 'pattern-categoryBalance-skewed',
      type: 'categoryBalance',
      priority: 'info',
      title: 'Aquesta setmana: ' + summary,
      description: 'Has menjat principalment ' + (_CA_CATEGORY_LABEL[top.cat] || top.cat)
        + '. Pots provar més ' + (_CA_CATEGORY_LABEL[missing] || missing) + '?',
      emoji: '🥗',
      action: null
    })];
  }
  return [_makeSuggestion({
    id: 'pattern-categoryBalance-summary',
    type: 'categoryBalance',
    priority: 'info',
    title: 'Aquesta setmana: ' + summary,
    description: 'Bona variació al teu plat aquesta setmana 👌',
    emoji: '🥗',
    action: null
  })];
}

// 5. HORES ACTIVES
// Llegeix 'eatmefirst_app_activity' (FASE 5). Si una hora concreta concentra
// >40% de les obertures, suggerim adaptar les notificacions a aquesta hora.
function analyzeActiveHours(/* activity */) {
  const activity = _readJSON('eatmefirst_app_activity', []);
  if (!Array.isArray(activity) || activity.length < 10) return [];
  const counts = new Array(24).fill(0);
  activity.forEach(a => {
    if (!a) return;
    const h = (typeof a.hour === 'number') ? a.hour : new Date(a.timestamp || 0).getHours();
    if (isFinite(h) && h >= 0 && h <= 23) counts[h]++;
  });
  const total = counts.reduce((a, b) => a + b, 0);
  if (total < 10) return [];
  let bestHour = 0, bestCount = -1;
  for (let i = 0; i < 24; i++) {
    if (counts[i] > bestCount) { bestCount = counts[i]; bestHour = i; }
  }
  if (bestCount / total < 0.4) return [];

  const hh = String(bestHour).padStart(2, '0');
  return [_makeSuggestion({
    id: 'pattern-activeHours-' + bestHour,
    type: 'activeHours',
    priority: 'low',
    title: '⏰ Hora preferida: ' + hh + ':00',
    description: "Veig que sempre obres l'app cap a les " + hh + 'h. Adaptem les notificacions a aquesta hora?',
    emoji: '⏰',
    action: {
      label: 'Sí, adaptar',
      handler: 'patternAdaptNotifHours',
      payload: { hour: bestHour }
    }
  })];
}

// 6. RECEPTES PREFERIDES
// Receptes amb ≥3 visualitzacions al recipeUsage que ARA podem fer (canMake).
function analyzeFavoriteRecipes(/* recipeUsage */) {
  const usage = _readJSON('eatmefirst_recipe_usage', {});
  if (!usage || typeof usage !== 'object') return [];
  if (typeof getAllRecipes !== 'function' || typeof calculateRecipeMatch !== 'function') return [];

  const userProducts = (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];
  const recipes = getAllRecipes();
  const candidates = [];
  recipes.forEach(r => {
    const u = usage[r.id];
    if (!u || (u.views || 0) < 3) return;
    const m = calculateRecipeMatch(r, userProducts);
    if (!m || !m.canMake) return;
    candidates.push({ r, views: u.views, lastUsed: u.lastUsed || 0 });
  });
  if (candidates.length === 0) return [];
  candidates.sort((a, b) => b.views - a.views || b.lastUsed - a.lastUsed);

  // Només mostrem la millor candidata per no saturar
  const best = candidates[0];
  const id = 'pattern-favoriteRecipes-' + best.r.id;
  return [_makeSuggestion({
    id,
    type: 'favoriteRecipes',
    priority: 'low',
    title: (best.r.emoji || '🍽️') + ' ' + (best.r.name || ''),
    description: "Sembla que t'agrada " + (best.r.name || '') + ". Ara mateix tens els ingredients per fer-la!",
    emoji: best.r.emoji || '🍽️',
    action: {
      label: 'Veure recepta',
      handler: 'patternOpenRecipe',
      payload: { recipeId: best.r.id }
    }
  })];
}

// ---------- Action handlers ----------
// Es resolen pel nom (string) perquè els suggeriments siguin serialitzables.
// La pantalla de Suggeriments farà: resolvePatternHandler(action.handler)(action.payload, suggestion).

function patternEnableEarlyAlert(/* payload */) {
  if (typeof showToast === 'function') showToast('🔔 Avís activat (pendent FASE 7)');
}

function patternOpenPopularEditor(payload) {
  if (typeof openPopular === 'function') {
    openPopular('add');
  } else if (typeof showToast === 'function') {
    showToast('⚙️ Edita "' + (payload && payload.productName || '') + '" als populars');
  }
}

function patternRemoveShoppingItem(payload) {
  if (!payload || !payload.itemId) return;
  if (typeof shoppingItems === 'undefined' || !Array.isArray(shoppingItems)) return;
  const idx = shoppingItems.findIndex(it => it && it.id === payload.itemId);
  if (idx < 0) return;
  shoppingItems.splice(idx, 1);
  if (typeof saveShoppingData === 'function') saveShoppingData();
  if (typeof renderShoppingItems === 'function') renderShoppingItems();
  if (typeof showToast === 'function') showToast('🗑️ Tret del BuyMe');
}

function patternEnableWeeklyReminder(/* payload */) {
  // Recordatori per producte: encara no tenim infraestructura per a custom
  // reminders. Per ara confirmem la intenció — quan tinguem el sistema de
  // recordatoris personalitzats, aquí es crearà l'entrada.
  if (typeof showToast === 'function') showToast('📅 Recordatori setmanal anotat');
}

function patternAdaptNotifHours(payload) {
  if (!payload || typeof payload.hour !== 'number') return;
  if (typeof setSmartNotifType !== 'function') return;
  // Adaptem els tipus configurables més rellevants a l'hora preferida.
  ['expiry', 'mealReminder', 'cookmeInspiration'].forEach(tid => {
    setSmartNotifType(tid, { hour: payload.hour, minute: 0 });
  });
  if (typeof showToast === 'function') {
    const hh = String(payload.hour).padStart(2, '0');
    showToast('⏰ Notificacions ajustades a les ' + hh + ':00');
  }
}

function patternOpenRecipe(payload) {
  if (!payload || !payload.recipeId) return;
  if (typeof openRecipeDetail === 'function') openRecipeDetail(payload.recipeId);
}

function resolvePatternHandler(name) {
  if (!name) return null;
  const fn = (typeof window !== 'undefined') ? window[name] : null;
  return (typeof fn === 'function') ? fn : null;
}

// ---------- Main ----------

function analyzePatterns() {
  const readiness = getPatternReadiness();
  if (!readiness.ready) return [];

  const history = _loadConsumptionHistorySafe();
  const shopping = _loadShoppingItemsSafe();

  const all = [].concat(
    analyzeFrequentlyTrashed(history),
    analyzeLastMinuteConsume(history),
    analyzeSavingsTrend(history),
    analyzeForgottenItems(shopping),
    analyzeWeeklyShopping(history, shopping),
    analyzeCategoryBalance(history),
    analyzeActiveHours(),
    analyzeFavoriteRecipes()
  );

  const visible = all.filter(s => !isPatternDismissed(s.id));
  visible.sort((a, b) => {
    const pa = PATTERN_PRIORITY_ORDER[a.priority] != null ? PATTERN_PRIORITY_ORDER[a.priority] : 99;
    const pb = PATTERN_PRIORITY_ORDER[b.priority] != null ? PATTERN_PRIORITY_ORDER[b.priority] : 99;
    return pa - pb;
  });
  return visible;
}

function getHighPrioritySuggestions() {
  return analyzePatterns().filter(s => s.priority === 'high' && s.showAsBanner);
}

// ---------- UI ----------
// Render a la sub-pestanya "🧠 Suggeriments" (Configuració > Activitat).

function _patternsEscape(s) {
  if (typeof escapeHtml === 'function') return escapeHtml(s);
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}

function _renderSuggestionCardHTML(s) {
  const cls = 'suggestion-card ' + (s.priority || 'low');
  const actionsHtml = s.action
    ? `<button class="btn-apply" data-pattern-apply="${_patternsEscape(s.id)}">${_patternsEscape(s.action.label || t('applyAction'))}</button>
       <button class="btn-dismiss" data-pattern-dismiss="${_patternsEscape(s.id)}">${_patternsEscape(t('dismissAction'))}</button>`
    : (s.canDismiss
        ? `<button class="btn-dismiss" data-pattern-dismiss="${_patternsEscape(s.id)}">${_patternsEscape(t('dismissAction'))}</button>`
        : '');
  const actions = actionsHtml
    ? `<div class="suggestion-actions">${actionsHtml}</div>`
    : '';
  return `
    <div class="${cls}">
      <div class="header">
        <span class="suggestion-emoji">${_patternsEscape(s.emoji || '🧠')}</span>
        <div class="suggestion-content">
          <h4>${_patternsEscape(s.title)}</h4>
          <p>${_patternsEscape(s.description)}</p>
        </div>
      </div>
      ${actions}
    </div>
  `;
}

function _renderPatternsLearningState(area, readiness) {
  const daysPct = Math.min(100, Math.round((readiness.days / readiness.daysRequired) * 100));
  const entriesPct = Math.min(100, Math.round((readiness.entries / readiness.entriesRequired) * 100));
  area.innerHTML = `
    <div class="suggestions-empty">
      <div class="suggestions-icon">🧠</div>
      <h3>${_patternsEscape(t('learningStill'))}</h3>
      <p>${_patternsEscape(t('learningDescription'))}</p>

      <div class="progress-row">
        <span>${_patternsEscape(t('daysAccumulated'))}</span>
        <span><strong>${readiness.days}</strong> / ${readiness.daysRequired}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${daysPct}%"></div></div>

      <div class="progress-row">
        <span>${_patternsEscape(t('historyEntries'))}</span>
        <span><strong>${readiness.entries}</strong> / ${readiness.entriesRequired}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${entriesPct}%"></div></div>

      <p class="hint">${_patternsEscape(t('learningHint'))}</p>
    </div>
  `;
}

function _renderPatternsList(area, suggestions, readiness) {
  const toImprove = suggestions.filter(s => s.priority === 'high' || s.priority === 'medium');
  const goodNews = suggestions.filter(s => s.priority === 'info');

  // "Patrons detectats": mínim viable a la FASE 3 — quan FASE 4-5 entrin,
  // afegirem aquí els insights d'hores actives, categoria preferida, etc.
  const infoRows = [
    { emoji: '📅', text: t('patternDays', readiness.days) },
    { emoji: '📦', text: t('patternEntries', readiness.entries) }
  ];

  const sectionHTML = (title, list) => list.length === 0 ? '' : `
    <section class="suggestions-section">
      <h3 class="suggestions-section-title">${_patternsEscape(title)}</h3>
      ${list.map(_renderSuggestionCardHTML).join('')}
    </section>
  `;

  const noneHTML = (toImprove.length === 0 && goodNews.length === 0)
    ? `<p class="suggestions-empty-msg">${_patternsEscape(t('suggestionsEmpty'))}</p>`
    : '';

  area.innerHTML = `
    <div class="suggestions-wrap">
      <h2 class="suggestions-heading">${_patternsEscape(t('suggestionsTitle'))}</h2>
      ${sectionHTML(t('toImproveTitle'), toImprove)}
      ${sectionHTML(t('goodNewsTitle'), goodNews)}
      ${noneHTML}
      <section class="suggestions-section">
        <h3 class="suggestions-section-title">${_patternsEscape(t('patternsTitle'))}</h3>
        ${infoRows.map(r => `
          <div class="pattern-info-row">
            <span>${_patternsEscape(r.emoji)}</span>
            <span>${_patternsEscape(r.text)}</span>
          </div>
        `).join('')}
      </section>
      <p class="privacy-note">${_patternsEscape(t('privacyNote'))}</p>
    </div>
  `;
}

function renderPatternsSubTab(area) {
  if (!area) area = document.getElementById('settings-activity-area');
  if (!area) return;
  const readiness = getPatternReadiness();
  if (!readiness.ready) {
    _renderPatternsLearningState(area, readiness);
    return;
  }
  const suggestions = analyzePatterns();
  _renderPatternsList(area, suggestions, readiness);
}

// Event delegation: connecta UNA SOLA VEGADA els botons Aplicar/Descartar
// a #settings-activity-area. Resilient a re-renders (els botons es re-creen).
(function _wirePatternsActions() {
  if (typeof document === 'undefined') return;
  if (window.__patternsActionsWired) return;
  window.__patternsActionsWired = true;
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target || !target.closest) return;
    const dismissBtn = target.closest('[data-pattern-dismiss]');
    if (dismissBtn) {
      const id = dismissBtn.getAttribute('data-pattern-dismiss');
      dismissPattern(id);
      const area = document.getElementById('settings-activity-area');
      if (area) renderPatternsSubTab(area);
      return;
    }
    const applyBtn = target.closest('[data-pattern-apply]');
    if (applyBtn) {
      const id = applyBtn.getAttribute('data-pattern-apply');
      const all = analyzePatterns();
      const s = all.find(x => x.id === id);
      if (s && s.action) {
        const fn = resolvePatternHandler(s.action.handler);
        if (fn) {
          try { fn(s.action.payload || {}, s); } catch (err) { console.error('[patterns] handler error', err); }
        }
        applyPattern(id);
      }
      // Aplicar també descarta (s'ha d'amagar fins que la condició torni a aparèixer).
      dismissPattern(id);
      const area = document.getElementById('settings-activity-area');
      if (area) renderPatternsSubTab(area);
    }
  });
})();
