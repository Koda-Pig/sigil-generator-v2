import { C, SVG_NS } from "../engine.js";

// The original animation: selected letters slide to the centre and
// dissolve, then each shape is drawn centred at a random rotation.
export default async function classic({ layer, letters, tl, result, duration }) {
  result.classList.add("classic");
  await tl.sleep(duration);
  result.classList.remove("animate");
  result.classList.add("slide-inward");
  await tl.sleep(duration);

  // alphabetical, as before, so rotation still scales with letter order
  const sorted = [...letters].sort((a, b) => a.char.localeCompare(b.char));
  sorted.forEach((letter, index) =>
    drawShape(layer, letter.shape, index, sorted.length)
  );
  await tl.sleep(duration * 1.5);
}

const drawShape = (layer, shape, index, total) => {
  let elem;
  const rotationAngle = Math.random() * (index + 1) * 360;
  const lineLength = Math.random() * 150 + 100;

  switch (shape) {
    case "line":
      elem = document.createElementNS(SVG_NS, "line");
      elem.setAttribute("x1", C - lineLength / 2);
      elem.setAttribute("y1", C);
      elem.setAttribute("x2", C + lineLength / 2);
      elem.setAttribute("y2", C);
      break;

    case "zigzag": {
      const startX = C - lineLength * 2;
      const height = lineLength / 2;
      elem = document.createElementNS(SVG_NS, "polyline");
      elem.setAttribute(
        "points",
        `${startX},${C} ` +
          `${startX + lineLength},${C - height} ` +
          `${startX + lineLength * 2},${C} ` +
          `${startX + lineLength * 3},${C + height} ` +
          `${startX + lineLength * 4},${C}`
      );
      break;
    }

    case "triangle": {
      const side = lineLength * 2,
        height = (Math.sqrt(3) / 2) * side,
        bottomY = C + (1 / 3) * height;
      elem = document.createElementNS(SVG_NS, "polygon");
      elem.setAttribute(
        "points",
        `${C},${C - (2 / 3) * height} ` +
          `${C - side / 2},${bottomY} ` +
          `${C + side / 2},${bottomY}`
      );
      break;
    }

    case "rectangle":
      elem = document.createElementNS(SVG_NS, "rect");
      elem.setAttribute("x", C - (lineLength * 1.5) / 2);
      elem.setAttribute("y", C - lineLength / 2);
      elem.setAttribute("width", lineLength * 1.5);
      elem.setAttribute("height", lineLength);
      break;

    case "square":
      elem = document.createElementNS(SVG_NS, "rect");
      elem.setAttribute("x", C - lineLength / 2);
      elem.setAttribute("y", C - lineLength / 2);
      elem.setAttribute("width", lineLength);
      elem.setAttribute("height", lineLength);
      break;

    case "circle":
      elem = document.createElementNS(SVG_NS, "circle");
      elem.setAttribute("cx", C);
      elem.setAttribute("cy", C);
      elem.setAttribute("r", lineLength);
      elem.setAttribute("noBBox", ""); // No bbox for circle
      break;

    case "crescent": {
      const cLength = lineLength * 1.5;
      // length ratio
      const lr = (percent) => (percent ? (percent / 100) * cLength : cLength);
      elem = document.createElementNS(SVG_NS, "path");
      elem.setAttribute(
        "d",
        `M${lr()} ${lr(40)}A${lr(80)} ${lr(80)} 0 1 0 ${lr()} ${lr(140)} ${lr(
          60
        )} ${lr(60)} 0 1 1 ${lr()} ${lr(40)}z`
      );
      // center the crescent
      elem.customTransform = "translate(200 105)";
      break;
    }

    case "chevron":
      elem = document.createElementNS(SVG_NS, "polyline");
      elem.setAttribute(
        "points",
        `${C - lineLength / 2},${C - lineLength / 2} ` +
          `${C},${C + lineLength / 2} ` +
          `${C + lineLength / 2},${C - lineLength / 2}`
      );
      break;
  }

  if (!elem) return;

  elem.classList.add("classic-shape");
  layer.appendChild(elem);

  // Apply rotation for elements, adjusting the center as needed
  // with the exception of some elements which have no bbox (circle)
  // Or if there is only one element, no need to rotate
  if (!elem.hasAttribute("noBBox") && total > 1) {
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

  if (total === 1 && elem.customTransform) {
    elem.setAttribute("transform", elem.customTransform);
  }

  // Animation for drawing the element
  const length = elem.getTotalLength ? elem.getTotalLength() : 0;
  if (length > 0) {
    elem.style.strokeDasharray = length;
    elem.style.strokeDashoffset = length;
  }
};
