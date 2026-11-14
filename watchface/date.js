export function createDate(layout) {
  const months = Array.from({ length: 12 }, (_, i) => `images/analog/month/${i + 1}.png`)
  const digits = Array.from({ length: 10 }, (_, i) => `images/analog/date/${i}.png`)
  hmUI.createWidget(hmUI.widget.IMG_DATE, {
    month_startX: layout.date.monthX, month_startY: layout.date.monthY,
    month_en_array: months, month_sc_array: months, month_tc_array: months,
    month_is_character: true, month_follow: 0, month_align: hmUI.align.LEFT,
    day_startX: layout.date.dayX, day_startY: layout.date.dayY,
    day_en_array: digits, day_sc_array: digits, day_tc_array: digits,
    day_is_character: false, day_follow: 0, day_zero: 1,
    day_space: 1, day_align: hmUI.align.LEFT,
    show_level: hmUI.show_level.ONLY_NORMAL
  })
}
