from configparser import ConfigParser
from pathlib import Path

SERVERS_DIR = Path(__file__).resolve().parent.parent / 'servers'
config = ConfigParser()

def create_conf_file(name: str, version: str):
    config['server'] = {
        'name': name,
        'version': version
    }

    with open(SERVERS_DIR / ('server.' + name) / '.conf', 'w') as f:
        f.write('# --- WARNING: DO NOT MODIFY THIS FILE UNLESS YOU KNOW WHAT YOU ARE DOING ---\n')
        config.write(f)