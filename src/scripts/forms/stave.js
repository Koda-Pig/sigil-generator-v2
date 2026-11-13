import { C, arc, place, resample, clamp } from "../engine.js";

// STAVE - a bindrune.
//
// Principles: one dominant axis, strict mirror symmetry across it, and a
// clear focal point. Every letter becomes a mark hung on a vertical spine.
// The focal mark sits at the golden section of the spine and is the
// largest; marks shrink the further they are from it, and directional
// marks (chevrons, cups, triangles) point away from it.
const marks = {
  line: (y, s) => [
    [C - s * 0.8, y],
    [C + s * 0.8, y]
  ],
  chevron: (y, s, dir) => [
    [C - s * 0.8, y + dir * s * 0.6],
    [C, y],
    [C + s * 0.8, y + dir * s * 0.6]
  ],
  zigzag: (y, s, dir) => [
    [C - s * 0.9, y],
    [C - s * 0.45, y + dir * s * 0.4],
    [C, y],
    [C + s * 0.45, y + dir * s * 0.4],
    [C + s * 0.9, y]
  ],
  crescent: (y, s, dir) => arc(C, y, s * 0.6, 0, Math.PI * dir),
  triangle: (y, s, dir) => place("triangle", C, y, s * 0.6, dir < 0 ? 0 : Math.PI),
  square: (y, s) => place("square", C, y, s * 0.55, Math.PI / 4),
  rectangle: (y, s) => place("rectangle", C, y, s * 0.75),
  circle: (y, s) => place("circle", C, y, s * 0.5)
};

// how much of the spine a mark takes up, relative to its size
const room = { line: 0.4, chevron: 0.7, zigzag: 0.55, crescent: 0.75 };

export default function stave(items) {
  const focal = Math.round((items.length - 1) * 0.382);
  let sizes = items.map((_, i) =>
    clamp(72 * Math.pow(0.74, Math.abs(i - focal)), 16, 72)
  );
  let rooms = items.map((item, i) => sizes[i] * (room[item.shape] || 1.05));

  // scale everything together so the spine fills the ring without
  // outgrowing it
  const fit = Math.min(1.5, 290 / rooms.reduce((a, b) => a + b, 0));
  sizes = sizes.map((s) => s * fit);
  rooms = rooms.map((r) => r * fit);
  const total = rooms.reduce((a, b) => a + b, 0);

  let y = C - total / 2;
  const targets = items.map((item, i) => {
    const centre = y + rooms[i] / 2;
    y += rooms[i];
    const dir = i > focal ? 1 : -1;
    return {
      pts: resample(marks[item.shape](centre, sizes[i], dir)),
      width: i === focal ? 2.5 : 2
    };
  });

  const top = C - total / 2 - 22,
    bottom = C + total / 2 + 22;
  const extras = [
    { pts: resample([[C, top], [C, bottom]]), width: 2.5 },
    { pts: place("circle", C, top - 6, 6), width: 1.5 },
    { pts: resample([[C - 14, bottom], [C + 14, bottom]]), width: 2.5 }
  ];

  return { targets, extras };
}
