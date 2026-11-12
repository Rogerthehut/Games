import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FakeAuth } from "./auth";
import { connectMemory, migrate, type Db } from "./db";
import { makeRepo, type Repo } from "./db/repo";
import { FakeMailer } from "./mail";
import { OpsAccess, parseAdmins } from "./ops-access";
import { handleOpsApi, type OpsDeps } from "./ops-api";
import { accountByClerkId, auditLog } from "./ops";

let db: Db, repo: Repo, mailer: FakeMailer, access: OpsAccess, deps: OpsDeps, clock = 1_000_000;
const SECRET = "x".repeat(32);
beforeAll(async () => { db = await connectMemory(); await migrate(db); repo = makeRepo(db); });
beforeEach(async () => {
  await db.execute("TRUNCATE parents CASCADE" as never); await db.execute("TRUNCATE ops_audit" as never);
  mailer = new FakeMailer(); clock = 1_000_000;
  access = new OpsAccess({ auth: new FakeAuth(), mailer, admins: parseAdmins("Fake_Boss@example.test"), secret: SECRET, now: () => clock });
  deps = { db, auth: new FakeAuth(), mailer, access };
});
const call = (method: string, path: string, token: string | null, o: { session?: string; body?: unknown; q?: string } = {}) =>
  handleOpsApi({ method, path, query: new URLSearchParams(o.q ?? ""), token, session: o.session, body: o.body }, deps);
const codeFrom = () => /: (\d{6})/.exec(mailer.sent.at(-1)!.subject)![1];
async function signIn(user = "fake_boss") {
  await call("POST", "/api/ops/code", user);
  const r = await call("POST", "/api/ops/verify", user, { body: { code: codeFrom() } });
  return (r.body as { session: string }).session;
}

describe("getting in", () => {
  it("looks like nothing is there without a sign-in, or for someone not on the list", async () => {
    expect((await call("GET", "/api/ops/stats", null)).status).toBe(404);
    expect((await call("POST", "/api/ops/code", "fake_parent")).status).toBe(404);
    expect(mailer.sent).toHaveLength(0);
    expect((await auditLog(db)).map((a) => a.action)).toEqual(["denied"]);
  });
  it("needs the emailed code, not just the allow-list", async () => {
    expect((await call("GET", "/api/ops/stats", "fake_boss")).status).toBe(404);
    expect((await call("POST", "/api/ops/code", "fake_boss")).status).toBe(200);
    expect(mailer.sent[0].to).toBe("fake_boss@example.test");
    const wrong = await call("POST", "/api/ops/verify", "fake_boss", { body: { code: "000000" } });
    expect(wrong.status).toBe(401);
    const session = await signIn();
    expect((await call("GET", "/api/ops/stats", "fake_boss", { session })).status).toBe(200);
  });
  it("won't send codes in quick succession, and locks after five wrong tries", async () => {
    await call("POST", "/api/ops/code", "fake_boss");
    expect((await call("POST", "/api/ops/code", "fake_boss")).status).toBe(429);
    for (let i = 0; i < 5; i++) await call("POST", "/api/ops/verify", "fake_boss", { body: { code: "111111" } });
    const r = await call("POST", "/api/ops/verify", "fake_boss", { body: { code: codeFrom() } });
    expect((r.body as { error: string }).error).toBe("locked");
  });
  it("lets a code and a session expire", async () => {
    await call("POST", "/api/ops/code", "fake_boss");
    clock += 11 * 60_000;
    expect(((await call("POST", "/api/ops/verify", "fake_boss", { body: { code: codeFrom() } })).body as { error: string }).error).toBe("no-code");
    clock += 60_000; const session = await signIn();
    clock += 61 * 60_000;
    expect((await call("GET", "/api/ops/stats", "fake_boss", { session })).status).toBe(404);
  });
  it("refuses a session issued to someone else, or a tampered one", async () => {
    const session = await signIn();
    expect((await call("GET", "/api/ops/stats", "fake_parent", { session })).status).toBe(404);
    expect((await call("GET", "/api/ops/stats", "fake_boss", { session: session.slice(0, -2) + "00" })).status).toBe(404);
  });
});

describe("the inbox", () => {
  it("replies by email to a parent who said we may, and records it", async () => {
    const p = await repo.upsertParent("fake_maya");
    await repo.addFeedback(p.id, { category: "idea", rating: 5, message: "More fractions please", mayReply: true, context: null });
    await repo.addFeedback(p.id, { category: "bug", rating: null, message: "Private note", mayReply: false, context: null });
    const session = await signIn();
    const list = (await call("GET", "/api/ops/feedback", "fake_boss", { session })).body as { items: { id: string; mayReply: boolean; message: string }[] };
    expect(list.items).toHaveLength(2);
    expect(JSON.stringify(list)).not.toContain("fake_maya");
    const yes = list.items.find((i) => i.mayReply)!, no = list.items.find((i) => !i.mayReply)!;
    expect((await call("POST", "/api/ops/feedback/reply", "fake_boss", { session, body: { id: no.id, message: "Thanks so much" } })).status).toBe(400);
    const sentBefore = mailer.sent.length;
    expect((await call("POST", "/api/ops/feedback/reply", "fake_boss", { session, body: { id: yes.id, message: "Thanks, fractions are coming." } })).status).toBe(200);
    expect(mailer.sent.length).toBe(sentBefore + 1);
    expect(mailer.sent.at(-1)).toMatchObject({ to: "fake_maya@example.test", subject: "Re: your feedback on quarter" });
    expect(mailer.sent.at(-1)!.text).toContain("> More fractions please");
    const again = (await call("GET", "/api/ops/feedback", "fake_boss", { session, q: "unreplied=1" })).body as { items: unknown[] };
    expect(again.items).toHaveLength(0);
    expect((await auditLog(db)).map((a) => a.action)).toContain("feedback-reply");
  });
  it("records nothing when the email fails", async () => {
    const p = await repo.upsertParent("fake_maya");
    await repo.addFeedback(p.id, { category: "idea", rating: null, message: "Hello there", mayReply: true, context: null });
    const session = await signIn();
    const id = ((await call("GET", "/api/ops/feedback", "fake_boss", { session })).body as { items: { id: string }[] }).items[0].id;
    mailer.failNext = true;
    expect((await call("POST", "/api/ops/feedback/reply", "fake_boss", { session, body: { id, message: "Thanks a lot" } })).status).toBe(502);
    expect(((await call("GET", "/api/ops/feedback", "fake_boss", { session })).body as { items: { replies: unknown[] }[] }).items[0].replies).toHaveLength(0);
  });
});

describe("deleting an account for someone who can't sign in", () => {
  const del = (session: string, email: string, confirm: string) => call("POST", "/api/ops/account/delete", "fake_boss", { session, body: { email, confirm } });
  const withRepo = () => { deps = { ...deps, repo, billing: gateway }; };
  const gateway = { deleted: [] as string[], fail: false, deleteCustomer: async function (this: { deleted: string[]; fail: boolean }, id: string) { if (gateway.fail) throw new Error("stripe down"); gateway.deleted.push(id); } } as never as import("./billing").Gateway & { deleted: string[]; fail: boolean };
  beforeEach(() => { (gateway as { deleted: string[] }).deleted.length = 0; (gateway as { fail: boolean }).fail = false; });

  it("needs the exact typed confirmation, and deletes nothing without it", async () => {
    withRepo(); const p = await repo.upsertParent("fake_maya"); const session = await signIn();
    expect((await del(session, "fake_maya@example.test", "yes")).status).toBe(400);
    expect((await del(session, "fake_maya@example.test", "delete someone@else.test")).status).toBe(400);
    expect(await accountByClerkId(db, "fake_maya")).not.toBeNull();
    expect(p.id).toBeTruthy();
  });
  it("deletes the data, the sign-in identity and the subscription, writes the audit entry first, and tells the parent", async () => {
    withRepo(); const p = await repo.upsertParent("fake_maya"); await repo.setCustomer(p.id, "cus_123");
    await repo.addFeedback(p.id, { category: "idea", rating: null, message: "A note", mayReply: true, context: null });
    const session = await signIn(); const before = mailer.sent.length;
    const r = await del(session, "fake_maya@example.test", "delete fake_maya@example.test");
    expect(r.status).toBe(200);
    expect(await accountByClerkId(db, "fake_maya")).toBeNull();
    expect((deps.auth as FakeAuth).deleted).toContain("fake_maya");
    expect((gateway as unknown as { deleted: string[] }).deleted).toEqual(["cus_123"]);
    expect(mailer.sent.length).toBe(before + 1); expect(mailer.sent.at(-1)).toMatchObject({ to: "fake_maya@example.test", subject: "Your quarter account has been deleted" });
    const log = await auditLog(db);
    expect(log.some((l) => l.action === "account-delete" && l.target === p.id)).toBe(true);
    expect(JSON.stringify(log)).not.toContain("example.test");   // the log never holds an address
  });
  it("stops, and keeps the account, if the subscription can't be cancelled", async () => {
    withRepo(); const p = await repo.upsertParent("fake_maya"); await repo.setCustomer(p.id, "cus_999");
    (gateway as unknown as { fail: boolean }).fail = true; const session = await signIn();
    const r = await del(session, "fake_maya@example.test", "delete fake_maya@example.test");
    expect(r.status).toBe(502);
    expect(await accountByClerkId(db, "fake_maya")).not.toBeNull();
    expect((deps.auth as FakeAuth).deleted).not.toContain("fake_maya");
  });
  it("is closed to anyone without the ops session, and says so plainly for an address with no account", async () => {
    withRepo(); expect((await del("not-a-session", "fake_maya@example.test", "delete fake_maya@example.test")).status).toBe(404);
    const session = await signIn();
    expect((await del(session, "fake_nobody@example.test", "delete fake_nobody@example.test")).status).toBe(404);
  });
});

describe("account lookup and audit", () => {
  it("finds an account by email, is audited, and shows no child's name", async () => {
    const p = await repo.upsertParent("fake_maya");
    await repo.createLearner(p.id, { id: "x", name: "Secret-Kid", year: 5, skills: {}, points: 0 } as never);
    const session = await signIn();
    const r = await call("GET", "/api/ops/account", "fake_boss", { session, q: "email=fake_maya@example.test" });
    expect((r.body as { account: { learners: { count: number } } }).account.learners.count).toBe(1);
    expect(JSON.stringify(r.body)).not.toContain("Secret-Kid");
    const log = (await call("GET", "/api/ops/audit", "fake_boss", { session })).body as { items: { action: string; actor: string }[] };
    expect(log.items.map((i) => i.action)).toContain("account");
    expect(JSON.stringify(log)).not.toContain("example.test");
  });
});
