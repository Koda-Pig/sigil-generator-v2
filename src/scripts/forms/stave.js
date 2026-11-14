import { C, arc, resample, clamp } from "../engine.js";

// STAVE - a bindrune.
//
// The base rules never change: one dominant axis, strict mirror symmetry
// across it, and a focal point at the golden section of the spine where
// the largest mark sits. Marks shrink the further they are from it, and
// directional marks point away from it.
//
// On top of that are optional rules, each of which can be switched on or
// off (see `defaults`):
//
//   variants   every letter gets its own version of its shape, so letters
//              that share a shape (b d g p q are all circles) stop
//              looking identical
//   fusion     neighbouring marks combine into a compound mark
//   balance    marks are ordered by visual weight: heaviest at the focal
//              point, lightest at the ends, with more room around heavy
//              marks
//   branching  the marks furthest from the focal point move off the spine
//              onto a pair of mirrored arms
//   ornament   varied terminals, a doubled focal mark, dots in the gaps
//
// Only the consonants of the wish, each used once, are ever passed in.
// Nothing here may draw from vowels or repeated letters.
export const defaults = {
  variants: true,
  fusion: true,
  balance: true,
  branching: true,
  ornament: true
};

const TAU = Math.PI * 2;
const SPINE = 290; // most room the marks may take along the spine
const LIMIT = 186; // nothing is drawn further than this from the centre

/* ---------- marks ----------
   A mark is a function (dir) => points, drawn at size 1 around 0,0 with
   the spine running along y. `dir` is 1 or -1: which way along the spine
   a directional mark points. */

const polygon = (sides, r, turn = 0) =>
  arc(0, 0, r, turn - Math.PI / 2, turn - Math.PI / 2 + TAU, sides);
const box = (w, h) => [
  [-w, -h],
  [w, -h],
  [w, h],
  [-w, h],
  [-w, -h]
];
const bar = (w) => [
  [-w, 0],
  [w, 0]
];
const vee = (w, h) => (dir) => [
  [-w, dir * h],
  [0, 0],
  [w, dir * h]
];
const cup = (r, y = 0) => (dir) => arc(0, y, r, 0, Math.PI * dir, 32);
const ring = (r, y = 0) => () => arc(0, y, r, -Math.PI / 2, Math.PI * 1.5, 48);

const base = {
  line: () => bar(0.8),
  chevron: vee(0.8, 0.6),
  zigzag: (dir) => [
    [-0.9, 0],
    [-0.45, dir * 0.4],
    [0, 0],
    [0.45, dir * 0.4],
    [0.9, 0]
  ],
  crescent: cup(0.6),
  triangle: (dir) => polygon(3, 0.6, dir < 0 ? 0 : Math.PI),
  square: () => polygon(4, 0.55),
  rectangle: () => box(0.675, 0.41),
  circle: ring(0.5)
};

// One version of its shape per letter
const variants = {
  // circles
  b: base.circle,
  d: () => arc(0, 0, 1, 0, TAU, 48).map(([x, y]) => [x * 0.72, y * 0.36]),
  g: (dir) =>
    // horseshoe, open toward dir
    arc(0, 0, 0.5, (dir * Math.PI) / 2 + 0.6, (dir * Math.PI) / 2 + TAU - 0.6, 48),
  p: ring(0.28),
  q: () => [...ring(0.5)(), ...ring(0.2)()], // eye
  // lines
  j: () => bar(0.4),
  k: vee(0.9, 0.25),
  l: () => bar(1),
  t: () => [
    [-0.8, -0.12],
    [-0.8, 0.12],
    [-0.8, 0],
    [0.8, 0],
    [0.8, -0.12],
    [0.8, 0.12]
  ],
  x: () => [
    [-0.55, -0.4],
    [0.55, 0.4],
    [0, 0],
    [0.55, -0.4],
    [-0.55, 0.4]
  ],
  y: (dir) => [
    [-0.7, dir * 0.3],
    [-0.7, 0],
    [0.7, 0],
    [0.7, dir * 0.3]
  ],
  // crescents
  c: base.crescent,
  s: (dir) => [
    ...arc(-0.3, 0, 0.3, Math.PI, Math.PI - Math.PI * dir, 24),
    ...arc(0.3, 0, 0.3, Math.PI, Math.PI - Math.PI * dir, 24)
  ],
  // rectangles
  f: base.rectangle,
  h: () => box(0.85, 0.2),
  // zigzags
  n: base.zigzag,
  z: (dir) => [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9].map((x, i) => [x, i % 2 ? dir * 0.3 : 0]),
  // chevrons
  v: base.chevron,
  w: vee(0.45, 0.8)
};

/* ---------- fusion ----------
   Two neighbouring marks become one compound mark. Each rule returns the
   two marks that replace the originals, in the same order. */

// closed shapes: how far in something must sit to be inscribed in them,
// and how far their own corners reach at size 1
const closed = { circle: 1, triangle: 0.5, square: 0.7071, rectangle: 0.52 };
const corner = { circle: 0.5, triangle: 0.6, square: 0.55, rectangle: 0.79 };
const closedAt = (shape, r) => (dir) =>
  base[shape](dir).map(([x, y]) => [(x * r) / corner[shape], (y * r) / corner[shape]]);

const fuse = (a, b) => {
  const pair = (x, y) => (a === x && b === y) || (a === y && b === x);
  const order = (x, forX, forY) => (a === x ? [forX, forY] : [forY, forX]);

  // two the same
  if (pair("line", "line"))
    return [() => [[-0.6, -0.4], [0.6, 0.4]], () => [[0.6, -0.4], [-0.6, 0.4]]];
  if (pair("chevron", "chevron"))
    return [() => vee(0.7, 0.5)(-1).map(([x, y]) => [x, y + 0.5]), () => vee(0.7, 0.5)(1).map(([x, y]) => [x, y - 0.5])];
  if (pair("crescent", "crescent")) return [() => cup(0.45, -0.45)(1), () => cup(0.45, 0.45)(-1)];
  if (pair("circle", "circle")) return [ring(0.55), ring(0.3)];
  if (pair("triangle", "triangle"))
    return [() => polygon(3, 0.6), () => polygon(3, 0.6, Math.PI)];

  // a closed shape pierced by a line
  for (const shape in closed) {
    if (pair(shape, "line")) return order(shape, closedAt(shape, 0.55), () => bar(1));
  }
  // a ring with horns
  if (pair("crescent", "circle"))
    return order("crescent", () => cup(0.42, -0.62)(1), ring(0.42, 0.22));
  // one closed shape inscribed in another
  if (a in closed && b in closed) {
    return [closedAt(a, 0.6), closedAt(b, 0.6 * closed[a])];
  }
  return null;
};

/* ---------- layout ---------- */

// how much a mark draws the eye
const weight = {
  circle: 1,
  rectangle: 0.9,
  square: 0.85,
  triangle: 0.75,
  crescent: 0.55,
  zigzag: 0.45,
  chevron: 0.4,
  line: 0.25
};

const bounds = (parts) => {
  let top = Infinity,
    bottom = -Infinity,
    half = 0;
  parts.forEach((pts) =>
    pts.forEach(([x, y]) => {
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      half = Math.max(half, Math.abs(x));
    })
  );
  return { top, bottom, half };
};

// Stack slots along an axis. Returns where each one sits and how long
// the stack is. `sizes` are the mark sizes, `dirs` which way each points.
const stack = (slots, sizes, dirs, gaps) => {
  let cursor = 0;
  const placed = slots.map((slot, i) => {
    const parts = slot.marks.map((mark) =>
      mark(dirs[i]).map(([x, y]) => [x * sizes[i], y * sizes[i]])
    );
    const box = bounds(parts);
    const room = Math.max(box.bottom - box.top, sizes[i] * 0.3) + gaps[i];
    const centre = cursor + gaps[i] / 2 - box.top + (room - gaps[i] - (box.bottom - box.top)) / 2;
    cursor += room;
    return { slot, parts, centre, half: box.half, size: sizes[i] };
  });
  return { placed, length: cursor };
};

export default function stave(items, options = {}) {
  const on = { ...defaults, ...options };
  const rng = options.rng || Math.random;
  const pick = (list) => list[Math.floor(rng() * list.length)];

  /* 1. One slot per letter */
  let slots = items.map((item, index) => ({
    shapes: [item.shape],
    indexes: [index],
    marks: [(on.variants && variants[item.char]) || base[item.shape]],
    weight: weight[item.shape]
  }));

  /* 2. Fusion: neighbours combine */
  if (on.fusion) {
    const fused = [];
    for (let i = 0; i < slots.length; i++) {
      const a = slots[i],
        b = slots[i + 1];
      const marks = b && fuse(a.shapes[0], b.shapes[0]);
      if (marks) {
        fused.push({
          shapes: [a.shapes[0], b.shapes[0]],
          indexes: [a.indexes[0], b.indexes[0]],
          marks,
          weight: Math.min(1.4, a.weight + b.weight)
        });
        i++;
      } else {
        fused.push(a);
      }
    }
    slots = fused;
  }

  /* 3. Balance: heaviest at the focal point, lightest at the ends */
  const focalOf = (count) => Math.round((count - 1) * 0.382);
  if (on.balance) {
    const heavyFirst = [...slots].sort((a, b) => b.weight - a.weight);
    const focal = focalOf(slots.length);
    const ordered = new Array(slots.length);
    let below = focal,
      above = focal - 1;
    heavyFirst.forEach((slot, n) => {
      // alternate either side of the focal point, working outward
      const goBelow = (n % 2 === 0 && below < slots.length) || above < 0;
      if (goBelow) ordered[below++] = slot;
      else ordered[above--] = slot;
    });
    slots = ordered;
  }

  /* 4. Branching: the ends of the spine move onto mirrored arms */
  let upper = [],
    lower = [];
  if (on.branching && slots.length >= 4) {
    const each = slots.length >= 14 ? 3 : slots.length >= 9 ? 2 : 1;
    upper = slots.slice(0, each);
    slots = slots.slice(each);
    if (slots.length >= 5) {
      lower = slots.slice(-each).reverse();
      slots = slots.slice(0, -each);
    }
  }

  /* 5. The trunk */
  const focal = focalOf(slots.length);
  const emphasis = (slot) => (on.balance ? 0.85 + 0.25 * Math.min(1, slot.weight) : 1);
  let sizes = slots.map(
    (slot, i) => clamp(72 * Math.pow(0.74, Math.abs(i - focal)), 16, 72) * emphasis(slot)
  );
  const dirs = slots.map((_, i) => (i > focal ? 1 : -1));
  let gaps = slots.map((slot) => (on.balance ? 4 + 10 * slot.weight : 6));

  // scale everything together so the spine fills the ring without
  // outgrowing it
  const fit = Math.min(1.5, SPINE / stack(slots, sizes, dirs, gaps).length);
  sizes = sizes.map((s) => s * fit);
  gaps = gaps.map((g) => g * fit);
  const trunk = stack(slots, sizes, dirs, gaps);
  const top = C - trunk.length / 2;

  const targets = new Array(items.length);
  const extras = [];
  const mirrored = (pts) => pts.map(([x, y]) => [2 * C - x, y]);

  trunk.placed.forEach((mark, i) => {
    mark.y = top + mark.centre;
    mark.parts.forEach((pts, n) => {
      targets[mark.slot.indexes[n]] = {
        pts: resample(pts.map(([x, y]) => [C + x, mark.y + y])),
        width: i === focal ? 2.5 : 2
      };
    });
  });

  /* 6. The arms */
  const arm = (armSlots, fraction, direction) => {
    if (!armSlots.length) return;
    // leave the spine from the gap between two marks, clear of both
    const from = top + trunk.length * fraction;
    const nearby = trunk.placed.filter((m) => Math.abs(m.y - from) < m.size * 0.7 + 14);
    const clear = Math.max(12, ...nearby.map((m) => m.half * (direction[1] ? 0.8 : 1) + 10));

    // how far the arm can run before it leaves the ring
    const along = direction[1] * (from - C);
    const reach = -along + Math.sqrt(Math.max(0, along * along - (from - C) ** 2 + LIMIT ** 2));

    let armSizes = armSlots.map((_, i) => clamp(34 * fit * Math.pow(0.8, i), 14, 44));
    let armGaps = armSlots.map(() => 5);
    const armDirs = armSlots.map(() => 1);
    const squeeze = clamp(
      (reach - clear - 12) / stack(armSlots, armSizes, armDirs, armGaps).length,
      0.4,
      1
    );
    armSizes = armSizes.map((s) => s * squeeze);
    armGaps = armGaps.map((g) => g * squeeze);
    const hung = stack(armSlots, armSizes, armDirs, armGaps);
    const length = Math.min(reach, clear + hung.length + 8);

    // local y runs out along the arm
    const turn = Math.atan2(direction[1], direction[0]) - Math.PI / 2;
    const cos = Math.cos(turn),
      sin = Math.sin(turn);
    const out = ([x, y]) => [C + x * cos - y * sin, from + x * sin + y * cos];

    const line = resample([out([0, 0]), out([0, length])]);
    extras.push({ pts: line, width: 2 }, { pts: mirrored(line), width: 2 });
    if (on.ornament) {
      const tip = resample(ring(3)().map(([x, y]) => out([x, y + length + 3])));
      extras.push({ pts: tip, width: 1.5 }, { pts: mirrored(tip), width: 1.5 });
    }

    hung.placed.forEach((mark) => {
      mark.parts.forEach((pts, n) => {
        const placed = resample(pts.map(([x, y]) => out([x, y + clear + mark.centre])));
        targets[mark.slot.indexes[n]] = { pts: placed, width: 2 };
        extras.push({ pts: mirrored(placed), width: 2 });
      });
    });
  };

  const DIAGONAL = Math.SQRT1_2;
  const gapNear = (fraction) => {
    // the gap between marks closest to this point on the spine
    let best = fraction,
      distance = Infinity;
    trunk.placed.slice(0, -1).forEach((mark, i) => {
      const edge = (trunk.placed[i].centre + trunk.placed[i + 1].centre) / 2 / trunk.length;
      if (Math.abs(edge - fraction) < distance) {
        distance = Math.abs(edge - fraction);
        best = edge;
      }
    });
    return best;
  };
  arm(upper, gapNear(0.24), pick([[1, 0], [DIAGONAL, -DIAGONAL]]));
  arm(lower, gapNear(0.78), pick([[1, 0], [DIAGONAL, DIAGONAL]]));

  /* 7. Spine, terminals and ornament */
  const spineTop = top - 22,
    spineBottom = top + trunk.length + 22;
  const local = (pts, y) => resample(pts.map(([px, py]) => [C + px, y + py]));
  extras.push({ pts: local([[0, spineTop], [0, spineBottom]], 0), width: 2.5 });

  const heads = [
    () => [{ pts: ring(6)(), y: spineTop - 6, width: 1.5 }],
    () => [{ pts: vee(10, 10)(-1), y: spineTop, width: 2 }],
    () => [{ pts: polygon(4, 7), y: spineTop - 7, width: 1.5 }],
    () => [{ pts: cup(9, -9)(1), y: spineTop, width: 2 }]
  ];
  const feet = [
    () => [{ pts: bar(14), y: spineBottom, width: 2.5 }],
    () => [
      { pts: bar(14), y: spineBottom, width: 2.5 },
      { pts: bar(8), y: spineBottom - 7, width: 2 }
    ],
    () => [{ pts: ring(6)(), y: spineBottom + 6, width: 1.5 }],
    () => [{ pts: vee(10, 10)(-1), y: spineBottom, width: 2 }]
  ];
  const head = on.ornament ? pick(heads) : heads[0];
  const foot = on.ornament ? pick(feet) : feet[0];
  [...head(), ...foot()].forEach((part) =>
    extras.push({ pts: local(part.pts, part.y), width: part.width })
  );

  if (on.ornament) {
    // a second, finer outline round a closed focal mark
    const main = trunk.placed[focal];
    if (main && main.slot.shapes[0] in closed) {
      extras.push({
        pts: local(main.parts[0].map(([x, y]) => [x * 1.22, y * 1.22]), main.y),
        width: 1
      });
    }
    // pairs of dots beside the slimmer marks, where there is room
    let dots = 0;
    trunk.placed.forEach((mark, i) => {
      if (i === focal || dots >= 3 || mark.half > 34 || rng() < 0.4) return;
      const dot = ring(1.6)().map(([x, y]) => [x + mark.half + 12, y]);
      extras.push(
        { pts: local(dot, mark.y), width: 1.8 },
        { pts: mirrored(local(dot, mark.y)), width: 1.8 }
      );
      dots++;
    });
  }

  return { targets, extras };
}
