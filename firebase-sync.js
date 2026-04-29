// ============ Buyte — Sincronització Firebase ============
// Aquest fitxer encapsula tota la lògica de sincronització
// L'app principal el crida a través de l'objecte global FBSync.

const firebaseConfig = {
  apiKey: "AIzaSyBhtDT-y_nzUPgcQmAFEZxy4HjnYAp6xJY",
  authDomain: "eatmefirst.firebaseapp.com",
  projectId: "eatmefirst",
  storageBucket: "eatmefirst.firebasestorage.app",
  messagingSenderId: "358653080285",
  appId: "1:358653080285:web:aa8cf63b73670273416134"
};

// ESTAT
let fbApp = null;
let fbDb = null;
let fbReady = false;
let currentListId = null;
let docUnsubscribe = null; // funció per parar de rebre actualitzacions
let lastRemoteUpdate = 0;  // timestamp de l'última actualització rebuda
let pendingSyncTimeout = null;
let onRemoteUpdate = null; // callback que invoquem quan rebem dades remotes

// Inicialitza Firebase amb les SDKs carregades dinàmicament
async function initFirebase() {
  if (fbReady) return true;

  try {
    // Carreguem les SDKs ESM des del CDN oficial de Google
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js');
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js');

    window.__firestoreModule = firestoreModule;
    fbApp = initializeApp(firebaseConfig);
    fbDb = firestoreModule.getFirestore(fbApp);
    fbReady = true;
    return true;
  } catch (e) {
    console.error('Firebase init error:', e);
    return false;
  }
}

// Genera un codi de família aleatori (12 caracters, tipus EMF-7K9P-X3A4)
function generateFamilyCode() {
  // Sense els caràcters confusos: 0/O, 1/I/L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = 'EMF-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += '-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// Verifica si un codi de família existeix ja a la base de dades
async function codeExists(code) {
  if (!fbReady) return false;
  try {
    const { doc, getDoc } = window.__firestoreModule;
    const ref = doc(fbDb, 'lists', code);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (e) {
    console.error('codeExists error:', e);
    return false;
  }
}

// Crea una nova llista al servidor amb el codi donat i les dades inicials
async function createList(code, initialData) {
  if (!fbReady) throw new Error('Firebase not ready');
  const { doc, setDoc } = window.__firestoreModule;
  const ref = doc(fbDb, 'lists', code);
  await setDoc(ref, {
    ...initialData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  });
}

// Connecta a una llista existent (no la crea, només subscriu)
// Fallarà silenciosament si no existeix; el cridador ho ha de comprovar abans
async function connectToList(code, onUpdate) {
  if (!fbReady) throw new Error('Firebase not ready');
  // Atura subscripcions anteriors
  if (docUnsubscribe) {
    try { docUnsubscribe(); } catch(e) {}
    docUnsubscribe = null;
  }

  currentListId = code;
  onRemoteUpdate = onUpdate;

  const { doc, onSnapshot } = window.__firestoreModule;
  const ref = doc(fbDb, 'lists', code);

  docUnsubscribe = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      console.warn('La llista ja no existeix');
      return;
    }
    const data = snap.data();
    lastRemoteUpdate = data.updatedAt || 0;
    if (onRemoteUpdate) onRemoteUpdate(data);
  }, (err) => {
    console.error('onSnapshot error:', err);
  });
}

// Desconnecta de la llista actual
function disconnect() {
  if (docUnsubscribe) {
    try { docUnsubscribe(); } catch(e) {}
    docUnsubscribe = null;
  }
  currentListId = null;
  onRemoteUpdate = null;
  if (pendingSyncTimeout) {
    clearTimeout(pendingSyncTimeout);
    pendingSyncTimeout = null;
  }
}

// Puja les dades locals al servidor (debounced per no fer massa escriptures)
function uploadData(data) {
  if (!fbReady || !currentListId) return;
  // Debounce: si fas múltiples canvis ràpids, només pugem 1 cop
  if (pendingSyncTimeout) clearTimeout(pendingSyncTimeout);
  pendingSyncTimeout = setTimeout(async () => {
    pendingSyncTimeout = null;
    try {
      const { doc, setDoc } = window.__firestoreModule;
      const ref = doc(fbDb, 'lists', currentListId);
      await setDoc(ref, {
        ...data,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.error('uploadData error:', e);
    }
  }, 1000); // espera 1 segon
}

// API exposada
window.FBSync = {
  init: initFirebase,
  generateCode: generateFamilyCode,
  codeExists: codeExists,
  createList: createList,
  connectToList: connectToList,
  disconnect: disconnect,
  upload: uploadData,
  isReady: () => fbReady,
  getCurrentListId: () => currentListId,
  isConnected: () => !!currentListId
};
