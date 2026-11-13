import { SVG_NS, resample } from "./engine.js";

// A tiny single-stroke alphabet. Each letter is one continuous pen stroke
// (retracing where it has to), which is what makes it possible to morph a
// letter into any other stroke. Drawn in a box where the baseline is y=70,
// the x-height is y=30, ascenders reach y=0 and descenders y=95.
const paths = {
  a: "M45 30V70V58C45 76 10 78 10 52C10 26 45 28 45 45",
  b: "M10 0V70V52C10 26 45 26 45 50C45 76 10 76 10 55",
  c: "M44 38C30 24 8 30 8 50C8 70 30 76 44 62",
  d: "M45 0V70V52C45 26 10 26 10 50C10 76 45 76 45 55",
  e: "M10 50H44C44 24 10 24 10 50C10 74 34 76 44 62",
  f: "M40 6C28-2 20 4 20 18V70V30H8H34",
  g: "M45 48C45 24 10 24 10 50C10 76 45 76 45 52V30V80C45 98 18 98 12 86",
  h: "M10 0V70V48C14 26 45 24 45 46V70",
  i: "M18 30H26V70",
  j: "M22 30H30V82C30 98 12 96 8 88",
  k: "M10 0V70V52L40 30L22 44L44 70",
  l: "M22 0V60C22 70 28 70 32 68",
  m: "M6 70V30V44C8 26 28 26 28 44V70V44C30 26 50 26 50 44V70",
  n: "M10 70V30V48C14 26 45 24 45 46V70",
  o: "M27 30C4 30 4 70 27 70C50 70 50 30 27 30",
  p: "M10 95V30V48C10 24 45 24 45 50C45 76 10 76 10 52",
  q: "M45 95V30V48C45 24 10 24 10 50C10 76 45 76 45 52",
  r: "M12 70V30V46C16 30 30 26 40 34",
  s: "M42 38C34 26 10 28 12 42C14 54 40 46 42 60C44 74 16 74 8 62",
  t: "M8 30H38H22V8V60C22 70 30 72 38 66",
  u: "M10 30V54C10 76 40 76 45 52V30V70",
  v: "M8 30L26 70L44 30",
  w: "M4 30L15 70L27 38L39 70L50 30",
  x: "M8 30L44 70L26 50L44 30L8 70",
  y: "M8 30L27 66L45 30L27 66L14 95",
  z: "M8 30H44L8 70H44"
};

const cache = {};

// Letter as a unit-sized point list (1 unit = 100 path units), centred
// roughly on the middle of the x-height
export const glyph = (char) => {
  if (cache[char]) return cache[char];

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", paths[char]);
  const length = path.getTotalLength();
  const samples = 200;
  const poly = Array.from({ length: samples + 1 }, (_, i) => {
    const p = path.getPointAtLength((i / samples) * length);
    return [(p.x - 27) / 100, (p.y - 50) / 100];
  });

  return (cache[char] = resample(poly));
};
