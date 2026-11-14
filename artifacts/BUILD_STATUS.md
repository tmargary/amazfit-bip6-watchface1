# Verification — 2026-11-14

## Temperature headroom and larger icons, version 0.5.5

- User reports a slightly clipped top edge on the on-device Celsius reading.
  Source number/unit glyphs were cropped flush to their top row. Added two fully
  transparent guard rows at top and bottom, with 30 px metric/unit cells and
  matching widgets. Date digits/months also receive guard rows. Visible text
  positions are preserved by adjusting the widget origins for the padding.
- Kept a gap between the weather icon and temperature widget; checked that no
  new icon frame overlaps the reading. This is a source-level clipping fix and
  needs a fresh on-device installation to confirm the reported symptom is gone.
- Enlarged calendar/health/battery icons to 21 x 19 and weather icons to 30 x 26.
  Added a calendar beside the month to give all four corners an icon; hands,
  typography sizes and dial proportions are unchanged.
- Regression checks inspect transparent alpha guard rows on every digit/month/
  unit, widget heights, icon/temperature separation and full hand-sweep clearance.
- Assets regenerated and all host checks passed; reviewed the awake/AOD preview.
  Zeus startup still fails with spawnSync cmd.exe EPERM in this environment, so
  no 0.5.5 package was produced here. The existing dist package is 0.5.4; rebuild
  locally and install from a fresh QR code to verify the clipping fix on hardware.

## Thicker hands/dots and slightly larger information, version 0.5.4

- Increased awake hour blade from 7.2 to 8.4 px, minute outline from 8 to 10 px
  with a 5 px transparent slot, and red needle from 1.5 to 2.2 px. AOD strokes
  were also modestly thickened while preserving the hollow minute and no seconds.
- Dot radii increased slightly: awake 3.6/2.3 px and AOD 2.8/1.9 px. Graphics now
  use 4x supersampling, with unchanged native pointer pivots and lengths.
- Following the user's next adjustment, enlarged readings from 20 to 22 px, date
  numerals from 24 to 26 px, month from 11 to 12 px and icons slightly. The 300 px
  clock remains dominant. Right-hand icons retain alignment with their values.
- Regenerated resources and design previews; these are not device screenshots.
  Hardware confirmation of runtime rendering and rotated-edge appearance remains
  outstanding. Source antialiasing cannot guarantee native rotation filtering.
- Asset generation and host checks passed, including the enlarged text's full
  hand-sweep clearance. Zeus startup still fails with spawnSync cmd.exe EPERM,
  so no 0.5.4 ZAB was produced here. Build locally and generate a fresh preview QR.

## Larger clock, smaller corner information, version 0.5.3

- Enlarged the dot circle from 234 to 300 px diameter (about 28%) and extended
  hour/minute/second hands from 66/96/100 to 86/126/132 px. Updated native pivots
  and generated pointer dimensions together, retaining hollow minute/red seconds.
- Reduced reading type from 24 to 20 px, date numerals from 32 to 24 px and
  month type from 13 to 11 px. Smaller corner icons and new placements keep the
  clock visually dominant. Both awake and AOD previews were regenerated.
- Host checks pass, including complete hand sweep clearance against all corner
  rectangles/icons with a 2 px margin, glyph bounds, unit widths and AOD isolation.
- npm run build passed assets/host tests, then Zeus startup failed with the
  existing spawnSync cmd.exe EPERM error. No 0.5.3 ZAB was produced here.
  Rebuild locally and generate a fresh preview QR. Device testing is outstanding.

## Red awake seconds hand, version 0.5.2

- Added a fine red needle and small circular counterweight using documented
  TIME_POINTER.second_* fields; the circular hub now has a red center pin.
- Python renders the same geometry into actual pointer resources and previews.
  The second hand appears only awake; no second fields are supplied to AOD.
- config.secondHand can disable it. No JS timer or frame animation is used.
- Host checks cover pointer pivots, full sweep clearance and awake/AOD isolation,
  including disabling seconds. Package audit requires the second pointer asset.
- This retains the legacy runtime correction from 0.5.1; that correction still
  requires hardware verification. Previews are design renders, not screenshots.
- Asset generation and host checks passed. Zeus build again failed at startup
  with spawnSync cmd.exe EPERM; no 0.5.2 package was produced here. Build locally
  and scan a fresh preview QR rather than reinstalling the existing 0.5.0 ZAB.

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
