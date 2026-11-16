import { digitPaths, image } from './graphics'
import { createWeatherIcon } from './weather'

export const metricNames = ['STEP', 'BATTERY', 'WEATHER_CURRENT', 'HEART', 'CAL']

export function createMetrics(layout, names) {
  if (names.length > layout.slots.length) throw new Error('Too many complications')
  names.forEach((name, index) => {
    if (metricNames.indexOf(name) < 0) throw new Error('Unsupported metric: ' + name)
    const slot = layout.slots[index]
    if (name === 'WEATHER_CURRENT') createWeatherIcon(slot)
    else if (name !== 'BATTERY') image(`images/analog/icons/${name}.png`, slot.iconX, slot.iconY, hmUI.show_level.ONLY_NORMAL)
    const options = {
      x: slot.x, y: slot.y, w: slot.w, h: slot.h,
      type: hmUI.data_type[name],
      font_array: digitPaths('analog/metric'),
      h_space: 1,
      align_h: slot.align === 'right' ? hmUI.align.RIGHT : hmUI.align.LEFT,
      show_level: hmUI.show_level.ONLY_NORMAL
    }
    if (name === 'WEATHER_CURRENT') {
      options.negative_image = 'images/analog/minus.png'
      options.unit_en = options.unit_sc = options.unit_tc = 'images/analog/celsius.png'
      options.imperial_unit_en = options.imperial_unit_sc = options.imperial_unit_tc = 'images/analog/fahrenheit.png'
    } else if (name === 'BATTERY') {
      options.unit_en = options.unit_sc = options.unit_tc = 'images/analog/percent.png'
    }
    hmUI.createWidget(hmUI.widget.TEXT_IMG, options)
  })
}
