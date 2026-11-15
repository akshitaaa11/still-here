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

// A seamless band that scrolls with the world: its pictures are laid side by side in order and
// repeat as a cycle (e.g. the mountain range, then the same range mirrored, so every join
// matches). Nothing is cut or stretched: each picture keeps its true shape.
//   o: { keys, factor (parallax), scale, y, originY, depth }
class WrapStrip {
  constructor(scene, o) {
    this.o = o;
    const ws = o.keys.map(k => scene.textures.get(k).getSourceImage().width * o.scale);
    this.period = ws.reduce((a, b) => a + b, 0);
    const cycles = Math.ceil((K.GAME_W + this.period) / this.period) + 1;
    this.imgs = [];
    for (let c = 0; c < cycles; c++) {
      o.keys.forEach((k, i) => {
        const img = scene.add.image(0, o.y, k).setOrigin(0, o.originY).setScale(o.scale).setDepth(o.depth);
        this.imgs.push({ img, w: ws[i] });
      });
    }
  }

  update(worldX) {
    const lx = worldX * this.o.factor;
    let x = -(((lx % this.period) + this.period) % this.period);
    for (const it of this.imgs) {
      it.img.x = Math.round(x * K.ZOOM) / K.ZOOM;   // whole canvas pixels: crisp and smooth
      x += it.w;
    }
  }
}
