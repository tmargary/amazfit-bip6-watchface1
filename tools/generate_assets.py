"""Generate original RGBA PNG graphics with Python's standard library only."""
from pathlib import Path
import json
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'bip-6' / 'images'
WHITE = (232, 244, 248, 255)
CYAN = (70, 215, 210, 255)


class Canvas:
    def __init__(self, w, h, color=(0, 0, 0, 0)):
        self.w, self.h = w, h
        self.data = bytearray(bytes(color) * (w * h))

    def rect(self, x, y, w, h, color):
        for row in range(max(0, y), min(self.h, y + h)):
            left, right = max(0, x), min(self.w, x + w)
            if right > left:
                start = (row * self.w + left) * 4
                self.data[start:start + (right-left)*4] = bytes(color) * (right-left)

    def paste(self, other, x, y):
        for yy in range(other.h):
            for xx in range(other.w):
                offset = (yy * other.w + xx) * 4
                color = other.data[offset:offset+4]
                if color[3]:
                    self.rect(x+xx, y+yy, 1, 1, color)

    def save(self, path):
        def chunk(kind, data):
            return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind+data))
        raw = b''.join(b'\0' + self.data[y*self.w*4:(y+1)*self.w*4] for y in range(self.h))
        header = struct.pack('!2I5B', self.w, self.h, 8, 6, 0, 0, 0)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
        temporary = path.with_name(path.stem + '.tmp.png')
        temporary.write_bytes(payload)
        temporary.replace(path)


def digit(number, w, h, color, thin=False):
    c = Canvas(w, h)
    t = 2 if thin else max(3, w//7)
    mid = h//2
    boxes = [(t, 0, w-2*t, t), (w-t, t, t, mid-t),
             (w-t, mid, t, h-mid-t), (t, h-t, w-2*t, t),
             (0, mid, t, h-mid-t), (0, t, t, mid-t), (t, mid-t//2, w-2*t, t)]
    segments = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgecd', 'abc', 'abcdefg', 'abfgcd']
    for key in segments[number]:
        c.rect(*boxes[ord(key)-ord('a')], color)
    return c


# Original compact 5x7 bitmap alphabet, only the glyphs used by these labels.
FONT = {
    'S': ['01111','10000','10000','01110','00001','00001','11110'],
    'T': ['11111','00100','00100','00100','00100','00100','00100'],
    'E': ['11111','10000','10000','11110','10000','10000','11111'],
    'P': ['11110','10001','10001','11110','10000','10000','10000'],
    'H': ['10001','10001','10001','11111','10001','10001','10001'],
    'R': ['11110','10001','10001','11110','10100','10010','10001'],
    'A': ['01110','10001','10001','11111','10001','10001','10001'],
    'C': ['01111','10000','10000','10000','10000','10000','01111'],
    'L': ['10000','10000','10000','10000','10000','10000','11111'],
    'B': ['11110','10001','10001','11110','10001','10001','11110'],
    'Y': ['10001','10001','01010','00100','00100','00100','00100'],
    '%': ['11001','11010','00010','00100','01000','01011','10011']
}


def label(text):
    c = Canvas(len(text)*12, 14)
    for i, letter in enumerate(text):
        for y, row in enumerate(FONT[letter]):
            for x, bit in enumerate(row):
                if bit == '1':
                    c.rect(i*12+x*2, y*2, 2, 2, CYAN)
    return c


def main():
    for style, w, h, color, thin in [('time', 52, 88, WHITE, False),
                                    ('aod', 52, 88, (120,120,120,255), True),
                                    ('metric', 18, 32, WHITE, False)]:
        for i in range(10):
            digit(i, w, h, color, thin).save(OUT/style/f'{i}.png')
    for style, color in [('colon', CYAN), ('colon-aod', (120,120,120,255))]:
        c = Canvas(10, 88)
        c.rect(3, 26, 4, 4, color)
        c.rect(3, 58, 4, 4, color)
        c.save(OUT/f'{style}.png')
    bg = Canvas(390, 450, (0, 0, 0, 255))
    bg.rect(52, 66, 286, 2, CYAN)
    bg.rect(52, 207, 286, 1, (30,55,65,255))
    bg.save(OUT/'background.png')
    for name, text in [('STEP','STEPS'), ('HEART','HEART'), ('CAL','CAL'), ('BATTERY','BATTERY %')]:
        # Space is transparent rather than a font glyph.
        parts = text.split(' ')
        c = Canvas(len(text)*12, 14)
        x = 0
        for part in parts:
            c.paste(label(part), x, 0)
            x += (len(part)+1)*12
        c.save(OUT/'labels'/f'{name}.png')
    for i in range(8):
        c = Canvas(32, 20)
        for x in range(32):
            y = round(10 + 6*math.sin((x/32+i/8)*2*math.pi))
            c.rect(x, y, 1, 2, CYAN)
        c.save(OUT/'animation'/f'pulse_{i}.png')
    preview = Canvas(390, 450, (0,0,0,255))
    preview.paste(bg, 0, 0)
    for x, n in [(70,1),(128,0),(208,0),(266,9)]:
        preview.paste(digit(n,52,88,WHITE), x,104)
    colon = Canvas(10,88)
    colon.rect(3,26,4,4,CYAN)
    colon.rect(3,58,4,4,CYAN)
    preview.paste(colon,190,104)
    for x,y,name,value in [(52,246,'STEPS','8670'),(216,246,'HEART','86'),
                            (52,338,'CAL','280'),(216,338,'BATTERY','75')]:
        preview.paste(label(name),x,y-28)
        for i,n in enumerate(value):
            preview.paste(digit(int(n),18,32,WHITE),x+i*20,y)
    preview.save(ROOT/'artifacts'/'preview.png')
    small = Canvas(266,307,(0,0,0,255))
    for y in range(307):
        for x in range(266):
            offset = (min(449,y*450//307)*390 + min(389,x*390//266))*4
            small.rect(x,y,1,1,preview.data[offset:offset+4])
    small.save(OUT/'preview.png')
    manifest = {str(p.relative_to(OUT)).replace('\\','/'): list(struct.unpack('!2I',p.read_bytes()[16:24])) for p in sorted(OUT.rglob('*.png'))}
    (ROOT/'artifacts'/'assets.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(f'Generated {len(manifest)} PNG assets; preview: artifacts/preview.png')


if __name__ == '__main__':
    main()
    from analog_assets import main as analog_main
    analog_main()
