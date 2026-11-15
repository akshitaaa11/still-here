// Small pixel icons drawn in code (white on transparent), used on icon-only buttons.
const Icons = {
  MAPS: {
    sound_on: [
      '......#.........', '.....##....#....', '....###..#..#...', '#######...#..#..', '#######.#..#..#.',
      '#######.#..#..#.', '#######...#..#..', '....###..#..#...', '.....##....#....', '......#.........'],
    sound_off: [
      '......#.........', '.....##.........', '....###..#...#..', '#######...#.#...', '#######....#....',
      '#######...#.#...', '#######..#...#..', '....###.........', '.....##.........', '......#.........'],
    vib_on: [
      '....######....', '..#.#....#.#..', '.#..#....#..#.', '#...#....#...#', '.#..#....#..#.',
      '#...#....#...#', '.#..#....#..#.', '..#.#.##.#.#..', '....######....'],
    vib_off: [
      '....######...#', '....#....#..#.', '....#....#.#..', '....#....##...', '....#....#....',
      '....#...##....', '....#..#.#....', '....#.##.#....', '...#######....']
  },
  ensure(scene) {
    for (const [name, rows] of Object.entries(this.MAPS)) {
      const key = 'ic_' + name;
      if (scene.textures.exists(key)) continue;
      const t = scene.textures.createCanvas(key, rows[0].length, rows.length), c = t.getContext();
      c.fillStyle = '#ffffff';
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') c.fillRect(x, y, 1, 1); }));
      t.refresh();
    }
  },
  sound() { return State.sound ? 'ic_sound_on' : 'ic_sound_off'; },
  vib() { return State.vibrate ? 'ic_vib_on' : 'ic_vib_off'; }
};
