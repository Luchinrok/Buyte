/* ============================================
   Buyte — js/gamification.js
   Sistema de XP / nivells / insignies. Es centralitza
   tota la lògica aquí: la resta de mòduls només cal
   que cridin addXp() i checkBadges() en accions clau.

   Emmagatzematge a localStorage:
     eatmefirst_xp                    — XP total acumulat
     eatmefirst_unlocked_badges       — [{id, unlockedAt}]
     eatmefirst_install_date          — primera execució (ISO)
     eatmefirst_screens_visited       — array de noms de pantalla
     eatmefirst_touched_hours         — array d'hores (0-23) on s'ha fet servir l'app
     eatmefirst_products_added_count  — comptador històric de productes afegits al BiteMe
     eatmefirst_buyme_added_count     — comptador històric d'items afegits al BuyMe
     eatmefirst_shops_completed_count — vegades que s'ha buidat una llista de la compra
     eatmefirst_special_lists_used    — vegades que s'ha "Comprat" una llista especial

   Els comptadors són monòtons creixents — ni reset de BiteMe ni del
   BuyMe els toca; només el botó "Esborrar progrés de gamificació".
   ============================================ */


// 50 nivells, agrupats per "tier" cada 5 nivells. L'emoji és l'avatar de tier.
const LEVEL_NAMES = [
  // 1-5 — Aprenent (🌱)
  'Principiant', 'Despertant', 'Curiós', 'Atent', 'Aprenent',
  // 6-10 — Conscient (🌿)
  'Conscient', 'Reflexiu', 'Disciplinat', 'Organitzat', 'Acurat',
  // 11-15 — Estalviador (💰)
  'Estalviador', 'Calculador', 'Optimitzador', 'Pràctic', 'Eficient',
  // 16-20 — Eco-aprenent (🌳)
  'Eco-curiós', 'Eco-aprenent', 'Verd', 'Sostenible', 'Eco-conscient',
  // 21-25 — Eco-warrior (🛡️)
  'Eco-warrior', 'Defensor', 'Protector', 'Activista', 'Vigilant',
  // 26-30 — Mestre del rebost (🥫)
  'Mestre del rebost', 'Conservador', 'Planificador', 'Estrateg', 'Gestor',
  // 31-35 — Xef anti-malbaratament (👨‍🍳)
  'Aprenent xef', 'Cuiner casolà', 'Xef expert', 'Xef creatiu', 'Xef anti-malbaratament',
  // 36-40 — Eco-master (🌍)
  'Eco-master', 'Influent', 'Inspirador', 'Líder verd', 'Visionari',
  // 41-45 — Llegenda verda (🌟)
  'Llegenda verda', 'Heroi del planeta', 'Defensor de la Terra', 'Activista total', 'Pioner',
  // 46-50 — Sobrent del planeta (🏆)
  'Salvador', 'Llegenda viva', 'Mestre absolut', 'Llegendari', 'Sobrent del planeta'
];

const LEVEL_TIER_EMOJIS = ['🌱','🌿','💰','🌳','🛡️','🥫','👨‍🍳','🌍','🌟','🏆'];

// Color del banner de nivell segons el tier (gradient inicial → final).
const LEVEL_TIER_GRADIENTS = [
  ['#A5D6A7', '#43A047'],  // 🌱 verd suau
  ['#81C784', '#2E7D32'],  // 🌿 verd
  ['#FFD54F', '#F9A825'],  // 💰 daurat
  ['#66BB6A', '#1B5E20'],  // 🌳 bosc
  ['#4FC3F7', '#01579B'],  // 🛡️ blau
  ['#A1887F', '#5D4037'],  // 🥫 marró
  ['#FFB74D', '#E65100'],  // 👨‍🍳 taronja
  ['#26A69A', '#004D40'],  // 🌍 turquesa
  ['#BA68C8', '#6A1B9A'],  // 🌟 lila
  ['#FFD700', '#FF6F00']   // 🏆 daurat intens
];


// Estat en memòria. Es carrega d'arrencada amb loadGamificationState().
let gamificationState = {
  xp: 0,
  unlockedBadges: [],   // [{id, unlockedAt}]
  appInstallDate: null, // ISO
  screensVisited: [],   // ['home','launcher',...]
  touchedHours: []      // [0,1,2,...,23]
};

// ============================================
//   PERSISTÈNCIA
// ============================================

function loadGamificationState() {
  let xp = 0;
  try { xp = parseFloat(localStorage.getItem('eatmefirst_xp')); }
  catch (e) {}
  if (!isFinite(xp) || xp < 0) xp = 0;

  let badges = [];
  try {
    const raw = localStorage.getItem('eatmefirst_unlocked_badges');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) badges = parsed;
    }
  } catch (e) {}

  let install = localStorage.getItem('eatmefirst_install_date');
  if (!install) {
    install = new Date().toISOString();
    localStorage.setItem('eatmefirst_install_date', install);
  }

  let screens = [];
  try {
    const raw = localStorage.getItem('eatmefirst_screens_visited');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) screens = parsed;
    }
  } catch (e) {}

  let hours = [];
  try {
    const raw = localStorage.getItem('eatmefirst_touched_hours');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) hours = parsed;
    }
  } catch (e) {}

  gamificationState = { xp, unlockedBadges: badges, appInstallDate: install, screensVisited: screens, touchedHours: hours };
}

function saveGamificationState() {
  try {
    localStorage.setItem('eatmefirst_xp', String(gamificationState.xp));
    localStorage.setItem('eatmefirst_unlocked_badges', JSON.stringify(gamificationState.unlockedBadges));
    localStorage.setItem('eatmefirst_screens_visited', JSON.stringify(gamificationState.screensVisited));
    localStorage.setItem('eatmefirst_touched_hours', JSON.stringify(gamificationState.touchedHours));
  } catch (e) {}
}

// Comptadors monòtons (no es perden amb resets de BiteMe / BuyMe).
function _readCounter(key) {
  const v = parseInt(localStorage.getItem(key), 10);
  return isFinite(v) && v >= 0 ? v : 0;
}
function _bumpCounter(key, delta) {
  const cur = _readCounter(key);
  localStorage.setItem(key, String(cur + (delta || 1)));
}

function bumpProductsAddedCounter()    { _bumpCounter('eatmefirst_products_added_count', 1); }
function bumpBuymeAddedCounter(n)      { _bumpCounter('eatmefirst_buyme_added_count', n || 1); }
function bumpShopsCompletedCounter()   { _bumpCounter('eatmefirst_shops_completed_count', 1); }
function bumpSpecialListsUsedCounter() { _bumpCounter('eatmefirst_special_lists_used', 1); }


// ============================================
//   NIVELLS
// ============================================

// XP total acumulada per a entrar al nivell n (n>=1). Nivell 1 = 0 XP.
// Fórmula del salt nivell k → k+1: 50*k + 25*k^2.
function getXpForLevel(n) {
  if (n <= 1) return 0;
  let total = 0;
  for (let k = 1; k < n; k++) total += 50 * k + 25 * k * k;
  return total;
}

function getCurrentLevel() {
  const xp = gamificationState.xp || 0;
  let level = 1;
  while (level < 50 && xp >= getXpForLevel(level + 1)) level++;
  return level;
}

function getProgressToNextLevel() {
  const xp = gamificationState.xp || 0;
  const level = getCurrentLevel();
  const startXp = getXpForLevel(level);
  const endXp = getXpForLevel(level + 1);
  if (level >= 50) return { current: 0, needed: 0, percent: 100, isMax: true };
  const current = xp - startXp;
  const needed = endXp - startXp;
  const percent = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100;
  return { current, needed, percent, isMax: false };
}

function getLevelName(level) {
  return LEVEL_NAMES[Math.max(0, Math.min(LEVEL_NAMES.length - 1, level - 1))];
}

function getLevelTierEmoji(level) {
  const tierIdx = Math.max(0, Math.min(LEVEL_TIER_EMOJIS.length - 1, Math.floor((level - 1) / 5)));
  return LEVEL_TIER_EMOJIS[tierIdx];
}

function getLevelTierGradient(level) {
  const tierIdx = Math.max(0, Math.min(LEVEL_TIER_GRADIENTS.length - 1, Math.floor((level - 1) / 5)));
  return LEVEL_TIER_GRADIENTS[tierIdx];
}


// ============================================
//   ESTADÍSTIQUES (computades a partir d'altres dades de l'app)
// ============================================

function _getConsumptionHistory() {
  try {
    const raw = localStorage.getItem('eatmefirst_consumption_history');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}

// Calcula el preu / CO₂ d'una entrada de l'historial reutilitzant les
// helpers d'impact.js (entryAsProduct, entryFactor, getProductPrice/CO2).
function _entryPriceAndCo2(entry) {
  if (typeof entryAsProduct !== 'function') return { price: 0, co2: 0 };
  const product = entryAsProduct(entry);
  const totalPrice = (typeof getProductPrice === 'function') ? getProductPrice(product) : 0;
  const totalCo2 = (typeof getProductCO2 === 'function') ? getProductCO2(product) : 0;
  const factor = (typeof entryFactor === 'function') ? entryFactor(entry) : ((entry.percent || 0) / 100);
  return { price: totalPrice * factor, co2: totalCo2 * factor };
}

function computeGamificationStats() {
  const history = _getConsumptionHistory();
  let consumed = 0, trashed = 0, moneySaved = 0, co2Saved = 0;
  const categoryCounts = {};
  const map = (typeof BADGE_FOOD_CATEGORY_MAP !== 'undefined') ? BADGE_FOOD_CATEGORY_MAP : {};

  history.forEach(entry => {
    if (entry.action === 'consumed') {
      consumed++;
      const pc = _entryPriceAndCo2(entry);
      moneySaved += pc.price;
      co2Saved += pc.co2;
      const cat = map[entry.productEmoji];
      if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    } else if (entry.action === 'trashed') {
      trashed++;
    }
  });

  const maxStreak = parseInt(localStorage.getItem('eatmefirst_streak_record'), 10) || 0;

  // Comptadors monòtons (alguns amb fallbacks per a usuaris previs)
  const productsAddedTotal = Math.max(
    _readCounter('eatmefirst_products_added_count'),
    Array.isArray(typeof products !== 'undefined' ? products : null) ? products.length : 0,
    history.length
  );
  const buymeAddedTotal = Math.max(
    _readCounter('eatmefirst_buyme_added_count'),
    (() => {
      try {
        const items = JSON.parse(localStorage.getItem('eatmefirst_shopping_items') || '[]');
        return Array.isArray(items) ? items.length : 0;
      } catch (e) { return 0; }
    })()
  );
  const shopsCompleted = _readCounter('eatmefirst_shops_completed_count');
  const specialListsUsed = _readCounter('eatmefirst_special_lists_used');

  // CookMe views: agregat de eatmefirst_recipe_usage
  let cookmeViewsTotal = 0;
  try {
    const usage = JSON.parse(localStorage.getItem('eatmefirst_recipe_usage') || '{}');
    Object.values(usage).forEach(u => { cookmeViewsTotal += (u && u.views) || 0; });
  } catch (e) {}

  // Receptes "cuinades" (qualsevol recepta amb ≥1 ingredient afegit al BuyMe)
  let recipesCooked = 0;
  try {
    const usage = JSON.parse(localStorage.getItem('eatmefirst_recipe_usage') || '{}');
    recipesCooked = Object.values(usage).filter(u => u && u.addedToShopping > 0).length;
  } catch (e) {}

  // Receptes pròpies
  let recipesCustomCount = 0;
  try {
    const cust = JSON.parse(localStorage.getItem('eatmefirst_custom_recipes') || '[]');
    if (Array.isArray(cust)) recipesCustomCount = cust.length;
  } catch (e) {}

  // Productes en zones de tipus 'pantry'
  let pantryAdded = 0;
  if (typeof products !== 'undefined' && Array.isArray(products) && typeof getLocationById === 'function') {
    pantryAdded = products.filter(p => {
      const loc = getLocationById(p.location || 'fridge');
      return loc && loc.category === 'pantry';
    }).length;
  }

  // Supers utilitzats (distinct supermarketId a la llista de la compra activa)
  let shopsUsed = 0;
  try {
    const items = JSON.parse(localStorage.getItem('eatmefirst_shopping_items') || '[]');
    if (Array.isArray(items)) {
      const ids = new Set(items.map(it => it && it.supermarketId).filter(Boolean));
      shopsUsed = ids.size;
    }
  } catch (e) {}

  // Zones (categories de location) usades actualment
  let zonesUsed = 0;
  if (typeof products !== 'undefined' && Array.isArray(products) && typeof getLocationById === 'function') {
    const cats = new Set();
    products.forEach(p => {
      const loc = getLocationById(p.location || 'fridge');
      if (loc && loc.category) cats.add(loc.category);
    });
    zonesUsed = cats.size;
  }

  // App age en dies
  let appAgeDays = 0;
  if (gamificationState.appInstallDate) {
    const install = new Date(gamificationState.appInstallDate);
    if (!isNaN(install.getTime())) {
      appAgeDays = Math.floor((Date.now() - install.getTime()) / 86400000);
    }
  }

  return {
    consumed, trashed, moneySaved, co2Saved, categoryCounts,
    maxStreak,
    productsAddedTotal, buymeAddedTotal, cookmeViewsTotal,
    pantryAdded, recipesCooked, recipesCustomCount,
    shopsUsed, shopsCompleted, specialListsUsed,
    zonesUsed, appAgeDays,
    touchedHours: gamificationState.touchedHours || [],
    screensVisitedCount: (gamificationState.screensVisited || []).length
  };
}


// ============================================
//   AVALUACIÓ D'INSIGNIES
// ============================================

// Retorna { unlocked, current, target, percent, hasProgress }.
function evaluateBadge(badge, stats) {
  const target = badge.value || 0;
  let current = 0;
  let hasProgress = true;

  switch (badge.type) {
    case 'products_added_total': current = stats.productsAddedTotal; break;
    case 'buyme_added_total':    current = stats.buymeAddedTotal; break;
    case 'cookme_views_total':   current = stats.cookmeViewsTotal; break;
    case 'count_consumed':       current = stats.consumed; break;
    case 'pantry_added':         current = stats.pantryAdded; break;
    case 'streak':               current = stats.maxStreak; break;
    case 'co2_saved':            current = stats.co2Saved; break;
    case 'money_saved':          current = stats.moneySaved; break;
    case 'category_consumed':
      current = (stats.categoryCounts && stats.categoryCounts[badge.foodCategory]) || 0;
      break;
    case 'all_food_categories':
      current = Object.values(stats.categoryCounts || {}).filter(v => v >= 1).length;
      break;
    case 'recipes_cooked':       current = stats.recipesCooked; break;
    case 'recipes_custom':       current = stats.recipesCustomCount; break;
    case 'shops_completed':      current = stats.shopsCompleted; break;
    case 'shops_used':           current = stats.shopsUsed; break;
    case 'special_lists':        current = stats.specialListsUsed; break;
    case 'zones_used':           current = stats.zonesUsed; break;
    case 'app_age_days':         current = stats.appAgeDays; break;
    case 'screens_visited':      current = stats.screensVisitedCount; break;
    case 'action_at_hour': {
      const parts = String(badge.value || '0-0').split('-').map(n => parseInt(n, 10));
      const from = parts[0] || 0;
      const to = (parts.length > 1 ? parts[1] : parts[0]) || 0;
      const hit = (stats.touchedHours || []).some(h => h >= from && h <= to);
      // No té progrés gradual — només fet/no fet
      return { unlocked: hit, current: hit ? 1 : 0, target: 1, percent: hit ? 100 : 0, hasProgress: false };
    }
    default:
      current = 0; hasProgress = false; break;
  }

  const unlocked = current >= target;
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return { unlocked, current, target, percent, hasProgress };
}

function isBadgeUnlocked(id) {
  return !!(gamificationState.unlockedBadges || []).find(b => b && b.id === id);
}

function getBadgeUnlockDate(id) {
  const entry = (gamificationState.unlockedBadges || []).find(b => b && b.id === id);
  return entry ? entry.unlockedAt : null;
}

function unlockBadge(id) {
  if (isBadgeUnlocked(id)) return null;
  const badge = (typeof BADGES !== 'undefined') ? BADGES.find(b => b.id === id) : null;
  if (!badge) return null;
  gamificationState.unlockedBadges.push({ id, unlockedAt: new Date().toISOString() });
  if (badge.xpReward) gamificationState.xp += badge.xpReward;
  saveGamificationState();
  return badge;
}

// Variant interna sense efectes de cua: només desbloqueja les que toquin
// (afegint xpReward) i retorna les noves insignies.
function _checkBadgesSilent() {
  if (typeof BADGES === 'undefined') return [];
  const stats = computeGamificationStats();
  const newly = [];
  BADGES.forEach(badge => {
    if (isBadgeUnlocked(badge.id)) return;
    if (evaluateBadge(badge, stats).unlocked) {
      const u = unlockBadge(badge.id);
      if (u) newly.push(u);
    }
  });
  return newly;
}

// Punt d'entrada públic: comprova insignies i mostra la cua de recompenses.
// Calcula el nivell ABANS i DESPRÉS, així si una insignia (via xpReward)
// fa pujar de nivell, també n'emetem l'esdeveniment.
function checkBadges() {
  const oldLevel = getCurrentLevel();
  const newly = _checkBadgesSilent();
  saveGamificationState();
  const newLevel = getCurrentLevel();
  _emitRewardQueue(oldLevel, newLevel, newly);
  return newly;
}


// ============================================
//   AFEGIR XP
// ============================================

// Suma XP, comprova insignies, i retorna l'esdeveniment-cua: array de
// { kind: 'level'|'badge', ... } perquè la capa visual l'animi després.
function addXp(amount, reason) {
  amount = Number(amount) || 0;
  const oldLevel = getCurrentLevel();
  if (amount > 0) {
    gamificationState.xp += amount;
  }
  const newBadges = _checkBadgesSilent();
  saveGamificationState();
  const newLevel = getCurrentLevel();
  return _emitRewardQueue(oldLevel, newLevel, newBadges);
}

function _emitRewardQueue(oldLevel, newLevel, newBadges) {
  const queue = [];
  for (let l = oldLevel + 1; l <= newLevel; l++) queue.push({ kind: 'level', level: l });
  (newBadges || []).forEach(b => queue.push({ kind: 'badge', badge: b }));
  if (queue.length > 0 && typeof showRewardQueue === 'function') {
    showRewardQueue(queue);
  }
  return queue;
}


// ============================================
//   TRACKING DE PANTALLES + HORES
// ============================================

function recordScreenVisit(name) {
  if (!name) return;
  if (!Array.isArray(gamificationState.screensVisited)) gamificationState.screensVisited = [];
  if (!gamificationState.screensVisited.includes(name)) {
    gamificationState.screensVisited.push(name);
    saveGamificationState();
  }
}

function recordHourTouch() {
  const h = new Date().getHours();
  if (!Array.isArray(gamificationState.touchedHours)) gamificationState.touchedHours = [];
  if (!gamificationState.touchedHours.includes(h)) {
    gamificationState.touchedHours.push(h);
    saveGamificationState();
  }
}


// ============================================
//   RESET (botó "Esborrar progrés de gamificació")
// ============================================

// ============================================
//   COA D'ANIMACIONS (insignia / pujar nivell)
// ============================================

// Cua interna de toasts pendents. Es processen seqüencialment.
let _rewardQueue = [];
let _rewardActive = false;

function showRewardQueue(events) {
  if (!Array.isArray(events) || events.length === 0) return;
  _rewardQueue = _rewardQueue.concat(events);
  if (!_rewardActive) _processNextReward();
}

function _processNextReward() {
  if (_rewardQueue.length === 0) {
    _rewardActive = false;
    return;
  }
  _rewardActive = true;
  const next = _rewardQueue.shift();
  if (next.kind === 'level') {
    _showLevelUpToast(next.level, _processNextReward);
  } else if (next.kind === 'badge') {
    _showBadgeUnlockToast(next.badge, _processNextReward);
  } else {
    _processNextReward();
  }
}

function _showBadgeUnlockToast(badge, onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'reward-toast reward-toast-badge';
  overlay.innerHTML =
    '<span class="reward-toast-emoji">' + (badge.emoji || '🏅') + '</span>' +
    '<div class="reward-toast-body">' +
      '<p class="reward-toast-title">' + escapeHtml(t('badgeUnlocked')) + '</p>' +
      '<p class="reward-toast-name">' + escapeHtml(badge.name || '') + '</p>' +
      '<p class="reward-toast-desc">' + escapeHtml(badge.description || '') + '</p>' +
    '</div>';
  document.body.appendChild(overlay);
  // Doble requestAnimationFrame: força el browser a aplicar l'estat inicial
  // abans d'afegir la classe que fa la transició.
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));
  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof onDone === 'function') onDone();
    }, 280);
  }, 4000);
}

function _showLevelUpToast(level, onDone) {
  const [c1, c2] = getLevelTierGradient(level);
  const overlay = document.createElement('div');
  overlay.className = 'reward-toast reward-toast-level';
  overlay.style.background = 'linear-gradient(135deg, ' + c1 + ' 0%, ' + c2 + ' 100%)';
  overlay.innerHTML =
    '<span class="reward-toast-emoji">' + getLevelTierEmoji(level) + '</span>' +
    '<div class="reward-toast-body">' +
      '<p class="reward-toast-title">' + escapeHtml(t('levelUp')) + '</p>' +
      '<p class="reward-toast-name">' + escapeHtml(t('level')) + ' ' + level + ' — ' + escapeHtml(getLevelName(level)) + '</p>' +
    '</div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));
  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof onDone === 'function') onDone();
    }, 280);
  }, 5000);
}


// ============================================
//   PANTALLA "ELS MEUS ÈXITS"
// ============================================

let achievementsFilter = 'all';

function openAchievements() {
  achievementsFilter = 'all';
  renderAchievements();
  showScreen('achievements');
}

// Pinta el banner de nivell que apareix a la pantalla "El meu impacte".
// És un resum compacte amb avatar + nom de nivell + progrés + comptador
// d'insignies. Tot el banner és clicable i porta a "Els meus èxits".
function renderImpactLevelBanner() {
  const banner = document.getElementById('impact-level-banner');
  if (!banner) return;

  const level = getCurrentLevel();
  const tierEmoji = getLevelTierEmoji(level);
  const [c1, c2] = getLevelTierGradient(level);
  banner.style.background = 'linear-gradient(135deg, ' + c1 + ' 0%, ' + c2 + ' 100%)';
  banner.style.boxShadow = '0 6px 20px ' + c2 + '55';

  const avatar = document.getElementById('impact-level-avatar');
  if (avatar) avatar.textContent = tierEmoji;
  const tierEl = document.getElementById('impact-level-tier');
  if (tierEl) tierEl.textContent = t('level') + ' ' + level;
  const nameEl = document.getElementById('impact-level-name');
  if (nameEl) nameEl.textContent = getLevelName(level);

  const progress = getProgressToNextLevel();
  const fill = document.getElementById('impact-level-progress-fill');
  if (fill) fill.style.width = progress.percent + '%';

  const totalBadges = (typeof BADGES !== 'undefined') ? BADGES.length : 0;
  const unlocked = (gamificationState.unlockedBadges || []).length;
  const entry = document.getElementById('impact-level-entry');
  if (entry) entry.textContent = unlocked + '/' + totalBadges + ' ' + t('badgesUnlocked') + ' →';
}

function renderAchievements() {
  // Banner de nivell
  const level = getCurrentLevel();
  const tierEmoji = getLevelTierEmoji(level);
  const [c1, c2] = getLevelTierGradient(level);
  const banner = document.getElementById('level-banner');
  if (banner) {
    banner.style.background = 'linear-gradient(135deg, ' + c1 + ' 0%, ' + c2 + ' 100%)';
    banner.style.boxShadow = '0 6px 20px ' + c2 + '55';
  }
  const avatarEl = document.getElementById('level-banner-avatar');
  if (avatarEl) avatarEl.textContent = tierEmoji;
  const tierEl = document.getElementById('level-banner-tier');
  if (tierEl) tierEl.textContent = t('level') + ' ' + level;
  const nameEl = document.getElementById('level-banner-name');
  if (nameEl) nameEl.textContent = getLevelName(level);

  const progress = getProgressToNextLevel();
  const fill = document.getElementById('level-banner-progress-fill');
  if (fill) fill.style.width = progress.percent + '%';
  const txt = document.getElementById('level-banner-progress-text');
  if (txt) {
    if (progress.isMax) {
      txt.textContent = t('maxLevelReached');
    } else {
      txt.textContent = progress.current + ' / ' + progress.needed + ' ' + t('xpToNextLevel');
    }
  }

  // Resum
  const totalBadges = (typeof BADGES !== 'undefined') ? BADGES.length : 0;
  const unlockedCount = (gamificationState.unlockedBadges || []).length;
  const summary = document.getElementById('achievements-summary');
  if (summary) {
    const pct = totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0;
    summary.textContent = unlockedCount + ' / ' + totalBadges + ' ' + t('badgesUnlocked') + ' (' + pct + '%)';
  }

  renderAchievementsFilters();
  renderAchievementsList();
}

function renderAchievementsFilters() {
  const wrap = document.getElementById('achievements-filters');
  if (!wrap || typeof BADGE_CATEGORIES === 'undefined') return;
  wrap.innerHTML = '';

  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'achievements-filter' + (achievementsFilter === 'all' ? ' active' : '');
  all.dataset.filter = 'all';
  all.textContent = t('filterAll');
  all.addEventListener('click', () => {
    achievementsFilter = 'all';
    renderAchievementsFilters();
    renderAchievementsList();
  });
  wrap.appendChild(all);

  BADGE_CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'achievements-filter' + (achievementsFilter === cat.id ? ' active' : '');
    btn.dataset.filter = cat.id;
    btn.textContent = cat.emoji + ' ' + cat.label;
    btn.addEventListener('click', () => {
      achievementsFilter = cat.id;
      renderAchievementsFilters();
      renderAchievementsList();
    });
    wrap.appendChild(btn);
  });
}

function renderAchievementsList() {
  const list = document.getElementById('achievements-list');
  if (!list || typeof BADGES === 'undefined') return;
  list.innerHTML = '';

  const stats = computeGamificationStats();
  const filtered = (achievementsFilter === 'all')
    ? BADGES
    : BADGES.filter(b => b.category === achievementsFilter);

  filtered.forEach(badge => {
    const ev = evaluateBadge(badge, stats);
    const unlocked = isBadgeUnlocked(badge.id);
    const card = document.createElement('div');
    card.className = 'badge-card' + (unlocked ? ' unlocked' : ' locked');

    let statusHtml;
    if (unlocked) {
      const date = getBadgeUnlockDate(badge.id);
      let dateStr = '';
      if (date) {
        try { dateStr = new Date(date).toLocaleDateString('ca-ES'); } catch (e) {}
      }
      statusHtml = '<p class="badge-card-status badge-card-unlocked">✓ ' + escapeHtml(t('unlockedAt')) + ' ' + escapeHtml(dateStr) + '</p>';
    } else if (ev.hasProgress && ev.target > 0 && ev.current > 0) {
      // Progrés "X/Y" amb una mini barra
      let cur = ev.current;
      // Per a CO2/diners arrodonim a 1 decimal
      if (badge.type === 'co2_saved' || badge.type === 'money_saved') {
        cur = (Math.round(cur * 10) / 10);
      }
      statusHtml =
        '<div class="badge-progress-track"><div class="badge-progress-fill" style="width:' + ev.percent + '%"></div></div>' +
        '<p class="badge-card-status">' + escapeHtml(t('progress')) + ': ' + cur + ' / ' + ev.target + '</p>';
    } else {
      statusHtml = '<p class="badge-card-status">🔒 ' + escapeHtml(t('locked')) + '</p>';
    }

    card.innerHTML =
      '<div class="badge-emoji' + (unlocked ? '' : ' locked') + '">' + (badge.emoji || '🏅') + '</div>' +
      '<div class="badge-card-body">' +
        '<p class="badge-card-name">' + escapeHtml(badge.name) + '</p>' +
        '<p class="badge-card-desc">' + escapeHtml(badge.description) + '</p>' +
        statusHtml +
      '</div>';
    list.appendChild(card);
  });
}


// ============================================
//   RESET (botó "Esborrar progrés de gamificació")
// ============================================

function resetGamificationProgress() {
  gamificationState = {
    xp: 0,
    unlockedBadges: [],
    appInstallDate: gamificationState.appInstallDate, // mantenim la data d'instal·lació
    screensVisited: [],
    touchedHours: []
  };
  try {
    localStorage.removeItem('eatmefirst_xp');
    localStorage.removeItem('eatmefirst_unlocked_badges');
    localStorage.removeItem('eatmefirst_screens_visited');
    localStorage.removeItem('eatmefirst_touched_hours');
    localStorage.removeItem('eatmefirst_products_added_count');
    localStorage.removeItem('eatmefirst_buyme_added_count');
    localStorage.removeItem('eatmefirst_shops_completed_count');
    localStorage.removeItem('eatmefirst_special_lists_used');
  } catch (e) {}
}

// Demana confirmació abans d'esborrar tot el progrés de gamificació.
function confirmResetGamificationProgress() {
  const onYes = () => {
    resetGamificationProgress();
    if (typeof showToast === 'function') showToast(t('doneReset'));
    if (typeof renderImpactLevelBanner === 'function') renderImpactLevelBanner();
    if (typeof renderAchievements === 'function') renderAchievements();
  };
  if (typeof showConfirmDangerModal === 'function') {
    showConfirmDangerModal('🏆', t('resetGamificationTitle'), t('resetGamificationConfirm'), onYes);
  } else if (window.confirm(t('resetGamificationConfirm'))) {
    onYes();
  }
}
