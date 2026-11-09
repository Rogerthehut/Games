import type { Question, Skill, Strand } from "../engine/types";
import { eq } from "../engine/poly";
import { numberSkills } from "./number";
import { algebraSkills } from "./algebra";
import { geometrySkills } from "./geometry";
import { calculusSkills } from "./calculus";
import { expansionSkills } from "./expansion";
import { primarySkills } from "./primary";

/** A "common mistake" that happens to equal the right answer is not a mistake: drop it. */
function withoutAccidentalCorrect(q: Question): Question {
  if (!q.wrong) return q;
  const a = q.answer;
  const wrong = q.wrong.filter((w) => {
    if (w.number !== undefined && a.kind === "number") return Math.abs(w.number - a.value) > 1e-9;
    if (w.poly && a.kind === "expr") return !eq(w.poly, a.value);
    if (w.multi && a.kind === "multi") return !w.multi.every((x, i) => Math.abs(x - a.fields[i].value) < 1e-9);
    return true;
  });
  return { ...q, wrong: wrong.length ? wrong : undefined };
}

/** Where the earlier secondary-only skills sit now that Key Stage 2 exists beneath them. */
const OVERRIDES: Record<string, Partial<Skill>> = {
  "frac-add": { stage: "KS2", year: 6, prereqs: ["frac-equiv"] },
  "pct-amount": { stage: "KS2", year: 6, prereqs: ["frac-amount", "decimals"] },
  "ratio-share": { stage: "KS2", year: 6, prereqs: ["division", "mult-written"] },
  "collect-terms": { prereqs: ["sequences"] },
  "angles-polygon": { prereqs: ["angles-basic"] },
  pythagoras: { prereqs: ["order-ops"] },
};

/**
 * Work out how each numeric answer is meant to be written (unit, pounds, decimal places, fraction or whole number)
 * from what the generator already says, so the app can tell the child and mark generously. Skills don't have to repeat it.
 */
function withAnswerFormat(q: Question): Question {
  const a = q.answer;
  if (a.kind !== "number") return q;
  const out = { ...a };
  const prompt = q.prompt.toLowerCase();

  if (a.label === "£" || /in pounds/.test(prompt)) { out.money = true; if (out.label === "£") delete out.label; }

  const unitLabel = a.label?.match(/^(cm|mm|km|kg|ml|m|g|l)\s*=$/);
  if (unitLabel) { out.unit = unitLabel[1]; delete out.label; }

  if (q.skill === "angles-basic" || /in degrees/.test(prompt) || (q.skill === "trig" && /angle/.test(prompt))) out.unit = "°";
  else if (!out.unit && q.figure?.type === "rtriangle" && /cm/.test(`${q.figure.base} ${q.figure.height} ${q.figure.hyp}`)) out.unit = "cm";
  else if (!out.unit && q.skill === "perimeter-area") out.unit = /cm²/.test(prompt) ? "cm²" : /cm/.test(prompt) ? "cm" : undefined;
  if (out.unit === undefined) delete out.unit;

  const dp = prompt.match(/(\d+)\s+decimal places?/);
  if (dp) out.dp = +dp[1];

  if (a.simplestFraction) out.form = "fraction";
  else if (/as a decimal\b/.test(prompt)) out.form = "decimal";
  else if (!out.money && out.dp === undefined && Number.isInteger(a.value)) out.form = "integer";
  return { ...q, answer: out };
}

const raw: Skill[] = [...primarySkills, ...numberSkills, ...algebraSkills, ...geometrySkills, ...calculusSkills, ...expansionSkills].map((s) => ({ ...s, ...OVERRIDES[s.id] }));
export const SKILLS: Skill[] = raw.map((s) => ({ ...s, generate: (r, l) => withAnswerFormat(withoutAccidentalCorrect(s.generate(r, l))) }));
export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const STRANDS: Strand[] = ["Number", "Ratio", "Algebra", "Measures", "Geometry", "Statistics", "Calculus"];
export const STAGE_LABEL = { KS2: "Key Stage 2", KS3: "Key Stage 3", KS4: "GCSE", KS5: "A-level" } as const;
