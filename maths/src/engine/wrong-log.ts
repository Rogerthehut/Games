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
  source: "practice" | "lesson" | "paper" | "check-up";
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

/**
 * A "fix this" practice set for one topic: the exact questions that went wrong (up to four, most recent first) asked again, then
 * fresh questions at the same level, so a child can show they've got it. Questions without a seed (from check-ups) can't be asked
 * again, so only the fresh ones are used for those.
 */
export function fixPlan(entries: WrongEntry[], skillId: string): import("./progress").Pick[] {
  const mine = entries.filter((e) => e.skill === skillId).sort((a, b) => b.at - a.at);
  const retries = mine.filter((e) => e.seed !== undefined).filter((e, i, all) => all.findIndex((x) => x.prompt === e.prompt) === i).slice(0, 4);
  const level = Math.max(1, ...mine.map((e) => e.level));
  const fresh = Math.max(4, 8 - retries.length);
  return [
    ...retries.map((e) => ({ skillId, reason: "fix" as const, seed: e.seed, level: e.level })),
    ...Array.from({ length: fresh }, () => ({ skillId, reason: "fix" as const, level })),
  ];
}

/** For a question answered once, with no second try (papers and check-ups): a blank answer counts as skipped. */
export function recordWrongOnce(p: Profile, q: Question, inputs: string[], source: WrongEntry["source"], tag?: string, message?: string, now = Date.now()): Profile {
  const tried = inputs.filter((s) => s.trim());
  return recordWrong(p, { q, outcome: tried.length ? "missed" : "gave-up", tried: tried.length ? [inputs.join(" / ")] : [], tags: tag ? [tag] : [], notes: message ? [message] : [], source }, now);
}
