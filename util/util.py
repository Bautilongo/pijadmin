from configparser import ConfigParser
from pathlib import Path

import os
import shutil
import stat
import socket
import time
import webbrowser
import sys
import requests
import hashlib
import pathlib

def get_base_dir() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).resolve().parent
    else: return Path(__file__).resolve().parent.parent

SERVERS_DIR = get_base_dir() / 'servers'
config = ConfigParser()

def get_java_version(minecraft_version_str):
    v = tuple(int(x) for x in minecraft_version_str.split('.'))
    if v >= (1, 20 , 5):
        return 21
    elif v >= (1, 18):
        return 17
    elif v >= (1, 17):
        return 16
    else:
        return 8

def get_server_by_name(name: str):
    dir = SERVERS_DIR / ('server.' + name)
    if not dir.is_dir():
        return None
    config.read(dir / '.conf')
    software = config['server']['software']
    version = config['server']['version']
    sha = config['server']['sha']
    if software == 'vanilla':
        return {'software': software, 'version': version, 'sha': sha}
    return {'software': software, 'version': version, 'build_id': config['server']['build_id']}

def create_conf_file(name: str, version: str, software: str, sha: str, build_id: int):
    config['server'] = {
        'name': name,
        'version': version,
        'software': software,
        'sha': sha,
        'build_id': str(build_id)
    }
    config['java'] = {
        'custom_installation': '0',
        'path': '',
        'version': get_java_version(version)
    }

    with open(SERVERS_DIR / ('server.' + name) / '.conf', 'w') as f:
        f.write('# --- WARNING: DO NOT MODIFY THIS FILE UNLESS YOU KNOW WHAT YOU ARE DOING ---\n')
        config.write(f)
    with open(SERVERS_DIR / ('server.' + name) / 'eula.txt', 'w') as f:
        f.write('eula=true')

def remove_read_only(func, path, exc_info):
    os.chmod(path, stat.S_IWRITE)
    func(path)

def delete_server(name: str):
    target = SERVERS_DIR / ('server.' + name)
    if target.exists():
        shutil.rmtree(target, onexc=remove_read_only)

def open_browser(port: int = 5000, timeout: float = 15) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.25):
                webbrowser.open(f'http://localhost:{port}')
                return
        except OSError:
            time.sleep(0.1)

def download(url, path):
    headers = {
            'accept': 'application/octet-stream, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
    res = requests.get(url, headers=headers, stream=True)

    if res.status_code == 200:
        # Escribimos el archivo en modo binario ('wb')
        with open(path, 'wb') as archivo:
            for chunk in res.iter_content(chunk_size=8192):
                if chunk:  # Filtrar chunks vacíos
                    archivo.write(chunk)
        print('¡Descarga completada con éxito!')
    else:
        print(f'Error al descargar: Código HTTP {res.status_code}')

def check_sha256(path: Path, expected: str) -> bool:
    sha = hashlib.sha256()

    with path.open("rb") as f:
        for block in iter(lambda: f.read(8192), b""):
            sha.update(block)

    return sha.hexdigest().lower() == expected.lower()

def write_conf_java(server, path=None, version=None, custom_installation=False):
    conf_path = SERVERS_DIR / ("server." + server) / ".conf"
    parser = ConfigParser()

    if conf_path.exists():
        parser.read(conf_path)

    parser["java"] = {
        "custom_installation": str(int(custom_installation)),
        "path": str(path.resolve()) if path else "",
        "version": str(version) if version is not None else "",
    }

    with open(conf_path, "w", encoding="utf-8") as f:
        parser.write(f)