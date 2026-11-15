// Patch earned (README 11.3): the patch drops in from above, spins once, lands with a
// sparkle and a short fanfare. Resolves with the objects it made so the caller can clear them.
const PatchAnim = {
  LABEL: { moon: 'Moon Patch!', mars: 'Mars Patch!', gold: 'Still Here Patch!' },

  async play(scene, name) {
    const objs = [];
    const ov = scene.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x000000).setAlpha(0).setDepth(110).setInteractive();
    objs.push(ov);
    await Fx.tween(scene, { targets: ov, alpha: 0.6, duration: 250 });

    const p = scene.add.image(240, -70, 'patch_' + name).setScale(2).setDepth(112);
    objs.push(p);
    scene.tweens.add({ targets: p, angle: 360, duration: 700, ease: 'Sine.easeOut' });
    await Fx.tween(scene, { targets: p, y: 112, duration: 750, ease: 'Bounce.easeOut' });
    p.angle = 0;
    AudioSys.play('patch_fanfare');
    Haptics.patch();
    Fx.burst(scene, 240, 112, name === 'gold' ? 30 : 20, { depth: 113 });
    if (name === 'gold') {   // a slow golden glow, well under 3 Hz
      scene.tweens.add({ targets: p, scale: 2.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const t = new PixelText(scene, 240, 190, this.LABEL[name] || '', {
      size: 16, bold: true, color: name === 'gold' ? '#fff3a0' : '#ffffff', shadow: '#14141f'
    }).setDepth(112).setAlpha(0);
    objs.push(t);
    await Fx.tween(scene, { targets: t, alpha: 1, duration: 300 });
    return objs;
  }
};
