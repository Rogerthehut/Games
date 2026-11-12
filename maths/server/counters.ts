import { createHmac } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import type { Db } from "./db";
import { schema } from "./db";

/**
 * Hit counters for rate limits and the AI cost caps. Each counts hits for a key in a fixed time window (the hour or day the hit falls in).
 * `MemoryCounters` lives in one process and forgets on restart. `DbCounters` keeps them in the database, so they survive restarts and
 * are shared by every copy of the server, which is what makes a daily cost cap hold. `FallbackCounters` uses the database and falls back
 * to memory if it can't be reached, so a database hiccup doesn't switch the limits off. Counts only, never message text.
 */
export interface Counters {
  /** Adds one to the counter for `key` in the window `now` falls in, and returns the new total. */
  hit(key: string, windowMs: number, now?: number): Promise<number>;
  /** The current total, without adding. */
  peek(key: string, windowMs: number, now?: number): Promise<number>;
}

export class MemoryCounters implements Counters {
  private m = new Map<string, { w: number; n: number }>();
  async hit(key: string, windowMs: number, now = Date.now()) {
    const w = Math.floor(now / windowMs), k = `${key}|${windowMs}`;
    if (this.m.size > 50_000) for (const [kk, v] of this.m) if (v.w < w - 1) this.m.delete(kk);   // keeps a long-running process tidy
    const c = this.m.get(k);
    if (!c || c.w !== w) { this.m.set(k, { w, n: 1 }); return 1; }
    return ++c.n;
  }
  async peek(key: string, windowMs: number, now = Date.now()) {
    const c = this.m.get(`${key}|${windowMs}`);
    return c && c.w === Math.floor(now / windowMs) ? c.n : 0;
  }
}

/**
 * The database version. Keys can be a visitor's address or a device or parent id, so they are stored only as a keyed hash (HMAC with `secret`):
 * the table can't be read back into addresses, and rows disappear within a day.
 */
export class DbCounters implements Counters {
  private lastSweep = 0;
  constructor(private db: Db, private secret = process.env.COUNTER_SECRET || process.env.CLERK_SECRET_KEY || "quarter-counters") {}
  private hashed(key: string) { return createHmac("sha256", this.secret).update(key).digest("hex").slice(0, 32); }
  async hit(rawKey: string, windowMs: number, now = Date.now()) {
    const key = this.hashed(rawKey), slot = Math.floor(now / windowMs), t = schema.rateCounters;
    const [row] = await this.db.insert(t).values({ key, slot, n: 1, expiresAt: (slot + 1) * windowMs })
      .onConflictDoUpdate({ target: [t.key, t.slot], set: { n: sql`${t.n} + 1` } }).returning({ n: t.n });
    void this.sweep(now);
    return row.n;
  }
  async peek(rawKey: string, windowMs: number, now = Date.now()) {
    const t = schema.rateCounters, key = this.hashed(rawKey);
    const [row] = await this.db.select({ n: t.n }).from(t).where(and(eq(t.key, key), eq(t.slot, Math.floor(now / windowMs))));
    return row?.n ?? 0;
  }
  /** Removes windows that ended more than an hour ago, at most every half hour. */
  private async sweep(now: number) {
    if (now - this.lastSweep < 30 * 60_000) return;
    this.lastSweep = now;
    try { await this.db.delete(schema.rateCounters).where(lt(schema.rateCounters.expiresAt, now - 3_600_000)); } catch { /* tidying can wait */ }
  }
}

export class FallbackCounters implements Counters {
  private failed = false;
  constructor(private primary: Counters, private fallback: Counters = new MemoryCounters()) {}
  async hit(key: string, windowMs: number, now?: number) {
    try { const n = await this.primary.hit(key, windowMs, now); this.failed = false; return n; }
    catch (e) { this.noteFailure(e); return this.fallback.hit(key, windowMs, now); }
  }
  async peek(key: string, windowMs: number, now?: number) {
    try { return await this.primary.peek(key, windowMs, now); }
    catch (e) { this.noteFailure(e); return this.fallback.peek(key, windowMs, now); }
  }
  private noteFailure(e: unknown) { if (!this.failed) { this.failed = true; console.error("rate limit counters: database unavailable, using memory for now:", (e as Error).name); } }
}
