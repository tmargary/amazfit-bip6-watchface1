// Battery.current is the documented percentage (0..100). No charging-state guess.
export function batteryImage(value) {
  const valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
  return `images/analog/battery/${valid ? Math.round(value) : 'unknown'}.png`
}

export function createBatteryIcons(layout, names) {
  const icons = []
  let sensor, awake = true, destroyed = false
  names.forEach((name, index) => {
    if (name !== 'BATTERY') return
    const slot = layout.slots[index]
    const options = {
      x: slot.iconX, y: slot.iconY, w: 21, h: 19,
      src: batteryImage(null), show_level: hmUI.show_level.ONLY_NORMAL
    }
    icons.push({ options, widget: hmUI.createWidget(hmUI.widget.IMG, options) })
  })
  const refresh = () => {
    if (destroyed || !awake || !icons.length) return
    let value = null
    try {
      sensor = sensor || hmSensor.createSensor(hmSensor.id.BATTERY)
      value = sensor.current
    } catch (_) { /* Keep unavailable data distinct from zero charge. */ }
    const src = batteryImage(value)
    icons.forEach(icon => icon.widget.setProperty(hmUI.prop.MORE, { ...icon.options, src }))
  }
  const resume = () => { if (!destroyed) { awake = true; refresh() } }
  const pause = () => { awake = false }
  refresh()
  if (icons.length) {
    try {
      sensor = sensor || hmSensor.createSensor(hmSensor.id.BATTERY)
      sensor.addEventListener(hmSensor.event.CHANGE, refresh)
    } catch (_) { /* Resume still refreshes when change events are unavailable. */ }
    hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
      resume_call: resume, pause_call: pause, show_level: hmUI.show_level.ONLY_NORMAL
    })
  }
  // Legacy watchface docs do not specify listener removal. Disable this closure
  // on rebuild/destroy; the runtime owns the sensor subscription lifetime.
  return { destroy() { destroyed = true; awake = false } }
}
