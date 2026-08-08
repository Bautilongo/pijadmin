import shutil
import os
import subprocess

import util

def check_java():
    """Checks if a comatible java version is installed and available in the system PATH."""
    # Check if Java is installed and get its path
    java_path = shutil.which('java')


    if not java_path:
            return {'installed': False, 'path': None, 'version': None}

    # Execute java -version and capture the output
    else:
        try:
            resultado = subprocess.run(
                [java_path, '-version'],
                capture_output=True,
                text=True,
                check=True,
            )
            # Java prints the information in stderr
            salida = resultado.stderr
            # We use a regex to extract the version number from the output
            # E.g. "21.0.2"
            coincidencia = re.search(r'version "([^"]+)"', salida)
            version_texto = (
                coincidencia.group(1) if coincidencia else 'Desconocida'
            )
            return {
                'installed': True,
                'path': java_path,
                'version': version_texto,
                'output': salida.splitlines()[0],  # First line
            }

        except (subprocess.CalledProcessError, FileNotFoundError):
            return {
                'installed': True,
                'path': java_path,
                'version': 'Error while trying to get java version',
                'output': 'Error while trying to get java version',
            }

def install_java(version: str):
    """Installs a compatible Java version if not found."""
    if os.name == 'nt':  # Windows
        # For Windows, we install adoptium jdk
        URL = lambda v: f'https://api.adoptium.net/v3/installer/latest/{v}/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk'
        dir = util.get_base_dir() / f'adoptium_installer_java{version}.msi'
        util.download(URL(version), dir)
        util.check_sha256(dir, '')
        print(f'Installing JDK {version} from {str(dir.resolve())}')

        ps_script = f'Start-Process msiexec.exe -ArgumentList "/i `"{str(dir.resolve())}`" /qn /norestart ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJarFileRunWith" -Verb RunAs -Wait'
        cmd = ['powershell.exe', '-Command', ps_script]
        try:
            result = subprocess.run(cmd, check=True)
            dir.unlink()
            print(f'Java {version} installed successfully.')
            return True
        except subprocess.CalledProcessError as e:
            print(f'Error installing Java: {e}')
            return False
        except FileNotFoundError as e:
            print(f'Error: {e}')
            return False

def ensure_java(minecraft_version: str):
    """Ensures that a compatible Java version is installed for the given Minecraft version."""
    result = check_java()


install_java('17')