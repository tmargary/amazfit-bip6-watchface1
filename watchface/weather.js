// Official condition indices 0..28: Zepp watchface WEATHER reference/specification.
export const conditionIcons = [
  'partly-cloudy', 'rain', 'snow', 'sun', 'cloud', 'rain', 'snow', 'rain',
  'snow', 'snow', 'rain', 'dust', 'sleet', 'fog', 'fog', 'storm', 'snow',
  'dust', 'rain', 'hail', 'storm', 'rain', 'dust', 'dust', 'rain',
  'unknown', 'moon-cloud', 'moon-rain', 'moon'
]

export function minuteOfDay(value) {
  if (!value || !Number.isInteger(value.hour) || !Number.isInteger(value.minute) ||
      value.hour < 0 || value.hour > 23 || value.minute < 0 || value.minute > 59) return null
  return value.hour * 60 + value.minute
}

export function selectWeatherIcon(snapshot, time) {
  const forecast = snapshot && snapshot.forecastData
  const item = forecast && forecast.count > 0 && forecast.data && forecast.data[0]
  const index = item && item.index
  if (!Number.isInteger(index) || index < 0 || index >= conditionIcons.length) return 'unknown'
  const icon = conditionIcons[index]
  const tides = snapshot.tideData
  const today = tides && tides.count > 0 && tides.data && tides.data[0]
  const rise = minuteOfDay(today && today.sunrise)
  const set = minuteOfDay(today && today.sunset)
  const now = minuteOfDay(time)
  // Never guess night using a fixed hour or missing/polar sunrise/sunset values.
  if (rise !== null && set !== null && now !== null && rise !== set) {
    const night = rise < set ? now < rise || now >= set : now >= set && now < rise
    if (night && icon === 'sun') return 'moon'
    if (night && icon === 'partly-cloudy') return 'moon-cloud'
  }
  return icon
}

export function createWeatherIcon(slot) {
  const icon = hmUI.createWidget(hmUI.widget.IMG, {
    x: slot.iconX, y: slot.iconY,
    src: 'images/analog/weather/unknown.png', show_level: hmUI.show_level.ONLY_NORMAL
  })
  let weather, time
  const refresh = () => {
    let name = 'unknown'
    try {
      weather = weather || hmSensor.createSensor(hmSensor.id.WEATHER)
      const snapshot = weather.getForecastWeather()
      try { time = time || hmSensor.createSensor(hmSensor.id.TIME) } catch (_) { time = null }
      name = selectWeatherIcon(snapshot, time)
    } catch (_) {
      // Unavailable sensors or absent weather never turn into fabricated sunshine.
    }
    icon.setProperty(hmUI.prop.MORE, { src: `images/analog/weather/${name}.png` })
  }
  refresh()
  hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
    resume_call: refresh,
    show_level: hmUI.show_level.ONLY_NORMAL
  })
}
