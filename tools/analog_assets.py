"""Original supersampled analog graphics; no image libraries or downloaded fonts."""
import json
import math
import struct
from pathlib import Path

from generate_assets import Canvas
from system_font import rasterize

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/bip-6/images/analog'
SCALE = 3
INK = (210, 214, 220, 255)
IVORY = (244, 246, 250, 255)
ACCENT = (255, 149, 68, 255)
ICON_COLORS = {
    'STEP': (255, 132, 113, 255), 'BATTERY': (126, 211, 165, 255),
    'WEATHER_CURRENT': (125, 189, 235, 255), 'HEART': (255, 132, 153, 255),
    'CAL': (255, 175, 99, 255)
}

class Art:
    def __init__(self, w, h, black=False):
        self.w, self.h = w, h
        self.canvas = Canvas(w*SCALE, h*SCALE, (0,0,0,255) if black else (0,0,0,0))

    def circle(self, x, y, r, color):
        x, y, r = x*SCALE, y*SCALE, r*SCALE
        for yy in range(max(0,math.floor(y-r)), min(self.h*SCALE,math.ceil(y+r)+1)):
            for xx in range(max(0,math.floor(x-r)), min(self.w*SCALE,math.ceil(x+r)+1)):
                if (xx+.5-x)**2+(yy+.5-y)**2 <= r*r:
                    self.canvas.rect(xx, yy, 1, 1, color)

    def line(self, points, width, color):
        for (x1,y1),(x2,y2) in zip(points,points[1:]):
            steps = max(1, math.ceil(math.hypot(x2-x1,y2-y1)*SCALE*2))
            for t in range(steps+1):
                self.circle(x1+(x2-x1)*t/steps,y1+(y2-y1)*t/steps,width/2,color)

    def text(self, text, x, y, size=18, color=INK, spacing=3):
        glyph = rasterize(text, size, color, SCALE, weight=600 if size>=24 else 500)
        self.canvas.paste(glyph,round(x*SCALE),round(y*SCALE))

    def finish(self):
        out = Canvas(self.w,self.h)
        src = self.canvas.data
        for y in range(self.h):
            for x in range(self.w):
                samples = [((y*SCALE+dy)*self.w*SCALE+x*SCALE+dx)*4 for dy in range(SCALE) for dx in range(SCALE)]
                alpha = sum(src[p+3] for p in samples)
                if alpha:
                    rgba = tuple(round(sum(src[p+c]*src[p+3] for p in samples)/alpha) for c in range(3)) + (round(alpha/(SCALE*SCALE)),)
                    out.rect(x,y,1,1,rgba)
        return out

    def save(self, name):
        self.finish().save(OUT/name)


def draw_hand(art, kind, transform, asleep):
    color=(143,147,146,255) if asleep else IVORY
    def stroke(points,width,ink=color):
        art.line([transform(x,y) for x,y in points],width,ink)
    if kind == 'hour':
        stroke([(0,0),(0,-20)],2.2 if asleep else 3.2)
        stroke([(0,-13),(0,-66)],3.4 if asleep else 7.2)
    else:
        stroke([(0,0),(0,-22)],1.8 if asleep else 2.5)
        stroke([(0,-18),(0,-96)],5.0 if asleep else 8.0)
        # Transparent slot, so the hour hand/dial remains visible underneath.
        stroke([(0,-23),(0,-91)],2.0 if asleep else 4.5,(0,0,0,0))


def draw_hub(art,x,y,asleep):
    art.circle(x,y,3.8 if asleep else 5.4,(143,147,146,255) if asleep else IVORY)
    art.circle(x,y,2.2 if asleep else 3.7,(0,0,0,255))
    if not asleep:
        art.circle(x,y,1.8,ACCENT)


def hand_preview(art, kind, angle, asleep):
    layer=Art(390,450)
    a=math.radians(angle)
    draw_hand(layer,kind,lambda x,y:(195+x*math.cos(a)-y*math.sin(a),225+x*math.sin(a)+y*math.cos(a)),asleep)
    art.canvas.paste(layer.canvas,0,0)


def make_weather_icon(name):
    icon=Art(28,24)
    cloud=(200,214,227,255)
    blue=(118,189,241,255)
    gold=(255,194,80,255)
    def sun(x=14,y=11,r=4):
        icon.circle(x,y,r,gold)
        for i in range(8):
            a=i*math.pi/4
            icon.line([(x+(r+2)*math.cos(a),y+(r+2)*math.sin(a)),(x+(r+4)*math.cos(a),y+(r+4)*math.sin(a))],1.3,gold)
    def moon():
        icon.circle(15,9,7,(217,225,248,255))
        icon.circle(18,6,6.6,(0,0,0,0))
    def clouds():
        icon.circle(9,12,4,cloud)
        icon.circle(15,9,5.5,cloud)
        icon.circle(21,12,3.5,cloud)
        icon.line([(8,14),(22,14)],4,cloud)
    if name == 'sun': sun()
    elif name == 'moon': moon()
    else:
        if name == 'partly-cloudy': sun(9,7,3)
        if name in ('moon-cloud','moon-rain'): moon()
        if name == 'dust':
            for x,y,w in [(4,7,16),(8,12,16),(3,17,17)]:
                icon.line([(x,y),(x+w,y)],1.5,(201,178,139,255))
        elif name == 'unknown':
            # Neutral unavailable mark; never a fabricated sunny condition.
            icon.line([(5,12),(9,12)],1.8,cloud)
            icon.line([(18,12),(22,12)],1.8,cloud)
        else:
            clouds()
            if name in ('rain','moon-rain','sleet'):
                for x in (9,16,23): icon.line([(x,18),(x-2,22)],1.5,blue)
            if name in ('snow','sleet'):
                for x in (8,19):
                    icon.line([(x-2,20),(x+2,20)],1.2,cloud)
                    icon.line([(x,18),(x,22)],1.2,cloud)
            if name == 'hail':
                for x in (8,15,22): icon.circle(x,20,1.4,blue)
            if name == 'storm':
                icon.line([(16,15),(12,19),(17,19),(13,23)],1.8,gold)
            if name == 'fog':
                for y in (19,23): icon.line([(5,y),(23,y)],1.2,cloud)
    return icon


def make_icon(name):
    icon = Art(18,16)
    color = ICON_COLORS[name]
    if name == 'STEP':
        icon.line([(6,2),(4,4),(4,7)],2.5,color)
        icon.line([(13,7),(11,9),(11,12)],2.5,color)
        icon.circle(5,10,1.1,color)
        icon.circle(12,15,1.1,color)
    elif name == 'BATTERY':
        icon.line([(2,4),(14,4),(14,12),(2,12),(2,4)],1.4,color)
        icon.line([(16,6),(16,10)],1.4,color)
        # Static outline identifies battery; the native percentage supplies status.
    elif name == 'WEATHER_CURRENT':
        icon.line([(8,10),(8,3),(9,2),(10,3),(10,10)],1.4,color)
        icon.circle(9,11,2.8,color)
    elif name == 'HEART':
        icon.line([(9,13),(2,6),(2,3),(5,2),(9,5),(13,2),(16,3),(16,6),(9,13)],1.5,color)
    else:
        icon.line([(9,1),(5,7),(5,11),(9,14),(13,11),(13,7),(9,10),(9,1)],1.5,color)
    return icon


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    previews = {}
    for style in ('awake','sleep'):
        asleep = style == 'sleep'
        dial = Art(270,270)
        preview = Art(390,450,black=True)
        for i in range(12):
            angle=i*math.pi/6
            radius=(2.5 if i%3==0 else 1.6) if asleep else (3.2 if i%3==0 else 2.0)
            color=(87,90,88,255) if asleep else ((210,214,220,255) if i%3==0 else (109,115,125,255))
            x,y=135+117*math.sin(angle),135-117*math.cos(angle)
            dial.circle(x,y,radius,color)
            preview.circle(x+60,y+90,radius,color)
        dial.save(f'dial-{style}.png')
        hour=Art(13,81)
        draw_hand(hour,'hour',lambda x,y:(x+6,y+72),asleep)
        hour.save(f'hour-{style}.png')
        minute=Art(13,111)
        draw_hand(minute,'minute',lambda x,y:(x+6,y+102),asleep)
        minute.save(f'minute-{style}.png')
        hub=Art(14,14)
        draw_hub(hub,7,7,asleep)
        hub.save(f'hub-{style}.png')
        hand_preview(preview,'hour',304.5,asleep)
        hand_preview(preview,'minute',54,asleep)
        draw_hub(preview,195,225,asleep)
        if not asleep:
            preview.text('AUG',52,49,13,color=ACCENT)
            preview.text('14',52,73,32)
            for name,x,y in [('STEP',52,351),('BATTERY',322,351)]:
                preview.canvas.paste(make_icon(name).canvas,x*SCALE,y*SCALE)
            preview.canvas.paste(make_weather_icon('partly-cloudy').canvas,312*SCALE,51*SCALE)
            preview.text('8670',52,378,24)
            preview.text('75%',283,378,24)
            preview.text('22°C',272,78,24)
        previews[style]=preview.finish()
        previews[style].save(ROOT/'artifacts'/f'preview-{style}.png')
    background=Art(390,450,black=True)
    background.save('background.png')
    for name in ['STEP','BATTERY','WEATHER_CURRENT','HEART','CAL']:
        make_icon(name).save(f'icons/{name}.png')
    weather_names=['sun','moon','partly-cloudy','cloud','rain','snow','storm','sleet',
                   'hail','fog','dust','unknown','moon-cloud','moon-rain']
    for name in weather_names:
        make_weather_icon(name).save(f'weather/{name}.png')
    weather_sheet=Canvas(7*72,2*64,(0,0,0,255))
    for i,name in enumerate(weather_names):
        weather_sheet.paste(make_weather_icon(name).finish(),i%7*72+22,i//7*64+20)
    weather_sheet.save(ROOT/'artifacts/weather-icons.png')
    for style,size,w,h in [('metric',24,18,30),('date',32,26,38)]:
        for i in range(10):
            glyph=Art(w,h)
            rendered=rasterize(str(i),size,INK,SCALE,weight=600)
            if rendered.w>w*SCALE or rendered.h>h*SCALE:
                raise ValueError(f'Font glyph {i} exceeds {style} cell')
            glyph.canvas.paste(rendered,(w*SCALE-rendered.w)//2,0)
            glyph.save(f'{style}/{i}.png')
    for i,month in enumerate(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],1):
        text=Art(54,20)
        text.text(month,0,0,13,color=ACCENT)
        text.save(f'month/{i}.png')
    for name,text,w in [('minus','-',10),('celsius','°C',32),('fahrenheit','°F',32),('percent','%',28)]:
        glyph=Art(w,30)
        if name == 'minus':
            glyph.line([(1,12),(7,12)],1.7,INK)
        else:
            rendered=rasterize(text,24,INK,SCALE,weight=600)
            if rendered.w>w*SCALE or rendered.h>30*SCALE:
                raise ValueError(f'Unit {name} exceeds its cell')
            glyph.canvas.paste(rendered,0,0)
        glyph.save(f'{name}.png')
    previews['awake'].save(ROOT/'artifacts/preview.png')
    combined=Canvas(820,500,(10,12,12,255))
    combined.paste(previews['awake'],10,25)
    combined.paste(previews['sleep'],420,25)
    combined.save(ROOT/'artifacts/preview-comparison.png')
    small=Canvas(266,307,(0,0,0,255))
    source=previews['awake']
    for y in range(307):
        for x in range(266):
            p=((y*450//307)*390+x*390//266)*4
            small.rect(x,y,1,1,source.data[p:p+4])
    small.save(ROOT/'assets/bip-6/images/preview.png')
    manifest={str(p.relative_to(ROOT/'assets/bip-6/images')).replace('\\','/'):list(struct.unpack('!2I',p.read_bytes()[16:24])) for p in sorted(OUT.rglob('*.png'))}
    (ROOT/'artifacts/analog-assets.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(f'Generated {len(manifest)} analog assets and awake/AOD previews.')


if __name__ == '__main__':
    main()
