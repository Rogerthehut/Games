import { beforeAll, describe, expect, it } from "vitest";
import { FakeAuth } from "./auth";
import { cleanContact, contactList, recordInbound, saveContact } from "./contact";
import { MemoryCounters } from "./counters";
import { connectMemory, migrate, schema, type Db } from "./db";
import { makeRepo } from "./db/repo";
import { type Mailer, FakeMailer } from "./mail";
import { folderCounts, listFolder, retryDue, sendOrQueue, saveDraft, listDrafts, deleteDraft, retryOne, discardOutbox, listOutbox, markRead } from "./mailbox";
import { OpsAccess } from "./ops-access";
import { handleOpsApi } from "./ops-api";
import { nextTicket, refOf, ticketInSubject, withRef } from "./ticket";
import { eq } from "drizzle-orm";

let db: Db;
beforeAll(async () => { db = await connectMemory(); await migrate(db); }, 60_000);
const form = async (email: string, message = "A question about the app please") => { const c = cleanContact({ email, message, topic: "question" }); if (!c.ok) throw new Error("x"); return saveContact(db, c.value); };
let n = 0; const inbound = (from: string, o: { subject?: string | null; text?: string } = {}) => recordInbound(db, { emailId: `${String(++n).padStart(8, "0")}-2222-3333-4444-555555555555`, from, name: null, subject: o.subject ?? "Hello", text: o.text ?? "Some words here", messageId: `<m${n}@x.test>`, auth: "spf=pass dkim=pass dmarc=pass" });

describe("reference numbers", () => {
  it("count up from 1001 separately for conversations and feedback", async () => {
    const a = await nextTicket(db, "contact"), b = await nextTicket(db, "contact"), f = await nextTicket(db, "feedback");
    expect(b).toBe(a + 1); expect(f).toBeLessThanOrEqual(1002);
    expect(refOf("contact", 1042)).toBe("Q-1042"); expect(refOf("feedback", 1007)).toBe("F-1007"); expect(refOf("contact", null)).toBeNull();
  });
  it("go on the end of a subject once, and are read back from one", () => {
    expect(withRef("Re: your message", "Q-1042")).toBe("Re: your message [Q-1042]");
    expect(withRef("Re: your message [Q-1042]", "Q-1042")).toBe("Re: your message [Q-1042]");
    expect(ticketInSubject("Re: your message [Q-1042]")).toBe(1042); expect(ticketInSubject("Re: nothing")).toBeNull(); expect(ticketInSubject("[F-1007]")).toBeNull();
  });
  it("are unique for conversations made at the same moment", async () => {
    const ids = await Promise.all(Array.from({ length: 8 }, (_, i) => form(`same${i}@example.com`)));
    const tickets = (await contactList(db)).filter((c) => ids.includes(c.id)).map((c) => c.ticket);
    expect(new Set(tickets).size).toBe(8);
  });
});

describe("folders", () => {
  it("put the form in Messages, email in Inbox, our own emails in Sent, and a reply to one of ours in the Inbox too", async () => {
    const f = await form("form1@example.com");
    await inbound("mail1@example.org");
    const mailer = new FakeMailer();
    const out = await sendOrQueue(db, mailer, { kind: "new", conversationId: null, to: "first@example.org", subject: "A hello", body: "Hi there friend", html: "<p>Hi there friend</p>", text: "Hi there friend", inReplyTo: null, ticket: null, actor: "admin:x" });
    expect(out.ok).toBe(true);
    const sentTo = (await listFolder(db, "sent")).map((i) => i.who);
    expect(sentTo).toContain("To first@example.org");
    expect((await listFolder(db, "messages")).some((i) => i.id === f)).toBe(true);
    expect((await listFolder(db, "inbox")).some((i) => i.who === "mail1@example.org")).toBe(true);
    expect((await listFolder(db, "inbox")).some((i) => i.who.includes("first@example.org"))).toBe(false);
    await inbound("first@example.org", { subject: "Re: A hello" });
    expect((await listFolder(db, "inbox")).some((i) => i.who === "first@example.org")).toBe(true);
    expect((await listFolder(db, "sent")).some((i) => i.who === "To first@example.org")).toBe(true);
    expect((await listFolder(db, "messages")).some((i) => i.who === "first@example.org")).toBe(false);
  });
  it("hold feedback in its own folder, with its reference, and list our replies to it in Sent", async () => {
    const repo = makeRepo(db), p = await repo.upsertParent("user_fb1");
    await repo.addFeedback(p.id, { category: "idea", rating: 4, message: "Add more fractions please", mayReply: true, context: "Today" });
    const [fb] = await listFolder(db, "feedback");
    expect(fb).toMatchObject({ kind: "feedback", ref: expect.stringMatching(/^F-\d{4,}$/), unread: true, direction: "in" }); expect(fb.preview).toContain("fractions");
    const row = (await db.select().from(schema.feedback).where(eq(schema.feedback.id, fb.id)))[0];
    await db.insert(schema.feedbackReplies).values({ feedbackId: row.id, actor: "admin:x", message: "Thanks, noted." });
    expect((await listFolder(db, "sent")).some((i) => i.kind === "feedback" && i.preview.includes("noted"))).toBe(true);
  });
  it("count unread, clear it when opened, and bring it back when the sender writes again", async () => {
    const before = (await folderCounts(db)).messages.unread;
    const id = await form("unread1@example.com");
    expect((await folderCounts(db)).messages.unread).toBe(before + 1);
    await markRead(db, "contact", id);
    expect((await folderCounts(db)).messages.unread).toBe(before);
    await inbound("unread1@example.com");
    expect((await listFolder(db, "messages")).find((i) => i.id === id)!.unread).toBe(true);
    expect((await listFolder(db, "messages", { unread: true })).every((i) => i.unread)).toBe(true);
  });
});

describe("replies find their conversation by reference as well as by sender", () => {
  it("attach a reply from another address to the conversation named in the subject, and record who wrote it", async () => {
    const id = await form("owner@example.com");
    const t = (await contactList(db)).find((c) => c.id === id)!.ticket!;
    await inbound("someone.else@example.net", { subject: `Re: your message [Q-${t}]`, text: "Forwarded on from my partner's address" });
    const c = (await contactList(db)).find((x) => x.id === id)!;
    expect(c.replies).toHaveLength(1); expect(c.replies[0]).toMatchObject({ direction: "in", fromEmail: "someone.else@example.net" }); expect(c.waiting).toBe(true);
  });
  it("start a new conversation when there's no reference and no earlier one from that sender", async () => {
    const before = (await contactList(db)).length;
    await inbound("brand.new@example.net", { subject: "Hello" });
    expect((await contactList(db)).length).toBe(before + 1);
  });
});

describe("drafts", () => {
  it("save, update, list and delete, and refuse bad ones", async () => {
    const id = await form("draftee@example.com");
    const a = await saveDraft(db, "admin:x", { kind: "new", to: "To@Example.org", subject: "Plans", message: "Some start" });
    expect(a.ok).toBe(true); if (!a.ok) return;
    expect((await saveDraft(db, "admin:x", { id: a.id, kind: "new", to: "to@example.org", subject: "Plans", message: "Some more words" })).ok).toBe(true);
    const r = await saveDraft(db, "admin:x", { kind: "reply", conversationId: id, message: "Dear draftee" });
    expect(r.ok).toBe(true);
    const list = await listDrafts(db);
    expect(list.find((d) => d.id === a.id)).toMatchObject({ who: "To to@example.org", subject: "Plans", preview: "Some more words" });
    expect(list.some((d) => d.draftKind === "reply" && d.who.includes("draftee@example.com"))).toBe(true);
    expect((await saveDraft(db, "admin:x", { kind: "new", to: "not an address" })).ok).toBe(false);
    expect((await saveDraft(db, "admin:x", { kind: "reply", message: "no conversation" })).ok).toBe(false);
    expect((await saveDraft(db, "admin:x", { kind: "new" })).ok).toBe(false);
    expect((await saveDraft(db, "admin:x", { kind: "weird", message: "x" })).ok).toBe(false);
    expect(await deleteDraft(db, a.id)).toBe(true); expect(await deleteDraft(db, a.id)).toBe(false);
  });
  it("go when their conversation is deleted", async () => {
    const id = await form("gone@example.com");
    await saveDraft(db, "admin:x", { kind: "reply", conversationId: id, message: "A reply in progress" });
    await db.delete(schema.contactMessages).where(eq(schema.contactMessages.id, id));
    expect((await listDrafts(db)).some((d) => d.preview === "A reply in progress")).toBe(false);
  });
});

describe("the outbox", () => {
  const mail = (ok: () => boolean, log: string[] = []): Mailer => ({ live: true, send: async (e) => { if (!ok()) return { ok: false as const, error: "Resend answered 500" }; log.push(e.to); return { ok: true as const }; } });
  const send = (m: Mailer, to: string) => sendOrQueue(db, m, { kind: "new", conversationId: null, to, subject: "Outbox test", body: "Body of the email", html: "<p>Body</p>", text: "Body", inReplyTo: null, ticket: null, actor: "admin:x" });
  it("holds an email that couldn't be sent, retries it later, and records it only once it has gone", async () => {
    let up = false; const log: string[] = [], m = mail(() => up, log);
    const out = await send(m, "queued@example.org");
    expect(out).toMatchObject({ ok: false, queued: true });
    expect((await listFolder(db, "outbox")).find((i) => i.who === "To queued@example.org")).toMatchObject({ status: "failed", error: "Resend answered 500", attempts: 1 });
    expect((await contactList(db)).some((c) => c.email === "queued@example.org")).toBe(false);
    expect(await retryDue(db, m, new Date())).toBe(0);                          // not due yet
    expect(await retryDue(db, m, new Date(Date.now() + 10 * 60_000))).toBe(0); // due, but still down
    up = true;
    expect(await retryDue(db, m, new Date(Date.now() + 2 * 3_600_000))).toBeGreaterThanOrEqual(1);
    expect(log).toContain("queued@example.org");
    expect((await listOutbox(db)).some((i) => i.who === "To queued@example.org")).toBe(false);
    const c = (await contactList(db)).find((x) => x.email === "queued@example.org")!;
    expect(c.source).toBe("sent"); expect(c.ticket).toBeGreaterThan(1000);
  });
  it("gives up after five tries until someone presses Retry, and Retry and Discard work", async () => {
    let up = false; const log: string[] = [], m = mail(() => up, log);
    await send(m, "stubborn@example.org");
    for (let i = 1; i <= 8; i++) await retryDue(db, m, new Date(Date.now() + i * 24 * 3_600_000));
    const row = (await listOutbox(db)).find((i) => i.who === "To stubborn@example.org")!;
    expect(row.attempts).toBe(5);
    expect(await retryDue(db, m, new Date(Date.now() + 30 * 24 * 3_600_000))).toBe(0);
    up = true;
    const again = await retryOne(db, m, row.id);
    expect(again?.ok).toBe(true); expect(log).toEqual(["stubborn@example.org"]);
    // discarding
    up = false; const second = await send(m, "discard@example.org");
    expect(second.ok).toBe(false);
    const d = (await listOutbox(db)).find((i) => i.who === "To discard@example.org")!;
    expect(await discardOutbox(db, d.id)).toBe(true); expect(await discardOutbox(db, d.id)).toBe(false);
    expect(await retryOne(db, m, "not-an-id")).toBeNull();
  });
  it("never sends the same email twice when a retry and a click collide", async () => {
    let up = false; const log: string[] = [], m = mail(() => up, log);
    await send(m, "race@example.org");
    const row = (await listOutbox(db)).find((i) => i.who === "To race@example.org")!;
    up = true;
    const results = await Promise.all([retryOne(db, m, row.id), retryOne(db, m, row.id), retryDue(db, m)]); // the timer uses the real clock
    expect(log.filter((x) => x === "race@example.org")).toHaveLength(1);
    expect(results).toBeDefined();
  });
  it("replies go in the outbox too, and are recorded in their conversation when they go", async () => {
    const id = await form("replyq@example.com"); const t = (await contactList(db)).find((c) => c.id === id)!;
    let up = false; const m = mail(() => up);
    const out = await sendOrQueue(db, m, { kind: "reply", conversationId: id, to: "replyq@example.com", subject: "Re: Hi", body: "Answering you", html: "<p>x</p>", text: "x", inReplyTo: null, ticket: t.ticket, actor: "admin:x" });
    expect(out.ok).toBe(false);
    expect((await contactList(db)).find((c) => c.id === id)!.replies).toHaveLength(0);
    up = true; await retryDue(db, m, new Date(Date.now() + 3_600_000));
    expect((await contactList(db)).find((c) => c.id === id)!.replies[0]).toMatchObject({ direction: "out", message: "Answering you" });
  });
});

describe("the mailbox routes need the full proof, and work", () => {
  it("refuse anyone else, then list folders with counts, open a thread (marking it read) and save drafts", async () => {
    const mailer = new FakeMailer(), auth = new FakeAuth(), counters = new MemoryCounters();
    const access = new OpsAccess({ auth, mailer, admins: new Set(["fake_boss@example.test"]), secret: "s".repeat(32) });
    await access.sendCode("fake_boss");
    const session = (access.verify("fake_boss", /ops code: (\d{6})/.exec(mailer.sent[0].subject)![1]) as { session: string }).session;
    const q = (o: Record<string, string> = {}) => new URLSearchParams(o);
    const call = (method: string, path: string, body?: unknown, query = q(), who = "fake_boss", sess: string | undefined = session) => handleOpsApi({ method, path, query, token: who, session: sess, body }, { db, auth, mailer, access, counters, inboundOn: true });
    const guarded: [string, string][] = [["GET", "/api/ops/mail"], ["GET", "/api/ops/mail/thread"], ["POST", "/api/ops/mail/unread"], ["GET", "/api/ops/drafts"], ["POST", "/api/ops/drafts"], ["POST", "/api/ops/drafts/delete"], ["POST", "/api/ops/outbox/retry"], ["POST", "/api/ops/outbox/discard"]];
    for (const [m, p] of guarded) { expect((await call(m, p, {}, q({ folder: "inbox" }), "fake_rando", "")).status, p).toBe(404); expect((await call(m, p, {}, q({ folder: "inbox" }), "fake_boss", "")).status, p).toBe(404); }
    expect((await call("GET", "/api/ops/mail", undefined, q({ folder: "nope" }))).status).toBe(400);
    const id = await form("routes@example.com");
    const list = (await call("GET", "/api/ops/mail", undefined, q({ folder: "messages" }))).body as { items: { id: string; unread: boolean }[]; counts: Record<string, { unread: number }> };
    expect(list.items.find((i) => i.id === id)!.unread).toBe(true); expect(list.counts.messages.unread).toBeGreaterThan(0);
    const thread = await call("GET", "/api/ops/mail/thread", undefined, q({ kind: "contact", id }));
    expect(thread.status).toBe(200); expect((thread.body as { thread: { unread: boolean; message: string } }).thread.message).toContain("question about the app");
    expect(((await call("GET", "/api/ops/mail", undefined, q({ folder: "messages" }))).body as typeof list).items.find((i) => i.id === id)!.unread).toBe(false);
    await call("POST", "/api/ops/mail/unread", { kind: "contact", id });
    expect(((await call("GET", "/api/ops/mail", undefined, q({ folder: "messages" }))).body as typeof list).items.find((i) => i.id === id)!.unread).toBe(true);
    expect((await call("GET", "/api/ops/mail/thread", undefined, q({ kind: "contact", id: "11111111-2222-3333-4444-555555555555" }))).status).toBe(404);
    const saved = await call("POST", "/api/ops/drafts", { kind: "reply", conversationId: id, message: "Hello from a draft" });
    expect(saved.status).toBe(200);
    const draftId = (saved.body as { id: string }).id;
    expect(((await call("GET", "/api/ops/drafts", undefined, q({ id: draftId }))).body as { draft: { message: string } }).draft.message).toBe("Hello from a draft");
    // sending the reply removes the draft
    expect((await call("POST", "/api/ops/contact/reply", { id, message: "Hello from a draft", draftId })).status).toBe(200);
    expect((await call("GET", "/api/ops/drafts", undefined, q({ id: draftId }))).status).toBe(404);
    expect((await call("POST", "/api/ops/drafts", { kind: "new", to: "bad address" })).status).toBe(400);
    const audit = JSON.stringify((await call("GET", "/api/ops/audit")).body);
    expect(audit).toContain("mail-open"); expect(audit).not.toContain("routes@example.com"); expect(audit).not.toContain("Hello from a draft");
  });
});
