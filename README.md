# Bip 6 Still

Minimal analog watch face with crisp white hands, twelve dots and a black canvas.
On wake, date and temperature occupy the upper corners; steps and battery occupy
the lower corners. AOD shows only dim hands and dots. No second hand or
default animation. The date and readings stay outside the hands' full sweep.

The refined visual style uses real Segoe UI numerals, an orange month/center accent,
and icon-only complications. Rounded hands have a circular hub and transparent
hollow minute blade. AOD stays dim and monochrome.

Python generates antialiased assets; JavaScript uses documented native Zepp watch
face bindings. No Python dependencies or runtime npm libraries. Typography is
rasterized from installed Segoe UI using Windows GDI; regeneration requires
Windows and that font. Font files are not bundled.

```powershell
python tools/generate_assets.py
node tools/validate.cjs
npm run build
npm run audit:package
```

Change watchface/config.js to select minimal or airy, reorder the three readings,
or disable date/AOD. HEART and CAL can replace a reading. Rebuild after changes.
This is not on-watch customization. Animation remains available but off by default.

See artifacts/preview-comparison.png for awake (left) and AOD (right). Sample
preview data is illustrative; the watch uses its native current time and data.
Temperature uses Celsius/Fahrenheit unit assets. Weather condition icons include
sun, moon, clouds, rain, snow, storms and more, mapped from today's documented
Zepp forecast code. They refresh when the face resumes. Valid sunrise/sunset
data selects moon variants at night; missing weather shows a neutral unavailable
mark. Availability and freshness depend on Zepp synchronization, not live sensing.
See artifacts/weather-icons.png for the generated icon set.

Use zeus dev for a supported simulator and zeus preview for Zepp developer-mode
installation. Replace the development app ID before distribution. AOD must also
be enabled in the watch's Display settings.

If you installed 0.5.0 and saw a black screen, rebuild 0.5.1 and generate a fresh
preview QR code. 0.5.1 corrects the legacy runtime selection and logs rendering
stages/errors. The device API ceiling (4.2) is separate from this watch face's
legacy API requirement (1.0). Actual ZAB resources and version are checked by
audit:package; preview PNGs alone do not demonstrate runtime rendering.

See AGENTS.md for verified capabilities, official sources, conventions and the
device test checklist. See artifacts/BUILD_STATUS.md for build limitations.
