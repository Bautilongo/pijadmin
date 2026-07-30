import subprocess
from pathlib import Path
import hashlib
import json
import re
import requests

UTIL_DIR = Path(__file__).resolve().parent
BASE_DIR = UTIL_DIR.parent
SERVERS_DIR = BASE_DIR / 'servers'
jar_path = SERVERS_DIR / 'server.jar'

# def ensure():
#     data = {}
#     with open(UTIL_DIR / 'conf.json', 'a+', encoding='utf-8') as f:
#         f.seek(0)
#         if f.read().strip():
#             f.seek(0)
#             data = json.load(f)

#     # Si no hay una version en el .json...
#     if not data:
#         version = ask_for_version()
#         download(get_lastest_build(version, download=True), jar_path)
#         with open(UTIL_DIR / 'conf.json', 'w', encoding='utf-8') as f:
#             json.dump({'version': version}, f, indent=4)
#         return

#     version = data['version']

#     # Si no hay archivo pero sí version especificada...
#     if not jar_path.exists():
#         version = version
#         download(get_lastest_build(version, download=True), jar_path)
#         return

#     # Si el sha256 del archivo no coincide con el esperado...
#     expected_checksum = get_lastest_build(version).json()['downloads']['server:default']['checksums']['sha256']
#     if not check_sha256(jar_path, expected_checksum):
#         download(get_lastest_build(version, download=True), jar_path)
#         return

# Aceptar el eula automáticamente
def eula():
    with open(SERVERS_DIR / 'eula.txt', 'w', encoding='utf-8') as f:
        f.write('eula=true\n')

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

    print(r.json())

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

def create_server(name:str, version:str):
    try:
        target = SERVERS_DIR / ('server.' + name) / 'server.jar'
        try:
            target.parent.mkdir(parents=True)
        except FileExistsError:
            return 'Duplicated server name!'
        r = get_version(version, download=True)
        download(r[0], target) # type: ignore
        if not check_sha1(target, r[1]): # type: ignore
            raise Exception('The downloaded server executable is invalid, corrupt or was modified, please try again')
    except Exception as e:
        target.unlink(missing_ok=True)
        if target.parent.is_dir():
            target.parent.rmdir()
        print('error inesperado:', e)
        return str(e)
    return r[1] # type: ignore