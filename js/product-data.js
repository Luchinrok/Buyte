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

// Converteix una qty en kg fent servir l'emoji per saber el pes per unitat
// si no hi ha unitats explícites. Casos:
//   "1kg", "500g", "1.5kg"      → conversió directa de pes
//   "1L", "500ml", "1.5L"       → tractem 1L = 1kg
//   "4", "12 unitats"            → nombre × pes-per-unitat[emoji]
//   "" / null                    → pes-per-unitat[emoji] (1 unitat)
function parseQuantityToKg(qty, emoji) {
  if (qty === null || qty === undefined || (typeof qty === 'string' && qty.trim() === '')) {
    return getWeightPerUnit(emoji);
  }
  const s = String(qty).trim().toLowerCase().replace(',', '.');

  // "1.5kg", "500g"
  const kgMatch = s.match(/^(\d+(?:\.\d+)?)\s*kg\b/);
  if (kgMatch) return parseFloat(kgMatch[1]);
  const gMatch = s.match(/^(\d+(?:\.\d+)?)\s*g\b/);
  if (gMatch) return parseFloat(gMatch[1]) / 1000;

  // "1.5L", "500ml" — densitat 1
  const lMatch = s.match(/^(\d+(?:\.\d+)?)\s*l\b/);
  if (lMatch) return parseFloat(lMatch[1]);
  const mlMatch = s.match(/^(\d+(?:\.\d+)?)\s*ml\b/);
  if (mlMatch) return parseFloat(mlMatch[1]) / 1000;

  // Nombre sol o seguit de paraula (unitats, paquets, ...)
  const numMatch = s.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const n = parseFloat(numMatch[1]);
    return n * getWeightPerUnit(emoji);
  }

  // No hem reconegut res → assumim 1 unitat
  return getWeightPerUnit(emoji);
}

// Retorna el pes total del producte en kg, respectant product.weight
// si l'usuari l'ha informat (text com "500g" o número directament en kg),
// altrament el dedueix de product.qty + emoji.
function resolveProductWeightKg(product) {
  if (!product) return DEFAULT_WEIGHT_PER_UNIT;
  if (typeof product.weight === 'number' && product.weight > 0) return product.weight;
  if (typeof product.weight === 'string' && product.weight.trim() !== '') {
    return parseQuantityToKg(product.weight, product.emoji);
  }
  return parseQuantityToKg(product.qty, product.emoji);
}

// Retorna el preu total estimat del producte (€). Prioritats:
//   1. product.price si > 0 (preu total que ha posat l'usuari)
//   2. (pes en kg) × (preu/kg de la categoria)
function getProductPrice(product) {
  if (!product) return 0;
  if (typeof product.price === 'number' && product.price > 0) return product.price;
  const kg = resolveProductWeightKg(product);
  const cat = getCategoryFromEmoji(product.emoji);
  const perKg = PRODUCT_PRICES_PER_KG[cat] !== undefined ? PRODUCT_PRICES_PER_KG[cat] : PRODUCT_PRICES_PER_KG.default;
  return kg * perKg;
}

// Retorna els kg de CO₂ eq totals associats al producte (segons pes).
function getProductCO2(product) {
  if (!product) return 0;
  const kg = resolveProductWeightKg(product);
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
