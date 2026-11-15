// Space Quiz (unlocks when all 9 cards are collected). Score out of 8:
//  Round 1: drag 4 parts onto the clue that matches (4 answers + 1 extra in the tray), flag excluded
//  Round 2: Moon or Mars? for 3 other parts
//  Round 3: a 6-piece picture puzzle of the landing stage (1 point)
// Clues are sentences copied word for word from the approved card text (cards.json `clue`).
class QuizScene extends Phaser.Scene {
  constructor() { super('QuizScene'); }

  create() {
    Fx.fitCamera(this); Fx.ensure(this);
    this.cameras.main.fadeIn(250);
    this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x0b0b1a);
    Fx.stars(this, 70, 0, 269, 'quiz-stars');
    this.score = 0; this.total = 8; this.layer = [];
    new PixelText(this, 10, 13, 'Space Quiz', { size: 12, bold: true, color: '#e8c34a', shadow: '#14141f', originX: 0 }).setDepth(50);
    this.scoreText = new PixelText(this, 240, 13, '', { size: 12, bold: true, color: '#fff3a0', shadow: '#14141f' }).setDepth(50);
    this.setScore(0);
    new Button(this, 448, 13, 'Home', () => this.go('HomeScene'), { w: 52, h: 18, size: 10, face: 0x4a4a55, lip: 0x2b2b33 });
    this.pool = Cards.list.filter(c => c.id !== 'flag');
    this.round1();
  }

  go(key, data) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }

  setScore(n) {
    this.score = n;
    this.scoreText.setString(`Score: ${n} / ${this.total}`);
    const b = this.scoreText.baseScale;
    this.scoreText.setScale(1.4 * b);
    this.tweens.add({ targets: this.scoreText, scaleX: b, scaleY: b, duration: 300, ease: 'Back.easeOut' });
  }

  point(x, y) {
    this.setScore(this.score + 1);
    AudioSys.play('jingle_progress'); Haptics.collect();
    Fx.burst(this, x, y, 14, { depth: 80 });
  }

  keep(o) { this.layer.push(o); return o; }
  clear() { this.layer.forEach(o => o.destroy()); this.layer = []; }
  heading(t) { return this.keep(new PixelText(this, 240, 34, t, { size: 11, bold: true, color: '#ffffff', shadow: '#14141f' })); }

  // ---------- Round 1: drag the part onto its clue
  round1() {
    this.clear();
    const sh = a => Phaser.Utils.Array.Shuffle(a.slice());
    const picks = sh(this.pool).slice(0, 4);
    this.used = new Set(picks.map(c => c.id));
    const decoy = sh(this.pool.filter(c => !this.used.has(c.id)))[0];
    this.heading('Drag each part onto the clue it matches!');
    this.slots = picks.map((card, i) => {
      const y = 66 + i * 40;
      const g = this.keep(this.add.graphics());
      g.fillStyle(0x1b1b36).fillRect(8, y - 18, 352, 37);
      this.keep(new PixelText(this, 14, y - 16, card.chapter === 'moon' ? 'Left on the Moon' : 'Left on Mars',
        { size: 7, bold: true, color: card.chapter === 'moon' ? '#b9c8ff' : '#ffb27a', originX: 0, originY: 0 }));
      this.keep(new PixelText(this, 14, y - 7, card.clue, { size: 7, color: '#f4f1ea', wrap: 340, lineH: 8, originX: 0, originY: 0 }));
      const box = this.keep(this.add.rectangle(400, y, 56, 36, 0x0b0b1a).setStrokeStyle(2, 0x6a6a88));
      return { card, x: 400, y, box, filled: false, first: true };
    });
    const opts = sh([...picks, decoy]);
    this.tiles = opts.map((card, k) => {
      const hx = 240 + (k - 2) * 66, hy = 246;
      const frame = this.keep(this.add.rectangle(hx, hy, 58, 38, 0x3a3a5a).setStrokeStyle(2, 0x8a8aa8));
      const img = this.keep(this.add.image(hx, hy, CardArt.picture(this, card, 52, 32)).setInteractive({ draggable: true, useHandCursor: true }));
      const t = { card, img, frame, hx, hy, done: false };
      img.on('dragstart', () => { img.setDepth(20); frame.setDepth(19); AudioSys.play('ui_tap'); Haptics.tap(); });
      img.on('drag', (p, x, y) => { img.setPosition(x, y); frame.setPosition(x, y); });
      img.on('dragend', () => this.dropTile(t));
      return t;
    });
    this.input.setTopOnly(true);
  }

  dropTile(t) {
    const s = this.slots.find(s => !s.filled && Math.abs(t.img.x - s.x) < 40 && Math.abs(t.img.y - s.y) < 26);
    const home = () => this.tweens.add({ targets: [t.img, t.frame], x: t.hx, y: t.hy, duration: 220, ease: 'Back.easeOut' });
    if (!s) { home(); return; }
    if (s.card.id === t.card.id) {
      s.filled = true; t.done = true;
      t.img.disableInteractive();
      t.img.setPosition(s.x, s.y); t.frame.setPosition(s.x, s.y).setFillStyle(0x2f6b3f);
      s.box.setStrokeStyle(2, 0x4fd16a);
      if (s.first) this.point(s.x, s.y); else { AudioSys.play('collect'); }
      if (this.slots.every(x => x.filled)) {
        this.keep(new Button(this, 430, 246, 'Next', () => this.round2(), { w: 70, h: 26, size: 12, face: 0x3fae5a, lip: 0x22703a })).pulse(true);
      }
    } else {
      s.first = false;
      AudioSys.play('bounce'); Haptics.tap();
      s.box.setStrokeStyle(2, 0xe0504a);
      this.tweens.add({ targets: s.box, x: s.x + 3, duration: 50, yoyo: true, repeat: 3, onComplete: () => { s.box.x = s.x; s.box.setStrokeStyle(2, 0x6a6a88); } });
      home();
    }
  }

  // ---------- Round 2: Moon or Mars?
  round2() {
    this.clear();
    this.r2 = Phaser.Utils.Array.Shuffle(Cards.list.filter(c => !this.used.has(c.id))).slice(0, 3);
    this.r2i = 0;
    this.askWhere();
  }

  askWhere() {
    this.clear();
    const card = this.r2[this.r2i];
    this.heading(`Where was this left behind?  (${this.r2i + 1} of 3)`);
    const g = this.keep(this.add.graphics());
    g.fillStyle(0xe8c34a).fillRect(168, 52, 144, 104);
    g.fillStyle(0x0b0b1a).fillRect(171, 55, 138, 98);
    this.keep(this.add.image(240, 104, CardArt.picture(this, card, 130, 92)));
    this.keep(new PixelText(this, 240, 172, card.name, { size: 13, bold: true, color: '#e8c34a', shadow: '#14141f' }));
    let answered = false;
    const pick = ch => {
      if (answered) return;
      answered = true;
      const right = ch === card.chapter;
      if (right) this.point(240, 104); else { AudioSys.play('bounce'); Haptics.tap(); }
      this.keep(new PixelText(this, 240, 252, right ? `Yes! It was left on ${card.chapter === 'moon' ? 'the Moon' : 'Mars'}!`
        : `Not quite! It was left on ${card.chapter === 'moon' ? 'the Moon' : 'Mars'}.`,
        { size: 11, bold: true, color: right ? '#7cff8a' : '#ffb27a', shadow: '#14141f' }));
      this.time.delayedCall(1500, () => { this.r2i++; if (this.r2i < 3) this.askWhere(); else this.round3(); });
    };
    this.keep(new Button(this, 170, 216, 'Moon', () => pick('moon'), { w: 100, h: 30, size: 14, face: 0x6b6b88, lip: 0x3a3a50 }));
    this.keep(new Button(this, 310, 216, 'Mars', () => pick('mars'), { w: 100, h: 30, size: 14, face: 0xc2603a, lip: 0x7a3322 }));
  }

  // ---------- Round 3: picture puzzle (landing stage, 3 x 2 pieces)
  round3() {
    this.clear();
    this.heading('Put the pieces together!');
    const card = Cards.get('landing_stage') || this.pool[0];
    const W = 144, H = 120, cols = 3, rows = 2, pw = W / cols, ph = H / rows;
    const key = 'quiz_puzzle';
    if (!this.textures.exists(key)) {
      const t = this.textures.createCanvas(key, W, H), c = t.getContext();
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#0b0b1a'; c.fillRect(0, 0, W, H);
      c.drawImage(this.textures.get(card.sprite).getSourceImage(), 0, 0, W, H);
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) t.add('p' + (r * cols + q), 0, q * pw, r * ph, pw, ph);
      t.refresh();
    }
    const x0 = 64, y0 = 70;
    const g = this.keep(this.add.graphics());
    g.lineStyle(2, 0xe8c34a).strokeRect(x0 - 2, y0 - 2, W + 4, H + 4);
    this.keep(this.add.image(x0, y0, key).setOrigin(0, 0).setAlpha(0.18));     // faint guide
    const spots = Phaser.Utils.Array.Shuffle([[300, 90], [380, 90], [300, 160], [380, 160], [300, 228], [380, 228]]);
    this.pieces = [];
    for (let i = 0; i < cols * rows; i++) {
      const tx = x0 + (i % cols) * pw + pw / 2, ty = y0 + Math.floor(i / cols) * ph + ph / 2;
      const [sx, sy] = spots[i];
      const img = this.keep(this.add.image(sx, sy, key, 'p' + i).setInteractive({ draggable: true, useHandCursor: true }));
      const pc = { img, tx, ty, done: false };
      img.on('dragstart', () => { img.setDepth(20); Haptics.tap(); });
      img.on('drag', (p, x, y) => img.setPosition(x, y));
      img.on('dragend', () => {
        if (Math.abs(img.x - tx) < 16 && Math.abs(img.y - ty) < 16) {
          img.setPosition(tx, ty).disableInteractive().setDepth(5);
          pc.done = true; AudioSys.play('collect'); Haptics.tap();
          if (this.pieces.every(p => p.done)) {
            this.point(x0 + W / 2, y0 + H / 2);
            this.keep(new PixelText(this, x0 + W / 2, y0 + H + 16, card.name + '!', { size: 12, bold: true, color: '#7cff8a', shadow: '#14141f' }));
            this.keep(new Button(this, 340, 246, 'See my score!', () => this.go('QuizResultScene', { score: this.score, total: this.total }),
              { w: 120, h: 26, size: 12, face: 0x3fae5a, lip: 0x22703a })).pulse(true);
          }
        }
      });
      this.pieces.push(pc);
    }
  }
}

// Congratulations page: stars, confetti and a cheerful message
class QuizResultScene extends Phaser.Scene {
  constructor() { super('QuizResultScene'); }
  create(data) {
    Fx.fitCamera(this); Fx.ensure(this);
    this.cameras.main.fadeIn(250);
    const score = data && data.score != null ? data.score : 0, total = (data && data.total) || 8;
    this.add.rectangle(240, 135, K.GAME_W, K.GAME_H, 0x0b0b1a);
    Fx.stars(this, 80, 0, 269, 'result-stars');
    const f = score / total;
    const title = f === 1 ? 'PERFECT SCORE!' : f >= 0.75 ? 'AMAZING JOB!' : f >= 0.5 ? 'GREAT WORK!' : 'GOOD TRY!';
    const msg = f === 1 ? 'You are a real space expert!' : f >= 0.75 ? 'You know your space hardware, explorer!'
      : f >= 0.5 ? 'You are on your way to the stars!' : 'Every explorer keeps learning. Try again!';
    const t = new PixelText(this, 240, 46, title, { size: 22, bold: true, color: '#e8c34a', shadow: '#14141f' }).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 52, duration: 500, ease: 'Back.easeOut' });
    // stars: 3 for 8, 2 for 6+, 1 for 3+
    const earned = f === 1 ? 3 : f >= 0.75 ? 2 : f >= 0.375 ? 1 : 0;
    this.starTex();
    for (let i = 0; i < 3; i++) {
      const s = this.add.image(180 + i * 60, 112, i < earned ? 'quiz_star' : 'quiz_star_off').setScale(0);
      this.tweens.add({ targets: s, scale: 2, duration: 450, delay: 400 + i * 350, ease: 'Back.easeOut',
        onStart: () => { if (i < earned) { AudioSys.play('jingle_progress'); Haptics.tap(); } } });
    }
    new PixelText(this, 240, 168, `You scored ${score} out of ${total}!`, { size: 15, bold: true, color: '#ffffff', shadow: '#14141f' });
    new PixelText(this, 240, 192, msg, { size: 11, bold: true, color: '#7cff8a', shadow: '#14141f' });
    this.time.delayedCall(1500, () => { AudioSys.play('patch_fanfare'); Haptics.patch(); });
    // confetti
    const cols = [0xe8c34a, 0xff6b6b, 0x7cff8a, 0x6bb6ff, 0xffb27a, 0xd98aff];
    this.time.addEvent({ delay: 60, repeat: 70, callback: () => {
      const c = this.add.rectangle(Phaser.Math.Between(0, 480), -6, Phaser.Math.Between(3, 5), Phaser.Math.Between(4, 7), Phaser.Utils.Array.GetRandom(cols)).setDepth(30);
      this.tweens.add({ targets: c, y: 280, x: c.x + Phaser.Math.Between(-40, 40), angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(1800, 3200), onComplete: () => c.destroy() });
    } });
    new Button(this, 180, 238, 'Play again', () => this.go('QuizScene'), { w: 100, h: 26, size: 12, face: 0x3fae5a, lip: 0x22703a });
    new Button(this, 300, 238, 'Home', () => this.go('HomeScene'), { w: 100, h: 26, size: 12 });
  }
  go(key) { this.cameras.main.fadeOut(250); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key)); }
  starTex() {
    const make = (key, fill, edge) => {
      if (this.textures.exists(key)) return;
      const rows = ['.....#.....', '....###....', '....###....', '###########', '.#########.', '..#######..', '..#######..', '.####.####.', '.###...###.', '##.......##'];
      const t = this.textures.createCanvas(key, 11, 10), c = t.getContext();
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') { c.fillStyle = fill; c.fillRect(x, y, 1, 1); } }));
      t.refresh();
    };
    make('quiz_star', '#ffd84a'); make('quiz_star_off', '#3a3a5a');
  }
}
