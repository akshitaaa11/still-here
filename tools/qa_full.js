// Full QA playthrough (README Section 17), one continuous session like a player:
// Boot -> Home -> Moon (5) -> Home -> Mars (4, storm, ending) -> gold -> Album Hall finale
// -> open all 9 cards -> Certificate -> Home. Plus reload, mute, storage-blocked, input checks.
// Run: python3 -m http.server 8080, then node tools/qa_full.js [demo]
const { chromium } = require('playwright');
const DEMO = process.argv.includes('demo');
const OUT = require('os').tmpdir() + '/qa_';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ENDING = 'Opportunity was built to last 90 Mars days. It lasted about 14 and a half years. In June 2018 a giant dust storm covered the sky. Its last message reached Earth on 10 June 2018. NASA sent over 1,000 commands. Opportunity did not answer. Opportunity fell asleep.';

async function session(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  if (opts.blockStorage) {
    await ctx.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage blocked'); } });
    });
  }
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });   // strict
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const toPage = (gx, gy) => page.evaluate(([gx, gy]) => { const r = game.canvas.getBoundingClientRect(); return { x: r.left + gx * r.width / 480, y: r.top + gy * r.height / 270 }; }, [gx, gy]);
  const click = async (gx, gy) => { const p = await toPage(gx, gy); await page.mouse.click(p.x, p.y); };
  const waitFor = (fn, ms = 10000, arg) => page.waitForFunction(fn, arg, { timeout: ms });
  const boot = async () => {
    await page.goto('http://localhost:8080/' + (DEMO ? '?demo=1' : ''));
    await waitFor(() => window.game && game.scene.isActive('BootScene') && game.scene.getScene('BootScene').children.list.length > 3, 20000);
    await click(240, 130);
    await waitFor(() => game.scene.isActive('HomeScene'));
    await sleep(900);
  };
  let held = false;
  const hold = async on => { if (on && !held) { await page.keyboard.down('ArrowRight'); held = true; } if (!on && held) { await page.keyboard.up('ArrowRight'); held = false; } };
  const cur = () => page.evaluate(() => game.scene.getScenes(true).map(s => s.sys.settings.key).join());
  // Drive like a player until a card opens: hold, re-press whenever the rover is idle
  const driveToCard = async key => {
    const t = Date.now();
    await hold(true);
    while (!(await page.evaluate(() => CardPopup.active))) {
      const st = await page.evaluate(k => game.scene.getScene(k).state, key);
      if (st === 'IDLE') { await hold(false); await sleep(80); await hold(true); }
      await sleep(250);
      if (Date.now() - t > 200000) throw new Error('stuck driving in ' + key);
    }
  };
  const collect = async () => {
    await waitFor(() => CardPopup.ready, 20000);
    await hold(false);
    await click(240, 205);
    await waitFor(() => !CardPopup.active, 10000);
  };
  return { ctx, page, errs, click, waitFor, boot, hold, cur, driveToCard, collect };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const S = await session(browser);
  const { page, click, waitFor, boot, hold, cur, driveToCard, collect } = S;
  const t0 = Date.now();

  // ---------- Loading -> tap -> Home ----------
  await page.goto('http://localhost:8080/' + (DEMO ? '?demo=1' : ''));
  await page.waitForFunction(() => window.game && game.scene.isActive('BootScene'), null, { timeout: 20000 });
  await page.evaluate(() => localStorage.clear());
  await boot();
  ok(await page.evaluate(() => AudioSys.state) === 'running', 'Loading -> tap -> Home, audio unlocked by the tap');
  ok(await page.evaluate(() => game.scene.getScene('HomeScene').counters.moon.str + '|' + game.scene.getScene('HomeScene').counters.mars.str) === '0 / 5|0 / 4', 'fresh Home: 0 / 5 and 0 / 4');

  // ---------- Moon via its Mission Card ----------
  await click(124, 148);
  await waitFor(() => game.scene.isActive('MoonScene') && game.scene.getScene('MoonScene').topBar);
  for (let i = 1; i <= 5; i++) {
    await driveToCard('MoonScene');
    if (i === 1) {   // holding the arrow while the card is open moves nothing
      const wx = await page.evaluate(() => game.scene.getScene('MoonScene').worldX);
      await sleep(1500);
      ok(Math.abs(await page.evaluate(() => game.scene.getScene('MoonScene').worldX) - wx) < 0.5, 'arrow held during the card: no movement');
    }
    await collect();
    if (i === 1) {
      await sleep(300);
      ok(await page.evaluate(() => game.scene.getScene('MoonScene').state) === 'IDLE', 'no stuck input after the card closes');
    }
  }
  ok(await page.evaluate(() => State.countChapter('moon')) === 5, 'Moon: 5 finds, 5 cards');
  await waitFor(() => game.scene.getScene('MoonScene').state === 'ENDING', 10000);
  await waitFor(() => game.scene.getScene('MoonScene').children.list.some(o => o.str === 'You parked it. It is still there.'), 20000);
  ok(true, 'Moon ending line shown');
  await waitFor(() => State.hasPatch('moon'), 20000);
  ok(true, 'Moon patch earned');
  await sleep(3500);
  await click(240, 238);   // Continue
  await waitFor(() => game.scene.isActive('HomeScene'));
  ok((await page.evaluate(() => AudioSys.activeLoops())).length === 0, 'no sound loops left running after leaving the Moon');
  await sleep(900);
  ok(await page.evaluate(() => game.scene.getScene('HomeScene').counters.moon.str) === '5 / 5', 'Home shows 5 / 5');

  // ---------- Mars via its Mission Card ----------
  await click(356, 148);
  await waitFor(() => game.scene.isActive('MarsScene') && game.scene.getScene('MarsScene').topBar);
  let sawRecharge = false;
  for (let i = 1; i <= 4; i++) {
    await driveToCard('MarsScene');
    await collect();
    if (i === 2) {   // battery drain -> low-battery pause -> recovers
      await page.evaluate(() => { game.scene.getScene('MarsScene').battery = 3; });
      await hold(true); await sleep(1200);
      sawRecharge = await page.evaluate(() => game.scene.getScene('MarsScene').state === 'RECHARGING');
      await hold(false);
      await waitFor(() => game.scene.getScene('MarsScene').state === 'IDLE', 15000);
    }
  }
  ok(sawRecharge, 'Mars: low-battery pause and recovery');
  ok(await page.evaluate(() => State.countChapter('mars')) === 4, 'Mars: 4 finds');
  const tS = Date.now();
  // storm while holding the arrow the whole time
  while ((await page.evaluate(() => game.scene.getScene('MarsScene').phase)) !== 'asleep') {
    if (await page.evaluate(() => game.scene.getScene('MarsScene').state) === 'IDLE') { await hold(false); await sleep(80); }
    await hold(true); await sleep(300);
    if (Date.now() - tS > 100000) break;
  }
  await hold(false);
  ok(await page.evaluate(() => game.scene.getScene('MarsScene').phase) === 'asleep', `storm ended in sleep (${((Date.now() - tS) / 1000).toFixed(0)} s)`);
  await waitFor(() => game.scene.getScene('MarsScene').children.list.filter(o => o.depth === 30 && o.str).length === 7, 40000);
  const shown = await page.evaluate(() => game.scene.getScene('MarsScene').children.list.filter(o => o.depth === 30 && o.str).sort((a, b) => a.y - b.y).map(o => o.str).join(' '));
  ok(shown === ENDING, 'Mars ending text exactly matches README 9.4');
  await waitFor(() => State.hasPatch('mars') && State.hasPatch('gold'), 30000);
  ok(true, 'Mars patch + golden Still Here patch');
  await sleep(6000);
  await page.screenshot({ path: OUT + 'gold.png' });
  await click(240, 250);   // Continue
  await waitFor(() => game.scene.isActive('AlbumHallScene') && game.scene.getScene('AlbumHallScene').finale);
  ok((await page.evaluate(() => AudioSys.activeLoops())).length === 0, 'no sound loops left running after leaving Mars');
  ok(true, 'both patches -> golden patch -> Album Hall finale');
  await sleep(1500);

  // ---------- Album Hall: all 9 cards ----------
  const slots = await page.evaluate(() => game.scene.getScene('AlbumHallScene').slots.map(s => ({ id: s.card.id, x: s.x, y: s.y })));
  let good = 0;
  for (const s of slots) {
    await click(s.x, s.y);
    await waitFor(() => { const a = game.scene.getScene('AlbumHallScene'); return a.focus && !a.busy; });
    const r = await page.evaluate(() => { const f = game.scene.getScene('AlbumHallScene').focus, c = f.slot.card; return f.panel.nameText.str === c.name && f.panel.shortText.str === c.short; });
    await click(196 + 56, 30 + 172);   // Read more
    await sleep(300);
    const r2 = await page.evaluate(() => { const f = game.scene.getScene('AlbumHallScene').focus; return f.panel.longText.visible && f.panel.longText.str === f.slot.card.long; });
    if (r && r2) good++;
    await page.keyboard.press('Escape');
    await waitFor(() => { const a = game.scene.getScene('AlbumHallScene'); return !a.focus && !a.busy; });
  }
  ok(good === 9, `opened all 9 cards in the Album Hall with correct text + Read more (${good}/9)`);
  await click(424, 254);   // Certificate (finale)
  await waitFor(() => game.scene.isActive('CertificateScene'));
  await sleep(1500);
  await page.screenshot({ path: OUT + 'certificate.png' });
  ok(true, 'Album Hall finale -> Certificate');
  await click(240, 244);
  await waitFor(() => game.scene.isActive('HomeScene'));
  console.log(`  (full playthrough took ${((Date.now() - t0) / 1000).toFixed(0)} s${DEMO ? ' in demo mode' : ''})`);

  // ---------- Reload restores everything; mute persists ----------
  await sleep(900);
  await click(132, 240);   // Sound -> OFF
  await sleep(300);
  await page.reload();
  await page.waitForFunction(() => window.game && game.scene.isActive('BootScene') && game.scene.getScene('BootScene').children.list.length > 3, null, { timeout: 20000 });
  await click(240, 130);
  await waitFor(() => game.scene.isActive('HomeScene'));
  await sleep(900);
  const after = await page.evaluate(() => { const h = game.scene.getScene('HomeScene'); return { m: h.counters.moon.str, r: h.counters.mars.str, p: State.data.patches.join(), sound: State.sound, muted: AudioSys.muted, label: h.soundBtn.label.str }; });
  ok(after.m === '5 / 5' && after.r === '4 / 4' && after.p === 'moon,mars,gold', 'reload: counters, silhouettes and patches restored');
  ok(!after.sound && after.muted && after.label === 'Sound: OFF', 'mute persists across reload');
  await click(132, 240);   // sound back on
  console.log('console/page errors (main session):', S.errs.length ? S.errs : 'none');
  ok(S.errs.length === 0, 'no console errors in the full playthrough (strict)');
  await S.ctx.close();

  // ---------- localStorage disabled -> still runs in memory ----------
  const B = await session(browser, { blockStorage: true });
  await B.boot();
  ok(true, 'storage blocked: boots to Home');
  await B.click(124, 148);
  await B.waitFor(() => game.scene.isActive('MoonScene') && game.scene.getScene('MoonScene').topBar);
  await B.driveToCard('MoonScene');
  await B.collect();
  ok(await B.page.evaluate(() => State.countChapter('moon')) === 1, 'storage blocked: collecting works in memory');
  ok(B.errs.length === 0, 'storage blocked: no errors ' + (B.errs.length ? B.errs.join(' | ') : ''));
  await B.ctx.close();

  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
