// Chapter config (README 9.3, 9.4). Find order follows cards.json; this file says where each
// find sits (seconds of driving after the previous one) and which world sprites show it.
// Card text never lives here.
const CHAPTERS = {
  moon: {
    chapter: 'moon', patch: 'moon',
    sky: 'moon_sky', hills: 'moon_hills', ground: 'moon_ground',
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
  }
};
