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

function serverCreate() {
    window.location.href = `/${window.APP_LANG}/server/new`;
}

function configure(button) {
    const serverName = button.dataset.server;
    window.location.href = `/${window.APP_LANG}/server/${serverName}`;
}

async function confirmDel(button) {
    const serverName = button.dataset.server;
    const result = await VanillaSwal.fire({
        title: t('index.delete_confirm'),
        showCancelButton: true,
        confirmText: t('index.delete_yes'),
        confirmButtonClass: 'btn btn-danger',
        cancelText: t('index.delete_cancel')
    });

    if (result.isConfirmed) {
        await del(serverName);
    }
}

async function del(serverName) {
    const data = { serverName };
    await fetch('/api/servers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    document.getElementById(`server-${serverName}`).remove();
    if (!document.querySelector('.server-card')) {
        window.location.reload();
    }
}