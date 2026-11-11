import { shuffle } from "./helpers";
import type { Poly } from "../engine/poly";
import type { Question, Skill } from "../engine/types";
import type { Rng } from "../engine/rng";

/** Small builders for the other kinds of answer: a fraction, a written expression, and picking one option. */

type Wrong = { tag: string; message: string; number?: number; poly?: Poly };

/** The answer is a fraction in its simplest form, typed as n/d. */
export function fracSkill(
  info: Omit<Skill, "generate">,
  task: (r: Rng, level: number) => { prompt: string; n: number; d: number; hint: string; solution: string[]; wrong?: Wrong[] },
): Skill {
  return {
    ...info,
    generate(r, level): Question {
      const t = task(r, level);
      return {
        skill: info.id, level, prompt: t.prompt, answer: { kind: "number", value: t.n / t.d, simplestFraction: true },
        hint: t.hint, solution: t.solution, shown: t.d === 1 ? `$${t.n}$` : `$\\frac{${t.n}}{${t.d}}$`, wrong: t.wrong,
      };
    },
  };
}

/** The answer is an expression in x, either multiplied out and collected, or factorised. */
export function exprSkill(
  info: Omit<Skill, "generate">,
  task: (r: Rng, level: number) => { prompt: string; value: Poly; form: "collected" | "factorised"; shown: string; hint: string; solution: string[]; wrong?: Wrong[] },
): Skill {
  return {
    ...info,
    generate(r, level): Question {
      const t = task(r, level);
      return { skill: info.id, level, prompt: t.prompt, answer: { kind: "expr", value: t.value, form: t.form }, hint: t.hint, solution: t.solution, shown: t.shown, wrong: t.wrong };
    },
  };
}

/** Pick one. The right option is put in a random position. `others` are the wrong options (up to four). */
export function choiceSkill(
  info: Omit<Skill, "generate">,
  task: (r: Rng, level: number) => { prompt: string; right: string; others: string[]; hint: string; solution: string[] },
): Skill {
  return {
    ...info,
    generate(r, level): Question {
      const t = task(r, level);
      const options = shuffle(r, [t.right, ...t.others]);
      return {
        skill: info.id, level, prompt: t.prompt, answer: { kind: "choice", options: options.map((text) => ({ text })), correct: options.indexOf(t.right) },
        hint: t.hint, solution: t.solution, shown: t.right,
      };
    },
  };
}
