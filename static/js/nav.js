const menuBtn = document.getElementById('nav-menu-btn');
const dropdown = document.getElementById('nav-dropdown');
const settingsBtn = document.getElementById('nav-settings-btn');
const settingsDropdown = document.getElementById('nav-settings-dropdown');

function closeSettingsDropdown() {
    settingsDropdown.hidden = true;
    settingsBtn.setAttribute('aria-expanded', 'false');
}

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !dropdown.hidden;
    dropdown.hidden = isOpen;
    menuBtn.setAttribute('aria-expanded', String(!isOpen));
    if (isOpen) closeSettingsDropdown();
    if (!isOpen) updateActiveLang();
});

settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !settingsDropdown.hidden;
    settingsDropdown.hidden = isOpen;
    settingsBtn.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', (e) => {
    if (!dropdown.hidden && !dropdown.contains(e.target) && !settingsDropdown.contains(e.target) && e.target !== menuBtn) {
        dropdown.hidden = true;
        menuBtn.setAttribute('aria-expanded', 'false');
        closeSettingsDropdown();
    }
});

function updateActiveLang() {
    const current = localStorage.getItem('pijadmin_lang') || 'es';
    document.querySelectorAll('#nav-lang-options .nav-dropdown-option').forEach(btn => {
        const isActive = btn.dataset.lang === current;
        btn.classList.toggle('active', isActive);
    });
}

// Patch setLanguage to update active state after switching
const _origSetLanguage = typeof setLanguage === 'function' ? setLanguage : null;
if (_origSetLanguage) {
    window.setLanguage = async function(lang) {
        await _origSetLanguage(lang);
        updateActiveLang();
    };
}

document.addEventListener('DOMContentLoaded', updateActiveLang);
