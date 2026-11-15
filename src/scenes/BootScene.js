// Loading screen (README 9.1): progress bar, then "Tap to start". The tap unlocks audio.
// Missing PNGs never block: they get grey placeholders (Assets.finish).
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this.failed = new Set();
    // The real sun is not loaded yet, so a code-drawn one pulses while we load
    this.sunG = this.add.graphics().setPosition(240, 96);
    this.sunG.fillStyle(0xe8c34a);
    for (let a = 0; a < 8; a++) {
      const r = a * Math.PI / 4;
      this.sunG.fillRect(Math.round(Math.cos(r) * 24) - 3, Math.round(Math.sin(r) * 24) - 3, 6, 6);
    }
    this.sunG.fillCircle(0, 0, 14);
    this.tweens.add({ targets: this.sunG, scale: 1.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.rectangle(240, 190, 202, 12, 0x4a4a55).setOrigin(0.5);
    const bar = this.add.rectangle(140, 190, 1, 8, 0xe8c34a).setOrigin(0, 0.5);
    this.load.on('progress', v => bar.setSize(Math.max(1, Math.round(200 * v)), 8));
    this.load.on('loaderror', f => { this.failed.add(f.key); console.warn('Missing asset, using placeholder:', f.key); });

    Assets.MANIFEST.forEach(a => this.load.image(a.key, `assets/${a.key}.png`));
    this.load.json('cards', 'src/data/cards.json');
  }

  create() {
    Cards.init(this.cache.json.get('cards'));
    State.load();
    AudioSys.setMuted(!State.sound);
    Assets.finish(this, this.failed);
    Fx.ensure(this);

    this.tweens.killAll();           // stop the loading-screen tweens before clearing it
    this.children.removeAll(true);   // clear the loading bar
    this.add.image(240, 56, 'logo');
    const sun = this.add.image(240, 130, 'sun');
    this.tweens.add({ targets: sun, scale: 1.12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.sprite(240, 196, 'mars_rover', 0).setOrigin(0.5, 1).setScale(3);
    const tap = new PixelText(this, 240, 236, 'Tap to start', { size: 16, bold: true, color: '#fff3a0', shadow: '#14141f' });
    this.tweens.add({ targets: tap, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });   // slow, well under 3 Hz

    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      AudioSys.unlock();        // must happen inside this tap
      AudioSys.loadMp3s();
      AudioSys.play('ui_tap');
      this.cameras.main.fadeOut(250);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(BootScene.NEXT));
    };
    this.input.once('pointerup', go);   // pointerup counts as a gesture on iOS too
    this.input.keyboard.once('keydown-SPACE', go);
    this.input.keyboard.once('keydown-ENTER', go);
  }
}
BootScene.NEXT = 'HomeScene';
