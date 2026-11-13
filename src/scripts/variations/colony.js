import {
  C,
  SVG_NS,
  shapes,
  morph,
  dust,
  polar,
  toPolar,
  lerp,
  clamp,
  rand,
  pick,
  snap,
  easeInOut
} from "../engine.js";

// A cellular automaton in the spirit of Conway's Game of Life, except the
// cells are letters and instead of living or dying they change shape.
//
// Each generation every free cell drifts toward the centre (and toward its
// nearest neighbour), then all cells look at how many neighbours they have
// and react at the same time:
//
//   0 neighbours  starve    - shrink, and become a simpler shape
//   1 neighbour   bond      - combine with that neighbour (see `bond`)
//   2-3           thrive    - grow, and become a more complex shape
//   4+            overcrowd - flip to the opposite shape and get thrown out
//
// "Simpler" and "more complex" are steps along this ladder:
const LADDER = [
  "line",
  "chevron",
  "zigzag",
  "crescent",
  "triangle",
  "square",
  "rectangle",
  "circle"
];
const isOpen = (cell) => cell.rung < 4; // open strokes vs closed outlines

const GENERATIONS = 4;
const NEIGHBOURHOOD = 80;
const TINT = {
  starve: "#6b6b7a",
  bond: "#8fd0ff",
  thrive: "#3c80e0",
  overcrowd: "#e0703c"
};

export default async function colony({ layer, letters, tl, spawn }) {
  const vowels = letters.filter((l) => !l.shape);
  const consonants = letters.filter((l) => l.shape);

  const crumbling = vowels.map((l) => dust(layer, spawn(l), tl));

  const links = document.createElementNS(SVG_NS, "g");
  layer.prepend(links);

  const cells = consonants.map((letter) => {
    const stroke = spawn(letter);
    return {
      stroke,
      rung: LADDER.indexOf(letter.shape),
      x: stroke.x,
      y: stroke.y,
      rot: stroke.rot,
      size: stroke.scale,
      host: null, // set once this cell has bonded onto another
      rel: null, // position within the host: { x, y, rot, size }
      goal: null // values being animated toward
    };
  });

  /* ----- helpers ----- */

  // Work out where a cell is on the stage. Bonded cells are positioned
  // relative to their host, so they follow it wherever it goes.
  const place = (cell) => {
    if (cell.host) {
      const h = cell.host;
      place(h);
      const cos = Math.cos(h.rot) * h.size,
        sin = Math.sin(h.rot) * h.size;
      cell.x = h.x + cell.rel.x * cos - cell.rel.y * sin;
      cell.y = h.y + cell.rel.x * sin + cell.rel.y * cos;
      cell.rot = h.rot + cell.rel.rot;
      cell.size = h.size * cell.rel.size;
    }
    Object.assign(cell.stroke, {
      x: cell.x,
      y: cell.y,
      rot: cell.rot,
      scale: cell.size
    });
  };

  // Animate every cell toward its `goal`, then clear the goals
  const run = async (ms) => {
    const moving = cells.filter((c) => c.goal);
    moving.forEach((c) => {
      const target = c.host ? c.rel : c;
      c.anim = {
        target,
        from: { ...target },
        to: c.goal,
        pts: c.stroke.pts,
        toPts: c.goal.rung === undefined ? null : shapes[LADDER[c.goal.rung]],
        phase: rand(0, 6)
      };
      if (c.goal.rung !== undefined) c.rung = c.goal.rung;
      c.goal = null;
    });

    await tl.tween(ms, (t) => {
      const e = easeInOut(t);
      moving.forEach(({ anim, stroke }) => {
        ["x", "y", "rot", "size"].forEach((key) => {
          if (anim.to[key] !== undefined)
            anim.target[key] = lerp(anim.from[key], anim.to[key], e);
        });
        if (anim.toPts) stroke.pts = morph(anim.pts, anim.toPts, e, 0.1, anim.phase);
      });
      cells.forEach(place);
      cells.forEach((c) => c.stroke.render());
    });
  };

  const tint = (cell, rule) => {
    cell.stroke.el.style.stroke = TINT[rule];
  };
  const clearTints = () =>
    cells.forEach((c) => (c.stroke.el.style.stroke = ""));

  // Two cells meeting one-on-one combine. How depends on what they are:
  //   same shape      -> the guest becomes a smaller echo inside the host
  //   open + closed   -> a line pierces the outline, anything else crowns it
  //   closed + closed -> the smaller nests inside the larger
  //   open + open     -> they cross each other
  const bond = (a, b) => {
    let host = b,
      guest = a,
      rel;

    if (a.rung === b.rung) {
      rel = { x: 0, y: 0, rot: Math.PI / LADDER.length + a.rung, size: 0.6 };
    } else if (isOpen(a) !== isOpen(b)) {
      [host, guest] = isOpen(a) ? [b, a] : [a, b];
      rel =
        guest.rung === 0
          ? { x: 0, y: 0, rot: snap(rand(0, Math.PI), Math.PI / 4), size: 1.45 }
          : { x: 0, y: -1.2, rot: 0, size: 0.45 };
    } else if (!isOpen(a)) {
      [host, guest] = a.size > b.size ? [a, b] : [b, a];
      rel = { x: 0, y: 0, rot: pick([0, Math.PI / 4]), size: 0.55 };
    } else {
      rel = { x: 0, y: 0, rot: Math.PI / 2, size: 1 };
    }

    // Express the guest's current spot relative to the host, so it can
    // glide from where it is now into its place
    const dx = (guest.x - host.x) / host.size,
      dy = (guest.y - host.y) / host.size,
      cos = Math.cos(-host.rot),
      sin = Math.sin(-host.rot);
    guest.host = host;
    guest.rel = {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
      rot: guest.rot - host.rot,
      size: guest.size / host.size
    };
    guest.goal = rel;
    host.goal = { ...host.goal, size: clamp(host.size * 1.2, 12, 60) };
    tint(guest, "bond");
    tint(host, "bond");
  };

  const free = () => cells.filter((c) => !c.host);

  /* ----- the simulation ----- */

  // Letters settle into their starting shapes
  cells.forEach((c) => (c.goal = { rung: c.rung, size: 18 }));
  await run(700);

  const swirl = pick([-1, 1]) * rand(0.35, 0.7);

  for (let gen = 0; gen < GENERATIONS; gen++) {
    // 1. Drift: inward, around, and toward the nearest neighbour
    free().forEach((cell) => {
      const p = toPolar(cell.x, cell.y);
      let [x, y] = polar(clamp(p.r * 0.66, 0, 215), p.a + swirl);
      const nearest = free()
        .filter((o) => o !== cell)
        .sort(
          (m, n) =>
            Math.hypot(m.x - cell.x, m.y - cell.y) -
            Math.hypot(n.x - cell.x, n.y - cell.y)
        )[0];
      if (nearest) {
        x += (nearest.x - cell.x) * 0.2;
        y += (nearest.y - cell.y) * 0.2;
      }
      cell.goal = { x: x + rand(-8, 8), y: y + rand(-8, 8), rot: cell.rot + swirl };
    });
    await run(520);

    // 2. Count neighbours. Everyone is counted before anyone reacts.
    const population = free();
    const neighbours = new Map(
      population.map((cell) => [
        cell,
        population.filter(
          (o) =>
            o !== cell &&
            Math.hypot(o.x - cell.x, o.y - cell.y) < NEIGHBOURHOOD
        )
      ])
    );

    // Briefly show who can see who
    links.innerHTML = "";
    neighbours.forEach((others, cell) =>
      others.forEach((o) => {
        const line = document.createElementNS(SVG_NS, "line");
        line.classList.add("link");
        line.setAttribute("x1", cell.x);
        line.setAttribute("y1", cell.y);
        line.setAttribute("x2", o.x);
        line.setAttribute("y2", o.y);
        links.appendChild(line);
      })
    );

    // 3. React
    const bonded = new Set();
    population.forEach((cell) => {
      if (bonded.has(cell)) return;
      const others = neighbours.get(cell);
      const count = others.length;

      if (count === 0) {
        cell.goal = {
          rung: Math.max(0, cell.rung - 1),
          size: clamp(cell.size * 0.85, 12, 60)
        };
        tint(cell, "starve");
      } else if (count === 1) {
        if (bonded.has(others[0])) return;
        bond(cell, others[0]);
        bonded.add(cell).add(others[0]);
      } else if (count <= 3) {
        cell.goal = {
          ...cell.goal,
          rung: Math.min(LADDER.length - 1, cell.rung + 1),
          size: clamp(cell.size * 1.25, 12, 60)
        };
        tint(cell, "thrive");
      } else {
        const p = toPolar(cell.x, cell.y);
        const [x, y] = polar(clamp(p.r * 1.35 + 20, 0, 215), p.a);
        cell.goal = { rung: LADDER.length - 1 - cell.rung, x, y };
        tint(cell, "overcrowd");
      }
    });

    await tl.sleep(220);
    await run(480);
    links.innerHTML = "";
    clearTints();
  }

  // Finally the survivors gather: the largest in the middle, the rest in
  // orbit around it, facing outward
  const survivors = free().sort((a, b) => b.size - a.size);
  const [core, ...orbit] = survivors;
  if (core) {
    const coreSize = orbit.length ? clamp(core.size * 1.8, 60, 100) : 120;
    core.goal = { x: C, y: C, size: coreSize, rot: snap(core.rot, Math.PI / 4) };
    const spin = rand(0, Math.PI * 2);
    orbit.forEach((cell, i) => {
      const size = clamp(cell.size, 22, 38);
      const angle = spin + (i / orbit.length) * Math.PI * 2;
      const [x, y] = polar(Math.min(coreSize + size + 18, 170), angle);
      cell.goal = { x, y, size, rot: angle };
    });
    await run(1100);
  }

  await Promise.all(crumbling);
}
