(() => {
  let activeModal = null;

  function syncBodyModalState() {
    if (document.querySelector('dialog[open]')) {
      document.body.classList.add('modal-open');
      return;
    }
    document.body.classList.remove('modal-open');
  }

  function ensureHelperStyles() {
    if (document.getElementById('vanilla-swal-helper-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'vanilla-swal-helper-styles';
    style.textContent = `
      dialog .vanilla-modal-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      dialog .vanilla-modal-fields {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      dialog .vanilla-modal-label {
        font-size: 0.82rem;
        color: var(--text-muted);
        font-weight: 600;
      }

      dialog .vanilla-modal-select {
        width: 100%;
        background: var(--pill);
        color: var(--text-primary);
        border: 1px solid var(--pill-border);
        border-radius: var(--radius-sm);
        padding: 10px 12px;
        outline: none;
        font-family: var(--font);
        font-size: 0.86rem;
      }

      dialog .vanilla-modal-select:focus {
        border-color: var(--text-dim);
      }

      dialog .vanilla-modal-error {
        margin: 0;
        color: var(--fail);
        font-size: 0.8rem;
        line-height: 1.3;
        min-height: 1.05em;
        visibility: hidden;
      }

      dialog .vanilla-modal-error.is-visible {
        visibility: visible;
      }
    `;

    document.head.appendChild(style);
  }

  function playAnimation(dialog, keyframes, options) {
    if (typeof dialog.animate !== 'function') {
      return Promise.resolve();
    }

    const animation = dialog.animate(keyframes, options);
    return new Promise((resolve) => {
      animation.addEventListener('finish', resolve, { once: true });
      animation.addEventListener('cancel', resolve, { once: true });
    });
  }

  function animateIn(dialog) {
    return playAnimation(
      dialog,
      [
        { opacity: 0, transform: 'scale(0.96)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      { duration: 170, easing: 'ease-out', fill: 'forwards' }
    );
  }

  function animateOut(dialog) {
    return playAnimation(
      dialog,
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.96)' }
      ],
      { duration: 140, easing: 'ease-in', fill: 'forwards' }
    );
  }

  function isBackdropClick(event, dialog) {
    if (event.target !== dialog) {
      return false;
    }

    const rect = dialog.getBoundingClientRect();
    const insideDialog =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    return !insideDialog;
  }

  function normalizeSelectOptions(selectOptions) {
    if (Array.isArray(selectOptions)) {
      return selectOptions.map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          const value = String(item);
          return { value, label: value, disabled: false };
        }

        return {
          value: String(item.value),
          label: item.label != null ? String(item.label) : String(item.value),
          disabled: Boolean(item.disabled)
        };
      });
    }

    if (selectOptions && typeof selectOptions === 'object') {
      return Object.entries(selectOptions).map(([value, label]) => ({
        value,
        label: String(label),
        disabled: false
      }));
    }

    return [];
  }

  function fireModal(options = {}) {
    ensureHelperStyles();

    const {
      title = 'Confirmar accion',
      text = '',
      confirmText = 'Aceptar',
      cancelText = 'Cancelar',
      showCancelButton = true,
      allowOutsideClick = true,
      confirmButtonClass = 'btn btn-primary',
      cancelButtonClass = 'btn btn-secondary',
      modalType = 'default',
      type = null,
      selectOptions = [],
      selectLabel = '',
      selectPlaceholder = 'Selecciona una opcion',
      selectValue = '',
      selectRequired = true,
      selectValidationMessage = 'Selecciona una opcion para continuar.'
    } = options;

    const resolvedType = type || modalType;

    return new Promise((resolve) => {
      let settled = false;

      const dialog = document.createElement('dialog');
      dialog.innerHTML = `
        <h2></h2>
        <p></p>
        <form class="vanilla-modal-form" novalidate>
          <div class="vanilla-modal-fields"></div>
          <div class="modal-actions">
            ${showCancelButton ? `<button type="button" class="${cancelButtonClass}" data-modal-action="cancel"></button>` : ''}
            <button type="submit" class="${confirmButtonClass}" data-modal-action="confirm"></button>
          </div>
        </form>
      `;

      const titleEl = dialog.querySelector('h2');
      const textEl = dialog.querySelector('p');
      const formEl = dialog.querySelector('form');
      const fieldsEl = dialog.querySelector('.vanilla-modal-fields');
      const confirmButton = dialog.querySelector('[data-modal-action="confirm"]');
      const cancelButton = dialog.querySelector('[data-modal-action="cancel"]');

      titleEl.textContent = title;
      textEl.textContent = text;
      if (!text) {
        textEl.style.display = 'none';
      }

      confirmButton.textContent = confirmText;
      if (cancelButton) {
        cancelButton.textContent = cancelText;
      }

      let getValue = () => null;
      let validate = () => true;

      if (resolvedType === 'select') {
        const labelEl = document.createElement('label');
        labelEl.className = 'vanilla-modal-label';
        labelEl.textContent = selectLabel || 'Seleccion';

        const selectEl = document.createElement('select');
        selectEl.className = 'vanilla-modal-select';

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = selectPlaceholder;
        placeholderOption.disabled = Boolean(selectRequired);
        placeholderOption.selected = true;
        selectEl.appendChild(placeholderOption);

        normalizeSelectOptions(selectOptions).forEach((item) => {
          const optionEl = document.createElement('option');
          optionEl.value = item.value;
          optionEl.textContent = item.label;
          optionEl.disabled = item.disabled;
          selectEl.appendChild(optionEl);
        });

        if (selectValue !== '') {
          selectEl.value = String(selectValue);
        }

        const errorEl = document.createElement('p');
        errorEl.className = 'vanilla-modal-error';
        errorEl.textContent = '';

        fieldsEl.appendChild(labelEl);
        fieldsEl.appendChild(selectEl);
        fieldsEl.appendChild(errorEl);

        getValue = () => selectEl.value;

        validate = () => {
          if (!selectRequired || selectEl.value !== '') {
            errorEl.textContent = '';
            errorEl.classList.remove('is-visible');
            return true;
          }

          errorEl.textContent = selectValidationMessage;
          errorEl.classList.add('is-visible');
          selectEl.focus();
          return false;
        };

        selectEl.addEventListener('change', () => {
          errorEl.textContent = '';
          errorEl.classList.remove('is-visible');
        });
      }

      async function closeWithResult(result) {
        if (settled) {
          return;
        }

        settled = true;

        if (activeModal && activeModal.dialog === dialog) {
          activeModal = null;
        }

        await animateOut(dialog);
        if (dialog.open) {
          dialog.close();
        }
        syncBodyModalState();
        dialog.remove();
        resolve(result);
      }

      function dismiss(reason) {
        return closeWithResult({
          isConfirmed: false,
          isDismissed: true,
          dismiss: reason,
          value: null
        });
      }

      if (activeModal && typeof activeModal.dismiss === 'function') {
        activeModal.dismiss('replaced');
      }

      activeModal = { dialog, dismiss };

      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        dismiss('esc');
      });

      dialog.addEventListener('click', (event) => {
        if (allowOutsideClick && isBackdropClick(event, dialog)) {
          dismiss('backdrop');
        }
      });

      formEl.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!validate()) {
          return;
        }

        closeWithResult({
          isConfirmed: true,
          isDismissed: false,
          value: getValue()
        });
      });

      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          dismiss('cancel');
        });
      }

      document.body.appendChild(dialog);
      dialog.showModal();
      syncBodyModalState();
      animateIn(dialog);
    });
  }

  function closeActiveModal() {
    if (activeModal && typeof activeModal.dismiss === 'function') {
      activeModal.dismiss('programmatic');
    }
  }

  window.VanillaSwal = {
    fire: fireModal,
    close: closeActiveModal
  };
})();
