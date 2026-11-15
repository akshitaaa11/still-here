// Save/load/reset (README 7.2, 10.3). Every localStorage call is in try/catch:
// private mode or blocked storage falls back to the in-memory copy, never a crash.
const State = (() => {
  const PATCHES = ['moon', 'mars', 'gold'];
  const fresh = () => ({ moon: [], mars: [], patches: [], sound: true, version: K.SAVE_VERSION });
  let data = fresh();

  // Accept only what we understand; corrupt or odd saves fall back to defaults.
  function sanitize(o) {
    const d = fresh();
    if (!o || typeof o !== 'object') return d;
    for (const ch of ['moon', 'mars']) {
      if (Array.isArray(o[ch])) d[ch] = [...new Set(o[ch].filter(x => typeof x === 'string'))];
    }
    if (Array.isArray(o.patches)) d.patches = [...new Set(o.patches.filter(p => PATCHES.includes(p)))];
    if (typeof o.sound === 'boolean') d.sound = o.sound;
    return d;
  }

  return {
    load() {
      try {
        const raw = window.localStorage.getItem(K.SAVE_KEY);
        data = raw ? sanitize(JSON.parse(raw)) : fresh();
      } catch (e) {
        data = fresh();
      }
      return data;
    },
    save() {
      try { window.localStorage.setItem(K.SAVE_KEY, JSON.stringify(data)); } catch (e) { /* stay in memory */ }
    },
    // Returns true only the first time a card is collected (idempotent).
    collect(cardId) {
      const card = Cards.get(cardId);
      if (!card || !data[card.chapter]) return false;
      if (data[card.chapter].includes(cardId)) return false;
      data[card.chapter].push(cardId);
      this.save();
      return true;
    },
    has(cardId) { return data.moon.includes(cardId) || data.mars.includes(cardId); },
    countChapter(ch) { return data[ch] ? data[ch].length : 0; },
    awardPatch(name) {
      if (!PATCHES.includes(name) || data.patches.includes(name)) return false;
      data.patches.push(name);
      this.save();
      return true;
    },
    hasPatch(name) { return data.patches.includes(name); },
    get sound() { return data.sound; },
    setSound(on) { data.sound = !!on; this.save(); },
    // Keeps the sound setting: Reset is about progress, not volume.
    reset() {
      const sound = data.sound;
      data = fresh();
      data.sound = sound;
      this.save();
    },
    get data() { return data; }
  };
})();
