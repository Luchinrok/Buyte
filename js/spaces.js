/* ============================================
   Buyte — js/spaces.js
   Sistema de múltiples Espais.

   Un Espai (a la UI: "🏠 Casa", "🏖️ Platja", etc.) és una unitat
   independent de dades de l'usuari: productes, llista de la compra,
   supermercats, zones (Nevera/Congelador), llistes especials,
   història de consum i activitat de patterns. Cada Espai té el seu
   propi codi de família Firebase per a la sync entre dispositius.

   Internament tot s'anomena "Spaces / spaces" per evitar la col·lisió
   amb el concepte EXISTENT de "locations" (zones de productes, vegeu
   js/biteme.js i la pantalla #screen-locations). La UI mostra "Espais".

   AQUEST FITXER (FASE 1) NOMÉS exposa el data layer + la migració
   automàtica que crea l'Espai "Casa" per als usuaris existents
   heretant el seu eatmefirst_sync_code actual. No toca Firebase ni
   la UI — això ho fan les fases 2-4.

   ============================================ */


// Clau del localStorage on viu la llista d'Espais.
const SPACES_STORAGE_KEY = 'eatmefirst_spaces';
// Clau del localStorage amb l'id de l'Espai actiu.
const SPACES_ACTIVE_KEY = 'eatmefirst_active_space_id';
// Id del primer Espai que es crea automàticament en la migració
// (estable, així es pot fer servir com a referència estàtica).
const SPACES_DEFAULT_HOME_ID = 'space_default_home';

// Icones suggerides al picker per a un Espai. L'usuari pot triar
// qualsevol caràcter unicode al final, però aquestes són les de
// referència ràpida.
const SPACES_ICON_OPTIONS = ['🏠', '🏖️', '💼', '🏡', '⛺', '🏨', '🛒', '🍽️', '📍'];

// Claus del localStorage que pertanyen a UN Espai concret. En canviar
// d'Espai, aquestes es buiden (i la sync Firebase del nou Espai porta
// les seves dades). Les claus NO incloses aquí són GLOBALS i es
// mantenen entre Espais (gamificació, tema, idioma, smart notifs,
// backups, recordatoris d'export, patterns dismissed, i totes les
// receptes — segons la decisió validada).
const SPACES_PER_SPACE_KEYS = Object.freeze([
  'eatmefirst_products',
  'eatmefirst_shopping_items',
  'eatmefirst_supermarkets',
  'eatmefirst_locations',          // les zones de productes (Nevera/Congelador/Rebost/...)
  'eatmefirst_special_lists',
  'eatmefirst_special_lists_used', // comptador de gamificació lligat a special_lists
  'eatmefirst_consumption_history',
  'eatmefirst_app_activity'
]);


function _spacesRead() {
  try {
    const raw = localStorage.getItem(SPACES_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function _spacesWrite(spaces) {
  try {
    localStorage.setItem(SPACES_STORAGE_KEY, JSON.stringify(spaces));
    return true;
  } catch (e) {
    console.error('[Spaces] Could not save:', e);
    return false;
  }
}


// ----- Lectura -----

function getSpaces() {
  return _spacesRead();
}

function getActiveSpaceId() {
  return localStorage.getItem(SPACES_ACTIVE_KEY) || null;
}

function getActiveSpace() {
  const id = getActiveSpaceId();
  if (!id) return null;
  return _spacesRead().find(s => s.id === id) || null;
}

function getSpaceById(id) {
  if (!id) return null;
  return _spacesRead().find(s => s.id === id) || null;
}


// ----- Mutacions -----

// Marca un Espai com a actiu. Retorna true si ha canviat. NO toca el
// localStorage de dades (productes, etc.) — això és responsabilitat
// del switch que es farà a la FASE 4.
function setActiveSpace(spaceId) {
  if (!spaceId) return false;
  const spaces = _spacesRead();
  if (!spaces.find(s => s.id === spaceId)) return false;
  // Sincronitzem el flag isActive al JSON per llegibilitat.
  // La FONT DE VERITAT és la clau eatmefirst_active_space_id.
  const updated = spaces.map(s => Object.assign({}, s, { isActive: s.id === spaceId }));
  _spacesWrite(updated);
  try { localStorage.setItem(SPACES_ACTIVE_KEY, spaceId); } catch (e) {}
  return true;
}

// Crea un Espai nou (sense activar-lo). Retorna l'objecte creat.
function createSpace(name, icon) {
  const trimmed = (name || '').trim() || 'Espai';
  const newSpace = {
    id: 'space_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: trimmed,
    icon: icon || '🏠',
    syncCode: null,         // s'omplirà en connectar-lo a Firebase (fase 3)
    createdAt: Date.now(),
    isActive: false
  };
  const spaces = _spacesRead();
  spaces.push(newSpace);
  _spacesWrite(spaces);
  return newSpace;
}

// Esborra un Espai. Si era l'actiu, queda sense espai actiu (la fase
// 4 s'encarregarà de què passa amb les dades en aquest cas — aquí
// només mantenim el data layer).
function deleteSpace(spaceId) {
  if (!spaceId) return false;
  const spaces = _spacesRead().filter(s => s.id !== spaceId);
  _spacesWrite(spaces);
  if (getActiveSpaceId() === spaceId) {
    try { localStorage.removeItem(SPACES_ACTIVE_KEY); } catch (e) {}
  }
  return true;
}

function renameSpace(spaceId, newName) {
  const trimmed = (newName || '').trim();
  if (!trimmed) return false;
  const spaces = _spacesRead().map(s =>
    s.id === spaceId ? Object.assign({}, s, { name: trimmed }) : s
  );
  return _spacesWrite(spaces);
}

function setSpaceIcon(spaceId, icon) {
  const spaces = _spacesRead().map(s =>
    s.id === spaceId ? Object.assign({}, s, { icon: icon || '🏠' }) : s
  );
  return _spacesWrite(spaces);
}

function updateSpaceSyncCode(spaceId, syncCode) {
  const spaces = _spacesRead().map(s =>
    s.id === spaceId ? Object.assign({}, s, { syncCode: syncCode || null }) : s
  );
  return _spacesWrite(spaces);
}


// ----- Switch d'Espai actiu (FASE 4) -----

// Canvia l'Espai actiu. Aplica el següent flux:
//   1) Backup local automàtic via BackupSystem (si existeix). Així si
//      l'usuari es penedeix té una còpia de l'estat anterior.
//   2) Sincronitza la clau legacy 'eatmefirst_sync_code' amb el codi
//      del nou Espai (firebase-sync.js encara llegeix aquesta clau a
//      initSync — així no cal tocar-lo per a la fase 4).
//   3) Esborra les claus PER-ESPAI del localStorage. Les GLOBALS
//      (gamificació, tema, idioma, smart notifs, backups, recordatori
//      d'export, patterns dismissed, TOTES les receptes) es preserven.
//   4) Activa el nou Espai (setActiveSpace).
//
// Després d'aquesta funció, el cridador ha de fer location.reload()
// perquè l'estat in-memory (variables globals com `products`,
// `locations`, etc.) es recarregui de zero. Amb la sync-code clau
// actualitzada, initSync() del proper boot connecta automàticament al
// Firebase del nou Espai i onRemoteData hi rega les dades del cloud.
//
// Retorna un objecte amb metadades del switch (per al log/debugging),
// o false si el switch no s'ha pogut fer (Espai no existeix, ja és
// l'actiu, etc.).
function switchToSpace(targetSpaceId) {
  if (!targetSpaceId) return false;
  const target = getSpaceById(targetSpaceId);
  if (!target) return false;
  if (getActiveSpaceId() === targetSpaceId) return false;

  // 1) Backup local
  let backupOk = false;
  if (window.BackupSystem && typeof window.BackupSystem.saveAutoBackup === 'function') {
    try {
      const b = window.BackupSystem.saveAutoBackup();
      backupOk = !!b;
    } catch (e) {
      console.warn('[Spaces] backup pre-switch ha fallat:', e);
    }
  }

  // 2) Esborrar claus per-espai (NO toquem globals)
  SPACES_PER_SPACE_KEYS.forEach(k => {
    try { localStorage.removeItem(k); } catch (e) {}
  });

  // 3) Activar el nou Espai
  setActiveSpace(targetSpaceId);

  // 4) Sincronitzar la clau legacy de Firebase amb el codi del nou
  //    Espai. Si el nou Espai no té codi (cas defensiu — els fluxos
  //    actuals sempre n'assignen un), netegem la clau perquè no es
  //    quedi una connexió Firebase stale.
  if (target.syncCode) {
    try { localStorage.setItem('eatmefirst_sync_code', target.syncCode); } catch (e) {}
  } else {
    try { localStorage.removeItem('eatmefirst_sync_code'); } catch (e) {}
  }

  console.log('[Spaces] Switch a "' + (target.name || target.id) + '"', backupOk ? '(backup OK)' : '(sense backup)');
  return { ok: true, target, backupOk };
}


// ----- Migració automàtica -----

// Cridada al boot. Si l'usuari encara no té cap Espai, en crea un per
// defecte ("🏠 Casa") i el fa actiu. Si tenia eatmefirst_sync_code
// (estava sincronitzat a la versió anterior), aquell codi queda lligat
// al nou Espai Casa — així NO perd la sincronització en actualitzar
// l'app.
//
// Idempotent: cridada múltiples vegades, només actua la primera. Si
// ja existeix com a mínim un Espai, no fa res.
function migrateToSpaces() {
  const existing = _spacesRead();
  if (existing.length > 0) {
    // Defensiu: si la migració s'havia fet però no hi ha actiu (estat
    // corrupte), reactivem el primer.
    if (!getActiveSpaceId()) {
      try { localStorage.setItem(SPACES_ACTIVE_KEY, existing[0].id); } catch (e) {}
    }
    return false;
  }
  let currentSyncCode = null;
  try { currentSyncCode = localStorage.getItem('eatmefirst_sync_code') || null; } catch (e) {}
  const home = {
    id: SPACES_DEFAULT_HOME_ID,
    name: 'Casa',
    icon: '🏠',
    syncCode: currentSyncCode,
    createdAt: Date.now(),
    isActive: true
  };
  _spacesWrite([home]);
  try { localStorage.setItem(SPACES_ACTIVE_KEY, home.id); } catch (e) {}
  if (currentSyncCode) {
    console.log('[Spaces] Migració: creat Espai "Casa" amb codi existent', currentSyncCode);
  } else {
    console.log('[Spaces] Migració: creat Espai "Casa" sense codi de sync');
  }
  return true;
}


// ----- API exposada -----
window.SpacesSystem = {
  getSpaces,
  getActiveSpace,
  getActiveSpaceId,
  getSpaceById,
  setActiveSpace,
  createSpace,
  deleteSpace,
  renameSpace,
  setSpaceIcon,
  updateSpaceSyncCode,
  switchToSpace,
  migrateToSpaces,
  ICON_OPTIONS: SPACES_ICON_OPTIONS,
  PER_SPACE_KEYS: SPACES_PER_SPACE_KEYS,
  STORAGE_KEY: SPACES_STORAGE_KEY,
  ACTIVE_KEY: SPACES_ACTIVE_KEY,
  DEFAULT_HOME_ID: SPACES_DEFAULT_HOME_ID
};
