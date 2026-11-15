// An endless row of scenery pieces (mountains, craters, rocks) that scrolls with the world.
// Pieces are picked, sized, flipped and spaced at random from a fixed seed, so the scenery never
// visibly repeats but is the same on every play. Only pieces near the screen exist at a time.
//   o: { keys, seed, factor (parallax: 1 = ground speed), y(rng, img) -> y, origin: [ox, oy],
//        scaleX: [a, b], scaleY: [a, b] (or null = same as X), step: [a, b] (fraction of the
//        piece width, or px when stepPx), depth, depthJitter, skip(laneX) -> true to leave a gap }
class ScrollLane {
  constructor(scene, o) {
    this.scene = scene;
    this.o = o;
    this.rng = new Phaser.Math.RandomDataGenerator([o.seed]);
    this.next = o.start != null ? o.start : -260;
    this.items = [];
  }

  spawn() {
    const o = this.o, r = this.rng;
    const img = this.scene.add.image(0, 0, r.pick(o.keys)).setOrigin(o.origin[0], o.origin[1]);
    const sx = r.realInRange(o.scaleX[0], o.scaleX[1]);
    const sy = o.scaleY ? r.realInRange(o.scaleY[0], o.scaleY[1]) : sx;
    img.setScale(sx, sy).setFlipX(r.frac() < 0.5);
    img.y = Math.round(o.y(r, img));
    img.setDepth(o.depth + r.frac() * (o.depthJitter || 0));
    const x = this.next;
    const step = r.realInRange(o.step[0], o.step[1]);
    this.next += o.stepPx ? step : img.displayWidth * step;
    if (o.skip && o.skip(x, img)) { img.destroy(); return; }
    this.items.push({ x, img });
  }

  update(worldX) {
    const lx = worldX * this.o.factor;
    while (this.next < lx + K.GAME_W + 260) this.spawn();
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.img.x = Math.round(it.x - lx);
      if (it.img.x + it.img.displayWidth < -120) { it.img.destroy(); this.items.splice(i, 1); }
    }
  }
}
