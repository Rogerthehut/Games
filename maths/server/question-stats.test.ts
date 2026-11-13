import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TERMS_VERSION } from "../src/legal/terms-version";
import { WriteLimiter, handleAccountApi, isAccountRoute, type AccountDeps } from "./accounts";
import { FakeAuth } from "./auth";
import { connectMemory, migrate, type Db } from "./db";
import { makeRepo } from "./db/repo";
import { bandOfYear, cleanEvents, questionStats, questionStatsCsv, recordEvents, weekOf } from "./question-stats";

let db: Db, deps: AccountDeps;
beforeAll(async () => { db = await connectMemory(); await migrate(db); });
beforeEach(async () => {
  await db.execute(sql`TRUNCATE question_stats, misconception_stats, parents CASCADE`);
  deps = { repo: makeRepo(db), auth: new FakeAuth(), limiter: new WriteLimiter(1000) };
});
const ev = (o: Record<string, unknown> = {}) => ({ skill: "add-fractions", level: 2, band: "ks2", r: 0, s: 12, tags: [], ...o });
const call = (token: string | null, body: unknown) => handleAccountApi({ method: "POST", path: "/api/stats/questions", token, body }, deps);
const agree = (t: string) => handleAccountApi({ method: "POST", path: "/api/account/consent", token: t, body: { version: TERMS_VERSION } }, deps);

describe("cleanEvents", () => {
  it("keeps good events and drops anything odd, without ever keeping extra fields", () => {
    const out = cleanEvents({ events: [ev(), ev({ extra: "name: Maya", who: "x" }), ev({ skill: "Add Fractions" }), ev({ skill: "../x" }), ev({ level: 11 }), ev({ level: 1.5 }), ev({ band: "year5" }), ev({ r: 3 }), ev({ s: "5" }), ev({ s: 999 }), null, 5, ev({ tags: ["sign-error", "BAD TAG", 7, "sign-error", "a", "b", "c"] })] });
    expect(out).toHaveLength(4); expect(out[3].tags).toEqual(["sign-error", "a", "b"]);
    expect(out[1]).toEqual({ skill: "add-fractions", level: 2, band: "ks2", r: 0, s: 12, tags: [] });   // extra fields are gone
    expect(out[2].s).toBe(180); // capped
    expect(cleanEvents({ events: [ev(), ev(), ev(), ev(), ev(), ev(), ev(), ev(), ev(), ev(), ...Array.from({ length: 200 }, () => ev())] })).toHaveLength(100);
    expect(cleanEvents(null)).toEqual([]); expect(cleanEvents({ events: "x" })).toEqual([]); expect(cleanEvents({})).toEqual([]);
  });
  it("puts school years into age bands", () => { expect([3, 6, 7, 9, 10, 11, 12, 13].map(bandOfYear)).toEqual(["ks2", "ks2", "ks3", "ks3", "ks4", "ks4", "ks5", "ks5"]); });
  it("finds the Monday of the week", () => {
    expect(weekOf(Date.UTC(2026, 10, 13, 15))).toBe("2026-11-09"); // Friday
    expect(weekOf(Date.UTC(2026, 10, 9, 0))).toBe("2026-11-09");  // Monday
    expect(weekOf(Date.UTC(2026, 10, 15, 23))).toBe("2026-11-09"); // Sunday
  });
});

describe("recording and reading", () => {
  it("adds up counts by week, topic, level and band, and nothing else is stored", async () => {
    const now = Date.UTC(2026, 10, 13);
    const events = cleanEvents({ events: [ev({ r: 0, s: 10 }), ev({ r: 1, s: 20 }), ev({ r: 2, s: 30, tags: ["bigger-denominator"] }), ev({ level: 3 }), ev({ band: "ks3" })] });
    expect(await recordEvents(db, events, now)).toBe(5);
    await recordEvents(db, cleanEvents({ events: [ev({ r: 2, s: 6, tags: ["bigger-denominator"] })] }), now);
    const rows = (await db.execute(sql`SELECT * FROM question_stats ORDER BY level, band`)) as unknown as { rows: Record<string, unknown>[] };
    const r = rows.rows.find((x) => x.level === 2 && x.band === "ks2")!;
    expect([r.attempts, r.right_n, r.helped, r.wrong, Number(r.secs)]).toEqual([4, 1, 1, 2, 66]);
    expect(rows.rows).toHaveLength(3);
    const cols = (await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name IN ('question_stats','misconception_stats')`)) as unknown as { rows: { column_name: string }[] };
    expect([...new Set(cols.rows.map((c) => c.column_name))].sort()).toEqual(["attempts", "band", "helped", "level", "n", "right_n", "secs", "skill", "tag", "week", "wrong"]);
  });
  it("shows only levels with enough answers, hardest first, with the usual mistake", async () => {
    const now = Date.now();
    await recordEvents(db, Array.from({ length: 40 }, (_, i) => ({ skill: "hard-one", level: 1, band: "ks3" as const, r: (i % 4 === 0 ? 0 : 2) as 0 | 2, s: 20, tags: i % 4 === 0 ? [] : ["mix-up"] })), now);
    await recordEvents(db, Array.from({ length: 40 }, () => ({ skill: "easy-one", level: 1, band: "ks3" as const, r: 0 as const, s: 5, tags: [] })), now);
    await recordEvents(db, [{ skill: "rare-one", level: 1, band: "ks3", r: 2, s: 5, tags: [] }], now);
    const s = await questionStats(db);
    expect(s.rows.map((r) => r.skill)).toEqual(["hard-one", "easy-one"]);
    expect(s.rows[0]).toMatchObject({ rightPct: 25, attempts: 40, avgSecs: 20, hardest: "mix-up" });
    expect(s.totalAttempts).toBe(81); expect(s.topics).toBe(3); expect(s.weeks).toBe(1);
    const csv = await questionStatsCsv(db);
    expect(csv.split("\n")[0]).toBe("week,skill,level,band,attempts,right_first_time,right_with_help,wrong,seconds_total");
    expect(csv).toMatch(/hard-one,1,ks3,40,10,0,30,800/);
  });
});

describe("POST /api/stats/questions", () => {
  it("is part of the account API and needs a signed-in parent who has agreed to the terms", async () => {
    expect(isAccountRoute("/api/stats/questions")).toBe(true);
    expect((await call(null, { events: [ev()] })).status).toBe(401);
    expect((await call("fake_a", { events: [ev()] })).status).toBe(403);
    await agree("fake_a");
    expect((await call("fake_a", { events: [ev()] })).status).toBe(202);
  });
  it("rejects empty or malformed batches and records who? nobody", async () => {
    await agree("fake_a");
    expect((await call("fake_a", { events: [] })).status).toBe(400);
    expect((await call("fake_a", { events: [{ skill: "x y" }] })).status).toBe(400);
    expect((await call("fake_a", { events: [ev()] })).body).toEqual({ recorded: 1 });
    const dump = JSON.stringify(await db.execute(sql`SELECT * FROM question_stats`)) + JSON.stringify(await db.execute(sql`SELECT * FROM misconception_stats`));
    expect(dump).not.toMatch(/fake_a|parent|learner|clerk/i);
  });
});
