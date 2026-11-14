// Build-time configuration. On-watch editing is intentionally not advertised.
export const config = {
  layout: 'minimal',
  animation: false,
  aod: true,
  date: true,
  metrics: ['STEP', 'BATTERY', 'WEATHER_CURRENT']
}

export const layouts = {
  minimal: {
    center: { x: 195, y: 225 }, dial: { x: 60, y: 90 },
    date: { monthX: 52, dayX: 52, monthY: 49, dayY: 73 },
    slots: [
      { x: 52, y: 378, w: 130, h: 30, iconX: 52, iconY: 351, align: 'left' },
      { x: 230, y: 378, w: 110, h: 30, iconX: 322, iconY: 351, align: 'right' },
      { x: 230, y: 78, w: 110, h: 30, iconX: 312, iconY: 51, align: 'right' }
    ]
  },
  airy: {
    center: { x: 195, y: 219 }, dial: { x: 60, y: 84 },
    date: { monthX: 52, dayX: 52, monthY: 49, dayY: 73 },
    slots: [
      { x: 52, y: 378, w: 130, h: 30, iconX: 52, iconY: 351, align: 'left' },
      { x: 230, y: 378, w: 110, h: 30, iconX: 322, iconY: 351, align: 'right' },
      { x: 230, y: 78, w: 110, h: 30, iconX: 312, iconY: 51, align: 'right' }
    ]
  }
}
