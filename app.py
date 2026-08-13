import engineio.async_drivers.threading

from flask import Flask, render_template, request, url_for, redirect
from flask_socketio import SocketIO, join_room, leave_room
import subprocess
import psutil
from pathlib import Path
from threading import Lock, Thread
from configparser import ConfigParser
import re
import os
import sys
import asyncio

from util import util
from util import paper
from util import vanilla
from util import java

config = ConfigParser()

BASE_DIR = util.get_base_dir()
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

# process is a dict that contains all servers in execution as 'server_name': subprocess
process: dict[str, subprocess.Popen | None] = {}
monitor: dict[str, psutil.Process | None] = {}
# status is a dict that contains status of all servers in execution stored with their PID
# 0 or not being in the dict means the server is off, 0.5 means it is starting, 1 means it is ready
status: dict[str, int | float] = {}
connected_clients = set()
clients_lock = Lock()


def stream_server_logs(server_name, process_obj):
    """Background thread to read Java logs without blocking Socket.IO."""
    try:
        for line in iter(process_obj.stdout.readline, ''):
            match = re.search(r'Done \((\d+(?:\.\d+)?)s\)!', line)
            if match:
                server_ready(server_name, process_obj, match.group(1))
            if not line:
                break

            socketio.emit(
                'console_output',
                {
                    'serverName': server_name,
                    'line': line
                },
                to=server_name
            )

    finally:
        process_obj.stdout.close()

def server_ready(server_name, process_obj, time):
    status[process_obj.pid] = 1
    clients_emit('server_ready', {'time': time}, server_name)

def transmitir_metricas(server_name, process_obj):
    """Hilo de fondo para medir uso de RAM y CPU."""
    server_monitor = monitor.get(server_name)
    assert(server_monitor)

    while process_obj and process_obj.poll() is None:
        try:
            if monitor is None:
                break
            ram = round(server_monitor.memory_info().rss / (1024 * 1024), 1)
            cpu = server_monitor.cpu_percent(interval=None)
            clients_emit('system_metrics', {'ram': ram, 'cpu': cpu}, server_name)
        except Exception:
            break
        socketio.sleep(2)

def search_servers():
    servers = []
    for item in SERVERS_DIR.iterdir():
        if not item.is_dir():
            continue
        if not item.stem == 'server':
            continue
        servers.append(item)
    return servers if servers else None

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
    server = util.get_server_by_name(server_name)
    if not server:
        return render_template('404.html'), 404
    return render_template('server.html', server=server, server_name=server_name)

@app.route('/settings')
def settings():
    return render_template('settings.html')

def clients_emit(evento, data, server_name):
        socketio.emit(evento, data, to=server_name)

def emitir_estado_servidor(server_name, process_obj):
    status_ = None
    if process_obj is not None and process_obj.poll() is None:
        status_ = status.get(process_obj.pid)
    if status_ is None: status_ = 0
    clients_emit('server_status', {'status': status_}, server_name)

@socketio.on('join_server_room')
def handle_join_room(data):
    server_name = data.get('serverName')
    if not server_name:
        return
    
    join_room(server_name)
    print(f'Cliente {request.sid} se unió a la sala del servidor: {server_name}') # type: ignore

    emitir_estado_servidor(server_name, process.get(server_name))

@socketio.on('connect')
def handle_connect():
    with clients_lock:
        connected_clients.add(request.sid) # type: ignore

@socketio.on('disconnect')
def handle_disconnect():
    with clients_lock:
        connected_clients.discard(request.sid) # type: ignore

@socketio.on('start_server')
def handle_start(data):
    server_name = data['serverName']
    server = util.get_server_by_name(server_name)
    try:
        process[server_name]
    except KeyError:
        process[server_name] = None

    server_process = process[server_name]
    if server_process is None or server_process.poll() is not None: # type: ignore
        server_path = SERVERS_DIR / ('server.' + server_name)
        jar_path = server_path / 'server.jar'

        try:
            assert(jar_path.exists())
        except AssertionError as e:
            return {'status': 'error', 'message': str(e)}

        clients_emit('console_output', {'data': f'[Dashboard] Iniciando {jar_path.name}...\n'}, server_name)

        java_ = java.get_java(server_name)
        if java_ == False:
            pass
        if java_[1] is None:
            return {'status': 'installation_needed', 'message': f'java SDK v{java_[0]} needs to be installed', 'java_version': java_[0]}  # pedir confirmación de instalación
        if java_[1] is not None:
            if not java_[1].exists():
                return {'status': 'error', 'message': f'Java path {java_[1]} does not exist'}
        return confirm_start(server_name, str(java_[1]))
    else:
        clients_emit('console_output', {'data': '[Dashboard] El servidor ya estaba en ejecución.\n'}, server_name)
        return {'status': 'error', 'message': 'server was already in execution'}

@socketio.on('install_java')
def install_java(data):
    server_name = data['serverName']
    java_version = data['javaVersion']
    try:
        java_path = java.install_java(java_version, server_name)
        if java_path is None:
            return {'status': 'error', 'message': f'Java installation failed'}
        return confirm_start(server_name, str(java_path))
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

@socketio.on('confirm_start')
def confirm_start(server_name, java_path):
    global process, monitor
    jar_path = SERVERS_DIR / ('server.' + server_name) / 'server.jar'
    # Ejecutar Java con pipes y un flujo de buffer inmediato
    proc = subprocess.Popen(
        [java_path, '-Xmx2G', '-jar', str(jar_path), 'nogui'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=jar_path.parent,
        encoding='utf-8',
        errors='replace'
    )
    process[server_name] = proc
    monitor = {server_name: psutil.Process(proc.pid)}
    emitir_estado_servidor(server_name, proc)
    
    # Usar la función propia de SocketIO para tareas en segundo plano
    socketio.start_background_task(stream_server_logs, server_name, proc)
    socketio.start_background_task(transmitir_metricas, server_name, proc)

    return {'status': 'ok'}

@socketio.on('stop_server')
def stop_server(data):
    global process, monitor
    server_name = data['serverName']
    if not server_name:
        return {'status': 'error', 'message': 'no server name'}
    try:
        process[server_name]
    except KeyError:
        process[server_name] = None

    server_process = process[server_name]
    if server_process is None or server_process.poll() is not None: # type: ignore
        clients_emit('console_output', {'data': '[Dashboard] No hay servidor en ejecución.\n'}, server_name)
        emitir_estado_servidor(server_name, server_process)
        return

    clients_emit('console_output', {'data': '[Dashboard] Deteniendo servidor...\n'}, server_name)
    assert(isinstance(server_process, subprocess.Popen))

    try:
        # 1) Apagado limpio para Minecraft/Paper
        if server_process.stdin is not None:
            server_process.stdin.write("stop\n")
            server_process.stdin.flush()

        server_process.wait(timeout=15)
    except subprocess.TimeoutExpired:
        # 2) Si no cierra, terminar forzado
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
            server_process.wait()
    finally:
        monitor[server_name] = None
        process[server_name] = None
        emitir_estado_servidor(server_name, server_process)
        clients_emit('server_stopped', {}, server_name)

@socketio.on('send_command')
def handle_command(data):
    comando = data.get('command', '')
    server_name = data.get('serverName')
    if not server_name:
        return {'status': 'error', 'message': 'no server name'}
    server_process = process[server_name]

    try:
        assert(server_process)
    except AssertionError:
        return {'status': 'error', 'message': f'server {server_name} does not exist or is not running'}

    if process and server_process.poll() is None:
        try:
            if server_process.stdin is None:
                return
            server_process.stdin.write(f"{comando}\n")
            server_process.stdin.flush()
        except (BrokenPipeError, OSError) as e:
            print(f"Error enviando comando: {e}")
            clients_emit('console_output', {'data': f"[Error enviando comando: {e}]\n"}, server_name)

if __name__ == '__main__':
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        Thread(target=util.open_browser).start()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True)