import { config, layouts } from './config'
import { image } from './graphics'
import { createClock } from './clock'
import { createMetrics } from './metrics'
import { createAnimation } from './animation'
import { createDate } from './date'

WatchFace({
  build() {
    const layout = layouts[config.layout]
    if (!layout) throw new Error('Unknown layout: ' + config.layout)
    image('images/analog/background.png', 0, 0, hmUI.show_level.ONLY_NORMAL)
    createClock(layout, false)
    createMetrics(layout, config.metrics)
    if (config.date) createDate(layout)
    if (config.animation) createAnimation()
    if (config.aod) createClock(layout, true)
  },
  onDestroy() {}
})
