// Build-time configuration. On-watch editing is intentionally not advertised.
export const config = {
  layout: 'minimal',
  animation: false,
  secondHand: true,
  aod: true,
  date: true,
  metrics: ['STEP', 'BATTERY', 'WEATHER_CURRENT']
}

export const layouts = {
  minimal: {
    center: { x: 195, y: 225 }, dial: { x: 35, y: 65 },
    date: { monthX: 71, dayX: 42, monthY: 36, dayY: 57, iconX: 42, iconY: 34 },
    slots: [
      { x: 42, y: 400, w: 112, h: 30, iconX: 42, iconY: 378, align: 'left' },
      { x: 246, y: 400, w: 102, h: 30, iconX: 327, iconY: 378, align: 'right' },
      { x: 246, y: 63, w: 102, h: 30, iconX: 318, iconY: 31, align: 'right' }
    ]
  },
  airy: {
    center: { x: 195, y: 229 }, dial: { x: 35, y: 69 },
    date: { monthX: 71, dayX: 42, monthY: 36, dayY: 57, iconX: 42, iconY: 34 },
    slots: [
      { x: 42, y: 400, w: 112, h: 30, iconX: 42, iconY: 378, align: 'left' },
      { x: 246, y: 400, w: 102, h: 30, iconX: 327, iconY: 378, align: 'right' },
      { x: 246, y: 63, w: 102, h: 30, iconX: 318, iconY: 31, align: 'right' }
    ]
  }
}
