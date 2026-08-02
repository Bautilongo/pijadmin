const DEFAULT_PANEL = 'panel-main';

const SERVER_NAME = document.getElementById('panel-control').dataset.server

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    document.getElementById('connection-dot').classList.add('dot-connected')
});

socket.on('server_status', (data) => {
    const button = document.getElementById('btnStart');
    const consoleBox = document.getElementById('console');
    const status = data.status

    if (status === 1) {
        button.innerText = 'Apagar servidor';
        button.disabled = false;
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
    } else if (status === 0) {
        button.innerText = 'Encender Servidor';
        button.onclick = iniciar;
        button.disabled = false;
    } else {
        button.disabled = true;
        button.innerText = 'iniciando...'
    }
    console.log(status);
});

socket.on('disconnect', () => {
    document.getElementById('connection-dot').classList.remove('dot-connected')
});

function iniciar() {
    const consoleBox = document.getElementById('console');
    consoleBox.innerText = 'Iniciando servidor...\n'; 
    const status = document.getElementById('status');
    status.textContent = '● Servidor iniciando';
    status.style.color = '#f59e0b';
    socket.emit('start_server', { serverName: SERVER_NAME }, (response => {
        if (response.status === 'ok') {
            btn = document.getElementById('btnStart');
            btn.innerText = 'Iniciando...';  
            btn.disabled = true;
        } else {
            alert('Error al iniciar' + response.message)
        }
    }));
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

socket.on('server_ready', async (data) => {
    const status = document.getElementById('status');
    await delay(500);
    status.textContent = '● Servidor en línea';
    status.style.color = '#3ba55d';
    document.getElementById('console').innerText += `\n[Dashboard] Servidor listo! (${data.time}s)`;
    const btn = document.getElementById('btnStart');
    btn.innerText = 'Apagar servidor';
    btn.disabled = false;
    
})

socket.on('console_output', (msg) => {
    const consoleBox = document.getElementById('console');
    consoleBox.innerText += (msg.line + '\n');
    consoleBox.scrollTop = consoleBox.scrollHeight;
})
socket.on('system_metrics', (data) => {
    document.getElementById('metrics').innerText = `RAM: ${data.ram} MB | CPU: ${data.cpu}%`;
});

socket.on('server_stopped', () => {
    document.getElementById('btnStart').innerText = 'Encender Servidor';
    const consoleBox = document.getElementById('console');
    consoleBox.innerText += '\n[Servidor detenido]\n';
});