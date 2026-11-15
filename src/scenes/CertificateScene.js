// Certificate (README 9.6): shown only once both patches are earned. No logos.
class CertificateScene extends Phaser.Scene {
  constructor() { super('CertificateScene'); }

  create() {
    if (!(State.hasPatch('moon') && State.hasPatch('mars'))) { this.scene.start('HomeScene'); return; }
    this.cameras.main.fadeIn(250);
    this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x0b0b1a);
    Fx.stars(this, 60, 0, 269, 'cert-stars');
    const g = this.add.graphics();
    g.fillStyle(0xb58a1f).fillRect(28, 14, 424, 206);
    g.fillStyle(0xe8c34a).fillRect(31, 17, 418, 200);
    g.fillStyle(0x1b1b36).fillRect(36, 22, 408, 190);

    new PixelText(this, 240, 46, 'Still Here Explorer', { size: 16, bold: true, color: '#e8c34a', shadow: '#14141f' });
    ['moon', 'mars', 'gold'].forEach((p, i) => {
      const img = this.add.image(160 + i * 80, 112, 'patch_' + p).setScale(0);
      this.tweens.add({ targets: img, scale: 1, duration: 450, delay: 200 + i * 200, ease: 'Back.easeOut' });
    });
    new PixelText(this, 240, 168, 'You met everything that was left behind.', { size: 12, bold: true, color: '#ffffff', shadow: '#14141f' });
    new PixelText(this, 240, 194, 'Screenshot this to keep it!', { size: 8, color: '#b9b9c4' });
    this.time.delayedCall(800, () => { AudioSys.play('patch_fanfare'); Fx.burst(this, 240, 112, 24); });

    new Button(this, 240, 244, 'Home', () => {
      this.cameras.main.fadeOut(250);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('HomeScene'));
    }, { w: 84, h: 24, size: 12 });
  }
}
