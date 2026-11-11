import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectMemory, migrate, type Db } from "./db";
import { makeRepo, type Repo } from "./db/repo";
import { accountByClerkId, audit, auditLog, feedbackList, formatAccount, formatStats, stats } from "./ops";

let db: Db, repo: Repo;
beforeAll(async () => { db = await connectMemory(); await migrate(db); repo = makeRepo(db); });
beforeEach(async () => { await db.execute("TRUNCATE parents CASCADE" as never); await db.execute("TRUNCATE ops_audit" as never); });
const profile = (name: string, year: number) => ({ id: "p", name, year, skills: {}, points: 0 });

describe("the team's numbers", () => {
  it("count parents, subscriptions, learners and feedback", async () => {
    const a = await repo.upsertParent("user_a"), b = await repo.upsertParent("user_b");
    await repo.recordConsent(a.id, "v1");
    await repo.createLearner(a.id, profile("Maya", 5)); await repo.createLearner(a.id, profile("Sam", 8)); await repo.createLearner(b.id, profile("Ola", 5));
    await repo.addFeedback(a.id, { category: "idea", rating: 5, message: "Lovely", mayReply: true, context: null });
    const s = await stats(db);
    expect(s.parents).toMatchObject({ total: 2, agreedToTerms: 1, newLast7: 2 });
    expect(s.learners.total).toBe(3);
    expect(s.learners.byYear).toEqual({ "5": 2, "8": 1 });
    expect(s.learners.activeLast7).toBe(3);
    expect(s.feedback).toMatchObject({ last7: 1, byCategory: { idea: 1 } });
    expect(formatStats(s)).toContain("total 2");
  });
});

describe("looking up an account", () => {
  it("shows support facts but never a child's name or progress", async () => {
    const a = await repo.upsertParent("user_a");
    await repo.recordConsent(a.id, "v1");
    await repo.createLearner(a.id, profile("Maya-secret-name", 6));
    const acc = await accountByClerkId(db, "user_a");
    expect(acc).toMatchObject({ parentId: a.id, consent: { version: "v1" }, learners: { count: 1, years: [6] }, feedbackCount: 0, subscription: null });
    const text = JSON.stringify(acc) + formatAccount(acc!);
    expect(text).not.toContain("Maya-secret-name");
    expect(await accountByClerkId(db, "user_nobody")).toBeNull();
  });
});

describe("feedback", () => {
  it("can be filtered, newest first", async () => {
    const a = await repo.upsertParent("user_a");
    await repo.addFeedback(a.id, { category: "bug", rating: null, message: "First", mayReply: false, context: null });
    await repo.addFeedback(a.id, { category: "idea", rating: 4, message: "Second", mayReply: true, context: "Today" });
    expect((await feedbackList(db)).map((f) => f.message)).toEqual(["Second", "First"]);
    expect((await feedbackList(db, { category: "bug" })).map((f) => f.message)).toEqual(["First"]);
    expect((await feedbackList(db, { replyable: true })).map((f) => f.message)).toEqual(["Second"]);
    expect(await feedbackList(db, { days: 1, now: new Date(Date.now() + 5 * 86_400_000) })).toEqual([]);
  });
});

describe("the audit log", () => {
  it("records who looked at what, with no names or emails", async () => {
    await audit(db, "roger", "account", "parent-id-1");
    await audit(db, "roger", "feedback-email", "clerk:abcd1234");
    const log = await auditLog(db);
    expect(log.map((l) => l.action)).toEqual(["feedback-email", "account"]);
    expect(log[1]).toMatchObject({ actor: "roger", target: "parent-id-1" });
  });
});
