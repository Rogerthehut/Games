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

export const ADVANCED_BUILDERS: Record<string, Builder> = {
  "arithmetic-series": arithmetic, "exp-growth": growth, "log-laws": logLaws, "partial-fractions": partialFractions, "proof-counterexample": counterexample,
  "sigma-series": sigma, "factor-theorem": factorTheorem, modulus,
};
