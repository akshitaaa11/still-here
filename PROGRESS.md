# PROGRESS.md

## Current: QA done, SUBMISSION.md written. Next: Phase 6 publish (human: Netlify Drop), demo video, submit.

### Done
- Folder structure from README Section 6 (`src/`, `src/data`, `src/scenes`, `src/ui`, `assets/`, `audio/`, `tools/`).
- `phaser.min.js` = Phaser 3.90.0 (version is noted in `index.html`).
- `index.html` with the Section 15 CSS and meta tags, safe-area padding and context-menu block.
- `src/constants.js`: all Section 8 values plus storm timeline and demo-mode values, as global `K`.
- `src/data/cards.json`: 9 cards, exact IDs, approved short text verbatim. The long text uses the fallbacks for the CHECK items.
- `FACTCHECK.md`: the 4 CHECK items resolved or fallen back, with source URLs.

### Phase 0b done
- `tools/generate_art.py` writes all 27 PNGs listed in README Section 13 into `assets/`. Validated: exact sizes, alpha only 0/255, strips divisible by 4, hills and ground tile with no seam. Reruns are byte-identical, and a `human` row in `ASSETS.md` is skipped unless `--force`.
- `tools/contact_sheet.png` (not shipped) shows every asset at 2x, tiling checks and two in-game-scale previews.
- `ASSETS.md` lists every file as `ai`.

### Phase 1 done
- Plain script files (no modules): `state`, `cards`, `audio` (12 synth sounds + optional MP3 override), `input` (`Controls`), `placeholders` (asset manifest + grey boxes + strip frames = imageWidth / 4), `ui/pixelText`, `ui/fx`, `ui/button`, `ui/silhouette` (`CardArt`), `ui/topBar`, `ui/cardPopup`, `scenes/ChapterBase`, `scenes/BootScene`, `main.js`.
- Tested in headless Chromium (WebGL) with a Phase 1 smoke test, since replaced by `tools/smoke_moon.js`: drive and parallax, release stops, off-canvas release stops, find, stop, card, early and body taps do nothing, Collect, fly to bar, silhouette fill, counter, localStorage save and reload, replay never double-counts, corrupt save, blocked storage, no console errors. Also tested: touch hold and multi-touch, touch tap on Collect, portrait overlay pauses and resumes, and the game playing with every PNG blocked.
- Text is drawn by `PixelText` (system monospace thresholded to hard pixels). Looks crisp but its shape depends on the device font.

### Phase 2 done
- `src/data/chapters.js` holds chapter config (find gaps in seconds, world sprites, intro, bounce fact, ending line). `ui/patchAnim.js` handles the patch drop. `scenes/MoonScene.js`: stars, Earth, "Not to scale", random 4-7 s bounce with a one-time fact line per session, and the parked ending with two other rover silhouettes.
- `ChapterBase.finishChapter(patch)` awards the patch, adds the golden patch on the second one, then shows a Continue button. `leave()` falls back to Home, then the title, for scenes that don't exist yet.
- TestScene was removed. `BootScene.NEXT = 'MoonScene'` until Home exists (Phase 4). Continue after the Moon ending currently returns to the title screen.
- `tools/smoke_moon.js` (normal and `demo`) passes in both modes. Normal run: 187 s from start to the 5th card closed, then about 15 s of ending. All 5 cards collect in order and are saved, about 30 bounces, the patch is saved, reload keeps 5/5, replay doesn't double-count, no console errors.

### Phase 3 done
- `scenes/MarsScene.js`:
  - **Battery:** drains 5/s while driving and charges 12.5/s times the storm multiplier while resting. At 0 it goes to RECHARGING ("Low battery, resting...", input ignored, auto-charges to full, then needs a fresh press).
  - **Sun sparkles** stream to the panel while resting, plus code-drawn pebbles and a 1 px sway.
  - **Storm timeline** (timer driven): "14 years later...", clear 10 s, hazy 15 s, storm 20 s, then a forced sleep. Wind gusts (+25, sweep, "Wind cleaned the panels!") run during hazy and storm.
  - **Ending:** the 7 exact sentences one at a time (auto 3.3 s, tap allowed after 2 s), then the Mars patch, the closing line, and the gold patch if the Moon is done.
- Ending text and other Mars lines live in `src/data/chapters.js`.
- `Controls`: the "press again" block clears on the release event itself (fixed a same-frame re-press). `CardPopup.ready` is a test hook.
- Temporary routing until Phase 4: Boot goes to Mars once the Moon patch is earned and Mars isn't, otherwise to the Moon. After the gold patch, Continue falls back to the title (Album Hall comes in Phase 4).
- `tools/smoke_mars.js` passes in normal and `demo` modes:
  - Battery 0 while driving, during a find, during the storm and during the ending all recover or carry on.
  - The storm ends asleep 48 s after the 4th card both when holding the arrow throughout and when doing nothing.
  - 4 wind gusts. The ending text equals README 9.4 exactly, and taps in a line's first 2 s don't skip it.
  - Patches: moon, mars, gold. No gold without the Moon. No console errors.
- `tools/smoke_moon.js` still passes.

### Phase 4 done
- `HomeScene`: logo, stars, two Mission Cards (float-up, hover/press scale, pulsing "?" silhouettes, counters). Album, Sound and Reset buttons (Reset asks for confirmation). Three patch slots, plus a Certificate button once the gold patch is earned. Boot now goes to Home.
- `AlbumHallScene`:
  - Two shelves with a staggered entrance. A locked card shakes and shows "Find it on the Moon/Mars".
  - Tapping a collected card dims the board (blurs it too on WebGL), and the card flies to the centre with a flip. The detail panel slides in with name, short text, Read more/less (long text in place), a source link (`window.open(url, '_blank', 'noopener')`, hidden if unverified) and the tag.
  - < > and keyboard arrows go to prev/next collected card with a slide. X, Esc or tapping outside sends the card back to its slot.
  - After the gold patch it opens in finale mode with a pulsing Certificate button.
- `CertificateScene`: "Still Here Explorer", three patches, the line, a screenshot hint, Home. Only reachable with both patches.
- Fixed: Phaser picks the top-most tap target using the last frame's render list, and Zones never render, so a Zone always lost to a drawn overlay. All tap targets are now zero-alpha rectangles (`Fx.hitRect`). The Album overlay only closes when nothing else is under the tap.
- Fixed: the 44 CSS px minimum hit size used an inverted scale (hit areas were too big, never too small).
- Fixed: black "?" silhouettes were invisible on near-black slots. Locked slots now have a lighter backing.
- The detail panel always sits beside the card: the canvas is always 480x270 landscape (portrait shows the rotate overlay), so a "narrow" layout can't happen.
- `tools/smoke_album.js` passes: Home counters and patches persist after reload; all 9 cards open with the correct name, short, long and source; Read more/less; the source link opens in a new tab with noopener; locked cards hint; next/prev skip uncollected and wrap; X, Esc and outside close and the card returns to its own slot; mission card starts its chapter; Reset No/Yes; Certificate. No console errors.

### Phase 5 done
- Art: all 27 files still `ai` in `ASSETS.md`, none replaced yet. The generator validation passes. Strips use frame width = image width / 4.
- `tools/smoke_mobile.js` passes on 640x360 (DPR 3), iPhone 13 landscape and Pixel 5 landscape:
  - Page setup: viewport meta blocks zoom; body has touch-action none, user-select none, overflow hidden; the canvas fits at 16:9.
  - Audio: none before the first tap, running after it.
  - Tap targets are all at least 44 CSS px.
  - Page gestures: swipe doesn't scroll or zoom; long-press and text selection are blocked.
  - Touch control: thumb hold drives; sliding off and lifting stops; touchcancel releases.
  - Tab hidden suspends audio and resumes it; portrait shows the overlay and pauses, landscape resumes.
  - Collect works by touch, X closes the album detail by touch. No console errors (strict).
- Fixed in Phase 5:
  - Buttons kept listening to resize after their scene ended, which crashed on phone rotation.
  - The canvas stayed portrait-sized after rotating back (refit on rotation, plus a delayed second refit).
  - The Mars intro text overlapped the Sun.
  - "Not to scale" contrast.
  - Optional MP3s are now listed in `audio/sounds.json` (`tools/list_audio.py`), so a fresh copy makes zero 404 console errors.
- Robustness: the game plays (Home, both chapters, card, Album Hall) with every PNG blocked (grey boxes), no errors.
- `?demo=1`: finds 4 s apart, storm about 13 s (`DEMO_*` in constants). Only active with the URL flag.
- All suites pass: `smoke_moon.js` (demo), `smoke_mars.js` (demo), `smoke_album.js`, `smoke_mobile.js`. Normal-speed Moon and Mars runs passed in Phases 2 and 3.

### Known issues / for the human
- The session network blocked the source sites, so the facts are checked from search summaries only (see `FACTCHECK.md`). Please click every source link once before submission.
- CHECK items 1, 2 and 3 use the fallback wording.
- `cards.json` has an extra optional `sprite2` field for the two-piece cards (`cone_parachute`, `heat_shield`).
- README says "31 files" but its table lists 27. All 27 are generated.
- **Strip scale problem:** the contract sizes make each moon_buggy frame 16x40 and each mars_rover frame 14x40, while mars_rover_asleep is a single 56x40 frame. The awake rovers are therefore tiny next to the asleep one. If bigger rovers are wanted, change the strips to 256x40 and 224x40. The code reads frame width as imageWidth / 4, so no code change is needed, but the generator would need a bigger drawing.
- Optional MP3 override tries `audio/<name>.mp3` for each sound. Missing files give harmless 404 lines in the network log (no JS errors).
- Not tested here: real phones (iOS audio unlock, Android Chrome) and real audio output. Synth sounds were only checked to run without errors. Listen to them on a phone.
- The awake Mars rover shows at 3x (42 px wide) and the asleep art at 1x (56 px), because of the strip-size contract.
- Not testable here: real iOS Safari and Android Chrome hardware, actual sound output, real MP3 overrides (none exist yet), safe-area insets on notched phones (CSS env() is in place).
- Chrome may log "Ignored attempt to cancel a touchcancel event" when the OS cancels a touch. That's a browser intervention notice from Phaser's touch capture, not an error in our code.
- In some device monospace fonts, the digit 0 has a slash or dot.

### README Section 17 QA (final run)
Tools: `tools/qa_full.js` (one continuous playthrough Boot to Certificate, normal speed and `demo`), `smoke_moon.js`, `smoke_mars.js`, `smoke_album.js`, `smoke_mobile.js`. All pass on the final code.

| Item | Result |
| --- | --- |
| Loading, tap, Home, sound after tap | PASS (AudioContext running after tap; phones emulated) |
| Moon: 5 finds, 5 cards, ending, patch | PASS |
| Mars: 4 finds, battery, low-battery pause, storm, exact ending text, patch | PASS (storm 48 s) |
| Both patches, golden patch, Album Hall, Certificate | PASS |
| Album Hall: all 9 cards, Read more, source link, prev/next, close methods | PASS |
| Reload mid-progress restores counters, silhouettes, patches | PASS |
| Reset with confirm | PASS |
| Mute persists | PASS |
| localStorage disabled: game still runs | PASS (storage getter throws, play continues in memory) |
| Every PNG missing: still playable | PASS |
| Every MP3 missing: synth plays | PASS (runs without errors; audible output not checkable here) |
| Hold arrow during card: no movement, no stuck input | PASS |
| Release finger off button: rover stops | PASS (touch emulation) |
| Tab hidden/visible: no stuck loops, no time jump | PASS (audio suspends and resumes; loops stop on scene change; dt capped at 50 ms) |
| No Mars soft-lock (0 battery during find, storm, ending) | PASS |
| No console errors in a full playthrough | PASS (strict, normal speed) |
| Android Chrome / iOS Safari / laptop Chrome | Emulated only (Pixel 5, iPhone 13, 640x360) plus desktop Chromium. Real devices not tested |
| Portrait overlay + pause | PASS |
| No pinch zoom, scroll, long-press | PASS (emulated) |
| Text readable on a small phone | PASS (640x360 screenshots reviewed) |
| Card text matches Section 12 exactly | PASS: 9/9 short verbatim. Long text verbatim except the README's own CHECK notes and the 3 fallbacks |
| Every shown source link opens correctly | NOT VERIFIED: sandbox cannot reach the sites. Link wiring tested (opens the URL in a new tab with noopener) |
| No "dumped"/"littered", no NASA logo | PASS (grep over game files and SUBMISSION.md; art has no marks) |
| 4 CHECK items resolved or fallback | PASS (see FACTCHECK.md) |

Fixed during QA: the find glow flickered at 5 Hz (over the 3 Hz kid-safety limit). It is now one 0.6 s pulse.
Full play time for a real player is about 7-8 minutes (Moon about 3.5, Mars about 4 including rests, storm and ending). That's a bit over the README's "about 6".
