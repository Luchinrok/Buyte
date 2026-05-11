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
      <p class="view-all-meta">${locLabel}${locLabel ? ' · ' : ''}<span class="${daysClass}">${daysText(days)}</span></p>
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
      // Mateix fallback que a _ensureZonesSwiper a js/biteme.js:
      // pointer-events:auto explícit al slide actiu post-transició
      // perquè els taps al primer toc registrin sense necessitat
      // de doble click.
      slideChangeTransitionEnd: function() {
        const swiper = this;
        const active = swiper.slides && swiper.slides[swiper.activeIndex];
        if (active) active.style.pointerEvents = 'auto';
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
  const prevDisplay = summary.style.display;
  const setDisplay = (val) => {
    summary.style.display = val;
    // El .shops-slider és flex:1 dins #screen-supermarket (vegeu el
    // bloc CSS de .shops-slider). Si la cromia per sobre canvia mida
    // — i el cost summary apareixent/desapareixent és l'únic cas no
    // cobert per _scrollToSupermarket — l'altura del slider canvia i
    // la cube geometry queda obsoleta. swiper.update() la recalcula.
    if (prevDisplay !== val && _shopsSwiper) {
      try { _shopsSwiper.update(); } catch (e) {}
    }
  };
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
// .shops-slider en flex:1 dins #screen-supermarket (bloquejat a 100dvh),
// rotar el dispositiu, mostrar/amagar la barra del navegador mòbil o
// redimensionar la finestra alteren la seva altura. Sense aquest update,
// Swiper continua usant la geometria antiga del cub i les transicions
// queden visualment imprecises o "pillades".
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
function getEstimatedItemCost(item, popularByName) {
  if (!item || typeof getProductPrice !== 'function') return null;
  const key = String(item.name || '').toLowerCase().trim();
  if (!key || !popularByName) return null;
  const popular = popularByName[key];
  if (!popular || typeof popular.price !== 'number' || popular.price <= 0) return null;

  const synth = {
    emoji: item.emoji || popular.emoji,
    qty: item.qty,
    weight: popular.weight,
    price: popular.price
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
    return n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  } catch (e) {
    return n.toFixed(2).replace('.', ',') + ' €';
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
function _buildShoppingItemRow(item, opts) {
  const o = opts || {};
  const mode = o.mode || 'view';
  const showArrows = o.showArrows !== false;
  const isFirst = !!o.isFirst;
  const isLast = !!o.isLast;
  const cost = (typeof o.cost === 'number' && isFinite(o.cost) && o.cost > 0) ? o.cost : null;

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
          <p class="shopping-item-name">${formatProductLine(item.name, item.qty)}</p>
          ${meta}
          ${costHtml}
        </div>${arrowsHtml}
        <button class="shopping-item-edit" data-action="edit" data-id="${item.id}" data-item-id="${item.id}" aria-label="Edit">✏️</button>
      `;
  } else {
    div.innerHTML = `
        <div class="shopping-item-emoji">${item.emoji}</div>
        <div class="shopping-item-info">
          <p class="shopping-item-name">${formatProductLine(item.name, item.qty)}</p>
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

  const cats = window.CategoriesSystem.getCategories().slice().sort((a, b) => {
    const oa = (typeof a.order === 'number') ? a.order : 999;
    const ob = (typeof b.order === 'number') ? b.order : 999;
    return oa - ob;
  });

  cats.forEach(cat => {
    const groupItems = grouped[cat.id];
    if (!groupItems || groupItems.length === 0) return;
    const header = document.createElement('div');
    header.className = 'category-section-header';
    header.innerHTML = `
      <span class="cat-section-icon">${escapeHtml(cat.icon || '📦')}</span>
      <span class="cat-section-name">${escapeHtml(cat.name || cat.id)}</span>
      <span class="cat-section-count">(${groupItems.length})</span>
    `;
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
function _initShopsActionsDelegate() {
  const slider = document.getElementById('shops-slider');
  if (!slider || slider.dataset.actionsDelegated === '1') return;
  slider.dataset.actionsDelegated = '1';
  slider.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('[data-action][data-item-id]');
    if (!btn || !slider.contains(btn)) return;
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
  });
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
        if (list) _renderShopPageItems(currentSupermarketId, list, supermarketItemsMode);
      });
      // Defensiu: treu el focus del botó perquè cap navegador retingui
      // l'estat :focus visible (sobretot a mòbil, on el tap manté
      // focus fins al següent toc en una altra zona).
      try { btn.blur(); } catch (e) {}
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

  // Preu i pes: el shopping item no els persisteix (la font de veritat és
  // el popular catalogat amb el mateix nom). Quan editem, els pre-omplim
  // del popular si existeix per donar contingut útil; quan és nou, també
  // mirem si ja en tenim un de catalogat (el formulari "Afegir manualment"
  // pot ser només una entrada ràpida sobre un producte ja conegut).
  const priceInput = document.getElementById('input-shopping-price');
  const weightInput = document.getElementById('input-shopping-weight');
  if (priceInput) priceInput.value = '';
  if (weightInput) weightInput.value = '';
  if (!isNew && item && item.name && typeof getPopularProducts === 'function') {
    const populars = getPopularProducts() || [];
    const key = String(item.name).toLowerCase().trim();
    const popular = populars.find(p => p.name && p.name.toLowerCase().trim() === key);
    if (popular) {
      if (priceInput && typeof popular.price === 'number' && popular.price >= 0) {
        priceInput.value = String(popular.price);
      }
      if (weightInput && popular.weight) {
        weightInput.value = String(popular.weight);
      }
    }
  }

  const dateInput = document.getElementById('input-shopping-date');
  const noExpInput = document.getElementById('input-shopping-no-expiry');
  if (dateInput && noExpInput) {
    if (isNew) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dateInput.value = formatDateForInput(d);
      noExpInput.checked = false;
    } else {
      noExpInput.checked = !!item.noExpiry;
      dateInput.value = (!item.noExpiry && item.date) ? item.date : '';
    }
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

// Cerca productes a l'EatMe amb nom similar (substring en qualsevol direcció).
// S'utilitza per avisar abans d'afegir duplicats a la llista de la compra.
function findExistingAtHome(name) {
  if (!name) return [];
  const lowerName = name.toLowerCase();
  return products.filter(p => p.name.toLowerCase().includes(lowerName) || lowerName.includes(p.name.toLowerCase()));
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
  const weight = weightInput ? String(weightInput.value || '').trim() : '';
  const hasPrice = price !== null;
  const hasWeight = weight !== '';

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
      addToCustomPopular(name, selectedShoppingEmoji, days, null, noExpiry, price, weight);
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
    // Aplicar canvi de botiga si l'usuari l'ha canviada
    const shopSelect = document.getElementById('input-shopping-shop');
    if (shopSelect && shopSelect.value) {
      editingShoppingItem.supermarketId = shopSelect.value;
    }
    saveShoppingData();
    learnPopular();
    showToast(t('saved'));
    // Tornem al super ORIGINAL (no al nou) preservant el mode
    openSupermarket(originalSupermarketId, { preserveMode: true });
    return;
  }

  // Nou item: comprovem si ja en té a casa (EatMe), tret que ja s'hagi
  // confirmat en un pas previ (popular pre-check, barcode pre-check).
  const existingAtHome = skipExistingCheckOnNextSave ? [] : findExistingAtHome(name);
  skipExistingCheckOnNextSave = false;

  if (existingAtHome.length > 0) {
    showAlreadyHaveModal(name, existingAtHome, () => {
      const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      shoppingItems.push({
        id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
        qty, notes, addedAt: Date.now(),
        date: noExpiry ? null : (date || null),
        noExpiry
      });
      saveShoppingData();
      learnPopular();
      showToast(t('saved'));
      openSupermarket(currentSupermarketId);
    });
    return;
  }

  const id = 'si-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  shoppingItems.push({
    id, supermarketId: currentSupermarketId, name, emoji: selectedShoppingEmoji,
    qty, notes, addedAt: Date.now(),
    date: noExpiry ? null : (date || null),
    noExpiry
  });
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

function deleteShoppingItem() {
  if (!editingShoppingItem) return;
  if (!confirm(t('confirmDeleteShoppingItem'))) return;
  shoppingItems = shoppingItems.filter(it => it.id !== editingShoppingItem.id);
  saveShoppingData();
  showToast(t('deleted'));
  openSupermarket(currentSupermarketId, { preserveMode: true });
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
  const fromPopular = populars.find(p => p.name && p.name.toLowerCase().trim() === key);
  const fromHistory = (Array.isArray(productHistory) ? productHistory : [])
    .find(p => p.name && p.name.toLowerCase().trim() === key);

  let itemDays = null;
  if (item.date && typeof daysUntil === 'function') {
    const diff = daysUntil(item.date);
    if (Number.isFinite(diff) && diff > 0) itemDays = diff;
  }

  return {
    name: item.name,
    emoji: item.emoji,
    qty: item.qty,
    days: itemDays || (fromPopular && fromPopular.days) || (fromHistory && fromHistory.days) || null,
    location: (fromPopular && fromPopular.location) || (fromHistory && fromHistory.location) || null,
    noExpiry: !!(item.noExpiry || (fromPopular && fromPopular.noExpiry) || (fromHistory && fromHistory.noExpiry)),
    price: (fromPopular && typeof fromPopular.price === 'number') ? fromPopular.price
         : (fromHistory && typeof fromHistory.price === 'number') ? fromHistory.price
         : undefined,
    weight: (fromPopular && fromPopular.weight) || (fromHistory && fromHistory.weight) || undefined
  };
}

// Comprova si l'item es pot "comprar ràpid" (té zona i caducitat al popular/history).
// Si sí: crea el producte directament + esborra de BuyMe + toast amb undo. Retorna true.
// Si no: retorna false perquè el caller faci fallback al formulari.
function tryQuickBuyShoppingItem(item) {
  const prefill = _buildShoppingPrefill(item);
  const hasZone = !!prefill.location;
  const hasExpiry = !!prefill.days || !!prefill.noExpiry;
  if (!hasZone || !hasExpiry) return false;

  const newProduct = _quickBuyCore(item, prefill);
  if (!newProduct) return false;

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
  const loc = (typeof getLocationById === 'function') ? getLocationById(newProduct.location) : null;
  const locName = loc && typeof getLocationName === 'function' ? getLocationName(loc) : (newProduct.location || '');
  const daysText = newProduct.noExpiry
    ? 'sense caducitat'
    : (prefill.days || 7) + ' dies';
  const emojiPart = newProduct.emoji ? newProduct.emoji + ' ' : '';
  showUndoableToast({
    message: '✅ ' + emojiPart + newProduct.name + ' → ' + locName + ' (' + daysText + ')',
    durationMs: 5000,
    onUndo: () => undoQuickBuy(newProduct.id, item)
  });

  return true;
}

// Mutació pura sobre els arrays in-memory: afegeix el producte a `products`,
// treu l'item de `shoppingItems`, registra a l'historial. NO desa, NO renderitza,
// NO mostra toast — això es fa al caller per poder agrupar-ho en lots.
// Retorna el newProduct (o null si no es pot construir).
function _quickBuyCore(item, prefill) {
  if (!prefill || !prefill.location) return null;

  const today = new Date();
  let dateStr = null;
  if (!prefill.noExpiry) {
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + (prefill.days || 7));
    dateStr = (typeof formatDateLocal === 'function') ? formatDateLocal(expiry) : null;
  }

  const newProduct = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    name: prefill.name,
    emoji: prefill.emoji,
    date: dateStr,
    noExpiry: !!prefill.noExpiry,
    location: prefill.location,
    qty: (item && item.qty) || prefill.qty || '',
    addedAt: new Date().toISOString()
  };
  if (typeof prefill.price === 'number' && prefill.price >= 0) newProduct.price = prefill.price;
  if (prefill.weight) newProduct.weight = prefill.weight;

  // frozenDate si va al congelador (mateixa regla que saveNewProduct).
  const newProductLoc = (typeof getLocationById === 'function') ? getLocationById(prefill.location) : null;
  if (newProductLoc && newProductLoc.category === 'freezer' && typeof formatDateLocal === 'function') {
    newProduct.frozenDate = formatDateLocal(today);
  }

  // Aprenentatge: registra a l'historial / popular (mateixa crida que saveNewProduct).
  if (typeof recordProductInHistory === 'function') {
    recordProductInHistory(prefill.name, prefill.emoji, prefill.location,
      prefill.days, !!prefill.noExpiry, newProduct.price, newProduct.weight);
  }

  if (!Array.isArray(products)) products = [];
  products.push(newProduct);

  if (Array.isArray(shoppingItems)) {
    shoppingItems = shoppingItems.filter(it => it.id !== item.id);
  }

  return newProduct;
}

// Desfer una compra ràpida individual.
function undoQuickBuy(newProductId, originalItem) {
  if (Array.isArray(products)) {
    products = products.filter(p => p.id !== newProductId);
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
  showToast('↺ ' + (originalItem ? originalItem.name : '') + ' restaurat al BuyMe');
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

  items.forEach(item => {
    const prefill = _buildShoppingPrefill(item);
    const hasZone = !!prefill.location;
    const hasExpiry = !!prefill.days || !!prefill.noExpiry;
    if (hasZone && hasExpiry) {
      const np = _quickBuyCore(item, prefill);
      if (np) {
        pairs.push({ newProductId: np.id, originalItem: item });
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
    let msg = '✅ ' + nQ + ' producte' + (nQ === 1 ? '' : 's') + ' → EatMe';
    if (needsFormCount > 0) {
      msg += '. ' + needsFormCount + ' necessit' + (needsFormCount === 1 ? 'a' : 'en') + ' ompliment manual';
    }
    showUndoableToast({
      message: msg,
      durationMs: 6000,
      onUndo: () => undoQuickBuyMultiple(pairs)
    });
  } else if (needsFormCount > 0) {
    showToast(needsFormCount + ' necessit' + (needsFormCount === 1 ? 'a' : 'en') + ' ompliment manual');
  }
}

function undoQuickBuyMultiple(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return;
  const idsToRemove = new Set(pairs.map(p => p.newProductId));
  if (Array.isArray(products)) {
    products = products.filter(p => !idsToRemove.has(p.id));
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
  showToast('↺ ' + pairs.length + ' producte' + (pairs.length === 1 ? '' : 's') + ' restaurat' + (pairs.length === 1 ? '' : 's') + ' al BuyMe');
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

  document.getElementById('input-shopping-name').value = p.name || '';
  document.getElementById('input-shopping-qty').value = '';
  document.getElementById('input-shopping-notes').value = '';
  selectedShoppingEmoji = p.emoji || '🥛';
  renderShoppingEmojiPicker();

  const dateInput = document.getElementById('input-shopping-date');
  const noExpInput = document.getElementById('input-shopping-no-expiry');
  if (noExpInput) noExpInput.checked = !!p.noExpiry;
  if (dateInput) {
    if (p.noExpiry) {
      dateInput.value = '';
    } else if (p.days) {
      const d = new Date();
      d.setDate(d.getDate() + p.days);
      dateInput.value = formatDateForInput(d);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dateInput.value = formatDateForInput(d);
    }
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


let shoppingItems = []; // Array de {id, supermarketId, name, emoji, qty, notes, addedAt}

let editingShoppingItem = null;

let selectedShoppingEmoji = '🥛';

function renderShoppingEmojiPickerBtn() {
  const btn = document.getElementById('shopping-emoji-current');
  if (btn) btn.textContent = selectedShoppingEmoji;
}

// Variables per saber quin camp està seleccionant emoji
