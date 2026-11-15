// Home + Album Hall + Certificate test (Phase 4).
// Run: python3 -m http.server 8080 (project root), then node tools/smoke_album.js
const { chromium } = require('playwright');
const OUT = require('os').tmpdir() + '/album_';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const toPage = (gx, gy) => page.evaluate(([gx, gy]) => {
    const r = game.canvas.getBoundingClientRect();
    return { x: r.left + gx * r.width / 480, y: r.top + gy * r.height / 270 };
  }, [gx, gy]);
  const click = async (gx, gy) => { const p = await toPage(gx, gy); await page.mouse.click(p.x, p.y); };
  const waitFor = (fn, ms = 8000, arg) => page.waitForFunction(fn, arg, { timeout: ms });
  const start = async save => {
    await page.goto('http://localhost:8080/');
    await waitFor(() => window.game && game.scene.isActive('BootScene') && game.scene.getScene('BootScene').ready, 15000);
    if (save) await page.evaluate(s => { localStorage.setItem('stillHere', JSON.stringify(s)); State.load(); }, save);
    await click(240, 130);
    await waitFor(() => game.scene.isActive('HomeScene'));
    await sleep(900);
  };
  const MOON = ['landing_stage', 'flag', 'science_station', 'laser_mirror', 'rover_sign'];
  const MARS = ['landing_platform', 'cone_parachute', 'heat_shield', 'space_rock'];
  const partial = { moon: ['landing_stage', 'flag', 'science_station', 'rover_sign'], mars: ['landing_platform', 'space_rock'], patches: ['moon'], sound: true, version: 1 };

  // ---- Home reflects saved progress, and still does after reload ----
  await start(partial);
  const home = () => page.evaluate(() => ({ moon: State.countChapter('moon') + ' / 5', mars: State.countChapter('mars') + ' / 4' }));
  let h = await home();
  ok(h.moon === '4 / 5' && h.mars === '2 / 4', `Home: saved progress ${h.moon} | ${h.mars}`);
  ok(await page.evaluate(() => game.scene.getScene('HomeScene').children.list.some(o => o.texture && o.texture.key === 'patch_moon')), 'Moon patch shown, others empty');
  await page.screenshot({ path: OUT + 'home.png' });
  await page.reload();
  await start(null);
  h = await home();
  ok(h.moon === '4 / 5' && h.mars === '2 / 4', 'Home after reload keeps progress');

  // ---- Album Hall ----
  await click(46, 240);
  await waitFor(() => game.scene.isActive('AlbumHallScene'));
  await sleep(1400);
  await page.screenshot({ path: OUT + 'hall.png' });
  await page.evaluate(() => { window.__opened = []; window.open = (u, t, f) => { window.__opened.push([u, t, f]); return null; }; });
  const A = () => page.evaluate(() => {
    const a = game.scene.getScene('AlbumHallScene'), f = a.focus;
    return f ? { id: f.slot.card.id, busy: a.busy, name: f.panel.nameText.str, short: f.panel.shortText.str, long: f.panel.longText.str,
      longVis: f.panel.longText.visible, shortVis: f.panel.shortText.visible, src: f.panel.source ? f.panel.source.str : null } : { id: null, busy: a.busy };
  });
  const slots = await page.evaluate(() => game.scene.getScene('AlbumHallScene').slots.map(s => ({ id: s.card.id, x: s.x, y: s.y, owned: s.owned })));
  const cards = await page.evaluate(() => Cards.list);
  const closeWays = ['x', 'esc', 'outside'];
  let w = 0;
  for (const s of slots) {
    await click(s.x, s.y);
    if (!s.owned) {
      await sleep(300);
      const a = await A();
      ok(a.id === null && await page.evaluate(id => !!game.scene.getScene('AlbumHallScene').slots.find(x => x.card.id === id).hintText, s.id), `locked ${s.id}: shake + hint, no focus`);
      continue;
    }
    await waitFor(() => { const a = game.scene.getScene('AlbumHallScene'); return a.focus && !a.busy; });
    const c = cards.find(x => x.id === s.id);
    let a = await A();
    ok(a.id === s.id && a.name === c.name && a.short === c.short, `${s.id}: name + short text correct`);
    ok(a.src === 'Source: ' + c.sourceLabel, `${s.id}: source shown (${c.sourceLabel})`);
    if (s.id === 'landing_stage') await page.screenshot({ path: OUT + 'focus.png' });
    await click(196 + 56, 30 + 172);   // Read more
    await sleep(300);
    a = await A();
    ok(a.longVis && !a.shortVis && a.long === c.long, `${s.id}: Read more expands the long text`);
    if (s.id === 'rover_sign') await page.screenshot({ path: OUT + 'readmore.png' });
    await click(196 + 56, 30 + 172);   // Read less
    await sleep(200);
    a = await A();
    ok(!a.longVis && a.shortVis, `${s.id}: Read less collapses`);
    // source link opens in a new tab with noopener
    const sy = await page.evaluate(() => game.scene.getScene('AlbumHallScene').focus.panel.source.y);
    await click(196 + 40, 30 + sy + 4);
    await sleep(100);
    const opened = await page.evaluate(() => window.__opened.pop());
    ok(opened && opened[0] === c.sourceUrl && opened[1] === '_blank' && opened[2] === 'noopener', `${s.id}: source link opens ${opened && opened[0]}`);
    // close: rotate between X, Esc and tapping outside
    const way = closeWays[w++ % 3];
    if (way === 'x') await click(455, 44);
    if (way === 'esc') await page.keyboard.press('Escape');
    if (way === 'outside') await click(300, 262);
    await waitFor(() => { const a = game.scene.getScene('AlbumHallScene'); return !a.focus && !a.busy; });
    await sleep(300);
    const back = await page.evaluate(id => { const s = game.scene.getScene('AlbumHallScene').slots.find(x => x.card.id === id); return s.cont.visible && s.cont.x === s.x && s.cont.y === s.y; }, s.id);
    ok(back, `${s.id}: closed with ${way}, card flew back to its own slot`);
  }

  // ---- prev / next skip uncollected cards, and fly back to the right slot ----
  await click(slots[0].x, slots[0].y);
  await waitFor(() => { const a = game.scene.getScene('AlbumHallScene'); return a.focus && !a.busy; });
  const seq = [];
  for (let i = 0; i < 6; i++) {
    await click(150, 236);   // >
    await waitFor(() => !game.scene.getScene('AlbumHallScene').busy);
    await sleep(50);
    seq.push((await A()).id);
  }
  ok(seq.join() === 'flag,science_station,rover_sign,landing_platform,space_rock,landing_stage', 'next skips uncollected + wraps: ' + seq.join());
  await page.keyboard.press('ArrowLeft');
  await waitFor(() => !game.scene.getScene('AlbumHallScene').busy);
  await sleep(50);
  ok((await A()).id === 'space_rock', 'keyboard Left goes back (space_rock)');
  await click(58, 236);   // <
  await waitFor(() => !game.scene.getScene('AlbumHallScene').busy);
  await sleep(50);
  ok((await A()).id === 'landing_platform', '< goes back (landing_platform)');
  await page.screenshot({ path: OUT + 'nav.png' });
  await page.keyboard.press('Escape');
  await waitFor(() => { const a = game.scene.getScene('AlbumHallScene'); return !a.focus && !a.busy; });
  await sleep(300);
  ok(await page.evaluate(() => game.scene.getScene('AlbumHallScene').slots.every(s => s.cont.visible && s.cont.x === s.x && s.cont.y === s.y)),
    'after navigating, close returns the shown card to its slot and every slot is back');

  // ---- Back to Home; a mission card starts its chapter ----
  await click(40, 254);
  await waitFor(() => game.scene.isActive('HomeScene'));
  await sleep(900);
  await click(356, 148);
  await waitFor(() => game.scene.isActive('MarsScene'));
  ok(true, 'tapping the Mars Mission card starts Mars');
  await page.evaluate(() => game.scene.getScene('MarsScene').scene.start('HomeScene'));
  await waitFor(() => game.scene.isActive('HomeScene'));
  await sleep(900);

  // ---- Reset with confirm ----
  await click(214, 240); await sleep(300);
  await click(290, 160); await sleep(300);   // No
  ok((await home()).moon === '4 / 5', 'Reset -> No keeps progress');
  await click(214, 240); await sleep(300);
  await click(196, 160); await sleep(900);   // Yes
  h = await home();
  ok(h.moon === '0 / 5' && h.mars === '0 / 4' && await page.evaluate(() => JSON.parse(localStorage.getItem('stillHere')).patches.length === 0), 'Reset -> Yes clears progress and patches');

  // ---- Certificate (both patches) ----
  await start({ moon: MOON, mars: MARS, patches: ['moon', 'mars', 'gold'], sound: true, version: 1 });
  await page.screenshot({ path: OUT + 'home_full.png' });
  // all 9 cards open with the right text and source
  await click(46, 240);
  await waitFor(() => game.scene.isActive('AlbumHallScene'));
  await sleep(1400);
  let good = 0;
  for (const s of slots) {
    await click(s.x, s.y);
    await waitFor(() => { const a = game.scene.getScene('AlbumHallScene'); return a.focus && !a.busy; });
    const a = await A(), c = cards.find(x => x.id === s.id);
    if (a.id === c.id && a.name === c.name && a.short === c.short && a.long === c.long && a.src === 'Source: ' + c.sourceLabel) good++;
    else console.log('  mismatch', s.id);
    await page.keyboard.press('Escape');
    await waitFor(() => { const a = game.scene.getScene('AlbumHallScene'); return !a.focus && !a.busy; });
  }
  ok(good === 9, `all 9 cards open with correct name, short, long and source (${good}/9)`);
  await click(40, 254);
  await waitFor(() => game.scene.isActive('HomeScene'));
  await sleep(900);
  await click(434, 240);
  await waitFor(() => game.scene.isActive('CertificateScene'));
  await sleep(1500);
  await page.screenshot({ path: OUT + 'cert.png' });
  ok(await page.evaluate(() => game.scene.getScene('CertificateScene').children.list.some(o => o.str === 'You met everything that was left behind.')), 'Certificate shows');
  await click(240, 244);
  await waitFor(() => game.scene.isActive('HomeScene'));
  ok(true, 'Certificate -> Home');
  // Certificate refuses without both patches
  await page.evaluate(() => { State.reset(); game.scene.getScene('HomeScene').scene.start('CertificateScene'); });
  await waitFor(() => game.scene.isActive('HomeScene'));
  ok(true, 'Certificate is only for both patches');

  console.log('console/page errors:', errs.length ? errs : 'none');
  ok(errs.length === 0, 'no console errors');
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
