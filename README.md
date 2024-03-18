# Sigil Generator V2

## Description

A sigil _(/ˈsɪdʒəl/; pl. sigilla or sigils)_ is a type of symbol used in magic. The term has usually referred to a **type of pictorial signature of a deity or spirit**. In modern usage, especially in the context of chaos magic, sigil refers to a symbolic representation of the practitioner's desired outcome.

## Setup

1. Clone the repository
2. Run `npm install`
3. Run `npm dev`

## TODO

- [x] change input validation to disable/ enable submit button
- [x] Refactor sass
- [ ] Incorporate a modifier to randomize shape size and position
- [x] Center drawings
- [ ] Fix this "Only letters are allowed, no numbers or special characters.": Let users type whatever, then remove those characters
- [ ] Improve method of calculating when to perform animations.
- There shouldn't be all this calculating the animation duration, one event or animation should finish and the following one should wait for it.
- Maybe await or promise? But not sure.
- This is the modification in the handleFormSubmit function that led me to this conclusion:

```javascript
import "../styles/style.scss";

const form = document.querySelector("#wish-form"),
  txtInput = form.querySelector(".input"),
  submitBtn = form.querySelector("button[type='submit']"),
  resetBtn = form.querySelector("button[type='reset']"),
  result = document.querySelector(".result"),
  svg = result.querySelector("#svg");

let letterNodes = null,
  userInput = "",
  validInput = false,
  animationDuration = 1000;

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

const handleFormSubmit = (e) => {
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

  // process input
  userInput = txtInput.value.toLowerCase();
  userInput = processInput(userInput);

  // add animation classes
  result.classList.add("animate");

  userInput.forEach((character, index) => {
    const shape = alphabet[character];

    letterNodes.forEach((node) => {
      if (character === node.innerText) {
        node.classList.add("show");
      }
    });

    // THIS CHANGE
    // not sure if this is the right way to remove unused characters
    // just playing around. Need to get the timing right on this
    // thing I need to do some await or something here so I'm not
    // dealing with calculating how long to do things, rather one
    // thing should happen after the next.
    // this reveals a larger issue in the way this is being done.
    /*
    if (!letterNodes[index].innerText.includes(character)) {
      setTimeout(() => {
        letterNodes[index].remove();
      }, (1 / index) * animationDuration);
    }
    */
    // END

    // draw shapes
    setTimeout(() => {
      drawShape(shape, index);
    }, animationDuration * 2);
  });

  // animation for result
  setTimeout(() => {
    result.classList.remove("animate");
    result.classList.add("slide-inward");

    setTimeout(() => {
      result.classList.add("animate");

      // Remove animate after it completes again
      setTimeout(() => {
        result.classList.remove("animate");
      }, animationDuration);
    }, animationDuration * 2.5); // Time after which slide-inward completes
  }, animationDuration);
};

// Remove duplicates, spaces, convert to lowercase and alphabetize
const processInput = (input) => {
  let inputArray = Array.from(input);
  const newArray = [];

  // Only add new characters (no repeats)
  for (let i = 0; i < inputArray.length; i++) {
    if (!newArray.includes(inputArray[i]) && inputArray[i].trim() !== "") {
      newArray.push(inputArray[i]);
    }
  }

  // Alphabetize
  newArray.sort();

  return newArray;
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
  if (disableSubmit) submitBtn.setAttribute("disabled", "");
  result.classList.remove("slide-inward");
  result.classList.remove("animate");
  // THIS CHANGE:
  // result.querySelectorAll(".show").forEach((el) => el.classList.remove("show"));
  result.querySelectorAll("p").forEach((el) => el.remove());
  mapAlphabet();
  // END
  svg.innerHTML = "";
};

const drawShape = (shape, index) => {
  let elem;
  // Random rotation angle
  let rotationAngle = Math.random() * (index + 1) * 360;

  const svgWidth = svg.clientWidth || svg.viewBox.baseVal.width;
  const svgHeight = svg.clientHeight || svg.viewBox.baseVal.height;
  const svgCenterX = svgWidth / 2;
  const svgCenterY = svgHeight / 2;

  // Should randomise this as well
  let lineLength = Math.random() * 150 + 100;
  // lineLength = 100;

  switch (shape) {
    case "line":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "line");
      elem.setAttribute("x1", svgCenterX - lineLength / 2);
      elem.setAttribute("y1", svgCenterY);
      elem.setAttribute("x2", svgCenterX + lineLength / 2);
      elem.setAttribute("y2", svgCenterY);
      break;

    case "zigzag":
      // Zigzag as a polyline for simplicity
      const totalZigzagWidth = lineLength * 4; // Total width for 2 peaks
      const startZigzagX = svgCenterX - totalZigzagWidth / 2; // Start from this X to center the zigzag
      const zigzagHeight = lineLength / 2; // Adjust the height of the peaks if necessary

      elem = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      elem.setAttribute(
        "points",
        `${startZigzagX},${svgCenterY} ` +
          `${startZigzagX + lineLength},${svgCenterY - zigzagHeight} ` + // Peak 1
          `${startZigzagX + lineLength * 2},${svgCenterY} ` + // Valley
          `${startZigzagX + lineLength * 3},${svgCenterY + zigzagHeight} ` + // Peak 2
          `${startZigzagX + lineLength * 4},${svgCenterY}` // Back to center line at the end
      );
      break;

    case "triangle":
      const sideLength = lineLength * 2,
        triangleHeight = (Math.sqrt(3) / 2) * sideLength,
        topVertexX = svgCenterX,
        topVertexY = svgCenterY - (2 / 3) * triangleHeight,
        bottomLeftVertexX = svgCenterX - sideLength / 2,
        bottomRightVertexX = svgCenterX + sideLength / 2,
        bottomVerticesY = svgCenterY + (1 / 3) * triangleHeight;

      elem = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      elem.setAttribute(
        "points",
        `${topVertexX},${topVertexY} ` +
          `${bottomLeftVertexX},${bottomVerticesY} ` +
          `${bottomRightVertexX},${bottomVerticesY}`
      );
      break;

    case "rectangle":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      elem.setAttribute("x", svgCenterX - (lineLength * 1.5) / 2);
      elem.setAttribute("y", svgCenterY - lineLength / 2);
      elem.setAttribute("width", lineLength * 1.5);
      elem.setAttribute("height", lineLength);
      break;

    case "square":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      elem.setAttribute("x", svgCenterX - lineLength / 2);
      elem.setAttribute("y", svgCenterY - lineLength / 2);
      elem.setAttribute("width", lineLength);
      elem.setAttribute("height", lineLength);
      break;

    case "circle":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      elem.setAttribute("cx", svgCenterX);
      elem.setAttribute("cy", svgCenterY);
      elem.setAttribute("r", lineLength);
      elem.setAttribute("noBBox", ""); // No bbox for circle
      break;

    case "crescent":
      const cLength = lineLength * 1.5;
      // length ratio
      const lr = (percent) => {
        return percent ? (percent / 100) * cLength : cLength;
      };
      elem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      elem.setAttribute(
        "d",
        `M${lr()} ${lr(40)}A${lr(80)} ${lr(80)} 0 1 0 ${lr()} ${lr(140)} ${lr(
          60
        )} ${lr(60)} 0 1 1 ${lr()} ${lr(40)}z`
      );
      // center the crescent
      elem.customTransform = "translate(200 105)";
      break;

    case "chevron":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      elem.setAttribute(
        "points",
        `${svgCenterX - lineLength / 2},${svgCenterY - lineLength / 2} ` +
          `${svgCenterX},${svgCenterY + lineLength / 2} ` +
          `${svgCenterX + lineLength / 2},${svgCenterY - lineLength / 2}`
      );
      break;
  }

  if (!elem) return;

  elem.setAttribute("stroke-width", "2");
  elem.setAttribute("fill", "none"); // For shapes like rectangle, triangle
  svg.appendChild(elem);

  // Apply rotation for elements, adjusting the center as needed
  // with the exception of some elements which have no bbox (circle)
  // Or if there is only one element, no need to rotate
  if (!elem.hasAttribute("noBBox") && userInput.length > 1) {
    const bbox = elem.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    elem.setAttribute(
      "transform",
      `rotate(${rotationAngle} ${centerX} ${centerY}) ${
        elem.customTransform ? elem.customTransform : ""
      }`
    );
  }

  if (userInput.length === 1 && elem.customTransform) {
    elem.setAttribute("transform", elem.customTransform);
  }

  // Animation for drawing the element
  const length = elem.getTotalLength ? elem.getTotalLength() : 0;
  if (length > 0) {
    // Only apply if getTotalLength is supported
    elem.style.strokeDasharray = length;
    elem.style.strokeDashoffset = length;
  }
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
```
