// Mobile emulation test (Phase 5). Run: python3 -m http.server 8080, then node tools/smoke_mobile.js
// Landscape phones (incl. 640x360), portrait overlay, touch hold / release outside, audio after the
// first tap, no scroll / zoom / long-press, 44 CSS px tap targets, tab hidden, strict console.
const { chromium, devices } = require('playwright');
const OUT = require('os').tmpdir() + '/mobile_';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const PHONES = [
  { name: 'small-640x360', viewport: { width: 640, height: 360 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'iPhone-13-landscape', ...devices['iPhone 13 landscape'] },
  { name: 'Pixel-5-landscape', ...devices['Pixel 5 landscape'] }
];

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'] });
  for (const ph of PHONES) {
    console.log(`\n== ${ph.name} ${ph.viewport.width}x${ph.viewport.height}`);
    const { name, defaultBrowserType, ...opts } = ph;
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errs = [];
    // strict: even 404s count. Only Chrome's own "Ignored attempt to cancel a touchcancel" intervention
    // notice is tolerated: it comes from synthetic non-cancelable touchcancel events, not from our code.
    page.on('console', m => { if (m.type() === 'error' && !/Ignored attempt to cancel a touch/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    const cdp = await ctx.newCDPSession(page);
    const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    const pt = (gx, gy) => page.evaluate(([gx, gy]) => { const r = game.canvas.getBoundingClientRect(); return { x: r.left + gx * r.width / 480, y: r.top + gy * r.height / 270 }; }, [gx, gy]);
    const tap = async (gx, gy) => { const q = await pt(gx, gy); await page.touchscreen.tap(q.x, q.y); };
    const waitFor = (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms });
    const shot = n => page.screenshot({ path: `${OUT}${ph.name}_${n}.png` });

    await page.goto('http://localhost:8080/');
    await waitFor(() => window.game && game.scene.isActive('BootScene') && game.scene.getScene('BootScene').children.list.length > 3, 15000);
    await page.evaluate(() => { localStorage.clear(); State.load(); });

    // page setup: no zoom, no scroll, no selection, no callout
    const css = await page.evaluate(() => {
      const b = getComputedStyle(document.body);
      return { meta: document.querySelector('meta[name=viewport]').content, touch: b.touchAction, sel: b.userSelect || b.webkitUserSelect, over: b.overflow };
    });
    ok(/user-scalable=no/.test(css.meta) && /maximum-scale=1/.test(css.meta) && /viewport-fit=cover/.test(css.meta), 'viewport meta blocks pinch zoom, fits notches');
    ok(css.touch === 'none' && css.sel === 'none' && css.over === 'hidden', `body touch-action:${css.touch} user-select:${css.sel} overflow:${css.over}`);
    const r = await page.evaluate(() => { const c = game.canvas.getBoundingClientRect(); return { w: c.width, h: c.height, ww: innerWidth, wh: innerHeight }; });
    ok(Math.abs(r.w / r.h - 16 / 9) < 0.02 && r.w <= r.ww + 0.5 && r.h <= r.wh + 0.5, `canvas fits the screen at 16:9 (${r.w.toFixed(0)}x${r.h.toFixed(0)} in ${r.ww}x${r.wh})`);

    // audio is locked until the first tap, then running
    ok(await page.evaluate(() => AudioSys.state) === 'none', 'no audio before the first tap');
    await shot('boot');
    await tap(240, 150);
    await waitFor(() => game.scene.isActive('HomeScene'));
    ok(await page.evaluate(() => AudioSys.state) === 'running', 'audio running after the first tap');
    await sleep(1000);
    await shot('home');

    // every tap target >= 44 CSS px
    const small = await page.evaluate(() => {
      const ds = game.scale.displayScale.x, out = [];
      for (const s of game.scene.getScenes(true)) for (const o of s.children.list) {
        if (o.input && o.type === 'Rectangle' && o.fillAlpha === 0 && o.width < K.GAME_W) {
          const w = o.width / ds, h = o.height / ds;
          if (w < 43.9 || h < 43.9) out.push(`${s.sys.settings.key} ${o.x},${o.y} ${w.toFixed(0)}x${h.toFixed(0)}`);
        }
      }
      return out;
    });
    ok(small.length === 0, 'Home tap targets >= 44 CSS px ' + (small.length ? small.join('; ') : ''));

    // swipes and long-press do nothing to the page
    const c = await pt(240, 135);
    await T('touchStart', [{ x: c.x, y: c.y, id: 1 }]);
    for (let i = 1; i <= 6; i++) await T('touchMove', [{ x: c.x - i * 20, y: c.y - i * 25, id: 1 }]);
    await T('touchEnd', []);
    await sleep(200);
    const sc = await page.evaluate(() => ({ x: scrollX, y: scrollY, top: document.scrollingElement.scrollTop, vv: visualViewport ? visualViewport.scale : 1 }));
    ok(sc.x === 0 && sc.y === 0 && sc.top === 0 && sc.vv === 1, `swipe does not scroll or zoom the page (${JSON.stringify(sc)})`);
    ok(await page.evaluate(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); game.canvas.dispatchEvent(e); return e.defaultPrevented; }), 'long-press / context menu blocked');
    ok(await page.evaluate(() => { const e = new Event('selectstart', { bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; }), 'text selection blocked');

    // Moon by touch: thumb hold drives, sliding off and lifting stops
    await tap(124, 148);
    await waitFor(() => game.scene.isActive('MoonScene') && game.scene.getScene('MoonScene').topBar);
    await sleep(1500);
    await shot('moon_intro');
    const st = () => page.evaluate(() => game.scene.getScene('MoonScene').state);
    const a = await pt(444, 234);
    await T('touchStart', [{ x: a.x, y: a.y, id: 2 }]); await sleep(700);
    ok(await st() === 'DRIVING', 'thumb on the arrow drives');
    await T('touchMove', [{ x: a.x - 250, y: a.y - 150, id: 2 }]); await sleep(150);
    await T('touchEnd', []); await sleep(700);
    ok(await st() === 'IDLE', 'slide finger off the arrow and lift: rover stops');
    await T('touchStart', [{ x: a.x, y: a.y, id: 3 }]); await sleep(300);
    await T('touchCancel', []); await sleep(700);
    ok(await st() === 'IDLE', 'touch cancel releases the arrow');

    // tab hidden: game loop pauses, sound suspends; visible again resumes
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(400);
    const hid = await page.evaluate(() => ({ audio: AudioSys.state, paused: game.loop._pauseTime > 0 }));
    ok(hid.audio === 'suspended', 'tab hidden: audio suspended');
    ok(hid.paused, 'tab hidden: Phaser registered the pause (browser stops frames; time resumes without a jump)');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(500);
    ok(await page.evaluate(() => AudioSys.state) === 'running', 'tab visible: audio running again');
    ok(await page.evaluate(() => game.loop.running), 'tab visible: game loop running again');

    // card at phone size
    await page.evaluate(() => { const s = game.scene.getScene('MoonScene'); s.worldX = s.finds[0].x - 200; });
    await T('touchStart', [{ x: a.x, y: a.y, id: 4 }]);
    await waitFor(() => CardPopup.active, 20000);
    await T('touchEnd', []);
    await waitFor(() => CardPopup.ready, 20000);
    await shot('card');
    await tap(240, 205);
    await waitFor(() => !CardPopup.active);

    // portrait: rotate overlay + pause; back to landscape resumes
    const { width: W, height: H } = ph.viewport;
    await page.setViewportSize({ width: H, height: W }); await sleep(500);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display) === 'flex' && await page.evaluate(() => game.isPaused), 'portrait: rotate overlay shown, game paused');
    await shot('portrait');
    await page.setViewportSize({ width: W, height: H }); await sleep(500);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display) === 'none' && !(await page.evaluate(() => game.isPaused)), 'landscape again: overlay gone, game running');

    // Mars + Album Hall screens for the readability check
    await page.evaluate(() => { State.data.moon = ['landing_stage', 'flag', 'science_station', 'laser_mirror', 'rover_sign']; State.data.mars = ['landing_platform', 'space_rock']; State.save(); game.scene.getScene('MoonScene').scene.start('MarsScene'); });
    await waitFor(() => game.scene.isActive('MarsScene') && game.scene.getScene('MarsScene').topBar);
    await sleep(1200); await shot('mars');
    await page.evaluate(() => game.scene.getScene('MarsScene').scene.start('AlbumHallScene'));
    await waitFor(() => game.scene.isActive('AlbumHallScene')); await sleep(1500);
    await shot('album');
    const sl = await page.evaluate(() => { const s = game.scene.getScene('AlbumHallScene').slots[4]; return [s.x, s.y]; });
    await tap(sl[0], sl[1]);
    await waitFor(() => { const a = game.scene.getScene('AlbumHallScene'); return a.focus && !a.busy; });
    await shot('album_focus');
    const small2 = await page.evaluate(() => {
      const ds = game.scale.displayScale.x, out = [];
      for (const o of game.scene.getScene('AlbumHallScene').children.list) {
        if (o.input && o.type === 'Rectangle' && o.fillAlpha === 0 && o.width < K.GAME_W && o.visible) {
          const w = o.width / ds, h = o.height / ds;
          if (w < 43.9 || h < 43.9) out.push(`${o.x},${o.y} ${w.toFixed(0)}x${h.toFixed(0)}`);
        }
      }
      return out;
    });
    ok(small2.length === 0, 'Album detail tap targets >= 44 CSS px ' + (small2.length ? small2.join('; ') : ''));
    await tap(455, 44);
    await waitFor(() => !game.scene.getScene('AlbumHallScene').focus);
    ok(true, 'X closes the detail by touch');

    console.log('console/page errors:', errs.length ? errs : 'none');
    ok(errs.length === 0, 'no console errors at all (strict)');
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
