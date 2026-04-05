const factorialCache = new Map([[0, 1], [1, 1]]);

function factorial(n) {
  if (factorialCache.has(n)) {
    return factorialCache.get(n);
  }

  let value = 1;
  for (let i = 2; i <= n; i += 1) {
    value *= i;
  }

  factorialCache.set(n, value);
  return value;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function associatedLegendre(l, mAbs, x) {
  if (mAbs > l) return 0;

  let pmm = 1.0;
  if (mAbs > 0) {
    const somx2 = Math.sqrt(Math.max(0, (1 - x) * (1 + x)));
    let fact = 1.0;
    for (let i = 1; i <= mAbs; i += 1) {
      pmm *= -fact * somx2;
      fact += 2.0;
    }
  }

  if (l === mAbs) return pmm;

  let pmmp1 = x * (2 * mAbs + 1) * pmm;
  if (l === mAbs + 1) return pmmp1;

  let pll = 0;
  for (let ll = mAbs + 2; ll <= l; ll += 1) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + mAbs - 1) * pmm) / (ll - mAbs);
    pmm = pmmp1;
    pmmp1 = pll;
  }

  return pll;
}

export function normalizationConstant(l, mAbs) {
  const numerator = (2 * l + 1) * factorial(l - mAbs);
  const denominator = 4 * Math.PI * factorial(l + mAbs);
  return Math.sqrt(numerator / denominator);
}

export function realSphericalHarmonic(l, m, theta, phi) {
  const mAbs = Math.abs(m);
  const p = associatedLegendre(l, mAbs, Math.cos(theta));
  const n = normalizationConstant(l, mAbs);

  if (m > 0) {
    return { y: Math.sqrt(2) * n * p * Math.cos(mAbs * phi), p };
  }

  if (m < 0) {
    return { y: Math.sqrt(2) * n * p * Math.sin(mAbs * phi), p };
  }

  return { y: n * p, p };
}

export function sanityCheckY00() {
  const y00 = realSphericalHarmonic(0, 0, Math.PI / 2, 0).y;
  const expected = 1 / (2 * Math.sqrt(Math.PI));
  return Math.abs(y00 - expected) < 1e-9;
}
