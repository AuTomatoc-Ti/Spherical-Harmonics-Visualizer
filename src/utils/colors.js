import { clamp } from "../math/sphericalHarmonics.js";

/**
 * Convert normalized value (-1 to 1) to RGB color
 * Blue for negative, white for zero, red for positive
 */
export function normalizedToRgb(normalized) {
  const n = clamp(normalized, -1, 1);

  if (n >= 0) {
    const t = n;
    return [
      Math.round(242 + 13 * t),
      Math.round(241 - 132 * t),
      Math.round(245 - 162 * t)
    ];
  }

  const t = Math.abs(n);
  return [
    Math.round(242 - 160 * t),
    Math.round(241 - 112 * t),
    Math.round(245 + 8 * t)
  ];
}
