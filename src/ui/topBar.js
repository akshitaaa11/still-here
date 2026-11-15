// Top bar: one slot per find (black "?" silhouette until collected), a counter, and
// (Mars only) a battery bar. getSlotPosition() is where the collected card flies to.
class TopBar {
  constructor(scene, o) {
    this.scene = scene;
    this.chapter = o.chapter;
    this.cards = Cards.byChapter(o.chapter);
    this.total = this.cards.length;
    this.slotW = 22; this.gap = 4; this.x0 = 8; this.y = 14;
    const D = 90;

    scene.add.rectangle(0, 0, K.GAME_W, 28, 0x0b0b1a, 0.6).setOrigin(0, 0).setDepth(D);
    this.slots = this.cards.map((card, i) => {
      const p = this.getSlotPosition(i);
      scene.add.rectangle(p.x, p.y, this.slotW + 2, this.slotW + 2, 0x4a4a55).setDepth(D + 1);
      scene.add.rectangle(p.x, p.y, this.slotW, this.slotW, 0x1b1b36).setDepth(D + 1);
      const owned = State.has(card.id);
      const img = scene.add.image(p.x, p.y, this.artKey(card, owned)).setDepth(D + 2);
      return { card, img, filled: owned };
    });

    const cx = this.x0 + this.total * (this.slotW + this.gap) + 4;
    this.counter = new PixelText(scene, cx, this.y, '', { size: 10, bold: true, color: '#fff3a0', shadow: '#14141f', originX: 0 });
    this.counter.setDepth(D + 2);
    this.setCounter(State.countChapter(this.chapter), this.total, false);

    if (o.battery) {   // Mars only
      this.batX = cx + 60;
      scene.add.rectangle(this.batX, this.y, 82, 12, 0x14141f).setOrigin(0, 0.5).setDepth(D + 1);
      this.batBar = scene.add.rectangle(this.batX + 1, this.y, 80, 10, 0xe8c34a).setOrigin(0, 0.5).setDepth(D + 2);
    }
  }

  artKey(card, owned) {
    const s = this.slotW - 2;
    return owned ? CardArt.picture(this.scene, card, s, s) : CardArt.silhouette(this.scene, card, s, s);
  }

  getSlotPosition(i) { return { x: this.x0 + this.slotW / 2 + i * (this.slotW + this.gap), y: this.y }; }

  setBattery(frac) {
    if (!this.batBar) return;
    const f = Phaser.Math.Clamp(frac, 0, 1);
    this.batBar.setSize(Math.max(0, Math.round(80 * f)), 10);
    this.batBar.setFillStyle(f < 0.25 ? 0xc2403a : 0xe8c34a);
  }

  // Silhouette flips and fills with the real picture, small flash (about 0.4 s)
  async fill(index) {
    const slot = this.slots[index];
    if (!slot || slot.filled) return;
    slot.filled = true;
    const s = this.scene;
    await Fx.tween(s, { targets: slot.img, scaleX: 0, duration: 150 });
    slot.img.setTexture(this.artKey(slot.card, true));
    const p = this.getSlotPosition(index);
    const flash = s.add.rectangle(p.x, p.y, this.slotW, this.slotW, 0xfff3a0).setDepth(95);
    s.tweens.add({ targets: flash, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
    Fx.burst(s, p.x, p.y, 8, { depth: 96 });
    await Fx.tween(s, { targets: slot.img, scaleX: 1, duration: 150, ease: 'Back.easeOut' });
  }

  // Counter ticks up with a little pop (about 0.3 s)
  async setCounter(n, total, animate = true) {
    this.counter.setString(`${n} / ${total}`);
    if (!animate) return;
    this.counter.setScale(1.5);
    await Fx.tween(this.scene, { targets: this.counter, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.easeOut' });
  }
}
