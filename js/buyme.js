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
  updateWhatIHaveCount();
  showScreen('shopping');
}

// ============ "QUÈ TINC A CASA" ============
let whatIHaveFilter = 'all';

function updateWhatIHaveCount() {
  const el = document.getElementById('what-i-have-count');
  if (el) el.textContent = '(' + (Array.isArray(products) ? products.length : 0) + ')';
}

function openWhatIHaveScreen() {
  whatIHaveFilter = 'all';
  // Reset visual de les pestanyes
  document.querySelectorAll('#what-i-have-filters .filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === 'all');
  });
  renderWhatIHave();
  showScreen('what-i-have');
}

function setWhatIHaveFilter(filter) {
  whatIHaveFilter = filter;
  document.querySelectorAll('#what-i-have-filters .filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === filter);
  });
  renderWhatIHave();
}

function buildWhatIHaveRow(p) {
  const row = document.createElement('button');
  row.className = 'view-all-row';
  const days = daysUntil(p.date);
  const loc = getLocationById(p.location || 'fridge');

  let daysClass = '';
  if (days !== Infinity) {
    if (days <= 2) daysClass = 'days-urgent';
    else if (days <= 5) daysClass = 'days-soon';
  }

  const locLabel = loc ? loc.emoji + ' ' + getLocationName(loc) : '';
  row.innerHTML = `
    <span class="view-all-emoji">${p.emoji}</span>
    <div class="view-all-info">
      <p class="view-all-name">${formatProductLine(p.name, p.qty)}</p>
      <p class="view-all-meta">${locLabel}${locLabel ? ' ' : ''}<span class="${daysClass}">${daysText(days)}</span></p>
    </div>
    <span class="view-all-arrow">›</span>
  `;
  row.addEventListener('click', () => openProductDetail(p, 'what-i-have'));
  return row;
}

function renderWhatIHave() {
  const container = document.getElementById('what-i-have-list');
  const empty = document.getElementById('what-i-have-empty');
  if (!container) return;
  container.innerHTML = '';

  if (!Array.isArray(products) || products.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  if (whatIHaveFilter === 'zone') {
    // Agrupat per zona, dins cada zona ordenat per dies
    const sorted = [...products].sort((a, b) => {
      const la = getLocationById(a.location || 'fridge');
      const lb = getLocationById(b.location || 'fridge');
      const na = la ? getLocationName(la) : '';
      const nb = lb ? getLocationName(lb) : '';
      const cmp = na.localeCompare(nb);
      if (cmp !== 0) return cmp;
      return daysUntil(a.date) - daysUntil(b.date);
    });

    let lastZone = null;
    sorted.forEach(p => {
      const loc = getLocationById(p.location || 'fridge');
      const zone = loc ? loc.emoji + ' ' + getLocationName(loc) : '';
      if (zone !== lastZone) {
        const header = document.createElement('div');
        header.className = 'view-all-zone-header';
        header.textContent = zone;
        container.appendChild(header);
        lastZone = zone;
      }
      container.appendChild(buildWhatIHaveRow(p));
    });
    return;
  }

  // Mode 'all' o 'urgent': llista plana ordenada per dies fins caducar
  let list = [...products];
  if (whatIHaveFilter === 'urgent') {
    list = list.filter(p => {
      const d = daysUntil(p.date);
      return d !== Infinity && d <= 5;
    });
  }
  list.sort((a, b) => daysUntil(a.date) - daysUntil(b.date));

  if (list.length === 0) {
    // En mode 'urgent' sense res urgent: missatge curt
    const note = document.createElement('p');
    note.className = 'empty-state';
    note.textContent = '🎉 ' + (typeof t === 'function' ? t('shoppingDone') : '');
    container.appendChild(note);
    return;
  }

  list.forEach(p => container.appendChild(buildWhatIHaveRow(p)));
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

function openSupermarket(id, options) {
  const opts = options || {};
  currentSupermarketId = id;
  const sm = getSupermarketById(id);
  if (!sm) return;
  // Per defecte, en obrir un super, comencem en mode visualització.
  // Si tornem d'editar/eliminar un item, conservem el mode amb preserveMode.
  if (!opts.preserveMode) supermarketItemsMode = 'view';
  updateSupermarketEditBtn();
  renderShoppingItems();
  renderSupermarketDots();
  _updateSupermarketHeader();
  showScreen('supermarket');
  // Salt instantani a la pàgina del super escollit un cop el slider és
  // visible (cal layout per saber clientWidth).
  requestAnimationFrame(() => _scrollToSupermarket(currentSupermarketId, false));
}

// Swiper.js per al slider de supermercats (vegeu el paral·lel a
// js/biteme.js per a zones). Es crea peresosament a _ensureShopsSwiper
// la primera vegada que el slider té dimensions (screen-supermarket
// .active). A diferència del slider de zones, el conjunt de slides
// pot canviar entre sessions perquè l'usuari pot activar/desactivar
// supermercats — quan això passa, renderShoppingItems destrueix la
// instància actual abans de reconstruir el DOM, i el següent
// _scrollToSupermarket crea una de nova.
let _shopsSwiper = null;

function _ensureShopsSwiper() {
  if (_shopsSwiper) return _shopsSwiper;
  const slider = document.getElementById('shops-slider');
  if (!slider || !slider.clientWidth) return null;
  _shopsSwiper = new Swiper('#shops-slider', {
    // Vegeu la configuració idèntica a _ensureZonesSwiper a
    // js/biteme.js. effect: 'cube' substitueix l'antic 'creative' que
    // amb rotació de 30° era massa subtil per donar la sensació de
    // cub real, i tenia un bug on el primer swipe a BuyMe no avançava
    // completament (l'usuari havia de lliscar dues vegades).
    effect: 'cube',
    cubeEffect: {
      // Vegeu el comentari paral·lel a _ensureZonesSwiper de
      // js/biteme.js: shadow:false treu l'ombra projectada sota el
      // cub que quedava mal integrada amb el fons de la pantalla.
      shadow: false,
      slideShadows: true,
      shadowOffset: 20,
      shadowScale: 0.94
    },
    speed: 600,
    grabCursor: true,
    // Vegeu el bloc paral·lel (extens) a _ensureZonesSwiper de
    // js/biteme.js. longSwipesRatio: 0.2 + longSwipesMs: 200 +
    // resistanceRatio: 0.85 — els llindars més permissibles
    // raonablement possibles per evitar que el cub quedi a mitges.
    threshold: 5,
    touchRatio: 1,
    longSwipes: true,
    longSwipesRatio: 0.2,
    longSwipesMs: 200,
    shortSwipes: true,
    followFinger: true,
    resistanceRatio: 0.85,
    // Vegeu el comentari paral·lel a _ensureZonesSwiper a
    // js/biteme.js: en mòbil, el jitter del dit + preventClicks:true
    // bloqueja taps. Els taps a items de la llista de la compra
    // han de funcionar.
    preventClicks: false,
    preventClicksPropagation: false,
    // touchStartPreventDefault: false — vegeu el comentari paral·lel
    // a _ensureZonesSwiper a js/biteme.js. Cal a Android perquè el
    // browser dispari el click event natural després del touchend
    // (sense això, calia "doble clic" per activar accions als slides
    // que no fossin l'inicial).
    touchStartPreventDefault: false,
    // loop: true reactivat. La causa del bug d'overlap anterior
    // (contingut d'una botiga apareixia fantasma sota una altra a la
    // costura del loop) era que slideChange cridava
    // renderShoppingItems, que rebuilda tota l'estructura DOM dels
    // slides — incompatible amb el inventori intern de Swiper amb
    // duplicats. Ara slideChange NOMÉS re-renderitza la llista
    // d'items del slide ANTERIOR via querySelectorAll, i això inclou
    // tant l'original com el seu clone (si en té). Cap mutació
    // d'estructura, cap desincronització.
    //
    // loopAdditionalSlides: 0 important per al cube — Swiper només
    // necessita 1 clone a cada extrem (no 2+) per fer la transició
    // cíclica seamless en cube. Més clones afegirien duplicats
    // innecessaris al wrapper.
    loop: true,
    loopAdditionalSlides: 0,
    pagination: {
      el: '#supermarket-dots',
      clickable: true,
      bulletClass: 'sm-dot',
      bulletActiveClass: 'active',
      renderBullet: function(index, className) {
        // index és l'índex REAL (sense duplicats); mapeja directament
        // a la llista de supers visibles.
        const supers = getBuyMeVisibleSupermarkets();
        const sm = supers[index];
        const id = sm ? sm.id : '';
        const label = sm ? sm.name : '';
        return '<button class="' + className + '" type="button" data-sm-id="' + id + '" aria-label="' + label + '"></button>';
      }
    },
    on: {
      slideChange: function() {
        const supers = getBuyMeVisibleSupermarkets();
        const sm = supers[this.realIndex];
        if (!sm || sm.id === currentSupermarketId) return;
        const oldId = currentSupermarketId;
        currentSupermarketId = sm.id;
        // En canviar de super, sortim del mode d'edició (cada super
        // hauria de començar en mode visualització).
        supermarketItemsMode = 'view';
        updateSupermarketEditBtn();
        _updateSupermarketHeader();
        // CRÍTIC: NO crideu renderShoppingItems aquí. Era el causant
        // d'un loop infinit slideChange → renderShoppingItems →
        // destroy(swiper) → rebuild slides → init nou swiper →
        // slideToLoop → slideChange → ... La causa: amb loop:true
        // Swiper afegeix slides duplicades al wrapper (clones de la
        // primera/última per fer la transició cíclica seamless).
        // existingIds llavors incloïa aquests duplicats, no coincidia
        // amb wantedIds (només originals), sameSet=false, i destruïm
        // tot.
        //
        // Aquí només cal: re-renderitzar el slide ANTERIOR en mode
        // 'view' (per si l'usuari l'havia deixat en mode 'edit'). El
        // nou slide ja estava en 'view' (no era currentSupermarketId
        // abans). querySelectorAll perquè amb loop:true pot existir
        // un duplicat del slide antic també.
        if (oldId && this.el) {
          const oldPages = this.el.querySelectorAll('.shop-page[data-sm-id="' + oldId + '"]');
          oldPages.forEach(page => {
            const list = page.querySelector('.shopping-items-list');
            if (list) _renderShopPageItems(oldId, list, 'view');
          });
        }
      },
      // Reactivació AUTORITATIVA dels pointer-events post-transició:
      // l'activa → 'auto', TOTES les altres (inclosos els clons del loop)
      // → 'none'. Només posar l'activa a 'auto' deixava 'auto' residual a
      // cares ja visitades; amb l'efecte cub, el plec d'una cara veïna
      // amb 'auto' solapava una sub-regió de la frontal (p. ex. el botó
      // "Comprat" a la vora dreta) i interceptava el tap. Confinar el
      // hit-testing a la cara visible ho resol.
      slideChangeTransitionEnd: function() {
        const sw = this;
        if (!sw.slides) return;
        for (let i = 0; i < sw.slides.length; i++) {
          sw.slides[i].style.pointerEvents = (i === sw.activeIndex) ? 'auto' : 'none';
        }
      }
    }
  });
  return _shopsSwiper;
}

function _scrollToSupermarket(id, smooth) {
  const supers = getBuyMeVisibleSupermarkets();
  const idx = supers.findIndex(s => s.id === id);
  if (idx < 0) return;
  const swiper = _ensureShopsSwiper();
  if (!swiper) {
    // Pantalla encara no .active (clientWidth=0). Reintenta al
    // següent frame; quan showScreen('supermarket') s'hagi aplicat,
    // _ensureShopsSwiper podrà crear la instància.
    requestAnimationFrame(() => _scrollToSupermarket(id, smooth));
    return;
  }
  // update() obligat abans del slideTo: aquesta era la causa real del
  // bug "BuyMe es queda a mitges al primer swipe". Quan el slider
  // s'instancia mentre la pantalla és .active però acaba de ser-ho,
  // les dimensions del seu rectangle interior poden no estar
  // estabilitzades. update() força un recàlcul de la cube geometry.
  swiper.update();
  // slideToLoop (no slideTo) perquè loop:true està activat — slideTo
  // operaria sobre l'array intern amb duplicats.
  swiper.slideToLoop(idx, smooth ? 600 : 0);
  // Segon update() amb un petit delay per cobrir el cas on els items
  // dins de .shopping-items-list es renderitzen / canvien d'altura
  // després que la pantalla s'hagi mostrat. Sense això, en alguns
  // casos d'entrada inicial Swiper calculava la cube geometry abans
  // que els items haguessin acabat de pintar i la rotació quedava
  // visualment imprecisa.
  setTimeout(() => {
    if (_shopsSwiper === swiper) swiper.update();
  }, 120);
}

(function _wireShopsResnap() {
  if (typeof window === 'undefined') return;
  if (window.__shopsSliderResizeWired) return;
  window.__shopsSliderResizeWired = true;
  // Swiper té el seu propi ResizeObserver intern; res a fer aquí.
})();

function _updateSupermarketHeader() {
  const sm = getSupermarketById(currentSupermarketId);
  if (!sm) return;
  const titleEl = document.getElementById('supermarket-title');
  if (titleEl) titleEl.textContent = sm.emoji + ' ' + sm.name;
  const summaryEl = document.getElementById('supermarket-summary');
  if (summaryEl) {
    const items = getShoppingItemsBySupermarket(currentSupermarketId);
    summaryEl.textContent = items.length === 0
      ? t('shoppingEmptyHint')
      : t('shoppingItemsCount', items.length);
  }
  _updateBuyMeViewToggleUI(currentSupermarketId);
  _updateBuyMeCostSummary(currentSupermarketId);
  _updateFinishTripButton(currentSupermarketId);
}

// Mostra el botó "He acabat la compra" NOMÉS si hi ha una anada oberta en
// aquest súper amb ≥1 compra registrada. S'amaga altrament. Idempotent;
// cridat des de _updateSupermarketHeader (open · slide change · post-render,
// que cobreix cada compra individual/bulk perquè totes re-renderitzen).
function _updateFinishTripButton(supId) {
  const btn = document.getElementById('btn-finish-trip');
  if (!btn) return;
  const session = supId ? getBasketSession(supId) : null;
  const count = (session && typeof getBasketRecordCount === 'function')
    ? getBasketRecordCount(session.basketId) : 0;
  btn.style.display = (session && count > 0) ? 'block' : 'none';
}

// "He acabat la compra": tanca l'anada oberta d'aquell súper (neteja la
// sessió i amaga el botó de seguida) i, si hi ha ≥1 compra, reutilitza el
// popup de la Fase 2a amb el total estimat de la cistella (Σ dels totalPrice
// dels seus records). Si no hi ha sessió o 0 compres, no treu tiquet.
function _finishShoppingTrip(supId) {
  const sid = supId || currentSupermarketId;
  const session = sid ? getBasketSession(sid) : null;
  if (!session) return;
  const basketId = session.basketId;
  const count = (typeof getBasketRecordCount === 'function') ? getBasketRecordCount(basketId) : 0;
  // Prémer "He acabat" tanca l'anada de seguida (accepti o cancel·li el
  // popup després). Segur fer-ho abans: el popup opera sobre els records
  // per basketId, independent de la sessió; el basketId ja està desat als
  // records. Si l'usuari torna a comprar en aquest súper, s'obrirà una
  // anada nova.
  clearBasketSession(sid);
  _updateFinishTripButton(sid);
  if (count === 0) return;   // res comprat → cap tiquet
  const estTotal = (typeof getBasketEstimatedTotal === 'function') ? getBasketEstimatedTotal(basketId) : 0;
  _promptBasketTicketTotal(basketId, estTotal);
}

// Sincronitza l'estat visual del toggle Cronològic/Per-categoria amb
// el mode persistit del super passat. Idempotent — segur cridar-la a
// cada slide change i a openSupermarket.
function _updateBuyMeViewToggleUI(supermarketId) {
  const wrapper = document.getElementById('buyme-view-toggle');
  if (!wrapper) return;
  const mode = getBuyMeViewMode(supermarketId);
  wrapper.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.toggle('view-mode-active', btn.dataset.mode === mode);
  });
}

// Refresca la barra "💰 Aprox. X,XX €" del super actual. S'amaga si
// cap item té preu estimable (no volem mostrar "0,00 €" en una llista
// d'items sense popular associat). Crida'm des de
// _updateSupermarketHeader perquè es disparin tots els canvis (open,
// slide change, post-buy/edit/delete).
function _updateBuyMeCostSummary(supermarketId) {
  const summary = document.getElementById('buyme-cost-summary');
  if (!summary) return;
  const setDisplay = (val) => { summary.style.display = val; };
  if (!supermarketId) { setDisplay('none'); return; }
  const items = getShoppingItemsBySupermarket(supermarketId);
  if (!items || items.length === 0) { setDisplay('none'); return; }
  const result = getTotalEstimatedCost(items);
  if (!result || result.countWithPrice === 0) {
    setDisplay('none');
    return;
  }
  setDisplay('flex');
  const totalEl = summary.querySelector('.cost-total');
  const detailEl = summary.querySelector('.cost-detail');
  if (totalEl) totalEl.textContent = 'Aprox. ' + _formatEur(result.total);
  if (detailEl) {
    const n = result.countWithPrice;
    let detail = n + (n === 1 ? ' producte' : ' productes');
    if (result.countWithoutPrice > 0) {
      detail += ' · ' + result.countWithoutPrice + ' sense preu';
    }
    detailEl.textContent = detail;
  }
}

// Manté la cube geometry sincronitzada amb canvis de viewport: amb
// .shops-slider a 70vh, rotar el dispositiu o mostrar/amagar la barra
// del navegador mòbil alteren el valor de 1vh i per tant l'altura
// real del slider. Sense update(), Swiper continua usant la geometria
// antiga del cub i les transicions queden imprecises.
(function _wireShopsSwiperResize() {
  if (typeof window === 'undefined') return;
  if (window.__shopsSwiperResizeWired) return;
  window.__shopsSwiperResizeWired = true;
  const onResize = () => {
    if (!_shopsSwiper) return;
    try { _shopsSwiper.update(); } catch (e) {}
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
})();

let supermarketItemsMode = 'view';

function toggleSupermarketItemsMode() {
  supermarketItemsMode = supermarketItemsMode === 'view' ? 'edit' : 'view';
  updateSupermarketEditBtn();
  renderShoppingItems();
}

function updateSupermarketEditBtn() {
  const btn = document.getElementById('supermarket-edit-btn');
  if (!btn) return;
  btn.textContent = supermarketItemsMode === 'edit' ? '✓' : '✏️';
}

// No-op stub. La paginació la renderitza Swiper via pagination.el =
// '#supermarket-dots' a _ensureShopsSwiper. Mantenim aquesta funció
// definida per backward compat amb callers heretats.
function renderSupermarketDots() {}

// El swipe entre supermercats ara el gestiona scroll-snap natiu del
// .shops-slider (vegeu styles.css). Conservem la funció com a hook
// buit perquè openSupermarket encara la crida.
function setupSupermarketSwipe() {}

// Construeix les pàgines del slider (#shops-slider) i ompla cadascuna
// amb els items del seu supermercat. Només la pàgina del supermercat
// actual mostra el mode d'edició actiu (la resta es renderitzen en
// mode 'view' per evitar UI inconsistent en pàgines no-visibles).
function renderShoppingItems() {
  const slider = document.getElementById('shops-slider');
  if (!slider) return;
  const wrapper = slider.querySelector('.swiper-wrapper');
  if (!wrapper) return;

  // Garantim que el delegate de clicks dels botons d'acció estigui
  // enganxat al pare #shops-slider. Idempotent (guarda interna via
  // dataset). Vegeu el comentari extens a _initShopsActionsDelegate.
  _initShopsActionsDelegate();

  const supers = getBuyMeVisibleSupermarkets();

  // Construïm les pàgines (.swiper-slide) un sol cop o quan canvia el
  // conjunt de supermercats actius (l'usuari pot activar/desactivar
  // supers a settings). Si la llista canvia, primer destruïm la
  // instància de Swiper existent — Swiper té el seu propi inventari
  // de slides i si modifiquem el DOM directament queda desincronitzat.
  //
  // CRÍTIC: amb loop:true, Swiper afegeix slides duplicats al wrapper
  // (clones de primera/última per a la transició cíclica). Cal
  // FILTRAR aquests duplicats abans de comparar — sense això
  // existingIds.length sempre seria > wantedIds.length post-init,
  // sameSet sempre seria false, sempre destruiríem i rebuildaríem,
  // i tot dins d'un loop infinit.
  const existingIds = Array.from(wrapper.children)
    .filter(c => !c.classList.contains('swiper-slide-duplicate'))
    .map(c => c.dataset.smId);
  const wantedIds = supers.map(s => s.id);
  const sameSet = existingIds.length === wantedIds.length
    && existingIds.every((id, i) => id === wantedIds[i]);
  if (!sameSet) {
    if (_shopsSwiper) {
      _shopsSwiper.destroy(true, true);
      _shopsSwiper = null;
    }
    wrapper.innerHTML = '';
    supers.forEach(sm => {
      const page = document.createElement('div');
      page.className = 'shop-page swiper-slide';
      page.dataset.smId = sm.id;
      const list = document.createElement('div');
      list.className = 'shopping-items-list';
      page.appendChild(list);
      wrapper.appendChild(page);
    });
    // Si l'usuari té un super activament obert i ha estat eliminat,
    // ens caiem cap al primer disponible (evita slideTo amb idx=-1).
    if (currentSupermarketId && supers.findIndex(s => s.id === currentSupermarketId) < 0 && supers.length > 0) {
      currentSupermarketId = supers[0].id;
    }
    // Si la pantalla és visible ara mateix, lazy-recreem la
    // instància de Swiper a la pàgina del super actual. Si no, ja ho
    // farà openSupermarket via rAF al proper canvi de pantalla.
    const screen = document.getElementById('screen-supermarket');
    if (screen && screen.classList.contains('active') && currentSupermarketId) {
      requestAnimationFrame(() => _scrollToSupermarket(currentSupermarketId, false));
    }
  }

  // Renderitzem els items de cada pàgina. querySelectorAll (no
  // querySelector) perquè amb loop:true Swiper té duplicats de
  // primera/última al wrapper, i tots dos (original + clone)
  // necessiten contingut consistent — sense això, en arribar a la
  // costura del loop l'usuari veuria un slide buit.
  supers.forEach(sm => {
    const pages = wrapper.querySelectorAll('.shop-page[data-sm-id="' + sm.id + '"]');
    const mode = (sm.id === currentSupermarketId) ? supermarketItemsMode : 'view';
    pages.forEach(page => {
      const list = page.querySelector('.shopping-items-list');
      if (list) _renderShopPageItems(sm.id, list, mode);
    });
  });

  _updateSupermarketHeader();
}

// Mode de visualització dels items per supermercat: 'chronological'
// (ordre d'addició — el comportament històric) o 'category' (agrupats
// per categoria amb capçaleres). Es persisteix per supermercat.
const VIEW_MODE_KEY_PREFIX = 'eatmefirst_buyme_view_mode_';

function getBuyMeViewMode(supermarketId) {
  if (!supermarketId) return 'chronological';
  return localStorage.getItem(VIEW_MODE_KEY_PREFIX + supermarketId) || 'chronological';
}

function setBuyMeViewMode(supermarketId, mode) {
  if (!supermarketId) return;
  localStorage.setItem(VIEW_MODE_KEY_PREFIX + supermarketId, mode);
}

// Cost estimat d'un shopping item (€) — null si no es pot estimar.
// Reutilitzem `getProductPrice` de js/product-data.js (no reimplementem
// la lògica): hi ha tota la maquinària de CAS A/B/C ja resolta i
// alineada amb els càlculs d'impacte. Construïm un producte sintètic
// barrejant el `qty` de l'item del BuyMe amb el `price` i `weight` del
// popular catalogat. Només estimem si el popular té `price > 0` —
// d'altra manera getProductPrice cauria al fallback per categoria
// (P2) i inventaria preus que no representen res que l'usuari hagi
// confirmat. La política aquí és "sense preu = no es mostra".
// Parseja un string de pes/volum i retorna {value, unit} on unit és
// la unitat base 'g' o 'ml'. Si no parseja, retorna null.
// "1kg" → {value:1000, unit:'g'}, "1L" → {value:1000, unit:'ml'}.
function _parseWeightToBase(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().match(/^([\d.,]+)\s*(ml|l|g|kg)$/i);
  if (!m) return null;
  const num = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(num) || num < 0) return null;
  const u = m[2].toLowerCase();
  if (u === 'kg') return { value: num * 1000, unit: 'g' };
  if (u === 'g')  return { value: num, unit: 'g' };
  if (u === 'l')  return { value: num * 1000, unit: 'ml' };
  if (u === 'ml') return { value: num, unit: 'ml' };
  return null;
}

function getEstimatedItemCost(item, popularByName) {
  if (!item || typeof getProductPrice !== 'function') return null;
  const key = String(item.name || '').toLowerCase().trim();
  let popular = (key && popularByName) ? popularByName[key] : null;
  // Fallback "mateix producte" (tokens stemmed) quan el nom exacte falla
  // (p. ex. "albergínies" vs catàleg "Albergínia"). Guard de runtime.
  if (!popular && typeof cookmeSameProduct === 'function' && typeof getPopularProducts === 'function') {
    const all = getPopularProducts();
    if (Array.isArray(all)) popular = all.find(p => p && p.name && cookmeSameProduct(item.name, p.name)) || null;
  }

  const itemHasOverridePrice = (typeof item.price === 'number' && item.price >= 0);
  const popPrice = (popular && typeof popular.price === 'number' && popular.price > 0)
    ? popular.price : null;

  // Cas PROPORCIONAL: sense override de price + popular té price +
  // ambdós weights parsegen a la mateixa unitat base.
  // Cost = popular.price × (item_weight / popular_weight) × qty_multiplier.
  // Si l'usuari té un override de price, el seu valor mana sense proporció
  // (cas "preu fix definit per l'usuari", paral·lel al item.weight override).
  if (!itemHasOverridePrice && popPrice !== null && item.weight) {
    const popularBase = popular.weight ? _parseWeightToBase(popular.weight) : null;
    const itemBase = _parseWeightToBase(item.weight);
    if (popularBase && itemBase
        && popularBase.unit === itemBase.unit
        && popularBase.value > 0) {
      const ratio = itemBase.value / popularBase.value;
      const qtyNum = (typeof parseQtyNumber === 'function') ? parseQtyNumber(item.qty) : null;
      const qtyMultiplier = (qtyNum !== null && qtyNum > 1) ? qtyNum : 1;
      const cost = popPrice * ratio * qtyMultiplier;
      if (typeof cost !== 'number' || !isFinite(cost) || cost <= 0) return null;
      return Math.round(cost * 100) / 100;
    }
  }

  // Fallback al càlcul existent (synth + getProductPrice):
  // - override item.price (s'aplica sense proporció)
  // - sense item.weight (no es pot calcular ratio)
  // - weights incompatibles (pes vs volum) o no parsejables
  const effectivePrice = itemHasOverridePrice ? item.price : popPrice;
  if (effectivePrice === null || effectivePrice <= 0) return null;

  const effectiveWeight = item.weight || (popular ? popular.weight : null);

  const synth = {
    emoji: item.emoji || (popular ? popular.emoji : null),
    qty: item.qty,
    weight: effectiveWeight,
    price: effectivePrice
  };
  const cost = getProductPrice(synth);
  if (typeof cost !== 'number' || !isFinite(cost) || cost <= 0) return null;
  return Math.round(cost * 100) / 100;
}

// Suma estimada per als items pendents d'una llista; retorna també
// quants no s'han pogut estimar perquè el resum pugui dir "8 amb preu
// · 4 sense". Retorna null si la llista és buida.
function getTotalEstimatedCost(items) {
  if (!items || items.length === 0) return null;
  const populars = (typeof getPopularProducts === 'function') ? (getPopularProducts() || []) : [];
  const popularByName = {};
  populars.forEach(p => { if (p && p.name) popularByName[p.name.toLowerCase()] = p; });
  let total = 0;
  let countWithPrice = 0;
  let countWithoutPrice = 0;
  items.forEach(item => {
    const c = getEstimatedItemCost(item, popularByName);
    if (c !== null) { total += c; countWithPrice++; }
    else countWithoutPrice++;
  });
  return {
    total: Math.round(total * 100) / 100,
    countWithPrice,
    countWithoutPrice
  };
}

// Format catalanitzat: "1,20 €". Apliquem `toLocaleString` quan
// existeix per agrupació de milers; fallback simple per a entorns
// sense Intl.
function _formatEur(amount) {
  const n = Number(amount) || 0;
  try {
    return n.toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
  } catch (e) {
    return n.toFixed(2).replace('.', ',') + '€';
  }
}

// Resol la categoria d'un shopping item. Els shopping items no porten
// cap referència al popular d'origen (vegeu addToShoppingList — només
// guarden name/emoji), així que provem primer una concordança per nom
// amb els populars per honorar qualsevol assignació manual de categoria
// que l'usuari hagi fet a la pantalla de populars; si no hi ha popular,
// caem a la detecció heurística sobre el mateix item.
function _resolveShoppingItemCategory(item, popularByName, itemCats) {
  if (!item || !window.CategoriesSystem) return 'cat_other';
  if (item.name && popularByName) {
    const popular = popularByName[item.name.toLowerCase()];
    if (popular) {
      const cid = itemCats[popular.id];
      if (cid) return cid;
      return window.CategoriesSystem.detectCategoryForItem(popular);
    }
  }
  return window.CategoriesSystem.detectCategoryForItem(item);
}

// Builder d'una fila .shopping-item (compartit entre el render
// cronològic i l'agrupat per categoria). Retorna l'element ja preparat
// per appendChild — IMPORTANT: cap addEventListener aquí, l'acció va
// per delegació a _initShopsActionsDelegate (vegeu el comentari extens
// allà sobre per què: amb loop:true Swiper clona slides i els
// listeners directes es perden).
// Format del nom amb qty + weight al BuyMe. Patró coherent amb
// _renderLotRow al BiteMe: "qty × weight" si tots dos hi són amb
// formats diferents (dedup case + spaces). Si només qty o només
// weight, mostra el segment sol. Si cap, només el nom.
function _formatShoppingNameWithWeight(name, qty, weight) {
  const safeName = escapeHtml(name || '');
  const qtyTrim = (qty == null) ? '' : String(qty).trim();
  const weightTrim = weight ? String(weight).trim() : '';
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
  const showWeight = !!weightTrim && norm(weightTrim) !== norm(qtyTrim);
  let combo = '';
  if (qtyTrim && showWeight) {
    // qty==1 amb contingut: suprimim el "1 ×" i mostrem només el contingut
    // ("1L" / "6x33cl" / "12u"). qty>1: "N × contingut" ("2 × 250g").
    combo = (qtyTrim === '1') ? weightTrim : (qtyTrim + ' × ' + weightTrim);
  }
  else if (qtyTrim) combo = qtyTrim;
  else if (showWeight) combo = weightTrim;
  if (!combo) return safeName;
  return safeName + '<span class="prod-qty">' + escapeHtml(combo) + '</span>';
}

function _buildShoppingItemRow(item, opts) {
  const o = opts || {};
  const mode = o.mode || 'view';
  const showArrows = o.showArrows !== false;
  const isFirst = !!o.isFirst;
  const isLast = !!o.isLast;
  const cost = (typeof o.cost === 'number' && isFinite(o.cost) && o.cost > 0) ? o.cost : null;

  // Resol el weight a mostrar: prioritza item.weight (override per item)
  // i, si no n'hi ha, cau al popular catalogat per nom. Render coherent
  // amb _renderLotRow del BiteMe ("qty × weight" si tots dos hi són).
  let weightText = item.weight ? String(item.weight) : '';
  if (!weightText) {
    const populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
    if (Array.isArray(populars)) {
      const key = String(item.name || '').toLowerCase().trim();
      let popular = populars.find(p => p && p.name && p.name.toLowerCase().trim() === key);
      // Fallback "mateix producte" (tokens stemmed) quan el nom exacte falla.
      if (!popular && typeof cookmeSameProduct === 'function') {
        popular = populars.find(p => p && p.name && cookmeSameProduct(item.name, p.name));
      }
      if (popular && popular.weight) weightText = String(popular.weight);
    }
  }
  const nameLine = _formatShoppingNameWithWeight(item.name, item.qty, weightText);

  const div = document.createElement('div');
  div.className = 'shopping-item' + (mode === 'edit' ? ' shopping-item-edit-mode' : '');
  // data-item-id al .shopping-item habilita la delegació de long-press
  // i el toggle de selecció múltiple — vegeu _onShoppingTouchStart.
  div.dataset.itemId = item.id;
  const meta = item.notes ? `<p class="shopping-item-meta">${escapeHtml(item.notes)}</p>` : '';
  const costHtml = cost !== null ? `<p class="shopping-item-cost">~${_formatEur(cost)}</p>` : '';

  if (mode === 'edit') {
    const arrowsHtml = showArrows ? `
        <div class="shopping-item-arrows">
          <button class="arrow-btn ${isFirst ? 'arrow-disabled' : ''}" data-action="up" data-item-id="${item.id}" ${isFirst ? 'disabled' : ''} aria-label="Up">▲</button>
          <button class="arrow-btn ${isLast ? 'arrow-disabled' : ''}" data-action="down" data-item-id="${item.id}" ${isLast ? 'disabled' : ''} aria-label="Down">▼</button>
        </div>` : '';
    div.innerHTML = `
        <div class="shopping-item-emoji">${item.emoji}</div>
        <div class="shopping-item-info">
          <p class="shopping-item-name">${nameLine}</p>
          ${meta}
          ${costHtml}
        </div>${arrowsHtml}
        <button class="shopping-item-edit" data-action="edit" data-id="${item.id}" data-item-id="${item.id}" aria-label="Edit">✏️</button>
      `;
  } else {
    div.innerHTML = `
        <div class="shopping-item-emoji">${item.emoji}</div>
        <div class="shopping-item-info">
          <p class="shopping-item-name">${nameLine}</p>
          ${meta}
          ${costHtml}
        </div>
        <button class="shopping-item-bought" data-action="bought" data-id="${item.id}" data-item-id="${item.id}" aria-label="Bought">
          <span style="font-size:18px">✅</span>
          <span data-i18n="bought">${t('bought')}</span>
        </button>
      `;
  }
  return div;
}

// ============================================
// Ordre de categories PER SUPER al BuyMe
// ============================================
// Cada super pot tenir el seu ordre de categories diferent (la
// disposició física del super real). Settings → Gestió de categories
// segueix amb el camp `order` global (ordre per defecte usat si un
// super NO té override). cat_other sempre l'última.
//
// Format al localStorage 'eatmefirst_category_order_by_super':
//   {
//     "mercadona-id-xxx": ["cat_fruits", "cat_vegetables", ...],
//     "bonpreu-id-yyy":   ["cat_meat", "cat_dairy", ...]
//   }
// Categories no presents a l'array hereten l'ordre global. cat_other
// sempre al final, mai a l'array (és l'última fixa).

const CATEGORY_ORDER_BY_SUPER_KEY = 'eatmefirst_category_order_by_super';

function _readCategoryOrderMap() {
  try {
    const raw = localStorage.getItem(CATEGORY_ORDER_BY_SUPER_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch (e) { return {}; }
}

function _writeCategoryOrderMap(map) {
  try {
    localStorage.setItem(CATEGORY_ORDER_BY_SUPER_KEY, JSON.stringify(map));
  } catch (e) {}
  if (typeof pushToServer === 'function') pushToServer();
}

// Retorna les categories ordenades segons override del super (si en
// té) + restants per ordre global + cat_other sempre l'última.
function _getCategoryOrderForSuper(superId, allCategories) {
  const sorted = (cats) => cats.slice().sort((a, b) => {
    const oa = (typeof a.order === 'number') ? a.order : 999;
    const ob = (typeof b.order === 'number') ? b.order : 999;
    return oa - ob;
  });
  const map = _readCategoryOrderMap();
  const superOrder = superId ? map[superId] : null;
  if (!Array.isArray(superOrder) || superOrder.length === 0) {
    return sorted(allCategories);
  }
  // Aplica override del super
  const positioned = [];
  const remaining = allCategories.slice();
  superOrder.forEach(id => {
    const idx = remaining.findIndex(c => c.id === id);
    if (idx >= 0) positioned.push(remaining.splice(idx, 1)[0]);
  });
  // Categories restants per ordre global. cat_other té order:99 a
  // DEFAULT_CATEGORIES (categories.js:41), així que el sort la deixa
  // al final naturalment.
  return positioned.concat(sorted(remaining));
}

// Mou una categoria amunt/avall a l'ordre del super donat. Retorna
// true si hi ha hagut canvi efectiu. Si el super no té override
// encara, inicialitza l'array amb l'ordre global actual (excloent
// cat_other, que sempre va al final).
function _moveCategoryInSuper(superId, catId, direction) {
  if (!superId || !catId) return false;
  if (!window.CategoriesSystem || typeof window.CategoriesSystem.getCategories !== 'function') return false;
  const map = _readCategoryOrderMap();
  if (!Array.isArray(map[superId])) {
    const cats = window.CategoriesSystem.getCategories()
      .filter(c => !c.isCatchAll)
      .sort((a, b) => {
        const oa = (typeof a.order === 'number') ? a.order : 999;
        const ob = (typeof b.order === 'number') ? b.order : 999;
        return oa - ob;
      })
      .map(c => c.id);
    map[superId] = cats;
  }
  const arr = map[superId];
  const idx = arr.indexOf(catId);
  if (idx < 0) return false;
  const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (neighborIdx < 0 || neighborIdx >= arr.length) return false;
  const tmp = arr[idx];
  arr[idx] = arr[neighborIdx];
  arr[neighborIdx] = tmp;
  _writeCategoryOrderMap(map);
  return true;
}

function _renderShopPageItems(smId, listEl, mode) {
  listEl.innerHTML = '';
  const items = getShoppingItemsBySupermarket(smId);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'shopping-empty-celebration';
    empty.innerHTML = `
      <div class="celebrate-emoji">🎉</div>
      <p class="celebrate-title">${t('shoppingDone')}</p>
      <p class="celebrate-sub">${t('shoppingDoneSub')}</p>
    `;
    listEl.appendChild(empty);
    return;
  }

  // Indexem els populars per nom (lowercase) un sol cop per a aquesta
  // crida. Ho necessitem tant per a l'agrupació per categoria com per
  // al càlcul del cost individual (getEstimatedItemCost), així que ho
  // fem AbANS de bifurcar segons mode.
  const populars = (typeof getPopularProducts === 'function') ? (getPopularProducts() || []) : [];
  const popularByName = {};
  populars.forEach(p => { if (p && p.name) popularByName[p.name.toLowerCase()] = p; });

  const viewMode = getBuyMeViewMode(smId);
  const useCategory = viewMode === 'category'
    && window.CategoriesSystem
    && typeof window.CategoriesSystem.getCategories === 'function';

  if (!useCategory) {
    items.forEach((item, idx) => {
      listEl.appendChild(_buildShoppingItemRow(item, {
        mode,
        showArrows: true,
        isFirst: idx === 0,
        isLast: idx === items.length - 1,
        cost: getEstimatedItemCost(item, popularByName)
      }));
    });
    return;
  }

  // ----- Mode "Per categoria" -----
  const itemCats = (typeof window.CategoriesSystem.getItemCategories === 'function')
    ? window.CategoriesSystem.getItemCategories() : {};

  // Agrupem mantenint l'ordre original (cronològic) dins de cada
  // categoria — l'ordre d'aparició del primer item d'una categoria
  // determinaria l'ordre dels grups si no estableixíssim un ordre
  // canònic, però aquí seguim l'ordre de la pantalla de Categories
  // (camp `order`). "Altres" queda al final perquè té order=99.
  const grouped = {};
  items.forEach(item => {
    const cid = _resolveShoppingItemCategory(item, popularByName, itemCats) || 'cat_other';
    if (!grouped[cid]) grouped[cid] = [];
    grouped[cid].push(item);
  });

  // Ordre PER SUPER (vegeu _getCategoryOrderForSuper a dalt). Si el
  // super no té override, cau a l'ordre global de Settings (camp
  // `order`). cat_other sempre l'última.
  const cats = _getCategoryOrderForSuper(smId, window.CategoriesSystem.getCategories());

  // Primera i última categoria movibles segons l'ordre resultat —
  // pot diferir entre supers. Servirà per disabled del ▲ a la primera
  // i ▼ a l'última.
  const movables = cats.filter(c => !c.isCatchAll);
  const firstMovableId = movables.length > 0 ? movables[0].id : null;
  const lastMovableId = movables.length > 0 ? movables[movables.length - 1].id : null;

  // Botons ▲▼ només en mode edit (✏️ actiu). Coherent amb la resta
  // de l'UX d'edició de l'app.
  const isEditMode = mode === 'edit';

  cats.forEach(cat => {
    const groupItems = grouped[cat.id];
    if (!groupItems || groupItems.length === 0) return;
    const header = document.createElement('div');
    header.className = 'category-section-header';
    const isCatchAll = !!cat.isCatchAll;
    const isFirstMovable = cat.id === firstMovableId;
    const isLastMovable = cat.id === lastMovableId;
    // Botons NO per a cat_other (sempre fixa al final) ni en mode
    // 'view'. Reutilitzem .cat-move-btn de Settings (zero CSS nou).
    const moveBtnsHtml = (isCatchAll || !isEditMode) ? '' : (
      '<button type="button" class="cat-move-btn cat-move-up" data-cat-id="' + escapeHtml(cat.id) + '"' + (isFirstMovable ? ' disabled' : '') + ' aria-label="Pujar">▲</button>' +
      '<button type="button" class="cat-move-btn cat-move-down" data-cat-id="' + escapeHtml(cat.id) + '"' + (isLastMovable ? ' disabled' : '') + ' aria-label="Baixar">▼</button>'
    );
    header.innerHTML = `
      <span class="cat-section-icon">${escapeHtml(cat.icon || '📦')}</span>
      <span class="cat-section-name">${escapeHtml(cat.name || cat.id)}</span>
      <span class="cat-section-count">(${groupItems.length})</span>
      ${moveBtnsHtml}
    `;
    // Els clicks dels botons ▲▼ es gestionen via delegació central
    // a _initShopsActionsDelegate (case .cat-move-btn). Listeners
    // directes aquí NO sobreviurien al clonatge de slides que fa
    // Swiper amb loop:true — mateix patró que els botons d'acció
    // dels items.
    listEl.appendChild(header);
    groupItems.forEach(item => {
      // Sense fletxes en mode agrupat: l'índex global per supermercat
      // (sobre el qual opera moveShoppingItem) no es correspon amb la
      // posició visible dins del grup, així que reordenar amb fletxes
      // saltaria entre categories de manera confusa. Mateix patró que
      // a js/populars.js (line ~598) quan el filtre per categoria
      // està actiu.
      listEl.appendChild(_buildShoppingItemRow(item, {
        mode,
        showArrows: false,
        cost: getEstimatedItemCost(item, popularByName)
      }));
    });
  });
}

// Event delegation per als botons d'acció dins dels .shop-page del
// shopsSwiper. Es registra UN sol cop al contenidor #shops-slider
// (guardat amb dataset.actionsDelegated). Sobreviu el clonatge de
// slides que fa Swiper amb loop:true — al contrari dels listeners
// directes als botons, que es perdien al clone i feien que la
// primera/última botiga no respongués al voltant de la costura del
// loop. Aquesta és l'opció A del diagnòstic del BuyMe-mobile bug.
// No-op per compatibilitat amb la crida des de renderSupermarkets. El tap
// ja no es resol amb un listener 'click' (el cube de Swiper pot empassar-se
// el click i, amb la rotació 3D, el reapunta) sinó amb el detector pointerup
// compartit d'app.js, que crida _handleShopsTap(target) amb el target del
// pointerdown. Mateix patró que el CookMe (fece010).
function _initShopsActionsDelegate() { /* tap resolt via pointerup a app.js */ }

// Resol un tap sobre el cub de supermercats a partir del target del
// pointerdown. Cos extret de l'antic listener 'click'.
function _handleShopsTap(targetEl) {
  const slider = document.getElementById('shops-slider');
  if (!slider || !targetEl || !targetEl.closest) return;
  // === A) Botons d'acció dels items ([data-action][data-item-id]) ===
  const btn = targetEl.closest('[data-action][data-item-id]');
  if (btn && slider.contains(btn)) {
    if (btn.disabled) return;
    const action = btn.dataset.action;
    const itemId = btn.dataset.itemId;
    if (!action || !itemId) return;
    // Trobem l'item a la llista global. shoppingItems és l'array
    // global; els items tenen un id únic. (És el mateix patró que
    // moveShoppingItem usa internament a js/shops.js.)
    const item = (Array.isArray(shoppingItems) ? shoppingItems : []).find(it => it.id === itemId);
    if (!item) return;
    if (action === 'bought') {
      buyShoppingItem(item);
    } else if (action === 'edit') {
      openShoppingItemEdit(item);
    } else if (action === 'up' || action === 'down') {
      // moveShoppingItem(idx, ±1) treballa amb l'índex DINS de la
      // llista d'items del super actual. Calculem-lo a partir de
      // l'item.id.
      const supItems = getShoppingItemsBySupermarket(currentSupermarketId);
      const idx = supItems.findIndex(it => it.id === itemId);
      if (idx < 0) return;
      moveShoppingItem(idx, action === 'up' ? -1 : 1);
    }
    return;
  }

  // === B) Botons ▲▼ de reorder de categories (.cat-move-btn) ===
  // Via delegació perquè els headers viuen dins de .shop-page que
  // Swiper amb loop:true clona. Listeners directes no sobreviuen
  // als clones — vegeu el comentari a _renderShopPageItems sobre
  // per què els ▲▼ NO tenen addEventListener directe. El superId
  // ve del .shop-page pare (data-sm-id), no de currentSupermarketId,
  // perquè un clone pot estar visible sense ser el currentSuper.
  const moveBtn = targetEl.closest('.cat-move-btn');
  if (moveBtn && slider.contains(moveBtn)) {
    if (moveBtn.disabled) return;
    const catId = moveBtn.dataset.catId;
    const page = moveBtn.closest('.shop-page');
    const superId = page && page.dataset ? page.dataset.smId : null;
    if (!catId || !superId) return;
    const isUp = moveBtn.classList.contains('cat-move-up');
    const direction = isUp ? 'up' : 'down';
    if (_moveCategoryInSuper(superId, catId, direction) && typeof renderShoppingItems === 'function') {
      renderShoppingItems();
    }
  }
}

// No-op stub: la sincronització "swipe → currentSupermarketId" la fa
// el callback slideChange dins de _ensureShopsSwiper. Conservem la
// funció perquè renderShoppingItems la cridava abans i podria
// quedar-ne alguna referència.
function _setupShopsSliderScrollListener() {}


// =========================================================
//   SELECCIÓ MÚLTIPLE A BUYME (long press) — Fase C-2 de Spaces
// =========================================================
// Mateix patró que la selecció de productes EatMe (vegeu biteme.js):
// long-press sobre un .shopping-item dins #shops-slider entra en
// mode selecció; taps simples toggle altres items. Comparteix la
// toolbar genèrica #selection-toolbar amb la versió EatMe — només
// una mode pot estar activa alhora (l'enter d'una surt l'altra).
let _shoppingSelectionMode = false;
let _shoppingSelectedIds = new Set();
let _shoppingLongPressTimer = null;
let _shoppingLongPressTriggered = false;
const _SHOPPING_LONG_PRESS_MS = 600;

function _exitShoppingSelectionMode() {
  if (!_shoppingSelectionMode) return;
  _shoppingSelectionMode = false;
  _shoppingSelectedIds.clear();
  document.body.classList.remove('selection-mode-active');
  const toolbar = document.getElementById('selection-toolbar');
  if (toolbar) toolbar.style.display = 'none';
  // El botó "Comprar tots" només té sentit per a la selecció del BuyMe; el
  // tornem a amagar per que no aparegui si l'usuari entra després al mode
  // selecció dels productes EatMe (LevelsSelection no toca aquest botó).
  const buyAllBtn = document.getElementById('btn-selection-buy-all');
  if (buyAllBtn) buyAllBtn.style.display = 'none';
  document.querySelectorAll('#shops-slider .shopping-item.is-selected').forEach(el => {
    el.classList.remove('is-selected');
  });
}

function _enterShoppingSelectionMode(initialId) {
  // Defensiu: surt de qualsevol altra selecció activa abans (EatMe).
  if (window.LevelsSelection && window.LevelsSelection.isActive && window.LevelsSelection.isActive()) {
    window.LevelsSelection.exit();
  }
  _shoppingSelectionMode = true;
  _shoppingSelectedIds.clear();
  document.body.classList.add('selection-mode-active');
  const toolbar = document.getElementById('selection-toolbar');
  if (toolbar) toolbar.style.display = 'flex';
  // Mostrem el botó "Comprar tots" — exclusiu d'aquesta selecció (BuyMe).
  // LevelsSelection (productes EatMe) no el toca, així que es manté amagat
  // quan estàs en aquell mode. _exitShoppingSelectionMode el torna a amagar.
  const buyAllBtn = document.getElementById('btn-selection-buy-all');
  if (buyAllBtn) buyAllBtn.style.display = '';
  if (initialId) _toggleShoppingSelection(initialId);
}

function _toggleShoppingSelection(id) {
  if (!id) return;
  if (_shoppingSelectedIds.has(id)) _shoppingSelectedIds.delete(id);
  else _shoppingSelectedIds.add(id);
  document.querySelectorAll('#shops-slider .shopping-item[data-item-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]').forEach(el => {
    el.classList.toggle('is-selected', _shoppingSelectedIds.has(id));
  });
  const counter = document.getElementById('selection-count');
  if (counter) counter.textContent = (typeof t === 'function')
    ? t('selectionCount', _shoppingSelectedIds.size)
    : String(_shoppingSelectedIds.size);
  if (_shoppingSelectedIds.size === 0) _exitShoppingSelectionMode();
}

function _onShoppingTouchStart(e) {
  // Marquem long-press sobre els .shopping-item, NO sobre els botons
  // d'acció dins (bought/edit/up/down). Si el touch ha caigut sobre un
  // d'aquests, deixem-lo en pau — l'acció normal s'encarrega.
  const item = e.target.closest && e.target.closest('#shops-slider .shopping-item');
  if (!item || !item.dataset.itemId) return;
  if (_shoppingLongPressTimer) clearTimeout(_shoppingLongPressTimer);
  _shoppingLongPressTriggered = false;
  const targetId = item.dataset.itemId;
  _shoppingLongPressTimer = setTimeout(() => {
    _shoppingLongPressTimer = null;
    _shoppingLongPressTriggered = true;
    if (!_shoppingSelectionMode) _enterShoppingSelectionMode(targetId);
    else _toggleShoppingSelection(targetId);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(40); } catch (e) {}
    }
  }, _SHOPPING_LONG_PRESS_MS);
}

function _cancelShoppingLongPress() {
  if (_shoppingLongPressTimer) {
    clearTimeout(_shoppingLongPressTimer);
    _shoppingLongPressTimer = null;
  }
}

// Click handler en mode selecció: toggleja l'item, suprimint l'acció
// normal del bought/edit/up/down (els botons d'acció queden deshabilitats
// visualment via pointer-events:none al CSS). Capture phase perquè
// fireja ABANS del listener bubble de _initShopsActionsDelegate.
function _onShoppingItemClickInSelection(e) {
  if (!_shoppingSelectionMode) return;
  const item = e.target.closest && e.target.closest('#shops-slider .shopping-item');
  if (!item || !item.dataset.itemId) return;
  // Suprimeix el click sintètic post-long-press perquè el toggle no es
  // desfaci immediatament.
  if (_shoppingLongPressTriggered) {
    _shoppingLongPressTriggered = false;
    e.stopPropagation();
    return;
  }
  e.stopPropagation();
  e.preventDefault();
  _toggleShoppingSelection(item.dataset.itemId);
}

if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', _onShoppingTouchStart, { passive: true });
  document.addEventListener('touchend', _cancelShoppingLongPress);
  document.addEventListener('touchmove', _cancelShoppingLongPress, { passive: true });
  document.addEventListener('touchcancel', _cancelShoppingLongPress);
  document.addEventListener('mousedown', _onShoppingTouchStart);
  document.addEventListener('mouseup', _cancelShoppingLongPress);
  document.addEventListener('mouseleave', _cancelShoppingLongPress);
  // capture: true perquè agafem el click ABANS del listener bubble que
  // viu a #shops-slider (_initShopsActionsDelegate). Així evitem que
  // un tap a un .shopping-item en mode selecció dispari accions.
  document.addEventListener('click', _onShoppingItemClickInSelection, true);
}

window.ShoppingSelection = {
  exit: _exitShoppingSelectionMode,
  isActive: () => _shoppingSelectionMode,
  count: () => _shoppingSelectedIds.size,
  getSelectedIds: () => Array.from(_shoppingSelectedIds)
};

// Listener del toggle de visualització (Cronològic / Per categoria).
// Viu fora de #shops-slider — Swiper no clona aquest node, així que
// addEventListener directe és segur (a diferència dels botons d'acció
// dels items, que han d'anar per delegació al pare per sobreviure el
// loop:true). Click → desa el mode per al super actiu, repinta nomes
// les pàgines d'aquest super (querySelectorAll perquè amb loop:true
// pot existir un duplicat) i actualitza la UI del toggle.
(function _wireBuyMeViewToggle() {
  if (typeof document === 'undefined') return;
  if (window.__buyMeViewToggleWired) return;
  window.__buyMeViewToggleWired = true;
  document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.getElementById('buyme-view-toggle');
    if (!wrapper) return;
    wrapper.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('.view-mode-btn');
      if (!btn || !wrapper.contains(btn)) return;
      const mode = btn.dataset.mode;
      if (!mode || !currentSupermarketId) return;
      if (getBuyMeViewMode(currentSupermarketId) === mode) {
        _updateBuyMeViewToggleUI(currentSupermarketId);
        return;
      }
      setBuyMeViewMode(currentSupermarketId, mode);
      _updateBuyMeViewToggleUI(currentSupermarketId);
      // Repintem només les pàgines del super actiu. Mateix patró que
      // slideChange a _ensureShopsSwiper: querySelectorAll cobreix
      // l'original + el clone que Swiper afegeix amb loop:true.
      const slider = document.getElementById('shops-slider');
      if (!slider) return;
      const pages = slider.querySelectorAll('.shop-page[data-sm-id="' + currentSupermarketId + '"]');
      pages.forEach(page => {
        const list = page.querySelector('.shopping-items-list');
        if (!list) return;
        _renderShopPageItems(currentSupermarketId, list, supermarketItemsMode);
        // CRÍTIC per al scroll en mode categoria: en canviar de mode,
        // el contingut de la llista canvia d'altura total (mode
        // categoria afegeix .category-section-header entre items). El
        // scrollTop anterior pot apuntar a una zona que ja no existeix
        // o que visualment sembla "blocada". El reset a 0 fa que el
        // mode nou comenci des de l'inici i el scroll funcioni
        // immediatament — sense això, l'usuari intentava scrollar des
        // d'una posició estranya i percebia el scroll com "trencat".
        list.scrollTop = 0;
      });
      // Defensiu: treu el focus del botó perquè cap navegador retingui
      // l'estat :focus visible (sobretot a mòbil, on el tap manté
      // focus fins al següent toc en una altra zona).
      try { btn.blur(); } catch (e) {}
      // Refresca la cube geometry per si la cromia hagués canviat
      // (paranoia: el cost summary no depèn del mode, però aquesta
      // crida és barata i evita classes senceres de bugs de cube
      // "stale" si en el futur el rendering condicional del mode
      // afecta la cromia superior).
      if (_shopsSwiper) {
        try { _shopsSwiper.update(); } catch (e) {}
      }
    });
  });
})();

// En sortir de #screen-supermarket, surt del mode selecció. Mateixa
// mecànica que el wrapper de showScreen a biteme.js per a #screen-list
// (Fase C). Aquí el wrapper de biteme.js també protegeix el seu mode
// — el d'aquí cobreix el cas dels items de compra.
(function _wrapShowScreenForShoppingSelection() {
  if (typeof window === 'undefined' || typeof window.showScreen !== 'function') return;
  if (window.__shoppingSelectionWrapped) return;
  window.__shoppingSelectionWrapped = true;
  const original = window.showScreen;
  window.showScreen = function (name) {
    const supEl = document.getElementById('screen-supermarket');
    const wasSupActive = !!(supEl && supEl.classList.contains('active'));
    if (wasSupActive && name !== 'supermarket' && _shoppingSelectionMode) {
      _exitShoppingSelectionMode();
    }
    return original.apply(this, arguments);
  };
})();

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
  // Capturem la referència al moment del click (asíncron — el modal es
  // mostra abans del callback). El missatge dinàmic es construeix amb
  // el comptador d'items afectats actual.
  const target = editingSupermarket;
  const itemsCount = getShoppingItemsBySupermarket(target.id).length;
  const msg = itemsCount > 0 ? t('confirmDeleteSupermarketWithItems', itemsCount) : t('confirmDeleteSupermarket');
  showConfirmDangerModal(
    target.emoji || '🛒',
    target.name || 'Supermercat',
    msg,
    () => {
      // Esborra items associats
      shoppingItems = shoppingItems.filter(it => it.supermarketId !== target.id);
      // Esborra supermercat
      supermarkets = supermarkets.filter(s => s.id !== target.id);
      saveShoppingData();
      showToast(t('deleted'));
      openShoppingList();
    }
  );
}

// Afegir/editar item
// Autoomple els camps de la pantalla d'edició/creació de shopping
// item amb les dades del popular catalogat per nom. Només omple
// camps BUITS — preserva el que l'usuari hagi tocat manualment.
// Supermarket i notes mai s'autoomplen (specific per compra).
//
// Cridat des de setupAutocompleteFor (blur + click suggestion).
function _autofillShoppingFromPopular(name) {
  if (!name) return;
  if (typeof getPopularProducts !== 'function') return;
  const populars = getPopularProducts() || [];
  // Comparació insensible a accents/majúscules (commit fix-search).
  // window.normalizeForSearch viu a biteme.js (carregat abans).
  const norm = (typeof window.normalizeForSearch === 'function')
    ? window.normalizeForSearch
    : (s => String(s || '').toLowerCase().trim());
  const key = norm(name);
  const popular = populars.find(p => p && p.name && norm(p.name) === key);
  if (!popular) return;

  // Canonicalització: si l'usuari ha escrit 'sindria' i el popular és
  // 'Síndria', actualitzem el nameInput al nom catalogat perquè el save
  // no creï un registre amb spelling diferent. Atenció: el snapshot
  // _lastAutofillSnapshot NO inclou 'name', només emoji/weight/price/
  // dateStr/noExpiry — aquest canvi a nameInput.value NO afecta la
  // lògica canReplace ni el flow de re-autofill al canviar nom.
  const nameInput = document.getElementById('input-shopping-name');
  if (nameInput && nameInput.value.trim() !== popular.name) {
    nameInput.value = popular.name;
  }

  const snap = _lastAutofillSnapshot;

  // Decideix si un camp es pot sobreescriure: ho és si està buit, o
  // si el valor actual coincideix amb el que el popular ANTERIOR hi
  // havia posat (= no l'ha tocat l'usuari manualment).
  const canReplace = (currentValue, snapshotValue) => {
    if (currentValue === '' || currentValue === null || currentValue === undefined) return true;
    if (snap === null) return false; // primer autoomplert + camp ple = manual
    return currentValue === snapshotValue;
  };

  // Emoji — reemplaçable si snap==null (primer cop) o coincideix amb el snapshot
  if (popular.emoji && (snap === null || selectedShoppingEmoji === snap.emoji || !selectedShoppingEmoji)) {
    selectedShoppingEmoji = popular.emoji;
    if (typeof renderShoppingEmojiPickerBtn === 'function') renderShoppingEmojiPickerBtn();
  }

  // Weight
  const weightInput = document.getElementById('input-shopping-weight');
  if (weightInput && popular.weight && canReplace(weightInput.value.trim(), snap && snap.weight)) {
    weightInput.value = String(popular.weight);
  }

  // Price (comparació numèrica per tolerar "1.2" vs "1.20")
  const priceInput = document.getElementById('input-shopping-price');
  if (priceInput && typeof popular.price === 'number' && popular.price >= 0) {
    const currentRaw = priceInput.value.trim();
    const currentNum = currentRaw === '' ? null : parseFloat(currentRaw.replace(',', '.'));
    const snapPrice = snap ? snap.price : undefined;
    const isReplaceable = currentRaw === '' ||
      (snap !== null && typeof snapPrice === 'number' && currentNum === snapPrice);
    if (isReplaceable) priceInput.value = String(popular.price);
  }

  // Data / noExpiry
  const noExpInput = document.getElementById('input-shopping-no-expiry');
  const dateInput = document.getElementById('input-shopping-date');

  // Pre-calcular dateStr que el popular actual aplicaria (cas no noExpiry)
  let nextDateStr = '';
  if (!popular.noExpiry && popular.days && typeof formatDateForInput === 'function') {
    const d = new Date();
    d.setDate(d.getDate() + popular.days);
    nextDateStr = formatDateForInput(d);
  }

  if (popular.noExpiry) {
    // Reemplaçable si: actualment desmarcat, o snapshot diu que ja era marcat (cap canvi manual)
    const noExpCheckable = noExpInput && (
      !noExpInput.checked ||
      (snap !== null && snap.noExpiry === noExpInput.checked)
    );
    if (noExpCheckable) {
      noExpInput.checked = true;
      if (dateInput) dateInput.value = '';
    }
  } else if (popular.days && dateInput) {
    // Manual si: ara està marcat I (no hi ha snapshot O el snapshot deia
    // false — l'usuari l'ha marcat ell mateix). Si el snapshot deia true,
    // el checkbox ve d'un autoomplert anterior i per tant és reemplaçable.
    const noExpManual = noExpInput && noExpInput.checked && (
      snap === null || snap.noExpiry === false
    );
    if (!noExpManual) {
      // Si el checkbox està marcat per autoomplert anterior (no manual),
      // el desmarquem perquè el nou popular no és sense data.
      if (noExpInput && noExpInput.checked) {
        noExpInput.checked = false;
      }
      if (canReplace(dateInput.value, snap && snap.dateStr)) {
        dateInput.value = nextDateStr;
      }
    }
  }
  if (dateInput && typeof window._syncDateEmptyState === 'function') window._syncDateEmptyState(dateInput);

  // Actualitzem el snapshot amb el popular que acabem d'aplicar.
  _lastAutofillSnapshot = {
    emoji: popular.emoji || '',
    weight: popular.weight ? String(popular.weight) : '',
    price: (typeof popular.price === 'number') ? popular.price : undefined,
    dateStr: nextDateStr,
    noExpiry: !!popular.noExpiry
  };
}

function openShoppingItemEdit(item) {
  editingShoppingItem = item;
  const isNew = !item;
  // Reset del snapshot d'autoomplert: qualsevol obertura de la pantalla
  // comença net (no recordem el popular aplicat a una sessió anterior).
  _lastAutofillSnapshot = null;
  document.getElementById('shopping-item-edit-title').textContent =
    isNew ? t('newShoppingItem') : t('editShoppingItem');
  document.getElementById('input-shopping-name').value = isNew ? '' : item.name;
  document.getElementById('input-shopping-qty').value = isNew ? '' : (item.qty || '');
  document.getElementById('input-shopping-notes').value = isNew ? '' : (item.notes || '');
  selectedShoppingEmoji = isNew ? '🥛' : item.emoji;

  // Preu i pes: el shopping item no els persisteix (la font de veritat és
  // el popular catalogat amb el mateix nom). Quan editem, els pre-omplim
  // del popular si existeix per donar contingut útil; quan és nou, també
  // mirem si ja en tenim un de catalogat (el formulari "Afegir manualment"
  // pot ser només una entrada ràpida sobre un producte ja conegut).
  const priceInput = document.getElementById('input-shopping-price');
  const weightInput = document.getElementById('input-shopping-weight');
  if (priceInput) priceInput.value = '';
  if (weightInput) weightInput.value = '';
  // Prioritzar overrides per item (definits per l'usuari) per damunt
  // del popular catalogat. Si l'usuari no els ha tocat mai, cauen al popular.
  if (priceInput && !isNew && item && typeof item.price === 'number' && item.price >= 0) {
    priceInput.value = String(item.price);
  }
  if (weightInput && !isNew && item && item.weight) {
    weightInput.value = String(item.weight);
  }
  if (!isNew && item && item.name && typeof getPopularProducts === 'function') {
    const populars = getPopularProducts() || [];
    const key = String(item.name).toLowerCase().trim();
    let popular = populars.find(p => p.name && p.name.toLowerCase().trim() === key);
    // Fallback "mateix producte" (tokens stemmed): "albergínies" → catàleg "Albergínia".
    if (!popular && typeof cookmeSameProduct === 'function') {
      popular = populars.find(p => p && p.name && cookmeSameProduct(item.name, p.name)) || popular;
    }
    if (popular && typeof _autofillShoppingFromPopular === 'function') {
      // Omple TOTS els camps del popular (emoji/contingut/preu/data/noExpiry)
      // només on estiguin buits (canReplace + snapshot null protegeix els
      // overrides de l'usuari, escrits a 1494-1499). Passem el nom CANÒNIC
      // perquè el lookup intern (normalizeForSearch) no plega plurals.
      _autofillShoppingFromPopular(popular.name);
    }
  }

  const dateInput = document.getElementById('input-shopping-date');
  const noExpInput = document.getElementById('input-shopping-no-expiry');
  if (dateInput && noExpInput) {
    if (isNew) {
      // Camp buit en mode nou: el default avui+7 bloquejava
      // _autofillShoppingFromPopular perquè canReplace(currentValue ple,
      // snap=null) retorna false (camp ple + sense snapshot = considerat
      // manual). Amb el camp buit, l'autoomplert pot aplicar la data
      // del popular detectat. Si l'usuari escriu un nom no catalogat,
      // el camp queda buit i pot clicar un chip (+3/+7/+14/+30) o
      // escriure data manual; si no fa res, l'item es desa amb
      // date:null (saveShoppingItem ja gestiona `date || null`).
      dateInput.value = '';
      noExpInput.checked = false;
    } else {
      noExpInput.checked = !!item.noExpiry;
      dateInput.value = (!item.noExpiry && item.date) ? item.date : '';
    }
    if (typeof window._syncDateEmptyState === 'function') window._syncDateEmptyState(dateInput);
  }

  const delBtn = document.getElementById('btn-delete-shopping-item');
  if (delBtn) delBtn.style.display = isNew ? 'none' : 'block';

  // Visibilitat del botó "Moure a un altre Espai" (Fase B). Mostrem
  // només si estem editant un item ja desat (isNew=false) i hi ha
  // algun altre Espai destí amb syncCode.
  if (typeof window.refreshMoveShoppingItemBtn === 'function') {
    try { window.refreshMoveShoppingItemBtn(!isNew); } catch (e) {}
  }

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

// Cerca productes a l'EatMe amb el mateix nom (igualtat normalitzada).
// S'utilitza per avisar abans d'afegir duplicats a la llista de la compra.
// Normalització: lowercase + trim + col·lapsa espais múltiples → un sol
// espai. Així "Suc  de taronja" (doble espai) i "suc de taronja" matchegen.
// Abans usàvem substring bidireccional (`a.includes(b) || b.includes(a)`)
// que produïa fals positius: escriure "Pastís" matchejava "Pa" perquè
// "pastís".includes("pa") = true. Mateix bug per Vi/Vinagre, Sal/Salsitxes,
// Te/Tetera, All/Allioli, etc. Igualtat estricta després de normalitzar
// elimina tota aquesta classe de bugs i és determinista.
function findExistingAtHome(name) {
  if (!name) return [];
  const norm = s => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const target = norm(name);
  if (!target) return [];
  return products.filter(p => norm(p.name) === target);
}

// Cerca un ítem ja existent a la llista de la compra del MATEIX supermercat
// amb el mateix nom (normalitzat accent/majúscules) I el mateix weight.
// Regla (decisió 31/05 revisada): el weight SÍ entra a la clau —
//   · tots dos amb weight  → han de coincidir (case-insensitive: "500G"=="500g")
//   · tots dos sense weight → duplicat (només compta el nom)
//   · un amb weight, l'altre no → NO duplicat (productes diferents)
// Compara el weight PROPI de l'ítem (it.weight), no el fallback al popular.
// `excludeId` permet excloure's a si mateix (no s'usa: només en crear nous).
function findDuplicateInSupermarket(name, weight, supermarketId, excludeId, useCanonical) {
  const target = normalizeForSearch(name);
  if (!target) return null;
  const normW = w => String(w || '').trim().toLowerCase();
  const targetW = normW(weight);
  // Per defecte (formulari manual): igualtat de nom EXACTA normalitzada (sense
  // canvis). Amb useCanonical=true (adds programàtics via addToShoppingList):
  // "mateix producte" per tokens stemmed (albergínia≡albergínies). El weight
  // segueix a la clau en tots dos casos. Guard de runtime + fallback a exacte.
  const canon = !!useCanonical && (typeof cookmeSameProduct === 'function');
  const nameMatch = it => canon ? cookmeSameProduct(name, it) : (normalizeForSearch(it) === target);
  return shoppingItems.find(it =>
    it.supermarketId === supermarketId &&
    it.id !== excludeId &&
    nameMatch(it.name) &&
    normW(it.weight) === targetW
  ) || null;
}

// Quan ve marcat a true, saveShoppingItem salta la comprovació "ja en tens"
// (perquè l'usuari ja l'ha vista i confirmada en un pas previ).
let skipExistingCheckOnNextSave = false;

function saveShoppingItem() {
  const name = document.getElementById('input-shopping-name').value.trim();
  if (!name) { showToast(t('nameRequired')); return; }
  const qty = document.getElementById('input-shopping-qty').value.trim();
  const notes = document.getElementById('input-shopping-notes').value.trim();
  const dateInput = document.getElementById('input-shopping-date');
  const noExpInput = document.getElementById('input-shopping-no-expiry');
  const noExpiry = !!(noExpInput && noExpInput.checked);
  const date = (!noExpiry && dateInput) ? dateInput.value : '';

  // Preu i pes opcionals — propagaran al popular catalogat (no els
  // persistim al shopping item). Parseig idèntic al de saveNewProduct
  // (js/biteme.js): acceptem coma o punt com a separador decimal.
  const priceInput = document.getElementById('input-shopping-price');
  let price = null;
  if (priceInput) {
    const raw = String(priceInput.value || '').trim().replace(',', '.');
    if (raw !== '') {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed >= 0) price = Math.round(parsed * 100) / 100;
    }
  }
  const weightInput = document.getElementById('input-shopping-weight');
  // Validem i normalitzem al format canònic per coherència amb el BiteMe
  // ("1l" → "1L", "500 g" → "500g"). Rebutgem text lliure / números
  // sense unitat / ≤0 (bloqueja el desat amb toast).
  let weightNormalized = '';
  if (weightInput) {
    const wv = (typeof validateWeight === 'function')
      ? validateWeight(weightInput.value)
      : { valid: true, normalized: String(weightInput.value || '').trim() };
    if (!wv.valid) {
      weightInput.classList.add('input-invalid');
      showToast(t('weightInvalid'));
      return;
    }
    weightInput.classList.remove('input-invalid');
    weightNormalized = wv.normalized;
  }
  const hasPrice = price !== null;
  const hasWeight = weightNormalized !== '';

  // Aprenentatge: desem al catàleg de populars perquè la propera vegada
  // (i el càlcul de cost al BuyMe) tinguin emoji+dies+price+weight. El
  // gate original era `noExpiry || days` — l'estenem perquè un usuari
  // que omple només preu/pes (sense data) també vegi el cost a la llista.
  const learnPopular = () => {
    if (typeof addToCustomPopular !== 'function') return;
    let days = null;
    if (date) {
      const diff = daysUntil(date);
      if (Number.isFinite(diff) && diff > 0) days = diff;
    }
    if (noExpiry || days || hasPrice || hasWeight) {
      addToCustomPopular(name, selectedShoppingEmoji, days, null, noExpiry, price, weightNormalized);
    }
  };

  if (editingShoppingItem) {
    const originalSupermarketId = editingShoppingItem.supermarketId;
    editingShoppingItem.name = name;
    editingShoppingItem.emoji = selectedShoppingEmoji;
    editingShoppingItem.qty = qty;
    editingShoppingItem.notes = notes;
    editingShoppingItem.date = noExpiry ? null : (date || null);
    editingShoppingItem.noExpiry = noExpiry;
    // Override per item: persisteix el weight si l'usuari l'ha posat.
    // Buit → eliminem l'override (fallback al popular al render).
    if (weightNormalized) editingShoppingItem.weight = weightNormalized;
    else delete editingShoppingItem.weight;
    // Mateix patró per al price: override per item té prioritat per
    // damunt del popular catalogat al càlcul de cost.
    if (price !== null) editingShoppingItem.price = price;
    else delete editingShoppingItem.price;
    // Aplicar canvi de botiga si l'usuari l'ha canviada
    const shopSelect = document.getElementById('input-shopping-shop');
    if (shopSelect && shopSelect.value) {
      editingShoppingItem.supermarketId = shopSelect.value;
    }
    saveShoppingData();
    // NO cridem learnPopular() al cas edició: l'override de weight/price
    // per ítem no s'ha de propagar al popular catalogat (el popular és la
    // veritat canònica, no la mitjana de variacions per ítem).
    showToast(t('saved'));
    // Tornem al super ORIGINAL (no al nou) preservant el mode
    openSupermarket(originalSupermarketId, { preserveMode: true });
    return;
  }

  // Duplicat al MATEIX super? (mateix nom normalitzat). Avisem amb opcions
  // Fusionar / Crear igualment / Cancel·la (Opció B). Si hi ha duplicat
  // mostrem NOMÉS aquest modal i saltem la comprovació "ja en tens a casa"
  // (és més rellevant: ja és a la mateixa llista). Només en crear ítems nous.
  const dup = findDuplicateInSupermarket(name, weightNormalized, currentSupermarketId, null, true);
  if (dup) {
    const createNew = () => {
      const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const newItem = {
        id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
        qty, notes, addedAt: Date.now(),
        date: noExpiry ? null : (date || null),
        noExpiry
      };
      if (weightNormalized) newItem.weight = weightNormalized;
      if (price !== null) newItem.price = price;
      shoppingItems.push(newItem);
      saveShoppingData();
      learnPopular();
      showToast(t('saved'));
      openSupermarket(currentSupermarketId);
    };
    const mergeQty = () => {
      const a = (typeof parseQtyNumber === 'function') ? parseQtyNumber(dup.qty) : null;
      const b = (typeof parseQtyNumber === 'function') ? parseQtyNumber(qty) : null;
      const sum = (a || 0) + (b || 0);
      if (sum > 0) dup.qty = String(sum);
      else if (!dup.qty && qty) dup.qty = qty;  // cap dels dos és numèric: conservem text
      // Completem només els camps BUITS de l'existent (no sobreescrivim).
      // El weight ja és idèntic per definició (forma part de la clau de duplicat).
      if ((dup.price === undefined || dup.price === null) && price !== null) dup.price = price;
      if (!dup.notes && notes) dup.notes = notes;
      saveShoppingData();
      learnPopular();
      showToast(t('merged'));
      openSupermarket(currentSupermarketId);
    };
    showDuplicateShoppingModal(dup, mergeQty, createNew);
    return;
  }

  // Nou item: comprovem si ja en té a casa (EatMe), tret que ja s'hagi
  // confirmat en un pas previ (popular pre-check, barcode pre-check).
  const existingAtHome = skipExistingCheckOnNextSave ? [] : findExistingAtHome(name);
  skipExistingCheckOnNextSave = false;

  if (existingAtHome.length > 0) {
    showAlreadyHaveModal(name, existingAtHome, () => {
      const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const newItem = {
        id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
        qty, notes, addedAt: Date.now(),
        date: noExpiry ? null : (date || null),
        noExpiry
      };
      if (weightNormalized) newItem.weight = weightNormalized;
      if (price !== null) newItem.price = price;
      shoppingItems.push(newItem);
      saveShoppingData();
      learnPopular();
      showToast(t('saved'));
      openSupermarket(currentSupermarketId);
    });
    return;
  }

  const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const newItem = {
    id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
    qty, notes, addedAt: Date.now(),
    date: noExpiry ? null : (date || null),
    noExpiry
  };
  if (weightNormalized) newItem.weight = weightNormalized;
  if (price !== null) newItem.price = price;
  shoppingItems.push(newItem);
  saveShoppingData();
  learnPopular();
  showToast(t('saved'));
  openSupermarket(currentSupermarketId);
}

function showAlreadyHaveModal(itemName, existingProducts, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const list = existingProducts.slice(0, 3).map(p => {
    const days = daysUntil(p.date);
    return `<div class="already-have-row">${p.emoji} ${formatProductLine(p.name, p.qty)} <span class="already-have-days">${daysText(days)}</span></div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">⚠️</div>
      <p class="modal-title">${t('alreadyHaveTitle')}</p>
      <p class="modal-sub">${existingProducts.length === 1 ? t('alreadyHaveSubOne') : t('alreadyHaveSubMany', existingProducts.length)}</p>
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

// Modal de duplicat al BuyMe (Opció B). Germà de showAlreadyHaveModal però
// amb 3 accions: Fusionar quantitats / Crear igualment / Cancel·la.
function showDuplicateShoppingModal(existingItem, onMerge, onCreateAnyway) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">⚠️</div>
      <p class="modal-title">${t('duplicateTitle')}</p>
      <p class="modal-sub">${t('duplicateSub')}</p>
      <div class="already-have-list"><div class="already-have-row">${existingItem.emoji || '🛒'} ${formatProductLine(existingItem.name, existingItem.qty)}</div></div>
      <div class="modal-buttons modal-buttons-col">
        <button class="modal-confirm" id="dup-merge-btn">${t('mergeBtn')}</button>
        <button class="modal-confirm" id="dup-create-btn">${t('createAnywayBtn')}</button>
        <button class="modal-cancel" id="dup-cancel-btn">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };
  overlay.querySelector('#dup-merge-btn').addEventListener('click', () => { close(); onMerge(); });
  overlay.querySelector('#dup-create-btn').addEventListener('click', () => { close(); onCreateAnyway(); });
  overlay.querySelector('#dup-cancel-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function deleteShoppingItem() {
  if (!editingShoppingItem) return;
  // Capturem la referència al moment del click (modal asíncron).
  const target = editingShoppingItem;
  const supermarketAtClick = currentSupermarketId;
  showConfirmDangerModal(
    target.emoji || '🗑️',
    target.name || 'Producte',
    t('confirmDeleteShoppingItem'),
    () => {
      shoppingItems = shoppingItems.filter(it => it.id !== target.id);
      saveShoppingData();
      showToast(t('deleted'));
      openSupermarket(supermarketAtClick, { preserveMode: true });
    }
  );
}

// ============ SESSIÓ DE COMPRA PER SÚPER (Cistella exacta v2, Fase 2b) ============
// Una "anada" a un súper agrupa totes les compres individuals (i, si n'hi
// ha, la compra en bloc) sota un mateix basketId, perquè al final surti UN
// sol popup de tiquet en prémer "He acabat la compra". Estat local (no
// sincronitzat: és una anada física amb un dispositiu), map per súper a
// localStorage. Es descarta sola si és d'un altre dia.
const ACTIVE_BASKET_KEY = 'eatmefirst_active_basket';

function _basketTodayYMD() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function _loadBasketSessions() {
  try {
    const raw = localStorage.getItem(ACTIVE_BASKET_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch (e) { return {}; }
}

function _saveBasketSessions(map) {
  try { localStorage.setItem(ACTIVE_BASKET_KEY, JSON.stringify(map)); } catch (e) {}
}

// Sessió d'AVUI per aquell súper (sense crear). Retorna { basketId, startedAt }
// o null si no n'hi ha o és d'un altre dia (sessió vella → es tracta com a
// inexistent; es netejarà en el proper getOrCreate/clear).
function getBasketSession(supId) {
  if (!supId) return null;
  const s = _loadBasketSessions()[supId];
  if (!s || !s.basketId) return null;
  if (s.startedAt !== _basketTodayYMD()) return null;
  return s;
}

// Retorna el basketId de la sessió d'avui d'aquell súper; si no n'hi ha (o
// la que hi havia és d'un altre dia), en crea una de nova i la desa.
function getOrCreateBasketSession(supId) {
  if (!supId) return null;
  const map = _loadBasketSessions();
  const s = map[supId];
  const today = _basketTodayYMD();
  if (s && s.basketId && s.startedAt === today) return s.basketId;
  const basketId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  map[supId] = { basketId: basketId, startedAt: today };
  _saveBasketSessions(map);
  return basketId;
}

function clearBasketSession(supId) {
  if (!supId) return;
  const map = _loadBasketSessions();
  if (map[supId]) { delete map[supId]; _saveBasketSessions(map); }
}

// Quan l'usuari prem "Comprat" → si tenim prou dades (zona + caducitat),
// crea el producte EatMe directament (compra ràpida amb undo). Si no,
// cau al flux clàssic: obre el formulari prefillat perquè l'usuari
// completi els camps que falten.
function buyShoppingItem(item) {
  if (tryQuickBuyShoppingItem(item)) return;

  // Fallback: el comportament clàssic (formulari intermedi).
  pendingShoppingItemId = item.id;
  pendingShoppingSupermarketId = item.supermarketId;
  const prefill = _buildShoppingPrefill(item);
  if (typeof openAddForm === 'function') {
    openAddForm(prefill);
  } else {
    showToast(t('error'));
  }
}

// Construeix el prefill estàndard per a un item de la compra (popular > history > item).
// Retorna { name, emoji, qty, days, location, noExpiry, price, weight }.
function _buildShoppingPrefill(item) {
  const populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
  const key = String(item.name || '').toLowerCase().trim();
  let fromPopular = populars.find(p => p.name && p.name.toLowerCase().trim() === key);
  let fromHistory = (Array.isArray(productHistory) ? productHistory : [])
    .find(p => p.name && p.name.toLowerCase().trim() === key);

  // Fallback "mateix producte" (tokens stemmed): "albergínies" → catàleg "Albergínia".
  if (typeof cookmeSameProduct === 'function') {
    if (!fromPopular)
      fromPopular = populars.find(p => p && p.name && cookmeSameProduct(item.name, p.name)) || fromPopular;
    if (!fromHistory && Array.isArray(productHistory))
      fromHistory = productHistory.find(p => p && p.name && cookmeSameProduct(item.name, p.name)) || fromHistory;
  }

  let itemDays = null;
  if (item.date && typeof daysUntil === 'function') {
    const diff = daysUntil(item.date);
    if (Number.isFinite(diff) && diff > 0) itemDays = diff;
  }

  // Cost total estimat (FIX A) — el MATEIX que mostra el BuyMe. Es calcula
  // amb l'ITEM CRU (item.qty="2", item.weight original) ABANS de qualsevol
  // expansió de pack, perquè getEstimatedItemCost ja multiplica per
  // parseQtyNumber(item.qty) i pel ratio de weight. Reaprofitem el
  // getPopularProducts() ja cridat (populars) per construir l'índex nom→popular.
  // És TRANSITORI: viatja al prefill i acaba a lot.price (vegeu
  // _buildLotFromNewProduct); NO es persisteix com a camp del producte.
  let totalPrice;
  if (typeof getEstimatedItemCost === 'function') {
    const popIndex = {};
    populars.forEach(p => { if (p && p.name) popIndex[p.name.toLowerCase().trim()] = p; });
    const est = getEstimatedItemCost(item, popIndex);
    if (est !== null && est !== undefined) totalPrice = est;
  }

  // Expansió de pack consolidada (font única per als DOS camins de compra:
  // quick-buy i form-fallback). Si el contingut catalogat és un pack
  // ("6x33cl" o "12u"), el desempaquetem a unitats individuals MULTIPLICANT
  // pel nombre de packs comprats (item.qty): 2 packs × 6 = 12 cerveses de
  // 330ml; 2 dotzenes × 12 = 24 ous. Descodificació via _parsePackContent
  // (biteme.js). El formulari "+" directe (blur/⭐) NO passa per aquí →
  // segueix posant qty=count sense multiplicar (correcte).
  let prefillQty = item.qty;
  // FIX B: prioritzar el weight personalitzat de l'item del BuyMe sobre el
  // del popular. Si l'usuari ha posat "500ml" a l'item (popular "Llet"="1L"),
  // respectem la seva personalització en comprar.
  let prefillWeight = item.weight || (fromPopular && fromPopular.weight) || (fromHistory && fromHistory.weight) || undefined;
  // FIX C: weight ORIGINAL pre-expansió (transitori) — per a l'aprenentatge,
  // el popular/history han d'aprendre "6x33cl"/"12u" (el pack), no l'expandit
  // "330ml". Per a no-packs és igual que prefillWeight. NO es persisteix.
  const originalWeight = prefillWeight;
  if (typeof _parsePackContent === 'function' && prefillWeight) {
    const exp = _parsePackContent(prefillWeight);
    if (exp.isPack) {
      const buyN = (typeof parseQtyNumber === 'function') ? parseQtyNumber(item.qty) : null;
      const mult = (buyN !== null && buyN > 0) ? buyN : 1;
      prefillQty = String(mult * exp.count);
      prefillWeight = exp.perUnit || undefined;
    }
  }

  return {
    name:  (fromPopular && fromPopular.name)  || item.name,
    emoji: (fromPopular && fromPopular.emoji) || item.emoji,
    qty: prefillQty,
    days: itemDays || (fromPopular && fromPopular.days) || (fromHistory && fromHistory.days) || null,
    location: (fromPopular && fromPopular.location) || (fromHistory && fromHistory.location) || null,
    noExpiry: !!(item.noExpiry || (fromPopular && fromPopular.noExpiry) || (fromHistory && fromHistory.noExpiry)),
    // Preu PER-UNITAT (per a aprenentatge i referència). item.price (override
    // de l'usuari) té prioritat; després popular; després history.
    price: (typeof item.price === 'number' && item.price >= 0) ? item.price
         : (fromPopular && typeof fromPopular.price === 'number') ? fromPopular.price
         : (fromHistory && typeof fromHistory.price === 'number') ? fromHistory.price
         : undefined,
    // totalPrice TRANSITORI (FIX A): cost total del lot; null/undefined si no
    // estimable → lot.price caurà al per-unitat (status quo).
    totalPrice: totalPrice,
    // originalWeight TRANSITORI (FIX C): weight del pack pre-expansió per a
    // l'aprenentatge (vegeu _quickBuyCore). No es persisteix al lot/producte.
    originalWeight: originalWeight,
    weight: prefillWeight,
    minStock: (fromPopular && typeof fromPopular.minStock === 'number') ? fromPopular.minStock : undefined,
    popularId: (fromPopular && fromPopular.id) || null
  };
}

// Comprova si l'item es pot "comprar ràpid" (té zona i caducitat al popular/history).
// Si sí: crea el producte directament + esborra de BuyMe + toast amb undo. Retorna true.
// Si no: retorna false perquè el caller faci fallback al formulari.
function tryQuickBuyShoppingItem(item) {
  const prefill = _buildShoppingPrefill(item);
  const hasZone = !!prefill.location;
  // hasExpiry estricte: requereix days NUMBER explícit o noExpiry true.
  // Abans era `!!prefill.days || !!prefill.noExpiry` — semànticament
  // equivalent per a la majoria de casos però acceptava qualsevol valor
  // truthy a days. Forçar `typeof === 'number'` blinda contra futurs
  // canvis a _buildShoppingPrefill que retornessin strings o booleans.
  // Si NO hi ha days number i NO és noExpiry → fallback al formulari
  // manual (path B) perquè l'usuari pugui omplir caducitat conscient.
  // Vegeu el comentari extens a _quickBuyCore sobre per què no fem
  // fallback silenciós a "7 dies".
  const hasExpiry = typeof prefill.days === 'number' || !!prefill.noExpiry;
  if (!hasZone || !hasExpiry) return false;

  // Cistella exacta v2 (Fase 2b): assigna la compra individual a la sessió
  // d'anada d'aquell súper (la crea al primer quick-buy). Així "He acabat la
  // compra" podrà treure un sol tiquet per a tota l'anada.
  const _supId = (item && item.supermarketId) || currentSupermarketId || null;
  const basketId = _supId ? getOrCreateBasketSession(_supId) : null;

  const result = _quickBuyCore(item, prefill, basketId);
  if (!result) return false;

  // Persistim, sincronitzem i re-renderitzem un sol cop per acció.
  if (typeof saveData === 'function') saveData();
  if (typeof saveShoppingData === 'function') saveShoppingData();
  if (typeof renderShoppingItems === 'function') renderShoppingItems();

  // Gamificació igual que saveNewProduct.
  if (typeof bumpProductsAddedCounter === 'function') bumpProductsAddedCounter();
  if (typeof addXp === 'function') addXp(2, 'eatme-add');

  // Toast amb opció Desfer. Strings inline en català (l'app és Catalan-only
  // a runtime — vegeu t() a i18n.js que sempre llegeix TRANSLATIONS.ca).
  // Inline en lloc de t('quickBuyDone', ...) perquè és immune a caches
  // velles d'i18n.js: si l'usuari encara té el bundle antic, els claus nous
  // de traducció no existirien i el toast no arribaria a renderitzar.
  // Si la compra ha fusionat amb un producte existent, el missatge ho
  // reflecteix; l'undo treu només el lot afegit, no el producte sencer.
  const product = result.product;
  let message;
  if (result.fused) {
    message = '✅ Lot afegit a ' + product.name + ' (' + product.lots.length + ' lots)';
  } else {
    const loc = (typeof getLocationById === 'function') ? getLocationById(product.location) : null;
    const locName = loc && typeof getLocationName === 'function' ? getLocationName(loc) : (product.location || '');
    const daysText = product.noExpiry
      ? 'sense caducitat'
      : (prefill.days || 7) + ' dies';
    const emojiPart = product.emoji ? product.emoji + ' ' : '';
    message = '✅ ' + emojiPart + product.name + ' → ' + locName + ' (' + daysText + ')';
  }
  showUndoableToast({
    message: message,
    durationMs: 5000,
    onUndo: () => undoQuickBuy({ productId: product.id, lotId: result.lotId, fused: result.fused, recordId: result.recordId }, item)
  });

  return true;
}

// Mutació pura sobre els arrays in-memory: afegeix un lot al producte
// agrupat existent (fusió) o crea un producte v2 nou amb un únic lot.
// Treu l'item de `shoppingItems`, registra a l'historial. NO desa,
// NO renderitza, NO mostra toast — això es fa al caller per poder
// agrupar-ho en lots.
// Retorna { product, lotId, fused } (o null si no es pot construir).
//   product: el producte agrupat (existent si fused, nou si no)
//   lotId:   id del lot afegit (necessari per a l'undo)
//   fused:   true si s'ha afegit a un producte existent, false si nou
// basketId opcional: id de l'anada a comprar (cistella exacta v2). El passa
// quickBuyMultipleSelected (un sol id per a tot el bloc "Comprat"); el camí
// individual no en passa → cau al fallback proxy (dia+súper) a expenses.js.
function _quickBuyCore(item, prefill, basketId) {
  if (!prefill || !prefill.location) return null;

  const today = new Date();
  let dateStr = null;
  if (!prefill.noExpiry) {
    const expiry = new Date(today);
    // Sense fallback `|| 7`: caducitats fantasma silencioses de 7 dies
    // són pitjor que un formulari manual on l'usuari completa el camp
    // conscient. La guarda de tryQuickBuyShoppingItem (`hasExpiry =
    // typeof prefill.days === 'number' || !!prefill.noExpiry`) garanteix
    // que quan arribem aquí amb !prefill.noExpiry, prefill.days és un
    // number. Si en el futur algun caller crida _quickBuyCore saltant-se
    // tryQuickBuyShoppingItem amb prefill.days no-number, expiry serà
    // Invalid Date i formatDateLocal retornarà NaN/null — fail-loud
    // enlloc de silenciosa contaminació amb caducitat de 7 dies.
    expiry.setDate(expiry.getDate() + prefill.days);
    dateStr = (typeof formatDateLocal === 'function') ? formatDateLocal(expiry) : null;
  }

  // Supermarket per al lot — l'extreiem de l'item original.
  const _sm = (typeof getSupermarketById === 'function') ? getSupermarketById(item && item.supermarketId) : null;
  const supermarket = (_sm && _sm.name) || null;

  const productData = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    name: prefill.name,
    emoji: prefill.emoji,
    date: dateStr,
    noExpiry: !!prefill.noExpiry,
    location: prefill.location,
    // prefill.qty ja ve expandit de _buildShoppingPrefill (no item.qty cru,
    // que per a un pack seria "2" en comptes de "12").
    qty: prefill.qty || '',
    addedAt: new Date().toISOString(),
    popularId: prefill.popularId || null,
    supermarket: supermarket
  };
  if (typeof prefill.price === 'number' && prefill.price >= 0) productData.price = prefill.price;
  // totalPrice transitori (FIX A): el cost total del lot. _buildLotFromNewProduct
  // l'usarà per a lot.price; productData.price (per-unitat) queda per a
  // l'aprenentatge (recordProductInHistory/addToCustomPopular).
  if (typeof prefill.totalPrice === 'number' && prefill.totalPrice >= 0) {
    productData.totalPrice = prefill.totalPrice;
  }
  if (prefill.weight) productData.weight = prefill.weight;

  // frozenDate si va al congelador (mateixa regla que saveNewProduct).
  const newProductLoc = (typeof getLocationById === 'function') ? getLocationById(prefill.location) : null;
  if (newProductLoc && newProductLoc.category === 'freezer' && typeof formatDateLocal === 'function') {
    productData.frozenDate = formatDateLocal(today);
  }

  // Aprenentatge: registra a l'historial / popular (mateixa crida que saveNewProduct).
  if (typeof recordProductInHistory === 'function') {
    recordProductInHistory(prefill.name, prefill.emoji, prefill.location,
      prefill.days, !!prefill.noExpiry, productData.price,
      prefill.originalWeight || productData.weight);
  }

  if (!Array.isArray(products)) products = [];

  // Fusió: si ja existeix un producte v2 amb (nom, emoji, location)
  // coincidents, afegim un lot enlloc de duplicar. Helpers definits
  // a biteme.js (bloc FUSIÓ EN CREACIÓ).
  const newLot = (typeof _buildLotFromNewProduct === 'function')
    ? _buildLotFromNewProduct(productData)
    : null;
  const existing = (typeof _findGroupedProductForFusion === 'function' && newLot)
    ? _findGroupedProductForFusion(productData.name, productData.emoji, productData.location)
    : null;
  let product;
  let fused = false;
  if (existing && newLot && typeof _addLotToProduct === 'function') {
    _addLotToProduct(existing, newLot);
    product = existing;
    fused = true;
  } else if (newLot && typeof _createV2ProductWithLot === 'function') {
    product = _createV2ProductWithLot(productData, newLot);
    products.push(product);
  } else {
    // Fallback defensiu si els helpers v2 no estan carregats: format
    // legacy. La migració al boot el convertirà.
    product = Object.assign({}, productData);
    delete product.popularId;
    delete product.supermarket;
    products.push(product);
  }

  // Registre al purchase history (vegeu js/purchase-history.js).
  // No-op silenciós si el mòdul encara no està carregat. days_calc
  // forçat a null quan noExpiry per coherència: prefill.days pot ser
  // non-null en aquest cas (productHistory amb dades residuals o
  // popular pre-migració v3) i no té sentit registrar dies de vida
  // útil per a un producte que no caduca.
  // productId apunta al producte AGRUPAT (mateix si fused). Fase F
  // afegirà lotId per a traçabilitat fina.
  let recordId = null;
  if (typeof recordPurchase === 'function') {
    recordId = recordPurchase({
      popularId: prefill.popularId,
      name: prefill.name,
      price: prefill.price,
      // totalPrice: total REAL de la línia (preu × unitats, via
      // getEstimatedItemCost) — abans es descartava. Cistella exacta v2.
      totalPrice: prefill.totalPrice,
      basketId: basketId,
      weight: prefill.weight,
      days_calc: prefill.noExpiry ? null : prefill.days,
      days_real: null,
      supermarket: supermarket,
      productId: product.id
    });
  }

  if (Array.isArray(shoppingItems)) {
    shoppingItems = shoppingItems.filter(it => it.id !== item.id);
  }

  return { product: product, lotId: newLot ? newLot.id : null, fused: fused, recordId: recordId };
}

// Desfer una compra ràpida individual.
// payload: { productId, lotId, fused, recordId } | string (compat legacy).
//   - Si fused=true: treu només el lot afegit; el producte segueix amb
//     els lots anteriors.
//   - Si fused=false (o payload és l'id legacy): treu el producte sencer.
//   - recordId: revoca també el registre de purchase_history (Despeses no
//     ha de comptar una compra desfeta). Records vells sense recordId → no-op.
function undoQuickBuy(payload, originalItem) {
  const productId = (payload && typeof payload === 'object') ? payload.productId : payload;
  const lotId = (payload && typeof payload === 'object') ? payload.lotId : null;
  const wasFused = !!(payload && typeof payload === 'object' && payload.fused);
  const recordId = (payload && typeof payload === 'object') ? payload.recordId : null;
  if (recordId && typeof removePurchaseRecord === 'function') removePurchaseRecord(recordId);
  if (Array.isArray(products)) {
    if (wasFused && lotId && typeof _removeLotFromProduct === 'function') {
      const prod = products.find(p => p.id === productId);
      if (prod) {
        const res = _removeLotFromProduct(prod, lotId);
        if (res.productRemoved) {
          // Defensiu: no hauria de passar (fused=true implica que el
          // producte tenia ≥ 1 lot abans d'afegir el nostre), però si
          // arribem aquí netegem el producte.
          products = products.filter(p => p.id !== productId);
        }
      }
    } else {
      products = products.filter(p => p.id !== productId);
    }
    if (typeof saveData === 'function') saveData();
  }
  if (Array.isArray(shoppingItems) && originalItem) {
    // Defensiu: no dupliquem si l'item ja hi és (ex: l'usuari ha tornat a editar).
    if (!shoppingItems.some(it => it.id === originalItem.id)) {
      shoppingItems.push(originalItem);
    }
    if (typeof saveShoppingData === 'function') saveShoppingData();
  }
  if (typeof renderShoppingItems === 'function') renderShoppingItems();
  if (typeof renderHome === 'function') renderHome();
  // Refresca la visibilitat del botó "He acabat" (el count de l'anada pot
  // haver baixat) explícitament, per si la pantalla activa no és el súper;
  // i Despeses si està a la vista (el registre esborrat n'altera els totals).
  if (typeof _updateFinishTripButton === 'function') _updateFinishTripButton(currentSupermarketId);
  _refreshExpensesIfVisible();
  showToast('↺ ' + (originalItem ? originalItem.name : '') + " restaurat a Compra'm");
}

// Repinta Despeses només si #screen-expenses és la pantalla activa.
function _refreshExpensesIfVisible() {
  const scr = document.getElementById('screen-expenses');
  if (scr && scr.classList.contains('active') && typeof renderExpenses === 'function') {
    renderExpenses();
  }
}

// Compra ràpida en bloc des de la selecció múltiple del BuyMe.
// Itera els items seleccionats, fa quick-buy als que tenen prou dades,
// i agrupa una sola escriptura/render/toast al final.
function quickBuyMultipleSelected() {
  if (!window.ShoppingSelection || !window.ShoppingSelection.isActive()) return;
  const ids = window.ShoppingSelection.getSelectedIds();
  if (!ids || ids.length === 0) return;

  // Snapshot dels items abans de mutar shoppingItems (els ids no canvien dins del bucle).
  const items = (Array.isArray(shoppingItems) ? shoppingItems : []).filter(it => ids.indexOf(it.id) !== -1);
  if (items.length === 0) return;

  const pairs = []; // { newProductId, originalItem }
  let needsFormCount = 0;

  // Cistella exacta v2: un sol basketId per a aquest bloc. Fase 2b —
  // unificació amb el camí individual: si ja hi ha una anada oberta en
  // aquest súper, el bulk s'HI SUMA (reusa el seu basketId) i NO treu el seu
  // popup a l'instant → el tiquet únic el disparà "He acabat la compra". Si
  // NO hi ha anada oberta, comportament Fase 2a: basketId propi + popup
  // immediat al final.
  const _supId = currentSupermarketId || null;
  const _openSession = _supId ? getBasketSession(_supId) : null;
  const basketId = _openSession
    ? _openSession.basketId
    : (Date.now() + '-' + Math.random().toString(36).slice(2, 8));

  // Total estimat de l'anada (Σ dels totalPrice de les línies realment
  // comprades) — precarrega el modal de l'import del tiquet (Despeses v2 F2).
  let estBasketTotal = 0;

  items.forEach(item => {
    const prefill = _buildShoppingPrefill(item);
    const hasZone = !!prefill.location;
    const hasExpiry = !!prefill.days || !!prefill.noExpiry;
    if (hasZone && hasExpiry) {
      const res = _quickBuyCore(item, prefill, basketId);
      if (res) {
        pairs.push({ productId: res.product.id, lotId: res.lotId, fused: res.fused, recordId: res.recordId, originalItem: item });
        if (typeof prefill.totalPrice === 'number' && prefill.totalPrice >= 0) estBasketTotal += prefill.totalPrice;
        // Gamificació per cada producte (mateix tractament que saveNewProduct).
        if (typeof bumpProductsAddedCounter === 'function') bumpProductsAddedCounter();
        if (typeof addXp === 'function') addXp(2, 'eatme-add');
      }
    } else {
      needsFormCount++;
    }
  });

  // Una sola escriptura + sync + render per a tot el bloc.
  if (pairs.length > 0) {
    if (typeof saveData === 'function') saveData();
    if (typeof saveShoppingData === 'function') saveShoppingData();
    if (typeof renderShoppingItems === 'function') renderShoppingItems();
  }

  // Sortir del mode selecció.
  if (window.ShoppingSelection && typeof window.ShoppingSelection.exit === 'function') {
    window.ShoppingSelection.exit();
  }

  if (pairs.length > 0) {
    const nQ = pairs.length;
    let msg = '✅ ' + nQ + ' producte' + (nQ === 1 ? '' : 's') + " → Menja'm";
    if (needsFormCount > 0) {
      msg += '. ' + needsFormCount + ' necessit' + (needsFormCount === 1 ? 'a' : 'en') + ' ompliment manual';
    }
    showUndoableToast({
      message: msg,
      durationMs: 6000,
      onUndo: () => undoQuickBuyMultiple(pairs)
    });
    // Cistella exacta v2: demana l'import real del tiquet NOMÉS si aquest
    // bulk NO forma part d'una anada oberta (Fase 2a). Si hi ha sessió
    // activa, el popup l'obrirà "He acabat la compra" (un sol tiquet).
    if (!_openSession) {
      _promptBasketTicketTotal(basketId, estBasketTotal);
    }
  } else if (needsFormCount > 0) {
    showToast(needsFormCount + ' necessit' + (needsFormCount === 1 ? 'a' : 'en') + ' ompliment manual');
  }
}

// Cistella exacta (Despeses v2, Fase 2): després d'un "Comprat" en bloc,
// demana l'import REAL del tiquet. El camp ve precarregat amb el total
// estimat (Σ dels totalPrice de les línies comprades); acceptar sense
// tocar-lo deixa l'estimat intacte. Si l'usuari escriu un valor > 0 diferent,
// sobreescriu el totalPrice de TOTS els records d'aquest basketId (repartit
// proporcionalment — vegeu updateBasketTotal). Cancel·lar / buit / no
// numèric / ≤ 0 → no toca res. NOMÉS al camí bulk (no individual ni altes
// manuals).
function _promptBasketTicketTotal(basketId, estTotal) {
  if (!basketId || typeof showInputModal !== 'function') return;
  const est = (typeof estTotal === 'number' && estTotal >= 0) ? Math.round(estTotal * 100) / 100 : 0;
  const apply = (raw) => {
    const v = parseFloat(String(raw == null ? '' : raw).replace(',', '.'));
    if (!Number.isFinite(v) || !(v > 0)) return;   // buit/no-num/≤0 → deixa l'estimat
    const newTotal = Math.round(v * 100) / 100;
    if (newTotal === est) return;                  // sense canvi → no toca res
    if (typeof updateBasketTotal === 'function' && updateBasketTotal(basketId, newTotal)) {
      // Refresca Despeses només si està a la vista.
      const scr = document.getElementById('screen-expenses');
      if (scr && scr.classList.contains('active') && typeof renderExpenses === 'function') {
        renderExpenses();
      }
    }
  };
  showInputModal('🧾', t('ticketTotalTitle'), t('ticketTotalMsg'), t('ticketTotalPlaceholder'),
    apply, { initialValue: est > 0 ? String(est) : '', confirmLabel: t('ticketTotalConfirm') });
}

function undoQuickBuyMultiple(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return;
  if (Array.isArray(products)) {
    // Per cada pair: si va ser fusió, treu només el lot afegit; si va
    // ser creació, treu el producte sencer. Compatible amb pairs antics
    // que tinguin `newProductId` enlloc de `productId/lotId/fused`.
    pairs.forEach(pair => {
      const productId = pair && (pair.productId || pair.newProductId);
      if (!productId) return;
      // Revoca el registre de purchase_history d'aquesta compra (Despeses no
      // ha de comptar-la). Pairs vells sense recordId → no-op.
      if (pair.recordId && typeof removePurchaseRecord === 'function') removePurchaseRecord(pair.recordId);
      if (pair.fused && pair.lotId && typeof _removeLotFromProduct === 'function') {
        const prod = products.find(p => p.id === productId);
        if (prod) {
          const res = _removeLotFromProduct(prod, pair.lotId);
          if (res.productRemoved) {
            products = products.filter(p => p.id !== productId);
          }
        }
      } else {
        products = products.filter(p => p.id !== productId);
      }
    });
    if (typeof saveData === 'function') saveData();
  }
  if (Array.isArray(shoppingItems)) {
    pairs.forEach(p => {
      if (p.originalItem && !shoppingItems.some(it => it.id === p.originalItem.id)) {
        shoppingItems.push(p.originalItem);
      }
    });
    if (typeof saveShoppingData === 'function') saveShoppingData();
  }
  if (typeof renderShoppingItems === 'function') renderShoppingItems();
  if (typeof renderHome === 'function') renderHome();
  if (typeof _updateFinishTripButton === 'function') _updateFinishTripButton(currentSupermarketId);
  _refreshExpensesIfVisible();
  showToast('↺ ' + pairs.length + ' producte' + (pairs.length === 1 ? '' : 's') + ' restaurat' + (pairs.length === 1 ? '' : 's') + " a Compra'm");
}

// Toast amb botó "Desfer". Diferent del showToast clàssic (que NO té botó).
// Si ja hi ha un toast actiu, el substitueix — l'undo del toast antic queda
// inaccessible (assumim que l'usuari ha decidit continuar amb la nova acció).
function showUndoableToast(opts) {
  const message = (opts && opts.message) || '';
  const durationMs = (opts && typeof opts.durationMs === 'number') ? opts.durationMs : 5000;
  const onUndo = opts && opts.onUndo;

  const existing = document.getElementById('undoable-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'undoable-toast';
  toast.className = 'undoable-toast';

  const msgSpan = document.createElement('span');
  msgSpan.className = 'uts-msg';
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);

  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'uts-undo';
  // Inline català (Catalan-only a runtime) — vegeu nota a tryQuickBuyShoppingItem.
  undoBtn.textContent = '↺ Desfer';
  toast.appendChild(undoBtn);

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  let undoClicked = false;
  const dismiss = () => {
    if (!toast.parentNode) return;
    toast.classList.remove('show');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  };

  const timer = setTimeout(() => { if (!undoClicked) dismiss(); }, durationMs);

  undoBtn.addEventListener('click', () => {
    undoClicked = true;
    clearTimeout(timer);
    if (typeof onUndo === 'function') {
      try { onUndo(); } catch (e) { console.warn('[undo]', e); }
    }
    dismiss();
  });
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

// Prefilla el formulari del BuyMe (screen-shopping-item-edit) amb les dades
// d'un popular. Es crida quan l'usuari selecciona un popular des del flux
// d'afegir a un supermercat.
function prefillShoppingItemFromPopular(p) {
  if (!p) return;
  // Marquem que estem creant nou (no editant) perquè saveShoppingItem
  // tracti el resultat com a item nou al supermercat actual.
  editingShoppingItem = null;
  const titleEl = document.getElementById('shopping-item-edit-title');
  if (titleEl) titleEl.textContent = t('newShoppingItem');

  // Camps específics de l'item del super (no presents al popular): buidats.
  document.getElementById('input-shopping-name').value = p.name || '';
  document.getElementById('input-shopping-qty').value = '';
  document.getElementById('input-shopping-notes').value = '';

  // Buidem price + weight ABANS del delegate perquè canReplace al
  // _autofillShoppingFromPopular els consideri reemplaçables (snap=null
  // + camp ple = "manual"; snap=null + camp buit = reemplaçable).
  const priceInput = document.getElementById('input-shopping-price');
  const weightInput = document.getElementById('input-shopping-weight');
  if (priceInput) priceInput.value = '';
  if (weightInput) weightInput.value = '';

  // Reset snapshot: seleccionar del catàleg = "vull totes les dades del
  // popular, oblida l'estat anterior del formulari". Sinó, valors manuals
  // previs (ex: preu tocat per l'usuari abans de tornar al catàleg)
  // bloquejarien l'override del nou popular seleccionat.
  _lastAutofillSnapshot = null;

  // Delegar al flow unificat: omple emoji + weight + price + date +
  // noExpiry, actualitza snapshot, aplica canonicalització del nom.
  // Mateix patró que el flow del blur — un sol lloc on viu la lògica
  // d'autoomplir des de popular. Abans aquesta funció duplicava (parcialment)
  // la lògica i no incloïa price/weight ni snapshot — bug fix 27/05/26.
  if (typeof _autofillShoppingFromPopular === 'function') {
    _autofillShoppingFromPopular(p.name);
  }

  const delBtn = document.getElementById('btn-delete-shopping-item');
  if (delBtn) delBtn.style.display = 'none';
  const shopGroup = document.getElementById('shop-selector-group');
  if (shopGroup) shopGroup.style.display = 'none';
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
    // Sempre mostrem el modal complet (qty + selector de super amb tots
    // els actius, preferits i no preferits). Així l'usuari pot ajustar
    // la quantitat abans d'afegir, no només el super.
    showManualAddToBuyMeModal(product);
  });

  // Click fora del modal el tanca (= cancel·lar)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function addToShoppingList(supermarketId, product, qty, weight) {
  const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const newItem = {
    id, supermarketId,
    name: product.name,
    emoji: product.emoji,
    qty: qty || '',
    notes: '',
    addedAt: Date.now()
  };
  // Contingut per-envàs explícit (no fallback al render). Prioritza el
  // weight passat (derivat del popular per-envàs); si no, el del producte.
  // CookMe passa products sense weight i sense 4t arg → no-op.
  // REGLA D'OR del weight: el 4t arg ha de ser SEMPRE el contingut
  // per-envàs canònic ("6x33cl"/"12u"), MAI l'expandit per-unitat ("330ml").
  // Els callers l'han de derivar del popular (com _deriveBuyMeFromProduct,
  // que llegeix pop.weight primer), NO del mirror del lot — que després d'una
  // compra de pack pot tenir el per-unitat expandit. El fallback product.weight
  // d'aquí és l'últim recurs: si un caller futur passés un producte/lot amb
  // weight expandit i ometés el 4t arg, reintroduiria la regressió dels packs
  // que va arreglar 45ea959.
  const w = weight || product.weight;
  // Fusió automàtica per a adds PROGRAMÀTICS (CookMe addItemsToShop + quick-buy
  // EatMe→BuyMe): si ja hi ha un ítem amb el mateix nom+weight al super, acumula
  // la qty en lloc de crear una fila duplicada. Sense modal — el formulari manual
  // (saveShoppingItem) NO passa per aquí i conserva el seu modal de 3 botons.
  const dup = (typeof findDuplicateInSupermarket === 'function')
    ? findDuplicateInSupermarket(product.name, w, supermarketId, null, true) : null;
  if (dup) {
    const sum = (typeof parseQtyNumber === 'function')
      ? ((parseQtyNumber(dup.qty) || 0) + (parseQtyNumber(qty) || 0)) : 0;
    if (sum > 0) dup.qty = String(sum);
    else if (!dup.qty && qty) dup.qty = String(qty);  // cap numèric: conserva text
    if (!dup.weight && w) dup.weight = w;             // omple només si buit (no sobreescriu)
    // (price/notes no es reben en aquesta funció → res a omplir)
    saveShoppingData();
    if (typeof bumpBuymeAddedCounter === 'function') bumpBuymeAddedCounter(1);
    if (typeof addXp === 'function') addXp(1, 'buyme-add');
    return;
  }
  if (w) newItem.weight = w;
  shoppingItems.push(newItem);
  saveShoppingData();
  // Gamificació: 1 XP per item afegit al BuyMe + comptador històric.
  if (typeof bumpBuymeAddedCounter === 'function') bumpBuymeAddedCounter(1);
  if (typeof addXp === 'function') addXp(1, 'buyme-add');
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
  // qty d'ENVASOS + contingut per-envàs (no l'agregat de l'EatMe). Vegeu
  // _deriveBuyMeFromProduct (biteme.js). L'usuari pot editar la qty a l'input.
  const _derived = (typeof _deriveBuyMeFromProduct === 'function')
    ? _deriveBuyMeFromProduct(product) : { qty: product.qty || '', content: '' };
  const gradients = [
    ['#42A5F5', '#1565C0'], ['#26A69A', '#00695C'], ['#FFA726', '#E65100'],
    ['#AB47BC', '#7B1FA2'], ['#EF5350', '#C62828'], ['#66BB6A', '#388E3C'],
    ['#5C6BC0', '#3949AB']
  ];

  // Preferides primer, després la resta
  const preferred = getEnabledSupermarkets();
  const preferredIds = new Set(preferred.map(s => s.id));
  const others = supermarkets.filter(s => !preferredIds.has(s.id));
  const ordered = [...preferred, ...others];

  const renderBtn = (sm, idx) => {
    const [c1, c2] = gradients[idx % gradients.length];
    return `
      <button class="modal-supermarket-btn" data-id="${sm.id}" style="background:linear-gradient(135deg, ${c1} 0%, ${c2} 100%)">
        <span class="modal-sm-emoji">${sm.emoji}</span>
        <span class="modal-sm-name">${escapeHtml(sm.name)}</span>
      </button>
    `;
  };

  const sectionHeader = (label) => `
    <p class="modal-sub" style="margin:10px 0 6px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.7">${label}</p>
  `;

  let smButtons = '';
  let counter = 0;
  if (preferred.length > 0) {
    smButtons += sectionHeader(t('preferredShops'));
    smButtons += preferred.map(sm => renderBtn(sm, counter++)).join('');
  }
  if (others.length > 0) {
    smButtons += sectionHeader(t('otherShops'));
    smButtons += others.map(sm => renderBtn(sm, counter++)).join('');
  }

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-emoji-big">🛒</div>
      <p class="modal-title">${t('addToList')}</p>
      <p class="modal-product-name">${escapeHtml(product.emoji + ' ' + product.name)}</p>
      <div class="form-group modal-form-group">
        <label for="modal-qty-input">${t('itemQuantity')}</label>
        <input type="text" id="modal-qty-input" placeholder="${t('quantityPlaceholder')}" value="${escapeHtml(_derived.qty)}">
      </div>
      <div class="form-group modal-form-group">
        <label for="modal-content-input">${t('weightLabel')}</label>
        <input type="text" id="modal-content-input" placeholder="${t('quantityPlaceholder')}" value="${escapeHtml(_derived.content)}">
      </div>
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
      const content = (overlay.querySelector('#modal-content-input').value || '').trim();
      const sm = getSupermarketById(smId);
      addToShoppingList(smId, product, qty, content || _derived.content);
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


let shoppingItems = []; // Array de {id, supermarketId, name, emoji, qty, notes, addedAt}

// Snapshot del darrer popular aplicat per _autofillShoppingFromPopular.
// Permet detectar quins camps van ser autoomplerts (vs tocats per l'usuari)
// per poder-los sobreescriure quan canvia el nom a un altre popular.
let _lastAutofillSnapshot = null;

let editingShoppingItem = null;

let selectedShoppingEmoji = '🥛';

function renderShoppingEmojiPickerBtn() {
  const btn = document.getElementById('shopping-emoji-current');
  if (btn) btn.textContent = selectedShoppingEmoji;
}

// Variables per saber quin camp està seleccionant emoji
