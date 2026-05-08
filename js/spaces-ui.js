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


// ----- Helpers de portaretalls / share (genèrics, exposats globals)
//
// copyTextToClipboard(text): true en èxit. Prova navigator.clipboard
// (només funciona en context segur — https o localhost) i fallback a
// document.execCommand('copy') sobre un textarea volàtil.
//
// shareSyncCode(code, spaceName): obre el share-sheet natiu si està
// disponible (mòbils i Edge/Chrome desktop modernes). Si l'usuari
// cancel·la, no fa res. Si no hi ha share API, fa fallback a copiar
// el codi al portaretalls.
async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    console.warn('[copy] error', e);
    return false;
  }
}

async function shareSyncCode(code, spaceName) {
  if (!code) return false;
  const message = (typeof t === 'function')
    ? t('spacesShareMessage', spaceName || '', code)
    : (spaceName || '') + ': ' + code;
  if (navigator.share) {
    try {
      await navigator.share({
        title: (typeof t === 'function') ? t('spacesShareTitle') : 'Buyte',
        text: message
      });
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
      // Fallback: si share() falla per un motiu diferent, intentem copiar.
    }
  }
  const ok = await copyTextToClipboard(code);
  if (ok && typeof showToast === 'function') showToast('📋 ' + t('codeCopied'));
  return ok;
}

window.copyTextToClipboard = copyTextToClipboard;
window.shareSyncCode = shareSyncCode;


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
    // Botons de codi (copiar + compartir) només si l'Espai en té un.
    // El share-button només si el navegador té navigator.share (mòbils
    // i Edge/Chrome desktop modernes).
    let codeBtnsHtml = '';
    if (space.syncCode) {
      codeBtnsHtml += '<button type="button" class="space-copy-btn" data-action="copy" data-code="' + escapeHtml(space.syncCode) + '" aria-label="' + escapeHtml(t('spacesCopyTooltip')) + '" title="' + escapeHtml(t('spacesCopyTooltip')) + '">📋</button>';
      if (typeof navigator !== 'undefined' && navigator.share) {
        codeBtnsHtml += '<button type="button" class="space-share-btn" data-action="share" data-code="' + escapeHtml(space.syncCode) + '" data-space-name="' + escapeHtml(space.name || '') + '" aria-label="' + escapeHtml(t('spacesShareTooltip')) + '" title="' + escapeHtml(t('spacesShareTooltip')) + '">🔗</button>';
      }
    }
    row.innerHTML =
      '<div class="space-row-icon">' + escapeHtml(space.icon || '🏠') + '</div>' +
      '<div class="space-row-info">' +
        '<p class="space-row-name">' + escapeHtml(space.name || '') +
          (isActive ? ' <span class="space-active-tag">' + escapeHtml(t('spacesActiveBadge')) + '</span>' : '') +
        '</p>' +
        '<p class="space-row-code">' + escapeHtml(codeText) + '</p>' +
      '</div>' +
      '<div class="space-row-actions">' +
        codeBtnsHtml +
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
    const action = actionBtn.dataset.action;
    if (action === 'copy') {
      const code = actionBtn.dataset.code;
      copyTextToClipboard(code).then(ok => {
        if (ok) showToast('📋 ' + t('codeCopied'));
        else showToast(t('spacesCodeCopyError'));
      });
      return;
    }
    if (action === 'share') {
      const code = actionBtn.dataset.code;
      const sname = actionBtn.dataset.spaceName || '';
      shareSyncCode(code, sname);
      return;
    }
    if (!id) return;
    if (action === 'rename') _showRenameSpaceModal(id);
    else if (action === 'delete') {
      if (actionBtn.disabled) return;
      _confirmDeleteSpace(id);
    }
    return;
  }
  // Click a la fila d'un Espai NO actiu → confirmació + switch.
  // (FASE 4 — el switch real, amb backup, clear i reload.)
  const row = e.target.closest('.space-row');
  if (row && !row.classList.contains('is-active')) {
    const id = row.dataset.spaceId;
    if (id) _confirmSwitchToSpace(id);
  }
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', _onSpacesListClick);
}


// ----- Moure UN producte EatMe a un altre Espai (FASE A) -----
//
// El botó #btn-move-product viu al detall del producte. La seva
// visibilitat depèn de si hi ha algun altre Espai amb syncCode al
// SpacesSystem; openProduct (js/biteme.js) crida _refreshMoveProductBtn
// cada vegada que pinta el detall.
//
// L'operació de moure és transaccional en el sentit pràctic: PRIMER
// escrivim al Firebase del destí, i NOMÉS si això té èxit esborrem el
// producte de l'origen. Si falla a meitat, l'usuari té el producte
// als 2 llocs (un duplicat és preferible a perdre dades).
function _refreshMoveProductBtn() {
  const btn = document.getElementById('btn-move-product');
  if (!btn) return;
  const SS = window.SpacesSystem;
  const targets = SS && typeof SS.getAvailableSpacesForMove === 'function'
    ? SS.getAvailableSpacesForMove()
    : [];
  // Amaguem el botó si no hi ha cap destí. Així evitem mostrar una
  // acció que sempre seria un dead-end ("no hi ha cap espai").
  btn.style.display = targets.length > 0 ? 'flex' : 'none';
}
window.refreshMoveProductBtn = _refreshMoveProductBtn;

function _showMoveProductModal(product) {
  if (!product) return;
  const SS = window.SpacesSystem;
  if (!SS || !window.FBSync) {
    showToast(t('syncErrorOffline'));
    return;
  }
  const targets = SS.getAvailableSpacesForMove();
  if (targets.length === 0) {
    showToast(t('moveProductNoSpaces'));
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const optionsHtml = targets.map(s =>
    '<button type="button" class="space-option" data-space-id="' + escapeHtml(s.id) + '">' +
      '<span class="space-option-icon">' + escapeHtml(s.icon || '🏠') + '</span>' +
      '<span class="space-option-name">' + escapeHtml(s.name || '') + '</span>' +
      '<span class="space-option-arrow">›</span>' +
    '</button>'
  ).join('');
  overlay.innerHTML =
    '<div class="modal-content space-modal-content">' +
      '<div class="modal-emoji-big">📦</div>' +
      '<p class="modal-title">' + escapeHtml(t('moveProductTitle')) + '</p>' +
      '<p class="modal-sub">' + escapeHtml(t('moveProductIntro', (product.emoji || '') + ' ' + (product.name || ''))) + '</p>' +
      '<div class="space-options">' + optionsHtml + '</div>' +
      '<div class="info-banner banner-info" style="margin-top: 12px;">' +
        '<div class="info-banner-icon">ℹ️</div>' +
        '<div class="info-banner-content"><p>' + escapeHtml(t('moveProductInfo')) + '</p></div>' +
      '</div>' +
      '<div class="modal-buttons">' +
        '<button class="modal-cancel" id="move-product-cancel">' + escapeHtml(t('cancel')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#move-product-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelectorAll('.space-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.spaceId;
      const target = targets.find(s => s.id === id);
      if (!target) return;
      close();
      _executeMoveProduct(product, target);
    });
  });
}

async function _executeMoveProduct(product, targetSpace) {
  if (!product || !targetSpace || !targetSpace.syncCode) return;
  // Reutilitzem el mateix overlay que el switch — passem text custom
  // perquè digui "Movent producte…" en lloc de "Canviant a …".
  _showSwitchingOverlay({ icon: '📦' }, t('moveProductInProgress'));
  try {
    const ok = await window.FBSync.init();
    if (!ok) throw new Error('Firebase init failed');

    // 1) Llegim els productes actuals del destí
    const existing = await window.FBSync.readListData(targetSpace.syncCode, 'products');
    const targetList = Array.isArray(existing) ? existing.slice() : [];

    // 2) Construïm la còpia que afegim al destí. Mantenim TOTS els
    //    camps del producte (caducitat, zona, qty, emoji, frozenDate,
    //    consumedPercent, etc.) — només refrescem l'id per evitar
    //    col·lisions amb un producte ja existent al destí.
    const moved = Object.assign({}, product, {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    });
    targetList.push(moved);

    // 3) Escrivim al destí. Si això llança, sortim sense tocar res
    //    més — el producte segueix sencer a l'Espai actual.
    await window.FBSync.writeListData(targetSpace.syncCode, 'products', targetList);

    // 4) Esborrem de l'Espai actual: actualitzem la variable global
    //    `products` (a js/biteme.js) i invoquem saveData() — això
    //    persisteix a localStorage i empeny a Firebase via pushToServer.
    if (typeof products !== 'undefined' && Array.isArray(products)) {
      products = products.filter(p => p.id !== product.id);
      if (typeof saveData === 'function') saveData();
    } else {
      // Fallback defensiu si la variable global no és accessible.
      try {
        const local = JSON.parse(localStorage.getItem('eatmefirst_products') || '[]');
        const filtered = local.filter(p => p.id !== product.id);
        localStorage.setItem('eatmefirst_products', JSON.stringify(filtered));
      } catch (e) {}
    }

    // 5) Tanquem currentProduct + tornem on érem (Section / List /
    //    View All / Alerts) com fan les altres accions del producte
    //    (consumed/trashed/deleted via navigateAfterAction).
    if (typeof currentProduct !== 'undefined') currentProduct = null;
    _hideSwitchingOverlay();
    showToast(t('moveProductDone', product.name || '', (targetSpace.icon || '') + ' ' + (targetSpace.name || '')));
    if (typeof navigateAfterAction === 'function') navigateAfterAction();
    else if (typeof renderHome === 'function') { renderHome(); showScreen('launcher'); }
  } catch (e) {
    _hideSwitchingOverlay();
    console.error('[Move] error:', e);
    showToast(t('moveProductError'));
  }
}

function _hideSwitchingOverlay() {
  const ov = document.getElementById('space-switching-overlay');
  if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
}


// ----- Moure MÚLTIPLES productes EatMe a un altre Espai (Fase C) -----
//
// Es dispara des de la toolbar de selecció múltiple (#levels-selection-toolbar)
// quan l'usuari té N productes seleccionats i prem "📦 Moure". El flux
// és el mateix que el single-move però amb una sola lectura/escriptura
// al destí (transacció millor que N escriptures separades).
function _showMoveMultipleProductsModal(items) {
  if (!items || !items.length) return;
  const SS = window.SpacesSystem;
  if (!SS || !window.FBSync) {
    showToast(t('syncErrorOffline'));
    return;
  }
  const targets = SS.getAvailableSpacesForMove();
  if (targets.length === 0) {
    showToast(t('moveProductNoSpaces'));
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  // Preview dels primers 5 items + "+N" si n'hi ha més.
  const previewItems = items.slice(0, 5).map(p =>
    (p.emoji || '') + ' ' + escapeHtml(p.name || '')
  ).join(', ');
  const more = items.length > 5 ? ' +' + (items.length - 5) : '';
  const optionsHtml = targets.map(s =>
    '<button type="button" class="space-option" data-space-id="' + escapeHtml(s.id) + '">' +
      '<span class="space-option-icon">' + escapeHtml(s.icon || '🏠') + '</span>' +
      '<span class="space-option-name">' + escapeHtml(s.name || '') + '</span>' +
      '<span class="space-option-arrow">›</span>' +
    '</button>'
  ).join('');
  overlay.innerHTML =
    '<div class="modal-content space-modal-content">' +
      '<div class="modal-emoji-big">📦</div>' +
      '<p class="modal-title">' + escapeHtml(t('moveMultipleTitle')) + '</p>' +
      '<p class="modal-sub">' + escapeHtml(t('moveMultipleIntro', items.length)) + '</p>' +
      '<p class="move-multi-preview">' + previewItems + escapeHtml(more) + '</p>' +
      '<div class="space-options">' + optionsHtml + '</div>' +
      '<div class="info-banner banner-info" style="margin-top: 12px;">' +
        '<div class="info-banner-icon">ℹ️</div>' +
        '<div class="info-banner-content"><p>' + escapeHtml(t('moveMultipleInfo')) + '</p></div>' +
      '</div>' +
      '<div class="modal-buttons">' +
        '<button class="modal-cancel" id="move-multi-cancel">' + escapeHtml(t('cancel')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#move-multi-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelectorAll('.space-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.spaceId;
      const target = targets.find(s => s.id === id);
      if (!target) return;
      close();
      _executeMoveMultipleProducts(items, target);
    });
  });
}

// ----- Moure MÚLTIPLES items BuyMe a un altre Espai (Fase C-2) -----
// Mateix patró que _showMoveMultipleProductsModal però sobre items
// de la llista de la compra. El cloud field és 'shoppingItems'.
function _showMoveMultipleShoppingItemsModal(items) {
  if (!items || !items.length) return;
  const SS = window.SpacesSystem;
  if (!SS || !window.FBSync) {
    showToast(t('syncErrorOffline'));
    return;
  }
  const targets = SS.getAvailableSpacesForMove();
  if (targets.length === 0) {
    showToast(t('moveProductNoSpaces'));
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const previewItems = items.slice(0, 5).map(p =>
    (p.emoji || '') + ' ' + escapeHtml(p.name || '')
  ).join(', ');
  const more = items.length > 5 ? ' +' + (items.length - 5) : '';
  const optionsHtml = targets.map(s =>
    '<button type="button" class="space-option" data-space-id="' + escapeHtml(s.id) + '">' +
      '<span class="space-option-icon">' + escapeHtml(s.icon || '🏠') + '</span>' +
      '<span class="space-option-name">' + escapeHtml(s.name || '') + '</span>' +
      '<span class="space-option-arrow">›</span>' +
    '</button>'
  ).join('');
  overlay.innerHTML =
    '<div class="modal-content space-modal-content">' +
      '<div class="modal-emoji-big">📦</div>' +
      '<p class="modal-title">' + escapeHtml(t('moveShoppingMultipleTitle')) + '</p>' +
      '<p class="modal-sub">' + escapeHtml(t('moveShoppingMultipleIntro', items.length)) + '</p>' +
      '<p class="move-multi-preview">' + previewItems + escapeHtml(more) + '</p>' +
      '<div class="space-options">' + optionsHtml + '</div>' +
      '<div class="info-banner banner-info" style="margin-top: 12px;">' +
        '<div class="info-banner-icon">ℹ️</div>' +
        '<div class="info-banner-content"><p>' + escapeHtml(t('moveShoppingMultipleInfo')) + '</p></div>' +
      '</div>' +
      '<div class="modal-buttons">' +
        '<button class="modal-cancel" id="move-shop-multi-cancel">' + escapeHtml(t('cancel')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#move-shop-multi-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelectorAll('.space-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.spaceId;
      const target = targets.find(s => s.id === id);
      if (!target) return;
      close();
      _executeMoveMultipleShoppingItems(items, target);
    });
  });
}

async function _executeMoveMultipleShoppingItems(items, targetSpace) {
  if (!items || !items.length || !targetSpace || !targetSpace.syncCode) return;
  _showSwitchingOverlay({ icon: '📦' }, t('moveShoppingMultipleInProgress', items.length));
  try {
    const ok = await window.FBSync.init();
    if (!ok) throw new Error('Firebase init failed');
    // El camp del cloud és 'shoppingItems' (camelCase) — no 'shopping'.
    const existing = await window.FBSync.readListData(targetSpace.syncCode, 'shoppingItems');
    const targetList = Array.isArray(existing) ? existing.slice() : [];
    const baseTs = Date.now();
    items.forEach((it, idx) => {
      targetList.push(Object.assign({}, it, {
        id: 's_' + baseTs + '_' + idx + '_' + Math.random().toString(36).slice(2, 5)
      }));
    });
    await window.FBSync.writeListData(targetSpace.syncCode, 'shoppingItems', targetList);
    if (typeof shoppingItems !== 'undefined' && Array.isArray(shoppingItems)) {
      const ids = new Set(items.map(it => it.id));
      shoppingItems = shoppingItems.filter(it => !ids.has(it.id));
      if (typeof saveShoppingData === 'function') saveShoppingData();
    }
    if (window.ShoppingSelection && typeof window.ShoppingSelection.exit === 'function') {
      window.ShoppingSelection.exit();
    }
    // Re-render de la pantalla del super: openSupermarket reaplica el
    // render dels items del super actiu. Mateix patró que deleteShoppingItem.
    if (typeof openSupermarket === 'function' && typeof currentSupermarketId !== 'undefined') {
      openSupermarket(currentSupermarketId, { preserveMode: true });
    }
    _hideSwitchingOverlay();
    showToast(t('moveShoppingMultipleDone', items.length, (targetSpace.icon || '') + ' ' + (targetSpace.name || '')));
  } catch (e) {
    _hideSwitchingOverlay();
    console.error('[MoveShoppingMultiple] error:', e);
    showToast(t('moveShoppingMultipleError'));
  }
}


async function _executeMoveMultipleProducts(items, targetSpace) {
  if (!items || !items.length || !targetSpace || !targetSpace.syncCode) return;
  _showSwitchingOverlay({ icon: '📦' }, t('moveMultipleInProgress', items.length));
  try {
    const ok = await window.FBSync.init();
    if (!ok) throw new Error('Firebase init failed');

    // Llegim els productes del destí UNA sola vegada, hi afegim TOTS
    // els seleccionats amb ids nous, i fem UNA sola escriptura. Si
    // això falla, no toquem l'origen — els items continuen tots a
    // l'Espai actual.
    const existing = await window.FBSync.readListData(targetSpace.syncCode, 'products');
    const targetList = Array.isArray(existing) ? existing.slice() : [];
    const baseTs = Date.now();
    items.forEach((p, idx) => {
      targetList.push(Object.assign({}, p, {
        id: 'p_' + baseTs + '_' + idx + '_' + Math.random().toString(36).slice(2, 5)
      }));
    });
    await window.FBSync.writeListData(targetSpace.syncCode, 'products', targetList);

    // Eliminem TOTS els seleccionats de l'origen amb una sola passada.
    if (typeof products !== 'undefined' && Array.isArray(products)) {
      const ids = new Set(items.map(p => p.id));
      products = products.filter(p => !ids.has(p.id));
      if (typeof saveData === 'function') saveData();
    }

    // Sortim del mode selecció (toolbar fora) i re-renderitzem el
    // nivell actual perquè els items moguts desapareguin de la vista.
    if (window.LevelsSelection && typeof window.LevelsSelection.exit === 'function') {
      window.LevelsSelection.exit();
    }
    if (typeof openShelf === 'function' && typeof currentLevel !== 'undefined' && currentLevel) {
      openShelf(currentLevel);
    }

    _hideSwitchingOverlay();
    showToast(t('moveMultipleDone', items.length, (targetSpace.icon || '') + ' ' + (targetSpace.name || '')));
  } catch (e) {
    _hideSwitchingOverlay();
    console.error('[MoveMultiple] error:', e);
    showToast(t('moveMultipleError'));
  }
}


// ----- Moure UN item de la llista de compra (Fase B) -----
//
// Mateix patró que la Fase A però per a items de BuyMe. El botó viu a
// #screen-shopping-item-edit (la pantalla d'edició d'un item ja
// existent). _refreshMoveShoppingItemBtn ajusta la visibilitat:
//   - amaga si no hi ha cap Espai destí amb syncCode
//   - amaga també si estem creant un item nou (el botó només té sentit
//     per a items ja desats; per a un nou, l'usuari encara no l'ha
//     guardat).
function _refreshMoveShoppingItemBtn(isExisting) {
  const btn = document.getElementById('btn-move-shopping-item');
  if (!btn) return;
  const SS = window.SpacesSystem;
  const targets = SS && typeof SS.getAvailableSpacesForMove === 'function'
    ? SS.getAvailableSpacesForMove()
    : [];
  const show = !!isExisting && targets.length > 0;
  btn.style.display = show ? 'flex' : 'none';
}
window.refreshMoveShoppingItemBtn = _refreshMoveShoppingItemBtn;

function _showMoveShoppingItemModal(item) {
  if (!item) return;
  const SS = window.SpacesSystem;
  if (!SS || !window.FBSync) {
    showToast(t('syncErrorOffline'));
    return;
  }
  const targets = SS.getAvailableSpacesForMove();
  if (targets.length === 0) {
    showToast(t('moveProductNoSpaces'));
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const optionsHtml = targets.map(s =>
    '<button type="button" class="space-option" data-space-id="' + escapeHtml(s.id) + '">' +
      '<span class="space-option-icon">' + escapeHtml(s.icon || '🏠') + '</span>' +
      '<span class="space-option-name">' + escapeHtml(s.name || '') + '</span>' +
      '<span class="space-option-arrow">›</span>' +
    '</button>'
  ).join('');
  overlay.innerHTML =
    '<div class="modal-content space-modal-content">' +
      '<div class="modal-emoji-big">📦</div>' +
      '<p class="modal-title">' + escapeHtml(t('moveShoppingItemTitle')) + '</p>' +
      '<p class="modal-sub">' + escapeHtml(t('moveShoppingItemIntro', (item.emoji || '') + ' ' + (item.name || ''))) + '</p>' +
      '<div class="space-options">' + optionsHtml + '</div>' +
      '<div class="info-banner banner-info" style="margin-top: 12px;">' +
        '<div class="info-banner-icon">ℹ️</div>' +
        '<div class="info-banner-content"><p>' + escapeHtml(t('moveShoppingItemInfo')) + '</p></div>' +
      '</div>' +
      '<div class="modal-buttons">' +
        '<button class="modal-cancel" id="move-shopping-cancel">' + escapeHtml(t('cancel')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#move-shopping-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelectorAll('.space-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.spaceId;
      const target = targets.find(s => s.id === id);
      if (!target) return;
      close();
      _executeMoveShoppingItem(item, target);
    });
  });
}

async function _executeMoveShoppingItem(item, targetSpace) {
  if (!item || !targetSpace || !targetSpace.syncCode) return;
  _showSwitchingOverlay({ icon: '📦' }, t('moveShoppingItemInProgress'));
  try {
    const ok = await window.FBSync.init();
    if (!ok) throw new Error('Firebase init failed');

    // Importat: a la cloud, el camp s'anomena 'shoppingItems' (camelCase
    // — vegeu onRemoteData a settings.js i la creació inicial a
    // _showCreateSpaceModal). NO 'shopping' com deia la spec.
    const existing = await window.FBSync.readListData(targetSpace.syncCode, 'shoppingItems');
    const targetList = Array.isArray(existing) ? existing.slice() : [];
    const moved = Object.assign({}, item, {
      id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    });
    targetList.push(moved);
    await window.FBSync.writeListData(targetSpace.syncCode, 'shoppingItems', targetList);

    // Esborrem de l'origen via la variable global shoppingItems +
    // saveShoppingData (que escriu localStorage 'eatmefirst_shopping_items'
    // i empeny a Firebase via pushToServer).
    if (typeof shoppingItems !== 'undefined' && Array.isArray(shoppingItems)) {
      shoppingItems = shoppingItems.filter(i => i.id !== item.id);
      if (typeof saveShoppingData === 'function') saveShoppingData();
    } else {
      try {
        const local = JSON.parse(localStorage.getItem('eatmefirst_shopping_items') || '[]');
        const filtered = local.filter(i => i.id !== item.id);
        localStorage.setItem('eatmefirst_shopping_items', JSON.stringify(filtered));
      } catch (e) {}
    }

    // Tornem a la llista del super, mateix patró que deleteShoppingItem.
    if (typeof editingShoppingItem !== 'undefined') editingShoppingItem = null;
    _hideSwitchingOverlay();
    showToast(t('moveShoppingItemDone', item.name || '', (targetSpace.icon || '') + ' ' + (targetSpace.name || '')));
    if (typeof openSupermarket === 'function' && typeof currentSupermarketId !== 'undefined') {
      openSupermarket(currentSupermarketId, { preserveMode: true });
    } else if (typeof showScreen === 'function') {
      showScreen('shopping');
    }
  } catch (e) {
    _hideSwitchingOverlay();
    console.error('[MoveShopping] error:', e);
    showToast(t('moveShoppingItemError'));
  }
}


// ----- Switch d'Espai actiu (FASE 4) -----
//
// Demana confirmació, fa el switch (que esborra dades per-espai i
// sincronitza el codi de Firebase), mostra un overlay durant un
// instant perquè l'usuari vegi que passa alguna cosa, i recarrega la
// pàgina. El reload garanteix un estat in-memory net (mateix patró
// que importData/restoreBackup).
function _confirmSwitchToSpace(spaceId) {
  const SS = window.SpacesSystem;
  if (!SS) return;
  const target = SS.getSpaceById(spaceId);
  if (!target) return;
  if (SS.getActiveSpaceId() === spaceId) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-content space-modal-content">' +
      '<div class="modal-emoji-big">' + escapeHtml(target.icon || '🏠') + '</div>' +
      '<p class="modal-title">' + escapeHtml(t('spacesSwitchTitle', target.name || '')) + '</p>' +
      '<p class="modal-sub">' + escapeHtml(t('spacesSwitchIntro')) + '</p>' +
      '<ul class="space-switch-steps">' +
        '<li>' + escapeHtml(t('spacesSwitchStep1')) + '</li>' +
        '<li>' + escapeHtml(t('spacesSwitchStep2')) + '</li>' +
        '<li>' + escapeHtml(t('spacesSwitchStep3', target.name || '')) + '</li>' +
        '<li>' + escapeHtml(t('spacesSwitchStep4')) + '</li>' +
      '</ul>' +
      '<p class="modal-sub modal-sub-soft">' + escapeHtml(t('spacesSwitchFooter')) + '</p>' +
      '<div class="modal-buttons">' +
        '<button class="modal-cancel" id="space-switch-cancel">' + escapeHtml(t('cancel')) + '</button>' +
        '<button class="modal-confirm" id="space-switch-confirm">' + escapeHtml(t('spacesSwitchConfirm', target.icon || '', target.name || '')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#space-switch-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#space-switch-confirm').addEventListener('click', () => {
    close();
    _doSwitchWithOverlay(spaceId);
  });
}

function _doSwitchWithOverlay(spaceId) {
  const SS = window.SpacesSystem;
  if (!SS) return;
  const target = SS.getSpaceById(spaceId);
  if (!target) return;
  _showSwitchingOverlay(target);
  // El switch en si és sincron: només fa I/O contra localStorage. La
  // reconnexió Firebase la farà initSync() després del reload. Cridem
  // dins un setTimeout perquè el navegador pinti l'overlay abans de
  // bloquejar el thread (encara que mínimament).
  setTimeout(() => {
    try {
      SS.switchToSpace(spaceId);
    } catch (e) {
      console.error('[Spaces] switchToSpace error:', e);
    }
    // Petit delay perquè l'usuari vegi l'overlay abans del reload (el
    // reload és visualment abrupte; aquest delay suavitza).
    setTimeout(() => { window.location.reload(); }, 400);
  }, 60);
}

function _showSwitchingOverlay(target, customText) {
  // Si ja hi ha un overlay, no en posis dos.
  if (document.getElementById('space-switching-overlay')) return;
  const ov = document.createElement('div');
  ov.id = 'space-switching-overlay';
  const text = customText || t('spacesSwitchingTo', (target && target.name) || '');
  ov.innerHTML =
    '<div class="space-switching-card">' +
      '<div class="space-switching-spinner">' + escapeHtml((target && target.icon) || '⏳') + '</div>' +
      '<p class="space-switching-text">' + escapeHtml(text) + '</p>' +
    '</div>';
  document.body.appendChild(ov);
}


// ----- Botons "Crear" / "Unir-me" — modals integrats (FASE 3) -----
// Tots dos modals creen un Espai LOCAL (a SpacesSystem) i, en el cas
// de Crear, també un document a Firebase (lists/{codi}). NO fan
// switch — els nous Espais queden a la llista però no s'activen.
// El canvi d'Espai (i el clear/restore de dades locals associat) ve
// a la FASE 4.

function _onSpacesCreateClick() { _showCreateSpaceModal(); }
function _onSpacesJoinClick()   { _showJoinSpaceModal(); }

// Construeix l'HTML del picker d'icones reutilitzant les opcions
// d'SpacesSystem. Default: la primera (🏠).
function _buildIconPickerHtml(selectedIcon) {
  const opts = (window.SpacesSystem && window.SpacesSystem.ICON_OPTIONS) || ['🏠'];
  const sel = selectedIcon || opts[0];
  return '<div class="icon-picker">' + opts.map(icon =>
    '<button type="button" class="icon-option' + (icon === sel ? ' selected' : '') + '" data-icon="' + escapeHtml(icon) + '">' + icon + '</button>'
  ).join('') + '</div>';
}

// Wire dels botons de l'icon picker dins d'un overlay concret.
// Retorna una funció que retorna l'icona triada actual.
function _wireIconPicker(scope) {
  scope.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', () => {
      scope.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  return () => {
    const sel = scope.querySelector('.icon-option.selected');
    return sel ? sel.dataset.icon : '🏠';
  };
}


function _showCreateSpaceModal() {
  if (!window.FBSync || !window.SpacesSystem) {
    showToast(t('syncErrorOffline'));
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-content space-modal-content">' +
      '<div class="modal-emoji-big">➕</div>' +
      '<p class="modal-title">' + escapeHtml(t('spacesCreateTitle')) + '</p>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('spacesCreateNameLabel')) + '</label>' +
        '<input type="text" id="space-create-name" maxlength="30" autocomplete="off" placeholder="' + escapeHtml(t('spacesCreateNamePlaceholder')) + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('spacesCreateIconLabel')) + '</label>' +
        _buildIconPickerHtml(null) +
      '</div>' +
      '<div class="info-banner banner-info" style="margin: 8px 0 4px;">' +
        '<div class="info-banner-icon">ℹ️</div>' +
        '<div class="info-banner-content">' +
          '<strong>' + escapeHtml(t('spacesCreateInfoTitle')) + '</strong>' +
          '<p>' + escapeHtml(t('spacesCreateInfo')) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="modal-buttons">' +
        '<button class="modal-cancel" id="space-create-cancel">' + escapeHtml(t('cancel')) + '</button>' +
        '<button class="modal-confirm" id="space-create-confirm">' + escapeHtml(t('spacesCreateConfirm')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  const getIcon = _wireIconPicker(overlay);
  const nameInput = overlay.querySelector('#space-create-name');
  setTimeout(() => { nameInput && nameInput.focus(); }, 50);
  overlay.querySelector('#space-create-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const confirmBtn = overlay.querySelector('#space-create-confirm');
  confirmBtn.addEventListener('click', async () => {
    const name = (nameInput.value || '').trim();
    if (!name) { showToast(t('needName')); return; }

    confirmBtn.disabled = true;
    confirmBtn.classList.add('is-disabled');
    showToast(t('spacesCreatingCode'));

    try {
      const ok = await window.FBSync.init();
      if (!ok) { showToast(t('syncErrorOffline')); confirmBtn.disabled = false; confirmBtn.classList.remove('is-disabled'); return; }

      // Generació de codi únic — fins a 10 intents, com createNewList.
      let code = '';
      let attempts = 0;
      do {
        code = window.FBSync.generateCode();
        attempts++;
        if (attempts > 10) break;
      } while (await window.FBSync.codeExists(code));
      if (attempts > 10) {
        showToast(t('spacesCodeUniqueError'));
        confirmBtn.disabled = false; confirmBtn.classList.remove('is-disabled');
        return;
      }

      // Document Firebase amb estat buit. NO copiem dades de l'Espai
      // actual (això evita que en fer switch a la Fase 4 l'usuari es
      // trobi amb dades duplicades). Locations buides perquè
      // onRemoteData ja les ignora si length === 0.
      await window.FBSync.createList(code, {
        products: [],
        locations: [],
        stats: { consumed: 0, trashed: 0 },
        supermarkets: [],
        shoppingItems: []
      });

      // Afegim l'Espai al SpacesSystem (sense activar-lo).
      const newSpace = window.SpacesSystem.createSpace(name, getIcon());
      window.SpacesSystem.updateSpaceSyncCode(newSpace.id, code);

      close();
      renderSpacesList();
      // Modal de confirmació amb el codi destacat + botó per copiar-lo.
      // Important: en una creació nova, l'usuari NO ha de perdre aquest
      // codi (el necessitarà per connectar altres dispositius). Per
      // això el toast genèric no n'hi ha prou — mostrem el codi gran
      // dins un modal i li donem una manera fàcil de copiar-lo.
      _showSpaceCreatedConfirmModal(name, code);
    } catch (e) {
      console.error('[Spaces] Error creant espai:', e);
      showToast(t('spacesCreateError'));
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('is-disabled');
    }
  });
}


// Modal post-èxit de "Crear nou espai": mostra el codi acabat de
// generar destacat + un botó per copiar-lo i un per tancar. L'usuari
// necessita aquest codi per connectar altres dispositius i no se li
// hauria d'amagar darrere d'un toast efímer.
function _showSpaceCreatedConfirmModal(name, code) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-content space-modal-content">' +
      '<div class="modal-emoji-big">✅</div>' +
      '<p class="modal-title">' + escapeHtml(t('spacesCreatedDoneTitle')) + '</p>' +
      '<p class="modal-sub">' + escapeHtml(t('spacesCreatedDoneIntro', name || '')) + '</p>' +
      '<div class="space-created-code-box">' +
        '<p class="space-created-code-label">' + escapeHtml(t('spacesCreatedDoneCodeLabel')) + '</p>' +
        '<p class="space-created-code-value">' + escapeHtml(code) + '</p>' +
      '</div>' +
      '<p class="modal-sub">' + escapeHtml(t('spacesCreatedDoneFooter')) + '</p>' +
      '<div class="modal-buttons">' +
        '<button class="modal-cancel" id="space-created-close">' + escapeHtml(t('close')) + '</button>' +
        '<button class="modal-confirm" id="space-created-copy">' + escapeHtml(t('spacesCreatedDoneCopyBtn')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#space-created-close').addEventListener('click', close);
  overlay.querySelector('#space-created-copy').addEventListener('click', async () => {
    const ok = await copyTextToClipboard(code);
    if (ok) showToast('📋 ' + t('codeCopied'));
    else showToast(t('spacesCodeCopyError'));
    close();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}


function _showJoinSpaceModal() {
  if (!window.FBSync || !window.SpacesSystem) {
    showToast(t('syncErrorOffline'));
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-content space-modal-content">' +
      '<div class="modal-emoji-big">🔗</div>' +
      '<p class="modal-title">' + escapeHtml(t('spacesJoinTitle')) + '</p>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('spacesJoinCodeLabel')) + '</label>' +
        '<input type="text" id="space-join-code" placeholder="EMF-XXXX-XXXX" maxlength="13" autocomplete="off" style="text-transform:uppercase;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1px">' +
        '<small>' + escapeHtml(t('spacesJoinCodeHint')) + '</small>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('spacesJoinNameLabel')) + '</label>' +
        '<input type="text" id="space-join-name" maxlength="30" autocomplete="off" placeholder="' + escapeHtml(t('spacesCreateNamePlaceholder')) + '">' +
        '<small>' + escapeHtml(t('spacesJoinNameHint')) + '</small>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('spacesCreateIconLabel')) + '</label>' +
        _buildIconPickerHtml(null) +
      '</div>' +
      '<div class="info-banner banner-info" style="margin: 8px 0 4px;">' +
        '<div class="info-banner-icon">ℹ️</div>' +
        '<div class="info-banner-content">' +
          '<strong>' + escapeHtml(t('spacesJoinInfoTitle')) + '</strong>' +
          '<p>' + escapeHtml(t('spacesJoinInfo')) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="modal-buttons">' +
        '<button class="modal-cancel" id="space-join-cancel">' + escapeHtml(t('cancel')) + '</button>' +
        '<button class="modal-confirm" id="space-join-confirm">' + escapeHtml(t('spacesJoinConfirm')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  const getIcon = _wireIconPicker(overlay);
  const codeInput = overlay.querySelector('#space-join-code');
  const nameInput = overlay.querySelector('#space-join-name');
  setTimeout(() => { codeInput && codeInput.focus(); }, 50);
  overlay.querySelector('#space-join-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const confirmBtn = overlay.querySelector('#space-join-confirm');
  confirmBtn.addEventListener('click', async () => {
    let code = (codeInput.value || '').trim().toUpperCase();
    const name = (nameInput.value || '').trim();
    if (!code) { showToast(t('syncCodeRequired')); return; }
    if (!name) { showToast(t('needName')); return; }
    // Acceptem variants sense prefix EMF- o sense guions, com fa
    // joinExistingList de settings.js, per ser permissius.
    if (!code.startsWith('EMF-')) code = 'EMF-' + code;
    if (code.length === 12 && code.charAt(7) !== '-') {
      code = code.slice(0, 8) + '-' + code.slice(8);
    }
    if (!/^EMF-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      showToast(t('syncCodeInvalid'));
      return;
    }
    // Defensiu: ja tens aquest codi a un Espai? No el tornem a afegir.
    const dup = window.SpacesSystem.getSpaces().find(s => s.syncCode === code);
    if (dup) {
      showToast(t('spacesAlreadyJoined', dup.name || ''));
      return;
    }

    confirmBtn.disabled = true;
    confirmBtn.classList.add('is-disabled');
    showToast(t('spacesVerifying'));

    try {
      const ok = await window.FBSync.init();
      if (!ok) { showToast(t('syncErrorOffline')); confirmBtn.disabled = false; confirmBtn.classList.remove('is-disabled'); return; }
      const exists = await window.FBSync.codeExists(code);
      if (!exists) {
        showToast(t('syncCodeNotFound'));
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('is-disabled');
        return;
      }
      const newSpace = window.SpacesSystem.createSpace(name, getIcon());
      window.SpacesSystem.updateSpaceSyncCode(newSpace.id, code);
      close();
      renderSpacesList();
      showToast('✅ ' + t('spacesJoined', name));
    } catch (e) {
      console.error('[Spaces] Error verificant codi:', e);
      showToast(t('syncErrorJoin'));
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('is-disabled');
    }
  });
}


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
  attachSpacesScreenListeners,
  showMoveProductModal: _showMoveProductModal,
  refreshMoveProductBtn: _refreshMoveProductBtn,
  showMoveShoppingItemModal: _showMoveShoppingItemModal,
  refreshMoveShoppingItemBtn: _refreshMoveShoppingItemBtn,
  showMoveMultipleProductsModal: _showMoveMultipleProductsModal,
  showMoveMultipleShoppingItemsModal: _showMoveMultipleShoppingItemsModal
};
