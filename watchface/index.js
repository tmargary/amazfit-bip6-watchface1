import { config, layouts } from './config'
import { image } from './graphics'
import { createClock } from './clock'
import { createMetrics } from './metrics'
import { createAnimation } from './animation'
import { createDate } from './date'

WatchFace({
  onInit() {
    console.log('[Still 0.5.1] init')
  },
  build() {
    console.log('[Still 0.5.1] build start')
    const layout = layouts[config.layout]
    if (!layout) throw new Error('Unknown layout: ' + config.layout)
    image('images/analog/background.png', 0, 0, hmUI.show_level.ONLY_NORMAL)
    console.log('[Still 0.5.1] creating primary clock')
    createClock(layout, false)
    console.log('[Still 0.5.1] primary clock ready')
    try { if (config.aod) createClock(layout, true) } catch (error) {
      console.log('[Still 0.5.1] AOD error', error && error.stack || String(error))
    }
    // Optional data must never prevent the primary clock from rendering.
    try { createMetrics(layout, config.metrics) } catch (error) {
      console.log('[Still 0.5.1] metrics error', error && error.stack || String(error))
    }
    try { if (config.date) createDate(layout) } catch (error) {
      console.log('[Still 0.5.1] date error', error && error.stack || String(error))
    }
    try { if (config.animation) createAnimation() } catch (error) {
      console.log('[Still 0.5.1] animation error', error && error.stack || String(error))
    }
    console.log('[Still 0.5.1] build complete')
  },
  onDestroy() {}
})
