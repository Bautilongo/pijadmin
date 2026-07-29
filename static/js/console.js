const socket = io();

socket.on('connect', () => {
    document.getElementById('status').innerText = '● Conectado al Dashboard';
    document.getElementById('status').style.color = '#22c55e';
});

socket.on('server_status', (data) => {
    const button = document.getElementById('btnStart');
    const consoleBox = document.getElementById('console')
    if (data.running) {
        button.innerText = 'Apagar servidor';
        button.onclick = () => {
            console.log('asdasd')
            modal = document.getElementById('shut-down-modal')
            modal.showModal()
            document.getElementById('modal-yes-button').onclick = () => {
                socket.emit('stop_server')
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
    socket.emit('start_server');
    document.getElementById('btnStart').disabled = false;
    document.getElementById('btnStart').innerText = 'Iniciando...';
}

function enviarComando() {
    const input = document.getElementById('cmdInput');
    if (input.value.trim() !== '') {
        const comando = input.value;
        socket.emit('send_command', { command: comando });
        const consoleBox = document.getElementById('console');
        consoleBox.innerText += `> ${comando}\n`;
        input.value = '';
    }
}

socket.on('console_output', (msg) => {
    const consoleBox = document.getElementById('console');
    consoleBox.innerText += msg.data;
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