let currentLang = localStorage.getItem('pijadmin_lang') || 'es';

async function setLanguage(lang) {
  try {
    const res = await fetch(`/static/locals/${lang}.json`);
    const translations = await res.json();

    localStorage.setItem('pijadmin_lang', lang);
    currentLang = lang;

    // 3. Traducir textos estándar (data-i18n="seccion.clave")
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const keyPath = el.getAttribute('data-i18n');
      const translation = getNestedTranslation(translations, keyPath);
      if (translation) {
        el.textContent = translation;
      }
    });

    // 4. Traducir placeholders de inputs (data-i18n-placeholder="seccion.clave")
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const keyPath = el.getAttribute('data-i18n-placeholder');
      const translation = getNestedTranslation(translations, keyPath);
      if (translation) {
        el.placeholder = translation;
      }
    });

  } catch (err) {
    console.error('Error cargando el archivo de idioma:', err);
  }
}

// Helper para navegar las claves anidadas ("server_card.btn_start")
function getNestedTranslation(obj, path) {
  return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : null), obj);
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
});