import {
  C,
  shapes,
  segment,
  morph,
  dust,
  polar,
  toPolar,
  Stroke,
  lerp,
  rand,
  pick,
  easeInOut,
  easeOut
} from "../engine.js";

// The witch's wheel: a line is traced across the ring from letter to
// letter in the order they appear in the wish. The kind of line depends on
// the letter it arrives at (a "circle" letter loops, a "zigzag" letter
// jitters...). Each letter then shrinks into a small ornament at its
// vertex, and the vertices are pulled in to different depths so the figure
// stops being a tidy star and becomes a sigil.
export default async function wheel({ layer, letters, tl, spawn }) {
  const vowels = letters.filter((l) => !l.shape);
  const consonants = letters.filter((l) => l.shape);

  const crumbling = vowels.map((l) => dust(layer, spawn(l), tl));

  const nodes = consonants.map((letter) => {
    const stroke = spawn(letter);
    return { letter, stroke, ...toPolar(stroke.x, stroke.y) };
  });
  const point = (node) => polar(node.r, node.a);

  // Trace the wish across the wheel
  const chords = [];
  for (let i = 1; i < nodes.length; i++) {
    const chord = {
      from: nodes[i - 1],
      to: nodes[i],
      shape: nodes[i].letter.shape,
      sign: pick([-1, 1])
    };
    chord.stroke = new Stroke(
      layer,
      segment(chord.shape, point(chord.from), point(chord.to), chord.sign),
      { reveal: 0 }
    );
    chords.push(chord);

    const target = nodes[i].stroke;
    const base = target.scale;
    await tl.tween(420, (t) => {
      chord.stroke.reveal = easeInOut(t);
      chord.stroke.render();
      // the letter swells as the line reaches it
      target.scale = base * (1 + 0.5 * Math.sin(Math.PI * t));
      target.render();
    });
  }

  // Letters collapse into ornaments
  await Promise.all(
    nodes.map(async (node, i) => {
      const { stroke, letter } = node;
      const from = stroke.pts;
      const startScale = stroke.scale;
      const endScale = i === 0 ? 20 : 13;
      await tl.sleep(i * 60);
      await tl.tween(600, (t) => {
        const e = easeInOut(t);
        stroke.pts = morph(from, shapes[letter.shape], e, 0.08, i);
        stroke.scale = lerp(startScale, endScale, e);
        stroke.render();
      });
    })
  );

  // Pull every vertex in to its own depth and turn the whole figure
  const turn = pick([-1, 1]) * rand(Math.PI / 2, Math.PI);
  const alone = nodes.length === 1;
  nodes.forEach((node) => {
    node.startR = node.r;
    node.startA = node.a;
    node.endR = alone ? 0 : node.r * pick([0.3, 0.45, 0.6, 0.75, 0.85]);
    node.startScale = node.stroke.scale;
    node.endScale = alone ? 120 : node.stroke.scale;
  });

  await tl.tween(1500, (t) => {
    const e = easeInOut(t);
    nodes.forEach((node) => {
      node.r = lerp(node.startR, node.endR, e);
      node.a = node.startA + turn * e;
      [node.stroke.x, node.stroke.y] = point(node);
      node.stroke.rot = node.a;
      node.stroke.scale = lerp(node.startScale, node.endScale, easeOut(t));
      node.stroke.render();
    });
    chords.forEach((chord) => {
      chord.stroke.pts = segment(
        chord.shape,
        point(chord.from),
        point(chord.to),
        chord.sign
      );
      chord.stroke.render();
    });
  });

  await Promise.all(crumbling);
}
