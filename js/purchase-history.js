/* ============================================
   Buyte — js/purchase-history.js

   Registre persistent de cada compra des del BuyMe. Cada cop que un
   producte es marca "Comprat" (via _quickBuyCore o el fallback
   saveNewProduct amb pendingShoppingItemId), s'afegeix una entrada
   al map indexat per popularId (o pel nom normalitzat si no es pot
   resoldre).

   Format al localStorage['eatmefirst_purchase_history']:
   {
     "pop-4":  [ {date, price, weight, days_calc, days_real, supermarket, productId}, ... ],
     "user-5": [ ... ],
     "<name>": [ ... ]   // fallback quan no es pot resoldre popularId
   }

   Sense UI en aquest commit — la vista "Editar últimes compres"
   arribarà als commits 3a/3b. Aquest mòdul exposa només l'API.

   Sync Firebase: vegeu js/settings.js. Regla "no kill local on empty
   remote" implementada al consumir _setPurchaseHistoryFromSync.
   ============================================ */

const PURCHASE_HISTORY_KEY = 'eatmefirst_purchase_history';
const PURCHASE_HISTORY_RETENTION_DAYS = 90;

// Var global script-scope: accessible des dels altres fitxers
// carregats al mateix realm. Vegeu el patró de productHistory a
// biteme.js:2251.
let purchaseHistory = {};

function loadPurchaseHistory() {
  try {
    const raw = localStorage.getItem(PURCHASE_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      purchaseHistory = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } else {
      purchaseHistory = {};
    }
  } catch (e) {
    purchaseHistory = {};
  }
}

function savePurchaseHistory() {
  try {
    localStorage.setItem(PURCHASE_HISTORY_KEY, JSON.stringify(purchaseHistory));
  } catch (e) {
    console.warn('[PurchaseHistory] save error', e);
  }
  if (typeof pushToServer === 'function') pushToServer();
}

// Format YYYY-MM-DD en local time (no UTC). Match amb formatDateLocal
// que ja s'usa a buyme.js/biteme.js per a comparacions string-safe.
function _phLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function _phNormalizeName(name) {
  return String(name || '').toLowerCase().trim();
}

function _phResolveKey(popularId, name) {
  if (popularId && typeof popularId === 'string') return popularId;
  const k = _phNormalizeName(name);
  return k || '__unknown__';
}

// Purga lazy: cada cop que recordPurchase grava, treu les entrades
// de més de 90 dies. No corre fora d'aquest moment (no fa neteja a
// boot — l'usuari pot tenir dades fred velles fins que torni a
// comprar quelcom). Conservador per minimitzar I/O.
function _phPurgeOld() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PURCHASE_HISTORY_RETENTION_DAYS);
  const cutoffStr = _phLocalYMD(cutoff);
  Object.keys(purchaseHistory).forEach(key => {
    const list = purchaseHistory[key];
    if (!Array.isArray(list)) { delete purchaseHistory[key]; return; }
    const filtered = list.filter(r => r && r.date && r.date >= cutoffStr);
    if (filtered.length === 0) delete purchaseHistory[key];
    else if (filtered.length !== list.length) purchaseHistory[key] = filtered;
  });
}

// Punt d'entrada principal. Cridat des de:
//   - _quickBuyCore (js/buyme.js): després de products.push
//   - saveNewProduct (js/biteme.js): dins del bloc if (pendingShoppingItemId)
//
// payload: { popularId, name, price, weight, days_calc, days_real,
//            supermarket, productId }
function recordPurchase(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (!payload.name && !payload.popularId) return;
  const key = _phResolveKey(payload.popularId, payload.name);
  const record = {
    date: _phLocalYMD(new Date()),
    price: (typeof payload.price === 'number') ? payload.price : null,
    weight: payload.weight || null,
    days_calc: (typeof payload.days_calc === 'number') ? payload.days_calc : null,
    days_real: (typeof payload.days_real === 'number') ? payload.days_real : null,
    supermarket: payload.supermarket || null,
    productId: payload.productId || null
  };
  if (!Array.isArray(purchaseHistory[key])) purchaseHistory[key] = [];
  purchaseHistory[key].push(record);
  _phPurgeOld();
  savePurchaseHistory();
}

// API per al commit 3 (vista d'edició). Retorna entrades ordenades
// per data DESC (més recent primer).
function getHistoryForPopular(popularIdOrNameKey) {
  if (!popularIdOrNameKey) return [];
  const list = purchaseHistory[popularIdOrNameKey];
  if (!Array.isArray(list)) return [];
  return list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// Per al "Desar canvis" del commit 3: localitza la entrada que
// correspon a un producte EatMe concret via productId.
function findRecordByProductId(productId) {
  if (!productId) return null;
  for (const key in purchaseHistory) {
    const list = purchaseHistory[key];
    if (!Array.isArray(list)) continue;
    const rec = list.find(r => r && r.productId === productId);
    if (rec) return { key: key, record: rec };
  }
  return null;
}

function updateHistoryRecord(productId, partial) {
  const found = findRecordByProductId(productId);
  if (!found) return false;
  const r = found.record;
  if (partial && typeof partial === 'object') {
    if ('price' in partial) r.price = (typeof partial.price === 'number') ? partial.price : null;
    if ('weight' in partial) r.weight = partial.weight || null;
    if ('days_real' in partial) r.days_real = (typeof partial.days_real === 'number') ? partial.days_real : null;
    if ('supermarket' in partial) r.supermarket = partial.supermarket || null;
  }
  savePurchaseHistory();
  return true;
}

// Sync helpers — exclusius per a settings.js. NO exposem el map
// directament: forcem el pas pels guards per evitar overwrites
// accidentals.
function _getPurchaseHistoryForSync() {
  return purchaseHistory;
}
function _setPurchaseHistoryFromSync(map) {
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    purchaseHistory = map;
    try { localStorage.setItem(PURCHASE_HISTORY_KEY, JSON.stringify(purchaseHistory)); } catch (e) {}
  }
}
