import { image } from './graphics'

export function createClock(layout, aod, seconds = true) {
  const level = aod ? hmUI.show_level.ONAL_AOD : hmUI.show_level.ONLY_NORMAL
  const style = aod ? 'sleep' : 'awake'
  image(`images/analog/dial-${style}.png`, layout.dial.x, layout.dial.y, level)
  const pointers = {
    hour_centerX: layout.center.x, hour_centerY: layout.center.y,
    hour_posX: 6, hour_posY: 96, hour_path: `images/analog/hour-${style}.png`,
    minute_centerX: layout.center.x, minute_centerY: layout.center.y,
    minute_posX: 6, minute_posY: 132, minute_path: `images/analog/minute-${style}.png`,
    show_level: level
  }
  if (!aod && seconds) {
    pointers.second_centerX = layout.center.x
    pointers.second_centerY = layout.center.y
    pointers.second_posX = 3
    pointers.second_posY = 138
    pointers.second_path = 'images/analog/second-awake.png'
  }
  hmUI.createWidget(hmUI.widget.TIME_POINTER, pointers)
  image(`images/analog/hub-${style}.png`, layout.center.x - 7, layout.center.y - 7, level)
}
