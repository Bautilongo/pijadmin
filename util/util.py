from configparser import ConfigParser
from pathlib import Path

import os
import shutil
import stat
import time
import webbrowser
import sys

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).resolve().parent
    else: return Path(__file__).resolve().parent.parent

SERVERS_DIR = get_base_dir() / 'servers'
config = ConfigParser()

def create_conf_file(name: str, version: str, software: str, sha: str, build_id: int):
    config['server'] = {
        'name': name,
        'version': version,
        'software': software,
        'sha': sha,
        'build_id': str(build_id)
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

def open_browser():
    time.sleep(1.5)
    webbrowser.open('http://localhost:5000')