import type { Profile } from "./progress";
import { ALL_TABLES, MIN_TABLE, dayKey, factKey, tablesOf, type DayLog } from "./tables";

/** Things made from the tables day log: streaks, the recall-time trend and the weekly family winner. */
const DAY_MS = 86_400_000;
const daysOf = (p: Profile): DayLog[] => tablesOf(p).days ?? [];
/** The date key for `n` days before `now`, by calendar day (safe across clock changes). */
const back = (now: number, n: number) => { const t = new Date(now); t.setDate(t.getDate() - n); return dayKey(t.getTime()); };

/** Days in a row with some practice. Today not yet practised doesn't break a streak that ran up to yesterday. */
export function streakOf(p: Profile, now = Date.now()): { current: number; best: number; practisedToday: boolean } {
  const set = new Set(daysOf(p).filter((x) => x.n > 0).map((x) => x.d));
  const practisedToday = set.has(dayKey(now));
  let current = 0;
  for (let i = practisedToday ? 0 : 1; set.has(back(now, i)); i++) current++;
  let best = 0, run = 0, prev = "";
  for (const d of [...set].sort()) {
    const next = prev ? dayKey(new Date(`${prev}T12:00:00`).getTime() + DAY_MS) : "";
    run = prev && d === next ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  return { current, best: Math.max(best, current), practisedToday };
}

/** Average time of right answers for each of the last `days` days (null on days with none), oldest first. */
export function speedTrend(p: Profile, days = 14, now = Date.now()): { d: string; ms: number | null; right: number }[] {
  const by = new Map(daysOf(p).map((x) => [x.d, x]));
  return Array.from({ length: days }, (_, i) => { const d = back(now, days - 1 - i), x = by.get(d); return { d, ms: x && x.r ? x.ms : null, right: x?.r ?? 0 }; });
}

/** Recall time for every fact in the grid: milliseconds, or null when it hasn't been answered right yet. Rows and columns are tables 2 to 12. */
export function recallGrid(p: Profile): (number | null)[][] {
  const t = tablesOf(p);
  return ALL_TABLES.map((a) => ALL_TABLES.map((b) => t.facts[factKey(a, b)]?.ms || null));
}
export const gridSlot = (table: number) => table - MIN_TABLE;

/** The Monday (local) on or before `now`, as a date key. */
export function weekStartKey(now = Date.now()): string { const t = new Date(now); return back(now, (t.getDay() + 6) % 7); }

export interface WeekRow { id: string; name: string; avatar: Profile["avatar"]; year: number; right: number; days: number; rank: number; you: boolean }
/** This week's tables practice for everyone on the board: correct answers, ranked. A tie shares first place; nobody wins with none. */
export function weeklyBoard(profiles: Profile[], youId: string, now = Date.now()): { rows: WeekRow[]; winners: string[] } {
  const from = weekStartKey(now);
  const rows = profiles.filter((p) => p.tables?.showOnBoard !== false).map((p) => {
    const mine = daysOf(p).filter((x) => x.d >= from);
    return { id: p.id, name: p.name, avatar: p.avatar, year: p.year, right: mine.reduce((t, x) => t + x.r, 0), days: mine.filter((x) => x.n > 0).length, rank: 0, you: p.id === youId };
  }).sort((a, b) => b.right - a.right);
  rows.forEach((r, i) => { r.rank = i && rows[i - 1].right === r.right ? rows[i - 1].rank : i + 1; });
  return { rows, winners: rows.filter((r) => r.rank === 1 && r.right > 0).map((r) => r.id) };
}
