import type { Question } from "./types";
import { isCollected, isFactorised, parse, polyOf, samePoly } from "./expr";
import { eq } from "./poly";
import { gcd } from "./rng";
import { formNudge, parseNumberAnswer } from "./answer";

export type Outcome = "correct" | "almost" | "wrong" | "invalid";
export interface Result {
  outcome: Outcome;
  feedback?: string;
  tag?: string;
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9;
const CANT_READ = "I couldn't read that. Use digits, a point for decimals, / for fractions and - for minus.";

/** "3/4" with a numerator and denominator that share a factor. */
function unsimplified(input: string): boolean {
  const m = input.replace(/[^\d/-]/g, "").match(/^-?(\d+)\/(\d+)$/);
  return !!m && gcd(+m[1], +m[2]) > 1 && +m[2] !== 0;
}

/**
 * Marking is generous about how the right answer is written and specific about what to change.
 * "x = 9", "9 cm", "£5", "1,000", "50p" and "1 1/2" are all just numbers. If the value is right but the form isn't what
 * the question asked for, that is "almost" with a plain instruction, never "wrong".
 */
export function check(q: Question, inputs: string[]): Result {
  const a = q.answer;
  if (inputs.every((s) => !s.trim())) return { outcome: "invalid", feedback: "Type your answer first." };

  if (a.kind === "explain") {
    const words = (inputs[0] ?? "").trim().split(/\s+/).filter(Boolean).length;
    if (words < 3) return { outcome: "invalid", feedback: "Write your explanation first, in a sentence or two." };
    const ticks = inputs[1];
    if (ticks === undefined) return { outcome: "invalid", feedback: "Press 'Compare with the model answer', then tick what your answer said." };
    const missed = a.points.filter((_, i) => ticks[i] !== "1");
    return missed.length === 0 ? { outcome: "correct" } : { outcome: "wrong", feedback: `Your answer didn't include: ${missed.join("; ")}.` };
  }

  if (a.kind === "choice") {
    const typed = inputs[0].trim();
    const pick = /^[a-e]$/i.test(typed) ? typed.toUpperCase().charCodeAt(0) - 65 : /^\d$/.test(typed) ? +typed : -1;
    if (pick < 0 || pick >= a.options.length) return { outcome: "invalid", feedback: "Pick one of the answers." };
    if (pick === a.correct) return { outcome: "correct" };
    const w = q.wrong?.find((m) => m.number === pick);
    return w ? { outcome: "wrong", feedback: w.message, tag: w.tag } : { outcome: "wrong" };
  }

  if (a.kind === "number") {
    const pn = parseNumberAnswer(inputs[0], a);
    if (pn.value === null) return { outcome: "invalid", feedback: CANT_READ };
    const tol = a.tol ?? 1e-9;
    if (near(pn.value, a.value, tol)) {
      const wantsFraction = a.simplestFraction || a.form === "fraction";
      if (wantsFraction && !Number.isInteger(a.value) && !pn.typedFraction && !pn.mixed) return { outcome: "almost", feedback: formNudge.fraction };
      if (wantsFraction && pn.typedFraction && !pn.mixed && unsimplified(inputs[0])) return { outcome: "almost", feedback: formNudge.simplify };
      if (a.form === "decimal" && pn.typedFraction) return { outcome: "almost", feedback: formNudge.decimal };
      if (a.unit && a.unit !== "£" && pn.unit && pn.unit !== a.unit) return { outcome: "almost", feedback: formNudge.unit(a.unit) };
      return { outcome: "correct" };
    }
    const known = q.wrong?.find((m) => m.number !== undefined && near(pn.value as number, m.number, tol));
    // the right quantity, rounded the wrong way
    if (!known && a.dp !== undefined && a.exact !== undefined && Math.abs(pn.value - a.exact) < Math.pow(10, -a.dp) * 0.6 && pn.decimals !== a.dp)
      return { outcome: "almost", feedback: formNudge.round(a.dp) };
    const w = known;
    return w ? { outcome: "wrong", feedback: w.message, tag: w.tag } : { outcome: "wrong" };
  }

  if (a.kind === "expr") {
    const text = inputs[0].replace(/^\s*(?:dy\s*\/\s*dx|[a-z]\s*\(\s*x\s*\)|[a-z])\s*=\s*/i, ""); // allow "y = ..." or "dy/dx = ..."
    const p = polyOf(text);
    if (p === null) return { outcome: "invalid", feedback: "I couldn't read that as an expression in x. Check your brackets, and use x for the unknown." };
    if (samePoly(p, a.value)) {
      const node = parse(text);
      if (a.form === "factorised" && !isFactorised(node))
        return { outcome: "almost", feedback: "That's equal, but it isn't factorised yet. Write it as brackets multiplied together." };
      if (a.form === "collected" && !isCollected(node))
        return { outcome: "almost", feedback: "That's equal, but it isn't fully simplified yet. Multiply out the brackets and collect like terms." };
      return { outcome: "correct" };
    }
    const w = q.wrong?.find((m) => m.poly && eq(p, m.poly));
    return w ? { outcome: "wrong", feedback: w.message, tag: w.tag } : { outcome: "wrong" };
  }

  // several boxes. "7 r 2" typed into the first box of a quotient and remainder fills both.
  let boxes = inputs;
  const withRemainder = a.fields.length === 2 && inputs[0] ? inputs[0].match(/^\s*(\d+)\s*(?:r|rem|remainder)\s*(\d+)\s*$/i) : null;
  if (withRemainder) boxes = [withRemainder[1], withRemainder[2]];
  const vals = a.fields.map((_, i) => (boxes[i]?.trim() ? parseNumberAnswer(boxes[i], {}).value : null));
  if (vals.some((v) => v === null)) return { outcome: "invalid", feedback: boxes.some((b) => !b?.trim()) ? "Fill in every box." : CANT_READ };
  if (a.fields.every((f, i) => near(vals[i] as number, f.value, 1e-9))) return { outcome: "correct" };
  const w = q.wrong?.find((m) => m.multi && m.multi.every((x, i) => near(vals[i] as number, x, 1e-9)));
  return w ? { outcome: "wrong", feedback: w.message, tag: w.tag } : { outcome: "wrong" };
}

/** Does this exact text count as the right answer? Used by tests and the "show answer" path. */
export const isCorrect = (q: Question, inputs: string[]) => check(q, inputs).outcome === "correct";
