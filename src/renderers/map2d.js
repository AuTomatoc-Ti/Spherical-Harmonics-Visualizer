import { clamp, realSphericalHarmonic } from "../math/sphericalHarmonics.js";
import { normalizedToRgb } from "../utils/colors.js";

function drawCoverageBoundary(overlayCtx, width, height, values, thresholdValue) {
  const boundary = overlayCtx.createImageData(width, height);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const center = Math.abs(values[idx]) >= thresholdValue;
      if (!center) continue;

      const left = Math.abs(values[idx - 1]) >= thresholdValue;
      const right = Math.abs(values[idx + 1]) >= thresholdValue;
      const top = Math.abs(values[idx - width]) >= thresholdValue;
      const bottom = Math.abs(values[idx + width]) >= thresholdValue;

      if (!(left && right && top && bottom)) {
        const offset = idx * 4;
        boundary.data[offset] = 255;
        boundary.data[offset + 1] = 255;
        boundary.data[offset + 2] = 255;
        boundary.data[offset + 3] = 190;
      }
    }
  }

  overlayCtx.putImageData(boundary, 0, 0);
}

export function createMap2DRenderer(canvas, overlayCanvas) {
  const ctx = canvas.getContext("2d");
  const overlayCtx = overlayCanvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const coverageThreshold = 0.7;

  function render(l, m) {
    const values = new Float64Array(width * height);
    let maxAbs = 0;

    for (let y = 0; y < height; y += 1) {
      const theta = (y / (height - 1)) * Math.PI;
      for (let x = 0; x < width; x += 1) {
        const phi = (x / (width - 1)) * 2 * Math.PI;
        const idx = y * width + x;
        const { y: value } = realSphericalHarmonic(l, m, theta, phi);

        values[idx] = value;
        maxAbs = Math.max(maxAbs, Math.abs(value));
      }
    }

    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < values.length; i += 1) {
      const normalized = maxAbs === 0 ? 0 : values[i] / maxAbs;
      const [r, g, b] = normalizedToRgb(normalized);
      const offset = i * 4;
      imageData.data[offset] = r;
      imageData.data[offset + 1] = g;
      imageData.data[offset + 2] = b;
      imageData.data[offset + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    overlayCtx.clearRect(0, 0, width, height);
    drawCoverageBoundary(overlayCtx, width, height, values, coverageThreshold * maxAbs);
  }

  function sampleFromMouse(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    const px = clamp(clientX - rect.left, 0, rect.width);
    const py = clamp(clientY - rect.top, 0, rect.height);

    const theta = (py / rect.height) * Math.PI;
    const phi = (px / rect.width) * 2 * Math.PI;
    const { y, p } = realSphericalHarmonic(
      Number(canvas.dataset.l),
      Number(canvas.dataset.m),
      theta,
      phi
    );

    return { theta, phi, y, p };
  }

  function updateDataset(l, m) {
    canvas.dataset.l = String(l);
    canvas.dataset.m = String(m);
  }

  return {
    render,
    sampleFromMouse,
    updateDataset
  };
}
