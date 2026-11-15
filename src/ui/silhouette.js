// Card pictures and black "?" silhouettes, built in code from the world sprites
// (README 10.2: silhouettes come from the sprite's alpha mask).
const CardArt = {
  // Texture key of the card's sprite(s) fitted into w x h. Cards with two pictures
  // (cone + parachute, two heat shield pieces) are drawn side by side.
  picture(scene, card, w, h, mask) {
    const key = `art_${card.id}_${w}x${h}${mask ? '_sil' : ''}`;
    if (scene.textures.exists(key)) return key;
    const imgs = [card.sprite, card.sprite2].filter(Boolean).map(k => scene.textures.get(k).getSourceImage());
    const gap = imgs.length > 1 ? 4 : 0;
    const total = imgs.reduce((s, i) => s + i.width, 0) + gap * (imgs.length - 1);
    const maxH = Math.max(...imgs.map(i => i.height));
    let f = Math.min(w / total, h / maxH);
    if (f >= 1) f = Math.floor(f);          // whole-number zoom keeps pixels crisp when growing

    const t = scene.textures.createCanvas(key, w, h);
    const c = t.getContext();
    c.imageSmoothingEnabled = false;
    let x = Math.round((w - total * f) / 2);
    for (const im of imgs) {
      const dw = Math.max(1, Math.round(im.width * f)), dh = Math.max(1, Math.round(im.height * f));
      c.drawImage(im, x, Math.round((h - dh) / 2), dw, dh);
      x += dw + Math.round(gap * f);
    }
    if (mask) {
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = '#0b0b12';
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-atop';   // the "?" stays inside the shape
      c.fillStyle = '#8a8f9b';
      c.font = `${Math.max(10, Math.round(h * 0.9))}px ${PixelText.FAMILY}`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('?', w / 2, h / 2 + 1);
    }
    // hard edges only: any soft pixel becomes fully on or off
    const d = c.getImageData(0, 0, w, h);
    for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] >= 128 ? 255 : 0;
    c.putImageData(d, 0, 0);
    t.refresh();
    return key;
  },
  silhouette(scene, card, w, h) { return this.picture(scene, card, w, h, true); },

  // One frame of a strip as a flat single-colour shape (the other rovers in the Moon ending)
  frameSilhouette(scene, key, frame, color) {
    const out = `fsil_${key}_${frame}_${color}`;
    if (scene.textures.exists(out)) return out;
    const f = scene.textures.getFrame(key, frame);
    const t = scene.textures.createCanvas(out, f.cutWidth, f.cutHeight);
    const c = t.getContext();
    c.imageSmoothingEnabled = false;
    c.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color;
    c.fillRect(0, 0, f.cutWidth, f.cutHeight);
    t.refresh();
    return out;
  }
};
