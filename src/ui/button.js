// Reusable squish button (README 10.6): scale 0.92 for ~0.15 s, ui_tap sound, and a touch
// target of at least 44 CSS px however far the 480x270 canvas is scaled.
// Coordinates are local to wherever the parts are added (scene, or a card container).
class Button {
  constructor(scene, x, y, label, onTap, o = {}) {
    this.scene = scene; this.onTap = onTap; this.enabled = true; this.down = false;
    this.w = o.w || 96; this.h = o.h || 24;
    const face = o.face != null ? o.face : 0xe8803a, lip = o.lip != null ? o.lip : 0x8e4a2e;

    this.visual = scene.add.container(x, y);   // squish target
    this.inner = scene.add.container(0, 0);    // pulse target (separate so they never fight)
    this.visual.add(this.inner);
    // even sizes centred on whole pixels keep every edge crisp
    const edge = scene.add.rectangle(0, 1, this.w + 2, this.h + 2, 0x14141f);
    const base = scene.add.rectangle(0, 2, this.w, this.h, lip);
    const top = scene.add.rectangle(0, 0, this.w, this.h, face);
    const shine = scene.add.rectangle(0, -this.h / 2 + 2, this.w - 6, 1, 0xffffff, 0.45);
    this.label = new PixelText(scene, 0, 0, label, { size: o.size || 10, bold: true, color: o.color || '#ffffff', shadow: '#14141f' });
    this.inner.add([edge, base, top, shine, this.label]);

    this.zone = scene.add.zone(x, y, this.w, this.h).setInteractive({ useHandCursor: true });
    this.fitHit();
    this.onResize = () => this.fitHit();
    scene.scale.on('resize', this.onResize);

    this.zone.on('pointerdown', () => {
      if (!this.enabled) return;
      this.down = true;
      AudioSys.play('ui_tap');
      scene.tweens.killTweensOf(this.visual);
      scene.tweens.add({ targets: this.visual, scaleX: 0.92, scaleY: 0.92, duration: 70 });
    });
    this.zone.on('pointerup', () => {
      if (!this.down) return;
      this.down = false;
      this.release();
      if (this.onTap) this.onTap();
    });
    this.zone.on('pointerout', () => { if (this.down) { this.down = false; this.release(); } });
  }

  release() {
    this.scene.tweens.killTweensOf(this.visual);
    this.scene.tweens.add({ targets: this.visual, scaleX: 1, scaleY: 1, duration: 80, ease: 'Back.easeOut' });
  }

  // Hit area never smaller than 44 CSS px on the real screen
  fitHit() {
    const ds = this.scene.scale.displayScale ? this.scene.scale.displayScale.x : 1;
    const min = 44 / (ds || 1);
    this.zone.setSize(Math.max(this.w, min), Math.max(this.h, min));
  }

  // Put the button parts into a container (the card popup does this)
  addTo(container) { container.add([this.visual, this.zone]); return this; }

  setDepth(d) { this.visual.setDepth(d); this.zone.setDepth(d + 1); return this; }

  setEnabled(on) { this.enabled = on; this.inner.setAlpha(on ? 1 : 0.45); return this; }
  setText(t) { this.label.setString(t); return this; }

  pulse(on) {
    this.scene.tweens.killTweensOf(this.inner);
    this.inner.setScale(1);
    if (on) this.scene.tweens.add({ targets: this.inner, scaleX: 1.07, scaleY: 1.07, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return this;
  }

  destroy() {
    this.scene.scale.off('resize', this.onResize);
    this.scene.tweens.killTweensOf([this.visual, this.inner]);
    this.zone.destroy();
    this.visual.destroy();
  }
}
