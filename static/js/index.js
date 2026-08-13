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
    window.location.href = '/server/new';
}

function configure(button) {
    const serverName = button.dataset.server;
    window.location.href = `/server/${serverName}`
}

async function confirmDel(button) {
    document.getElementById('delete-modal-button').dataset.server = button.dataset.server
    document.getElementById('confirmation-modal').showModal();
}

async function del(button) {
    const data = {
        serverName: button.dataset.server
    };
    await fetch('/api/servers/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
    });
    
    document.getElementById('confirmation-modal').close();
    document.getElementById(`server-${button.dataset.server}`).remove();
    if (!document.querySelector('.server-card')) {
        window.location.reload();
    }
}