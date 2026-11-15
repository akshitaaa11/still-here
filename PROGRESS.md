# PROGRESS.md

## Current: Phase 2 complete (Moon chapter). Stopped as instructed.

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

### Next: Phase 3 (Mars chapter)

### Known issues / for the human
- The session network blocked the source sites, so the facts are checked from search summaries only (see `FACTCHECK.md`). Please click every source link once before submission.
- CHECK items 1, 2 and 3 use the fallback wording.
- `cards.json` has an extra optional `sprite2` field for the two-piece cards (`cone_parachute`, `heat_shield`).
- README says "31 files" but its table lists 27. All 27 are generated.
- **Strip scale problem:** the contract sizes make each moon_buggy frame 16x40 and each mars_rover frame 14x40, while mars_rover_asleep is a single 56x40 frame. The awake rovers are therefore tiny next to the asleep one. If bigger rovers are wanted, change the strips to 256x40 and 224x40. The code reads frame width as imageWidth / 4, so no code change is needed, but the generator would need a bigger drawing.
- Optional MP3 override tries `audio/<name>.mp3` for each sound. Missing files give harmless 404 lines in the network log (no JS errors).
- Not tested here: real phones (iOS audio unlock, Android Chrome) and real audio output. Synth sounds were only checked to run without errors. Listen to them on a phone.
