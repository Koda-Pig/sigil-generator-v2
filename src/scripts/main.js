import "../styles/style.scss";
import { SIZE, Stroke, createTimeline, pick, easeInOut } from "./engine.js";
import { glyph } from "./glyphs.js";
import classic from "./variations/classic.js";
import metamorphosis from "./variations/metamorphosis.js";
import wheel from "./variations/wheel.js";
import colony from "./variations/colony.js";
import stave from "./forms/stave.js";
import seal from "./forms/seal.js";
import kamea from "./forms/kamea.js";
import mirror from "./forms/mirror.js";

const form = document.querySelector("#wish-form"),
  txtInput = form.querySelector(".input"),
  submitBtn = form.querySelector("button[type='submit']"),
  resetBtn = form.querySelector("button[type='reset']"),
  result = document.querySelector(".result"),
  svg = result.querySelector("#svg"),
  variationPicker = document.querySelector("#journey"),
  formPicker = document.querySelector("#form"),
  nowPlaying = document.querySelector(".now-playing");

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

// A sigil is made in two halves, picked separately:
// - the journey: how the letters get from the ring to the sigil
// - the form: the set of design rules that decides what the sigil looks like
// "random" picks a new one on every wish.
const journeys = { metamorphosis, wheel, colony, classic };
const forms = { stave, seal, kamea, mirror };

const choose = (picker, options) => {
  const chosen = picker.querySelector("input:checked").value;
  return chosen === "random" ? pick(options) : chosen;
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

  const journey = choose(variationPicker, ["metamorphosis", "wheel", "colony"]);
  const form = choose(formPicker, Object.keys(forms));
  nowPlaying.textContent =
    journey === "classic" ? "classic" : `${journey} \u2192 ${form}`;

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
      if (extra.ghost) stroke.el.classList.add("ghost");
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
  if (journey !== "classic") {
    await tl.sleep(animationDuration * 0.6);
    result.classList.add("dim-rest");
  }
  await journeys[journey]({
    layer,
    letters,
    tl,
    spawn,
    compose: forms[form],
    finish,
    result,
    duration: animationDuration
  });
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
  result.classList.remove("slide-inward", "animate", "classic", "dim-rest");
  result
    .querySelectorAll(".letter")
    .forEach((el) => el.classList.remove("show", "taken"));
  svg.innerHTML = "";
  nowPlaying.textContent = "";
};

const restoreInputFocus = (e) => {
  const node = e.target.nodeName;
  if (node === "BUTTON" || node === "INPUT") return;

  // restore focus to text input
  txtInput.focus();
};

setTransitionTime();
mapAlphabet();
txtInput.focus();

txtInput.addEventListener("input", (e) => validateInput(e));
submitBtn.addEventListener("click", (e) => handleFormSubmit(e));
resetBtn.addEventListener("click", reset);
document.body.addEventListener("click", restoreInputFocus);
