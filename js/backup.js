/* ============================================
   Buyte — js/backup.js
   Sistema de còpies de seguretat locals.

   - Snapshot diari automàtic de TOTES les dades de l'usuari
     (claus 'eatmefirst_*' del localStorage), amb rotació a
     MAX_BACKUPS còpies (per defecte 7 = 1 setmana).
   - Restauració d'una còpia anterior, eliminant la còpia activa
     i fent abans una còpia de seguretat de l'estat actual (per
     no perdre res si l'usuari es penedeix).
   - Exportació i importació van per la mateixa via que l'export
     de Configuració > Dades (es delega a exportData/importData
     a settings.js — DRY) però aquí actualitzem el timestamp
     'eatmefirst_last_export' perquè el recordatori sàpiga que
     l'usuari ha fet una còpia recent.
   - Recordatori opcional cada EXPORT_REMINDER_DAYS dies si l'usuari
     no ha exportat res. Es mostra com a inline-banner DINS la
     pestanya Còpies (no popup intrusiu a l'app load).

   Exposat com a window.BackupSystem.
   ============================================ */


// Nombre màxim de còpies a mantenir. Quan s'arriba al límit, la més
// antiga es descarta abans d'inserir-ne una de nova.
const BACKUP_MAX_COUNT = 7;
// Recordar a l'usuari d'exportar si fa més d'aquests dies de la
// darrera exportació explícita.
const BACKUP_EXPORT_REMINDER_DAYS = 14;
// Clau on viuen les còpies dins localStorage.
const BACKUP_STORAGE_KEY = 'eatmefirst_backups';
// Timestamp de la darrera exportació "manual" (botó Exportar). El
// posa exportData() i el llegeix shouldRemindExport().
const BACKUP_LAST_EXPORT_KEY = 'eatmefirst_last_export';

// Claus que NO entren a la còpia. Les còpies en si mateixes (per no
// fer recursió/inflar la mida) i metadades de UI no consideren "dades
// de l'usuari".
const BACKUP_EXCLUDED_KEYS = new Set([
  BACKUP_STORAGE_KEY,
  BACKUP_LAST_EXPORT_KEY,
  'eatmefirst_export_reminder_dismissed_today'
]);

// Itera el localStorage i empaqueta totes les claus 'eatmefirst_*' que
// no estiguin a BACKUP_EXCLUDED_KEYS. Mateix patró que exportData() a
// settings.js — així no cal mantenir cap llista hardcoded de claus que
// es desincronitzaria a mesura que afegim/treiem features.
function _collectBackupData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('eatmefirst_')) continue;
    if (BACKUP_EXCLUDED_KEYS.has(key)) continue;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch (e) {
      // Valor pla (string sense JSON), el guardem tal qual.
      data[key] = raw;
    }
  }
  return data;
}

// Construeix l'objecte còpia. timestamp serveix d'ID; date és el
// dia local en format YYYY-MM-DD per saber si avui ja en tenim una.
function createBackup() {
  return {
    version: '1.0',
    timestamp: Date.now(),
    date: _localDateString(new Date()),
    data: _collectBackupData()
  };
}

// Format YYYY-MM-DD en hora LOCAL (no UTC). Important: Date.toISOString
// retorna UTC, que pot saltar al dia següent si l'usuari està al fus
// horari adequat. Volem la data del dia tal com el viu l'usuari.
function _localDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function listBackups() {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function _saveBackups(backups) {
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups));
    return true;
  } catch (e) {
    // Quota excedida: provem a fer espai descartant les més antigues.
    // Si encara així falla, ens rendim — és preferible no tenir cap
    // còpia nova que perdre les antigues que potser ja són útils.
    console.warn('[Backup] localStorage quota exceeded, trimming.');
    while (backups.length > 1) {
      backups.shift();
      try {
        localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups));
        return true;
      } catch (e2) { /* continue trimming */ }
    }
    console.error('[Backup] Could not save backup even after trim.');
    return false;
  }
}

// Crea una còpia i la guarda. Aplica rotació a BACKUP_MAX_COUNT.
function saveAutoBackup() {
  const backup = createBackup();
  const backups = listBackups();
  backups.push(backup);
  while (backups.length > BACKUP_MAX_COUNT) backups.shift();
  return _saveBackups(backups) ? backup : null;
}

// Cridada al boot de l'app: si encara no hi ha cap còpia, en fa una;
// si l'última és d'avui, no fa res; si l'última és d'ahir o més vell,
// en fa una de nova. Així garantim com a màxim 1 còpia per dia.
function checkAutoBackup() {
  const backups = listBackups();
  const last = backups[backups.length - 1];
  if (!last) {
    saveAutoBackup();
    return;
  }
  if (last.date === _localDateString(new Date())) return;
  saveAutoBackup();
}

// Restaura una còpia identificada pel timestamp. Abans de sobreescriure
// l'estat actual, en fa una NOVA còpia (per si l'usuari es penedeix).
// Després elimina les claus actuals que ja no apareixen a la còpia
// (perquè restaurar a un estat antic on una clau no existia equival a
// esborrar-la al restore).
function restoreBackup(timestamp) {
  const backups = listBackups();
  const backup = backups.find(b => b.timestamp === timestamp);
  if (!backup || !backup.data) return false;

  // Còpia preventiva (rotació inclosa).
  saveAutoBackup();

  // Esborra claus actuals 'eatmefirst_*' que NO apareixen a la còpia
  // (excepte les excloses, que no toquem mai). Així restaurar a un
  // estat previ no deixa "fragments" de dades que aquell estat no tenia.
  const restoredKeys = new Set(Object.keys(backup.data));
  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('eatmefirst_')) continue;
    if (BACKUP_EXCLUDED_KEYS.has(key)) continue;
    if (!restoredKeys.has(key)) keysToDelete.push(key);
  }
  keysToDelete.forEach(k => localStorage.removeItem(k));

  // Escriu les claus de la còpia.
  Object.entries(backup.data).forEach(([key, value]) => {
    try {
      const serialized = (typeof value === 'string') ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.error('[Backup] Could not restore key', key, e);
    }
  });

  return true;
}

function deleteBackup(timestamp) {
  const backups = listBackups().filter(b => b.timestamp !== timestamp);
  return _saveBackups(backups);
}

// Exportació a fitxer. Es delega a exportData() de settings.js (que ja
// fa exactament el mateix: itera 'eatmefirst_*' i descarrega un JSON)
// i, a més, marca el timestamp de l'última exportació perquè el
// recordatori sàpiga que l'usuari ha fet una còpia recent.
function exportToFile() {
  if (typeof exportData === 'function') {
    exportData();
  } else {
    // Fallback minimalista per si exportData no està disponible.
    const backup = createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'buyte-backup-' + _localDateString(new Date()) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  try { localStorage.setItem(BACKUP_LAST_EXPORT_KEY, String(Date.now())); } catch (e) {}
  return true;
}

// Importació a fitxer. Es delega a importData() de settings.js, que
// ja gestiona el file picker, validació de format i refresca la UI.
function importFromFile() {
  if (typeof importData === 'function') {
    importData();
    return true;
  }
  return false;
}

// Quants dies fa de la darrera exportació. Retorna null si encara no
// se n'ha fet cap.
function daysSinceLastExport() {
  const raw = localStorage.getItem(BACKUP_LAST_EXPORT_KEY);
  const ts = raw ? parseInt(raw, 10) : 0;
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

// True si fa més de BACKUP_EXPORT_REMINDER_DAYS de la darrera exportació
// I l'usuari no l'ha descartada avui.
function shouldRemindExport() {
  const days = daysSinceLastExport();
  if (days === null) return false;
  if (days < BACKUP_EXPORT_REMINDER_DAYS) return false;
  const dismissed = localStorage.getItem('eatmefirst_export_reminder_dismissed_today');
  if (dismissed === _localDateString(new Date())) return false;
  return true;
}

// Marca el recordatori com a "ja vist avui" perquè no es repeteixi
// fins demà (o fins que l'usuari exporti).
function dismissExportReminderForToday() {
  try {
    localStorage.setItem('eatmefirst_export_reminder_dismissed_today', _localDateString(new Date()));
  } catch (e) {}
}

// Cridada al boot. NO mostra cap popup ni banner globals — només
// exposa l'estat. La pestanya Configuració > Dades > Còpies hi posa
// una alerta inline quan shouldRemindExport() és true. Aquesta
// implementació deixa la decisió "ho mostro on?" al lloc on l'usuari
// és més probable que estigui mirant les seves dades, en comptes
// d'interrompre'l a l'app load.
function checkExportReminder() {
  // Punt d'extensió per a futures notificacions visuals al launcher,
  // però NO afegim cap UI intrusiva ara mateix.
  return shouldRemindExport();
}

window.BackupSystem = {
  createBackup,
  saveAutoBackup,
  checkAutoBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  exportToFile,
  importFromFile,
  daysSinceLastExport,
  shouldRemindExport,
  dismissExportReminderForToday,
  checkExportReminder,
  MAX_COUNT: BACKUP_MAX_COUNT,
  EXPORT_REMINDER_DAYS: BACKUP_EXPORT_REMINDER_DAYS
};
