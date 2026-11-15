// Shared base for both chapters (README 5.4, 9.3, 9.4). A subclass only provides getConfig(),
// normally an entry of CHAPTERS (src/data/chapters.js):
//   { chapter, patch, sky, hills, ground, rover, roverScaleKey, intro, battery?,
//     finds: [{ cardId, gapSec, sprites: [{ key, dx }] }] }
// The rover stays at ROVER_SCREEN_X; the world scrolls past it.
// States: IDLE <-> DRIVING, then FINDING (input ignored) until the card is collected.
// Subclasses may add states and use the hooks: buildWorld, speedMult, afterUpdate,
// onState, onChapterComplete.
class ChapterBase extends Phaser.Scene {
  getConfig() { throw new Error('ChapterBase: subclass must implement getConfig()'); }
  buildWorld() {}              // hook: extra scenery (Earth, Sun, rocks...)
  speedMult() { return 1; }    // hook: Mars battery can scale speed
  afterUpdate(dt) {}           // hook: per-frame extras
  onState(s) {}                // hook: state changed
  onChapterComplete() {}       // hook: the last find was collected

  create() {
    const c = this.cfg = this.getConfig();
    this.worldX = 0; this.speed = 0; this.state = 'IDLE';
    this.frameT = 0; this.frameIdx = 0;
    Fx.ensure(this);

    // Parallax: sky fixed, hills slow, ground at full speed
    this.add.image(0, 0, c.sky).setOrigin(0, 0).setDepth(0);
    this.hills = this.add.tileSprite(0, 0, K.GAME_W, K.GAME_H, c.hills).setOrigin(0, 0).setDepth(1);
    this.ground = this.add.tileSprite(0, K.GROUND_Y, K.GAME_W, 64, c.ground).setOrigin(0, 0).setDepth(2);
    this.buildWorld();

    // Finds come from config (positions) and cards.json (text); nothing is hard-coded here.
    // Each find sits gapSec seconds of driving after the one before (?demo=1: a few seconds).
    let acc = 0;
    this.finds = c.finds.map((f, i) => ({
      def: f, index: i, triggered: false,
      x: (acc += (DEMO ? K.DEMO_FIND_SPACING_SEC : (f.gapSec || K.FIND_SPACING_SEC)) * K.DRIVE_SPEED),
      sprites: f.sprites.map(s => ({ dx: s.dx || 0, img: this.add.image(0, K.ROVER_BASE_Y, s.key).setOrigin(0.5, 1).setDepth(5) }))
    }));

    this.rover = this.add.sprite(K.ROVER_SCREEN_X, K.ROVER_BASE_Y, c.rover, 0).setOrigin(0.5, 1).setScale(K[c.roverScaleKey] || 3).setDepth(10);

    this.topBar = new TopBar(this, { chapter: c.chapter, battery: !!c.battery });
    Controls.attachArrow(this);

    // Mute button is always visible (README 14)
    this.soundBtn = new Button(this, K.GAME_W - 40, 14, this.soundLabel(), () => {
      State.setSound(!State.sound);
      AudioSys.setMuted(!State.sound);
      this.soundBtn.setText(this.soundLabel());
    }, { w: 64, h: 18, size: 8, face: 0x4a4a55, lip: 0x2b2b33 });
    this.soundBtn.visual.setDepth(92); this.soundBtn.zone.setDepth(93);

    this.layout();
    this.cameras.main.fadeIn(250);
    if (c.intro) this.showIntro(c.intro);

    this.events.once('shutdown', () => { AudioSys.stopLoops(); Controls.reset(); });
  }

  soundLabel() { return State.sound ? 'Sound: ON' : 'Sound: OFF'; }

  // Intro line fades in and out over about 3 s
  showIntro(text) {
    const t = new PixelText(this, 220, 64, text, { size: 10, bold: true, color: '#ffffff', shadow: '#14141f', wrap: 290, align: 'center' })
      .setDepth(80).setAlpha(0);
    const sec = K.INTRO_CARD_SEC * 1000;
    this.tweens.add({ targets: t, alpha: 1, duration: 400, hold: sec - 800, yoyo: true, onComplete: () => t.destroy() });
  }

  setState(s) {
    if (s === this.state) return;
    this.state = s;
    if (s === 'DRIVING') AudioSys.loop('drive_loop'); else AudioSys.stop('drive_loop');
    this.onState(s);
  }

  // Screen position of every find from its world position
  layout() {
    for (const f of this.finds) {
      const sx = K.ROVER_SCREEN_X + (f.x - this.worldX);
      for (const s of f.sprites) s.img.x = Math.round(sx + s.dx);
    }
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;   // a long frame (tab switch) never makes a jump

    if (this.state === 'IDLE' || this.state === 'DRIVING') {
      const target = Controls.isHeld() ? K.DRIVE_SPEED * this.speedMult() : 0;
      const step = K.ACCEL * dt;
      this.speed = this.speed < target ? Math.min(target, this.speed + step) : Math.max(target, this.speed - step);
      this.setState(this.speed > 1 ? 'DRIVING' : 'IDLE');
    }
    this.worldX += this.speed * dt;

    // A find triggers a little before the rover would reach it, so it stops right at the item
    if (this.state === 'DRIVING') {
      const f = this.finds.find(x => !x.triggered && this.worldX >= x.x - K.STOP_DIST - K.DRIVE_SPEED * K.DECEL_SEC / 2);
      if (f) this.beginFind(f);
    }

    // Parallax scroll (whole pixels so nothing shimmers)
    this.hills.tilePositionX = Math.round(this.worldX * K.PARALLAX_HILLS);
    this.ground.tilePositionX = Math.round(this.worldX * K.PARALLAX_GROUND);
    this.layout();

    // Wheels turn only while moving
    if (this.speed > 3 && !this.roverStill) {
      this.frameT += dt;
      if (this.frameT >= K.WHEEL_FRAME_SEC) { this.frameT = 0; this.frameIdx = (this.frameIdx + 1) % 4; this.rover.setFrame(this.frameIdx); }
    }
    this.afterUpdate(dt);
  }

  async beginFind(f) {
    f.triggered = true;
    this.setState('FINDING');
    // 0.5 s: the rover slows to a stop by itself
    await Fx.tween(this, { targets: this, speed: 0, duration: K.DECEL_SEC * 1000, ease: 'Sine.easeOut' });
    this.speed = 0;
    await CardPopup.show(this, f.def.cardId, { slotIndex: Cards.slotIndex(f.def.cardId), target: f.sprites.map(s => s.img) });
    Controls.consume();            // a still-held arrow must be pressed again
    this.setState('IDLE');
    if (f.index === this.finds.length - 1) this.onChapterComplete();
  }

  // Patch, then (on the second patch) the golden Still Here patch, then a Continue button.
  // Replays are fine: awarding a patch twice changes nothing.
  async finishChapter(patch, closingLine) {
    AudioSys.stopLoops();
    State.awardPatch(patch);
    let shown = await PatchAnim.play(this, patch);
    if (closingLine) {   // stays on screen through the golden patch too
      const line = new PixelText(this, 240, 218, closingLine, { size: 12, bold: true, color: '#fff3a0', shadow: '#14141f' })
        .setDepth(115).setAlpha(0);
      await Fx.tween(this, { targets: line, alpha: 1, duration: 600 });
      await Fx.wait(this, 1500);
    }
    let gold = false;
    if (State.hasPatch('moon') && State.hasPatch('mars') && !State.hasPatch('gold')) {
      State.awardPatch('gold');
      gold = true;
      await Fx.wait(this, 1200);
      shown.forEach(o => o.destroy());
      shown = await PatchAnim.play(this, 'gold');
    }
    await Fx.wait(this, 500);
    await new Promise(res => {
      new Button(this, 240, closingLine ? 250 : 238, 'Continue', res, { w: 110, h: closingLine ? 22 : 26, size: 12 }).setDepth(120);
    });
    // Second patch: the Album Hall is the finale (then the certificate)
    this.leave(gold ? 'AlbumHallScene' : 'HomeScene', gold ? { finale: true } : undefined);
  }

  // Quick fade, then go. Scenes that do not exist yet fall back to Home, then the title.
  leave(key, data) {
    const has = k => !!this.scene.manager.keys[k];
    const target = has(key) ? key : (has('HomeScene') ? 'HomeScene' : 'BootScene');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(target, data));
  }
}
