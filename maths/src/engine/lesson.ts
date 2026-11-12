import { SKILL_BY_ID } from "../curriculum";
import { addPoints, recordAnswer, type Profile } from "./progress";
import { mulberry32 } from "./rng";
import type { Question } from "./types";

/**
 * A worked-example lesson for any topic, built from the topic's own questions: see one worked through (model), try one with the
 * first steps given (guided), do three on your own (independent), then answer one on an earlier topic so it isn't forgotten (revisit).
 * The questions come from fixed seeds, so a lesson is the same each time and a reload picks up in the same place.
 */
export interface Lesson {
  skillId: string;
  model: Question;
  guided: Question;
  /** How many of the guided question's steps are shown to start with. When its solution is a single step, none are, and the hint is shown instead. */
  given: number;
  independent: Question[];
  revisit: { skillId: string; q: Question; harder: boolean };
}

/** Topics with their own hand-built lessons. */
const BESPOKE = new Set(["times-tables", "elapsed-time", "angles-basic", "frac-equiv"]);

const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

function distinct(skillId: string, level: number, seed: number, used: Set<string>): Question {
  const skill = SKILL_BY_ID[skillId];
  let at = seed, q = skill.generate(mulberry32(at), level);
  for (let i = 1; i < 12 && used.has(q.prompt); i++) { at = seed + i * 7919; q = skill.generate(mulberry32(at), level); }
  used.add(q.prompt);
  return { ...q, seed: at };
}

export function buildLesson(skillId: string): Lesson {
  const skill = SKILL_BY_ID[skillId], base = hash(skillId), used = new Set<string>();
  const model = distinct(skillId, 1, base, used);
  const guided = distinct(skillId, 1, base + 101, used);
  const independent = [1, 1, 2].map((level, i) => distinct(skillId, level, base + 211 * (i + 1), used));
  const earlier = skill.prereqs.map((id) => SKILL_BY_ID[id]).find(Boolean);
  const revisitId = earlier?.id ?? skillId;
  const revisit = distinct(revisitId, earlier ? 2 : 3, base + 977, earlier ? new Set<string>() : used);
  return { skillId, model, guided, given: guided.solution.length >= 2 ? Math.floor(guided.solution.length / 2) : 0, independent, revisit: { skillId: revisitId, q: revisit, harder: !earlier } };
}

const cache = new Map<string, boolean>();
/** Whether a topic can have a worked-example lesson: it needs worked solutions and enough different questions. Reasoning papers and the STEM lab have their own formats. */
export function hasLesson(skillId: string): boolean {
  const known = cache.get(skillId);
  if (known !== undefined) return known;
  const skill = SKILL_BY_ID[skillId];
  let ok = !!skill && !BESPOKE.has(skillId) && skill.strand !== "STEM" && skill.strand !== "Reasoning" && !/^(vr|nvr|ps)-/.test(skillId);
  if (ok) {
    try { const l = buildLesson(skillId); const five = [l.model, l.guided, ...l.independent]; ok = five.every((q) => q.solution.length >= 1) && new Set(five.map((q) => q.prompt)).size === five.length; } catch { ok = false; }
  }
  cache.set(skillId, ok);
  return ok;
}

export interface LessonOutcome {
  /** Used a hint, extra step or second try on the guided question. */
  helped: boolean;
  /** How many of the three independent questions were right on the first try. */
  independentRight: number;
  revisitRight: boolean;
}

/** Records a finished lesson: progress on the topic and on the revisited one, points, and the date it was done. */
export function finishLesson(p: Profile, lesson: Lesson, outcome: LessonOutcome, now = Date.now()): Profile {
  const unaided = outcome.independentRight >= 2 && !outcome.helped;
  let next = recordAnswer(p, lesson.skillId, unaided ? "right" : "helped", now);
  if (lesson.revisit.skillId !== lesson.skillId) next = recordAnswer(next, lesson.revisit.skillId, outcome.revisitRight ? "right" : "helped", now);
  next = addPoints(next, 10 + outcome.independentRight * 2);
  return { ...next, lessons: { ...(next.lessons ?? {}), [lesson.skillId]: now }, lastSkill: lesson.skillId };
}
