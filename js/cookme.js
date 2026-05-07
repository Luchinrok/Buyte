/* ============================================
   Buyte — js/cookme.js
   CookMe: receptes basades en els ingredients que
   l'usuari té a l'EatMe (products[]).
   Sense IA, totalment local. El catàleg de receptes
   viu a js/recipes-data.js (constant RECIPES).
   ============================================ */


// Filtre actiu: 'available' (per defecte) | 'all' | 'used' | 'mine' | 'edited'.
// Persisteix entre obertures de CookMe dins de la sessió: la primera vegada
// l'usuari aterra a "Disponibles" perquè vegi directament què pot cuinar; a
// partir d'aquí, l'app recorda l'última tria fins que es recarrega la pàgina.
let currentRecipeFilter = 'available';
// Ordre de les cares del cub: cada índex es mapeja a un filtre. Vegeu
// _ensureCookMeSwiper. Disponibles és la cara inicial perquè és el filtre
// per defecte que veu l'usuari el primer cop que obre CookMe.
const COOKME_FILTERS = ['all', 'available', 'used', 'mine', 'edited'];
const COOKME_FILTER_LABELS = {
  all: 'recipesAll',
  available: 'recipesAvailable',
  used: 'mostUsed',
  mine: 'recipeMine',
  edited: 'recipeEdited'
};
// D'on s'ha obert CookMe: 'home' (per defecte) o 'settings'. Determina la
// pantalla a la qual torna el botó back.
let cookmeOrigin = 'home';
// Mode d'edició de la llista: quan està actiu, cada card de recepta mostra
// botons inline d'editar/esborrar/restaurar i clicar la card no obre el detall.
let recipeEditMode = false;
// Receptes custom de l'usuari (es desen a localStorage). Conviuen amb el catàleg.
let customRecipes = [];
// Modificacions persistents que l'usuari ha fet sobre receptes del catàleg.
// Format: { 'recipe-id': { ...camps editats... } }. La recepta resultant
// que veu l'usuari és { ...base del catàleg, ...override }.
let recipeOverrides = {};

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

// Actualitza el subtítol de la card "Receptes" del menú de Configuració.
function updateRecipesCount() {
  const el = document.getElementById('recipes-count');
  if (!el) return;
  const total = (typeof getAllRecipes === 'function') ? getAllRecipes().length : 0;
  el.textContent = total + ' ' + t('recipesCount');
}

function loadRecipeOverrides() {
  try {
    const raw = localStorage.getItem('eatmefirst_recipe_overrides');
    recipeOverrides = raw ? (JSON.parse(raw) || {}) : {};
    if (typeof recipeOverrides !== 'object' || Array.isArray(recipeOverrides)) recipeOverrides = {};
  } catch (e) { recipeOverrides = {}; }
}

function saveRecipeOverrides() {
  try {
    localStorage.setItem('eatmefirst_recipe_overrides', JSON.stringify(recipeOverrides));
  } catch (e) {}
}

// Comprova si una recepta del catàleg té modificacions persistents.
function hasRecipeOverride(id) {
  return !!(id && recipeOverrides[id]);
}

// Aplica un override sobre la recepta base i retorna el resultat fusionat.
function _applyOverride(base, override) {
  if (!override) return base;
  return Object.assign({}, base, override);
}

// Retorna una recepta resoltora a partir de l'id: cerca primer als customs,
// si no, al catàleg, i en aquest cas aplica l'override si existeix.
function getRecipe(id) {
  if (!id) return null;
  const custom = customRecipes.find(r => r.id === id);
  if (custom) return custom;
  const catalog = (typeof RECIPES !== 'undefined' && Array.isArray(RECIPES)) ? RECIPES : [];
  const base = catalog.find(r => r.id === id);
  if (!base) return null;
  return _applyOverride(base, recipeOverrides[id]);
}

// Llista combinada: catàleg (amb overrides aplicats) + custom. Custom van
// darrere per estabilitat de l'ordre.
function getAllRecipes() {
  const catalog = (typeof RECIPES !== 'undefined' && Array.isArray(RECIPES)) ? RECIPES : [];
  const merged = catalog.map(r => _applyOverride(r, recipeOverrides[r.id]));
  return merged.concat(customRecipes);
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
// Filtre actiu per un producte concret (entrada des del detall d'un
// producte de l'EatMe via openCookMeForProduct). Quan està actiu, es
// limita el conjunt de receptes a aquelles que contenen aquell
// producte (per emoji o per nom). Es manté en paral·lel als filtres
// per pestanya i a la cerca lliure: tots tres s'apliquen junts.
//   { emoji: '🥩', name: 'Carn picada', productId: '...' } | null
let cookmeProductFilter = null;

// Normalitza un text: minúscules + sense accents + sense espais finals.
function cookmeNormalize(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Comprova si l'usuari té un ingredient als seus productes de l'EatMe.
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

// Obre la pantalla CookMe i renderitza la pestanya per defecte. L'argument
// origin ('home' | 'settings') determina la pantalla a la qual tornarà el
// botó "back" — així es pot reutilitzar la mateixa pantalla des de Configuració.
function openCookMe(origin) {
  cookmeOrigin = origin || 'home';
  // El filtre per producte només té sentit quan s'entra des del detall
  // d'un producte (origin='product'); en qualsevol altre cas el netegem
  // perquè una entrada per la via normal (launcher / Settings / smart
  // notifs) no arrossegui un filtre d'una sessió anterior.
  if (cookmeOrigin !== 'product') cookmeProductFilter = null;
  // Filtre: NO el resetegem perquè es recordi entre obertures dins la sessió.
  // El valor inicial al primer boot és 'available' (vegeu currentRecipeFilter).
  cookmeSearch = '';
  cookmeSort = 'percent';
  recipeEditMode = false;
  updateRecipeEditModeBtn();
  applyCookMeBackTarget();
  // Reseteja l'input de cerca i el placeholder en l'idioma actual
  const searchInput = document.getElementById('cookme-search');
  if (searchInput) {
    searchInput.value = '';
    searchInput.placeholder = t('searchRecipe');
  }
  updateCookMeSortBtn();
  renderCookMe();
  showScreen('cookme');
  // Després de mostrar la pantalla, inicialitzem el Swiper cube. Cal
  // requestAnimationFrame perquè el clientWidth de .cookme-slider sigui
  // > 0 (la pantalla acaba de rebre la classe .active).
  _initCookMeSwiperWhenReady();
}

// Configura el destí del botó back de la pantalla CookMe segons cookmeOrigin.
function applyCookMeBackTarget() {
  const backBtn = document.querySelector('#screen-cookme .back-btn');
  if (!backBtn) return;
  if (cookmeOrigin === 'product') {
    // El handler genèric de back-btn a app.js reconeix 'product' i crida
    // openProduct(currentProduct.id) per refrescar el detall original.
    backBtn.dataset.back = 'product';
    return;
  }
  const isSettings = cookmeOrigin === 'settings' || (typeof cookmeOrigin === 'string' && cookmeOrigin.indexOf('settings-') === 0);
  backBtn.dataset.back = isSettings ? cookmeOrigin : 'launcher';
}

// Activa o desactiva el mode d'edició de la llista de receptes.
function toggleRecipeEditMode() {
  recipeEditMode = !recipeEditMode;
  updateRecipeEditModeBtn();
  renderCookMe();
}

// Refresca l'aparença del botó ✏️ / ✓ Fet a la capçalera.
function updateRecipeEditModeBtn() {
  const btn = document.getElementById('btn-toggle-recipe-edit');
  if (!btn) return;
  btn.textContent = recipeEditMode ? '✓' : '✏️';
  btn.classList.toggle('is-active', recipeEditMode);
  btn.setAttribute('aria-label', recipeEditMode ? 'Done' : 'Edit');
}

// Canvia el filtre actiu (all / available / used / mine / edited). Si el
// Swiper cube ja està instanciat, també rota el cub per ensenyar la cara
// del filtre triat. Útil per a smart-notifications quan demanen
// 'available' per defecte abans d'obrir CookMe.
function setRecipeFilter(filter) {
  currentRecipeFilter = filter;
  const idx = COOKME_FILTERS.indexOf(filter);
  if (window.cookmeSwiper && idx >= 0 && idx !== window.cookmeSwiper.realIndex) {
    try { window.cookmeSwiper.slideToLoop(idx, 0); } catch (e) {}
  }
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

// Renderitza les llistes de receptes en totes les cares del cub. Cada
// filtre té el seu propi contenidor (.cookme-list[data-filter-content="…"])
// i el seu propi missatge buit (.cookme-empty[data-filter-empty="…"]).
// El Swiper cube no es re-renderitza aquí — només el contingut intern
// dels slides — així evitem destruir/recrear la instància cada vegada.
function renderCookMe() {
  const slider = document.querySelector('.cookme-slider');
  if (!slider) return;

  // Defensiu: si veníem de Configuració, mantenim el destí del back
  applyCookMeBackTarget();

  const recipes = getAllRecipes();
  const userProducts = (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];

  // Calcula match per cada recepta una sola vegada — totes les pestanyes
  // comparteixen la mateixa base de dades.
  const results = recipes.map(r => {
    const m = calculateRecipeMatch(r, userProducts);
    return { recipe: r, matched: m.matched, missing: m.missing, percent: m.percent, canMake: m.canMake };
  });

  const q = cookmeNormalize(cookmeSearch);

  COOKME_FILTERS.forEach(filter => {
    // Amb Swiper loop:true, el wrapper té slides DUPLICADES per fer la
    // transició cíclica seamless. Cada filtre pot tenir, a més de
    // l'original, un clone amb el mateix data-filter-content. Hem
    // d'escriure el contingut a TOTES les coincidències — si només
    // tractem el primer match (querySelector), el clone queda buit i
    // l'usuari aterra a una cara del cub sense cards. Mateix patró
    // que openShelf a js/biteme.js (querySelectorAll als level-page).
    const lists = slider.querySelectorAll('.cookme-list[data-filter-content="' + filter + '"]');
    const empties = slider.querySelectorAll('.cookme-empty[data-filter-empty="' + filter + '"]');
    if (!lists.length) return;

    let filtered = _filterRecipesForTab(results, filter);
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
    if (cookmeProductFilter) {
      filtered = filtered.filter(r => _ingredientsMatchProductFilter(r.recipe.ingredients, cookmeProductFilter));
    }

    // 'used' té un ordre intrínsec (per popularitat); només el sobreescrivim
    // si l'usuari demana alfabètic.
    if (cookmeSort === 'alpha') {
      filtered.sort((a, b) => (a.recipe.name || '').localeCompare(b.recipe.name || '', 'ca'));
    } else if (filter !== 'used') {
      filtered.sort((a, b) => {
        if (b.percent !== a.percent) return b.percent - a.percent;
        return (a.recipe.name || '').localeCompare(b.recipe.name || '', 'ca');
      });
    }

    if (filtered.length === 0) {
      const msg = _cookmeEmptyMessage(filter, q);
      lists.forEach(l => { l.innerHTML = ''; l.style.display = 'none'; });
      empties.forEach(e => { e.textContent = msg; e.style.display = 'block'; });
      return;
    }

    empties.forEach(e => { e.style.display = 'none'; });
    lists.forEach(list => {
      list.innerHTML = '';
      list.style.display = 'flex';
      // buildCookMeCard crea un nou DOM node a cada crida — segur
      // d'invocar-lo per cada llista, no es comparteixen referències.
      filtered.forEach(r => list.appendChild(buildCookMeCard(r)));
    });
  });

  _updateCookMeProductFilterChip();
}

// Aplica el filtre del filtre indicat a la llista pre-calculada de
// resultats. El filtre 'used' inclou un re-ordre per popularitat (top 10).
function _filterRecipesForTab(results, filter) {
  if (filter === 'available') {
    return results.filter(r => r.canMake);
  }
  if (filter === 'used') {
    return results
      .filter(r => recipeUsage[r.recipe.id])
      .map(r => Object.assign({}, r, { _u: recipeUsage[r.recipe.id] }))
      .sort((a, b) => {
        if (b._u.addedToShopping !== a._u.addedToShopping) return b._u.addedToShopping - a._u.addedToShopping;
        if (b._u.views !== a._u.views) return b._u.views - a._u.views;
        return (b._u.lastUsed || 0) - (a._u.lastUsed || 0);
      })
      .slice(0, 10);
  }
  if (filter === 'mine') {
    return results.filter(r => r.recipe.isCustom);
  }
  if (filter === 'edited') {
    return results.filter(r => !r.recipe.isCustom && hasRecipeOverride(r.recipe.id));
  }
  return results.slice();
}

// Missatge a mostrar quan una pestanya queda buida després de filtrar.
function _cookmeEmptyMessage(filter, query) {
  // El filtre per producte té prioritat: si està actiu i no hi ha cap
  // recepta a la pestanya, l'usuari ha d'entendre que el motiu és el
  // producte (no que la pestanya sigui buida del tot).
  if (cookmeProductFilter) {
    const name = cookmeProductFilter.name || '';
    return t('noRecipesForProduct', name);
  }
  if (query) return t('noResults');
  if (filter === 'used') return t('noUsedRecipes');
  if (filter === 'available') return t('noRecipesAvailable');
  if (filter === 'mine') return t('noMineRecipes');
  if (filter === 'edited') return t('noEditedRecipes');
  return t('noRecipesAtAll');
}

// Comprova si alguna ingredient de la recepta coincideix amb el filtre
// per producte. Mateix algorisme que matchIngredient (emoji exacte
// primer, després nom amb cookmeNormalize), però invertit: aquí el
// "candidat" és l'ingredient i el "subjecte" és el producte de l'EatMe.
// Si el nom del producte conté el de l'ingredient O l'ingredient conté
// el del producte, es considera coincidència — així "Carn picada" del
// producte casa amb una recepta que demani "carn".
function _ingredientsMatchProductFilter(ingredients, productFilter) {
  if (!ingredients || !productFilter) return false;
  const targetEmoji = productFilter.emoji || '';
  const targetName = cookmeNormalize(productFilter.name);
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    if (targetEmoji && ing.emoji && ing.emoji === targetEmoji) return true;
    if (targetName) {
      const ingName = cookmeNormalize(ing.name);
      if (ingName && (ingName.includes(targetName) || targetName.includes(ingName))) return true;
    }
  }
  return false;
}

// Renderitza/oculta el xip indicador del filtre actiu per producte.
// Es crida des de renderCookMe — el xip viu sempre al DOM (vegeu
// index.html: #cookme-product-filter-chip) però només té contingut
// quan cookmeProductFilter no és null.
function _updateCookMeProductFilterChip() {
  const chip = document.getElementById('cookme-product-filter-chip');
  if (!chip) return;
  if (!cookmeProductFilter) {
    chip.style.display = 'none';
    chip.innerHTML = '';
    return;
  }
  const emoji = cookmeProductFilter.emoji || '';
  const name = cookmeProductFilter.name || '';
  const clearLabel = t('clearFilterBtn');
  chip.style.display = 'flex';
  chip.innerHTML =
    '<span class="cookme-product-filter-label">' +
      escapeHtml(t('filteringByProduct')) + ' ' +
      (emoji ? emoji + ' ' : '') +
      escapeHtml(name) +
    '</span>' +
    '<button type="button" class="cookme-product-filter-clear" id="cookme-product-filter-clear" aria-label="' + escapeHtml(clearLabel) + '" title="' + escapeHtml(clearLabel) + '">×</button>';
  const clearBtn = chip.querySelector('#cookme-product-filter-clear');
  if (clearBtn) clearBtn.addEventListener('click', clearCookMeProductFilter);
}

// Treu el filtre per producte i re-renderitza. NO toca cookmeOrigin —
// així el botó back continua tornant al producte d'origen, que és el
// comportament esperat: l'usuari ha clicat × per veure totes les
// receptes, no per "abandonar" el flux que ve del producte.
function clearCookMeProductFilter() {
  cookmeProductFilter = null;
  renderCookMe();
}

// Punt d'entrada des del botó "🍳 Receptes" del detall del producte
// (vegeu app.js, listener de #btn-recipes-from-product). Defineix el
// filtre i obre CookMe amb origin='product' perquè el back hi torni.
// Aterra a la pestanya "Disponibles" perquè és la més útil quan
// l'usuari té el producte a la nevera i busca què cuinar.
function openCookMeForProduct(product) {
  if (!product) return;
  cookmeProductFilter = {
    emoji: product.emoji || '',
    name: product.name || '',
    productId: product.id || ''
  };
  currentRecipeFilter = 'available';
  openCookMe('product');
}

// Construeix una targeta de recepta. Els clicks es processen via
// delegation al contenidor .cookme-slider (vegeu _initCookMeActionsDelegate)
// — no enllacem listeners directament a la card perquè amb Swiper loop:true
// les slides es dupliquen i els listeners individuals no es propaguen als
// clones. La delegation captura tant els originals com els clones.
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

  // Badge "Editada" per a les receptes del catàleg amb override actiu
  const isCustom = !!r.recipe.isCustom;
  const isEdited = !isCustom && hasRecipeOverride(r.recipe.id);
  const editedBadge = isEdited
    ? '<span class="recipe-edited-badge">⚡ ' + escapeHtml(t('editedTag')) + '</span>'
    : '';

  // Accions inline quan estem en mode edició
  let actionsHtml = '';
  if (recipeEditMode) {
    let actions = '<button type="button" class="recipe-edit-pencil" data-action="edit" aria-label="Edit">✏️</button>';
    if (isCustom) {
      actions += '<button type="button" class="recipe-delete-btn" data-action="delete" aria-label="Delete">✕</button>';
    } else if (isEdited) {
      actions += '<button type="button" class="recipe-restore-btn" data-action="restore" aria-label="Restore">🔄</button>';
    }
    actionsHtml = '<div class="recipe-edit-mode-actions">' + actions + '</div>';
  }

  card.innerHTML =
    editedBadge +
    '<div class="cookme-card-emoji">' + (r.recipe.emoji || '🍽️') + '</div>' +
    '<div class="cookme-card-body">' +
      '<p class="cookme-card-title">' + escapeHtml(r.recipe.name || '') + customTag + '</p>' +
      '<p class="cookme-card-meta">⏱️ ' + (r.recipe.time || 0) + ' ' + escapeHtml(t('minutes')) +
        ' · 🍴 ' + (r.recipe.servings || 1) + ' ' + escapeHtml(peopleLabel) + '</p>' +
      badgeHtml +
    '</div>' +
    (recipeEditMode ? actionsHtml : '<div class="cookme-card-percent">' + r.percent + '%</div>');

  // Cap addEventListener: els clicks es processen via delegation al
  // contenidor .cookme-slider (vegeu _initCookMeActionsDelegate). Els
  // botons interns (edit / delete / restore) duen data-action, així la
  // delegation prioritza l'acció específica abans de l'obertura del detall.
  return card;
}

// Restaura una recepta del catàleg desde la llista (sense passar per l'edit form).
function restoreCatalogRecipe(id) {
  if (!hasRecipeOverride(id)) return;
  const recipe = getRecipe(id);
  const onYes = () => {
    delete recipeOverrides[id];
    saveRecipeOverrides();
    showToast(t('restoredOriginal'));
    renderCookMe();
  };
  if (typeof showConfirmDangerModal === 'function') {
    showConfirmDangerModal('🔄', recipe ? recipe.name : t('restoreOriginalRecipe'), t('restoreOriginalConfirm'), onYes);
  } else if (window.confirm(t('restoreOriginalConfirm'))) {
    onYes();
  }
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
  const recipe = getRecipe(id);
  if (!recipe) return;
  currentRecipeId = id;
  currentServings = recipe.servings || 1;
  incrementRecipeView(id);
  // El comptador de visites s'ha actualitzat: pot disparar 'first-cookme'.
  if (typeof checkBadges === 'function') checkBadges();
  renderRecipeDetail();
  showScreen('recipe-detail');
}

// Renderitza els blocs de la pantalla de detall a partir de currentRecipeId.
function renderRecipeDetail() {
  const recipe = currentRecipeId ? getRecipe(currentRecipeId) : null;
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
  const recipe = currentRecipeId ? getRecipe(currentRecipeId) : null;
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
  // Gamificació: 25 XP per "cuinar" una recepta (afegir-ne ingredients al BuyMe).
  // Es compta per acció (no per ingredient — cada ítem ja n'ha sumat 1 via addToShoppingList).
  if (typeof addXp === 'function' && items.length > 0) addXp(25, 'cookme-cook');
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
  // Si la sub-pantalla de Configuració > Contingut ha redirigit el back a
  // 'settings-content' (embed actiu), respectem-ho — així el back retorna
  // a la sub-pàgina i no a la pantalla autònoma del CookMe.
  if (backBtn) {
    const cur = backBtn.dataset.back || '';
    if (cur.indexOf('settings-') !== 0) backBtn.dataset.back = 'cookme';
  }
  renderRecipeEditForm();
  showScreen('recipe-edit');
}

// Obre el formulari per editar una recepta existent (custom o del catàleg).
// Si és del catàleg, els canvis es desen com a override; si és custom, es
// sobreescriu directament.
function openEditRecipeForm(id) {
  const recipe = getRecipe(id);
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
  // Mateix raonament que a openNewRecipeForm: respectem la redirecció
  // 'settings-*' si l'embed l'ha posada.
  if (backBtn) {
    const cur = backBtn.dataset.back || '';
    if (cur.indexOf('settings-') !== 0) backBtn.dataset.back = 'recipe-detail';
  }
  renderRecipeEditForm();
  showScreen('recipe-edit');
}

// Pinta tots els camps del formulari segons editingRecipeData.
function renderRecipeEditForm() {
  if (!editingRecipeData) return;

  const titleEl = document.getElementById('recipe-edit-title');
  if (titleEl) titleEl.textContent = editingRecipeId ? t('editRecipe') : t('newRecipe');

  const nameEl = document.getElementById('recipe-edit-name');
  if (nameEl) {
    nameEl.value = editingRecipeData.name || '';
    nameEl.placeholder = t('recipeName');
  }

  const emojiCurrent = document.getElementById('recipe-emoji-current');
  if (emojiCurrent) emojiCurrent.textContent = editingRecipeData.emoji || '🍳';

  const timeEl = document.getElementById('recipe-edit-time');
  if (timeEl) timeEl.value = editingRecipeData.time || 20;

  // Stepper de persones: actualitza el número visible
  const servDisplay = document.getElementById('recipe-edit-servings-display');
  if (servDisplay) servDisplay.textContent = String(editingRecipeData.servings || 2);

  document.querySelectorAll('#recipe-edit-difficulty button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === editingRecipeData.difficulty);
  });

  const catEl = document.getElementById('recipe-edit-category');
  if (catEl) catEl.value = editingRecipeData.category || 'esmorzar';

  const tipEl = document.getElementById('recipe-edit-tip');
  if (tipEl) {
    tipEl.value = editingRecipeData.tip || '';
    tipEl.placeholder = t('recipeTipPlaceholder');
  }

  renderRecipeEditIngredients();
  renderRecipeEditSteps();

  // Botó "Restaurar original": només per receptes del catàleg amb override actiu.
  const restoreBtn = document.getElementById('btn-restore-recipe');
  const deleteBtn = document.getElementById('btn-delete-recipe');
  const isCustom = !!editingRecipeData.isCustom;
  if (restoreBtn) {
    const showRestore = !isCustom && editingRecipeId && hasRecipeOverride(editingRecipeId);
    restoreBtn.style.display = showRestore ? 'flex' : 'none';
  }
  // Botó "Esborrar": només per receptes custom existents (mai per al catàleg
  // ni per a les noves que encara no s'han desat).
  if (deleteBtn) {
    deleteBtn.style.display = (isCustom && editingRecipeId) ? 'flex' : 'none';
  }
}

// Ajusta el nombre de persones del formulari (clamp 1-20) i actualitza el display.
function adjustRecipeEditServings(delta) {
  if (!editingRecipeData) return;
  const next = Math.min(20, Math.max(1, (editingRecipeData.servings || 1) + delta));
  if (next === editingRecipeData.servings) return;
  editingRecipeData.servings = next;
  const display = document.getElementById('recipe-edit-servings-display');
  if (display) display.textContent = String(next);
}

function renderRecipeEditIngredients() {
  const container = document.getElementById('recipe-edit-ingredients');
  if (!container || !editingRecipeData) return;
  container.innerHTML = '';
  const countEl = document.getElementById('recipe-edit-ingredients-count');
  if (countEl) countEl.textContent = '(' + editingRecipeData.ingredients.length + ')';
  editingRecipeData.ingredients.forEach((ing, idx) => {
    const row = document.createElement('div');
    row.className = 'ingredient-input-row';
    row.dataset.idx = idx;
    const requiredTitle = escapeHtml(t('requiredIngredient'));
    row.innerHTML =
      '<button type="button" class="ingredient-emoji-btn" data-action="emoji">' + escapeHtml(ing.emoji || '🥕') + '</button>' +
      '<input type="text" class="ingredient-input-name" placeholder="' + escapeHtml(t('itemName')) + '" value="' + escapeHtml(ing.name || '') + '" autocomplete="off">' +
      '<input type="text" class="ingredient-input-qty" placeholder="qty" value="' + escapeHtml(ing.qty || '') + '" autocomplete="off">' +
      '<button type="button" class="ingredient-required-star' + (ing.required ? ' is-required' : '') + '" ' +
        'data-action="toggle-required" title="' + requiredTitle + '" aria-label="' + requiredTitle + '" ' +
        'aria-pressed="' + (ing.required ? 'true' : 'false') + '">' +
        (ing.required ? '⭐' : '☆') +
      '</button>' +
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

    const starBtn = row.querySelector('[data-action="toggle-required"]');
    if (starBtn) starBtn.addEventListener('click', () => {
      const ingr = editingRecipeData.ingredients[idx];
      if (!ingr) return;
      ingr.required = !ingr.required;
      starBtn.classList.toggle('is-required', ingr.required);
      starBtn.setAttribute('aria-pressed', ingr.required ? 'true' : 'false');
      starBtn.textContent = ingr.required ? '⭐' : '☆';
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
  const countEl = document.getElementById('recipe-edit-steps-count');
  if (countEl) countEl.textContent = '(' + editingRecipeData.steps.length + ')';
  const total = editingRecipeData.steps.length;
  editingRecipeData.steps.forEach((step, idx) => {
    const row = document.createElement('div');
    row.className = 'step-input-row';
    row.dataset.idx = idx;
    row.innerHTML =
      '<span class="step-number-bubble">' + (idx + 1) + '</span>' +
      '<textarea class="step-input-text" rows="2" placeholder="' + escapeHtml(t('addStep')) + '">' + escapeHtml(step || '') + '</textarea>' +
      '<div class="step-actions">' +
        '<button type="button" class="step-action-btn" data-action="up" aria-label="Up"' + (idx === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="step-action-btn" data-action="down" aria-label="Down"' + (idx === total - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" class="step-action-btn step-action-remove" data-action="remove" aria-label="Remove">✕</button>' +
      '</div>';
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
    const upBtn = row.querySelector('[data-action="up"]');
    if (upBtn) upBtn.addEventListener('click', () => moveRecipeEditStep(idx, -1));
    const downBtn = row.querySelector('[data-action="down"]');
    if (downBtn) downBtn.addEventListener('click', () => moveRecipeEditStep(idx, +1));
  });
}

// Reordena un pas: puja (-1) o baixa (+1). Re-renderitza si el moviment és vàlid.
function moveRecipeEditStep(idx, delta) {
  if (!editingRecipeData) return;
  const target = idx + delta;
  if (target < 0 || target >= editingRecipeData.steps.length) return;
  const arr = editingRecipeData.steps;
  const tmp = arr[idx];
  arr[idx] = arr[target];
  arr[target] = tmp;
  renderRecipeEditSteps();
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
  // Servings ve del stepper (ja sincronitzat a editingRecipeData via adjustRecipeEditServings)
  editingRecipeData.servings = Math.min(20, Math.max(1, parseInt(editingRecipeData.servings, 10) || 1));
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

  let xpAmount = 0;
  let xpReason = '';
  if (editingRecipeId) {
    // Editar existent: distingim entre custom i catàleg
    const customIdx = customRecipes.findIndex(r => r.id === editingRecipeId);
    if (customIdx >= 0) {
      // Sobreescriu la custom directament
      customRecipes[customIdx] = Object.assign({}, editingRecipeData, { id: editingRecipeId, isCustom: true });
      saveCustomRecipes();
    } else {
      // Recepta del catàleg: desem la versió editada com a override.
      // Guardem una còpia neta sense isCustom (les del catàleg no en duen).
      const overrideData = Object.assign({}, editingRecipeData);
      overrideData.id = editingRecipeId;
      delete overrideData.isCustom;
      recipeOverrides[editingRecipeId] = overrideData;
      saveRecipeOverrides();
    }
    xpAmount = 5;
    xpReason = 'recipe-edit';
  } else {
    // Nova recepta custom
    editingRecipeData.id = _customRecipeId(editingRecipeData.name);
    customRecipes.push(editingRecipeData);
    saveCustomRecipes();
    xpAmount = 50;
    xpReason = 'recipe-new';
  }
  if (typeof addXp === 'function' && xpAmount > 0) addXp(xpAmount, xpReason);
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

// Esborra l'override d'una recepta del catàleg, restaurant els valors originals.
// Demana confirmació abans d'aplicar.
function restoreOriginalRecipe() {
  if (!editingRecipeId || !hasRecipeOverride(editingRecipeId)) return;
  const id = editingRecipeId;
  const onYes = () => {
    delete recipeOverrides[id];
    saveRecipeOverrides();
    currentRecipeId = id;
    editingRecipeData = null;
    editingRecipeId = null;
    showToast(t('restoredOriginal'));
    renderRecipeDetail();
    showScreen('recipe-detail');
  };
  if (typeof showConfirmDangerModal === 'function') {
    showConfirmDangerModal('🔄', t('restoreOriginalRecipe'), t('restoreOriginalConfirm'), onYes);
  } else if (window.confirm(t('restoreOriginalConfirm'))) {
    onYes();
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

// Surt del formulari sense desar canvis. Si veníem d'un detall, hi tornem;
// si no, anem a la llista de receptes.
function cancelRecipeEdit() {
  const wasEditing = !!editingRecipeId;
  const id = editingRecipeId;
  editingRecipeData = null;
  editingRecipeId = null;
  if (wasEditing && id) {
    currentRecipeId = id;
    renderRecipeDetail();
    showScreen('recipe-detail');
  } else {
    renderCookMe();
    showScreen('cookme');
  }
}

// ============================================
//   SWIPER CUBE — pestanyes 3D dels filtres
// ============================================
//
// Patró paral·lel a _ensureZonesSwiper (js/biteme.js) i _ensureShopsSwiper
// (js/buyme.js). Cada cara del cub és un filtre (Totes / Disponibles /
// Més usades / Les meves / Editades). Les bullets de la pagination es
// renderitzen com a "tabs" clicables per saltar de cara.
//
// El Swiper s'instancia peresosament la primera vegada que el contenidor
// té dimensions (clientWidth > 0 — la pantalla ha de ser .active). Si la
// pantalla CookMe ha estat embolcallada per Configuració > Contingut >
// Receptes (vegeu _embedStandaloneBody a js/settings.js), el contenidor
// s'haurà mogut a un altre node DOM; en aquest cas destruïm i recreem.

function _initCookMeSwiperWhenReady() {
  const slider = document.querySelector('.cookme-slider');
  if (!slider) return;
  if (!slider.clientWidth) {
    requestAnimationFrame(_initCookMeSwiperWhenReady);
    return;
  }
  _ensureCookMeSwiper();
  // Si l'estat actual del filtre no coincideix amb la cara mostrada
  // (per exemple si setRecipeFilter() s'ha cridat ABANS de l'init),
  // sincronitzem-ho ara sense animació.
  const idx = COOKME_FILTERS.indexOf(currentRecipeFilter);
  if (window.cookmeSwiper && idx >= 0 && idx !== window.cookmeSwiper.realIndex) {
    try { window.cookmeSwiper.slideToLoop(idx, 0); } catch (e) {}
  }
}

function _ensureCookMeSwiper() {
  const slider = document.querySelector('.cookme-slider');
  if (!slider || !slider.clientWidth) return null;

  // Sempre destruïm i recreem en aquests punts d'init (openCookMe i
  // l'embed de Settings > Contingut > Receptes). El motiu: l'embed mou
  // el slider a un altre node DOM, i la geometria del cub Swiper depèn
  // del rectangle del pare. Recrear és barat (5 slides estàtiques) i
  // ens estalvia bugs subtils on el cub queda visualment desalineat.
  if (window.cookmeSwiper) {
    try { window.cookmeSwiper.destroy(true, true); } catch (e) {}
    window.cookmeSwiper = null;
  }

  const initialIdx = Math.max(0, COOKME_FILTERS.indexOf(currentRecipeFilter));

  window.cookmeSwiper = new Swiper(slider, {
    // Vegeu el comentari paral·lel a _ensureShopsSwiper (js/buyme.js):
    // mateixa configuració que els altres cubs de l'app per coherència
    // de feel (sensibilitat, ombres, click-through).
    effect: 'cube',
    cubeEffect: {
      shadow: false,
      slideShadows: true,
      shadowOffset: 20,
      shadowScale: 0.94
    },
    speed: 600,
    grabCursor: true,
    threshold: 5,
    touchRatio: 1,
    longSwipes: true,
    longSwipesRatio: 0.2,
    longSwipesMs: 200,
    shortSwipes: true,
    followFinger: true,
    resistanceRatio: 0.85,
    // preventClicks:false + preventClicksPropagation:false +
    // touchStartPreventDefault:false → els taps a les cards de recepta
    // han de registrar-se al PRIMER toc, sense necessitat de doble click
    // (vegeu el bug equivalent als altres swipers de l'app).
    preventClicks: false,
    preventClicksPropagation: false,
    touchStartPreventDefault: false,
    // loop:true + loopAdditionalSlides:0 — Swiper duplica les slides als
    // extrems perquè la transició Editades→Totes (i viceversa) sigui
    // contínua. loopAdditionalSlides:0 manté només 1 clone per extrem
    // (el necessari per al cube).
    loop: true,
    loopAdditionalSlides: 0,
    initialSlide: initialIdx,
    pagination: {
      el: '#cookme-pagination',
      clickable: true,
      type: 'bullets',
      bulletClass: 'cookme-tab',
      bulletActiveClass: 'cookme-tab-active',
      renderBullet: function (index, className) {
        const filter = COOKME_FILTERS[index] || '';
        const labelKey = COOKME_FILTER_LABELS[filter];
        const label = labelKey ? t(labelKey) : filter;
        return '<button class="' + className + '" type="button" data-filter="' + filter + '">' + escapeHtml(label) + '</button>';
      }
    },
    on: {
      slideChange: function () {
        const filter = COOKME_FILTERS[this.realIndex];
        if (filter && filter !== currentRecipeFilter) {
          currentRecipeFilter = filter;
        }
      },
      // Mateix fallback que als altres cubs: pointer-events:auto explícit
      // al slide actiu post-transició perquè el primer tap registri sense
      // doble click (Android amb touchstart preventDefault).
      slideChangeTransitionEnd: function () {
        const swiper = this;
        const active = swiper.slides && swiper.slides[swiper.activeIndex];
        if (active) active.style.pointerEvents = 'auto';
      }
    }
  });

  _initCookMeActionsDelegate(slider);
  return window.cookmeSwiper;
}

// Event delegation a nivell del .cookme-slider. Cal perquè amb loop:true
// Swiper afegeix slides DUPLICADES al wrapper per fer la transició cíclica
// seamless; els addEventListener individuals afegits a una targeta
// original NO viuen al clone, així que un click sobre un slide-clone es
// perd. Captem-ho aquí amb closest() i derivem la recepta del data-recipe-id
// de la card; així funciona en originals i en clones per igual.
//
// _onCookMeSliderClick és una referència estable a nivell de mòdul: el
// DOM garanteix que addEventListener amb la mateixa funció no s'afegeix
// duplicat. Per això podem cridar _initCookMeActionsDelegate cada cop
// que _ensureCookMeSwiper es crida (no cal guard mutable que Swiper
// pugui esborrar al destroy).
function _onCookMeSliderClick(e) {
  // Botó d'acció dins una card (mode edició): edit / delete / restore.
  const actionBtn = e.target.closest('.cookme-card [data-action]');
  if (actionBtn) {
    e.stopPropagation();
    const card = actionBtn.closest('.cookme-card');
    const recipeId = card ? card.dataset.recipeId : '';
    if (!recipeId) return;
    const action = actionBtn.dataset.action;
    if (action === 'edit') openEditRecipeForm(recipeId);
    else if (action === 'delete') deleteCustomRecipe(recipeId);
    else if (action === 'restore') restoreCatalogRecipe(recipeId);
    return;
  }

  // Click a la card sencera → obrir detall (només si NO estem en mode
  // edició: en mode edició les úniques accions vàlides són els botons).
  const card = e.target.closest('.cookme-card');
  if (card && !recipeEditMode) {
    const recipeId = card.dataset.recipeId;
    if (recipeId) openRecipeDetail(recipeId);
  }
}
function _initCookMeActionsDelegate(slider) {
  if (!slider) return;
  slider.addEventListener('click', _onCookMeSliderClick);
}
