# Project conventions

This is an Amazfit Bip 6 watch face, using JavaScript for the Zepp runtime and
Python for reproducible original graphics. Use only documented watch face APIs.
Do not substitute Mini Program APIs or invent sensor fields. Keep host-only Node
and Python code under tools/. Never import Node or browser APIs on the watch.

## Verified capabilities and sources

Verified against official documentation on 2026-11-14:

- Bip 6: 390 x 450 square display, corner radius 86, two buttons; preview 266 x 307.
  Device sources: 9765120 (China), 9765121 and 10158337.
  Current maximum API level 4.2, current Zepp OS 5.0. These are firmware ceilings,
  not the installed SDK or a guarantee about an individual watch's firmware.
  https://docs.zepp.com/docs/reference/related-resources/device-list/
- 1.97-inch AMOLED; AOD supported by the manufacturer.
  https://us.amazfit.com/collections/essentials-smartwatches/products/bip-6
  https://support.amazfit.com/en/amazfit_bip_6/docs/HV7RdLBHFollfYxhWzUcPW6PnDf
- Use appType watchface and the watchface module, not a Mini Program page.
  Manifest v3 targets Bip 6 explicitly; lockscreen=1 enables the AOD module flag.
  https://docs.zepp.com/docs/watchface/app-json/
- Watch face UI uses global hmUI and WatchFace; IMG_TIME updates time natively.
  TIME_POINTER rotates hour/minute images natively. IMG_DATE supplies the date;
  use 12 character images for months and 10 numeric images for days.
  TEXT_IMG type binds STEP, HEART, CAL, BATTERY and WEATHER_CURRENT without polling.
  A listed data type is not proof that all devices supply that metric. Add new
  metrics only after checking device and firmware support; preserve missing data.
  https://docs.zepp.com/docs/watchface/api/hmUI/widget/IMG_TIME/
  https://docs.zepp.com/docs/watchface/api/hmUI/widget/TIME_POINTER/
  https://docs.zepp.com/docs/watchface/api/hmUI/widget/IMG_DATE/
  https://docs.zepp.com/docs/watchface/api/hmUI/widget/TEXT_IMG/
  https://docs.zepp.com/docs/watchface/api/hmUI/widget/data_type/
- IMG_ANIM supports numbered PNG frames. Keep it normal-display only.
  AOD uses hmUI.show_level.ONAL_AOD (the spelling is official); do not rename it.
  https://docs.zepp.com/docs/watchface/api/hmUI/widget/IMG_ANIM/
  https://docs.zepp.com/docs/watchface/api/hmUI/createWidget/
- Official entry point and module conventions were checked against ColorWorld.
  https://github.com/zepp-health/zeppos-samples/tree/main/watchface/1.0/color-world

## Structure and implementation rules

- watchface/config.js: build-time feature flags, selected layout and metric order.
- watchface/clock.js, date.js, metrics.js, weather.js, graphics.js, animation.js:
  separate UI modules.
- Current design: Still, analog hour/minute hands and 12 dot indices. Default
  minimal layout; airy moves the dial slightly upward. No second hand.
- Visual direction: Apple Watch inspired restraint, original graphics. Awake has
  neutral white hands, a thicker rounded hour hand, orange month/center accents,
  real Segoe UI numerals, and subtle coral/green/blue complication icons.
  AOD is monochrome and dim. Keep colors out of AOD and retain the existing
  footprint/pivots when changing stroke weights. The static battery outline is
  an identifier, not a charge gauge; only the native percentage indicates charge.
- Awake details sit outside the full hand sweep in four corners: month/day at
  upper left, temperature at upper right, steps at lower left, battery at lower
  right. Use only icons, not TEMP/STEPS/BATTERY text labels. Heart rate/calories can
  replace one of those three readings in config.metrics. Do not add clutter.
- Temperature uses the native WEATHER_CURRENT text binding. The condition icon
  uses today's index from hmSensor WEATHER.getForecastWeather(), not a made-up
  current-condition field. Map all 29 documented indices and use a neutral
  unavailable mark for missing/invalid/unsupported data. This is synced daily
  forecast data, not a guaranteed live local observation.
- Clear/partly-cloudy icons use a moon at night only when today's documented
  sunrise/sunset data and TIME hour/minute are valid. Explicit nighttime condition
  codes are honored. Do not assume night begins at a fixed hour. No JS weather
  polling in AOD: refresh at build and through WIDGET_DELEGATE.resume_call.
  That callback's behavior across AOD transitions still needs hardware validation.
- Weather API/mapping and lifecycle sources:
  https://docs.zepp.com/docs/watchface/api/hmSensor/sensorId/WEATHER/
  https://docs.zepp.com/docs/1.0/watchface/api/hmSensor/sensorId/WEATHER/
  https://docs.zepp.com/docs/watchface/api/hmSensor/sensorId/TIME/
  https://docs.zepp.com/docs/watchface/api/hmUI/widget/DELEGATE/
  https://docs.zepp.com/docs/watchface/api/hmUI/widget/IMG/
- Use native negative_image and metric/imperial unit resources; do not invent
  temperatures or hardcode Celsius when Fahrenheit is selected.
- Hands have odd-width cutouts, correct pivots, a rounded solid hour blade and
  transparent hollow minute blade. Hub is a circular rim with a dark core. Use
  shared draw_hand/draw_hub geometry for resources and previews. Preserve the
  hollow alpha channel rather than painting the slot black.
- tools/analog_assets.py generates supersampled original hands, dots and icons.
  tools/system_font.py rasterizes installed Segoe UI through Windows GDI using
  ctypes. No font file is copied into the project. Asset generation requires
  Windows and installed Segoe UI; it has no Pillow dependency or hand-drawn font
  fallback. Font cell clipping is checked during generation. These scripts use
  Python standard library only and are called by the main asset generator.
  Keep pivots and dimensions in sync
  with clock.js; hand rotation must never reach the date or footer.
- assets/bip-6/images/: generated PNGs; tools/generate_assets.py owns these files.
- artifacts/preview.png, preview-awake.png, preview-sleep.png and
  preview-comparison.png: design references, not simulator screenshots.
- Keep content inside the rounded screen's safe area. AOD must remain sparse,
  dark, with only native hour/minute hands, dot markers and their small hub.
  All date, weather and metric widgets MUST be ONLY_NORMAL. No seconds or
  animation in AOD. AOD time refresh is managed by the device, with no JS polling.
- Animation is disabled by default to preserve the minimal design. The optional
  legacy wake animation is below the footer and ONLY_NORMAL.
- Layout configuration is build-time only. editable=0; there is no on-watch editor.
- appId=1000000 is a local placeholder. Obtain a unique developer app ID before
  distribution. Do not publish or claim device validation without hardware testing.
- Runtime minVersion 3.0.0 and target 4.2.0 are declared compatibility requirements,
  not evidence that a physical watch or simulator has executed this project.

## Installed tools and commands

Observed: Node 26.13.1, npm 11.20.0, Python 3.14.0; Zeus CLI package 1.10.0,
with @zeppos/zpm dependency 3.5.0. No separate project SDK is installed.
Pillow is absent; asset generation deliberately uses Python standard library only.

Run from repository root (PowerShell or Command Prompt):

```text
python tools/generate_assets.py
node tools/validate.cjs
npm run build
zeus dev
zeus preview
```

Zeus build outputs a ZAB under dist/. Use a supported simulator with Bip 6 device
resources for dev; enable Zepp App developer mode and scan the preview QR code
for real-device validation. Check 12/24-hour format, missing health data, live
  updates, battery endpoints, negative temperatures, Celsius/Fahrenheit, date
  rollover, AOD transitions, hand rotations and clipping, condition updates after
  sync/resume, unknown weather, and moon selection at sunrise/sunset.
Do not treat host checks as emulator or hardware tests.

Workflow documentation:
https://docs.zepp.com/docs/watchface/watchface-quick-start/
https://docs.zepp.com/docs/guides/tools/cli/
https://docs.zepp.com/docs/guides/tools/zepp-app/

## Current environment limitation

In this session the default Store PowerShell cannot launch (Windows error 5).
Explicit cmd.exe works. Zeus create and version commands fail during startup
because its Node child_process.execSync('node -v') raises spawnSync cmd.exe EPERM.
Do not modify installed Zeus internals or bypass permission controls. Run the
normal documented commands in a working local shell to complete package and
device validation. Consult artifacts/BUILD_STATUS.md for recorded results.
