import { dust, settle, pick, rand } from "../engine.js";

// Every letter leaves the ring at once and melts from its letterform
// into its place in the sigil, curling around the centre on the way.
export default async function metamorphosis({ layer, letters, tl, spawn, compose, finish }) {
  const vowels = letters.filter((l) => !l.shape);
  const consonants = letters.filter((l) => l.shape);

  const crumbling = vowels.map((l) => dust(layer, spawn(l), tl));
  const { targets, extras } = compose(consonants);
  const curl = pick([-1, 1]) * rand(0.5, 1);

  await Promise.all(
    consonants.map(async (letter, i) => {
      const stroke = spawn(letter);
      await tl.sleep(i * 140);
      await settle(stroke, targets[i], tl, { curl });
    })
  );

  await finish(extras);
  await Promise.all(crumbling);
}
