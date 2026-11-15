// Album Hall (README 9.5, 11.5): the finale and the album. Two shelves (Moon 5, Mars 4).
// Tap a collected card: the board dims (and blurs where WebGL allows), the card lifts and
// flies to the centre with a small flip, and a detail panel slides in beside it.
// Close with X, Esc, or a tap outside; < > (or keyboard arrows) move between collected cards.
// The game is always 480x270 landscape (portrait shows the rotate overlay), so the panel
// always sits beside the card.
class AlbumHallScene extends Phaser.Scene {
  constructor() { super('AlbumHallScene'); }

  init(data) {
    this.finale = !!(data && data.finale);
    this.focus = null;
    this.busy = false;
  }

  create() {
    Fx.fitCamera(this);
    Fx.ensure(this);
    this.cameras.main.fadeIn(250);
    this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x0b0b1a);
    Fx.stars(this, 80, 0, 269, 'album-stars');
    new PixelText(this, 240, 14, 'Album Hall', { size: 16, bold: true, color: '#e8c34a', shadow: '#14141f' });

    this.slots = [];
    let k = 0;
    [{ ch: 'moon', label: 'Moon (5)', y: 76 }, { ch: 'mars', label: 'Mars (4)', y: 174 }].forEach(row => {
      const cards = Cards.byChapter(row.ch);
      new PixelText(this, 14, row.y - 44, row.label, { size: 10, bold: true, color: '#b9b9c4', shadow: '#14141f', originX: 0 });
      this.add.rectangle(240, row.y + 46, 456, 3, 0x5c3a26);     // shelf plank
      this.add.rectangle(240, row.y + 48, 456, 1, 0x3a2418);
      const spacing = 90, x0 = 240 - (cards.length - 1) * spacing / 2;
      cards.forEach((card, i) => this.makeSlot(card, x0 + i * spacing, row.y, k++));
    });

    new Button(this, 40, 254, 'Back', () => this.go('HomeScene'), { w: 64, h: 20, size: 10, face: 0x4a4a55, lip: 0x2b2b33 });
    if (this.finale || (State.hasPatch('moon') && State.hasPatch('mars'))) {
      const cb = new Button(this, 424, 254, 'Certificate', () => this.go('CertificateScene'),
        { w: 92, h: 20, size: 10, face: 0xe8c34a, lip: 0xb58a1f, color: '#14141f' });
      if (this.finale) cb.pulse(true);
    }

    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-LEFT', () => this.nav(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.nav(1));
  }

  go(key) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }

  // One framed thumbnail on a shelf
  makeSlot(card, x, y, k) {
    const owned = State.has(card.id);
    const cont = this.add.container(x, y + 16).setAlpha(0).setDepth(10);
    const g = this.add.graphics();
    g.fillStyle(0x14141f).fillRect(-38, -30, 76, 60);
    g.fillStyle(owned ? 0xe8c34a : 0x4a4a55).fillRect(-37, -29, 74, 58);
    g.fillStyle(owned ? 0x0b0b1a : 0x3a3a5a).fillRect(-34, -26, 68, 52);   // lighter backing so black silhouettes show
    const img = this.add.image(0, 0, owned ? CardArt.picture(this, card, 64, 48) : CardArt.silhouette(this, card, 64, 48));
    const name = new PixelText(this, 0, 39, owned ? card.name : '???', { size: 8, bold: true, color: owned ? '#f4f1ea' : '#7b7b88', shadow: '#14141f', wrap: 86, align: 'center' });
    cont.add([g, img, name]);
    // Staggered float-in
    this.tweens.add({ targets: cont, y, alpha: 1, duration: 400, delay: 100 + k * 70, ease: 'Back.easeOut' });

    const slot = { card, owned, x, y, cont, img, name };
    const zone = Fx.hitRect(this, x, y + 4, 84, 84).setDepth(11);
    zone.on('pointerup', () => (owned ? this.open(slot) : this.hint(slot)));
    this.slots.push(slot);
  }

  // Locked card: small shake + where to find it
  hint(slot) {
    if (this.focus || this.busy) return;
    AudioSys.play('ui_tap');
    this.tweens.add({ targets: slot.cont, x: slot.x + 3, duration: 50, yoyo: true, repeat: 3, onComplete: () => (slot.cont.x = slot.x) });
    if (slot.hintText) slot.hintText.destroy();
    const t = new PixelText(this, slot.x, slot.y - 36, slot.card.chapter === 'moon' ? 'Find it on the Moon' : 'Find it on Mars',
      { size: 8, bold: true, color: '#fff3a0', shadow: '#14141f' }).setDepth(40);
    slot.hintText = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 400, onComplete: () => t.destroy() });
  }

  collected() { return this.slots.filter(s => s.owned); }

  // Dim + blur the board (blur only where the renderer supports it)
  dimBoard(on) {
    if (on) {
      this.overlay = this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x000000).setAlpha(0).setDepth(50).setInteractive();
      // Tap outside closes, but only when nothing else is under the finger (a button made
      // this very frame is not in Phaser's top-most ordering yet)
      this.overlay.on('pointerup', p => {
        if (this.input.hitTestPointer(p).some(o => o !== this.overlay)) return;
        this.close();
      });
      this.tweens.add({ targets: this.overlay, alpha: 0.65, duration: 250 });
      this.slots.forEach(s => {
        try { if (s.img.preFX) s.blur = s.img.preFX.addBlur(0, 2, 2, 1); } catch (e) { /* canvas renderer: dim only */ }
      });
    } else if (this.overlay) {
      const ov = this.overlay;
      this.overlay = null;
      this.tweens.add({ targets: ov, alpha: 0, duration: 250, onComplete: () => ov.destroy() });
      this.slots.forEach(s => { try { if (s.img.preFX) s.img.preFX.clear(); } catch (e) { /* ignore */ } s.blur = null; });
    }
  }

  // The big card that flies to the centre
  makeBig(card) {
    const c = this.add.container(0, 0).setDepth(60);
    const g = this.add.graphics();
    g.fillStyle(0x14141f).fillRect(-68, -72, 136, 144);
    g.fillStyle(0xe8c34a).fillRect(-66, -70, 132, 140);
    g.fillStyle(0x0b0b1a).fillRect(-62, -66, 124, 132);
    const pic = this.add.image(0, -6, CardArt.picture(this, card, 120, 104));
    const tag = new PixelText(this, 0, 56, card.chapter === 'moon' ? 'Found on the Moon' : 'Found on Mars', { size: 8, bold: true, color: '#b9b9c4' });
    const hit = this.add.rectangle(0, 0, 136, 144, 0x000000, 0).setInteractive();   // taps on the card do not close it
    c.add([g, pic, tag, hit]);
    c.tagText = tag;
    return c;
  }

  // Detail panel: name, short text, Read more (toggles the long story in place), source link
  makePanel(card) {
    const p = this.add.container(196, 30).setDepth(60);
    const W = 274, H = 214;
    const g = this.add.graphics();
    g.fillStyle(0x14141f).fillRect(-2, -2, W + 4, H + 4);
    g.fillStyle(0xe8c34a).fillRect(0, 0, W, H);
    g.fillStyle(0x1b1b36).fillRect(3, 3, W - 6, H - 6);
    const hit = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setInteractive();   // swallow taps inside
    p.add([g, hit]);
    p.nameText = new PixelText(this, 12, 10, card.name, { size: 16, bold: true, color: '#e8c34a', shadow: '#14141f', originX: 0, originY: 0 });
    p.shortText = new PixelText(this, 12, 36, card.short, { size: 10, color: '#f4f1ea', shadow: '#14141f', wrap: W - 34, lineH: 13, originX: 0, originY: 0 });
    p.longText = new PixelText(this, 12, 36, card.long, { size: 10, color: '#f4f1ea', shadow: '#14141f', wrap: W - 34, lineH: 12, originX: 0, originY: 0 }).setVisible(false);
    p.add([p.nameText, p.shortText, p.longText]);
    p.expanded = false;
    p.readBtn = new Button(this, 56, 172, 'Read more', () => {
      p.expanded = !p.expanded;
      p.shortText.setVisible(!p.expanded);
      p.longText.setVisible(p.expanded).setAlpha(0);
      if (p.expanded) this.tweens.add({ targets: p.longText, alpha: 1, duration: 250 });
      p.readBtn.setText(p.expanded ? 'Read less' : 'Read more');
    }, { w: 84, h: 20, size: 10 });
    p.readBtn.addTo(p);
    // Source link: a real NASA/article URL, only when verified (never a guessed link)
    if (card.verified && card.sourceUrl) {
      p.source = new PixelText(this, 12, 188, 'Source: ' + card.sourceLabel, { size: 8, bold: true, color: '#8fc0ff', wrap: W - 24, originX: 0, originY: 0 });
      p.source.setInteractive({ useHandCursor: true });
      p.source.on('pointerup', () => { try { window.open(card.sourceUrl, '_blank', 'noopener'); } catch (e) { /* blocked */ } });
      p.add(p.source);
    }
    return p;
  }

  async open(slot) {
    if (this.focus || this.busy) return;
    this.busy = true;
    AudioSys.play('album_whoosh');
    this.dimBoard(true);
    slot.cont.setVisible(false);
    const big = this.makeBig(slot.card);
    big.setPosition(slot.x, slot.y).setScale(0.55);
    // lift, grow, fly to centre with a small flip (about 0.5 s)
    this.tweens.add({ targets: big, scaleX: 0, duration: 250, ease: 'Sine.easeIn',
      onComplete: () => this.tweens.add({ targets: big, scaleX: 1, duration: 250, ease: 'Sine.easeOut' }) });
    this.tweens.add({ targets: big, scaleY: 1, duration: 500, ease: 'Back.easeOut' });
    const panel = this.makePanel(slot.card);
    panel.x = K.GAME_W + 10;
    await Fx.tween(this, { targets: big, x: 104, y: 132, duration: 500, ease: 'Sine.easeInOut' });
    await Fx.wait(this, 20);
    big.setScale(1);
    await Fx.tween(this, { targets: panel, x: 196, duration: 300, ease: 'Back.easeOut' });
    this.focus = { slot, big, panel };
    this.navBtns = [
      new Button(this, 58, 236, '<', () => this.nav(-1), { w: 40, h: 22, size: 12 }).setDepth(70),
      new Button(this, 150, 236, '>', () => this.nav(1), { w: 40, h: 22, size: 12 }).setDepth(70),
      new Button(this, 455, 44, 'X', () => this.close(), { w: 22, h: 20, size: 12, face: 0x4a4a55, lip: 0x2b2b33 }).setDepth(70)
    ];
    await Fx.wait(this, 50);   // let the new buttons render once before taps count
    this.busy = false;
  }

  // Previous / next collected card, with a slide (uncollected cards are skipped)
  async nav(dir) {
    if (!this.focus || this.busy) return;
    const list = this.collected();
    const i = list.indexOf(this.focus.slot);
    const next = list[(i + dir + list.length) % list.length];
    if (!next || next === this.focus.slot) return;
    this.busy = true;
    AudioSys.play('ui_tap');
    const { big, panel } = this.focus;
    await Fx.tween(this, { targets: [big, panel], x: `-=${dir * 40}`, alpha: 0, duration: 180 });
    big.destroy(); panel.destroy();
    this.focus.slot.cont.setVisible(true);
    next.cont.setVisible(false);
    const nb = this.makeBig(next.card).setPosition(104 + dir * 40, 132).setAlpha(0);
    const np = this.makePanel(next.card).setAlpha(0);
    np.x = 196 + dir * 40;
    this.focus = { slot: next, big: nb, panel: np };
    await Fx.tween(this, { targets: [nb, np], x: `-=${dir * 40}`, alpha: 1, duration: 180 });
    this.busy = false;
  }

  // Card flies back to its own slot while the board un-dims
  async close() {
    if (!this.focus || this.busy) return;
    this.busy = true;
    const { slot, big, panel } = this.focus;
    (this.navBtns || []).forEach(b => b.destroy());
    this.navBtns = null;
    AudioSys.play('album_whoosh');
    this.tweens.add({ targets: panel, x: K.GAME_W + 10, duration: 220, onComplete: () => panel.destroy() });
    this.tweens.add({ targets: big, scaleX: 0, duration: 200, ease: 'Sine.easeIn',
      onComplete: () => this.tweens.add({ targets: big, scaleX: 0.55, duration: 200, ease: 'Sine.easeOut' }) });
    this.dimBoard(false);
    await Fx.tween(this, { targets: big, x: slot.x, y: slot.y, scaleY: 0.55, duration: 400, ease: 'Sine.easeInOut' });
    big.destroy();
    slot.cont.setVisible(true);
    this.focus = null;
    this.busy = false;
  }
}
