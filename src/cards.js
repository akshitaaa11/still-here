// Card lookup. All card text lives in src/data/cards.json (never hard-coded in scenes).
const Cards = {
  list: [],
  init(arr) {
    this.list = Array.isArray(arr) ? arr.slice() : [];
    if (!this.list.length) console.warn('cards.json missing or empty: cards will not show');
  },
  get(id) { return this.list.find(c => c.id === id); },
  byChapter(ch) { return this.list.filter(c => c.chapter === ch).sort((a, b) => a.order - b.order); },
  // Top-bar slot for a card = its find order within its chapter, zero based
  slotIndex(id) { const c = this.get(id); return c ? c.order - 1 : 0; }
};
