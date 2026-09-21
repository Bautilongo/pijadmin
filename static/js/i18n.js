// Translations for the current page are embedded server-side as window.I18N
// (see layout.html), so there is no fetch/flash-of-untranslated-content here.

function getNestedTranslation(obj, path) {
  return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : null), obj);
}

function t(keyPath) {
  return getNestedTranslation(window.I18N, keyPath) ?? keyPath;
}

// Switches the active language by navigating to the same path under the new
// /<lang>/ prefix. The server re-renders every string, so there is no flicker.
function setLanguage(lang) {
  const segments = window.location.pathname.split('/');
  segments[1] = lang;
  const newPath = segments.join('/') || '/';
  document.cookie = `pijadmin_lang=${lang}; path=/; max-age=${30 * 24 * 60 * 60}`;
  window.location.href = `${newPath}${window.location.search}${window.location.hash}`;
}
