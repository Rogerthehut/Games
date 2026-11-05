import type { Question, Skill, Strand } from "../engine/types";
import { eq } from "../engine/poly";
import { numberSkills } from "./number";
import { algebraSkills } from "./algebra";
import { geometrySkills } from "./geometry";
import { calculusSkills } from "./calculus";

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

const raw: Skill[] = [...numberSkills, ...algebraSkills, ...geometrySkills, ...calculusSkills];
export const SKILLS: Skill[] = raw.map((s) => ({ ...s, generate: (r, l) => withoutAccidentalCorrect(s.generate(r, l)) }));
export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const STRANDS: Strand[] = ["Number", "Ratio", "Algebra", "Geometry", "Calculus"];
export const STAGE_LABEL = { KS3: "Key Stage 3", KS4: "GCSE", KS5: "A-level" } as const;
