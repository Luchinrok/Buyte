/* ============================================
   Buyte — js/biteme.js
   Mòdul del tracker de caducitats: estat dels productes,
   ubicacions, pantalles inicial / seccions / detall,
   formulari manual i historial d'aprenentatge.
   ============================================ */


// ESTAT
let products = [];
let stats = { consumed: 0, trashed: 0 };
let currentLevel = null;
let currentProduct = null;
let selectedEmoji = '🥛';
let selectedLocation = 'fridge';
let locations = []; // Carregades de localStorage o per defecte

function loadLocations() {
  const saved = localStorage.getItem('eatmefirst_locations');
  if (saved) {
    try { locations = JSON.parse(saved); }
    catch(e) { locations = JSON.parse(JSON.stringify(DEFAULT_LOCATIONS)); }
  } else {
    locations = JSON.parse(JSON.stringify(DEFAULT_LOCATIONS));
  }

  // Migració: dels sistemes antics (multiplier i type) al nou (category)
  let migrated = false;
  locations.forEach(loc => {
    if (!loc.category) {
      // Sistema antic amb 'type'
      if (loc.type === 'freezer') {
        loc.category = 'freezer';
      } else if (loc.multiplier && loc.multiplier >= 4) {
        loc.category = 'freezer';
      } else if (loc.id === 'fridge') {
        loc.category = 'fridge';
      } else if (loc.id === 'freezer') {
        loc.category = 'freezer';
      } else if (loc.id === 'pantry' || loc.id === 'fruit_bowl' || loc.id === 'counter') {
        loc.category = 'pantry';
      } else {
        // Per defecte, qualsevol cosa que no és nevera ni congelador → rebost
        loc.category = 'pantry';
      }
      delete loc.type;
      delete loc.multiplier;
      migrated = true;
    }
  });
  // Migració: afegir Farmaciola si no existeix
  if (!locations.find(l => l.id === 'medicine')) {
    locations.push({ id: 'medicine', emoji: '💊', nameKey: 'locMedicine', category: 'pantry' });
    migrated = true;
  }
  if (migrated) saveLocations();
}

function saveLocations() {
  localStorage.setItem('eatmefirst_locations', JSON.stringify(locations));
  if (typeof pushToServer === 'function') pushToServer();
}

let viewAllSortMode = 'expiry';

function openViewAll() {
  renderViewAll();
  showScreen('view-all');
}

function renderViewAll() {
  const container = document.getElementById('view-all-list');
  if (!container) return;
  container.innerHTML = '';

  if (products.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noProducts');
    container.appendChild(empty);
    return;
  }

  let sorted = [...products];
  if (viewAllSortMode === 'expiry') {
    sorted.sort((a, b) => {
      const da = daysUntil(a.date);
      const db = daysUntil(b.date);
      return da - db;
    });
  } else {
    sorted.sort((a, b) => {
      const la = getLocationById(a.location || 'fridge');
      const lb = getLocationById(b.location || 'fridge');
      const na = la ? getLocationName(la) : '';
      const nb = lb ? getLocationName(lb) : '';
      return na.localeCompare(nb);
    });
  }

  if (viewAllSortMode === 'zone') {
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
      container.appendChild(buildViewAllRow(p));
    });
  } else {
    sorted.forEach(p => container.appendChild(buildViewAllRow(p)));
  }
}

function buildViewAllRow(p) {
  const days = daysUntil(p.date);
  const loc = getLocationById(p.location || 'fridge');
  const row = document.createElement('button');
  row.className = 'view-all-row';
  row.innerHTML = `
    <span class="view-all-emoji">${p.emoji}</span>
    <div class="view-all-info">
      <p class="view-all-name">${formatProductLine(p.name, p.qty)}</p>
      <p class="view-all-meta">${loc ? loc.emoji + ' ' + getLocationName(loc) : ''} · ${daysText(days)}</p>
    </div>
    <span class="view-all-arrow">›</span>
  `;
  row.addEventListener('click', () => openProductDetail(p));
  return row;
}

function getLocationName(loc) {
  // Si té nom personalitzat, l'usa; sinó, agafa el de l'idioma
  return loc.customName || (loc.nameKey ? t(loc.nameKey) : loc.id);
}

function getLocationById(id) {
  return locations.find(l => l.id === id) || locations[0];
}

// DADES
function saveData() {
  localStorage.setItem('eatmefirst_products', JSON.stringify(products));
  localStorage.setItem('eatmefirst_stats', JSON.stringify(stats));
  if (typeof pushToServer === 'function') pushToServer();
}

function loadData() {
  const p = localStorage.getItem('eatmefirst_products');
  const s = localStorage.getItem('eatmefirst_stats');
  if (p) { try { products = JSON.parse(p); } catch(e){ products = []; } }
  if (s) { try { stats = JSON.parse(s); } catch(e){ stats = {consumed:0,trashed:0}; } }
}



// Ajuda: dóna el nivell d'un producte segons la seva ubicació
function getProductLevel(product) {
  const loc = getLocationById(product.location || 'fridge');
  const cat = loc ? loc.category : 'fridge';
  return getLevel(daysUntil(product.date), cat);
}

// Formata la informació de congelació per mostrar-la al detall i al
// llistat. Retorna null si el producte no té frozenDate (no s'ha
// d'imprimir res). El format és:
//   "❄️ Congelat el d/m/yyyy (fa N dies)"
//   "❄️ Congelat el d/m/yyyy (fa N mesos)"
// Només té sentit cridar-ho quan el producte ÉS al congelador
// actualment; el caller ja ha de comprovar la zona.
function formatFrozenInfo(product) {
  if (!product || !product.frozenDate) return null;
  const frozen = new Date(product.frozenDate + 'T00:00:00');
  if (isNaN(frozen.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  frozen.setHours(0, 0, 0, 0);
  const ms = today - frozen;
  const days = Math.max(0, Math.floor(ms / 86400000));
  let dateStr;
  try { dateStr = frozen.toLocaleDateString('ca-ES'); }
  catch (e) { dateStr = product.frozenDate; }
  let ago;
  if (days === 0) ago = 'avui';
  else if (days === 1) ago = 'fa 1 dia';
  else if (days < 60) ago = 'fa ' + days + ' dies';
  else {
    const months = Math.floor(days / 30);
    ago = 'fa ' + months + (months === 1 ? ' mes' : ' mesos');
  }
  return '❄️ Congelat el ' + dateStr + ' (' + ago + ')';
}

// NEVI — colors del cos i la vora del mascot per nivell. Han de
// coincidir amb els gradients de les urgency cards (.shelf-N) perquè
// l'usuari vegi el mateix codi de color a tota l'experiència del
// nivell. Paleta:
//   green  → verds  (Material Green / personal palette)
//   yellow → BLAUS  (no grocs!) — alineat amb .shelf-yellow
//                                 (#42A5F5 → #1565C0)
//   orange → TARONJA pur — alineat amb .shelf-orange
//                          (#FFA000 → #F57C00) — sense tirar a vermell
//   red    → vermells — alineat amb .shelf-red
//                       (#EF5350 → #C62828)
const neviMoods = {
  green: { body: '#C0DD97', border: '#639922', eyes: '#173404', mouth: 'M 25 54 Q 35 70 45 54' },
  yellow:{ body: '#90CAF9', border: '#1565C0', eyes: '#0D47A1', mouth: 'M 25 58 Q 35 64 45 58' },
  orange:{ body: '#FFCC80', border: '#F57C00', eyes: '#BF360C', mouth: 'M 26 61 L 44 61' },
  red:   { body: '#F09595', border: '#C62828', eyes: '#501313', mouth: 'M 25 64 Q 35 56 45 64' }
};

// Missatges del mascot Nevi.
//
// La versió històrica (flat: { green, yellow, orange, red }) servia
// per a la nevera. Però els llindars de freezer i pantry són molt
// diferents (vegeu ALERT_SCALES a js/core.js): "orange" al congelador
// són 8-29 dies — dir "Avui o demà toca menjar això" és incorrecte.
//
// Ara la versió `ca` és nested per zona; la resta de llengües es
// mantenen flat com a fallback (totes les zones comparteixen text)
// fins que es tradueixin. _getNeviMessage gestiona els dos formats.
const neviMessages = {
  ca: {
    fridge: {
      green:  'Tens temps de sobres per consumir aquests productes',
      yellow: 'Aviat caduquen. Planeja el menú dels propers dies',
      orange: "S'han d'usar en 1-2 dies. Què cuinaràs?",
      red:    'Avui o ja caducat! Consumeix-ho com sigui'
    },
    freezer: {
      green:  'Encara tenen molt marge al congelador',
      yellow: 'Comencen a tenir mesos. Considera fer-los servir aviat',
      orange: "S'estan apropant al límit. Fes-los servir en setmanes",
      red:    'Convé descongelar-los i consumir aquesta setmana'
    },
    pantry: {
      green:  'Productes amb molt de marge',
      yellow: 'Fes-los servir aviat',
      orange: "Comencen a apropar-se al límit",
      red:    'Convé fer-los servir aquesta setmana'
    }
  },
  es: { green: '¡Todo bien! Nada caduca próximamente.', yellow: 'Empieza a pensar qué hacer con estos.', orange: '¡Hoy o mañana hay que comerlos!', red: '¡Tenemos que actuar rápido!' },
  en: { green: 'All good! Nothing expiring soon.', yellow: 'Start thinking what to do with these.', orange: 'Today or tomorrow we eat these!', red: 'Oh no! We need to act fast!' },
  fr: { green: 'Tout va bien !', yellow: 'Commence à réfléchir à quoi faire.', orange: 'Aujourd\'hui ou demain !', red: 'Oh non ! Il faut faire vite !' },
  it: { green: 'Tutto bene!', yellow: 'Inizia a pensare cosa farne.', orange: 'Oggi o domani!', red: 'Dobbiamo fare in fretta!' },
  de: { green: 'Alles in Ordnung!', yellow: 'Überleg dir, was damit zu tun ist.', orange: 'Heute oder morgen!', red: 'Schnell handeln!' },
  ru: { green: 'Всё хорошо!', yellow: 'Подумай, что с ними делать.', orange: 'Сегодня или завтра!', red: 'Надо действовать быстро!' },
  zh: { green: '一切都好!', yellow: '开始考虑怎么处理。', orange: '今天或明天!', red: '需要快速行动!' }
};

function _getNeviMessage(lang, cat, level) {
  const langMsgs = neviMessages[lang] || neviMessages.ca;
  if (!langMsgs) return '';
  // Format nested per zona (ca actualment): { fridge: {green: ...}, ... }
  const zoneMsgs = langMsgs[cat || 'fridge'];
  if (zoneMsgs && typeof zoneMsgs === 'object' && zoneMsgs[level]) {
    return zoneMsgs[level];
  }
  // Format flat (la resta de llengües, encara per traduir per zona).
  return langMsgs[level] || '';
}

function setNevi(level, cat) {
  const m = neviMoods[level];
  const lang = getCurrentLang();
  document.getElementById('nevi-body').setAttribute('fill', m.body);
  document.getElementById('nevi-body').setAttribute('stroke', m.border);
  document.getElementById('nevi-divider').setAttribute('stroke', m.border);
  document.getElementById('nevi-eye-left').setAttribute('fill', m.eyes);
  document.getElementById('nevi-eye-right').setAttribute('fill', m.eyes);
  document.getElementById('nevi-mouth').setAttribute('stroke', m.eyes);
  document.getElementById('nevi-mouth').setAttribute('d', m.mouth);
  document.getElementById('nevi-message').textContent = _getNeviMessage(lang, cat, level);
}

function renderHome() {
  // Activar animació de la campana un sol cop
  const bell = document.getElementById('bell-icon');
  if (bell) {
    bell.classList.remove('bell-shake');
    // Force reflow per reiniciar l'animació
    void bell.offsetWidth;
    bell.classList.add('bell-shake');
  }

  const counts = { fridge: 0, freezer: 0, pantry: 0 };
  const alerts = { fridge: 0, freezer: 0, pantry: 0, total: 0 };

  products.forEach(p => {
    const loc = getLocationById(p.location || 'fridge');
    const cat = loc ? loc.category : 'fridge';
    if (counts[cat] !== undefined) counts[cat]++;

    const level = getLevel(daysUntil(p.date), cat);
    if (level === 'orange' || level === 'red') {
      if (alerts[cat] !== undefined) alerts[cat]++;
      alerts.total++;
    }
  });

  document.getElementById('count-fridge').textContent = formatCount(counts.fridge);
  document.getElementById('count-freezer').textContent = formatCount(counts.freezer);
  document.getElementById('count-pantry').textContent = formatCount(counts.pantry);
  document.getElementById('count-alerts').textContent = formatCount(alerts.total);

  setBadge('badge-fridge', alerts.fridge);
  setBadge('badge-freezer', alerts.freezer);
  setBadge('badge-pantry', alerts.pantry);
  setBadge('badge-alerts', alerts.total);

  const total = products.length;
  let summary;
  if (total === 0) {
    summary = t('noProducts');
  } else {
    summary = t('productCount', total);
    if (alerts.total > 0) summary += ' · ' + t('urgent', alerts.total);
  }
  document.getElementById('top-summary').textContent = summary;
}

function formatCount(n) {
  if (n === 0) return t('emptySection');
  return t('productCount', n);
}

function setBadge(elemId, count) {
  const el = document.getElementById(elemId);
  if (!el) return;
  if (count > 0) {
    el.textContent = count;
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

// Variable: quina secció estem mirant
let currentSection = 'fridge';
const SECTION_ORDER = ['fridge', 'freezer', 'pantry'];

const SECTION_TITLE_EMOJI = { fridge: '🧊', freezer: '❄️', pantry: '🥫' };

function openSection(category) {
  currentSection = category;
  if (category === 'alerts') {
    renderAlerts();
    showScreen('alerts');
    return;
  }
  renderSection();
  showScreen('section');
  // Salt instantani a la pàgina de la zona escollida un cop el slider
  // és visible (cal layout calculat per saber clientWidth).
  requestAnimationFrame(() => _scrollToSection(currentSection, false));
}

// Instància única de Swiper per a #zones-slider. Es crea peresosament
// (a _ensureZonesSwiper) la primera vegada que el slider té dimensions
// (ergo el screen-section és .active) — Swiper necessita conèixer
// l'amplada/altura del contenidor per col·locar i transformar les
// cares. Mai destruïda: la mateixa instància gestiona tot el cicle de
// vida de la pantalla.
let _zonesSwiper = null;

function _ensureZonesSwiper() {
  if (_zonesSwiper) return _zonesSwiper;
  const slider = document.getElementById('zones-slider');
  if (!slider || !slider.clientWidth) return null;
  // Configuració "creative effect" tipus Stories d'Instagram: la cara
  // sortint/entrant es desplaça 100% i recula -200px en Z amb una
  // rotació suau de 30° al voltant de Y. opacity 0.5 per fondre les
  // cares no centrals (efecte "card stack" més suau que un cub real).
  _zonesSwiper = new Swiper('#zones-slider', {
    // Cub real estil galeria 3D (Swiper EffectCube). Cada cara és una
    // zona; el cub rota 90° entre cares. shadowOffset i shadowScale
    // ajustats per a un efecte més suau que el cub-pur de demo (no
    // ombres exagerades sota la cara activa). speed: 600ms perquè la
    // rotació de 90° tingui temps de "respirar".
    effect: 'cube',
    cubeEffect: {
      // shadow:false → desactivem la "ground shadow" projectada sota
      // el cub. Era la principal causa visual de la "ombra lletja a
      // baix": una el·lipse fosca que apareixia centrada al peu del
      // slider, no integrada amb el disseny de la pantalla. Mantenim
      // slideShadows: true perquè és el que dóna profunditat ENTRE
      // cares (gradient subtil sobre les cares laterals) — això sí
      // que ajuda a la sensació 3D.
      shadow: false,
      slideShadows: true,
      shadowOffset: 20,
      shadowScale: 0.94
    },
    speed: 600,
    grabCursor: true,
    // Sensibilitat del swipe — molt permissiva. Amb els defaults de
    // Swiper (longSwipesRatio 0.5) cal arrossegar més de la meitat
    // del cub abans que es comprometi a avançar; per sota d'aquest
    // llindar el cub torna enrere. Combinat amb effect: 'cube' i
    // loop:true, en algunes configuracions el snap es queda atrapat
    // a mig camí (rotació al 50°, ni avança ni torna). Aquests valors
    // baixen els llindars al màxim raonable:
    //   threshold: 5          — descarta moviments < 5px (jitter)
    //   longSwipesRatio: 0.2  — 20% d'arrossegament ja compromet
    //                            l'avanç (default Swiper: 0.5)
    //   longSwipesMs: 200     — temps mínim que defineix "swipe llarg"
    //                            (default 300; més baix = resposta
    //                            més ràpida)
    //   resistanceRatio: 0.85 — quant rebot hi ha en arribar a un
    //                            extrem; amb loop:true gairebé no
    //                            aplica però el deixem explícit.
    //   shortSwipes / longSwipes / followFinger — defaults explícits
    //                            per a documentació.
    threshold: 5,
    touchRatio: 1,
    longSwipes: true,
    longSwipesRatio: 0.2,
    longSwipesMs: 200,
    shortSwipes: true,
    followFinger: true,
    resistanceRatio: 0.85,
    // preventClicks defaults to true en Swiper; bloqueja el click
    // event posterior si durant el touch hi ha hagut qualsevol
    // moviment. En desktop el ratolí no jitter, però en mòbil el dit
    // SÍ — qualsevol micromoviment durant un tap es classifica com
    // a swipe i el click sobre un .shelf es perd. Per això el
    // Congelador "deixa de funcionar" en format mòbil tot i que
    // funciona en desktop. Desactivem preventClicks i la seva
    // propagació així el browser sempre dispara el click esperat.
    preventClicks: false,
    preventClicksPropagation: false,
    // loop: true → Swiper duplica les primeres/últimes diapositives
    // perquè la transició final → primera (i viceversa) sigui contínua
    // i no salti. Conseqüència: this.activeIndex inclou els duplicats;
    // per accedir a SECTION_ORDER cal usar this.realIndex (sense
    // duplicats), i per navegar programàticament cal slideToLoop()
    // en comptes de slideTo() (vegeu _scrollToSection).
    loop: true,
    pagination: {
      el: '#section-dots',
      clickable: true,
      bulletClass: 'section-dot',
      bulletActiveClass: 'active',
      renderBullet: function(index, className) {
        // Swiper passa l'índex REAL aquí (no els duplicats), així que
        // mapeja directament a SECTION_ORDER.
        const cat = SECTION_ORDER[index] || '';
        return '<button class="' + className + '" type="button" data-zone="' + cat + '" aria-label="' + cat + '"></button>';
      }
    },
    on: {
      slideChange: function() {
        const cat = SECTION_ORDER[this.realIndex];
        if (cat && cat !== currentSection) {
          currentSection = cat;
          _updateSectionTitle();
        }
      }
      // touchEnd safety net ELIMINAT. La idea era forçar un slideTo
      // 50ms després de cada touch per a casos de cub mig girat. Però
      // aquest slideTo, en cridar-se DESPRÉS de cada toc (incloent
      // taps purs sobre un shelf), feia entrar Swiper en mode
      // "transitioning"; combinat amb el default preventClicks:true,
      // això suprimia el click event posterior de manera intermitent
      // (típicament en zones a les quals s'havia arribat amb swipe
      // previ — Nevera funcionava perquè era el slide inicial sense
      // tocar, Congelador fallava perquè calia un swipe per arribar-hi
      // i la xarxa de seguretat deixava state residual). Amb
      // longSwipesRatio: 0.2 ja prou permissiu, els cubs mig girats
      // són rars; preferim arriscar un mig-gir ocasional abans que
      // perdre clicks de navegació.
    }
  });
  return _zonesSwiper;
}

// Salta a la pàgina de la zona indicada. `smooth=false` ⇒ salt instantani
// (durada 0); `smooth=true` ⇒ animació de 400ms (paral·lela al
// `speed` configurat al Swiper). Si Swiper encara no s'ha pogut
// instanciar (slider sense dimensions perquè la pantalla no és .active),
// reintenta al següent frame fins que el layout estigui calculat.
function _scrollToSection(cat, smooth) {
  const idx = SECTION_ORDER.indexOf(cat);
  if (idx < 0) return;
  const swiper = _ensureZonesSwiper();
  if (!swiper) {
    requestAnimationFrame(() => _scrollToSection(cat, smooth));
    return;
  }
  // update() abans del slideTo: si el slider acaba d'esdevenir
  // visible (showScreen al frame anterior), Swiper pot tenir
  // dimensions cachejades obsoletes. Sense això, l'efecte cube
  // calculava les rotacions sobre una mida incorrecta i el primer
  // swipe no avançava completament — l'usuari havia de lliscar dues
  // vegades.
  swiper.update();
  // slideToLoop (no slideTo) perquè loop:true està activat: slideTo
  // opera sobre l'array intern amb duplicats, slideToLoop sobre els
  // índexs originals (que és el que volem aquí).
  swiper.slideToLoop(idx, smooth ? 600 : 0);
  // Segon update() amb un petit delay: cobreix el cas en què la
  // primera entrada a la pantalla aplica height: 70vh però el layout
  // del .screen encara està estabilitzant-se (canvi de viewport
  // virtual a iOS, rotació, etc.).
  setTimeout(() => {
    if (_zonesSwiper === swiper) swiper.update();
  }, 120);
}

// Resize: Swiper té el seu propi ResizeObserver intern, així que no
// cal fer res. Mantenim la funció buida per si algun caller hereta del
// codi anterior.
(function _wireSectionResnap() {
  if (typeof window === 'undefined') return;
  if (window.__zonesSliderResizeWired) return;
  window.__zonesSliderResizeWired = true;
  // Swiper s'auto-ajusta amb el seu ResizeObserver intern.
})();

function renderSection() {
  const slider = document.getElementById('zones-slider');
  if (!slider) return;
  const wrapper = slider.querySelector('.swiper-wrapper');
  if (!wrapper) return;

  // Construïm les pàgines (.swiper-slide) un sol cop. La majoria de
  // re-renders només actualitzen comptadors i subtítols dins de cada
  // slide ja existent — Swiper conserva la seva instància intacta.
  //
  // CRÍTIC: amb loop:true, Swiper afegeix slides duplicats al wrapper
  // (clones de primera/última per a la transició cíclica). Comptem
  // només els slides ORIGINALS per detectar canvis de mida real;
  // sense aquest filtre, qualsevol re-render post-init veuria 5
  // children (3 originals + 2 duplicats) ≠ 3 SECTION_ORDER, dispararia
  // un rebuild + destrucció de la instància de Swiper viva, amb
  // Swiper encara intentant accedir als slides ja esborrats. (No era
  // un loop a BiteMe perquè slideChange no crida renderSection, però
  // sí podia causar errors al afegir productes.)
  const originalSlides = wrapper.querySelectorAll(':scope > .swiper-slide:not(.swiper-slide-duplicate)');
  if (originalSlides.length !== SECTION_ORDER.length) {
    wrapper.innerHTML = '';
    SECTION_ORDER.forEach(cat => {
      const page = document.createElement('div');
      page.className = 'zone-page swiper-slide';
      page.dataset.zone = cat;
      const fridge = document.createElement('div');
      fridge.className = 'fridge';
      ['green', 'yellow', 'orange', 'red'].forEach(level => {
        const shelf = document.createElement('div');
        shelf.className = 'shelf shelf-' + level;
        shelf.dataset.level = level;
        shelf.dataset.zone = cat;
        const titleKey = 'shelf' + level.charAt(0).toUpperCase() + level.slice(1);
        shelf.innerHTML =
          '<div class="shelf-text">' +
            '<p class="shelf-title">' + t(titleKey) + '</p>' +
            '<p class="shelf-sub" data-shelf-sub></p>' +
          '</div>' +
          '<div class="shelf-count">' +
            '<span data-shelf-count>0</span>' +
            '<span class="shelf-arrow">›</span>' +
          '</div>';
        fridge.appendChild(shelf);
      });
      page.appendChild(fridge);
      wrapper.appendChild(page);
    });
  }

  // Actualitzem comptadors i subtítols per a totes les zones.
  // querySelectorAll perquè amb loop:true Swiper té duplicats de
  // primera/última al wrapper, i tots dos (original + clone) han de
  // mostrar comptadors actualitzats — sense això, el clone visible
  // a la costura del loop quedaria amb números obsolets.
  SECTION_ORDER.forEach(cat => {
    const pages = wrapper.querySelectorAll('.zone-page[data-zone="' + cat + '"]');
    if (!pages.length) return;
    const scale = ALERT_SCALES[cat];

    const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
    products.forEach(p => {
      const loc = getLocationById(p.location || 'fridge');
      const pcat = loc ? loc.category : 'fridge';
      if (pcat !== cat) return;
      counts[getLevel(daysUntil(p.date), cat)]++;
    });

    pages.forEach(page => page.querySelectorAll('.shelf').forEach(shelf => {
      const level = shelf.dataset.level;
      const subEl = shelf.querySelector('[data-shelf-sub]');
      const countEl = shelf.querySelector('[data-shelf-count]');
      if (countEl) countEl.textContent = counts[level];
      if (!subEl) return;
      if (level === 'green') subEl.textContent = t('moreThan', scale.green) + ' ' + t('days');
      else if (level === 'yellow') subEl.textContent = scale.yellow + '-' + scale.green + ' ' + t('days');
      else if (level === 'orange') subEl.textContent = scale.orange + '-' + (scale.yellow - 1) + ' ' + t('days');
      else if (level === 'red') {
        subEl.textContent = scale.orange === 1 ? t('todayOrExpired') : t('lessThan', scale.orange) + ' ' + t('days');
      }
    }));
  });

  _updateSectionTitle();
}

function _updateSectionTitle() {
  const titleEl = document.getElementById('section-title');
  if (!titleEl) return;
  const titles = {
    fridge: SECTION_TITLE_EMOJI.fridge + ' ' + t('catFridge'),
    freezer: SECTION_TITLE_EMOJI.freezer + ' ' + t('catFreezer'),
    pantry: SECTION_TITLE_EMOJI.pantry + ' ' + t('catPantry')
  };
  titleEl.textContent = titles[currentSection] || '';
}

// Hooks deixats buits per backward compat: la lògica de tots dos
// (escolta de scroll-snap i rebuild manual de dots) viu ara dins de
// la instància Swiper a _ensureZonesSwiper. Si algun caller heretat
// invoca aquestes funcions, no fa res.
function _setupSliderScrollListener() {}
function renderSectionDots() {}

function goToSection(cat) {
  if (cat === currentSection) return;
  if (SECTION_ORDER.indexOf(cat) < 0) return;
  _scrollToSection(cat, true);
  // currentSection s'actualitzarà via slideChange del Swiper quan
  // acabi l'animació.
}

function navigateSection(direction) {
  const idx = SECTION_ORDER.indexOf(currentSection);
  if (idx < 0) return;
  let newIdx = idx + direction;
  if (newIdx < 0) newIdx = SECTION_ORDER.length - 1;
  if (newIdx >= SECTION_ORDER.length) newIdx = 0;
  _scrollToSection(SECTION_ORDER[newIdx], true);
}

// PANTALLA D'ALERTES
function renderAlerts() {
  const list = document.getElementById('alerts-list');
  const empty = document.getElementById('alerts-empty');
  const summary = document.getElementById('alerts-summary');
  list.innerHTML = '';

  // Productes amb nivell taronja o vermell, ordenats pels més urgents
  const alertProducts = products
    .map(p => {
      const loc = getLocationById(p.location || 'fridge');
      const cat = loc ? loc.category : 'fridge';
      return {
        ...p,
        days: daysUntil(p.date),
        level: getLevel(daysUntil(p.date), cat),
        loc: loc,
        cat: cat
      };
    })
    .filter(p => p.level === 'orange' || p.level === 'red')
    .sort((a, b) => a.days - b.days);

  if (alertProducts.length === 0) {
    empty.style.display = 'block';
    summary.textContent = '';
    return;
  }

  empty.style.display = 'none';
  summary.textContent = t('alertsCount', alertProducts.length);

  alertProducts.forEach(p => {
    const item = document.createElement('div');
    item.className = 'product-item product-item-alert product-item-' + p.level;
    const locLabel = p.loc ? p.loc.emoji + ' ' + getLocationName(p.loc) + ' · ' : '';
    item.innerHTML = '<span class="product-item-emoji">' + p.emoji + '</span><div class="product-item-info"><div class="product-item-name"></div><div class="product-item-days"></div></div><span class="product-item-arrow">›</span>';
    item.querySelector('.product-item-name').innerHTML = formatProductLine(p.name, p.qty);
    item.querySelector('.product-item-days').textContent = locLabel + daysText(p.days);
    item.addEventListener('click', () => { productDetailBack = 'alerts'; openProduct(p.id); });
    list.appendChild(item);
  });
}

// LLISTA - mostra productes d'un nivell DINS de la secció actual
// Empty states per nivell — icona + títol + missatge curt amb to
// positiu (especialment a Alerta: és bo no tenir res aquí).
const SHELF_EMPTY_STATES = {
  green:  { icon: '🌿', title: 'Cap producte tranquil aquí', message: 'Tot el que tens està més proper a caducar' },
  yellow: { icon: '✨', title: 'Res a vigilar de moment!',   message: 'No hi ha productes en aquest rang de dates' },
  orange: { icon: '🌟', title: 'Cap urgència!',              message: 'No tens res que caduqui aviat' },
  red:    { icon: '🎉', title: 'Excel·lent!',                 message: 'No tens cap producte caducat ni que caduqui avui' }
};

// Ordre dels nivells al cub: el mateix que l'ordre dels prestatges
// dintre d'una zona (de menys urgent a més urgent). LEVEL_ORDER[i]
// correspon a la cara `i` del cub i a l'i-èssim bullet de paginació.
const LEVEL_ORDER = ['green', 'yellow', 'orange', 'red'];

// Pinta tot el contingut d'un slide (llista de productes o empty-state)
// per al `level` i `cat` (zona) donats. Reutilitzable: cada vegada que
// canvia la zona o que canvien els productes, recridem-ho per a tots
// 4 nivells.
function _renderShelfProducts(slide, level, cat) {
  const listEl = slide.querySelector('.product-list');
  const emptyEl = slide.querySelector('.empty-state');
  if (!listEl || !emptyEl) return;

  const shelfProducts = products
    .map(p => {
      const loc = getLocationById(p.location || 'fridge');
      const pcat = loc ? loc.category : 'fridge';
      return { ...p, days: daysUntil(p.date), pcat: pcat, loc: loc };
    })
    .filter(p => p.pcat === cat && getLevel(p.days, cat) === level)
    .sort((a, b) => a.days - b.days);

  listEl.innerHTML = '';
  if (shelfProducts.length === 0) {
    const state = SHELF_EMPTY_STATES[level] || SHELF_EMPTY_STATES.green;
    const iconEl = emptyEl.querySelector('.empty-state-icon');
    const titleEl = emptyEl.querySelector('.empty-state-title');
    const msgEl = emptyEl.querySelector('.empty-state-message');
    if (iconEl) iconEl.textContent = state.icon;
    if (titleEl) titleEl.textContent = state.title;
    if (msgEl) msgEl.textContent = state.message;
    emptyEl.style.display = 'flex';
  } else {
    emptyEl.style.display = 'none';
    shelfProducts.forEach(p => {
      const item = document.createElement('div');
      item.className = 'product-item';
      const locLabel = p.loc ? p.loc.emoji + ' ' + getLocationName(p.loc) + ' · ' : '';
      // Subtítol addicional amb la data de congelació quan el producte
      // és al congelador (NOMÉS al congelador — a la resta no aporta
      // res, el frozenDate pot existir d'una sessió anterior).
      const isFreezer = p.loc && p.loc.category === 'freezer';
      const frozenLine = isFreezer ? formatFrozenInfo(p) : null;
      item.innerHTML = '<span class="product-item-emoji">' + p.emoji + '</span><div class="product-item-info"><div class="product-item-name"></div><div class="product-item-days"></div>' + (frozenLine ? '<div class="product-item-frozen"></div>' : '') + '</div><span class="product-item-arrow">›</span>';
      item.querySelector('.product-item-name').innerHTML = formatProductLine(p.name, p.qty);
      item.querySelector('.product-item-days').textContent = locLabel + daysText(p.days);
      if (frozenLine) {
        const frozenEl = item.querySelector('.product-item-frozen');
        if (frozenEl) frozenEl.textContent = frozenLine;
      }
      item.addEventListener('click', () => { productDetailBack = 'list'; openProduct(p.id); });
      listEl.appendChild(item);
    });
  }
}

// Construeix els 4 slides .level-page dins de #levels-slider (un sol
// cop per session). Crida idempotent — si els 4 originals ja existeixen,
// torna sense fer res. (Filtra .swiper-slide-duplicate per no comptar
// els clones que Swiper afegeix amb loop:true.)
function _buildLevelSlides() {
  const slider = document.getElementById('levels-slider');
  if (!slider) return;
  const wrapper = slider.querySelector('.swiper-wrapper');
  if (!wrapper) return;
  const originals = wrapper.querySelectorAll(':scope > .swiper-slide:not(.swiper-slide-duplicate)');
  if (originals.length === LEVEL_ORDER.length) return;
  wrapper.innerHTML = '';
  LEVEL_ORDER.forEach(level => {
    const slide = document.createElement('div');
    slide.className = 'level-page swiper-slide';
    slide.dataset.level = level;
    slide.innerHTML =
      '<div class="product-list"></div>' +
      '<div class="empty-state" style="display:none">' +
        '<div class="empty-state-icon">📦</div>' +
        '<h3 class="empty-state-title"></h3>' +
        '<p class="empty-state-message"></p>' +
      '</div>';
    wrapper.appendChild(slide);
  });
}

// Actualitza el títol del header (zona + nivell) i la mascota nevi
// segons el nivell i la zona actuals.
function _updateLevelHeaderAndNevi(level) {
  const cat = currentSection;
  const titles = { green: t('shelfGreen'), yellow: t('shelfYellow'), orange: t('shelfOrange'), red: t('shelfRed') };
  const catEmoji = { fridge: '🧊', freezer: '❄️', pantry: '🥫' }[cat] || '';
  const titleEl = document.getElementById('list-title');
  if (titleEl) titleEl.textContent = catEmoji + ' ' + (titles[level] || '');
  if (typeof setNevi === 'function') setNevi(level, cat);
}

// Instància única del Swiper de nivells. Es crea peresosament la primera
// vegada que el slider té dimensions (#screen-list .active). El conjunt
// de slides és sempre el mateix (4 nivells), per tant la instància
// sobreviu entre obertures de pantalla; només actualitzem el contingut
// dels slides quan canvia currentSection.
let _levelsSwiper = null;

function _ensureLevelsSwiper() {
  if (_levelsSwiper) return _levelsSwiper;
  const slider = document.getElementById('levels-slider');
  if (!slider || !slider.clientWidth) return null;
  _levelsSwiper = new Swiper('#levels-slider', {
    // Mateixa configuració base que els altres dos cubs (zones i shops)
    // per coherència visual i de comportament. Vegeu els comentaris
    // extensos a _ensureZonesSwiper d'aquest mateix fitxer per al
    // raonament darrere de cada paràmetre.
    effect: 'cube',
    cubeEffect: {
      shadow: false,
      slideShadows: true,
      shadowOffset: 20,
      shadowScale: 0.94
    },
    speed: 600,
    grabCursor: true,
    threshold: 5,
    touchRatio: 1,
    longSwipes: true,
    longSwipesRatio: 0.2,
    longSwipesMs: 200,
    shortSwipes: true,
    followFinger: true,
    resistanceRatio: 0.85,
    // Vegeu el comentari paral·lel a _ensureZonesSwiper: el dit
    // jitter en mòbil + preventClicks:true (default) suprimeix
    // taps legítims. Als slides dels nivells els product-items
    // tenen click handlers; els necessitem fiables.
    preventClicks: false,
    preventClicksPropagation: false,
    loop: true,
    pagination: {
      el: '#levels-dots',
      clickable: true,
      bulletClass: 'levels-dot',
      bulletActiveClass: 'active',
      renderBullet: function(index, className) {
        const level = LEVEL_ORDER[index] || '';
        const titleKey = 'shelf' + level.charAt(0).toUpperCase() + level.slice(1);
        const label = (typeof t === 'function' && level) ? t(titleKey) : level;
        return '<button class="' + className + '" type="button" data-level="' + level + '" aria-label="' + label + '">' + label + '</button>';
      }
    },
    on: {
      slideChange: function() {
        const level = LEVEL_ORDER[this.realIndex];
        if (level && level !== currentLevel) {
          currentLevel = level;
          _updateLevelHeaderAndNevi(level);
        }
      }
      // touchEnd ELIMINAT — vegeu el comentari paral·lel a
      // _ensureZonesSwiper. Era un disparador de Swiper's preventClicks
      // que suprimia taps legítims sobre product-items.
    }
  });
  return _levelsSwiper;
}

function openShelf(level) {
  currentLevel = level;
  const cat = currentSection;
  // Construïm els 4 slides un sol cop.
  _buildLevelSlides();
  const slider = document.getElementById('levels-slider');
  if (!slider) return;
  // CRÍTIC: destruïm la instància de Swiper existent abans de tornar
  // a renderitzar contingut. Sense això, després de diverses
  // navegacions (entrar a un nivell → enrere → entrar a un altre → ...)
  // la cube geometry de Swiper pot acumular drift: dimensions
  // cachejades de slides amb contingut diferent, classes
  // .swiper-slide-active orfes, duplicats sincronitzats amb una
  // currentSection antiga. El símptoma final és que els clicks deixen
  // d'arribar al shelf (Swiper només posa pointer-events:auto sobre
  // active+prev+next, i si l'estat queda corromput cap slide té la
  // classe .swiper-slide-active). Recrear la instància cada cop és
  // barat (4 slides) i garanteix un estat net. També neteja els
  // duplicats abans de la nostra render — quan _ensureLevelsSwiper
  // crei la nova instància ja farà nous duplicats clonant les slides
  // amb el contingut just renderitzat.
  if (_levelsSwiper) {
    _levelsSwiper.destroy(true, true);
    _levelsSwiper = null;
  }
  // Re-renderitzem el contingut de TOTS 4 slides perquè currentSection
  // pot haver canviat des de l'última obertura. (Després del destroy
  // de dalt, no hi ha duplicats — només els 4 originals — així que
  // un querySelector per slide n'hi ha prou; mantinc querySelectorAll
  // per simetria amb el patró d'altres llocs i defensiu en cas que
  // alguna altra via de codi posi duplicats.)
  LEVEL_ORDER.forEach(lvl => {
    const slides = slider.querySelectorAll('.level-page[data-level="' + lvl + '"]');
    slides.forEach(slide => _renderShelfProducts(slide, lvl, cat));
  });
  // Title/nevi a l'instant per evitar flash al header durant l'animació.
  _updateLevelHeaderAndNevi(level);
  showScreen('list');
  // Inicialitzem el Swiper de nou en el següent frame, quan
  // .screen.active ja li dóna dimensions al slider.
  const apply = () => {
    const swiper = _ensureLevelsSwiper();
    if (!swiper) { requestAnimationFrame(apply); return; }
    swiper.update();
    const idx = LEVEL_ORDER.indexOf(level);
    if (idx >= 0) swiper.slideToLoop(idx, 0);
    setTimeout(() => {
      if (_levelsSwiper === swiper) swiper.update();
    }, 120);
  };
  requestAnimationFrame(apply);
}

// DETALL
let productDetailBack = 'list';

function openProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentProduct = p;
  const days = daysUntil(p.date);
  const loc = getLocationById(p.location || 'fridge');
  document.getElementById('product-emoji').textContent = p.emoji;
  document.getElementById('product-name').innerHTML = formatProductLine(p.name, p.qty);
  const locStr = loc ? loc.emoji + ' ' + getLocationName(loc) + ' · ' : '';
  document.getElementById('product-days').textContent = locStr + daysText(days);

  // Línia frozenDate: només si el producte té data de congelació guardada
  // I actualment és al congelador. Si l'han mogut a una altra zona,
  // ocultem la informació però NO esborrem el camp (pot tornar al
  // congelador més tard i la mateixa data segueix sent vàlida).
  const frozenEl = document.getElementById('product-frozen');
  if (frozenEl) {
    const isFreezer = loc && loc.category === 'freezer';
    const frozenText = isFreezer ? formatFrozenInfo(p) : null;
    if (frozenText) {
      frozenEl.textContent = frozenText;
      frozenEl.style.display = '';
    } else {
      frozenEl.style.display = 'none';
    }
  }

  // Bloc "Has consumit X% · Queda Y%": només té sentit per qty no numèrica
  // (les numèriques ja es veuen reduïdes directament a la qty visible).
  const consumedBlock = document.getElementById('product-consumed-block');
  const qtyNum = (typeof parseQtyNumber === 'function') ? parseQtyNumber(p.qty) : null;
  const consumedPct = Math.max(0, Math.min(99, p.consumedPercent || 0));
  if (consumedBlock) {
    if (consumedPct > 0 && qtyNum === null) {
      const remainingPct = 100 - consumedPct;
      document.getElementById('product-consumed-value').textContent = consumedPct + '%';
      document.getElementById('product-remaining-value').textContent = remainingPct + '%';
      const fill = document.getElementById('product-consumed-bar-fill');
      if (fill) fill.style.width = consumedPct + '%';
      consumedBlock.style.display = 'block';
    } else {
      consumedBlock.style.display = 'none';
    }
  }

  const backBtn = document.querySelector('#screen-product .back-btn');
  if (backBtn) backBtn.dataset.back = productDetailBack;
  showScreen('product');
}

// Obre el detall d'un producte recordant d'on s'ha entrat per poder
// tornar-hi després d'una acció (consumir/llençar). Per defecte 'view-all'.
function openProductDetail(p, fromScreen) {
  productDetailBack = fromScreen || 'view-all';
  openProduct(p.id);
}

// Després d'una acció (consumed/trashed/deleted), torna a la pantalla
// d'origen i refresca la seva llista. Si no s'ha registrat origen, va a home.
function navigateAfterAction() {
  const target = productDetailBack || 'home';
  switch (target) {
    case 'list':
      if (typeof openShelf === 'function' && currentLevel) {
        openShelf(currentLevel);
        return;
      }
      break;
    case 'alerts':
      if (typeof renderAlerts === 'function') renderAlerts();
      showScreen('alerts');
      return;
    case 'view-all':
      if (typeof renderViewAll === 'function') renderViewAll();
      showScreen('view-all');
      return;
    case 'what-i-have':
      if (typeof renderWhatIHave === 'function') renderWhatIHave();
      showScreen('what-i-have');
      return;
  }
  // home (default)
  showScreen('home');
}

// ACCIONS
function handleAction(action) {
  if (!currentProduct) return;

  // "Esborrar" (deleted): comportament directe, sense slider
  if (action === 'deleted') {
    products = products.filter(p => p.id !== currentProduct.id);
    showToast(t('deletedMsg'));
    saveData();
    renderHome();
    updateStatsSub();
    navigateAfterAction();
    currentProduct = null;
    return;
  }

  // Consumed / Trashed: obrim slider de consum parcial.
  // Si ja s'ha consumit part (consumedPercent), el slider és relatiu al que queda.
  if (action === 'consumed' || action === 'trashed') {
    const product = currentProduct;
    const alreadyConsumed = product.consumedPercent || 0;
    showConsumptionSliderModal(product, action, (absolutePercent, sliderPercent) => {
      finalizeConsumption(product, action, absolutePercent, sliderPercent);
    }, alreadyConsumed);
  }
}

// Si la qty és un número pur (ex: "4", "12", "2.5"), retorna el valor.
// Per a unitats com "1L", "500g" o quantitats buides, retorna null.
function parseQtyNumber(qty) {
  if (typeof qty !== 'string') return null;
  const trimmed = qty.trim();
  if (!trimmed) return null;
  if (!/^\d+(?:[.,]\d+)?$/.test(trimmed)) return null;
  return parseFloat(trimmed.replace(',', '.'));
}

function finalizeConsumption(product, action, percent, displayPercent) {
  // 'percent'        — % real respecte al producte original (per a stats i acumulació)
  // 'displayPercent' — el que l'usuari ha vist al slider (per al toast)
  // Sempre desem el percentatge real a l'historial (per a estadístiques
  // d'estalvi i CO₂), independentment de si el producte queda o desapareix.
  recordConsumption(product, action, percent);

  // XP de gamificació: només per "consumed" (aprofitament). +5 XP bonus
  // si el producte caducava avui o demà (premi al rescat d'última hora).
  if (typeof addXp === 'function') {
    if (action === 'consumed') {
      let xp = Math.round(10 * percent / 100);
      const days = (typeof daysUntil === 'function' && product.date) ? daysUntil(product.date) : null;
      if (typeof days === 'number' && isFinite(days) && days <= 1) xp += 5;
      addXp(xp, 'consumed');
    } else {
      // "trashed" no atorga XP, però volem revisar insignies de constància/streak.
      if (typeof checkBadges === 'function') checkBadges();
    }
  }
  const shown = (typeof displayPercent === 'number') ? displayPercent : percent;

  // Regla per quan el producte es queda a l'EatMe:
  //   Numèric (qty=4): es redueix per unitats per a CONSUMED i TRASHED.
  //                    Si nova_qty > 0 → es queda; si <= 0 → desapareix.
  //   No numèric (1L): consumed acumula consumedPercent; trashed sempre desapareix
  //                    (si has llençat part d'una unitat única, ja no la tens).
  let stayInEatMe = false;
  if (percent < 100) {
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      const p = products[idx];
      const qtyNum = parseQtyNumber(p.qty);
      if (qtyNum !== null) {
        // Quantitat numèrica pura: reduir proporcionalment per a consumed i trashed
        const newQty = Math.round(qtyNum * (100 - percent) / 100);
        if (newQty > 0) {
          p.qty = String(newQty);
          stayInEatMe = true;
        }
      } else if (action === 'consumed') {
        // Quantitat amb unitat o buida: només acumulem per a consumed
        const accumulated = (p.consumedPercent || 0) + percent;
        if (accumulated < 100) {
          p.consumedPercent = accumulated;
          stayInEatMe = true;
        }
      }
    }
  }

  if (!stayInEatMe) {
    products = products.filter(p => p.id !== product.id);
  }

  if (action === 'consumed') stats.consumed++;
  else stats.trashed++;

  const actionLabel = action === 'consumed' ? t('consumedToast') : t('wastedToast');
  let toastMsg;
  if (stayInEatMe) {
    toastMsg = '✓ ' + actionLabel + ' ' + shown + '%, ' + t('stillAtBiteme');
  } else {
    toastMsg = '✓ ' + actionLabel + ' ' + shown + '%';
  }
  showToast(toastMsg);

  saveData();
  renderHome();
  updateStatsSub();
  navigateAfterAction();
  currentProduct = null;

  // Si el producte encara és a l'EatMe, no oferim afegir-lo a la llista
  if (!stayInEatMe) {
    setTimeout(() => askAddToShoppingList(product), 600);
  }
}

// Historial detallat de consum/llençaments per a futures estadístiques d'estalvi.
function recordConsumption(product, action, percent) {
  let hist = [];
  try {
    const raw = localStorage.getItem('eatmefirst_consumption_history');
    if (raw) hist = JSON.parse(raw);
    if (!Array.isArray(hist)) hist = [];
  } catch (e) { hist = []; }

  let daysFromExpiry = null;
  if (!product.noExpiry && product.date) {
    const d = daysUntil(product.date);
    if (d !== Infinity) daysFromExpiry = d;
  }

  // Capturem preu/qty/pes en el moment del consum perquè els càlculs
  // d'impacte siguin estables encara que canviï el catàleg / mitjanes.
  const entry = {
    productName: product.name,
    productEmoji: product.emoji,
    action: action,
    percent: percent,
    date: new Date().toISOString(),
    location: product.location || null,
    daysFromExpiry: daysFromExpiry
  };
  if (typeof product.price === 'number' && product.price >= 0) entry.price = product.price;
  if (product.qty) entry.qty = product.qty;
  if (product.weight) entry.weight = product.weight;
  hist.push(entry);

  // Limitem a les últimes 500 entrades per evitar bloat de localStorage
  if (hist.length > 500) hist = hist.slice(-500);

  localStorage.setItem('eatmefirst_consumption_history', JSON.stringify(hist));
  if (typeof pushToServer === 'function') pushToServer();
}

// Estat global d'edició: si està definit, saveNewProduct() actualitza el
// producte existent en lloc de crear-ne un de nou.
let editingProductId = null;

// Obre el formulari en mode "editar producte existent" reutilitzant screen-add.
function openEditProductForm(product) {
  openAddForm({
    name: product.name,
    emoji: product.emoji,
    qty: product.qty,
    price: product.price,
    weight: product.weight,
    location: product.location,
    noExpiry: !!product.noExpiry,
    date: product.date,
    _editingId: product.id
  });
}

// FORMULARI MANUAL
function openAddForm(prefill) {
  // Mode edició: només quan openEditProductForm passa _editingId.
  // Qualsevol altra entrada (afegir nou, prefill de popular, escaneig...)
  // surt del mode edició automàticament.
  editingProductId = (prefill && prefill._editingId) ? prefill._editingId : null;

  // Info de congelació al formulari d'edició: visible només si estem
  // editant un producte que té frozenDate guardat. Si l'usuari ha
  // canviat la zona FORA del congelador, la info es manté visible
  // (és informatiu — recorda quan el producte va estar al congelador).
  const frozenInfoEl = document.getElementById('form-frozen-info');
  if (frozenInfoEl) {
    let frozenText = null;
    if (editingProductId) {
      const editingProduct = products.find(pp => pp.id === editingProductId);
      if (editingProduct) frozenText = formatFrozenInfo(editingProduct);
    }
    if (frozenText) {
      frozenInfoEl.textContent = frozenText;
      frozenInfoEl.style.display = '';
    } else {
      frozenInfoEl.style.display = 'none';
    }
  }

  // Configurem títol, botó tornar i botó "popular" segons mode (afegir/editar)
  const titleEl = document.getElementById('screen-add-title');
  const backBtn = document.getElementById('screen-add-back');
  const popularBtn = document.getElementById('popular-btn');
  const saveBtnEl = document.getElementById('save-btn');
  if (editingProductId) {
    if (titleEl) {
      titleEl.removeAttribute('data-i18n');
      titleEl.textContent = t('editProduct');
    }
    if (backBtn) backBtn.dataset.back = 'product';
    if (popularBtn) popularBtn.style.display = 'none';
    if (saveBtnEl) {
      saveBtnEl.removeAttribute('data-i18n');
      saveBtnEl.textContent = t('saveChanges');
    }
  } else {
    if (titleEl) {
      titleEl.setAttribute('data-i18n', 'addProductTitle');
      titleEl.textContent = t('addProductTitle');
    }
    // Si venim del flux "Comprat" del BuyMe (un item del supermercat
    // que estem comprant), back ha de tornar a la pantalla del super,
    // no a la tria genèrica "Afegir producte" de l'EatMe.
    if (backBtn) {
      backBtn.dataset.back = pendingShoppingItemId ? 'supermarket' : 'add-choice';
    }
    if (popularBtn) popularBtn.style.display = '';
    if (saveBtnEl) {
      saveBtnEl.setAttribute('data-i18n', 'save');
      saveBtnEl.textContent = t('save');
    }
  }

  const nameInput = document.getElementById('input-name');
  const productName = prefill && prefill.name ? prefill.name : '';
  nameInput.value = productName;
  nameInput.placeholder = t('productNamePlaceholder');

  // Quantitat (si ve de la llista)
  const qtyInput = document.getElementById('input-qty');
  if (qtyInput) qtyInput.value = (prefill && prefill.qty) ? prefill.qty : '';

  // Preu (opcional): si ve d'un popular/historial amb preu, el pre-fillem
  const priceInput = document.getElementById('input-price');
  if (priceInput) {
    priceInput.value = (prefill && typeof prefill.price === 'number' && prefill.price >= 0)
      ? String(prefill.price)
      : '';
  }

  // Pes (opcional, en text lliure: "500g", "1kg", "1L"...). Pre-fillem
  // si ve d'un popular/historial amb pes guardat.
  const weightInput = document.getElementById('input-weight');
  if (weightInput) {
    weightInput.value = (prefill && prefill.weight) ? String(prefill.weight) : '';
  }

  // Reset checkbox "sense data" — restaurat si el prefill ho indica (popular/historial)
  const noExpiry = document.getElementById('input-no-expiry');
  if (noExpiry) noExpiry.checked = !!(prefill && prefill.noExpiry);

  // Amaga els suggeriments
  const suggBox = document.getElementById('name-suggestions');
  if (suggBox) suggBox.innerHTML = '';

  // Ubicació per defecte: prefill > història > endevinar > nevera
  let defaultLocation = prefill && prefill.location;
  if (!defaultLocation && productName) {
    const historyMatch = productHistory.find(p => p.name.toLowerCase() === productName.toLowerCase());
    if (historyMatch && historyMatch.location) {
      defaultLocation = historyMatch.location;
    }
    if (!defaultLocation) {
      defaultLocation = guessLocationFromName(productName);
    }
  }
  selectedLocation = defaultLocation || 'fridge';
  if (!getLocationById(selectedLocation)) selectedLocation = locations[0].id;
  renderLocationPicker();

  // Categories detectades del producte (per a la taula de congelació)
  currentCategories = (prefill && prefill.categories) || [];

  // Dies "normals" (a nevera/rebost) que ens dóna OFF o el manual
  const baseDays = (prefill && prefill.days) ? prefill.days : 7;

  // Calculem dies finals segons el tipus d'ubicació
  const finalDays = computeDaysForLocation(selectedLocation, baseDays, currentCategories);

  const dateInputEl = document.getElementById('input-date');
  if (prefill && prefill.noExpiry) {
    dateInputEl.value = '';
    dateInputEl.dataset.baseDays = '';
  } else if (editingProductId && prefill && prefill.date) {
    // En mode edició, no recalculem la data: respectem el que ja estava guardat.
    dateInputEl.value = prefill.date;
    dateInputEl.dataset.baseDays = '';
  } else {
    const d = new Date();
    d.setDate(d.getDate() + finalDays);
    dateInputEl.value = formatDateForInput(d);
    dateInputEl.dataset.baseDays = baseDays;
  }

  selectedEmoji = prefill && prefill.emoji ? prefill.emoji : '🥛';
  renderEmojiPicker();

  // Avís especial quan ve d'escanejar
  const scanWarning = document.getElementById('scan-warning');
  if (scanWarning) {
    scanWarning.style.display = (prefill && prefill.fromScan) ? 'flex' : 'none';
  }

  showScreen('add');
  if (!prefill || !prefill.name) {
    setTimeout(() => nameInput.focus(), 250);
  }
}

// Configura l'input de nom amb suggeriments de l'historial
function setupNameAutocomplete() {
  const nameInput = document.getElementById('input-name');
  const suggBox = document.getElementById('name-suggestions');
  if (nameInput && suggBox) {
    setupAutocompleteFor(nameInput, suggBox, 'product');
  }

  // Mateix autocomplete a la pantalla de la llista de la compra
  const shopInput = document.getElementById('input-shopping-name');
  const shopSuggBox = document.getElementById('shopping-name-suggestions');
  if (shopInput && shopSuggBox) {
    setupAutocompleteFor(shopInput, shopSuggBox, 'shopping');
  }
}

// Cerca un nom (case-insensitive) als populars i a l'historial. Retorna
// l'entrada amb totes les pistes que tinguem (emoji, dies, zona, preu, pes,
// noExpiry). Els populars tenen prioritat perquè estan curats.
function findKnownProductByName(name) {
  if (!name) return null;
  const q = name.toLowerCase().trim();
  if (!q) return null;
  const populars = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
  const fromPopular = populars.find(p => p.name.toLowerCase().trim() === q);
  if (fromPopular) {
    return {
      name: fromPopular.name,
      emoji: fromPopular.emoji,
      days: fromPopular.days,
      location: fromPopular.location,
      price: fromPopular.price,
      weight: fromPopular.weight,
      noExpiry: !!fromPopular.noExpiry,
      source: 'popular'
    };
  }
  const fromHistory = (typeof productHistory !== 'undefined' ? productHistory : [])
    .find(p => p.name.toLowerCase().trim() === q);
  if (fromHistory) {
    return {
      name: fromHistory.name,
      emoji: fromHistory.emoji,
      days: fromHistory.days,
      location: fromHistory.location,
      price: fromHistory.price,
      weight: fromHistory.weight,
      noExpiry: !!fromHistory.noExpiry,
      source: 'history'
    };
  }
  return null;
}

// Aplica al formulari de l'EatMe (screen-add) tot el que sapiguem d'un
// producte conegut: emoji, zona, dies (data), preu, pes, "no caduca".
// No esborra res que l'usuari ja hagi escrit a preu/pes si la match no en porta.
function applyKnownProductToForm(m) {
  if (!m) return;
  selectedEmoji = m.emoji || selectedEmoji;
  if (typeof renderEmojiPicker === 'function') renderEmojiPicker();

  const guessedLoc = m.location || (typeof guessLocationFromName === 'function' ? guessLocationFromName(m.name) : null);
  if (guessedLoc && getLocationById(guessedLoc)) {
    selectedLocation = guessedLoc;
    if (typeof renderLocationPicker === 'function') renderLocationPicker();
  }

  const noExpiryInput = document.getElementById('input-no-expiry');
  const dateInput = document.getElementById('input-date');
  if (m.noExpiry) {
    if (noExpiryInput) {
      noExpiryInput.checked = true;
      noExpiryInput.dispatchEvent(new Event('change'));
    }
    if (dateInput) dateInput.value = '';
  } else {
    if (noExpiryInput && noExpiryInput.checked) {
      noExpiryInput.checked = false;
      noExpiryInput.dispatchEvent(new Event('change'));
    }
    if (m.days && dateInput) {
      const d = new Date();
      d.setDate(d.getDate() + m.days);
      dateInput.value = formatDateForInput(d);
      dateInput.dataset.baseDays = m.days;
    }
  }

  const priceInput = document.getElementById('input-price');
  if (priceInput && !priceInput.value.trim() && typeof m.price === 'number' && m.price >= 0) {
    priceInput.value = String(m.price);
  }

  const weightInput = document.getElementById('input-weight');
  if (weightInput && !weightInput.value.trim() && m.weight) {
    weightInput.value = String(m.weight);
  }
}

function setupAutocompleteFor(input, suggBox, mode) {
  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length < 1) {
      suggBox.innerHTML = '';
      return;
    }
    const matches = searchProductHistory(q);
    if (matches.length === 0) {
      suggBox.innerHTML = '';
      return;
    }
    suggBox.innerHTML = '';
    matches.forEach(m => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'autocomplete-item';
      item.innerHTML = `<span>${m.emoji}</span> <span>${escapeHtml(m.name)}</span>`;
      item.addEventListener('click', () => {
        input.value = m.name;
        if (mode === 'shopping') {
          selectedShoppingEmoji = m.emoji;
          renderShoppingEmojiPickerBtn();
          // Recupera el flag "no caduca" i la data si la sabem
          const shopNoExp = document.getElementById('input-shopping-no-expiry');
          const shopDate = document.getElementById('input-shopping-date');
          if (m.noExpiry) {
            if (shopNoExp) shopNoExp.checked = true;
            if (shopDate) shopDate.value = '';
          } else {
            if (shopNoExp) shopNoExp.checked = false;
            if (m.days && shopDate) {
              const d = new Date();
              d.setDate(d.getDate() + m.days);
              shopDate.value = formatDateForInput(d);
            }
          }
        } else {
          // Cerquem el match exacte als populars/historial per agafar tot
          // (preu, pes...) i caiem al m que ens venia com a fallback.
          const known = findKnownProductByName(m.name) || m;
          applyKnownProductToForm(known);
        }
        suggBox.innerHTML = '';
      });
      suggBox.appendChild(item);
    });
  });

  // Quan l'usuari acaba d'escriure (blur), si el nom coincideix exactament
  // amb un popular o un producte de l'historial, prefillem la resta de camps.
  if (mode !== 'shopping') {
    input.addEventListener('blur', () => {
      setTimeout(() => { suggBox.innerHTML = ''; }, 200);
      const name = input.value.trim();
      if (!name) return;
      const known = findKnownProductByName(name);
      if (known) applyKnownProductToForm(known);
    });
  } else {
    input.addEventListener('blur', () => {
      setTimeout(() => { suggBox.innerHTML = ''; }, 200);
    });
  }
}

// Variable global per recordar les categories del producte actual
let currentCategories = [];

// Calcula dies segons la categoria de la ubicació
function computeDaysForLocation(locationId, baseDays, categories) {
  const loc = getLocationById(locationId);
  if (!loc) return baseDays;

  if (loc.category === 'freezer') {
    const freezerDays = lookupFreezerDays(categories);
    if (freezerDays > 0) return freezerDays;
    return 180; // 6 mesos per defecte si no detecta categoria
  }
  return baseDays;
}

// Busca a la taula FREEZER_DAYS (agafa el màxim que coincideixi)
function lookupFreezerDays(categories) {
  if (!categories || categories.length === 0) return 0;
  const allText = categories.map(c => String(c).toLowerCase()).join(' ');
  let maxDays = 0;
  for (const key in FREEZER_DAYS) {
    if (allText.includes(key.toLowerCase())) {
      if (FREEZER_DAYS[key] > maxDays) maxDays = FREEZER_DAYS[key];
    }
  }
  return maxDays;
}

function saveNewProduct() {
  const name = document.getElementById('input-name').value.trim();
  const date = document.getElementById('input-date').value;
  const noExpiry = document.getElementById('input-no-expiry');
  const noExpiryChecked = noExpiry && noExpiry.checked;
  const qtyInput = document.getElementById('input-qty');
  const qty = qtyInput ? qtyInput.value.trim() : '';

  // Preu (opcional). Només el guardem si l'usuari l'ha informat. Acceptem
  // tant punt com coma com a separador decimal: en alguns inputs type=number
  // amb locale ca/es, "2,50" no es parsa bé per parseFloat per defecte.
  const priceInput = document.getElementById('input-price');
  let price = null;
  if (priceInput) {
    const raw = String(priceInput.value || '').trim().replace(',', '.');
    if (raw !== '') {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed >= 0) price = Math.round(parsed * 100) / 100;
    }
  }

  if (!name) { showToast(t('needName')); return; }
  if (!date && !noExpiryChecked) { showToast(t('needDate')); return; }

  // Calcula dies aproximats per a l'aprenentatge automàtic
  let approxDays = null;
  if (date) {
    approxDays = daysUntil(date);
    if (approxDays === Infinity) approxDays = null;
  }

  // Pes (opcional). Guardem el text tal qual l'ha escrit l'usuari
  // ("500g", "1kg"...), parseQuantityToKg el sap interpretar.
  const weightInput = document.getElementById('input-weight');
  const weight = weightInput ? String(weightInput.value || '').trim() : '';

  // Aprenentatge: registra historial i propaga al catàleg de populars
  // (creant entrada nova o actualitzant la existent amb les dades fresques).
  recordProductInHistory(name, selectedEmoji, selectedLocation, approxDays, noExpiryChecked, price, weight);

  // Mode edició: actualitzem el producte existent i tornem al detall
  if (editingProductId) {
    const idx = products.findIndex(p => p.id === editingProductId);
    if (idx >= 0) {
      const p = products[idx];
      const oldLocation = p.location;
      p.name = name;
      p.emoji = selectedEmoji;
      p.date = noExpiryChecked ? null : date;
      p.noExpiry = noExpiryChecked;
      p.location = selectedLocation;
      p.qty = qty;
      if (price !== null) p.price = price; else delete p.price;
      if (weight) p.weight = weight; else delete p.weight;
      // frozenDate: si el producte ENTRA al congelador per primera
      // vegada (no en tenia abans), registrem la data d'avui. Si ja
      // en tenia (l'havia tret i ara hi torna, o ja era al congelador
      // i només edita altres camps), mantenim la data antiga: és la
      // data DE CONGELACIÓ, no de l'última edició.
      const newCatLoc = getLocationById(p.location);
      if (newCatLoc && newCatLoc.category === 'freezer' && !p.frozenDate) {
        p.frozenDate = formatDateLocal(new Date());
      }
      currentProduct = p;
      saveData();

      // Si la zona ha canviat, ajustem la pantalla d'origen perquè tornar
      // enrere ensenyi el producte on és ara, no on era abans.
      const zoneChanged = oldLocation !== p.location;
      if (zoneChanged) {
        const oldLoc = getLocationById(oldLocation);
        const newLoc = getLocationById(p.location);
        const oldCat = oldLoc ? oldLoc.category : null;
        const newCat = newLoc ? newLoc.category : null;
        if (productDetailBack === 'list') {
          // El nivell del producte (verd/groc/...) també pot haver canviat
          // i no podem endevinar fàcilment el nou prestatge: tornem a home.
          productDetailBack = 'home';
        } else if (productDetailBack === 'section' && oldCat !== newCat && newCat) {
          currentSection = newCat;
        }
      }

      // Refresquem totes les pantalles "llistat" perquè l'usuari les trobi
      // actualitzades quan torni enrere des del detall.
      renderHome();
      if (typeof renderViewAll === 'function') renderViewAll();
      if (typeof renderWhatIHave === 'function') renderWhatIHave();
      if (typeof renderSection === 'function') renderSection();
      if (typeof renderAlerts === 'function') renderAlerts();

      const editedId = editingProductId;
      editingProductId = null;
      showToast('✓ ' + t('saved'));
      openProduct(editedId);
      return;
    }
    // Si no el trobem (estranyíssim), caiem a la creació normal
    editingProductId = null;
  }

  const newProduct = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    name: name,
    emoji: selectedEmoji,
    date: noExpiryChecked ? null : date,
    noExpiry: noExpiryChecked,
    location: selectedLocation,
    qty: qty,
    addedAt: new Date().toISOString()
  };
  if (price !== null) newProduct.price = price;
  if (weight) newProduct.weight = weight;
  // frozenDate: si el producte es crea directament al congelador,
  // registrem la data d'avui com a "data de congelació". Productes a
  // altres zones no en tenen — només es crea si la primera ubicació
  // (o una edició posterior) és el congelador.
  const newProductLoc = getLocationById(selectedLocation);
  if (newProductLoc && newProductLoc.category === 'freezer') {
    newProduct.frozenDate = formatDateLocal(new Date());
  }
  products.push(newProduct);

  saveData();

  // Gamificació: comptador històric + 2 XP per producte afegit a l'EatMe.
  if (typeof bumpProductsAddedCounter === 'function') bumpProductsAddedCounter();
  if (typeof addXp === 'function') addXp(2, 'eatme-add');

  // Si veníem de la llista de la compra, traiem l'item d'allà i tornem a comprar
  if (pendingShoppingItemId) {
    const fromShopping = pendingShoppingSupermarketId; // recordem el supermercat
    shoppingItems = shoppingItems.filter(it => it.id !== pendingShoppingItemId);
    saveShoppingData();
    pendingShoppingItemId = null;

    // Si estem en mode de compra guiada, continuem comprant
    if (fromShopping) {
      pendingShoppingSupermarketId = null;
      currentSupermarketId = fromShopping;
      renderShoppingItems();
      showScreen('supermarket');
      showToast('✅ ' + selectedEmoji + ' ' + name + ' ' + t('addedFromShopping'));
      return;
    }

    pendingShoppingSupermarketId = null;
    renderHome();
    showScreen('home');
    showToast('✅ ' + selectedEmoji + ' ' + name + ' ' + t('addedFromShopping'));
  } else {
    renderHome();
    showScreen('home');
    showToast(selectedEmoji + ' ' + name + ' ' + t('added'));
  }
}

// Historial de productes ja escrits/comprats per recuperar com a suggeriments
let productHistory = []; // [{name, emoji, count, lastUsed}]

function loadProductHistory() {
  try {
    const raw = localStorage.getItem('eatmefirst_product_history');
    if (raw) productHistory = JSON.parse(raw);
  } catch(e) { productHistory = []; }
}

// Historial de productes que ha escrit l'usuari. Ens serveix per:
//   1) Suggerir noms a l'autocomplete del formulari.
//   2) Propagar els valors al catàleg de populars (aprenentatge automàtic).
function recordProductInHistory(name, emoji, location, days, noExpiry, price, weight) {
  const key = name.toLowerCase().trim();
  const hasPrice = typeof price === 'number' && price >= 0;
  const hasWeight = typeof weight === 'string' && weight.trim() !== '';
  const existing = productHistory.find(p => p.name.toLowerCase() === key);
  if (existing) {
    existing.count++;
    existing.lastUsed = Date.now();
    if (emoji) existing.emoji = emoji;
    if (location) existing.location = location;
    if (days) existing.days = days;
    existing.noExpiry = !!noExpiry;
    if (hasPrice) existing.price = price;
    if (hasWeight) existing.weight = weight;
  } else {
    const entry = { name, emoji: emoji || '🥛', location, days, noExpiry: !!noExpiry, count: 1, lastUsed: Date.now() };
    if (hasPrice) entry.price = price;
    if (hasWeight) entry.weight = weight;
    productHistory.push(entry);
  }
  productHistory.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
  if (productHistory.length > 50) productHistory = productHistory.slice(0, 50);
  localStorage.setItem('eatmefirst_product_history', JSON.stringify(productHistory));

  // APRENENTATGE: cada cop que es desa un producte, l'afegim als populars
  // (o actualitzem l'entrada existent amb tot el que sapiguem).
  addToCustomPopular(name, emoji, days, location, noExpiry, price, weight);
}

function addToCustomPopular(name, emoji, days, location, noExpiry, price, weight) {
  const list = (typeof getPopularProducts === 'function') ? getPopularProducts() : [];
  const safeEmoji = emoji || '🥛';
  const safeDays = (typeof days === 'number' && days > 0) ? days : 7;
  const safeLoc = location || (typeof guessLocationFromName === 'function' ? guessLocationFromName(name) : null) || 'pantry';
  const noExp = !!noExpiry;
  const hasPrice = typeof price === 'number' && price >= 0;
  const hasWeight = typeof weight === 'string' && weight.trim() !== '';

  const existing = list.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    // Si l'usuari ha tocat aquesta entrada explícitament des de Configuració,
    // no la sobreescrivim amb dades aproximades de l'aprenentatge automàtic:
    // hi ha valors curats (ex: "Pa 4 dies") que volem preservar contra càlculs
    // derivats d'una compra concreta on l'usuari pot haver-hi posat altres dies.
    if (existing.userEdited) {
      // Només omplim camps que estaven completament absents.
      if (!existing.emoji) existing.emoji = safeEmoji;
      if (!existing.location) existing.location = safeLoc;
      if (typeof existing.price !== 'number' && hasPrice) existing.price = price;
      if (!existing.weight && hasWeight) existing.weight = weight;
    } else {
      existing.emoji = safeEmoji;
      existing.days = safeDays;
      existing.location = safeLoc;
      existing.noExpiry = noExp;
      if (hasPrice) existing.price = price;
      if (hasWeight) existing.weight = weight;
    }
  } else {
    const entry = {
      id: 'pop-learned-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name,
      emoji: safeEmoji,
      days: safeDays,
      location: safeLoc,
      noExpiry: noExp,
      autoCreated: true
    };
    if (hasPrice) entry.price = price;
    if (hasWeight) entry.weight = weight;
    list.push(entry);
  }
  if (typeof savePopularProducts === 'function') savePopularProducts(list);
}

// Endevina la zona segons el nom del producte
// Comprova si una paraula curta apareix com a token complet a un text
// (evita que "pa" matchegi "patata" o "lapa"). Per a paraules llargues
// preferim simple substring perquè és més tolerant a plurals/derivacions.
function nameContainsWord(text, word) {
  const w = word.toLowerCase();
  if (w.length > 3) return text.includes(w);
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(^|[^a-zàáâãäåçèéêëìíîïñòóôõöùúûü])' + escaped + '($|[^a-zàáâãäåçèéêëìíîïñòóôõöùúûü])', 'i');
  return re.test(text);
}

function guessLocationFromName(name) {
  const n = name.toLowerCase();

  const fruitsVeg = ['poma', 'pera', 'plàtan', 'platano', 'banana', 'taronja', 'mandarina', 'maduixa', 'fresa',
    'kiwi', 'pinya', 'mango', 'raïm', 'uva', 'cirera', 'cereza', 'préssec', 'melocoton',
    'meló', 'síndria', 'sandia', 'tomàquet', 'tomate', 'enciam', 'lechuga', 'pastanaga', 'zanahoria',
    'pebrot', 'pimiento', 'cogombre', 'pepino', 'ceba', 'cebolla', 'all', 'patata',
    'carbassó', 'calabacin', 'bròquil', 'brocoli', 'coliflor', 'espinac', 'espinacas',
    'apple', 'orange', 'strawberry', 'tomato', 'lettuce', 'carrot', 'pepper', 'onion', 'garlic'];

  const meatFish = ['pollastre', 'pollo', 'carn', 'carne', 'vedella', 'ternera', 'porc', 'cerdo',
    'salsitxa', 'salchicha', 'embotit', 'embutido', 'pernil', 'jamon', 'xoriço', 'chorizo',
    'peix', 'pescado', 'salmó', 'salmon', 'tonyina', 'atun', 'bacallà', 'bacalao', 'lluç', 'merluza',
    'gamba', 'sípia', 'pop', 'calamar',
    'chicken', 'beef', 'pork', 'fish', 'shrimp'];

  const pantryItems = ['pasta', 'espagueti', 'macarroni', 'arròs', 'arroz', 'rice',
    'farina', 'harina', 'flour', 'sucre', 'azucar', 'sugar', 'sal', 'salt',
    'oli', 'aceite', 'oil', 'vinagre', 'vinegar', 'cigró', 'garbanzo', 'llentia', 'lenteja',
    'mongeta', 'judia', 'galeta', 'galleta', 'cookie', 'cereal', 'cafe', 'café', 'coffee',
    'te', 'tea', 'xocolata', 'chocolate', 'cacau', 'cacao', 'mel', 'miel', 'honey',
    'conserva', 'sardina', 'tonyina', 'atun', 'tuna',
    // Pa i forn
    'pa', 'pan', 'bread', 'baguette', 'baguet', 'croissant', 'crois', 'panet', 'bagel',
    'bollo', 'bolleria', 'bizcocho', 'magdalena', 'donut', 'dònut',
    // Caramels i dolços
    'caramel', 'caramelo', 'candy', 'llaminadura', 'gominola', 'pastís', 'pastel', 'cake',
    // Conserves i envasats
    'pot', 'lata', 'can', 'frasco',
    // Fruita seca
    'ametlla', 'almendra', 'almond', 'avellana', 'hazelnut', 'nou', 'nuez', 'walnut',
    'pistatxo', 'pistacho', 'pistachio', 'cacauet', 'cacahuete', 'peanut',
    // Salses estables
    'mostassa', 'mostaza', 'mustard', 'ketchup', 'soja', 'soy',
    // Begudes estables
    'aigua', 'agua', 'water', 'refresc', 'refresco', 'soda'];

  const dairy = ['llet', 'leche', 'milk', 'iogurt', 'yogur', 'yoghurt', 'formatge', 'queso', 'cheese',
    'mantega', 'mantequilla', 'butter', 'nata', 'cream', 'ou', 'huevo', 'egg'];

  const medicine = ['paracetamol', 'ibuprofen', 'aspirina', 'aspirin', 'pastilla', 'pill', 'medicina',
    'medicine', 'xarop', 'jarabe', 'venda', 'tirita', 'apósito'];

  for (const w of medicine) if (nameContainsWord(n, w)) return 'medicine';
  for (const w of fruitsVeg) if (nameContainsWord(n, w)) return 'fruit_bowl';
  for (const w of meatFish) if (nameContainsWord(n, w)) return 'fridge';
  for (const w of dairy) if (nameContainsWord(n, w)) return 'fridge';
  for (const w of pantryItems) if (nameContainsWord(n, w)) return 'pantry';

  return null;
}

function searchProductHistory(query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();

  // Combina historial + productes populars
  const fromHistory = productHistory.filter(p => p.name.toLowerCase().includes(q));
  const fromPopular = getPopularProducts()
    .filter(p => p.name.toLowerCase().includes(q))
    .map(p => ({ name: p.name, emoji: p.emoji, days: p.days, location: p.location, noExpiry: !!p.noExpiry, isPopular: true }));

  // Combinem sense duplicats (mateix nom)
  const result = [...fromHistory];
  fromPopular.forEach(pop => {
    if (!result.find(r => r.name.toLowerCase() === pop.name.toLowerCase())) {
      result.push(pop);
    }
  });

  return result.slice(0, 6);
}

function renderLocationPicker() {
  const container = document.getElementById('location-picker');
  if (!container) return;
  container.innerHTML = '';

  locations.forEach(loc => {
    const btn = document.createElement('button');
    btn.className = 'loc-option' + (loc.id === selectedLocation ? ' selected' : '');
    btn.type = 'button';
    btn.innerHTML = '<span class="loc-option-emoji"></span><span class="loc-option-name"></span>';
    btn.querySelector('.loc-option-emoji').textContent = loc.emoji;
    btn.querySelector('.loc-option-name').textContent = getLocationName(loc);
    btn.addEventListener('click', () => {
      selectedLocation = loc.id;
      renderLocationPicker();
      recalcDateByLocation();
    });
    container.appendChild(btn);
  });

  // Botó "edita ubicacions"
  const editBtn = document.createElement('button');
  editBtn.className = 'loc-option loc-edit';
  editBtn.type = 'button';
  editBtn.innerHTML = '<span class="loc-option-emoji">⚙️</span><span class="loc-option-name"></span>';
  editBtn.querySelector('.loc-option-name').textContent = t('editLocations');
  editBtn.addEventListener('click', () => openLocations('add'));
  container.appendChild(editBtn);
}


function renderEmojiPicker() {
  // Actualitza només el botó (mostra l'emoji actual)
  const btn = document.getElementById('emoji-button-current');
  if (btn) btn.textContent = selectedEmoji;
}


let emojiPickerTarget = null; // 'product', 'supermarket', 'shopping'
let emojiPickerOrigin = null; // pantalla a la qual tornar
let emojiPickerCategory = 'all';
let emojiPickerQuery = '';

function _emojiPickerCurrentEmoji(target) {
  if (target === 'supermarket') return selectedSupermarketEmoji;
  if (target === 'shopping') return selectedShoppingEmoji;
  if (target === 'popular') return selectedPopularEmoji;
  if (target === 'special-item') return selectedSpecialItemEmoji;
  if (target === 'recipe') return (typeof selectedRecipeEmoji !== 'undefined') ? selectedRecipeEmoji : '🍳';
  if (target === 'recipe-ingredient') {
    if (typeof editingRecipeData !== 'undefined' && editingRecipeData
        && Array.isArray(editingRecipeData.ingredients)
        && typeof editingRecipeIngredientIdx === 'number'
        && editingRecipeData.ingredients[editingRecipeIngredientIdx]) {
      return editingRecipeData.ingredients[editingRecipeIngredientIdx].emoji || '🥕';
    }
    return '🥕';
  }
  return selectedEmoji;
}

function _emojiPickerApply(target, e) {
  if (target === 'supermarket') {
    selectedSupermarketEmoji = e;
    renderSupermarketEmojiPickerBtn();
  } else if (target === 'shopping') {
    selectedShoppingEmoji = e;
    renderShoppingEmojiPickerBtn();
  } else if (target === 'popular') {
    selectedPopularEmoji = e;
    const btn = document.getElementById('popular-emoji-current');
    if (btn) btn.textContent = e;
  } else if (target === 'special-item') {
    selectedSpecialItemEmoji = e;
    const btn = document.getElementById('special-item-emoji-current');
    if (btn) btn.textContent = e;
  } else if (target === 'recipe') {
    selectedRecipeEmoji = e;
    const btn = document.getElementById('recipe-emoji-current');
    if (btn) btn.textContent = e;
  } else if (target === 'recipe-ingredient') {
    if (typeof editingRecipeData !== 'undefined' && editingRecipeData
        && Array.isArray(editingRecipeData.ingredients)
        && typeof editingRecipeIngredientIdx === 'number'
        && editingRecipeData.ingredients[editingRecipeIngredientIdx]) {
      editingRecipeData.ingredients[editingRecipeIngredientIdx].emoji = e;
      if (typeof renderRecipeEditIngredients === 'function') renderRecipeEditIngredients();
    }
  } else {
    selectedEmoji = e;
    renderEmojiPicker();
  }
}

function renderEmojiPickerGrid() {
  const target = emojiPickerTarget;
  const currentEmoji = _emojiPickerCurrentEmoji(target);

  // Per a supermercats fem servir un set propi (no menjar) i no oferim
  // categories ni cerca: la llista és curta i temàtica.
  if (target === 'supermarket') {
    const cats = document.getElementById('emoji-categories');
    const search = document.getElementById('emoji-search');
    if (cats) cats.style.display = 'none';
    if (search) search.style.display = 'none';
    const container = document.getElementById('emoji-picker-full');
    if (!container) return;
    container.innerHTML = '';
    SUPERMARKET_EMOJIS.forEach(e => container.appendChild(_makeEmojiBtn(e, currentEmoji, target)));
    return;
  }

  const cats = document.getElementById('emoji-categories');
  const search = document.getElementById('emoji-search');
  if (cats) cats.style.display = '';
  if (search) search.style.display = '';

  let emojisToShow;
  if (emojiPickerQuery) {
    emojisToShow = searchEmojiByName(emojiPickerQuery);
  } else if (emojiPickerCategory && emojiPickerCategory !== 'all') {
    const cat = EMOJI_CATEGORIES.find(c => c.id === emojiPickerCategory);
    emojisToShow = cat ? cat.emojis.slice() : EMOJIS;
  } else {
    emojisToShow = EMOJIS;
  }

  const container = document.getElementById('emoji-picker-full');
  if (!container) return;
  container.innerHTML = '';
  if (emojisToShow.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noResults');
    container.appendChild(empty);
    return;
  }
  emojisToShow.forEach(e => container.appendChild(_makeEmojiBtn(e, currentEmoji, target)));
}

function _makeEmojiBtn(e, currentEmoji, target) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'emoji-option-big' + (e === currentEmoji ? ' selected' : '');
  btn.textContent = e;
  btn.addEventListener('click', () => {
    _emojiPickerApply(target, e);
    showScreen(emojiPickerOrigin);
  });
  return btn;
}

function renderEmojiCategoriesTabs() {
  const wrap = document.getElementById('emoji-categories');
  if (!wrap) return;
  const target = emojiPickerTarget;
  if (target === 'supermarket') { wrap.innerHTML = ''; return; }

  wrap.innerHTML = '';
  const tabs = [{ id: 'all', label: t('filterAll') || 'Tots' }].concat(
    EMOJI_CATEGORIES.map(c => ({ id: c.id, label: c.label }))
  );
  tabs.forEach(t2 => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-category-tab' + ((emojiPickerCategory === t2.id) ? ' active' : '');
    btn.textContent = t2.label;
    btn.addEventListener('click', () => {
      emojiPickerCategory = t2.id;
      emojiPickerQuery = '';
      const search = document.getElementById('emoji-search');
      if (search) search.value = '';
      renderEmojiCategoriesTabs();
      renderEmojiPickerGrid();
    });
    wrap.appendChild(btn);
  });
}

function openEmojiPicker(target, origin) {
  emojiPickerTarget = target;
  emojiPickerOrigin = origin;
  emojiPickerCategory = 'all';
  emojiPickerQuery = '';
  const backBtn = document.getElementById('emoji-picker-back-btn');
  if (backBtn) backBtn.dataset.back = origin;

  const search = document.getElementById('emoji-search');
  if (search) {
    search.value = '';
    search.placeholder = t('searchEmojiPlaceholder');
  }

  renderEmojiCategoriesTabs();
  renderEmojiPickerGrid();
  showScreen('emoji-picker');
}





// ============ ESCÀNER DE CODI DE BARRES (html5-qrcode) ============
let html5QrScanner = null;
let lastScannedCode = null;
let lastScanTime = 0;

async function startScanner() {
  const status = document.getElementById('scanner-status');
  status.textContent = '';

  if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
    status.textContent = t('cameraError');
    return;
  }

  if (typeof Html5Qrcode === 'undefined') {
    status.textContent = t('cameraError');
    return;
  }

  // Netejar instàncies anteriors
  await stopScanner();

  try {
    html5QrScanner = new Html5Qrcode('scanner-video-container');

    const config = {
      fps: 15,
      qrbox: function(viewfinderWidth, viewfinderHeight) {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdge * 0.85);
        return { width: qrboxSize, height: Math.floor(qrboxSize * 0.55) };
      },
      aspectRatio: 1.0,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39
      ]
    };

    await html5QrScanner.start(
      { facingMode: 'environment' },
      config,
      onScanSuccess,
      onScanFailure
    );

    lastScannedCode = null;
  } catch (e) {
    console.error('Scanner error:', e);
    status.textContent = t('cameraError');
  }
}

function onScanSuccess(decodedText, decodedResult) {
  // Evita dobles deteccions del mateix codi
  const now = Date.now();
  if (decodedText === lastScannedCode && (now - lastScanTime) < 2000) return;
  lastScannedCode = decodedText;
  lastScanTime = now;

  if (navigator.vibrate) navigator.vibrate(100);

  stopScanner();
  onBarcodeDetected(decodedText);
}

function onScanFailure(error) {
  // Errors normals durant l'escaneig: ignorem (busca cada frame)
}

async function stopScanner() {
  if (html5QrScanner) {
    try {
      if (html5QrScanner.isScanning) {
        await html5QrScanner.stop();
      }
      await html5QrScanner.clear();
    } catch (e) { console.warn('Stop scanner:', e); }
    html5QrScanner = null;
  }
}

// Cerca a múltiples bases de dades
async function fetchProductByBarcode(barcode) {
  // Primer intent: Open Food Facts (gratis, sense límits, principalment menjar)
  try {
    const res = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(barcode) + '.json');
    if (res.ok) {
      const json = await res.json();
      if (json.status === 1 && json.product) {
        return parseOpenFoodFactsProduct(json.product);
      }
    }
  } catch (e) { console.warn('OFF error:', e); }

  // Segon intent: UPCitemdb (cobreix més productes no-menjar)
  try {
    const res = await fetch('https://api.upcitemdb.com/prod/trial/lookup?upc=' + encodeURIComponent(barcode));
    if (res.ok) {
      const json = await res.json();
      if (json.code === 'OK' && json.items && json.items.length > 0) {
        const item = json.items[0];
        return {
          name: (item.title || '').slice(0, 50),
          emoji: '🥫',
          days: 30
        };
      }
    }
  } catch (e) { console.warn('UPCitemdb error:', e); }

  return null;
}

function parseOpenFoodFactsProduct(p) {
  const lang = getCurrentLang();
  let name = p['product_name_' + lang] || p.product_name || p.generic_name || '';
  if (p.brands && name) {
    if (!name.toLowerCase().includes(p.brands.toLowerCase().split(',')[0])) {
      name = p.brands.split(',')[0].trim() + ' - ' + name;
    }
  }
  if (!name) return null;

  // Recopilem TOTS els tags i text de categoria com a array net
  // categories_tags ve com ['en:spreads', 'en:hazelnut-spreads', ...]
  const tagsArr = (p.categories_tags || []).map(x => String(x).toLowerCase());
  const catText = (p.categories || '').toLowerCase();

  // Funció que mira si una paraula clau apareix en CATEGORIES o TAGS
  function categoryMatches(key) {
    const k = key.toLowerCase();
    // Mira en text de categories
    if (catText.includes(k)) return true;
    // Mira en cada tag
    for (const tag of tagsArr) {
      if (tag.includes(k)) return true;
    }
    return false;
  }

  // Per a l'emoji: ordre normal (es queda amb el primer match)
  let emoji = '🥫';
  for (const key in CATEGORY_TO_EMOJI) {
    if (categoryMatches(key)) { emoji = CATEGORY_TO_EMOJI[key]; break; }
  }

  // Per als dies: agafem el VALOR MÉS GRAN dels matches.
  // Així si un producte té tags "fresh-foods" (poc) i "spreads" (molt),
  // ens quedem amb el de més vida útil (que és el correcte per al producte tancat).
  let days = 0;
  for (const key in CATEGORY_DEFAULT_DAYS) {
    if (categoryMatches(key)) {
      const d = CATEGORY_DEFAULT_DAYS[key];
      if (d > days) days = d;
    }
  }
  if (days === 0) days = 14; // fallback raonable per producte envasat

  return {
    name: name.trim().slice(0, 50),
    emoji: emoji,
    days: days,
    categories: tagsArr.concat([catText]) // per usar a la taula de congelació
  };
}

async function onBarcodeDetected(code) {
  const status = document.getElementById('scanner-status');
  if (status) status.textContent = t('searching');

  // Detectem si veníem de la llista de la compra
  const isShoppingScan = pendingShoppingScanContext;
  pendingShoppingScanContext = false;

  try {
    const data = await fetchProductByBarcode(code);

    if (data) {
      if (status) status.textContent = t('productFound');
      setTimeout(() => {
        if (isShoppingScan) {
          // Comprovem abans d'obrir el formulari si ja en tenim a l'EatMe
          const existing = (typeof findExistingAtHome === 'function') ? findExistingAtHome(data.name) : [];
          const proceedToForm = () => {
            if (existing.length > 0) skipExistingCheckOnNextSave = true;
            openShoppingItemEdit(null);
            setTimeout(() => {
              const ni = document.getElementById('input-shopping-name');
              if (ni) ni.value = data.name;
              selectedShoppingEmoji = data.emoji || '🥛';
              renderShoppingEmojiPickerBtn();
            }, 100);
          };
          if (existing.length > 0) {
            // Tornem al super perquè el modal floti per sobre d'una pantalla coherent
            showScreen('supermarket');
            showAlreadyHaveModal(data.name, existing, proceedToForm);
          } else {
            proceedToForm();
          }
        } else {
          openAddForm({
            name: data.name,
            emoji: data.emoji,
            days: data.days,
            categories: data.categories || [],
            fromScan: true
          });
        }
      }, 500);
    } else {
      if (status) status.textContent = t('productNotFound');
      setTimeout(() => {
        if (isShoppingScan) openShoppingItemEdit(null);
        else openAddForm({});
      }, 1200);
    }
  } catch (e) {
    console.error(e);
    if (status) status.textContent = t('productNotFound');
    setTimeout(() => {
      if (isShoppingScan) openShoppingItemEdit(null);
      else openAddForm({});
    }, 1200);
  }
}

// Cercar producte per codi escrit a mà
async function searchManualBarcode() {
  const code = document.getElementById('input-barcode').value.trim();
  if (!code || code.length < 6) {
    showToast(t('invalidCode'));
    return;
  }
  showToast(t('searching'));
  await onBarcodeDetected(code);
}

// EVENTS

// El swipe entre zones ara el gestiona scroll-snap natiu del .zones-slider
// (vegeu styles.css). Conservem la funció com a no-op perquè app.js encara
// la crida durant la inicialització, i altres scripts poden referenciar-la.
function setupSwipeNavigation() {}
