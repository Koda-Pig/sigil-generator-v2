import {
  segment,
  dust,
  settle,
  Stroke,
  pick,
  rand,
  easeInOut
} from "../engine.js";

// The witch's wheel: a line is traced across the ring from letter to
// letter in the order they appear in the wish. The kind of line depends on
// the letter it arrives at (a "circle" letter loops, a "zigzag" letter
// jitters...). Once the whole wish has been traced, the letters burn away
// and the traced lines themselves fold up into the sigil.
export default async function wheel({ layer, letters, tl, spawn, compose, finish }) {
  const vowels = letters.filter((l) => !l.shape);
  const consonants = letters.filter((l) => l.shape);

  const crumbling = vowels.map((l) => dust(layer, spawn(l), tl));
  if (!consonants.length) return Promise.all(crumbling);

  const glyphs = consonants.map(spawn);
  const at = (stroke) => [stroke.x, stroke.y];

  // Trace the wish across the wheel
  const chords = [];
  for (let i = 1; i < glyphs.length; i++) {
    const chord = new Stroke(
      layer,
      segment(consonants[i].shape, at(glyphs[i - 1]), at(glyphs[i]), pick([-1, 1])),
      { reveal: 0 }
    );
    chords.push(chord);

    const target = glyphs[i];
    const base = target.scale;
    await tl.tween(420, (t) => {
      chord.reveal = easeInOut(t);
      chord.render();
      // the letter swells as the line reaches it
      target.scale = base * (1 + 0.5 * Math.sin(Math.PI * t));
      target.render();
    });
  }
  await tl.sleep(250);

  // The first letter and every traced line become the strokes of the
  // sigil; the other letters have done their job
  const { targets, extras } = compose(consonants);
  const curl = pick([-1, 1]) * rand(0.4, 0.9);
  const strokes = [glyphs[0], ...chords];

  await Promise.all([
    ...glyphs.slice(1).map((glyph) => dust(layer, glyph, tl, 900)),
    ...strokes.map(async (stroke, i) => {
      await tl.sleep(i * 70);
      await settle(stroke, targets[i], tl, { curl, wobble: 5 });
    })
  ]);

  await finish(extras);
  await Promise.all(crumbling);
}
