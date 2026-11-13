import { dec, val, type Builder } from "./worked-utils";
import { flat, plain, solutionTable, table } from "./worked-final";
import { sequenceLine } from "./worked-utils";
import { graph } from "./figures";
import { jumpLine } from "../engine/worked";

/**
 * Worked pictures for Year 12 and 13 topics: sequences and series as tables of terms and running totals, powers and logarithms as lists of
 * powers, proof by counter-example as a table of cases with the failing one marked, the factor theorem term by term. Each builder reads the
 * question and works the picture out itself, and the tests check it against the question's own answer.
 */
const num = (n: number) => dec(n).replace("-", "−");
const sgn = (n: number) => (n < 0 ? "−" : "+");

// ---------------------------------------------------------------------------------------------- arithmetic sequences and series
const arithmetic: Builder = (q) => {
  const p = plain(q.prompt).replace(/\\ldots/g, "…").replace(/−/g, "-"), a = val(q);
  const m = p.match(/begins (-?\d+), (-?\d+), (-?\d+)/);
  if (!m || a === null) return null;
  const first = Number(m[1]), d = Number(m[2]) - first;
  const nth = p.match(/Find the (\d+)(?:th|st|nd|rd) term/), sum = p.match(/sum of the first (\d+) terms/);
  if (nth) {
    const n = Number(nth[1]);
    return first + (n - 1) * d === a && n <= 14 ? sequenceLine(first, d, n) : null;
  }
  if (sum) {
    const n = Number(sum[1]), rows: (string | number)[][] = [];
    let total = 0;
    for (let i = 1; i <= n; i++) { const t = first + (i - 1) * d; total += t; rows.push([i, num(t), num(total)]); }
    return total === a && n <= 14 ? { figure: table(["n", "Term", "Sum so far"], rows, `The terms ${rows.map((r) => r[1]).join(", ")} with their running total. The sum of the first ${n} terms is ${a}. The first and last terms pair up to ${num(first + first + (n - 1) * d)}, and there are ${n}/2 such pairs.`) } : null;
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- exponential growth, powers and logarithms
const growth: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  if (a === null) return null;
  let m = p.match(/N = (\d+) (?:×|\\times) (\d+)\^\{t\}.* What is N when t = (\d+)/);
  if (m) {
    const c = Number(m[1]), b = Number(m[2]), t = Number(m[3]);
    return c * b ** t === a && t <= 8 ? { figure: table(["t (years)", "N"], Array.from({ length: t + 1 }, (_, i) => [i, c * b ** i]), `Each year the population is multiplied by ${b}: ${Array.from({ length: t + 1 }, (_, i) => c * b ** i).join(", ")}. At t = ${t}, N = ${a}.`) } : null;
  }
  m = p.match(/Solve (\d+)\^\{x\} = (\d+)\./);
  if (m) {
    const b = Number(m[1]), target = Number(m[2]);
    if (b ** a !== target || a > 10) return null;
    return { figure: table(["Power", "Value"], Array.from({ length: a + 1 }, (_, i) => [`${b}^${i}`, b ** i]), `The powers of ${b}: ${Array.from({ length: a + 1 }, (_, i) => `${b} to the ${i} is ${b ** i}`).join(", ")}. ${target} appears at power ${a}, so x = ${a}.`) };
  }
  m = p.match(/N = (\d+) (?:×|\\times) (\d+)\^\{t\}.* After how many years is the population (\d+)\?/);
  if (m) {
    const c = Number(m[1]), b = Number(m[2]), target = Number(m[3]);
    return c * b ** a === target && a <= 9 ? { figure: table(["t (years)", "N"], Array.from({ length: a + 1 }, (_, i) => [i, c * b ** i]), `Each year the population is multiplied by ${b}. It reaches ${target} when t = ${a}.`) } : null;
  }
  return null;
};

const logLaws: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  const logs = [...p.matchAll(/\\log_\{(\d+)\} (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
  if (a === null || !logs.length) return null;
  const power = (b: number, n: number) => { for (let k = 0; k <= 12; k++) if (b ** k === n) return k; return -1; };
  const seen = new Set<string>(), rows: (string | number)[][] = [];
  for (const [b, n] of logs) {
    if (seen.has(`${b}:${n}`)) continue;
    seen.add(`${b}:${n}`);
    const k = power(b, n);
    if (k < 0) return null;
    rows.push([`log${sub(b)} ${n}: what power of ${b} gives ${n}?`, `${b}^${k} = ${n}, so it is ${k}`]);
  }
  const last = (q.solution[q.solution.length - 1] ?? "").replace(/\$/g, "");
  if (logs.length > 1) rows.push(["Put the values in", flat(last).replace(/\.$/, "")]);
  const end = Number(String(rows[rows.length - 1][1]).replace(/−/g, "-").match(/(-?\d+(?:\.\d+)?)\s*$/)?.[1] ?? "") ;
  return end === a ? { figure: table(["Step", "Working"], rows, `A logarithm is a power: ${rows.map((r) => `${r[0]} ${r[1]}`).join(". ")}.`) } : null;
};
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n: number) => String(n).split("").map((d) => SUB[Number(d)]).join("");

// ---------------------------------------------------------------------------------------------- partial fractions
const partialFractions: Builder = (q) => solutionTable(q, ["Step", "Working"]);

// ---------------------------------------------------------------------------------------------- proof by counter-example
const isPrime = (n: number) => n > 1 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every((d) => n % d);
const counterexample: Builder = (q) => {
  const p = plain(q.prompt);
  let head: string[] = [], rows: (string | number)[][] = [], alt = "";
  if (/n\^\{2\} \+ n \+ 11/.test(p)) {
    head = ["n", "n² + n + 11", "Prime?"]; for (let n = 0; n <= 11; n++) { const v = n * n + n + 11; rows.push([n, v, isPrime(v) ? "yes" : "NO: counter-example"]); } alt = "Trying n from 0 up: the values are prime until n = 11, where n² + n + 11 = 143 = 11 × 13, which isn't.";
  } else if (/All prime numbers are odd/.test(p)) {
    head = ["Prime", "Odd?"]; for (const n of [2, 3, 5, 7, 11]) rows.push([n, n % 2 ? "yes" : "NO: counter-example"]); alt = "Most primes are odd, but 2 is a prime and it is even.";
  } else if (/a > b.*a\^\{2\} > b\^\{2\}/.test(p)) {
    head = ["a", "b", "a² and b²", "a² > b²?"]; for (const [a, b] of [[3, 2], [5, 1], [1, -3], [4, -1]] as const) rows.push([a, num(b), `${a * a} and ${b * b}`, a * a > b * b ? "yes" : "NO: counter-example"]); alt = "Trying pairs with a bigger than b: it works until a = 1 and b = −3, where a² = 1 is less than b² = 9.";
  } else if (/n\^\{2\} > n/.test(p)) {
    head = ["n", "n²", "n² > n?"]; for (const n of [3, 2, 1]) rows.push([n, n * n, n * n > n ? "yes" : "NO: counter-example"]); alt = "It works for 2 and 3, but when n = 1, n² = 1 is not greater than 1.";
  } else if (/sum of two prime numbers is always even/.test(p)) {
    head = ["Two primes", "Sum", "Even?"]; for (const [a, b] of [[3, 5], [7, 11], [2, 3]] as const) rows.push([`${a} + ${b}`, a + b, (a + b) % 2 ? "NO: counter-example" : "yes"]); alt = "Most sums of two primes are even, but 2 + 3 = 5 is odd.";
  } else return null;
  return rows.some((r) => String(r[r.length - 1]).startsWith("NO")) ? { figure: table(head, rows, alt) } : null;
};

// ---------------------------------------------------------------------------------------------- sigma notation
const sigma: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), m = p.match(/\\sum_\{r=1\}\^\{(\d+)\} (?:\((\d+)r \+ (\d+)\)|(r\^\{2\})|(r))(?:\.|\?|$)/);
  if (!m || a === null) return null;
  const n = Number(m[1]);
  const term = (r: number) => (m[2] ? Number(m[2]) * r + Number(m[3]) : m[4] ? r * r : r);
  let total = 0; const rows: (string | number)[][] = [];
  for (let r = 1; r <= n; r++) { const t = term(r); total += t; rows.push([r, t, total]); }
  return total === a && n <= 12 ? { figure: table(["r", "Term", "Total so far"], rows, `Add the terms for r from 1 to ${n}: ${rows.map((r) => r[1]).join(" + ")} = ${total}.`) } : null;
};

// ---------------------------------------------------------------------------------------------- the factor theorem and remainders
const factorTheorem: Builder = (q) => {
  const p = plain(q.prompt).replace(/−/g, "-"), a = val(q);
  if (a === null) return null;
  let m = p.match(/remainder when x\^\{3\} ([+-]) (\d+)x\^\{2\} ([+-]) (\d+)x ([+-]) (\d+) is divided by \(x ([+-]) (\d+)\)/);
  if (m) {
    const b = (m[1] === "-" ? -1 : 1) * Number(m[2]), c = (m[3] === "-" ? -1 : 1) * Number(m[4]), d = (m[5] === "-" ? -1 : 1) * Number(m[6]), r = (m[7] === "-" ? 1 : -1) * Number(m[8]);
    const parts = [r ** 3, b * r * r, c * r, d], total = parts.reduce((t, x) => t + x, 0);
    if (total !== a) return null;
    const rs = r < 0 ? `(${num(r)})` : String(r);
    return { figure: table(["Term", `Put x = ${num(r)}`], [["x³", `${rs}³ = ${num(parts[0])}`], [`${num(b)}x²`, `${num(b)} × ${rs}² = ${num(parts[1])}`], [`${num(c)}x`, `${num(c)} × ${rs} = ${num(parts[2])}`], ["constant", num(parts[3])], [`Remainder f(${num(r)})`, `${parts.map(num).join(" + ")} = ${num(total)}`.replace(/\+ −/g, "− ")]].map((x) => x.map((y) => String(y).replace(/\b(\d+)x²/, "$1x²"))), `By the remainder theorem, the remainder is f(${r}): ${parts.join(" + ")} = ${total}.`) };
  }
  m = p.match(/\(x ([+-]) (\d+)\) is a factor of x\^\{3\} \+ kx\^\{2\} ([+-]) (\d+)x ([+-]) (\d+)\. What is the value of k/);
  if (m) {
    const r = (m[1] === "-" ? 1 : -1) * Number(m[2]), c = (m[3] === "-" ? -1 : 1) * Number(m[4]), d = (m[5] === "-" ? -1 : 1) * Number(m[6]);
    const known = r ** 3 + c * r + d, kc = r * r;
    if (known + kc * a !== 0) return null;
    return { figure: table(["Step", "Working"], [["Factor theorem", `(x ${r < 0 ? "+" : "−"} ${Math.abs(r)}) is a factor, so f(${num(r)}) = 0`], ["x³", num(r ** 3)], ["kx²", `${kc}k`], [`${num(c)}x`, num(c * r)], ["constant", num(d)], ["Add them: equals 0", `${num(known)} ${sgn(kc)} ${kc}k = 0`], ["Solve for k", `k = ${num(a)}`]], `Put x = ${r} into the cubic and set it to 0: ${num(known)} + ${kc}k = 0, so k = ${a}.`) };
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- the modulus function
const modulus: Builder = (q) => {
  const p = plain(q.prompt).replace(/−/g, "-"), a = val(q);
  if (a === null) return null;
  const sum = p.match(/Work out ((?:\|-?\d+\|(?: [+-] )?)+)\./);
  if (sum) {
    const terms = [...sum[1].matchAll(/([+-] )?\|(-?\d+)\|/g)].map((t) => ({ sign: t[1]?.startsWith("-") ? -1 : 1, v: Number(t[2]) }));
    const rows = terms.map((t) => [`|${num(t.v)}|`, String(Math.abs(t.v))]), total = terms.reduce((s, t) => s + t.sign * Math.abs(t.v), 0);
    rows.push(["Put them together", terms.map((t, i) => `${i ? (t.sign < 0 ? "− " : "+ ") : ""}${Math.abs(t.v)}`).join(" ") + ` = ${num(total)}`]);
    return total === a ? { figure: table(["Modulus", "Distance from 0"], rows, `The modulus is the distance from zero, so it is never negative: ${rows.map((r) => `${r[0]} is ${r[1]}`).join(", ")}.`) } : null;
  }
  const eq = p.match(/Solve \|x ([+-]) (\d+)\| = (\d+)\. What is the larger solution/);
  if (eq) {
    const c = (eq[1] === "-" ? 1 : -1) * Number(eq[2]), k = Number(eq[3]), lo = c - k - 2, hi = c + k + 2;
    if (c + k !== a) return null;
    const pts: [number, number][] = [];
    for (let x = lo; x <= hi + 1e-9; x += 0.5) pts.push([x, Math.abs(x - c)]);
    pts.splice(pts.findIndex((q2) => q2[0] >= c), 0, [c, 0]);
    const xs = hi - lo <= 12 ? 1 : 2;
    return { figure: graph([{ pts, label: "y = |x − " + c + "|".replace("− -", "+ ") }, { pts: [[lo, k], [hi, k]], dashed: true, label: `y = ${k}` }], [Math.floor(lo / xs) * xs, Math.ceil(hi / xs) * xs, xs], `The graph of y = |x ${c < 0 ? "+" : "−"} ${Math.abs(c)}| is a V shape with its point at x = ${c}. The line y = ${k} meets it at x = ${c - k} and x = ${c + k}, so the larger solution is ${a}.`, { marks: [{ x: c - k, y: k, label: `x = ${num(c - k)}` }, { x: c + k, y: k, label: `x = ${num(c + k)}` }] }) };
  }
  const ineq = p.match(/How many whole numbers \$?x\$? satisfy \|x ([+-]) (\d+)\| < (\d+)/) ?? p.match(/How many whole numbers x satisfy \|x ([+-]) (\d+)\| < (\d+)/);
  if (ineq) {
    const c = (ineq[1] === "-" ? 1 : -1) * Number(ineq[2]), k = Number(ineq[3]), lo = c - k, hi = c + k, count = 2 * k - 1;
    if (count !== a) return null;
    return { figure: jumpLine({ min: lo - 1, max: hi + 1, step: 1, tickLabels: { [lo]: num(lo), [c]: num(c), [hi]: num(hi) }, marks: [{ v: lo, tone: "mid", label: `${num(lo)} (not included)` }, { v: hi, tone: "mid", label: `${num(hi)} (not included)` }], jumps: [{ from: lo, to: hi, label: `x is within ${k} of ${num(c)}` }], alt: `A number line. |x ${c < 0 ? "+" : "−"} ${Math.abs(c)}| < ${k} means x is less than ${k} away from ${c}, so x lies between ${lo} and ${hi}, not including either end. The whole numbers strictly between are ${a} in all.` }) };
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- polynomials: parsed, differentiated, integrated, evaluated
/** Coefficients by power, from text like "-6x^{3} + 3x + 9" (also accepts "(3x + 3)" and "x^{2}"). */
export function parsePoly(text: string): number[] | null {
  const t = plain(text).replace(/−/g, "-").replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  if (!t || /[^0-9x^{}+\- ]/.test(t)) return null;
  const terms = t.replace(/ - /g, " + -").replace(/^-/, "-").split(" + ").map((x) => x.trim()).filter(Boolean);
  const coeffs: number[] = [];
  for (const term of terms) {
    const m = term.match(/^(-?\d*)x(?:\^\{(\d+)\})?$/);
    if (m) { const c = m[1] === "" ? 1 : m[1] === "-" ? -1 : Number(m[1]), pw = m[2] ? Number(m[2]) : 1; coeffs[pw] = (coeffs[pw] ?? 0) + c; }
    else if (/^-?\d+$/.test(term)) coeffs[0] = (coeffs[0] ?? 0) + Number(term);
    else return null;
  }
  return Array.from({ length: coeffs.length }, (_, i) => coeffs[i] ?? 0);
}
const sup = (n: number) => (n === 1 ? "" : n === 2 ? "²" : n === 3 ? "³" : `^${n}`);
const termStr = (c: number, pw: number) => (pw === 0 ? num(c) : `${c === 1 ? "" : c === -1 ? "−" : num(c)}x${sup(pw)}`);
/** A polynomial written highest power first: "−18x² − 12x + 3". */
export function polyStr(c: number[]): string {
  const out: string[] = [];
  for (let pw = c.length - 1; pw >= 0; pw--) { if (!c[pw]) continue; const t = termStr(Math.abs(c[pw]), pw); out.push(out.length ? `${c[pw] < 0 ? "−" : "+"} ${t}` : c[pw] < 0 ? `−${t}` : t); }
  return out.length ? out.join(" ") : "0";
}
export const polyMul = (a: number[], b: number[]) => { const out = Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => { out[i + j] += x * y; })); return out as number[]; };
export const polyDeriv = (c: number[]) => c.slice(1).map((x, i) => x * (i + 1));
export const polyEval = (c: number[], x: number) => c.reduce((t, k, i) => t + k * x ** i, 0);
const termsOf = (c: number[]) => c.map((k, pw) => [k, pw] as const).filter(([k]) => k !== 0).reverse();

const differentiate: Builder = (q) => {
  const text = plain(q.prompt).replace(/\\left|\\right/g, ""), m = text.match(/dy\}\{dx\} when y = (.+?)\.?$/) ?? text.match(/Find dy\/dx when y = (.+?)\.?$/);
  const two = m?.[1].match(/^\((.+?)\)\((.+?)\)$/), fa = two ? parsePoly(two[1]) : null, fb = two ? parsePoly(two[2]) : null;
  const c = two ? (fa && fb ? polyMul(fa, fb) : null) : m ? parsePoly(m[1]) : null;
  if (!c || q.answer.kind !== "expr") return null;
  const rows: (string | number)[][] = two ? [["Expand the brackets first", `(${polyStr(fa!)})(${polyStr(fb!)}) = ${polyStr(c)}`, "then each term"]] : [];
  rows.push(...termsOf(c).map(([k, pw]) => [termStr(k, pw), pw === 0 ? "no x, so 0" : `${num(k)} × ${pw} = ${num(k * pw)}`, pw === 0 ? "0" : termStr(k * pw, pw - 1)]));
  rows.push(["dy/dx", "add the results", polyStr(polyDeriv(c))]);
  return { figure: table(["Term", "Multiply by the power", "Gives (power − 1)"], rows, `Differentiate each term: ${rows.slice(0, -1).map((r) => `${r[0]} gives ${r[2]}`).join("; ")}. So dy/dx = ${polyStr(polyDeriv(c))}.`) };
};

const antideriv = (c: number[]) => c.map((k, pw) => k / (pw + 1)); // index shifted by one
const integratePolynomials: Builder = (q) => {
  const p = plain(q.prompt).replace(/\\,/g, "").replace(/\\int/g, "∫"), a = val(q);
  const one = p.match(/^∫ (.+?)dx = ax\^\{(\d+)\} \+ c\. What is a\?/);
  if (one && a !== null) {
    const c = parsePoly(one[1]); if (!c) return null;
    const [k, pw] = termsOf(c)[0], n = pw + 1;
    if (k / n !== a) return null;
    return { figure: table(["Step", "Working"], [["The term", termStr(k, pw)], ["Add 1 to the power", `x${sup(pw)} → x${sup(n)}`], ["Divide by the new power", `${num(k)} ÷ ${n} = ${num(k / n)}`], ["Answer", `a = ${num(a)}`]], `Integrating ${termStr(k, pw)}: add 1 to the power to get x${sup(n)} and divide by ${n}, giving ${num(k / n)}x${sup(n)}. So a = ${a}.`) };
  }
  const def = p.match(/^Evaluate ∫_\{(-?\d+)\}\^\{(-?\d+)\} (.+?)dx\.?$/);
  if (def && a !== null) {
    const lo = Number(def[1]), hi = Number(def[2]), c = parsePoly(def[3]); if (!c) return null;
    const F = antideriv(c).reduce((acc, k, i) => { acc[i + 1] = k; return acc; }, [0] as number[]);
    if (F.some((k) => !Number.isInteger(k))) return null;
    const top = polyEval(F, hi), bottom = polyEval(F, lo);
    if (Math.abs(top - bottom - a) > 1e-9) return null;
    return { figure: table(["Step", "Working"], [["Integrate each term", polyStr(F)], [`Put in the top limit, x = ${hi}`, num(top)], [`Put in the bottom limit, x = ${lo}`, num(bottom)], ["Subtract: top − bottom", `${num(top)} − ${num(bottom)} = ${num(top - bottom)}`]], `The antiderivative is ${polyStr(F)}. At ${hi} it is ${top}, at ${lo} it is ${bottom}, so the integral is ${top - bottom}.`) };
  }
  return null;
};

const definiteIntegrals: Builder = (q) => {
  const p = plain(q.prompt).replace(/\\,/g, "").replace(/\\int/g, "∫"), a = val(q), m = p.match(/^Evaluate ∫_\{(-?\d+)\}\^\{(-?\d+)\} (.+?)dx\.?$/);
  if (!m || a === null) return null;
  const lo = Number(m[1]), hi = Number(m[2]), c = parsePoly(m[3]);
  if (!c || c.length > 2) return null;
  const strips: [number, number][] = Array.from({ length: 9 }, (_, i) => { const x = lo + ((hi - lo) * i) / 8; return [x, polyEval(c, x)] as [number, number]; });
  const xr: [number, number, number] = [Math.min(0, lo - 1), hi + 1, 1];
  return { figure: graph([{ pts: [[xr[0], polyEval(c, xr[0])], [xr[1], polyEval(c, xr[1])]], label: `y = ${polyStr(c)}` }], xr, `The graph of y = ${polyStr(c)} with the area between x = ${lo} and x = ${hi} shaded. The definite integral is that area, ${a}.`, { strips }) };
};

const productQuotient: Builder = (q) => {
  const p = plain(q.prompt).replace(/\\frac\{(.+?)\}\{(.+?)\}/, "$1 / $2"), a = val(q);
  const x0 = Number(p.match(/when x = (-?\d+)/)?.[1]);
  let u: number[] | null = null, v: number[] | null = null, quotient = false;
  const prod = p.match(/^y = (\(.+?\)|x\^\{\d+\}|\d*x)(\(.+?\)|x\^\{\d+\}|\d*x)\./);
  const quo = p.match(/^y = (.+?) \/ (.+?)\. Use the quotient rule/);
  if (quo) { u = parsePoly(quo[1]); v = parsePoly(quo[2]); quotient = true; } else if (prod) { u = parsePoly(prod[1]); v = parsePoly(prod[2]); }
  if (!u || v === null || a === null || !Number.isFinite(x0)) return null;
  const du = polyDeriv(u), dv = polyDeriv(v), bracket = (c: number[]) => (c.filter(Boolean).length > 1 ? `(${polyStr(c)})` : polyStr(c));
  const value = quotient ? (polyEval(du, x0) * polyEval(v, x0) - polyEval(u, x0) * polyEval(dv, x0)) / polyEval(v, x0) ** 2 : polyEval(du, x0) * polyEval(v, x0) + polyEval(u, x0) * polyEval(dv, x0);
  if (Math.abs(value - a) > 1e-9) return null;
  const rows: (string | number)[][] = [["u and v", `u = ${polyStr(u)},   v = ${polyStr(v)}`], ["Differentiate each", `u′ = ${polyStr(du)},   v′ = ${polyStr(dv)}`],
    [quotient ? "Quotient rule" : "Product rule", quotient ? "dy/dx = (u′v − uv′) ÷ v²" : "dy/dx = u′v + uv′"],
    [`Put in x = ${x0}`, quotient ? `(${num(polyEval(du, x0))} × ${num(polyEval(v, x0))} − ${num(polyEval(u, x0))} × ${num(polyEval(dv, x0))}) ÷ ${num(polyEval(v, x0))}²` : `${num(polyEval(du, x0))} × ${num(polyEval(v, x0))} + ${num(polyEval(u, x0))} × ${num(polyEval(dv, x0))}`], ["Answer", num(value)]];
  void bracket;
  return { figure: table(["Step", "Working"], rows, `${quotient ? "Quotient" : "Product"} rule: ${rows.map((r) => `${r[0]}: ${r[1]}`).join(". ")}.`) };
};

const chainRule: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), m = p.match(/y = \((.+?)\)\^\{(\d+)\}\. Find the gradient of the curve when x = (-?\d+)/);
  if (!m || a === null) return null;
  const inside = parsePoly(m[1]), n = Number(m[2]), x0 = Number(m[3]);
  if (!inside || inside.length > 2) return null;
  const k = inside[1] ?? 0, u0 = polyEval(inside, x0), grad = n * k * u0 ** (n - 1);
  if (grad !== a) return null;
  const rows: (string | number)[][] = [["Inside (call it u)", `u = ${polyStr(inside)}`], ["Outside", `y = u${sup(n)}  →  dy/du = ${n}u${sup(n - 1)}`.replace("u¹", "u")], ["Inside differentiated", `du/dx = ${num(k)}`], ["Multiply (chain rule)", `dy/dx = ${n}u${sup(n - 1)} × ${num(k)}`.replace("u¹", "u")], [`Put in x = ${x0}`, `u = ${num(u0)}, so dy/dx = ${n} × ${num(u0 ** (n - 1))} × ${num(k)} = ${num(grad)}`]];
  return { figure: table(["Step", "Working"], rows, `The chain rule: inside u = ${polyStr(inside)}, outside power ${n}. dy/dx = ${n} × u^${n - 1} × ${k}. At x = ${x0}, u = ${u0} and the gradient is ${grad}.`) };
};

const diffExpTrig: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), x0 = Number(p.match(/when x = (-?\d+)/)?.[1]);
  let m = p.match(/y = (\d*)e\^\{(\d*)x\}/), rule = "", d = "", value = NaN;
  if (m) { const k = m[1] === "" ? 1 : Number(m[1]), r = m[2] === "" ? 1 : Number(m[2]); rule = "e^(mx) → m e^(mx)"; d = `${k * r}e^${r === 1 ? "x" : `(${r}x)`}`; value = k * r * Math.exp(r * x0); }
  m = p.match(/y = (\d*)\\(sin|cos) (\d*)x/);
  if (m) { const k = m[1] === "" ? 1 : Number(m[1]), r = m[3] === "" ? 1 : Number(m[3]), sin = m[2] === "sin"; rule = sin ? "sin(mx) → m cos(mx)" : "cos(mx) → −m sin(mx)"; d = `${sin ? "" : "−"}${k * r} ${sin ? "cos" : "sin"} ${r === 1 ? "x" : `${r}x`}`; value = (sin ? 1 : -1) * k * r * (sin ? Math.cos(r * x0) : Math.sin(r * x0)); }
  m = p.match(/y = (\d*) ?\\ln x/);
  if (m) { const k = m[1] === "" ? 1 : Number(m[1]); rule = "ln x → 1/x"; d = `${k}/x`; value = k / x0; }
  if (!rule || a === null || Math.abs(value - a) > 1e-6) return null;
  const y = flat(p.match(/y = (.+?)\./)?.[1] ?? p.match(/y = (.+?)\. What/)?.[1] ?? "");
  return { figure: table(["Step", "Working"], [["The function", `y = ${y}`], ["The rule", rule], ["Differentiate", `dy/dx = ${d}`], [`Put in x = ${x0}`, num(Math.round(value * 1e6) / 1e6)]], `Differentiating y = ${y} with the rule ${rule} gives ${d}. At x = ${x0} this is ${a}.`) };
};

const integrateSubstitution: Builder = (q) => {
  const p = plain(q.prompt).replace(/\\,/g, " ").replace(/\\int/g, "∫"), a = val(q);
  const m = p.match(/Use u = (.+?) to find ∫ (.+?) ?dx\. The answer is .* What is m\?/), n = p.match(/\^\{(\d+)\}\)? ?dx/)?.[1];
  if (m && a !== null && n && Number(n) + 1 === a) {
    return { figure: table(["Step", "Working"], [["Choose u", `u = ${flat(m[1])}`], ["Differentiate", `du = ${flat(q.solution[0] ?? "").replace(/^.*du = /, "").split(",")[0]}`], ["Rewrite the integral", `∫ u${sup(Number(n))} du`], ["Integrate", `u${sup(Number(n) + 1)} ÷ ${Number(n) + 1}`], ["Put x back", `(${flat(m[1])})${sup(Number(n) + 1)} ÷ ${Number(n) + 1}`]], `Substituting u = ${flat(m[1])} turns the integral into the integral of u^${n}, which is u^${Number(n) + 1} over ${Number(n) + 1}. So m = ${a}.`) };
  }
  return solutionTable(q, ["Step", "Working"]);
};

// ---------------------------------------------------------------------------------------------- trigonometric equations, on the graph
const trigEquations: Builder = (q) => {
  const p = plain(q.prompt).replace(/−/g, "-"), a = val(q), m = p.match(/\\(sin|cos|tan) \\theta = (-?[\d.]+) for/);
  const sols = (q.solution[0] ?? "").match(/\d+(?:\.\d+)?(?=°)/g)?.map(Number);
  if (!m || a === null || !sols || sols.length !== 2) return null;
  const fn = Math[m[1] as "sin" | "cos" | "tan"], k = Number(m[2]), rad = (d: number) => (d * Math.PI) / 180;
  if (sols.some((d) => Math.abs(fn(rad(d)) - k) > 1e-6) || ![Math.min(...sols), Math.max(...sols), sols[0] + sols[1]].includes(a)) return null;
  const curves: { pts: [number, number][]; label?: string; dashed?: boolean }[] = [];
  let run: [number, number][] = [];
  for (let d = 0; d <= 360; d += 5) { const y = fn(rad(d)); if (m[1] === "tan" && (Math.abs(y) > 3 || Math.abs(d - 90) < 1 || Math.abs(d - 270) < 1)) { if (run.length) curves.push({ pts: run }); run = []; continue; } run.push([d, Math.round(y * 1e4) / 1e4]); }
  if (run.length) curves.push({ pts: run });
  curves[0].label = `y = ${m[1]} θ`;
  curves.push({ pts: [[0, k], [360, k]], dashed: true });
  const g = graph(curves, [0, 360, 90], `The graph of y = ${m[1]} θ from 0° to 360°, with the line y = ${k} across it. They meet at θ = ${sols[0]}° and θ = ${sols[1]}°, which are the two solutions.`, { marks: sols.map((d, i) => ({ x: d, y: k, label: i ? undefined : `${sols[0]}° and ${sols[1]}°` })) });
  return { figure: m[1] === "tan" ? { ...g, yMin: -3, yMax: 3, yStep: 1 } : g };
};

const trigIdentities: Builder = (q) => {
  const p = plain(q.prompt);
  const identity = /1 \+ \\tan\^2/.test(p) ? "1 + tan²θ = 1 ÷ cos²θ" : /find \\tan/.test(p) ? "tan θ = sin θ ÷ cos θ" : /\\sin\^2\\theta = .*find \\cos\^2/.test(p) ? "sin²θ + cos²θ = 1" : "";
  if (!identity) return null;
  const built = q.solution.length === 1 ? { figure: table(["Step", "Working"], [["Put the values in", flat(q.solution[0]).replace(/\.$/, "")]], "") } : solutionTable(q, ["Step", "Working"]);
  if (!built || built.figure.type !== "table") return null;
  const rows = [["The identity", identity], ...built.figure.rows];
  return { figure: { ...built.figure, rows, alt: `Using ${identity}. ${rows.slice(1).map((r) => `${r[0]}: ${r[1]}`).join(". ")}.` } };
};

// ---------------------------------------------------------------------------------------------- constant acceleration (the "suvat" quantities)
const suvat: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  if (a === null) return null;
  let m = p.match(/moving at (\d+) m\/s\. They accelerate at a constant rate of (\d+) m\/s² for (\d+) seconds\. Find their final speed/);
  if (m) {
    const [u, ac, t] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return u + ac * t === a ? { figure: table(["Quantity", "Value"], [["u  starting speed", `${u} m/s`], ["v  final speed", "?"], ["a  acceleration", `${ac} m/s²`], ["t  time", `${t} s`], ["Use  v = u + at", `v = ${u} + ${ac} × ${t} = ${a} m/s`]], `Starting speed ${u}, acceleration ${ac} for ${t} seconds: v = u + at = ${u} + ${ac} × ${t} = ${a} m/s.`) } : null;
  }
  m = p.match(/moving at (\d+) m\/s accelerates at a constant rate to (\d+) m\/s in (\d+) seconds\. How far/);
  if (m) {
    const [u, v, t] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return ((u + v) / 2) * t === a ? { figure: table(["Quantity", "Value"], [["s  distance", "?"], ["u  starting speed", `${u} m/s`], ["v  final speed", `${v} m/s`], ["t  time", `${t} s`], ["Use  s = ½(u + v)t", `s = ½ × (${u} + ${v}) × ${t} = ${a} m`]], `Average speed (${u} + ${v}) ÷ 2 = ${(u + v) / 2}, times ${t} seconds, is ${a} metres.`) } : null;
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- the binomial distribution, as its bars
const choose = (n: number, k: number) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };
export const binomialPmf = (n: number, p: number) => Array.from({ length: n + 1 }, (_, k) => choose(n, k) * p ** k * (1 - p) ** (n - k));
const binomialDist: Builder = (q) => {
  const m = plain(q.prompt).match(/X ∼ B\((\d+), ([\d.]+)\)|X \\sim B\((\d+), ([\d.]+)\)/), a = val(q);
  if (!m || a === null) return null;
  const n = Number(m[1] ?? m[3]), pr = Number(m[2] ?? m[4]);
  if (n > 12) return null;
  const pmf = binomialPmf(n, pr);
  return { figure: { type: "bars", items: pmf.map((v, k) => ({ label: String(k), value: Math.round(v * 1000) / 10 })), yLabel: "P(X = k) as a percentage", alt: `The probabilities for X from 0 to ${n} when X is binomial with n = ${n} and p = ${pr}: ${pmf.map((v, k) => `${k}: ${(v * 100).toFixed(1)}%`).join(", ")}. The mean np is ${num(n * pr)} and the variance npq is ${num(Math.round(n * pr * (1 - pr) * 1e6) / 1e6)}.` } };
};

// ---------------------------------------------------------------------------------------------- the normal distribution, as its bell
const phi = (z: number) => Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
const normalDist: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), m = p.match(/N\((\d+), (\d+)\^\{2\}\)/);
  if (!m || a === null) return null;
  const mu = Number(m[1]), sd = Number(m[2]);
  const pts: [number, number][] = Array.from({ length: 33 }, (_, i) => { const z = -4 + i * 0.25; return [Math.round((mu + z * sd) * 100) / 100, Math.round(phi(z) * 1e4) / 1e4] as [number, number]; });
  const make = (extra: { marks?: { x: number; y: number; label?: string }[]; strips?: [number, number][] }, alt: string) => { const g = graph([{ pts, label: "" }], [mu - 4 * sd, mu + 4 * sd, sd], alt, extra); return { ...g, xOrigin: mu, yMin: 0, yMax: 0.5, yStep: 0.1 }; };
  const within = p.match(/within (\d) standard deviations? of the mean/);
  if (within) {
    const k = Number(within[1]);
    if (a !== ({ 1: 68, 2: 95, 3: 99.7 } as Record<number, number>)[k]) return null;
    const strips: [number, number][] = Array.from({ length: 17 }, (_, i) => { const z = -k + (i * 2 * k) / 16; return [mu + z * sd, phi(z)] as [number, number]; });
    return { figure: make({ strips, marks: [{ x: mu - k * sd, y: 0, label: String(mu - k * sd) }, { x: mu + k * sd, y: 0, label: String(mu + k * sd) }] }, `A bell curve with mean ${mu} and standard deviation ${sd}. The shaded middle, from ${mu - k * sd} to ${mu + k * sd} (within ${k} standard deviation${k > 1 ? "s" : ""} of the mean), holds about ${a} percent of the values.`) };
  }
  const zq = p.match(/z-score of the value (\d+)/);
  if (zq) {
    const v = Number(zq[1]), z = (v - mu) / sd;
    return z === a ? { figure: make({ marks: [{ x: mu, y: phi(0), label: `mean ${mu}` }, { x: v, y: phi(z), label: `${v}: z = ${num(z)}` }] }, `A bell curve with mean ${mu} and standard deviation ${sd}. The value ${v} is (${v} − ${mu}) ÷ ${sd} = ${z} standard deviations from the mean.`) } : null;
  }
  const above = p.match(/the score that is (\d) standard deviations? above the mean/);
  if (above) {
    const k = Number(above[1]), v = mu + k * sd;
    return v === a ? { figure: make({ marks: [{ x: mu, y: phi(0), label: `mean ${mu}` }, { x: v, y: phi(k), label: `${v}` }] }, `A bell curve with mean ${mu} and standard deviation ${sd}. ${k} standard deviation${k > 1 ? "s" : ""} above the mean is ${mu} + ${k} × ${sd} = ${v}.`) } : null;
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- binomial expansion coefficients, from Pascal's triangle
const binomialCoefficient: Builder = (q) => {
  const p = plain(q.prompt).replace(/−/g, "-"), a = val(q), m = p.match(/coefficient of x\^\{(\d+)\} in the expansion of \(1 ([+-]) (\d*)x\)\^\{(\d+)\}/);
  if (!m || a === null) return null;
  const k = Number(m[1]), c = (m[2] === "-" ? -1 : 1) * (m[3] === "" ? 1 : Number(m[3])), n = Number(m[4]);
  if (n > 9 || choose(n, k) * c ** k !== a) return null;
  const rows: (string | number)[][] = Array.from({ length: n + 1 }, (_, r) => [`n = ${r}`, Array.from({ length: r + 1 }, (_, i) => choose(r, i)).join("   ")]);
  rows.push([`Row ${n}, position ${k}`, `${choose(n, k)}`], [`Multiply by (${num(c)})^${k}`, `${choose(n, k)} × ${num(c ** k)} = ${num(a)}`]);
  return { figure: table(["Pascal's triangle", "Coefficients"], rows, `Row ${n} of Pascal's triangle is ${Array.from({ length: n + 1 }, (_, i) => choose(n, i)).join(", ")}. The number for x to the ${k} is ${choose(n, k)}. Multiplying by (${c})^${k} = ${c ** k} gives ${a}.`) };
};

// ---------------------------------------------------------------------------------------------- parametric equations
const parametric: Builder = (q) => {
  const p = plain(q.prompt).replace(/−/g, "-"), a = val(q), m = p.match(/x = (\d+)t ([+-]) (\d+) and y = (\d+)t\^2 ([+-]) (\d+)\. (.*)$/);
  if (!m || a === null) return null;
  const [xa, xs, xb, ya, ys, yb] = [Number(m[1]), m[2], Number(m[3]), Number(m[4]), m[5], Number(m[6])], X = (t: number) => xa * t + (xs === "-" ? -1 : 1) * xb, Y = (t: number) => ya * t * t + (ys === "-" ? -1 : 1) * yb;
  const rest = m[7];
  const yAt = rest.match(/Find the y-coordinate when t = (-?\d+)/), tAt = rest.match(/Find the value of t at the point where x = (-?\d+)/);
  let upTo = NaN, ok = false;
  if (yAt) { upTo = Number(yAt[1]); ok = Y(upTo) === a; }
  if (tAt) { upTo = a; ok = X(a) === Number(tAt[1]); }
  if (!ok || !Number.isFinite(upTo) || upTo < 0 || upTo > 9) return /Find dy\/dx|frac\{dy\}\{dx\}/.test(rest) ? solutionTable(q, ["Step", "Working"]) : null;
  const rows = Array.from({ length: upTo + 1 }, (_, t) => [t, num(X(t)), num(Y(t))]);
  return { figure: table(["t", "x", "y"], rows, `Each value of t gives a point: ${rows.map((r) => `t = ${r[0]}: (${r[1]}, ${r[2]})`).join("; ")}.`) };
};

// ---------------------------------------------------------------------------------------------- sum to infinity
const sumToInfinity: Builder = (q) => {
  const p = plain(q.prompt).replace(/−/g, "-"), a = val(q), m = p.match(/series (-?[\d.]+) \+ (-?[\d.]+) \+ (-?[\d.]+)/);
  if (!m || a === null) return null;
  const [t1, t2] = [Number(m[1]), Number(m[2])], r = t2 / t1, S = t1 / (1 - r);
  if (Math.abs(r) >= 1 || Math.abs(S - a) > 1e-9) return null;
  let sum = 0; const rows: (string | number)[][] = [];
  for (let n = 1; n <= 8; n++) { const term = t1 * r ** (n - 1); sum += term; rows.push([n, num(Math.round(term * 1e4) / 1e4), num(Math.round(sum * 1e4) / 1e4)]); }
  rows.push(["on and on…", "", `${t1} ÷ (1 − ${num(r)}) = ${num(S)}`]);
  return { figure: table(["n", "Term", "Sum so far"], rows, `Each term is ${num(r)} times the one before. The running total creeps towards ${S}, which is a ÷ (1 − r) = ${t1} ÷ (1 − ${r}).`) };
};

// ---------------------------------------------------------------------------------------------- differential equations, kinematics, Newton-Raphson
const differentialEquations: Builder = (q) => solutionTable(q, ["Step", "Working"], flat(plain(q.prompt).replace(/ What is.*$/, "")));

const kinematics: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), g = p.match(/displacement s = (.+?) metres\. What is its velocity|velocity v = (.+?) m s⁻¹\. What is its acceleration/);
  if (!g || a === null || q.solution.length < 2) return solutionTable(q, ["Step", "Working"]);
  const isS = g[1] !== undefined, given = flat(g[1] ?? g[2]), lines = q.solution.map((l) => flat(l).replace(/\.$/, ""));
  return { figure: { type: "flow", steps: [{ text: `${isS ? "s" : "v"} = ${given}`, kind: "in" }, { text: "Differentiate", kind: "step" }, { text: lines[0], kind: "step" }, { text: lines[1], kind: "out" }], alt: `${isS ? "Displacement s" : "Velocity v"} is ${given}. Differentiating gives ${lines[0]}. ${lines[1]}.` } };
};

const newtonRaphson: Builder = (q) => {
  const p = plain(q.prompt).replace(/−/g, "-"), a = val(q), m = p.match(/Newton-Raphson on f\(x\) = x\^\{2\} - (\d+) with x_1 = (-?\d+) to find x_(\d)/);
  if (!m || a === null) return solutionTable(q, ["Step", "Working"]);
  const k = Number(m[1]), steps = Number(m[3]) - 1;
  let x = Number(m[2]); const rows: (string | number)[][] = [];
  for (let n = 1; n <= steps; n++) { const f = x * x - k, d = 2 * x, next = x - f / d; rows.push([`x${n}`, num(Math.round(x * 1e4) / 1e4), num(Math.round(f * 1e4) / 1e4), num(Math.round(d * 1e4) / 1e4), num(Math.round(next * 1e4) / 1e4)]); x = next; }
  return Math.abs(x - a) < 6e-4 ? { figure: table(["Start", "x", "f(x)", "f′(x) = 2x", "x − f ÷ f′"], rows, `Newton-Raphson on f(x) = x² − ${k}: ${rows.map((r) => `from ${r[0]} = ${r[1]}, f = ${r[2]}, f′ = ${r[3]}, next x = ${r[4]}`).join("; ")}.`) } : null;
};

// ---------------------------------------------------------------------------------------------- vectors in three dimensions
const columnVec = (s: string): number[][] => [...s.matchAll(/\\begin\{pmatrix\} (-?\d+) \\\\ (-?\d+) \\\\ (-?\d+) \\end\{pmatrix\}/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
const vectors3d: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), vs = columnVec(p), pt = p.match(/A\((-?\d+), (-?\d+), (-?\d+)\) and B\((-?\d+), (-?\d+), (-?\d+)\)/);
  if (a === null) return null;
  const axes = ["x", "y", "z"];
  if (/length of the vector/.test(p) && vs.length === 1) {
    const v = vs[0], sq = v.map((c) => c * c), tot = sq.reduce((t, c) => t + c, 0);
    return Math.sqrt(tot) === a ? { figure: table(["Part", "Value", "Squared"], [...v.map((c, i) => [axes[i], num(c), sq[i]]), ["Add the squares", "", tot], ["Square root", "", `√${tot} = ${a}`]], `The length is the square root of the sum of the squares: ${sq.join(" + ")} = ${tot}, and √${tot} = ${a}.`) } : null;
  }
  if (/a \\cdot \\mathbf\{b\}|\\mathbf\{a\} \\cdot/.test(p) && vs.length === 2) {
    const [u, v] = vs, pr = u.map((c, i) => c * v[i]), tot = pr.reduce((t, c) => t + c, 0);
    return tot === a ? { figure: table(["Part", "a", "b", "a × b"], [...u.map((c, i) => [axes[i], num(c), num(v[i]), num(pr[i])]), ["Add them up", "", "", num(tot)]], `The dot product multiplies matching parts and adds: ${pr.map(num).join(" + ")} = ${tot}.`) } : null;
  }
  if (pt) {
    const A = [Number(pt[1]), Number(pt[2]), Number(pt[3])], B = [Number(pt[4]), Number(pt[5]), Number(pt[6])], d = B.map((c, i) => c - A[i]), sq = d.map((c) => c * c), tot = sq.reduce((t, c) => t + c, 0);
    return Math.sqrt(tot) === a ? { figure: table(["Part", "A", "B", "B − A", "Squared"], [...A.map((c, i) => [axes[i], num(c), num(B[i]), num(d[i]), sq[i]]), ["Add the squares", "", "", "", tot], ["Square root", "", "", "", `√${tot} = ${a}`]], `AB is B − A = (${d.join(", ")}). Its length is √(${sq.join(" + ")}) = √${tot} = ${a}.`) } : null;
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- forces and moments
const forcesMoments: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  if (a === null) return null;
  let m = p.match(/A force of (\d+) N acts (\d+) m to the left of the pivot\. A second force acts (\d+) m to the right/);
  if (m) {
    const [f1, d1, d2] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return f1 * d1 === a * d2 ? { figure: table(["Side of the pivot", "Force × distance"], [["Left", `${f1} N × ${d1} m = ${f1 * d1} N m`], ["Right", `F × ${d2} m`], ["Balanced: left = right", `F × ${d2} = ${f1 * d1}`], ["Answer", `F = ${a} N`]], `Balance means turning effects are equal: ${f1} × ${d1} = F × ${d2}, so F = ${a} N.`) } : null;
  }
  m = p.match(/A force of (\d+) N acts at (\d+)° to the horizontal\. What is the horizontal component/);
  if (m) return { figure: { type: "rtriangle", base: "horizontal = ?", height: "vertical", hyp: `${m[1]} N`, angle: `${m[2]}°`, alt: `A force of ${m[1]} N at ${m[2]}° to the horizontal, drawn as the long side of a right-angled triangle. The horizontal part is next to the angle, so it is ${m[1]} × cos ${m[2]}° = ${a} N.` } };
  m = p.match(/A (\d+) kg box is pushed with a force of (\d+) N along a rough floor\. The friction force is (\d+) N/);
  if (m) {
    const [mass, push, fr] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return (push - fr) / mass === a ? { figure: { type: "formula-triangle", top: "F", left: "m", right: "a", find: "right", values: { top: `${push - fr} N`, left: `${mass} kg` }, alt: `Newton's second law F = ma. The resultant force is ${push} − ${fr} = ${push - fr} N and the mass is ${mass} kg, so a = F ÷ m = ${a} m per second squared.` } } : null;
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- projectile motion
const projectiles: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  if (a === null) return null;
  let m = p.match(/dropped from rest from a height of ([\d.]+) m\. Use g = ([\d.]+)/);
  if (m) {
    const h = Number(m[1]), g = Number(m[2]);
    return Math.abs(0.5 * g * a * a - h) < 1e-9 && a <= 8 ? { figure: table(["t (s)", "Distance fallen (m)"], Array.from({ length: a + 1 }, (_, t) => [t, num(Math.round(0.5 * g * t * t * 100) / 100)]), `Distance fallen is ½ × ${g} × t². It reaches ${h} m at t = ${a} seconds.`) } : null;
  }
  m = p.match(/thrown horizontally at (\d+) m s⁻¹ from a cliff ([\d.]+) m high\. It takes (\d+) s to hit the ground/);
  if (m) {
    const [u, h, t] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return u * t === a && t <= 8 ? { figure: table(["t (s)", "Across (m)", "Down (m)"], Array.from({ length: t + 1 }, (_, i) => [i, u * i, num(Math.round(4.9 * i * i * 100) / 100)]), `Across the ground it moves at a steady ${u} m per second, so in ${t} s it covers ${a} m. It falls ${h} m in the same time.`) } : null;
  }
  m = p.match(/falls from rest for (\d+) s\. Use v = gt with g = ([\d.]+)/);
  if (m) {
    const t = Number(m[1]), g = Number(m[2]);
    return Math.abs(g * t - a) < 1e-9 && t <= 8 ? { figure: table(["t (s)", "Speed v = gt (m/s)"], Array.from({ length: t + 1 }, (_, i) => [i, num(Math.round(g * i * 100) / 100)]), `Speed grows by ${g} m per second every second, so after ${t} s it is ${a} m per second.`) } : null;
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- topics where only some forms of question needed a picture
// (a question that already comes with its own figure is left alone)
const venn: Builder = (q) => {
  if (q.figure) return null;
  const p = plain(q.prompt);
  const m = p.match(/(\d+) (?:children )?play football and (\d+) play tennis\. (\d+) play both/);
  if (!m) return null;
  const [f, t, both] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const total = p.match(/There are (\d+) children/)?.[1];
  return { figure: { type: "venn", labelA: "Football", labelB: "Tennis", a: f - both, both, b: t - both, alt: `A Venn diagram: ${f - both} children play football only, ${both} play both, ${t - both} play tennis only. ${f - both + both + t - both} play at least one of the sports${total ? `, so ${Number(total) - (f + t - both)} of the ${total} play neither` : ""}.` } };
};

const areaPerimeter: Builder = (q) => {
  if (q.figure) return null;
  const rects = [...new Set([...plain(q.prompt).matchAll(/(\d+) cm by (\d+) cm/g)].map((m) => `${m[1]}x${m[2]}`))].map((k2) => k2.split("x").map(Number) as [number, number]); // a rectangle named twice is drawn once
  if (!rects.length || rects.length > 2) return null;
  const k = 9 / Math.max(...rects.flat()), box = (x0: number, w: number, h: number): [number, number][] => [[x0, 0], [x0 + w, 0], [x0 + w, h], [x0, h]];
  const labels: { x: number; y: number; text: string; anchor?: "start" | "middle" | "end" }[] = [];
  const polys: [number, number][][] = [];
  let x0 = 0;
  for (const [w, h] of rects) { polys.push(box(x0, w * k, h * k)); labels.push({ x: x0 + (w * k) / 2, y: h * k + 0.8, text: `${w} cm` }, { x: x0 + w * k + 0.4, y: (h * k) / 2, text: `${h} cm`, anchor: "start" }); x0 += w * k + 3.5; }
  const area = rects.map(([w, h]) => w * h);
  return { figure: { type: "polygon", pts: polys[0], ...(polys[1] ? { more: [polys[1]] } : {}), labels, alt: `${rects.map(([w, h]) => `a ${w} cm by ${h} cm rectangle (area ${w * h} cm², perimeter ${2 * (w + h)} cm)`).join(" and ")}. ${rects.length > 1 && area[0] === area[1] ? "The areas are the same, but the perimeters are different." : ""}` } };
};

const prismVolume: Builder = (q) => {
  if (q.figure) return null;
  const p = plain(q.prompt), a = val(q);
  if (a === null) return null;
  let m = p.match(/cross-section area of (\d+) cm² and a length of (\d+) cm\. Work out its volume/), area = 0, len = 0, how = "";
  if (m) { area = Number(m[1]); len = Number(m[2]); how = `${area} × ${len} = ${area * len} cm³`; if (area * len !== a) return null; }
  m = p.match(/triangle end with base (\d+) cm and height (\d+) cm\. The prism is (\d+) cm long/);
  if (m) { area = (Number(m[1]) * Number(m[2])) / 2; len = Number(m[3]); how = `${area} × ${len} = ${area * len} cm³`; if (area * len !== a) return null; }
  m = p.match(/volume of (\d+) cm³ and a cross-section area of (\d+) cm²\. How long/);
  if (m) { area = Number(m[2]); len = Number(m[1]) / area; how = `${m[1]} ÷ ${area} = ${len} cm`; if (len !== a) return null; }
  if (!area || !len || len > 14) return null;
  return { figure: { type: "bar-model", rows: [{ label: `${len} slices, each ${num(area)} cm²`, segments: Array.from({ length: len }, (_, i) => ({ label: num(area), size: 1, tone: (i % 2 ? "b" : "a") as "a" | "b" })), note: how }], alt: `A prism is a stack of ${len} identical slices, each with the cross-section area ${area} cm². The volume is ${area} × ${len} = ${area * len} cm³.` } };
};

const vectors2d: Builder = (q) => {
  if (q.figure) return null;
  const p = plain(q.prompt), a = val(q);
  if (a === null) return null;
  const len = p.match(/length of the vector \\begin\{pmatrix\} (-?\d+) \\\\ (-?\d+) \\end\{pmatrix\}/);
  if (len) { const [x, y] = [Math.abs(Number(len[1])), Math.abs(Number(len[2]))]; return Math.hypot(x, y) === a ? { figure: { type: "rtriangle", base: `${x}`, height: `${y}`, hyp: "?", alt: `The vector (${len[1]}, ${len[2]}) drawn as the two short sides ${x} and ${y} of a right-angled triangle. Its length is the long side: √(${x}² + ${y}²) = ${a}.` } } : null; }
  const vs = [...p.matchAll(/\\begin\{pmatrix\} (-?\d+) \\\\ (-?\d+) \\end\{pmatrix\}/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const ex = p.match(/(top|bottom) number of (\d*)\\mathbf\{a\} ([+-]) (\d*)\\mathbf\{b\}/);
  if (vs.length === 2 && ex) {
    const ca = ex[2] === "" ? 1 : Number(ex[2]), cb = (ex[3] === "-" ? -1 : 1) * (ex[4] === "" ? 1 : Number(ex[4])), res = [0, 1].map((i) => ca * vs[0][i] + cb * vs[1][i]);
    if (res[ex[1] === "top" ? 0 : 1] !== a) return null;
    const name = `${ca === 1 ? "" : ca}a ${cb < 0 ? "−" : "+"} ${Math.abs(cb) === 1 ? "" : Math.abs(cb)}b`;
    return { figure: table(["", "a", "b", name], [["top", num(vs[0][0]), num(vs[1][0]), num(res[0])], ["bottom", num(vs[0][1]), num(vs[1][1]), num(res[1])]], `Work on the top numbers and the bottom numbers separately. ${name} has top ${res[0]} and bottom ${res[1]}.`) };
  }
  return null;
};

const regression: Builder = (q) => {
  if (q.figure) return null;
  const p = plain(q.prompt).replace(/−/g, "-"), a = val(q), line = p.match(/y = (\d+) \+ (\d+)x/);
  if (!line || a === null) return null;
  const c = Number(line[1]), m = Number(line[2]), y = (x: number) => c + m * x;
  const at = p.match(/when the temperature is (\d+)°C/), up = p.match(/goes up by (\d+)°C/), res = p.match(/When x = (\d+) the observed value of y is (\d+)/);
  let x1 = 0, marks: { x: number; y: number; label?: string }[] = [], alt = "";
  if (at) { x1 = Number(at[1]); if (y(x1) !== a) return null; marks = [{ x: x1, y: y(x1), label: `(${x1}, ${y(x1)})` }]; alt = `The regression line y = ${c} + ${m}x. At x = ${x1} it gives ${y(x1)}.`; }
  else if (up) { const d = Number(up[1]); if (m * d !== a) return null; x1 = d; marks = [{ x: 0, y: y(0), label: `${y(0)}` }, { x: d, y: y(d), label: `${y(d)}` }]; alt = `The regression line y = ${c} + ${m}x. Going ${d} along, the line rises ${m} × ${d} = ${a}.`; }
  else if (res) { x1 = Number(res[1]); const obs = Number(res[2]); if (obs - y(x1) !== a) return null; marks = [{ x: x1, y: y(x1), label: `line ${y(x1)}` }, { x: x1, y: obs, label: `data ${obs}` }]; alt = `The regression line y = ${c} + ${m}x predicts ${y(x1)} at x = ${x1}, but the observed value is ${obs}. The residual (observed − predicted) is ${a}.`; }
  else return null;
  const xMax = Math.max(x1 + 2, 6);
  return { figure: graph([{ pts: [[0, y(0)], [xMax, y(xMax)]], label: `y = ${c} + ${m}x` }], [0, xMax, xMax <= 10 ? 1 : 2], alt, { marks }) };
};

const correlation: Builder = (q) => {
  if (q.figure) return null;
  const kind = /positive correlation/.test(q.solution.join(" ")) ? 1 : /negative correlation/.test(q.solution.join(" ")) ? -1 : /no correlation/.test(q.solution.join(" ")) ? 0 : NaN;
  if (Number.isNaN(kind)) return null;
  const wobble = [0.6, -0.4, 0.3, -0.7, 0.5, -0.2, 0.7, -0.5, 0.2, -0.6], none = [7, 2, 8, 3, 6, 1, 9, 4, 5, 8];
  const pts: [number, number][] = Array.from({ length: 10 }, (_, i) => [i + 1, kind === 0 ? none[i] : Math.round((kind === 1 ? i + 1 : 10 - i) * 0.9 + 0.5 + wobble[i]) ]);
  return { figure: { type: "scatter", points: pts, xLabel: "first quantity", yLabel: "second quantity", alt: `A scatter graph showing ${kind === 1 ? "positive correlation: the dots rise from left to right" : kind === -1 ? "negative correlation: the dots fall from left to right" : "no correlation: the dots are scattered with no pattern"}.` } };
};

const similarShapes: Builder = (q) => {
  if (q.figure) return null;
  const p = plain(q.prompt), a = val(q), m = p.match(/enlargement of triangle A with scale factor (\d+)\. A side on triangle A is (\d+) cm/);
  if (m && a !== null) {
    const k = Number(m[1]), s = Number(m[2]);
    return k * s === a && k <= 6 ? { figure: { type: "bar-model", rows: [{ label: "Triangle A", segments: [{ label: `${s} cm`, size: s, tone: "a" }] }, { label: "Triangle B", segments: Array.from({ length: k }, (_, i) => ({ label: `${s}`, size: s, tone: (i % 2 ? "b" : "a") as "a" | "b" })), note: `${k} × ${s} = ${a} cm` }], alt: `The matching side on triangle B is ${k} times as long as the ${s} cm side on triangle A: ${k} × ${s} = ${a} cm.` } } : null;
  }
  return solutionTable(q, ["Step", "Working"]);
};

export const ADVANCED_BUILDERS: Record<string, Builder> = {
  "arithmetic-series": arithmetic, "exp-growth": growth, "log-laws": logLaws, "partial-fractions": partialFractions, "proof-counterexample": counterexample,
  "sigma-series": sigma, "factor-theorem": factorTheorem, modulus,
  differentiate, "integrate-polynomials": integratePolynomials, "definite-integrals": definiteIntegrals, "product-quotient": productQuotient, "chain-rule": chainRule,
  "differentiate-exp-trig": diffExpTrig, "integrate-substitution": integrateSubstitution,
  "trig-equations": trigEquations, "trig-identities": trigIdentities, "constant-acceleration": suvat, "binomial-dist": binomialDist, "normal-dist": normalDist,
  "binomial-coefficient": binomialCoefficient, "parametric-equations": parametric, "sum-to-infinity": sumToInfinity, "differential-equations": differentialEquations,
  "kinematics-calculus": kinematics, "newton-raphson": newtonRaphson, "vectors-3d": vectors3d, "forces-moments": forcesMoments, projectiles,
  "venn-counts": venn, "area-perimeter-link": areaPerimeter, "volume-prisms": prismVolume, vectors: vectors2d, "regression-line": regression, correlation, "similar-shapes": similarShapes,
};
