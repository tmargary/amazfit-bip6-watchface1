import { config, layouts } from './config'
import { image } from './graphics'
import { createClock } from './clock'
import { createMetrics } from './metrics'
import { createAnimation } from './animation'
import { createDate } from './date'

WatchFace({
  onInit() {
    console.log('[Still 0.5.5] init')
  },
  build() {
    console.log('[Still 0.5.5] build start')
    const layout = layouts[config.layout]
    if (!layout) throw new Error('Unknown layout: ' + config.layout)
    image('images/analog/background.png', 0, 0, hmUI.show_level.ONLY_NORMAL)
    console.log('[Still 0.5.5] creating primary clock')
    createClock(layout, false, config.secondHand)
    console.log('[Still 0.5.5] primary clock ready')
    try { if (config.aod) createClock(layout, true) } catch (error) {
      console.log('[Still 0.5.5] AOD error', error && error.stack || String(error))
    }
    // Optional data must never prevent the primary clock from rendering.
    try { createMetrics(layout, config.metrics) } catch (error) {
      console.log('[Still 0.5.5] metrics error', error && error.stack || String(error))
    }
    try { if (config.date) createDate(layout) } catch (error) {
      console.log('[Still 0.5.5] date error', error && error.stack || String(error))
    }
    try { if (config.animation) createAnimation() } catch (error) {
      console.log('[Still 0.5.5] animation error', error && error.stack || String(error))
    }
    console.log('[Still 0.5.5] build complete')
  },
  onDestroy() {}
})
