// Native watch face jump actions. No Mini Program router or guessed app IDs.
export const shortcutTypes = ['STEP', 'BATTERY', 'WEATHER_CURRENT', 'HEART', 'CAL']

// Published accepted answer in Zepp's developer forum, discussion #161:
// https://github.com/orgs/zepp-health/discussions/161
// startApp is documented; this native screen route is firmware-dependent and
// is not a stable public routing contract. Keep it isolated from rendering.
export function launchCalendar() {
  try {
    if (typeof hmApp === 'undefined' || typeof hmApp.startApp !== 'function') {
      console.log('[Still calendar] native launcher unavailable')
      return false
    }
    hmApp.startApp({ appid: 1, url: 'ScheduleCalScreen', native: true })
    console.log('[Still calendar] launch requested')
    return true
  } catch (error) {
    console.log('[Still calendar] launch error', error && error.stack || String(error))
    return false
  }
}

export function createCalendarShortcut(layout) {
  const date = layout.date
  const left = Math.min(date.iconX, date.monthX, date.dayX)
  const top = Math.min(date.iconY, date.monthY, date.dayY)
  const right = Math.max(date.iconX + 21, date.monthX + 48, date.dayX + 45)
  const bottom = Math.max(date.iconY + 19, date.monthY + 22, date.dayY + 36)
  hmUI.createWidget(hmUI.widget.BUTTON, {
    x: left, y: top, w: Math.max(44, right - left), h: Math.max(44, bottom - top),
    text: '', normal_src: 'images/analog/tap.png', press_src: 'images/analog/tap.png',
    click_func: launchCalendar,
    show_level: hmUI.show_level.ONLY_NORMAL
  })
}

export function shortcutBounds(slot, name) {
  const iconWidth = name === 'WEATHER_CURRENT' ? 30 : 21
  const iconHeight = name === 'WEATHER_CURRENT' ? 26 : 19
  const x = Math.min(slot.x, slot.iconX)
  const y = Math.min(slot.y, slot.iconY)
  return {
    x, y,
    w: Math.max(slot.x + slot.w, slot.iconX + iconWidth) - x,
    h: Math.max(slot.y + slot.h, slot.iconY + iconHeight) - y
  }
}

export function createShortcuts(layout, names) {
  names.forEach((name, index) => {
    if (shortcutTypes.indexOf(name) < 0) return
    const type = hmUI.data_type[name]
    // A missing firmware action must not abort watch face construction.
    if (typeof type !== 'number') return
    hmUI.createWidget(hmUI.widget.IMG_CLICK, {
      ...shortcutBounds(layout.slots[index], name),
      src: 'images/analog/tap.png',
      type,
      show_level: hmUI.show_level.ONLY_NORMAL
    })
  })
}
