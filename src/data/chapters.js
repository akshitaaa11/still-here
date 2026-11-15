// Chapter config (README 9.3, 9.4). Find order follows cards.json; this file says where each
// find sits (seconds of driving after the previous one; kept short so it never feels tiring) and which world sprites show it.
// Card text never lives here.
const CHAPTERS = {
  moon: {
    chapter: 'moon', patch: 'moon',
    sky: 'moon_sky',
    // The owner's Moon picture (tools/build_moon_art.py), stored at canvas resolution (scale 0.5):
    // the whole mountain range and its mirror image scroll slowly; the ground scrolls at full
    // speed with craters and rocks scattered at random sizes, so nothing repeats the same way.
    mountains: ['moon_mtn_a', 'moon_mtn_b'], groundStrip: 'moon_ground', artScale: 0.5,
    decor: ['moon_decor_1', 'moon_decor_2', 'moon_decor_3', 'moon_decor_4', 'moon_decor_5'],
    baseY: 252, stopDist: 150,             // bigger rover and finds stand lower on the bigger ground
    rover: 'moon_buggy', roverScaleKey: 'ROVER_SCALE_MOON',
    intro: 'You are driving the Apollo 15 rover. Hold the arrow to drive!',
    bounceFact: 'Real rover wheels sometimes left the ground in low gravity.',
    endingLine: 'You parked it. It is still there.',
    finds: [
      { cardId: 'landing_stage', gapSec: 10, sprites: [{ key: 'landing_stage', dx: 0, scale: 1.5 }] },
      { cardId: 'flag', gapSec: 13, sprites: [{ key: 'flag', dx: 0, scale: 2 }] },
      { cardId: 'science_station', gapSec: 14, sprites: [{ key: 'science_station', dx: 0, scale: 1.5 }] },
      { cardId: 'laser_mirror', gapSec: 13, sprites: [{ key: 'laser_mirror', dx: 0, scale: 2 }] },
      { cardId: 'rover_sign', gapSec: 14, sprites: [{ key: 'rover_sign', dx: 0, scale: 2 }] }
    ]
  },
  mars: {
    chapter: 'mars', patch: 'mars', battery: true,
    sky: 'mars_sky',
    // The owner's Mars picture (tools/build_moon_art.py), canvas resolution (scale 0.5). Its sky is
    // horizontal bands, so the mountains are one strip (sky included) placed exactly where they sit
    // in the picture; the strip and its mirror image scroll, the ground and craters/rocks too.
    mountains: ['mars_mtn_a', 'mars_mtn_b'], mountainsY: 104.44, groundStrip: 'mars_ground', artScale: 0.5,
    decor: ['mars_decor_1', 'mars_decor_2', 'mars_decor_3', 'mars_decor_4', 'mars_decor_5'],
    sunPos: [402, 47],                     // the Sun in the picture (sparkles fly from here)
    baseY: 252, stopDist: 150,
    rover: 'mars_rover', roverScaleKey: 'ROVER_SCALE_MARS', asleep: 'mars_rover_asleep',
    intro: 'You are driving Opportunity. Hold the arrow to drive. Let go to rest and charge.',
    lowBattery: 'Low battery, resting...',
    stormTitle: '14 years later...',
    stormWhy: 'A giant dust storm is covering the sky! The solar panels cannot get sunlight to charge. Tap Sleep to help Opportunity save its power.',
    asleepLine: 'Zzz... Opportunity is asleep.',
    windLine: 'Wind cleaned the panels!',
    // README 9.4 fixed ending text, verbatim, one sentence per line
    endingLines: [
      'Opportunity was built to last 90 Mars days.',
      'It lasted about 14 and a half years.',
      'In June 2018 a giant dust storm covered the sky.',
      'Its last message reached Earth on 10 June 2018.',
      'NASA sent over 1,000 commands.',
      'Opportunity did not answer.',
      'Opportunity fell asleep.'
    ],
    closingLine: 'It is still there. Still here.',
    finds: [
      { cardId: 'landing_platform', gapSec: 10, sprites: [{ key: 'landing_platform', dx: 0, scale: 1.5 }] },
      { cardId: 'cone_parachute', gapSec: 13, sprites: [{ key: 'cone', dx: -25, scale: 1.5 }, { key: 'parachute', dx: 95, scale: 1.5 }] },
      { cardId: 'heat_shield', gapSec: 14, sprites: [{ key: 'heat_shield_a', dx: -15, scale: 1.5 }, { key: 'heat_shield_b', dx: 95, scale: 1.5 }] },
      { cardId: 'space_rock', gapSec: 13, sprites: [{ key: 'space_rock', dx: 0, scale: 2 }] }
    ]
  }
};
