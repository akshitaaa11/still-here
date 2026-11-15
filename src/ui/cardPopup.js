// The find card and Collect animation (README 10.1, 11.1, 11.2). Shared by both chapters.
// Only the "Collect it!" button collects, and it only wakes up after the text reveal ends.
const CardPopup = {
  active: false,
  ready: false,      // true only while "Collect it!" can be tapped

  // Resolves after the Collect animation ends. opts: { slotIndex, topBar, target }
  // `target` is the world sprite(s) to make glow when found.
  async show(scene, cardId, opts = {}) {
    const card = Cards.get(cardId);
    if (!card) { console.warn('Unknown card', cardId); return false; }
    if (this.active) return false;
    this.active = true;

    const topBar = opts.topBar || scene.topBar;
    const slotIndex = opts.slotIndex != null ? opts.slotIndex : Cards.slotIndex(cardId);
    const wasOwned = State.has(cardId);
    const targets = [].concat(opts.target || []).filter(Boolean);

    // Step 2: the item glows and sparkles with a short ding (0.6 s)
    AudioSys.play('sparkle');
    Haptics.find();
    const t0 = targets[0];
    Fx.burst(scene, t0 ? t0.x : 240, t0 ? t0.y - t0.displayHeight / 2 : 130, 14, { depth: 95 });
    targets.forEach(t => t.setTint && t.setTint(0xfff3a0));
    // one gentle pulse over the 0.6 s (kid-safe: never flash faster than 3 Hz)
    if (targets.length) scene.tweens.add({ targets, alpha: { from: 1, to: 0.6 }, duration: 300, yoyo: true });
    await Fx.wait(scene, 600);
    targets.forEach(t => { if (t.clearTint) t.clearTint(); t.alpha = 1; });

    // Step 3: soft dark overlay (it also swallows taps meant for things behind the card)
    const overlay = scene.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x000000).setAlpha(0).setDepth(100).setInteractive();
    await Fx.tween(scene, { targets: overlay, alpha: 0.6, duration: 300 });

    // Step 4: card slides up from the bottom with a gentle overshoot
    const cardObj = scene.add.container(240, 135 + 300).setDepth(101);
    const g = scene.add.graphics();
    g.fillStyle(0x14141f).fillRect(-192, -102, 384, 204);
    g.fillStyle(0xe8c34a).fillRect(-190, -100, 380, 200);
    g.fillStyle(0x1b1b36).fillRect(-187, -97, 374, 194);
    g.fillStyle(0x0b0b1a).fillRect(-178, -86, 120, 104);
    cardObj.add(g);

    const pic = scene.add.image(-118, -34, CardArt.picture(scene, card, 112, 96)).setScale(0);
    const tag = new PixelText(scene, -118, 34, `Found on the ${card.chapter === 'moon' ? 'Moon' : 'Mars'}`,
      { size: 8, color: '#b9b9c4', shadow: '#14141f' }).setAlpha(0);
    const name = new PixelText(scene, -46, -88, card.name, { size: 16, bold: true, color: '#e8c34a', shadow: '#14141f', originX: 0, originY: 0 }).setAlpha(0);
    const lines = PixelText.wrapLines(card.short, 224, { size: 10 }).map((l, i) =>
      new PixelText(scene, -46, -60 + i * 14, l, { size: 10, color: '#f4f1ea', shadow: '#14141f', originX: 0, originY: 0 }).setAlpha(0));
    cardObj.add([pic, tag, name, ...lines]);

    let collecting = false;
    const btn = new Button(scene, 0, 70, 'Collect it!', () => { if (!collecting) onCollect(); },
      { w: 140, h: 30, size: 12, face: 0xe8c34a, lip: 0xb58a1f, color: '#14141f' });
    btn.addTo(cardObj);
    btn.visual.setAlpha(0);
    btn.setEnabled(false);          // asleep until the text has finished

    AudioSys.play('card_open');
    await Fx.tween(scene, { targets: cardObj, y: 135, duration: 500, ease: 'Back.easeOut' });

    // Step 5: picture pops in, then name, then the lines one after another (1.2 s total)
    scene.tweens.add({ targets: pic, scale: 1, duration: 250, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: [tag, name], alpha: 1, duration: 200, delay: 250 });
    const per = 750 / Math.max(1, lines.length);
    lines.forEach((l, i) => scene.tweens.add({ targets: l, alpha: 1, duration: 120, delay: 450 + i * per }));
    await Fx.wait(scene, 1200);

    // Step 6: the Collect button wakes up and pulses softly
    btn.setEnabled(true);
    this.ready = true;
    scene.tweens.add({ targets: btn.visual, alpha: 1, duration: 150 });
    btn.pulse(true);

    // Wait for the one thing that can collect
    let onCollect;
    await new Promise(res => { onCollect = () => { collecting = true; res(); }; });
    this.ready = false;
    btn.pulse(false);
    btn.setEnabled(false);

    // Collect animation: card shrinks and flies in an arc to its top-bar slot (0.7 s)
    AudioSys.play('collect');
    Haptics.collect();
    const dest = topBar ? topBar.getSlotPosition(slotIndex) : { x: 20, y: 14 };
    const p0 = { x: cardObj.x, y: cardObj.y }, c = { x: (p0.x + dest.x) / 2 + 40, y: Math.min(p0.y, dest.y) - 50 };
    const trail = scene.time.addEvent({ delay: 40, loop: true, callback: () => Fx.trail(scene, cardObj.x, cardObj.y, 150) });
    await new Promise(res => scene.tweens.addCounter({
      from: 0, to: 1, duration: 700, ease: 'Sine.easeInOut',
      onUpdate: tw => {
        const t = tw.getValue(), u = 1 - t;
        cardObj.x = u * u * p0.x + 2 * u * t * c.x + t * t * dest.x;      // quadratic arc
        cardObj.y = u * u * p0.y + 2 * u * t * c.y + t * t * dest.y;
        cardObj.setScale(1 - 0.9 * t);
      },
      onComplete: res
    }));
    trail.remove();
    cardObj.destroy();
    btn.destroy();

    // Silhouette fills, counter ticks up with a jingle. Collecting twice never double-counts.
    State.collect(cardId);
    if (topBar) {
      await topBar.fill(slotIndex);
      if (!wasOwned) AudioSys.play('jingle_progress');
      await topBar.setCounter(State.countChapter(topBar.chapter), topBar.total, !wasOwned);
    }

    // Overlay fades out and the arrow glows to say "keep going"
    await Fx.tween(scene, { targets: overlay, alpha: 0, duration: 300 });
    overlay.destroy();
    this.active = false;
    Controls.glow(scene);
    return true;
  }
};
