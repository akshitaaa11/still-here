// Shared base for both chapters (README 5.4, 9.3, 9.4). A subclass only provides getConfig(),
// normally an entry of CHAPTERS (src/data/chapters.js):
//   { chapter, patch, sky, hills?, ground, rover, roverScaleKey, intro, battery?,
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
    Fx.fitCamera(this);
    const c = this.cfg = this.getConfig();
    this.worldX = 0; this.speed = 0; this.state = 'IDLE';
    this.frameT = 0; this.frameIdx = 0;
    Fx.ensure(this);

    // Parallax: sky fixed, hills slow, ground at full speed
    this.baseY = c.baseY || K.ROVER_BASE_Y;          // where the rover's wheels and the finds stand
    this.add.image(0, 0, c.sky).setOrigin(0, 0).setDisplaySize(K.GAME_W, K.GAME_H).setDepth(0);
    // (a chapter can leave `hills` out and build its own moving scenery in buildWorld)
    if (c.hills) this.hills = this.add.tileSprite(0, 0, K.GAME_W, K.GAME_H, c.hills).setOrigin(0, 0).setDepth(1);
    if (c.mountains) this.buildScenery(c);   // owner's pictures: moving mountains, ground, craters, rocks
    if (c.ground) {
      const gh = this.textures.get(c.ground).getSourceImage().height;   // ground sits on the bottom edge
      this.ground = this.add.tileSprite(0, K.GAME_H - gh, K.GAME_W, gh, c.ground).setOrigin(0, 0).setDepth(2);
    }
    this.buildWorld();

    // Finds come from config (positions) and cards.json (text); nothing is hard-coded here.
    // Each find sits gapSec seconds of driving after the one before (?demo=1: a few seconds).
    let acc = 0;
    this.finds = c.finds.map((f, i) => ({
      def: f, index: i, triggered: false,
      x: (acc += (DEMO ? K.DEMO_FIND_SPACING_SEC : (f.gapSec || K.FIND_SPACING_SEC)) * K.DRIVE_SPEED),
      sprites: f.sprites.map(s => ({ dx: s.dx || 0, img: this.add.image(0, this.baseY, s.key).setOrigin(0.5, 1).setScale(s.scale || 1).setDepth(5) }))
    }));

    this.rover = this.add.sprite(K.ROVER_SCREEN_X, this.baseY, c.rover, 0).setOrigin(0.5, 1).setScale(K[c.roverScaleKey] || 3).setDepth(10);

    this.topBar = new TopBar(this, { chapter: c.chapter, battery: !!c.battery });
    Controls.attachArrow(this);

    // Mute button is always visible (README 14)
    this.soundBtn = new Button(this, K.GAME_W - 22, 14, '', () => {
      State.setSound(!State.sound);
      AudioSys.setMuted(!State.sound);
      this.soundBtn.setIcon(Icons.sound());
    }, { w: 28, h: 20, icon: Icons.sound(), face: 0x4a4a55, lip: 0x2b2b33 });
    this.soundBtn.visual.setDepth(92); this.soundBtn.zone.setDepth(93);
    this.vibBtn = new Button(this, K.GAME_W - 56, 14, '', () => {
      State.setVibrate(!State.vibrate);
      this.vibBtn.setIcon(Icons.vib());
      Haptics.tap();
    }, { w: 28, h: 20, icon: Icons.vib(), face: 0x4a4a55, lip: 0x2b2b33 });
    this.vibBtn.visual.setDepth(92); this.vibBtn.zone.setDepth(93);

    this.layout();
    this.cameras.main.fadeIn(250);
    if (c.intro) this.showIntro(c.intro);

    this.events.once('shutdown', () => { AudioSys.stopLoops(); Controls.reset(); });
  }

  soundLabel() { return State.sound ? 'Sound: ON' : 'Sound: OFF'; }
  vibLabel() { return State.vibrate ? 'Vibrate: ON' : 'Vibrate: OFF'; }

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
      const f = this.finds.find(x => !x.triggered && this.worldX >= x.x - (this.cfg.stopDist || K.STOP_DIST) - K.DRIVE_SPEED * K.DECEL_SEC / 2);
      if (f) this.beginFind(f);
    }

    // Parallax scroll (whole pixels so nothing shimmers)
    if (this.hills) this.hills.tilePositionX = Math.round(this.worldX * K.PARALLAX_HILLS);
    if (this.ground) this.ground.tilePositionX = Math.round(this.worldX * K.PARALLAX_GROUND);
    if (this.lanes) this.lanes.forEach(l => l.update(this.worldX));
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

  // Patch, then a Continue button (after both patches, the Album Hall finale).
  // Replays are fine: awarding a patch twice changes nothing.
  async finishChapter(patch, closingLine) {
    AudioSys.stopLoops();
    const newPatch = State.awardPatch(patch);
    await PatchAnim.play(this, patch);
    if (closingLine) {
      const line = new PixelText(this, 240, 218, closingLine, { size: 12, bold: true, color: '#fff3a0', shadow: '#14141f' })
        .setDepth(115).setAlpha(0);
      await Fx.tween(this, { targets: line, alpha: 1, duration: 600 });
      await Fx.wait(this, 1500);
    }
    // Both patches earned for the first time: the Album Hall is the finale
    const finale = newPatch && State.hasPatch('moon') && State.hasPatch('mars');
    await Fx.wait(this, 500);
    await new Promise(res => {
      new Button(this, 240, closingLine ? 250 : 238, 'Continue', res, { w: 110, h: closingLine ? 22 : 26, size: 12 }).setDepth(120);
    });
    this.leave(finale ? 'AlbumHallScene' : 'HomeScene', finale ? { finale: true } : undefined);
  }

  // Quick fade, then go. Scenes that do not exist yet fall back to Home, then the title.
  leave(key, data) {
    const has = k => !!this.scene.manager.keys[k];
    const target = has(key) ? key : (has('HomeScene') ? 'HomeScene' : 'BootScene');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(target, data));
  }

  // Moving scenery from the owner's picture (made by tools/build_moon_art.py, canvas resolution):
  // the whole mountain range and its mirror image scroll slowly; the ground scrolls at full speed;
  // craters and rocks are scattered at random sizes so nothing repeats the same way.
  buildScenery(c) {
    const sc = c.artScale || 1;
    const groundTop = K.GAME_H - this.textures.get(c.groundStrip).getSourceImage().height * sc;
    this.groundTop = groundTop;
    const my = c.mountainsY != null ? c.mountainsY : groundTop + 2;
    this.lanes = [
      new WrapStrip(this, { keys: c.mountains, factor: K.PARALLAX_HILLS, scale: sc, y: my, originY: c.mountainsY != null ? 0 : 1, depth: 1 }),
      new WrapStrip(this, { keys: [c.groundStrip], factor: K.PARALLAX_GROUND, scale: sc, y: groundTop, originY: 0, depth: 2 }),
      new ScrollLane(this, {
        keys: c.decor, seed: c.chapter + '-decor', factor: 1, origin: [0.5, 0.5], stepPx: true,
        scaleX: [0.6 * sc, 1.3 * sc], scaleY: null, step: [90, 230], depth: 3,
        y: (r, img) => {
          const t = r.frac();                                   // 0 = near horizon, 1 = front
          img.setScale(img.scaleX * (0.55 + 0.65 * t));          // perspective: further = smaller
          return groundTop + 10 + t * (K.GAME_H - groundTop - 16);
        },
        skip: x => this.finds && this.finds.some(f => Math.abs(x - (f.x + K.ROVER_SCREEN_X)) < 110)
      })
    ];
    this.lanes.forEach(l => l.update(0));
  }
}
