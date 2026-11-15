// Moon chapter playthrough test (Phase 2).
// Run: python3 -m http.server 8080 (project root), then:
//   node tools/smoke_moon.js          normal speed (about 3 minutes of driving)
//   node tools/smoke_moon.js demo     ?demo=1 fast mode
// Needs playwright. Exits non-zero on any failure.
const { chromium } = require('playwright');
const DEMO = process.argv.includes('demo');
const OUT = require('os').tmpdir() + '/moon_';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const url = 'http://localhost:8080/' + (DEMO ? '?demo=1' : '');
  const toPage = (gx, gy) => page.evaluate(([gx, gy]) => {
    const r = game.canvas.getBoundingClientRect();
    return { x: r.left + gx * r.width / 480, y: r.top + gy * r.height / 270 };
  }, [gx, gy]);
  const click = async (gx, gy) => { const p = await toPage(gx, gy); await page.mouse.click(p.x, p.y); };
  const boot = async () => {
    await page.waitForFunction(() => window.game && game.scene.isActive('BootScene') && game.scene.getScene('BootScene').children.list.length > 3, null, { timeout: 15000 });
    await click(240, 130);
    // until Home exists, Boot goes to the next unfinished chapter; this test wants the Moon
    await page.waitForFunction(() => game.scene.isActive('MoonScene') || game.scene.isActive('MarsScene'), null, { timeout: 5000 });
    await page.evaluate(() => { if (game.scene.isActive('MarsScene')) game.scene.getScene('MarsScene').scene.start('MoonScene'); });
    await page.waitForFunction(() => game.scene.isActive('MoonScene') && game.scene.getScene('MoonScene').topBar, null, { timeout: 5000 });
  };
  const M = () => page.evaluate(() => { const s = game.scene.getScene('MoonScene'); return { state: s.state, worldX: s.worldX, n: State.countChapter('moon') }; });

  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await boot();
  await page.evaluate(() => {   // count bounces
    window.__bounces = 0;
    const b = MoonScene.prototype.bounce;
    MoonScene.prototype.bounce = function () { window.__bounces++; return b.call(this); };
  });
  const t0 = Date.now();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => CardPopup.active, null, { timeout: 60000 });
    await page.keyboard.up('ArrowRight');
    await page.waitForFunction(() => CardPopup.ready, null, { timeout: 20000 });
    if (i === 0) await page.screenshot({ path: OUT + 'card1.png' });
    await click(240, 205);
    await page.waitForFunction(() => !CardPopup.active, null, { timeout: 8000 });
    const m = await M();
    ok(m.n === i + 1, `find ${i + 1} collected (count ${m.n})`);
  }
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('stillHere')).moon.join(','));
  ok(ids === 'landing_stage,flag,science_station,laser_mirror,rover_sign', 'order + saved: ' + ids);
  const drive = (Date.now() - t0) / 1000;
  console.log(`time from start to 5th card closed: ${drive.toFixed(0)} s`);
  if (!DEMO) ok(drive > 150 && drive < 230, 'full run about 3 minutes');
  const bounces = await page.evaluate(() => window.__bounces);
  ok(DEMO || bounces >= 10, `moon bounces happened (${bounces}), fact shown: ${await page.evaluate(() => MoonScene.factShown)}`);

  // ending
  await sleep(3000);
  ok((await M()).state === 'ENDING', 'ending started');
  await page.screenshot({ path: OUT + 'ending_drive.png' });
  await sleep(5500);
  await page.screenshot({ path: OUT + 'ending_parked.png' });
  await page.waitForFunction(() => State.hasPatch('moon'), null, { timeout: 15000 });
  await sleep(1600);
  await page.screenshot({ path: OUT + 'patch.png' });
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('stillHere')).patches.includes('moon')), 'Moon patch saved');
  ok(!(await page.evaluate(() => State.hasPatch('gold'))), 'no gold patch with only one chapter');
  await sleep(800);
  await click(240, 238);   // Continue
  await page.waitForFunction(() => game.scene.isActive('BootScene'), null, { timeout: 5000 });
  ok(true, 'Continue leaves the chapter (to the title until Home exists)');

  // replay: no double count, ending + patch still work
  await page.reload();
  await boot();
  ok((await M()).n === 5, 'reload: 5 / 5 kept');
  ok(await page.evaluate(() => game.scene.getScene('MoonScene').topBar.slots.every(s => s.filled)), 'all silhouettes filled after reload');
  await page.evaluate(() => { const s = game.scene.getScene('MoonScene'); s.worldX = s.finds[0].x - 300; });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => CardPopup.active, null, { timeout: 20000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => CardPopup.ready, null, { timeout: 20000 }); await click(240, 205);
  await page.waitForFunction(() => !CardPopup.active, null, { timeout: 8000 });
  ok((await M()).n === 5, 'replayed card does not double count');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('stillHere')).patches.length) === 1, 'patches not duplicated');

  console.log('console/page errors:', errs.length ? errs : 'none');
  ok(errs.length === 0, 'no console errors');
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
