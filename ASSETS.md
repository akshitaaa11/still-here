# ASSETS.md

Per-file art status. `ai` = AI-generated stand-in made by `tools/generate_art.py` (safe to regenerate).
`human` = hand-made art; the generator never overwrites it (unless run with `--force`).

**To replace a file:** drop your PNG into `assets/` with the same name and size, then change that row
to `human`. No code changes needed. Strips are 4 equal frames laid out horizontally
(frame width = image width / 4).

| File | Size | Status | Notes |
| --- | --- | --- | --- |
| `moon_buggy.png` | 64x40 | ai | 4-frame strip, 16x40 frames |
| `mars_rover.png` | 56x40 | ai | 4-frame strip, 14x40 frames |
| `mars_rover_asleep.png` | 56x40 | ai | 1 frame, dusty |
| `landing_stage.png` | 96x80 | ai |  |
| `flag.png` | 24x48 | ai |  |
| `science_station.png` | 64x48 | ai |  |
| `laser_mirror.png` | 32x32 | ai |  |
| `rover_sign.png` | 32x24 | ai |  |
| `landing_platform.png` | 96x48 | ai |  |
| `cone.png` | 64x64 | ai |  |
| `parachute.png` | 96x64 | ai |  |
| `heat_shield_a.png` | 64x40 | ai |  |
| `heat_shield_b.png` | 64x40 | ai |  |
| `space_rock.png` | 24x20 | ai |  |
| `sun.png` | 48x48 | ai |  |
| `moon_sky.png` | 480x270 | ai |  |
| `moon_hills.png` | 960x270 | ai | tileable sideways |
| `moon_ground.png` | 480x64 | ai | tileable |
| `mars_sky.png` | 480x270 | ai |  |
| `mars_hills.png` | 960x270 | ai | tileable sideways |
| `mars_ground.png` | 480x64 | ai | tileable |
| `patch_moon.png` | 64x64 | ai |  |
| `patch_mars.png` | 64x64 | ai |  |
| `patch_gold.png` | 64x64 | ai |  |
| `arrow_up.png` | 96x96 | ai |  |
| `arrow_down.png` | 96x96 | ai |  |
| `logo.png` | 240x80 | ai |  |

AI-generated: 27 of 27 files.
