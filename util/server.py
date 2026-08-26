import re
from util import util, vanilla, paper
from util.err import ServerCreationError

def new_server(name, version, software):
    if not re.fullmatch(r'^[A-Za-z0-9_-]{3,20}$', name):
        raise ServerCreationError('invalid_name', 'Ther server name is invalid', 400)
    if not re.fullmatch(r'^(1|26)\.\d+(\.\d+)?$', version):
        raise ServerCreationError('invalid_version', 'The passed version is invalid', 400)
    if not software in ['vanilla', 'paper', 'spigot', 'forge', 'neoforge', 'fabric']:
        raise ServerCreationError('invalid_software', 'The passed software is invalid', 400)

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
        try:
            result = paper.create_server(name, version)
        except Exception as e:
            pass
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