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
  result.querySelectorAll(".show").forEach((el) => el.classList.remove("show"));
  svg.innerHTML = "";
};

// Helper functions for organic shape generation
const randomRange = (min, max) => min + Math.random() * (max - min);

const addNoise = (value, magnitude) => {
  return value + randomRange(-magnitude, magnitude);
};

const createOrganicPath = (points, noiseAmount = 10, smoothness = 3) => {
  if (points.length < 2) return "";

  let pathData = `M${points[0].x},${points[0].y}`;

  if (points.length === 2) {
    // Just a line between two points with noise
    const controlX =
      (points[0].x + points[1].x) / 2 + randomRange(-noiseAmount, noiseAmount);
    const controlY =
      (points[0].y + points[1].y) / 2 + randomRange(-noiseAmount, noiseAmount);
    return `M${points[0].x},${points[0].y} Q${controlX},${controlY} ${points[1].x},${points[1].y}`;
  }

  // For more points, create a smooth curve with noise
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];

    // Calculate control points for a smooth curve with randomness
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;

    // Add first curve segment with noisy control point
    const cp1x = midX + randomRange(-noiseAmount, noiseAmount);
    const cp1y = midY + randomRange(-noiseAmount, noiseAmount);

    if (i === 0) {
      pathData += ` Q${cp1x},${cp1y} ${midX},${midY}`;
    } else {
      // Use the previous control point to ensure smooth connection
      pathData += ` T${midX},${midY}`;
    }

    // Add second curve segment with noisy control point
    const cp2x = midX + randomRange(-noiseAmount, noiseAmount);
    const cp2y = midY + randomRange(-noiseAmount, noiseAmount);

    pathData += ` Q${cp2x},${cp2y} ${next.x},${next.y}`;
  }

  return pathData;
};

const createOrganicCircle = (
  cx,
  cy,
  radius,
  noisePoints = 12,
  noiseAmount = 0.3
) => {
  const points = [];
  for (let i = 0; i < noisePoints; i++) {
    const angle = (i / noisePoints) * Math.PI * 2;
    const noisyRadius = radius * (1 + randomRange(-noiseAmount, noiseAmount));
    points.push({
      x: cx + Math.cos(angle) * noisyRadius,
      y: cy + Math.sin(angle) * noisyRadius
    });
  }

  // Close the path by duplicating the first few points
  points.push(points[0], points[1], points[2]);

  return createOrganicPath(points, radius * 0.1, 2);
};

const createOrganicLine = (x1, y1, x2, y2, noiseAmount = 10, segments = 3) => {
  const points = [];

  // Create points along the line with segment divisions
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      x:
        x1 +
        (x2 - x1) * t +
        (i > 0 && i < segments ? randomRange(-noiseAmount, noiseAmount) : 0),
      y:
        y1 +
        (y2 - y1) * t +
        (i > 0 && i < segments ? randomRange(-noiseAmount, noiseAmount) : 0)
    });
  }

  return createOrganicPath(points, noiseAmount, 1);
};

const createOrganicPolygon = (points, noiseAmount = 10) => {
  const noisyPoints = points.map((pt) => ({
    x: pt.x + randomRange(-noiseAmount, noiseAmount),
    y: pt.y + randomRange(-noiseAmount, noiseAmount)
  }));

  // Connect back to the first point to close the shape
  noisyPoints.push(noisyPoints[0]);

  return createOrganicPath(noisyPoints, noiseAmount, 2);
};

const drawShape = (shape, index) => {
  let elem;
  // Random rotation angle
  let rotationAngle = Math.random() * (index + 1) * 360;

  const svgWidth = svg.clientWidth || svg.viewBox.baseVal.width;
  const svgHeight = svg.clientHeight || svg.viewBox.baseVal.height;
  const svgCenterX = svgWidth / 2;
  const svgCenterY = svgHeight / 2;

  // Random size variation
  let lineLength = Math.random() * 150 + 100;
  // Additional randomness factor for organic shapes
  const organicFactor = Math.random() * 0.4 + 0.8; // 0.8 to 1.2

  switch (shape) {
    case "line":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const lineX1 = svgCenterX - lineLength / 2;
      const lineY1 = svgCenterY;
      const lineX2 = svgCenterX + lineLength / 2;
      const lineY2 = svgCenterY;

      elem.setAttribute(
        "d",
        createOrganicLine(lineX1, lineY1, lineX2, lineY2, lineLength * 0.1, 4)
      );
      break;

    case "zigzag":
      // Create organic zigzag as path
      elem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const totalZigzagWidth = lineLength * 4;
      const startZigzagX = svgCenterX - totalZigzagWidth / 2;
      const zigzagHeight = lineLength / 2;

      const zigPoints = [
        { x: startZigzagX, y: svgCenterY },
        { x: startZigzagX + lineLength, y: svgCenterY - zigzagHeight },
        { x: startZigzagX + lineLength * 2, y: svgCenterY },
        { x: startZigzagX + lineLength * 3, y: svgCenterY + zigzagHeight },
        { x: startZigzagX + lineLength * 4, y: svgCenterY }
      ];

      elem.setAttribute("d", createOrganicPath(zigPoints, lineLength * 0.1, 2));
      break;

    case "triangle":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const sideLength = lineLength * 2,
        triangleHeight = (Math.sqrt(3) / 2) * sideLength,
        topVertexX = svgCenterX,
        topVertexY = svgCenterY - (2 / 3) * triangleHeight,
        bottomLeftVertexX = svgCenterX - sideLength / 2,
        bottomRightVertexX = svgCenterX + sideLength / 2,
        bottomVerticesY = svgCenterY + (1 / 3) * triangleHeight;

      const trianglePoints = [
        { x: topVertexX, y: topVertexY },
        { x: bottomLeftVertexX, y: bottomVerticesY },
        { x: bottomRightVertexX, y: bottomVerticesY },
        { x: topVertexX, y: topVertexY } // Close the path by returning to start
      ];

      elem.setAttribute(
        "d",
        createOrganicPath(trianglePoints, lineLength * 0.1, 2)
      );
      break;

    case "rectangle":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const rectX = svgCenterX - (lineLength * 1.5) / 2;
      const rectY = svgCenterY - lineLength / 2;
      const rectWidth = lineLength * 1.5;
      const rectHeight = lineLength;

      const rectPoints = [
        { x: rectX, y: rectY },
        { x: rectX + rectWidth, y: rectY },
        { x: rectX + rectWidth, y: rectY + rectHeight },
        { x: rectX, y: rectY + rectHeight },
        { x: rectX, y: rectY } // Close the path by returning to start
      ];

      elem.setAttribute(
        "d",
        createOrganicPath(rectPoints, lineLength * 0.08, 2)
      );
      break;

    case "square":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const squareX = svgCenterX - lineLength / 2;
      const squareY = svgCenterY - lineLength / 2;

      const squarePoints = [
        { x: squareX, y: squareY },
        { x: squareX + lineLength, y: squareY },
        { x: squareX + lineLength, y: squareY + lineLength },
        { x: squareX, y: squareY + lineLength },
        { x: squareX, y: squareY } // Close the path by returning to start
      ];

      elem.setAttribute(
        "d",
        createOrganicPath(squarePoints, lineLength * 0.05, 2)
      );
      break;

    case "circle":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const radius = lineLength * organicFactor;

      elem.setAttribute(
        "d",
        createOrganicCircle(svgCenterX, svgCenterY, radius, 16, 0.2)
      );
      elem.setAttribute("noBBox", ""); // No bbox for circle
      break;

    case "crescent":
      // Create organic crescent
      elem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const cLength = lineLength * 1.5;

      const outerRadius = cLength * organicFactor;
      const innerRadius = outerRadius * 0.6;
      const offset = outerRadius * 0.4;

      // Create points for outer and inner circles with noise
      const outerPoints = [];
      const innerPoints = [];
      const numPoints = 16;

      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const outerNoise = randomRange(-outerRadius * 0.1, outerRadius * 0.1);
        const innerNoise = randomRange(-innerRadius * 0.1, innerRadius * 0.1);

        outerPoints.push({
          x: svgCenterX + Math.cos(angle) * (outerRadius + outerNoise),
          y: svgCenterY + Math.sin(angle) * (outerRadius + outerNoise)
        });

        innerPoints.push({
          x: svgCenterX + offset + Math.cos(angle) * (innerRadius + innerNoise),
          y: svgCenterY + Math.sin(angle) * (innerRadius + innerNoise)
        });
      }

      // Create crescent path with smooth connection
      let crescentPath = createOrganicPath(
        outerPoints.slice(0, numPoints / 2 + 1),
        outerRadius * 0.05,
        2
      );
      crescentPath +=
        " " +
        createOrganicPath(
          innerPoints.slice(numPoints / 2, numPoints).reverse(),
          innerRadius * 0.05,
          2
        ).replace("M", "L");
      crescentPath += " Z";

      elem.setAttribute("d", crescentPath);
      break;

    case "chevron":
      elem = document.createElementNS("http://www.w3.org/2000/svg", "path");

      const chevPoints = [
        { x: svgCenterX - lineLength / 2, y: svgCenterY - lineLength / 2 },
        { x: svgCenterX, y: svgCenterY + lineLength / 2 },
        { x: svgCenterX + lineLength / 2, y: svgCenterY - lineLength / 2 }
      ];

      elem.setAttribute(
        "d",
        createOrganicPath(chevPoints, lineLength * 0.1, 2)
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
