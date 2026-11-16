// Resource/composition checks; real SDK behavior still requires a watch.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const zlib = require('node:zlib')
const root = path.resolve(__dirname, '..')
const assets = path.join(root, 'assets/bip-6')
const manifest = JSON.parse(fs.readFileSync(path.join(root,'app.json')))
assert.equal(manifest.app.appType,'watchface')
// This source uses the legacy WatchFace/hmUI globals, not @zos Mini Program APIs.
// Zeus selects different code-generation paths at minVersion >= 2.0.
assert.deepEqual(manifest.runtime.apiVersion,{minVersion:'1.0.0',target:'1.0.1',compatible:'1.0.0'})
assert.equal(manifest.targets['bip-6'].module.watchface.lockscreen,1)
assert.deepEqual(manifest.targets['bip-6'].platforms.map(p=>p.deviceSource),[9765120,9765121,10158337])

function asset(src) {
  const file=path.resolve(assets,src)
  assert(file.startsWith(assets+path.sep))
  const b=fs.readFileSync(file)
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a')
  const w=b.readUInt32BE(16), h=b.readUInt32BE(20), parts=[]
  for(let p=8;p<b.length;) {
    const n=b.readUInt32BE(p)
    if(b.toString('ascii',p+4,p+8)==='IDAT') parts.push(b.subarray(p+8,p+8+n))
    p+=n+12
  }
  const pixels=zlib.inflateSync(Buffer.concat(parts))
  assert.equal(pixels.length,h*(1+w*4))
  return {w,h,pixels}
}

function bounds(x,y,size) {
  assert(x>=0 && y>=0 && x+size.w<=390 && y+size.h<=450,`Outside screen: ${x},${y}`)
}

function paddedGlyph(src) {
  const glyph=asset(src)
  for(const y of [0,1,glyph.h-2,glyph.h-1]) {
    for(let x=0;x<glyph.w;x++) {
      assert.equal(glyph.pixels[y*(1+glyph.w*4)+1+x*4+3],0,`${src} needs transparent top/bottom guard rows`)
    }
  }
  return glyph
}

const widgets=[]
const types=['IMG','TIME_POINTER','TEXT_IMG','IMG_DATE','IMG_ANIM','WIDGET_DELEGATE','IMG_CLICK','BUTTON']
const data={STEP:1,BATTERY:2,WEATHER_CURRENT:3,HEART:4,CAL:5}
let weatherSnapshot={forecastData:{count:1,data:[{index:0}]},tideData:{count:1,data:[{sunrise:{hour:6,minute:0},sunset:{hour:18,minute:0}}]}}
const sensorTime={hour:12,minute:0}
let batteryValue=75, batteryFailure=false
const batteryListeners=[]
const batterySensor={
  get current(){if(batteryFailure) throw new Error('Battery unavailable');return batteryValue},
  addEventListener(event,callback){assert.equal(event,'CHANGE');batteryListeners.push(callback)}
}
let weatherFailure=false
let failingWidget=null
const runtimeLogs=[]
const launches=[]
const calendarLauncher={startApp(options){launches.push(JSON.parse(JSON.stringify(options)))}}
const ctx=vm.createContext({
  hmApp:calendarLauncher,
  console:{log(...args){runtimeLogs.push(args)}},
  hmUI:{widget:Object.fromEntries(types.map(t=>[t,t])),
    prop:{MORE:'MORE'},
    show_level:{ONLY_NORMAL:1,ONAL_AOD:2},align:{LEFT:0,CENTER_H:1,RIGHT:2},anim_status:{START:0},
    data_type:data,createWidget(type,options) {
      assert(types.includes(type),'Undeclared widget type')
      if(type===failingWidget) throw new Error('Simulated native widget failure')
      const widget={...options,widgetType:type}
      widgets.push(widget)
      return {setProperty(prop,values){assert.equal(prop,'MORE');Object.assign(widget,values)}}
    }},
  hmSensor:{id:{WEATHER:'WEATHER',TIME:'TIME',BATTERY:'BATTERY'},event:{CHANGE:'CHANGE'},createSensor(id){
    if(id==='BATTERY') return batterySensor
    if(id==='TIME') return sensorTime
    assert.equal(id,'WEATHER')
    return {getForecastWeather(){if(weatherFailure) throw new Error('Offline');return weatherSnapshot}}
  }},
  WatchFace(face){ctx.face=face},App(){}
})
for(const file of ['app.js','watchface/config.js','watchface/graphics.js','watchface/clock.js','watchface/weather.js',
  'watchface/metrics.js','watchface/date.js','watchface/animation.js','watchface/shortcuts.js','watchface/battery.js','watchface/index.js']) {
  const source=fs.readFileSync(path.join(root,file),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'')
  new vm.Script(source,{filename:file}).runInContext(ctx)
}

for(const layout of ['minimal','airy']) {
  for(const enabled of [false,true]) {
    widgets.length=0
    vm.runInContext(`config.layout='${layout}';config.aod=${enabled};config.date=${enabled}`,ctx)
    ctx.face.build()
    assert(!widgets.some(w=>w.widgetType==='IMG_ANIM'),'Default design must stay still')
    const aod=widgets.filter(w=>w.show_level===2)
    assert.equal(aod.length,enabled?3:0)
    assert(aod.every(w=>w.widgetType==='TIME_POINTER'||/analog\/(dial|hub)-sleep\.png$/.test(w.src)))
    assert.equal(widgets.filter(w=>w.widgetType==='IMG_DATE').length,enabled?1:0)
    const metrics=widgets.filter(w=>w.widgetType==='TEXT_IMG')
    assert.deepEqual(metrics.map(w=>w.type),[data.STEP,data.BATTERY,data.WEATHER_CURRENT])
    assert(metrics.every(w=>w.text===undefined && w.show_level===1),'Only awake native data bindings')
    assert(!widgets.some(w=>w.src && w.src.includes('/labels/')),'Complications must use icons, not labels')
    const condition=widgets.find(w=>w.src && w.src.includes('/weather/'))
    assert.equal(condition.src,'images/analog/weather/partly-cloudy.png')
    assert.equal(condition.show_level,1)
    const taps=widgets.filter(w=>w.widgetType==='IMG_CLICK')
    assert.deepEqual(taps.map(w=>w.type),[data.STEP,data.BATTERY,data.WEATHER_CURRENT])
    assert(taps.every(w=>w.show_level===1 && w.src==='images/analog/tap.png'))
    const calendar=widgets.find(w=>w.widgetType==='BUTTON')
    assert.equal(!!calendar,enabled,'Date tap is present only when date is enabled')
    if(calendar) {
      assert.equal(calendar.show_level,1)
      assert.equal(calendar.text,'')
      assert.equal(calendar.normal_src,'images/analog/tap.png')
      assert.equal(calendar.press_src,'images/analog/tap.png')
      assert(calendar.w>=44 && calendar.h>=44)
      bounds(calendar.x,calendar.y,{w:calendar.w,h:calendar.h})
      const date=widgets.find(w=>w.widgetType==='IMG_DATE')
      assert(calendar.x<=date.month_startX && calendar.y<=date.month_startY)
      assert(calendar.x+calendar.w>=date.month_startX+48)
      assert(calendar.x+calendar.w>=date.day_startX+45 && calendar.y+calendar.h>=date.day_startY+36)
      for(const tap of taps) assert(calendar.x+calendar.w<=tap.x || tap.x+tap.w<=calendar.x || calendar.y+calendar.h<=tap.y || tap.y+tap.h<=calendar.y)
    }
    for(const tap of taps) {
      bounds(tap.x,tap.y,{w:tap.w,h:tap.h})
      assert(tap.w>=44 && tap.h>=44,'Native tap area should be usable')
      const metric=metrics.find(w=>w.type===tap.type)
      assert(tap.x<=metric.x && tap.y<=metric.y && tap.x+tap.w>=metric.x+metric.w && tap.y+tap.h>=metric.y+metric.h,'Tap region must cover the full reading')
    }
    for(let a=0;a<taps.length;a++) for(let b=a+1;b<taps.length;b++) {
      const x=taps[a],y=taps[b]
      assert(x.x+x.w<=y.x || y.x+y.w<=x.x || x.y+x.h<=y.y || y.y+y.h<=x.y,'Tap areas must not overlap')
    }
    const overlay=asset('images/analog/tap.png')
    assert.equal(overlay.pixels[4],0,'Shortcut image must be fully transparent')
    const weather=metrics.find(w=>w.type===data.WEATHER_CURRENT)
    assert.equal(weather.negative_image,'images/analog/minus.png')
    assert(weather.unit_en.endsWith('/celsius.png'))
    assert(weather.imperial_unit_en.endsWith('/fahrenheit.png'))
    const complications=metrics.map(w=>({x:w.x,y:w.y,w:w.w,h:w.h}))
    for(const w of widgets) {
      if(w.src && /\/(icons|weather|battery)\//.test(w.src)) complications.push({x:w.x,y:w.y,...asset(w.src)})
      if(w.widgetType==='IMG_DATE') {
        complications.push({x:w.month_startX,y:w.month_startY,...asset(w.month_en_array[0])})
        const size=asset(w.day_en_array[0])
        complications.push({x:w.day_startX,y:w.day_startY,w:size.w*2+w.day_space,h:size.h})
      }
    }
    for(const tap of taps) assert(widgets.indexOf(tap)>widgets.indexOf(metrics.find(w=>w.type===tap.type)),'Shortcuts must be above the readings')
    for(const w of widgets) {
      assert([1,2].includes(w.show_level))
      if(w.src) bounds(w.x,w.y,asset(w.src))
      for(const key of ['font_array','month_en_array','day_en_array']) {
        if(w[key]) {
          assert.equal(w[key].length,key==='month_en_array'?12:10)
          w[key].forEach(paddedGlyph)
        }
      }
      for(const key of ['unit_en','unit_sc','unit_tc','imperial_unit_en','imperial_unit_sc','imperial_unit_tc','negative_image']) {
        if(w[key]) paddedGlyph(w[key])
      }
      if(w.widgetType==='TEXT_IMG') {
        bounds(w.x,w.y,{w:w.w,h:w.h})
        assert(w.h>=asset(w.font_array[0]).h,'Widget must fit padded digit cells')
        if(w.type===data.WEATHER_CURRENT) {
          assert(w.h>=asset(w.unit_en).h && w.h>=asset(w.imperial_unit_en).h,'Temperature must fit both padded units')
          const icon=widgets.find(icon=>icon.src && icon.src.includes('/weather/'))
          assert(icon.y+asset(icon.src).h+2<=w.y,'Weather icon must not cover temperature')
        }
        const digits=w.type===data.STEP?5:3
        const suffix=w.type===data.WEATHER_CURRENT?asset(w.imperial_unit_en).w+asset(w.negative_image).w:w.type===data.BATTERY?asset(w.unit_en).w:0
        assert(digits*asset(w.font_array[0]).w+(digits-1)+suffix<=w.w,'Worst-case reading must fit')
      }
      if(w.widgetType==='IMG_DATE') {
        bounds(w.month_startX,w.month_startY,asset(w.month_en_array[0]))
        const size=asset(w.day_en_array[0])
        bounds(w.day_startX,w.day_startY,{w:2*size.w+w.day_space,h:size.h})
        assert(w.month_is_character && !w.day_is_character)
        assert(w.month_startY+asset(w.month_en_array[0]).h<=112)
        assert(w.day_startY+size.h<=112)
      }
      if(w.widgetType==='TIME_POINTER') {
        if(w.show_level===2) assert.equal(w.second_path,undefined,'No seconds hand in AOD')
        else assert.equal(w.second_path,'images/analog/second-awake.png')
        for(const hand of w.second_path?['hour','minute','second']:['hour','minute']) {
          const size=asset(w[hand+'_path'])
          assert.equal(size.w%2,1,'Pointer cutouts must have odd widths')
          const px=w[hand+'_posX'],py=w[hand+'_posY']
          assert(px>=0 && px<size.w && py>=0 && py<size.h)
          const radius=Math.hypot(Math.max(px,size.w-px),Math.max(py,size.h-py))
          bounds(w[hand+'_centerX']-radius,w[hand+'_centerY']-radius,{w:radius*2,h:radius*2})
          // Complications and date stay outside the complete hand sweep.
          for(const rect of complications) {
            const cx=w[hand+'_centerX'],cy=w[hand+'_centerY']
            const nearestX=Math.max(rect.x,Math.min(cx,rect.x+rect.w))
            const nearestY=Math.max(rect.y,Math.min(cy,rect.y+rect.h))
            assert(Math.hypot(cx-nearestX,cy-nearestY)>radius+2,'Complication intersects full hand sweep')
          }
        }
      }
    }
    if(enabled) assert(widgets.some(w=>w.src==='images/analog/icons/DATE.png' && w.show_level===1))
  }
}
// Condition mapping, missing data, sunset boundaries and refresh after sync.
const expected=['partly-cloudy','rain','snow','sun','cloud','rain','snow','rain','snow','snow','rain','dust','sleet','fog','fog','storm','snow','dust','rain','hail','storm','rain','dust','dust','rain','unknown','moon-cloud','moon-rain','moon']
expected.forEach((name,index)=>{
  assert.equal(ctx.selectWeatherIcon({forecastData:{count:1,data:[{index}]}},sensorTime),name)
  asset(`images/analog/weather/${name}.png`)
})
for(const snapshot of [null,{}, {forecastData:{count:0,data:[]}}, {forecastData:{count:1,data:[{index:29}]}}, {forecastData:{count:1,data:[{index:'3'}]}}]) {
  assert.equal(ctx.selectWeatherIcon(snapshot,sensorTime),'unknown')
}
weatherSnapshot.forecastData.data[0].index=3
assert.equal(ctx.selectWeatherIcon(weatherSnapshot,{hour:17,minute:59}),'sun')
assert.equal(ctx.selectWeatherIcon(weatherSnapshot,{hour:18,minute:0}),'moon')
assert.equal(ctx.selectWeatherIcon(weatherSnapshot,{hour:5,minute:59}),'moon')
assert.equal(ctx.selectWeatherIcon(weatherSnapshot,{hour:6,minute:0}),'sun')
assert.equal(ctx.selectWeatherIcon(weatherSnapshot,{hour:25,minute:0}),'sun')
const resume=widgets.find(w=>w.widgetType==='WIDGET_DELEGATE').resume_call
resume()
assert(widgets.some(w=>w.src==='images/analog/weather/sun.png'))
weatherSnapshot.forecastData.data[0].index=10
resume()
assert(widgets.some(w=>w.src==='images/analog/weather/rain.png'))
weatherFailure=true
resume()
assert(widgets.some(w=>w.src==='images/analog/weather/unknown.png'))
weatherFailure=false
weatherSnapshot.forecastData.data[0].index=0
// Hollow interior is actual transparency, with a visible outline in both modes.
for(const mode of ['awake','sleep']) {
  const hand=asset(`images/analog/minute-${mode}.png`)
  const alpha=(x,y)=>hand.pixels[y*(1+hand.w*4)+1+x*4+3]
  assert.equal(alpha(6,50),0,'Minute hand interior must be transparent')
  assert(Array.from({length:6},(_,x)=>alpha(x,50)).some(a=>a>0),'Hollow minute hand requires an outline')
}
// AOD differs in luminance, not the hour/minute silhouette or hollow outline.
for(const kind of ['hour','minute']) {
  const awake=asset(`images/analog/${kind}-awake.png`)
  const sleep=asset(`images/analog/${kind}-sleep.png`)
  assert.equal(awake.w,sleep.w)
  assert.equal(awake.h,sleep.h)
  for(let y=0;y<awake.h;y++) for(let x=0;x<awake.w;x++) {
    const alpha=y*(1+awake.w*4)+1+x*4+3
    assert.equal(awake.pixels[alpha],sleep.pixels[alpha],`${kind} thickness must match awake and AOD`)
  }
}
// Optional metric substitutions and animation remain supported, normal-display only.
widgets.length=0
vm.runInContext("config.metrics=['STEP','HEART','CAL'];config.animation=true",ctx)
ctx.face.build()
assert.deepEqual(widgets.filter(w=>w.widgetType==='TEXT_IMG').map(w=>w.type),[1,4,5])
assert.deepEqual(widgets.filter(w=>w.widgetType==='IMG_CLICK').map(w=>w.type),[1,4,5])
const animation=widgets.find(w=>w.widgetType==='IMG_ANIM')
assert.equal(animation.show_level,1)
for(let i=0;i<animation.anim_size;i++) asset(`${animation.anim_path}/${animation.anim_prefix}_${i}.${animation.anim_ext}`)
const preview=asset(manifest.app.icon)
assert.equal(preview.w,266);assert.equal(preview.h,307)
// A native failure in optional complications must leave the core clock intact.
vm.runInContext("config.animation=false;config.date=true;config.aod=true;config.metrics=['STEP','BATTERY','WEATHER_CURRENT']",ctx)
for(const type of ['TEXT_IMG','IMG_DATE','IMG_CLICK','BUTTON']) {
  widgets.length=0
  failingWidget=type
  ctx.face.build()
  assert.equal(widgets.filter(w=>w.widgetType==='TIME_POINTER').length,2)
  assert(widgets.some(w=>w.src==='images/analog/dial-awake.png'))
  const failureLabel={TEXT_IMG:'metrics error',IMG_DATE:'date error',IMG_CLICK:'shortcuts error',BUTTON:'calendar shortcut error'}[type]
  assert(runtimeLogs.some(args=>String(args[0]).includes(failureLabel)))
}
failingWidget=null
widgets.length=0
vm.runInContext('config.secondHand=false',ctx)
ctx.face.build()
assert(widgets.filter(w=>w.widgetType==='TIME_POINTER').every(w=>w.second_path===undefined))
widgets.length=0
vm.runInContext('config.shortcuts=false',ctx)
ctx.face.build()
assert(!widgets.some(w=>w.widgetType==='IMG_CLICK'))
assert(!widgets.some(w=>w.widgetType==='BUTTON'))
widgets.length=0
vm.runInContext('config.shortcuts=true',ctx)
data.BATTERY=0
ctx.face.build()
assert(widgets.some(w=>w.widgetType==='IMG_CLICK' && w.type===0),'Native action zero is a valid enum value')
data.BATTERY=2
// Dispatch happens on tap only; native launch failures cannot break the clock.
assert.equal(launches.length,0,'Calendar must not launch while building the face')
const calendar=widgets.find(w=>w.widgetType==='BUTTON')
assert.equal(calendar.click_func(),true)
assert.deepEqual(launches,[{appid:1,url:'ScheduleCalScreen',native:true}])
ctx.hmApp={startApp(){throw new Error('Unavailable native screen')}}
assert.equal(calendar.click_func(),false)
ctx.hmApp=undefined
assert.equal(calendar.click_func(),false)
ctx.hmApp=calendarLauncher
widgets.length=0
vm.runInContext('config.calendarShortcut=false',ctx)
ctx.face.build()
assert(!widgets.some(w=>w.widgetType==='BUTTON'))
widgets.length=0
vm.runInContext("config.metrics=['WEATHER_CURRENT','STEP','BATTERY']",ctx)
delete data.BATTERY
ctx.face.build()
const reordered=widgets.filter(w=>w.widgetType==='IMG_CLICK')
assert.deepEqual(reordered.map(w=>w.type),[data.WEATHER_CURRENT,data.STEP])
assert.equal(reordered[0].x,42)
assert.equal(reordered[1].x,246)
data.BATTERY=2
// Charge follows sensor events, with no writes while paused or destroyed.
widgets.length=0
vm.runInContext("config.metrics=['STEP','BATTERY','WEATHER_CURRENT']",ctx)
ctx.face.build()
const batteryIcon=widgets.find(w=>w.src && w.src.includes('/battery/'))
const batteryDelegate=widgets.find(w=>w.widgetType==='WIDGET_DELEGATE' && w.pause_call)
assert.equal(batteryIcon.src,'images/analog/battery/75.png')
assert.equal(batteryIcon.show_level,1)
const changeBattery=()=>batteryListeners.forEach(callback=>callback())
for(const value of [0,1,25,50,75,99,100,null,undefined,NaN,-1,101,'75']) {
  batteryValue=value
  changeBattery()
  const expected=typeof value==='number' && Number.isFinite(value) && value>=0 && value<=100 ? value : 'unknown'
  assert.equal(batteryIcon.src,`images/analog/battery/${expected}.png`)
  assert.equal(batteryIcon.w,21);assert.equal(batteryIcon.h,19)
}
batteryFailure=true;changeBattery()
assert(batteryIcon.src.endsWith('/unknown.png'))
batteryFailure=false;batteryValue=75;changeBattery()
batteryDelegate.pause_call();batteryValue=50;changeBattery()
assert(batteryIcon.src.endsWith('/75.png'))
batteryDelegate.resume_call()
assert(batteryIcon.src.endsWith('/50.png'))
ctx.face.onDestroy();batteryValue=0;changeBattery();batteryDelegate.resume_call()
assert(batteryIcon.src.endsWith('/50.png'))
// Generated levels retain their outline and grow monotonically, with distinct
// empty/full/unavailable states. Compare alpha, not compressed PNG sizes.
let previousInk=-1
for(let percent=0;percent<=100;percent++) {
  const frame=asset(`images/analog/battery/${percent}.png`)
  assert.equal(frame.w,21);assert.equal(frame.h,19)
  let ink=0
  for(let y=0;y<frame.h;y++) for(let x=0;x<frame.w;x++) ink+=frame.pixels[y*(1+frame.w*4)+1+x*4+3]
  assert(ink>=previousInk,'Battery fill must not shrink as charge rises')
  previousInk=ink
}
assert.notDeepEqual(asset('images/analog/battery/0.png').pixels,asset('images/analog/battery/100.png').pixels)
assert.notDeepEqual(asset('images/analog/battery/0.png').pixels,asset('images/analog/battery/unknown.png').pixels)
console.log('PASS: hollow hands, pivots/sweep clearance, icon-only complications, all 29 weather codes, day/night boundaries, resume refresh/fallback, date/units, awake/AOD isolation.')
