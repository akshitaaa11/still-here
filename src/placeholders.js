// Asset manifest + grey-box fallback (README 5.5, 13.1).
// Every PNG is loaded by file name; if one is missing or fails, a labelled grey box of the
// exact size is generated so the game never crashes. Strips get 4 frames of imageWidth / 4.
const Assets = {
  MANIFEST: [
    { key: 'moon_buggy', w: 64, h: 40, strip: true },
    { key: 'mars_rover', w: 56, h: 40, strip: true },
    { key: 'mars_rover_asleep', w: 56, h: 40 },
    { key: 'landing_stage', w: 96, h: 80 },
    { key: 'flag', w: 24, h: 48 },
    { key: 'science_station', w: 64, h: 48 },
    { key: 'laser_mirror', w: 32, h: 32 },
    { key: 'rover_sign', w: 32, h: 24 },
    { key: 'landing_platform', w: 96, h: 48 },
    { key: 'cone', w: 64, h: 64 },
    { key: 'parachute', w: 96, h: 64 },
    { key: 'heat_shield_a', w: 64, h: 40 },
    { key: 'heat_shield_b', w: 64, h: 40 },
    { key: 'space_rock', w: 24, h: 20 },
    { key: 'sun', w: 48, h: 48 },
    { key: 'moon_sky', w: 480, h: 270 },
    { key: 'moon_hills', w: 960, h: 270 },
    { key: 'moon_ground', w: 480, h: 64 },
    { key: 'mars_sky', w: 480, h: 270 },
    { key: 'mars_hills', w: 960, h: 270 },
    { key: 'mars_ground', w: 480, h: 64 },
    { key: 'patch_moon', w: 64, h: 64 },
    { key: 'patch_mars', w: 64, h: 64 },
    { key: 'patch_gold', w: 64, h: 64 },
    { key: 'arrow_up', w: 96, h: 96 },
    { key: 'arrow_down', w: 96, h: 96 },
    { key: 'logo', w: 240, h: 80 },
    { key: 'start_button', w: 120, h: 34 },
    { key: 'cover', w: 480, h: 270 }   // start-screen background (owner supplied)
  ],

  // Run once after loading: placeholders for anything missing, then strip frames
  finish(scene, failed) {
    for (const a of this.MANIFEST) {
      if ((failed && failed.has(a.key)) || !scene.textures.exists(a.key)) {
        if (scene.textures.exists(a.key)) scene.textures.remove(a.key);
        this.makePlaceholder(scene, a);
      }
      if (a.strip) this.addStripFrames(scene, a.key);
    }
  },

  // Frame width is computed from the real image, so any replacement size still works
  addStripFrames(scene, key) {
    const tex = scene.textures.get(key);
    const src = tex.getSourceImage();
    const fw = Math.floor(src.width / 4), h = src.height;
    for (let i = 0; i < 4; i++) if (!tex.has(i)) tex.add(i, 0, i * fw, 0, fw, h);
  },

  makePlaceholder(scene, a) {
    const t = scene.textures.createCanvas(a.key, a.w, a.h);
    const c = t.getContext();
    const shades = ['#7b7b88', '#8a8a97', '#6c6c79', '#9696a3'];
    const n = a.strip ? 4 : 1, fw = a.w / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = shades[i % 4];
      c.fillRect(i * fw, 0, fw, a.h);
      c.strokeStyle = '#14141f';
      c.lineWidth = 1;
      c.strokeRect(i * fw + 0.5, 0.5, fw - 1, a.h - 1);
    }
    c.fillStyle = '#14141f';
    c.font = 'bold 8px monospace';
    c.textBaseline = 'top';
    c.fillText(a.key, 3, 3, a.w - 6);
    t.refresh();
  }
};
