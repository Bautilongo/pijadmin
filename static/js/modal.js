(() => {
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

  function fireModal(options = {}) {
    const {
      title = 'Confirmar acción',
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

      function cleanup() {
        dialog.remove();
      }

      async function closeWithResult(result) {
        if (settled) {
          return;
        }
        settled = true;
        await animateOut(dialog);
        dialog.close();
        syncBodyModalState();
        cleanup();
        resolve(result);
      }

      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeWithResult({ isConfirmed: false, isDismissed: true, dismiss: 'esc' });
      });

      dialog.addEventListener('click', (event) => {
        if (event.target === dialog && allowOutsideClick) {
          closeWithResult({ isConfirmed: false, isDismissed: true, dismiss: 'backdrop' });
        }
      });

      confirmButton.addEventListener('click', () => {
        closeWithResult({ isConfirmed: true, isDismissed: false });
      });

      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          closeWithResult({ isConfirmed: false, isDismissed: true, dismiss: 'cancel' });
        });
      }

      document.body.appendChild(dialog);
      dialog.showModal();
      syncBodyModalState();
      animateIn(dialog);
    });
  }

  window.VanillaSwal = { fire: fireModal };
})();