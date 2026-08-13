const form = document.getElementById('create-server-form');
const hiddenSoftware = document.getElementById('software');
const customSelect = document.querySelector('[data-custom-select]');
const trigger = document.getElementById('software-trigger');
const valueNode = document.getElementById('software-value');
const listbox = document.getElementById('software-listbox');
const options = Array.from(listbox.querySelectorAll('.custom-select-option'));

let isOpen = false;
let activeIndex = -1;
let selectedIndex = -1;

const isOptionDisabled = (option) => option.classList.contains('is-disabled') || option.getAttribute('aria-disabled') === 'true';
const firstEnabledIndex = () => options.findIndex((option) => !isOptionDisabled(option));

const setActiveIndex = (index) => {
  options.forEach((option, i) => {
    option.classList.toggle('is-active', i === index);
  });

  activeIndex = index;
  if (activeIndex >= 0) {
    trigger.setAttribute('aria-activedescendant', options[activeIndex].id);
    options[activeIndex].scrollIntoView({ block: 'nearest' });
  } else {
    trigger.removeAttribute('aria-activedescendant');
  }
};

const moveActive = (direction) => {
  if (!options.length) {
    return;
  }

  let index = activeIndex;
  if (index < 0) {
    index = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex();
  }

  for (let i = 0; i < options.length; i += 1) {
    index = (index + direction + options.length) % options.length;
    if (!isOptionDisabled(options[index])) {
      setActiveIndex(index);
      return;
    }
  }
};

const closeSelect = ({ restoreFocus = false } = {}) => {
  if (!isOpen) {
    return;
  }

  isOpen = false;
  customSelect.classList.remove('is-open');
  listbox.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus) {
    trigger.focus();
  }
};

const openSelect = () => {
  if (isOpen) {
    return;
  }

  isOpen = true;
  customSelect.classList.add('is-open');
  listbox.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');

  const fallback = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex();
  setActiveIndex(fallback);
};

const selectIndex = (index) => {
  if (index < 0 || index >= options.length || isOptionDisabled(options[index])) {
    return;
  }

  selectedIndex = index;
  const option = options[index];
  const value = option.dataset.value || '';

  options.forEach((item, i) => {
    const selected = i === index;
    item.classList.toggle('is-selected', selected);
    item.setAttribute('aria-selected', selected ? 'true' : 'false');
  });

  hiddenSoftware.value = value;
  valueNode.textContent = option.textContent;
  valueNode.classList.remove('is-placeholder');
  hiddenSoftware.setCustomValidity('');
};

trigger.addEventListener('click', () => {
  if (isOpen) {
    closeSelect();
  } else {
    openSelect();
  }
});

trigger.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (!isOpen) {
        openSelect();
      }
      moveActive(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      if (!isOpen) {
        openSelect();
      }
      moveActive(-1);
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (!isOpen) {
        openSelect();
      } else if (activeIndex >= 0) {
        selectIndex(activeIndex);
        closeSelect({ restoreFocus: true });
      }
      break;
    case 'Escape':
      if (isOpen) {
        event.preventDefault();
        closeSelect({ restoreFocus: true });
      }
      break;
    case 'Tab':
      closeSelect();
      break;
    default:
      break;
  }
});

listbox.addEventListener('click', (event) => {
  const option = event.target.closest('.custom-select-option');
  if (!option || isOptionDisabled(option)) {
    return;
  }

  const index = options.indexOf(option);
  selectIndex(index);
  setActiveIndex(index);
  closeSelect({ restoreFocus: true });
});

listbox.addEventListener('mousemove', (event) => {
  const option = event.target.closest('.custom-select-option');
  if (!option || isOptionDisabled(option)) {
    return;
  }

  const index = options.indexOf(option);
  if (index !== activeIndex) {
    setActiveIndex(index);
  }
});

document.addEventListener('mousedown', (event) => {
  if (!customSelect.contains(event.target)) {
    closeSelect();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSelect({ restoreFocus: true });
  }
});

const modalStack = new Set();

const nativeShowModal = HTMLDialogElement.prototype.showModal;
HTMLDialogElement.prototype.showModal = function () {
  modalStack.add(this);
  document.body.classList.add('modal-open');
  return nativeShowModal.call(this);
};

const nativeClose = HTMLDialogElement.prototype.close;
HTMLDialogElement.prototype.close = function () {
  modalStack.delete(this);
  if (modalStack.size === 0) {
    document.body.classList.remove('modal-open');
  }
  return nativeClose.call(this);
};

let currentTranslations = fetch(`/static/locals/${localStorage.getItem('pijadmin_lang') || 'es'}`);
function t(keyPath) {
  return keyPath.split('.').reduce((prev, curr) => (prev ? prev[curr] : null), currentTranslations || keyPath)
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!hiddenSoftware.value) {
    hiddenSoftware.setCustomValidity(t('new_server.seelct_a_software')); // Selecciona un software para continuar.
    hiddenSoftware.reportValidity();
    openSelect();
    return;
  }

  const currentForm = e.currentTarget;
  let software = currentForm.software.value
  if (software == 'spigot') {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-message').innerText = t('new_server.spigot'); // No se puede usar spigot: es malísimo!
    modal.showModal();
    return;
  }
  const data = {
    name: currentForm.name.value.trim(),
    version: currentForm.version.value.trim(),
    software: software
  };

  try {
    const res = await fetch('/api/servers/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const modal = document.getElementById('error-modal');
      document.getElementById('error-modal-message').innerText = body.message || t('new_server.unexpected_error'); // Ha ocurrido un error inesperado.
      modal.showModal();
      return;
    }

    window.location.href = `/server/${currentForm.name.value.trim()}`;
  } catch (err) {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-message').innerText = t('new_Server.check_internet_connection'); // No se pudo contactar con el servidor. Revisa la conexión e inténtalo de nuevo.
    modal.showModal();
  }
});

document.getElementById('error-modal-button').addEventListener('click', () => {
  document.getElementById('error-modal').close();
});