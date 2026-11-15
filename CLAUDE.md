# CLAUDE.md: Instructions for Claude Code on "Still Here"

You are building **Still Here**, a solo NASA Space Apps Challenge 2026 entry (challenge: *Abandoned but not Forgotten*). The full spec is in `README.md`. **Read README.md completely before writing any code.** If README.md and this file disagree, README.md wins on game content, this file wins on working style.

## Time pressure
The submission deadline is **15 Nov 2026, 11:59 PM IST** and the human's own cut-off is **10:30 PM IST**. Optimise for a **working, shippable game** over perfection. Always keep the game in a runnable state. Never leave the project broken between phases.

## Non-negotiables
1. **No build tools.** Static files only: `index.html`, `phaser.min.js`, plain JS in `src/`. No bundler, no framework, no TypeScript, no npm at runtime. (npm is allowed once, in a scratch dir, only to fetch Phaser 3.)
2. **You generate all the art (for now).** Write `tools/generate_art.py` (README Section 13.2) and produce every PNG in README Section 13 into `assets/` with the exact names and sizes. Pure procedural pixel art, hard edges, no anti-aliasing, no external image services, no downloads, deterministic output. Look at the contact sheet and fix anything unrecognisable. The human will later overwrite files with her own art of the same name and size: this must need **no code changes**. Never overwrite a file `ASSETS.md` marks `human`. Keep the grey-box fallback for missing files and synthesised sounds for missing MP3s, so the game never crashes.
3. **Data-driven.** Card text, sources and find order live in `src/data/cards.json` and chapter config, never hard-coded in scenes.
4. **Never invent facts.** Use the approved card text in README Section 12 verbatim. For the 4 CHECK items, verify against the sources or use the stated fallback. Report anything unverified.
5. **No game over, no soft-locks.** Especially on Mars (battery 0, storm, ending).
6. **Tone:** warm, curious, kid-friendly. Never write "NASA dumped/littered". Use "left behind". No NASA logos or branding.
7. **No dust-opacity numbers** or technical jargon in gameplay UI.
8. **Offline-safe and private:** no analytics, no external requests at runtime. Wrap every `localStorage` call in try/catch.
9. **Only the "Collect it!" button collects.** Tapping elsewhere on a card does nothing, and Collect activates only after the text reveal ends.
10. **Do not add scope.** Do not add Backpack Air, walk-home lines, rock-sample stops, jump buttons, GO/REST buttons, or extra chapters.

## Working style
- Follow README Section 16 phases **in order**. Finish each phase's Definition of Done before moving on. Keep a short running `PROGRESS.md` (phase, status, what's next, known issues).
- Prefer small, readable files as laid out in README Section 6. Comment the *why*, not the *what*. Keep constants in `src/constants.js`.
- Share logic: both chapters extend one `ChapterBase`; the card popup, top bar, audio, input and state are shared modules.
- Use a local server to test (`python3 -m http.server 8080`). Do not rely on `file://`.
- After each phase, run the game headlessly if possible (or reason carefully) and check the browser console for errors. If a browser tool is available, load the page and play through; otherwise write a small smoke test that loads scenes and asserts no thrown errors.
- Do not spend time on features in the cut list (README Section 3) until all must-haves pass. Cut order if behind: certificate → Read more → Album prev/next slide → wind boost → sounds.
- Art in `assets/` is yours to generate and regenerate **only while its `ASSETS.md` status is `ai`**. Once the human marks a file `human`, never touch it. Do not edit `audio/` MP3s the human adds.
- Do not touch git history destructively. If using git, make small commits per phase. Do not push or deploy unless the human asks.

## Mobile checklist (apply from Phase 1, not at the end)
Base 480×270, Phaser FIT scaling, `pixelArt: true`, `roundPixels: true`. Block page scroll, pinch zoom, context menu and text selection. Support multi-touch (`activePointers: 3`). Release input on pointer up/cancel anywhere. Rotate-phone overlay in portrait. Audio unlocked on the first tap in BootScene. Respect safe areas. Touch targets at least 44 CSS px.

## Ambiguities: default decisions (report them in the final handoff)
- Sprite strips: **horizontal**, frame width = `imageWidth / 4`.
- Storm: scripted about 45 s, always ends in Opportunity asleep regardless of input.
- Replaying a finished chapter is allowed and never double-counts.
- Source URLs the sources list does not give: find them in Phase 0; if you can't verify one, set `"verified": false` and hide the link rather than guessing.
- Add `?demo=1` fast mode (finds about 4 s apart, storm about 12 s) for recording the demo video only.

## Final handoff (when done or when time is nearly out)
Reply with a short note covering:
1. What works and what was cut.
2. Which assets are AI-generated stand-ins vs human-made (`ASSETS.md`), and any still grey boxes.
3. Which facts are unverified or used a fallback (`FACTCHECK.md`).
4. The assumptions you made.
5. The exact steps for the human to publish (Netlify Drop) and what to test on a phone.
Also produce `SUBMISSION.md` with ready-to-paste text for every Project Tab field (the AI disclosure line must state that the art is AI-generated and be flagged for the human to edit if she replaces any of it).

## Do not
- Do not ask clarifying questions about things this README already answers. Decide, note the assumption, continue.
- Do not rewrite approved text, restructure the scene flow, or change the 480×270 base size.
- Do not claim something works without having run it.
