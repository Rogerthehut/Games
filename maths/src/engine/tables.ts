import { DAY, type Profile } from "./progress";
import { int, type Rng } from "./rng";
import type { ChallengeState } from "./tables-challenge";

/** What is known about one multiplication fact, such as 7 × 8. Kept short because there are many of them. */
export interface FactState {
  /** How well it is known, 0 to 5. */
  b: number;
  /** When it is next worth practising. */
  d: number;
  /** Times asked, and times right. */
  n: number; r: number;
  /** How quickly right answers usually come, in milliseconds (a running average). 0 means no right answer yet. */
  ms: number;
}
export interface TablesState {
  facts: Record<string, FactState>;
  /** The tables the learner is working on now (2 to 12). */
  active: number[];
  rounds: number;
  /** Attempts at the timed check, newest last. */
  checks: { at: number; score: number; total: number }[];
  /** Timed challenges: personal bests and recent results (see tables-challenge.ts). */
  challenges?: ChallengeState;
  /** Whether this learner shows on the family board. Missing means yes. */
  showOnBoard?: boolean;
  /** One entry per day with any tables answers, oldest first, for streaks, the speed chart and the weekly winner (see tables-progress.ts). */
  days?: DayLog[];
}
/** What was answered on one day: `d` is the local date (YYYY-MM-DD), `n` answers, `r` right, `ms` the average time of the right ones. */
export interface DayLog { d: string; n: number; r: number; ms: number }
export const DAYS_KEPT = 120;
/** The local date as YYYY-MM-DD. */
export const dayKey = (now: number): string => { const t = new Date(now); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
/** Adds one answer to the day log. */
export function logDay(days: DayLog[] | undefined, correct: boolean, took: number, now: number): DayLog[] {
  const d = dayKey(now), list = days ?? [], last = list[list.length - 1];
  const cur: DayLog = last && last.d === d ? { ...last } : { d, n: 0, r: 0, ms: 0 };
  cur.n++;
  if (correct) { cur.ms = cur.r ? Math.round((cur.ms * cur.r + took) / (cur.r + 1)) : took; cur.r++; }
  return [...(last && last.d === d ? list.slice(0, -1) : list), cur].slice(-DAYS_KEPT);
}

export const MIN_TABLE = 2, MAX_TABLE = 12;
export const ALL_TABLES = Array.from({ length: MAX_TABLE - MIN_TABLE + 1 }, (_, i) => MIN_TABLE + i);
/** Answered in this time, a fact counts as quick (recalled, not worked out). */
export const QUICK_MS = 3000;
/** The Year 4 multiplication check gives this long per question, and asks this many. */
export const CHECK_SECONDS = 6;
export const CHECK_LENGTH = 25;
export const ROUND_LENGTH = 10;
const GAPS = [0, 1, 2, 4, 8, 16]; // days until a fact comes back, by how well it is known

/** 7 × 8 and 8 × 7 are the same fact. */
export const factKey = (a: number, b: number) => `${Math.min(a, b)}x${Math.max(a, b)}`;
export const ALL_FACTS: readonly [number, number][] = ALL_TABLES.flatMap((a) => ALL_TABLES.filter((b) => b >= a).map((b) => [a, b] as [number, number]));

/** The tables most children start with: the easy ones first, then everything by Year 5. */
export const defaultTables = (year: number): number[] => (year <= 3 ? [2, 5, 10] : year === 4 ? [2, 3, 4, 5, 8, 10] : [...ALL_TABLES]);

export const tablesOf = (p: Profile): TablesState => p.tables ?? { facts: {}, active: defaultTables(p.year), rounds: 0, checks: [] };

export type FactStatus = "new" | "learning" | "slow" | "quick";
export function factStatus(st?: FactState): FactStatus {
  if (!st || st.n === 0) return "new";
  if (st.b >= 4 && st.ms > 0 && st.ms <= QUICK_MS) return "quick";
  if (st.b >= 2 && st.r > 0) return "slow"; // right, but still worked out rather than remembered
  return "learning";
}
export const STATUS_WORDS: Record<FactStatus, string> = { new: "Not started", learning: "Still learning", slow: "Right, getting quicker", quick: "Quick and secure" };

/** Record one answer to a fact. A right answer that comes quickly moves it up; a slow one keeps it where it is; a wrong one sends it back. */
export function recordFact(p: Profile, a: number, b: number, correct: boolean, ms: number, now = Date.now()): Profile {
  const t = tablesOf(p), key = factKey(a, b);
  const prev = t.facts[key] ?? { b: 0, d: now, n: 0, r: 0, ms: 0 };
  const st: FactState = { ...prev, n: prev.n + 1 };
  if (correct) {
    const took = Math.min(12_000, Math.max(200, ms));
    st.r = prev.r + 1;
    st.ms = prev.ms ? Math.round(prev.ms * 0.5 + took * 0.5) : took;
    if (took <= QUICK_MS) st.b = Math.min(5, prev.b === 0 ? 2 : prev.b + 1); // a first quick right answer is a good start
    else st.b = Math.max(prev.b, Math.min(2, prev.b + 1)); // slow: learning, but not yet "known"
    st.d = now + GAPS[st.b] * DAY * (took <= QUICK_MS ? 1 : 0.5);
  } else {
    st.b = Math.max(0, prev.b - 1);
    st.ms = prev.ms ? Math.round(prev.ms * 1.2) : 0;
    st.d = now;
  }
  return { ...p, tables: { ...t, facts: { ...t.facts, [key]: st }, days: logDay(t.days, correct, Math.min(12_000, Math.max(200, ms)), now) } };
}

export interface TableQ { a: number; b: number; op: "×" | "÷"; /** What to type. */ answer: number; prompt: string }
const makeQ = (a: number, b: number, op: "×" | "÷", r: Rng): TableQ => {
  const [x, y] = r() < 0.5 ? [a, b] : [b, a];
  return op === "×" ? { a: x, b: y, op, answer: x * y, prompt: `${x} × ${y}` } : { a: x, b: y, op, answer: y, prompt: `${x * y} ÷ ${x}` };
};

/** Is this fact in one of the tables being worked on? */
const inActive = (a: number, b: number, active: number[]) => active.includes(a) || active.includes(b);

/** How much a fact deserves a place in the next round. Facts that are wrong or slow come up most; secure ones still return now and then. */
function weight(st: FactState | undefined, now: number): number {
  switch (factStatus(st)) {
    case "new": return 3;
    case "learning": return 6 + (st && st.d <= now ? 2 : 0);
    case "slow": return 4 + (st && st.d <= now ? 2 : 0);
    case "quick": return st && st.d <= now ? 1.5 : 0.4;
  }
}

/** A round of questions drawn from the chosen tables, leaning towards the facts that need the most work. */
export function pickRound(p: Profile, now: number, r: Rng, opts: { size?: number; only?: number } = {}): TableQ[] {
  const t = tablesOf(p), size = opts.size ?? ROUND_LENGTH;
  const pool = ALL_FACTS.filter(([a, b]) => (opts.only ? a === opts.only || b === opts.only : inActive(a, b, t.active)));
  const facts = pool.length ? pool : ALL_FACTS;
  const out: TableQ[] = [];
  const used = new Map<string, number>();
  let last = "";
  for (let i = 0; i < size; i++) {
    const w = facts.map(([a, b]) => { const k = factKey(a, b), uses = used.get(k) ?? 0; return k === last ? 0 : weight(t.facts[k], now) / (1 + uses * 2.5); });
    const total = w.reduce((s, x) => s + x, 0);
    let x = r() * total, idx = 0;
    for (; idx < w.length - 1; idx++) { x -= w[idx]; if (x <= 0) break; }
    const [a, b] = facts[idx], k = factKey(a, b), st = t.facts[k];
    // division is the same fact the other way round: only once a fact has been right at least once
    const op = st && st.r > 0 && r() < 0.3 ? "÷" : "×";
    out.push(makeQ(a, b, op, r));
    used.set(k, (used.get(k) ?? 0) + 1); last = k;
  }
  return out;
}

/** The timed check: like the Year 4 national check, multiplication only, tables 2 to 12, with the same fact never asked twice in a row. */
export function checkQuestions(r: Rng, n = CHECK_LENGTH): TableQ[] {
  const out: TableQ[] = [];
  let last = "";
  while (out.length < n) {
    const a = int(r, MIN_TABLE, MAX_TABLE), b = int(r, MIN_TABLE, MAX_TABLE), k = factKey(a, b);
    if (k === last) continue;
    out.push(makeQ(a, b, "×", r)); last = k;
  }
  return out;
}

export interface TablesSummary {
  total: number; counts: Record<FactStatus, number>;
  /** Per table 2 to 12, how many of its 11 facts are quick. */
  byTable: { table: number; quick: number; of: number }[];
  /** The facts most worth practising: wrong most often or slowest. */
  workOn: { text: string; ms: number | null; wrong: number }[];
  rounds: number; checks: TablesState["checks"];
}
export function summarise(p: Profile): TablesSummary {
  const t = tablesOf(p);
  const counts: Record<FactStatus, number> = { new: 0, learning: 0, slow: 0, quick: 0 };
  const byTable = ALL_TABLES.map((table) => ({ table, quick: 0, of: ALL_TABLES.length }));
  const scored: { score: number; item: TablesSummary["workOn"][number] }[] = [];
  for (const [a, b] of ALL_FACTS) {
    const st = t.facts[factKey(a, b)], s = factStatus(st);
    counts[s]++;
    if (s === "quick") { byTable[a - MIN_TABLE].quick++; if (b !== a) byTable[b - MIN_TABLE].quick++; }
    if (st && st.n > 0 && s !== "quick") scored.push({ score: (st.n - st.r) * 3 + (st.ms || 6000) / 1000 + (s === "learning" ? 4 : 0), item: { text: `${a} × ${b}`, ms: st.ms || null, wrong: st.n - st.r } });
  }
  return { total: ALL_FACTS.length, counts, byTable, workOn: scored.sort((x, y) => y.score - x.score).slice(0, 8).map((x) => x.item), rounds: t.rounds, checks: t.checks };
}

/** A small memory aid for each table. */
export const TRICKS: Record<number, string> = {
  2: "Doubles. Double the number: 2 × 6 is 6 + 6.",
  3: "Count in threes, or double and add one more: 3 × 4 is 4 + 4 + 4.",
  4: "Double, then double again: 4 × 6 is double 6 (12), double again (24).",
  5: "Half of the 10s: 5 × 8 is half of 80. The answers end in 5 or 0.",
  6: "Think 5s plus one more: 6 × 7 is 5 × 7 (35) plus 7 (42). Even times even always ends in an even number.",
  7: "Learn the tricky ones in a rhyme: 5, 6, 7, 8 → 56 = 7 × 8. The rest you may know from other tables.",
  8: "Double, double, double: 8 × 6 is 6 → 12 → 24 → 48.",
  9: "The finger trick, and the digits of every answer add up to 9: 9 × 7 = 63 (6 + 3 = 9). It is 10 × the number, take one of the number.",
  10: "Put a zero on the end.",
  11: "For 2 to 9, repeat the digit: 11 × 4 = 44. For 10 to 12 use 10 × and add one more 11.",
  12: "10 × the number plus 2 × the number: 12 × 7 is 70 + 14 = 84.",
};
