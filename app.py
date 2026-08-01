import engineio.async_drivers.threading

from flask import Flask, render_template, request, url_for, redirect
from flask_socketio import SocketIO
import subprocess
import psutil
from pathlib import Path
from typing import Optional
from threading import Lock, Thread
from configparser import ConfigParser
import re
import os
import sys

from util import util
from util import paper
from util import vanilla

config = ConfigParser()

BASE_DIR = util.get_base_dir()
print(BASE_DIR)
SERVERS_DIR = BASE_DIR / 'servers'

SERVERS_DIR.mkdir(exist_ok=True)

if getattr(sys, 'frozen', False):
    TEMP_BASE_DIR = Path(sys._MEIPASS) # type: ignore
    app = Flask(
        __name__,
        template_folder=str(TEMP_BASE_DIR / 'templates'),
        static_folder=str(TEMP_BASE_DIR / 'static')
    )
else:
    app = Flask(__name__)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
    async_mode='threading'
)


process: Optional[subprocess.Popen] = None
monitor: Optional[psutil.Process] = None
connected_clients = set()
clients_lock = Lock()


def leer_consola():
    """Hilo de fondo para leer los logs de Java sin bloquear Socket.IO."""
    global process
    emitir_a_clientes('console_output', {'data': '[Dashboard] Escuchando salida del servidor...\n'})
    while process and process.poll() is None:
        if process.stdout is None:
            break
        linea = process.stdout.readline()
        print(linea)
        if linea:
            emitir_a_clientes('console_output', {'data': linea})
        else:
            socketio.sleep(1)
    # Cuando el servidor termina
    emitir_a_clientes('server_stopped', {})

def transmitir_metricas():
    """Hilo de fondo para medir uso de RAM y CPU."""
    global monitor, process
    while process and process.poll() is None:
        try:
            if monitor is None:
                break
            ram = round(monitor.memory_info().rss / (1024 * 1024), 1)
            cpu = monitor.cpu_percent(interval=None)
            emitir_a_clientes('system_metrics', {'ram': ram, 'cpu': cpu})
        except Exception:
            break
        socketio.sleep(2)

def search_servers():
    servers = []
    print(str(SERVERS_DIR))
    for item in SERVERS_DIR.iterdir():
        if not item.is_dir():
            continue
        if not item.stem == 'server':
            continue
        servers.append(item)
    return servers if servers else None

def get_server_by_name(name: str):
    dir = SERVERS_DIR / ('server.' + name)
    if not dir.is_dir():
        return None
    config.read(dir / '.conf')
    software = config['server']['software']
    version = config['server']['version']
    sha = config['server']['sha']
    return_ = {}
    if software == 'vanilla':
        return_ = {'software': software, 'version': version, 'sha': sha}
    return_['build_id'] = config['server']['build_id']
    return return_

@app.route('/')
def index():
    servers = search_servers()
    return render_template('index.html', servers=servers)

@app.route('/index')
def index_alias():
    return index()

@app.route('/server')
def server_redirect():
    return redirect(url_for('index'))

@app.route('/server/new')
def new_server():
    return render_template('new_server.html')

@app.route('/api/servers/new', methods=['POST'])
def api_new_server():
    request_dict = request.get_json()
    name = request_dict['name'].lower()
    version = request_dict['version']
    software = request_dict['software']
    if not re.fullmatch(r'^[A-Za-z0-9_-]{3,20}$', name):
        return {
            'ok': 'false',
            'error': 'invalid_name',
            'message': "The server's name is invalid"
        }, 400
    if not re.fullmatch(r'^(1|26)\.\d+(\.\d+)?$', version):
        return {
            'ok': 'false',
            'error': 'invalid_version',
            'message': 'The passed version is invalid'
        }, 400
    if not software in ['vanilla', 'paper', 'spigot', 'forge', 'neoforge', 'fabric']:
        return {
            'ok': 'false',
            'error': 'invalid_software',
            'message': 'The passed software is invalid'
        }, 400

    if software == 'vanilla':
        result = vanilla.create_server(name, version)
        if len(result) == 40:
            util.create_conf_file(name, version, software='vanilla', sha=result, build_id=0)
            return {
                'ok': 'true',
                'message': 'created'
            }, 201
        if 'duplicated' in result.lower():
            return {
                'ok': 'false',
                'error': 'duplicated_name',
                'message': "Server's name is duplicated!"
            }, 409
        if 'version' in result.lower():
            return {
                'ok': 'false',
                'error': 'invalid_version',
                'message': 'The passed version is invalid'
            }, 400
        if 'mojang' in result.lower():
            return {
                'ok': 'false',
                'error': 'mojang_error',
                'message': 'Mojang servers are unavailable, try again later'
            }, 502
        else:
            return {
                'ok': 'false',
                'error': 'unexpected_error',
                'message': 'An unexpected error occured, try again later or contact a developer'
            }, 500

    elif software == 'paper':
        result = paper.create_server(name, version)
        if len(result[0]) == 64:
            util.create_conf_file(name, version, software='paper', sha=result[0], build_id=result[1]) # type: ignore
            return {
                'ok': 'true',
                'message': 'created'
            }, 201
        if 'duplicated' in result.lower(): # type: ignore
            return {
                'ok': 'false',
                'error': 'duplicated_name',
                'message': "Server's name is duplicated!"
            }, 409
        if 'version' in result.lower(): # type: ignore
            return {
                'ok': 'false',
                'error': 'invalid_version',
                'message': 'The passed version is invalid'
            }, 400
        if 'paper' in result.lower(): # type: ignore
            return {
                'ok': 'false',
                'error': 'paper_error',
                'message': 'Paper servers are unavailable, try again later'
            }, 502
        else:
            return {
                'ok': 'false',
                'error': 'unexpected_error',
                'message': 'An unexpected error occured, try again later or contact a developer'
            }, 500

    elif software == 'spigot':
        pass
    elif software == 'forge':
        pass
    elif software == 'neoforge':
        pass
    elif software == 'fabric':
        pass

    return {
        'ok': 'false',
        'error': 'invalid_software',
        'message': 'The passed software is invalid'
    }, 400

@app.route('/api/servers/delete', methods=['POST'])
def api_delete_server():
    server_name = str(request.get_json()['serverName'])
    try:
        util.delete_server(server_name)
    except Exception as e:
        print(e)
        return '', 500
    return '', 200

@app.route('/server/<server_name>')
def server(server_name):
    server = get_server_by_name(server_name)
    if not server:
        return render_template('404.html'), 404
    return render_template('server.html', server=server, server_name=server_name)

def emitir_a_clientes(evento, data):
    with clients_lock:
        clientes = list(connected_clients)
    for sid in clientes:
        socketio.emit(evento, data, to=sid, namespace='/')


def emitir_estado_servidor():
    en_ejecucion = process is not None and process.poll() is None
    emitir_a_clientes('server_status', {'running': en_ejecucion})


@socketio.on('connect')
def handle_connect():
    with clients_lock:
        connected_clients.add(request.sid) # type: ignore
    socketio.emit(
        'server_status',
        {'running': process is not None and process.poll() is None},
        to=request.sid, # type: ignore
        namespace='/'
    )

@socketio.on('disconnect')
def handle_disconnect():
    with clients_lock:
        connected_clients.discard(request.sid) # type: ignore

@socketio.on('start_server')
def handle_start(data):
    global process, monitor
    if process is None or process.poll() is not None:
        jar_path = Path(__file__).resolve().parent / 'servers' / ('server.' + data['serverName']) / 'server.jar'
        try:
            assert(jar_path.exists())
        except AssertionError:
            return

        emitir_a_clientes('console_output', {'data': f'[Dashboard] Iniciando {jar_path.name}...\n'})
        
        # Ejecutar Java con pipes y un flujo de buffer inmediato
        process = subprocess.Popen(
            ['java', '-Xmx2G', '-jar', str(jar_path), 'nogui'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=jar_path.parent,
            encoding='utf-8',
            errors='replace'
        )
        monitor = psutil.Process(process.pid)
        emitir_estado_servidor()
        
        # Usar la función propia de SocketIO para tareas en segundo plano
        socketio.start_background_task(target=leer_consola)
        socketio.start_background_task(target=transmitir_metricas)
    else:
        emitir_a_clientes('console_output', {'data': '[Dashboard] El servidor ya estaba en ejecución.\n'})
        emitir_estado_servidor()

@socketio.on('stop_server')
def stop_server():
    global process, monitor

    if process is None or process.poll() is not None:
        emitir_a_clientes('console_output', {'data': '[Dashboard] No hay servidor en ejecución.\n'})
        emitir_estado_servidor()
        return

    emitir_a_clientes('console_output', {'data': '[Dashboard] Deteniendo servidor...\n'})

    try:
        # 1) Apagado limpio para Minecraft/Paper
        if process.stdin is not None:
            process.stdin.write("stop\n")
            process.stdin.flush()

        process.wait(timeout=15)
    except subprocess.TimeoutExpired:
        # 2) Si no cierra, terminar forzado
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
    finally:
        monitor = None
        process = None
        emitir_estado_servidor()
        emitir_a_clientes('server_stopped', {})    

@socketio.on('send_command')
def handle_command(data):
    global process
    comando = data.get('command', '')
    if process and process.poll() is None:
        try:
            if process.stdin is None:
                return
            process.stdin.write(f"{comando}\n")
            process.stdin.flush()
        except (BrokenPipeError, OSError) as e:
            print(f"Error enviando comando: {e}")
            emitir_a_clientes('console_output', {'data': f"[Error enviando comando: {e}]\n"})

if __name__ == '__main__':
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        Thread(target=util.open_browser).start()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False)