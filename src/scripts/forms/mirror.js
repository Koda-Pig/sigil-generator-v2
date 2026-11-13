import { C, segment, resample, pick } from "../engine.js";

// MIRROR - a grown, symmetrical seal.
//
// Principles: bilateral symmetry, a limited set of angles, alignment to a
// hidden lattice, and connectedness. A trunk runs down the middle. Each
// letter grows one branch from a point that already exists to a
// neighbouring lattice point, so every stroke is attached to another and
// only ever runs at 0, 45 or 90 degrees. The letter's shape decides what
// kind of branch it is (bare, bowed, jagged, crossed, or ending in a ring,
// arrow, triangle or diamond). Everything is then reflected across the
// trunk.
const STEP = 55;
const LIMIT = 185;

const at = ([ix, iy]) => [C + ix * STEP, C + iy * STEP];
const key = ([ix, iy]) => `${ix},${iy}`;
const mirrored = (pts) => pts.map(([x, y]) => [2 * C - x, y]);

// a line from a to b that ends in a small polygon centred on b
const ending = (a, b, sides, r) => {
  const back = Math.atan2(a[1] - b[1], a[0] - b[0]);
  const pts = [a];
  for (let i = 0; i <= sides; i++) {
    const angle = back + (i / sides) * Math.PI * 2;
    pts.push([b[0] + Math.cos(angle) * r, b[1] + Math.sin(angle) * r]);
  }
  return pts;
};

const branch = (shape, a, b) => {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    len = Math.hypot(dx, dy),
    ux = dx / len,
    uy = dy / len;
  switch (shape) {
    case "circle":
      return ending(a, b, 24, 9);
    case "triangle":
      return ending(a, b, 3, 11);
    case "square":
      return ending(a, b, 4, 10);
    case "chevron": {
      // arrowhead
      const tail = [b[0] - ux * 14, b[1] - uy * 14];
      return [
        a,
        b,
        [tail[0] - uy * 9, tail[1] + ux * 9],
        b,
        [tail[0] + uy * 9, tail[1] - ux * 9]
      ];
    }
    case "rectangle": {
      // crossbar
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      return [
        a,
        mid,
        [mid[0] - uy * 11, mid[1] + ux * 11],
        [mid[0] + uy * 11, mid[1] - ux * 11],
        mid,
        b
      ];
    }
    case "crescent":
      return segment("crescent", a, b, pick([-1, 1]));
    case "zigzag":
      return segment("zigzag", a, b, 1);
    default:
      return [a, b];
  }
};

export default function mirror(items) {
  // lattice points that already have something attached, starting with
  // the trunk. Only the right half is grown; the left is its reflection.
  const nodes = [-2, -1, 0, 1, 2].map((iy) => ({ cell: [0, iy], children: 0 }));
  const taken = new Set(nodes.map((n) => key(n.cell)));

  const inside = (cell) => {
    const [x, y] = at(cell);
    return cell[0] >= 1 && Math.hypot(x - C, y - C) < LIMIT;
  };

  const targets = [];
  const extras = [
    {
      pts: resample([
        [C, C - STEP * 2.5],
        [C, C + STEP * 2.5]
      ]),
      width: 2.5
    }
  ];

  items.forEach((item) => {
    // every way a new branch could grow from what exists so far
    const options = [];
    nodes.forEach((node) => {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (!dx && !dy) continue;
          const cell = [node.cell[0] + dx, node.cell[1] + dy];
          if (inside(cell)) options.push({ node, cell, free: !taken.has(key(cell)) });
        }
      }
    });

    // prefer reaching somewhere new, from the least crowded point
    let pool = options.filter((o) => o.free);
    if (!pool.length) pool = options;
    const fewest = Math.min(...pool.map((o) => o.node.children));
    const { node, cell } = pick(pool.filter((o) => o.node.children === fewest));

    node.children++;
    if (!taken.has(key(cell))) {
      taken.add(key(cell));
      nodes.push({ cell, children: 0 });
    }

    const pts = resample(branch(item.shape, at(node.cell), at(cell)));
    targets.push({ pts, width: 2 });
    extras.push({ pts: mirrored(pts), width: 2 });
  });

  return { targets, extras };
}
