// Chapter 1: the Apollo 15 Lunar Rover (README 9.3). 5 finds, a low-gravity bounce,
// and an ending where the buggy parks beside the two other rovers left on the Moon.
class MoonScene extends ChapterBase {
  constructor() { super('MoonScene'); }

  getConfig() { return CHAPTERS.moon; }

  buildWorld() {
    Fx.stars(this, 70, 30, 150, 'moon-stars');   // twinkling stars, drawn in code
    // Earth, low in the sky
    this.add.image(436, 86, this.earthTexture()).setDepth(0.6);   // clear of the centred story text
    new PixelText(this, 6, 262, 'Not to scale', { size: 8, bold: true, color: '#f4f1ea', shadow: '#14141f', originX: 0, originY: 1 }).setDepth(70);

    this.bounceT = this.nextBounce();
    this.rover && this.rover.setY(K.ROVER_BASE_Y);
  }

  // Small pixel Earth: blue disc, a little land and cloud, dark night side
  earthTexture() {
    if (this.textures.exists('earth')) return 'earth';
    const n = 26, r = 12.5, t = this.textures.createCanvas('earth', n, n), c = t.getContext();
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = x + 0.5 - n / 2, dy = y + 0.5 - n / 2;
        if (dx * dx + dy * dy > r * r) continue;
        let col = '#3a6ab0';
        const land = Math.sin(x * 0.55) + Math.cos(y * 0.45 + x * 0.2);
        if (land > 1.05) col = '#4f9a4a';
        if ((x * 7 + y * 13) % 23 === 0 || Math.abs(Math.sin(y * 0.9) + x * 0.04 - 0.9) < 0.06) col = '#f4f1ea';
        if (dx + dy * 0.3 > 6) col = '#1c2c55';    // night side
        c.fillStyle = col; c.fillRect(x, y, 1, 1);
      }
    }
    t.refresh();
    return 'earth';
  }

  nextBounce() { return Phaser.Math.FloatBetween(K.MOON_BOUNCE_MIN_SEC, K.MOON_BOUNCE_MAX_SEC); }

  afterUpdate(dt) {
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
      const t = new PixelText(this, 240, 46, this.cfg.bounceFact, { size: 10, bold: true, color: '#fff3a0', shadow: '#14141f', wrap: 360, align: 'center' })
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
    const scale = K[this.cfg.roverScaleKey] || 3;
    [K.ROVER_SCREEN_X + 80, K.ROVER_SCREEN_X + 160].forEach((x, i) => {
      const r = this.add.image(x, K.ROVER_BASE_Y, sil).setOrigin(0.5, 1).setScale(scale).setDepth(9).setAlpha(0);
      this.tweens.add({ targets: r, alpha: 0.9, duration: 700, delay: 300 + i * 600 });
    });
    await Fx.wait(this, 1900);

    const line = new PixelText(this, 240, 84, this.cfg.endingLine, { size: 16, bold: true, color: '#ffffff', shadow: '#14141f' })
      .setDepth(80).setAlpha(0);
    await Fx.tween(this, { targets: line, alpha: 1, duration: 600 });
    await Fx.wait(this, 3000);
    await this.finishChapter(this.cfg.patch);
  }
}
MoonScene.factShown = false;
