/* ============================================
   Buyte — js/buyme.js
   Mòdul de la llista de la compra: estat dels items,
   pantalla principal de supermercats, navegació amb swipe,
   afegir / editar / comprar items, modals "ja en tens".
   ============================================ */


function getShoppingItemsBySupermarket(supermarketId) {
  return shoppingItems.filter(it => it.supermarketId === supermarketId);
}

function openShoppingList() {
  renderSupermarkets();
  showScreen('shopping');
}

function renderSupermarkets() {
  const container = document.getElementById('shopping-supermarkets');
  if (!container) return;
  container.innerHTML = '';

  const visibleSupermarkets = getBuyMeVisibleSupermarkets();

  if (visibleSupermarkets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noActiveSupermarkets');
    container.appendChild(empty);
    return;
  }

  // Colors rotatius (gradients) per supermercat segons posició
  const gradients = [
    ['#42A5F5', '#1565C0'],   // blau
    ['#26A69A', '#00695C'],   // teal
    ['#FFA726', '#E65100'],   // taronja
    ['#AB47BC', '#7B1FA2'],   // violeta
    ['#EF5350', '#C62828'],   // vermell
    ['#66BB6A', '#388E3C'],   // verd
    ['#5C6BC0', '#3949AB']    // indigo
  ];

  visibleSupermarkets.forEach((sm, idx) => {
    const items = getShoppingItemsBySupermarket(sm.id);
    const [c1, c2] = gradients[idx % gradients.length];

    const card = document.createElement('button');
    card.className = 'supermarket-card';
    card.style.background = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    card.style.boxShadow = `0 4px 14px ${c2}40`;
    card.innerHTML = `
      <div class="supermarket-emoji">${sm.emoji}</div>
      <div class="supermarket-info">
        <p class="supermarket-name">${escapeHtml(sm.name)}</p>
        <p class="supermarket-count">${formatItemCount(items.length)}</p>
      </div>
      <span class="supermarket-arrow">›</span>
    `;
    card.addEventListener('click', () => openSupermarket(sm.id));
    container.appendChild(card);
  });
}


function formatItemCount(n) {
  if (n === 0) return t('emptyList');
  if (n === 1) return t('oneItem');
  return t('manyItems', n);
}

function openSupermarket(id) {
  currentSupermarketId = id;
  const sm = getSupermarketById(id);
  if (!sm) return;
  document.getElementById('supermarket-title').textContent = sm.emoji + ' ' + sm.name;
  renderShoppingItems();
  renderSupermarketDots();
  showScreen('supermarket');
  setupSupermarketSwipe();
}

function renderSupermarketDots() {
  const dotsContainer = document.getElementById('supermarket-dots');
  if (!dotsContainer) return;
  dotsContainer.innerHTML = '';
  const visible = getBuyMeVisibleSupermarkets();
  visible.forEach(sm => {
    const dot = document.createElement('div');
    dot.className = 'sm-dot' + (sm.id === currentSupermarketId ? ' active' : '');
    dotsContainer.appendChild(dot);
  });
}

// Configuració del swipe
let _swipeSetup = false;
function setupSupermarketSwipe() {
  if (_swipeSetup) return;
  _swipeSetup = true;

  const screen = document.getElementById('screen-supermarket');
  if (!screen) return;

  let startX = 0, startY = 0, currentX = 0, isSwiping = false;

  screen.addEventListener('touchstart', (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    isSwiping = true;
  }, { passive: true });

  screen.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    currentX = e.touches[0].clientX;
    const dx = currentX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 20) {
      isSwiping = false;
      screen.style.transform = '';
      return;
    }
    // Segueix el dit horitzontalment (estil Instagram Stories)
    if (Math.abs(dx) > 8) {
      screen.style.transform = `translateX(${dx * 0.85}px)`;
    }
  }, { passive: true });

  screen.addEventListener('touchend', () => {
    if (!isSwiping) return;
    isSwiping = false;
    const dx = currentX - startX;

    // Animació de retorn suau (només transform, sense fade)
    screen.style.transition = 'transform 0.25s cubic-bezier(0.0, 0.0, 0.2, 1)';
    screen.style.transform = '';
    setTimeout(() => { screen.style.transition = ''; }, 250);

    if (Math.abs(dx) < 80) return;

    const visible = getBuyMeVisibleSupermarkets();
    const idx = visible.findIndex(s => s.id === currentSupermarketId);
    if (idx < 0) return;

    if (dx < 0 && idx < visible.length - 1) {
      // Swipe esquerra → següent: animació d'entrada des de la dreta
      animateScreenSlide(screen, 'left', () => openSupermarket(visible[idx + 1].id));
    } else if (dx > 0 && idx > 0) {
      // Swipe dreta → anterior: animació d'entrada des de l'esquerra
      animateScreenSlide(screen, 'right', () => openSupermarket(visible[idx - 1].id));
    }
  });

  screen.addEventListener('touchcancel', () => {
    isSwiping = false;
    screen.style.transition = 'transform 0.22s cubic-bezier(0.0, 0.0, 0.2, 1)';
    screen.style.transform = '';
    setTimeout(() => { screen.style.transition = ''; }, 220);
  });
}

function animateScreenSlide(screen, direction, callback) {
  const distance = direction === 'left' ? -100 : 100;
  screen.style.transition = 'transform 0.22s cubic-bezier(0.4, 0.0, 0.2, 1)';
  screen.style.transform = `translateX(${distance}%)`;

  setTimeout(() => {
    callback();
    // Apareix des de l'altre costat amb slide horitzontal pur
    screen.style.transition = 'none';
    screen.style.transform = `translateX(${-distance}%)`;
    requestAnimationFrame(() => {
      screen.style.transition = 'transform 0.28s cubic-bezier(0.0, 0.0, 0.2, 1)';
      screen.style.transform = '';
      setTimeout(() => { screen.style.transition = ''; }, 280);
    });
  }, 220);
}

// Indicadors (punts) a la part superior, estil Stories
// Configuració del swipe
function renderShoppingItems() {
  const container = document.getElementById('shopping-items-list');
  const summary = document.getElementById('supermarket-summary');
  if (!container) return;
  container.innerHTML = '';

  const items = getShoppingItemsBySupermarket(currentSupermarketId);

  if (summary) {
    summary.textContent = items.length === 0 ? t('shoppingEmptyHint') : t('shoppingItemsCount', items.length);
  }

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'shopping-empty-celebration';
    empty.innerHTML = `
      <div class="celebrate-emoji">🎉</div>
      <p class="celebrate-title">${t('shoppingDone')}</p>
      <p class="celebrate-sub">${t('shoppingDoneSub')}</p>
    `;
    container.appendChild(empty);
    return;
  }

  items.forEach((item, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === items.length - 1;
    const div = document.createElement('div');
    div.className = 'shopping-item';
    div.innerHTML = `
      <div class="shopping-item-emoji">${item.emoji}</div>
      <div class="shopping-item-info">
        <p class="shopping-item-name">${escapeHtml(item.name)}</p>
        ${item.qty || item.notes ? `<p class="shopping-item-meta">${item.qty ? escapeHtml(item.qty) : ''}${item.qty && item.notes ? ' · ' : ''}${item.notes ? escapeHtml(item.notes) : ''}</p>` : ''}
      </div>
      <div class="shopping-item-arrows">
        <button class="arrow-btn ${isFirst ? 'arrow-disabled' : ''}" data-action="up" ${isFirst ? 'disabled' : ''} aria-label="Up">▲</button>
        <button class="arrow-btn ${isLast ? 'arrow-disabled' : ''}" data-action="down" ${isLast ? 'disabled' : ''} aria-label="Down">▼</button>
      </div>
      <button class="shopping-item-edit" data-action="edit" data-id="${item.id}" aria-label="Edit">✏️</button>
      <button class="shopping-item-bought" data-action="bought" data-id="${item.id}" aria-label="Bought">
        <span style="font-size:18px">✅</span>
        <span data-i18n="bought">${t('bought')}</span>
      </button>
    `;
    div.querySelector('[data-action="edit"]').addEventListener('click', () => openShoppingItemEdit(item));
    div.querySelector('[data-action="bought"]').addEventListener('click', () => buyShoppingItem(item));

    const upBtn = div.querySelector('[data-action="up"]');
    const downBtn = div.querySelector('[data-action="down"]');
    if (upBtn && !isFirst) upBtn.addEventListener('click', () => moveShoppingItem(idx, -1));
    if (downBtn && !isLast) downBtn.addEventListener('click', () => moveShoppingItem(idx, 1));

    container.appendChild(div);
  });
}

// Afegir/editar supermercat
function openSupermarketEdit(sm) {
  editingSupermarket = sm; // null = nou
  const isNew = !sm;
  document.getElementById('supermarket-edit-title').textContent =
    isNew ? t('newSupermarket') : t('editSupermarket');
  document.getElementById('input-supermarket-name').value = isNew ? '' : sm.name;
  selectedSupermarketEmoji = isNew ? '🛒' : sm.emoji;

  const delBtn = document.getElementById('btn-delete-supermarket');
  if (delBtn) delBtn.style.display = isNew ? 'none' : 'block';

  renderSupermarketEmojiPicker();
  showScreen('supermarket-edit');
}

function renderSupermarketEmojiPicker() {
  renderSupermarketEmojiPickerBtn();
}

function saveSupermarket() {
  const name = document.getElementById('input-supermarket-name').value.trim();
  if (!name) { showToast(t('nameRequired')); return; }

  if (editingSupermarket) {
    editingSupermarket.name = name;
    editingSupermarket.emoji = selectedSupermarketEmoji;
  } else {
    const id = 'sm-custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    supermarkets.push({ id, name, emoji: selectedSupermarketEmoji, enabled: true });
  }
  saveShoppingData();
  showToast(t('saved'));
  // Tornem a la pantalla de gestió si estàvem editant des d'allà
  openManageSupermarkets('shopping');
}

function deleteSupermarket() {
  if (!editingSupermarket) return;
  const itemsCount = getShoppingItemsBySupermarket(editingSupermarket.id).length;
  const msg = itemsCount > 0 ? t('confirmDeleteSupermarketWithItems', itemsCount) : t('confirmDeleteSupermarket');
  if (!confirm(msg)) return;
  // Esborra items associats
  shoppingItems = shoppingItems.filter(it => it.supermarketId !== editingSupermarket.id);
  // Esborra supermercat
  supermarkets = supermarkets.filter(s => s.id !== editingSupermarket.id);
  saveShoppingData();
  showToast(t('deleted'));
  openShoppingList();
}

// Afegir/editar item
function openShoppingItemEdit(item) {
  editingShoppingItem = item;
  const isNew = !item;
  document.getElementById('shopping-item-edit-title').textContent =
    isNew ? t('newShoppingItem') : t('editShoppingItem');
  document.getElementById('input-shopping-name').value = isNew ? '' : item.name;
  document.getElementById('input-shopping-qty').value = isNew ? '' : (item.qty || '');
  document.getElementById('input-shopping-notes').value = isNew ? '' : (item.notes || '');
  selectedShoppingEmoji = isNew ? '🥛' : item.emoji;

  const delBtn = document.getElementById('btn-delete-shopping-item');
  if (delBtn) delBtn.style.display = isNew ? 'none' : 'block';

  // Selector de botiga: només si estem editant
  const shopGroup = document.getElementById('shop-selector-group');
  const shopSelect = document.getElementById('input-shopping-shop');
  if (shopGroup && shopSelect) {
    if (isNew) {
      shopGroup.style.display = 'none';
    } else {
      shopGroup.style.display = 'block';
      shopSelect.innerHTML = '';
      const enabled = getEnabledSupermarkets();
      enabled.forEach(sm => {
        const opt = document.createElement('option');
        opt.value = sm.id;
        opt.textContent = sm.emoji + ' ' + sm.name;
        if (sm.id === item.supermarketId) opt.selected = true;
        shopSelect.appendChild(opt);
      });
    }
  }

  renderShoppingEmojiPicker();
  showScreen('shopping-item-edit');
}

function renderShoppingEmojiPicker() {
  renderShoppingEmojiPickerBtn();
}

function saveShoppingItem() {
  const name = document.getElementById('input-shopping-name').value.trim();
  if (!name) { showToast(t('nameRequired')); return; }
  const qty = document.getElementById('input-shopping-qty').value.trim();
  const notes = document.getElementById('input-shopping-notes').value.trim();

  if (editingShoppingItem) {
    const originalSupermarketId = editingShoppingItem.supermarketId;
    editingShoppingItem.name = name;
    editingShoppingItem.emoji = selectedShoppingEmoji;
    editingShoppingItem.qty = qty;
    editingShoppingItem.notes = notes;
    // Aplicar canvi de botiga si l'usuari l'ha canviada
    const shopSelect = document.getElementById('input-shopping-shop');
    if (shopSelect && shopSelect.value) {
      editingShoppingItem.supermarketId = shopSelect.value;
    }
    saveShoppingData();
    showToast(t('saved'));
    // Tornem al super ORIGINAL (no al nou)
    openSupermarket(originalSupermarketId);
    return;
  }

  // Nou item: comprovem si ja en té a casa (BiteMe)
  const lowerName = name.toLowerCase();
  const existingAtHome = products.filter(p => p.name.toLowerCase().includes(lowerName) || lowerName.includes(p.name.toLowerCase()));

  if (existingAtHome.length > 0) {
    showAlreadyHaveModal(name, existingAtHome, () => {
      const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      shoppingItems.push({
        id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
        qty, notes, addedAt: Date.now()
      });
      saveShoppingData();
      showToast(t('saved'));
      openSupermarket(currentSupermarketId);
    });
    return;
  }

  const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  shoppingItems.push({
    id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
    qty, notes, addedAt: Date.now()
  });
  saveShoppingData();
  showToast(t('saved'));
  openSupermarket(currentSupermarketId);
}

function showAlreadyHaveModal(itemName, existingProducts, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const list = existingProducts.slice(0, 3).map(p => {
    const days = daysUntil(p.date);
    return `<div class="already-have-row">${p.emoji} ${escapeHtml(p.name)}${p.qty ? ' · ' + escapeHtml(p.qty) : ''} <span class="already-have-days">${daysText(days)}</span></div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">⚠️</div>
      <p class="modal-title">${t('alreadyHaveTitle')}</p>
      <p class="modal-sub">${t('alreadyHaveSub', existingProducts.length)}</p>
      <div class="already-have-list">${list}</div>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('addAnyway')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    onConfirm();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function deleteShoppingItem() {
  if (!editingShoppingItem) return;
  if (!confirm(t('confirmDeleteShoppingItem'))) return;
  shoppingItems = shoppingItems.filter(it => it.id !== editingShoppingItem.id);
  saveShoppingData();
  showToast(t('deleted'));
  openSupermarket(currentSupermarketId);
}

// Quan l'usuari prem "Comprat" → obre el formulari del tracker amb el nom prefilfat
function buyShoppingItem(item) {
  pendingShoppingItemId = item.id;
  pendingShoppingSupermarketId = item.supermarketId;

  // Cerquem si aquest producte és a la llista de populars per pre-fillar dies + zona
  const populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
  const fromPopular = populars.find(p => p.name.toLowerCase().trim() === item.name.toLowerCase().trim());

  // També cerquem a l'historial
  const fromHistory = productHistory.find(p => p.name.toLowerCase().trim() === item.name.toLowerCase().trim());

  const prefill = {
    name: item.name,
    emoji: item.emoji,
    qty: item.qty,
    days: (fromPopular && fromPopular.days) || (fromHistory && fromHistory.days) || null,
    location: (fromPopular && fromPopular.location) || (fromHistory && fromHistory.location) || null,
    noExpiry: !!((fromPopular && fromPopular.noExpiry) || (fromHistory && fromHistory.noExpiry))
  };

  if (typeof openAddForm === 'function') {
    openAddForm(prefill);
  } else {
    showToast(t('error'));
  }
}

let pendingShoppingItemId = null; // si està definit, després de guardar producte traiem aquest item
let pendingShoppingSupermarketId = null; // si està definit, tornem a aquest supermercat després de guardar
let pendingShoppingScanContext = false; // true si l'escànner s'obre des de BuyMe

// Inicia l'escànner en mode "afegir a BuyMe"
async function startShoppingScanner() {
  pendingShoppingScanContext = true;
  showScreen('scan');
  if (typeof startScanner === 'function') {
    await startScanner();
  }
}

// Renderitza els productes populars per afegir a BuyMe (sense caducitat, només nom + emoji)
function renderPopularListForShopping() {
  const container = document.getElementById('shopping-popular-list');
  if (!container) return;
  container.innerHTML = '';
  const items = getPopularProducts();

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noPopular');
    container.appendChild(empty);
    return;
  }

  items.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'popular-item';
    btn.innerHTML = `
      <span class="popular-emoji">${p.emoji}</span>
      <span class="popular-name">${escapeHtml(p.name)}</span>
    `;
    btn.addEventListener('click', () => {
      // Afegim directament a la llista del supermercat actual
      const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      shoppingItems.push({
        id, supermarketId: currentSupermarketId,
        name: p.name, emoji: p.emoji, qty: '', notes: '',
        addedAt: Date.now()
      });
      saveShoppingData();
      showToast('🛒 ' + p.emoji + ' ' + p.name);
      renderShoppingItems();
      showScreen('supermarket');
    });
    container.appendChild(btn);
  });
}


function askAddToShoppingList(product) {
  // Si no hi ha cap supermercat, no preguntem (no té sentit)
  if (!supermarkets || supermarkets.length === 0) return;

  // Mostrem un modal en estil de l'app (no el confirm nadiu del navegador)
  showAddToShoppingModal(product);
}

function showAddToShoppingModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">🛒</div>
      <p class="modal-title">${t('askAddToShoppingTitle')}</p>
      <p class="modal-product-name">${escapeHtml(product.emoji + ' ' + product.name)}</p>
      <p class="modal-sub">${t('askAddToShoppingSub')}</p>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('noThanks')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('addToList')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    // Si només hi ha 1 supermercat, l'afegim directament
    if (supermarkets.length === 1) {
      addToShoppingList(supermarkets[0].id, product);
      showToast('🛒 ' + t('addedToShopping', supermarkets[0].name));
      return;
    }
    // Si n'hi ha més, mostrem el selector de supermercats
    showSupermarketPicker(product);
  });

  // Click fora del modal el tanca (= cancel·lar)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function addToShoppingList(supermarketId, product, qty) {
  const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  shoppingItems.push({
    id, supermarketId,
    name: product.name,
    emoji: product.emoji,
    qty: qty || '',
    notes: '',
    addedAt: Date.now()
  });
  saveShoppingData();
}

// Flux manual: pregunta quantitat i supermercat per afegir al BuyMe
function manualAddToBuyMe(product) {
  if (!supermarkets || supermarkets.length === 0) {
    showToast(t('noActiveSupermarkets'));
    return;
  }
  showManualAddToBuyMeModal(product);
}

function showManualAddToBuyMeModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const gradients = [
    ['#42A5F5', '#1565C0'], ['#26A69A', '#00695C'], ['#FFA726', '#E65100'],
    ['#AB47BC', '#7B1FA2'], ['#EF5350', '#C62828'], ['#66BB6A', '#388E3C'],
    ['#5C6BC0', '#3949AB']
  ];
  const smButtons = supermarkets.map((sm, idx) => {
    const [c1, c2] = gradients[idx % gradients.length];
    return `
      <button class="modal-supermarket-btn" data-id="${sm.id}" style="background:linear-gradient(135deg, ${c1} 0%, ${c2} 100%)">
        <span class="modal-sm-emoji">${sm.emoji}</span>
        <span class="modal-sm-name">${escapeHtml(sm.name)}</span>
      </button>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">🛒</div>
      <p class="modal-title">${t('addToList')}</p>
      <p class="modal-product-name">${escapeHtml(product.emoji + ' ' + product.name)}</p>
      <label style="display:block;text-align:left;font-size:13px;color:var(--text-muted);margin:14px 0 4px">${t('quantity')}</label>
      <input type="text" id="modal-qty-input" class="select-input" placeholder="${t('quantityPlaceholder')}" value="${escapeHtml(product.qty || '')}" style="margin-bottom:14px">
      <p class="modal-sub" style="margin:0 0 6px">${t('chooseSupermarket')}</p>
      <div class="modal-options">${smButtons}</div>
      <button class="modal-cancel" id="modal-cancel-btn" style="margin-top:10px">${t('cancel')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.modal-supermarket-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const smId = btn.dataset.id;
      const qty = (overlay.querySelector('#modal-qty-input').value || '').trim();
      const sm = getSupermarketById(smId);
      addToShoppingList(smId, product, qty);
      document.body.removeChild(overlay);
      showToast('🛒 ' + t('addedToShopping', sm ? sm.name : ''));
    });
  });

  overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function showChangeDateModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const currentDate = product.date || '';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">📅</div>
      <p class="modal-title">${t('editDate')}</p>
      <p class="modal-product-name">${escapeHtml(product.emoji + ' ' + product.name)}</p>
      <input type="date" id="modal-date-input" class="select-input" value="${currentDate}" style="margin:12px 0">
      <label class="no-expiry-label" style="margin:0">
        <input type="checkbox" id="modal-no-expiry" ${product.noExpiry ? 'checked' : ''}>
        <span data-i18n="noExpiry">${t('noExpiry')}</span>
      </label>
      <div class="modal-buttons" style="margin-top:14px">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    const newDate = document.getElementById('modal-date-input').value;
    const noExp = document.getElementById('modal-no-expiry').checked;
    const p = products.find(x => x.id === product.id);
    if (!p) {
      document.body.removeChild(overlay);
      return;
    }
    if (noExp) {
      p.noExpiry = true;
      p.date = null;
    } else if (newDate) {
      p.noExpiry = false;
      p.date = newDate;
    } else {
      showToast(t('needDate'));
      return;
    }
    saveData();
    document.body.removeChild(overlay);
    // Refresca el detall mantenint la navegació enrere actual
    openProduct(p.id);
    showToast(t('saved'));
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function showChangeZoneModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const zonesList = locations.map(loc => {
    const isSelected = loc.id === product.location;
    return `
      <button class="modal-zone-option${isSelected ? ' selected' : ''}" data-zone="${loc.id}">
        <span style="font-size:24px;margin-right:10px">${loc.emoji}</span>
        <span>${escapeHtml(getLocationName(loc))}</span>
      </button>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">📍</div>
      <p class="modal-title">${t('changeZone')}</p>
      <p class="modal-product-name">${escapeHtml(product.emoji + ' ' + product.name)}</p>
      <div class="modal-supermarket-list">${zonesList}</div>
      <button class="modal-cancel" id="modal-no-btn" style="margin-top:10px">${t('cancel')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.modal-zone-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const newZone = btn.dataset.zone;
      document.body.removeChild(overlay);
      if (newZone === product.location) return;
      // Pregunta si vol recalcular caducitat
      askRecalcExpiry(product, newZone);
    });
  });

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function askRecalcExpiry(product, newZone) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">📅</div>
      <p class="modal-title">${t('recalcExpiry')}</p>
      <p class="modal-sub">${t('recalcExpirySub')}</p>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('keepDate')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('recalc')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Aplicar canvi de zona en ambdós casos
  const applyZoneChange = (recalc) => {
    const p = products.find(x => x.id === product.id);
    if (!p) return;
    p.location = newZone;
    if (recalc) {
      // Si tenim baseDays a l'historial o als populars, recalcular
      const baseDays = (function() {
        const h = productHistory.find(x => x.name.toLowerCase() === p.name.toLowerCase());
        if (h && h.days) return h.days;
        const pop = (typeof getPopularProducts === 'function' ? getPopularProducts() : [])
          .find(x => x.name.toLowerCase() === p.name.toLowerCase());
        if (pop && pop.days) return pop.days;
        return 7;
      })();
      const finalDays = (typeof computeDaysForLocation === 'function')
        ? computeDaysForLocation(newZone, baseDays, [])
        : baseDays;
      const d = new Date();
      d.setDate(d.getDate() + finalDays);
      p.date = formatDateForInput(d);
    }
    saveData();
    // Refresc del detall mantenint la navegació enrere actual
    openProduct(p.id);
    showToast('✓ ' + t('movedToZone') + ' ' + getLocationName(getLocationById(newZone)));
  };

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    applyZoneChange(false);
  });
  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    applyZoneChange(true);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      applyZoneChange(false);
    }
  });
}

function showEditQtyModal(product) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">${product.emoji}</div>
      <p class="modal-title">${t('editQtyTitle')}</p>
      <p class="modal-product-name">${escapeHtml(product.name)}</p>
      <p class="modal-sub">${t('editQtySub')}</p>
      <input type="text" id="modal-qty-input" class="modal-qty-input" placeholder="${t('quantityPlaceholder')}" value="${escapeHtml(product.qty || '')}" maxlength="20">
      <div class="modal-qty-suggestions">
        <button class="modal-qty-chip" data-val="100%">100%</button>
        <button class="modal-qty-chip" data-val="3/4">3/4</button>
        <button class="modal-qty-chip" data-val="1/2">1/2</button>
        <button class="modal-qty-chip" data-val="1/4">1/4</button>
      </div>
      <div class="modal-buttons">
        <button class="modal-cancel" id="modal-no-btn">${t('cancel')}</button>
        <button class="modal-confirm" id="modal-yes-btn">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#modal-qty-input');
  setTimeout(() => input.focus(), 100);

  overlay.querySelectorAll('.modal-qty-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.val;
    });
  });

  overlay.querySelector('#modal-no-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  overlay.querySelector('#modal-yes-btn').addEventListener('click', () => {
    const newQty = input.value.trim();
    const p = products.find(x => x.id === product.id);
    if (p) {
      p.qty = newQty;
      saveData();
      const days = daysUntil(p.date);
      const loc = getLocationById(p.location || 'fridge');
      const locStr = loc ? loc.emoji + ' ' + getLocationName(loc) + ' · ' : '';
      const qtyStr = p.qty ? ' · ' + p.qty : '';
      document.getElementById('product-days').textContent = locStr + daysText(days) + qtyStr;
    }
    document.body.removeChild(overlay);
    showToast('✓ ' + t('saved'));
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function showSupermarketPicker(product) {
  // Crea modal dinàmic
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <p class="modal-title">${t('chooseSupermarket')}</p>
      <p class="modal-sub">${escapeHtml(product.emoji + ' ' + product.name)}</p>
      <div class="modal-options" id="modal-supermarket-options"></div>
      <button class="modal-cancel" id="modal-cancel-btn">${t('cancel')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const optionsContainer = overlay.querySelector('#modal-supermarket-options');
  const gradients = [
    ['#42A5F5', '#1565C0'], ['#26A69A', '#00695C'], ['#FFA726', '#E65100'],
    ['#AB47BC', '#7B1FA2'], ['#EF5350', '#C62828'], ['#66BB6A', '#388E3C'],
    ['#5C6BC0', '#3949AB']
  ];
  supermarkets.forEach((sm, idx) => {
    const [c1, c2] = gradients[idx % gradients.length];
    const btn = document.createElement('button');
    btn.className = 'modal-supermarket-btn';
    btn.style.background = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    btn.innerHTML = `<span class="modal-sm-emoji">${sm.emoji}</span><span class="modal-sm-name">${escapeHtml(sm.name)}</span>`;
    btn.addEventListener('click', () => {
      addToShoppingList(sm.id, product);
      showToast('🛒 ' + t('addedToShopping', sm.name));
      document.body.removeChild(overlay);
    });
    optionsContainer.appendChild(btn);
  });

  overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // Click fora del modal el tanca
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

