"""Original supersampled analog graphics; no image libraries or downloaded fonts."""
import json
import math
import struct
from pathlib import Path

from generate_assets import Canvas
from system_font import rasterize

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/bip-6/images/analog'
SCALE = 4
INK = (210, 214, 220, 255)
IVORY = (244, 246, 250, 255)
ACCENT = (255, 149, 68, 255)
SECOND_RED = (255, 59, 48, 255)
GLYPH_PAD = 2
ICON_COLORS = {
    'DATE': ACCENT,
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

    def text(self, text, x, y, size=18, color=INK, spacing=3, align='left'):
        glyph = rasterize(text, size, color, SCALE, weight=600 if size>=20 else 500)
        if align == 'right': x -= glyph.w/SCALE
        self.canvas.paste(glyph,round(x*SCALE),round(y*SCALE))

    def resized(self,w,h):
        scaled=Art(w,h)
        for y in range(h*SCALE):
            for x in range(w*SCALE):
                src_y=min(self.h*SCALE-1,int(y*self.h/h))
                src_x=min(self.w*SCALE-1,int(x*self.w/w))
                p=(src_y*self.w*SCALE+src_x)*4
                scaled.canvas.rect(x,y,1,1,self.canvas.data[p:p+4])
        return scaled

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
    if kind == 'second':
        stroke([(0,14),(0,-132)],2.2,SECOND_RED)
        # Small counterweight opposite the red needle.
        x,y=transform(0,13)
        art.circle(x,y,2.4,SECOND_RED)
        art.circle(x,y,1.0,(0,0,0,0))
    elif kind == 'hour':
        stroke([(0,0),(0,-20)],3.8)
        stroke([(0,-13),(0,-86)],8.4)
    else:
        stroke([(0,0),(0,-22)],3.0)
        stroke([(0,-18),(0,-126)],10.0)
        # Transparent slot, so the hour hand/dial remains visible underneath.
        stroke([(0,-23),(0,-121)],5.0,(0,0,0,0))


def draw_hub(art,x,y,asleep):
    art.circle(x,y,4.2 if asleep else 5.8,(143,147,146,255) if asleep else IVORY)
    art.circle(x,y,2.4 if asleep else 3.8,(0,0,0,255))
    if not asleep:
        art.circle(x,y,2.0,SECOND_RED)


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
    return icon.resized(30,26)


def make_icon(name, battery_percent=None):
    icon = Art(18,16)
    color = ICON_COLORS[name]
    if name == 'DATE':
        icon.line([(3,3),(15,3),(15,14),(3,14),(3,3)],1.3,color)
        icon.line([(3,6),(15,6)],1.2,color)
        icon.line([(6,1),(6,4)],1.5,color)
        icon.line([(12,1),(12,4)],1.5,color)
        for x,y in [(6,9),(11,9),(6,12),(11,12)]: icon.circle(x,y,.75,color)
    elif name == 'STEP':
        icon.line([(6,2),(4,4),(4,7)],2.5,color)
        icon.line([(13,7),(11,9),(11,12)],2.5,color)
        icon.circle(5,10,1.1,color)
        icon.circle(12,15,1.1,color)
    elif name == 'BATTERY':
        icon.line([(2,4),(14,4),(14,12),(2,12),(2,4)],1.4,color)
        icon.line([(16,6),(16,10)],1.4,color)
        if battery_percent is not None:
            # Same interior and silhouette for generated resources and previews.
            width = round(8 * SCALE * battery_percent / 100)
            icon.canvas.rect(4*SCALE,6*SCALE,width,4*SCALE,color)
    elif name == 'WEATHER_CURRENT':
        icon.line([(8,10),(8,3),(9,2),(10,3),(10,10)],1.4,color)
        icon.circle(9,11,2.8,color)
    elif name == 'HEART':
        icon.line([(9,13),(2,6),(2,3),(5,2),(9,5),(13,2),(16,3),(16,6),(9,13)],1.5,color)
    else:
        icon.line([(9,1),(5,7),(5,11),(9,14),(13,11),(13,7),(9,10),(9,1)],1.5,color)
    return icon.resized(21,19)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    previews = {}
    for style in ('awake','sleep'):
        asleep = style == 'sleep'
        dial = Art(320,320)
        preview = Art(390,450,black=True)
        for i in range(12):
            angle=i*math.pi/6
            radius=(2.8 if i%3==0 else 1.9) if asleep else (3.6 if i%3==0 else 2.3)
            color=(87,90,88,255) if asleep else ((210,214,220,255) if i%3==0 else (109,115,125,255))
            x,y=160+150*math.sin(angle),160-150*math.cos(angle)
            dial.circle(x,y,radius,color)
            preview.circle(x+35,y+65,radius,color)
        dial.save(f'dial-{style}.png')
        hour=Art(13,105)
        draw_hand(hour,'hour',lambda x,y:(x+6,y+96),asleep)
        hour.save(f'hour-{style}.png')
        minute=Art(13,141)
        draw_hand(minute,'minute',lambda x,y:(x+6,y+132),asleep)
        minute.save(f'minute-{style}.png')
        if not asleep:
            second=Art(7,158)
            draw_hand(second,'second',lambda x,y:(x+3,y+138),False)
            second.save('second-awake.png')
        hub=Art(14,14)
        draw_hub(hub,7,7,asleep)
        hub.save(f'hub-{style}.png')
        hand_preview(preview,'hour',304.5,asleep)
        hand_preview(preview,'minute',54,asleep)
        if not asleep:
            hand_preview(preview,'second',216,False)
        draw_hub(preview,195,225,asleep)
        if not asleep:
            preview.canvas.paste(make_icon('DATE').canvas,42*SCALE,34*SCALE)
            preview.text('AUG',71,38,12,color=ACCENT)
            preview.text('14',42,59,26)
            for name,x,y in [('STEP',42,378),('BATTERY',327,378)]:
                preview.canvas.paste(make_icon(name,75 if name == 'BATTERY' else None).canvas,x*SCALE,y*SCALE)
            preview.canvas.paste(make_weather_icon('partly-cloudy').canvas,318*SCALE,31*SCALE)
            preview.text('8670',42,402,22)
            preview.text('75%',348,402,22,align='right')
            preview.text('22°C',348,65,22,align='right')
        previews[style]=preview.finish()
        previews[style].save(ROOT/'artifacts'/f'preview-{style}.png')
    background=Art(390,450,black=True)
    background.save('background.png')
    # Explicit widget bounds define the tap area; the image stays invisible.
    Canvas(1,1).save(OUT/'tap.png')
    for name in ['DATE','STEP','BATTERY','WEATHER_CURRENT','HEART','CAL']:
        make_icon(name).save(f'icons/{name}.png')
    for percent in range(101):
        make_icon('BATTERY',percent).save(f'battery/{percent}.png')
    unavailable=make_icon('BATTERY')
    unavailable.line([(8,9.5),(11,9.5)],1.2,ICON_COLORS['BATTERY'])
    unavailable.save('battery/unknown.png')
    weather_names=['sun','moon','partly-cloudy','cloud','rain','snow','storm','sleet',
                   'hail','fog','dust','unknown','moon-cloud','moon-rain']
    for name in weather_names:
        make_weather_icon(name).save(f'weather/{name}.png')
    weather_sheet=Canvas(7*72,2*64,(0,0,0,255))
    for i,name in enumerate(weather_names):
        weather_sheet.paste(make_weather_icon(name).finish(),i%7*72+22,i//7*64+20)
    weather_sheet.save(ROOT/'artifacts/weather-icons.png')
    for style,size,w,h in [('metric',22,17,30),('date',26,22,36)]:
        for i in range(10):
            glyph=Art(w,h)
            rendered=rasterize(str(i),size,INK,SCALE,weight=600)
            if rendered.w>w*SCALE or rendered.h>(h-2*GLYPH_PAD)*SCALE:
                raise ValueError(f'Font glyph {i} exceeds {style} cell')
            glyph.canvas.paste(rendered,(w*SCALE-rendered.w)//2,GLYPH_PAD*SCALE)
            glyph.save(f'{style}/{i}.png')
    for i,month in enumerate(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],1):
        text=Art(48,22)
        text.text(month,0,GLYPH_PAD,12,color=ACCENT)
        text.save(f'month/{i}.png')
    for name,text,w in [('minus','-',10),('celsius','°C',29),('fahrenheit','°F',29),('percent','%',26)]:
        glyph=Art(w,30)
        if name == 'minus':
            glyph.line([(1,13),(7,13)],1.7,INK)
        else:
            rendered=rasterize(text,22,INK,SCALE,weight=600)
            if rendered.w>w*SCALE or rendered.h>(30-2*GLYPH_PAD)*SCALE:
                raise ValueError(f'Unit {name} exceeds its cell')
            glyph.canvas.paste(rendered,0,GLYPH_PAD*SCALE)
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
