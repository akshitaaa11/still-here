// Phaser game setup (README 15): 480x270, pixel-art mode, FIT scaling, 3 touch pointers.
(function () {
  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: K.GAME_W,
    height: K.GAME_H,
    backgroundColor: '#000000',
    pixelArt: true,
    roundPixels: true,
    disableContextMenu: true,
    audio: { noAudio: true },          // we use our own Web Audio (audio.js)
    input: { activePointers: 3 },      // multi-touch: drive with one thumb while tapping with another
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, HomeScene, MoonScene, MarsScene, AlbumHallScene, CertificateScene]
  };
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
  let rotatedAway = false;
  function checkOrientation() {
    const portrait = isTouch && window.innerHeight > window.innerWidth;
    overlay.style.display = portrait ? 'flex' : 'none';
    if (portrait && !rotatedAway) { rotatedAway = true; window.game.pause(); AudioSys.suspend(); }
    else if (!portrait && rotatedAway) { rotatedAway = false; window.game.resume(); AudioSys.resume(); }
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  window.game.events.once('ready', checkOrientation);

  // Tab hidden: silence everything; Phaser pauses its own loop
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) AudioSys.suspend(); else if (!rotatedAway) AudioSys.resume();
  });
})();
