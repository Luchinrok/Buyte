/* ============================================
   Buyte — js/cookme.js
   CookMe: receptes basades en els ingredients que
   l'usuari té al BiteMe (products[]).
   Sense IA, totalment local. El catàleg de receptes
   viu a js/recipes-data.js (constant RECIPES).
   ============================================ */


// Pestanya activa: 'ready' | 'almost' | 'all'
let cookmeTab = 'ready';
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

  const recipes = (typeof RECIPES !== 'undefined' && Array.isArray(RECIPES)) ? RECIPES : [];
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
  } else if (cookmeTab === 'almost') {
    filtered = results.filter(r => !r.canMake && r.percent >= 70);
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

  // Ordena segons el mode triat
  if (cookmeSort === 'alpha') {
    filtered.sort((a, b) => (a.recipe.name || '').localeCompare(b.recipe.name || '', 'ca'));
  } else {
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
    } else {
      const anyAlmost = results.some(r => r.canMake || r.percent >= 70);
      if (cookmeTab === 'ready' && anyAlmost) {
        empty.textContent = t('noRecipesReady');
      } else {
        empty.textContent = t('noRecipesAtAll');
      }
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

  card.innerHTML =
    '<div class="cookme-card-emoji">' + (r.recipe.emoji || '🍽️') + '</div>' +
    '<div class="cookme-card-body">' +
      '<p class="cookme-card-title">' + escapeHtml(r.recipe.name || '') + '</p>' +
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
  const recipes = (typeof RECIPES !== 'undefined' && Array.isArray(RECIPES)) ? RECIPES : [];
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;
  currentRecipeId = id;
  currentServings = recipe.servings || 1;
  renderRecipeDetail();
  showScreen('recipe-detail');
}

// Renderitza els blocs de la pantalla de detall a partir de currentRecipeId.
function renderRecipeDetail() {
  const recipes = (typeof RECIPES !== 'undefined' && Array.isArray(RECIPES)) ? RECIPES : [];
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

  // Botó "Afegir al BuyMe" (només si manquen ingredients)
  const btn = document.getElementById('recipe-add-missing');
  if (btn) {
    if (m.missing.length > 0) {
      btn.style.display = 'flex';
      btn.textContent = '🛒 ' + t('addMissingToShopping') + ' (' + m.missing.length + ' ' + t('missingItems') + ')';
    } else {
      btn.style.display = 'none';
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
}

// Inicia el flux d'afegir els ingredients que falten al BuyMe.
function addMissingToBuyMe() {
  const recipes = (typeof RECIPES !== 'undefined' && Array.isArray(RECIPES)) ? RECIPES : [];
  const recipe = currentRecipeId ? recipes.find(r => r.id === currentRecipeId) : null;
  if (!recipe) return;

  const userProducts = (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];
  const m = calculateRecipeMatch(recipe, userProducts);
  if (m.missing.length === 0) return;

  const enabled = (typeof getEnabledSupermarkets === 'function') ? getEnabledSupermarkets() : [];
  if (enabled.length === 0) {
    showToast(t('noSuperAvailable'));
    return;
  }
  if (enabled.length === 1) {
    addMissingItemsTo(enabled[0].id, m.missing);
    return;
  }
  showSuperPickerForMissing(m.missing);
}

// Afegeix els ingredients que falten al super indicat. Reutilitza
// addToShoppingList del BuyMe (mateix format que els productes manuals).
function addMissingItemsTo(supermarketId, missing) {
  if (typeof addToShoppingList !== 'function') return;
  missing.forEach(ing => {
    const product = { name: cookmeCapitalize(ing.name || ''), emoji: ing.emoji || '🛒' };
    addToShoppingList(supermarketId, product, ing.qty || '');
  });
  const sm = (typeof getSupermarketById === 'function') ? getSupermarketById(supermarketId) : null;
  const smName = sm ? sm.name : '';
  showToast('🛒 ' + missing.length + ' ' + t('ingredientsAdded') + ' ' + smName);
}

// Mostra un modal amb els supers actius perquè l'usuari triï on afegir-los.
function showSuperPickerForMissing(missing) {
  const enabled = (typeof getEnabledSupermarkets === 'function') ? getEnabledSupermarkets() : [];
  if (enabled.length === 0) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const gradients = [
    ['#42A5F5', '#1565C0'], ['#26A69A', '#00695C'], ['#FFA726', '#E65100'],
    ['#AB47BC', '#7B1FA2'], ['#EF5350', '#C62828'], ['#66BB6A', '#388E3C'],
    ['#5C6BC0', '#3949AB']
  ];

  const buttons = enabled.map((sm, idx) => {
    const [c1, c2] = gradients[idx % gradients.length];
    return '<button class="modal-supermarket-btn" data-id="' + escapeHtml(sm.id) + '" '
      + 'style="background:linear-gradient(135deg, ' + c1 + ' 0%, ' + c2 + ' 100%)">'
      + '<span class="modal-sm-emoji">' + (sm.emoji || '🛒') + '</span>'
      + '<span class="modal-sm-name">' + escapeHtml(sm.name || '') + '</span>'
      + '</button>';
  }).join('');

  overlay.innerHTML =
    '<div class="modal-content">' +
      '<div class="modal-emoji-big">🛒</div>' +
      '<p class="modal-title">' + t('whichSuper') + '</p>' +
      '<p class="modal-sub">' + missing.length + ' ' + t('missingItems') + '</p>' +
      '<div class="modal-options">' + buttons + '</div>' +
      '<button class="modal-cancel" id="modal-cancel-btn" style="margin-top:10px">' + t('cancel') + '</button>' +
    '</div>';

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.modal-supermarket-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const smId = btn.dataset.id;
      document.body.removeChild(overlay);
      addMissingItemsTo(smId, missing);
    });
  });

  overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

// Actualitza el comptador de receptes que es poden fer ja al botó del launcher.
function renderCookMeBadge() {
  const badge = document.getElementById('btn-cookme-count');
  if (!badge) return;
  const recipes = (typeof RECIPES !== 'undefined' && Array.isArray(RECIPES)) ? RECIPES : [];
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
