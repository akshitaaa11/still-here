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

    this.missionCard(124, 'moon', 'Moon Mission', 'Find the 5 things the astronauts left behind!', 0);
    this.missionCard(356, 'mars', 'Mars Mission', 'Find the 4 things left behind on Mars!', 1);

    // Bottom row: Album, Sound, Reset, patches (and the certificate once it is earned)
    const y = 240;
    new Button(this, 46, y, 'Album', () => this.go('AlbumHallScene'), { w: 72, h: 24, size: 12 });
    this.soundBtn = new Button(this, 132, y, this.soundLabel(), () => {
      State.setSound(!State.sound);
      AudioSys.setMuted(!State.sound);
      this.soundBtn.setText(this.soundLabel());
    }, { w: 88, h: 24, size: 10, face: 0x4a4a55, lip: 0x2b2b33 });
    new Button(this, 214, y, 'Reset', () => this.confirmReset(), { w: 60, h: 24, size: 10, face: 0x4a4a55, lip: 0x2b2b33 });

    ['moon', 'mars', 'gold'].forEach((p, i) => {
      const earned = State.hasPatch(p);
      const img = this.add.image(282 + i * 38, y, earned ? 'patch_' + p : this.emptyPatch()).setScale(0.5);
      if (!earned) img.setAlpha(0.6);
    });
    if (State.hasPatch('gold')) {
      new Button(this, 434, y, 'Certificate', () => this.go('CertificateScene'), { w: 84, h: 24, size: 10, face: 0xe8c34a, lip: 0xb58a1f, color: '#14141f' });
    }
  }

  soundLabel() { return State.sound ? 'Sound: ON' : 'Sound: OFF'; }

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

  missionCard(x, ch, title, text, i) {
    const y = 148, w = 212, h = 124;
    const c = this.add.container(x, y + 40).setAlpha(0);
    const g = this.add.graphics();
    g.fillStyle(0x14141f).fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
    g.fillStyle(ch === 'moon' ? 0xb9b9c4 : 0xe8a46a).fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle(0x1b1b36).fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    c.add(g);
    c.add(new PixelText(this, 0, -h / 2 + 14, title, { size: 12, bold: true, color: '#e8c34a', shadow: '#14141f' }));
    c.add(new PixelText(this, 0, -h / 2 + 40, text, { size: 10, color: '#f4f1ea', shadow: '#14141f', wrap: w - 20, align: 'center' }));

    const cards = Cards.byChapter(ch), sw = 32, x0 = -(cards.length - 1) * sw / 2;
    cards.forEach((card, k) => {
      const owned = State.has(card.id);
      c.add(this.add.rectangle(x0 + k * sw, 18, 30, 30, owned ? 0x0b0b1a : 0x3a3a5a));   // lighter backing so black silhouettes show
      const im = this.add.image(x0 + k * sw, 18, owned ? CardArt.picture(this, card, 28, 28) : CardArt.silhouette(this, card, 28, 28));
      c.add(im);
      if (!owned) this.tweens.add({ targets: im, scale: 1.1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: k * 150 });
    });
    const n = State.countChapter(ch);
    const counter = new PixelText(this, 0, 48, `${n} / ${cards.length}`, { size: 12, bold: true, color: '#fff3a0', shadow: '#14141f' });
    c.add(counter);
    (this.counters = this.counters || {})[ch] = counter;

    // Floats up, then reacts to hover/press; a tap starts the chapter
    this.tweens.add({ targets: c, y, alpha: 1, duration: 500, delay: 150 + i * 150, ease: 'Back.easeOut' });
    const zone = Fx.hitRect(this, x, y, w, h);
    let down = false;
    const to = s => { this.tweens.killTweensOf(c); this.tweens.add({ targets: c, scale: s, y, alpha: 1, duration: 120 }); };
    zone.on('pointerover', () => to(1.04));
    zone.on('pointerout', () => { down = false; to(1); });
    zone.on('pointerdown', () => { down = true; AudioSys.play('ui_tap'); to(0.96); });
    zone.on('pointerup', () => { if (!down) return; down = false; to(1); this.go(ch === 'moon' ? 'MoonScene' : 'MarsScene'); });
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
