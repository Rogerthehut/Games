import type { Profile } from "./progress";
import type { Question } from "./types";

/**
 * A short record of every question a learner got wrong or needed help with, so a grown-up can see exactly which ones and why.
 * It keeps the question's text and the answers tried, and the seed it was made from, so the full question (picture, steps) can be
 * made again. Old entries drop away after 120 days, and there is a cap on how many are kept.
 */
export type WrongOutcome = "missed" | "helped" | "gave-up";
export interface WrongEntry {
  at: number;
  skill: string;
  level: number;
  /** The question's text, as asked. */
  prompt: string;
  /** The right answer, as it is shown. */
  shown: string;
  /** What the learner typed on each wrong try. */
  tried: string[];
  /** missed: never got it; helped: got it after a wrong try or a hint; gave-up: asked to see the steps without trying. */
  outcome: WrongOutcome;
  /** Common-mistake tags the marking recognised. */
  tags: string[];
  /** The plain-words notes the marking gave for those tags. */
  notes: string[];
  /** The seed the question was made from, with its level. Missing for older entries. */
  seed?: number;
  /** Where it came from. */
  source: "practice" | "lesson";
}

export const WRONG_LOG_MAX = 250;
export const WRONG_LOG_DAYS = 120;
const DAY = 86_400_000;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export const wrongLogOf = (p: Profile): WrongEntry[] => p.wrongLog ?? [];

/** Drops entries that are too old, and the oldest beyond the cap. */
export function pruneWrongLog(log: WrongEntry[], now = Date.now()): WrongEntry[] {
  return log.filter((e) => now - e.at <= WRONG_LOG_DAYS * DAY).slice(-WRONG_LOG_MAX);
}

export interface WrongInput { q: Question; outcome: WrongOutcome; tried: string[]; tags: string[]; notes: string[]; source: WrongEntry["source"] }

/** Adds one entry. The same question (same seed, same skill) isn't added twice in a row. */
export function recordWrong(p: Profile, input: WrongInput, now = Date.now()): Profile {
  const log = pruneWrongLog(wrongLogOf(p), now);
  const last = log[log.length - 1];
  if (last && last.skill === input.q.skill && last.prompt === input.q.prompt && now - last.at < 60_000) return p;
  const entry: WrongEntry = {
    at: now, skill: input.q.skill, level: input.q.level, prompt: clip(input.q.prompt, 400), shown: clip(input.q.shown, 120),
    tried: input.tried.slice(0, 4).map((t) => clip(t, 40)), outcome: input.outcome,
    tags: [...new Set(input.tags)].slice(0, 4), notes: [...new Set(input.notes)].slice(0, 3).map((n) => clip(n, 240)),
    seed: input.q.seed, source: input.source,
  };
  return { ...p, wrongLog: [...log, entry].slice(-WRONG_LOG_MAX) };
}
