import type { Question } from "./types";
import { isCollected, isFactorised, numberOf, parse, polyOf, samePoly } from "./expr";
import { eq } from "./poly";
import { gcd } from "./rng";

export type Outcome = "correct" | "almost" | "wrong" | "invalid";
export interface Result {
  outcome: Outcome;
  feedback?: string;
  tag?: string;
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9;

/** "3/4" with a numerator and denominator that share a factor. */
function unsimplified(input: string): boolean {
  const m = input.replace(/\s/g, "").match(/^-?(\d+)\/(\d+)$/);
  return !!m && gcd(+m[1], +m[2]) > 1 && +m[2] !== 0;
}

export function check(q: Question, inputs: string[]): Result {
  const a = q.answer;
  if (inputs.every((s) => !s.trim())) return { outcome: "invalid", feedback: "Type your answer first." };

  if (a.kind === "number") {
    const v = numberOf(inputs[0]);
    if (v === null) return { outcome: "invalid", feedback: "I couldn't read that. Use digits, / for fractions and - for negatives." };
    if (near(v, a.value, a.tol ?? 1e-9)) {
      if (a.simplestFraction && unsimplified(inputs[0]))
        return { outcome: "almost", feedback: "That's the right value. Now simplify the fraction as far as you can." };
      return { outcome: "correct" };
    }
    const w = q.wrong?.find((m) => m.number !== undefined && near(v, m.number, a.tol ?? 1e-9));
    return w ? { outcome: "wrong", feedback: w.message, tag: w.tag } : { outcome: "wrong" };
  }

  if (a.kind === "expr") {
    const p = polyOf(inputs[0]);
    if (p === null) return { outcome: "invalid", feedback: "I couldn't read that as an expression in x. Check brackets and use x for the unknown." };
    if (samePoly(p, a.value)) {
      const node = parse(inputs[0]);
      if (a.form === "factorised" && !isFactorised(node))
        return { outcome: "almost", feedback: "That's equal, but it isn't factorised yet. Write it as brackets multiplied together." };
      if (a.form === "collected" && !isCollected(node))
        return { outcome: "almost", feedback: "That's equal, but it isn't fully simplified yet. Expand the brackets and collect like terms." };
      return { outcome: "correct" };
    }
    const w = q.wrong?.find((m) => m.poly && eq(p, m.poly));
    return w ? { outcome: "wrong", feedback: w.message, tag: w.tag } : { outcome: "wrong" };
  }

  const vals = inputs.map(numberOf);
  if (vals.some((v) => v === null)) return { outcome: "invalid", feedback: "I couldn't read one of those answers. Use digits and - for negatives." };
  if (a.fields.every((f, i) => near(vals[i] as number, f.value, 1e-9))) return { outcome: "correct" };
  const w = q.wrong?.find((m) => m.multi && m.multi.every((x, i) => near(vals[i] as number, x, 1e-9)));
  return w ? { outcome: "wrong", feedback: w.message, tag: w.tag } : { outcome: "wrong" };
}

/** Does this exact text count as the right answer? Used by tests and the "show answer" path. */
export const isCorrect = (q: Question, inputs: string[]) => check(q, inputs).outcome === "correct";
