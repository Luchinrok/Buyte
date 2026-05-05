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

// Detectors restants: stubs fins a la FASE 4.
function analyzeWeeklyShopping(/* history, shopping */) { return []; }
function analyzeCategoryBalance(/* history */) { return []; }
function analyzeActiveHours(/* activity */) { return []; }
function analyzeFavoriteRecipes(/* recipeUsage */) { return []; }

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
