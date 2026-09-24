allowed_properties = {}

def load_server_properties(filepath='server.properties'):
    props = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            clean_line = line.strip()
            if clean_line and not clean_line.startswith(('#', '!')) and '=' in clean_line:
                key, val = clean_line.split('=', 1)
                props[key.strip()] = val.strip()
    return props

def set_server_property(key, value, filepath='server.properties'):
    updated = False
    lines = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            stripped = line.strip()
            if stripped and not stripped.startswith(('#', '!')) and '=' in stripped:
                k, _ = stripped.split('=', 1)
                if k.strip() == key:
                    lines.append(f'{key}={value}\n')
                    updated = True
                    continue
            lines.append(line)
            
    if not updated:
        lines.append(f'{key}={value}\n')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

def validate_and_map(data):
    clean_props = {}

    if 'gamemode' in data:
        clean_props['gamemode'] = str(data['gamemode']).lower()

    if 'difficulty' in data:
        clean_props['difficulty'] = str(data['difficulty']).lower()

    if 'max-players' in data:
        try:
            players = int(data['max-players'])
            if 1 <= players <= 10000:
                clean_props['max-players'] = str(players)
        except (ValueError, TypeError):
            pass

    if 'whitelist' in data:
        clean_props['white-list'] = 'true' if data['whitelist'] is True else 'false'

    if 'cracked' in data:
        clean_props['online-mode'] = 'false' if data['cracked'] is True else 'true'

    if 'hardcore' in data:
        clean_props['hardcore'] = 'true' if data['hardcore'] is True else 'false'
    if 'force-gamemode' in data:
        clean_props['force-gamemode'] = 'true' if data['force-gamemode'] is True else 'false'
    return clean_props