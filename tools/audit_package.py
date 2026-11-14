"""Inspect actual Zeus ZAB/ZPK/device contents; never mistake previews for runtime tests."""
import io
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def audit(filename):
    source = json.loads((ROOT / 'app.json').read_text(encoding='utf-8'))
    errors = []
    with zipfile.ZipFile(filename) as bundle:
        packages = [n for n in bundle.namelist() if n.endswith('.zpk')]
        if not packages:
            raise ValueError('No ZPK found in ZAB')
        for name in packages:
            with zipfile.ZipFile(io.BytesIO(bundle.read(name))) as package:
                with zipfile.ZipFile(io.BytesIO(package.read('device.zip'))) as device:
                    manifest = json.loads(device.read('app.json'))
                    version = manifest['app']['version']
                    api = manifest['runtime']['apiVersion']
                    print(f'{name}: version {version["name"]}, minimum API {api["minVersion"]}')
                    if version != source['app']['version']:
                        errors.append('Stale package: version does not match app.json')
                    if api['minVersion'].split('.')[0] != '1':
                        errors.append('Legacy WatchFace/hmUI source packaged using the newer runtime path')
                    if manifest['app']['appType'] != 'watchface':
                        errors.append('Package is not a watch face')
                    entry = manifest['module']['watchface']['path']
                    entries = [entry + ext for ext in ('.js', '.bin') if entry + ext in device.namelist()]
                    if not entries:
                        errors.append('Missing compiled watch face entry')
                    elif b'WidgetFactory' not in device.read(entries[0]):
                        errors.append('Compiled entry lacks the legacy widget runtime bootstrap')
                    required = ['background.png']
                    for state in ('awake', 'sleep'):
                        required += [f'{part}-{state}.png' for part in ('dial', 'hour', 'minute', 'hub')]
                    required += [f'{style}/{i}.png' for style in ('metric','date') for i in range(10)]
                    required += [f'month/{i}.png' for i in range(1,13)]
                    required += [f'weather/{n}.png' for n in ('sun','moon','partly-cloudy','cloud','rain','snow','storm','sleet','hail','fog','dust','unknown','moon-cloud','moon-rain')]
                    required += [f'icons/{n}.png' for n in ('STEP','BATTERY','HEART','CAL')]
                    required += ['minus.png','percent.png','celsius.png','fahrenheit.png']
                    for relative in required:
                        asset = 'assets/images/analog/' + relative
                        if asset not in device.namelist() or not device.getinfo(asset).file_size:
                            errors.append(f'Missing packaged resource: {asset}')
    if errors:
        raise ValueError('\n'.join(sorted(set(errors))))
    print('PASS: current package version, legacy runtime bootstrap, entry and required device resources.')
    print('Hardware/simulator execution is still required.')


if __name__ == '__main__':
    try:
        candidates = list((ROOT / 'dist').glob('*.zab'))
        filename = Path(sys.argv[1]) if len(sys.argv) > 1 else max(candidates,key=lambda p:p.stat().st_mtime)
        print(filename)
        audit(filename)
    except (ValueError, KeyError, OSError, zipfile.BadZipFile) as error:
        print(f'FAIL: {error}')
        sys.exit(1)
