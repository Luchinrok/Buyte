// ============================================================================
// GENERAT AUTOMATICAMENT per tools/split-i18n.ps1 des d'i18n.source.js.
//   NO editis aquest fitxer: els canvis es perdran a la propera regeneracio.
//   Per traduir, edita i18n.source.js i executa tools/split-i18n.ps1.
// ============================================================================

const TRANSLATIONS = {};


// Idiomes suportats pel motor. L'ordre és el del selector.
const SUPPORTED_LANGS = ['ca', 'es', 'en', 'fr'];

// Noms dels idiomes al selector (cadascun en el seu propi idioma)
const LANGUAGE_NAMES = {
  ca: 'Català',
  es: 'Español',
  en: 'English',
  fr: 'Français',
};

// Mapa idioma → locale BCP-47 per a dates/números (toLocale*). Centralitza
// els locales abans hardcodejats a 'ca-ES'. Vegeu getLocale().
const LANG_LOCALES = {
  ca: 'ca-ES',
  es: 'es-ES',
  en: 'en-GB',
  fr: 'fr-FR',
};

// Cache de l'idioma efectiu. null = encara no resolt (lazy). setLanguage()
// i el primer getCurrentLang() l'omplen. Evita recalcular a cada t().
let _currentLang = null;

const LANG_STORAGE_KEY = 'eatmefirst_lang';

// Resol l'idioma efectiu.
// ⚠️ FONT PRIMÀRIA: window.__I18N_LANG, que el detector inline del <head>
//    d'index.html ja ha resolt (i amb el qual ha carregat el bloc). Deferir-hi
//    elimina qualsevol divergència detector↔runtime (carregar un bloc i
//    resoldre'n un altre). El FALLBACK de sota replica EXACTAMENT la lògica del
//    detector — clau 'eatmefirst_lang', validació contra SUPPORTED_LANGS,
//    navigator.language(s) (base abans del guió), 'ca' — per si _resolveLang
//    s'invoca sense detector (test / entorn sense <head>). Si canvies un, canvia
//    l'altre (i el detector a index.html).
function _resolveLang() {
  try {
    if (typeof window !== 'undefined' && window.__I18N_LANG &&
        SUPPORTED_LANGS.indexOf(window.__I18N_LANG) !== -1) return window.__I18N_LANG;
  } catch (e) {}
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.indexOf(saved) !== -1) return saved;
  } catch (e) {}
  try {
    const cands = [];
    if (navigator.languages && navigator.languages.length) cands.push(...navigator.languages);
    if (navigator.language) cands.push(navigator.language);
    for (const c of cands) {
      const base = String(c || '').split('-')[0].toLowerCase();
      if (SUPPORTED_LANGS.indexOf(base) !== -1) return base;
    }
  } catch (e) {}
  return 'ca';
}

function getCurrentLang() {
  if (_currentLang == null) _currentLang = _resolveLang();
  return _currentLang;
}

// Locale BCP-47 de l'idioma actiu (per a toLocaleDateString/toLocaleString).
function getLocale() {
  return LANG_LOCALES[getCurrentLang()] || 'ca-ES';
}

// Cua de callbacks per bloc en vol (dedup). Un cop TRANSLATIONS[lang] existeix,
// futures càrregues del mateix bloc retornen a l'instant (cache implícita).
const _langLoadCbs = {};
// Carrega i18n/{lang}.js sota demanda (async, mateix origen). cb(true) si el
// bloc queda disponible, cb(false) si falla. Usa window.I18N_V per al ?v=
// (mateix cache-bust que la càrrega inicial).
function _loadLangBlock(lang, cb) {
  cb = cb || function () {};
  if (TRANSLATIONS[lang]) { cb(true); return; }
  if (_langLoadCbs[lang]) { _langLoadCbs[lang].push(cb); return; }   // ja en vol
  _langLoadCbs[lang] = [cb];
  const v = (typeof window !== 'undefined' && window.I18N_V) ? window.I18N_V : '';
  const s = document.createElement('script');
  s.src = 'i18n/' + lang + '.js' + (v ? ('?v=' + v) : '');
  const done = function (ok) {
    const cbs = _langLoadCbs[lang] || []; delete _langLoadCbs[lang];
    for (let i = 0; i < cbs.length; i++) { try { cbs[i](ok); } catch (e) {} }
  };
  s.onload = function () { done(!!TRANSLATIONS[lang]); };
  s.onerror = function () { done(false); };
  document.head.appendChild(s);
}

// Idioma pendent — guarda contra canvis ràpids seguits: només s'aplica el darrer.
let _pendingLang = null;

// Aplica realment l'idioma (bloc ja carregat): cache + persistència + re-traducció.
function _applyLanguage(lang) {
  _currentLang = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (e) {}
  if (typeof translatePage === 'function') translatePage();
  if (typeof _rerenderActiveScreen === 'function') _rerenderActiveScreen();
}

// Un bloc d'idioma ja està carregat? (perquè l'UI decideixi si cal feedback).
function isLangBlockLoaded(lang) { return !!TRANSLATIONS[lang]; }

// Canvia l'idioma. `cb(status)` OPCIONAL, per a feedback d'UI:
//   'applied'    → aplicat (immediat si el bloc hi era, o després de carregar)
//   'error'      → el bloc no ha carregat (404 / xarxa); NO s'ha canviat res
//   'superseded' → un canvi posterior ha guanyat (ignora'l)
// Si el bloc ja hi és → canvi immediat. Si no, el carrega i aplica NOMÉS al seu
// onload: fins que arriba NO re-traduïm (millor mantenir l'idioma actual que
// ensenyar claus crues). No-op (cb('error')) si l'idioma no és suportat.
function setLanguage(lang, cb) {
  cb = cb || function () {};
  if (SUPPORTED_LANGS.indexOf(lang) === -1) { cb('error'); return; }
  _pendingLang = lang;
  if (TRANSLATIONS[lang]) { _applyLanguage(lang); cb('applied'); return; }
  _loadLangBlock(lang, function (ok) {
    if (_pendingLang !== lang) { cb('superseded'); return; }   // un canvi posterior ha guanyat
    if (ok && TRANSLATIONS[lang]) { _applyLanguage(lang); cb('applied'); }
    else { cb('error'); }
  });
}

// Precarrega (no bloquejant) els blocs dels idiomes NO actius. Es crida a
// l'onboarding: l'usuari triga segons a triar, així que quan toqui un idioma ja
// el tindrà i el canvi serà instantani, sense flaix de re-traducció.
function _preloadOtherLangBlocks() {
  const cur = getCurrentLang();
  for (let i = 0; i < SUPPORTED_LANGS.length; i++) {
    const lang = SUPPORTED_LANGS[i];
    if (lang !== cur && !TRANSLATIONS[lang]) _loadLangBlock(lang);
  }
}

function t(key, ...args) {
  const d = TRANSLATIONS[getCurrentLang()] || {};
  let v = d[key];
  if (v == null && TRANSLATIONS.ca) v = TRANSLATIONS.ca[key];   // fallback a català
  if (typeof v === 'function') return v(...args);
  return v != null ? v : key;
}
