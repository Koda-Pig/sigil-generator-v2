// Shared building blocks for the sigil animations.
//
// Everything that gets drawn is a "Stroke": a fixed-length list of points
// plus a position / rotation / scale. Because every stroke has the same
// number of points, any stroke can be morphed into any other by
// interpolating point-for-point - that's what lets a letter melt into a
// circle, a zigzag or a triangle.

export const SVG_NS = "http://www.w3.org/2000/svg";
export const SIZE = 482; // svg viewBox size
export const C = SIZE / 2; // centre of the stage
export const N = 96; // points per stroke

/* ---------- maths ---------- */

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const rand = (min, max) => min + Math.random() * (max - min);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export const easeInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
/* ---------- point lists ---------- */

// Resample a polyline to n points evenly spaced along its length
export const resample = (poly, n = N) => {
  const lengths = [0];
  for (let i = 1; i < poly.length; i++) {
    lengths.push(lengths[i - 1] + dist(poly[i - 1], poly[i]));
  }
  const total = lengths[lengths.length - 1] || 1;
  const out = [];
  let seg = 1;
  for (let i = 0; i < n; i++) {
    const target = (i / (n - 1)) * total;
    while (seg < poly.length - 1 && lengths[seg] < target) seg++;
    const span = lengths[seg] - lengths[seg - 1] || 1;
    const t = clamp((target - lengths[seg - 1]) / span, 0, 1);
    out.push([
      lerp(poly[seg - 1][0], poly[seg][0], t),
      lerp(poly[seg - 1][1], poly[seg][1], t)
    ]);
  }
  return out;
};

// Interpolate between two point lists. `wobble` adds a wave that peaks
// halfway through, so the shape looks liquid while it is in between forms.
export const morph = (from, to, t, wobble = 0, phase = 0) => {
  const amp = wobble * Math.sin(Math.PI * t);
  return from.map((p, i) => [
    lerp(p[0], to[i][0], t) + amp * Math.sin(i * 0.41 + phase),
    lerp(p[1], to[i][1], t) + amp * Math.cos(i * 0.33 + phase)
  ]);
};

export const arc = (cx, cy, r, from, to, steps = 48) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = lerp(from, to, i / steps);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

const deg = Math.PI / 180;

// The shapes each consonant maps to, as unit-sized point lists centred on 0,0
const shapeDefs = {
  line: [
    [-1, 0],
    [1, 0]
  ],
  chevron: [
    [-0.8, -0.5],
    [0, 0.5],
    [0.8, -0.5]
  ],
  zigzag: [
    [-1, 0],
    [-0.5, -0.4],
    [0, 0],
    [0.5, 0.4],
    [1, 0]
  ],
  triangle: [...arc(0, 0, 1, -90 * deg, 270 * deg, 3)],
  square: [...arc(0, 0, 1, -135 * deg, 225 * deg, 4)],
  rectangle: [
    [-0.9, -0.55],
    [0.9, -0.55],
    [0.9, 0.55],
    [-0.9, 0.55],
    [-0.9, -0.55]
  ],
  circle: arc(0, 0, 1, -90 * deg, 270 * deg, 72),
  crescent: [
    ...arc(0.2, 0, 1, 50 * deg, 310 * deg),
    ...arc(0.7, 0, 0.779, 280.6 * deg, 79.4 * deg),
    [0.2 + Math.cos(50 * deg), Math.sin(50 * deg)]
  ]
};

export const shapes = Object.fromEntries(
  Object.entries(shapeDefs).map(([name, poly]) => [name, resample(poly)])
);

// A unit shape moved, scaled and turned into place on the stage
export const place = (shape, x, y, scale, rot = 0) => {
  const cos = Math.cos(rot) * scale,
    sin = Math.sin(rot) * scale;
  return shapes[shape].map(([px, py]) => [
    x + px * cos - py * sin,
    y + px * sin + py * cos
  ]);
};

/* ---------- drawing ---------- */

export class Stroke {
  constructor(parent, pts, props = {}) {
    this.pts = pts;
    this.x = 0;
    this.y = 0;
    this.rot = 0;
    this.scale = 1;
    this.opacity = 1;
    this.reveal = 1; // 0..1, how much of the stroke is drawn
    this.width = 2;
    Object.assign(this, props);
    this.el = document.createElementNS(SVG_NS, "path");
    this.el.classList.add("stroke");
    parent.appendChild(this.el);
    this.render();
  }

  // Points in stage coordinates
  world() {
    const cos = Math.cos(this.rot) * this.scale,
      sin = Math.sin(this.rot) * this.scale;
    return this.pts.map(([px, py]) => [
      this.x + px * cos - py * sin,
      this.y + px * sin + py * cos
    ]);
  }

  // Flatten the transform into the points, so the stroke can be morphed
  // directly in stage coordinates
  bake() {
    this.pts = this.world();
    this.x = this.y = this.rot = 0;
    this.scale = 1;
    return this.pts;
  }

  render() {
    const pts = this.world();
    const count = Math.round(this.reveal * pts.length);
    if (count < 2 || this.opacity <= 0) {
      this.el.setAttribute("d", "");
      return;
    }
    let d = "";
    for (let i = 0; i < count; i++) {
      d += (i ? "L" : "M") + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1);
    }
    this.el.setAttribute("d", d);
    this.el.setAttribute("opacity", this.opacity);
    this.el.style.strokeWidth = this.width;
  }

  remove() {
    this.el.remove();
  }
}

/* ---------- time ---------- */

// Promise based timing, so animations read top to bottom as
// "do this, then await that" instead of juggling setTimeout durations.
// Once the signal aborts (reset / new wish) these promises simply never
// settle, so whatever was awaiting them stops where it is. The stage is
// wiped on reset, so there is nothing left for it to clean up.
export const createTimeline = (signal) => {
  const sleep = (ms) =>
    new Promise((resolve) => {
      if (signal.aborted) return;
      const id = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => clearTimeout(id), { once: true });
    });

  // Calls fn(t) every frame with t going 0 -> 1 over `ms`
  const tween = (ms, fn) =>
    new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        if (signal.aborted) return;
        const t = clamp((now - start) / ms, 0, 1);
        fn(t);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });

  return { sleep, tween, signal };
};

/* ---------- effects ---------- */

// Morph a stroke from wherever it is now into its place in the finished
// sigil, curling around the centre on the way.
export const settle = (stroke, target, tl, options = {}) => {
  const { duration = 1900, curl = 0, wobble = 9 } = options;
  const from = stroke.bake();
  const fromWidth = stroke.width;
  const toWidth = target.width || 2;
  const phase = rand(0, 6);

  return tl.tween(duration, (t) => {
    const e = easeInOut(t);
    const turn = Math.sin(Math.PI * e) * curl;
    const cos = Math.cos(turn),
      sin = Math.sin(turn);
    stroke.pts = morph(from, target.pts, e, wobble, phase).map(([x, y]) => [
      C + (x - C) * cos - (y - C) * sin,
      C + (x - C) * sin + (y - C) * cos
    ]);
    stroke.width = lerp(fromWidth, toWidth, e);
    stroke.render();
  });
};

// Crumble a stroke into dust that drifts away from the centre.
// Used for vowels, which never make it into a sigil.
export const dust = (layer, stroke, tl, duration = 1300) => {
  const motes = stroke
    .world()
    .filter((_, i) => i % 3 === 0)
    .map(([x, y]) => {
      const el = document.createElementNS(SVG_NS, "circle");
      el.classList.add("mote");
      el.setAttribute("r", rand(0.6, 1.6));
      layer.appendChild(el);
      const away = Math.atan2(y - C, x - C) + rand(-0.9, 0.9);
      const speed = rand(15, 70);
      return {
        el,
        x,
        y,
        vx: Math.cos(away) * speed,
        vy: Math.sin(away) * speed + rand(0, 25),
        delay: rand(0, 0.35)
      };
    });
  stroke.remove();

  return tl
    .tween(duration, (t) => {
      motes.forEach((m) => {
        const local = clamp((t - m.delay) / (1 - m.delay), 0, 1);
        const e = easeOut(local);
        m.el.setAttribute("cx", m.x + m.vx * e);
        m.el.setAttribute("cy", m.y + m.vy * e);
        m.el.setAttribute("opacity", 1 - local);
      });
    })
    .then(() => motes.forEach((m) => m.el.remove()));
};
