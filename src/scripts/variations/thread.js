import {
  C,
  segment,
  shapes,
  morph,
  dust,
  polar,
  dist,
  Stroke,
  rand,
  pick,
  easeInOut
} from "../engine.js";

// Every letter unravels into a length of thread, and the threads are tied
// end to end into one continuous line - the classic single-stroke sigil.
// The line hops between points on a hidden polar lattice, and each letter
// decides what its stretch of the line looks like (straight, looped,
// bowed, notched...). A ring marks where the line starts, a bar where it
// ends.
export default async function thread({ layer, letters, tl, spawn }) {
  const vowels = letters.filter((l) => !l.shape);
  const consonants = letters.filter((l) => l.shape);

  const crumbling = vowels.map((l) => dust(layer, spawn(l), tl));
  if (!consonants.length) return Promise.all(crumbling);

  // Hidden lattice the line travels across
  const offset = pick([0, Math.PI / 8]);
  const lattice = [[C, C]];
  [70, 130, 185].forEach((r) => {
    for (let i = 0; i < 8; i++) lattice.push(polar(r, offset + (i * Math.PI) / 4));
  });

  const spine = [pick(lattice.slice(9))];
  consonants.forEach(() => {
    const prev = spine[spine.length - 1];
    let options = lattice.filter(
      (p) => !spine.includes(p) && dist(p, prev) > 90
    );
    if (!options.length) options = lattice.filter((p) => dist(p, prev) > 90);
    spine.push(pick(options));
  });

  const swirl = pick([-1, 1]) * rand(0.5, 1);

  await Promise.all(
    consonants.map(async (letter, i) => {
      const stroke = spawn(letter);
      const from = stroke.bake();
      const to = segment(letter.shape, spine[i], spine[i + 1], pick([-1, 1]));
      const phase = rand(0, 6);

      await tl.sleep(i * 160);
      await tl.tween(1900, (t) => {
        const e = easeInOut(t);
        // curl around the centre on the way in
        const curl = Math.sin(Math.PI * e) * swirl;
        const cos = Math.cos(curl),
          sin = Math.sin(curl);
        stroke.pts = morph(from, to, e, 9, phase).map(([x, y]) => [
          C + (x - C) * cos - (y - C) * sin,
          C + (x - C) * sin + (y - C) * cos
        ]);
        stroke.render();
      });
    })
  );

  // Terminators: a ring at the start, a bar across the end
  const first = spine[0],
    last = spine[spine.length - 1],
    beforeLast = spine[spine.length - 2];
  const ring = new Stroke(layer, shapes.circle, {
    x: first[0],
    y: first[1],
    scale: 9,
    reveal: 0
  });
  const bar = new Stroke(layer, shapes.line, {
    x: last[0],
    y: last[1],
    scale: 14,
    rot:
      Math.atan2(last[1] - beforeLast[1], last[0] - beforeLast[0]) +
      Math.PI / 2,
    reveal: 0
  });
  await tl.tween(500, (t) => {
    ring.reveal = bar.reveal = easeInOut(t);
    ring.render();
    bar.render();
  });

  await Promise.all(crumbling);
}
