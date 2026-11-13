import { int, pick } from "../engine/rng";
import type { Question, Skill } from "../engine/types";
import { num } from "./ks2";

/**
 * Topics added after comparing quarter with sample GCSE and A-level papers (docs/SATS_COVERAGE.md, "Secondary papers"): the equation of a circle,
 * algebraic proof in the way GCSE asks for it, and implicit differentiation. Each question works out its own answer.
 */
const TRIPLES: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25]];
const sgn = (n: number, sym = "") => (n === 0 ? sym : n > 0 ? `+ ${n}` : `- ${-n}`);

// ---------------------------------------------------------------------------------------------- the equation of a circle (GCSE higher)
export const circleEquation: Skill = {
  id: "circle-equation", name: "The equation of a circle", stage: "KS4", year: 11, strand: "Geometry", prereqs: ["pythagoras", "circle-area"],
  blurb: "Read and write the equation of a circle with its centre at the origin or elsewhere.",
  explainer: "A circle with its centre at the origin and radius r has the equation x² + y² = r². If the centre is at (a, b), the equation is (x − a)² + (y − b)² = r². The number on the right is the radius squared.",
  parentNote: "Every point on the circle is the same distance r from the centre, and Pythagoras turns that distance into x² + y² = r². The most common mistakes are forgetting that the right-hand side is r² (not r) and getting the signs of the centre the wrong way round.",
  talkAbout: "Why is the number on the right the radius squared and not the radius?",
  generate(r, level): Question {
    const base = { skill: "circle-equation", level } as const;
    if (level === 1) {
      const rad = int(r, 2, 12);
      return { ...base, prompt: `A circle has the equation $x^2 + y^2 = ${rad * rad}$. What is its radius?`, answer: { kind: "number", value: rad }, hint: "The number on the right is the radius squared. Take its square root.", solution: [`$x^2 + y^2 = r^2$, so $r^2 = ${rad * rad}$.`, `$r = \\sqrt{${rad * rad}} = ${rad}$.`], shown: String(rad) };
    }
    if (level === 2) {
      const rad = int(r, 2, 12), a = pick(r, [-4, -3, -2, 2, 3, 4, 5]), b = pick(r, [-5, -3, -1, 1, 2, 4, 6]);
      return { ...base, prompt: `A circle has centre $(${a}, ${b})$ and radius ${rad}. Its equation is $(x ${sgn(-a)})^2 + (y ${sgn(-b)})^2 = k$. What is $k$?`, answer: { kind: "number", value: rad * rad }, hint: "The right-hand side is the radius squared.",
        solution: [`The equation is $(x - a)^2 + (y - b)^2 = r^2$.`, `$r^2 = ${rad} \\times ${rad} = ${rad * rad}$, so $k = ${rad * rad}$.`], shown: String(rad * rad) };
    }
    if (level === 3) {
      const a = pick(r, [-5, -4, -3, -2, 2, 3, 4, 5]), b = pick(r, [-6, -4, -3, -1, 1, 2, 5, 7]), rad = int(r, 2, 9);
      return { ...base, prompt: `A circle has the equation $(x ${sgn(-a)})^2 + (y ${sgn(-b)})^2 = ${rad * rad}$. What are the coordinates of its centre?`, answer: { kind: "multi", fields: [{ label: "x =", value: a }, { label: "y =", value: b }] }, hint: "Change the sign of each number inside the brackets.",
        solution: [`$(x - a)^2 + (y - b)^2 = r^2$ has its centre at $(a, b)$.`, `$x ${sgn(-a)}$ means $x - ${a}$, so $a = ${a}$. $y ${sgn(-b)}$ means $y - ${b}$, so $b = ${b}$.`], shown: `(${a}, ${b})` };
    }
    if (level === 4) {
      const [p, q, h] = pick(r, TRIPLES), on = r() < 0.5, px = on ? p : p + pick(r, [1, 2]);
      return { ...base, prompt: `A circle has the equation $x^2 + y^2 = ${h * h}$. Does the point $(${px}, ${q})$ lie on the circle?`, answer: { kind: "choice", options: [{ text: "Yes" }, { text: "No" }], correct: px * px + q * q === h * h ? 0 : 1 }, hint: "Put the x and y values into x² + y². Is the total the number on the right?",
        solution: [`$${px}^2 + ${q}^2 = ${px * px} + ${q * q} = ${px * px + q * q}$.`, px * px + q * q === h * h ? `That equals ${h * h}, so the point is on the circle.` : `That is not ${h * h}, so the point is not on the circle.`], shown: px * px + q * q === h * h ? "Yes" : "No" };
    }
    const [p, q, h] = pick(r, TRIPLES), find = int(r, 0, 1);
    return { ...base, prompt: `The point $(${find ? p : "a"}, ${find ? "b" : q})$ lies on the circle $x^2 + y^2 = ${h * h}$, and ${find ? `$b$ is positive. Given $${p}^2 + b^2 = ${h * h}$,` : `$a$ is positive. Given $a^2 + ${q}^2 = ${h * h}$,`} find ${find ? "$b$" : "$a$"}.`, answer: { kind: "number", value: find ? q : p }, hint: "Take the known square away from the right-hand side, then take the square root.",
      solution: [find ? `$b^2 = ${h * h} - ${p * p} = ${q * q}$.` : `$a^2 = ${h * h} - ${q * q} = ${p * p}$.`, `${find ? "b" : "a"} $= \\sqrt{${find ? q * q : p * p}} = ${find ? q : p}$.`], shown: String(find ? q : p) };
  },
};

// ---------------------------------------------------------------------------------------------- algebraic proof, as GCSE asks for it
const EXPR: { text: (n: string) => string; at: (n: number) => number }[] = [];
for (const a of [2, 4, 6]) for (const b of [-3, -1, 1, 3, 5, 7]) EXPR.push({ text: (n) => `${a}${n} ${b < 0 ? "−" : "+"} ${Math.abs(b)}`, at: (n) => a * n + b });      // even a, odd b: always odd
for (const a of [2, 4, 6]) for (const b of [0, 2, 4, 6]) EXPR.push({ text: (n) => (b ? `${a}${n} + ${b}` : `${a}${n}`), at: (n) => a * n + b });             // even a, even b: always even
for (const a of [1, 3, 5]) for (const b of [-2, -1, 1, 2, 3]) EXPR.push({ text: (n) => `${a === 1 ? "" : a}${n} ${b < 0 ? "−" : "+"} ${Math.abs(b)}`, at: (n) => a * n + b });    // odd a: not always either
const always = (e: { at: (n: number) => number }, parity: 0 | 1) => [0, 1, 2, 3, 4, 5, 6, 7].every((n) => Math.abs(e.at(n) % 2) === parity);

export const algebraicProof: Skill = {
  id: "algebraic-proof", name: "Algebraic proof", stage: "KS4", year: 11, strand: "Algebra", prereqs: ["expand-double", "factorise-quad"],
  blurb: "Show that an expression is always even, odd or a multiple, and use algebra to explain why.",
  explainer: "To prove something is always true, use algebra for any whole number n. An even number is 2n, an odd number is 2n + 1, and a multiple of 3 is 3n. If an expression can be written in one of these forms for every n, the statement is always true.",
  parentNote: "Trying a few numbers can show a statement might be true; algebra shows it always is. Ask them to write the expression, factorise it, and say what the factor tells them: 2(n + 3) has a factor of 2, so it must be even.",
  talkAbout: "Why does a few examples not prove that a statement is always true?",
  generate(r, level): Question {
    const base = { skill: "algebraic-proof", level } as const;
    if (level <= 2) {
      const parity = (level === 1 ? 1 : 0) as 0 | 1, rightPool = EXPR.filter((e) => always(e, parity)), wrongPool = EXPR.filter((e) => !always(e, parity));
      const right = pick(r, rightPool), wrongs: typeof EXPR = [];
      while (wrongs.length < 3) { const w = pick(r, wrongPool); if (!wrongs.includes(w) && w.text("n") !== right.text("n")) wrongs.push(w); }
      const opts = [right, ...wrongs].map((e) => e.text("n")); const order = [0, 1, 2, 3].sort(() => r() - 0.5), options = order.map((i) => ({ text: opts[i] }));
      return { ...base, prompt: `$n$ is a whole number. Which of these expressions is always ${parity ? "odd" : "even"}?`, answer: { kind: "choice", options, correct: order.indexOf(0) }, hint: parity ? "An odd number is one more than an even number, and even numbers are multiples of 2." : "An even number is a multiple of 2, so try to write it as 2 × something.",
        solution: [`${right.text("n")} ${parity ? "is always odd: the part with n is a multiple of 2, and the number added or taken off is odd" : "is always even: both parts are multiples of 2"}.`, `Try n = 1, 2, 3 in each one to see that the others are sometimes ${parity ? "even" : "odd"}.`], shown: right.text("n") };
    }
    if (level === 3) {
      const k = pick(r, [3, 4, 5, 6]), mult = (a: number, b: number) => (a % k === 0 && b % k === 0);
      const cands: [number, number][] = [];
      for (const a of [k, 2 * k, 3 * k, k + 1, k + 2, 2 * k + 1]) for (const b of [0, k, 2 * k, 1, 2, k + 1]) cands.push([a, b]);
      const right = pick(r, cands.filter(([a, b]) => mult(a, b) && b !== 0)), wrong = cands.filter(([a, b]) => !mult(a, b));
      const w: [number, number][] = []; while (w.length < 3) { const c = pick(r, wrong); if (!w.some((x) => x[0] === c[0] && x[1] === c[1])) w.push(c); }
      const fmt = ([a, b]: [number, number]) => `${a}n ${b ? `+ ${b}` : ""}`.trim(), all = [right, ...w], order = [0, 1, 2, 3].sort(() => r() - 0.5);
      return { ...base, prompt: `$n$ is a whole number. Which of these expressions is always a multiple of ${k}?`, answer: { kind: "choice", options: order.map((i) => ({ text: fmt(all[i]) })), correct: order.indexOf(0) }, hint: `Can you take out a factor of ${k}?`,
        solution: [`${fmt(right)} = ${k}(${right[0] / k}n${right[1] ? ` + ${right[1] / k}` : ""}), which is ${k} times a whole number.`, "The others cannot be written with a factor outside the bracket."], shown: fmt(right) };
    }
    // levels 4 and 5: expanding to show a pattern
    const a = int(r, 1, 6);
    if (level === 4) return { ...base, prompt: `Expand and simplify $(n + ${a})^2 - (n - ${a})^2$ and write it as $kn$. What is $k$?`, answer: { kind: "number", value: 4 * a }, hint: "Expand both brackets. The n² terms and the number terms cancel.",
      solution: [`$(n + ${a})^2 = n^2 + ${2 * a}n + ${a * a}$.`, `$(n - ${a})^2 = n^2 - ${2 * a}n + ${a * a}$.`, `Taking one from the other: $${4 * a}n$, so $k = ${4 * a}$. It is always a multiple of ${4 * a}.`], shown: String(4 * a) };
    return { ...base, prompt: `Expand and simplify $(n + ${a})^2 - n^2 - ${a * a}$ and write it as $kn$. What is $k$?`, answer: { kind: "number", value: 2 * a }, hint: "Expand the bracket. Some terms cancel.",
      solution: [`$(n + ${a})^2 = n^2 + ${2 * a}n + ${a * a}$.`, `Take away $n^2$ and $${a * a}$: $${2 * a}n$, so $k = ${2 * a}$. The result is always even.`], shown: String(2 * a) };
  },
};

// ---------------------------------------------------------------------------------------------- implicit differentiation (A-level)
export const implicitDifferentiation: Skill = num({
  id: "implicit-differentiation", name: "Implicit differentiation", stage: "KS5", year: 13, strand: "Calculus", prereqs: ["chain-rule", "product-quotient"],
  blurb: "Find the gradient of a curve whose equation mixes x and y.",
  explainer: "When y is not on its own, differentiate every term with respect to x. Terms in y need the chain rule, so d/dx of y² is 2y × dy/dx. Then rearrange for dy/dx.",
  parentNote: "The new idea is that each y term picks up a dy/dx, because y depends on x. After differentiating, collect the dy/dx terms on one side and divide.",
  talkAbout: "Why does differentiating y² with respect to x give 2y × dy/dx?",
}, (r, l) => {
  const t = implicitTask(r, l);
  return { ...t, shown: String(Number(t.value.toFixed(4))) };
});

function implicitTask(r: () => number, l: number): { prompt: string; value: number; hint: string; solution: string[] } {
  const form = l >= 5 ? int(r, 1, 4) : l;
  if (form === 1) { const [x, y, h] = pick(r, [[3, 4, 5], [6, 8, 10]] as [number, number, number][]); const sx = r() < 0.5 ? 1 : -1;
    return { prompt: `The curve $x^2 + y^2 = ${h * h}$ passes through $(${sx * x}, ${y})$. Use implicit differentiation to find $\\frac{dy}{dx}$ at this point.`, value: (-sx * x) / y, hint: "Differentiate each term: 2x + 2y dy/dx = 0. Then solve for dy/dx.",
      solution: ["$2x + 2y\\frac{dy}{dx} = 0$.", `$\\frac{dy}{dx} = -\\frac{x}{y}$.`, `At $(${sx * x}, ${y})$: $-\\frac{${sx * x}}{${y}} = ${(-sx * x) / y}$.`] }; }
  if (form === 2) {
    let c = 4, y = 2, tries = 0;
    do { c = pick(r, [2, 4, 8]); y = pick(r, [2, 4, 8]); tries++; } while ((y * y) % c !== 0 && tries < 40);
    if ((y * y) % c !== 0) { c = 4; y = 2; }
    const x = (y * y) / c;
    return { prompt: `The curve $y^2 = ${c}x$ passes through $(${x}, ${y})$. Find $\\frac{dy}{dx}$ at this point.`, value: c / (2 * y), hint: "Differentiate both sides with respect to x. Remember the chain rule for y².",
      solution: [`$2y\\frac{dy}{dx} = ${c}$.`, `$\\frac{dy}{dx} = \\frac{${c}}{2y}$.`, `At $y = ${y}$: $\\frac{${c}}{${2 * y}} = ${c / (2 * y)}$.`] };
  }
  if (form === 3) { const x = pick(r, [2, 4, 5, 8]), y = int(r, 1, 6);
    return { prompt: `The curve $xy = ${x * y}$ passes through $(${x}, ${y})$. Find $\\frac{dy}{dx}$ at this point.`, value: -y / x, hint: "Use the product rule on xy: y + x dy/dx.", solution: [`Product rule: $y + x\\frac{dy}{dx} = 0$.`, `$\\frac{dy}{dx} = -\\frac{y}{x}$.`, `At $(${x}, ${y})$: $-\\frac{${y}}{${x}} = ${-y / x}$.`] }; }
  const y = pick(r, [1, 2, 5]), x = int(r, 2, 8), c = x * x + 2 * y * y;
  return { prompt: `The curve $x^2 + 2y^2 = ${c}$ passes through $(${x}, ${y})$. Find $\\frac{dy}{dx}$ at this point.`, value: -x / (2 * y), hint: "Differentiate each term: 2x + 4y dy/dx = 0.",
    solution: ["$2x + 4y\\frac{dy}{dx} = 0$.", "$\\frac{dy}{dx} = -\\frac{2x}{4y} = -\\frac{x}{2y}$.", `At $(${x}, ${y})$: $-\\frac{${x}}{${2 * y}} = ${-x / (2 * y)}$.`] };
}

export const secondaryTestSkills: Skill[] = [circleEquation, algebraicProof, implicitDifferentiation];
