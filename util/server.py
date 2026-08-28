import re
import shutil
import tempfile
import configparser
from util import util, vanilla, paper
from util.err import ServerCreationError
from pathlib import Path

SERVERS_DIR = util.get_base_dir() / 'servers'

def create_server(name:str, version:str, software:str):
    server = SERVERS_DIR / f'server.{name}'
    if server.exists():
        raise ServerCreationError('duplicated_name', "Server's name is duplicated!", 409)
    target = server / 'server.jar'
    try:
        target.parent.mkdir(parents=True)
        if software == 'p': # for paper servers...
            r = paper.get_lastest_build(version, download=True)
            check_checksum = util.check_sha256
        elif software == 'v': # for vanilla servers...
            r = vanilla.get_version(version, download=True)
            check_checksum = util.check_sha1

        util.download(r[0], target) # type: ignore

        if not check_checksum(target, r[1]): # type: ignore
            raise ServerCreationError('checksum_mismatch', 'The downloaded server executable is invalid, corrupt or was modified, please try again', 502)
    except Exception as e:
        target.unlink(missing_ok=True)
        if target.parent.exists():
            target.parent.rmdir()
        print('error inesperado:', e)
        return str(e)
    return [r[1], int(r[2])] if software == 'p' else [r[1]]

def new_server(name, version, software):
    if not re.fullmatch(r'^[A-Za-z0-9_-]{3,20}$', name):
        raise ServerCreationError('invalid_name', 'Ther server name is invalid', 400)
    if not re.fullmatch(r'^(1|26)\.\d+(\.\d+)?$', version):
        raise ServerCreationError('invalid_version', 'The passed version is invalid', 400)
    if not software in ['vanilla', 'paper', 'spigot', 'forge', 'neoforge', 'fabric']:
        raise ServerCreationError('invalid_software', 'The passed software is invalid', 400)

    if software == 'vanilla':
        result = create_server(name, version, 'v')
        if len(result) == 40:
            util.create_conf_file(name, version, software='vanilla', sha=result, build_id=0)
            return 1
        if 'duplicated' in result.lower():
            raise ServerCreationError('duplicated_name', "Server's name is duplicated!", 409)
        if 'version' in result.lower():
            raise ServerCreationError('invalid_version', 'The passed version is invalid', 400)
        if 'mojang' in result.lower():
            raise ServerCreationError('mojang_error', 'Mojang servers are unavailable, try again later', 502)
        else:
            raise ServerCreationError('unexpected_error', 'An unexpected error occured, try again later or contact a developer', 500)

    elif software == 'paper':
        try:
            result = create_server(name, version, 'p')
        except Exception as e:
            raise ServerCreationError('paper_error', 'Paper servers are unavailable, try again later', 502)
        if len(result[0]) == 64:
            util.create_conf_file(name, version, software='paper', sha=result[0], build_id=result[1]) # type: ignore
            return 1
        if 'duplicated' in result.lower(): # type: ignore
            raise ServerCreationError('duplicated_name', "Server's name is duplicated!", 409)
        if 'version' in result.lower(): # type: ignore
            raise ServerCreationError('invalid_version', 'The passed version is invalid', 400)
        if 'paper' in result.lower(): # type: ignore
            raise ServerCreationError('paper_error', 'Paper servers are unavailable, try again later', 502)
        else:
            raise ServerCreationError('unexpected_error', 'An unexpected error occured, try again later or contact a developer', 500)

def change_server_version(server_name, new_version):
    if not re.fullmatch(r'^[A-Za-z0-9_-]{3,20}$', server_name):
        raise ServerCreationError('invalid_name', 'Ther server name is invalid', 400)
    if not re.fullmatch(r'^(1|26)\.\d+(\.\d+)?$', new_version):
        raise ServerCreationError('invalid_version', 'The passed version is invalid', 400)
    server_dir = util.get_base_dir() / 'servers' / f'server.{server_name}'
    with open(server_dir / '.conf', 'r'):
        config = configparser.ConfigParser()
        config.read(server_dir / '.conf')
        software = config['server']['software']
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            snapshot = server_dir.with_suffix('.snapshot')
            shutil.copytree(server_dir, snapshot)

            if software == 'vanilla':
                r = vanilla.get_version(new_version, download=True)
                check_checksum = util.check_sha1
            elif software == 'paper':
                r = paper.get_lastest_build(new_version, download=True)
                check_checksum = util.check_sha256
            util.download(r[0], server_dir / 'server.jar') # type: ignore
            if not check_checksum(server_dir / 'server.jar', r[1]): # type: ignore
                raise ServerCreationError('checksum_mismatch', 'The downloaded server executable is invalid, corrupt or was modified, please try again', 502)
            with open(server_dir / '.conf', 'w') as f:
                config['server']['version'] = new_version
                if software == 'paper':
                    config['server']['sha'] = r[1] # type: ignore
                    config['server']['build_id'] = str(r[2]) # type: ignore
                f.write('\n')
                config.write(f)        
        except Exception:
            shutil.rmtree(server_dir)
            shutil.copytree(snapshot, server_dir)
            raise

def change_server_software(server_name, new_software):
    if not re.fullmatch(r'^[A-Za-z0-9_-]{3,20}$', server_name):
        raise ServerCreationError('invalid_name', 'Ther server name is invalid', 400)
    if not new_software in ['vanilla', 'paper']:
        raise ServerCreationError('invalid_software', 'The passed software is invalid', 400)
    server_dir = util.get_base_dir() / 'servers' / f'server.{server_name}'
    with open(server_dir / '.conf', 'r'):
        config = configparser.ConfigParser()
        config.read(server_dir / '.conf')
        version = config['server']['version']
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            snapshot = server_dir.with_suffix('.snapshot')
            shutil.copytree(server_dir, snapshot)

            if new_software == 'vanilla':
                r = vanilla.get_version(version, download=True)
                check_checksum = util.check_sha1
            elif new_software == 'paper':
                r = paper.get_lastest_build(version, download=True)
                check_checksum = util.check_sha256
            util.download(r[0], server_dir / 'server.jar') # type: ignore
            if not check_checksum(server_dir / 'server.jar', r[1]): # type: ignore
                raise ServerCreationError('checksum_mismatch', 'The downloaded server executable is invalid, corrupt or was modified, please try again', 502)
            with open(server_dir / '.conf', 'w') as f:
                config['server']['version'] = version
                if new_software == 'paper':
                    config['server']['sha'] = r[1] # type: ignore
                    config['server']['build_id'] = str(r[2]) # type: ignore
                f.write('\n')
                config.write(f)
        except Exception:
            shutil.rmtree(server_dir)
            shutil.copytree(snapshot, server_dir)
            raise