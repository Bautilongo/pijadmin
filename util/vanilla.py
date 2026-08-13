import subprocess
from pathlib import Path
import hashlib
import json
import re
import requests
import sys

from util import util

BASE_DIR = util.get_base_dir()
SERVERS_DIR = BASE_DIR / 'servers'
jar_path = SERVERS_DIR / 'server.jar'

def ask_for_version():
    while(True):
        version = input('Input a valid Minecraft version: ').strip()
        if not re.fullmatch(r'^(1|26)\.\d+(\.\d+)?$', version):
            continue
        return version

def check_sha1(path: Path, expected: str) -> bool:
    with path.open('rb') as f:
        digest = hashlib.file_digest(f, 'sha1')
    return digest.hexdigest().lower() == expected.lower()

def get_version(v:str, *, download:bool=False):
    url = f'https://launchermeta.mojang.com/mc/game/version_manifest.json'
    r = requests.get(url).json()['versions']

    new_url = None
    for version in r:
        if version['id'] == v:
            new_url = version['url']
            break

    if not new_url:
        raise Exception('invalid version')
    r = requests.get(new_url)
    if not r.ok:
        if r.status_code == 502 or r.status_code == 500:
            raise Exception('Mojang servers unavailable')
        if r.status_code == 400 or r.status_code == 404:
            raise Exception('invalid version')
        else:
            raise Exception(f'Mojang servers responded with {r.status_code}')

    r_json = r.json()
    download_url = [r_json['downloads']['server']['url'], r_json['downloads']['server']['sha1']]

    if not download:
        return r
    return download_url
    
def create_server(name:str, version:str):
    try:
        target = SERVERS_DIR / ('server.' + name) / 'server.jar'
        try:
            target.parent.mkdir(parents=True)
        except FileExistsError:
            return 'Duplicated server name!'
        r = get_version(version, download=True)
        util.download(r[0], target) # type: ignore
        if not check_sha1(target, r[1]): # type: ignore
            raise Exception('The downloaded server executable is invalid, corrupt or was modified, please try again')
    except Exception as e:
        target.unlink(missing_ok=True)
        if target.parent.is_dir():
            target.parent.rmdir()
        print('error inesperado:', e)
        return str(e)
    return r[1] # type: ignore