import type { Question, Skill } from "../engine/types";
import { int, nonZero } from "../engine/rng";
import { add, derivative, term, toLatex as polyLatex, trim, type Poly } from "../engine/poly";
import { bracket, shuffle, signedInt, sumLatex } from "./helpers";

function differentiate(r: () => number, level: number): Question {
  let parts: { c: number; d: number }[], expandFirst = false, prompt = "";
  if (level === 1) parts = [{ c: nonZero(r, -9, 9), d: int(r, 2, 6) }];
  else if (level === 2) parts = shuffle(r, [{ c: nonZero(r, -6, 9), d: int(r, 3, 5) }, { c: nonZero(r, -9, 9), d: int(r, 2, 2) }, { c: nonZero(r, -9, 9), d: 1 }, { c: signedInt(r, 1, 9), d: 0 }]);
  else {
    expandFirst = true;
    const a = nonZero(r, -6, 6), b = nonZero(r, -6, 6);
    parts = [{ c: 1, d: 2 }, { c: a + b, d: 1 }, { c: a * b, d: 0 }];
    prompt = `y = ${bracket(1, a)}${bracket(1, b)}`;
  }
  const y = parts.reduce<Poly>((p, t) => add(p, term(t.c, t.d)), [0]);
  const dy = derivative(y);
  const wrongPoly = trim(parts.reduce<Poly>((p, t) => add(p, t.d === 0 ? [0] : term(t.c, t.d - 1)), [0]));
  const ys = expandFirst ? prompt : `y = ${sumLatex(parts)}`;
  return {
    skill: "differentiate", level,
    prompt: `Find $\\frac{dy}{dx}$ when $${ys}$.`,
    answer: { kind: "expr", value: dy, form: "collected", label: "dy/dx =" },
    hint: expandFirst
      ? "Expand the brackets first so you have separate powers of $x$. Then differentiate each term: multiply by the power, and reduce the power by 1."
      : "For each term $ax^{n}$: multiply the coefficient by the power $n$, then reduce the power by 1. A number on its own differentiates to 0.",
    solution: [
      ...(expandFirst ? [`Expand first: $y = ${polyLatex(y)}$.`] : []),
      `Differentiate each term using $\\frac{d}{dx}(ax^{n}) = nax^{n-1}$.`,
      `$\\frac{dy}{dx} = ${polyLatex(dy)}$.`,
    ],
    shown: `$${polyLatex(dy)}$`,
    wrong: level < 3 && !(trim(wrongPoly).join() === trim(dy).join()) ? [{ tag: "forgot-multiply", poly: wrongPoly, message: "You've lowered the power, but you also need to multiply the coefficient by the old power." }] : undefined,
  };
}

export const calculusSkills: Skill[] = [
  { id: "differentiate", name: "Differentiating polynomials", stage: "KS5", year: 12, strand: "Calculus", blurb: "Use the power rule to find gradients.", prereqs: ["expand-single"],
    parentNote: "Differentiation gives the gradient of a curve at any point. For $ax^n$ you multiply by the power and reduce the power by one. Constants disappear because they don't change.",
    talkAbout: "What does dy/dx tell you about the graph of y?", generate: differentiate },
];
