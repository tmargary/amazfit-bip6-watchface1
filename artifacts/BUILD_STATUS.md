# Verification — 2026-11-14

## Black-screen investigation, version 0.5.1

- User reports installed 0.5.0 displays black although PNG previews look correct.
  Inspected the actual 0.5.0 ZAB/ZPK/device.zip: entry bytecode and dial/hand
  resources exist, but minimum API is 3.0 and the entry lacks the legacy widget
  bootstrap. The installed official legacy watchface template uses minimum API
  1.0.0, target 1.0.1. ZPM's compiler selects a different bootstrap at >=2.0.
- Corrected the project's runtime declaration to match its legacy WatchFace/hmUI
  API, retaining explicit Bip 6 device targets. Device API maximum 4.2 was
  incorrectly used as a source-runtime requirement in the initial project.
  This mismatch is a likely cause, not a confirmed hardware diagnosis.
- Added build-stage/error logs and isolated optional AOD/complication failures
  after primary clock creation. Regression checks verify optional native widget
  failures leave the core clock constructed.
- Added tools/audit_package.py and npm run audit:package. It rejects the existing
  0.5.0 package for its stale version and incompatible legacy bootstrap. Future
  builds audit the actual compiled entry and required packaged resources.
- Host tests pass. npm run build still fails here during Zeus startup with
  spawnSync cmd.exe EPERM; no 0.5.1 ZAB was produced in this environment.
- Rebuild locally, ensure package audit passes, generate a new zeus preview QR,
  and reinstall. If still black, collect the [Still 0.5.1] messages/framework
  errors from Zepp developer logs. Awaiting device confirmation/logs.

## Icon-only complications and hollow hands, version 0.5.0

- Removed all complication text labels. Steps and battery use static identifying
  icons; weather uses an actual condition icon rather than a thermometer.
- Added rounded hands, a circular hub and a transparent hollow minute hand,
  including a dim outlined AOD version. Pointer cutouts now have odd widths.
- Mapped all 29 documented Zepp weather codes to original sun/moon/cloud/rain/
  snow/storm/sleet/hail/fog/dust artwork. Missing/invalid data uses a neutral mark.
- Condition source is today's synced forecast, not a guaranteed live condition.
  Verified WEATHER.getForecastWeather, index codes, TIME hour/minute, IMG updates
  and WIDGET_DELEGATE.resume_call against official docs linked in AGENTS.md.
- Build/resume refresh uses no background timer. Sunrise/sunset boundaries select
  moon variants only with valid data; no guessed evening hour is used.
- Host tests pass: all 29 mappings, day/night boundaries, post-sync resume refresh,
  sensor failure fallback, hollow alpha, odd cutouts, geometry and AOD isolation.
- Reviewed awake/AOD preview and artifacts/weather-icons.png. Previews use sample
  data, not a physical-watch capture. Actual sync and wake/resume behavior require
  hardware testing; no on-device verification is claimed.
- PNG output uses atomic replacement so preview readers cannot observe partial
  writes. No filesystem permissions or installed tool internals were changed.
- npm run build passed generation and host tests, then failed during Zeus startup
  with spawnSync cmd.exe EPERM. No 0.5.0 package was produced here. The complete
  current log is artifacts/build.log; build locally before scanning a new preview.

## Typography and layout redesign, version 0.4.0

- Replaced the hand-drawn font with actual installed Segoe UI, rasterized through
  Windows GDI using Python ctypes. No font file or third-party package is bundled.
- Removed the three-column footer and centered date. Date is upper left,
  temperature upper right, steps lower left and battery lower right. Complications
  have small text labels and larger values. The clock has an unobstructed center.
- Tightened the twelve dot markers around the dial; native hand pivots remain
  unchanged relative to the dial center. AOD still contains only hands and dots.
- Glyph and unit dimensions are checked to prevent clipping, including negative
  temperatures, Fahrenheit, five-digit steps and 100% battery.
- The supplied PhoneWorld image URL could not be fetched; this redesign is not
  represented as a match to that image. Awaiting an attached copy for that part.
- Preview images use sample data. No hardware validation is claimed.
- Asset generation and host tests pass for 0.4.0. npm run build fails during
  Zeus startup with the existing spawnSync cmd.exe EPERM error; no 0.4.0 ZAB was
  produced in this session. artifacts/build.log contains the latest output.

## Visual refinement, version 0.3.0

- Refined toward Apple Watch's restrained style using original generated assets:
  rounded numerals, brighter white hands with a stronger hour hand, clearer dots,
  an orange month and center accent, and small colored complication icons.
- Static battery icon is an outline only; native percentage supplies charge.
- AOD remains dim and monochrome with no complications or animation. Layout,
  native data bindings and pointer pivots are unchanged.
- Generated and visually reviewed awake/AOD comparison; host checks pass.
- npm run build passed asset generation and host checks, then failed during
  Zeus startup with spawnSync cmd.exe EPERM. No 0.3.0 package was produced here.
  No device validation is claimed. See build.log for the complete output.

## Still analog redesign, version 0.2.0

- Implemented native hour/minute hands and twelve dots, with muted ivory/sand
  colors awake and dim gray AOD. No seconds; animation is disabled by default.
- Date (month/day), steps, battery percentage and current synced temperature are
  awake-only. Celsius/Fahrenheit and a negative sign have separate native assets.
- Footer readings and date sit outside the complete hand sweep at every time.
- Generated 50 new supersampled analog assets and inspected awake/AOD comparison
  previews. They are illustrative design renders using sample data, not screenshots.
- Host checks pass for both layouts, pivots, sweep clearance, date array lengths,
  metric bindings, negative sign/unit resources, optional health substitutions,
  and strict separation of awake details from AOD.
- npm run build reaches and passes assets/validation, then Zeus fails before
  compilation with the same spawnSync cmd.exe EPERM error. artifacts/build.log
  records the latest attempt. A validated 0.2.0 ZAB has NOT been produced here.
- A pre-existing 0.1.0 Bip_6_Modular ZAB is present under dist, timestamp 21:50.
  It is the earlier digital face, not this redesign; do not use it to evaluate
  the analog face. Run npm run build and zeus preview in your working local shell.
- Still untested on a physical device: weather sync/missing-data behavior, unit
  selection, date rollover, actual hand alignment, and AOD refresh/transitions.
  Weather currently means temperature only, with no invented condition icon.

The following records the earlier scaffold work for context.

## Completed

- Inspected the initially empty workspace and installed tool packages.
- Initialized a source project manually from the official watch face manifest
  documentation and ColorWorld entry-point conventions. Zeus's generator could
  not start; this is not represented as a successfully generated Zeus template.
- Python 3.14.0 generated 46 RGBA PNG resources without external dependencies.
- Visually inspected artifacts/preview.png, which shows the default layout.
- node tools/validate.cjs passed: manifest invariants, resource existence and PNG
  decoding, layout bounds, native health/battery bindings, and separate AOD and
  animation composition. Both layouts and feature flags were exercised with a
  host mock of hmUI. These checks do not validate the real SDK implementation.

## Build attempt

npm run build ran asset generation and host validation successfully, then failed
with exit code 1 during Zeus CLI startup, before compilation:

```text
spawnSync C:\WINDOWS\system32\cmd.exe EPERM
getNodeVersions (.../@zeppos/zeus-cli/modules/version.js:12)
execSync('node -v')
```

Full output: artifacts/build.log. No ZAB package was produced. Zeus create and
zeus --version hit the same startup failure; installed package metadata reports
Zeus CLI 1.10.0 and zpm dependency 3.5.0. Node 26.13.1 and npm 11.20.0 ran.
The environment can launch cmd.exe directly but rejects this nested invocation.

## Outstanding validation and limitations

- Package validity is unconfirmed until a normal zeus build completes. Do not
  distribute this project as a validated watch face.
- No simulator or physical Bip 6 was connected or tested; actual watch firmware
  and JS-SDK version are unknown. The official device table lists maximum API 4.2
  and Zepp OS 5.0; those values do not identify an installed device runtime.
- Missing health data rendering and live native updates require device testing.
  No undocumented missing-value widget property or fabricated sensor value is used.
- Verify 12/24-hour display and localization on a device. This initial clock has
  no AM/PM graphics. Only English metric labels are supplied.
- Verify wake animation restart and stop behavior and AOD transition/refresh on
  hardware. The animation is normal-only, four fps and one cycle; AOD has no
  animation or health metrics.
- Customization is through source configuration followed by a rebuild, not a
  phone settings screen or on-watch editor.
- appId 1000000 is a development placeholder. Replace it with a unique assigned
  ID before distribution.

Next command in a working local shell: npm run build. After a successful build,
use zeus dev with supported simulator resources, then zeus preview and the Zepp
App developer-mode scanner for the manual checks in AGENTS.md.
