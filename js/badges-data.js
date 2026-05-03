/* ============================================
   Buyte — js/badges-data.js
   Catàleg de 45 insignies. Cada entrada té:
     id, emoji, name, description, category,
     xpReward (XP que dona desbloquejar-la),
     type    — codi del check que avalua si està desbloquejada
     value   — paràmetre de l'avaluador (típicament un llindar)
     hint    — opcional, text de progrés "X/Y" o estat
   El motor (gamification.js) sap interpretar cada `type`.
   ============================================ */

const BADGE_CATEGORIES = [
  { id: 'inici',        label: 'Inici',         emoji: '🚀' },
  { id: 'constancia',   label: 'Constància',    emoji: '🔥' },
  { id: 'eco',          label: 'Eco-warrior',   emoji: '🌍' },
  { id: 'estalviador',  label: 'Estalviador',   emoji: '💰' },
  { id: 'mestre',       label: 'Mestre',        emoji: '⭐' },
  { id: 'cookme',       label: 'CookMe',        emoji: '👨‍🍳' },
  { id: 'organitzador', label: 'Organitzador',  emoji: '🗂️' },
  { id: 'especial',     label: 'Especial',      emoji: '✨' }
];

const BADGES = [
  // ============= INICI (6) =============
  { id: 'first-product', emoji: '🎯', name: 'Primer pas',
    description: 'Has afegit el teu primer producte al BiteMe',
    category: 'inici', xpReward: 50, type: 'products_added_total', value: 1 },
  { id: 'first-buyme', emoji: '🛒', name: 'Compra inicial',
    description: 'Has afegit el primer producte al BuyMe',
    category: 'inici', xpReward: 50, type: 'buyme_added_total', value: 1 },
  { id: 'first-cookme', emoji: '🍳', name: 'Primera cuina',
    description: 'Has consultat la teva primera recepta al CookMe',
    category: 'inici', xpReward: 50, type: 'cookme_views_total', value: 1 },
  { id: 'first-consumed', emoji: '✅', name: 'Primer aprofitament',
    description: 'Has consumit el teu primer producte sense malgastar-lo',
    category: 'inici', xpReward: 50, type: 'count_consumed', value: 1 },
  { id: 'first-pantry', emoji: '🥫', name: 'Primer rebost',
    description: 'Has afegit el teu primer producte al rebost',
    category: 'inici', xpReward: 50, type: 'pantry_added', value: 1 },
  { id: 'first-week', emoji: '📅', name: 'Primera setmana',
    description: 'Has fet servir Buyte durant 7 dies',
    category: 'inici', xpReward: 50, type: 'app_age_days', value: 7 },

  // ============= CONSTÀNCIA (7) =============
  { id: 'streak-3',   emoji: '🔥',   name: 'Tres dies',
    description: '3 dies seguits sense llençar res',
    category: 'constancia', xpReward: 50, type: 'streak', value: 3 },
  { id: 'streak-7',   emoji: '🔥🔥', name: 'Una setmana',
    description: '7 dies seguits sense llençar res',
    category: 'constancia', xpReward: 100, type: 'streak', value: 7 },
  { id: 'streak-15',  emoji: '🔥🔥🔥', name: 'Quinzena',
    description: '15 dies seguits sense llençar res',
    category: 'constancia', xpReward: 150, type: 'streak', value: 15 },
  { id: 'streak-30',  emoji: '🌟',   name: 'Mes perfecte',
    description: '30 dies seguits sense llençar res',
    category: 'constancia', xpReward: 250, type: 'streak', value: 30 },
  { id: 'streak-60',  emoji: '⭐',    name: 'Bimensual',
    description: '60 dies seguits sense llençar res',
    category: 'constancia', xpReward: 400, type: 'streak', value: 60 },
  { id: 'streak-100', emoji: '💎',   name: 'Centenari',
    description: '100 dies seguits sense llençar res',
    category: 'constancia', xpReward: 600, type: 'streak', value: 100 },
  { id: 'streak-365', emoji: '🏆',   name: 'Anual',
    description: 'Un any sencer sense llençar res. Increïble!',
    category: 'constancia', xpReward: 1000, type: 'streak', value: 365 },

  // ============= ECO-WARRIOR (6) =============
  { id: 'co2-1',   emoji: '🌿', name: 'Eco principiant',
    description: 'Has evitat 1 kg de CO₂',
    category: 'eco', xpReward: 50, type: 'co2_saved', value: 1 },
  { id: 'co2-5',   emoji: '🌳', name: 'Eco aprenent',
    description: 'Has evitat 5 kg de CO₂',
    category: 'eco', xpReward: 100, type: 'co2_saved', value: 5 },
  { id: 'co2-10',  emoji: '🌍', name: 'Eco-warrior',
    description: 'Has evitat 10 kg de CO₂',
    category: 'eco', xpReward: 150, type: 'co2_saved', value: 10 },
  { id: 'co2-25',  emoji: '🍃', name: 'Eco-master',
    description: 'Has evitat 25 kg de CO₂',
    category: 'eco', xpReward: 250, type: 'co2_saved', value: 25 },
  { id: 'co2-50',  emoji: '🌎', name: 'Eco-llegenda',
    description: 'Has evitat 50 kg de CO₂',
    category: 'eco', xpReward: 400, type: 'co2_saved', value: 50 },
  { id: 'co2-100', emoji: '🌌', name: 'Salvador del planeta',
    description: 'Has evitat 100 kg de CO₂',
    category: 'eco', xpReward: 800, type: 'co2_saved', value: 100 },

  // ============= ESTALVIADOR (5) =============
  { id: 'saved-5',   emoji: '💵', name: 'Primer estalvi',
    description: "Has aprofitat 5 € en menjar",
    category: 'estalviador', xpReward: 50, type: 'money_saved', value: 5 },
  { id: 'saved-25',  emoji: '💴', name: 'Estalviador',
    description: 'Has aprofitat 25 € en menjar',
    category: 'estalviador', xpReward: 100, type: 'money_saved', value: 25 },
  { id: 'saved-50',  emoji: '💶', name: 'Estalviador pro',
    description: 'Has aprofitat 50 € en menjar',
    category: 'estalviador', xpReward: 200, type: 'money_saved', value: 50 },
  { id: 'saved-100', emoji: '💷', name: 'Estalviador màster',
    description: 'Has aprofitat 100 € en menjar',
    category: 'estalviador', xpReward: 350, type: 'money_saved', value: 100 },
  { id: 'saved-500', emoji: '🤑', name: 'Magnat anti-malbaratament',
    description: 'Has aprofitat 500 € en menjar',
    category: 'estalviador', xpReward: 800, type: 'money_saved', value: 500 },

  // ============= MESTRE PER CATEGORIES (8) =============
  { id: 'master-fruita',  emoji: '🍎', name: 'Mestre fruites',
    description: 'Has aprofitat 10 fruites',
    category: 'mestre', xpReward: 100, type: 'category_consumed', value: 10, foodCategory: 'fruita' },
  { id: 'master-verdura', emoji: '🥬', name: 'Mestre verdures',
    description: 'Has aprofitat 10 verdures',
    category: 'mestre', xpReward: 100, type: 'category_consumed', value: 10, foodCategory: 'verdura' },
  { id: 'master-carn',    emoji: '🥩', name: 'Mestre carns',
    description: 'Has aprofitat 10 carns',
    category: 'mestre', xpReward: 100, type: 'category_consumed', value: 10, foodCategory: 'carn' },
  { id: 'master-peix',    emoji: '🐟', name: 'Mestre peix',
    description: 'Has aprofitat 10 plats de peix',
    category: 'mestre', xpReward: 100, type: 'category_consumed', value: 10, foodCategory: 'peix' },
  { id: 'master-lacti',   emoji: '🥛', name: 'Mestre lactis',
    description: 'Has aprofitat 10 lactis',
    category: 'mestre', xpReward: 100, type: 'category_consumed', value: 10, foodCategory: 'lacti' },
  { id: 'master-pa',      emoji: '🥖', name: 'Mestre pa',
    description: 'Has aprofitat 10 pans',
    category: 'mestre', xpReward: 100, type: 'category_consumed', value: 10, foodCategory: 'pa' },
  { id: 'master-pasta',   emoji: '🍝', name: 'Mestre pasta',
    description: 'Has aprofitat 10 plats de pasta o arròs',
    category: 'mestre', xpReward: 100, type: 'category_consumed', value: 10, foodCategory: 'pasta' },
  { id: 'master-variat',  emoji: '🌈', name: 'Mestre variat',
    description: 'Has aprofitat productes de totes les categories',
    category: 'mestre', xpReward: 200, type: 'all_food_categories', value: 7 },

  // ============= COOKME (5) =============
  { id: 'cook-1',        emoji: '👨‍🍳', name: 'Aprenent xef',
    description: 'Has cuinat 1 recepta (afegit ingredients al BuyMe)',
    category: 'cookme', xpReward: 50, type: 'recipes_cooked', value: 1 },
  { id: 'cook-5',        emoji: '🍳',   name: 'Cuiner casolà',
    description: 'Has cuinat 5 receptes',
    category: 'cookme', xpReward: 100, type: 'recipes_cooked', value: 5 },
  { id: 'cook-10',       emoji: '🍴',   name: 'Cuiner expert',
    description: 'Has cuinat 10 receptes',
    category: 'cookme', xpReward: 200, type: 'recipes_cooked', value: 10 },
  { id: 'cook-custom-1', emoji: '🎨',   name: 'Creatiu',
    description: "Has creat la teva primera recepta pròpia",
    category: 'cookme', xpReward: 100, type: 'recipes_custom', value: 1 },
  { id: 'cook-custom-5', emoji: '👨‍🎨', name: 'Inventor',
    description: 'Has creat 5 receptes pròpies',
    category: 'cookme', xpReward: 250, type: 'recipes_custom', value: 5 },

  // ============= ORGANITZADOR (4) =============
  { id: 'shop-1',      emoji: '🛒',  name: 'Comprador',
    description: 'Has completat la primera llista de la compra',
    category: 'organitzador', xpReward: 50, type: 'shops_completed', value: 1 },
  { id: 'shop-multi',  emoji: '🏪',  name: 'Multi-shop',
    description: 'Has fet servir 3 supermercats diferents',
    category: 'organitzador', xpReward: 100, type: 'shops_used', value: 3 },
  { id: 'list-special', emoji: '🎉', name: 'Festeritzat',
    description: 'Has fet servir una llista especial',
    category: 'organitzador', xpReward: 75, type: 'special_lists', value: 1 },
  { id: 'all-zones',   emoji: '🗂️',  name: "Mestre d'organització",
    description: 'Tens productes a totes les zones (nevera, congelador, rebost)',
    category: 'organitzador', xpReward: 75, type: 'zones_used', value: 3 },

  // ============= ESPECIALS (4) =============
  { id: 'app-anniversary', emoji: '🎂', name: 'Aniversari',
    description: 'Fa un any que fas servir Buyte',
    category: 'especial', xpReward: 500, type: 'app_age_days', value: 365 },
  { id: 'nightowl', emoji: '🌙', name: 'Noctàmbul',
    description: "Has fet servir l'app entre la mitjanit i les 5 del matí",
    category: 'especial', xpReward: 50, type: 'action_at_hour', value: '0-4' },
  { id: 'earlybird', emoji: '🌅', name: 'Matiner',
    description: "Has fet servir l'app entre les 5 i les 7 del matí",
    category: 'especial', xpReward: 50, type: 'action_at_hour', value: '5-6' },
  { id: 'explorer', emoji: '🗺️', name: 'Explorador',
    description: "Has visitat 10 pantalles diferents de l'app",
    category: 'especial', xpReward: 100, type: 'screens_visited', value: 10 }
];

// Mapa emoji → categoria d'aliment per a les insignies "Mestre per categories".
// Es fa servir des de gamification.js per agregar consumicions per categoria.
const BADGE_FOOD_CATEGORY_MAP = {
  // Fruites
  '🍎': 'fruita', '🍏': 'fruita', '🍐': 'fruita', '🍊': 'fruita', '🍋': 'fruita',
  '🍌': 'fruita', '🍉': 'fruita', '🍇': 'fruita', '🍓': 'fruita', '🫐': 'fruita',
  '🍈': 'fruita', '🍒': 'fruita', '🍑': 'fruita', '🥭': 'fruita', '🍍': 'fruita',
  '🥥': 'fruita', '🥝': 'fruita',
  // Verdures
  '🍅': 'verdura', '🥑': 'verdura', '🥬': 'verdura', '🥦': 'verdura', '🥒': 'verdura',
  '🌽': 'verdura', '🥕': 'verdura', '🌶️': 'verdura', '🫑': 'verdura', '🍆': 'verdura',
  '🧄': 'verdura', '🧅': 'verdura', '🥔': 'verdura', '🍠': 'verdura', '🫛': 'verdura',
  '🫘': 'verdura',
  // Carn
  '🥩': 'carn', '🍗': 'carn', '🍖': 'carn', '🌭': 'carn', '🥓': 'carn',
  '🍔': 'carn', '🌮': 'carn', '🌯': 'carn', '🥙': 'carn', '🧆': 'carn',
  // Peix
  '🐟': 'peix', '🐠': 'peix', '🍣': 'peix', '🍤': 'peix', '🦐': 'peix',
  '🦑': 'peix', '🦞': 'peix', '🦀': 'peix', '🥫': 'peix',
  // Lactis
  '🥛': 'lacti', '🧀': 'lacti', '🥚': 'lacti', '🧈': 'lacti', '🍦': 'lacti',
  // Pa
  '🍞': 'pa', '🥖': 'pa', '🥐': 'pa', '🫓': 'pa', '🥨': 'pa', '🥯': 'pa',
  // Pasta i arrossos
  '🍝': 'pasta', '🍜': 'pasta', '🍚': 'pasta', '🥘': 'pasta', '🍛': 'pasta'
};
