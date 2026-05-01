/* ============================================
   Buyte — js/product-data.js
   Preus mitjans i petjada de CO₂ per categoria de
   producte. S'utilitzen com a fallback quan l'usuari
   no informa preu, i per estimar l'estalvi i l'impacte
   ambiental a la pantalla d'estadístiques.
   ============================================ */


// Preus mitjans en € per categoria
const PRODUCT_PRICES = {
  dairy: 1.5,
  meat: 5,
  fish: 8,
  fruit: 1,
  vegetable: 1,
  bread: 1.5,
  pasta: 1,
  drinks: 2,
  sweets: 3,
  canned: 2,
  default: 2
};

// kg de CO₂ equivalent per producte. Notablement: la carn vermella
// té una petjada molt més alta que la blanca, i els lactis més que la
// majoria de vegetals.
const PRODUCT_CO2 = {
  dairy: 3,
  redMeat: 27,
  whiteMeat: 6,
  fish: 5,
  fruit: 0.4,
  vegetable: 0.5,
  bread: 0.9,
  pasta: 1.5,
  drinks: 0.5,
  sweets: 4,
  canned: 1.5,
  default: 2
};

// Mapatge emoji → categoria (per al càlcul de preu).
const EMOJI_TO_CATEGORY = {
  '🥛': 'dairy', '🥚': 'dairy', '🧀': 'dairy', '🧈': 'dairy',
  '🥩': 'meat', '🍗': 'meat', '🍖': 'meat', '🥓': 'meat', '🌭': 'meat',
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

// Mapatge emoji → categoria CO₂. La carn es divideix en vermella i blanca
// perquè l'impacte mediambiental és molt diferent.
const EMOJI_TO_CO2_CATEGORY = {
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


// Retorna el preu mitjà en € segons l'emoji del producte.
function getDefaultPrice(emoji) {
  if (!emoji) return PRODUCT_PRICES.default;
  const cat = EMOJI_TO_CATEGORY[emoji];
  if (cat && PRODUCT_PRICES[cat] !== undefined) return PRODUCT_PRICES[cat];
  return PRODUCT_PRICES.default;
}

// Retorna els kg de CO₂ equivalent estimats per producte segons l'emoji.
function getCO2(emoji) {
  if (!emoji) return PRODUCT_CO2.default;
  const cat = EMOJI_TO_CO2_CATEGORY[emoji];
  if (cat && PRODUCT_CO2[cat] !== undefined) return PRODUCT_CO2[cat];
  return PRODUCT_CO2.default;
}
