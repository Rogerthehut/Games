import type { Question, Skill } from "../engine/types";
import { int, nonZero, pick } from "../engine/rng";
import { add, mul, scale, term, toLatex as polyLatex, trim, type Poly } from "../engine/poly";
import { bracket, dedupeWrong, lin, shuffle, signedInt, sumLatex } from "./helpers";

function collectTerms(r: () => number, level: number): Question {
  let parts: { c: number; d: number }[];
  if (level === 1) parts = [{ c: int(r, 1, 9), d: 1 }, { c: int(r, 1, 9), d: 1 }, { c: nonZero(r, -9, 9), d: 0 }];
  else if (level === 2) {
    const a = int(r, 2, 9);
    let c = int(r, 1, 9);
    if (c === a) c += 1;
    parts = [{ c: a, d: 1 }, { c: nonZero(r, -9, 9), d: 0 }, { c: -c, d: 1 }, { c: nonZero(r, -9, 9), d: 0 }];
  } else {
    const a = int(r, 2, 9), c = int(r, 1, 8);
    parts = [{ c: a, d: 2 }, { c: signedInt(r, 1, 9), d: 1 }, { c: -c, d: 2 }, { c: signedInt(r, 1, 9), d: 0 }, { c: signedInt(r, 1, 6), d: 1 }];
  }
  parts = shuffle(r, parts);
  const total = parts.reduce<Poly>((p, t) => add(p, term(t.c, t.d)), [0]);
  const steps: string[] = [];
  const degrees = [...new Set(parts.map((t) => t.d))].sort((x, y) => y - x);
  for (const d of degrees) {
    const group = parts.filter((t) => t.d === d);
    if (group.length > 1)
      steps.push(`${d === 0 ? "Numbers" : d === 1 ? "$x$ terms" : "$x^{2}$ terms"}: $${sumLatex(group)} = ${polyLatex(term(group.reduce((s, t) => s + t.c, 0), d))}$.`);
  }
  steps.push(`Put them together: $${polyLatex(total)}$.`);
  return {
    skill: "collect-terms", level,
    prompt: `Simplify $${sumLatex(parts)}$.`,
    answer: { kind: "expr", value: total, form: "collected" },
    hint: "Only terms with the same letter and power can be combined. $3x$ and $5x$ are both 'x terms', but $x$ and $x^{2}$ are different.",
    solution: steps,
    shown: `$${polyLatex(total)}$`,
  };
}

function expandSingle(r: () => number, level: number): Question {
  if (level === 3) {
    const a = int(r, 2, 6), b = nonZero(r, -7, 7), c = int(r, 2, 6), d = nonZero(r, -7, 7);
    const ans = add(scale([b, 1], a), scale([d, 1], c));
    return {
      skill: "expand-single", level,
      prompt: `Expand and simplify $${a}${bracket(1, b)} + ${c}${bracket(1, d)}$.`,
      answer: { kind: "expr", value: ans, form: "collected" },
      hint: "Expand each bracket separately first, then collect like terms.",
      solution: [`$${a}${bracket(1, b)} = ${polyLatex(scale([b, 1], a))}$ and $${c}${bracket(1, d)} = ${polyLatex(scale([d, 1], c))}$.`, `Add them: $${polyLatex(ans)}$.`],
      shown: `$${polyLatex(ans)}$`,
    };
  }
  const a = int(r, 2, 9), b = int(r, 1, 5), c = nonZero(r, -9, 9);
  const withX = level === 2;
  const outer: Poly = withX ? [0, a] : [a];
  const inner: Poly = [c, b];
  const ans = mul(outer, inner);
  const wrong = withX ? [c, 0, a * b] : [c, a * b];
  return {
    skill: "expand-single", level,
    prompt: `Expand $${withX ? `${a}x` : a}${bracket(b, c)}$.`,
    answer: { kind: "expr", value: ans, form: "collected" },
    hint: "Multiply everything inside the bracket by the term outside. Don't leave any term behind.",
    solution: [
      `Multiply the first term: $${withX ? `${a}x` : a} \\times ${b === 1 ? "" : b}x = ${polyLatex(mul(outer, [0, b]))}$.`,
      `Multiply the second term: $${withX ? `${a}x` : a} \\times ${c < 0 ? `(${c})` : c} = ${polyLatex(mul(outer, [c]))}$.`,
      `Together: $${polyLatex(ans)}$.`,
    ],
    shown: `$${polyLatex(ans)}$`,
    wrong: [{ tag: "forgot-second-term", poly: trim(wrong), message: `The second term inside the bracket needs multiplying by $${withX ? `${a}x` : a}$ as well.` }],
  };
}

/** The step that undoes "+ b" (or "- b") on both sides of an equation. */
const bothSides = (b: number) => (b > 0 ? `Subtract $${b}$ from both sides` : `Add $${-b}$ to both sides`);

function solveLinear(r: () => number, level: number): Question {
  const x = nonZero(r, -6, 12);
  if (level === 1) {
    const a = int(r, 2, 9), b = nonZero(r, -12, 12), c = a * x + b;
    return {
      skill: "solve-linear", level,
      prompt: `Solve $${lin(a, b)} = ${c}$.`,
      answer: { kind: "number", value: x, label: "x =" },
      hint: `Undo the ${b > 0 ? "adding" : "subtracting"} first, then undo the multiplying.`,
      solution: [`${bothSides(b)}: $${a}x = ${c - b}$.`, `Divide both sides by $${a}$: $x = ${x}$.`],
      shown: `$x = ${x}$`,
      wrong: dedupeWrong([
        { tag: "sign-error", number: (c + b) / a, message: `Careful with the sign. To undo $${b > 0 ? "+" : "-"}${Math.abs(b)}$ you ${b > 0 ? "subtract" : "add"} $${Math.abs(b)}$.` },
        { tag: "forgot-divide", number: c - b, message: `You've undone the ${b > 0 ? "adding" : "subtracting"}. There's still a multiplication by $${a}$ to undo.` },
      ], x),
    };
  }
  if (level === 2) {
    const a = int(r, 3, 10), c = int(r, 1, a - 1), b = nonZero(r, -9, 9), d = (a - c) * x + b;
    return {
      skill: "solve-linear", level,
      prompt: `Solve $${lin(a, b)} = ${lin(c, d)}$.`,
      answer: { kind: "number", value: x, label: "x =" },
      hint: `Get all the $x$ terms on one side. Try subtracting $${c === 1 ? "" : c}x$ from both sides.`,
      solution: [
        `Subtract $${c === 1 ? "" : c}x$ from both sides: $${lin(a - c, b)} = ${d}$.`,
        `${bothSides(b)}: $${a - c === 1 ? "" : a - c}x = ${d - b}$.`,
        `Divide by $${a - c}$: $x = ${x}$.`,
      ],
      shown: `$x = ${x}$`,
      wrong: dedupeWrong([
        { tag: "sign-error", number: (d + b) / (a - c), message: "Check the signs when you move terms across the equals sign. Whatever you do to one side, do to the other." },
        { tag: "sign-error", number: (b - d) / (a - c), message: "Check which side your $x$ terms ended up on, and the sign of each term." },
      ], x),
    };
  }
  const a = int(r, 2, 6), b = nonZero(r, -8, 8), c = a * (x + b);
  return {
    skill: "solve-linear", level,
    prompt: `Solve $${a}${bracket(1, b)} = ${c}$.`,
    answer: { kind: "number", value: x, label: "x =" },
    hint: `You can expand the bracket first, or divide both sides by $${a}$ first.`,
    solution: [`Divide both sides by $${a}$: $${lin(1, b)} = ${c / a}$.`, `${bothSides(b)}: $x = ${x}$.`],
    shown: `$x = ${x}$`,
    wrong: dedupeWrong([{ tag: "bracket", number: (c - b) / a, message: `Remember to multiply both terms in the bracket by $${a}$, not just the $x$.` }], x),
  };
}

function expandDouble(r: () => number, level: number): Question {
  let p = 1, q: number, s: number, rr = 1;
  if (level === 1) { q = int(r, 1, 9); s = int(r, 1, 9); }
  else if (level === 2) { q = signedInt(r, 1, 9); s = signedInt(r, 1, 9); }
  else { do { p = int(r, 1, 4); rr = int(r, 1, 4); } while (p === 1 && rr === 1); q = signedInt(r, 1, 7); s = signedInt(r, 1, 7); }
  const ans = mul([q, p], [s, rr]);
  return {
    skill: "expand-double", level,
    prompt: `Expand and simplify $${bracket(p, q)}${bracket(rr, s)}$.`,
    answer: { kind: "expr", value: ans, form: "collected" },
    hint: "Multiply every term in the first bracket by every term in the second. That's four multiplications, then collect like terms.",
    solution: [
      `Multiply: $${polyLatex(mul([0, p], [0, rr]))}$, $${polyLatex(mul([0, p], [s]))}$, $${polyLatex(mul([q], [0, rr]))}$ and $${polyLatex([q * s])}$.`,
      `Collect the $x$ terms: $${polyLatex([0, p * s + q * rr])}$. Result: $${polyLatex(ans)}$.`,
    ],
    shown: `$${polyLatex(ans)}$`,
    wrong: [{ tag: "missing-middle", poly: trim([q * s, 0, p * rr]), message: "You've multiplied the first terms and the last terms. The two 'inner' and 'outer' products create the middle term too." }],
  };
}

function factorise(r: () => number, level: number): Question {
  let pp: number, qq: number, diff = false;
  if (level === 1) { pp = int(r, 1, 9); qq = int(r, 1, 9); }
  else if (level === 2) { pp = signedInt(r, 1, 9); qq = signedInt(r, 1, 9); }
  else { pp = -int(r, 2, 12); qq = -pp; diff = true; }
  const poly = mul([pp, 1], [qq, 1]);
  const f = `${bracket(1, pp)}${bracket(1, qq)}`;
  return {
    skill: "factorise-quad", level,
    prompt: `Factorise $${polyLatex(poly)}$.`,
    answer: { kind: "expr", value: poly, form: "factorised" },
    hint: diff
      ? "This is a difference of two squares: $a^{2} - b^{2} = (a - b)(a + b)$."
      : `Find two numbers that multiply to give $${pp * qq}$ and add to give $${pp + qq}$.`,
    solution: diff
      ? [`$${-pp}^{2} = ${pp * pp}$, so this is $x^{2} - ${-pp}^{2}$.`, `Difference of two squares: $${f}$.`]
      : [`We need two numbers that multiply to $${pp * qq}$ and add to $${pp + qq}$. They are $${pp}$ and $${qq}$.`, `So it factorises to $${f}$.`],
    shown: `$${f}$`,
    wrong: pp !== qq || diff ? [{ tag: "signs", poly: mul([-pp, 1], [-qq, 1]), message: "Check the signs. Expand your brackets to see whether you get back to the original expression." }] : undefined,
  };
}

function solveQuad(r: () => number, level: number): Question {
  let r1: number, r2: number;
  do {
    if (level === 1) { r1 = -int(r, 1, 9); r2 = -int(r, 1, 9); }
    else { r1 = signedInt(r, 1, 9); r2 = signedInt(r, 1, 9); }
  } while (r1 === r2);
  const [lo, hi] = r1 < r2 ? [r1, r2] : [r2, r1];
  const full = mul([-lo, 1], [-hi, 1]);
  const B = -(lo + hi), C = -lo * hi;
  const eqn = level < 3 ? `${polyLatex(full)} = 0` : `${polyLatex([0, B, 1])} = ${C}`;
  const f = `${bracket(1, -lo)}${bracket(1, -hi)}`;
  return {
    skill: "solve-quad", level,
    prompt: `Solve $${eqn}$. Give both solutions, smallest first.`,
    answer: { kind: "multi", fields: [{ label: "smaller x =", value: lo }, { label: "larger x =", value: hi }] },
    hint: `${level === 3 ? "Move everything to one side so it equals zero. " : ""}Factorise, then set each bracket equal to zero.`,
    solution: [
      ...(level === 3 ? [`Rearrange to equal zero: $${polyLatex(full)} = 0$.`] : []),
      `Factorise: $${f} = 0$.`,
      `Either $${lin(1, -lo)} = 0$ or $${lin(1, -hi)} = 0$, so $x = ${lo}$ or $x = ${hi}$.`,
    ],
    shown: `$x = ${lo}$ and $x = ${hi}$`,
    wrong: lo !== -hi ? [{ tag: "sign-error", multi: [Math.min(-lo, -hi), Math.max(-lo, -hi)], message: "Check the signs of your solutions. If a bracket is $(x + 3)$, setting it to zero gives $x = -3$." }] : undefined,
  };
}

function simultaneous(r: () => number, level: number): Question {
  let a1: number, b1: number, a2: number, b2: number;
  if (level === 1) [a1, b1, a2, b2] = [1, 1, 1, -1];
  else if (level === 2) [a1, b1, a2, b2] = pick(r, [[2, 1, 1, -1], [1, 2, 1, -1], [3, 1, 1, -1], [1, 1, 2, -1]]);
  else do { [a1, b1, a2, b2] = [nonZero(r, -4, 5), nonZero(r, -4, 5), nonZero(r, -4, 5), nonZero(r, -4, 5)]; } while (a1 * b2 - a2 * b1 === 0);
  const x = int(r, -4, 8), y = int(r, -4, 8);
  const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
  const co = (c: number, v: string, first: boolean) => {
    const m = Math.abs(c) === 1 ? "" : String(Math.abs(c));
    return first ? `${c < 0 ? "-" : ""}${m}${v}` : ` ${c < 0 ? "-" : "+"} ${m}${v}`;
  };
  const e1 = `${co(a1, "x", true)}${co(b1, "y", false)} &= ${c1}`;
  const e2 = `${co(a2, "x", true)}${co(b2, "y", false)} &= ${c2}`;
  const det = a1 * b2 - a2 * b1;
  return {
    skill: "simultaneous", level,
    prompt: `Solve these simultaneous equations.$$\\begin{aligned} ${e1} \\\\ ${e2} \\end{aligned}$$`,
    answer: { kind: "multi", fields: [{ label: "x =", value: x }, { label: "y =", value: y }] },
    hint: "Make the number in front of one letter the same in both equations, then add or subtract to eliminate it.",
    solution: [
      `Call them equations (1) and (2). Multiply (1) by $${b2}$ and (2) by $${b1}$ so the $y$ terms match.`,
      `Subtract to eliminate $y$: $${det}x = ${c1 * b2 - c2 * b1}$, so $x = ${x}$.`,
      `Substitute into (1): $${b1}y = ${c1 - a1 * x}$, so $y = ${y}$.`,
    ],
    shown: `$x = ${x}$, $y = ${y}$`,
    wrong: x !== y ? [{ tag: "swapped", multi: [y, x], message: "Check which value belongs to $x$ and which to $y$." }] : undefined,
  };
}

export const algebraSkills: Skill[] = [
  { id: "collect-terms", name: "Simplifying expressions", stage: "KS3", year: 7, strand: "Algebra", blurb: "Collect like terms.", prereqs: [],
    parentNote: "Letters stand for numbers, so $3x + 5x$ is like 3 apples plus 5 apples. You can only combine terms that are the same kind of thing.",
    talkAbout: "Why can we simplify 3x + 5x but not 3x + 5?", generate: collectTerms },
  { id: "expand-single", name: "Expanding brackets", stage: "KS3", year: 8, strand: "Algebra", blurb: "Multiply out a single bracket.", prereqs: ["collect-terms"],
    parentNote: "Everything inside the bracket gets multiplied by what's outside. A common slip is to multiply only the first term.",
    talkAbout: "What does 3(x + 4) mean in words, and what are its two parts?", generate: expandSingle },
  { id: "solve-linear", name: "Solving equations", stage: "KS3", year: 8, strand: "Algebra", blurb: "Solve linear equations, including unknowns on both sides.", prereqs: ["collect-terms"],
    parentNote: "An equation is a balance. Whatever you do to one side you must do to the other. Work backwards: undo adding and subtracting first, then multiplying and dividing.",
    talkAbout: "How can you check your answer is right without looking at a mark scheme?", generate: solveLinear },
  { id: "expand-double", name: "Expanding double brackets", stage: "KS4", year: 10, strand: "Algebra", blurb: "Expand and simplify pairs of brackets.", prereqs: ["expand-single"],
    parentNote: "Each term in the first bracket is multiplied by each term in the second. Many people remember this as the 'smiley face' method or FOIL: first, outer, inner, last.",
    talkAbout: "Draw a rectangle with sides (x + 3) and (x + 2). Can you see where each of the four terms comes from?", generate: expandDouble },
  { id: "factorise-quad", name: "Factorising quadratics", stage: "KS4", year: 10, strand: "Algebra", blurb: "Write quadratics as pairs of brackets.", prereqs: ["expand-double"],
    parentNote: "Factorising is expanding in reverse. For $x^2 + bx + c$ look for two numbers that multiply to $c$ and add to $b$.",
    talkAbout: "How could you check a factorisation using expanding?", generate: factorise },
  { id: "solve-quad", name: "Solving quadratics", stage: "KS4", year: 10, strand: "Algebra", blurb: "Solve quadratic equations by factorising.", prereqs: ["factorise-quad", "solve-linear"],
    parentNote: "If two things multiply to give zero, one of them must be zero. That's why we factorise and then set each bracket to zero.",
    talkAbout: "Why can a quadratic have two answers?", generate: solveQuad },
  { id: "simultaneous", name: "Simultaneous equations", stage: "KS4", year: 10, strand: "Algebra", blurb: "Solve two equations with two unknowns.", prereqs: ["solve-linear"],
    parentNote: "Two unknowns need two equations. Elimination removes one letter by adding or subtracting the equations, after making one pair of coefficients match.",
    talkAbout: "What does the solution mean if you draw both equations as lines on a graph?", generate: simultaneous },
];

