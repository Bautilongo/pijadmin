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

def get_lastest_build(v:str, *, download:bool=False):
    url = f'https://fill.papermc.io/v3/projects/paper/versions/{v}/builds/latest'
    r = requests.get(url)

    if not r.ok:
        if r.status_code == 502 or r.status_code == 500:
            raise Exception('Paper servers unavailable')
        if r.status_code == 400 or r.status_code == 404:
            raise Exception('invalid version')
        else:
            raise Exception(f'Paper servers responded with {r.status_code}')    

    r_json = r.json()
    download_url = [r_json['downloads']['server:default']['url'], r_json['downloads']['server:default']['checksums']['sha256'], r_json['id']]
        
    if not download:
        return r
    return download_url