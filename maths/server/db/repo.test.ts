import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectMemory, migrate, type Db } from "./index";
import { MAX_LEARNERS, MAX_PROFILE_BYTES, cleanProfile } from "./profile-check";
import { makeRepo, type Repo } from "./repo";

const profile = (name = "Maya", year = 5, extra: Record<string, unknown> = {}) => ({ id: "p_local", name, year, skills: { "times-tables": { box: 2 } }, points: 10, ...extra });
const NOBODY = "00000000-0000-4000-8000-000000000000";

let db: Db, repo: Repo;
// one in-memory database for the file, emptied before each test (booting one per test is slow)
beforeAll(async () => { db = await connectMemory(); await migrate(db); repo = makeRepo(db); });
beforeEach(async () => { await db.execute("TRUNCATE parents CASCADE" as never); });

describe("migrations", () => {
  it("run once and are remembered", async () => {
    const fresh = await connectMemory();
    expect(await migrate(fresh)).toEqual(["0001_accounts.sql", "0002_billing.sql", "0003_feedback.sql"]);
    expect(await migrate(fresh)).toEqual([]);
  });
});

describe("accounts", () => {
  it("finds or creates a parent from their Clerk id, once", async () => {
    const a = await repo.upsertParent("user_1");
    const again = await repo.upsertParent("user_1");
    const b = await repo.upsertParent("user_2");
    expect(again.id).toBe(a.id);
    expect(b.id).not.toBe(a.id);
    expect(a.consentedAt).toBeNull();
  });
  it("records which version of the terms a parent agreed to", async () => {
    const a = await repo.upsertParent("user_1");
    await repo.recordConsent(a.id, "2026-11");
    const back = await repo.upsertParent("user_1");
    expect(back.consentVersion).toBe("2026-11");
    expect(back.consentedAt).toBeInstanceOf(Date);
  });
});

describe("learners and progress", () => {
  it("creates a learner, gives it the server's id, and loads it back", async () => {
    const p = await repo.upsertParent("user_1");
    const made = await repo.createLearner(p.id, profile());
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    const all = await repo.loadLearners(p.id);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(made.id);
    expect(all[0].version).toBe(1);
    expect(all[0].data).toMatchObject({ id: made.id, name: "Maya", year: 5, points: 10 });
  });

  it("keeps the tutor chat log off the server", async () => {
    const p = await repo.upsertParent("user_1");
    const made = await repo.createLearner(p.id, profile("Maya", 5, { tutorLog: [{ question: "private", tutor: "reply" }] }));
    if (!made.ok) throw new Error("not created");
    const [l] = await repo.loadLearners(p.id);
    expect(l.data.tutorLog).toBeUndefined();
    const saved = await repo.saveProgress(p.id, made.id, profile("Maya", 5, { tutorLog: [{ x: 1 }] }), 1);
    expect(saved.ok).toBe(true);
    expect((await repo.getLearner(p.id, made.id))!.data.tutorLog).toBeUndefined();
  });

  it("limits how many learners an account can have, even with simultaneous requests", async () => {
    const p = await repo.upsertParent("user_1");
    const results = await Promise.all(Array.from({ length: MAX_LEARNERS + 4 }, (_, i) => repo.createLearner(p.id, profile(`Kid${i}`))));
    expect(results.filter((r) => r.ok)).toHaveLength(MAX_LEARNERS);
    expect(results.filter((r) => !r.ok && r.reason === "limit")).toHaveLength(4);
    expect(await repo.loadLearners(p.id)).toHaveLength(MAX_LEARNERS);
  });

  it("saves when the version matches, and refuses with what is stored when it does not", async () => {
    const p = await repo.upsertParent("user_1");
    const made = await repo.createLearner(p.id, profile());
    if (!made.ok) throw new Error("x");
    const first = await repo.saveProgress(p.id, made.id, profile("Maya", 5, { points: 20 }), 1);
    expect(first).toEqual({ ok: true, version: 2 });
    // a second device that has not seen version 2 tries to save
    const stale = await repo.saveProgress(p.id, made.id, profile("Maya", 5, { points: 99 }), 1);
    expect(stale.ok).toBe(false);
    if (stale.ok || stale.reason !== "conflict") throw new Error("expected a conflict");
    expect(stale.current.version).toBe(2);
    expect(stale.current.data.points).toBe(20);
    expect((await repo.getLearner(p.id, made.id))!.data.points).toBe(20);
  });

  it("updates the nickname and year used for listing when progress is saved", async () => {
    const p = await repo.upsertParent("user_1");
    const made = await repo.createLearner(p.id, profile("Maya", 5));
    if (!made.ok) throw new Error("x");
    await repo.saveProgress(p.id, made.id, profile("Maya B", 6), 1);
    const row = (await db.execute(`select nickname, year from learners where id = '${made.id}'` as never)) as unknown as { rows: { nickname: string; year: number }[] };
    expect(row.rows[0]).toEqual({ nickname: "Maya B", year: 6 });
  });
});

describe("one family can never touch another's data", () => {
  it("cannot read, save, delete or list another parent's learner", async () => {
    const a = await repo.upsertParent("user_a");
    const b = await repo.upsertParent("user_b");
    const made = await repo.createLearner(a.id, profile("Ava", 4));
    if (!made.ok) throw new Error("x");

    expect(await repo.getLearner(b.id, made.id)).toBeNull();
    expect(await repo.saveProgress(b.id, made.id, profile("Hacked", 4), 1)).toEqual({ ok: false, reason: "not-found" });
    expect(await repo.deleteLearner(b.id, made.id)).toBe(false);
    expect(await repo.loadLearners(b.id)).toEqual([]);
    expect((await repo.getLearner(a.id, made.id))!.data.name).toBe("Ava");
    expect((await repo.exportParent(b.id)).learners).toEqual([]);
  });
  it("treats ids that are not ids as not found, not as an error", async () => {
    const a = await repo.upsertParent("user_a");
    for (const bad of ["x", "'; drop table learners; --", "", NOBODY]) {
      expect(await repo.getLearner(a.id, bad)).toBeNull();
      expect(await repo.deleteLearner(a.id, bad)).toBe(false);
      expect(await repo.saveProgress(a.id, bad, profile(), 1)).toEqual({ ok: false, reason: "not-found" });
    }
  });
});

describe("deleting", () => {
  it("removes a learner and their progress", async () => {
    const p = await repo.upsertParent("user_1");
    const made = await repo.createLearner(p.id, profile());
    if (!made.ok) throw new Error("x");
    expect(await repo.deleteLearner(p.id, made.id)).toBe(true);
    expect(await repo.loadLearners(p.id)).toEqual([]);
    const left = (await db.execute(`select count(*)::int as n from learner_progress` as never)) as unknown as { rows: { n: number }[] };
    expect(left.rows[0].n).toBe(0);
  });
  it("removes an account and everything under it, leaving other families alone", async () => {
    const a = await repo.upsertParent("user_a"), b = await repo.upsertParent("user_b");
    await repo.createLearner(a.id, profile("A1")); await repo.createLearner(a.id, profile("A2")); await repo.createLearner(b.id, profile("B1"));
    await repo.deleteParent(a.id);
    expect(await repo.loadLearners(a.id)).toEqual([]);
    expect((await repo.loadLearners(b.id)).map((l) => l.data.name)).toEqual(["B1"]);
    const rows = (await db.execute(`select (select count(*)::int from learners) as l, (select count(*)::int from learner_progress) as p, (select count(*)::int from parents) as a` as never)) as unknown as { rows: { l: number; p: number; a: number }[] };
    expect(rows.rows[0]).toEqual({ l: 1, p: 1, a: 1 });
  });
  it("exports everything held about a family", async () => {
    const p = await repo.upsertParent("user_1");
    await repo.recordConsent(p.id, "2026-11");
    await repo.createLearner(p.id, profile("Maya"));
    const out = await repo.exportParent(p.id);
    expect(out.parent?.consentVersion).toBe("2026-11");
    expect(out.learners.map((l) => l.data.name)).toEqual(["Maya"]);
  });
});

describe("what the server will store", () => {
  it("accepts a normal profile and trims the nickname", () => {
    const c = cleanProfile(profile("  Maya  "));
    expect(c.ok && c.nickname).toBe("Maya");
  });
  it("rejects things that are not learners", () => {
    for (const bad of [null, "x", 5, [], {}, profile("", 5), profile("x".repeat(25), 5), profile("Maya", 0), profile("Maya", 14), profile("Maya", 5.5), { ...profile(), skills: [] }, { ...profile(), skills: undefined }, { ...profile(), year: "5" }]) {
      expect(cleanProfile(bad).ok, JSON.stringify(bad)?.slice(0, 60)).toBe(false);
    }
  });
  it("rejects an oversized profile", () => {
    expect(cleanProfile(profile("Maya", 5, { junk: "x".repeat(MAX_PROFILE_BYTES) })).ok).toBe(false);
  });
});
