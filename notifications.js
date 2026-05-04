// ============ Buyte — Notificacions Locals ============

const NOTIF_DEFAULTS = {
  enabled: false,
  dailyTime: '13:00',
  notifyOnOpen: true,
  includeOrange: true,
  includeRed: true
};

let notifSettings = { ...NOTIF_DEFAULTS };
let dailyTimerId = null;
let lastDailyNotification = null;

window.Notif = {
  init: initNotifications,
  load: loadNotifSettings,
  save: saveNotifSettings,
  get: () => ({ ...notifSettings }),
  set: setNotifSettings,
  permissionStatus: getPermissionStatus,
  requestPermission: requestPermission,
  testNotification: testNotification,
  checkAlertsNow: checkAlertsAndNotify,
  scheduleDaily: scheduleDailyCheck
};

function loadNotifSettings() {
  try {
    const raw = localStorage.getItem('eatmefirst_notif_settings');
    if (raw) notifSettings = { ...NOTIF_DEFAULTS, ...JSON.parse(raw) };
  } catch(e) { notifSettings = { ...NOTIF_DEFAULTS }; }
  return notifSettings;
}

function saveNotifSettings() {
  localStorage.setItem('eatmefirst_notif_settings', JSON.stringify(notifSettings));
}

function setNotifSettings(updates) {
  notifSettings = { ...notifSettings, ...updates };
  saveNotifSettings();
  scheduleDailyCheck();
}

function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// Helper públic per a comprovacions ràpides "té permís?". Llegeix l'API
// del navegador en directe — mai una variable cachada — perquè
// Notification.permission pot canviar entre crides sense avisar.
function hasNotificationPermission() {
  return ('Notification' in window) && Notification.permission === 'granted';
}
window.hasNotificationPermission = hasNotificationPermission;

async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch(e) {
    return 'denied';
  }
}

function showNotification(title, body, opts) {
  // Llegim el permís EN DIRECTE en lloc de cap variable cachada — alguns
  // navegadors poden canviar Notification.permission entre crides sense
  // que se'n notifiqui l'app.
  const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
  if (perm !== 'granted') {
    console.log('[Buyte] showNotification skipped — permission =', perm);
    return false;
  }
  const options = {
    body: body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: opts && opts.tag ? opts.tag : 'eatmefirst-alert',
    renotify: true,
    requireInteraction: false,
    silent: false
  };
  try {
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); n.close(); };
    return true;
  } catch (e) {
    // Mobile (Android Chrome) i PWA iOS exigeixen anar pel Service Worker.
    // Si tenim SW registrat (no necessàriament controller), provem-ho.
    if ('serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options)).catch(() => {});
        // Optimista: assumim que el SW ho farà; el caller no s'ha de queixar.
        return true;
      } catch (e2) {}
    }
    console.log('[Buyte] showNotification fallback failed:', e);
    return false;
  }
}

function checkAlertsAndNotify(force) {
  if (!force && !notifSettings.enabled) return false;
  if (getPermissionStatus() !== 'granted') return false;
  if (typeof window.products === 'undefined' || typeof window.daysUntil === 'undefined') return false;

  const alertProducts = collectAlerts();
  if (alertProducts.length === 0) return false;

  const tFn = window.t || ((k) => k);
  let title = '🚨 Buyte';
  let body;
  if (alertProducts.length === 1) {
    body = tFn('notifSingle', alertProducts[0].emoji + ' ' + alertProducts[0].name);
  } else {
    const names = alertProducts.slice(0, 3).map(p => p.emoji + ' ' + p.name).join(', ');
    body = tFn('notifMultiple', alertProducts.length) + '\n' + names;
    if (alertProducts.length > 3) body += '...';
  }

  return showNotification(title, body, { tag: 'eatmefirst-alerts' });
}

function collectAlerts() {
  if (!Array.isArray(window.products)) return [];
  const result = [];
  for (const p of window.products) {
    const loc = window.getLocationById ? window.getLocationById(p.location || 'fridge') : null;
    const cat = loc ? loc.category : 'fridge';
    const days = window.daysUntil(p.date);
    const level = window.getLevel ? window.getLevel(days, cat) : 'green';

    if ((level === 'orange' && notifSettings.includeOrange) ||
        (level === 'red' && notifSettings.includeRed)) {
      result.push({ name: p.name, emoji: p.emoji, level: level, days: days });
    }
  }
  result.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'red' ? -1 : 1;
    return a.days - b.days;
  });
  return result;
}

function scheduleDailyCheck() {
  if (dailyTimerId) { clearTimeout(dailyTimerId); dailyTimerId = null; }
  if (!notifSettings.enabled || getPermissionStatus() !== 'granted') return;

  const now = new Date();
  const [hh, mm] = notifSettings.dailyTime.split(':').map(n => parseInt(n));
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);

  const todayKey = now.toISOString().slice(0, 10);
  if (target.getTime() <= now.getTime()) {
    if (lastDailyNotification !== todayKey) {
      setTimeout(() => {
        if (checkAlertsAndNotify()) {
          lastDailyNotification = todayKey;
          localStorage.setItem('eatmefirst_last_daily', todayKey);
        }
      }, 2000);
    }
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();
  dailyTimerId = setTimeout(() => {
    const dateKey = new Date().toISOString().slice(0, 10);
    if (checkAlertsAndNotify()) {
      lastDailyNotification = dateKey;
      localStorage.setItem('eatmefirst_last_daily', dateKey);
    }
    scheduleDailyCheck();
  }, delay);
}

function testNotification() {
  const tFn = window.t || ((k) => k);
  return showNotification('🔔 Buyte', tFn('notifTestBody'), { tag: 'eatmefirst-test' });
}

async function initNotifications() {
  loadNotifSettings();
  lastDailyNotification = localStorage.getItem('eatmefirst_last_daily');
  if (notifSettings.enabled && getPermissionStatus() === 'granted') {
    if (notifSettings.notifyOnOpen) {
      setTimeout(() => checkAlertsAndNotify(), 3000);
    }
    scheduleDailyCheck();
  }
}
