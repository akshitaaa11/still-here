# Sounds

Every sound is synthesised in the browser, so this folder can stay empty.

To use your own sound instead of a synth one:
1. Save it here as `<name>.mp3`. Names: `ui_tap`, `drive_loop`, `bounce`, `sparkle`, `card_open`,
   `collect`, `jingle_progress`, `charge_loop`, `wind`, `storm_loop`, `patch_fanfare`, `album_whoosh`.
2. Run `python3 tools/list_audio.py` (it updates `sounds.json`), or add the name to `sounds.json` by hand.

Only names listed in `sounds.json` are fetched, so a missing file never causes a 404 error in the console.
A file that fails to load or decode quietly falls back to the synth sound.
