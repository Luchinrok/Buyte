/* ============================================
   Buyte — js/settings.js
   Mòdul de configuració: tema, idioma, sincronització
   Firebase, notificacions, ubicacions, estadístiques i
   reset de dades.
   ============================================ */


// ============ SINCRONITZACIÓ FIREBASE ============

let syncEnabled = false;
let applyingRemote = false;

async function initSync() {
  const code = localStorage.getItem('eatmefirst_sync_code');
  if (!code) return;

  const ok = await window.FBSync.init();
  if (!ok) {
    console.warn('Firebase no disponible (sense internet?)');
    updateSyncStatus();
    return;
  }

  try {
    await window.FBSync.connectToList(code, onRemoteData);
    syncEnabled = true;
    updateSyncStatus();
  } catch (e) {
    console.error('Error reconnectant:', e);
  }
}

function onRemoteData(remoteData) {
  if (!remoteData) return;
  applyingRemote = true;

  if (Array.isArray(remoteData.products)) products = remoteData.products;
  if (Array.isArray(remoteData.locations) && remoteData.locations.length > 0) locations = remoteData.locations;
  if (remoteData.stats && typeof remoteData.stats === 'object') stats = remoteData.stats;
  if (Array.isArray(remoteData.supermarkets)) supermarkets = remoteData.supermarkets;
  if (Array.isArray(remoteData.shoppingItems)) shoppingItems = remoteData.shoppingItems;

  localStorage.setItem('eatmefirst_products', JSON.stringify(products));
  localStorage.setItem('eatmefirst_locations', JSON.stringify(locations));
  localStorage.setItem('eatmefirst_stats', JSON.stringify(stats));
  localStorage.setItem('eatmefirst_supermarkets', JSON.stringify(supermarkets));
  localStorage.setItem('eatmefirst_shopping_items', JSON.stringify(shoppingItems));

  if (typeof renderHome === 'function') renderHome();
  const sectionScreen = document.getElementById('screen-section');
  if (typeof renderSection === 'function' && sectionScreen && sectionScreen.classList.contains('active')) {
    renderSection();
  }
  // Refresca les pantalles de la llista de la compra si estan visibles
  const shoppingScr = document.getElementById('screen-shopping');
  if (shoppingScr && shoppingScr.classList.contains('active') && typeof renderSupermarkets === 'function') {
    renderSupermarkets();
  }
  const supermarketScr = document.getElementById('screen-supermarket');
  if (supermarketScr && supermarketScr.classList.contains('active') && typeof renderShoppingItems === 'function') {
    renderShoppingItems();
  }

  applyingRemote = false;
  updateSyncStatus();
}

function pushToServer() {
  if (syncEnabled && !applyingRemote && window.FBSync) {
    window.FBSync.upload({
      products: products,
      locations: locations,
      stats: stats,
      supermarkets: supermarkets,
      shoppingItems: shoppingItems
    });
  }
}

function updateSyncStatus() {
  const subEl = document.getElementById('sync-status');
  if (!subEl) return;
  subEl.textContent = syncEnabled ? t('syncOn') : t('syncOff');
}

function updateSyncScreen() {
  const notConn = document.getElementById('sync-not-connected');
  const conn = document.getElementById('sync-connected');
  if (!notConn || !conn) return;

  if (syncEnabled) {
    notConn.style.display = 'none';
    conn.style.display = 'block';
    const code = window.FBSync.getCurrentListId();
    document.getElementById('sync-code-display').textContent = code;
    document.getElementById('sync-last-update').textContent = t('syncLastUpdate', new Date().toLocaleTimeString());
  } else {
    notConn.style.display = 'block';
    conn.style.display = 'none';
  }
}

function openSyncScreen(origin) {
  updateSyncScreen();
  const backBtn = document.querySelector('#screen-sync .back-btn');
  if (backBtn) {
    const isSettings = origin === 'settings' || (typeof origin === 'string' && origin.indexOf('settings-') === 0);
    backBtn.dataset.back = isSettings ? origin : 'settings';
  }
  showScreen('sync');
}

async function createNewList() {
  showToast(t('syncConnecting'));

  const ok = await window.FBSync.init();
  if (!ok) {
    showToast(t('syncErrorOffline'));
    return;
  }

  let code, attempts = 0;
  do {
    code = window.FBSync.generateCode();
    attempts++;
    if (attempts > 5) break;
  } while (await window.FBSync.codeExists(code));

  try {
    await window.FBSync.createList(code, {
      products: products,
      locations: locations,
      stats: stats,
      supermarkets: supermarkets,
      shoppingItems: shoppingItems
    });
    await window.FBSync.connectToList(code, onRemoteData);

    localStorage.setItem('eatmefirst_sync_code', code);
    syncEnabled = true;
    updateSyncStatus();
    updateSyncScreen();
    showToast('✅ ' + t('syncCreated'));
  } catch (e) {
    console.error(e);
    showToast(t('syncErrorCreate'));
  }
}

async function joinExistingList() {
  let code = document.getElementById('input-sync-code').value.trim().toUpperCase();
  if (!code) { showToast(t('syncCodeRequired')); return; }

  if (!code.startsWith('EMF-')) code = 'EMF-' + code;
  if (code.length === 12 && code.charAt(7) !== '-') {
    code = code.slice(0, 8) + '-' + code.slice(8);
  }
  if (code.length !== 13) { showToast(t('syncCodeInvalid')); return; }

  showToast(t('syncConnecting'));

  const ok = await window.FBSync.init();
  if (!ok) {
    showToast(t('syncErrorOffline'));
    return;
  }

  const exists = await window.FBSync.codeExists(code);
  if (!exists) {
    showToast(t('syncCodeNotFound'));
    return;
  }

  if (products.length > 0) {
    if (!confirm(t('syncReplaceWarning'))) return;
  }

  try {
    await window.FBSync.connectToList(code, onRemoteData);
    localStorage.setItem('eatmefirst_sync_code', code);
    syncEnabled = true;
    updateSyncStatus();
    showScreen('sync');
    updateSyncScreen();
    showToast('✅ ' + t('syncJoined'));
  } catch (e) {
    console.error(e);
    showToast(t('syncErrorJoin'));
  }
}

function disconnectSync() {
  if (!confirm(t('syncDisconnectConfirm'))) return;
  if (window.FBSync) window.FBSync.disconnect();
  localStorage.removeItem('eatmefirst_sync_code');
  syncEnabled = false;
  updateSyncStatus();
  updateSyncScreen();
  showToast(t('syncDisconnected'));
}

async function copyCodeToClipboard() {
  const code = window.FBSync.getCurrentListId();
  if (!code) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      const tmp = document.createElement('input');
      tmp.value = code;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
    }
    showToast('✓ ' + t('codeCopied'));
  } catch (e) {
    showToast(code);
  }
}

// ============ NOTIFICACIONS ============

function exposeForNotifications() {
  window.products = products;
  window.daysUntil = daysUntil;
  window.getLevel = getLevel;
  window.getLocationById = getLocationById;
  window.t = t;
}

function initNotifications() {
  if (!window.Notif) return;
  exposeForNotifications();
  // El sistema antic queda com a capa low-level (showNotification / permisos)
  // però sense el seu propi scheduler — el nou sistema porta el control.
  if (typeof initSmartNotifications === 'function') initSmartNotifications();
  updateNotifStatus();
}

function updateNotifStatus() {
  const subEl = document.getElementById('notif-status');
  if (!subEl) return;

  // Llegim TOT en directe — Notification.permission del navegador i el
  // master switch directament del localStorage, així no depenem de cap
  // còpia in-memory que pogués estar obsoleta.
  const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
  let masterOn = false;
  let activeCount = 0;
  try {
    const raw = localStorage.getItem('eatmefirst_smart_notif_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      masterOn = parsed && parsed.enabled === true;
      if (parsed && parsed.types) {
        activeCount = Object.values(parsed.types).filter(c => c && c.enabled).length;
      }
    } else if (typeof getSmartNotifSettings === 'function') {
      // Mai s'ha desat encara → fem servir els defaults en memòria.
      const s = getSmartNotifSettings();
      masterOn = !!s.enabled;
      activeCount = Object.values(s.types || {}).filter(c => c && c.enabled).length;
    }
  } catch (e) {}

  if (perm === 'unsupported') {
    subEl.textContent = t('notifNotSupportedShort');
    return;
  }
  if (!masterOn) {
    subEl.textContent = t('notifStatusOff');
    return;
  }
  // master ON: el detall depèn de l'estat dels permisos
  if (perm === 'granted') {
    subEl.textContent = t('notifStatusOn', activeCount);
  } else if (perm === 'denied') {
    subEl.textContent = t('notifStatusOnDenied');
  } else {
    // 'default' o qualsevol altre valor → cal demanar permís
    subEl.textContent = t('notifStatusOnNoPerm');
  }
}

function openNotificationsScreen(origin) {
  exposeForNotifications();
  if (!window.Notif) return;
  renderSmartNotifSettingsScreen();
  const backBtn = document.querySelector('#screen-notifications .back-btn');
  if (backBtn) {
    const isSettings = origin === 'settings' || (typeof origin === 'string' && origin.indexOf('settings-') === 0);
    backBtn.dataset.back = isSettings ? origin : 'settings';
  }
  showScreen('notifications');
}

// Pinta tota la pantalla de configuració de notificacions amb els 4 estats:
//  1) master OFF: només master + sub explicatiu, resta amagada
//  2) master ON + permís 'granted': perm banner verd + tipus + test
//  3) master ON + permís 'default': perm banner groc + botó "Permetre" +
//     tipus atenuats
//  4) master ON + permís 'denied': perm banner vermell + instruccions de
//     navegador + botó "Tornar a comprovar" + tipus atenuats
function renderSmartNotifSettingsScreen() {
  if (typeof getSmartNotifSettings !== 'function' || typeof SMART_NOTIF_TYPES === 'undefined') return;
  const settings = getSmartNotifSettings();

  // Estat live
  const permStatus = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
  const masterOn = !!settings.enabled;

  // Master switch + sub
  const masterCb = document.getElementById('smart-notif-master');
  if (masterCb) masterCb.checked = masterOn;
  const masterSub = document.getElementById('smart-notif-master-sub');
  if (masterSub) masterSub.textContent = masterOn ? '' : t('notifMasterOffHint');

  // Bloc condicional
  const whenOn = document.getElementById('smart-notif-when-on');
  if (whenOn) whenOn.style.display = masterOn ? 'block' : 'none';

  if (!masterOn) return;

  // Banner de permisos (només quan master ON)
  const permCard = document.getElementById('smart-notif-perm');
  const permIcon = document.getElementById('smart-notif-perm-icon');
  const permEl = document.getElementById('smart-notif-perm-status');
  const permHelp = document.getElementById('smart-notif-perm-help');
  const reqBtn = document.getElementById('smart-notif-request-perm');
  const recheckBtn = document.getElementById('smart-notif-recheck');
  const promptHint = document.getElementById('smart-notif-prompt-hint');
  const deniedHelp = document.getElementById('smart-notif-denied-help');
  const typesBlock = document.getElementById('smart-notif-types-block');

  if (permCard) permCard.classList.remove('perm-banner-info','perm-banner-error','perm-banner-success','perm-banner-warning');

  if (permStatus === 'granted') {
    if (permIcon) permIcon.textContent = '✅';
    if (permEl) permEl.textContent = t('notifPermStatusGranted');
    if (permHelp) permHelp.textContent = '';
    if (permCard) permCard.classList.add('perm-banner-success');
    if (reqBtn) reqBtn.style.display = 'none';
    if (recheckBtn) recheckBtn.style.display = 'none';
    if (promptHint) promptHint.style.display = 'none';
    if (deniedHelp) deniedHelp.style.display = 'none';
    if (typesBlock) typesBlock.classList.remove('is-disabled');
  } else if (permStatus === 'denied') {
    if (permIcon) permIcon.textContent = '🚫';
    if (permEl) permEl.textContent = t('notifPermStatusDenied');
    if (permHelp) permHelp.textContent = '';
    if (permCard) permCard.classList.add('perm-banner-error');
    if (reqBtn) reqBtn.style.display = 'none';
    if (recheckBtn) recheckBtn.style.display = 'flex';
    if (promptHint) promptHint.style.display = 'none';
    if (deniedHelp) deniedHelp.style.display = 'block';
    if (typesBlock) typesBlock.classList.add('is-disabled');
  } else if (permStatus === 'unsupported') {
    if (permIcon) permIcon.textContent = 'ℹ️';
    if (permEl) permEl.textContent = t('notifPermStatusUnsupported');
    if (permHelp) permHelp.textContent = '';
    if (permCard) permCard.classList.add('perm-banner-warning');
    if (reqBtn) reqBtn.style.display = 'none';
    if (recheckBtn) recheckBtn.style.display = 'none';
    if (promptHint) promptHint.style.display = 'none';
    if (deniedHelp) deniedHelp.style.display = 'none';
    if (typesBlock) typesBlock.classList.add('is-disabled');
  } else {
    // 'default' — encara no demanat o usuari ha tancat el prompt
    if (permIcon) permIcon.textContent = '⚠️';
    if (permEl) permEl.textContent = t('notifPermStatusDefault');
    if (permHelp) permHelp.textContent = '';
    if (permCard) permCard.classList.add('perm-banner-info');
    if (reqBtn) reqBtn.style.display = 'flex';
    if (recheckBtn) recheckBtn.style.display = 'none';
    if (promptHint) promptHint.style.display = 'block';
    if (deniedHelp) deniedHelp.style.display = 'none';
    if (typesBlock) typesBlock.classList.add('is-disabled');
  }

  // Llista de tipus
  const list = document.getElementById('smart-notif-types-list');
  if (!list) return;
  list.innerHTML = '';

  SMART_NOTIF_TYPES.forEach(meta => {
    const cfg = settings.types[meta.id] || { enabled: false };
    const row = document.createElement('div');
    row.className = 'smart-notif-type-row';
    row.dataset.type = meta.id;

    let chipsHtml = '';
    if (meta.hasDay) {
      const days = t('notifDayShort');
      const dayLabel = (Array.isArray(days) ? days[(cfg.day || 0) % 7] : 'Dia');
      chipsHtml += '<button type="button" class="smart-notif-chip" data-action="day">📅 ' + escapeHtml(dayLabel) + '</button>';
    }
    if (meta.hasHour) {
      const hh = String(cfg.hour || 0).padStart(2, '0');
      const mm = String(cfg.minute || 0).padStart(2, '0');
      chipsHtml += '<button type="button" class="smart-notif-chip" data-action="hour">⏰ ' + hh + ':' + mm + '</button>';
    }

    row.innerHTML =
      '<div class="smart-notif-type-info">' +
        '<p class="smart-notif-type-name">' + meta.emoji + ' <span>' + escapeHtml(t(meta.i18n)) + '</span></p>' +
        '<div class="smart-notif-type-chips">' + chipsHtml + '</div>' +
      '</div>' +
      '<label class="toggle">' +
        '<input type="checkbox" data-action="toggle"' + (cfg.enabled ? ' checked' : '') + '>' +
        '<span class="toggle-slider"></span>' +
      '</label>';
    list.appendChild(row);

    const cb = row.querySelector('[data-action="toggle"]');
    if (cb) cb.addEventListener('change', (e) => {
      setSmartNotifType(meta.id, { enabled: e.target.checked });
      updateNotifStatus();
    });
    const hourBtn = row.querySelector('[data-action="hour"]');
    if (hourBtn) hourBtn.addEventListener('click', () => promptHourFor(meta.id));
    const dayBtn = row.querySelector('[data-action="day"]');
    if (dayBtn) dayBtn.addEventListener('click', () => promptDayFor(meta.id));
  });
}

function promptHourFor(typeId) {
  const settings = getSmartNotifSettings();
  const cfg = settings.types[typeId] || {};
  const curHour = isFinite(cfg.hour) ? cfg.hour : 0;
  const curMin = isFinite(cfg.minute) ? cfg.minute : 0;
  const hh = String(curHour).padStart(2, '0');
  const mm = String(curMin).padStart(2, '0');
  openTimePickerModal(hh + ':' + mm, (newTime) => {
    const [h, m] = newTime.split(':').map(n => parseInt(n, 10));
    setSmartNotifType(typeId, { hour: h, minute: m });
    renderSmartNotifSettingsScreen();
  });
}

// Modal personalitzat per triar HH:MM. Hora i minuts amb input editable
// (es poden escriure directament) + steppers [−][+] al costat per als que
// prefereixin clicar. Es valida i es fa clamp al perdre focus i al guardar.
function openTimePickerModal(currentTime, onSave) {
  const parts = (currentTime || '00:00').split(':');
  let hour = parseInt(parts[0], 10);
  if (!isFinite(hour) || hour < 0 || hour > 23) hour = 0;
  let minute = parseInt(parts[1], 10);
  if (!isFinite(minute) || minute < 0 || minute > 59) minute = 0;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay time-picker-modal';
  overlay.innerHTML =
    '<div class="modal-content time-picker-content">' +
      '<p class="modal-title">⏰ ' + escapeHtml(t('timePickerTitle')) + '</p>' +
      '<div class="time-picker-row">' +
        '<div class="time-picker-section">' +
          '<p class="time-picker-label">' + escapeHtml(t('timePickerHour')) + '</p>' +
          '<div class="time-picker-stepper">' +
            '<button type="button" class="time-picker-step-btn" data-action="hour-down" aria-label="−">−</button>' +
            '<input type="number" class="time-picker-input" data-field="hour" min="0" max="23" inputmode="numeric" value="' + String(hour).padStart(2, '0') + '">' +
            '<button type="button" class="time-picker-step-btn" data-action="hour-up" aria-label="+">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="time-picker-section">' +
          '<p class="time-picker-label">' + escapeHtml(t('timePickerMinutes')) + '</p>' +
          '<div class="time-picker-stepper">' +
            '<button type="button" class="time-picker-step-btn" data-action="min-down" aria-label="−">−</button>' +
            '<input type="number" class="time-picker-input" data-field="minute" min="0" max="59" inputmode="numeric" value="' + String(minute).padStart(2, '0') + '">' +
            '<button type="button" class="time-picker-step-btn" data-action="min-up" aria-label="+">+</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-buttons time-picker-buttons">' +
        '<button type="button" class="modal-cancel" data-action="cancel">' + escapeHtml(t('cancel')) + '</button>' +
        '<button type="button" class="modal-confirm" data-action="save">' + escapeHtml(t('save')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const hourInput = overlay.querySelector('[data-field="hour"]');
  const minInput = overlay.querySelector('[data-field="minute"]');

  // Wrap-around per a steppers, clamp dur per a inputs (mai un valor il·legal
  // quan l'usuari escriu un número fora del rang).
  const clampHour = (h) => Math.max(0, Math.min(23, h));
  const clampMin  = (m) => Math.max(0, Math.min(59, m));
  const wrapHour  = (h) => ((h % 24) + 24) % 24;
  const wrapMin   = (m) => ((m % 60) + 60) % 60;

  const setHour = (h, fmt) => {
    hour = h;
    if (fmt !== false) hourInput.value = String(hour).padStart(2, '0');
  };
  const setMin = (m, fmt) => {
    minute = m;
    if (fmt !== false) minInput.value = String(minute).padStart(2, '0');
  };

  overlay.querySelector('[data-action="hour-down"]').addEventListener('click', () => setHour(wrapHour(hour - 1)));
  overlay.querySelector('[data-action="hour-up"]').addEventListener('click',   () => setHour(wrapHour(hour + 1)));
  overlay.querySelector('[data-action="min-down"]').addEventListener('click',  () => setMin(wrapMin(minute - 1)));
  overlay.querySelector('[data-action="min-up"]').addEventListener('click',    () => setMin(wrapMin(minute + 1)));

  // Mentre l'usuari escriu, només actualitzem la variable interna sense
  // re-formatar (per no esborrar-li els dígits a mig camí). El padding a
  // dos dígits es fa al perdre el focus.
  const onInput = (input, setter, clamp) => {
    const raw = parseInt(input.value, 10);
    if (!isFinite(raw)) return;
    setter(clamp(raw), false);
  };
  hourInput.addEventListener('input', () => onInput(hourInput, setHour, clampHour));
  minInput .addEventListener('input', () => onInput(minInput,  setMin,  clampMin));

  const onBlur = (input, setter, clamp) => {
    const raw = parseInt(input.value, 10);
    setter(isFinite(raw) ? clamp(raw) : 0, true);
  };
  hourInput.addEventListener('blur', () => onBlur(hourInput, setHour, clampHour));
  minInput .addEventListener('blur', () => onBlur(minInput,  setMin,  clampMin));

  // Selecciona tot el text al focus per facilitar reescriure.
  [hourInput, minInput].forEach(inp => inp.addEventListener('focus', () => inp.select()));

  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
  overlay.querySelector('[data-action="save"]').addEventListener('click', () => {
    // Validació final per si un input encara no ha disparat blur (p.e. enter directe).
    onBlur(hourInput, setHour, clampHour);
    onBlur(minInput,  setMin,  clampMin);
    close();
    const out = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
    try { onSave(out); } catch (e) { console.error(e); }
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function promptDayFor(typeId) {
  const settings = getSmartNotifSettings();
  const cur = (settings.types[typeId] && settings.types[typeId].day) || 0;
  const raw = window.prompt('Dia (0=Diumenge, 1=Dilluns, ..., 6=Dissabte)', String(cur));
  if (raw === null) return;
  const n = parseInt(raw, 10);
  if (!isFinite(n) || n < 0 || n > 6) return;
  setSmartNotifType(typeId, { day: n });
  renderSmartNotifSettingsScreen();
}

async function handleRequestPermission() {
  console.log('[NOTIF] === requestPermission flow START ===');

  if (!('Notification' in window)) {
    console.log('[NOTIF] Notification API not supported in this browser');
    showToast(t('notifNotSupportedShort'));
    return;
  }

  console.log('[NOTIF] Click captured. Notification.permission BEFORE =', Notification.permission);

  try {
    // Cridem Notification.requestPermission() directament — sense passar per
    // window.Notif perquè el wrapper té un short-circuit que retorna el valor
    // actual sense re-prompted i podia confondre. El navegador només mostrarà
    // un prompt nou si Notification.permission és 'default'.
    let result;
    const ret = Notification.requestPermission();

    if (ret && typeof ret.then === 'function') {
      // API moderna: retorna Promise
      console.log('[NOTIF] Using Promise-based requestPermission');
      result = await ret;
    } else {
      // API antiga (Safari < 16): callback-based
      console.log('[NOTIF] Using callback-based requestPermission');
      result = ret || await new Promise(resolve => {
        try { Notification.requestPermission(resolve); }
        catch (e) { console.error('[NOTIF] callback shim failed:', e); resolve('default'); }
      });
    }

    console.log('[NOTIF] Browser response:', result, '· Notification.permission AFTER =', Notification.permission);

    // SEMPRE refresquem la UI després de la resposta, abans de qualsevol
    // missatge: així l'estat visual queda alineat amb la decisió del navegador.
    if (typeof renderSmartNotifSettingsScreen === 'function') renderSmartNotifSettingsScreen();
    updateNotifStatus();

    if (result === 'granted') {
      if (typeof setSmartNotifMaster === 'function') setSmartNotifMaster(true);
      showToast('✅ ' + t('notifPermissionGranted'));
      // Refresquem un cop més perquè el master pot haver canviat el bloc visible.
      if (typeof renderSmartNotifSettingsScreen === 'function') renderSmartNotifSettingsScreen();
      updateNotifStatus();
    } else if (result === 'denied') {
      showToast('🚫 ' + t('notifPermissionDenied'));
    } else {
      // 'default' — l'usuari ha tancat el prompt sense respondre.
      showToast(t('notifPermPromptClosed'));
    }
  } catch (err) {
    console.error('[NOTIF] Error requesting permission:', err);
    showToast('Error: ' + (err && err.message ? err.message : 'unknown'));
  }

  console.log('[NOTIF] === requestPermission flow END ===');
}

async function testNotificationNow() {
  console.log('[NOTIF] === Test button clicked ===');

  if (!('Notification' in window)) {
    console.log('[NOTIF] Notification API not supported');
    showToast(t('notifNotSupportedShort'));
    return;
  }

  console.log('[NOTIF] Permission BEFORE:', Notification.permission);

  // Si encara estem a 'default', demanem permís primer.
  if (Notification.permission === 'default') {
    console.log('[NOTIF] Requesting permission first...');
    try {
      const result = await Notification.requestPermission();
      console.log('[NOTIF] Permission after request:', result);
      if (typeof renderSmartNotifSettingsScreen === 'function') renderSmartNotifSettingsScreen();
      if (result !== 'granted') {
        showToast(result === 'denied' ? ('🚫 ' + t('notifPermissionDenied')) : t('notifPermRequired'));
        return;
      }
    } catch (e) {
      console.error('[NOTIF] requestPermission error:', e);
      showToast('Error: ' + (e && e.message ? e.message : 'unknown'));
      return;
    }
  }

  if (Notification.permission === 'denied') {
    console.log('[NOTIF] Permission denied — cannot send');
    showToast('🚫 ' + t('notifPermissionDenied'));
    return;
  }

  if (Notification.permission !== 'granted') {
    console.log('[NOTIF] Permission not granted (' + Notification.permission + ')');
    showToast(t('notifPermRequired'));
    return;
  }

  // Notificació directa amb new Notification(). Provem sense icon — algunes
  // implementacions del navegador fallen silenciosament si la URL no carrega.
  try {
    console.log('[NOTIF] Creating notification...');
    const notif = new Notification('🍳 BuyTe', {
      body: t('notifTestMessage'),
      tag: 'buyte-test'
    });
    console.log('[NOTIF] Notification object created:', notif);

    notif.onshow = () => {
      console.log('[NOTIF] onshow fired');
    };
    notif.onclick = () => {
      console.log('[NOTIF] onclick fired');
      window.focus();
      notif.close();
    };
    notif.onerror = (e) => {
      console.error('[NOTIF] onerror fired:', e);
      showToast(t('notifTestError'));
    };
    notif.onclose = () => {
      console.log('[NOTIF] onclose fired');
    };

    showToast('🔔 ' + t('notifTestSent'));
  } catch (err) {
    console.error('[NOTIF] new Notification() threw:', err);
    // Mòbil/PWA pot exigir Service Worker. Si en tenim un de registrat, provem-ho.
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        console.log('[NOTIF] Trying via Service Worker:', reg);
        await reg.showNotification('🍳 BuyTe', {
          body: t('notifTestMessage'),
          tag: 'buyte-test'
        });
        showToast('🔔 ' + t('notifTestSent'));
        return;
      } catch (swErr) {
        console.error('[NOTIF] Service Worker fallback failed:', swErr);
      }
    }
    showToast('Error: ' + (err && err.message ? err.message : t('notifTestError')));
  }
}



// Pregunta a l'usuari si vol afegir el producte consumit a la llista de la compra




function renderLocationsList() {
  const container = document.getElementById('locations-list');
  if (!container) return;
  container.innerHTML = '';

  locations.forEach((loc, index) => {
    const item = document.createElement('div');
    item.className = 'location-item';
    const isFirst = index === 0;
    const isLast = index === locations.length - 1;
    item.innerHTML = `
      <div class="loc-arrows">
        <button class="loc-move-btn" data-action="up" ${isFirst ? 'disabled' : ''} aria-label="Up">▲</button>
        <button class="loc-move-btn" data-action="down" ${isLast ? 'disabled' : ''} aria-label="Down">▼</button>
      </div>
      <span class="loc-item-emoji"></span>
      <div class="loc-item-info">
        <div class="loc-item-name"></div>
        <div class="loc-item-mult"></div>
      </div>
      <button class="loc-edit-btn" data-action="edit" aria-label="Edit">✏️</button>
    `;
    item.querySelector('.loc-item-emoji').textContent = loc.emoji;
    item.querySelector('.loc-item-name').textContent = getLocationName(loc);
    item.querySelector('.loc-item-mult').textContent =
      loc.category === 'freezer' ? '❄️ ' + t('catFreezer') :
      loc.category === 'pantry' ? '🥫 ' + t('catPantry') :
      '🧊 ' + t('catFridge');

    item.querySelector('[data-action="up"]').addEventListener('click', (e) => {
      e.stopPropagation(); moveLocation(index, -1);
    });
    item.querySelector('[data-action="down"]').addEventListener('click', (e) => {
      e.stopPropagation(); moveLocation(index, +1);
    });
    item.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
      e.stopPropagation(); openLocationEditor(index);
    });
    container.appendChild(item);
  });
}

function moveLocation(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= locations.length) return;
  // Intercanvi
  const tmp = locations[index];
  locations[index] = locations[newIndex];
  locations[newIndex] = tmp;
  saveLocations();
  renderLocationsList();
}

let editingLocationIndex = -1;
let tempLocCategory = 'fridge';

function openLocationEditor(index) {
  editingLocationIndex = index;
  const isNew = index < 0;
  const loc = isNew ? { emoji: '📍', customName: '', category: 'fridge' } : locations[index];

  document.getElementById('loc-edit-title').textContent =
    isNew ? t('newLocation') : t('editLocation');
  document.getElementById('loc-edit-emoji').textContent = loc.emoji;
  document.getElementById('loc-edit-name').value = isNew ? '' : getLocationName(loc);
  tempLocCategory = loc.category || 'fridge';

  const delBtn = document.getElementById('loc-edit-delete');
  if (delBtn) delBtn.style.display = isNew ? 'none' : 'block';

  renderLocationEmojiPicker(loc.emoji);
  renderCategoryPicker();
  showScreen('location-edit');
}

function renderCategoryPicker() {
  const container = document.getElementById('storage-type-picker');
  if (!container) return;
  container.innerHTML = '';

  const cats = [
    { id: 'fridge', emoji: '🧊', labelKey: 'catFridge', descKey: 'catFridgeDesc' },
    { id: 'freezer', emoji: '❄️', labelKey: 'catFreezer', descKey: 'catFreezerDesc' },
    { id: 'pantry', emoji: '🥫', labelKey: 'catPantry', descKey: 'catPantryDesc' }
  ];

  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'storage-type-option' + (c.id === tempLocCategory ? ' selected' : '');
    btn.innerHTML = `
      <span class="storage-type-emoji"></span>
      <div class="storage-type-info">
        <div class="storage-type-label"></div>
        <div class="storage-type-desc"></div>
      </div>
    `;
    btn.querySelector('.storage-type-emoji').textContent = c.emoji;
    btn.querySelector('.storage-type-label').textContent = t(c.labelKey);
    btn.querySelector('.storage-type-desc').textContent = t(c.descKey);
    btn.addEventListener('click', () => {
      tempLocCategory = c.id;
      renderCategoryPicker();
    });
    container.appendChild(btn);
  });
}

let tempLocEmoji = '📍';

function renderLocationEmojiPicker(currentEmoji) {
  tempLocEmoji = currentEmoji;
  const locEmojis = ['🧊','❄️','🥫','🍎','🏠','🍽️','🥤','🍷','🍞','🌶️','🚪','🏪','🛒','📦','🗄️','🪟','🌿','🥖','🍯','🍫','📍','🎒','💼','🚗'];
  const container = document.getElementById('loc-edit-emoji-picker');
  container.innerHTML = '';
  locEmojis.forEach(e => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-option' + (e === tempLocEmoji ? ' selected' : '');
    btn.textContent = e;
    btn.addEventListener('click', () => {
      tempLocEmoji = e;
      document.getElementById('loc-edit-emoji').textContent = e;
      renderLocationEmojiPicker(e);
    });
    container.appendChild(btn);
  });
}

function saveLocationEdit() {
  const name = document.getElementById('loc-edit-name').value.trim();
  if (!name) { showToast(t('needName')); return; }

  if (editingLocationIndex < 0) {
    locations.push({
      id: 'custom_' + Date.now(),
      emoji: tempLocEmoji,
      customName: name,
      category: tempLocCategory
    });
  } else {
    locations[editingLocationIndex].emoji = tempLocEmoji;
    locations[editingLocationIndex].customName = name;
    locations[editingLocationIndex].category = tempLocCategory;
  }

  saveLocations();
  renderLocationsList();
  showScreen('locations');
  showToast(t('saved'));
}

function deleteLocation(index) {
  if (locations.length <= 1) {
    showToast(t('needOneLocation'));
    return;
  }
  if (!confirm(t('confirmDeleteLocation'))) return;
  const removed = locations[index];
  locations.splice(index, 1);
  // Si algun producte usava aquesta ubicació, l'assignem a la primera disponible
  products.forEach(p => {
    if (p.location === removed.id) p.location = locations[0].id;
  });
  saveLocations();
  saveData();
  renderLocationsList();
  showToast(t('deleted'));
}

function recalcDateByLocation() {
  const dateInput = document.getElementById('input-date');
  const baseDays = parseInt(dateInput.dataset.baseDays || '7');
  const finalDays = computeDaysForLocation(selectedLocation, baseDays, currentCategories);
  const d = new Date();
  d.setDate(d.getDate() + finalDays);
  dateInput.value = formatDateForInput(d);
}

// Obre la pantalla d'ubicacions recordant d'on s'ha cridat
// origin: 'add' (des del formulari), 'settings' (des de Configuració), o
// 'settings-content' (des de la sub-pantalla Contingut). Si l'origen és
// settings o una sub-pantalla settings-*, hi tornem; en cas contrari
// 'add' és el defecte.
function openLocations(origin) {
  const backBtn = document.getElementById('locations-back-btn');
  const isSettings = origin === 'settings' || (typeof origin === 'string' && origin.indexOf('settings-') === 0);
  if (backBtn) backBtn.dataset.back = isSettings ? origin : 'add';
  renderLocationsList();
  showScreen('locations');
}

// ============ CONFIGURACIÓ — 2 NIVELLS ============
// Nivell 1: pantalla principal amb 5 cards de categoria (regional /
// content / activity / app / data). Cadascuna obre una sub-pantalla amb
// pestanyes (nivell 2) que viuen a screen-settings-{cat}. Aquí només
// despatxem el clic — les sub-pantalles s'engeguen amb funcions
// openSettings<Cat>() definides als seus propis commits.

// ----- Sub-pantalla "Regional" (Idioma + País amb pestanyes) -----
let activeRegionalTab = 'idioma';

function openSettingsRegional() {
  renderSettingsRegional();
  showScreen('settings-regional');
}

function renderSettingsRegional() {
  document.querySelectorAll('#screen-settings-regional .sub-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.subtab === activeRegionalTab);
  });
  const area = document.getElementById('settings-regional-area');
  if (!area) return;
  area.innerHTML = '';
  if (activeRegionalTab === 'idioma') {
    const wrap = document.createElement('div');
    wrap.className = 'lang-list';
    area.appendChild(wrap);
    if (typeof renderLangListInto === 'function') renderLangListInto(wrap);
  } else if (activeRegionalTab === 'pais') {
    const hint = document.createElement('p');
    hint.className = 'section-hint';
    hint.textContent = t('countryHint');
    area.appendChild(hint);
    const wrap = document.createElement('div');
    wrap.className = 'welcome-country-list';
    area.appendChild(wrap);
    if (typeof renderCountryListInto === 'function') renderCountryListInto(wrap);
  }
}

function attachSettingsRegionalListeners() {
  document.querySelectorAll('#screen-settings-regional .sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeRegionalTab = tab.dataset.subtab || 'idioma';
      renderSettingsRegional();
    });
  });
}

// ----- Sub-pantalla "Contingut" (Botigues / Zones / Populars / Receptes) -----
let activeContentTab = 'botigues';

function openSettingsContent() {
  renderSettingsContent();
  showScreen('settings-content');
}

// Helper compartit per pintar el bloc "resum + botó d'acció" centrat.
function _subContentBlock(summaryHtml, btnLabel, onClick) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-sub-content';
  wrap.innerHTML = summaryHtml +
    '<button type="button" class="primary-btn settings-sub-btn">' + escapeHtml(btnLabel) + '</button>';
  wrap.querySelector('button').addEventListener('click', onClick);
  return wrap;
}

function renderSettingsContent() {
  document.querySelectorAll('#screen-settings-content .sub-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.subtab === activeContentTab);
  });
  const area = document.getElementById('settings-content-area');
  if (!area) return;
  area.innerHTML = '';

  let summary = '', label = '', action = null;
  if (activeContentTab === 'botigues') {
    const enabled = (typeof getEnabledSupermarkets === 'function') ? getEnabledSupermarkets().length : 0;
    summary = '<p class="settings-sub-summary">🏪 ' + enabled + ' ' + escapeHtml(t('storesActive')) + '</p>';
    label = t('manageStores');
    action = () => {
      if (typeof openManageSupermarkets === 'function') openManageSupermarkets('settings-content');
    };
  } else if (activeContentTab === 'zones') {
    const n = (typeof locations !== 'undefined' && Array.isArray(locations)) ? locations.length : 0;
    summary = '<p class="settings-sub-summary">📍 ' + n + ' ' + escapeHtml(t('zonesCount')) + '</p>';
    label = t('manageZones');
    action = () => {
      if (typeof openLocations === 'function') openLocations('settings-content');
    };
  } else if (activeContentTab === 'populars') {
    const n = (typeof getPopularProducts === 'function') ? getPopularProducts().length : 0;
    summary = '<p class="settings-sub-summary">⭐ ' + n + ' ' + escapeHtml(t('popularsCount')) + '</p>';
    label = t('managePopulars');
    action = () => {
      if (typeof openPopular === 'function') openPopular('settings-content');
      else { showScreen('popular'); if (typeof renderPopularList === 'function') renderPopularList(); }
    };
  } else if (activeContentTab === 'receptes') {
    const n = (typeof getAllRecipes === 'function') ? getAllRecipes().length : 0;
    summary = '<p class="settings-sub-summary">🍳 ' + n + ' ' + escapeHtml(t('recipesCount')) + '</p>';
    label = t('manageRecipes');
    action = () => {
      if (typeof openCookMe === 'function') openCookMe('settings-content');
    };
  }
  if (label) area.appendChild(_subContentBlock(summary, label, action));
}

function attachSettingsContentListeners() {
  document.querySelectorAll('#screen-settings-content .sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeContentTab = tab.dataset.subtab || 'botigues';
      renderSettingsContent();
    });
  });
}

// ----- Sub-pantalla "Activitat" (Impacte / Estadístiques) -----
let activeActivityTab = 'impacte';

function openSettingsActivity() {
  renderSettingsActivity();
  showScreen('settings-activity');
}

function renderSettingsActivity() {
  document.querySelectorAll('#screen-settings-activity .sub-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.subtab === activeActivityTab);
  });
  const area = document.getElementById('settings-activity-area');
  if (!area) return;
  area.innerHTML = '';

  let summary = '', action = null;
  if (activeActivityTab === 'impacte') {
    // Reusem la mateixa lògica que updateImpactSub: estalvi del mes en curs
    // o, si no hi ha historial, un teaser.
    const history = (typeof loadConsumptionHistory === 'function') ? loadConsumptionHistory() : [];
    if (!history || history.length === 0) {
      summary = '<p class="settings-sub-summary">📊 ' + escapeHtml(t('impactSubEmpty')) + '</p>';
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const mIdx = now.getMonth();
      const monthEntries = history.filter(e => {
        if (!e || !e.date) return false;
        const d = new Date(e.date);
        return d.getFullYear() === y && d.getMonth() === mIdx;
      });
      const m = (typeof computeMetrics === 'function') ? computeMetrics(monthEntries) : { savedEur: 0 };
      const eur = (typeof fmtEur === 'function') ? fmtEur(m.savedEur) : (m.savedEur + '€');
      summary = '<p class="settings-sub-summary">💚 ' + eur + ' ' + escapeHtml(t('savedThisMonth')) + '</p>';
    }
    action = () => {
      if (typeof openImpact === 'function') openImpact('settings-activity');
    };
  } else if (activeActivityTab === 'estadistiques') {
    // Reusem la lògica d'updateStatsSub: % global d'aprofitament o teaser.
    let consumed = 0, trashed = 0;
    try {
      const raw = localStorage.getItem('eatmefirst_consumption_history');
      if (raw) {
        const hist = JSON.parse(raw);
        if (Array.isArray(hist)) hist.forEach(h => {
          if (h && h.action === 'consumed') consumed++;
          else if (h && h.action === 'trashed') trashed++;
        });
      }
    } catch (e) {}
    const total = consumed + trashed;
    if (total === 0) {
      summary = '<p class="settings-sub-summary">📈 ' + escapeHtml(t('statsSubEmpty')) + '</p>';
    } else {
      const pct = Math.round((consumed / total) * 100);
      summary = '<p class="settings-sub-summary">📈 ' + pct + '% ' + escapeHtml(t('statsSubGlobal')) + '</p>';
    }
    action = () => {
      if (typeof showStats === 'function') showStats('settings-activity');
    };
  }
  if (action) area.appendChild(_subContentBlock(summary, t('viewDetail'), action));
}

function attachSettingsActivityListeners() {
  document.querySelectorAll('#screen-settings-activity .sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeActivityTab = tab.dataset.subtab || 'impacte';
      renderSettingsActivity();
    });
  });
}

// ----- Sub-pantalla "Aplicació" (Aparença / Notificacions / Sincronització) -----
let activeAppTab = 'aparenca';

function openSettingsApp() {
  renderSettingsApp();
  showScreen('settings-app');
}

// Llegeix el tema actiu del DOM (data-theme), preferint 'light' com a defecte.
function _currentThemeMode() {
  const m = document.documentElement.getAttribute('data-theme');
  return (m === 'dark') ? 'dark' : 'light';
}

function _notifSummaryText() {
  const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
  let masterOn = false;
  let count = 0;
  try {
    const raw = localStorage.getItem('eatmefirst_smart_notif_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      masterOn = parsed && parsed.enabled === true;
      if (parsed && parsed.types) count = Object.values(parsed.types).filter(c => c && c.enabled).length;
    } else if (typeof getSmartNotifSettings === 'function') {
      const s = getSmartNotifSettings();
      masterOn = !!s.enabled;
      count = Object.values(s.types || {}).filter(c => c && c.enabled).length;
    }
  } catch (e) {}
  if (perm === 'unsupported') return t('notifNotSupportedShort');
  if (!masterOn) return t('notifStatusOff');
  if (perm === 'granted') return t('notifStatusOn', count);
  if (perm === 'denied') return t('notifStatusOnDenied');
  return t('notifStatusOnNoPerm');
}

function renderSettingsApp() {
  document.querySelectorAll('#screen-settings-app .sub-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.subtab === activeAppTab);
  });
  const area = document.getElementById('settings-app-area');
  if (!area) return;
  area.innerHTML = '';

  if (activeAppTab === 'aparenca') {
    // Chips Clar / Fosc — modifiquen el tema directament, sense canvi de pantalla.
    const wrap = document.createElement('div');
    wrap.className = 'settings-sub-content';
    const cur = _currentThemeMode();
    wrap.innerHTML =
      '<p class="settings-sub-summary-soft">🎨 ' + escapeHtml(t('appearance')) + '</p>' +
      '<div class="theme-chips">' +
        '<button type="button" class="theme-chip' + (cur === 'light' ? ' active' : '') + '" data-mode="light">🌞 ' + escapeHtml(t('lightMode')) + '</button>' +
        '<button type="button" class="theme-chip' + (cur === 'dark'  ? ' active' : '') + '" data-mode="dark">🌙 ' + escapeHtml(t('darkMode')) + '</button>' +
      '</div>';
    area.appendChild(wrap);
    wrap.querySelectorAll('.theme-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (typeof applyTheme === 'function') applyTheme(chip.dataset.mode);
        renderSettingsApp();
      });
    });
  } else if (activeAppTab === 'notif') {
    const summary = '<p class="settings-sub-summary">🔔 ' + escapeHtml(_notifSummaryText()) + '</p>';
    area.appendChild(_subContentBlock(summary, t('configureNotif'), () => {
      if (typeof openNotificationsScreen === 'function') openNotificationsScreen('settings-app');
    }));
  } else if (activeAppTab === 'sync') {
    const status = (typeof syncEnabled !== 'undefined' && syncEnabled) ? t('syncOn') : t('syncOff');
    const summary = '<p class="settings-sub-summary">🔄 ' + escapeHtml(status) + '</p>';
    area.appendChild(_subContentBlock(summary, t('configureSync'), () => {
      if (typeof openSyncScreen === 'function') openSyncScreen('settings-app');
    }));
  }
}

function attachSettingsAppListeners() {
  document.querySelectorAll('#screen-settings-app .sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeAppTab = tab.dataset.subtab || 'aparenca';
      renderSettingsApp();
    });
  });
}

// ----- Sub-pantalla "Dades" (Esborrar / Exportar / Importar) -----
let activeDataTab = 'esborrar';

function openSettingsData() {
  renderSettingsData();
  showScreen('settings-data');
}

// Helper per pintar una card destructiva al tab Esborrar. Cada una porta
// data-reset-action que el delegate mapeja a la funció corresponent.
function _resetCardHtml(action, emoji, titleKey, subText, danger) {
  const cls = danger ? 'settings-card danger-card' : 'settings-card danger-card-soft';
  return '<button type="button" class="' + cls + '" data-reset-action="' + action + '">' +
           '<div class="settings-card-icon"><span>' + emoji + '</span></div>' +
           '<div class="settings-card-info">' +
             '<p class="settings-card-title">' + escapeHtml(t(titleKey)) + '</p>' +
             '<p class="settings-card-sub">' + escapeHtml(subText) + '</p>' +
           '</div>' +
           '<span class="settings-card-arrow">›</span>' +
         '</button>';
}

function renderSettingsData() {
  document.querySelectorAll('#screen-settings-data .sub-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.subtab === activeDataTab);
  });
  const area = document.getElementById('settings-data-area');
  if (!area) return;

  if (activeDataTab === 'esborrar') {
    // Subtítols estàtics que descriuen l'acció. Els comptadors s'han mogut
    // fora per evitar la repetició "Esborrar X" + "X productes" — el
    // títol diu el què, el subtítol diu què s'esborra.
    area.innerHTML =
      '<div class="settings-cards reset-data-cards">' +
        _resetCardHtml('biteme',        '🥗', 'resetBitemeTitle',        t('resetBitemeSub'),        false) +
        _resetCardHtml('shopping',      '🛒', 'resetShoppingTitle',      t('resetShoppingSub'),      false) +
        _resetCardHtml('impact',        '📊', 'resetImpactTitle',        t('resetImpactSub'),        false) +
        _resetCardHtml('recipe-usage',  '🍳', 'resetRecipeUsageTitle',   t('resetRecipeUsageSub'),   false) +
        _resetCardHtml('gamification',  '🏆', 'resetGamificationTitle',  t('resetGamificationSub'),  false) +
      '</div>' +
      '<div class="reset-data-divider"></div>' +
      _resetCardHtml('all', '🗑️', 'resetAllTitle', t('cantUndo'), true);
  } else if (activeDataTab === 'exportar') {
    const summary = '<p class="settings-sub-summary-soft">' + escapeHtml(t('exportSub')) + '</p>';
    area.innerHTML = '';
    area.appendChild(_subContentBlock(summary, '📤 ' + t('downloadMyData'), () => {
      if (typeof exportData === 'function') exportData();
    }));
  } else if (activeDataTab === 'importar') {
    const summary = '<p class="settings-sub-summary-soft">' + escapeHtml(t('importSub')) + '</p>';
    area.innerHTML = '';
    area.appendChild(_subContentBlock(summary, '📥 ' + t('importFromFile'), () => {
      if (typeof importData === 'function') importData();
    }));
  }
}

function attachSettingsDataListeners() {
  document.querySelectorAll('#screen-settings-data .sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeDataTab = tab.dataset.subtab || 'esborrar';
      renderSettingsData();
    });
  });
  // Delegate per als botons d'esborrar que es regeneren a cada render.
  const area = document.getElementById('settings-data-area');
  if (area && !area.__resetBound) {
    area.__resetBound = true;
    area.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('[data-reset-action]');
      if (!btn) return;
      switch (btn.dataset.resetAction) {
        case 'biteme':       if (typeof resetBitemeProducts === 'function') resetBitemeProducts(); break;
        case 'shopping':     if (typeof resetShoppingList === 'function') resetShoppingList(); break;
        case 'impact':       if (typeof resetImpactHistory === 'function') resetImpactHistory(); break;
        case 'recipe-usage': if (typeof confirmResetRecipeUsage === 'function') confirmResetRecipeUsage(); break;
        case 'gamification': if (typeof confirmResetGamificationProgress === 'function') confirmResetGamificationProgress(); break;
        case 'all':          if (typeof resetAll === 'function') resetAll(); break;
      }
    });
  }
}


function openSettingsCategory(cat) {
  const map = {
    regional: typeof openSettingsRegional === 'function' ? openSettingsRegional : null,
    content:  typeof openSettingsContent  === 'function' ? openSettingsContent  : null,
    activity: typeof openSettingsActivity === 'function' ? openSettingsActivity : null,
    app:      typeof openSettingsApp      === 'function' ? openSettingsApp      : null,
    data:     typeof openSettingsData     === 'function' ? openSettingsData     : null
  };
  const fn = map[cat];
  if (fn) fn();
  else if (typeof showToast === 'function') showToast('Pendent');
}

// Wire-up dels clicks de les 5 cards de categoria. Es crida una sola
// vegada des de app.js a la inicialització.
function attachSettingsCategoryListeners() {
  ['regional','content','activity','app','data'].forEach(cat => {
    const btn = document.getElementById('settings-' + cat);
    if (btn) btn.addEventListener('click', () => openSettingsCategory(cat));
  });
}

// Obre la pantalla de configuració recordant d'on s'ha cridat
// origin: 'home' (des del tracker) o 'launcher' (des de la pantalla inicial)
function openSettings(origin) {
  const backBtn = document.getElementById('settings-back-btn');
  if (backBtn) backBtn.dataset.back = (origin === 'launcher') ? 'launcher' : 'home';
  showScreen('settings');
}

function updateSupermarketsStatus() {
  const el = document.getElementById('supermarkets-status');
  if (!el) return;
  const enabled = getEnabledSupermarkets().length;
  el.textContent = enabled + ' ' + t('storesActive');
}

// CONFIGURACIÓ
function applyTheme(mode) {
  const root = document.documentElement;
  // Si rebem 'auto' (de versions anteriors), forcem 'light'
  if (mode === 'auto') mode = 'light';
  root.setAttribute('data-theme', mode);
  localStorage.setItem('eatmefirst_theme', mode);
  updateThemeStatus();
}

function updateThemeStatus() {
  let mode = localStorage.getItem('eatmefirst_theme') || 'light';
  if (mode === 'auto') mode = 'light';
  const key = mode === 'light' ? 'themeLight' : 'themeDark';
  const el = document.getElementById('theme-status');
  if (el) el.textContent = t(key);
}

function cycleTheme() {
  let current = localStorage.getItem('eatmefirst_theme') || 'light';
  if (current === 'auto') current = 'light';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
}

function updateLangStatus() {
  const lang = getCurrentLang();
  const el = document.getElementById('language-status');
  if (el) el.textContent = LANGUAGE_NAMES[lang];
}

function updateStatsSub() {
  const el = document.getElementById('stats-sub');
  if (!el) return;
  // Font de veritat: l'historial de consums/llençaments. El comptador antic
  // (stats.consumed/trashed) podia quedar inflat amb dades d'altres dispositius
  // o de versions anteriors, mentre l'usuari ja havia esborrat l'historial.
  let consumed = 0, trashed = 0;
  try {
    const raw = localStorage.getItem('eatmefirst_consumption_history');
    if (raw) {
      const hist = JSON.parse(raw);
      if (Array.isArray(hist)) {
        hist.forEach(h => {
          if (h && h.action === 'consumed') consumed++;
          else if (h && h.action === 'trashed') trashed++;
        });
      }
    }
  } catch (e) {}
  const total = consumed + trashed;
  if (total === 0) {
    el.textContent = t('statsSubEmpty');
    return;
  }
  const pct = Math.round((consumed / total) * 100);
  el.textContent = pct + '% ' + t('statsSubGlobal');
}

function updateLocationsCount() {
  const el = document.getElementById('locations-count');
  if (!el) return;
  el.textContent = locations.length + ' ' + t('zonesCount');
}

function updatePopularCount() {
  const el = document.getElementById('popular-count');
  if (!el) return;
  const n = (typeof getPopularProducts === 'function') ? getPopularProducts().length : 0;
  el.textContent = n + ' ' + t('popularsCount');
}

function renderLangList() {
  renderLangListInto(document.getElementById('lang-list'));
}

// Pinta la llista d'idiomes a un contenidor arbitrari. Permet reusar la
// mateixa UI tant a la pantalla autònoma com dins de la sub-pantalla
// "Regional" amb pestanyes.
function renderLangListInto(container) {
  if (!container) return;
  container.innerHTML = '';

  // Mentre fem el refactor només deixem català.
  // La resta d'idiomes tornaran un cop polida l'app.
  const FLAG_CA = '<svg viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg"><rect width="9" height="6" fill="#FCDD09"/><rect y="0.67" width="9" height="0.67" fill="#DA121A"/><rect y="2" width="9" height="0.67" fill="#DA121A"/><rect y="3.33" width="9" height="0.67" fill="#DA121A"/><rect y="4.67" width="9" height="0.67" fill="#DA121A"/></svg>';

  const btn = document.createElement('button');
  btn.className = 'lang-item active';

  const flag = document.createElement('span');
  flag.className = 'lang-flag';
  flag.innerHTML = FLAG_CA;

  const info = document.createElement('div');
  info.className = 'lang-info';

  const name = document.createElement('div');
  name.className = 'lang-name';
  name.textContent = 'Català';

  const check = document.createElement('span');
  check.className = 'lang-check';
  check.textContent = '✓';

  info.appendChild(name);
  btn.appendChild(flag);
  btn.appendChild(info);
  btn.appendChild(check);

  btn.addEventListener('click', () => {
    showToast('✓ Català');
  });

  container.appendChild(btn);
}

// === ESTADÍSTIQUES (visió "dades dures") ===
// Càrrega l'historial de consum i el calcula tot per pintar cards de resum,
// gràfics, distribució per zona, tops i mitjanes. Si no hi ha entrades,
// ensenya un empty state.
function showStats(origin) {
  const empty = document.getElementById('stats-empty');
  const body = document.getElementById('stats-body');
  const history = (typeof loadConsumptionHistory === 'function') ? loadConsumptionHistory() : [];
  // Back-button: tornem al sub-screen 'settings-*' si en ve, si no 'settings'.
  const backBtn = document.querySelector('#screen-stats .back-btn');
  if (backBtn) {
    const isSettings = origin === 'settings' || (typeof origin === 'string' && origin.indexOf('settings-') === 0);
    backBtn.dataset.back = isSettings ? origin : 'settings';
  }

  if (!history || history.length === 0) {
    if (empty) empty.style.display = 'block';
    if (body) body.innerHTML = '';
    showScreen('stats');
    return;
  }

  if (empty) empty.style.display = 'none';
  if (body) body.innerHTML = renderStatsBody(history);

  showScreen('stats');
}

// Construeix tot l'HTML de la pantalla d'estadístiques.
function renderStatsBody(history) {
  const summary = computeStatsSummary(history);
  const monthly = computeStatsMonthly(history);
  const zoneDist = computeZoneDistribution();
  const tops = computeStatsTops(history);
  const averages = computeStatsAverages(history);

  return [
    renderStatsSummaryCard(summary),
    renderStatsLineChartCard(monthly),
    renderStatsBarChartCard(monthly),
    renderStatsZoneCard(zoneDist),
    renderStatsTopsCard(tops),
    renderStatsAveragesCard(averages)
  ].join('');
}

// CARD 1 — Resum global
function computeStatsSummary(history) {
  let consumed = 0, trashed = 0;
  history.forEach(e => {
    if (e.action === 'consumed') consumed++;
    else if (e.action === 'trashed') trashed++;
  });
  const total = consumed + trashed;
  const pct = total > 0 ? Math.round((consumed / total) * 100) : 0;
  return { consumed, trashed, total, pct };
}

function renderStatsSummaryCard(s) {
  return `
    <div class="stats-card-v2">
      <h3 class="stats-card-v2-title">📊 <span>${escapeHtml(t('statsTitle'))}</span></h3>
      <div class="stats-summary-grid">
        <div class="stats-summary-item">
          <div class="stats-summary-emoji">🥗</div>
          <p class="stats-summary-num">${s.consumed}</p>
          <p class="stats-summary-label">${escapeHtml(t('productsConsumed'))}</p>
        </div>
        <div class="stats-summary-item">
          <div class="stats-summary-emoji">🗑️</div>
          <p class="stats-summary-num">${s.trashed}</p>
          <p class="stats-summary-label">${escapeHtml(t('productsTrashed'))}</p>
        </div>
        <div class="stats-summary-item">
          <div class="stats-summary-emoji">📦</div>
          <p class="stats-summary-num">${s.total}</p>
          <p class="stats-summary-label">${escapeHtml(t('totalProducts'))}</p>
        </div>
        <div class="stats-summary-item stats-summary-utilization">
          <div class="stats-summary-emoji">${s.pct >= 75 ? '🎉' : s.pct >= 50 ? '👍' : '💪'}</div>
          <p class="stats-summary-num">${s.pct}%</p>
          <p class="stats-summary-label">${escapeHtml(t('utilizationGlobal'))}</p>
        </div>
      </div>
    </div>
  `;
}

// CARD 2 + 3 — Dades mensuals (utilització i € llençats)
function computeStatsMonthly(history) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: monthShortLetter(d.getMonth()),
      fullLabel: monthFullName(d.getMonth()),
      consumed: 0,
      trashed: 0,
      wastedEur: 0
    });
  }
  history.forEach(e => {
    if (!e.date) return;
    const d = new Date(e.date);
    const idx = months.findIndex(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (idx < 0) return;
    if (e.action === 'consumed') months[idx].consumed++;
    else if (e.action === 'trashed') {
      months[idx].trashed++;
      const product = (typeof entryAsProduct === 'function') ? entryAsProduct(e) : null;
      const total = (product && typeof getProductPrice === 'function') ? getProductPrice(product) : 0;
      const factor = Math.max(0, Math.min(100, e.percent || 0)) / 100;
      months[idx].wastedEur += total * factor;
    }
  });
  return months.map(m => {
    const t = m.consumed + m.trashed;
    return { ...m, utilizationPct: t > 0 ? Math.round((m.consumed / t) * 100) : null };
  });
}

function monthShortLetter(idx) {
  const labels = ['G', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return labels[idx] || '?';
}
function monthFullName(idx) {
  const names = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
                 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
  return names[idx] || '';
}

// CARD 2 — Gràfic línia % aprofitament
function renderStatsLineChartCard(monthly) {
  const points = monthly.map((m, i) => ({ ...m, x: i }));
  const hasData = points.some(p => p.utilizationPct !== null);
  if (!hasData) {
    return `
      <div class="stats-card-v2">
        <h3 class="stats-card-v2-title">📈 <span>${escapeHtml(t('utilizationEvolution'))}</span></h3>
        <div class="stats-chart-empty">${escapeHtml(t('chartEmpty'))}</div>
      </div>
    `;
  }
  // SVG: 320 wide x 140 tall amb padding lateral 16, base 110
  const W = 320, H = 140, PAD_X = 20, PAD_TOP = 12, BASE = 116;
  const stepX = (W - PAD_X * 2) / Math.max(1, points.length - 1);
  const yFor = (pct) => BASE - (pct / 100) * (BASE - PAD_TOP);
  const segments = [];
  let prev = null;
  points.forEach((p) => {
    if (p.utilizationPct === null) { prev = null; return; }
    const cx = PAD_X + p.x * stepX;
    const cy = yFor(p.utilizationPct);
    if (prev !== null) segments.push({ x1: prev.cx, y1: prev.cy, x2: cx, y2: cy });
    prev = { cx, cy };
  });
  const linesSvg = segments.map(s =>
    `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round"/>`
  ).join('');
  const dotsSvg = points.map(p => {
    if (p.utilizationPct === null) return '';
    const cx = PAD_X + p.x * stepX;
    const cy = yFor(p.utilizationPct);
    return `<circle cx="${cx}" cy="${cy}" r="4" fill="var(--primary)"/>`;
  }).join('');
  const labelsSvg = points.map(p => {
    const cx = PAD_X + p.x * stepX;
    return `<text x="${cx}" y="${H - 4}" text-anchor="middle" font-size="10" fill="var(--text-soft)" font-family="inherit">${p.label}</text>`;
  }).join('');
  const yLabels = `
    <text x="2" y="${PAD_TOP + 4}" font-size="9" fill="var(--text-soft)" font-family="inherit">100%</text>
    <text x="2" y="${BASE}" font-size="9" fill="var(--text-soft)" font-family="inherit">0%</text>
    <line x1="${PAD_X - 2}" y1="${PAD_TOP}" x2="${PAD_X - 2}" y2="${BASE}" stroke="var(--border)" stroke-width="1"/>
  `;
  return `
    <div class="stats-card-v2">
      <h3 class="stats-card-v2-title">📈 <span>${escapeHtml(t('utilizationEvolution'))}</span></h3>
      <p class="stats-card-v2-sub">${escapeHtml(t('haveImproved'))}</p>
      <svg class="stats-line-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        ${yLabels}
        ${linesSvg}
        ${dotsSvg}
        ${labelsSvg}
      </svg>
    </div>
  `;
}

// CARD 3 — Gràfic barres € llençats per mes
function renderStatsBarChartCard(monthly) {
  const maxEur = Math.max(0, ...monthly.map(m => m.wastedEur));
  if (maxEur <= 0) {
    return `
      <div class="stats-card-v2">
        <h3 class="stats-card-v2-title">📊 <span>${escapeHtml(t('wastedEvolution'))}</span></h3>
        <div class="stats-chart-empty">${escapeHtml(t('chartEmpty'))}</div>
      </div>
    `;
  }
  const bars = monthly.map(m => {
    const h = m.wastedEur > 0 ? Math.max(4, Math.round((m.wastedEur / maxEur) * 100)) : 0;
    const tip = m.fullLabel + ': ' + fmtEur(m.wastedEur);
    return `
      <div class="stats-bar-col" title="${escapeHtml(tip)}">
        <div class="stats-bar-track">
          <div class="stats-bar-fill" style="height:${h}%"></div>
        </div>
        <p class="stats-bar-label">${m.label}</p>
      </div>
    `;
  }).join('');
  return `
    <div class="stats-card-v2">
      <h3 class="stats-card-v2-title">📊 <span>${escapeHtml(t('wastedEvolution'))}</span></h3>
      <div class="stats-bar-chart">${bars}</div>
    </div>
  `;
}

// CARD 4 — Distribució per zona (calculat de products[])
function computeZoneDistribution() {
  const list = (typeof products !== 'undefined') ? products : [];
  if (!list.length) return [];
  const map = {};
  list.forEach(p => {
    const id = p.location || 'unknown';
    if (!map[id]) map[id] = 0;
    map[id]++;
  });
  const total = list.length;
  return Object.keys(map).map(id => {
    const loc = (typeof getLocationById === 'function') ? getLocationById(id) : null;
    return {
      id,
      emoji: loc ? loc.emoji : '📍',
      name: loc ? getLocationName(loc) : id,
      count: map[id],
      pct: Math.round((map[id] / total) * 100)
    };
  }).sort((a, b) => b.count - a.count);
}

function renderStatsZoneCard(zones) {
  if (!zones.length) {
    return `
      <div class="stats-card-v2">
        <h3 class="stats-card-v2-title">📍 <span>${escapeHtml(t('distributionByZone'))}</span></h3>
        <div class="stats-chart-empty">${escapeHtml(t('zoneEmpty'))}</div>
      </div>
    `;
  }
  const rows = zones.map(z => `
    <div class="stats-zone-row">
      <span class="stats-zone-emoji">${z.emoji}</span>
      <span class="stats-zone-name">${escapeHtml(z.name)}</span>
      <div class="stats-zone-bar">
        <div class="stats-zone-bar-fill" style="width:${z.pct}%"></div>
      </div>
      <span class="stats-zone-count">${z.count} (${z.pct}%)</span>
    </div>
  `).join('');
  return `
    <div class="stats-card-v2">
      <h3 class="stats-card-v2-title">📍 <span>${escapeHtml(t('distributionByZone'))}</span></h3>
      <div class="stats-zone-list">${rows}</div>
    </div>
  `;
}

// CARD 5 — Tops (més comprats / més llençats)
function computeStatsTops(history) {
  const purchasedMap = {};
  const trashedMap = {};
  history.forEach(e => {
    const key = (e.productName || '').toLowerCase().trim();
    if (!key) return;
    if (!purchasedMap[key]) purchasedMap[key] = { name: e.productName, emoji: e.productEmoji || '🥫', count: 0 };
    purchasedMap[key].count++;
    if (e.action === 'trashed') {
      if (!trashedMap[key]) trashedMap[key] = { name: e.productName, emoji: e.productEmoji || '🥫', count: 0 };
      trashedMap[key].count++;
    }
  });
  const top = (m) => Object.values(m).sort((a, b) => b.count - a.count).slice(0, 5);
  return { purchased: top(purchasedMap), trashed: top(trashedMap) };
}

function renderStatsTopsCard(tops) {
  const renderList = (arr) => arr.length
    ? arr.map(p => `
        <div class="stats-top-row">
          <span class="stats-top-emoji">${p.emoji}</span>
          <span class="stats-top-name">${escapeHtml(p.name)}</span>
          <span class="stats-top-count">${p.count}</span>
        </div>
      `).join('')
    : `<p class="stats-empty-text">—</p>`;
  return `
    <div class="stats-card-v2">
      <h3 class="stats-card-v2-title">🏆 <span>${escapeHtml(t('topPurchased'))}</span></h3>
      <div class="stats-top-list">${renderList(tops.purchased)}</div>
      <h3 class="stats-card-v2-title" style="margin-top:18px">⚠️ <span>${escapeHtml(t('topWasted'))}</span></h3>
      <div class="stats-top-list">${renderList(tops.trashed)}</div>
    </div>
  `;
}

// CARD 6 — Mitjanes (setmana / mes / global)
function computeStatsAverages(history) {
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const monthMs = 30 * 86400000;
  const sums = (since) => {
    let consumed = 0, trashed = 0;
    history.forEach(e => {
      if (since !== null) {
        const d = new Date(e.date).getTime();
        if (now - d > since) return;
      }
      if (e.action === 'consumed') consumed++;
      else if (e.action === 'trashed') trashed++;
    });
    const total = consumed + trashed;
    return { total, pct: total > 0 ? Math.round((consumed / total) * 100) : 0 };
  };
  const week = sums(weekMs);
  const month = sums(monthMs);
  const all = sums(null);

  // Productes/setmana = total / setmanes des del primer registre
  let firstDate = null;
  history.forEach(e => {
    if (!e.date) return;
    const d = new Date(e.date).getTime();
    if (!firstDate || d < firstDate) firstDate = d;
  });
  const weeks = firstDate ? Math.max(1, (now - firstDate) / weekMs) : 1;
  const perWeek = all.total / weeks;

  return { week, month, all, perWeek };
}

function renderStatsAveragesCard(a) {
  return `
    <div class="stats-card-v2">
      <h3 class="stats-card-v2-title">📅 <span>${escapeHtml(t('thisWeek'))}</span></h3>
      <p class="stats-avg-line">${a.week.total} ${escapeHtml(t('items'))} · ${a.week.pct}% ${escapeHtml(t('utilizationGlobal'))}</p>

      <h3 class="stats-card-v2-title" style="margin-top:14px">🗓️ <span>${escapeHtml(t('thisMonth'))}</span></h3>
      <p class="stats-avg-line">${a.month.total} ${escapeHtml(t('items'))} · ${a.month.pct}% ${escapeHtml(t('utilizationGlobal'))}</p>

      <h3 class="stats-card-v2-title" style="margin-top:14px">📈 <span>${escapeHtml(t('globalAverage'))}</span></h3>
      <p class="stats-avg-line">${a.perWeek.toFixed(1)} ${escapeHtml(t('productsPerWeek'))} · ${a.all.pct}% ${escapeHtml(t('utilizationGlobal'))}</p>
    </div>
  `;
}

// Modal de confirmació primary (no destructiva). El botó de confirmar usa
// l'estil per defecte; opts.confirmLabel permet personalitzar el text.
function showConfirmModal(emoji, title, message, opts, onConfirm) {
  const cfg = opts || {};
  const confirmLabel = cfg.confirmLabel || t('save');
  const cancelLabel = cfg.cancelLabel || t('cancel');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">${emoji}</div>
      <p class="modal-title">${escapeHtml(title)}</p>
      <p class="modal-sub">${escapeHtml(message)}</p>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${escapeHtml(cancelLabel)}</button>
        <button class="modal-confirm" id="modal-yes-btn">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#modal-no-btn').addEventListener('click', close);
  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    close();
    try { onConfirm(); } catch (e) { console.error(e); }
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// Modal de confirmació reusable per a accions destructives.
// title: text del títol; message: text d'avís; onConfirm: callback si l'usuari confirma.
function showConfirmDangerModal(emoji, title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">${emoji}</div>
      <p class="modal-title">${escapeHtml(title)}</p>
      <p class="modal-sub">${escapeHtml(message)}</p>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${escapeHtml(t('cancel'))}</button>
        <button class="modal-confirm modal-confirm-danger" id="modal-yes-btn">${escapeHtml(t('delete'))}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#modal-no-btn').addEventListener('click', close);
  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    close();
    try { onConfirm(); } catch (e) { console.error(e); }
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// Subtítols dinàmics de la pantalla "Esborrar dades": mostren quantes
// dades hi ha de cada categoria abans d'esborrar-la.
function updateResetDataSubs() {
  const bitemeSub = document.getElementById('reset-biteme-sub');
  if (bitemeSub) {
    const n = Array.isArray(products) ? products.length : 0;
    bitemeSub.textContent = n + ' ' + t('productsCount');
  }

  const shoppingSub = document.getElementById('reset-shopping-sub');
  if (shoppingSub) {
    const items = Array.isArray(shoppingItems) ? shoppingItems : [];
    const supersWithItems = new Set(items.map(it => it.supermarketId).filter(Boolean));
    shoppingSub.textContent = items.length + ' ' + t('productsAtShops', supersWithItems.size);
  }

  const impactSub = document.getElementById('reset-impact-sub');
  if (impactSub) {
    let count = 0;
    try {
      const raw = localStorage.getItem('eatmefirst_consumption_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) count = parsed.length;
      }
    } catch (e) {}
    if (count > 0) {
      impactSub.textContent = t('resetImpactSub') + ' · ' + count + ' ' + t('historyEntries');
    } else {
      impactSub.textContent = t('resetImpactSub');
    }
  }
  // Si la sub-pantalla "Dades" està viva, la reasignem perquè els
  // comptadors interns també es refresquin després d'un reset.
  if (typeof renderSettingsData === 'function') renderSettingsData();
}

function openResetDataScreen() {
  updateResetDataSubs();
  showScreen('reset-data');
}

// Recull totes les claus de l'app a localStorage i les baixa com a JSON.
function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 'v2.0',
    data: {}
  };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('eatmefirst_')) continue;
    const raw = localStorage.getItem(key);
    try {
      payload.data[key] = JSON.parse(raw);
    } catch (e) {
      payload.data[key] = raw;
    }
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = 'buyte-backup-' + today + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showToast(t('exportDone'));
}

// Importa un fitxer JSON exportat per exportData().
// Substitueix les claus eatmefirst_* del localStorage i recarrega.
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let json;
      try {
        json = JSON.parse(ev.target.result);
      } catch (err) {
        showToast('⚠️ ' + t('importInvalid'));
        return;
      }
      if (!json || !json.data || typeof json.data !== 'object') {
        showToast('⚠️ ' + t('importInvalid'));
        return;
      }
      const keys = Object.keys(json.data).filter(k => k.startsWith('eatmefirst_'));
      if (keys.length === 0) {
        showToast('⚠️ ' + t('importInvalid'));
        return;
      }
      showConfirmModal('📤', t('importTitle'), t('importConfirm'),
        { confirmLabel: t('importTitle') },
        () => {
          keys.forEach(k => {
            const val = json.data[k];
            localStorage.setItem(k, typeof val === 'string' ? val : JSON.stringify(val));
          });
          showToast(t('importDone'));
          setTimeout(() => location.reload(), 800);
        }
      );
    };
    reader.onerror = () => showToast('⚠️ ' + t('importInvalid'));
    reader.readAsText(file);
  };
  input.click();
}

// Esborra TOT el localStorage propi de l'app i recarrega.
function resetAll() {
  showConfirmDangerModal('🗑️', t('resetAllTitle'), t('resetAllConfirm'), () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('eatmefirst_')) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    showToast(t('doneReset'));
    setTimeout(() => location.reload(), 400);
  });
}

// Esborra només els productes del tracker BiteMe + estadístiques.
function resetBitemeProducts() {
  showConfirmDangerModal('🥗', t('resetBitemeTitle'), t('resetBitemeConfirm'), () => {
    products = [];
    stats = { consumed: 0, trashed: 0 };
    localStorage.setItem('eatmefirst_products', JSON.stringify(products));
    localStorage.setItem('eatmefirst_stats', JSON.stringify(stats));
    if (typeof pushToServer === 'function') pushToServer();
    if (typeof renderHome === 'function') renderHome();
    if (typeof renderSection === 'function') renderSection();
    if (typeof updateStatsSub === 'function') updateStatsSub();
    updateResetDataSubs();
    showToast(t('doneReset'));
  });
}

// Esborra només els items de la llista de la compra (manté supers configurats).
function resetShoppingList() {
  showConfirmDangerModal('🛒', t('resetShoppingTitle'), t('resetShoppingConfirm'), () => {
    if (typeof shoppingItems !== 'undefined') shoppingItems = [];
    localStorage.setItem('eatmefirst_shopping_items', JSON.stringify([]));
    if (typeof pushToServer === 'function') pushToServer();
    if (typeof renderSupermarkets === 'function') renderSupermarkets();
    if (typeof renderShoppingItems === 'function') renderShoppingItems();
    updateResetDataSubs();
    showToast(t('doneReset'));
  });
}

// Esborra TOT l'historial: el que alimenta "El meu impacte" (consumption_history,
// streak_record) i també els comptadors legacy de la pantalla "Estadístiques"
// (eatmefirst_stats), perquè els dos quedin a zero alhora.
function resetImpactHistory() {
  showConfirmDangerModal('📊', t('resetImpactTitle'), t('resetImpactConfirm'), () => {
    localStorage.removeItem('eatmefirst_consumption_history');
    localStorage.removeItem('eatmefirst_streak_record');
    localStorage.removeItem('eatmefirst_stats');
    if (typeof stats !== 'undefined') {
      stats.consumed = 0;
      stats.trashed = 0;
    }
    if (typeof updateImpactSub === 'function') updateImpactSub();
    if (typeof updateStatsSub === 'function') updateStatsSub();
    updateResetDataSubs();
    if (typeof pushToServer === 'function') pushToServer();
    showToast(t('doneReset'));
  });
}



// TRADUCCIONS - actualitzar tots els textos
function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  const nameInput = document.getElementById('input-name');
  if (nameInput) nameInput.placeholder = t('productNamePlaceholder');

  document.documentElement.lang = getCurrentLang();
  renderHome();
  updateThemeStatus();
  updateLangStatus();
  updateStatsSub();
  updateLocationsCount();
  updatePopularCount();
  if (typeof updateRecipesCount === 'function') updateRecipesCount();
}
