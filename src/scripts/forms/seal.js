import { C, arc, place, polar, resample, pick } from "../engine.js";

// SEAL - a circular talisman.
//
// Principles: containment, concentric structure and radial balance.
// Closed shapes are nested, each inscribed exactly inside the one before
// it, so every corner touches its parent. Open shapes become radial marks
// spaced evenly round the band between the nest and the border; if there
// are too few to balance on their own they are repeated in rotational
// symmetry.
const R = 190;
// how far in the next shape must sit to be inscribed in this one
const inradius = { circle: 0.78, triangle: 0.5, square: 0.7071, rectangle: 0.52 };
const rectCorner = Math.hypot(0.9, 0.55);

const mark = (shape, a, inner, outer, span) => {
  switch (shape) {
    case "chevron": {
      // an arrow pointing out at the border
      const len = Math.min(30, (outer - inner) * 0.5);
      const spread = (len * 0.65) / outer;
      return [
        polar(inner, a),
        polar(outer, a),
        polar(outer - len, a - spread),
        polar(outer, a),
        polar(outer - len, a + spread)
      ];
    }
    case "zigzag": {
      const steps = 6;
      return Array.from({ length: steps + 1 }, (_, i) => {
        const r = inner + ((outer - inner) * i) / steps;
        const side = i === 0 || i === steps ? 0 : i % 2 ? 1 : -1;
        return polar(r, a + (side * 7) / r);
      });
    }
    case "crescent": {
      // a petal: an arc across the band
      const mid = (inner + outer) / 2;
      return arc(C, C, mid, a - span - Math.PI / 2, a + span - Math.PI / 2, 32);
    }
    default:
      return [polar(inner, a), polar(outer, a)];
  }
};

export default function seal(items) {
  const targets = new Array(items.length);
  const extras = [
    { pts: place("circle", C, C, R), width: 2.5 },
    { pts: place("circle", C, C, R - 7), width: 1 }
  ];

  const closed = [],
    open = [];
  items.forEach((item, i) => (item.shape in inradius ? closed : open).push(i));

  // The nest
  let radii = [];
  let r = open.length ? 112 : 150;
  closed.forEach((i) => {
    radii.push(r);
    r *= inradius[items[i].shape];
  });
  const smallest = radii[radii.length - 1];
  if (smallest < 14) {
    // too deep to see - compress the nest, keeping its proportions
    const power = Math.log(14 / radii[0]) / Math.log(smallest / radii[0]);
    radii = radii.map((v) => radii[0] * Math.pow(v / radii[0], power));
  }
  const turns = { triangle: 0, square: 0 };
  closed.forEach((i, n) => {
    const shape = items[i].shape;
    let pts;
    if (shape === "triangle") {
      pts = place(shape, C, C, radii[n], turns.triangle++ % 2 ? Math.PI : 0);
    } else if (shape === "square") {
      pts = place(shape, C, C, radii[n], turns.square++ % 2 ? Math.PI / 4 : 0);
    } else if (shape === "rectangle") {
      pts = place(shape, C, C, radii[n] / rectCorner);
    } else {
      pts = place(shape, C, C, radii[n]);
    }
    targets[i] = { pts, width: n === 0 ? 2.5 : 2 };
  });

  // The band of radial marks
  const inner = closed.length ? radii[0] : 30;
  const outer = R - 7;
  if (!closed.length) extras.push({ pts: place("circle", C, C, 14), width: 2 });

  const fold = open.length >= 3 ? 1 : pick([3, 4, 6]);
  const slots = open.length * fold;
  const start = pick([0, Math.PI / slots]);
  open.forEach((i, n) => {
    for (let copy = 0; copy < fold; copy++) {
      const a = start + ((n + copy * open.length) / slots) * Math.PI * 2;
      const stroke = {
        pts: resample(
          mark(items[i].shape, a, inner, outer, (Math.PI / slots) * 0.8)
        ),
        width: 2
      };
      if (copy === 0) targets[i] = stroke;
      else extras.push(stroke);
    }
  });

  return { targets, extras };
}
