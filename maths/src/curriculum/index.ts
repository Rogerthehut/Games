import type { Question, Skill, Strand } from "../engine/types";
import { eq } from "../engine/poly";
import { numberSkills } from "./number";
import { algebraSkills } from "./algebra";
import { geometrySkills } from "./geometry";
import { calculusSkills } from "./calculus";
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

const raw: Skill[] = [...primarySkills, ...numberSkills, ...algebraSkills, ...geometrySkills, ...calculusSkills].map((s) => ({ ...s, ...OVERRIDES[s.id] }));
export const SKILLS: Skill[] = raw.map((s) => ({ ...s, generate: (r, l) => withoutAccidentalCorrect(s.generate(r, l)) }));
export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const STRANDS: Strand[] = ["Number", "Ratio", "Algebra", "Measures", "Geometry", "Statistics", "Calculus"];
export const STAGE_LABEL = { KS2: "Key Stage 2", KS3: "Key Stage 3", KS4: "GCSE", KS5: "A-level" } as const;
