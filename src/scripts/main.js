import "../styles/style.scss";
import { SIZE, Stroke, createTimeline, pick } from "./engine.js";
import { glyph } from "./glyphs.js";
import classic from "./variations/classic.js";
import metamorphosis from "./variations/metamorphosis.js";
import wheel from "./variations/wheel.js";
import colony from "./variations/colony.js";
import thread from "./variations/thread.js";

const form = document.querySelector("#wish-form"),
  txtInput = form.querySelector(".input"),
  submitBtn = form.querySelector("button[type='submit']"),
  resetBtn = form.querySelector("button[type='reset']"),
  result = document.querySelector(".result"),
  svg = result.querySelector("#svg"),
  variationPicker = document.querySelector(".variations"),
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

// Each variation animates from "letters selected on the ring" to the
// finished sigil. "random" picks one of the new ones on every wish.
const variations = { metamorphosis, wheel, colony, thread, classic };
const randomPool = ["metamorphosis", "wheel", "colony", "thread"];

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

  const chosen = variationPicker.querySelector("input:checked").value;
  const name = chosen === "random" ? pick(randomPool) : chosen;
  nowPlaying.textContent = chosen === "random" ? `playing: ${name}` : "";

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

  // If a reset or a new wish interrupts, the timeline stops resolving and
  // this function just never continues past the await it was on
  result.classList.add("animate");
  if (name !== "classic") {
    await tl.sleep(animationDuration * 0.6);
    result.classList.add("dim-rest");
  }
  await variations[name]({
    layer,
    letters,
    tl,
    spawn,
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
