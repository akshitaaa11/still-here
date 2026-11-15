// Small shared helpers: promise tweens/waits and pixel sparkles.
const Fx = {
  // 5x5 plus-shaped sparkle texture, made in code
  ensure(scene) {
    if (scene.textures.exists('fx_spark')) return;
    const t = scene.textures.createCanvas('fx_spark', 5, 5);
    const c = t.getContext();
    c.fillStyle = '#fff3a0';
    [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [2, 4]].forEach(([x, y]) => c.fillRect(x, y, 1, 1));
    t.refresh();
  },
  // Twinkling pixel stars, drawn in code (slow fades only, never a fast flash)
  stars(scene, n, yMin, yMax, seed, depth = 0.5) {
    const rng = new Phaser.Math.RandomDataGenerator([seed]);
    for (let i = 0; i < n; i++) {
      const s = scene.add.rectangle(rng.between(0, K.GAME_W - 1), rng.between(yMin, yMax), 1, 1,
        rng.pick([0xffffff, 0xfff3a0, 0xb9b9c4])).setOrigin(0, 0).setDepth(depth);
      if (rng.frac() < 0.35) {
        scene.tweens.add({ targets: s, alpha: 0.2, duration: rng.between(1200, 2600), yoyo: true, repeat: -1, delay: rng.between(0, 2000) });
      }
    }
  },
  // Invisible tap target. Not a Zone: Phaser picks the top-most hit using the camera's
  // render list, and Zones are never rendered, so a Zone always loses to anything drawn
  // under it (e.g. a dark overlay). A rectangle with zero fill alpha is "rendered".
  hitRect(scene, x, y, w, h) {
    return scene.add.rectangle(x, y, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
  },
  resizeHit(obj, w, h) {
    obj.setSize(w, h);
    if (obj.input && obj.input.hitArea) obj.input.hitArea.setTo(0, 0, w, h);
  },
  tween(scene, cfg) { return new Promise(res => scene.tweens.add(Object.assign({}, cfg, { onComplete: () => res() }))); },
  wait(scene, ms) { return new Promise(res => scene.time.delayedCall(ms, res)); },
  // Little burst of sparkles that fly out and fade (slow, never a rapid flash)
  burst(scene, x, y, n, o = {}) {
    this.ensure(scene);
    for (let i = 0; i < n; i++) {
      const s = scene.add.image(x, y, 'fx_spark').setDepth(o.depth || 150).setScale(Phaser.Math.Between(1, 2));
      const a = Math.random() * Math.PI * 2, d = Phaser.Math.Between(14, 38);
      scene.tweens.add({
        targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 6, alpha: 0,
        duration: Phaser.Math.Between(400, 700), ease: 'Sine.easeOut', onComplete: () => s.destroy()
      });
    }
  },
  // One sparkle left behind a flying card
  trail(scene, x, y, depth) {
    this.ensure(scene);
    const s = scene.add.image(x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(-6, 6), 'fx_spark').setDepth(depth || 150);
    scene.tweens.add({ targets: s, alpha: 0, y: s.y + 10, duration: 350, onComplete: () => s.destroy() });
  }
};
