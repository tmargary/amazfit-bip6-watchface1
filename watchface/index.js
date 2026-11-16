import { config, layouts } from './config'
import { image } from './graphics'
import { createClock } from './clock'
import { createMetrics } from './metrics'
import { createAnimation } from './animation'
import { createDate } from './date'
import { createShortcuts, createCalendarShortcut } from './shortcuts'
import { createBatteryIcons } from './battery'

WatchFace({
  onInit() {
    console.log('[Still 0.5.8] init')
  },
  build() {
    if (this.batteryIcons) this.batteryIcons.destroy()
    this.batteryIcons = null
    console.log('[Still 0.5.8] build start')
    const layout = layouts[config.layout]
    if (!layout) throw new Error('Unknown layout: ' + config.layout)
    image('images/analog/background.png', 0, 0, hmUI.show_level.ONLY_NORMAL)
    console.log('[Still 0.5.8] creating primary clock')
    createClock(layout, false, config.secondHand)
    console.log('[Still 0.5.8] primary clock ready')
    try { if (config.aod) createClock(layout, true) } catch (error) {
      console.log('[Still 0.5.8] AOD error', error && error.stack || String(error))
    }
    // Optional data must never prevent the primary clock from rendering.
    try { createMetrics(layout, config.metrics) } catch (error) {
      console.log('[Still 0.5.8] metrics error', error && error.stack || String(error))
    }
    try { if (config.date) createDate(layout) } catch (error) {
      console.log('[Still 0.5.8] date error', error && error.stack || String(error))
    }
    try { if (config.animation) createAnimation() } catch (error) {
      console.log('[Still 0.5.8] animation error', error && error.stack || String(error))
    }
    try { this.batteryIcons = createBatteryIcons(layout, config.metrics) } catch (error) {
      console.log('[Still battery] icon error', error && error.stack || String(error))
    }
    // Create hit regions last so they cover both icons and readings.
    try { if (config.shortcuts) createShortcuts(layout, config.metrics) } catch (error) {
      console.log('[Still 0.5.8] shortcuts error', error && error.stack || String(error))
    }
    try {
      if (config.shortcuts && config.date && config.calendarShortcut) createCalendarShortcut(layout)
    } catch (error) {
      console.log('[Still 0.5.8] calendar shortcut error', error && error.stack || String(error))
    }
    console.log('[Still 0.5.8] build complete')
  },
  onDestroy() {
    if (this.batteryIcons) this.batteryIcons.destroy()
    this.batteryIcons = null
  }
})
