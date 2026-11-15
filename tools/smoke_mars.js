// Mars chapter test (Phase 3): battery, no soft-locks, storm, exact ending, patches.
// Run: python3 -m http.server 8080 (project root), then:
//   node tools/smoke_mars.js          normal speed (finds ~30 s apart, storm ~48 s)
//   node tools/smoke_mars.js demo     ?demo=1 fast mode
// Needs playwright. Exits non-zero on any failure.
const { chromium } = require('playwright');
const DEMO = process.argv.includes('demo');
const OUT = require('os').tmpdir() + '/mars_';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ENDING = 'Opportunity was built to last 90 Mars days. It lasted about 14 and a half years. In June 2018 a giant dust storm covered the sky. Its last message reached Earth on 10 June 2018. NASA sent over 1,000 commands. Opportunity did not answer. Opportunity fell asleep.';

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
  const S = () => page.evaluate(() => {
    const s = game.scene.getScene('MarsScene');
    return { state: s.state, phase: s.phase, battery: s.battery, worldX: s.worldX, n: State.countChapter('mars'), popup: CardPopup.active };
  });
  const waitFor = (fn, ms, arg) => page.waitForFunction(fn, arg, { timeout: ms });
  const startMars = async (save) => {
    await page.goto('http://localhost:8080/' + (DEMO ? '?demo=1' : ''));
    await waitFor(() => window.game && game.scene.isActive('BootScene') && game.scene.getScene('BootScene').ready, 15000);
    await page.evaluate(s => { localStorage.setItem('stillHere', JSON.stringify(s)); State.load(); }, save);
    await click(240, 130);
    await waitFor(() => game.scene.isActive('HomeScene'), 5000);
    await page.evaluate(() => game.scene.getScene('HomeScene').scene.start('MarsScene'));
    await waitFor(() => game.scene.isActive('MarsScene') && game.scene.getScene('MarsScene').topBar, 5000);
    await page.evaluate(() => {
      window.__wind = 0;
      const w = MarsScene.prototype.windGust;
      MarsScene.prototype.windGust = function () { window.__wind++; return w.call(this); };
    });
  };
  // Keep playing like a kid who holds the arrow: re-press whenever the rover is IDLE
  let held = false;
  const hold = async on => { if (on && !held) { await page.keyboard.down('ArrowRight'); held = true; } if (!on && held) { await page.keyboard.up('ArrowRight'); held = false; } };
  // Drive like a player: keep the arrow held, re-press whenever the rover is IDLE
  const driveUntilCard = async () => {
    const t = Date.now();
    await hold(true);
    while (!(await page.evaluate(() => CardPopup.active))) {
      if ((await S()).state === 'IDLE') { await hold(false); await sleep(80); await hold(true); }
      await sleep(250);
      if (Date.now() - t > 150000) throw new Error('never reached the next find');
    }
    await hold(false);
  };
  const collectNext = async () => {
    await waitFor(() => CardPopup.active, 120000);
    await page.waitForFunction(() => CardPopup.ready, null, { timeout: 20000 });
    await click(240, 205);
    await waitFor(() => !CardPopup.active, 8000);
  };

  // ---------- Run 1: Mars after the Moon patch (gold expected) ----------
  await startMars({ moon: ['landing_stage', 'flag', 'science_station', 'laser_mirror', 'rover_sign'], mars: [], patches: ['moon'], sound: true, version: 1 });
  ok((await S()).battery === 100, 'battery starts full');
  // drain: hold until battery runs out -> RECHARGING (no game over)
  await page.evaluate(() => { game.scene.getScene('MarsScene').battery = 6; });
  await hold(true); await sleep(1800);
  let s = await S();
  ok(s.state === 'RECHARGING', `battery 0 while driving -> RECHARGING (battery ${s.battery.toFixed(1)})`);
  ok(await page.evaluate(() => !!game.scene.getScene('MarsScene').lowText && game.scene.getScene('MarsScene').lowText.str === 'Low battery, resting...'), '"Low battery, resting..." shown');
  const wx = s.worldX; await sleep(1500);
  ok(Math.abs((await S()).worldX - wx) < 1, 'input ignored while recharging (arrow still held)');
  await waitFor(() => game.scene.getScene('MarsScene').state !== 'RECHARGING', 12000);
  s = await S();
  ok(s.state === 'IDLE' && s.battery === 100, 'auto-recharged to full, control returns');
  await sleep(500);
  ok((await S()).state === 'IDLE', 'held arrow needs a fresh press after recharge');
  await hold(false); await hold(true); await sleep(600);
  ok((await S()).state === 'DRIVING', 'fresh press drives again');
  // resting charges with sparkles
  await page.evaluate(() => { game.scene.getScene('MarsScene').battery = 40; });
  await hold(false); await sleep(1000);
  s = await S();
  ok(s.battery > 45, `resting charges the battery (${s.battery.toFixed(1)})`);
  ok(await page.evaluate(() => game.scene.getScene('MarsScene').children.list.some(o => o.texture && o.texture.key === 'fx_spark')), 'sun sparkles stream while resting');
  await page.screenshot({ path: OUT + 'resting.png' });

  // find 1 with the battery at 0 during the card
  await driveUntilCard();
  await page.evaluate(() => { game.scene.getScene('MarsScene').battery = 0; });
  await page.waitForFunction(() => CardPopup.ready, null, { timeout: 20000 }); await page.screenshot({ path: OUT + 'card.png' });
  await click(240, 205);
  await waitFor(() => !CardPopup.active, 8000);
  await sleep(300);
  s = await S();
  ok(s.n === 1 && s.state === 'RECHARGING', `battery 0 during a find -> after the card it recharges (${s.state})`);
  await waitFor(() => game.scene.getScene('MarsScene').state === 'IDLE', 12000);
  ok(true, 'recovered from 0 after a find');

  // finds 2-4, driving like a player (arrow held, re-press when idle)
  for (let i = 2; i <= 4; i++) {
    await driveUntilCard();
    await page.waitForFunction(() => CardPopup.ready, null, { timeout: 20000 }); await click(240, 205);
    await waitFor(() => !CardPopup.active, 8000);
    ok((await S()).n === i, `find ${i} collected`);
  }
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('stillHere')).mars.join()) === 'landing_platform,cone_parachute,heat_shield,space_rock', 'Mars order + saved');

  // storm: hold the arrow the whole time, re-pressing like a player; also force battery 0 mid-storm
  const tStorm = Date.now();
  await waitFor(() => game.scene.getScene('MarsScene').phase === 'hazy', 60000);
  await page.screenshot({ path: OUT + 'hazy.png' });
  await waitFor(() => game.scene.getScene('MarsScene').phase === 'storm', 60000);
  await page.evaluate(() => { game.scene.getScene('MarsScene').battery = 0; });
  await sleep(400);
  ok(['RECHARGING', 'DRIVING', 'IDLE'].includes((await S()).state), 'battery 0 during the storm: ' + (await S()).state);
  await page.screenshot({ path: OUT + 'storm.png' });
  while ((await S()).phase !== 'asleep' && Date.now() - tStorm < 90000) {
    const st = (await S()).state;
    if (st === 'IDLE') { await hold(false); await sleep(80); }
    await hold(true);
    await sleep(300);
  }
  const stormSec = (Date.now() - tStorm) / 1000;
  ok((await S()).phase === 'asleep', `storm always ends asleep while holding the arrow (${stormSec.toFixed(1)} s after the 4th card)`);
  if (!DEMO) ok(stormSec > 40 && stormSec < 56, 'storm lasts about 45 s');
  ok(await page.evaluate(() => window.__wind) >= (DEMO ? 1 : 2), `wind gusts happened (${await page.evaluate(() => window.__wind)})`);
  await hold(false);

  await waitFor(() => game.scene.getScene('MarsScene').state === 'STORY_END', 15000);
  ok(await page.evaluate(() => game.scene.getScene('MarsScene').rover.texture.key) === 'mars_rover_asleep', 'rover switched to asleep art');
  ok((await S()).battery === 0, 'battery forced to 0');
  // battery 0 + taps during the ending: nothing breaks, lines can't be skipped in the first 2 s
  const lineCount = () => page.evaluate(() => game.scene.getScene('MarsScene').children.list.filter(o => o.depth === 30 && o.str).length);
  const c0 = await lineCount();
  await click(240, 135); await sleep(300); await click(240, 135); await sleep(900);
  ok(await lineCount() === c0, `taps in the first 2 s do not skip a line (${c0})`);
  await sleep(1200); await click(240, 135); await sleep(300);
  ok(await lineCount() === c0 + 1, 'a tap after 2 s advances');
  await page.screenshot({ path: OUT + 'ending_text.png' });
  await waitFor(() => game.scene.getScene('MarsScene').children.list.filter(o => o.depth === 30 && o.str).length === 7, 30000);
  const shown = await page.evaluate(() => game.scene.getScene('MarsScene').children.list.filter(o => o.depth === 30 && o.str).sort((a, b) => a.y - b.y).map(o => o.str).join(' '));
  ok(shown === ENDING, 'ending text exactly matches README 9.4');
  await sleep(1000); await page.screenshot({ path: OUT + 'ending_all.png' });

  await waitFor(() => State.hasPatch('mars'), 20000);
  await waitFor(() => State.hasPatch('gold'), 20000);
  ok(true, 'Mars patch then golden Still Here patch earned');
  await waitFor(() => game.scene.getScene('MarsScene').children.list.some(o => o.str === 'It is still there. Still here.'), 10000);
  ok(true, 'closing line "It is still there. Still here." shown');
  await sleep(4000);
  await page.screenshot({ path: OUT + 'gold.png' });
  ok(JSON.stringify(await page.evaluate(() => JSON.parse(localStorage.getItem('stillHere')).patches)) === '["moon","mars","gold"]', 'patches saved: moon, mars, gold');
  await click(240, 250);
  await waitFor(() => game.scene.isActive('AlbumHallScene') && game.scene.getScene('AlbumHallScene').finale, 6000);
  ok(true, 'after the gold patch, Continue opens the Album Hall finale');

  // ---------- Run 2: do nothing during the storm; Mars-only save -> no gold ----------
  await startMars({ moon: [], mars: ['landing_platform', 'cone_parachute', 'heat_shield'], patches: [], sound: false, version: 1 });
  await page.evaluate(() => { const s = game.scene.getScene('MarsScene'); s.finds.slice(0, 3).forEach(f => (f.triggered = true)); s.worldX = s.finds[3].x - 260; });
  await hold(true);
  await waitFor(() => CardPopup.active, 30000);
  await hold(false);
  await page.waitForFunction(() => CardPopup.ready, null, { timeout: 20000 }); await click(240, 205);
  await waitFor(() => !CardPopup.active, 8000);
  const t2 = Date.now();
  await waitFor(() => game.scene.getScene('MarsScene').phase === 'asleep', 90000);
  const idle = (Date.now() - t2) / 1000;
  ok(true, `doing nothing: asleep after ${idle.toFixed(1)} s`);
  if (!DEMO) ok(idle > 40 && idle < 56, 'storm about 45 s when idle too');
  await waitFor(() => State.hasPatch('mars'), 60000);
  await sleep(3000);
  ok(!(await page.evaluate(() => State.hasPatch('gold'))), 'no gold patch without the Moon patch');
  ok((await S()).n === 4, 'Mars 4 / 4');

  console.log('console/page errors:', errs.length ? errs : 'none');
  ok(errs.length === 0, 'no console errors');
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
