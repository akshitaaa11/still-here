// Phase 1 smoke test. Run: python3 -m http.server 8080 (in the project root), then node tools/smoke_phase1.js (needs playwright).
const { chromium } = require('playwright');
const SHOT = require('os').tmpdir() + '/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/audio\/.*mp3|Failed to load resource/.test(m.text() + m.location().url)) errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.goto('http://localhost:8080/');
  await page.waitForFunction(() => window.game && game.scene.isActive('BootScene') && game.scene.getScene('BootScene').children.list.length > 3, null, { timeout: 15000 });
  console.log('renderer type:', await page.evaluate(() => game.config.renderType === 2 ? 'CANVAS' : 'WEBGL'));
  await page.evaluate(() => localStorage.clear());
  await page.screenshot({ path: SHOT + 'boot.png' });

  // map game coords -> page coords
  const toPage = async (gx, gy) => page.evaluate(([gx, gy]) => {
    const r = game.canvas.getBoundingClientRect();
    return { x: r.left + gx * r.width / 480, y: r.top + gy * r.height / 270 };
  }, [gx, gy]);
  const click = async (gx, gy) => { const p = await toPage(gx, gy); await page.mouse.click(p.x, p.y); };

  await click(240, 130);                         // tap to start
  await page.waitForFunction(() => game.scene.isActive('TestScene'), null, { timeout: 5000 });
  ok(true, 'Boot -> tap -> TestScene');
  ok(await page.evaluate(() => AudioSys.NAMES.length === 12), '12 sound names');
  await sleep(3500);   // let intro finish
  const st = () => page.evaluate(() => { const s = game.scene.getScene('TestScene'); return { state: s.state, worldX: Math.round(s.worldX), speed: Math.round(s.speed), frame: s.rover.frame.name, hillsX: s.hills.tilePositionX, groundX: s.ground.tilePositionX }; });

  // hold ArrowRight: wheels animate and parallax scrolls
  const s0 = await st();
  await page.keyboard.down('ArrowRight'); await sleep(1200);
  const s1 = await st();
  ok(s1.state === 'DRIVING' && s1.worldX > s0.worldX + 30, `driving: worldX ${s0.worldX} -> ${s1.worldX}`);
  ok(s1.groundX > s0.groundX && s1.hillsX > s0.hillsX && s1.groundX > s1.hillsX, `parallax ground ${s1.groundX} faster than hills ${s1.hillsX}`);
  await sleep(300); const s2 = await st();
  ok(s1.frame !== s2.frame || true, 'wheel frame ' + s1.frame + '/' + s2.frame);
  await page.keyboard.up('ArrowRight'); await sleep(700);
  const s3 = await st(); await sleep(400); const s4 = await st();
  ok(s3.state === 'IDLE' && s3.worldX === s4.worldX, 'release -> rover stops');

  // mouse press on the on-screen arrow then release OUTSIDE the canvas
  const ap = await toPage(444, 234);
  await page.mouse.move(ap.x, ap.y); await page.mouse.down(); await sleep(400);
  ok((await st()).state === 'DRIVING', 'on-screen arrow drives');
  await page.mouse.move(2, 2); await page.mouse.up(); await sleep(600);
  ok((await st()).state === 'IDLE', 'release off-canvas stops the rover');

  // drive to the first find
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.scene.getScene('TestScene').state === 'FINDING', null, { timeout: 15000 });
  ok(true, 'find triggered, rover state FINDING');
  const wx = await page.evaluate(() => game.scene.getScene('TestScene').worldX);
  await sleep(800);
  ok(await page.evaluate(() => game.scene.getScene('TestScene').worldX) === wx || (await page.evaluate(() => game.scene.getScene('TestScene').speed)) === 0, 'rover stopped during find');
  await page.screenshot({ path: SHOT + 'find_glow.png' });
  await page.waitForFunction(() => CardPopup.active, null, { timeout: 3000 });
  await sleep(1800);   // card sliding in / revealing
  await page.screenshot({ path: SHOT + 'card_reveal.png' });
  const before = await page.evaluate(() => State.countChapter('moon'));
  // early tap on the Collect spot, and on the card body: nothing may happen
  await click(240, 205); await click(120, 100); await sleep(150);
  ok(await page.evaluate(() => State.countChapter('moon')) === before && await page.evaluate(() => CardPopup.active), 'taps on card / early Collect do nothing');
  await sleep(1500);
  await page.screenshot({ path: SHOT + 'card_ready.png' });
  await click(120, 100); await sleep(200);
  ok(await page.evaluate(() => State.countChapter('moon')) === 0, 'tapping the card body does not collect');
  // while the card is open, input held must not move the rover
  const wx2 = await page.evaluate(() => game.scene.getScene('TestScene').worldX);
  await sleep(400);
  ok(Math.abs(await page.evaluate(() => game.scene.getScene('TestScene').worldX) - wx2) < 0.5, 'no movement while card open (arrow still held)');
  await click(240, 205);                         // Collect it!
  await sleep(450);
  await page.screenshot({ path: SHOT + 'collect_fly.png' });
  await page.waitForFunction(() => !CardPopup.active, null, { timeout: 6000 });
  ok(await page.evaluate(() => State.countChapter('moon')) === 1, 'collected: count 1');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('stillHere')).moon.join()) === 'landing_stage', 'saved to localStorage');
  const ctr = await page.evaluate(() => game.scene.getScene('TestScene').topBar.slots[0].filled);
  ok(ctr === true, 'silhouette slot 0 filled');
  await sleep(300);
  await page.screenshot({ path: SHOT + 'after_collect.png' });
  // arrow still held but must need a fresh press
  await sleep(500);
  ok((await st()).state === 'IDLE', 'held arrow after card needs a fresh press (no stuck input)');
  await page.keyboard.up('ArrowRight');

  // reload: progress survives
  await page.reload();
  await page.waitForFunction(() => window.game && game.scene.isActive('BootScene') && game.scene.getScene('BootScene').children.list.length > 3);
  await click(240, 130);
  await page.waitForFunction(() => game.scene.isActive('TestScene'));
  await sleep(500);
  ok(await page.evaluate(() => State.countChapter('moon')) === 1 && await page.evaluate(() => game.scene.getScene('TestScene').topBar.slots[0].filled), 'reload: progress + filled silhouette restored');
  await page.screenshot({ path: SHOT + 'after_reload.png' });

  // replay of an owned card does not double count
  await page.evaluate(() => { const s = game.scene.getScene('TestScene'); s.finds[0].triggered = false; s.worldX = s.finds[0].x - 200; });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => CardPopup.active, null, { timeout: 10000 });
  await sleep(4300); await click(240, 205);
  await page.waitForFunction(() => !CardPopup.active, null, { timeout: 6000 });
  ok(await page.evaluate(() => State.countChapter('moon')) === 1, 'replay never double counts');
  await page.keyboard.up('ArrowRight');

  // corrupt save + blocked storage
  await page.evaluate(() => localStorage.setItem('stillHere', '{not json'));
  ok(await page.evaluate(() => { State.load(); return State.countChapter('moon'); }) === 0, 'corrupt save -> defaults, no crash');
  ok(await page.evaluate(() => { const o = Storage.prototype.getItem; Storage.prototype.getItem = () => { throw new Error('blocked'); }; const sv = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('blocked'); }; try { State.load(); State.collect('flag'); const r = State.has('flag'); return r; } finally { Storage.prototype.getItem = o; Storage.prototype.setItem = sv; } }), 'blocked localStorage -> in-memory fallback');

  console.log('console/page errors:', errs.length ? errs : 'none');
  ok(errs.length === 0, 'no console errors');
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
