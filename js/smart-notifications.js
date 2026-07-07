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
    expiry:             { enabled: true,  hour: 9,  minute: 0 },
    mealReminder:       { enabled: true,  hour: 11, minute: 0 },
    cookmeInspiration:  { enabled: true,  hour: 18, minute: 0 },
    shoppingPending:    { enabled: false, hour: 18, minute: 0 },
    streakMotivation:   { enabled: true,  hour: 21, minute: 0 },
    reactivation:       { enabled: true,  hour: 10, minute: 0 },
    weeklyRecap:        { enabled: true,  day: 0,  hour: 19, minute: 0 }, // 0 = diumenge
    badgeProgress:      { enabled: true,  hour: 12, minute: 0 },
    patternSuggestions: { enabled: true,  day: 1,  hour: 12, minute: 0 }, // 1 = dilluns (dia fix)
    rebuyOverdue:       { enabled: true,  hour: 10, minute: 0 },
    budgetAlert:        { enabled: true,  hour: 10, minute: 0 },
    lowStock:           { enabled: true,  hour: 10, minute: 0 },
    weeklyPlanReminder: { enabled: true,  day: 6,  hour: 10, minute: 0 }  // 6 = dissabte
  }
};

// Lista en ordre fix: serveix tant per al render de la pantalla de
// configuració com per al scheduler. Cada entrada inclou les metadades
// que la UI ha de mostrar. Tots els tipus tenen hora configurable.
// `hasDay: true` = dia configurable (UI mostra picker). `fixedDay` = dia
// imposat: la lògica filtra per aquest dia, però la UI no mostra picker.
const SMART_NOTIF_TYPES = [
  { id: 'expiry',             emoji: '🚨', i18n: 'notifTypeExpiry',            hasHour: true,  hasDay: false },
  { id: 'mealReminder',       emoji: '💡', i18n: 'notifTypeMealReminder',      hasHour: true,  hasDay: false },
  { id: 'cookmeInspiration',  emoji: '🍳', i18n: 'notifTypeCookme',            hasHour: true,  hasDay: false },
  { id: 'shoppingPending',    emoji: '🛒', i18n: 'notifTypeShoppingPending',   hasHour: true,  hasDay: false },
  { id: 'streakMotivation',   emoji: '🔥', i18n: 'notifTypeStreak',            hasHour: true,  hasDay: false },
  { id: 'reactivation',       emoji: '👋', i18n: 'notifTypeReactivation',      hasHour: true,  hasDay: false },
  { id: 'weeklyRecap',        emoji: '📊', i18n: 'notifTypeWeekly',            hasHour: true,  hasDay: true  },
  { id: 'badgeProgress',      emoji: '🎯', i18n: 'notifTypeBadge',             hasHour: true,  hasDay: false },
  { id: 'patternSuggestions', emoji: '🧠', i18n: 'notifTypePatternSuggestions', hasHour: true, hasDay: false, fixedDay: 1 },
  { id: 'rebuyOverdue',       emoji: '🔄', i18n: 'notifTypeRebuy',              hasHour: true,  hasDay: false },
  { id: 'budgetAlert',        emoji: '💰', i18n: 'notifTypeBudget',             hasHour: true,  hasDay: false },
  { id: 'lowStock',           emoji: '📉', i18n: 'notifTypeLowStock',           hasHour: true,  hasDay: false },
  { id: 'weeklyPlanReminder', emoji: '📅', i18n: 'notifTypeWeeklyPlan',         hasHour: true,  hasDay: true  }
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
  // Descartar el banner de pressupost també reconeix el nivell actual del
  // mes (perquè no reaparegui demà, encara que el push estigui desactivat).
  if (bannerId === 'budgetAlert' && typeof _budgetSpendAndLevel === 'function') {
    _ackBudgetLevel(_budgetSpendAndLevel().level);
  }
  // Descartar el banner d'estoc baix reconeix el conjunt actual de low-stock.
  if (bannerId === 'lowStock') {
    _ackLowStock();
  }
}

// Banners de productes JA CADUCATS (daysUntilExpiry < 0). Es generen LIVE
// des de products[] cada vegada. Visualment van marcats amb la classe
// 'expired' (vermell més fort) per remarcar la urgència, però es
// comporten com qualsevol altre banner: es poden descartar amb la X i
// tornen a sortir l'endemà si el producte continua existint i caducat.
// Si l'usuari consumeix/llença/esborra el producte o n'edita la data a
// futur, el banner desapareix sol a la propera renderitzada (perquè ja
// no compleix la condició d < 0).
function _computeExpiredBanners() {
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
      emoji: '🚨',
      productId: p.id,
      body: '🚨 Ja ha caducat fa ' + days + ' ' + dayWord + ': ' + (p.emoji || '') + ' ' + (p.name || ''),
      _days: d
    });
  });
  // Els més caducats primer
  out.sort((a, b) => a._days - b._days);
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
//   1) El tipus està activat a la configuració de l'usuari (per als
//      banners de caducitat tant 'expired' com 'expiry' depenen del toggle
//      'expiry').
//   2) No s'ha descartat avui.
//   3) Hi ha contingut rellevant (l'evaluador retorna payload).
function getActiveBanners() {
  const out = [];

  // 1. EXPIRED (per producte ja caducat). Es comporta com qualsevol altre
  //    banner — descartable amb X, torna l'endemà. Si N≥3 productes ja
  //    caducats, mostrem 1 banner agregat enlloc de N individuals per
  //    reduir soroll al home menu. Click → #screen-alerts (la llista
  //    ordenada per urgència gestiona ella mateixa el filtre visual).
  if (_isTypeEnabled('expiry')) {
    const expiredList = _computeExpiredBanners();
    if (expiredList.length >= 3) {
      const aggId = 'expired-aggregated';
      if (!isBannerDismissedToday(aggId)) {
        out.push({
          id: aggId,
          type: 'expired',
          emoji: '🚨',
          body: '🚨 ' + expiredList.length + ' productes ja han caducat'
          // sense productId → el banner action obrirà #screen-alerts.
          // Dismiss de l'agregat NO afecta els dismisses individuals
          // (ids diferents), i viceversa.
        });
      }
    } else {
      // 1 o 2 productes: comportament individual com fins ara.
      expiredList.forEach(b => {
        if (!isBannerDismissedToday(b.id)) out.push(b);
      });
    }
  }

  // 2. EXPIRY (per producte que caduca avui o demà). Avui (d=0) i demà
  //    (d=1) s'agreguen per separat: si un dels dos grups té N≥3, es
  //    mostra 1 banner agregat d'aquell grup. Pots tenir mix: 2 avui
  //    individuals + 1 agregat "5 demà".
  if (_isTypeEnabled('expiry')) {
    const expiryList = _computeExpiryBanners();
    const today = expiryList.filter(b => b._days === 0);
    const tomorrow = expiryList.filter(b => b._days === 1);

    // Avui
    if (today.length >= 3) {
      const aggId = 'expiry-today-aggregated';
      if (!isBannerDismissedToday(aggId)) {
        out.push({
          id: aggId,
          type: 'expiry',
          emoji: '🚨',
          body: '🚨 ' + today.length + ' productes caduquen avui'
        });
      }
    } else {
      today.forEach(b => { if (!isBannerDismissedToday(b.id)) out.push(b); });
    }

    // Demà
    if (tomorrow.length >= 3) {
      const aggId = 'expiry-tomorrow-aggregated';
      if (!isBannerDismissedToday(aggId)) {
        out.push({
          id: aggId,
          type: 'expiry',
          emoji: '⏰',
          body: '⏰ ' + tomorrow.length + ' productes caduquen demà'
        });
      }
    } else {
      tomorrow.forEach(b => { if (!isBannerDismissedToday(b.id)) out.push(b); });
    }
  }

  // 3. AGREGATS — un banner per tipus, descartable per dia.
  const aggregated = [
    { id: 'mealReminder',      eval: _evalMealReminder,      emoji: '💡' },
    { id: 'cookmeInspiration', eval: _evalCookmeInspiration, emoji: '🍳' },
    { id: 'shoppingPending',   eval: _evalShoppingPending,   emoji: '🛒' },
    { id: 'streakMotivation',  eval: _evalStreakMotivation,  emoji: '🔥' },
    { id: 'reactivation',      eval: _evalReactivation,      emoji: '👋' },
    { id: 'weeklyRecap',       eval: _evalWeeklyRecap,       emoji: '📊' },
    { id: 'badgeProgress',     eval: _evalBadgeProgress,     emoji: '🎯' },
    { id: 'rebuyOverdue',      eval: _evalRebuyOverdue,      emoji: '🔄' },
    { id: 'budgetAlert',       eval: _evalBudgetAlert,       emoji: '💰' },
    { id: 'lowStock',          eval: _evalLowStock,          emoji: '📉' },
    { id: 'weeklyPlanReminder', eval: _evalWeeklyPlanReminder, emoji: '📅' }
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
    // El recordatori de compra de la setmana vinent es mostra tot el cap de
    // setmana: del dia configurat (dissabte) fins diumenge.
    if (item.id === 'weeklyPlanReminder') {
      const cfg = smartNotifSettings.types[item.id];
      const dow = new Date().getDay(); // 0=Diu … 6=Dis
      const startDay = (typeof cfg.day === 'number') ? cfg.day : 6;
      if (dow !== 0 && dow < startDay) return;
    }

    let payload;
    try { payload = item.eval(); } catch (e) { payload = null; }
    if (!payload) return;
    const banner = {
      id: item.id,
      type: item.id,
      emoji: item.emoji,
      title: payload.title,
      body: payload.body
    };
    // Meta opcional del payload (p. ex. rebuyOverdue: producte a recomprar)
    // perquè l'acció "Veure" pugui afegir-lo al BuyMe.
    if (payload.name) banner.name = payload.name;
    if (payload.popularId) banner.popularId = payload.popularId;
    if (payload.emoji) banner.productEmoji = payload.emoji;
    if (typeof payload.level === 'number') banner.level = payload.level;
    if (Array.isArray(payload.lowIds)) banner.lowIds = payload.lowIds;
    if (payload.weekId) banner.weekId = payload.weekId;
    out.push(banner);
  });

  // 4. PATTERN-SUGGESTION — màxim 1 banner. Sempre s'afegeix DESPRÉS dels
  //    altres tipus per no saturar; només mostra HIGH no descartats avui.
  if (typeof getHighPrioritySuggestions === 'function') {
    try {
      const high = getHighPrioritySuggestions();
      for (let i = 0; i < high.length; i++) {
        const s = high[i];
        const bid = 'pattern-suggestion-' + s.id;
        if (isBannerDismissedToday(bid)) continue;
        out.push({
          id: bid,
          type: 'pattern-suggestion',
          emoji: '🧠',
          body: '🧠 ' + (s.title || 'Tinc un suggeriment per tu'),
          patternId: s.id
        });
        break; // només 1
      }
    } catch (e) {}
  }

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
  // Reconeixement del nivell de pressupost: en enviar el push, marquem el
  // nivell del mes perquè no es repeteixi (vegeu _evalBudgetAlert).
  if (typeId === 'budgetAlert' && data && typeof data.level === 'number') {
    _ackBudgetLevel(data.level);
  }
  // Reconeixement del conjunt de low-stock en enviar el push.
  if (typeId === 'lowStock' && data && Array.isArray(data.lowIds)) {
    _ackLowStock(data.lowIds);
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
    if (meta.id === 'weeklyRecap' || meta.id === 'weeklyPlanReminder') {
      if (!_isWeeklyDayReady(cfg)) return;
    } else if (typeof meta.fixedDay === 'number') {
      // Dia imposat (ex: patternSuggestions només dilluns).
      if (new Date().getDay() !== meta.fixedDay) return;
      if (!_timeReady(cfg.hour, cfg.minute)) return;
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
    case 'patternSuggestions': return _evalPatternSuggestions();
    case 'rebuyOverdue':      return _evalRebuyOverdue();
    case 'budgetAlert':       return _evalBudgetAlert();
    case 'lowStock':          return _evalLowStock();
    case 'weeklyPlanReminder': return _evalWeeklyPlanReminder();
  }
  return null;
}

// 1. Caducitat imminent (avui o demà). Els ja caducats (d < 0) tenen el seu
// propi banner per producte gestionat a part — vegeu _computeExpiredBanners().
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
  // múltiples → llista d'alertes (EatMe).
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
  return { title: '💡 Buyte', body: '💡 Avui consumeix: ' + names };
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
  return { title: '🛒 Festuc', body: '🛒 Tens ' + items.length + " productes pendents a Compra'm" };
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

// 9. Suggeriments intel·ligents de patrons (cada dilluns).
// Només envia si hi ha algun suggeriment HIGH no aplicat ni descartat.
function _evalPatternSuggestions() {
  if (typeof getHighPrioritySuggestions !== 'function') return null;
  let high = [];
  try { high = getHighPrioritySuggestions(); } catch (e) { return null; }
  if (!high || high.length === 0) return null;
  return {
    title: '🧠 Buyte',
    body: '🧠 He après alguna cosa de tu! Tinc un suggeriment per estalviar.'
  };
}

// 10. Re-compra endarrerida ("fa X que no compres [habitual]"). Sobre
// purchase_history REAL: per a cada producte amb ≥3 compres, calcula la
// mediana dels intervals i avisa si fa molt que no se'n compra. Guardes:
// mediana ∈ [3,45] dies; descarta abandonats (daysSince > mediana×3);
// endarrerit si daysSince > mediana×1.3; omet si ja és al BuyMe.
function _rebuyMedian(arr) {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function _evalRebuyOverdue() {
  let history = {};
  try {
    const raw = localStorage.getItem('eatmefirst_purchase_history');
    if (raw) history = JSON.parse(raw) || {};
  } catch (e) { history = {}; }
  if (!history || typeof history !== 'object') return null;

  const populars = (typeof getPopularProducts === 'function') ? (getPopularProducts() || []) : [];
  const popById = {};
  populars.forEach(p => { if (p && p.id) popById[p.id] = p; });
  const shopping = _smartShoppingItems();
  const REBUY_FACTOR = 1.3;
  const todayMs = Date.now();

  // Ja al BuyMe? (match canònic si està disponible, si no per nom normalitzat)
  const _alreadyInBuyMe = (name) => {
    return shopping.some(it => {
      if (!it || !it.name) return false;
      if (typeof cookmeSameProduct === 'function') return cookmeSameProduct(name, it.name);
      return String(it.name).toLowerCase().trim() === String(name).toLowerCase().trim();
    });
  };

  let best = null; // { name, emoji, popularId, daysSince, ratio }
  Object.keys(history).forEach(key => {
    const records = Array.isArray(history[key]) ? history[key] : [];
    if (records.length < 3) return;
    // Dates (ms) ordenades asc.
    const times = records
      .map(r => r && r.date ? new Date(r.date).getTime() : NaN)
      .filter(t => isFinite(t))
      .sort((a, b) => a - b);
    if (times.length < 3) return;
    const intervals = [];
    for (let i = 1; i < times.length; i++) intervals.push((times[i] - times[i - 1]) / 86400000);
    const median = _rebuyMedian(intervals);
    if (median == null || median < 3 || median > 45) return; // banda sana
    const daysSince = Math.floor((todayMs - times[times.length - 1]) / 86400000);
    if (daysSince > median * 3) return;        // abandonat → no insistir
    if (daysSince <= median * REBUY_FACTOR) return; // encara dins de cadència

    // Resol nom + emoji
    const pop = popById[key];
    const name = pop ? pop.name : _capitalizeFirst(key);
    const emoji = pop ? (pop.emoji || '🛒') : '🛒';
    if (_alreadyInBuyMe(name)) return;          // ja el compra

    const ratio = daysSince / median;
    if (!best || ratio > best.ratio) {
      best = { name: name, emoji: emoji, popularId: pop ? pop.id : null, daysSince: daysSince, ratio: ratio };
    }
  });

  if (!best) return null;
  return {
    title: '🔄 Buyte',
    body: '🔄 Fa ' + best.daysSince + ' dies que no compres ' + best.emoji + ' ' + best.name,
    name: best.name,
    emoji: best.emoji,
    popularId: best.popularId
  };
}

// Capitalitza la primera lletra (per a claus que són noms, no popularId).
function _capitalizeFirst(s) {
  const str = String(s || '').trim();
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 11. Avís de pressupost mensual (80% / 100%). Helper compartit:
// despesa del MES NATURAL en curs (suma purchase_history, preu per-unitat,
// mateixa base que la pantalla Despeses) + nivell creuat.
function _budgetMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function _budgetSpendAndLevel() {
  const budget = Number(localStorage.getItem('eatmefirst_monthly_budget')) || 0;
  if (budget <= 0) return { budget: 0, monthSpent: 0, pct: 0, level: 0 };
  let history = {};
  try {
    const raw = localStorage.getItem('eatmefirst_purchase_history');
    if (raw) history = JSON.parse(raw) || {};
  } catch (e) { history = {}; }
  const monthPrefix = _budgetMonthKey(); // 'YYYY-MM'
  let monthSpent = 0;
  Object.keys(history).forEach(key => {
    const list = Array.isArray(history[key]) ? history[key] : [];
    list.forEach(r => {
      if (!r || typeof r.date !== 'string') return;
      if (r.date.slice(0, 7) !== monthPrefix) return;
      if (typeof r.price === 'number') monthSpent += r.price;
    });
  });
  const pct = budget > 0 ? Math.round((monthSpent / budget) * 100) : 0;
  const level = pct >= 100 ? 100 : (pct >= 80 ? 80 : 0);
  return { budget: budget, monthSpent: monthSpent, pct: pct, level: level };
}

function _evalBudgetAlert() {
  const info = _budgetSpendAndLevel();
  if (info.budget <= 0 || info.level === 0) return null;
  // Dedup per (mes + nivell): no repetir l'avís d'un nivell ja reconegut
  // aquest mes. L'state s'escriu fora de l'_eval (push-send / dismiss).
  let state = {};
  try {
    const raw = localStorage.getItem('eatmefirst_budget_alert_state');
    if (raw) state = JSON.parse(raw) || {};
  } catch (e) { state = {}; }
  const acked = (state && state.month === _budgetMonthKey() && typeof state.level === 'number') ? state.level : 0;
  if (info.level <= acked) return null;

  const eur = (n) => (typeof fmtEur === 'function') ? fmtEur(n) : (Math.round(n * 100) / 100) + '€';
  let body;
  if (info.level === 100) {
    body = '💰 Has superat el pressupost (' + eur(info.monthSpent) + ' de ' + eur(info.budget) + ')';
  } else {
    body = '💰 Has gastat el ' + info.pct + '% del pressupost (' + eur(info.monthSpent) + ' de ' + eur(info.budget) + ')';
  }
  return { title: '💰 Buyte', body: body, level: info.level };
}

// Escriu l'state de reconeixement del nivell de pressupost (mes actual).
function _ackBudgetLevel(level) {
  if (!level) return;
  try {
    localStorage.setItem('eatmefirst_budget_alert_state', JSON.stringify({ month: _budgetMonthKey(), level: level }));
  } catch (e) {}
}

// 12. Estoc baix (lowStock). Foto explícita dels productes sota el llindar
// (getLowStockProducts a biteme.js). Dedup per SIGNATURA del conjunt: només
// re-avisa quan apareix algun producte NOU sota mínim; els que es recuperen
// surten del conjunt sol (l'ack escriu el conjunt actual). Pur (no escriu).
function _evalLowStock() {
  const low = (typeof getLowStockProducts === 'function') ? getLowStockProducts() : [];
  if (!low.length) return null;
  let acked = [];
  try {
    const raw = localStorage.getItem('eatmefirst_lowstock_alert_state');
    if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.ids)) acked = s.ids; }
  } catch (e) { acked = []; }
  const ackedSet = new Set(acked);
  const hasNew = low.some(p => !ackedSet.has(p.id));
  if (!hasNew) return null; // tots els low ja reconeguts → no re-avisar

  let body;
  if (low.length === 1) {
    body = '📉 Et queda poc de ' + (low[0].emoji || '📦') + ' ' + (low[0].name || '');
  } else {
    body = '📉 ' + low.length + ' productes sota l\'estoc mínim';
  }
  return { title: '📉 Buyte', body: body, lowIds: low.map(p => p.id) };
}

// Reconeix el conjunt de low-stock (overwrite). Escrit fora de _eval
// (push-send / dismiss). Si no es passen ids, captura el conjunt actual.
function _ackLowStock(ids) {
  let list = ids;
  if (!Array.isArray(list)) {
    list = (typeof getLowStockProducts === 'function') ? getLowStockProducts().map(p => p.id) : [];
  }
  try {
    localStorage.setItem('eatmefirst_lowstock_alert_state', JSON.stringify({ ids: list }));
  } catch (e) {}
}

// 13. Recordatori de compra de la setmana planificada VINENT: si la setmana
// vinent té pla (≥1 recepta) i encara no s'ha generat la compra. Pur (no
// escriu). El dedup és el flag mpIsShoppingDone(weekId) + el gate de dia
// (dissabte per defecte) → es reseteja sol cada setmana.
function _evalWeeklyPlanReminder() {
  if (typeof mpNextWeekId !== 'function' || typeof mpWeekHasPlan !== 'function' || typeof mpIsShoppingDone !== 'function') return null;
  const wId = mpNextWeekId();
  if (!mpWeekHasPlan(wId)) return null;     // la setmana vinent no té cap recepta
  if (mpIsShoppingDone(wId)) return null;   // ja s'ha generat la compra
  return {
    title: '📅 Buyte',
    body: '📅 Tens menús per a la setmana vinent — vols generar la compra?',
    weekId: wId
  };
}


// ============================================
//   BANNERS A LA HOME (Phase 4)
// ============================================

// Mapa: banner → acció al botó "Veure".
// El banner pot tenir productId (un sol producte) o productIds (múltiples).
function _smartBannerAction(banner) {
  const typeId = banner.type;
  switch (typeId) {
    case 'expired': {
      // Individual (té productId): porta al detall del producte.
      // Agregat (sense productId, N≥3 productes caducats): porta a la
      // llista d'alertes amb back="launcher" (mateix patró que els
      // altres banners agregats — vegeu a1492f9).
      return () => {
        if (banner.productId) {
          const list = (typeof products !== 'undefined') ? products : [];
          const p = list.find(x => x.id === banner.productId);
          if (p && typeof openProductDetail === 'function') {
            openProductDetail(p, 'home');
            return;
          }
          // Producte ja no existeix — fall-through a la llista d'alertes.
        }
        if (typeof renderAlerts === 'function') renderAlerts();
        showScreen('alerts');
        const _b = document.querySelector('#screen-alerts .back-btn');
        if (_b) _b.dataset.back = 'launcher';
      };
    }
    case 'expiry': {
      // 1 producte → detall; >1 → pantalla d'alertes (productes urgents).
      // En tots dos casos l'usuari ve del launcher (banner), no de
      // #screen-home → forcem el back-btn al launcher perquè tornar
      // no caigui a l'EatMe intern. Vegeu el diagnòstic complet al
      // commit message.
      if (banner.productId) {
        return () => {
          const list = (typeof products !== 'undefined') ? products : [];
          const p = list.find(x => x.id === banner.productId);
          if (p && typeof openProductDetail === 'function') {
            // 'launcher' enlloc de 'home' — el banner viu al launcher.
            openProductDetail(p, 'launcher');
          } else {
            // Producte ja no existeix — caigut a la llista general.
            if (typeof renderAlerts === 'function') renderAlerts();
            showScreen('alerts');
            const _b = document.querySelector('#screen-alerts .back-btn');
            if (_b) _b.dataset.back = 'launcher';
          }
        };
      }
      return () => {
        if (typeof renderAlerts === 'function') renderAlerts();
        showScreen('alerts');
        // #screen-alerts té data-back="home" hardcoded a HTML per a la
        // navegació interna d'EatMe (#screen-home → Alertes). Quan
        // s'entra des del banner del launcher cal sobreescriure-ho.
        const _b = document.querySelector('#screen-alerts .back-btn');
        if (_b) _b.dataset.back = 'launcher';
      };
    }
    case 'mealReminder':
      return () => {
        // EatMe → "Veure-ho tot" ordenat per caducitat (els més imminents a dalt).
        if (typeof viewAllSortMode !== 'undefined') viewAllSortMode = 'expiry';
        if (typeof openViewAll === 'function') openViewAll();
        else { if (typeof renderViewAll === 'function') renderViewAll(); showScreen('view-all'); }
        // Mateix patró que 'expiry': el back-btn de #screen-view-all
        // té data-back="home" per a navegació interna d'EatMe. Quan
        // s'entra des del banner del launcher cal apuntar al launcher.
        const _b = document.querySelector('#screen-view-all .back-btn');
        if (_b) _b.dataset.back = 'launcher';
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
        // #screen-achievements té data-back="impact" hardcoded per a
        // la navegació normal (Settings → Activitat → Impacte → Èxits).
        // Quan s'entra des del banner del launcher cal apuntar al
        // launcher directament. Mateix patró que a1492f9 / b9afe7c.
        const _b = document.querySelector('#screen-achievements .back-btn');
        if (_b) _b.dataset.back = 'launcher';
      };
    case 'weeklyRecap':
      return () => {
        if (typeof openImpact === 'function') openImpact();
        else showScreen('impact');
        // #screen-impact té data-back="settings" hardcoded per a la
        // navegació normal des de Configuració. Quan s'entra des del
        // banner del launcher cal apuntar al launcher.
        const _b = document.querySelector('#screen-impact .back-btn');
        if (_b) _b.dataset.back = 'launcher';
      };
    case 'reactivation':
      // Tornar al launcher (home de l'app).
      return () => { showScreen('launcher'); };
    case 'budgetAlert':
      // Obre Despeses (la card de pressupost). Com que el banner viu al
      // launcher, forcem el back a 'launcher' (mateix patró que weeklyRecap).
      return () => {
        if (typeof openExpenses === 'function') openExpenses();
        else showScreen('expenses');
        const _b = document.querySelector('#screen-expenses .back-btn');
        if (_b) _b.dataset.back = 'launcher';
      };
    case 'lowStock':
      // Obre el picker del CookMe amb els productes baixos (preseleccionats)
      // perquè l'usuari triï botiga i els enviï al BuyMe (mateix flux que
      // "Generar llista de la compra" del planificador). Fallback: rebost.
      return () => {
        const low = (typeof getLowStockProducts === 'function') ? getLowStockProducts() : [];
        if (!low.length) { showScreen('home'); return; }
        const all = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets)) ? supermarkets : [];
        if (!all.length) { showToast(typeof t === 'function' ? t('noStoreConfigured') : 'No hi ha cap supermercat'); return; }
        const enabled = all.filter(s => s.enabled !== false);
        const others = all.filter(s => s.enabled === false);
        if (typeof showIngredientPicker === 'function') {
          showIngredientPicker(null, { enabled, others }, {
            ingredients: low.map(p => ({ name: p.name, emoji: p.emoji })),
            title: 'Estoc baix (' + low.length + ')',
            preselectAll: true,
            skipRecipeCount: true
          });
        } else {
          showScreen('home');
        }
      };
    case 'weeklyPlanReminder':
      // Obre el planificador a la setmana vinent (perquè revisi el pla i
      // premi "Generar llista"). Banner del launcher → back a 'launcher'.
      return () => {
        if (typeof openMealPlanner === 'function') {
          openMealPlanner(banner.weekId);
        } else {
          showScreen('meal-planner');
        }
        const _b = document.querySelector('#screen-meal-planner .back-btn');
        if (_b) _b.dataset.back = 'launcher';
      };
    case 'rebuyOverdue':
      // Afegir directe el producte habitual al BuyMe (modal amb selector
      // de supermercat). manualAddToBuyMe viu a js/buyme.js.
      return () => {
        if (typeof manualAddToBuyMe === 'function') {
          manualAddToBuyMe({ name: banner.name, emoji: banner.productEmoji || '🛒' });
        } else if (typeof openShoppingList === 'function') {
          openShoppingList();
        } else {
          showScreen('shopping');
        }
      };
    case 'pattern-suggestion':
      // Obre Configuració > Activitat amb la pestanya 'suggeriments' activa.
      return () => {
        if (typeof activeActivityTab !== 'undefined') activeActivityTab = 'suggeriments';
        if (typeof openSettingsActivity === 'function') openSettingsActivity();
        else showScreen('settings-activity');
        // Mateix patró que els banners d'EatMe (vegeu commit a1492f9):
        // #screen-settings-activity té data-back="settings" hardcoded
        // per a la navegació normal (Settings → Activitat → back →
        // Settings). Quan s'entra des del banner del launcher cal
        // apuntar al launcher.
        const _b = document.querySelector('#screen-settings-activity .back-btn');
        if (_b) _b.dataset.back = 'launcher';
      };
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
    // Els productes ja caducats mantenen un estil visual diferenciat (vermell
    // més fort) per remarcar la urgència, però es comporten com qualsevol
    // altre banner: descartables i tornen l'endemà.
    let variantClass = '';
    if (b.type === 'expired') variantClass = ' smart-notif-banner-expired';
    else if (b.type === 'pattern-suggestion') variantClass = ' smart-notif-banner-pattern';
    card.className = 'smart-notif-banner' + variantClass;
    card.dataset.type = b.type;

    const action = _smartBannerAction(b);
    const seeBtn = action
      ? '<button type="button" class="smart-notif-banner-see" data-action="see">' + escapeHtml(t('notifBannerSee')) + '</button>'
      : '';
    const closeBtn = '<button type="button" class="smart-notif-banner-close" data-action="close" aria-label="Close">✕</button>';

    card.innerHTML =
      '<div class="smart-notif-banner-icon">' + (b.emoji || '🔔') + '</div>' +
      '<div class="smart-notif-banner-msg">' + escapeHtml(b.body || '') + '</div>' +
      seeBtn +
      closeBtn;
    container.appendChild(card);

    if (action) {
      card.querySelector('[data-action="see"]').addEventListener('click', () => {
        dismissBanner(b.id);
        action();
      });
    }
    card.querySelector('[data-action="close"]').addEventListener('click', () => {
      dismissBanner(b.id);
      renderSmartNotifBanners();
    });
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
