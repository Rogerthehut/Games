import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DbCounters, FallbackCounters, MemoryCounters, type Counters } from "./counters";
import { connectMemory, migrate, schema, type Db } from "./db";
import { Limiter } from "./tutor/policy";
import { WriteLimiter } from "./accounts";
import { AssistantLimiter } from "./assistant/policy";

let db: Db;
beforeAll(async () => { db = await connectMemory(); await migrate(db); });
beforeEach(async () => { await db.execute("TRUNCATE rate_counters" as never); });

const HOUR = 3_600_000, DAY = 86_400_000;
const behaves = (make: () => Counters) => () => {
  it("counts hits in a window and starts again in the next", async () => {
    const c = make(), t = 10 * DAY + 5;
    expect(await c.hit("k", HOUR, t)).toBe(1); expect(await c.hit("k", HOUR, t + 1000)).toBe(2);
    expect(await c.peek("k", HOUR, t + 2000)).toBe(2);
    expect(await c.peek("k", HOUR, t + HOUR)).toBe(0);
    expect(await c.hit("k", HOUR, t + HOUR)).toBe(1);
  });
  it("keeps different keys and different window sizes apart, and peek adds nothing", async () => {
    const c = make(), t = 3 * DAY;
    await c.hit("a", HOUR, t); await c.hit("a", DAY, t);
    expect(await c.peek("a", HOUR, t)).toBe(1); expect(await c.peek("a", DAY, t)).toBe(1); expect(await c.peek("b", HOUR, t)).toBe(0);
    await c.peek("a", HOUR, t); expect(await c.peek("a", HOUR, t)).toBe(1);
  });
  it("never loses a hit when many arrive at once", async () => {
    const c = make(), t = 5 * DAY;
    const totals = await Promise.all(Array.from({ length: 40 }, () => c.hit("busy", HOUR, t)));
    expect(new Set(totals).size).toBe(40);
    expect(await c.peek("busy", HOUR, t)).toBe(40);
  });
};
describe("in-memory counters", behaves(() => new MemoryCounters()));
describe("database counters", behaves(() => new DbCounters(db, "test-secret")));

describe("database counters, specifically", () => {
  it("are shared by every copy of the server, and survive a restart", async () => {
    const t = 7 * DAY;
    const a = new DbCounters(db, "s"), b = new DbCounters(db, "s");   // two copies of the server
    await a.hit("shared", DAY, t); await b.hit("shared", DAY, t);
    expect(await new DbCounters(db, "s").peek("shared", DAY, t)).toBe(2);   // a new copy after a restart still sees both
  });
  it("store no raw addresses or ids, only a keyed hash", async () => {
    await new DbCounters(db, "secret-1").hit("t:i:203.0.113.77", DAY, 9 * DAY);
    const rows = await db.select().from(schema.rateCounters);
    expect(JSON.stringify(rows)).not.toContain("203.0.113.77");
    expect(rows[0].key).toMatch(/^[0-9a-f]{32}$/);
    expect(await new DbCounters(db, "other-secret").peek("t:i:203.0.113.77", DAY, 9 * DAY)).toBe(0);   // a different secret can't read them
  });
  it("sweep away windows that ended long ago", async () => {
    const c = new DbCounters(db, "s");
    await c.hit("old", HOUR, 1000);
    await c.hit("new", HOUR, 100 * DAY);
    expect((await db.select().from(schema.rateCounters)).length).toBe(1);
  });
});

describe("falling back when the database fails", () => {
  it("uses memory instead, so limits stay on", async () => {
    const broken: Counters = { hit: async () => { throw new Error("db down"); }, peek: async () => { throw new Error("db down"); } };
    const c = new FallbackCounters(broken);
    expect(await c.hit("k", HOUR, 1)).toBe(1); expect(await c.hit("k", HOUR, 2)).toBe(2); expect(await c.peek("k", HOUR, 3)).toBe(2);
  });
});

describe("the limits themselves, on database counters", () => {
  it("hold across two copies of the server: the AI cost cap is shared", async () => {
    const cfg = { perDeviceDay: 100, perDeviceHour: 100, perIpDay: 100, globalDay: 3 };
    const one = new Limiter(cfg, new DbCounters(db, "s")), two = new Limiter(cfg, new DbCounters(db, "s"));
    const t = 20 * DAY;
    expect(await one.take("d1", "a", t)).not.toBeNull(); expect(await two.take("d2", "b", t)).not.toBeNull(); expect(await one.take("d3", "c", t)).not.toBeNull();
    expect(await two.take("d4", "d", t)).toBeNull();   // the fourth message today is refused by whichever copy gets it
    expect(await one.take("d5", "e", t + DAY)).not.toBeNull();   // and tomorrow it resets
  });
  it("don't let a blocked device use up the shared cap", async () => {
    const lim = new Limiter({ perDeviceDay: 1, perDeviceHour: 1, perIpDay: 100, globalDay: 3 }, new DbCounters(db, "s"));
    const t = 30 * DAY;
    await lim.take("noisy", "a", t);
    for (let i = 0; i < 10; i++) expect(await lim.take("noisy", "a", t)).toBeNull();
    expect(await lim.take("quiet1", "b", t)).not.toBeNull(); expect(await lim.take("quiet2", "c", t)).not.toBeNull();   // the cap of 3 still has room
  });
  it("limit parents' questions and writes", async () => {
    const assistant = new AssistantLimiter(2, 20, 100, new DbCounters(db, "s"));
    expect(await assistant.take("p", 1)).not.toBeNull(); expect(await assistant.take("p", 2)).not.toBeNull(); expect(await assistant.take("p", 3)).toBeNull();
    const writes = new WriteLimiter(2, () => 5, new DbCounters(db, "s"));
    expect(await writes.allow("x")).toBe(true); expect(await writes.allow("x")).toBe(true); expect(await writes.allow("x")).toBe(false);
  });
});
