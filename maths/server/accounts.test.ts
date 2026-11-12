import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TERMS_VERSION } from "../src/legal/terms-version";
import { WriteLimiter, handleAccountApi, isAccountRoute, type AccountDeps } from "./accounts";
import { FakeAuth } from "./auth";
import { connectMemory, migrate, type Db } from "./db";
import { makeRepo } from "./db/repo";

const profile = (name = "Maya", extra: Record<string, unknown> = {}) => ({ id: "p_local", name, year: 5, skills: {}, points: 1, ...extra });
let db: Db, auth: FakeAuth, deps: AccountDeps;
beforeAll(async () => { db = await connectMemory(); await migrate(db); });
beforeEach(async () => {
  await db.execute("TRUNCATE parents CASCADE" as never);
  auth = new FakeAuth();
  deps = { repo: makeRepo(db), auth, limiter: new WriteLimiter(1000) };
});

const call = (token: string | null, method: string, path: string, body?: unknown, d = deps) => handleAccountApi({ method, path, token, body }, d);
const agree = (token: string) => call(token, "POST", "/api/account/consent", { version: TERMS_VERSION });
const make = async (token: string, p = profile()) => { await agree(token); const r = await call(token, "POST", "/api/learners", { profile: p }); expect(r.status).toBe(201); return (r.body as { id: string }).id; };

describe("signing in", () => {
  it("needs a valid session for everything", async () => {
    for (const token of [null, "", "garbage", "fake_", "Bearer x"]) {
      expect((await call(token, "GET", "/api/account")).status, String(token)).toBe(401);
      expect((await call(token, "POST", "/api/learners", { profile: profile() })).status).toBe(401);
      expect((await call(token, "DELETE", "/api/account", { confirm: "delete my account" })).status).toBe(401);
    }
  });
  it("creates the account the first time someone signs in, with no learners and no consent", async () => {
    const r = await call("fake_a", "GET", "/api/account");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ termsVersion: TERMS_VERSION, consented: false, learners: [], billing: { enabled: false, access: true } });
  });
  it("knows which paths belong to the account API", () => {
    for (const p of ["/api/account", "/api/account/consent", "/api/learners", "/api/learners/abc"]) expect(isAccountRoute(p), p).toBe(true);
    for (const p of ["/api/tutor", "/api/health", "/", "/api/learnersx"]) expect(isAccountRoute(p), p).toBe(false);
  });
});

describe("agreeing to the privacy notice and terms", () => {
  it("must happen before anything is saved", async () => {
    expect((await call("fake_a", "POST", "/api/learners", { profile: profile() })).status).toBe(403);
    expect(((await call("fake_a", "POST", "/api/learners", { profile: profile() })).body as { error: string }).error).toBe("consent-required");
  });
  it("only counts for the current version", async () => {
    expect((await call("fake_a", "POST", "/api/account/consent", { version: "old" })).status).toBe(400);
    expect((await call("fake_a", "POST", "/api/account/consent", {})).status).toBe(400);
    expect((await agree("fake_a")).status).toBe(200);
    expect(((await call("fake_a", "GET", "/api/account")).body as { consented: boolean }).consented).toBe(true);
  });
  it("is asked for again when the terms change, and learners are not shown until then", async () => {
    await make("fake_a");
    await db.execute("UPDATE parents SET consent_version = 'an-older-version'" as never);
    const r = (await call("fake_a", "GET", "/api/account")).body as { consented: boolean; learners: unknown[] };
    expect(r.consented).toBe(false);
    expect(r.learners).toEqual([]);
  });
});

describe("learners", () => {
  it("are created, listed and saved with a version check", async () => {
    const id = await make("fake_a");
    const loaded = (await call("fake_a", "GET", "/api/account")).body as { learners: { id: string; version: number; data: { name: string } }[] };
    expect(loaded.learners).toHaveLength(1);
    expect(loaded.learners[0]).toMatchObject({ id, version: 1, data: { name: "Maya" } });

    const saved = await call("fake_a", "PUT", `/api/learners/${id}`, { profile: profile("Maya", { points: 50 }), baseVersion: 1 });
    expect(saved).toMatchObject({ status: 200, body: { version: 2 } });

    const stale = await call("fake_a", "PUT", `/api/learners/${id}`, { profile: profile("Maya", { points: 7 }), baseVersion: 1 });
    expect(stale.status).toBe(409);
    expect((stale.body as { current: { version: number; data: { points: number } } }).current).toMatchObject({ version: 2, data: { points: 50 } });
  });
  it("reject bad input without storing it", async () => {
    await agree("fake_a");
    for (const bad of [{ profile: { name: "", year: 5, skills: {} } }, { profile: null }, {}, { profile: { name: "A", year: 99, skills: {} } }]) {
      expect((await call("fake_a", "POST", "/api/learners", bad)).status).toBe(400);
    }
    const id = await make("fake_a");
    expect((await call("fake_a", "PUT", `/api/learners/${id}`, { profile: profile() })).status).toBe(400);               // no baseVersion
    expect((await call("fake_a", "PUT", `/api/learners/${id}`, { profile: profile(), baseVersion: "1" })).status).toBe(400);
    expect((await call("fake_a", "PUT", `/api/learners/${id}`, { profile: { name: "" }, baseVersion: 1 })).status).toBe(400);
  });
  it("are capped at eight per account", async () => {
    await agree("fake_a");
    for (let i = 0; i < 8; i++) expect((await call("fake_a", "POST", "/api/learners", { profile: profile(`K${i}`) })).status).toBe(201);
    expect((await call("fake_a", "POST", "/api/learners", { profile: profile("K9") })).status).toBe(409);
  });
  it("never keep the tutor chat log", async () => {
    const id = await make("fake_a", profile("Maya", { tutorLog: [{ question: "q", tutor: "t" }] }));
    const out = (await call("fake_a", "GET", `/api/account/export`)).body as { learners: { data: Record<string, unknown> }[] };
    expect(out.learners[0].data.tutorLog).toBeUndefined();
    expect(id).toBeTruthy();
  });
});

describe("families are separate", () => {
  it("another parent cannot see, save over or delete a learner, and learns nothing about whether it exists", async () => {
    const id = await make("fake_a", profile("Ava"));
    await agree("fake_b");
    expect(((await call("fake_b", "GET", "/api/account")).body as { learners: unknown[] }).learners).toEqual([]);
    const put = await call("fake_b", "PUT", `/api/learners/${id}`, { profile: profile("Hacked"), baseVersion: 1 });
    const del = await call("fake_b", "DELETE", `/api/learners/${id}`);
    const nobody = await call("fake_b", "DELETE", "/api/learners/00000000-0000-4000-8000-000000000000");
    expect(put.status).toBe(404); expect(del.status).toBe(404);
    expect(put.body).toEqual(nobody.body);   // same answer as for an id that does not exist
    const stillA = (await call("fake_a", "GET", "/api/account")).body as { learners: { data: { name: string } }[] };
    expect(stillA.learners[0].data.name).toBe("Ava");
  });
  it("never puts database details in an error", async () => {
    await agree("fake_a");
    const r = await call("fake_a", "PUT", "/api/learners/'; drop table learners; --", { profile: profile(), baseVersion: 1 });
    expect(JSON.stringify(r.body)).not.toMatch(/sql|select|relation|pg_|syntax/i);
  });
});

describe("a family's data", () => {
  it("can be downloaded", async () => {
    await make("fake_a", profile("Maya"));
    const r = await call("fake_a", "GET", "/api/account/export");
    expect(r.status).toBe(200);
    expect(r.headers?.["Content-Disposition"]).toMatch(/attachment/);
    expect((r.body as { learners: unknown[] }).learners).toHaveLength(1);
  });
  it("can be deleted, only when asked clearly, and removes the sign-in too", async () => {
    await make("fake_a", profile("Ava")); await make("fake_b", profile("Ben"));
    expect((await call("fake_a", "DELETE", "/api/account", {})).status).toBe(400);
    expect((await call("fake_a", "DELETE", "/api/account", { confirm: "yes" })).status).toBe(400);
    expect((await call("fake_a", "DELETE", "/api/account", { confirm: "delete my account" })).status).toBe(200);
    expect(auth.deleted).toEqual(["fake_a"]);
    const left = (await db.execute("select (select count(*)::int from learners) as l, (select count(*)::int from parents) as p" as never)) as unknown as { rows: { l: number; p: number }[] };
    expect(left.rows[0]).toEqual({ l: 1, p: 1 });                         // only Ben's family remains
    const again = (await call("fake_a", "GET", "/api/account")).body as { learners: unknown[] };
    expect(again.learners).toEqual([]);                                   // signing in again starts a fresh empty account
  });
});

describe("limits", () => {
  it("slows down a client that writes far too often", async () => {
    const tight: AccountDeps = { ...deps, limiter: new WriteLimiter(3) };
    await agree("fake_a");
    const id = ((await call("fake_a", "POST", "/api/learners", { profile: profile() }, tight)).body as { id: string }).id;
    const codes: number[] = [];
    for (let v = 1; v <= 4; v++) codes.push((await call("fake_a", "PUT", `/api/learners/${id}`, { profile: profile(), baseVersion: v }, tight)).status);
    expect(codes).toContain(429);
    // reading has its own, much higher limit
    expect((await call("fake_a", "GET", "/api/account", undefined, tight)).status).toBe(200);
  });
  it("slows down a client that reads far too often, with a Retry-After", async () => {
    const tight: AccountDeps = { ...deps, limiter: new WriteLimiter(900, Date.now, undefined, { readsPerHour: 3, perAddressHour: 1000, bookletPerDay: 8 }) };
    await agree("fake_a");
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await call("fake_a", "GET", "/api/account", undefined, tight)).status);
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    const out = await call("fake_a", "GET", "/api/account", undefined, tight);
    expect(out.headers?.["Retry-After"]).toBe("60");
    expect((await call("fake_b", "GET", "/api/account", undefined, tight)).status).toBe(200); // another parent is not affected
  });
  it("limits one address across everything, signed in or not, but not other addresses", async () => {
    const tight: AccountDeps = { ...deps, limiter: new WriteLimiter(900, Date.now, undefined, { readsPerHour: 1000, perAddressHour: 3, bookletPerDay: 8 }) };
    const hit = (ip: string, token: string | null) => handleAccountApi({ method: "GET", path: "/api/account", token, ip }, tight);
    expect([(await hit("1.1.1.1", null)).status, (await hit("1.1.1.1", null)).status, (await hit("1.1.1.1", "fake_a")).status]).toEqual([401, 401, 200]);
    expect((await hit("1.1.1.1", "fake_a")).status).toBe(429);
    expect((await hit("2.2.2.2", "fake_a")).status).toBe(200);
  });
  it("limits how often the booklet can be downloaded in a day", async () => {
    const tight: AccountDeps = { ...deps, limiter: new WriteLimiter(900, Date.now, undefined, { readsPerHour: 1000, perAddressHour: 1000, bookletPerDay: 2 }) };
    await agree("fake_a");
    const codes: number[] = [];
    for (let i = 0; i < 3; i++) codes.push((await call("fake_a", "GET", "/api/account/booklet", undefined, tight)).status);
    expect(codes).toEqual([200, 200, 429]);
  });
});

describe("feedback", () => {
  const send = (user: string, body: unknown, d: AccountDeps = deps) => call(user, "POST", "/api/feedback", body, d);
  const good = { category: "idea", message: "Please add dark mode", rating: 4, mayReply: true, context: "390x844" };

  it("needs a sign-in and agreement to the terms", async () => {
    expect((await call(null, "POST", "/api/feedback", good)).status).toBe(401);
    expect((await send("fake_fb_new", good)).status).toBe(403);
  });
  it("saves a message and shows it in the family's own download", async () => {
    await agree("fake_fb_a");
    expect((await send("fake_fb_a", good)).status).toBe(201);
    const out = (await call("fake_fb_a", "GET", "/api/account/export")).body as { feedback: { message: string; rating: number; mayReply: boolean }[] };
    expect(out.feedback).toHaveLength(1);
    expect(out.feedback[0]).toMatchObject({ message: "Please add dark mode", rating: 4, mayReply: true });
  });
  it("keeps one family's feedback out of another's download", async () => {
    await agree("fake_fb_b"); await agree("fake_fb_c");
    await send("fake_fb_b", good);
    expect(((await call("fake_fb_c", "GET", "/api/account/export")).body as { feedback: unknown[] }).feedback).toHaveLength(0);
  });
  it("rejects an empty message or an unknown topic, and ignores a silly rating", async () => {
    await agree("fake_fb_d");
    expect((await send("fake_fb_d", { ...good, message: "   " })).status).toBe(400);
    expect((await send("fake_fb_d", { ...good, category: "spam" })).status).toBe(400);
    expect((await send("fake_fb_d", { ...good, rating: 99 })).status).toBe(201);
    const out = (await call("fake_fb_d", "GET", "/api/account/export")).body as { feedback: { rating: number | null }[] };
    expect(out.feedback[0].rating).toBeNull();
  });
  it("allows five a day, then asks to wait", async () => {
    await agree("fake_fb_e");
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await send("fake_fb_e", good)).status);
    expect(codes).toEqual([201, 201, 201, 201, 201, 429]);
  });
  it("asks for the human check when it is switched on", async () => {
    await agree("fake_fb_f");
    expect((await send("fake_fb_f", good, { ...deps, humanPassOk: () => false })).status).toBe(401);
  });
  it("is removed when the account is deleted", async () => {
    await agree("fake_fb_g"); await send("fake_fb_g", good);
    const count = async () => ((await db.execute(sql`select count(*)::int as n from feedback`)) as unknown as { rows: { n: number }[] }).rows[0].n;
    const before = await count();
    expect((await call("fake_fb_g", "DELETE", "/api/account", { confirm: "delete my account" })).status).toBe(200);
    expect(await count()).toBe(before - 1);
  });
});
