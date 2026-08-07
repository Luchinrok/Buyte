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

// Resol l'idioma efectiu: 1) localStorage; 2) detecció de navigator.language(s)
// (base abans del guió, p. ex. 'es-ES' → 'es'); 3) fallback 'ca'. Sempre
// dins de SUPPORTED_LANGS.
function _resolveLang() {
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

// Canvia l'idioma: valida, persisteix, actualitza la cache i re-renderitza
// (textos data-i18n + pantalla activa). No-op si l'idioma no és suportat.
function setLanguage(lang) {
  if (SUPPORTED_LANGS.indexOf(lang) === -1) return;
  _currentLang = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (e) {}
  if (typeof translatePage === 'function') translatePage();
  if (typeof _rerenderActiveScreen === 'function') _rerenderActiveScreen();
}

function t(key, ...args) {
  const d = TRANSLATIONS[getCurrentLang()] || {};
  let v = d[key];
  if (v == null && TRANSLATIONS.ca) v = TRANSLATIONS.ca[key];   // fallback a català
  if (typeof v === 'function') return v(...args);
  return v != null ? v : key;
}
