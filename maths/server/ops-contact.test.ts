import { beforeAll, describe, expect, it } from "vitest";
import { FakeAuth } from "./auth";
import { cleanContact, recordInbound, saveContact, contactList } from "./contact";
import { MemoryCounters } from "./counters";
import { connectMemory, migrate, type Db } from "./db";
import { FakeMailer } from "./mail";
import { OpsAccess } from "./ops-access";
import { handleOpsApi } from "./ops-api";

let db: Db, mailer: FakeMailer, auth: FakeAuth, access: OpsAccess, session: string, counters: MemoryCounters;
const q = new URLSearchParams();
const deps = () => ({ db, auth, mailer, access, counters, inboundOn: true });
const call = (method: string, path: string, body?: unknown, who = "fake_boss", sess: string | undefined = session) => handleOpsApi({ method, path, query: q, token: who, session: sess, body }, deps());

beforeAll(async () => {
  db = await connectMemory(); await migrate(db);
  mailer = new FakeMailer(); auth = new FakeAuth(); counters = new MemoryCounters();
  access = new OpsAccess({ auth, mailer, admins: new Set(["fake_boss@example.test"]), secret: "s".repeat(32) });
  await access.sendCode("fake_boss");
  session = (access.verify("fake_boss", /ops code: (\d{6})/.exec(mailer.sent[0].subject)![1]) as { session: string }).session;
}, 60_000);

describe("conversation and signature routes need the full proof", () => {
  it("answer 404 to anyone who isn't signed in, allowed and code-checked", async () => {
    const routes: [string, string][] = [["GET", "/api/ops/contact"], ["POST", "/api/ops/contact/reply"], ["POST", "/api/ops/contact/delete"], ["POST", "/api/ops/contact/new"], ["GET", "/api/ops/signatures"], ["POST", "/api/ops/signatures"], ["POST", "/api/ops/signatures/preview"], ["POST", "/api/ops/signatures/default"], ["POST", "/api/ops/signatures/delete"]];
    for (const [m, p] of routes) {
      expect((await call(m, p, {}, "fake_rando", "")).status, `${m} ${p} (not an admin)`).toBe(404);
      expect((await call(m, p, {}, "fake_boss", "")).status, `${m} ${p} (no session)`).toBe(404);
      expect((await call(m, p, {}, "fake_boss", session + "x")).status, `${m} ${p} (bad session)`).toBe(404);
      expect((await handleOpsApi({ method: m, path: p, query: q, token: null, session, body: {} }, deps())).status, `${m} ${p} (signed out)`).toBe(404);
    }
  });
});

describe("signatures", () => {
  it("are cleaned before they're saved, listed, edited, defaulted and deleted, with an audit trail", async () => {
    const prev = await call("POST", "/api/ops/signatures/preview", { html: '<b onclick="x()">Hi</b><script>alert(1)</script>' });
    expect(prev.status).toBe(200); expect((prev.body as { html: string }).html).toBe("<b>Hi</b>");
    expect((await call("POST", "/api/ops/signatures/preview", { html: "<script>x</script>" })).status).toBe(400);
    const made = await call("POST", "/api/ops/signatures", { name: "Roger", html: '<p style="color:#2f3a73">Roger<br>quarter</p><img src="javascript:alert(1)" onerror="x">' });
    expect(made.status).toBe(200);
    const id = (made.body as { id: string }).id;
    let list = (await call("GET", "/api/ops/signatures")).body as { items: { id: string; html: string; isDefault: boolean }[] };
    expect(list.items).toHaveLength(1); expect(list.items[0].isDefault).toBe(true); expect(list.items[0].html).not.toMatch(/script|javascript|onerror/);
    const second = await call("POST", "/api/ops/signatures", { name: "Short", html: "<p>R</p>", makeDefault: true });
    list = (await call("GET", "/api/ops/signatures")).body as typeof list;
    expect(list.items.filter((s) => s.isDefault)).toHaveLength(1); expect(list.items[0].html).toBe("<p>R</p>");
    expect((await call("POST", "/api/ops/signatures", { id, name: "Roger (long)", html: "<p>Roger Richman</p>" })).status).toBe(200);
    expect((await call("POST", "/api/ops/signatures/default", { id })).status).toBe(200);
    expect((await call("POST", "/api/ops/signatures/default", { id: "nope" })).status).toBe(404);
    expect((await call("POST", "/api/ops/signatures/delete", { id: (second.body as { id: string }).id })).status).toBe(200);
    expect((await call("POST", "/api/ops/signatures", { name: "", html: "<p>x</p>" })).status).toBe(400);
    expect((await call("POST", "/api/ops/signatures", { name: "x".repeat(61), html: "<p>x</p>" })).status).toBe(400);
    expect((await call("POST", "/api/ops/signatures", { id: "not-an-id", name: "x", html: "<p>x</p>" })).status).toBe(400);
    const audit = (await call("GET", "/api/ops/audit")).body as { items: { action: string; target: string }[] };
    expect(audit.items.map((a) => a.action)).toEqual(expect.arrayContaining(["signature-add", "signature-edit", "signature-default", "signature-delete"]));
    expect(JSON.stringify(audit)).not.toMatch(/Roger Richman|onclick/); // targets are ids, never the content
  });
  it("can't be added past the limit of ten", async () => {
    let last = 200;
    for (let i = 0; i < 12; i++) last = (await call("POST", "/api/ops/signatures", { name: `S${i}`, html: "<p>x</p>" })).status;
    expect(last).toBe(400);
  });
});

describe("replies", () => {
  it("go to the sender's address with the chosen signature, in both parts of the email, and under the thread when it came by email", async () => {
    const sigs = (await call("GET", "/api/ops/signatures")).body as { items: { id: string; name: string; html: string }[] };
    const sig = sigs.items.find((s) => s.name === "Roger (long)")!;
    await recordInbound(db, { emailId: "aaaaaaaa-2222-3333-4444-555555555555", from: "kim@example.com", name: "Kim", subject: "Re: Billing question", text: "Why was I charged twice?", messageId: "<kim-1@mail.example.com>", auth: "spf=pass dkim=pass dmarc=pass" });
    const thread = (await contactList(db)).find((c) => c.email === "kim@example.com")!;
    expect(thread.waiting).toBe(true);
    const before = mailer.sent.length;
    const out = await call("POST", "/api/ops/contact/reply", { id: thread.id, message: "Sorry about that, I'll look now.", signatureId: sig.id });
    expect(out.status).toBe(200);
    const mail = mailer.sent[before];
    expect(mail.to).toBe("kim@example.com"); expect(mail.subject).toBe("Re: Billing question");
    expect(mail.html).toContain("Roger Richman"); expect(mail.text).toContain("Roger Richman");
    expect(mail.headers).toEqual({ "In-Reply-To": "<kim-1@mail.example.com>", References: "<kim-1@mail.example.com>" });
    expect((await contactList(db)).find((c) => c.id === thread.id)!.waiting).toBe(false);
    // the sender writes again: it is waiting again
    await recordInbound(db, { emailId: "bbbbbbbb-2222-3333-4444-555555555555", from: "kim@example.com", name: null, subject: null, text: "Thanks!", messageId: "<kim-2@mail.example.com>", auth: null });
    expect((await contactList(db)).find((c) => c.id === thread.id)!.waiting).toBe(true);
    await call("POST", "/api/ops/contact/reply", { id: thread.id, message: "You're welcome.", signatureId: null });
    expect(mailer.sent.at(-1)!.headers?.["In-Reply-To"]).toBe("<kim-2@mail.example.com>");
    expect(mailer.sent.at(-1)!.html).not.toContain("Roger Richman");
  });
  it("escape what the team types, refuse a made-up signature, and record nothing if the email fails", async () => {
    const c = cleanContact({ email: "lee@example.com", message: "A question about the app please", topic: "question" }); if (!c.ok) throw new Error("x");
    const id = await saveContact(db, c.value);
    await call("POST", "/api/ops/contact/reply", { id, message: "<script>alert(1)</script> hi" });
    expect(mailer.sent.at(-1)!.html).toContain("&lt;script&gt;"); expect(mailer.sent.at(-1)!.html).not.toContain("<script>alert");
    expect((await call("POST", "/api/ops/contact/reply", { id, message: "hello there", signatureId: "11111111-2222-3333-4444-555555555555" })).status).toBe(400);
    expect((await call("POST", "/api/ops/contact/reply", { id: "nope", message: "hello there" })).status).toBe(404);
    expect((await call("POST", "/api/ops/contact/reply", { id, message: "x" })).status).toBe(400);
    const replies = () => contactList(db).then((l) => l.find((x) => x.id === id)!.replies.length);
    const n = await replies(); mailer.failNext = true;
    expect((await call("POST", "/api/ops/contact/reply", { id, message: "this one fails to send" })).status).toBe(502);
    expect(await replies()).toBe(n);
  });
  it("are limited per admin to 60 an hour", async () => {
    const c = cleanContact({ email: "max@example.com", message: "A question about the app please", topic: "question" }); if (!c.ok) throw new Error("x");
    const id = await saveContact(db, c.value);
    let blocked = 0;
    for (let i = 0; i < 70; i++) if ((await call("POST", "/api/ops/contact/reply", { id, message: `reply number ${i}` })).status === 429) blocked++;
    expect(blocked).toBeGreaterThan(0);
  });
  it("shows whether email to hello@ is being received", async () => {
    const out = (await call("GET", "/api/ops/contact")).body as { inbound: boolean; signatures: unknown[] };
    expect(out.inbound).toBe(true); expect(out.signatures.length).toBeGreaterThan(0);
  });
});

describe("new emails written by the team", () => {
  beforeAll(() => { counters = new MemoryCounters(); }); // the limits above were used up by the tests before this group
  it("go to one address under the chosen signature, start a conversation that counts as answered, and a reply joins it as waiting", async () => {
    const sigs = (await call("GET", "/api/ops/signatures")).body as { items: { id: string; name: string }[] };
    const sig = sigs.items.find((x) => x.name === "Roger (long)")!;
    const before = mailer.sent.length;
    const out = await call("POST", "/api/ops/contact/new", { to: "  Partner@Example.org ", subject: "Hello from  quarter", message: "Hi, a quick question about a school visit.", signatureId: sig.id });
    expect(out.status).toBe(200);
    const mail = mailer.sent[before];
    expect(mail.to).toBe("partner@example.org"); expect(mail.subject).toBe("Hello from quarter");
    expect(mail.html).toContain("Roger Richman"); expect(mail.text).toContain("Roger Richman"); expect(mail.headers).toBeUndefined();
    const convo = (await contactList(db)).find((c) => c.email === "partner@example.org")!;
    expect(convo.source).toBe("sent"); expect(convo.waiting).toBe(false); expect(convo.subject).toBe("Hello from quarter");
    expect((await contactList(db, { waiting: true })).some((c) => c.id === convo.id)).toBe(false);
    await recordInbound(db, { emailId: "cccccccc-2222-3333-4444-555555555555", from: "partner@example.org", name: null, subject: "Re: Hello", text: "Yes, Tuesday works.", messageId: "<p1@mail.example.org>", auth: null });
    const after = (await contactList(db)).find((c) => c.id === convo.id)!;
    expect(after.waiting).toBe(true); expect(after.replies[0]).toMatchObject({ direction: "in", message: "Yes, Tuesday works." });
    await call("POST", "/api/ops/contact/reply", { id: convo.id, message: "Great, see you then." });
    expect((await contactList(db)).find((c) => c.id === convo.id)!.waiting).toBe(false);
  });
  it("refuse more than one address, our own domain, bad subjects, empty messages and unknown signatures, and send nothing", async () => {
    const n = mailer.sent.length;
    const bad = [
      { to: "a@example.org, b@example.org" }, { to: "a@example.org\nbcc: x@example.org" }, { to: "hello@yourquarter.co.uk" }, { to: "x@mail.yourquarter.co.uk" }, { to: "not an address" }, { to: "" },
      { subject: "x" }, { subject: "y".repeat(151) }, { message: "x" }, { message: "z".repeat(6001) }, { signatureId: "11111111-2222-3333-4444-555555555555" },
    ];
    for (const b of bad) expect((await call("POST", "/api/ops/contact/new", { to: "ok@example.org", subject: "A fine subject", message: "A fine message.", ...b })).status, JSON.stringify(b)).toBe(400);
    expect(mailer.sent.length).toBe(n);
  });
  it("keep line breaks out of the subject, record nothing if the email fails, and are limited to 30 an hour", async () => {
    await call("POST", "/api/ops/contact/new", { to: "line@example.org", subject: "Two\r\nBcc: x@example.org", message: "A fine message." });
    expect(mailer.sent.at(-1)!.subject).toBe("Two Bcc: x@example.org");
    const count = (await contactList(db)).length; mailer.failNext = true;
    expect((await call("POST", "/api/ops/contact/new", { to: "fail@example.org", subject: "Will fail", message: "A fine message." })).status).toBe(502);
    expect((await contactList(db)).length).toBe(count);
    let blocked = 0;
    for (let i = 0; i < 40; i++) if ((await call("POST", "/api/ops/contact/new", { to: `bulk${i}@example.org`, subject: "Bulk test", message: "A fine message." })).status === 429) blocked++;
    expect(blocked).toBeGreaterThan(0);
  });
});
