// THROWAWAY Phase 1 test scene: two finds close together so the engine can be exercised
// quickly. Deleted when MoonScene arrives in Phase 2.
class TestScene extends ChapterBase {
  constructor() { super('TestScene'); }

  getConfig() {
    return {
      chapter: 'moon', sky: 'moon_sky', hills: 'moon_hills', ground: 'moon_ground',
      rover: 'moon_buggy', roverScale: K.ROVER_SCALE_MOON,
      intro: 'Phase 1 test: hold the arrow (or Right Arrow / D) to drive.',
      finds: [
        { cardId: 'landing_stage', x: 320, sprites: [{ key: 'landing_stage', dx: 0 }] },
        { cardId: 'flag', x: 700, sprites: [{ key: 'flag', dx: 0 }] }
      ]
    };
  }

  create() {
    super.create();
    this.input.keyboard.on('keydown-R', () => { State.reset(); this.scene.restart(); });   // dev reset
    new Button(this, 60, 252, 'Reset save', () => { State.reset(); this.scene.restart(); }, { w: 92, h: 18, size: 8, face: 0x4a4a55, lip: 0x2b2b33 });
  }

  onChapterComplete() {
    new PixelText(this, 240, 100, 'Test finds done! Press R to reset.', { size: 10, bold: true, color: '#fff3a0', shadow: '#14141f' }).setDepth(80);
  }
}
