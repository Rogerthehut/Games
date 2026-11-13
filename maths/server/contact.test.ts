import { describe, expect, it } from "vitest";
import { cleanContact, contactAllowed, contactById, contactList, deleteContact, purgeContact, saveContact, addContactReply } from "./contact";
import { MemoryCounters } from "./counters";
import { connectMemory, migrate } from "./db";
import { handleOpsApi } from "./ops-api";
import { FakeMailer } from "./mail";
import { FakeAuth } from "./auth";
import { OpsAccess } from "./ops-access";
import { schema } from "./db";

const good = { email: "Parent@Example.com ", message: "How do I add a second child?", topic: "question", name: "  Sam  " };
describe("cleanContact", () => {
  it("accepts a good message and tidies it", () => {
    const r = cleanContact(good);
    expect(r.ok && r.value).toEqual({ email: "parent@example.com", message: "How do I add a second child?", topic: "question", name: "Sam" });
  });
  it("rejects bad addresses, short and long messages", () => {
    for (const email of ["", "nope", "a@b", "a b@c.com", "<x>@c.com", "a@c.com, b@c.com", "x".repeat(300) + "@c.com"]) expect(cleanContact({ ...good, email }).ok).toBe(false);
    expect(cleanContact({ ...good, message: "hi" }).ok).toBe(false);
    expect(cleanContact({ ...good, message: "x".repeat(2001) }).ok).toBe(false);
    expect(cleanContact(null).ok).toBe(false);
  });
  it("treats the hidden field as a bot and unknown topics as other", () => {
    const bot = cleanContact({ ...good, website: "http://spam" });
    expect(!bot.ok && bot.error).toBe("bot");
    const t = cleanContact({ ...good, topic: "weird" });
    expect(t.ok && t.value.topic).toBe("other");
  });
});

describe("contactAllowed", () => {
  it("limits one address to 5 an hour and one email to 3 a day", async () => {
    const c = new MemoryCounters();
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await contactAllowed(c, "1.1.1.1", "a@b.co"));
    expect(results).toEqual([true, true, true, false]);
    const c2 = new MemoryCounters(); let n = 0;
    for (let i = 0; i < 8; i++) if (await contactAllowed(c2, "2.2.2.2", `u${i}@b.co`)) n++;
    expect(n).toBe(5);
  });
});

describe("stored messages", () => {
  it("saves, lists, replies, deletes and purges", async () => {
    const db = await connectMemory(); await migrate(db);
    const cl = cleanContact(good); if (!cl.ok) throw new Error("x");
    const id = await saveContact(db, cl.value);
    expect((await contactList(db)).length).toBe(1);
    await addContactReply(db, id, "admin:x", "Sure, here's how.");
    expect((await contactList(db, { unreplied: true })).length).toBe(0);
    expect((await contactList(db))[0].replies[0].message).toBe("Sure, here's how.");
    expect((await contactById(db, id))?.email).toBe("parent@example.com");
    await db.update(schema.contactMessages).set({ createdAt: new Date(Date.now() - 200 * 86_400_000) });
    await purgeContact(db);
    expect(await contactList(db)).toEqual([]); // replies go with it
    const id2 = await saveContact(db, cl.value);
    expect(await deleteContact(db, id2)).toBe(true);
    expect(await deleteContact(db, "not-an-id")).toBe(false);
  });
});

describe("ops contact routes", () => {
  it("only the signed-in, allowed, code-checked team can read and reply, and the reply goes to the sender's address", async () => {
    const db = await connectMemory(); await migrate(db);
    const mailer = new FakeMailer(), auth = new FakeAuth();
    const access = new OpsAccess({ auth, mailer, admins: new Set(["fake_boss@example.test"]), secret: "s".repeat(32) });
    const deps = { db, auth, mailer, access };
    const cl = cleanContact(good); if (!cl.ok) throw new Error("x");
    const id = await saveContact(db, cl.value);
    const q = new URLSearchParams();
    expect((await handleOpsApi({ method: "GET", path: "/api/ops/contact", query: q, token: "fake_rando" }, deps)).status).toBe(404);
    await access.sendCode("fake_boss");
    const code = /ops code: (\d{6})/.exec(mailer.sent[0].subject)![1];
    const session = (access.verify("fake_boss", code) as { session: string }).session;
    const list = await handleOpsApi({ method: "GET", path: "/api/ops/contact", query: q, token: "fake_boss", session }, deps);
    expect(list.status).toBe(200);
    const sent = await handleOpsApi({ method: "POST", path: "/api/ops/contact/reply", query: q, token: "fake_boss", session, body: { id, message: "Hello, happy to help." } }, deps);
    expect(sent.status).toBe(200);
    expect(mailer.sent.at(-1)?.to).toBe("parent@example.com");
    expect((await contactList(db))[0].replies.length).toBe(1);
    expect((await handleOpsApi({ method: "POST", path: "/api/ops/contact/delete", query: q, token: "fake_boss", session, body: { id } }, deps)).status).toBe(200);
  });
});
