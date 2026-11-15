// Named sounds, synthesised with Web Audio (README 14). If audio/<name>.mp3 exists and
// decodes, it silently replaces the synth for that name. Nothing plays before unlock().
const AudioSys = (() => {
  const NAMES = ['ui_tap', 'drive_loop', 'bounce', 'sparkle', 'card_open', 'collect', 'jingle_progress',
    'charge_loop', 'wind', 'storm_loop', 'patch_fanfare', 'album_whoosh'];
  let ctx = null, master = null, muted = false, noiseBuf = null;
  const buffers = {};   // decoded MP3 overrides
  const loops = {};     // running loops by name

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.3;   // master about 0.3, keep it gentle
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  // Short tone with a soft attack and release (no harsh square-wave screech)
  function tone(type, f0, f1, t0, dur, vol, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noiseBuffer() {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  // Filtered noise whoosh, sweeping from f0 to f1
  function whoosh(t0, dur, vol, f0, f1, q, type, dest) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer(); s.loop = true;
    f.type = type || 'bandpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || master);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  const SYN = {
    ui_tap: t => tone('sine', 660, 440, t, 0.07, 0.5),
    bounce: t => { tone('sine', 220, 90, t, 0.16, 0.7); whoosh(t, 0.1, 0.15, 400, 200, 1, 'lowpass'); },
    sparkle: t => [1200, 1600, 2100].forEach((f, i) => tone('sine', f, f, t + i * 0.08, 0.14, 0.25)),
    card_open: t => { whoosh(t, 0.35, 0.35, 300, 1600, 0.8); tone('sine', 440, 660, t + 0.15, 0.25, 0.25); },
    collect: t => { tone('sine', 500, 1100, t, 0.3, 0.4); whoosh(t, 0.3, 0.1, 1200, 3000, 2); },
    jingle_progress: t => [523, 659, 784].forEach((f, i) => tone('triangle', f, f, t + i * 0.09, 0.16, 0.4)),
    wind: t => whoosh(t, 0.9, 0.45, 300, 1400, 0.7),
    patch_fanfare: t => {
      [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, t + i * 0.16, 0.3, 0.4));
      [523, 659, 784].forEach(f => tone('sine', f, f, t + 0.64, 0.8, 0.22));
    },
    album_whoosh: t => { whoosh(t, 0.4, 0.4, 250, 1800, 0.8); tone('sine', 300, 600, t, 0.3, 0.15); }
  };

  // Loops return the sources to stop; they connect into the fade gain `dest`
  const LOOPS = {
    drive_loop: dest => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = 62; g.gain.value = 0.09;
      o.connect(g); g.connect(dest); o.start();
      const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), ng = ctx.createGain();
      n.buffer = noiseBuffer(); n.loop = true; f.type = 'lowpass'; f.frequency.value = 220; ng.gain.value = 0.12;
      n.connect(f); f.connect(ng); ng.connect(dest); n.start();
      return [o, n];
    },
    charge_loop: dest => {
      const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 330; g.gain.value = 0.05;
      l.frequency.value = 0.7; lg.gain.value = 0.03;   // slow shimmer
      l.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(dest); o.start(); l.start();
      return [o, l];
    },
    storm_loop: dest => {
      const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(),
        l = ctx.createOscillator(), lg = ctx.createGain();
      n.buffer = noiseBuffer(); n.loop = true; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0.3;
      l.frequency.value = 0.25; lg.gain.value = 0.12; l.connect(lg); lg.connect(g.gain);
      n.connect(f); f.connect(g); g.connect(dest); n.start(); l.start();
      return [n, l];
    }
  };

  function playBuffer(name, loop, dest) {
    const s = ctx.createBufferSource();
    s.buffer = buffers[name]; s.loop = !!loop;
    s.connect(dest || master); s.start();
    return s;
  }

  return {
    NAMES,
    // Must be called from a tap/click handler (Boot does this)
    unlock() {
      const c = ensure();
      if (!c) return;
      if (c.state !== 'running') c.resume().catch(() => {});
      try { // iOS: a silent buffer inside the gesture fully unlocks audio
        const s = c.createBufferSource();
        s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0);
      } catch (e) { /* ignore */ }
    },
    // Optional MP3 overrides. Missing files are fine (synth is used).
    loadMp3s() {
      if (!ctx) return;
      NAMES.forEach(n => {
        fetch('audio/' + n + '.mp3')
          .then(r => (r.ok ? r.arrayBuffer() : null))
          .then(ab => (ab ? ctx.decodeAudioData(ab) : null))
          .then(buf => { if (buf) buffers[n] = buf; })
          .catch(() => {});
      });
    },
    play(name) {
      if (!ctx || muted) return;
      try {
        if (buffers[name]) playBuffer(name, false);
        else if (SYN[name]) SYN[name](ctx.currentTime);
      } catch (e) { /* sound must never break the game */ }
    },
    loop(name) {
      if (!ctx || loops[name]) return;
      try {
        const g = ctx.createGain();
        g.gain.value = 0; g.connect(master);
        const src = buffers[name] ? [playBuffer(name, true, g)] : (LOOPS[name] ? LOOPS[name](g) : []);
        g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.25);
        loops[name] = { g, src };
      } catch (e) { /* ignore */ }
    },
    stop(name) {
      const l = loops[name];
      if (!l || !ctx) return;
      delete loops[name];
      try {
        const t = ctx.currentTime;
        l.g.gain.cancelScheduledValues(t);
        l.g.gain.setValueAtTime(l.g.gain.value, t);
        l.g.gain.linearRampToValueAtTime(0, t + 0.15);
      } catch (e) { /* ignore */ }
      setTimeout(() => l.src.forEach(s => { try { s.stop(); } catch (e) { /* already stopped */ } }), 300);
    },
    stopLoops() { Object.keys(loops).forEach(n => this.stop(n)); },  // loops must stop on scene change
    setMuted(m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : 0.3;
    },
    get muted() { return muted; },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
    resume() { if (ctx && ctx.state === 'suspended' && !muted) ctx.resume().catch(() => {}); }
  };
})();
