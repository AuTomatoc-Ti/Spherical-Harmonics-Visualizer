import katex from "katex";
import { normalizationConstant } from "../math/sphericalHarmonics.js";

const factorialCache = new Map([[0, 1], [1, 1]]);

function factorial(n) {
  if (factorialCache.has(n)) return factorialCache.get(n);
  let value = 1;
  for (let i = 2; i <= n; i += 1) {
    value *= i;
  }
  factorialCache.set(n, value);
  return value;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

function simplifyFraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor
  };
}

function polyMultiplyByX(coeffs) {
  return [0, ...coeffs];
}

function polyScale(coeffs, scalar) {
  return coeffs.map((coefficient) => coefficient * scalar);
}

function polyAdd(left, right) {
  const next = Array(Math.max(left.length, right.length)).fill(0);
  for (let i = 0; i < next.length; i += 1) {
    next[i] = (left[i] ?? 0) + (right[i] ?? 0);
  }
  return next;
}

function polyDifferentiate(coeffs, order) {
  let derived = [...coeffs];
  for (let k = 0; k < order; k += 1) {
    if (derived.length <= 1) return [0];
    const next = Array(derived.length - 1).fill(0);
    for (let i = 1; i < derived.length; i += 1) {
      next[i - 1] = derived[i] * i;
    }
    derived = next;
  }
  return derived;
}

function legendreCoefficients(l) {
  if (l === 0) return [1];
  if (l === 1) return [0, 1];

  let pMinusTwo = [1];
  let pMinusOne = [0, 1];

  for (let n = 2; n <= l; n += 1) {
    const term1 = polyScale(polyMultiplyByX(pMinusOne), (2 * n - 1) / n);
    const term2 = polyScale(pMinusTwo, -(n - 1) / n);
    const pn = polyAdd(term1, term2);
    pMinusTwo = pMinusOne;
    pMinusOne = pn;
  }

  return pMinusOne;
}

function formatSignedTerm(absCoefficient, power, sign, variableName = "x") {
  const coeffIsOne = Math.abs(absCoefficient - 1) < 1e-12;
  const coeffText = coeffIsOne && power !== 0 ? "" : Number(absCoefficient.toFixed(10)).toString();
  const variableText =
    power === 0 ? "" : power === 1 ? variableName : `${variableName}^{${power}}`;

  if (!variableText) {
    return `${sign}${coeffText}`;
  }

  return `${sign}${coeffText}${variableText}`;
}

function polynomialToLatex(coeffs, variableName = "x") {
  const terms = [];

  for (let power = coeffs.length - 1; power >= 0; power -= 1) {
    const coefficient = coeffs[power] ?? 0;
    if (Math.abs(coefficient) < 1e-12) continue;

    const sign = coefficient >= 0 ? "+" : "-";
    const term = formatSignedTerm(Math.abs(coefficient), power, sign, variableName);
    terms.push(term);
  }

  if (!terms.length) return "0";

  let expression = terms.join(" ");
  if (expression.startsWith("+")) {
    expression = expression.slice(1).trim();
  }
  return expression.replaceAll("+-", "-");
}

function exactNormalizationLatex(l, mAbs) {
  const numeratorRaw = (2 * l + 1) * factorial(l - mAbs);
  const denominatorRaw = 4 * factorial(l + mAbs);
  const reduced = simplifyFraction(numeratorRaw, denominatorRaw);
  return String.raw`N_{${l},${mAbs}}=\sqrt{\frac{${reduced.numerator}}{${reduced.denominator}\pi}}`;
}

function associatedLegendreSubstitutedLatex(l, mAbs) {
  const pBase = legendreCoefficients(l);
  const derivative = polyDifferentiate(pBase, mAbs);
  const pBaseLatex = polynomialToLatex(pBase, "x");
  const derivativeLatex = polynomialToLatex(derivative, "x");
  const signPrefix = mAbs % 2 === 0 ? "" : "-";
  const powerLatex = mAbs === 0 ? "" : String.raw`^{${mAbs}/2}`;

  return String.raw`P_{${l}}^{${mAbs}}(\cos\theta)=${signPrefix}\left(1-\cos^2\theta\right)${powerLatex}\left(${derivativeLatex.replaceAll("x", "\\cos\\theta")}\right),\quad P_{${l}}(x)=${pBaseLatex}`;
}

function renderMath(element, latex, displayMode = true) {
  katex.render(latex, element, {
    throwOnError: false,
    displayMode
  });
}

function formatNumber(value, digits = 6) {
  return Number(value).toExponential(digits);
}

export function createEquationPanel(elements) {
  const {
    generalY,
    generalP,
    generalN,
    specificY,
    specificN,
    specificP,
    hoverPosition,
    hoverY,
    hoverP
  } = elements;

  function renderGeneral() {
    renderMath(
      generalY,
      String.raw`Y_l^m(\theta,\phi)=\begin{cases}
\sqrt{2}\,N_{l,|m|}P_l^{|m|}(\cos\theta)\cos(|m|\phi),&m>0\\
N_{l,0}P_l^0(\cos\theta),&m=0\\
\sqrt{2}\,N_{l,|m|}P_l^{|m|}(\cos\theta)\sin(|m|\phi),&m<0
\end{cases}`
    );

    renderMath(
      generalP,
      String.raw`P_l^m(x)=(-1)^m(1-x^2)^{m/2}\frac{d^m}{dx^m}P_l(x)`
    );

    renderMath(
      generalN,
      String.raw`N_{l,m}=\sqrt{\frac{(2l+1)(l-m)!}{4\pi(l+m)!}}`
    );
  }

  function renderSpecific(l, m) {
    const mAbs = Math.abs(m);
    const trig = m > 0 ? `\\cos(${mAbs}\\phi)` : m < 0 ? `\\sin(${mAbs}\\phi)` : "1";
    const front = m === 0 ? `N_{${l},0}` : `\\sqrt{2}\\,N_{${l},${mAbs}}`;

    renderMath(
      specificY,
      String.raw`Y_{${l}}^{${m}}(\theta,\phi)=${front}\,P_{${l}}^{${mAbs}}(\cos\theta)\,${trig}`
    );

    const nValue = normalizationConstant(l, mAbs);
    renderMath(
      specificN,
      String.raw`${exactNormalizationLatex(l, mAbs)}\approx ${formatNumber(nValue, 5)}`
    );

    renderMath(
      specificP,
      associatedLegendreSubstitutedLatex(l, mAbs)
    );
  }

  function resetHover() {
    renderMath(hoverPosition, String.raw`\theta=-,\;\phi=-`, false);
    renderMath(hoverY, String.raw`Y_l^m=-`, false);
    renderMath(hoverP, String.raw`P_l^{|m|}=-`, false);
  }

  function renderHover(sample, l, m, showExactValues) {
    if (!sample) {
      resetHover();
      return;
    }

    renderMath(
      hoverPosition,
      String.raw`\theta=${sample.theta.toFixed(4)}\,\mathrm{rad},\;\phi=${sample.phi.toFixed(4)}\,\mathrm{rad}`,
      false
    );

    if (!showExactValues) {
      renderMath(hoverY, String.raw`Y_l^m:\;\text{disabled}`, false);
      renderMath(hoverP, String.raw`P_l^{|m|}:\;\text{disabled}`, false);
      return;
    }

    renderMath(
      hoverY,
      String.raw`Y_{${l}}^{${m}}(\theta,\phi)\approx ${formatNumber(sample.y)}`,
      false
    );

    renderMath(
      hoverP,
      String.raw`P_{${l}}^{${Math.abs(m)}}(\cos\theta)\approx ${formatNumber(sample.p)}`,
      false
    );
  }

  renderGeneral();
  resetHover();

  return {
    renderSpecific,
    renderHover,
    resetHover
  };
}
