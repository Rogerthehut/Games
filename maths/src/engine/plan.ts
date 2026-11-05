import { SKILLS, SKILL_BY_ID } from "../curriculum";
import { DAY, SECURE_BOX, type Profile } from "./progress";
import type { Skill } from "./types";

export type PlanTarget = "11plus" | "general";

export interface PlanWeek {
  n: number;
  start: number;
  kind: "learn" | "review" | "mock";
  skills: string[];
  note: string;
}

export interface Plan {
  createdAt: number;
  sessionsPerWeek: number;
  target: PlanTarget;
  examDate?: number;
  /** All skills in the order they should be tackled. */
  ordered: string[];
  /** Skills that don't fit before the exam at this pace. */
  deferred: string[];
  weeks: PlanWeek[];
}

/** Rough number of 10-minute sessions a skill needs to go from a gap to secure. */
export const SESSIONS_PER_SKILL = 3;
const MOCK_WEEKS_BEFORE_EXAM = 2;

/** What counts as in scope: for the 11+, primary content; otherwise up to just above the working level. */
export function inScope(p: Profile, target: PlanTarget): Skill[] {
  const theta = p.baselines.length ? p.baselines[p.baselines.length - 1].theta : p.year;
  const ceiling = target === "11plus" ? 6.99 : Math.max(p.year, theta) + 0.5;
  return SKILLS.filter((s) => s.year <= ceiling);
}

const isOpen = (p: Profile, id: string) => {
  const st = p.skills[id];
  return !st?.assumed && (st?.box ?? 0) < SECURE_BOX;
};

/** Order the skills still to learn so that prerequisites come first and known gaps come before new ground. */
export function orderSkills(p: Profile, target: PlanTarget): string[] {
  const todo = inScope(p, target).filter((s) => isOpen(p, s.id));
  const ids = new Set(todo.map((s) => s.id));
  const gap = (id: string) => ((p.skills[id]?.seen ?? 0) > 0 && (p.skills[id]?.box ?? 0) < 2 ? 0 : 1);
  const key = (s: Skill) => gap(s.id) * 100 + s.year * 10 + (s.strand === "Number" ? 0 : 1);
  const placed: string[] = [];
  const done = new Set<string>();
  while (placed.length < todo.length) {
    const ready = todo.filter((s) => !done.has(s.id) && s.prereqs.every((q) => !ids.has(q) || done.has(q)));
    const pool = ready.length ? ready : todo.filter((s) => !done.has(s.id));
    const next = pool.sort((a, b) => key(a) - key(b) || a.id.localeCompare(b.id))[0];
    placed.push(next.id);
    done.add(next.id);
  }
  return placed;
}

export function buildPlan(p: Profile, now: number, opts: { sessionsPerWeek: number; target: PlanTarget; examDate?: number }): Plan {
  const S = Math.max(1, Math.min(7, Math.round(opts.sessionsPerWeek)));
  const ordered = orderSkills(p, opts.target);

  let learnWeeks = Math.ceil((ordered.length * SESSIONS_PER_SKILL) / S);
  let mockWeeks = opts.target === "11plus" ? 1 : 0;
  if (opts.examDate) {
    const weeksLeft = Math.max(0, Math.floor((opts.examDate - now) / (7 * DAY)));
    mockWeeks = weeksLeft >= 8 ? MOCK_WEEKS_BEFORE_EXAM : weeksLeft >= 4 ? 1 : 0;
    learnWeeks = Math.min(learnWeeks, Math.max(0, weeksLeft - mockWeeks));
  }
  const fit = Math.min(ordered.length, Math.floor((learnWeeks * S) / SESSIONS_PER_SKILL));
  const planned = ordered.slice(0, fit);
  const deferred = ordered.slice(fit);

  const weeks: PlanWeek[] = [];
  for (let w = 0; w < learnWeeks; w++) {
    const first = Math.floor((w * S) / SESSIONS_PER_SKILL);
    const last = Math.floor(((w + 1) * S - 1) / SESSIONS_PER_SKILL);
    const skills = planned.slice(first, Math.min(last, planned.length - 1) + 1);
    if (!skills.length) break;
    weeks.push({ n: weeks.length + 1, start: now + w * 7 * DAY, kind: "learn", skills, note: skills.map((id) => SKILL_BY_ID[id].name).join(" · ") });
  }
  // Spare time before the exam goes on revision, with mock papers kept for the last weeks.
  if (opts.examDate) {
    const weeksLeft = Math.max(0, Math.floor((opts.examDate - now) / (7 * DAY)));
    const spare = Math.min(40, Math.max(0, weeksLeft - weeks.length - mockWeeks));
    for (let k = 0; k < spare; k++)
      weeks.push({ n: weeks.length + 1, start: now + weeks.length * 7 * DAY, kind: "review", skills: [], note: "Revision: mixed practice on everything covered, plus anything that has slipped" });
  }
  for (let m = 0; m < mockWeeks; m++) {
    weeks.push({ n: weeks.length + 1, start: now + weeks.length * 7 * DAY, kind: "mock", skills: [], note: m === mockWeeks - 1 ? "Final mock paper, then review any mistakes" : "Timed mock paper, then review mistakes" });
  }
  return { createdAt: now, sessionsPerWeek: S, target: opts.target, examDate: opts.examDate, ordered, deferred, weeks };
}

export function currentWeek(plan: Plan, now: number): PlanWeek | undefined {
  if (!plan.weeks.length) return undefined;
  const i = Math.floor((now - plan.createdAt) / (7 * DAY));
  return plan.weeks[Math.max(0, Math.min(plan.weeks.length - 1, i))];
}

/** Skills the plan wants practised now: this week's, then any unfinished from earlier weeks. Never more than three. */
export function planFocus(p: Profile, now: number): string[] {
  const plan = p.plan;
  if (!plan) return [];
  const cw = currentWeek(plan, now);
  if (!cw) return [];
  const earlier = plan.weeks.filter((w) => w.n < cw.n).flatMap((w) => w.skills);
  return [...cw.skills, ...earlier].filter((id, i, a) => a.indexOf(id) === i && isOpen(p, id)).slice(0, 3);
}

export function planProgress(p: Profile) {
  const plan = p.plan;
  if (!plan) return { done: 0, total: 0 };
  const total = plan.ordered.length;
  return { done: plan.ordered.filter((id) => !isOpen(p, id)).length, total };
}
