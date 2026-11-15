// Chapter 2: Opportunity (README 9.4). One mechanic: the battery. Hold to drive (drains),
// let go to rest (Sun sparkles charge the panel). After the 4th find a scripted storm always
// ends with Opportunity asleep, whatever the player does. No game over anywhere.
// Extra states: RECHARGING (battery hit 0, input ignored until full), ASLEEP, STORY.
class MarsScene extends ChapterBase {
  constructor() { super('MarsScene'); }

  getConfig() { return CHAPTERS.mars; }

  buildWorld() {
    this.battery = 100;
    this.phase = 'none';          // none | title | clear | hazy | storm | asleep
    this.roverStill = false;
    this.sparkT = 0; this.dustT = 0; this.windT = 0; this.windOn = false;

    // The Sun is part of the owner's sky picture; this marker is where sparkles fly from (its
    // alpha is still faded by the storm, which only affects the sparkles)
    const sp = this.cfg.sunPos || [428, 84];
    this.sun = { x: sp[0], y: sp[1], alpha: 1 };

    // Storm tints (no numbers anywhere, just colour)
    this.haze = this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0xc98a5a).setAlpha(0).setDepth(19);
    this.stormTint = this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x5a2a1c).setAlpha(0).setDepth(19.5);
    this.dim = this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x000000).setAlpha(0).setDepth(25);
  }

  chargeMult() {
    return { hazy: K.CHARGE_MULT_HAZY, storm: K.CHARGE_MULT_STORM, asleep: 0 }[this.phase] ?? K.CHARGE_MULT_CLEAR;
  }

  afterUpdate(dt) {
    const s = this.state;
    // Empty battery always means a rest first (also right after a card closes at 0)
    if ((s === 'DRIVING' || s === 'IDLE') && this.battery <= 0) { this.enterRecharge(); return; }
    // Battery: drains only while driving; charges while resting in the sun
    if (s === 'DRIVING') this.battery -= K.BATTERY_DRAIN_PER_SEC * dt;
    else if ((s === 'IDLE' || s === 'RECHARGING' || s === 'STORY') && this.phase !== 'asleep') {
      this.battery += K.BATTERY_CHARGE_PER_SEC * this.chargeMult() * dt;
    }
    this.battery = Phaser.Math.Clamp(this.battery, 0, 100);
    if (s === 'DRIVING' && this.battery <= 0) this.enterRecharge();
    if (s === 'RECHARGING') {
      this.speed = Math.max(0, this.speed - K.ACCEL * 2 * dt);
      if (this.battery >= 100) this.exitRecharge();
    }
    if (s === 'ASLEEP') this.speed = Math.max(0, this.speed - K.ACCEL * 2 * dt);
    this.topBar.setBattery(this.battery / 100);

    // Resting in sunlight: sparkles stream from the Sun to the panel + soft hum
    const resting = (s === 'IDLE' || s === 'RECHARGING' || s === 'STORY') && this.phase !== 'asleep' && this.battery < 100;
    if (resting) AudioSys.loop('charge_loop'); else AudioSys.stop('charge_loop');
    if (resting) {
      this.sparkT -= dt;
      if (this.sparkT <= 0) { this.sparkT = 0.12 / Math.max(0.15, this.chargeMult()); this.sunSparkle(); }
    }

    // Tiny sway while driving (the scenery is moved by ChapterBase)
    if (!this.roverStill) this.rover.y = this.baseY - (this.speed > 3 && Math.floor(this.time.now / 160) % 2 ? 1 : 0);

    // Dust: a little when hazy, a lot in the storm
    const rate = { hazy: 8, storm: 45, asleep: 20 }[this.phase] || 0;
    if (rate) {
      this.dustT += dt * rate;
      while (this.dustT >= 1) { this.dustT -= 1; this.dust(); }
    }
    // Wind gusts during the hazy and storm phases
    if (this.windOn) {
      this.windT -= dt;
      if (this.windT <= 0) { this.windT = Phaser.Math.FloatBetween(K.WIND_MIN_SEC, K.WIND_MAX_SEC); this.windGust(); }
    }
  }

  // the solar panel deck sits a little above the middle of the rover picture
  panelPos() { return { x: this.rover.x, y: this.baseY - this.rover.displayHeight * 0.55 }; }

  sunSparkle() {
    const p = this.panelPos();
    const s = this.add.image(this.sun.x + Phaser.Math.Between(-10, 10), this.sun.y + Phaser.Math.Between(-10, 10), 'fx_spark').setDepth(18);
    this.tweens.add({
      targets: s, x: p.x + Phaser.Math.Between(-12, 12), y: p.y, duration: 800, ease: 'Sine.easeIn',
      onComplete: () => s.destroy()
    });
  }

  dust() {
    const d = this.add.rectangle(K.GAME_W + 4, Phaser.Math.Between(30, 266), Phaser.Math.Between(2, 4), 1, 0xe8a46a)
      .setAlpha(0.8).setDepth(21);
    this.tweens.add({ targets: d, x: -10, y: d.y + Phaser.Math.Between(-12, 12), duration: Phaser.Math.Between(700, 1300), onComplete: () => d.destroy() });
  }

  enterRecharge() {
    this.setState('RECHARGING');
    Haptics.lowBattery();
    if (!this.lowText) {
      this.lowText = new PixelText(this, 240, 54, this.cfg.lowBattery, { size: 12, bold: true, color: '#fff3a0', shadow: '#14141f' }).setDepth(80);
      this.tweens.add({ targets: this.lowText, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
    }
  }

  exitRecharge() {
    this.battery = 100;
    this.clearLowText();
    Controls.consume();   // a still-held arrow must be pressed again
    this.setState('IDLE');
  }

  clearLowText() { if (this.lowText) { this.lowText.destroy(); this.lowText = null; } }

  // Wind cleans the panels: a gust sweeps across, battery +25
  windGust() {
    if (this.phase === 'asleep') return;
    AudioSys.play('wind');
    Haptics.wind();
    this.battery = Math.min(100, this.battery + K.WIND_BOOST);
    const y0 = this.panelPos().y;
    for (let i = 0; i < 7; i++) {
      const l = this.add.rectangle(-20, y0 - 30 + i * 9, Phaser.Math.Between(18, 34), 1, 0xf4f1ea).setAlpha(0.85).setDepth(22);
      this.tweens.add({ targets: l, x: K.GAME_W + 30, duration: 700, delay: i * 40, onComplete: () => l.destroy() });
    }
    const p = this.panelPos();
    this.time.delayedCall(300, () => Fx.burst(this, p.x, p.y, 10, { depth: 23 }));
    const t = new PixelText(this, p.x + 10, p.y - 40, this.cfg.windLine, { size: 10, bold: true, color: '#ffffff', shadow: '#14141f' }).setDepth(80);
    this.tweens.add({ targets: t, y: t.y - 10, alpha: 0, delay: 900, duration: 700, onComplete: () => t.destroy() });
  }

  // ---- Storm timeline (README 9.4). Timer driven: it ends in sleep no matter what. ----
  async onChapterComplete() {
    const T = DEMO ? K.DEMO_STORM_SCALE : 1;

    // 1. "14 years later..."
    this.phase = 'title';
    const veil = this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x0b0b1a).setAlpha(0).setDepth(85);
    const title = new PixelText(this, 240, 130, this.cfg.stormTitle, { size: 16, bold: true, color: '#ffffff', shadow: '#14141f' }).setDepth(86).setAlpha(0);
    const tt = K.STORM_TITLE_SEC * 1000 * T;
    this.tweens.add({ targets: [veil, title], alpha: { from: 0, to: 0.85 }, duration: tt * 0.3, yoyo: true, hold: tt * 0.4 });
    await Fx.wait(this, tt);
    veil.destroy(); title.destroy();

    // 2. The storm rolls in: dark orange-brown sky, heavy dust. The rover stops; the player is
    //    told why it must sleep and taps Sleep (it also sleeps by itself, so nobody gets stuck).
    this.setState('STORY');
    this.speed = 0;
    this.phase = 'storm';
    AudioSys.loop('storm_loop');
    Haptics.wind();
    this.tweens.add({ targets: this.haze, alpha: 0.3, duration: 1200 });
    this.tweens.add({ targets: this.stormTint, alpha: 0.5, duration: 1500 });
    this.tweens.add({ targets: this.sun, alpha: 0.2, duration: 1500 });
    await Fx.wait(this, 800);
    const why = new PixelText(this, 240, 74, this.cfg.stormWhy, { size: 11, bold: true, color: '#ffffff', shadow: '#14141f', wrap: 380, align: 'center' })
      .setDepth(86).setAlpha(0);
    this.tweens.add({ targets: why, alpha: 1, duration: 400 });
    await new Promise(res => {
      let done = false;
      const go = () => { if (!done) { done = true; res(); } };
      this.sleepBtn = new Button(this, 240, 140, 'Sleep', go, { w: 110, h: 30, size: 16, face: 0x5a5ad0, lip: 0x30307a }).setDepth(90).pulse(true);
      this.time.delayedCall(K.STORM_AUTOSLEEP_SEC * 1000 * T, go);
    });
    this.sleepBtn.destroy(); this.sleepBtn = null;
    why.destroy();

    // 3. Asleep through the storm (rover still, max 10 s)
    await this.fallAsleep();
    const zzz = new PixelText(this, 240, 74, this.cfg.asleepLine, { size: 12, bold: true, color: '#cfd6ff', shadow: '#14141f' }).setDepth(86);
    this.tweens.add({ targets: zzz, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });
    await Fx.wait(this, K.STORM_SEC * 1000 * T);

    // 4. The storm goes away
    zzz.destroy();
    this.phase = 'after';
    AudioSys.stop('storm_loop');
    this.tweens.add({ targets: [this.haze, this.stormTint], alpha: 0, duration: 1800 });
    this.tweens.add({ targets: this.sun, alpha: 1, duration: 1800 });
    await Fx.wait(this, 1800);
    await this.endingText();
    await this.finishChapter(this.cfg.patch, this.cfg.closingLine);
  }

  async fallAsleep() {
    this.windOn = false;
    this.clearLowText();
    this.setState('ASLEEP');
    Haptics.sleep();
    this.phase = 'asleep';
    AudioSys.stop('charge_loop');
    await Fx.tween(this, { targets: this, battery: 0, duration: 1000, ease: 'Sine.easeIn' });
    // speed is decelerated in afterUpdate; make sure the wheels have stopped before swapping art
    await Fx.wait(this, 300);
    this.speed = 0;
    this.roverStill = true;
    this.rover.y = this.baseY;
    await Fx.tween(this, { targets: this.rover, alpha: 0.3, duration: 400 });
    this.rover.setTexture(this.cfg.asleep).setScale(K[this.cfg.roverScaleKey] || 1);
    await Fx.tween(this, { targets: this.rover, alpha: 1, duration: 600 });
    await Fx.tween(this, { targets: this.dim, alpha: 0.45, duration: 2000 });
  }

  // Fixed ending text, one line at a time. Tap or wait to advance, but a line cannot be
  // skipped by accident in its first 2 s.
  async endingText() {
    this.setState('STORY_END');
    let tapped = false;
    const onTap = () => { tapped = true; };
    this.input.on('pointerup', onTap);
    this.input.keyboard.on('keydown-SPACE', onTap);
    const lines = [];
    for (let i = 0; i < this.cfg.endingLines.length; i++) {
      const t = new PixelText(this, 240, 46 + i * 26, this.cfg.endingLines[i], { size: 12, bold: true, color: '#ffffff', shadow: '#14141f' })
        .setDepth(30).setAlpha(0);
      lines.push(t);
      this.tweens.add({ targets: t, alpha: 1, duration: 500 });
      tapped = false;
      const start = this.time.now;
      await new Promise(res => {
        const ev = this.time.addEvent({
          delay: 50, loop: true, callback: () => {
            const e = this.time.now - start;
            if (e >= 3300 || (e >= 2000 && tapped)) { ev.remove(); res(); }
          }
        });
      });
    }
    this.input.off('pointerup', onTap);
    this.input.keyboard.off('keydown-SPACE', onTap);
    await Fx.wait(this, 800);
    await Fx.tween(this, { targets: lines, alpha: 0, duration: 700 });
    lines.forEach(l => l.destroy());
    AudioSys.stop('storm_loop');
  }
}
