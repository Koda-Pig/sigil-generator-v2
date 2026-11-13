import {
  C,
  shapes,
  morph,
  dust,
  polar,
  toPolar,
  lerp,
  rand,
  pick,
  snap,
  easeInOut,
  smooth
} from "../engine.js";

// Each letter spirals in from the ring, melting from its letterform into
// its shape on the way. Shapes land at random sizes, slightly off-centre,
// with their rotations locked to a shared angle so the pile reads as one
// deliberate mark rather than noise.
export default async function metamorphosis({ layer, letters, tl, spawn }) {
  const vowels = letters.filter((l) => !l.shape);
  const consonants = letters.filter((l) => l.shape);
  const alone = consonants.length === 1;

  const crumbling = vowels.map((l) => dust(layer, spawn(l), tl));

  const direction = pick([-1, 1]);
  const angleStep = pick([Math.PI / 4, Math.PI / 6, Math.PI / 2]);

  await Promise.all(
    consonants.map(async (letter, i) => {
      const stroke = spawn(letter);
      const from = stroke.pts;
      const to = shapes[letter.shape];
      const start = toPolar(stroke.x, stroke.y);
      const startScale = stroke.scale;
      const startRot = stroke.rot;
      const phase = rand(0, 6);

      const end = {
        r: alone ? 0 : rand(0, 55),
        a: start.a + direction * rand(1.5, 3.2),
        scale: alone ? 130 : rand(45, 140),
        rot: alone ? 0 : snap(rand(0, Math.PI * 2), angleStep)
      };

      await tl.sleep(i * 140);
      await tl.tween(2000, (t) => {
        const e = easeInOut(t);
        [stroke.x, stroke.y] = polar(
          lerp(start.r, end.r, e),
          lerp(start.a, end.a, e)
        );
        stroke.scale = lerp(startScale, end.scale, e);
        stroke.rot = lerp(startRot, end.rot, e);
        // hold the letterform briefly, then melt
        stroke.pts = morph(from, to, smooth((t - 0.1) / 0.75), 0.07, phase);
        stroke.render();
      });
    })
  );

  await Promise.all(crumbling);
}
