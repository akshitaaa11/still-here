// Home (README 9.2): two Mission Cards (both open from the start), Album, Sound, Reset,
// and the three patch slots. Collected finds show their real picture, the rest a "?".
class HomeScene extends Phaser.Scene {
  constructor() { super('HomeScene'); }

  create() {
    Fx.fitCamera(this);
    Fx.ensure(this);
    this.leaving = false;
    this.cameras.main.fadeIn(250);
    this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x0b0b1a);
    Fx.stars(this, 90, 0, 269, 'home-stars');
    this.add.image(240, 40, 'logo');

    // Two planets: tap one to play that chapter
    this.planetButton(124, 'moon', 'Moon', 'MoonScene', 0);
    this.planetButton(356, 'mars', 'Mars', 'MarsScene', 1);

    // Bottom row: Album, Sound, Vibrate, Reset, patches (and the certificate once it is earned)
    const y = 240;
    new Button(this, 40, y, 'Album', () => this.go('AlbumHallScene'), { w: 64, h: 24, size: 12 });
    this.soundBtn = new Button(this, 112, y, this.soundLabel(), () => {
      State.setSound(!State.sound);
      AudioSys.setMuted(!State.sound);
      this.soundBtn.setText(this.soundLabel());
    }, { w: 76, h: 24, size: 10, face: 0x4a4a55, lip: 0x2b2b33 });
    this.vibBtn = new Button(this, 196, y, this.vibLabel(), () => {
      State.setVibrate(!State.vibrate);
      this.vibBtn.setText(this.vibLabel());
      Haptics.tap();                           // a little buzz to show it is on
    }, { w: 84, h: 24, size: 10, face: 0x4a4a55, lip: 0x2b2b33 });
    new Button(this, 268, y, 'Reset', () => this.confirmReset(), { w: 52, h: 24, size: 10, face: 0x4a4a55, lip: 0x2b2b33 });

    ['moon', 'mars', 'gold'].forEach((p, i) => {
      const earned = State.hasPatch(p);
      const img = this.add.image(316 + i * 34, y, earned ? 'patch_' + p : this.emptyPatch()).setScale(0.45);
      if (!earned) img.setAlpha(0.6);
    });
    if (State.hasPatch('gold')) {
      new Button(this, 440, y, 'Certificate', () => this.go('CertificateScene'), { w: 76, h: 24, size: 10, face: 0xe8c34a, lip: 0xb58a1f, color: '#14141f' });
    }
  }

  soundLabel() { return State.sound ? 'Sound: ON' : 'Sound: OFF'; }
  vibLabel() { return State.vibrate ? 'Vibrate: ON' : 'Vibrate: OFF'; }

  // Dim round slot for a patch not earned yet
  emptyPatch() {
    if (this.textures.exists('patch_empty')) return 'patch_empty';
    const t = this.textures.createCanvas('patch_empty', 64, 64), c = t.getContext();
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const r = Math.hypot(x + 0.5 - 32, y + 0.5 - 32);
        if (r > 31) continue;
        const a = Math.atan2(y - 32, x - 32);
        c.fillStyle = r > 27 ? (Math.floor((a + Math.PI) * 6) % 2 ? '#4a4a55' : '#2b2b33') : '#1b1b36';
        c.fillRect(x, y, 1, 1);
      }
    }
    t.refresh();
    return 'patch_empty';
  }

  // A round pixel planet (canvas-resolution art, shown at scale 0.5). Hover: it grows a little and
  // a pixel glow fades in around its edge. Phones have no hover, so a press does the same.
  planetButton(x, ch, label, sceneKey, i) {
    const y = 138, base = 0.5, big = 0.56;
    const glow = this.add.image(x, y, 'planet_glow_' + ch).setScale(base).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
    const planet = this.add.image(x, y + 30, 'planet_' + ch).setScale(base).setAlpha(0).setDepth(0.5);
    const name = new PixelText(this, x, 210, label, { size: 12, bold: true, color: '#f4f1ea', shadow: '#14141f' }).setAlpha(0);

    // float up into place, then drift very gently
    this.tweens.add({ targets: planet, y, alpha: 1, duration: 600, delay: 150 + i * 150, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: [planet, glow], y: y - 2, duration: 1800 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }) });
    this.tweens.add({ targets: name, alpha: 1, duration: 400, delay: 450 + i * 150 });

    let hovered = false, down = false, pulse = null;
    const set = on => {
      hovered = on;
      this.tweens.killTweensOf([glow]);
      if (pulse) { pulse.stop(); pulse = null; }
      this.tweens.add({ targets: [planet, glow], scale: on ? big : base, duration: 180, ease: 'Back.easeOut' });
      this.tweens.add({ targets: glow, alpha: on ? 1 : 0, duration: 200,
        onComplete: () => { if (on && hovered) pulse = this.tweens.add({ targets: glow, alpha: 0.75, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } });
    };
    const hit = Fx.hitRect(this, x, y, 116, 116);
    hit.on('pointerover', () => set(true));
    hit.on('pointerout', () => { down = false; set(false); });
    hit.on('pointerdown', () => { down = true; AudioSys.play('ui_tap'); Haptics.tap(); if (!hovered) set(true); });
    hit.on('pointerup', () => { if (!down) return; down = false; this.go(sceneKey); });
    (this.planets = this.planets || {})[ch] = { planet, glow, name };
  }

  go(key, data) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }

  // Reset needs a second, deliberate tap
  confirmReset() {
    const objs = [];
    const ov = this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x000000, 0.65).setDepth(100).setInteractive();
    const panel = this.add.rectangle(240, 135, 260, 104, 0x1b1b36).setStrokeStyle(2, 0xe8c34a).setDepth(101);
    const t = new PixelText(this, 240, 108, 'Reset all progress?', { size: 12, bold: true, color: '#ffffff', shadow: '#14141f' }).setDepth(102);
    const t2 = new PixelText(this, 240, 128, 'Cards and patches will be cleared.', { size: 8, color: '#b9b9c4' }).setDepth(102);
    objs.push(ov, panel, t, t2);
    const close = () => { objs.forEach(o => o.destroy()); yes.destroy(); no.destroy(); };
    const yes = new Button(this, 196, 160, 'Yes, reset', () => { State.reset(); MoonScene.factShown = false; this.scene.restart(); },
      { w: 84, h: 24, size: 10, face: 0xc2403a, lip: 0x5a2a1c }).setDepth(103);
    const no = new Button(this, 290, 160, 'No', close, { w: 64, h: 24, size: 10 }).setDepth(103);
  }
}
