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

const widgets=[]
const types=['IMG','TIME_POINTER','TEXT_IMG','IMG_DATE','IMG_ANIM','WIDGET_DELEGATE']
const data={STEP:1,BATTERY:2,WEATHER_CURRENT:3,HEART:4,CAL:5}
let weatherSnapshot={forecastData:{count:1,data:[{index:0}]},tideData:{count:1,data:[{sunrise:{hour:6,minute:0},sunset:{hour:18,minute:0}}]}}
const sensorTime={hour:12,minute:0}
let weatherFailure=false
const ctx=vm.createContext({
  hmUI:{widget:Object.fromEntries(types.map(t=>[t,t])),
    prop:{MORE:'MORE'},
    show_level:{ONLY_NORMAL:1,ONAL_AOD:2},align:{LEFT:0,CENTER_H:1,RIGHT:2},anim_status:{START:0},
    data_type:data,createWidget(type,options) {
      assert(types.includes(type),'Undeclared widget type')
      const widget={...options,widgetType:type}
      widgets.push(widget)
      return {setProperty(prop,values){assert.equal(prop,'MORE');Object.assign(widget,values)}}
    }},
  hmSensor:{id:{WEATHER:'WEATHER',TIME:'TIME'},createSensor(id){
    if(id==='TIME') return sensorTime
    assert.equal(id,'WEATHER')
    return {getForecastWeather(){if(weatherFailure) throw new Error('Offline');return weatherSnapshot}}
  }},
  WatchFace(face){ctx.face=face},App(){}
})
for(const file of ['app.js','watchface/config.js','watchface/graphics.js','watchface/clock.js','watchface/weather.js',
  'watchface/metrics.js','watchface/date.js','watchface/animation.js','watchface/index.js']) {
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
    const weather=metrics.find(w=>w.type===data.WEATHER_CURRENT)
    assert.equal(weather.negative_image,'images/analog/minus.png')
    assert(weather.unit_en.endsWith('/celsius.png'))
    assert(weather.imperial_unit_en.endsWith('/fahrenheit.png'))
    for(const w of widgets) {
      assert([1,2].includes(w.show_level))
      if(w.src) bounds(w.x,w.y,asset(w.src))
      for(const key of ['font_array','month_en_array','day_en_array']) {
        if(w[key]) {
          assert.equal(w[key].length,key==='month_en_array'?12:10)
          w[key].forEach(asset)
        }
      }
      for(const key of ['unit_en','unit_sc','unit_tc','imperial_unit_en','imperial_unit_sc','imperial_unit_tc','negative_image']) {
        if(w[key]) asset(w[key])
      }
      if(w.widgetType==='TEXT_IMG') {
        bounds(w.x,w.y,{w:w.w,h:w.h})
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
        assert.equal(w.second_path,undefined)
        for(const hand of ['hour','minute']) {
          const size=asset(w[hand+'_path'])
          assert.equal(size.w%2,1,'Pointer cutouts must have odd widths')
          const px=w[hand+'_posX'],py=w[hand+'_posY']
          assert(px>=0 && px<size.w && py>=0 && py<size.h)
          const radius=Math.hypot(Math.max(px,size.w-px),Math.max(py,size.h-py))
          bounds(w[hand+'_centerX']-radius,w[hand+'_centerY']-radius,{w:radius*2,h:radius*2})
          // Complications and date stay outside the complete hand sweep.
          assert(w[hand+'_centerY']-radius>112)
          assert(w[hand+'_centerY']+radius<350)
          for(const metric of metrics) {
            const top=metric.y, bottom=metric.y+metric.h
            assert(bottom<w[hand+'_centerY']-radius || top>w[hand+'_centerY']+radius,'Reading intersects hand sweep')
          }
        }
      }
    }
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
// Optional metric substitutions and animation remain supported, normal-display only.
widgets.length=0
vm.runInContext("config.metrics=['STEP','HEART','CAL'];config.animation=true",ctx)
ctx.face.build()
assert.deepEqual(widgets.filter(w=>w.widgetType==='TEXT_IMG').map(w=>w.type),[1,4,5])
const animation=widgets.find(w=>w.widgetType==='IMG_ANIM')
assert.equal(animation.show_level,1)
for(let i=0;i<animation.anim_size;i++) asset(`${animation.anim_path}/${animation.anim_prefix}_${i}.${animation.anim_ext}`)
const preview=asset(manifest.app.icon)
assert.equal(preview.w,266);assert.equal(preview.h,307)
console.log('PASS: hollow hands, pivots/sweep clearance, icon-only complications, all 29 weather codes, day/night boundaries, resume refresh/fallback, date/units, awake/AOD isolation.')
