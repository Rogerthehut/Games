import { SKILLS, SKILL_BY_ID } from "../curriculum";
import type { Skill, Strand } from "./types";
import type { Plan } from "./plan";
import type { Rng } from "./rng";

export const DAY = 86_400_000;
/** Days until a skill is due again, by Leitner box (0 = still learning). */
export const INTERVALS = [0, 1, 3, 7, 14, 30];
export const SECURE_BOX = 4;

export interface SkillState {
  box: number;
  due: number;
  seen: number;
  right: number;
  wrong: number;
  last: number;
  /** Set when the year group said the child has probably covered it already. */
  assumed?: boolean;
}

export interface SessionLog {
  at: number;
  minutes: number;
  answered: number;
  correct: number;
  skills: string[];
}

export interface DiagResponse { skillId: string; level: number; correct: boolean; ms: number }
export type ReadinessBand = "early" | "building" | "on-track" | "ready";

/** The outcome of one check-up. Kept so progress between check-ups can be shown. */
export interface BaselineRecord {
  at: number;
  startYear: number;
  /** Working level on a school-year scale: 5.5 is "mid Year 5". */
  theta: number;
  /** Rough uncertainty in the same units. */
  se: number;
  strands: { strand: Strand; theta: number; n: number; right: number }[];
  gaps: string[];
  strengths: string[];
  readiness: ReadinessBand;
  questions: number;
  correct: number;
  minutes: number;
  responses: DiagResponse[];
}

/** What the family is working towards. Location is kept coarse on purpose (town or postcode area only). */
export interface Goal {
  exam: "gl" | "cem" | "unsure" | "none";
  area: string;
  schools: string[];
  examDate?: number;
  sessionsPerWeek: number;
}

/** A timed practice paper. */
export interface MockRecord {
  at: number;
  total: number;
  score: number;
  seconds: number;
  limitSeconds: number;
  byStrand: { strand: Strand; right: number; n: number }[];
}

export interface Profile {
  id: string;
  name: string;
  year: number;
  createdAt: number;
  skills: Record<string, SkillState>;
  sessions: SessionLog[];
  /** Counts of common mistakes by tag, with a note of which skill and when. */
  mistakes: Record<string, { count: number; skill: string; last: number; message: string }>;
  /** Skills the grown-up has asked the child to focus on. */
  focus: string[];
  points: number;
  baselines: BaselineRecord[];
  mocks?: MockRecord[];
  /** A check-up in progress, so a child can pause and carry on. */
  diag?: { startedAt: number; responses: DiagResponse[] };
  plan?: Plan;
  goal?: Goal;
  /** Visual style. "auto" follows the school year. */
  skin?: "auto" | "explorer" | "navigator" | "scholar";
}

export function newProfile(name: string, year: number, now = Date.now()): Profile {
  const skills: Record<string, SkillState> = {};
  for (const s of SKILLS)
    if (s.year < year) skills[s.id] = { box: 3, due: now + 3 * DAY, seen: 0, right: 0, wrong: 0, last: 0, assumed: true };
  return {
    id: `p_${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    name, year, createdAt: now, skills, sessions: [], mistakes: {}, focus: [], points: 0, baselines: [],
  };
}

export const levelOf = (st?: SkillState) => (st ? Math.min(3, 1 + Math.floor(st.box / 2)) : 1);
export type Status = "new" | "assumed" | "learning" | "growing" | "secure";
export function statusOf(st?: SkillState): Status {
  if (!st || (st.seen === 0 && !st.assumed)) return "new";
  if (st.assumed) return "assumed";
  if (st.box >= SECURE_BOX) return "secure";
  if (st.box >= 2) return "growing";
  return "learning";
}

export type AnswerKind = "right" | "helped" | "wrong";

/** Record one question. "helped" = right, but only after a hint or a second try. */
export function recordAnswer(p: Profile, skillId: string, kind: AnswerKind, now = Date.now()): Profile {
  const prev = p.skills[skillId] ?? { box: 0, due: now, seen: 0, right: 0, wrong: 0, last: 0 };
  const st: SkillState = { ...prev, seen: prev.seen + 1, last: now, assumed: undefined };
  if (kind === "right") {
    st.right++;
    st.box = Math.min(5, st.box + 1);
    st.due = now + INTERVALS[st.box] * DAY;
  } else if (kind === "helped") {
    st.right++;
    st.due = now + Math.max(0.25, INTERVALS[st.box]) * DAY * (st.box === 0 ? 0.01 : 0.5);
  } else {
    st.wrong++;
    st.box = Math.max(0, st.box - 1);
    st.due = now;
  }
  return { ...p, skills: { ...p.skills, [skillId]: st } };
}

export function recordMistake(p: Profile, tag: string, skill: string, message: string, now = Date.now()): Profile {
  const key = `${skill}:${tag}`;
  const prev = p.mistakes[key];
  return { ...p, mistakes: { ...p.mistakes, [key]: { count: (prev?.count ?? 0) + 1, skill, last: now, message } } };
}

export function addPoints(p: Profile, n: number): Profile {
  return { ...p, points: p.points + n };
}

export const isUnlocked = (p: Profile, s: Skill) => s.prereqs.every((id) => (p.skills[id]?.box ?? 0) >= 2);

/** Why a skill is next in line. */
export type Reason = "review" | "focus" | "continue" | "next";

export interface Pick { skillId: string; reason: Reason }

/** Pick up to three skills worth practising right now: due reviews, grown-up focus, then the frontier. */
export function pickSkills(p: Profile, now: number, rng: Rng, max = 3): Pick[] {
  const scored: { pick: Pick; score: number }[] = [];
  for (const s of SKILLS) {
    const st = p.skills[s.id];
    const tie = rng() * 0.2;
    if (st && (st.seen > 0 || st.assumed) && st.due <= now && st.box < 5) {
      scored.push({ pick: { skillId: s.id, reason: "review" }, score: 3 + Math.min(2, (now - st.due) / DAY / 10) + tie });
    } else if (p.focus.includes(s.id) && (st?.box ?? 0) < 5) {
      scored.push({ pick: { skillId: s.id, reason: "focus" }, score: 2.8 + tie });
    } else if (!st?.assumed && isUnlocked(p, s) && (st?.box ?? 0) < SECURE_BOX) {
      const inProgress = !!st && st.seen > 0;
      // Prefer skills at the learner's year group, then easier years.
      const closeness = 1 - Math.min(1, Math.abs(s.year - p.year) / 6);
      scored.push({ pick: { skillId: s.id, reason: inProgress ? "continue" : "next" }, score: (inProgress ? 2 : 1) + closeness * 0.5 + tie });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const out = scored.slice(0, max).map((x) => x.pick);
  if (out.length === 0) {
    // Everything is secure: keep the best-known skills warm.
    const any = [...SKILLS].sort((a, b) => (p.skills[a.id]?.due ?? 0) - (p.skills[b.id]?.due ?? 0)).slice(0, max);
    return any.map((s) => ({ skillId: s.id, reason: "review" as Reason }));
  }
  return out;
}

/** An interleaved list of skill ids for one session, e.g. A B C A B C A B C. */
export function buildSession(p: Profile, now: number, rng: Rng, size = 9): Pick[] {
  const picks = pickSkills(p, now, rng);
  return Array.from({ length: size }, (_, i) => picks[i % picks.length]);
}

export function practiceDaysThisWeek(p: Profile, now = Date.now()): boolean[] {
  const d = new Date(now);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow).getTime();
  return Array.from({ length: 7 }, (_, i) =>
    p.sessions.some((s) => s.at >= start + i * DAY && s.at < start + (i + 1) * DAY),
  );
}

export function weekStats(p: Profile, now = Date.now()) {
  const since = now - 7 * DAY;
  const recent = p.sessions.filter((s) => s.at >= since);
  const answered = recent.reduce((s, x) => s + x.answered, 0);
  const correct = recent.reduce((s, x) => s + x.correct, 0);
  return {
    sessions: recent.length,
    minutes: Math.round(recent.reduce((s, x) => s + x.minutes, 0)),
    answered, correct,
    accuracy: answered ? Math.round((100 * correct) / answered) : null,
  };
}

export const skillName = (id: string) => SKILL_BY_ID[id]?.name ?? id;
