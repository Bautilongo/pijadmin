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