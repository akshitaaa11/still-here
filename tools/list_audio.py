#!/usr/bin/env python3
"""Rebuild audio/sounds.json from the MP3s in audio/ (README Section 14).

Drop e.g. audio/collect.mp3 into the folder, run `python3 tools/list_audio.py`, done.
Only the 12 known sound names are listed; anything else is ignored.
"""
import json
import os

NAMES = ['ui_tap', 'drive_loop', 'bounce', 'sparkle', 'card_open', 'collect', 'jingle_progress',
         'charge_loop', 'wind', 'storm_loop', 'patch_fanfare', 'album_whoosh']
root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'audio')
found = [n for n in NAMES if os.path.isfile(os.path.join(root, n + '.mp3'))]
with open(os.path.join(root, 'sounds.json'), 'w') as f:
    json.dump(found, f)
print('audio/sounds.json ->', found or 'no MP3s (synth sounds for everything)')
