import { addPoints, type Profile } from "./progress";
import type { Rng } from "./rng";
import { ALL_TABLES, factKey, tablesOf, type TableQ } from "./tables";

/**
 * Timed times-table challenges for fun: a 60-second blitz (most right) and a 25-question race (fastest). Each learner keeps personal
 * bests and recent results; learners on the same account can be compared on a family board. Wording is always about doing better than
 * your own best, never about being slow.
 */
export type ChallengeMode = "blitz" | "race";
/** "mine" uses the tables the learner is working on; "all" is every table from 2 to 12, the fair one to compare. */
export type ChallengeScope = "mine" | "all";

export const BLITZ_SECONDS = 60;
export const RACE_LENGTH = 25;
/** Each wrong answer in the race adds this long to the time. */
export const RACE_PENALTY_MS = 3000;

export const MODES: { id: ChallengeMode; name: string; blurb: string }[] = [
  { id: "blitz", name: "60-second blitz", blurb: "How many can you get right in 60 seconds?" },
  { id: "race", name: "25-question race", blurb: "Answer 25 as fast as you can. A wrong answer adds 3 seconds." },
];

export interface ChallengeResult {
  at: number; mode: ChallengeMode; scope: ChallengeScope;
  right: number; wrong: number;
  /** How long it took, in milliseconds. The race score is this plus the penalties. */
  ms: number;
  /** The score that is compared: right answers for the blitz, time with penalties for the race. */
  score: number;
}
export interface ChallengeState {
  /** Best result for each `mode:scope`. */
  bests: Record<string, ChallengeResult>;
  /** Recent results, newest last. */
  history: ChallengeResult[];
}

export const bestKey = (mode: ChallengeMode, scope: ChallengeScope) => `${mode}:${scope}`;
export const challengesOf = (p: Profile): ChallengeState => p.tables?.challenges ?? { bests: {}, history: [] };

/** The number a result is judged by. */
export const scoreOf = (mode: ChallengeMode, right: number, ms: number, wrong: number) => (mode === "blitz" ? right : ms + wrong * RACE_PENALTY_MS);
/** Higher is better in the blitz, lower in the race. */
export const isBetter = (mode: ChallengeMode, a: number, b: number) => (mode === "blitz" ? a > b : a < b);

/** A race only counts once every question is answered; a blitz needs at least one right answer. */
export const countsAsResult = (mode: ChallengeMode, right: number, wrong: number) => (mode === "race" ? right + wrong >= RACE_LENGTH : right > 0);

/** The next question. It never repeats the one before, and comes from the chosen tables (a fact belongs if either number is one of them). */
export function nextChallengeQ(p: Profile, scope: ChallengeScope, r: Rng, lastKey = ""): TableQ {
  const active = scope === "mine" ? tablesOf(p).active : ALL_TABLES;
  const pool = active.length ? active : ALL_TABLES;
  for (let tries = 0; tries < 50; tries++) {
    const a = pool[Math.floor(r() * pool.length)], b = ALL_TABLES[Math.floor(r() * ALL_TABLES.length)];
    if (factKey(a, b) === lastKey) continue;
    const [x, y] = r() < 0.5 ? [a, b] : [b, a];
    return { a: x, b: y, op: "×", answer: x * y, prompt: `${x} × ${y}` };
  }
  return { a: 2, b: 3, op: "×", answer: 6, prompt: "2 × 3" };
}

export interface RecordedChallenge { profile: Profile; newBest: boolean; previous?: ChallengeResult; result: ChallengeResult }

/** Saves a finished challenge: the result, the personal best if it beat the old one, and a few points. */
export function recordChallenge(p: Profile, mode: ChallengeMode, scope: ChallengeScope, right: number, wrong: number, ms: number, now = Date.now()): RecordedChallenge {
  const result: ChallengeResult = { at: now, mode, scope, right, wrong, ms, score: scoreOf(mode, right, ms, wrong) };
  const t = tablesOf(p), c = challengesOf(p), key = bestKey(mode, scope), previous = c.bests[key];
  const counts = countsAsResult(mode, right, wrong);
  const newBest = counts && (!previous || isBetter(mode, result.score, previous.score));
  const next: ChallengeState = { bests: newBest ? { ...c.bests, [key]: result } : c.bests, history: counts ? [...c.history, result].slice(-30) : c.history };
  const out = addPoints({ ...p, tables: { ...t, challenges: next } }, counts ? 3 + Math.min(right, 30) : 0);
  return { profile: out, newBest, previous, result };
}

export interface BoardRow { id: string; name: string; avatar: Profile["avatar"]; year: number; best?: ChallengeResult; rank: number; you: boolean }

/** The family board for one challenge: everyone who is on it, best first, with equal scores sharing a place. Learners with no result yet are listed last. */
export function familyBoard(profiles: Profile[], mode: ChallengeMode, scope: ChallengeScope, youId: string): BoardRow[] {
  const shown = profiles.filter((p) => p.tables?.showOnBoard !== false);
  const withBest = shown.map((p) => ({ p, best: challengesOf(p).bests[bestKey(mode, scope)] }));
  const ranked = withBest.filter((x) => x.best).sort((a, b) => (a.best!.score === b.best!.score ? a.best!.at - b.best!.at : isBetter(mode, a.best!.score, b.best!.score) ? -1 : 1));
  const rows: BoardRow[] = [];
  ranked.forEach((x, i) => {
    const prev = rows[i - 1];
    rows.push({ id: x.p.id, name: x.p.name, avatar: x.p.avatar, year: x.p.year, best: x.best, rank: prev && prev.best!.score === x.best!.score ? prev.rank : i + 1, you: x.p.id === youId });
  });
  for (const x of withBest.filter((y) => !y.best)) rows.push({ id: x.p.id, name: x.p.name, avatar: x.p.avatar, year: x.p.year, rank: 0, you: x.p.id === youId });
  return rows;
}

/** A score in words: "23 right", or "1:12.4" for a race. */
export function describeScore(mode: ChallengeMode, r: Pick<ChallengeResult, "score" | "right">): string {
  if (mode === "blitz") return `${r.score} right`;
  const s = r.score / 1000, m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}
