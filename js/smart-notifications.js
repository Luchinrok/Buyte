/* ============================================
   Buyte — js/smart-notifications.js
   Sistema de notificacions intel·ligents amb 8 tipus.
   Es construeix sobre la capa low-level de notifications.js
   (window.Notif: permisos i Notification API). El scheduler i
   els disparadors per tipus viuen aquí.

   Emmagatzematge a localStorage:
     eatmefirst_smart_notif_v2        — configuració de l'usuari
     eatmefirst_smart_notif_log       — { 'YYYY-MM-DD': { type: true } }
     eatmefirst_smart_notif_dismissed — banners tancats { 'YYYY-MM-DD': { type: true } }
     eatmefirst_smart_notif_banners   — banners pendents per pintar a la home
     eatmefirst_last_open             — última obertura de l'app (per a 'reactivation')
   ============================================ */


// Configuració per defecte. Cada tipus pot tenir camps extra (hour, day, ...).
const SMART_NOTIF_DEFAULTS = {
  enabled: true, // master switch
  types: {
    expiry:            { enabled: true,  hour: 9 },
    mealReminder:      { enabled: true,  hour: 11 },
    cookmeInspiration: { enabled: true,  hour: 18 },
    shoppingPending:   { enabled: false },
    streakMotivation:  { enabled: true,  hour: 21 },
    reactivation:      { enabled: true },
    weeklyRecap:       { enabled: true,  day: 0, hour: 19 }, // 0 = diumenge
    badgeProgress:     { enabled: true }
  }
};

// Lista en ordre fix: serveix tant per al render de la pantalla de
// configuració com per al scheduler. Cada entrada inclou les metadades
// que la UI ha de mostrar.
const SMART_NOTIF_TYPES = [
  { id: 'expiry',            emoji: '🚨', i18n: 'notifTypeExpiry',           hasHour: true,  hasDay: false },
  { id: 'mealReminder',      emoji: '💡', i18n: 'notifTypeMealReminder',     hasHour: true,  hasDay: false },
  { id: 'cookmeInspiration', emoji: '🍳', i18n: 'notifTypeCookme',           hasHour: true,  hasDay: false },
  { id: 'shoppingPending',   emoji: '🛒', i18n: 'notifTypeShoppingPending',  hasHour: false, hasDay: false },
  { id: 'streakMotivation',  emoji: '🔥', i18n: 'notifTypeStreak',           hasHour: true,  hasDay: false },
  { id: 'reactivation',      emoji: '👋', i18n: 'notifTypeReactivation',     hasHour: false, hasDay: false },
  { id: 'weeklyRecap',       emoji: '📊', i18n: 'notifTypeWeekly',           hasHour: true,  hasDay: true  },
  { id: 'badgeProgress',     emoji: '🎯', i18n: 'notifTypeBadge',            hasHour: false, hasDay: false }
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

function shouldShowBannerToday(typeId) {
  const dis = _pruneToToday(_readMap('eatmefirst_smart_notif_dismissed'));
  return !(dis[_todayKey()] && dis[_todayKey()][typeId]);
}

function dismissBannerToday(typeId) {
  const dis = _pruneToToday(_readMap('eatmefirst_smart_notif_dismissed'));
  const today = _todayKey();
  if (!dis[today]) dis[today] = {};
  dis[today][typeId] = true;
  _writeMap('eatmefirst_smart_notif_dismissed', dis);
  // També neteja el banner pendent perquè no torni a aparèixer
  _removeBanner(typeId);
}


// ============================================
//   BANNERS PENDENTS (cua dins l'app)
// ============================================

function _readBanners() {
  return _pruneToToday(_readMap('eatmefirst_smart_notif_banners'))[_todayKey()] || {};
}

function _writeBanners(today) {
  const banners = _pruneToToday(_readMap('eatmefirst_smart_notif_banners'));
  banners[_todayKey()] = today;
  _writeMap('eatmefirst_smart_notif_banners', banners);
}

function _addBanner(typeId, data) {
  const today = _readBanners();
  today[typeId] = Object.assign({ ts: Date.now() }, data || {});
  _writeBanners(today);
}

function _removeBanner(typeId) {
  const today = _readBanners();
  if (today[typeId]) {
    delete today[typeId];
    _writeBanners(today);
  }
}

// Llista pública dels banners actius avui (no descartats).
function getActiveBanners() {
  const banners = _readBanners();
  const out = [];
  SMART_NOTIF_TYPES.forEach(meta => {
    if (banners[meta.id] && shouldShowBannerToday(meta.id)) {
      out.push(Object.assign({ type: meta.id, emoji: meta.emoji }, banners[meta.id]));
    }
  });
  return out;
}


// ============================================
//   ENVIAR NOTIFICACIÓ (push + banner)
// ============================================

function sendSmartNotification(typeId, data) {
  // Tant si tenim permís com si no, el banner dins l'app es desa per a quan s'obri.
  _addBanner(typeId, data);

  // Push del navegador (només si tenim permís).
  if (typeof window !== 'undefined' && window.Notif && window.Notif.permissionStatus() === 'granted') {
    const title = (data && data.title) || '🔔 Buyte';
    const body = (data && data.body) || '';
    try { window.Notif.showNotification(title, body, { tag: 'buyte-' + typeId }); }
    catch (e) {}
  }

  markNotifiedToday(typeId);

  // Re-renderitza banners si la home està carregada.
  if (typeof renderSmartNotifBanners === 'function') renderSmartNotifBanners();
}


// ============================================
//   SCHEDULER
// ============================================

// La cita d'una notificació horària és vàlida si l'hora local actual és
// >= a l'hora configurada. (Es comprova si encara no s'ha enviat avui.)
function _hourReady(targetHour) {
  const now = new Date();
  return now.getHours() >= (targetHour || 0);
}

function _isWeeklyDayReady(typeCfg) {
  const now = new Date();
  if (typeof typeCfg.day === 'number' && now.getDay() !== typeCfg.day) return false;
  return _hourReady(typeCfg.hour);
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
      if (!_hourReady(cfg.hour)) return;
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
//   INICIALITZACIÓ
// ============================================

function initSmartNotifications() {
  loadSmartNotifSettings();
  // Marca l'última obertura per al disparador 'reactivation' (per la propera vegada).
  try { localStorage.setItem('eatmefirst_last_open', _todayKey()); } catch (e) {}
  startSmartNotifScheduler();

  // Quan l'usuari torna a la pestanya, reavaluem (potser ha canviat l'hora del dia).
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkScheduledNotifications();
    });
  }
}
