/* ============================================
   Buyte — app.js
   Punt d'entrada: registra els listeners del DOM
   i inicialitza l'app un cop carregat el document.
   La lògica viu als mòduls js/*.js (carregats abans).
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadLocations();
  loadShoppingData();
  if (typeof loadSpecialLists === 'function') loadSpecialLists();
  loadProductHistory();

  const savedTheme = localStorage.getItem('eatmefirst_theme') || 'light';
  applyTheme(savedTheme);

  translatePage();

  // Anima l'engranatge del launcher un cop a l'arrencada
  const initialGear = document.querySelector('#launcher-menu-btn .gear-spin');
  if (initialGear) initialGear.classList.add('gear-spin-once');

  // Mostra la pantalla de benvinguda si no l'hem fet servir mai
  showWelcomeIfNeeded();

  // Configura l'autocomplete del formulari d'afegir producte
  setupNameAutocomplete();

  // Botó "Afegeix al BuyMe" des del detall del producte
  const btnAddToBuyMe = document.getElementById('btn-add-to-buyme');
  if (btnAddToBuyMe) btnAddToBuyMe.addEventListener('click', () => {
    if (!currentProduct) return;
    manualAddToBuyMe(currentProduct);
  });

  // Botó "Editar quantitat" del detall del producte
  const btnEditQty = document.getElementById('btn-edit-product-qty');
  if (btnEditQty) btnEditQty.addEventListener('click', () => {
    if (!currentProduct) return;
    showEditQtyModal(currentProduct);
  });

  // Botó "Canviar de zona"
  const btnChangeZone = document.getElementById('btn-change-zone');
  if (btnChangeZone) btnChangeZone.addEventListener('click', () => {
    if (!currentProduct) return;
    showChangeZoneModal(currentProduct);
  });

  // Botó "Editar data de caducitat"
  const btnChangeDate = document.getElementById('btn-change-date');
  if (btnChangeDate) btnChangeDate.addEventListener('click', () => {
    if (!currentProduct) return;
    showChangeDateModal(currentProduct);
  });

  // Botons de selector d'emoji
  const btnPickEmoji = document.getElementById('btn-pick-emoji');
  if (btnPickEmoji) btnPickEmoji.addEventListener('click', () => openEmojiPicker('product', 'add'));

  const btnPickSmEmoji = document.getElementById('btn-pick-supermarket-emoji');
  if (btnPickSmEmoji) btnPickSmEmoji.addEventListener('click', () => openEmojiPicker('supermarket', 'supermarket-edit'));

  const btnPickShopEmoji = document.getElementById('btn-pick-shopping-emoji');
  if (btnPickShopEmoji) btnPickShopEmoji.addEventListener('click', () => openEmojiPicker('shopping', 'shopping-item-edit'));

  // Productes populars: editar
  const btnPickPopularEmoji = document.getElementById('btn-pick-popular-emoji');
  if (btnPickPopularEmoji) btnPickPopularEmoji.addEventListener('click', () => openEmojiPicker('popular', 'popular-edit'));

  const btnSavePopular = document.getElementById('btn-save-popular');
  if (btnSavePopular) btnSavePopular.addEventListener('click', savePopularEdit);

  const btnDeletePopular = document.getElementById('btn-delete-popular');
  if (btnDeletePopular) btnDeletePopular.addEventListener('click', deletePopularEdit);

  // Botons de seccions a la pantalla principal
  document.querySelectorAll('.section-btn').forEach(b => {
    b.addEventListener('click', () => openSection(b.dataset.cat));
  });

  // Clic als prestatges DINS de la secció
  document.querySelectorAll('#screen-section .shelf').forEach(s => {
    s.addEventListener('click', () => openShelf(s.dataset.level));
  });

  // Botons de navegació entre seccions (fletxes a la capçalera)
  const prevBtn = document.getElementById('section-prev');
  const nextBtn = document.getElementById('section-next');
  if (prevBtn) prevBtn.addEventListener('click', () => navigateSection(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => navigateSection(+1));

  // Swipe horitzontal entre seccions
  setupSwipeNavigation();

  document.getElementById('add-btn').addEventListener('click', () => showScreen('add-choice'));
  document.getElementById('choice-scan').addEventListener('click', () => {
    showScreen('scan');
    setTimeout(startScanner, 200);
  });
  document.getElementById('choice-manual').addEventListener('click', () => openAddForm({}));

  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', () => openSettings('home'));

  document.querySelectorAll('.back-btn').forEach(b => {
    b.addEventListener('click', () => {
      const target = b.dataset.back;
      // Refresc de la pantalla a la qual tornem (sobretot per quan venim
      // del detall del producte i hem editat qty, data, zona, etc.)
      if (target === 'shopping') renderSupermarkets();
      else if (target === 'supermarket') renderShoppingItems();
      else if (target === 'view-all' && typeof renderViewAll === 'function') renderViewAll();
      else if (target === 'what-i-have' && typeof renderWhatIHave === 'function') renderWhatIHave();
      else if (target === 'home' && typeof renderHome === 'function') renderHome();
      else if (target === 'alerts' && typeof renderAlerts === 'function') renderAlerts();
      else if (target === 'section' && typeof renderSection === 'function') renderSection();
      else if (target === 'popular' && typeof renderPopularList === 'function') renderPopularList();
      else if (target === 'list' && typeof openShelf === 'function' && currentLevel) {
        openShelf(currentLevel);
        return; // openShelf ja fa showScreen
      }
      showScreen(target);
    });
  });

  document.querySelectorAll('.action-btn').forEach(b => {
    b.addEventListener('click', () => handleAction(b.dataset.action));
  });

  document.getElementById('save-btn').addEventListener('click', saveNewProduct);

  document.querySelectorAll('.quick-date').forEach(b => {
    b.addEventListener('click', () => {
      const days = parseInt(b.dataset.days);
      const d = new Date();
      d.setDate(d.getDate() + days);
      const targetId = b.classList.contains('shopping-quick-date') ? 'input-shopping-date' : 'input-date';
      const target = document.getElementById(targetId);
      if (target) target.value = formatDateForInput(d);
      // Si està marcat "no caduca" del context shopping, el desmarquem
      if (b.classList.contains('shopping-quick-date')) {
        const noExp = document.getElementById('input-shopping-no-expiry');
        if (noExp && noExp.checked) noExp.checked = false;
      }
    });
  });

  document.getElementById('settings-theme').addEventListener('click', cycleTheme);
  document.getElementById('settings-language').addEventListener('click', () => {
    renderLangList();
    showScreen('language');
  });
  document.getElementById('settings-stats').addEventListener('click', showStats);

  // El meu impacte
  const btnImpact = document.getElementById('settings-impact');
  if (btnImpact) btnImpact.addEventListener('click', openImpact);
  document.querySelectorAll('#impact-period-pills .impact-period-pill').forEach(pill => {
    pill.addEventListener('click', () => setImpactPeriod(pill.dataset.period));
  });
  document.querySelectorAll('#screen-impact .impact-card-info-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof showImpactInfoModal === 'function') showImpactInfoModal(btn.dataset.info);
    });
  });
  // Entrada al submenú "Esborrar dades" (al menú principal de Configuració)
  document.getElementById('settings-reset').addEventListener('click', () => {
    if (typeof openResetDataScreen === 'function') openResetDataScreen();
    else showScreen('reset-data');
  });

  // Botons del submenú "Esborrar dades"
  const btnResetBiteme = document.getElementById('reset-biteme');
  if (btnResetBiteme) btnResetBiteme.addEventListener('click', resetBitemeProducts);

  const btnResetShopping = document.getElementById('reset-shopping');
  if (btnResetShopping) btnResetShopping.addEventListener('click', resetShoppingList);

  const btnResetImpact = document.getElementById('reset-impact');
  if (btnResetImpact) btnResetImpact.addEventListener('click', resetImpactHistory);

  const btnResetAll = document.getElementById('reset-all');
  if (btnResetAll) btnResetAll.addEventListener('click', resetAll);

  // Ubicacions des de configuració
  const settingsLoc = document.getElementById('settings-locations');
  if (settingsLoc) settingsLoc.addEventListener('click', () => openLocations('settings'));

  // SINCRONITZACIÓ
  const settingsSync = document.getElementById('settings-sync');
  if (settingsSync) settingsSync.addEventListener('click', openSyncScreen);

  // País i Supermercats
  const settingsCountry = document.getElementById('settings-country');
  if (settingsCountry) settingsCountry.addEventListener('click', openCountryScreen);

  const settingsSupermarkets = document.getElementById('settings-supermarkets');
  if (settingsSupermarkets) settingsSupermarkets.addEventListener('click', () => openManageSupermarkets('settings'));

  // Botó Editar les meves botigues
  const btnToggleEditShops = document.getElementById('btn-toggle-edit-shops');
  if (btnToggleEditShops) btnToggleEditShops.addEventListener('click', toggleEditShopsMode);

  // Botó Guardar canvis (surt del mode edició)
  const btnSaveShops = document.getElementById('btn-save-shops');
  if (btnSaveShops) btnSaveShops.addEventListener('click', () => {
    manageSupermarketsMode = 'view';
    renderManageSupermarkets();
    showToast(t('saved'));
  });

  // Productes populars: edit/sort/add/save
  const btnTogglePopular = document.getElementById('btn-toggle-edit-popular');
  if (btnTogglePopular) btnTogglePopular.addEventListener('click', togglePopularEditMode);

  const btnSortAlpha = document.getElementById('popular-sort-alpha');
  if (btnSortAlpha) btnSortAlpha.addEventListener('click', () => {
    sortPopularAlpha();
    renderPopularList();
    showToast('🔤 ' + t('sorted'));
  });

  const btnAddCustomPopular = document.getElementById('popular-add-custom');
  if (btnAddCustomPopular) btnAddCustomPopular.addEventListener('click', addCustomPopular);

  const btnSavePopularChanges = document.getElementById('btn-save-popular-changes');
  if (btnSavePopularChanges) btnSavePopularChanges.addEventListener('click', () => {
    popularMode = 'view';
    renderPopularList();
    showToast(t('saved'));
  });

  // Productes populars des de configuració
  const settingsPopular = document.getElementById('settings-popular');
  if (settingsPopular) settingsPopular.addEventListener('click', () => {
    if (typeof openPopular === 'function') openPopular('settings');
    else { showScreen('popular'); renderPopularList(); }
  });

  // "Què tinc a casa"
  const btnWhatIHave = document.getElementById('btn-what-i-have');
  if (btnWhatIHave) btnWhatIHave.addEventListener('click', openWhatIHaveScreen);

  document.querySelectorAll('#what-i-have-filters .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => setWhatIHaveFilter(pill.dataset.filter));
  });

  // Llistes especials
  const btnSpecial = document.getElementById('btn-special-lists');
  if (btnSpecial) btnSpecial.addEventListener('click', openSpecialLists);

  const btnAddAllSpecial = document.getElementById('btn-add-all-to-shopping');
  if (btnAddAllSpecial) btnAddAllSpecial.addEventListener('click', addAllSpecialToShopping);

  // Llistes especials: edit mode
  const btnToggleEditSpecial = document.getElementById('btn-toggle-edit-special-lists');
  if (btnToggleEditSpecial) btnToggleEditSpecial.addEventListener('click', toggleEditSpecialListsMode);

  const btnAddCustomSpecial = document.getElementById('btn-add-custom-special-list');
  if (btnAddCustomSpecial) btnAddCustomSpecial.addEventListener('click', addCustomSpecialList);

  const btnSaveSpecial = document.getElementById('btn-save-special-lists');
  if (btnSaveSpecial) btnSaveSpecial.addEventListener('click', () => {
    specialListsMode = 'view';
    renderSpecialLists();
    showToast(t('saved'));
  });

  // Edició d'una llista (items)
  const btnToggleEditListItems = document.getElementById('btn-toggle-edit-list-items');
  if (btnToggleEditListItems) btnToggleEditListItems.addEventListener('click', toggleEditListItems);

  const btnAddListItem = document.getElementById('btn-add-list-item');
  if (btnAddListItem) btnAddListItem.addEventListener('click', addItemToCurrentList);

  // Edició d'item (especial): emoji i guardar
  const btnPickSpecialItemEmoji = document.getElementById('btn-pick-special-item-emoji');
  if (btnPickSpecialItemEmoji) btnPickSpecialItemEmoji.addEventListener('click', () => openEmojiPicker('special-item', 'special-item-edit'));

  const btnSaveSpecialItem = document.getElementById('btn-save-special-item');
  if (btnSaveSpecialItem) btnSaveSpecialItem.addEventListener('click', saveSpecialItem);

  // Botó Veure-ho tot
  const btnViewAll = document.getElementById('btn-view-all');
  if (btnViewAll) btnViewAll.addEventListener('click', openViewAll);

  const btnSortExpiry = document.getElementById('btn-sort-by-expiry');
  if (btnSortExpiry) btnSortExpiry.addEventListener('click', () => {
    viewAllSortMode = 'expiry';
    renderViewAll();
  });

  const btnSortZone = document.getElementById('btn-sort-by-zone');
  if (btnSortZone) btnSortZone.addEventListener('click', () => {
    viewAllSortMode = 'zone';
    renderViewAll();
  });

  // NOTIFICACIONS: targeta a la configuració
  const settingsNotif = document.getElementById('settings-notifications');
  if (settingsNotif) settingsNotif.addEventListener('click', openNotificationsScreen);

  // Botó "Demanar permís"
  const btnReqPerm = document.getElementById('btn-request-permission');
  if (btnReqPerm) btnReqPerm.addEventListener('click', handleRequestPermission);

  // Toggles de configuració de notificacions
  const togEnabled = document.getElementById('notif-toggle-enabled');
  if (togEnabled) togEnabled.addEventListener('change', (e) => {
    window.Notif.set({ enabled: e.target.checked });
    updateNotifStatus();
    showToast(e.target.checked ? '✅ ' + t('notifActivated') : t('notifDeactivated'));
  });

  const inpTime = document.getElementById('notif-daily-time');
  if (inpTime) inpTime.addEventListener('change', (e) => {
    window.Notif.set({ dailyTime: e.target.value });
    updateNotifStatus();
  });

  const togOnOpen = document.getElementById('notif-toggle-onopen');
  if (togOnOpen) togOnOpen.addEventListener('change', (e) => {
    window.Notif.set({ notifyOnOpen: e.target.checked });
  });

  const togOrange = document.getElementById('notif-toggle-orange');
  if (togOrange) togOrange.addEventListener('change', (e) => {
    window.Notif.set({ includeOrange: e.target.checked });
  });

  const togRed = document.getElementById('notif-toggle-red');
  if (togRed) togRed.addEventListener('change', (e) => {
    window.Notif.set({ includeRed: e.target.checked });
  });

  // Botó "Provar notificació"
  const btnTest = document.getElementById('btn-test-notif');
  if (btnTest) btnTest.addEventListener('click', testNotificationNow);

  const btnCreate = document.getElementById('btn-create-list');
  if (btnCreate) btnCreate.addEventListener('click', createNewList);

  const btnJoin = document.getElementById('btn-join-list');
  if (btnJoin) btnJoin.addEventListener('click', () => {
    document.getElementById('input-sync-code').value = '';
    showScreen('sync-join');
    setTimeout(() => document.getElementById('input-sync-code').focus(), 250);
  });

  const btnConfirmJoin = document.getElementById('btn-confirm-join');
  if (btnConfirmJoin) btnConfirmJoin.addEventListener('click', joinExistingList);

  const btnDisconnect = document.getElementById('btn-disconnect');
  if (btnDisconnect) btnDisconnect.addEventListener('click', disconnectSync);

  const btnCopy = document.getElementById('btn-copy-code');
  if (btnCopy) btnCopy.addEventListener('click', copyCodeToClipboard);

  // ===== LLISTA DE LA COMPRA =====
  // Botons del launcher
  const launcherShopping = document.getElementById('launcher-shopping');
  if (launcherShopping) launcherShopping.addEventListener('click', openShoppingList);

  const launcherTracker = document.getElementById('launcher-tracker');
  if (launcherTracker) launcherTracker.addEventListener('click', () => {
    renderHome();
    showScreen('home');
  });

  const launcherMenuBtn = document.getElementById('launcher-menu-btn');
  if (launcherMenuBtn) launcherMenuBtn.addEventListener('click', () => openSettings('launcher'));

  // Pantalla de supermercats
  const btnManageSm = document.getElementById('btn-manage-supermarkets');
  if (btnManageSm) btnManageSm.addEventListener('click', () => openManageSupermarkets('shopping'));

  // Pantalla de gestió de supermercats
  const btnAddCustomSm = document.getElementById('btn-add-custom-supermarket');
  if (btnAddCustomSm) btnAddCustomSm.addEventListener('click', () => openSupermarketEdit(null));

  // Toggle mode editar items (botó al header del super)
  const btnEditSupermarket = document.getElementById('supermarket-edit-btn');
  if (btnEditSupermarket) btnEditSupermarket.addEventListener('click', toggleSupermarketItemsMode);

  // Pantalla d'edició de supermercat
  const btnSaveSm = document.getElementById('btn-save-supermarket');
  if (btnSaveSm) btnSaveSm.addEventListener('click', saveSupermarket);

  const btnDelSm = document.getElementById('btn-delete-supermarket');
  if (btnDelSm) btnDelSm.addEventListener('click', deleteSupermarket);

  // Pantalla d'items
  const btnAddItem = document.getElementById('btn-add-shopping-item');
  if (btnAddItem) btnAddItem.addEventListener('click', () => {
    showScreen('shopping-add-choice');
  });

  // Botons de la pantalla de tria d'afegir a BuyMe
  const choiceShopScan = document.getElementById('shop-choice-scan');
  if (choiceShopScan) choiceShopScan.addEventListener('click', () => {
    pendingShoppingScanContext = true;
    if (typeof startShoppingScanner === 'function') startShoppingScanner();
  });

  const choiceShopManual = document.getElementById('shop-choice-manual');
  if (choiceShopManual) choiceShopManual.addEventListener('click', () => openShoppingItemEdit(null));

  const choiceShopPopular = document.getElementById('shop-choice-popular');
  if (choiceShopPopular) choiceShopPopular.addEventListener('click', () => {
    renderPopularListForShopping();
    showScreen('shopping-popular');
  });

  // Pantalla d'edició d'item
  const btnSaveItem = document.getElementById('btn-save-shopping-item');
  if (btnSaveItem) btnSaveItem.addEventListener('click', saveShoppingItem);

  const btnDelItem = document.getElementById('btn-delete-shopping-item');
  if (btnDelItem) btnDelItem.addEventListener('click', deleteShoppingItem);

  // Inicia sincronització si ja teníem codi guardat
  initSync();

  // Inicia notificacions
  initNotifications();

  // Productes populars (des del formulari Add)
  document.getElementById('popular-btn').addEventListener('click', () => {
    if (typeof openPopular === 'function') openPopular('add');
    else { renderPopularList(); showScreen('popular'); }
  });

  // Codi a mà
  document.getElementById('manual-code-btn').addEventListener('click', () => {
    document.getElementById('input-barcode').value = '';
    showScreen('manual-code');
    setTimeout(() => document.getElementById('input-barcode').focus(), 250);
  });
  document.getElementById('search-barcode-btn').addEventListener('click', searchManualBarcode);

  // Ubicacions: gestió
  const newLocBtn = document.getElementById('new-location-btn');
  if (newLocBtn) newLocBtn.addEventListener('click', () => openLocationEditor(-1));

  const saveLocBtn = document.getElementById('save-location-btn');
  if (saveLocBtn) saveLocBtn.addEventListener('click', saveLocationEdit);

  const delLocBtn = document.getElementById('loc-edit-delete');
  if (delLocBtn) delLocBtn.addEventListener('click', () => {
    if (editingLocationIndex >= 0) {
      deleteLocation(editingLocationIndex);
      showScreen('locations');
    }
  });
});


document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderHome();
  else stopScanner();
});
