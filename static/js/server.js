const DEFAULT_PANEL = 'panel-main';

const SERVER_NAME = document.getElementById('panel-control').dataset.server

function cleanRoute() {
    return `${window.location.pathname}${window.location.search}`;
}

function showPanel(panelId) {
    document.querySelectorAll('.section').forEach((div) => {
        div.style.display = 'none';
    });

    const currentView = document.getElementById(panelId);
    if (currentView) {
        currentView.style.display = 'block';
    }
}

function changeViewFromHashOrState() {
    const panelFromHash = window.location.hash.substring(1);
    const panelFromState = window.history.state?.panel;
    const panel = panelFromHash || panelFromState || DEFAULT_PANEL;

    showPanel(panel);

    // Mantiene URL limpia pero conserva el panel actual en history.state.
    window.history.replaceState({ panel }, '', cleanRoute());
}

window.addEventListener('DOMContentLoaded', () => {
    changeViewFromHashOrState();

    document.querySelectorAll('a.nav-link[href^="#"]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const panel = link.getAttribute('href')?.slice(1) || DEFAULT_PANEL;
            showPanel(panel);
            window.history.pushState({ panel }, '', cleanRoute());
        });
    });
});

window.addEventListener('popstate', (event) => {
    const panel = event.state?.panel || DEFAULT_PANEL;
    showPanel(panel);
});

const socket = io();

socket.on('connect', () => {
    socket.emit('join_server_room', { serverName: SERVER_NAME });
    document.getElementById('status').innerText = '● Conectado al Dashboard';
    document.getElementById('status').style.color = '#22c55e';
});

socket.on('server_status', (data) => {
    console.log('me llego un server_status');
    const button = document.getElementById('btnStart');
    const consoleBox = document.getElementById('console');
    if (data.running) {
        console.log('data.running es truthy');
        button.innerText = 'Apagar servidor';
        button.onclick = () => {
            modal = document.getElementById('shut-down-modal')
            modal.showModal()
            document.getElementById('modal-yes-button').onclick = () => {
                socket.emit('stop_server', {'serverName': SERVER_NAME})
                modal.close()
            }
            document.getElementById('modal-no-button').onclick = () => {
                modal.close()
            }
        }
        if (!consoleBox.innerText.trim() || consoleBox.innerText.includes('Esperando inicio del servidor...')) {
            consoleBox.innerText = 'Servidor iniciado. Esperando salida de consola...\n';
        }
    } else {
        button.disabled = false;
        button.innerText = 'Encender Servidor';
        button.onclick = iniciar
    }
});

socket.on('disconnect', () => {
    document.getElementById('status').innerText = '● Desconectado';
    document.getElementById('status').style.color = '#ef4444';
});

function iniciar() {
    const consoleBox = document.getElementById('console');
    consoleBox.innerText = 'Iniciando servidor...\n'; // Limpia y comienza
    socket.emit('start_server', { serverName: SERVER_NAME }, (response => {
        if (response.status === 'ok') {
            document.getElementById('btnStart').innerText = 'Iniciando...';  
        } else {
            alert('Error al iniciar' + response.message)
        }
    }));
    document.getElementById('btnStart').disabled = false;
}

function enviarComando() {
    const input = document.getElementById('cmdInput');
    if (input.value.trim() !== '') {
        const comando = input.value;
        socket.emit('send_command', { command: comando, serverName: SERVER_NAME });
        const consoleBox = document.getElementById('console');
        consoleBox.innerText += `> ${comando}\n`;
        input.value = '';
    }
}

socket.on('console_output', (msg) => {
    const consoleBox = document.getElementById('console');
    consoleBox.innerText += msg.line;
    consoleBox.scrollTop = consoleBox.scrollHeight;
})
socket.on('system_metrics', (data) => {
    document.getElementById('metrics').innerText = `RAM: ${data.ram} MB | CPU: ${data.cpu}%`;
});

socket.on('server_stopped', () => {
    document.getElementById('btnStart').disabled = false;
    document.getElementById('btnStart').innerText = 'Encender Servidor';
    const consoleBox = document.getElementById('console');
    consoleBox.innerText += '\n[Servidor detenido]\n';
});