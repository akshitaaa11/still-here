// Phaser game setup (README 15): 480x270, pixel-art mode, FIT scaling, 3 touch pointers.
(function () {
  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: K.GAME_W * K.ZOOM,
    height: K.GAME_H * K.ZOOM,
    backgroundColor: '#000000',
    pixelArt: true,
    roundPixels: true,
    disableContextMenu: true,
    audio: { noAudio: true },          // we use our own Web Audio (audio.js)
    input: { activePointers: 3 },      // multi-touch: drive with one thumb while tapping with another
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, HomeScene, MoonScene, MarsScene, AlbumHallScene, CertificateScene, QuizScene, QuizResultScene]
  };
  // Text is drawn with the VT323 font, so wait for it (max 3 s, then carry on with the fallback)
  const fontReady = document.fonts && document.fonts.load
    ? Promise.race([document.fonts.load('32px "VT323"'), new Promise(r => setTimeout(r, 3000))]).catch(() => {})
    : Promise.resolve();
  let rotatedAway = false;   // shared by the rotate overlay and the tab-visibility handler
  fontReady.then(start);
  function start() {
  window.game = new Phaser.Game(config);

  // Block the long-press menu and page gestures on the whole page
  const stop = e => e.preventDefault();
  document.addEventListener('contextmenu', stop);
  document.addEventListener('gesturestart', stop);          // iOS pinch
  document.addEventListener('selectstart', stop);
  document.addEventListener('touchmove', stop, { passive: false });

  // Portrait on a phone: show the rotate overlay and pause the game behind it
  const overlay = document.getElementById('rotate');
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  function checkOrientation() {
    const portrait = isTouch && window.innerHeight > window.innerWidth;
    overlay.style.display = portrait ? 'flex' : 'none';
    if (portrait && !rotatedAway) { rotatedAway = true; window.game.pause(); AudioSys.suspend(); }
    else if (!portrait && rotatedAway) { rotatedAway = false; window.game.resume(); AudioSys.resume(); }
    // Phaser misses resizes while paused, and phones report the new size late: re-fit twice
    refit();
    setTimeout(refit, 250);
  }
  function refit() { try { window.game.scale.refresh(); } catch (e) { /* not booted yet */ } }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  window.game.events.once('ready', checkOrientation);
  }

  // Tab hidden: silence everything; Phaser pauses its own loop
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) AudioSys.suspend(); else if (!rotatedAway) AudioSys.resume();
  });
})();
