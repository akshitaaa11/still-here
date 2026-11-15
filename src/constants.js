// All tunables live here (README Section 8). Plain script, no modules:
// loaded before the scenes, exposes one frozen global `K`.
const K = Object.freeze({
  GAME_W: 480,
  GAME_H: 270,
  ROVER_SCREEN_X: 140,      // rover stays here, the world scrolls
  DRIVE_SPEED: 60,          // px/s, both chapters
  FIND_SPACING_SEC: 32,     // 30-35 s of driving between finds
  PARALLAX_SKY: 0.0,
  PARALLAX_HILLS: 0.25,
  PARALLAX_GROUND: 1.0,
  MOON_BOUNCE_MIN_SEC: 4,   // random hop every 4-7 s while driving
  MOON_BOUNCE_MAX_SEC: 7,
  MOON_BOUNCE_PX: 6,
  BATTERY_DRAIN_PER_SEC: 5,     // full to empty in ~20 s of driving
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
  STORM_TITLE_SEC: 3,
  STORM_CLEAR_SEC: 10,
  STORM_HAZY_SEC: 15,
  STORM_STORM_SEC: 20,
  // ?demo=1 fast mode (video capture only)
  DEMO_FIND_SPACING_SEC: 4,
  DEMO_STORM_SCALE: 12 / 45,
  SAVE_KEY: 'stillHere',
  SAVE_VERSION: 1
});
