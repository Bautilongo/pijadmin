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