// Chapter 1: the Apollo 15 Lunar Rover (README 9.3). 5 finds, a low-gravity bounce,
// and an ending where the buggy parks beside the two other rovers left on the Moon.
class MoonScene extends ChapterBase {
  constructor() { super('MoonScene'); }

  getConfig() { return CHAPTERS.moon; }

  buildWorld() {
    // The owner's Moon picture: the sky (with Earth) stays still; the mountains and the craters
    // and rocks are separate pieces that scroll and never repeat the same way (ScrollLane).
    Fx.stars(this, 40, 10, 140, 'moon-stars');   // a few extra twinkling stars, drawn in code
    new PixelText(this, 6, 262, 'Not to scale', { size: 8, bold: true, color: '#f4f1ea', shadow: '#14141f', originX: 0, originY: 1 }).setDepth(70);

    const groundTop = K.GAME_H - this.textures.get(this.cfg.ground).getSourceImage().height;
    this.lanes = [
      // mountains: slow parallax, random widths/heights/flips, overlapping so no gaps show
      new ScrollLane(this, {
        keys: this.cfg.mountains, seed: 'moon-mountains', factor: K.PARALLAX_HILLS, origin: [0, 1],
        scaleX: [0.8, 1.35], scaleY: [0.7, 1.3], step: [0.5, 0.8], depth: 1, depthJitter: 0.5,
        y: () => groundTop + 2
      }),
      // craters and rocks: ground speed, smaller near the horizon, never under a find
      new ScrollLane(this, {
        keys: this.cfg.decor, seed: 'moon-decor', factor: 1, origin: [0.5, 0.5], stepPx: true,
        scaleX: [0.55, 1.25], scaleY: null, step: [70, 190], depth: 3,
        y: (r, img) => {
          const t = r.frac();                                   // 0 = near horizon, 1 = front
          img.setScale(img.scaleX * (0.6 + 0.6 * t));            // perspective: further = smaller
          return groundTop + 8 + t * (K.GAME_H - groundTop - 12);
        },
        skip: x => this.finds && this.finds.some(f => Math.abs(x - (f.x + K.ROVER_SCREEN_X)) < 80)
      })
    ];
    this.lanes.forEach(l => l.update(0));

    this.bounceT = this.nextBounce();
    this.rover && this.rover.setY(K.ROVER_BASE_Y);
  }

  nextBounce() { return Phaser.Math.FloatBetween(K.MOON_BOUNCE_MIN_SEC, K.MOON_BOUNCE_MAX_SEC); }

  afterUpdate(dt) {
    this.lanes.forEach(l => l.update(this.worldX));
    if (this.state !== 'DRIVING') return;
    this.bounceT -= dt;
    if (this.bounceT <= 0) { this.bounceT = this.nextBounce(); this.bounce(); }
  }

  // Low-gravity hop of about 6 px
  bounce() {
    if (this.hopping) return;
    this.hopping = true;
    AudioSys.play('bounce');
    this.tweens.add({
      targets: this.rover, y: K.ROVER_BASE_Y - K.MOON_BOUNCE_PX, duration: 220, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => { this.rover.y = K.ROVER_BASE_Y; this.hopping = false; }
    });
    if (!MoonScene.factShown) {     // only after the first bounce in the session
      MoonScene.factShown = true;
      const t = new PixelText(this, 216, 46, this.cfg.bounceFact, { size: 10, bold: true, color: '#fff3a0', shadow: '#14141f', wrap: 300, align: 'center' })   // clear of the Earth
        .setDepth(80).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 400, hold: 3600, yoyo: true, onComplete: () => t.destroy() });
    }
  }

  // Ending: drive on a little, park, the other two rovers appear, then the patch
  async onChapterComplete() {
    this.setState('ENDING');
    this.speed = 0;
    await Fx.tween(this, { targets: this, speed: K.DRIVE_SPEED, duration: 500 });
    await Fx.wait(this, 2000);
    await Fx.tween(this, { targets: this, speed: 0, duration: 1500, ease: 'Sine.easeOut' });
    this.speed = 0;
    this.rover.y = K.ROVER_BASE_Y;

    // Three rovers stayed on the Moon (Apollo 15, 16 and 17)
    const sil = CardArt.frameSilhouette(this, this.cfg.rover, 0, '#0b0b12');
    const scale = K[this.cfg.roverScaleKey] || 1;
    const gap = this.rover.displayWidth + 14;
    [K.ROVER_SCREEN_X + gap, K.ROVER_SCREEN_X + 2 * gap].forEach((x, i) => {
      const r = this.add.image(x, K.ROVER_BASE_Y, sil).setOrigin(0.5, 1).setScale(scale).setDepth(9).setAlpha(0);
      this.tweens.add({ targets: r, alpha: 0.9, duration: 700, delay: 300 + i * 600 });
    });
    await Fx.wait(this, 1900);

    const line = new PixelText(this, 240, 124, this.cfg.endingLine,   // below the Earth in the sky picture
      { size: 16, bold: true, color: '#ffffff', shadow: '#14141f' })
      .setDepth(80).setAlpha(0);
    await Fx.tween(this, { targets: line, alpha: 1, duration: 600 });
    await Fx.wait(this, 3000);
    await this.finishChapter(this.cfg.patch);
  }
}
MoonScene.factShown = false;
