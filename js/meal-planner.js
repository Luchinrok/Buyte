/* ============================================
   Buyte — js/meal-planner.js
   Planificador setmanal de receptes (dins de CookMe).

   Setmanes REALS amb navegació ‹ / ›. El pla s'indexa pel dilluns de
   cada setmana (weekId = "YYYY-MM-DD"):
     localStorage['eatmefirst_meal_plan'] =
       { "2026-06-15": { mon:{esmorzar,dinar,sopar}, … sun:{…} }, … }
   Es sincronitza via settings.js (objecte → push/apply ja funcionen).

   Migració: si el pla desat té forma PLANA antiga (claus de dia a
   l'arrel), s'embolcalla sota el weekId de la setmana en curs.
   ============================================ */

const MEAL_PLAN_KEY = 'eatmefirst_meal_plan';
// Rastre de "compra ja generada" per setmana: { weekId: true }. Escrit en
// confirmar la generació (vegeu opts.onAdded a showIngredientPicker) i
// sincronitzat (settings.js, patró mealPlan). El consumeix el recordatori
// weeklyPlanReminder (smart-notifications.js).
const MEAL_PLAN_SHOPPING_DONE_KEY = 'eatmefirst_mealplan_shopping_done';

// Ordre i etiquetes dels dies (Dilluns-first).
const MEAL_PLAN_DAYS = [
  { id: 'mon', key: 'mpDayMon' },
  { id: 'tue', key: 'mpDayTue' },
  { id: 'wed', key: 'mpDayWed' },
  { id: 'thu', key: 'mpDayThu' },
  { id: 'fri', key: 'mpDayFri' },
  { id: 'sat', key: 'mpDaySat' },
  { id: 'sun', key: 'mpDaySun' }
];

const MEAL_PLAN_SLOTS = [
  { id: 'esmorzar', key: 'mpSlotEsmorzar', emoji: '🌅' },
  { id: 'dinar', key: 'mpSlotDinar', emoji: '🍽️' },
  { id: 'sopar', key: 'mpSlotSopar', emoji: '🌙' }
];

// Els noms de mes viuen a t('mealPlanMonths') (array); es resolen al render.

// Setmana actualment visualitzada (weekId del dilluns). Es fixa a la
// setmana en curs en obrir el planificador.
let _mpViewedWeekId = null;

// ---- Helpers de data (local, sense desfasament UTC) ----
function _mpLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function _mpParseYMD(ymd) {
  const parts = String(ymd || '').split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}
// Dilluns de la setmana que conté `date` (setmana comença dilluns).
function _mpMondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Diu … 6=Dis
  const diff = (day === 0) ? -6 : (1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}
function _mpCurrentWeekId() {
  return _mpLocalYMD(_mpMondayOf(new Date()));
}
// weekId (dilluns) de la setmana VINENT.
function mpNextWeekId() {
  const m = _mpParseYMD(_mpCurrentWeekId());
  m.setDate(m.getDate() + 7);
  return _mpLocalYMD(m);
}

// ---- Estat "compra generada" per setmana ----
function _mpReadShoppingDone() {
  try {
    const raw = localStorage.getItem(MEAL_PLAN_SHOPPING_DONE_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
  } catch (e) { return {}; }
}
function mpIsShoppingDone(weekId) {
  if (!weekId) return false;
  return !!_mpReadShoppingDone()[weekId];
}
function mpMarkShoppingDone(weekId) {
  if (!weekId) return;
  const o = _mpReadShoppingDone();
  o[weekId] = true;
  try { localStorage.setItem(MEAL_PLAN_SHOPPING_DONE_KEY, JSON.stringify(o)); } catch (e) {}
  if (typeof pushToServer === 'function') pushToServer();
}

// True si la setmana indicada té ≥1 recepta assignada en algun slot.
function mpWeekHasPlan(weekId) {
  if (!weekId) return false;
  const wk = loadMealPlan()[weekId];
  if (!wk) return false;
  return MEAL_PLAN_DAYS.some(d => MEAL_PLAN_SLOTS.some(s => wk[d.id] && wk[d.id][s.id]));
}

// ---- Model ----
function _mpEmptyWeek() {
  const w = {};
  MEAL_PLAN_DAYS.forEach(d => {
    w[d.id] = {};
    MEAL_PLAN_SLOTS.forEach(s => { w[d.id][s.id] = null; });
  });
  return w;
}
function _mpNormalizeWeek(weekObj) {
  const src = (weekObj && typeof weekObj === 'object' && !Array.isArray(weekObj)) ? weekObj : {};
  const out = {};
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

// Fusió de dos plans per setmana→dia→slot (last-writer-wins per slot: el
// remot guanya si té valor, si no es manté el local). Evita que un snapshot
// ranci del sync esborri slots germans assignats localment (vegeu
// onRemoteData a settings.js). NO propaga esborrats de slot cross-device
// (sense valor a cap banda → null); és el trade-off acceptat sense tombstone.
function _mpMergePlans(localPlan, remotePlan) {
  const lp = (localPlan && typeof localPlan === 'object' && !Array.isArray(localPlan)) ? localPlan : {};
  const rp = (remotePlan && typeof remotePlan === 'object' && !Array.isArray(remotePlan)) ? remotePlan : {};
  const weeks = new Set([...Object.keys(lp), ...Object.keys(rp)]);
  const out = {};
  weeks.forEach(w => {
    const lw = _mpNormalizeWeek(lp[w]);
    const rw = _mpNormalizeWeek(rp[w]);
    out[w] = {};
    MEAL_PLAN_DAYS.forEach(d => {
      out[w][d.id] = {};
      MEAL_PLAN_SLOTS.forEach(s => {
        out[w][d.id][s.id] = rw[d.id][s.id] || lw[d.id][s.id] || null;
      });
    });
  });
  return out;
}

// Retorna el pla complet { weekId: week } normalitzat. Migra la forma
// plana antiga (claus de dia a l'arrel) sota el weekId de la setmana en curs.
function loadMealPlan() {
  let parsed = {};
  try {
    const raw = localStorage.getItem(MEAL_PLAN_KEY);
    if (raw) parsed = JSON.parse(raw) || {};
  } catch (e) { parsed = {}; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};

  // Forma plana antiga: alguna clau de dia ('mon'…'sun') a l'arrel.
  const looksFlat = MEAL_PLAN_DAYS.some(d => parsed[d.id] && typeof parsed[d.id] === 'object');
  if (looksFlat) {
    parsed = { [_mpCurrentWeekId()]: parsed };
  }

  const out = {};
  Object.keys(parsed).forEach(weekId => {
    out[weekId] = _mpNormalizeWeek(parsed[weekId]);
  });
  return out;
}

function saveMealPlan(plan) {
  const norm = {};
  if (plan && typeof plan === 'object') {
    Object.keys(plan).forEach(weekId => { norm[weekId] = _mpNormalizeWeek(plan[weekId]); });
  }
  try { localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(norm)); } catch (e) {}
  if (typeof pushToServer === 'function') pushToServer();
  return norm;
}

// Assigna/treu una recepta a la setmana VISUALITZADA.
function _mpSetSlot(day, slot, recipeId) {
  const plan = loadMealPlan();
  if (!plan[_mpViewedWeekId]) plan[_mpViewedWeekId] = _mpEmptyWeek();
  if (plan[_mpViewedWeekId][day]) plan[_mpViewedWeekId][day][slot] = recipeId;
  saveMealPlan(plan);
}

// ---- Navegació ----
function _mpGoWeek(delta) {
  const monday = _mpParseYMD(_mpViewedWeekId || _mpCurrentWeekId());
  monday.setDate(monday.getDate() + delta * 7);
  _mpViewedWeekId = _mpLocalYMD(monday);
  renderMealPlanner();
}

// Etiqueta de la setmana: rang de dates + paraula relativa (si escau).
function _mpWeekHeaderLabel(weekId) {
  const monday = _mpParseYMD(weekId);
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
  let range;
  const _months = t('mealPlanMonths');
  if (monday.getMonth() === sunday.getMonth()) {
    range = monday.getDate() + '–' + sunday.getDate() + ' de ' + _months[monday.getMonth()];
  } else {
    range = monday.getDate() + ' ' + _months[monday.getMonth()]
      + ' – ' + sunday.getDate() + ' ' + _months[sunday.getMonth()];
  }
  const curMonday = _mpParseYMD(_mpCurrentWeekId());
  const diffWeeks = Math.round((monday.getTime() - curMonday.getTime()) / (7 * 86400000));
  let rel = '';
  if (diffWeeks === 0) rel = t('thisWeek');
  else if (diffWeeks === 1) rel = t('mpWeekNext');
  else if (diffWeeks === -1) rel = t('mpWeekPrev');
  return { range, rel };
}

// weekId opcional: obre el planificador en una setmana concreta (p. ex. el
// recordatori weeklyPlanReminder obre la setmana vinent). Per defecte, l'actual.
function openMealPlanner(weekId) {
  // weekId només si és un string de data vàlid (YYYY-MM-DD). Si no (p. ex. el
  // listener de click passa l'Event com a 1r arg), cau a la setmana actual.
  const valid = (typeof weekId === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(weekId));
  _mpViewedWeekId = valid ? weekId : _mpCurrentWeekId();
  renderMealPlanner();
  showScreen('meal-planner');
}

function _mpRecipeName(recipeId) {
  if (!recipeId || typeof getRecipe !== 'function') return null;
  const r = getRecipe(recipeId);
  return r ? r.name : null;
}

function renderMealPlanner() {
  const host = document.getElementById('meal-planner-list');
  if (!host) return;
  if (!_mpViewedWeekId) _mpViewedWeekId = _mpCurrentWeekId();

  const plan = loadMealPlan();
  const week = plan[_mpViewedWeekId] || _mpEmptyWeek();
  const monday = _mpParseYMD(_mpViewedWeekId);
  const todayYMD = _mpLocalYMD(new Date());
  const head = _mpWeekHeaderLabel(_mpViewedWeekId);

  // Capçalera de setmana amb fletxes.
  const navHtml = '<div class="mp-week-nav">'
    + '<button type="button" class="mp-week-arrow" data-mp-week="prev" aria-label="' + escapeHtml(t('mpWeekPrevAria')) + '">‹</button>'
    + '<div class="mp-week-label">'
      + '<span class="mp-week-range">' + escapeHtml(head.range) + '</span>'
      + (head.rel ? '<span class="mp-week-rel">' + escapeHtml(head.rel) + '</span>' : '')
    + '</div>'
    + '<button type="button" class="mp-week-arrow" data-mp-week="next" aria-label="' + escapeHtml(t('mpWeekNextAria')) + '">›</button>'
    + '</div>';

  const daysHtml = MEAL_PLAN_DAYS.map((d, i) => {
    const dayDate = new Date(monday); dayDate.setDate(dayDate.getDate() + i);
    const isToday = _mpLocalYMD(dayDate) === todayYMD;
    const dayTitle = t(d.key) + ' ' + dayDate.getDate();
    const rows = MEAL_PLAN_SLOTS.map(s => {
      const recipeId = week[d.id][s.id];
      const name = _mpRecipeName(recipeId);
      const assigned = !!name;
      const valueHtml = assigned
        ? '<span class="mp-slot-recipe">' + escapeHtml(name) + '</span>'
          + '<button type="button" class="mp-slot-clear" data-mp-clear="1" data-day="' + d.id + '" data-slot="' + s.id + '" aria-label="' + escapeHtml(t('mpSlotClearAria')) + '">×</button>'
        : '<span class="mp-slot-empty">' + escapeHtml(t('mpAssign')) + '</span>';
      return '<div class="mp-slot-row' + (assigned ? ' is-assigned' : '') + '" data-day="' + d.id + '" data-slot="' + s.id + '">'
        + '<span class="mp-slot-emoji">' + s.emoji + '</span>'
        + '<span class="mp-slot-label">' + escapeHtml(t(s.key)) + '</span>'
        + valueHtml
        + '</div>';
    }).join('');
    return '<div class="mp-day-card' + (isToday ? ' is-today' : '') + '">'
      + '<h3 class="mp-day-title">' + dayTitle + '</h3>'
      + rows
      + '</div>';
  }).join('');

  host.innerHTML = navHtml + daysHtml;

  // Estat del botó "Generar llista": deshabilitat si la setmana visualitzada
  // no té cap recepta assignada.
  const genBtn = document.getElementById('btn-generate-shopping');
  if (genBtn) {
    let hasAny = false;
    MEAL_PLAN_DAYS.forEach(d => MEAL_PLAN_SLOTS.forEach(s => { if (week[d.id][s.id]) hasAny = true; }));
    genBtn.disabled = !hasAny;
    genBtn.classList.toggle('is-disabled', !hasAny);
  }
}

// Recull els ingredients required de les receptes assignades a la setmana
// VISUALITZADA, fusionats per clau canònica (base de cookmeSameProduct).
function _mpCollectPlanIngredients() {
  const plan = loadMealPlan();
  const week = plan[_mpViewedWeekId] || _mpEmptyWeek();
  const recipeIds = new Set();
  MEAL_PLAN_DAYS.forEach(d => MEAL_PLAN_SLOTS.forEach(s => {
    const id = week[d.id][s.id];
    if (id) recipeIds.add(id);
  }));
  const seen = new Set();
  const out = [];
  recipeIds.forEach(id => {
    const r = (typeof getRecipe === 'function') ? getRecipe(id) : null;
    if (!r || !Array.isArray(r.ingredients)) return;
    r.ingredients.filter(i => i && i.required).forEach(ing => {
      const key = (typeof cookmeCanonTokens === 'function')
        ? cookmeCanonTokens(ing.name).slice().sort().join(' ')
        : String(ing.name || '').toLowerCase().trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({ name: ing.name || '', emoji: ing.emoji || '🛒' });
    });
  });
  return out;
}

// "🛒 Generar llista de la compra" sobre la setmana visualitzada.
function _mpGenerateShoppingList() {
  const items = _mpCollectPlanIngredients();
  if (items.length === 0) {
    showToast(t('mpNoRecipesPlanned'));
    return;
  }
  const all = (typeof supermarkets !== 'undefined' && Array.isArray(supermarkets)) ? supermarkets : [];
  if (all.length === 0) {
    showToast(typeof t === 'function' ? t('noStoreConfigured') : 'No hi ha cap supermercat');
    return;
  }
  const enabled = all.filter(s => s.enabled !== false);
  const others = all.filter(s => s.enabled === false);
  if (typeof showIngredientPicker !== 'function') return;
  const weekId = _mpViewedWeekId;   // captura la setmana en el moment de generar
  showIngredientPicker(null, { enabled, others }, {
    ingredients: items,
    title: t('mpGenerateListN', items.length),
    skipRecipeCount: true,
    // En CONFIRMAR (afegit real al BuyMe), marquem la setmana com a generada
    // perquè el recordatori weeklyPlanReminder no la torni a demanar.
    onAdded: () => mpMarkShoppingDone(weekId)
  });
}

// Modal de selecció de recepta: llista completa de getAllRecipes() + cerca.
function openRecipeSelector(day, slot) {
  const recipes = (typeof getAllRecipes === 'function') ? (getAllRecipes() || []) : [];
  const slotMeta = MEAL_PLAN_SLOTS.find(s => s.id === slot);
  const slotLabel = slotMeta ? (slotMeta.emoji + ' ' + t(slotMeta.key)) : slot;

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
    + '<input type="search" class="modal-input" id="mp-recipe-search" placeholder="' + escapeHtml(t('mpRecipeSearchPlaceholder')) + '" autocomplete="off">'
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
      _mpSetSlot(day, slot, id);
      close();
      renderMealPlanner();
    });
  });

  overlay.querySelector('#mp-recipe-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function _mpClearSlot(day, slot) {
  _mpSetSlot(day, slot, null);
  renderMealPlanner();
}

// Listeners idempotents: entrada des de CookMe, botó generar, i delegació
// de clic (slots, ✕ i fletxes de setmana — tot es repinta a cada render).
(function _attachMealPlannerListeners() {
  if (typeof document === 'undefined') return;
  if (window.__mealPlannerListeners) return;
  window.__mealPlannerListeners = true;

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-open-meal-planner');
    if (btn) btn.addEventListener('click', openMealPlanner);
    const genBtn = document.getElementById('btn-generate-shopping');
    if (genBtn) genBtn.addEventListener('click', _mpGenerateShoppingList);
  });

  document.addEventListener('click', (e) => {
    if (!e.target || !e.target.closest) return;
    const host = document.getElementById('meal-planner-list');
    if (!host || !host.contains(e.target)) return;
    // Fletxes de navegació de setmana.
    const weekBtn = e.target.closest('[data-mp-week]');
    if (weekBtn) {
      _mpGoWeek(weekBtn.dataset.mpWeek === 'next' ? 1 : -1);
      return;
    }
    // ✕ (treure) — viu dins de la fila.
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
