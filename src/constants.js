// All tunables live here (README Section 8). Plain script, no modules:
// loaded before the scenes, exposes one frozen global `K`.
const K = Object.freeze({
  GAME_W: 480,
  GAME_H: 270,
  // The game is laid out in 480x270 units but drawn on a 960x540 canvas (camera zoom 2): the
  // generated art looks exactly the same (each art pixel = 2x2), while the owner's detailed
  // pictures (Moon landscape, rover) keep twice the detail.
  ZOOM: 2,
  ROVER_SCREEN_X: 140,      // rover stays here, the world scrolls
  DRIVE_SPEED: 60,          // px/s, both chapters
  FIND_SPACING_SEC: 13,     // default seconds of driving between finds (chapters set their own)
  PARALLAX_SKY: 0.0,
  PARALLAX_HILLS: 0.25,
  PARALLAX_GROUND: 1.0,
  MOON_BOUNCE_MIN_SEC: 4,   // random hop every 4-7 s while driving
  MOON_BOUNCE_MAX_SEC: 7,
  MOON_BOUNCE_PX: 6,
  BATTERY_DRAIN_PER_SEC: 3.5,   // full to empty in about 29 s of driving (was 20 s)
  BATTERY_CHARGE_PER_SEC: 12.5, // empty to full in ~8 s of rest
  CHARGE_MULT_CLEAR: 1.0,
  CHARGE_MULT_HAZY: 0.5,
  CHARGE_MULT_STORM: 0.15,
  WIND_MIN_SEC: 6,
  WIND_MAX_SEC: 12,
  WIND_BOOST: 25,
  INTRO_CARD_SEC: 3,
  MIN_FONT_PX: 8,
  // Storm timeline (README 9.4), seconds
  STORM_TITLE_SEC: 2,
  STORM_AUTOSLEEP_SEC: 12,  // if Sleep is not tapped, Opportunity sleeps by itself (no soft-lock)
  STORM_SEC: 10,            // the storm, with Opportunity asleep, then it clears
  // ?demo=1 fast mode (video capture only)
  DEMO_FIND_SPACING_SEC: 4,
  DEMO_STORM_SCALE: 12 / 45,
  // World layout (shared by both chapters)
  GROUND_Y: 206,            // top of the ground strip (ground art is 64 px tall)
  ROVER_BASE_Y: 236,        // rover wheels and finds stand on this y
  ROVER_SCALE_MOON: 0.5,    // the owner's rover is stored at canvas resolution (2 px per game unit)
  ROVER_SCALE_MARS: 0.5,    // the owner's Opportunity, stored at canvas resolution
  STOP_DIST: 90,            // rover stops this far (px of world) before a find
  DECEL_SEC: 0.5,           // rover slows to a stop by itself
  ACCEL: 300,               // px/s^2 when pressing or releasing the arrow
  WHEEL_FRAME_SEC: 0.09,
  SAVE_KEY: 'stillHere',
  SAVE_VERSION: 1
});

// ?demo=1 makes finds ~4 s apart and the storm ~12 s (for recording the video only)
const DEMO = /[?&]demo=1(&|$)/.test(location.search);
