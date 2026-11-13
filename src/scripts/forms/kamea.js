import { C, segment, place, resample } from "../engine.js";

// KAMEA - the planetary square method.
//
// Principles: a hidden grid, a single unbroken line, and determinism.
// Each letter has a fixed home on a 5x5 magic square (the square of Mars),
// and the wish is drawn as one line running from home to home. A ring
// marks where it starts and a bar where it ends. The same wish always
// gives the same sigil. Round letters bow their stretch of the line so the
// figure isn't all straight edges.
const SQUARE = [
  [11, 24, 7, 20, 3],
  [4, 12, 25, 8, 16],
  [17, 5, 13, 21, 9],
  [10, 18, 1, 14, 22],
  [23, 6, 19, 2, 15]
];
const SPACING = 64;

const cells = {};
SQUARE.forEach((row, y) =>
  row.forEach((n, x) => {
    cells[n] = [C + (x - 2) * SPACING, C + (y - 2) * SPACING];
  })
);
const home = (char) => cells[((char.charCodeAt(0) - 97) % 25) + 1];

export default function kamea(items) {
  const homes = items.map((item) => home(item.char));
  const start = homes[0];

  const targets = items.map((item, i) => {
    if (i === 0) return { pts: place("circle", start[0], start[1], 9), width: 2 };
    const style =
      item.shape === "circle" || item.shape === "crescent" ? "crescent" : "line";
    return {
      pts: segment(style, homes[i - 1], homes[i], i % 2 ? 0.35 : -0.35),
      width: 2
    };
  });

  // the grid itself, barely there
  const extras = Object.values(cells).map(([x, y]) => ({
    pts: place("circle", x, y, 1.2),
    width: 1.5,
    ghost: true
  }));

  // the closing bar, square to the last stretch of line
  if (items.length > 1) {
    const end = homes[homes.length - 1],
      before = homes[homes.length - 2];
    const a = Math.atan2(end[1] - before[1], end[0] - before[0]) + Math.PI / 2;
    const dx = Math.cos(a) * 13,
      dy = Math.sin(a) * 13;
    extras.push({
      pts: resample([
        [end[0] - dx, end[1] - dy],
        [end[0] + dx, end[1] + dy]
      ]),
      width: 2.5
    });
  }

  return { targets, extras };
}
