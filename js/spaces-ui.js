/* ============================================
   Buyte — js/spaces-ui.js
   UI del sistema d'Espais (FASE 2).

   - Pinta el selector d'Espai actiu a la home (.space-bar).
   - Pantalla #screen-spaces ("Els meus espais"): llista, renombrar,
     esborrar.
   - Botons "Crear nou espai" / "Unir-me a un existent" mostren toast
     "Disponible properament" — la lògica de creació + Firebase ve a
     la FASE 3. El canvi d'espai (switch) ve a la FASE 4.

   Tota la mutació de dades viu a window.SpacesSystem (js/spaces.js).
   ============================================ */


// Renderitza la pill de l'Espai actiu al header de la home.
function renderSpaceSelectorBar() {
  const SS = window.SpacesSystem;
  const iconEl = document.getElementById('space-selector-icon');
  const nameEl = document.getElementById('space-selector-name');
  if (!iconEl || !nameEl) return;
  const active = SS && SS.getActiveSpace();
  if (!active) {
    iconEl.textContent = '📍';
    nameEl.textContent = '—';
    return;
  }
  iconEl.textContent = active.icon || '🏠';
  nameEl.textContent = active.name || 'Espai';
}


function openSpacesScreen() {
  renderSpacesList();
  showScreen('spaces');
}


// Pinta la llista d'Espais a #spaces-list. Cada fila té icona + nom +
// (codi de sync si en té) + botons renombrar/esborrar. L'espai actiu
// queda destacat.
function renderSpacesList() {
  const list = document.getElementById('spaces-list');
  if (!list) return;
  const SS = window.SpacesSystem;
  if (!SS) { list.innerHTML = ''; return; }
  const spaces = SS.getSpaces();
  const activeId = SS.getActiveSpaceId();
  const onlyOne = spaces.length <= 1;
  list.innerHTML = '';
  spaces.forEach(space => {
    const isActive = space.id === activeId;
    const row = document.createElement('div');
    row.className = 'space-row' + (isActive ? ' is-active' : '');
    row.dataset.spaceId = space.id;
    const codeText = space.syncCode ? space.syncCode : t('spacesNoCode');
    // Per a Phase 2 deshabilitem esborrar:
    //   - Si és l'únic espai (l'usuari ha de tenir sempre almenys un)
    //   - Si és l'actiu (el switch ve a Phase 4; sense switch, esborrar
    //     l'actiu deixa l'app sense espai actiu)
    const cantDelete = onlyOne || isActive;
    const deleteTitle = onlyOne ? t('spacesDeleteLastWarn')
      : isActive ? t('spacesDeleteActiveWarn') : t('spacesDeleteTitle');
    row.innerHTML =
      '<div class="space-row-icon">' + escapeHtml(space.icon || '🏠') + '</div>' +
      '<div class="space-row-info">' +
        '<p class="space-row-name">' + escapeHtml(space.name || '') +
          (isActive ? ' <span class="space-active-tag">' + escapeHtml(t('spacesActiveBadge')) + '</span>' : '') +
        '</p>' +
        '<p class="space-row-code">' + escapeHtml(codeText) + '</p>' +
      '</div>' +
      '<div class="space-row-actions">' +
        '<button type="button" class="space-rename-btn" data-action="rename" aria-label="' + escapeHtml(t('spacesRenameTitle')) + '">✏️</button>' +
        '<button type="button" class="space-delete-btn" data-action="delete" aria-label="' + escapeHtml(deleteTitle) + '" title="' + escapeHtml(deleteTitle) + '"' + (cantDelete ? ' disabled' : '') + '>🗑️</button>' +
      '</div>';
    list.appendChild(row);
  });
}


// Modal de renombrar amb camp de text. Construïm-lo a mà perquè els
// helpers existents (showConfirmModal, showConfirmDangerModal) no
// suporten input. Mateix llenguatge visual que els altres modals.
function _showRenameSpaceModal(spaceId) {
  const SS = window.SpacesSystem;
  if (!SS) return;
  const space = SS.getSpaceById(spaceId);
  if (!space) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-content">' +
      '<div class="modal-emoji-big">✏️</div>' +
      '<p class="modal-title">' + escapeHtml(t('spacesRenameTitle')) + '</p>' +
      '<input type="text" class="space-rename-input" id="space-rename-input" maxlength="40" value="' + escapeHtml(space.name || '') + '" placeholder="' + escapeHtml(t('spacesRenamePlaceholder')) + '">' +
      '<div class="modal-buttons">' +
        '<button class="modal-cancel" id="space-rename-cancel">' + escapeHtml(t('cancel')) + '</button>' +
        '<button class="modal-confirm" id="space-rename-save">' + escapeHtml(t('spacesRenameSave')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#space-rename-input');
  setTimeout(() => { input && input.focus(); input && input.select(); }, 50);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#space-rename-cancel').addEventListener('click', close);
  const save = () => {
    const v = (input.value || '').trim();
    if (!v) return;
    SS.renameSpace(spaceId, v);
    close();
    renderSpacesList();
    renderSpaceSelectorBar();
  };
  overlay.querySelector('#space-rename-save').addEventListener('click', save);
  input && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}


function _confirmDeleteSpace(spaceId) {
  const SS = window.SpacesSystem;
  if (!SS) return;
  const space = SS.getSpaceById(spaceId);
  if (!space) return;
  showConfirmDangerModal(
    '🗑️',
    t('spacesDeleteTitle'),
    t('spacesDeleteConfirm', space.name || ''),
    () => {
      SS.deleteSpace(spaceId);
      showToast(t('deleted'));
      renderSpacesList();
    }
  );
}


// Delegate per als clicks dins de #spaces-list (rename / delete /
// activar). Atach un sol cop al document — sobreviu a renders.
function _onSpacesListClick(e) {
  const list = document.getElementById('spaces-list');
  if (!list || !e.target.closest) return;
  if (!list.contains(e.target)) return;
  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn) {
    const row = actionBtn.closest('.space-row');
    const id = row && row.dataset.spaceId;
    if (!id) return;
    if (actionBtn.dataset.action === 'rename') _showRenameSpaceModal(id);
    else if (actionBtn.dataset.action === 'delete') {
      if (actionBtn.disabled) return;
      _confirmDeleteSpace(id);
    }
    return;
  }
  // Click a la fila d'un espai NO actiu: en FASE 4 farà switch. Per
  // ara mostrem un toast informatiu perquè l'usuari sàpiga que el
  // selector visual funciona, però el canvi de dades encara no.
  const row = e.target.closest('.space-row');
  if (row && !row.classList.contains('is-active')) {
    showToast(t('spacesPhase4Soon'));
  }
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', _onSpacesListClick);
}


// Botons "Crear" / "Unir-me" del peu de la pantalla — Phase 3.
function _onSpacesCreateClick() { showToast(t('spacesPhase3Soon')); }
function _onSpacesJoinClick()   { showToast(t('spacesPhase3Soon')); }


// Wire dels botons (es crida una vegada des d'app.js al boot, com
// la resta d'attach* del mòdul Settings).
function attachSpacesScreenListeners() {
  const sel = document.getElementById('btn-space-selector');
  if (sel) sel.addEventListener('click', openSpacesScreen);
  const c = document.getElementById('btn-create-space');
  if (c) c.addEventListener('click', _onSpacesCreateClick);
  const j = document.getElementById('btn-join-space');
  if (j) j.addEventListener('click', _onSpacesJoinClick);
}


window.SpacesUI = {
  renderSpaceSelectorBar,
  renderSpacesList,
  openSpacesScreen,
  attachSpacesScreenListeners
};
