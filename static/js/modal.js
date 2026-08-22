(() => {
  let activeModal = null;

  function syncBodyModalState() {
    if (document.querySelector('dialog[open]')) {
      document.body.classList.add('modal-open');
      return;
    }
    document.body.classList.remove('modal-open');
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

  function fireModal(options = {}) {
    const {
      title = 'Confirmar accion',
      text = '',
      confirmText = 'Aceptar',
      cancelText = 'Cancelar',
      showCancelButton = true,
      allowOutsideClick = true,
      confirmButtonClass = 'btn btn-primary',
      cancelButtonClass = 'btn btn-secondary'
    } = options;

    return new Promise((resolve) => {
      let settled = false;

      const dialog = document.createElement('dialog');
      dialog.innerHTML = `
        <h2></h2>
        <p></p>
        <div class="modal-actions">
          ${showCancelButton ? `<button type="button" class="${cancelButtonClass}" data-modal-action="cancel"></button>` : ''}
          <button type="button" class="${confirmButtonClass}" data-modal-action="confirm"></button>
        </div>
      `;

      const titleEl = dialog.querySelector('h2');
      const textEl = dialog.querySelector('p');
      const confirmButton = dialog.querySelector('[data-modal-action="confirm"]');
      const cancelButton = dialog.querySelector('[data-modal-action="cancel"]');

      titleEl.textContent = title;
      textEl.textContent = text;
      confirmButton.textContent = confirmText;
      if (cancelButton) {
        cancelButton.textContent = cancelText;
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
          dismiss: reason
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

      confirmButton.addEventListener('click', () => {
        closeWithResult({ isConfirmed: true, isDismissed: false });
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

