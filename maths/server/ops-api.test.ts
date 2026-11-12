import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FakeAuth } from "./auth";
import { connectMemory, migrate, type Db } from "./db";
import { makeRepo, type Repo } from "./db/repo";
import { FakeMailer } from "./mail";
import { OpsAccess, parseAdmins } from "./ops-access";
import { handleOpsApi, type OpsDeps } from "./ops-api";
import { auditLog } from "./ops";

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
