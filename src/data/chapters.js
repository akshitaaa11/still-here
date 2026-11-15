// Chapter config (README 9.3, 9.4). Find order follows cards.json; this file says where each
// find sits (seconds of driving after the previous one) and which world sprites show it.
// Card text never lives here.
const CHAPTERS = {
  moon: {
    chapter: 'moon', patch: 'moon',
    sky: 'moon_sky', ground: 'moon_ground',
    // moving scenery built from the owner's Moon picture (tools/build_moon_art.py):
    // mountain pieces and craters/rocks, reused at random sizes so nothing visibly repeats
    mountains: ['moon_mtn_1', 'moon_mtn_2', 'moon_mtn_3', 'moon_mtn_4'],
    decor: ['moon_decor_1', 'moon_decor_2', 'moon_decor_3', 'moon_decor_4', 'moon_decor_5'],
    rover: 'moon_buggy', roverScaleKey: 'ROVER_SCALE_MOON',
    intro: 'You are driving the Apollo 15 rover. Hold the arrow to drive!',
    bounceFact: 'Real rover wheels sometimes left the ground in low gravity.',
    endingLine: 'You parked it. It is still there.',
    finds: [
      { cardId: 'landing_stage', gapSec: 31, sprites: [{ key: 'landing_stage', dx: 0 }] },
      { cardId: 'flag', gapSec: 33, sprites: [{ key: 'flag', dx: 0 }] },
      { cardId: 'science_station', gapSec: 34, sprites: [{ key: 'science_station', dx: 0 }] },
      { cardId: 'laser_mirror', gapSec: 32, sprites: [{ key: 'laser_mirror', dx: 0 }] },
      { cardId: 'rover_sign', gapSec: 33, sprites: [{ key: 'rover_sign', dx: 0 }] }
    ]
  },
  mars: {
    chapter: 'mars', patch: 'mars', battery: true,
    sky: 'mars_sky', hills: 'mars_hills', ground: 'mars_ground',
    rover: 'mars_rover', roverScaleKey: 'ROVER_SCALE_MARS', asleep: 'mars_rover_asleep',
    intro: 'You are driving Opportunity. Hold the arrow to drive. Let go to rest and charge.',
    lowBattery: 'Low battery, resting...',
    stormTitle: '14 years later...',
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
      { cardId: 'landing_platform', gapSec: 30, sprites: [{ key: 'landing_platform', dx: 0 }] },
      { cardId: 'cone_parachute', gapSec: 32, sprites: [{ key: 'cone', dx: -48 }, { key: 'parachute', dx: 44 }] },
      { cardId: 'heat_shield', gapSec: 33, sprites: [{ key: 'heat_shield_a', dx: -22 }, { key: 'heat_shield_b', dx: 52 }] },
      { cardId: 'space_rock', gapSec: 31, sprites: [{ key: 'space_rock', dx: 0 }] }
    ]
  }
};
