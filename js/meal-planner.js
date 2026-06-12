/* ============================================
   Buyte — js/meal-planner.js
   Planificador setmanal de receptes (dins de CookMe), Fase 1.

   Template setmanal genèric (Dilluns–Diumenge), NO lligat a dates:
     localStorage['eatmefirst_meal_plan'] =
       { mon:{esmorzar:null,dinar:null,sopar:null}, tue:{…}, … sun:{…} }
   Valors = recipeId | null. Es sincronitza via settings.js (patró
   categoryOrderBySuper/monthlyBudget).

   Fase 1: assignar/treure receptes per slot. El botó "Generar llista de
   la compra" arribarà a la Fase 2 (reusarà addItemsToShop de cookme.js).
   ============================================ */

const MEAL_PLAN_KEY = 'eatmefirst_meal_plan';

// Ordre i etiquetes dels dies (Dilluns-first, com la resta de l'app).
const MEAL_PLAN_DAYS = [
  { id: 'mon', label: 'Dilluns' },
  { id: 'tue', label: 'Dimarts' },
  { id: 'wed', label: 'Dimecres' },
  { id: 'thu', label: 'Dijous' },
  { id: 'fri', label: 'Divendres' },
  { id: 'sat', label: 'Dissabte' },
  { id: 'sun', label: 'Diumenge' }
];

// Slots de cada dia (en ordre cronològic).
const MEAL_PLAN_SLOTS = [
  { id: 'esmorzar', label: 'Esmorzar', emoji: '🌅' },
  { id: 'dinar', label: 'Dinar', emoji: '🍽️' },
  { id: 'sopar', label: 'Sopar', emoji: '🌙' }
];

function _mpEmptyDay() {
  return { esmorzar: null, dinar: null, sopar: null };
}

// Normalitza un pla: garanteix totes les claus de dia i de slot. Valors
// no-string es passen a null. Defensiu davant de plans incomplets/antics.
function _mpNormalize(plan) {
  const out = {};
  const src = (plan && typeof plan === 'object' && !Array.isArray(plan)) ? plan : {};
  MEAL_PLAN_DAYS.forEach(d => {
    const day = (src[d.id] && typeof src[d.id] === 'object') ? src[d.id] : {};
    out[d.id] = {};
    MEAL_PLAN_SLOTS.forEach(s => {
      const v = day[s.id];
      out[d.id][s.id] = (typeof v === 'string' && v) ? v : null;
    });
  });
  return out;
}

function loadMealPlan() {
  let raw = null;
  try { raw = localStorage.getItem(MEAL_PLAN_KEY); } catch (e) { raw = null; }
  let parsed = {};
  if (raw) {
    try { parsed = JSON.parse(raw) || {}; } catch (e) { parsed = {}; }
  }
  return _mpNormalize(parsed);
}

function saveMealPlan(plan) {
  const normalized = _mpNormalize(plan);
  try { localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(normalized)); } catch (e) {}
  if (typeof pushToServer === 'function') pushToServer();
  return normalized;
}

function openMealPlanner() {
  renderMealPlanner();
  showScreen('meal-planner');
}

// Resol el nom visible d'una recepta assignada. Si l'id és null o la
// recepta ja no existeix (custom esborrada, etc.) → null.
function _mpRecipeName(recipeId) {
  if (!recipeId || typeof getRecipe !== 'function') return null;
  const r = getRecipe(recipeId);
  return r ? r.name : null;
}

function renderMealPlanner() {
  const host = document.getElementById('meal-planner-list');
  if (!host) return;
  const plan = loadMealPlan();

  host.innerHTML = MEAL_PLAN_DAYS.map(d => {
    const rows = MEAL_PLAN_SLOTS.map(s => {
      const recipeId = plan[d.id][s.id];
      const name = _mpRecipeName(recipeId);
      const assigned = !!name;
      const valueHtml = assigned
        ? '<span class="mp-slot-recipe">' + escapeHtml(name) + '</span>'
          + '<button type="button" class="mp-slot-clear" data-mp-clear="1" data-day="' + d.id + '" data-slot="' + s.id + '" aria-label="Treure">×</button>'
        : '<span class="mp-slot-empty">— Assignar</span>';
      return '<div class="mp-slot-row' + (assigned ? ' is-assigned' : '') + '" data-day="' + d.id + '" data-slot="' + s.id + '">'
        + '<span class="mp-slot-emoji">' + s.emoji + '</span>'
        + '<span class="mp-slot-label">' + s.label + '</span>'
        + valueHtml
        + '</div>';
    }).join('');
    return '<div class="mp-day-card">'
      + '<h3 class="mp-day-title">' + d.label + '</h3>'
      + rows
      + '</div>';
  }).join('');
}

// Modal de selecció de recepta (patró modal-overlay/modal-content de
// showIngredientPicker). Llista completa de getAllRecipes() amb cerca per nom.
function openRecipeSelector(day, slot) {
  const recipes = (typeof getAllRecipes === 'function') ? (getAllRecipes() || []) : [];
  const slotMeta = MEAL_PLAN_SLOTS.find(s => s.id === slot);
  const slotLabel = slotMeta ? (slotMeta.emoji + ' ' + slotMeta.label) : slot;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const listHtml = recipes.map(r =>
    '<button type="button" class="mp-recipe-option" data-recipe-id="' + escapeHtml(r.id) + '">'
    + '<span class="mp-recipe-option-emoji">' + (r.emoji || '🍽️') + '</span>'
    + '<span class="mp-recipe-option-name">' + escapeHtml(r.name || '') + '</span>'
    + '</button>'
  ).join('');

  overlay.innerHTML =
    '<div class="modal-content mp-recipe-modal">'
    + '<p class="modal-title">' + escapeHtml(slotLabel) + '</p>'
    + '<input type="search" class="modal-input" id="mp-recipe-search" placeholder="Cerca una recepta…" autocomplete="off">'
    + '<div class="mp-recipe-list" id="mp-recipe-list">' + listHtml + '</div>'
    + '<button class="secondary-btn" id="mp-recipe-cancel">' + (typeof t === 'function' ? t('cancel') : 'Cancel·la') + '</button>'
    + '</div>';
  document.body.appendChild(overlay);

  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };

  const searchInput = overlay.querySelector('#mp-recipe-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = (typeof normalizeForSearch === 'function')
        ? normalizeForSearch(searchInput.value)
        : String(searchInput.value || '').toLowerCase().trim();
      overlay.querySelectorAll('.mp-recipe-option').forEach(btn => {
        const nameEl = btn.querySelector('.mp-recipe-option-name');
        const name = (typeof normalizeForSearch === 'function')
          ? normalizeForSearch(nameEl ? nameEl.textContent : '')
          : String(nameEl ? nameEl.textContent : '').toLowerCase();
        btn.style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
      });
    });
  }

  overlay.querySelectorAll('.mp-recipe-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.recipeId;
      if (!id) return;
      const plan = loadMealPlan();
      if (plan[day]) plan[day][slot] = id;
      saveMealPlan(plan);
      close();
      renderMealPlanner();
    });
  });

  overlay.querySelector('#mp-recipe-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function _mpClearSlot(day, slot) {
  const plan = loadMealPlan();
  if (plan[day]) plan[day][slot] = null;
  saveMealPlan(plan);
  renderMealPlanner();
}

// Listeners idempotents: entrada des de CookMe + delegació de clic als slots.
(function _attachMealPlannerListeners() {
  if (typeof document === 'undefined') return;
  if (window.__mealPlannerListeners) return;
  window.__mealPlannerListeners = true;

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-open-meal-planner');
    if (btn) btn.addEventListener('click', openMealPlanner);
  });

  // Delegació: les files es repinten a cada renderMealPlanner.
  document.addEventListener('click', (e) => {
    if (!e.target || !e.target.closest) return;
    const host = document.getElementById('meal-planner-list');
    if (!host || !host.contains(e.target)) return;
    // ✕ (treure) primer — viu dins de la fila.
    const clearBtn = e.target.closest('[data-mp-clear]');
    if (clearBtn) {
      e.stopPropagation();
      _mpClearSlot(clearBtn.dataset.day, clearBtn.dataset.slot);
      return;
    }
    const row = e.target.closest('.mp-slot-row');
    if (row && row.dataset.day && row.dataset.slot) {
      openRecipeSelector(row.dataset.day, row.dataset.slot);
    }
  });
})();
