/* ============================================
   Buyte — js/product-data.js
   Preus mitjans, petjada de CO₂ i pes mitjà per
   categoria/emoji de producte. S'utilitzen com a
   fallback quan l'usuari no informa preu/pes, i per
   estimar l'estalvi i l'impacte ambiental a la
   pantalla d'estadístiques.
   ============================================ */


// Preu mitjà en €/kg (o €/L per begudes) per categoria.
const PRODUCT_PRICES_PER_KG = {
  dairy: 4,
  redMeat: 12,
  whiteMeat: 6,
  fish: 14,
  fruit: 2,
  vegetable: 2,
  bread: 4,
  pasta: 1.5,
  drinks: 2,
  sweets: 8,
  canned: 5,
  default: 4
};

// kg de CO₂ equivalent emès per kg de producte.
const PRODUCT_CO2_PER_KG = {
  redMeat: 27,
  whiteMeat: 6,
  fish: 5,
  dairy: 3,
  pasta: 1.5,
  canned: 1.5,
  bread: 0.9,
  vegetable: 0.5,
  drinks: 0.5,
  fruit: 0.4,
  sweets: 4,
  default: 2
};

// Pes mitjà en kg per UNITAT segons emoji concret. S'usa per quan
// l'usuari posa un nombre sense unitat ("4" pomes → 4 × 0.15 kg).
const PRODUCT_WEIGHTS_PER_UNIT = {
  '🍎': 0.15,   // poma
  '🍌': 0.12,   // plàtan
  '🍊': 0.18,   // taronja
  '🍓': 0.02,   // maduixa
  '🥝': 0.1,    // kiwi
  '🥭': 0.4,    // mango
  '🍇': 0.15,
  '🍑': 0.1,
  '🍒': 0.01,
  '🍐': 0.18,
  '🍉': 6.0,    // síndria sencera
  '🍈': 1.5,
  '🍍': 1.2,
  '🍅': 0.12,
  '🥒': 0.4,
  '🥕': 0.08,
  '🥔': 0.2,
  '🧅': 0.15,
  '🧄': 0.05,
  '🥬': 0.5,
  '🥦': 0.4,
  '🌽': 0.3,
  '🍆': 0.4,
  '🌶️': 0.05,
  '🫑': 0.2,
  '🥚': 0.06,
  '🥖': 0.25,   // barra de pa
  '🍞': 0.5,    // pa de motlle
  '🥐': 0.07,
  '🥯': 0.1,
  '🥛': 1.0,    // 1L de llet ≈ 1kg
  '🧃': 1.0,
  '🥤': 0.5,
  '🍷': 0.75,
  '🍺': 0.33,
  '🥩': 0.25,   // filet
  '🍗': 0.3,    // cuixa
  '🍖': 0.35,
  '🥓': 0.15,
  '🌭': 0.08,
  '🐟': 0.3,
  '🦐': 0.02,
  '🦑': 0.3,
  '🍝': 0.5,    // paquet pasta
  '🍚': 1.0,    // paquet arròs
  '🧀': 0.25,
  '🧈': 0.25,
  '🍫': 0.1,
  '🍪': 0.05,
  '🍰': 0.15,
  '🍩': 0.06,
  '🥫': 0.4
};
const DEFAULT_WEIGHT_PER_UNIT = 0.3;

// Mapatge emoji → categoria de preu (les categories de preu i CO₂ ja
// coincideixen, així que en mantenim un de sol).
const EMOJI_TO_CATEGORY = {
  '🥛': 'dairy', '🥚': 'dairy', '🧀': 'dairy', '🧈': 'dairy',
  '🥩': 'redMeat', '🥓': 'redMeat', '🌭': 'redMeat', '🍖': 'redMeat',
  '🍗': 'whiteMeat',
  '🐟': 'fish', '🦐': 'fish', '🦑': 'fish',
  '🍎': 'fruit', '🍌': 'fruit', '🍊': 'fruit', '🍓': 'fruit', '🍇': 'fruit',
  '🥝': 'fruit', '🥭': 'fruit', '🍑': 'fruit', '🍒': 'fruit', '🍐': 'fruit',
  '🍉': 'fruit', '🍈': 'fruit', '🍍': 'fruit',
  '🥬': 'vegetable', '🥦': 'vegetable', '🥒': 'vegetable', '🥕': 'vegetable',
  '🌽': 'vegetable', '🍅': 'vegetable', '🍆': 'vegetable', '🌶️': 'vegetable',
  '🫑': 'vegetable', '🧄': 'vegetable', '🧅': 'vegetable', '🥔': 'vegetable',
  '🥖': 'bread', '🍞': 'bread', '🥐': 'bread', '🥯': 'bread',
  '🍝': 'pasta', '🍚': 'pasta',
  '🧃': 'drinks', '🍷': 'drinks', '🍺': 'drinks', '🥤': 'drinks',
  '🍫': 'sweets', '🍪': 'sweets', '🍰': 'sweets', '🍩': 'sweets',
  '🥫': 'canned'
};

function getCategoryFromEmoji(emoji) {
  if (!emoji) return 'default';
  return EMOJI_TO_CATEGORY[emoji] || 'default';
}

function getWeightPerUnit(emoji) {
  if (!emoji) return DEFAULT_WEIGHT_PER_UNIT;
  return PRODUCT_WEIGHTS_PER_UNIT[emoji] || DEFAULT_WEIGHT_PER_UNIT;
}

// Helpers de parseig.
//   - "Quantitat numèrica" = només dígits (opcionalment amb decimal): "1", "2.5", "12".
//   - "Pes amb unitat"     = número seguit de g/kg/ml/L (case insensitive): "500g", "1kg", "1L".
function _normalize(s) {
  if (s === null || s === undefined) return '';
  return String(s).trim().toLowerCase().replace(',', '.');
}

function _parseNumericQty(s) {
  const n = _normalize(s);
  if (n === '') return null;
  return /^\d+(?:\.\d+)?$/.test(n) ? parseFloat(n) : null;
}

// Parsa una cadena tipus "500g" / "1kg" / "200ml" / "1.5L" a kg.
// Retorna null si la cadena no encaixa amb cap d'aquests patrons.
function _parseWeightString(s) {
  const n = _normalize(s);
  if (n === '') return null;
  let m = n.match(/^(\d+(?:\.\d+)?)\s*kg\b/);
  if (m) return parseFloat(m[1]);
  m = n.match(/^(\d+(?:\.\d+)?)\s*g\b/);
  if (m) return parseFloat(m[1]) / 1000;
  m = n.match(/^(\d+(?:\.\d+)?)\s*l\b/);
  if (m) return parseFloat(m[1]);
  m = n.match(/^(\d+(?:\.\d+)?)\s*ml\b/);
  if (m) return parseFloat(m[1]) / 1000;
  return null;
}

// Calcula el pes TOTAL del producte en kg seguint aquestes regles:
//
//   CAS 1 — qty numèrica + weight amb unitat:
//     weight és per unitat → total = qty × weight
//   CAS 2 — qty numèrica sense weight:
//     qty és nombre d'unitats → total = qty × pes_mitjà_per_unitat[emoji]
//   CAS 3 — weight amb unitat sense qty:
//     weight és el pes total directe
//   CAS 4 — qty amb unitat (no numèrica) sense weight:
//     tractar qty com a weight
//   CAS 5 — Ni qty ni weight reconeguts:
//     pes per defecte segons emoji (1 unitat)
function parseQuantityToKg(product) {
  if (!product) return DEFAULT_WEIGHT_PER_UNIT;
  const emoji = product.emoji;

  // product.weight pot venir com a número (kg directe) o text ("500g").
  let weightKg = null;
  if (typeof product.weight === 'number' && product.weight > 0) {
    weightKg = product.weight;
  } else if (typeof product.weight === 'string') {
    weightKg = _parseWeightString(product.weight);
  }

  const qtyNumber = _parseNumericQty(product.qty);
  const qtyAsWeightKg = (qtyNumber === null) ? _parseWeightString(product.qty) : null;

  // CAS 1
  if (qtyNumber !== null && weightKg !== null) return qtyNumber * weightKg;
  // CAS 2
  if (qtyNumber !== null) return qtyNumber * getWeightPerUnit(emoji);
  // CAS 3
  if (weightKg !== null) return weightKg;
  // CAS 4
  if (qtyAsWeightKg !== null) return qtyAsWeightKg;
  // CAS 5
  return getWeightPerUnit(emoji);
}

// Retorna el preu TOTAL estimat del producte (€) seguint aquestes regles:
//
//   P1 — product.price > 0:
//     CAS A — qty numèrica > 1 i weight definit:
//       price és per unitat → total = price × qty
//     CAS B — només qty numèrica (sense weight):
//       price és per unitat → total = price × qty
//     CAS C — la resta:
//       price és el total directe del producte
//   P2 — sense price:
//     total = pes_kg × preu_per_kg_segons_categoria
function getProductPrice(product) {
  if (!product) return 0;

  const qtyNumber = _parseNumericQty(product.qty);
  const hasUnitWeight =
    (typeof product.weight === 'number' && product.weight > 0) ||
    (typeof product.weight === 'string' && _parseWeightString(product.weight) !== null);

  if (typeof product.price === 'number' && product.price > 0) {
    // CAS A
    if (qtyNumber !== null && qtyNumber > 1 && hasUnitWeight) {
      return product.price * qtyNumber;
    }
    // CAS B
    if (qtyNumber !== null && !hasUnitWeight) {
      return product.price * qtyNumber;
    }
    // CAS C
    return product.price;
  }

  // P2 — sense preu posat: derivar del pes × preu/kg
  const kg = parseQuantityToKg(product);
  const cat = getCategoryFromEmoji(product.emoji);
  const perKg = PRODUCT_PRICES_PER_KG[cat] !== undefined ? PRODUCT_PRICES_PER_KG[cat] : PRODUCT_PRICES_PER_KG.default;
  return kg * perKg;
}

// Retorna els kg de CO₂ eq totals associats al producte. El CO₂ depèn
// purament del pes total i la categoria.
function getProductCO2(product) {
  if (!product) return 0;
  const kg = parseQuantityToKg(product);
  const cat = getCategoryFromEmoji(product.emoji);
  const perKg = PRODUCT_CO2_PER_KG[cat] !== undefined ? PRODUCT_CO2_PER_KG[cat] : PRODUCT_CO2_PER_KG.default;
  return kg * perKg;
}


// ─────────────────────────────────────────────
// LEGACY (deprecated): mantingudes per compatibilitat
// amb codi antic que les pugui cridar. La nova lògica
// hauria d'usar getProductPrice(product) i getProductCO2(product),
// que tenen en compte el pes/quantitat real.
// ─────────────────────────────────────────────

// @deprecated — fer servir getProductPrice(product)
function getDefaultPrice(emoji) {
  const cat = getCategoryFromEmoji(emoji);
  const perKg = PRODUCT_PRICES_PER_KG[cat] !== undefined ? PRODUCT_PRICES_PER_KG[cat] : PRODUCT_PRICES_PER_KG.default;
  return perKg * getWeightPerUnit(emoji);
}

// @deprecated — fer servir getProductCO2(product)
function getCO2(emoji) {
  const cat = getCategoryFromEmoji(emoji);
  const perKg = PRODUCT_CO2_PER_KG[cat] !== undefined ? PRODUCT_CO2_PER_KG[cat] : PRODUCT_CO2_PER_KG.default;
  return perKg * getWeightPerUnit(emoji);
}
