let activeModal = null;

const DEFAULT_PANEL = 'panel-main';

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

function enable_sfw_mode(button) {
    fetch('/set_sfw_mode', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'sfw_mode="true"'
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                button.classList.add('active');
                button.querySelector(':scope > span').innerText = 'Desactivar modo SFW';
                button.onclick = () => disable_sfw_mode(button);
                button.querySelector(':scope > img').src = '/static/icons/shield_off.svg';
                document.querySelector('.project-identity-logo').src = '/static/icons/logo_sfw.svg';
            }
        });
}

function disable_sfw_mode(button) {
    fetch('/set_sfw_mode', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'sfw_mode="false"'
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                button.classList.remove('active');
                button.querySelector(':scope > span').innerText = 'Activar modo SFW';
                button.onclick = () => enable_sfw_mode(button);
                button.querySelector(':scope > img').src = '/static/icons/shield_with_heart.svg';
                document.querySelector('.project-identity-logo').src = '/static/icons/logo.svg';
            }
        });
}

function getElementValue(element) {
    const tagName = element.tagName.toLowerCase();

    // Manejo de select múltiple
    if (tagName === 'select' && element.multiple) {
        return Array.from(element.selectedOptions).map(option => option.value);
    }

    // Manejo por tipo de input
    switch (element.type) {
        case 'checkbox':
            return element.checked;
        case 'number':
        case 'range':
            return element.valueAsNumber;
        default:
            return element.value;
    }
}

function updateProperties(container, button) {
    values = {}
    container.querySelectorAll(':scope input, :scope select').forEach((input) => {
        values[input.id] = getElementValue(input)
    })

    button.disabled = true;
    button.innerText = 'Guardando...';

    fetch('/update_properties', {
        method: 'post',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `serverName=${serverName}&properties=${JSON.stringify(values)}`
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'error') {
                result = VanillaSwal.fire({
                    title: 'Error al actualizar propiedades',
                    text: data.message,
                    icon: 'error',
                    confirmText: 'Cerrar'
                });
            } else {
                result = VanillaSwal.fire({
                    title: 'Propiedades actualizadas',
                    text: 'Las propiedades del servidor se han actualizado correctamente.',
                    icon: 'success',
                    confirmText: 'Cerrar'
                });

            }
        button.disabled = false;
        button.innerText = 'Guardar';
        });
}

document.querySelectorAll('[data-property-select]').forEach((customSelect) => {
    const trigger = customSelect.querySelector('.property-select-trigger');
    const list = customSelect.querySelector('.property-select-list');
    const valueNode = customSelect.querySelector('.property-select-value');
    const hiddenInput = customSelect.querySelector('input[type="hidden"]');

    const close = () => {
        customSelect.classList.remove('is-open');
        list.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.addEventListener('click', () => {
        const isOpen = customSelect.classList.toggle('is-open');
        list.hidden = !isOpen;
        trigger.setAttribute('aria-expanded', String(isOpen));
    });

    list.addEventListener('click', (event) => {
        const option = event.target.closest('.property-select-option');
        if (!option) return;

        list.querySelectorAll('.property-select-option').forEach((item) => {
            const selected = item === option;
            item.classList.toggle('is-selected', selected);
            item.setAttribute('aria-selected', String(selected));
        });
        hiddenInput.value = option.dataset.value;
        valueNode.textContent = option.textContent;
        close();
    });

    document.addEventListener('click', (event) => {
        if (!customSelect.contains(event.target)) close();
    });
});

const datasets = document.getElementById('panel-control')
const serverName = datasets.dataset.server
const serverVersion = datasets.dataset.version

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
    socket.emit('join_server_room', { serverName: serverName });
    document.getElementById('connection-dot').classList.add('dot-connected')
});

socket.on('server_status', (data) => {
    const button = document.getElementById('btnStart');
    const consoleBox = document.getElementById('console');
    const status = data.status;
    const statusElement = document.getElementById('status');

    if (status === 1) {
        statusElement.textContent = '● Servidor en línea';
        statusElement.style.color = '#3ba55d';
        button.innerText = 'Apagar servidor';
        button.disabled = false;
        button.onclick = () => {
            result = VanillaSwal.fire({
                title: 'Apagar servidor',
                text: '¿Estás seguro de que deseas apagar el servidor?',
                showCancelButton: true,
                confirmText: 'Sí, apagar',
                confirmButtonClass: 'btn btn-danger',
                cancelText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    socket.emit('stop_server', { 'serverName': serverName });
                }
            });
        }
        if (!consoleBox.innerText.trim() || consoleBox.innerText.includes('Esperando inicio del servidor...')) {
            consoleBox.innerText = 'Servidor iniciado. Esperando salida de consola...\n';
        }
    } else if (status === 0) {
        button.innerText = 'Encender Servidor';
        button.onclick = iniciar;
        button.disabled = false;
        statusElement.textContent = '● Servidor detenido';
        statusElement.style.color = '#ef4444';
    } else {
        button.disabled = true;
        button.innerText = 'iniciando...'
        statusElement.textContent = '● Servidor iniciando';
        statusElement.style.color = '#f59e0b';
    }
});

socket.on('disconnect', () => {
    document.getElementById('connection-dot').classList.remove('dot-connected')
});

function iniciar() {
    const consoleBox = document.getElementById('console');
    consoleBox.innerText = 'Iniciando servidor...\n'; 
    const status = document.getElementById('status');
    socket.emit('start_server', { serverName: serverName }, (response => {
        if (response.status === 'ok') {
            btn = document.getElementById('btnStart');
            btn.innerText = 'Iniciando...';  
            btn.disabled = true;
            status.textContent = '● Servidor iniciando';
            status.style.color = '#f59e0b';

        } else if (response.status === 'installation_needed') {
            result = VanillaSwal.fire({
                title: `Para iniciar tu servidor en la ${serverVersion} debes instalar el Java SDK en su versión ${response.java_version}`,
                showCancelButton: true,
                confirmText: 'Instalala por mí',
                confirmButtonClass: 'btn btn-success',
                cancelText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    confirmInstalation(response.java_version);
                }
            })
        } 
        else {
            VanillaSwal.fire({
                title: 'Error al iniciar',
                text: response.message,
                showCancelButton: false,
                confirmText: 'Cerrar',
                confirmButtonClass: 'btn btn-secondary'
            })
        }
    }));
}

function confirmInstalation(javaVersion) {
    result = VanillaSwal.fire({
        title: 'Necesitaremos permisos de administrador, por favor acepta la solicitud de permisos...',
        showCancelButton: false,
        confirmText: 'Ok',
        confirmButtonClass: 'btn btn-secondary'
    })
    const consoleBox = document.getElementById('console');
    consoleBox.innerText += 'Instalando Java...\n';
    socket.emit('install_java', { serverName: serverName, javaVersion: javaVersion }, (response) => {
        if (response.status === 'ok') {
            consoleBox.innerText += 'Java instalado correctamente.\n';
        } else {
            alert('Error al instalar Java: ' + response.message);
        }
    });
}

function enviarComando() {
    const input = document.getElementById('cmdInput');
    if (input.value.trim() !== '') {
        const comando = input.value;
        socket.emit('send_command', { command: comando, serverName: serverName });
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
    btn.onclick = () => {
        modal = document.getElementById('shut-down-modal')
        modal.showModal()
    }
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
    const statusElement = document.getElementById('status');
    statusElement.textContent = '● Servidor detenido';
    statusElement.style.color = '#ef4444';
});

async function ipConfigure() {
    result = VanillaSwal.fire({  
        title: 'Exponer a internet',
        text: 'Para permitir que otros se conecten a tu servidor, necesitas exponerlo a internet. Para esto, puedes abrir los puertos de tu router o usar un servicio de túneles como playit.gg.',
        confirmText: 'Más información',
        showCancelButton: true,
        cancelText: 'Cerrar'
    }).then((result) => {
        if (result.isConfirmed) {
            window.open('https://pijadmin.xenomorphyk.one/expose', '_blank');
        }
    });
}

function formatOptions(arr) { 
    for (let i = 0; i < arr.length; i++) {
        arr[i] = { value: arr[i], label: arr[i] };
    }
    return arr;
}

document.getElementById("change-version-button").addEventListener("click", async () => {await changeVersion()});
document.getElementById("change-software-button").addEventListener("click", async () => {await changeSoftware()});

async function changeVersion() {
    const paperVersions = await getPaperVersions();
    const result = await VanillaSwal.fire({
    type: 'select',
    title: 'Cambiar versión',
    text: 'Selecciona la versión a la que deseas cambiar tu servidor:',
    selectLabel: 'Versión',
    selectOptions: formatOptions(paperVersions),
    selectRequired: true,
    confirmText: 'Cambiar',
    cancelText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        const newVersion = result.value;
        console.log({ serverName, newVersion });
        const res = await fetch('/api/servers/change_version', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverName, newVersion })
        });
        const data = await res.json();
        if (data.status === 'ok') {
            VanillaSwal.fire({
                title: 'Versión cambiada',
                text: `La versión del servidor se ha cambiado a ${newVersion}.`,
                icon: 'success',
                confirmText: 'Cerrar',
                showCancelButton: false
            });
        } else {
            VanillaSwal.fire({
                title: 'Error al cambiar versión',
                text: data.message,
                icon: 'error',
                confirmText: 'Cerrar',
                showCancelButton: false
            });
        }
    }
}

async function changeSoftware() {
    const softwareOptions = ['vanilla', 'paper'];
    const result = await VanillaSwal.fire({
        type: 'select',
        title: 'Cambiar software',
        text: 'Selecciona el software al que deseas cambiar tu servidor:',
        selectLabel: 'Software',
        selectOptions: formatOptions(softwareOptions),
        selectRequired: true,
        confirmText: 'Cambiar',
        cancelText: 'Cancelar'
    });
    if (result.isConfirmed) {
        const newSoftware = result.value;
        console.log({ serverName, newSoftware });
        const res = await fetch('/api/servers/change_software', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverName, newSoftware })
        });
        const data = await res.json();
        if (data.status === 'ok') {
            VanillaSwal.fire({
                title: 'Software cambiado',
                text: `El software del servidor se ha cambiado a ${newSoftware}.`,
                icon: 'success',
                confirmText: 'Cerrar',
                showCancelButton: false
            });
        } else {
            VanillaSwal.fire({
                title: 'Error al cambiar software',
                text: data.message,
                icon: 'error',
                confirmText: 'Cerrar',
                showCancelButton: false
            });
        }
    }
}