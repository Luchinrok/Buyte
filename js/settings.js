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

  if (syncEnabled) {
    const code = window.FBSync.getCurrentListId();
    subEl.textContent = '✓ ' + (code || '');
  } else {
    subEl.textContent = t('syncNotActive');
  }
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

function openSyncScreen() {
  updateSyncScreen();
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
  if (!subEl || !window.Notif) return;

  const perm = window.Notif.permissionStatus();
  const s = (typeof getSmartNotifSettings === 'function') ? getSmartNotifSettings() : { enabled: false };

  if (perm === 'unsupported') {
    subEl.textContent = t('notifNotSupportedShort');
  } else if (perm !== 'granted' || !s.enabled) {
    subEl.textContent = t('notifInactive');
  } else {
    // Mostra quants tipus té actius
    const activeCount = Object.values(s.types || {}).filter(c => c && c.enabled).length;
    subEl.textContent = '✓ ' + activeCount + ' actius';
  }
}

function openNotificationsScreen() {
  exposeForNotifications();
  if (!window.Notif) return;
  renderSmartNotifSettingsScreen();
  showScreen('notifications');
}

// Pinta tota la pantalla de configuració de notificacions: estat de permisos
// + master switch + llista de tipus. Cada tipus dibuixa un toggle i, si
// correspon, els xips d'hora i dia. Tots els controls es lliguen en un sol
// pas per simplificar el rerender després d'interaccions.
function renderSmartNotifSettingsScreen() {
  if (typeof getSmartNotifSettings !== 'function' || typeof SMART_NOTIF_TYPES === 'undefined') return;
  const settings = getSmartNotifSettings();

  // Estat de permisos
  const permStatus = window.Notif ? window.Notif.permissionStatus() : 'unsupported';
  const permEl = document.getElementById('smart-notif-perm-status');
  const reqBtn = document.getElementById('smart-notif-request-perm');
  if (permEl) {
    if (permStatus === 'granted') permEl.textContent = t('notifPermStatusGranted');
    else if (permStatus === 'denied') permEl.textContent = t('notifPermStatusDenied');
    else if (permStatus === 'unsupported') permEl.textContent = t('notifPermStatusUnsupported');
    else permEl.textContent = t('notifPermStatusDefault');
  }
  if (reqBtn) reqBtn.style.display = (permStatus === 'default') ? 'flex' : 'none';

  // Master switch
  const masterCb = document.getElementById('smart-notif-master');
  if (masterCb) masterCb.checked = !!settings.enabled;

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
      chipsHtml += '<button type="button" class="smart-notif-chip" data-action="hour">⏰ ' + hh + ':00</button>';
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

    // Listeners de la fila
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
  const cur = (settings.types[typeId] && settings.types[typeId].hour) || 0;
  const raw = window.prompt('Hora (0-23)', String(cur));
  if (raw === null) return;
  const n = parseInt(raw, 10);
  if (!isFinite(n) || n < 0 || n > 23) return;
  setSmartNotifType(typeId, { hour: n });
  renderSmartNotifSettingsScreen();
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
  if (!window.Notif) return;
  const result = await window.Notif.requestPermission();
  if (result === 'granted') {
    if (typeof setSmartNotifMaster === 'function') setSmartNotifMaster(true);
    showToast('✅ ' + t('notifPermissionGranted'));
    updateNotifStatus();
    renderSmartNotifSettingsScreen();
  } else if (result === 'denied') {
    showToast('🚫 ' + t('notifPermissionDenied'));
    renderSmartNotifSettingsScreen();
  }
}

function testNotificationNow() {
  if (!window.Notif) return;
  if (window.Notif.permissionStatus() !== 'granted') {
    showToast(t('notifPermRequired'));
    return;
  }
  const ok = window.Notif.testNotification();
  if (ok) showToast('🔔 ' + t('notifTestSent'));
  else showToast(t('notifTestError'));
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
// origin: 'add' (des del formulari) o 'settings' (des de la configuració)
function openLocations(origin) {
  const backBtn = document.getElementById('locations-back-btn');
  if (backBtn) backBtn.dataset.back = (origin === 'settings') ? 'settings' : 'add';
  renderLocationsList();
  showScreen('locations');
}

// Obre la pantalla de configuració recordant d'on s'ha cridat
// origin: 'home' (des del tracker) o 'launcher' (des de la pantalla inicial)
function openSettings(origin) {
  const backBtn = document.getElementById('settings-back-btn');
  if (backBtn) backBtn.dataset.back = (origin === 'launcher') ? 'launcher' : 'home';

  if (typeof updateThemeStatus === 'function') updateThemeStatus();
  if (typeof updateLangStatus === 'function') updateLangStatus();
  if (typeof updateStatsSub === 'function') updateStatsSub();
  if (typeof updateImpactSub === 'function') updateImpactSub();
  if (typeof updateLocationsCount === 'function') updateLocationsCount();
  if (typeof updatePopularCount === 'function') updatePopularCount();
  if (typeof updateRecipesCount === 'function') updateRecipesCount();
  if (typeof updateSyncStatus === 'function') updateSyncStatus();
  if (typeof updateNotifStatus === 'function') updateNotifStatus();
  if (typeof updateCountryStatus === 'function') updateCountryStatus();
  if (typeof updateSupermarketsStatus === 'function') updateSupermarketsStatus();
  showScreen('settings');
}

function updateSupermarketsStatus() {
  const el = document.getElementById('supermarkets-status');
  if (!el) return;
  const enabled = getEnabledSupermarkets().length;
  const total = supermarkets.length;
  el.textContent = enabled + ' / ' + total + ' ' + t('active');
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
  if (total > 0) el.textContent = t('statsText', consumed, trashed);
  else el.textContent = t('statsEmpty');
}

function updateLocationsCount() {
  const el = document.getElementById('locations-count');
  if (!el) return;
  el.textContent = locations.length + ' ' + (locations.length === 1 ? t('locationSingular') : t('locationPlural'));
}

function updatePopularCount() {
  const el = document.getElementById('popular-count');
  if (!el) return;
  const n = (typeof getPopularProducts === 'function') ? getPopularProducts().length : 0;
  el.textContent = n + ' ' + (n === 1 ? t('productSingular') : t('productPlural'));
}

function renderLangList() {
  const container = document.getElementById('lang-list');
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
function showStats() {
  const empty = document.getElementById('stats-empty');
  const body = document.getElementById('stats-body');
  const history = (typeof loadConsumptionHistory === 'function') ? loadConsumptionHistory() : [];

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
