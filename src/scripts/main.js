import "../styles/style.scss";
import { SIZE, Stroke, createTimeline, easeInOut } from "./engine.js";
import { glyph } from "./glyphs.js";
import metamorphosis from "./variations/metamorphosis.js";
import stave, { defaults } from "./forms/stave.js";

const form = document.querySelector("#wish-form"),
  txtInput = form.querySelector(".input"),
  submitBtn = form.querySelector("button[type='submit']"),
  resetBtn = form.querySelector("button[type='reset']"),
  result = document.querySelector(".result"),
  svg = result.querySelector("#svg"),
  toggles = document.querySelectorAll(".options input");

let letterNodes = null,
  validInput = false,
  animationDuration = 1000,
  controller = null; // aborts whichever animation is currently running

const alphabet = {
  a: null,
  b: "circle",
  c: "crescent",
  d: "circle",
  e: null,
  f: "rectangle",
  g: "circle",
  h: "rectangle",
  i: null,
  j: "line",
  k: "line",
  l: "line",
  m: "triangle",
  n: "zigzag",
  o: null,
  p: "circle",
  q: "circle",
  r: "square",
  s: "crescent",
  t: "line",
  u: null,
  v: "chevron",
  w: "chevron",
  x: "line",
  y: "line",
  z: "zigzag"
};

const vowels = ["a", "e", "i", "o", "u"];

// The switches under the form. Each one turns a rule of the stave on or
// off (see forms/stave.js), apart from:
// - ink: draws the lines as if by hand
// - repeatable: the same wish always gives the same sigil
const options = { ...defaults, ink: true, repeatable: true };

const loadOptions = () => {
  try {
    Object.assign(options, JSON.parse(localStorage.getItem("sigil-options")));
  } catch {
    // no saved options, or storage unavailable - keep the defaults
  }
  toggles.forEach((toggle) => (toggle.checked = !!options[toggle.name]));
  result.classList.toggle("ink", options.ink);
};

const handleToggle = (e) => {
  options[e.target.name] = e.target.checked;
  try {
    localStorage.setItem("sigil-options", JSON.stringify(options));
  } catch {
    // storage unavailable - the choice just won't be remembered
  }
  result.classList.toggle("ink", options.ink);
  // redraw the current wish so the difference can be seen straight away
  if (validInput) submitBtn.click();
};

// Random numbers that are the same every time for the same seed, so a
// wish can always give the same sigil
const seeded = (text) => {
  let a = 2166136261;
  for (const char of text) a = Math.imul(a ^ char.charCodeAt(0), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const setTransitionTime = () => {
  const computedStyle = window.getComputedStyle(result);
  animationDuration =
    parseFloat(computedStyle.getPropertyValue("animation-duration")) * 1000;
};

const validateInput = (e) => {
  const value = e.target.value.trim();
  validInput = e.target.validity.valid;
  if (value.length < 1) validInput = false;

  if (validInput) submitBtn.removeAttribute("disabled");
  else submitBtn.setAttribute("disabled", "");
};

// Pulse the background of the ring once
const ripple = async (tl) => {
  result.classList.remove("animate");
  void result.offsetWidth; // restart the css animation
  result.classList.add("animate");
  await tl.sleep(animationDuration);
  result.classList.remove("animate");
};

const handleFormSubmit = async (e) => {
  e.preventDefault();

  // reset
  reset({ disableSubmit: false });

  // input validation is handled in validateInput function
  // so this alert should only show if user removes disabled
  // attribute from submit button by editing the HTML
  if (!validInput) {
    alert("Add your wish to the text input you tonsil");
    return;
  }

  controller = new AbortController();
  const tl = createTimeline(controller.signal);

  // Light up the letters of the wish
  const letters = processInput(txtInput.value.toLowerCase()).map(measure);
  letters.forEach((letter) => letter.node.classList.add("show"));

  const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(layer);

  // Swap a letter on the ring for a drawn copy that can be animated
  const spawn = (letter) => {
    letter.node.classList.add("taken");
    return new Stroke(layer, glyph(letter.char), {
      x: letter.x,
      y: letter.y,
      rot: letter.angle,
      scale: letter.scale
    });
  };

  // Draw the parts of the sigil that don't come from a letter
  // (spines, borders, terminals...) once the letters have landed
  const finish = async (extras) => {
    const strokes = extras.map((extra) => {
      const stroke = new Stroke(layer, extra.pts, {
        width: extra.width || 2,
        reveal: 0
      });
      return stroke;
    });
    await Promise.all(
      strokes.map(async (stroke, i) => {
        await tl.sleep(Math.min(i * 60, 400));
        await tl.tween(550, (t) => {
          stroke.reveal = easeInOut(t);
          stroke.render();
        });
      })
    );
  };

  // If a reset or a new wish interrupts, the timeline stops resolving and
  // this function just never continues past the await it was on
  result.classList.add("animate");
  await tl.sleep(animationDuration * 0.6);
  result.classList.add("dim-rest");

  // The letters melt into their marks (variations/metamorphosis.js), laid
  // out by the rules of the stave (forms/stave.js)
  const rng = options.repeatable
    ? seeded(letters.map((letter) => letter.char).join(""))
    : Math.random;
  const compose = (items) => stave(items, { ...options, rng });
  await metamorphosis({ layer, letters, tl, spawn, compose, finish });
  await ripple(tl);
};

// Remove duplicates and spaces, keeping the order the letters appear in
const processInput = (input) => {
  const unique = [];
  for (const character of input) {
    if (character in alphabet && !unique.includes(character)) {
      unique.push(character);
    }
  }
  return unique;
};

// Where a letter sits on the ring, in svg coordinates
const measure = (char) => {
  const node = [...letterNodes].find((n) => n.innerText === char);
  const stage = svg.getBoundingClientRect();
  const box = node.getBoundingClientRect();
  const k = SIZE / stage.width;
  const x = (box.left + box.width / 2 - stage.left) * k;
  const y = (box.top + box.height / 2 - stage.top) * k;
  return {
    char,
    node,
    shape: alphabet[char],
    x,
    y,
    angle: Math.atan2(x - SIZE / 2, -(y - SIZE / 2)),
    scale: parseFloat(getComputedStyle(node).fontSize) * 1.25 * k
  };
};

const mapAlphabet = () => {
  Object.keys(alphabet).forEach((letter) => {
    const letterNode = document.createElement("p");
    letterNode.classList.add("letter");
    letterNode.innerText = letter;
    // add vowel class if it's a vowel
    if (vowels.includes(letter)) letterNode.classList.add("vowel");
    result.appendChild(letterNode);
  });

  letterNodes = result.querySelectorAll(".letter");
};

const reset = ({ disableSubmit = true }) => {
  controller?.abort();
  if (disableSubmit) submitBtn.setAttribute("disabled", "");
  result.classList.remove("animate", "dim-rest");
  result
    .querySelectorAll(".letter")
    .forEach((el) => el.classList.remove("show", "taken"));
  svg.innerHTML = "";
};

const restoreInputFocus = (e) => {
  const node = e.target.nodeName;
  if (node === "BUTTON" || node === "INPUT") return;

  // restore focus to text input
  txtInput.focus();
};

setTransitionTime();
mapAlphabet();
loadOptions();
txtInput.focus();

txtInput.addEventListener("input", (e) => validateInput(e));
submitBtn.addEventListener("click", (e) => handleFormSubmit(e));
resetBtn.addEventListener("click", reset);
toggles.forEach((toggle) => toggle.addEventListener("change", handleToggle));
document.body.addEventListener("click", restoreInputFocus);
