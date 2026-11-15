# Still Here

> *NASA gave this rover 90 days. It lasted 14 years. Meet the things NASA left behind, and the ones that are still here.*

**NASA Space Apps Challenge 2026 · Challenge: "Abandoned but not Forgotten" · Solo entry**
**Hard deadline: 15 Nov 2026, 11:59 PM IST. Personal submit-by: 10:30 PM IST.**

"Still Here" is a free, kid-friendly pixel game that runs in any browser (PC and phone). The player drives a rover with **one right-arrow button**.

- **Chapter 1, Moon:** drive the Apollo 15 Lunar Rover and find 5 pieces of hardware the astronauts left behind.
- **Chapter 2, Mars:** drive the Opportunity rover, find 4 pieces of landing hardware, then watch a dust storm put Opportunity to sleep after about 14 years.
- Each find opens a short, simple card (what it did, why it mattered). All 9 cards go into an album.
- The finale is the **Album Hall**: tap any card, it flies to the centre, and the player can read more.

**Tone:** warm and curious. Never "NASA littered" or "dumped". Theme: *left behind, still working, never forgotten.*
**Audience:** school-age kids and anyone with a phone.
**Target awards:** Best Storytelling, Most Inspirational, Best Use of Science.

---

## Table of contents

1. [How to use this README (for the AI builder)](#1-how-to-use-this-readme-for-the-ai-builder)
2. [Judging criteria mapping](#2-judging-criteria-mapping)
3. [Scope: must-have vs cuttable](#3-scope-must-have-vs-cuttable)
4. [Tech stack and constraints](#4-tech-stack-and-constraints)
5. [Architecture](#5-architecture)
6. [Folder structure](#6-folder-structure)
7. [Data model: `cards.json` and save state](#7-data-model)
8. [Game constants (tunable)](#8-game-constants)
9. [Scene specifications](#9-scene-specifications)
10. [Shared systems](#10-shared-systems)
11. [Animation specs](#11-animation-specs)
12. [Card content (approved text)](#12-card-content)
13. [Art asset contract](#13-art-asset-contract)
14. [Sound contract](#14-sound-contract)
15. [Mobile, scaling and input](#15-mobile-scaling-and-input)
16. [Build phases (step by step)](#16-build-phases)
17. [Testing and QA checklist](#17-testing-and-qa-checklist)
18. [Deployment](#18-deployment)
19. [Submission pack](#19-submission-pack)
20. [Demo video, reel and LinkedIn](#20-demo-video-reel-and-linkedin)
21. [Risks and rules](#21-risks-and-rules)
22. [Sources](#22-sources)
23. [Open assumptions](#23-open-assumptions)

---

## 1. How to use this README (for the AI builder)

- This file is the **single source of truth**. Read it fully, then read `CLAUDE.md` for working rules.
- Work through [Section 16](#16-build-phases) **in order**. Each phase has a goal, tasks and a **Definition of Done (DoD)**. Do not start a phase until the previous DoD passes.
- **Art plan (updated):** Akshita will draw the final pixel art later. For now **the AI generates every image** (Section 13.2) and writes it into `assets/` using the exact file names in [Section 13](#13-art-asset-contract). Akshita later overwrites those files with her own PNGs of the same name and size, **with zero code changes**. The code must also still run if any file is missing (grey-box fallback).
- Time is very limited (one day). When behind, cut in this order: certificate, Read more text, Album Hall slide between cards, wind boost, sounds. **Never cut:** both chapters, all 9 cards, the collect animation.
- Do not invent facts. Card text is fixed in [Section 12](#12-card-content). Items marked **CHECK** must be verified against the sources in [Section 22](#22-sources) before they ship; if they cannot be verified, use the safe fallback wording given.

---

## 2. Judging criteria mapping

| Criterion | How the game answers it |
| --- | --- |
| Creativity | You drive the real rover and discover the hardware along the way |
| Validity | Every fact is on a card with a source link |
| Relevance | Answers the challenge text directly: tell the story of the hardware to school-age enthusiasts |
| Presentation | Hand-made pixel art, smooth animations, plays in about 6 minutes |
| Influence | One link, no download, easy to share |

---

## 3. Scope: must-have vs cuttable

**Must-have (never cut)**
- Loading screen with tap-to-start (unlocks audio)
- Homepage with two Mission Cards, counters, silhouettes
- Moon chapter: 5 finds. Mars chapter: 4 finds, battery mechanic, storm ending
- Find → card → Collect animation for all 9 finds
- Album with 9 cards, saved progress
- Album Hall with tap-to-focus and detail panel
- Public hosted link that works on phone and laptop

**Cut order if behind:** 1) Certificate 2) Read more text 3) Album Hall previous/next slide 4) Wind-cleaning boost 5) Sounds

---

## 4. Tech and constraints

| Item | Decision |
| --- | --- |
| Engine | **Phaser 3** (local file `phaser.min.js`, no CDN dependency at runtime) |
| Language | Plain JavaScript (ES modules or plain script tags, no TypeScript) |
| Build tools | **None.** No bundler, no framework. Static files only |
| Base resolution | **480×270** (16:9), pixel-art mode, FIT scaling, centred |
| Platforms | Desktop Chrome/Firefox/Safari; mobile Chrome (Android) and Safari (iOS), **landscape** |
| Hosting | Netlify Drop or GitHub Pages (static) |
| Persistence | `localStorage` key `stillHere` |
| Network | Game must work fully offline after load. No analytics, no external calls (source links are plain anchors only) |
| Licence/branding | No NASA logos or branding anywhere |

**Getting Phaser:** `npm install phaser@3` in a scratch directory, copy `node_modules/phaser/dist/phaser.min.js` into the project root, then delete the scratch directory. Pin the version used in a comment at the top of `index.html`.

**Local server:** browsers block asset loading from `file://`. Use `npx serve .` or `python3 -m http.server 8080` from the project root.

---

## 5. Architecture

### 5.1 High-level

```
index.html
  └─ phaser.min.js
  └─ src/main.js  ──► Phaser.Game config (480x270, FIT, pixelArt, scenes[])
                          │
   ┌──────────────────────┼─────────────────────────────────────────────┐
   │ Scenes               │ Shared (not scenes)                          │
   │ BootScene            │ state.js    save/load/reset, in-memory store │
   │ HomeScene            │ cards.js    loads cards.json, lookup by id   │
   │ MoonScene            │ audio.js    named sounds, synth fallback     │
   │ MarsScene            │ input.js    unified hold-to-move control     │
   │ AlbumHallScene       │ ui/cardPopup.js   find-card + collect anim   │
   │ CertificateScene     │ ui/topBar.js      silhouettes + counter      │
   │ (RotateOverlay=DOM)  │ ui/silhouette.js  black "?" generator        │
   │                      │ ui/button.js      squish buttons             │
   │                      │ placeholders.js   generate missing textures  │
   └──────────────────────┴─────────────────────────────────────────────┘
```

### 5.2 Scene flow

```
Boot ──tap──► Home ──► MoonScene ──(5/5)──► Moon end ──► Home
                  ├──► MarsScene ──(4/4 + storm)──► Mars end ──► Home
                  ├──► AlbumHallScene (from Album button, or after a patch)
                  └──► CertificateScene (when moon AND mars patches earned)
```

After the **second** patch is earned, route: chapter end → patch animation → golden "Still Here" patch → AlbumHallScene (finale) → Certificate (if not cut).

### 5.3 Core data flow for one find

```
Rover x reaches find.triggerX
  → chapter scene sets state = "FINDING", stops rover
  → scene emits 'find' {cardId}
  → cardPopup.show(cardId) runs find animation, waits for Collect tap
  → cardPopup.collect() runs collect animation toward topBar slot[index]
  → state.collect(cardId) → saves to localStorage
  → topBar.fill(index) + counter tick
  → scene resumes (state = "DRIVING") or begins chapter end if last
```

### 5.4 Rover state machine (both chapters)

```
IDLE ── arrow down ──► DRIVING ── arrow up ──► IDLE
DRIVING ── reach find ──► FINDING (input ignored) ── collect done ──► IDLE
Mars only: DRIVING ── battery==0 ──► RECHARGING (input ignored until full) ──► IDLE
Mars only: after 4th collect ──► STORM (scripted, see 9.4)
```

### 5.5 Design principles

- **Data-driven:** all finds, card text, positions, and sources live in `src/data/cards.json` and a per-chapter config. Scenes contain no hard-coded card text.
- **Placeholder-first:** `placeholders.js` generates a coloured, labelled texture for any asset key whose PNG fails to load, at the exact specified size.
- **Single input abstraction:** `input.js` exposes `isHeld()` (bool) combining Right Arrow, D, on-screen arrow button pointer-down/up, and multi-touch safety.
- **No game over, ever.**
- **Kid-safe:** no text smaller than the readable minimum, no flashing faster than 3 Hz.

---

## 6. Folder structure

```
still-here/
  index.html
  phaser.min.js
  README.md
  CLAUDE.md
  src/
    main.js                 Phaser config, scene list, DOM rotate overlay hook
    constants.js            All tunables from Section 8
    state.js                save/load/reset
    cards.js                cards.json loader and helpers
    audio.js                named sounds + synth fallback + mute
    input.js                hold-to-move abstraction + on-screen arrow
    placeholders.js         texture generation for missing assets
    data/
      cards.json            9 cards (Section 7)
    scenes/
      BootScene.js
      HomeScene.js
      MoonScene.js
      MarsScene.js
      AlbumHallScene.js
      CertificateScene.js
    ui/
      cardPopup.js
      topBar.js
      silhouette.js
      button.js
      patchAnim.js
  assets/                   the PNGs the game loads, exact names from Section 13
                            (AI-generated stand-ins now; Akshita's art replaces them later)
  audio/                    optional MP3s, exact names from Section 14
  tools/
    generate_art.py         procedural pixel-art generator (Section 13.2)
  ASSETS.md                 per-file status table: AI-generated vs human-made
```

---

## 7. Data model

### 7.1 `src/data/cards.json`

```json
[
  {
    "id": "landing_stage",
    "chapter": "moon",
    "order": 1,
    "name": "Landing Stage",
    "sprite": "landing_stage",
    "short": "<approved short text>",
    "long": "<approved read-more text>",
    "sourceLabel": "NASA: Apollo's Lunar Leftovers",
    "sourceUrl": "<fill from Section 22>",
    "verified": true
  }
]
```

IDs (fixed): `landing_stage`, `flag`, `science_station`, `laser_mirror`, `rover_sign` (moon); `landing_platform`, `cone_parachute`, `heat_shield`, `space_rock` (mars).

Card pictures: reuse world sprites. `cone_parachute` shows `cone` and `parachute` side by side; `heat_shield` shows `heat_shield_a` and `heat_shield_b`.

If a `sourceUrl` cannot be confirmed, leave it empty and set `"verified": false`; the UI then hides the link instead of showing a wrong one. Report these in the final handoff.

### 7.2 Save state (`localStorage` key `stillHere`)

```json
{
  "moon": ["landing_stage", "flag"],
  "mars": [],
  "patches": ["moon"],
  "sound": true,
  "version": 1
}
```

- Loading must tolerate missing/corrupt JSON (fall back to defaults, never crash).
- Wrap every `localStorage` call in try/catch (private mode can throw). Fall back to in-memory state.
- Settings menu has a **Reset** button (with a confirm step).

---

## 8. Game constants

Put all in `src/constants.js`. Values are starting points; tune by feel.

| Constant | Value | Notes |
| --- | --- | --- |
| `GAME_W`, `GAME_H` | 480, 270 | |
| `ROVER_SCREEN_X` | 140 | Rover stays here, world scrolls |
| `DRIVE_SPEED` | 60 px/s | Both chapters |
| `FIND_SPACING_SEC` | 30–35 s of driving | Distance = speed × time (about 1800–2100 px) |
| `PARALLAX_SKY` | 0.0 | fixed |
| `PARALLAX_HILLS` | 0.25 | |
| `PARALLAX_GROUND` | 1.0 | |
| `MOON_BOUNCE_EVERY` | 4–7 s random while driving | small vertical hop, about 6 px |
| `BATTERY_DRAIN_PER_SEC` | 5 | full to empty in about 20 s of driving |
| `BATTERY_CHARGE_PER_SEC` | 12.5 | empty to full in about 8 s of rest |
| `CHARGE_MULT_CLEAR` | 1.0 | storm phase |
| `CHARGE_MULT_HAZY` | 0.5 | |
| `CHARGE_MULT_STORM` | 0.15 | |
| `WIND_INTERVAL_SEC` | random 6–12 | |
| `WIND_BOOST` | +25 battery | with sweep animation |
| `INTRO_CARD_SEC` | 3 | |
| `MIN_FONT_PX` | 8 game px (renders about 16+ screen px on phones) | Bitmap or crisp font; test on small phone |

Animation timings are in [Section 11](#11-animation-specs).

---

## 9. Scene specifications

### 9.1 BootScene (Loading)

- Show pixel Sun (`sun`, pulsing) and rover icon, a progress bar, then **"Tap to start"**.
- Load all assets in `assets/` with the exact keys from Section 13. Handle `loaderror` per file: record the key, and after load generate placeholders for those keys.
- Load `cards.json`.
- On tap: resume the Web Audio context (`audio.unlock()`), then go to Home. This tap is what unlocks sound on phones.
- Attempt to load each optional MP3 in `audio/`; failures are silent (synth fallback).

### 9.2 HomeScene

- Starry sky (twinkling stars generated in code), `logo`.
- Two **Mission Cards** side by side:
  - **Moon Mission:** "Find the 5 things the astronauts left behind!" Five black "?" silhouettes, counter "n / 5".
  - **Mars Mission:** "Find the 4 things left behind on Mars!" Four silhouettes, counter "n / 4".
  - Both open from the start. Collected items show the real picture instead of black silhouette.
- Under cards: **Album** button, **Sound on/off** button, a **Settings/Reset** button, and three patch slots (Moon Patch, Mars Patch, golden Still Here Patch). Earned patches show `patch_*`; unearned show dim empty slots.
- Cards float up with stagger on entry; hover/press scale; silhouettes pulse gently.
- Tapping a Mission Card starts the chapter (with a quick fade).
- If a chapter is already complete, tapping it replays it (finds already collected still show the card again but do not double-count).

### 9.3 MoonScene

- **Look:** `moon_sky` (fixed), `moon_hills` (parallax, tileable), `moon_ground` (tileable). Earth drawn low in the sky in code (small circle; label "Not to scale" in a corner).
- **Intro:** "You are driving the Apollo 15 rover. Hold the arrow to drive!" fades in/out over 3 s.
- **Player:** `moon_buggy` 4-frame strip; wheel animation plays only while driving.
- **Bounce:** while driving, at random intervals the buggy hops about 6 px (`bounce` sound). After the **first** bounce ever in the session, show a tiny fact line: *"Real rover wheels sometimes left the ground in low gravity."* (show once).
- **Top bar:** 5 silhouettes, "0 / 5". Never combined with Mars.
- **Finds (in order, each about 30–35 s of driving apart):**
  1. `landing_stage`
  2. `flag`
  3. `science_station`
  4. `laser_mirror`
  5. `rover_sign`
- **Find trigger:** when the rover's world x reaches the item's x minus a small offset, the rover decelerates to stop (0.5 s), then the find animation plays.
- **Ending (after the 5th collect):** rover slows and parks. Two other rover silhouettes appear beside it (three rovers stayed on the Moon). Text: **"You parked it. It is still there."** Then Moon Patch animation. Then return to Home (or Album Hall if both patches now earned).
- Do **not** add: Backpack Air, a walk-home line, or a rock-sample stop.

### 9.4 MarsScene

- **Look:** `mars_sky`, `sun` (large, corner), `mars_hills`, `mars_ground`; small rocks and ripples generated in code on the ground layer.
- **Intro:** short line (e.g. "You are driving Opportunity. Hold the arrow to drive. Let go to rest and charge.").
- **Player:** `mars_rover` 4-frame strip with a tiny sway; `mars_rover_asleep` used in the ending.
- **Battery mechanic (only mechanic):**
  - Battery bar beside the progress bar.
  - Arrow held: drive, drain at `BATTERY_DRAIN_PER_SEC`.
  - Arrow released: rest; golden sparkles stream from the Sun to the solar panel (particles in code), battery fills at `BATTERY_CHARGE_PER_SEC` times current storm multiplier.
  - Battery at 0: rover pauses, "Low battery, resting...", auto-recharge to full, then control returns. **No game over.**
  - No GO or REST buttons. The single arrow does both jobs.
- **Finds (in order):**
  1. `landing_platform` (Eagle Crater)
  2. `cone_parachute` (world shows both `cone` and `parachute` sprites near each other)
  3. `heat_shield` (world shows `heat_shield_a` and `heat_shield_b`)
  4. `space_rock`
- **Storm phase (starts after the 4th collect). Scripted timeline, about 45 s total:**
  1. "14 years later..." card fades in and out (about 3 s).
  2. **Clear** (about 10 s): bright sky, charge multiplier 1.0.
  3. **Hazy** (about 15 s): sky tint turns dusty, multiplier 0.5, dust particles begin.
  4. **Storm** (about 20 s): sky dark orange-brown, multiplier 0.15, heavy dust particles, `storm_loop`.
  5. **Wind cleans your panels:** random every 6–12 s, a gust sweeps the panel, battery +25 with a small animation and `wind` sound. (Cuttable.)
  6. The storm cannot be beaten. At the end of the timeline, the battery is forced down regardless of player action, the rover switches to `mars_rover_asleep`, sparkles stop, and the screen dims gently.
  - **No dust-opacity numbers anywhere in the gameplay or UI.**
- **Fixed ending text (verbatim):**
  *Opportunity was built to last 90 Mars days. It lasted about 14 and a half years. In June 2018 a giant dust storm covered the sky. Its last message reached Earth on 10 June 2018. NASA sent over 1,000 commands. Opportunity did not answer. Opportunity fell asleep.*
  Shown as short lines appearing one after another (tap or auto-advance, never skippable by accident within the first 2 s).
- Then Mars Patch animation and the closing line: **"It is still there. Still here."**

### 9.5 AlbumHallScene (finale; also from Home's Album button)

- Starry board with two shelves: **Moon (5)** and **Mars (4)**; each card is a small framed picture with its name below.
- Entrance: cards float in one after another with a small stagger.
- Uncollected cards: black "?" silhouette. Tap → small shake + hint "Find it on the Moon" / "Find it on Mars".
- **Tap a collected card:**
  1. All other cards dim and blur.
  2. The tapped card lifts off its slot, grows, flies to screen centre with a small flip (about 0.5 s, `album_whoosh`).
  3. A detail panel slides in beside (landscape) or below (narrow) the card.
- **Detail panel contents:** large picture, name, short paragraph, **Read more** button (expands the long story in place), source link (opens in a new tab with `rel="noopener"`), and a tag: "Found on the Moon" / "Found on Mars".
- **Navigation:** left/right arrow buttons plus keyboard arrows go to previous/next collected card with a slide animation. **X**, **Esc**, or tapping outside sends the card flying back to its slot while the board un-dims.
- Back button returns to Home.

### 9.6 CertificateScene

- Shown only when both patches are earned (and the golden patch is awarded).
- Simple, printable-looking screen: "Still Here Explorer", the three patches, a line "You met everything that was left behind." No NASA logos. Optional: a "Screenshot this to keep it" hint. First thing to cut if behind.

### 9.7 Rotate overlay

- A DOM overlay (not a Phaser scene) shown when `window.innerHeight > window.innerWidth` on touch devices: rocking phone icon and "Rotate your phone". Game pauses while shown.

---

## 10. Shared systems

### 10.1 `cardPopup`
Single reusable module for both chapters. API:
```js
cardPopup.show(scene, cardId, { slotIndex }) -> Promise  // resolves after Collect animation ends
```
Handles overlay, card build (picture, name, short text staged reveal), pulsing Collect button, fly-to-bar animation, silhouette fill hook. **Only the Collect button collects; tapping elsewhere on the card does nothing.** The Collect button should become tappable only after the text reveal finishes (about 1.2 s) so kids do not skip the text by accident.

### 10.2 `topBar`
Draws N silhouettes (generated in code from the sprite's alpha mask, filled black with a "?"), counter text, and (Mars only) the battery bar. API: `fill(index)`, `setCounter(n,total)`, `getSlotPosition(index)` (used as the collect animation's target).

### 10.3 `state`
`load()`, `save()`, `collect(cardId)`, `has(cardId)`, `countChapter(ch)`, `awardPatch(name)`, `reset()`. Collecting an already-owned card must be idempotent.

### 10.4 `audio`
See [Section 14](#14-sound-contract). API: `play(name)`, `loop(name)`, `stop(name)`, `setMuted(bool)`, `unlock()`. Mute persists in save state.

### 10.5 `input`
`isHeld()` true when: Right Arrow or D key down, or on-screen arrow pressed by pointer/touch. Releasing a pointer outside the button must still release (listen on pointer up/cancel globally). Disable context menu and text selection on the canvas.

### 10.6 `button`
Reusable button with squish (scale 0.92 for 0.15 s), `ui_tap` sound, and min touch target of 44 CSS px after scaling.

---

## 11. Animation specs

### 11.1 Find (each of 9 finds)

| Step | What the player sees | Time |
| --- | --- | --- |
| 1 | Rover slows and stops by itself near the item | 0.5 s |
| 2 | Item glows and sparkles; short "ding" (`sparkle`) | 0.6 s |
| 3 | Soft dark overlay fades in behind the card | 0.3 s |
| 4 | Card slides up from bottom with gentle overshoot (`card_open`) | 0.5 s |
| 5 | Picture pops in, then name, then text lines one after another | 1.2 s total |
| 6 | "Collect it!" button pulses softly | loops |

### 11.2 Collect

| Step | What the player sees | Time |
| --- | --- | --- |
| 1 | Tap "Collect it!": button squishes | 0.15 s |
| 2 | Card shrinks and flies in an arc to the top bar, trailing sparkles (`collect`) | 0.7 s |
| 3 | Matching silhouette flips and fills with real picture, small flash | 0.4 s |
| 4 | Counter ticks up (e.g. 1 / 5) with jingle (`jingle_progress`) | 0.3 s |
| 5 | Overlay fades out; arrow button glows to say "keep going" | 0.3 s |

### 11.3 Chapter complete
Last silhouette fills, short fanfare (`patch_fanfare`). The patch drops in from above, spins once, lands with a sparkle. On the **second** patch, the golden "Still Here" patch appears and the certificate unlocks.

### 11.4 Other motion list
Loading: Sun pulses, bar fills. Home: star twinkle, card float-up stagger, hover/press scale, silhouette pulse. Rover: wheels turn only while held; Moon bounce; Mars sway. Parallax layers. Mars: sparkles Sun→panel while resting, battery fill, hazy→storm tint, dust particles, wind sweep. UI: all buttons squish; screen changes use a quick fade (about 0.25 s). Portrait: rotate icon rocks.

### 11.5 Album Hall
Staggered entrance; dim+blur on selection; card lift and fly-to-centre with flip (about 0.5 s); detail panel slide (about 0.3 s); previous/next slide; fly-back on close. For blur, use a Phaser camera/postFX blur if available, otherwise a dark semi-transparent overlay (acceptable fallback).

---

## 12. Card content

Approved text. **Use exactly this.** Do not add facts.

### Moon

1. **Landing Stage:** This is the bottom half of the Moon lander. Its engine helped the astronauts land softly, and then it became the launch pad for the trip home. The top half blasted off, and this part stayed on the Moon.
2. **Flag:** The astronauts planted a flag at every landing site to show where people had stood on the Moon. There is no wind up there, so nothing blows it around.
3. **Science Station:** A box of science tools that the astronauts set up on the ground and left running. It kept sending Moon facts to Earth long after they went home, and it could even feel moonquakes.
4. **Laser Mirror:** A mirror that bounces laser light straight back to where it came from. Scientists on Earth use it to measure how far away the Moon is. It still works, and it shows the Moon moving away from us by 3.8 centimetres every year.
5. **The Rover's Sign:** A sign on the rover says these were the first wheels on the Moon. The rover let the astronauts explore much farther than they could on foot. It is your buggy, and it is still parked there.

### Mars

6. **Landing Platform:** This is the platform Opportunity landed on in 2004. It carried the rover down, and then the rover rolled off to explore. Spacecraft circling Mars can still see it today.
7. **Cone and Parachute:** The cone protected the rover on its long trip, and the parachute slowed it down for landing. Each piece had one job and had to work the first time. Then they stayed behind.
8. **Heat Shield:** The spacecraft got very hot as it fell through the sky of Mars, and this shield took the heat so the rover wouldn't burn up. Years later, Opportunity drove over to look at its own heat shield.
9. **The Space Rock:** A basketball-sized rock made of iron and nickel, found next to the heat shield. Scientists think it came from space, which makes it a space rock found on another planet!

### Read more (Album Hall detail only; 3 to 4 short sentences each)

1. **Landing Stage:** The Apollo lander had two parts. The bottom "descent stage" had the landing engine and the legs. When the astronauts left, the bottom part stayed as a launch pad for the top part. This happened at every landing site.
2. **Flag:** Flags were planted at the Apollo landing sites, and some sites also have plaques left behind. They are small signs saying people were there.
3. **Science Station:** Five Apollo missions (12, 14, 15, 16 and 17) set up a science station called ALSEP. It ran on its own and sent data to Earth by radio. **CHECK:** verify exactly what Apollo 15's instruments measured before listing any. *Fallback: ship without listing instruments.*
4. **Laser Mirror:** Apollo 11, 14 and 15 left laser mirrors on the Moon, and they still work today. Scientists send a laser pulse and time how long it takes to come back. That is how we know the Moon drifts away by about 3.8 cm a year. **CHECK:** the fingernail comparison. *Fallback: omit the comparison.*
5. **The Rover's Sign:** Three Moon rovers were left on the Moon (Apollo 15, 16 and 17). They were battery-powered, had four wheels and carried two astronauts. Astronauts usually drove about 5 km an hour, and on Apollo 16 all four wheels once left the ground. The Apollo 15 plaque says the rover was the first wheels on the Moon, delivered by Falcon on 30 July 1971.
6. **Landing Platform:** Opportunity landed on Mars in January 2004 and rolled off its landing platform in Eagle Crater. It was built to last 90 Mars days. It worked for about 14 and a half years.
7. **Cone and Parachute:** The cone and the parachute landed about 440 metres from the platform. The cone protected the rover on the trip, and the parachute slowed the fall. **CHECK:** wording against NASA's page. *Fallback: drop the 440 metres figure.*
8. **Heat Shield:** The heat shield broke into two pieces when it hit the ground. Years later, Opportunity drove to it and took a close look.
9. **The Space Rock:** Near the heat shield, Opportunity found a rock now called Heat Shield Rock. It is mostly iron and nickel, and scientists think it is a meteorite. Keep the "scientists think" wording.

**The 4 CHECK items** (instruments list, fingernail comparison, cone/parachute wording, rock wording) must be done before launch. If the AI cannot verify one, use the fallback and tell the human.

Mars ending text and Moon ending line are in Sections 9.3 and 9.4.

---

## 13. Art asset contract

### 13.1 Contract

Final art is Akshita's, but **until she replaces it, the AI-generated stand-ins live in the same places.** All art is **transparent PNG, no blur, no anti-aliasing**. Files go in `assets/` with these **exact names**; the loader uses the file name (without `.png`) as the texture key. Sizes are binding: a replacement file of the same name and size must drop in with no code changes.

| File | Size | Frames |
| --- | --- | --- |
| `moon_buggy.png` | 64×40 | 4-frame strip (see note below) |
| `mars_rover.png` | 56×40 | 4-frame strip |
| `mars_rover_asleep.png` | 56×40 | 1 (dusty) |
| `landing_stage.png` | 96×80 | 1 |
| `flag.png` | 24×48 | 1 |
| `science_station.png` | 64×48 | 1 |
| `laser_mirror.png` | 32×32 | 1 |
| `rover_sign.png` | 32×24 | 1 |
| `landing_platform.png` | 96×48 | 1 |
| `cone.png` | 64×64 | 1 |
| `parachute.png` | 96×64 | 1 |
| `heat_shield_a.png`, `heat_shield_b.png` | 64×40 | 1 each |
| `space_rock.png` | 24×20 | 1 |
| `sun.png` | 48×48 | 1 |
| `moon_sky.png` | 480×270 | 1 |
| `moon_hills.png` | 960×270 (tileable sideways) | 1 |
| `moon_ground.png` | 480×64 (tileable) | 1 |
| `mars_sky.png` | 480×270 | 1 |
| `mars_hills.png` | 960×270 (tileable sideways) | 1 |
| `mars_ground.png` | 480×64 (tileable) | 1 |
| `patch_moon.png`, `patch_mars.png`, `patch_gold.png` | 64×64 | 1 each |
| `arrow_up.png`, `arrow_down.png` | 96×96 | 1 each |
| `logo.png` | 240×80 | 1 |

**Sprite sheet note (ambiguity to resolve in code):** the plan lists the strip size as the *total image size*. The 4-frame strips are therefore laid out **horizontally, 4 equal frames across the full image** (so `moon_buggy.png` 64×40 means four 16×40 frames; `mars_rover.png` 56×40 means four 14×40 frames). Make the frame width computed as `imageWidth / 4` so any future size change still works. Tell the human about this assumption in the handoff.

**Fallback rule (last resort):** for any file that is missing or fails to load, generate a grey rectangle at the exact size with the key name drawn on it (and for strips, 4 slightly different shades so animation is visible). With the generated art in place this should never trigger, but crashing is never acceptable.

### 13.2 AI-generated stand-in art (do this in Phase 0b)

**Method:** write `tools/generate_art.py` (Python 3 + Pillow; `pip install pillow` if missing; if Python is unavailable use Node with `pngjs`). The script draws every asset **procedurally with hard-edged pixels** (rectangles, circles, lines, hand-placed pixel patterns, seeded noise for texture) and saves PNGs directly into `assets/`. Do **not** call any image-generation service or download images. Rules:

- Draw at the final pixel size (e.g. `flag.png` is exactly 24×48). No resizing with smoothing, no anti-aliasing: use `Image.NEAREST` if scaling ever happens and draw with `ImageDraw` using `fill` only (turn off any antialias). Verify with a check that every pixel alpha is 0 or 255.
- Transparent background for sprites and patches/UI. Backgrounds (`*_sky`, `*_hills`, `*_ground`) follow their own rules below.
- Deterministic: fixed random seed so reruns give identical files.
- **Never overwrite human art.** Before writing a file, check `ASSETS.md`: only overwrite entries marked `ai`. Entries marked `human` are skipped. Add a `--force` flag for deliberate regeneration. After generating, write/refresh `ASSETS.md` listing every file, its size, and status `ai`.
- Style: warm, simple, chunky, readable at small size, cohesive across both chapters, kid-friendly. Clean 1 px dark outline on sprites. Limited palette (about 24 colours total, defined at the top of the script and shared).
- **No NASA logos, no text/numbers that look like official marks, no real mission insignia** on any sprite (the rover plaque is just an abstract small rectangle with a few pixel "lines", not real text).
- Frame strips: 4 equal frames laid out horizontally (`imageWidth / 4` each).

**Palette hints:** Moon greys `#2b2b33 #4a4a55 #7b7b88 #b9b9c4`; Mars rust `#5a2a1c #8e4a2e #c26b3f #e8a46a`; Mars sky `#f0b48a #d98a64`; metal `#c9ccd3 #8a8f9b`; gold foil `#e8c34a #b58a1f`; space black `#0b0b1a`; accent sparkle `#fff3a0`.

**Per-asset look guide**

| File | What to draw |
| --- | --- |
| `moon_buggy.png` | Boxy open Lunar Rover: wire-mesh wheels, two seats, small dish antenna, silver and gold-foil bits. 4 frames: wheel spokes rotate 0/45/90/135 degrees so the wheels visibly turn |
| `mars_rover.png` | Opportunity-style: six wheels, tan body, mast with camera "head", blue-ish solar panel on top. 4 frames: wheels/spokes advance each frame |
| `mars_rover_asleep.png` | Same rover, one frame, covered with a dusty orange-brown tint and dim panel, mast drooped slightly |
| `landing_stage.png` | Gold-foil octagonal base with four short legs and a nozzle underneath, no top half |
| `flag.png` | Thin pole with a small waving rectangular flag (red/white/blue stripes + simple blue corner square, no stars detail needed) |
| `science_station.png` | Low grey box with a small dish/antenna, a short mast, and a couple of little instruments on the ground |
| `laser_mirror.png` | Flat square tray of tiny corner cubes (grid of small shiny squares) on a short stand, tilted look |
| `rover_sign.png` | Small plaque rectangle with a metallic border and a few abstract pixel "text lines" (not readable text) |
| `landing_platform.png` | Wide flat lander base with folded petal panels, metallic with a few airbag-fabric hints |
| `cone.png` | Cone-shaped conical shell, silvery with a darker rim, sitting tilted |
| `parachute.png` | Crumpled parachute canopy in white/orange stripes lying on the ground with a few lines (cords) |
| `heat_shield_a.png`, `heat_shield_b.png` | Two broken pieces of a dish-shaped dark brown/black heat shield; `a` larger, `b` smaller, jagged edges |
| `space_rock.png` | Small dark metallic rock with a lighter highlight, basketball-ish proportion |
| `sun.png` | 48×48 sun: yellow disc with simple stepped rays, soft pixel glow |
| `moon_sky.png` | 480×270 near-black blue with no stars (stars are drawn in code) |
| `moon_hills.png` | 960×270 transparent top; grey rolling hills along the lower portion; **left and right edges must match** so it tiles |
| `moon_ground.png` | 480×64 grey regolith with small craters/pebbles, tiles horizontally (matching edges) |
| `mars_sky.png` | 480×270 vertical gradient, deeper orange at top to pale peach at the horizon (stepped bands, not smooth) |
| `mars_hills.png` | 960×270 transparent top; rust-coloured dunes/hills along the lower portion, edges match for tiling |
| `mars_ground.png` | 480×64 rust sand with ripples and small rocks, tiles horizontally |
| `patch_moon.png` | 64×64 round embroidered-style patch: grey moon with craters, small rover silhouette, thick border |
| `patch_mars.png` | 64×64 round patch: red planet, small rover silhouette, thick border |
| `patch_gold.png` | 64×64 round golden patch: both a moon and Mars together, glowing gold border |
| `arrow_up.png` | 96×96 big rounded button with a right-pointing arrow, released state (raised, lighter) |
| `arrow_down.png` | 96×96 same arrow button, pressed state (darker, shifted down 2 px) |
| `logo.png` | 240×80 chunky pixel lettering of the words "Still Here" (hand-built pixel font in the script, outlined, with a tiny rover or star accent). Original lettering, not any NASA wordmark |

**Quality gate for the art:** after generating, create one contact sheet image (`tools/contact_sheet.png`, not shipped) showing every asset on a dark background at 2× scale and **look at it**. Fix anything unrecognisable (e.g. rover reads as a blob, hills do not tile, logo text not legible) before moving on. Run a tiling check by placing each tileable image side by side with itself.

**Replacing the art later (Akshita):** overwrite the file in `assets/` with the same name and size, then set that row in `ASSETS.md` to `human` (this protects it from regeneration). No code changes.

**Made in code (no PNG needed):** black "?" silhouettes, stars, Earth in Moon sky, Mars rocks/ripples, dust particles, sparkles, storm tint, battery bar, text, overlays.

**Art replacement order for Akshita (when she is ready):** both rovers → 9 hardware pieces → two backgrounds → patches, arrows, logo. Whatever she has not replaced keeps the AI-generated stand-in, so the game always looks complete.

**Rules:** no NASA logos or branding. **The shipped game currently uses AI-generated art, so the AI disclosure must say so** (Section 19). Only change it to "made by me" for files she has truly replaced.

---

## 14. Sound contract

Synthesised in-browser (Web Audio oscillators/noise) first. If `audio/<name>.mp3` exists and loads, it replaces the synth for that name automatically. All sound starts only after the first tap. A mute button is always visible.

| Name | Plays when |
| --- | --- |
| `ui_tap` | Any button press |
| `drive_loop` | Soft hum while the arrow is held |
| `bounce` | Moon buggy bump |
| `sparkle` | An item is found |
| `card_open` | Card slides in |
| `collect` | Card flies to the bar |
| `jingle_progress` | Counter ticks up |
| `charge_loop` | Mars rover resting in sunlight |
| `wind` | Wind-cleans-panels moment |
| `storm_loop` | Storm phase |
| `patch_fanfare` | A patch is earned |
| `album_whoosh` | Card flies to centre in the Album Hall |

Keep synth sounds short, quiet and pleasant (no harsh square-wave screech). Master gain about 0.3. Loops must stop on scene change.

---

## 15. Mobile, scaling and input

- Phaser config: `type: AUTO`, `width: 480`, `height: 270`, `pixelArt: true`, `roundPixels: true`, `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`, `input: { activePointers: 3 }`.
- CSS: `html, body { margin:0; background:#000; overflow:hidden; touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; overscroll-behavior:none; }`. Use `100dvh` where supported.
- Meta viewport: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`. Respect safe areas with `env(safe-area-inset-*)` on the container.
- Block context menu (`contextmenu` event) on the game container.
- On-screen arrow button: bottom-right, thumb-sized, shows `arrow_up` (released) and `arrow_down` (pressed). Always visible on touch devices; also usable by mouse on desktop.
- Keyboard: Right Arrow, D for drive; Esc closes Album detail; Left/Right navigate Album detail.
- Pause the game when the tab is hidden; resume cleanly.
- Text: use a crisp pixel font (a bitmap font generated in code or a web-safe monospace at integer scale). Verify legibility at a 360×640 phone landscape (about 640×360 viewport).
- Safari/iOS: audio only after tap (handled in Boot); avoid features that need user-gesture fullscreen.

---

## 16. Build phases

Each phase ends with a DoD. Commit (or snapshot) after each phase. Times are IST suggestions from the human's schedule (now about 15:15 on 15 Nov).

### Phase 0: Setup and fact checks (15:10–15:30)
**Tasks**
1. Create the folder structure from Section 6. Get `phaser.min.js` (Section 4).
2. Create `index.html` with the CSS and meta tags from Section 15 and the script includes.
3. Fact-check the 4 CHECK items in Section 12 using the Section 22 sources. Find real URLs for each card's `sourceUrl`.
4. Create `src/data/cards.json` with all 9 cards (short + long + source). Mark `verified` honestly.
5. Create `src/constants.js` from Section 8.

**DoD:** `python3 -m http.server` serves a page that loads Phaser without console errors. `cards.json` parses and has 9 entries with the exact IDs. A short list of verified/unverified items is written to `FACTCHECK.md`.

### Phase 0b: Generate stand-in art (15:30–16:15, can run alongside Phase 1)
**Tasks**
1. Write `tools/generate_art.py` per Section 13.2 and run it. Output all 31 files from Section 13 into `assets/` with exact names and sizes.
2. Validate: every file exists, exact pixel size, 4-frame strips divisible by 4, no semi-transparent pixels, tileable files have matching left/right edges.
3. Make the contact sheet, view it, and fix anything unrecognisable.
4. Write `ASSETS.md` (file, size, status `ai`).

**DoD:** `assets/` contains every file in Section 13; contact sheet looks cohesive and each item is recognisable at game scale; `ASSETS.md` exists; rerunning the script is deterministic and refuses to overwrite `human` entries.

### Phase 1: Engine core (15:30–17:00)
**Tasks**
1. `main.js` Phaser config, scene registration.
2. `placeholders.js` and BootScene loader with per-file error handling and tap-to-start + audio unlock.
3. `state.js` (save/load/reset with try/catch and corrupt-safe defaults), `cards.js`.
4. `input.js` unified hold-to-move + on-screen arrow button.
5. `audio.js` with all 12 named sounds synthesised and mute persistence.
6. `button.js` (squish, sound, touch target).
7. A shared **ChapterBase** scene class: parallax layers, world scrolling, rover state machine, find triggers from config, top bar, intro card, rotate overlay hook.
8. `cardPopup.js` with the full find and collect animations (Section 11.1 and 11.2) and `topBar.js` + `silhouette.js`.

**DoD:** In a throwaway test scene using the generated art (or placeholders if Phase 0b is not done yet): hold arrow → rover wheels animate and the background parallax scrolls; release → stops. A test find triggers, card slides in with staged text, Collect is only active after reveal, card flies to top bar, silhouette fills, counter ticks, saving to localStorage works and survives reload. Works with mouse, keyboard and touch (check with browser device emulation).

### Phase 2: Moon chapter (17:00–18:00)
**Tasks**
1. `MoonScene` extends ChapterBase with 5 finds at about 30–35 s driving spacing.
2. Moon bounce (random hop, `bounce` sound, one-time fact line).
3. Earth and "Not to scale" label.
4. Chapter intro card, ending (parked rover + two other rover silhouettes + "You parked it. It is still there."), patch animation (`patchAnim.js`), `awardPatch('moon')`.

**DoD:** A full Moon run from start to patch takes about 3 minutes, all 5 cards collect and persist, the ending plays, and the Moon patch is saved. No console errors. Replaying after completion does not double-count.

### Phase 3: Mars chapter (18:00–19:00)
**Tasks**
1. `MarsScene` extends ChapterBase with 4 finds.
2. Battery system (drain, charge, low-battery pause, no game over), Sun→panel sparkle particles while resting, battery UI.
3. Storm timeline (Section 9.4): "14 years later..." card, Clear → Hazy → Storm tint and dust particles, charge multipliers, forced sleep ending.
4. Wind-cleaning boost (cuttable).
5. Fixed ending text, `mars_rover_asleep`, Mars patch, closing line "It is still there. Still here."
6. When both patches earned: golden patch animation and route to Album Hall.

**DoD:** A full Mars run works: battery behaves as specified, cannot soft-lock (player at 0 battery always recovers), storm always ends in sleep within about 45 s even if the player does nothing or holds the arrow constantly. Ending text matches Section 9.4 exactly. Patch saved.

### Phase 4: Home, Album, Album Hall (19:00–19:45)
**Tasks**
1. `HomeScene` per Section 9.2 (mission cards, silhouettes, counters, patch slots, Album, Sound, Reset).
2. `AlbumHallScene` per Section 9.5: shelves, staggered entrance, locked-card shake + hint, tap-to-focus with dim/blur, fly-to-centre with flip, detail panel (picture, name, short, Read more, source link, tag), prev/next, close/Esc/outside-tap fly-back.
3. Layout adapts: detail panel beside the card on wide screens, below on narrow.
4. `CertificateScene` (cuttable, do last).

**DoD:** All 9 cards open from the Album Hall with correct text and sources; Read more expands and collapses; prev/next skip uncollected cards; fly-back returns to the right slot; Esc and outside tap both close. Saved progress is reflected on Home after reload.

### Phase 5: Polish, art drop-in, mobile (19:45–20:15)
**Tasks**
1. If the human has replaced any art, verify each replaced file works with no code changes (same name and size). Log which files are still AI-generated in `ASSETS.md`.
2. Fix any sizing or frame issues (strip frame width = imageWidth/4).
3. Real-phone testing (Chrome Android + Safari iOS) and laptop. Check portrait overlay, thumb arrow, text legibility, audio after tap, no page scroll/zoom.
4. Optional: MP3s in `audio/`.

**DoD:** Both chapters and the Album Hall are playable start to finish on a phone and a laptop. `ASSETS.md` lists which art is still AI-generated.

### Phase 6: Publish (20:15–20:45)
**Tasks:** follow [Section 18](#18-deployment). Test the public URL in an incognito window on a different device.

**DoD:** A public HTTPS link loads, plays both chapters, saves progress, and works on a phone without installing anything.

### Phase 7: Demo video (20:45–21:45)
Follow [Section 20](#20-demo-video-reel-and-linkedin). Output: a 30-second-or-less MP4 with burned-in English subtitles, uploaded to YouTube as **Unlisted** (human does the upload).

### Phase 8: Submission (21:45–22:30)
Fill every field from [Section 19](#19-submission-pack). Re-read the 2026 Project Tab fields (rules here came from the 2025 guide). **Submission is final.**

### Phase 9: Buffer (22:30–23:59)
LinkedIn post and reel **after** submitting. Do not touch the submitted game link unless fixing a real bug.

---

## 17. Testing and QA checklist

**Functional**
- [ ] Loading → tap → Home (sound works after tap on phone)
- [ ] Moon: 5 finds, 5 cards, ending, patch
- [ ] Mars: 4 finds, battery drain/charge, low-battery pause, storm, ending text exact, patch
- [ ] Both patches → golden patch → Album Hall → Certificate (if built)
- [ ] Album Hall: open all 9 cards, Read more, source link, prev/next, close methods
- [ ] Reload mid-progress: counters, silhouettes, patches restored
- [ ] Reset works with confirm
- [ ] Mute persists

**Robustness**
- [ ] `localStorage` disabled → game still runs (in-memory)
- [ ] Missing every PNG → game still fully playable with placeholders
- [ ] Missing every MP3 → synth sounds play
- [ ] Hold arrow during a card popup: no movement, no stuck input after close
- [ ] Release finger off-button: rover stops
- [ ] Tab hidden/visible: no stuck sound loops, no jump in time
- [ ] No soft-lock anywhere in Mars (battery 0 during find, during storm, during ending)
- [ ] No console errors in a full playthrough

**Device**
- [ ] Android Chrome landscape, iOS Safari landscape, laptop Chrome
- [ ] Portrait overlay appears and game pauses
- [ ] No pinch zoom, no page scroll, no long-press menu
- [ ] Text readable on a small phone

**Content**
- [ ] Every card text matches Section 12 exactly
- [ ] Every shown source link opens correctly
- [ ] No word "dumped" or "littered" anywhere; no NASA logo anywhere
- [ ] 4 CHECK items resolved or fallback used

---

## 18. Deployment

1. Ensure the folder is self-contained (no CDN, no absolute paths; all asset URLs relative).
2. **Netlify Drop:** drag the whole `still-here/` folder onto the Netlify Drop page. Or **GitHub Pages:** push to a repo and enable Pages on the main branch root.
3. Open the URL in an incognito window on a **different device** (not logged in, no cache).
4. Confirm: loads over HTTPS, assets load (check network tab for 404s), localStorage saves, sound after tap.
5. Record the final public URL in `SUBMISSION.md`.

---

## 19. Submission pack

Create `SUBMISSION.md` containing ready-to-paste text for every field.

- **Project name:** Still Here
- **Summary (short):** A free pixel game for kids. Drive the Apollo 15 rover on the Moon and the Opportunity rover on Mars, find the hardware NASA left behind, and learn what each piece did and why it mattered.
- **Detailed description:** Audience (school-age kids), the two chapters, the one-button control, the cards and album, the Album Hall with Read more, the storm ending, and one line on tone: left behind, still working, never forgotten.
- **NASA data used:** Public NASA mission information: Apollo hardware and ALSEP records, Lunar Roving Vehicle facts, Opportunity mission pages, HiRISE landing-site imagery descriptions, and the Heat Shield Rock page. All sources listed. No datasets were processed.
- **Other data:** none.
- **AI disclosure (human must edit to be true):** AI (Claude by Anthropic) helped with planning, code, text, and the pixel art: the game's images are generated by a script written with AI (no external image-generation service was used). I directed the project and reviewed every fact against NASA sources. *(If Akshita replaces some or all art with her own, update this line to say exactly which parts she made.)*
- **Demo link:** YouTube unlisted video, 30 seconds or less, English subtitles.
- **Project link:** the public game URL.
- **Checkboxes:** originality and T&C.

Rules recap: submit via the **Project Tab** on the team page; a team of one is allowed; submission is final; English only; images up to 10 MB; no direct video upload (link required); demo is a video of 30 seconds or less with English subtitles **or** a deck of 7 slides or fewer. Rules came from the 2025 guide; re-check the 2026 fields on the day.

---

## 20. Demo video, reel and LinkedIn

**30-second demo storyboard**
1. 0–3 s: black screen, text "NASA gave this rover 90 days."
2. 3–10 s: Moon buggy driving, a card flies into the album.
3. 10–18 s: Mars rover resting in sunlight, the battery fills.
4. 18–24 s: the storm darkens the sky. "Opportunity fell asleep."
5. 24–28 s: Album Hall; one card flies to the centre.
6. 28–30 s: "Still Here" and the game link.

Record the screen, add English subtitles in CapCut, export, upload to YouTube as Unlisted.

**Helpful for recording:** add a hidden dev URL flag `?demo=1` that makes finds spaced about 4 s apart and shortens the storm timeline to about 12 s, so the video can be captured quickly. It must not appear in normal play.

**Reel hook options:** "NASA gave this robot 90 days. It lasted 14 years. Then the dust came." / "There is a car parked on the Moon right now." / "I built a game about the things NASA left behind." Reel about 25 s: hook + gameplay, card flying into album, storm moment, "Play it free. Link in comments."

**LinkedIn (after submitting):** one honest line on why I built it (solo, NASA Space Apps 2026), one surprising fact, the playable link, tag NASA Space Apps.

---

## 21. Risks and rules

- **Art is the bottleneck:** AI-generated stand-in art now means the game always ships looking complete; the grey-box fallback covers any missing file. Disclose AI art honestly.
- **Facts:** every card and Read more line must match a source; resolve the 4 CHECK items first.
- **Framing:** never say NASA "dumped" anything. Use "left behind". Some hardware (laser mirrors) still works.
- **Branding:** no NASA logos or official-looking marks. Credit sources on cards.
- **Phone sound:** needs the first tap (handled on the loading screen).
- **Public link:** test in incognito on another device.
- **Final QA:** play both chapters on phone and laptop, open all 9 cards in Album Hall, check subtitles, read every form field once.

---

## 22. Sources

- NASA: Apollo's Lunar Leftovers
- Astronomy: What did the Apollo astronauts leave behind?
- Astronomy: Lunar Roving Vehicle facts
- NASA: Rover's landing hardware at Eagle Crater
- HiRISE: Opportunity landing site images
- Space.com: Mars rover wanders through littered landscape
- NASA: Heat Shield Rock

The original plan lists titles only. During Phase 0, locate the real URL for each and store them in `cards.json` and `FACTCHECK.md`.

---

## 23. Open assumptions

These were not fully specified in the plan; the builder should follow these defaults and report them in the final handoff.

1. **Sprite strips** are horizontal, frame width = image width / 4.
2. **Storm length** is about 45 s scripted, ends in sleep regardless of player action.
3. **Chapter replay** after completion is allowed and does not double-count finds.
4. **Settings** is a small panel on Home with Sound and Reset.
5. **Fonts:** a crisp pixel-looking font generated or a monospace fallback; no external font download.
6. **Sources section in the original plan** was referenced as "section 15" in card notes but is actually Section 18 of the original; this README uses Section 22.
7. **`?demo=1`** speed mode is an addition for video capture only.
