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
// Cada funció retorna 0 o més suggeriments. Les implementacions concretes
// arriben a les FASE 2 (els 4 principals) i FASE 4 (els 4 restants).

function analyzeFrequentlyTrashed(/* history */) { return []; }
function analyzeLastMinuteConsume(/* history */) { return []; }
function analyzeWeeklyShopping(/* history, shopping */) { return []; }
function analyzeCategoryBalance(/* history */) { return []; }
function analyzeActiveHours(/* activity */) { return []; }
function analyzeFavoriteRecipes(/* recipeUsage */) { return []; }
function analyzeSavingsTrend(/* history */) { return []; }
function analyzeForgottenItems(/* shopping */) { return []; }

// ---------- Action handlers ----------
// Es resolen pel nom (string) per evitar serialitzar funcions als suggeriments.
// La pantalla de Suggeriments farà: resolvePatternHandler(action.handler)(action.payload, suggestion).

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
