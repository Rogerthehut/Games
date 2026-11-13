import { desc, sql } from "drizzle-orm";
import type { Db } from "./db";
import { schema } from "./db";

/**
 * Anonymous question statistics: how often each topic and difficulty level is answered right, with help, or wrong, how long it takes, and which
 * common mistakes turn up, by age band and week. They show which questions are too hard, too easy or confusing, and are the only learner-level
 * data kept for improving quarter and its question sets.
 *
 * What is stored: week (the Monday), topic id, level, age band, and counts. What is NOT stored: who (no parent, learner or device id), the address,
 * the question text or seed, anything typed, or any time finer than a week. The sender must be a signed-in parent (so the endpoint can't be
 * flooded with made-up numbers) but the server uses that only for rate limits and never writes it down. See docs/DATA_COLLECTION.md.
 */
export const BANDS = ["ks2", "ks3", "ks4", "ks5"] as const;
export type Band = typeof BANDS[number];
export const bandOfYear = (year: number): Band => (year <= 6 ? "ks2" : year <= 9 ? "ks3" : year <= 11 ? "ks4" : "ks5");

/** One answered question. r: 0 right first time, 1 right with help or after a miss, 2 wrong or gave up. s: seconds spent, 0 to 180. */
export interface QEvent { skill: string; level: number; band: Band; r: 0 | 1 | 2; s: number; tags: string[] }

const ID = /^[a-z0-9][a-z0-9-]{0,59}$/;
export const MAX_EVENTS = 100;

/** Keeps only well-formed events. Anything odd is dropped rather than stored. */
export function cleanEvents(body: unknown): QEvent[] {
  const list = body && typeof body === "object" ? (body as { events?: unknown }).events : null;
  if (!Array.isArray(list)) return [];
  const out: QEvent[] = [];
  for (const e of list.slice(0, MAX_EVENTS)) {
    if (!e || typeof e !== "object") continue;
    const { skill, level, band, r, s, tags } = e as Record<string, unknown>;
    if (typeof skill !== "string" || !ID.test(skill)) continue;
    if (typeof level !== "number" || !Number.isInteger(level) || level < 0 || level > 10) continue;
    if (typeof band !== "string" || !(BANDS as readonly string[]).includes(band)) continue;
    if (r !== 0 && r !== 1 && r !== 2) continue;
    if (typeof s !== "number" || !Number.isFinite(s)) continue;
    const t = Array.isArray(tags) ? [...new Set(tags.filter((x): x is string => typeof x === "string" && ID.test(x)))].slice(0, 3) : [];
    out.push({ skill, level, band: band as Band, r, s: Math.max(0, Math.min(180, Math.round(s))), tags: t });
  }
  return out;
}

/** The Monday of the week a moment falls in (UTC), as YYYY-MM-DD. */
export function weekOf(now = Date.now()): string {
  const d = new Date(now); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export async function recordEvents(db: Db, events: QEvent[], now = Date.now()): Promise<number> {
  if (!events.length) return 0;
  const week = weekOf(now), q = schema.questionStats, m = schema.misconceptionStats;
  // add the batch up first, so each row is written once
  const rows = new Map<string, { skill: string; level: number; band: Band; a: number; r0: number; r1: number; r2: number; s: number }>();
  const tags = new Map<string, { skill: string; tag: string; band: Band; n: number }>();
  for (const e of events) {
    const k = `${e.skill}|${e.level}|${e.band}`, row = rows.get(k) ?? { skill: e.skill, level: e.level, band: e.band, a: 0, r0: 0, r1: 0, r2: 0, s: 0 };
    row.a++; row.s += e.s; if (e.r === 0) row.r0++; else if (e.r === 1) row.r1++; else row.r2++;
    rows.set(k, row);
    if (e.r === 2) for (const tag of e.tags) {
      const tk = `${e.skill}|${tag}|${e.band}`, t = tags.get(tk) ?? { skill: e.skill, tag, band: e.band, n: 0 };
      t.n++; tags.set(tk, t);
    }
  }
  for (const r of rows.values()) {
    await db.insert(q).values({ week, skill: r.skill, level: r.level, band: r.band, attempts: r.a, rightN: r.r0, helped: r.r1, wrong: r.r2, secs: r.s })
      .onConflictDoUpdate({ target: [q.week, q.skill, q.level, q.band], set: { attempts: sql`${q.attempts} + ${r.a}`, rightN: sql`${q.rightN} + ${r.r0}`, helped: sql`${q.helped} + ${r.r1}`, wrong: sql`${q.wrong} + ${r.r2}`, secs: sql`${q.secs} + ${r.s}` } });
  }
  for (const t of tags.values()) {
    await db.insert(m).values({ week, skill: t.skill, tag: t.tag, band: t.band, n: t.n })
      .onConflictDoUpdate({ target: [m.week, m.skill, m.tag, m.band], set: { n: sql`${m.n} + ${t.n}` } });
  }
  return events.length;
}

export interface QuestionRow { skill: string; level: number; attempts: number; right: number; helped: number; wrong: number; avgSecs: number; rightPct: number; hardest?: string }
export interface QuestionStats { totalAttempts: number; topics: number; rows: QuestionRow[]; weeks: number }

/** The team's view: every topic and level with enough answers to mean something, hardest first. Counts only. */
export async function questionStats(db: Db, minAttempts = 30): Promise<QuestionStats> {
  const q = schema.questionStats, m = schema.misconceptionStats;
  const rows = await db.select({ skill: q.skill, level: q.level, attempts: sql<number>`sum(${q.attempts})::int`, right: sql<number>`sum(${q.rightN})::int`, helped: sql<number>`sum(${q.helped})::int`, wrong: sql<number>`sum(${q.wrong})::int`, secs: sql<number>`sum(${q.secs})::int` })
    .from(q).groupBy(q.skill, q.level).orderBy(desc(sql`sum(${q.attempts})`)).limit(2000);
  const tagRows = await db.select({ skill: m.skill, tag: m.tag, n: sql<number>`sum(${m.n})::int` }).from(m).groupBy(m.skill, m.tag).orderBy(desc(sql`sum(${m.n})`)).limit(2000);
  const top = new Map<string, string>(); for (const t of tagRows) if (!top.has(t.skill)) top.set(t.skill, t.tag);
  const [w] = await db.select({ n: sql<number>`count(distinct ${q.week})::int` }).from(q);
  const kept = rows.filter((r) => r.attempts >= minAttempts).map((r): QuestionRow => ({
    skill: r.skill, level: r.level, attempts: r.attempts, right: r.right, helped: r.helped, wrong: r.wrong,
    avgSecs: Math.round(r.secs / r.attempts), rightPct: Math.round((100 * r.right) / r.attempts), hardest: top.get(r.skill),
  })).sort((a, b) => a.rightPct - b.rightPct);
  return { totalAttempts: rows.reduce((n, r) => n + r.attempts, 0), topics: new Set(rows.map((r) => r.skill)).size, rows: kept, weeks: w?.n ?? 0 };
}

/** The same numbers as CSV for a spreadsheet or analysis: one row per week, topic, level and age band. */
export async function questionStatsCsv(db: Db): Promise<string> {
  const q = schema.questionStats;
  const rows = await db.select().from(q).orderBy(q.week, q.skill, q.level, q.band);
  return ["week,skill,level,band,attempts,right_first_time,right_with_help,wrong,seconds_total",
    ...rows.map((r) => [r.week, r.skill, r.level, r.band, r.attempts, r.rightN, r.helped, r.wrong, r.secs].join(","))].join("\n") + "\n";
}
