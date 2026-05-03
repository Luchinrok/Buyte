/* ============================================
   Buyte — js/cookme.js
   CookMe: receptes basades en els ingredients que
   l'usuari té al BiteMe (products[]).
   Sense IA, totalment local. El catàleg de receptes
   viu a js/recipes-data.js (constant RECIPES).
   ============================================ */


// Pestanya activa: 'ready' | 'almost' | 'all'
let cookmeTab = 'ready';

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
  // Sincronitza estat visual de les pestanyes
  document.querySelectorAll('#cookme-tabs .cookme-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === cookmeTab);
  });
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

  // Ordena per percent desc, després per nom
  filtered.sort((a, b) => {
    if (b.percent !== a.percent) return b.percent - a.percent;
    return (a.recipe.name || '').localeCompare(b.recipe.name || '');
  });

  list.innerHTML = '';

  if (filtered.length === 0) {
    // Cap recepta a la pestanya. Decideix el missatge:
    const anyAlmost = results.some(r => r.canMake || r.percent >= 70);
    if (cookmeTab === 'ready' && anyAlmost) {
      empty.textContent = t('noRecipesReady');
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
      return em + escapeHtml(i.name || '');
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

  // FASE 3: detall — per ara, no fa res en clicar
  card.addEventListener('click', () => {
    if (typeof openRecipeDetail === 'function') openRecipeDetail(r.recipe.id);
  });

  return card;
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
