function serverCreate() {
    window.location.href = '/server/new';
}

function configure(button) {
    const serverName = button.dataset.server;
    window.location.href = `/server/${serverName}`
}