/* ============================================
   Buyte — js/cookme.js
   CookMe: receptes basades en els ingredients que
   l'usuari té al BiteMe (products[]).
   Sense IA, totalment local. El catàleg de receptes
   viu a js/recipes-data.js (constant RECIPES).
   ============================================ */


// Pestanya activa: 'ready' | 'used' | 'all'
let cookmeTab = 'ready';
// Receptes custom de l'usuari (es desen a localStorage). Conviuen amb el catàleg.
let customRecipes = [];

// Estat del formulari de nova/editar recepta. Es buida en sortir.
let editingRecipeData = null;
let editingRecipeId = null; // id si estem editant; null si és nova
let editingRecipeIngredientIdx = -1;
let selectedRecipeEmoji = '🍳';

function loadCustomRecipes() {
  try {
    const raw = localStorage.getItem('eatmefirst_custom_recipes');
    customRecipes = raw ? (JSON.parse(raw) || []) : [];
    if (!Array.isArray(customRecipes)) customRecipes = [];
  } catch (e) { customRecipes = []; }
}

function saveCustomRecipes() {
  try {
    localStorage.setItem('eatmefirst_custom_recipes', JSON.stringify(customRecipes));
  } catch (e) {}
}

// Llista combinada: catàleg + custom. Custom van darrere per estabilitat de l'ordre.
function getAllRecipes() {
  const cat = (typeof RECIPES !== 'undefined' && Array.isArray(RECIPES)) ? RECIPES : [];
  return cat.concat(customRecipes);
}
// Historial d'ús de receptes per popularitzar la pestanya "Més usades".
// Format: { 'recipe-id': { views: n, lastUsed: ts, addedToShopping: n } }
let recipeUsage = {};

function loadRecipeUsage() {
  try {
    const raw = localStorage.getItem('eatmefirst_recipe_usage');
    recipeUsage = raw ? (JSON.parse(raw) || {}) : {};
  } catch (e) { recipeUsage = {}; }
}

function saveRecipeUsage() {
  try {
    localStorage.setItem('eatmefirst_recipe_usage', JSON.stringify(recipeUsage));
  } catch (e) {}
}

function ensureRecipeUsageEntry(id) {
  if (!recipeUsage[id]) recipeUsage[id] = { views: 0, lastUsed: 0, addedToShopping: 0 };
  return recipeUsage[id];
}

function incrementRecipeView(id) {
  if (!id) return;
  const e = ensureRecipeUsageEntry(id);
  e.views++;
  e.lastUsed = Date.now();
  saveRecipeUsage();
}

function incrementRecipeAddedToShopping(id, count) {
  if (!id || !count) return;
  const e = ensureRecipeUsageEntry(id);
  e.addedToShopping += count;
  e.lastUsed = Date.now();
  saveRecipeUsage();
}

function resetRecipeUsage() {
  recipeUsage = {};
  try { localStorage.removeItem('eatmefirst_recipe_usage'); } catch (e) {}
  if (typeof renderCookMe === 'function') renderCookMe();
}

// Demana confirmació abans d'esborrar l'historial d'ús de receptes.
function confirmResetRecipeUsage() {
  const onYes = () => {
    resetRecipeUsage();
    showToast(t('doneReset'));
  };
  if (typeof showConfirmDangerModal === 'function') {
    showConfirmDangerModal('🍳', t('resetRecipeUsageTitle'), t('resetRecipeUsageConfirm'), onYes);
  } else if (window.confirm(t('resetRecipeUsageConfirm'))) {
    onYes();
  }
}
// Cerca lliure dins la pestanya activa
let cookmeSearch = '';
// Mode d'ordenació: 'percent' (per coincidència) | 'alpha' (A-Z)
let cookmeSort = 'percent';

// Normalitza un text: minúscules + sense accents + sense espais finals.
function cookmeNormalize(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Comprova si l'usuari té un ingredient als seus productes del BiteMe.
//   - Primer per emoji exacte (match fort)
//   - Si no, per nom: el nom del producte conté el de l'ingredient
//     (case-insensitive, sense accents)
function matchIngredient(ingredient, userProducts) {
  if (!ingredient || !userProducts || userProducts.length === 0) return false;

  if (ingredient.emoji) {
    for (let i = 0; i < userProducts.length; i++) {
      if (userProducts[i].emoji === ingredient.emoji) return true;
    }
  }

  const ingName = cookmeNormalize(ingredient.name);
  if (!ingName) return false;

  for (let i = 0; i < userProducts.length; i++) {
    const pName = cookmeNormalize(userProducts[i].name);
    if (!pName) continue;
    if (pName.includes(ingName)) return true;
  }
  return false;
}

// Calcula la coincidència d'una recepta amb els productes de l'usuari.
// Retorna { matched, missing, percent, canMake }.
//   - canMake: true si es tenen TOTS els ingredients required
//   - percent: 0-100 (required pesa 90, optional 10)
function calculateRecipeMatch(recipe, userProducts) {
  const ings = (recipe && recipe.ingredients) || [];
  const matched = [];
  const missing = [];

  let requiredTotal = 0;
  let requiredMatched = 0;
  let optionalTotal = 0;
  let optionalMatched = 0;

  for (let i = 0; i < ings.length; i++) {
    const ing = ings[i];
    const has = matchIngredient(ing, userProducts);
    if (has) matched.push(ing); else missing.push(ing);
    if (ing.required) {
      requiredTotal++;
      if (has) requiredMatched++;
    } else {
      optionalTotal++;
      if (has) optionalMatched++;
    }
  }

  let percent;
  if (ings.length === 0) {
    percent = 100;
  } else if (requiredTotal === 0) {
    percent = Math.round((optionalMatched / optionalTotal) * 100);
  } else if (optionalTotal === 0) {
    percent = Math.round((requiredMatched / requiredTotal) * 100);
  } else {
    // Required = 90% del pes, optional = 10%
    const reqScore = (requiredMatched / requiredTotal) * 90;
    const optScore = (optionalMatched / optionalTotal) * 10;
    percent = Math.round(reqScore + optScore);
  }

  const canMake = requiredTotal === 0 ? matched.length === ings.length : (requiredMatched === requiredTotal);

  return { matched, missing, percent, canMake };
}

// Obre la pantalla CookMe i renderitza la pestanya per defecte.
function openCookMe() {
  cookmeTab = 'ready';
  cookmeSearch = '';
  cookmeSort = 'percent';
  // Sincronitza estat visual de les pestanyes
  document.querySelectorAll('#cookme-tabs .cookme-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === cookmeTab);
  });
  // Reseteja l'input de cerca i el placeholder en l'idioma actual
  const searchInput = document.getElementById('cookme-search');
  if (searchInput) {
    searchInput.value = '';
    searchInput.placeholder = t('searchRecipe');
  }
  updateCookMeSortBtn();
  renderCookMe();
  showScreen('cookme');
}

// Canvia de pestanya (ready / almost / all).
function setCookMeTab(tab) {
  cookmeTab = tab;
  document.querySelectorAll('#cookme-tabs .cookme-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  renderCookMe();
}

// Actualitza el text de la cerca i re-renderitza.
function setCookMeSearch(query) {
  cookmeSearch = query || '';
  renderCookMe();
}

// Toggle entre ordenació per % i alfabètic.
function toggleCookMeSort() {
  cookmeSort = (cookmeSort === 'percent') ? 'alpha' : 'percent';
  updateCookMeSortBtn();
  renderCookMe();
}

// Refresca icona i text del botó d'ordenació segons el mode actiu.
function updateCookMeSortBtn() {
  const icon = document.getElementById('cookme-sort-icon');
  const label = document.getElementById('cookme-sort-label');
  if (!icon || !label) return;
  if (cookmeSort === 'percent') {
    icon.textContent = '📊';
    label.textContent = t('sortByPercent');
  } else {
    icon.textContent = '🔠';
    label.textContent = t('sortAlpha');
  }
}

// Renderitza la llista de receptes segons la pestanya activa.
function renderCookMe() {
  const list = document.getElementById('cookme-list');
  const empty = document.getElementById('cookme-empty');
  if (!list || !empty) return;

  const recipes = getAllRecipes();
  const userProducts = (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];

  // Calcula match per cada recepta
  const results = recipes.map(r => {
    const m = calculateRecipeMatch(r, userProducts);
    return { recipe: r, matched: m.matched, missing: m.missing, percent: m.percent, canMake: m.canMake };
  });

  // Filtra segons la pestanya
  let filtered;
  if (cookmeTab === 'ready') {
    filtered = results.filter(r => r.canMake);
  } else if (cookmeTab === 'used') {
    // Només receptes amb tracking i ordenades per importància d'ús (top 10)
    filtered = results
      .filter(r => recipeUsage[r.recipe.id])
      .map(r => Object.assign({}, r, { _u: recipeUsage[r.recipe.id] }))
      .sort((a, b) => {
        if (b._u.addedToShopping !== a._u.addedToShopping) return b._u.addedToShopping - a._u.addedToShopping;
        if (b._u.views !== a._u.views) return b._u.views - a._u.views;
        return (b._u.lastUsed || 0) - (a._u.lastUsed || 0);
      })
      .slice(0, 10);
  } else {
    filtered = results.slice();
  }

  // Cerca lliure: nom de recepta o nom d'ingredient
  const q = cookmeNormalize(cookmeSearch);
  if (q) {
    filtered = filtered.filter(r => {
      if (cookmeNormalize(r.recipe.name).includes(q)) return true;
      const ings = r.recipe.ingredients || [];
      for (let i = 0; i < ings.length; i++) {
        if (cookmeNormalize(ings[i].name).includes(q)) return true;
      }
      return false;
    });
  }

  // Ordena segons el mode triat. La pestanya 'used' té el seu propi ordre
  // (per popularitat d'ús), només la respectem si l'usuari no ha triat alfabètic.
  if (cookmeSort === 'alpha') {
    filtered.sort((a, b) => (a.recipe.name || '').localeCompare(b.recipe.name || '', 'ca'));
  } else if (cookmeTab !== 'used') {
    filtered.sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      return (a.recipe.name || '').localeCompare(b.recipe.name || '', 'ca');
    });
  }

  list.innerHTML = '';

  if (filtered.length === 0) {
    // Cap recepta a la pestanya. Decideix el missatge:
    if (q) {
      empty.textContent = t('noResults');
    } else if (cookmeTab === 'used') {
      empty.textContent = t('noUsedRecipes');
    } else if (cookmeTab === 'ready') {
      empty.textContent = t('noRecipesAvailable');
    } else {
      empty.textContent = t('noRecipesAtAll');
    }
    empty.style.display = 'block';
    list.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  list.style.display = 'flex';

  filtered.forEach(r => {
    list.appendChild(buildCookMeCard(r));
  });
}

// Construeix una targeta de recepta.
function buildCookMeCard(r) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'cookme-card';
  card.dataset.recipeId = r.recipe.id;

  const peopleLabel = r.recipe.servings === 1 ? t('people') : t('peoplePlural');

  let badgeHtml;
  if (r.missing.length === 0) {
    badgeHtml = '<span class="cookme-badge cookme-badge-ready">✅ ' + escapeHtml(t('haveAll')) + '</span>';
  } else {
    const missingNames = r.missing.slice(0, 3).map(i => {
      const em = i.emoji ? (i.emoji + ' ') : '';
      return em + escapeHtml(cookmeCapitalize(i.name || ''));
    }).join(', ');
    const more = r.missing.length > 3 ? ' +' + (r.missing.length - 3) : '';
    const cls = r.canMake ? 'cookme-badge-soft' : 'cookme-badge-missing';
    badgeHtml = '<span class="cookme-badge ' + cls + '">⚠️ ' + escapeHtml(t('youMiss')) + ': ' + missingNames + more + '</span>';
  }

  const customTag = r.recipe.isCustom
    ? '<span class="recipe-custom-badge">' + escapeHtml(t('myRecipe')) + '</span>'
    : '';

  card.innerHTML =
    '<div class="cookme-card-emoji">' + (r.recipe.emoji || '🍽️') + '</div>' +
    '<div class="cookme-card-body">' +
      '<p class="cookme-card-title">' + escapeHtml(r.recipe.name || '') + customTag + '</p>' +
      '<p class="cookme-card-meta">⏱️ ' + (r.recipe.time || 0) + ' ' + escapeHtml(t('minutes')) +
        ' · 🍴 ' + (r.recipe.servings || 1) + ' ' + escapeHtml(peopleLabel) + '</p>' +
      badgeHtml +
    '</div>' +
    '<div class="cookme-card-percent">' + r.percent + '%</div>';

  card.addEventListener('click', () => {
    openRecipeDetail(r.recipe.id);
  });

  return card;
}

// ============================================
//   DETALL DE LA RECEPTA (FASE 3)
// ============================================

// Recepta oberta actualment. Útil per refrescar quan tornem a la pantalla.
let currentRecipeId = null;
// Persones temporals al detall (no es persisteix). Determina el factor d'escala.
let currentServings = 1;

// Mapa de fraccions Unicode → decimal. Permet escalar quantitats com "½ unitat".
const COOKME_FRACTIONS = {
  '½': 0.5, '⅓': 1/3, '⅔': 2/3,
  '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1/6, '⅚': 5/6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
};

// Capitalitza la primera lletra d'un text (sense canviar la resta).
function cookmeCapitalize(s) {
  if (!s) return '';
  const str = String(s);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Format compacte: enter si està prou a prop, si no 1 decimal amb coma.
function cookmeFormatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '';
  if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  return (Math.round(n * 10) / 10).toString().replace('.', ',');
}

// Escala un text de quantitat per un factor. Suporta:
//   - Enters i decimals ("200 g", "1,5 L")
//   - Fraccions Unicode ("½ unitat", "¼")
//   - Rangs ("6-8", "2-3 cullerades")
//   - Text lliure inalterat ("al gust", "una mica")
function scaleIngredient(qtyText, factor) {
  if (!qtyText) return '';
  if (!factor || factor === 1) return String(qtyText);
  const text = String(qtyText).trim();
  if (!text) return '';

  // Rang amb dos números
  const rangeMatch = text.match(/^(\d+(?:[,.]\d+)?)-(\d+(?:[,.]\d+)?)(.*)$/);
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1].replace(',', '.')) * factor;
    const b = parseFloat(rangeMatch[2].replace(',', '.')) * factor;
    return cookmeFormatNumber(a) + '-' + cookmeFormatNumber(b) + rangeMatch[3];
  }

  // Fracció Unicode al començament
  if (COOKME_FRACTIONS[text[0]] !== undefined) {
    const num = COOKME_FRACTIONS[text[0]] * factor;
    return cookmeFormatNumber(num) + text.slice(1);
  }

  // Número (enter o decimal amb coma/punt) al començament
  const numMatch = text.match(/^(\d+(?:[,.]\d+)?)(.*)$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1].replace(',', '.')) * factor;
    return cookmeFormatNumber(num) + numMatch[2];
  }

  // Text lliure: deixa-ho tal com està
  return text;
}

// Ajusta el nombre de persones al detall (clamp 1-20) i re-renderitza.
function adjustRecipeServings(delta) {
  const next = Math.min(20, Math.max(1, (currentServings || 1) + delta));
  if (next === currentServings) return;
  currentServings = next;
  renderRecipeDetail();
}

// Obre la pantalla de detall per la recepta amb aquest id.
function openRecipeDetail(id) {
  const recipes = getAllRecipes();
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;
  currentRecipeId = id;
  currentServings = recipe.servings || 1;
  incrementRecipeView(id);
  renderRecipeDetail();
  showScreen('recipe-detail');
}

// Renderitza els blocs de la pantalla de detall a partir de currentRecipeId.
function renderRecipeDetail() {
  const recipes = getAllRecipes();
  const recipe = currentRecipeId ? recipes.find(r => r.id === currentRecipeId) : null;
  if (!recipe) return;

  const userProducts = (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];
  const m = calculateRecipeMatch(recipe, userProducts);

  // Capçalera + hero
  const titleEl = document.getElementById('recipe-detail-title');
  if (titleEl) titleEl.textContent = recipe.name || '';

  const emojiEl = document.getElementById('recipe-hero-emoji');
  if (emojiEl) emojiEl.textContent = recipe.emoji || '🍽️';

  const nameEl = document.getElementById('recipe-hero-name');
  if (nameEl) nameEl.textContent = recipe.name || '';

  const diffKey = recipe.difficulty === 'fàcil' ? 'easyDiff'
    : recipe.difficulty === 'mitjana' ? 'mediumDiff'
    : recipe.difficulty === 'difícil' ? 'hardDiff' : null;
  const diffText = diffKey ? t(diffKey) : (recipe.difficulty || '');

  const metaEl = document.getElementById('recipe-hero-meta');
  if (metaEl) {
    metaEl.textContent = '⏱️ ' + (recipe.time || 0) + ' ' + t('minutes')
      + ' · ⚙️ ' + diffText;
  }

  // Editor de persones (a la card hero)
  const servingsCount = document.getElementById('recipe-servings-count');
  const servingsLabel = document.getElementById('recipe-servings-label');
  if (servingsCount) servingsCount.textContent = String(currentServings);
  if (servingsLabel) servingsLabel.textContent = currentServings === 1 ? t('people') : t('peoplePlural');

  // Factor d'escala respecte les persones originals de la recepta
  const baseServings = recipe.servings || 1;
  const factor = baseServings > 0 ? (currentServings / baseServings) : 1;

  // Ingredients (escalats segons el factor i amb el nom capitalitzat)
  const ingList = document.getElementById('recipe-ingredients-list');
  if (ingList) {
    ingList.innerHTML = '';
    (recipe.ingredients || []).forEach(ing => {
      const has = matchIngredient(ing, userProducts);
      const row = document.createElement('div');
      row.className = 'recipe-ingredient-row' + (has ? ' have' : ' missing');
      const checkIcon = has ? '✅' : '⚠️';
      const scaledQty = scaleIngredient(ing.qty, factor);
      const qty = scaledQty ? '<span class="recipe-ingredient-qty">' + escapeHtml(scaledQty) + '</span>' : '';
      row.innerHTML =
        '<span class="recipe-ingredient-icon">' + checkIcon + '</span>' +
        '<span class="recipe-ingredient-emoji">' + (ing.emoji || '') + '</span>' +
        '<span class="recipe-ingredient-name">' + escapeHtml(cookmeCapitalize(ing.name || '')) + '</span>' +
        qty;
      ingList.appendChild(row);
    });
  }

  // Botó "Afegir al BuyMe": sempre visible — el picker permet triar lliurement.
  // El comptador només acompanya quan hi ha ingredients que falten.
  const btn = document.getElementById('recipe-add-missing');
  if (btn) {
    if ((recipe.ingredients || []).length === 0) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'flex';
      if (m.missing.length > 0) {
        btn.textContent = '🛒 ' + t('addMissingToShopping') + ' (' + m.missing.length + ' ' + t('missingItems') + ')';
      } else {
        btn.textContent = '🛒 ' + t('addMissingToShopping');
      }
    }
  }

  // Passos
  const stepsEl = document.getElementById('recipe-steps-list');
  if (stepsEl) {
    stepsEl.innerHTML = '';
    (recipe.steps || []).forEach((step, idx) => {
      const li = document.createElement('li');
      li.className = 'recipe-step';
      li.innerHTML =
        '<span class="recipe-step-number">' + (idx + 1) + '</span>' +
        '<span class="recipe-step-text">' + escapeHtml(step) + '</span>';
      stepsEl.appendChild(li);
    });
  }

  // Consell (opcional)
  const tipBox = document.getElementById('recipe-tip');
  const tipText = document.getElementById('recipe-tip-text');
  if (tipBox && tipText) {
    if (recipe.tip) {
      tipText.textContent = recipe.tip;
      tipBox.style.display = 'flex';
    } else {
      tipBox.style.display = 'none';
    }
  }

  // Accions per receptes custom (editar / esborrar)
  const customActions = document.getElementById('recipe-detail-custom-actions');
  if (customActions) {
    customActions.style.display = recipe.isCustom ? 'flex' : 'none';
  }
}

// Obre el picker d'ingredients per afegir-los al BuyMe. L'usuari pot
// triar quins ingredients afegir (els que falten venen marcats per defecte,
// els que ja té venen desmarcats) i a quin super enviar-los: es mostren
// TOTS els supers configurats (preferits primer, altres després), igual
// que fa el modal de "Comprar llista especial".
function addMissingToBuyMe() {
  const recipes = getAllRecipes();
  const recipe = currentRecipeId ? recipes.find(r => r.id === currentRecipeId) : null;
  if (!recipe) return;

  const all = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets)) ? supermarkets : [];
  if (all.length === 0) {
    showToast(t('noStoreConfigured'));
    return;
  }

  const enabled = all.filter(s => s.enabled !== false);
  const others = all.filter(s => s.enabled === false);

  showIngredientPicker(recipe, { enabled, others });
}

// Construeix i mostra el modal de selecció d'ingredients + supermercat.
function showIngredientPicker(recipe, supers) {
  const userProducts = (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];
  const ingredients = recipe.ingredients || [];
  const enabledSupers = (supers && supers.enabled) ? supers.enabled : [];
  const otherSupers = (supers && supers.others) ? supers.others : [];
  const allSupers = enabledSupers.concat(otherSupers);

  // Estat dins el modal: índexs marcats i super seleccionat
  const checked = new Set();
  ingredients.forEach((ing, idx) => {
    if (!matchIngredient(ing, userProducts)) checked.add(idx);
  });
  let selectedSuperId = allSupers[0] ? allSupers[0].id : null;

  // Factor d'escala segons l'editor de persones
  const baseServings = recipe.servings || 1;
  const factor = baseServings > 0 ? (currentServings / baseServings) : 1;

  // Construeix els blocs HTML
  const ingHtml = ingredients.map((ing, idx) => {
    const has = matchIngredient(ing, userProducts);
    const isChecked = checked.has(idx);
    const scaledQty = scaleIngredient(ing.qty, factor);
    const qtyHtml = scaledQty ? '<span class="ingredient-pick-qty">' + escapeHtml(scaledQty) + '</span>' : '';
    return '<label class="ingredient-pick-row ' + (has ? 'have' : 'missing') + (isChecked ? ' checked' : '') + '" data-idx="' + idx + '">' +
      '<input type="checkbox" class="ingredient-pick-cb"' + (isChecked ? ' checked' : '') + '>' +
      '<span class="ingredient-pick-emoji">' + (ing.emoji || '') + '</span>' +
      '<span class="ingredient-pick-name">' + escapeHtml(cookmeCapitalize(ing.name || '')) + '</span>' +
      qtyHtml +
      '</label>';
  }).join('');

  // Una funció per renderitzar els chips d'un grup de supers
  const renderChips = (list) => list.map((sm) => {
    const isActive = sm.id === selectedSuperId;
    return '<button type="button" class="super-chip' + (isActive ? ' active' : '') + '" data-id="' + escapeHtml(sm.id) + '">' +
      '<span class="super-chip-emoji">' + (sm.emoji || '🛒') + '</span>' +
      '<span class="super-chip-name">' + escapeHtml(sm.name || '') + '</span>' +
      '</button>';
  }).join('');

  let supersHtml = '';
  if (enabledSupers.length > 0 && otherSupers.length > 0) {
    // Hi ha de les dues — mostrem capçaleres per distingir-les
    supersHtml += '<p class="modal-section-sublabel">' + escapeHtml(t('preferredShops')) + '</p>';
    supersHtml += '<div class="super-chips-row">' + renderChips(enabledSupers) + '</div>';
    supersHtml += '<p class="modal-section-sublabel">' + escapeHtml(t('otherShops')) + '</p>';
    supersHtml += '<div class="super-chips-row">' + renderChips(otherSupers) + '</div>';
  } else {
    // Tot a una sola tira (les preferides o les altres, segons quines hi hagi)
    supersHtml += '<div class="super-chips-row">' + renderChips(allSupers) + '</div>';
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-content modal-content-tall">' +
      '<div class="modal-emoji-big">🛒</div>' +
      '<p class="modal-title">' + escapeHtml(t('selectAllToBuy')) + '</p>' +
      '<p class="modal-sub">' + escapeHtml(recipe.name || '') + '</p>' +
      '<div class="ingredient-pick-list">' + ingHtml + '</div>' +
      '<p class="modal-section-label">' + escapeHtml(t('whichSuper')) + '</p>' +
      supersHtml +
      '<button type="button" class="modal-confirm-btn" id="ingredient-pick-confirm"></button>' +
      '<button class="modal-cancel" id="modal-cancel-btn">' + t('cancel') + '</button>' +
    '</div>';
  document.body.appendChild(overlay);

  const confirmBtn = overlay.querySelector('#ingredient-pick-confirm');
  function refreshConfirm() {
    const n = checked.size;
    confirmBtn.textContent = '🛒 ' + t('addNToBuyme').replace('{0}', n);
    if (n === 0) {
      confirmBtn.setAttribute('disabled', 'disabled');
      confirmBtn.classList.add('is-disabled');
    } else {
      confirmBtn.removeAttribute('disabled');
      confirmBtn.classList.remove('is-disabled');
    }
  }
  refreshConfirm();

  overlay.querySelectorAll('.ingredient-pick-row').forEach(row => {
    const cb = row.querySelector('.ingredient-pick-cb');
    cb.addEventListener('change', () => {
      const idx = parseInt(row.dataset.idx, 10);
      if (cb.checked) checked.add(idx); else checked.delete(idx);
      row.classList.toggle('checked', cb.checked);
      refreshConfirm();
    });
  });

  overlay.querySelectorAll('.super-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      overlay.querySelectorAll('.super-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedSuperId = chip.dataset.id;
    });
  });

  confirmBtn.addEventListener('click', () => {
    if (checked.size === 0) return;
    const items = Array.from(checked).map(idx => {
      const ing = ingredients[idx];
      return { name: ing.name || '', emoji: ing.emoji || '🛒', qty: scaleIngredient(ing.qty, factor) };
    });
    document.body.removeChild(overlay);
    addItemsToShop(selectedSuperId, items);
  });

  overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

// Afegeix una llista d'ingredients (amb qty ja escalada) al supermercat indicat.
function addItemsToShop(supermarketId, items) {
  if (typeof addToShoppingList !== 'function') return;
  items.forEach(ing => {
    const product = { name: cookmeCapitalize(ing.name || ''), emoji: ing.emoji || '🛒' };
    addToShoppingList(supermarketId, product, ing.qty || '');
  });
  if (currentRecipeId) incrementRecipeAddedToShopping(currentRecipeId, items.length);
  const sm = (typeof getSupermarketById === 'function') ? getSupermarketById(supermarketId) : null;
  const smName = sm ? sm.name : '';
  showToast('🛒 ' + items.length + ' ' + t('ingredientsAdded') + ' ' + smName);
}

// Actualitza el comptador de receptes que es poden fer ja al botó del launcher.
function renderCookMeBadge() {
  const badge = document.getElementById('btn-cookme-count');
  if (!badge) return;
  const recipes = getAllRecipes();
  const userProducts = (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];
  let ready = 0;
  for (let i = 0; i < recipes.length; i++) {
    const m = calculateRecipeMatch(recipes[i], userProducts);
    if (m.canMake) ready++;
  }
  if (ready > 0) {
    badge.textContent = String(ready);
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}


// ============================================
//   CUSTOM RECIPES (MILLORA 5)
// ============================================

// Genera un id estable per a una recepta nova: 'custom-' + slug + '-' + sufix curt.
function _customRecipeId(name) {
  const slug = cookmeNormalize(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'recepta';
  return 'custom-' + slug + '-' + Date.now().toString(36).slice(-4);
}

// Obre el formulari per crear una recepta nova.
function openNewRecipeForm() {
  editingRecipeId = null;
  editingRecipeData = {
    id: '',
    name: '',
    emoji: '🍳',
    time: 20,
    servings: 2,
    difficulty: 'fàcil',
    category: 'esmorzar',
    ingredients: [
      { emoji: '🥕', name: '', qty: '', required: true }
    ],
    steps: [''],
    tip: '',
    isCustom: true
  };
  selectedRecipeEmoji = '🍳';
  const backBtn = document.getElementById('recipe-edit-back-btn');
  if (backBtn) backBtn.dataset.back = 'cookme';
  renderRecipeEditForm();
  showScreen('recipe-edit');
}

// Obre el formulari per editar una recepta custom existent.
function openEditRecipeForm(id) {
  const recipe = customRecipes.find(r => r.id === id);
  if (!recipe) return;
  editingRecipeId = id;
  // Còpia profunda perquè els canvis no toquin la recepta fins que es guardi
  editingRecipeData = JSON.parse(JSON.stringify(recipe));
  if (!Array.isArray(editingRecipeData.ingredients) || editingRecipeData.ingredients.length === 0) {
    editingRecipeData.ingredients = [{ emoji: '🥕', name: '', qty: '', required: true }];
  }
  if (!Array.isArray(editingRecipeData.steps) || editingRecipeData.steps.length === 0) {
    editingRecipeData.steps = [''];
  }
  selectedRecipeEmoji = editingRecipeData.emoji || '🍳';
  const backBtn = document.getElementById('recipe-edit-back-btn');
  if (backBtn) backBtn.dataset.back = 'recipe-detail';
  renderRecipeEditForm();
  showScreen('recipe-edit');
}

// Pinta tots els camps del formulari segons editingRecipeData.
function renderRecipeEditForm() {
  if (!editingRecipeData) return;

  const titleEl = document.getElementById('recipe-edit-title');
  if (titleEl) titleEl.textContent = editingRecipeId ? t('editRecipe') : t('newRecipe');

  const nameEl = document.getElementById('recipe-edit-name');
  if (nameEl) nameEl.value = editingRecipeData.name || '';

  const emojiCurrent = document.getElementById('recipe-emoji-current');
  if (emojiCurrent) emojiCurrent.textContent = editingRecipeData.emoji || '🍳';

  const timeEl = document.getElementById('recipe-edit-time');
  if (timeEl) timeEl.value = editingRecipeData.time || 20;

  const servEl = document.getElementById('recipe-edit-servings');
  if (servEl) servEl.value = editingRecipeData.servings || 2;

  document.querySelectorAll('#recipe-edit-difficulty button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === editingRecipeData.difficulty);
  });

  const catEl = document.getElementById('recipe-edit-category');
  if (catEl) catEl.value = editingRecipeData.category || 'esmorzar';

  const tipEl = document.getElementById('recipe-edit-tip');
  if (tipEl) tipEl.value = editingRecipeData.tip || '';

  renderRecipeEditIngredients();
  renderRecipeEditSteps();
}

function renderRecipeEditIngredients() {
  const container = document.getElementById('recipe-edit-ingredients');
  if (!container || !editingRecipeData) return;
  container.innerHTML = '';
  editingRecipeData.ingredients.forEach((ing, idx) => {
    const row = document.createElement('div');
    row.className = 'ingredient-input-row';
    row.dataset.idx = idx;
    row.innerHTML =
      '<button type="button" class="ingredient-emoji-btn" data-action="emoji">' + escapeHtml(ing.emoji || '🥕') + '</button>' +
      '<input type="text" class="ingredient-input-name" placeholder="' + escapeHtml(t('itemName')) + '" value="' + escapeHtml(ing.name || '') + '" autocomplete="off">' +
      '<input type="text" class="ingredient-input-qty" placeholder="qty" value="' + escapeHtml(ing.qty || '') + '" autocomplete="off">' +
      '<label class="ingredient-required-toggle" title="' + escapeHtml(t('requiredIngredient')) + '">' +
        '<input type="checkbox" class="ingredient-required-cb"' + (ing.required ? ' checked' : '') + '>' +
        '<span>' + escapeHtml(t('requiredIngredient')) + '</span>' +
      '</label>' +
      '<button type="button" class="ingredient-remove-btn" data-action="remove" aria-label="Remove">✕</button>' +
      '<div class="ingredient-suggestions autocomplete-suggestions"></div>';
    container.appendChild(row);
  });

  // Bind events per cada fila
  container.querySelectorAll('.ingredient-input-row').forEach(row => {
    const idx = parseInt(row.dataset.idx, 10);
    const nameInput = row.querySelector('.ingredient-input-name');
    const suggBox = row.querySelector('.ingredient-suggestions');

    row.querySelector('[data-action="emoji"]').addEventListener('click', () => {
      editingRecipeIngredientIdx = idx;
      if (typeof openEmojiPicker === 'function') openEmojiPicker('recipe-ingredient', 'recipe-edit');
    });

    nameInput.addEventListener('input', (e) => {
      editingRecipeData.ingredients[idx].name = e.target.value;
      refreshIngredientSuggestions(idx, e.target.value, suggBox, nameInput);
    });

    nameInput.addEventListener('blur', () => {
      // Petit retard perquè el clic al suggeriment es processi abans
      setTimeout(() => { if (suggBox) suggBox.innerHTML = ''; }, 180);
    });

    row.querySelector('.ingredient-input-qty').addEventListener('input', (e) => {
      editingRecipeData.ingredients[idx].qty = e.target.value;
    });

    row.querySelector('.ingredient-required-cb').addEventListener('change', (e) => {
      editingRecipeData.ingredients[idx].required = e.target.checked;
    });

    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      if (editingRecipeData.ingredients.length <= 1) return; // sempre al menys 1
      editingRecipeData.ingredients.splice(idx, 1);
      renderRecipeEditIngredients();
    });
  });
}

// Mostra fins a 5 suggeriments del catàleg de productes populars que coincideixen
// amb el text que l'usuari està escrivint a la fila d'ingredient indicada.
// En seleccionar-ne un, omple el nom i l'emoji de l'ingredient (no la qty).
function refreshIngredientSuggestions(idx, query, suggBox, nameInput) {
  if (!suggBox) return;
  const q = cookmeNormalize(query);
  if (!q) { suggBox.innerHTML = ''; return; }

  const populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
  const matches = populars
    .filter(p => p && p.name && cookmeNormalize(p.name).includes(q))
    .slice(0, 5);

  suggBox.innerHTML = '';
  if (matches.length === 0) return;

  matches.forEach(m => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'autocomplete-item';
    item.innerHTML = '<span>' + (m.emoji || '🥕') + '</span> <span>' + escapeHtml(m.name || '') + '</span>';
    // mousedown abans de blur per evitar la cursa que tanca el suggeriment
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (!editingRecipeData) return;
      const ingr = editingRecipeData.ingredients[idx];
      if (!ingr) return;
      ingr.name = m.name || '';
      if (m.emoji) ingr.emoji = m.emoji;
      // Re-pintem només aquesta fila per actualitzar emoji + camp del nom
      renderRecipeEditIngredients();
    });
    suggBox.appendChild(item);
  });
}

function addEmptyIngredient() {
  if (!editingRecipeData) return;
  editingRecipeData.ingredients.push({ emoji: '🥕', name: '', qty: '', required: true });
  renderRecipeEditIngredients();
}

function renderRecipeEditSteps() {
  const container = document.getElementById('recipe-edit-steps');
  if (!container || !editingRecipeData) return;
  container.innerHTML = '';
  editingRecipeData.steps.forEach((step, idx) => {
    const row = document.createElement('div');
    row.className = 'step-input-row';
    row.dataset.idx = idx;
    row.innerHTML =
      '<span class="step-input-number">' + (idx + 1) + '</span>' +
      '<textarea class="step-input-text" rows="2" placeholder="' + escapeHtml(t('addStep')) + '">' + escapeHtml(step || '') + '</textarea>' +
      '<button type="button" class="step-remove-btn" data-action="remove" aria-label="Remove">✕</button>';
    container.appendChild(row);
  });

  container.querySelectorAll('.step-input-row').forEach(row => {
    const idx = parseInt(row.dataset.idx, 10);
    row.querySelector('.step-input-text').addEventListener('input', (e) => {
      editingRecipeData.steps[idx] = e.target.value;
    });
    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      if (editingRecipeData.steps.length <= 1) return;
      editingRecipeData.steps.splice(idx, 1);
      renderRecipeEditSteps();
    });
  });
}

function addEmptyStep() {
  if (!editingRecipeData) return;
  editingRecipeData.steps.push('');
  renderRecipeEditSteps();
}

function setRecipeEditDifficulty(value) {
  if (!editingRecipeData) return;
  editingRecipeData.difficulty = value;
  document.querySelectorAll('#recipe-edit-difficulty button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

// Llegeix els camps del formulari, valida i desa la recepta a customRecipes.
function saveRecipeFromForm() {
  if (!editingRecipeData) return;

  // Camps directes (els inputs es sincronitzen via event 'input', però llegim
  // explícitament per cobrir el primer camp que potser no s'ha disparat encara).
  const nameEl = document.getElementById('recipe-edit-name');
  if (nameEl) editingRecipeData.name = (nameEl.value || '').trim();
  const timeEl = document.getElementById('recipe-edit-time');
  if (timeEl) editingRecipeData.time = Math.max(1, parseInt(timeEl.value, 10) || 0);
  const servEl = document.getElementById('recipe-edit-servings');
  if (servEl) editingRecipeData.servings = Math.max(1, parseInt(servEl.value, 10) || 1);
  const catEl = document.getElementById('recipe-edit-category');
  if (catEl) editingRecipeData.category = catEl.value;
  const tipEl = document.getElementById('recipe-edit-tip');
  if (tipEl) editingRecipeData.tip = (tipEl.value || '').trim();
  editingRecipeData.emoji = selectedRecipeEmoji || editingRecipeData.emoji || '🍳';
  editingRecipeData.isCustom = true;

  // Filtra ingredients i passos buits
  const cleanIngs = editingRecipeData.ingredients
    .map(i => ({ emoji: i.emoji || '🥕', name: (i.name || '').trim(), qty: (i.qty || '').trim(), required: !!i.required }))
    .filter(i => i.name);
  const cleanSteps = editingRecipeData.steps.map(s => (s || '').trim()).filter(Boolean);

  // Validació mínima
  if (!editingRecipeData.name) { showToast(t('needName')); return; }
  if (cleanIngs.length === 0) { showToast(t('addIngredient')); return; }
  if (cleanSteps.length === 0) { showToast(t('addStep')); return; }

  editingRecipeData.ingredients = cleanIngs;
  editingRecipeData.steps = cleanSteps;

  if (editingRecipeId) {
    // Editar existent
    const idx = customRecipes.findIndex(r => r.id === editingRecipeId);
    if (idx >= 0) customRecipes[idx] = Object.assign({}, editingRecipeData, { id: editingRecipeId });
  } else {
    // Nova
    editingRecipeData.id = _customRecipeId(editingRecipeData.name);
    customRecipes.push(editingRecipeData);
  }
  saveCustomRecipes();
  showToast(t('saved'));

  if (editingRecipeId) {
    // En edició, tornem al detall amb la recepta refrescada
    currentRecipeId = editingRecipeId;
    editingRecipeData = null;
    editingRecipeId = null;
    renderRecipeDetail();
    showScreen('recipe-detail');
  } else {
    // Nova: tornem a la llista CookMe
    editingRecipeData = null;
    editingRecipeId = null;
    renderCookMe();
    showScreen('cookme');
  }
}

// Esborra una recepta custom (només si isCustom). Demana confirmació.
function deleteCustomRecipe(id) {
  const recipe = customRecipes.find(r => r.id === id);
  if (!recipe) return;
  const onYes = () => {
    customRecipes = customRecipes.filter(r => r.id !== id);
    saveCustomRecipes();
    if (recipeUsage[id]) {
      delete recipeUsage[id];
      saveRecipeUsage();
    }
    showToast(t('deleted'));
    renderCookMe();
    showScreen('cookme');
  };
  if (typeof showConfirmDangerModal === 'function') {
    showConfirmDangerModal('🗑️', recipe.name || t('delete'), t('deleteRecipeConfirm'), onYes);
  } else if (window.confirm(t('deleteRecipeConfirm'))) {
    onYes();
  }
}
