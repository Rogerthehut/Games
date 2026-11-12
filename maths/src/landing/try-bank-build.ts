import { SKILL_BY_ID } from "../curriculum";
import { diagnoseAttempt } from "../engine/learning-report";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import type { TryItem } from "./try-types";

/**
 * The questions on the marketing page's "Try one" card, picked from the real generators ahead of time so the page doesn't have to carry
 * the whole curriculum. Only topics with a number answer and a picture of the method are used. `npm run try-bank` writes try-bank.json;
 * a test checks the file still matches the generators.
 */
export const TRY_PICKS: [skill: string, level: number][] = [
  ["add-sub", 1], ["add-sub", 2], ["mult-written", 1], ["mult-written", 2], ["division", 1], ["long-division", 1], ["frac-equiv", 1], ["frac-add", 2], ["frac-amount", 2],
  ["rounding", 1], ["rounding", 2], ["pct-amount", 2], ["ratio-share", 1], ["decimals", 2], ["money-change", 2], ["elapsed-time", 2], ["negative-numbers", 1],
  ["place-value", 2], ["divide-10-100", 2], ["fdp-convert", 1], ["frac-same-denom", 2], ["count-steps", 2], ["measures-convert", 1], ["averages", 2], ["scale-recipes", 1],
  ["add-sub-money", 2], ["times-tables", 2], ["two-unknowns", 1],
];
const SEEDS = [11, 23];

function slipsFor(q: Question, value: number): TryItem["slips"] {
  const candidates = [value + 1, value - 1, value + 10, value - 10, value * 10, value / 10, -value, value + 100, value - 100, value * 100]
    .map((v) => Math.round(v * 1e6) / 1e6).filter((v, i, all) => v !== value && Number.isFinite(v) && all.indexOf(v) === i);
  const out: TryItem["slips"] = [], tags = new Set<string>();
  for (const v of candidates) {
    const d = diagnoseAttempt({ prompt: q.prompt, shown: q.shown, tried: [String(v)] }, String(v));
    if (d && !tags.has(d.tag) && d.tag !== "blank") { tags.add(d.tag); out.push({ value: v, reason: d.reason }); }
  }
  return out.slice(0, 3);
}

export function buildTryBank(): TryItem[] {
  const out: TryItem[] = [];
  for (const [skill, level] of TRY_PICKS) for (const seed of SEEDS) {
    const s = SKILL_BY_ID[skill], q = s.generate(mulberry32(seed), level);
    if (q.answer.kind !== "number" || !q.worked || q.prompt.length > 190 || q.solution.length > 9) continue;
    out.push({ id: `${skill}-${level}-${seed}`, skill, level, seed, name: s.name, year: s.year, prompt: q.prompt, value: q.answer.value, unit: q.answer.unit, shown: q.shown, hint: q.hint, solution: q.solution, worked: q.worked, slips: slipsFor(q, q.answer.value) });
  }
  return out;
}
