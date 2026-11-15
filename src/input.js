// One hold-to-move control (README 10.5): Right Arrow, D, or the on-screen arrow.
// Releasing anywhere (even off the button, off the canvas, or on cancel) must release.
const Controls = (() => {
  const keys = new Set();       // keyboard keys currently down
  const pointers = new Set();   // Phaser pointer ids pressing the on-screen arrow
  let blocked = false;          // after a card closes, a still-held arrow must be re-pressed
  let arrowImg = null, glowTween = null;

  const DRIVE_KEYS = ['ArrowRight', 'KeyD'];
  const clearAll = () => { keys.clear(); pointers.clear(); blocked = false; };
  // A real release ends the "press again" block at once, even if it is re-pressed in the same frame
  const released = () => { if (!keys.size && !pointers.size) blocked = false; };

  window.addEventListener('keydown', e => {
    if (DRIVE_KEYS.includes(e.code)) { keys.add(e.code); e.preventDefault(); }
  });
  window.addEventListener('keyup', e => { keys.delete(e.code); released(); });
  window.addEventListener('blur', clearAll);
  window.addEventListener('mouseup', () => { pointers.clear(); released(); });
  window.addEventListener('touchcancel', () => { pointers.clear(); released(); });
  window.addEventListener('touchend', e => { if (!e.touches || e.touches.length === 0) { pointers.clear(); released(); } });
  document.addEventListener('visibilitychange', clearAll);

  return {
    isHeld() {
      const down = keys.size > 0 || pointers.size > 0;
      if (blocked) { if (!down) blocked = false; return false; }
      return down;
    },
    // Call when input was ignored (FINDING): the next drive needs a fresh press
    consume() { if (keys.size > 0 || pointers.size > 0) blocked = true; },
    reset() { clearAll(); blocked = false; arrowImg = null; glowTween = null; },

    // Bottom-right thumb arrow, shows arrow_up (released) / arrow_down (pressed)
    attachArrow(scene) {
      const size = 48, x = K.GAME_W - 12 - size / 2, y = K.GAME_H - 12 - size / 2;
      const img = scene.add.image(x, y, 'arrow_up').setDisplaySize(size, size).setDepth(60).setAlpha(0.92);
      // Hit area bigger than the picture: at least 44 CSS px on any screen
      const hit = scene.add.zone(x, y, 76, 76).setDepth(61).setInteractive();
      const down = p => { pointers.add(p.id); img.setTexture('arrow_down'); };
      const upAny = p => { pointers.delete(p.id); released(); if (!pointers.size) img.setTexture('arrow_up'); };
      hit.on('pointerdown', down);
      hit.on('pointerup', upAny);
      hit.on('pointerout', upAny);
      scene.input.on('pointerup', upAny);          // released anywhere
      scene.input.on('pointerupoutside', upAny);
      const refresh = () => img.setTexture((this.isHeld() || pointers.size > 0) ? 'arrow_down' : 'arrow_up');
      scene.events.on('update', refresh);
      scene.events.once('shutdown', () => scene.events.off('update', refresh));
      arrowImg = img;
      return img;
    },
    // Gentle glow telling the player "keep going" (11.2 step 5)
    glow(scene) {
      if (!arrowImg) return;
      if (glowTween) glowTween.stop();
      arrowImg.setAlpha(0.92);
      glowTween = scene.tweens.add({ targets: arrowImg, alpha: { from: 0.55, to: 1 }, duration: 350, yoyo: true, repeat: 2, onComplete: () => arrowImg && arrowImg.setAlpha(0.92) });
    }
  };
})();
