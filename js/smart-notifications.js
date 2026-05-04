/* ============================================
   Buyte — js/smart-notifications.js
   Sistema de notificacions intel·ligents amb 8 tipus.
   Es construeix sobre la capa low-level de notifications.js
   (window.Notif: permisos i Notification API). El scheduler i
   els disparadors per tipus viuen aquí.

   Emmagatzematge a localStorage:
     eatmefirst_smart_notif_v2        — configuració de l'usuari
     eatmefirst_smart_notif_log       — { 'YYYY-MM-DD': { type: true } } push debounce
     eatmefirst_notif_dismissed       — { bannerId: 'YYYY-MM-DD' } descart per dia
     eatmefirst_last_open             — última obertura de l'app (per a 'reactivation')

   Els banners de l'app es generen EN VIU des de getActiveBanners() — no es
   desen enlloc. La hora configurada per cada tipus només afecta a les
   notificacions push del sistema; els banners apareixen sempre que el tipus
   estigui activat i no s'hagi descartat avui.
   ============================================ */


// Configuració per defecte. Cada tipus té hora configurable; weeklyRecap
// també té dia de la setmana.
const SMART_NOTIF_DEFAULTS = {
  enabled: true, // master switch
  types: {
    expiry:            { enabled: true,  hour: 9,  minute: 0 },
    mealReminder:      { enabled: true,  hour: 11, minute: 0 },
    cookmeInspiration: { enabled: true,  hour: 18, minute: 0 },
    shoppingPending:   { enabled: false, hour: 18, minute: 0 },
    streakMotivation:  { enabled: true,  hour: 21, minute: 0 },
    reactivation:      { enabled: true,  hour: 10, minute: 0 },
    weeklyRecap:       { enabled: true,  day: 0,  hour: 19, minute: 0 }, // 0 = diumenge
    badgeProgress:     { enabled: true,  hour: 12, minute: 0 }
  }
};

// Lista en ordre fix: serveix tant per al render de la pantalla de
// configuració com per al scheduler. Cada entrada inclou les metadades
// que la UI ha de mostrar. Tots els tipus tenen hora configurable.
const SMART_NOTIF_TYPES = [
  { id: 'expiry',            emoji: '🚨', i18n: 'notifTypeExpiry',           hasHour: true,  hasDay: false },
  { id: 'mealReminder',      emoji: '💡', i18n: 'notifTypeMealReminder',     hasHour: true,  hasDay: false },
  { id: 'cookmeInspiration', emoji: '🍳', i18n: 'notifTypeCookme',           hasHour: true,  hasDay: false },
  { id: 'shoppingPending',   emoji: '🛒', i18n: 'notifTypeShoppingPending',  hasHour: true,  hasDay: false },
  { id: 'streakMotivation',  emoji: '🔥', i18n: 'notifTypeStreak',           hasHour: true,  hasDay: false },
  { id: 'reactivation',      emoji: '👋', i18n: 'notifTypeReactivation',     hasHour: true,  hasDay: false },
  { id: 'weeklyRecap',       emoji: '📊', i18n: 'notifTypeWeekly',           hasHour: true,  hasDay: true  },
  { id: 'badgeProgress',     emoji: '🎯', i18n: 'notifTypeBadge',            hasHour: true,  hasDay: false }
];


// ============================================
//   ESTAT
// ============================================

let smartNotifSettings = JSON.parse(JSON.stringify(SMART_NOTIF_DEFAULTS));
let smartNotifSchedulerId = null;

function loadSmartNotifSettings() {
  try {
    const raw = localStorage.getItem('eatmefirst_smart_notif_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Fusió defensiva: nous tipus afegits en versions futures hereten dels DEFAULTS.
      const merged = JSON.parse(JSON.stringify(SMART_NOTIF_DEFAULTS));
      if (typeof parsed.enabled === 'boolean') merged.enabled = parsed.enabled;
      if (parsed.types && typeof parsed.types === 'object') {
        Object.keys(merged.types).forEach(k => {
          if (parsed.types[k]) merged.types[k] = Object.assign({}, merged.types[k], parsed.types[k]);
        });
      }
      smartNotifSettings = merged;
      return smartNotifSettings;
    }
  } catch (e) {}
  // Migració d'usuaris amb la pantalla antiga (notifications.js):
  // si trobem 'eatmefirst_notif_settings' amb l'esquema vell, en mapem
  // els valors a 'expiry' del nou sistema.
  try {
    const legacyRaw = localStorage.getItem('eatmefirst_notif_settings');
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy && (typeof legacy.dailyTime === 'string' || typeof legacy.notifyOnOpen === 'boolean')) {
        if (typeof legacy.enabled === 'boolean') smartNotifSettings.enabled = legacy.enabled;
        if (typeof legacy.dailyTime === 'string') {
          const hh = parseInt(legacy.dailyTime.split(':')[0], 10);
          if (isFinite(hh) && hh >= 0 && hh <= 23) smartNotifSettings.types.expiry.hour = hh;
        }
        saveSmartNotifSettings();
      }
    }
  } catch (e) {}
  return smartNotifSettings;
}

function saveSmartNotifSettings() {
  try {
    localStorage.setItem('eatmefirst_smart_notif_v2', JSON.stringify(smartNotifSettings));
  } catch (e) {}
}

function getSmartNotifSettings() {
  return JSON.parse(JSON.stringify(smartNotifSettings));
}

function setSmartNotifMaster(enabled) {
  smartNotifSettings.enabled = !!enabled;
  saveSmartNotifSettings();
}

function setSmartNotifType(typeId, partial) {
  if (!smartNotifSettings.types[typeId]) return;
  smartNotifSettings.types[typeId] = Object.assign({}, smartNotifSettings.types[typeId], partial);
  saveSmartNotifSettings();
}


// ============================================
//   LOG (per evitar repeticions el mateix dia)
// ============================================

function _todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function _readMap(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) { return {}; }
}

function _writeMap(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

// Manté només l'entrada d'avui (esborra dies vells per no acumular).
function _pruneToToday(map) {
  const today = _todayKey();
  const out = {};
  if (map[today]) out[today] = map[today];
  return out;
}

function shouldNotifyToday(typeId) {
  const log = _pruneToToday(_readMap('eatmefirst_smart_notif_log'));
  return !(log[_todayKey()] && log[_todayKey()][typeId]);
}

function markNotifiedToday(typeId) {
  const log = _pruneToToday(_readMap('eatmefirst_smart_notif_log'));
  const today = _todayKey();
  if (!log[today]) log[today] = {};
  log[today][typeId] = true;
  _writeMap('eatmefirst_smart_notif_log', log);
}

// ============================================
//   DESCART DE BANNERS
// ============================================
// Format: { bannerId: 'YYYY-MM-DD' } a 'eatmefirst_notif_dismissed'.
// El descart caduca a mitjanit — l'endemà el banner torna a sortir.
// Cada vegada que es llegeix el mapa, esborrem entrades amb data anterior
// a avui per no acumular brossa.

function _pruneDismissedToToday(map) {
  const today = _todayKey();
  const out = {};
  Object.keys(map || {}).forEach(id => {
    if (map[id] === today) out[id] = today;
  });
  return out;
}

function _readDismissed() {
  const raw = _readMap('eatmefirst_notif_dismissed');
  const pruned = _pruneDismissedToToday(raw);
  // Si hem netejat alguna entrada, persistim la versió neta.
  if (Object.keys(pruned).length !== Object.keys(raw || {}).length) {
    _writeMap('eatmefirst_notif_dismissed', pruned);
  }
  return pruned;
}

function isBannerDismissedToday(bannerId) {
  const map = _readDismissed();
  return map[bannerId] === _todayKey();
}

function dismissBanner(bannerId) {
  const map = _readDismissed();
  map[bannerId] = _todayKey();
  _writeMap('eatmefirst_notif_dismissed', map);
}

// Banners URGENTS: un per cada producte JA CADUCAT (daysUntilExpiry < 0).
// Es generen LIVE des de products[] cada vegada — no es desen a localStorage,
// no es poden descartar amb la X i no entren al log de descartats. Quan
// l'usuari fa una acció sobre el producte (consumir/llençar/esborrar) o
// modifica la data perquè ja no estigui caducat, el banner desapareix
// automàticament a la propera renderitzada.
function _computeUrgentBanners() {
  const list = _smartProducts();
  if (!list.length) return [];
  const out = [];
  list.forEach(p => {
    if (p.noExpiry || !p.date) return;
    const d = _smartDaysUntil(p.date);
    if (!isFinite(d) || d >= 0) return;
    const days = Math.abs(d);
    const dayWord = days === 1 ? 'dia' : 'dies';
    out.push({
      id: 'expired-' + p.id,
      type: 'expired',
      urgent: true,
      emoji: '🚨',
      productId: p.id,
      body: '🚨 Ja ha caducat fa ' + days + ' ' + dayWord + ': ' + (p.emoji || '') + ' ' + (p.name || ''),
      ts: Date.now()
    });
  });
  // Els més caducats primer
  out.sort((a, b) => {
    const pa = list.find(x => x.id === a.productId);
    const pb = list.find(x => x.id === b.productId);
    if (!pa || !pb) return 0;
    return _smartDaysUntil(pa.date) - _smartDaysUntil(pb.date);
  });
  return out;
}

// Banners NORMALS d'expiry: un per cada producte que caduca AVUI o DEMÀ.
// Cada banner té id 'expiry-{productId}' i es pot descartar individualment.
function _computeExpiryBanners() {
  const out = [];
  _smartProducts().forEach(p => {
    if (p.noExpiry || !p.date) return;
    const d = _smartDaysUntil(p.date);
    if (!isFinite(d)) return;
    let body, emoji;
    if (d === 0) {
      emoji = '🚨';
      body = "🚨 Avui caduca: " + (p.emoji || '') + ' ' + (p.name || '');
    } else if (d === 1) {
      emoji = '⏰';
      body = "⏰ Demà caduca: " + (p.emoji || '') + ' ' + (p.name || '');
    } else {
      return;
    }
    out.push({
      id: 'expiry-' + p.id,
      type: 'expiry',
      emoji: emoji,
      productId: p.id,
      body: body,
      _days: d
    });
  });
  out.sort((a, b) => a._days - b._days);
  return out;
}

function _isTypeEnabled(typeId) {
  if (!smartNotifSettings || !smartNotifSettings.enabled) return false;
  const cfg = smartNotifSettings.types && smartNotifSettings.types[typeId];
  return !!(cfg && cfg.enabled);
}

// Llista pública dels banners actius. ES GENERA EN VIU cada vegada — no
// depèn de l'hora del dia ni de cap cua emmagatzemada. Els únics filtres:
//   1) El tipus està activat a la configuració de l'usuari.
//   2) Per als no-urgents, no s'ha descartat avui.
//   3) Hi ha contingut rellevant (l'evaluador retorna payload).
// Els banners URGENTS (productes ja caducats) sempre passen aquests filtres.
function getActiveBanners() {
  const out = [];

  // 1. URGENTS — sempre visibles.
  out.push.apply(out, _computeUrgentBanners());

  // 2. EXPIRY (per producte que caduca avui o demà).
  if (_isTypeEnabled('expiry')) {
    _computeExpiryBanners().forEach(b => {
      if (!isBannerDismissedToday(b.id)) out.push(b);
    });
  }

  // 3. AGREGATS — un banner per tipus, descartable per dia.
  const aggregated = [
    { id: 'mealReminder',      eval: _evalMealReminder,      emoji: '💡' },
    { id: 'cookmeInspiration', eval: _evalCookmeInspiration, emoji: '🍳' },
    { id: 'shoppingPending',   eval: _evalShoppingPending,   emoji: '🛒' },
    { id: 'streakMotivation',  eval: _evalStreakMotivation,  emoji: '🔥' },
    { id: 'reactivation',      eval: _evalReactivation,      emoji: '👋' },
    { id: 'weeklyRecap',       eval: _evalWeeklyRecap,       emoji: '📊' },
    { id: 'badgeProgress',     eval: _evalBadgeProgress,     emoji: '🎯' }
  ];
  aggregated.forEach(item => {
    if (!_isTypeEnabled(item.id)) return;
    if (isBannerDismissedToday(item.id)) return;

    // Filtre semàntic addicional per a tipus amb dia configurat: el resum
    // setmanal només té sentit el dia configurat, no cada dia.
    if (item.id === 'weeklyRecap') {
      const cfg = smartNotifSettings.types[item.id];
      if (typeof cfg.day === 'number' && new Date().getDay() !== cfg.day) return;
    }

    let payload;
    try { payload = item.eval(); } catch (e) { payload = null; }
    if (!payload) return;
    out.push({
      id: item.id,
      type: item.id,
      emoji: item.emoji,
      title: payload.title,
      body: payload.body
    });
  });

  return out;
}


// ============================================
//   ENVIAR NOTIFICACIÓ (push + banner)
// ============================================

// Envia el push del sistema. Els banners de l'app són independents — es
// generen en viu via getActiveBanners(), per tant aquí NO es desa res al
// store de banners. La gate de "ja s'ha enviat avui" segueix activa per
// evitar push duplicats el mateix dia.
function sendSmartNotification(typeId, data) {
  if (typeof hasNotificationPermission === 'function' && hasNotificationPermission()) {
    const title = (data && data.title) || '🔔 Buyte';
    const body = (data && data.body) || '';
    try { window.Notif.showNotification(title, body, { tag: 'buyte-' + typeId }); }
    catch (e) {}
  }
  markNotifiedToday(typeId);
}


// ============================================
//   SCHEDULER
// ============================================

// La cita d'una notificació horària és vàlida si l'hora local actual és
// >= a l'hora configurada (HH:MM). (Es comprova si encara no s'ha enviat avui.)
function _timeReady(targetHour, targetMinute) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const tgtMin = (targetHour || 0) * 60 + (targetMinute || 0);
  return nowMin >= tgtMin;
}

function _isWeeklyDayReady(typeCfg) {
  const now = new Date();
  if (typeof typeCfg.day === 'number' && now.getDay() !== typeCfg.day) return false;
  return _timeReady(typeCfg.hour, typeCfg.minute);
}

// Scheduler central. Per a cada tipus actiu, comprova condicions
// temporals + condicions semàntiques (si toca enviar avui). Els
// disparadors per tipus es deleguen a evaluateNotificationType,
// implementat a la Phase 3.
function checkScheduledNotifications() {
  if (!smartNotifSettings.enabled) return;
  // Si tenim permisos denegats no enviem push, però SÍ podem alimentar banners.
  SMART_NOTIF_TYPES.forEach(meta => {
    const cfg = smartNotifSettings.types[meta.id];
    if (!cfg || !cfg.enabled) return;
    if (!shouldNotifyToday(meta.id)) return;

    // Filtre temporal segons la metadada del tipus
    if (meta.id === 'weeklyRecap') {
      if (!_isWeeklyDayReady(cfg)) return;
    } else if (meta.hasHour) {
      if (!_timeReady(cfg.hour, cfg.minute)) return;
    }

    // Avaluació semàntica + missatge final
    let payload = null;
    try {
      payload = (typeof evaluateNotificationType === 'function')
        ? evaluateNotificationType(meta.id, cfg)
        : null;
    } catch (e) { payload = null; }
    if (!payload) return;
    sendSmartNotification(meta.id, payload);
  });
}

// Engegada inicial + interval de 15 min mentre l'app està oberta.
function startSmartNotifScheduler() {
  if (smartNotifSchedulerId) clearInterval(smartNotifSchedulerId);
  // Comprovació immediata
  setTimeout(checkScheduledNotifications, 1500);
  // Després cada 15 minuts
  smartNotifSchedulerId = setInterval(checkScheduledNotifications, 15 * 60 * 1000);
}


// ============================================
//   AVALUADORS PER TIPUS (Phase 3)
// ============================================

// Helpers compartits
function _smartProducts() {
  return (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];
}

function _smartShoppingItems() {
  try {
    const raw = localStorage.getItem('eatmefirst_shopping_items');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}

function _smartHistory() {
  try {
    const raw = localStorage.getItem('eatmefirst_consumption_history');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}

function _smartDaysUntil(dateStr) {
  if (!dateStr) return Infinity;
  if (typeof daysUntil === 'function') return daysUntil(dateStr);
  // Fallback simple
  const target = new Date(dateStr);
  return Math.floor((target.getTime() - Date.now()) / 86400000);
}

// Top-level dispatcher cridat pel scheduler. Retorna `{title, body}` o null.
function evaluateNotificationType(typeId, cfg) {
  switch (typeId) {
    case 'expiry':            return _evalExpiry();
    case 'mealReminder':      return _evalMealReminder();
    case 'cookmeInspiration': return _evalCookmeInspiration();
    case 'shoppingPending':   return _evalShoppingPending();
    case 'streakMotivation':  return _evalStreakMotivation();
    case 'reactivation':      return _evalReactivation();
    case 'weeklyRecap':       return _evalWeeklyRecap();
    case 'badgeProgress':     return _evalBadgeProgress();
  }
  return null;
}

// 1. Caducitat imminent (avui o demà). Els ja caducats (d < 0) tenen el seu
// propi banner urgent gestionat a part — vegeu _evalExpiredProducts().
function _evalExpiry() {
  const today = [], tomorrow = [];
  _smartProducts().forEach(p => {
    if (p.noExpiry || !p.date) return;
    const d = _smartDaysUntil(p.date);
    if (!isFinite(d)) return;
    if (d === 0) today.push(p);
    else if (d === 1) tomorrow.push(p);
  });
  if (today.length === 0 && tomorrow.length === 0) return null;

  let body;
  if (today.length === 1 && tomorrow.length === 0) {
    body = '🚨 Avui caduca: ' + (today[0].emoji || '') + ' ' + (today[0].name || '');
  } else if (today.length > 1 && tomorrow.length === 0) {
    body = '🚨 Avui caduquen ' + today.length + ' productes';
  } else if (today.length === 0 && tomorrow.length === 1) {
    body = '⏰ Demà caduca: ' + (tomorrow[0].emoji || '') + ' ' + (tomorrow[0].name || '');
  } else if (today.length === 0 && tomorrow.length > 1) {
    body = '⏰ Demà caduquen ' + tomorrow.length + ' productes';
  } else {
    body = '⏰ ' + today.length + ' caduquen avui, ' + tomorrow.length + ' demà';
  }
  // Metadata per a la navegació del botó "Veure": un sol producte → detall;
  // múltiples → llista d'alertes (BiteMe).
  const all = today.concat(tomorrow);
  const meta = (all.length === 1)
    ? { productId: all[0].id }
    : { productIds: all.map(p => p.id) };
  return Object.assign({ title: '🚨 Buyte', body: body }, meta);
}

// 2. Recordatori del dinar (productes que caduquen aviat)
function _evalMealReminder() {
  const list = _smartProducts()
    .filter(p => !p.noExpiry && p.date)
    .map(p => ({ p, d: _smartDaysUntil(p.date) }))
    .filter(x => isFinite(x.d) && x.d >= 0 && x.d <= 5)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  if (list.length === 0) return null;
  const names = list.map(x => (x.p.emoji || '') + ' ' + (x.p.name || '') + ' (' + x.d + 'd)').join(', ');
  return { title: '💡 Buyte', body: '💡 Avui menja: ' + names };
}

// 3. Inspiració culinària (receptes que pots fer al 100%)
function _evalCookmeInspiration() {
  if (typeof getAllRecipes !== 'function' || typeof calculateRecipeMatch !== 'function') return null;
  const userProducts = _smartProducts();
  const recipes = getAllRecipes();
  const ready = recipes
    .map(r => ({ r, m: calculateRecipeMatch(r, userProducts) }))
    .filter(x => x.m && x.m.canMake);
  if (ready.length === 0) return null;
  let body;
  if (ready.length === 1) {
    body = "🍳 Avui pots fer '" + (ready[0].r.name || '') + "' amb el que tens";
  } else if (ready.length <= 3) {
    body = '🍳 Tens ' + ready.length + ' receptes a punt!';
  } else {
    body = '🍳 Tens ' + ready.length + ' receptes a punt — cuina alguna cosa avui!';
  }
  return { title: '🍳 Buyte', body: body };
}

// 4. Llista de la compra pendent (≥ 3 dies des de l'última actualització)
function _evalShoppingPending() {
  const items = _smartShoppingItems();
  if (items.length === 0) return null;
  const lastTs = items.reduce((mx, it) => Math.max(mx, it && it.addedAt ? it.addedAt : 0), 0);
  if (!lastTs) return null;
  const daysSince = Math.floor((Date.now() - lastTs) / 86400000);
  if (daysSince < 3) return null;
  return { title: '🛒 Buyte', body: '🛒 Tens ' + items.length + ' productes pendents al BuyMe' };
}

// 5. Motivació i ratxa: notifiquem en fites o quan estem a 1 dia d'una fita.
function _evalStreakMotivation() {
  if (typeof computeStreak !== 'function') return null;
  const streak = computeStreak(_smartHistory());
  if (!isFinite(streak) || streak < 1) return null;
  const milestones = [3, 7, 15, 30, 60, 100, 365];
  const isMilestone = milestones.includes(streak);
  const next = milestones.find(m => m > streak);
  const oneAway = next && (next - streak === 1);
  if (!isMilestone && !oneAway) return null;
  const body = isMilestone
    ? '🔥 ' + streak + ' dies sense malgastar! Mantén la ratxa!'
    : '🔥 ' + streak + ' dies! Demà arribes a ' + next + '!';
  return { title: '🔥 Buyte', body: body };
}

// 6. Reactivació: l'usuari no ha obert l'app fa ≥ 3 dies
function _evalReactivation() {
  const lastOpen = localStorage.getItem('eatmefirst_last_open');
  if (!lastOpen) return null; // primera vegada — no notifiquem
  const lastDate = new Date(lastOpen);
  if (isNaN(lastDate.getTime())) return null;
  const days = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
  if (days < 3) return null;
  // Compta productes propers a caducar per reforçar el motiu de tornar
  const expiring = _smartProducts().filter(p => {
    if (p.noExpiry || !p.date) return false;
    const d = _smartDaysUntil(p.date);
    return isFinite(d) && d <= 3;
  }).length;
  let body;
  if (expiring > 0) {
    body = '👋 Tens ' + expiring + (expiring === 1 ? ' producte' : ' productes') + ' que caduquen aviat. Vine a veure\'ls!';
  } else {
    body = "👋 Fa " + days + " dies que no obres l'app. Tot bé pel rebost?";
  }
  return { title: '👋 Buyte', body: body };
}

// 7. Resum setmanal (cada diumenge a la nit per defecte)
function _evalWeeklyRecap() {
  const history = _smartHistory();
  const oneWeekAgo = Date.now() - 7 * 86400000;
  const week = history.filter(e => {
    const t = new Date(e.date).getTime();
    return isFinite(t) && t >= oneWeekAgo;
  });
  if (week.length === 0) return null;
  let saved = 0, wasted = 0;
  let consumedCount = 0, totalCount = 0;
  week.forEach(e => {
    if (typeof entryAsProduct !== 'function' || typeof getProductPrice !== 'function' || typeof entryFactor !== 'function') return;
    const product = entryAsProduct(e);
    const total = getProductPrice(product) || 0;
    const factor = entryFactor(e);
    if (e.action === 'consumed') { saved += total * factor; consumedCount++; totalCount++; }
    else if (e.action === 'trashed') { wasted += total * factor; totalCount++; }
  });
  if (totalCount === 0) return null;
  const pct = Math.round((consumedCount / totalCount) * 100);
  const fmt = (n) => (Math.round(n * 100) / 100).toString().replace('.', ',');
  return {
    title: '📊 Buyte',
    body: '📊 Aquesta setmana: ' + fmt(saved) + '€ aprofitats, ' + pct + '% aprofitament'
  };
}

// 8. Insignies properes (>=80% però no desbloquejada)
function _evalBadgeProgress() {
  if (typeof BADGES === 'undefined' || typeof computeGamificationStats !== 'function' || typeof evaluateBadge !== 'function') return null;
  const stats = computeGamificationStats();
  let best = null;
  BADGES.forEach(b => {
    if (typeof isBadgeUnlocked === 'function' && isBadgeUnlocked(b.id)) return;
    const ev = evaluateBadge(b, stats);
    if (!ev || !ev.hasProgress) return;
    if (ev.percent >= 80 && ev.percent < 100) {
      if (!best || ev.percent > best.percent) best = { badge: b, ev: ev };
    }
  });
  if (!best) return null;
  const remaining = Math.max(1, best.ev.target - best.ev.current);
  return {
    title: '🎯 Buyte',
    body: "🎯 Estàs a " + Math.ceil(remaining) + " d'aconseguir '" + best.badge.name + "'!"
  };
}


// ============================================
//   BANNERS A LA HOME (Phase 4)
// ============================================

// Mapa: banner → acció al botó "Veure".
// El banner pot tenir productId (un sol producte) o productIds (múltiples).
function _smartBannerAction(banner) {
  // Banners URGENTS (productes ja caducats) sempre van al detall del producte.
  if (banner.urgent && banner.productId) {
    return () => {
      const list = (typeof products !== 'undefined') ? products : [];
      const p = list.find(x => x.id === banner.productId);
      if (p && typeof openProductDetail === 'function') {
        openProductDetail(p, 'home');
      } else {
        // Si ja no existeix, només refresquem (el banner desapareixerà sol).
        if (typeof renderSmartNotifBanners === 'function') renderSmartNotifBanners();
      }
    };
  }
  const typeId = banner.type;
  switch (typeId) {
    case 'expiry': {
      // 1 producte → detall; >1 → pantalla d'alertes (productes urgents).
      if (banner.productId) {
        return () => {
          const list = (typeof products !== 'undefined') ? products : [];
          const p = list.find(x => x.id === banner.productId);
          if (p && typeof openProductDetail === 'function') {
            openProductDetail(p, 'home');
          } else {
            // Producte ja no existeix — caigut a la llista general.
            if (typeof renderAlerts === 'function') renderAlerts();
            showScreen('alerts');
          }
        };
      }
      return () => {
        if (typeof renderAlerts === 'function') renderAlerts();
        showScreen('alerts');
      };
    }
    case 'mealReminder':
      return () => {
        // BiteMe → "Veure-ho tot" ordenat per caducitat (els més imminents a dalt).
        if (typeof viewAllSortMode !== 'undefined') viewAllSortMode = 'expiry';
        if (typeof openViewAll === 'function') openViewAll();
        else { if (typeof renderViewAll === 'function') renderViewAll(); showScreen('view-all'); }
      };
    case 'cookmeInspiration':
      return () => {
        // CookMe filtre "Disponibles".
        if (typeof setRecipeFilter === 'function') setRecipeFilter('available');
        else if (typeof currentRecipeFilter !== 'undefined') currentRecipeFilter = 'available';
        if (typeof openCookMe === 'function') openCookMe();
      };
    case 'shoppingPending':
      return () => {
        if (typeof openShoppingList === 'function') openShoppingList();
        else showScreen('shopping');
      };
    case 'streakMotivation':
    case 'badgeProgress':
      return () => {
        if (typeof openAchievements === 'function') openAchievements();
      };
    case 'weeklyRecap':
      return () => {
        if (typeof openImpact === 'function') openImpact();
        else showScreen('impact');
      };
    case 'reactivation':
      // Tornar al launcher (home de l'app).
      return () => { showScreen('launcher'); };
    default:
      return null;
  }
}

function renderSmartNotifBanners() {
  const container = document.getElementById('smart-notif-banners');
  if (!container) return;
  const banners = getActiveBanners();
  container.innerHTML = '';
  if (banners.length === 0) return;

  banners.forEach(b => {
    const card = document.createElement('div');
    card.className = 'smart-notif-banner' + (b.urgent ? ' smart-notif-banner-urgent' : ' smart-notif-banner-normal');
    card.dataset.type = b.type;

    const action = _smartBannerAction(b);
    const seeBtn = action
      ? '<button type="button" class="smart-notif-banner-see" data-action="see">' + escapeHtml(t('notifBannerSee')) + '</button>'
      : '';
    // Els banners URGENTS no es poden tancar amb X — només desapareixen quan
    // l'usuari fa una acció sobre el producte.
    const closeBtn = b.urgent
      ? ''
      : '<button type="button" class="smart-notif-banner-close" data-action="close" aria-label="Close">✕</button>';

    card.innerHTML =
      '<div class="smart-notif-banner-icon">' + (b.emoji || '🔔') + '</div>' +
      '<div class="smart-notif-banner-msg">' + escapeHtml(b.body || '') + '</div>' +
      seeBtn +
      closeBtn;
    container.appendChild(card);

    if (action) {
      card.querySelector('[data-action="see"]').addEventListener('click', () => {
        // Els urgents no es marquen com a descartats — han de tornar a sortir
        // si l'usuari només mira però no actua.
        if (!b.urgent) dismissBanner(b.id);
        action();
      });
    }
    if (!b.urgent) {
      const closeEl = card.querySelector('[data-action="close"]');
      if (closeEl) closeEl.addEventListener('click', () => {
        dismissBanner(b.id);
        renderSmartNotifBanners();
      });
    }
  });
}


// ============================================
//   INICIALITZACIÓ
// ============================================

function initSmartNotifications() {
  loadSmartNotifSettings();
  // Marca l'última obertura per al disparador 'reactivation' (per la propera vegada).
  try { localStorage.setItem('eatmefirst_last_open', _todayKey()); } catch (e) {}

  // Neteja les entrades de descart d'altres dies — el descart caduca a
  // mitjanit. Si l'usuari va descartar un banner ahir, avui ha de tornar
  // a sortir. Aquest pas és redundant amb la prune-on-read, però fa la
  // intenció explícita en la inicialització.
  _readDismissed();

  // Defensiu: si la versió antiga (notifications.js) tenia el seu scheduler
  // engegat, l'aturem perquè no entri en col·lisió amb el nou. Mantenim
  // accés a window.Notif per al low-level (showNotification, permisos).
  if (typeof window !== 'undefined' && window.Notif && typeof window.Notif.scheduleDaily === 'function') {
    window.Notif.scheduleDaily = function () {};
  }

  startSmartNotifScheduler();

  // Quan l'usuari torna a la pestanya, reavaluem (potser ha canviat l'hora del dia).
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkScheduledNotifications();
    });
  }
}
