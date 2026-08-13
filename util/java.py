import os
import subprocess
import requests
import sys
import pathlib
import winreg
from pathlib import Path
import configparser

from util import util

config = configparser.ConfigParser()

SERVERS_DIR = util.get_base_dir() / 'servers'

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

def check_java_regedit(version: int) -> pathlib.Path | False:
    """Searchs for Adoptium JDK paths in Windows registry and returns its path"""
    reg_path = f'SOFTWARE\\Eclipse Adoptium\\JDK'

    try:
        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            reg_path,
            0,
            winreg.KEY_READ | winreg.KEY_WOW64_64KEY
        )
        i = 0
        while True:
            try:
                subkey = winreg.EnumKey(key, i)
                print(subkey)
                if subkey.startswith(f'{version}'):
                    print(f'Found JDK {subkey}')
                    msi_route = f'{reg_path}\\{subkey}\\hotspot\\MSI'
                    msi_key = winreg.OpenKey(
                        winreg.HKEY_LOCAL_MACHINE,
                        msi_route,
                        0,
                        winreg.KEY_READ | winreg.KEY_WOW64_64KEY
                    )
                    java_home, _ = winreg.QueryValueEx(msi_key, 'Path')
                    print(java_home)
                    winreg.CloseKey(msi_key)
                    java_exe = pathlib.Path(java_home) / 'bin' / 'java.exe'
                    if java_exe.exists():
                        winreg.CloseKey(key)
                        return java_exe
            except OSError as e:
                break
            i += 1
    except FileNotFoundError:
        return False
    return False

def get_java(server:str) -> tuple[int, pathlib.Path | None] | False:
    """"Returns the java version of the server in server's .conf, or writes the default one. Returns False if custom installation"""
    conf_file = SERVERS_DIR / ('server.' + server) / '.conf'
    config.read(conf_file.resolve())
    server_version = config.get('server', 'version')
    if config.get('java', 'version') != '1' and config.get('java', 'version') != '0':
        version = get_java_version(server_version)
        print(f'\n\n\n{version}\n\n\n')
        util.write_conf_java(server, None, version)
        return int(version), None # Devolvemos para pedir confirmación
    if int(config.get('java','custom_installation')):
        print(config.get('java','custom_installation'))
        return False # custom installations are not checked
    version = config.get('java', 'version')
    print(f'\n\n\n{version}\n\n\n')
    path = config.get('java', 'path')
    if not version or not path:
        print(f'\n\n\n{version}\n\n\n')
        version, path = ensure_java(server_version, install=False)
        print(f'\n\n\n{version}\n\n\n')
        util.write_conf_java(server, path, version)
        return int(version), path
    return int(version), Path(path) if path else None # assumes that java hasnt been removed, must be checked later

def install_java(version: str) -> pathlib.Path:
    """Installs a compatible Java version if not found."""
    if os.name == 'nt':  # Windows
        # For Windows, we install adoptium jdk
        URL = lambda v: f'https://api.adoptium.net/v3/assets/feature_releases/{v}/ga?architecture=x64&heap_size=normal&image_type=jdk&os=windows&page=0&page_size=10&project=jdk&sort_method=DEFAULT&sort_order=DESC&vendor=eclipse'
        dir = util.get_base_dir() / f'adoptium_installer_java{version}.msi'

        res = requests.get(URL(version))
        if res.status_code != 200:
            print(f'Error downloading Java {version} installer.')
            return False
        body = res.json()
        download_url = body[0]['binaries'][0]['installer']['link']
        sha256 = body[0]['binaries'][0]['installer']['checksum']

        util.download(download_url, dir)
        if not util.check_sha256(dir, sha256):
            print('Error downloading Java installer, please try again.')
            return False
        
        print(f'Installing JDK {version} from {str(dir.resolve())}')

        ps_script = f'Start-Process msiexec.exe -ArgumentList "/i `"{str(dir.resolve())}`" /qn /norestart ADDLOCAL=FeatureMain" -Verb RunAs -Wait'
        cmd = ['powershell.exe', '-Command', ps_script]
        try:
            subprocess.run(cmd, check=True)
            dir.unlink()
            print(f'Java {version} installed successfully.')
            return True
        except subprocess.CalledProcessError as e:
            print(f'Error installing Java: {e}')
            return False
        except FileNotFoundError as e:
            print(f'Error: {e}')
            return False

def ensure_java(minecraft_version: str = None, install=False, java_version=None) -> tuple[int, pathlib.Path] | False:
    """Ensures that a compatible Java version is installed for the given Minecraft version."""
    if not java_version:
        java_version = get_java_version(minecraft_version) # Get the required Java version for the given Minecraft version
    if sys.platform == 'win32': # Windows
        result = check_java_regedit(java_version)
        if result: return java_version, result
        elif install: return java_version, install_java(java_version)
        else:
            return result, None
    elif sys.platform.startswith('linux'): # Linux not implemented yet, but going to soon
        return
        # result = check_java_posix() 
    else:
        raise Exception(f'Unsupported OS: {os.name}') # MacOS is not supported yet