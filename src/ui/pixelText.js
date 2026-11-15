// Crisp pixel text (README 15). Browser text is anti-aliased, which looks blurry once the
// 480x270 canvas is scaled up. So each string is drawn to a scratch canvas with a web-safe
// monospace font, then every pixel is thresholded to fully on or off before it becomes a
// texture. No font download, hard-edged glyphs.
class PixelText extends Phaser.GameObjects.Image {
  constructor(scene, x, y, text, o = {}) {
    const key = PixelText.render(scene, String(text), o);
    super(scene, x, y, key);
    this.o = o;
    this.str = String(text);   // what it says (handy for tests and debugging)
    this.pxKey = key;
    this.tm = scene.textures;
    this.setOrigin(o.originX != null ? o.originX : 0.5, o.originY != null ? o.originY : 0.5);
    scene.add.existing(this);
  }

  setString(text) {
    const old = this.pxKey;
    this.str = String(text);
    this.pxKey = PixelText.render(this.scene, String(text), this.o);
    this.setTexture(this.pxKey);
    if (this.tm.exists(old)) this.tm.remove(old);
    return this;
  }

  destroy(fromScene) {
    const tm = this.tm, k = this.pxKey;
    super.destroy(fromScene);
    try { if (tm && tm.exists(k)) tm.remove(k); } catch (e) { /* scene already gone */ }
  }

  static font(o) { return `${o.bold ? 'bold ' : ''}${o.size || 10}px ${PixelText.FAMILY}`; }

  // Break text into lines no wider than maxW (game px)
  static wrapLines(text, maxW, o = {}) {
    const ctx = PixelText.measureCtx || (PixelText.measureCtx = document.createElement('canvas').getContext('2d'));
    ctx.font = PixelText.font(o);
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (line && ctx.measureText(test).width > maxW) { out.push(line); line = word; } else line = test;
      }
      out.push(line);
    }
    return out;
  }

  static render(scene, text, o) {
    const size = o.size || 10;
    const lines = o.wrap ? PixelText.wrapLines(text, o.wrap, o) : text.split('\n');
    const lineH = o.lineH || Math.ceil(size * 1.3);
    const m = PixelText.measureCtx || (PixelText.measureCtx = document.createElement('canvas').getContext('2d'));
    m.font = PixelText.font(o);
    const pad = o.shadow ? 2 : 1;
    const w = Math.max(1, Math.ceil(Math.max(...lines.map(l => m.measureText(l).width))) + pad * 2);
    const h = lines.length * lineH + pad * 2;

    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.font = PixelText.font(o);
    c.textBaseline = 'top';
    c.fillStyle = '#fff';
    lines.forEach((l, i) => c.fillText(l, o.align === 'center' ? (w - m.measureText(l).width) / 2 : pad, pad + i * lineH));
    const src = c.getImageData(0, 0, w, h).data;

    const col = PixelText.rgb(o.color || '#ffffff');
    const sh = o.shadow ? PixelText.rgb(o.shadow) : null;
    const out = c.createImageData(w, h);
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] >= 110;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let rgb = null;
        if (on(x, y)) rgb = col;
        else if (sh && on(x - 1, y - 1)) rgb = sh;   // hard 1 px drop shadow
        if (rgb) { out.data[i] = rgb[0]; out.data[i + 1] = rgb[1]; out.data[i + 2] = rgb[2]; out.data[i + 3] = 255; }
      }
    }
    const key = 'pt_' + (PixelText.n = (PixelText.n || 0) + 1);
    const tex = scene.textures.createCanvas(key, w, h);
    tex.getContext().putImageData(out, 0, 0);
    tex.refresh();
    return key;
  }

  static rgb(hex) { return [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16)); }
}
PixelText.FAMILY = '"DejaVu Sans Mono", Menlo, Consolas, "Courier New", monospace';
