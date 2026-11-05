import { SKILLS, SKILL_BY_ID } from "../curriculum";
import type { Strand } from "./types";
import type { Rng } from "./rng";
import { DAY, INTERVALS, type BaselineRecord, type DiagResponse, type Profile, type ReadinessBand, type SkillState } from "./progress";

/**
 * Adaptive check-up.
 *
 * Every question has a difficulty on a school-year scale (4.5 means "mid Year 4"). The child has an estimated
 * working level on the same scale. After each answer the estimate moves up or down by how surprising the result
 * was (an Elo-style update), and the next question is chosen close to the estimate, while spreading across topic
 * strands and probing the prerequisites of anything missed, so the test finds the actual gap, not just a level.
 *
 * Difficulties are anchored to when the curriculum teaches each skill. They are estimates, not calibrated against
 * real children yet; the report says so. Calibration needs real response data.
 */

export const TEST_LENGTH = 24;
const SCALE = 0.7; // how sharply the chance of a correct answer changes with difficulty, in school years
const MIN_THETA = 2.5, MAX_THETA = 13.9;

export const difficulty = (skillId: string, level: number) => SKILL_BY_ID[skillId].year + 0.05 + (level - 1) * 0.45;
const chance = (theta: number, d: number) => 1 / (1 + Math.exp(-(theta - d) / SCALE));
const clamp = (x: number) => Math.min(MAX_THETA, Math.max(MIN_THETA, x));

export interface DiagState {
  startYear: number;
  theta: number;
  n: number;
  strands: Record<string, { theta: number; n: number; right: number }>;
  responses: DiagResponse[];
  asked: Set<string>;
}

export function startState(startYear: number): DiagState {
  const t0 = startYear + 0.3;
  return { startYear, theta: t0, n: 0, strands: {}, responses: [], asked: new Set() };
}

export function applyResponse(s: DiagState, r: DiagResponse): DiagState {
  const d = difficulty(r.skillId, r.level);
  const strand = SKILL_BY_ID[r.skillId].strand;
  const c = r.correct ? 1 : 0;
  const k = Math.max(0.15, 0.85 * Math.pow(0.93, s.n));
  const prev = s.strands[strand] ?? { theta: s.theta, n: 0, right: 0 };
  const ks = Math.max(0.2, 0.7 * Math.pow(0.85, prev.n));
  return {
    ...s,
    theta: clamp(s.theta + k * (c - chance(s.theta, d))),
    n: s.n + 1,
    strands: { ...s.strands, [strand]: { theta: clamp(prev.theta + ks * (c - chance(prev.theta, d))), n: prev.n + 1, right: prev.right + c } },
    responses: [...s.responses, r],
    asked: new Set([...s.asked, `${r.skillId}:${r.level}`]),
  };
}

export function replay(startYear: number, responses: DiagResponse[]): DiagState {
  return responses.reduce(applyResponse, startState(startYear));
}

export interface Item { skillId: string; level: number }

const lowestUnasked = (s: DiagState, id: string) => [1, 2, 3].find((l) => !s.asked.has(`${id}:${l}`));

/** The next question: near the current estimate, spread across strands, probing prerequisites of recent misses. */
export function nextItem(s: DiagState, rng: Rng): Item | null {
  if (s.n >= TEST_LENGTH) return null;
  const perStrand: Record<string, number> = {};
  const perSkill: Record<string, number> = {};
  for (const r of s.responses) {
    const st = SKILL_BY_ID[r.skillId].strand;
    perStrand[st] = (perStrand[st] ?? 0) + 1;
    perSkill[r.skillId] = (perSkill[r.skillId] ?? 0) + 1;
  }
  const last = s.responses[s.responses.length - 1]?.skillId;
  // A miss on something the child should have known is a signal worth following: check what it is built on.
  const probing = new Set<string>();
  for (const r of s.responses.slice(-3))
    if (!r.correct && chance(s.theta, difficulty(r.skillId, r.level)) >= 0.5) for (const p of SKILL_BY_ID[r.skillId].prereqs) probing.add(p);

  const confirming = new Set<string>();
  const missLevel: Record<string, number> = {};
  for (const r of s.responses.slice(-2)) if (!r.correct) { confirming.add(r.skillId); missLevel[r.skillId] = Math.max(missLevel[r.skillId] ?? 0, r.level); }
  // a skill that already has a right answer below the miss needs no confirming
  for (const id of [...confirming]) if (s.responses.some((r) => r.skillId === id && r.correct && r.level < (missLevel[id] ?? 0))) confirming.delete(id);

  let best: { item: Item; score: number } | null = null;
  for (const skill of SKILLS) {
    for (let level = 1; level <= 3; level++) {
      if (s.asked.has(`${skill.id}:${level}`)) continue;
      const d = difficulty(skill.id, level);
      let score = Math.abs(d - (s.theta + (rng() - 0.5) * 0.3));
      score += 0.35 * (perStrand[skill.strand] ?? 0);
      score += 0.5 * (perSkill[skill.id] ?? 0);
      if (skill.id === last) score += 0.7;
      // Confirm a miss: ask an easier question on the same skill before calling it a gap.
      if (confirming.has(skill.id) && level < (missLevel[skill.id] ?? 0) && !s.asked.has(`${skill.id}:${level}`) && level === lowestUnasked(s, skill.id))
        score = 0.25 + 0.1 * (perSkill[skill.id] ?? 0);
      // Probing ignores distance from the working level: a basic skill is far below it, and that is the point.
      if (probing.has(skill.id) && (perSkill[skill.id] ?? 0) < 2) score = 0.2 + 0.12 * Math.abs(level - 2) + 0.5 * (perSkill[skill.id] ?? 0);
      score += rng() * 0.08;
      if (!best || score < best.score) best = { item: { skillId: skill.id, level }, score };
    }
  }
  return best?.item ?? null;
}

export const bandOf = (theta: number): ReadinessBand => (theta >= 6.3 ? "ready" : theta >= 5.6 ? "on-track" : theta >= 4.7 ? "building" : "early");
export const BAND_TEXT: Record<ReadinessBand, { label: string; detail: string }> = {
  ready: { label: "Working at the level 11+ maths expects", detail: "Maths is secure at upper primary level. Practice from here is about speed, accuracy and tricky problem types." },
  "on-track": { label: "Close to the 11+ level", detail: "Most of the content is in place. A few gaps and some practice with exam-style questions should close it." },
  building: { label: "Building towards the 11+ level", detail: "There is real work to do on the basics before exam-style questions. A steady plan over several months can get there." },
  early: { label: "Early in the journey", detail: "The best use of time now is secure foundations (number, times tables, fractions) before anything exam-specific." },
};

export const BELOW_RANGE = 3.2;

export function yearLabel(theta: number): string {
  if (theta < BELOW_RANGE) return "below Year 3";
  const y = Math.floor(theta), f = theta - y;
  return `${f < 0.34 ? "early" : f < 0.67 ? "mid" : "late"} Year ${y}`;
}

/** Turn a finished test into a record the app can store and explain. */
export function summarise(s: DiagState, now = Date.now()): BaselineRecord {
  const bySkill: Record<string, DiagResponse[]> = {};
  for (const r of s.responses) (bySkill[r.skillId] ??= []).push(r);

  const gaps: string[] = [], strengths: string[] = [];
  for (const [id, rs] of Object.entries(bySkill)) {
    const wrongs = rs.filter((r) => !r.correct), rights = rs.filter((r) => r.correct);
    const bestRight = Math.max(-1, ...rights.map((r) => difficulty(id, r.level)));
    const worstMiss = wrongs.length ? Math.min(...wrongs.map((r) => difficulty(id, r.level))) : Infinity;
    // A gap is a skill the child should know at their level but keeps missing: more than half of the questions on it
    // that were at or below their level were wrong, including one clearly below it, or it was missed every time.
    const relevant = rs.filter((r) => difficulty(id, r.level) <= s.theta + 0.25);
    const clearMiss = wrongs.length > 0 && worstMiss <= s.theta - 0.2 && relevant.filter((r) => !r.correct).length / Math.max(1, relevant.length) > 0.5;
    const missedRepeatedly = wrongs.length >= 2 && rights.length === 0 && worstMiss <= s.theta + 0.25;
    if (clearMiss || missedRepeatedly) gaps.push(id);
    else if (rights.length && bestRight >= s.theta - 0.1) strengths.push(id);
  }

  const strands = Object.entries(s.strands).map(([strand, v]) => ({
    strand: strand as Strand,
    theta: Math.round(((v.n * v.theta + 1.5 * s.theta) / (v.n + 1.5)) * 10) / 10, // shrink toward the overall estimate
    n: v.n,
    right: v.right,
  }));
  const se = 1.5 / Math.sqrt(Math.max(1, s.n));
  const ms = s.responses.reduce((t, r) => t + Math.min(r.ms, 180_000), 0);
  return {
    at: now,
    startYear: s.startYear,
    theta: Math.round(s.theta * 10) / 10,
    se: Math.round(se * 100) / 100,
    strands,
    gaps,
    strengths,
    readiness: bandOf(s.theta),
    questions: s.n,
    correct: s.responses.filter((r) => r.correct).length,
    minutes: Math.max(1, Math.round(ms / 60000)),
    responses: s.responses,
  };
}

/** Seed the learner's skill states from the check-up, so practice starts where they actually are. */
export function applyBaseline(p: Profile, rec: BaselineRecord, now = Date.now()): Profile {
  const skills: Record<string, SkillState> = { ...p.skills };
  const bySkill: Record<string, DiagResponse[]> = {};
  for (const r of rec.responses) (bySkill[r.skillId] ??= []).push(r);
  const gapSet = new Set(rec.gaps);

  for (const s of SKILLS) {
    const rs = bySkill[s.id];
    if (rs) {
      const rights = rs.filter((r) => r.correct), wrongs = rs.length - rights.length;
      const bestLevel = Math.max(0, ...rights.map((r) => r.level));
      let box = gapSet.has(s.id) ? 0 : [0, 2, 3, 4][bestLevel];
      // Right on a question years below their working level means the skill is secure, not "still learning".
      const bestD = rights.length ? Math.max(...rights.map((r) => difficulty(s.id, r.level))) : -1;
      if (!gapSet.has(s.id) && rights.length && bestD <= rec.theta - 0.7) box = 4;
      skills[s.id] = { box, due: box === 0 ? now : now + INTERVALS[box] * DAY, seen: rs.length, right: rights.length, wrong: wrongs, last: now };
      continue;
    }
    const prev = skills[s.id];
    if (prev && prev.seen > 0) continue; // real practice history beats an assumption
    const prereqGap = s.prereqs.some((id) => gapSet.has(id));
    if (!prereqGap && s.year + 0.45 <= rec.theta - 0.5) skills[s.id] = { box: 3, due: now + 3 * DAY, seen: 0, right: 0, wrong: 0, last: 0, assumed: true };
    else delete skills[s.id];
  }
  return { ...p, skills, baselines: [...(p.baselines ?? []), rec], diag: undefined };
}
