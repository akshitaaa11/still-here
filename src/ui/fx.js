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
