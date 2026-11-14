import { image } from './graphics'

export function createClock(layout, aod) {
  const level = aod ? hmUI.show_level.ONAL_AOD : hmUI.show_level.ONLY_NORMAL
  const style = aod ? 'sleep' : 'awake'
  image(`images/analog/dial-${style}.png`, layout.dial.x, layout.dial.y, level)
  hmUI.createWidget(hmUI.widget.TIME_POINTER, {
    hour_centerX: layout.center.x, hour_centerY: layout.center.y,
    hour_posX: 6, hour_posY: 72, hour_path: `images/analog/hour-${style}.png`,
    minute_centerX: layout.center.x, minute_centerY: layout.center.y,
    minute_posX: 6, minute_posY: 102, minute_path: `images/analog/minute-${style}.png`,
    show_level: level
  })
  image(`images/analog/hub-${style}.png`, layout.center.x - 7, layout.center.y - 7, level)
}
