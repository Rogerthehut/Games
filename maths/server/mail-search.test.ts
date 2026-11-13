import { beforeAll, describe, expect, it } from "vitest";
import { FakeAuth } from "./auth";
import { cleanContact, contactList, moveToTrash, recordInbound, saveContact } from "./contact";
import { MemoryCounters } from "./counters";
import { connectMemory, migrate, type Db } from "./db";
import { makeRepo } from "./db/repo";
import { FakeMailer } from "./mail";
import { buildCorpus, distance, normalise, searchDocs, searchMail, wordScore, type SearchDoc } from "./mail-search";
import { folderCounts, listFolder, saveDraft, sendOrQueue, setMark } from "./mailbox";
import { OpsAccess } from "./ops-access";
import { handleOpsApi } from "./ops-api";
import { configureTickets } from "./ticket";

describe("distance and wordScore", () => {
  it("count a swapped pair as one slip, and give up past the limit", () => {
    expect(distance("receive", "recieve", 2)).toBe(1); expect(distance("john", "jhon", 1)).toBe(1); expect(distance("cat", "cart", 1)).toBe(1); expect(distance("cat", "dog", 1)).toBe(2);
    expect(distance("abcdefgh", "xyz", 2)).toBe(3); expect(distance("same", "same", 1)).toBe(0);
  });
  it("rank an exact word above a word start above part of a word above a typo, and ignore the unrelated", () => {
    const t = ["please", "receive", "billing", "question"], n = "please receive billing question";
    expect(wordScore("billing", t, n).score).toBe(1); expect(wordScore("bill", t, n).score).toBe(0.85); expect(wordScore("eceiv", t, n).score).toBe(0.7);
    expect(wordScore("recieve", t, n).score).toBeCloseTo(0.5, 5); expect(wordScore("biling", t, n).score).toBeGreaterThan(0.4);
    expect(wordScore("zebra", t, n).score).toBe(0); expect(wordScore("cat", t, "dog fish").score).toBe(0);
    expect(wordScore("ab", ["abc"], "abc").score).toBe(0.85); expect(wordScore("xb", ["abc"], "abc").score).toBe(0); // short words get no typo leeway
  });
  it("ignore case and accents", () => { expect(normalise("Ünïcode ÉCOLE")).toBe("unicode ecole"); expect(wordScore("ecole", ["ecole"], "ecole").score).toBe(1); });
});

const doc = (o: Partial<SearchDoc> & { who: string; subject: string; body: string; ref?: string }): SearchDoc => ({ kind: "contact", id: Math.random().toString(16).slice(2), ref: o.ref ?? null, who: o.who, subject: o.subject, preview: o.body.slice(0, 40), at: "2026-11-13T10:00:00Z", unread: false, direction: "in", folder: "inbox", fields: { ref: o.ref ?? "", who: o.who, subject: o.subject, body: o.body }, ...o } as SearchDoc);
describe("searchDocs", () => {
  const docs = [
    doc({ who: "Sam Parent sam@example.com", subject: "Billing question", body: "I was charged twice this month, please refund", ref: "Q-1001" }),
    doc({ who: "Priya priya@school.org", subject: "Hello", body: "Do you have a receipt for the invoice?", ref: "Q-1002" }),
    doc({ who: "Lee lee@example.net", subject: "Refund", body: "Nothing to do with billing at all", ref: "Q-1003", folder: "messages" }),
    doc({ who: "Signed-in parent", subject: "idea Today", body: "Add more fractions please", ref: "F-1001", kind: "feedback", folder: "feedback" }),
  ];
  it("finds words in names, addresses, subjects, bodies and refs, with typos, and needs every word", () => {
    const ids = (q: string) => searchDocs(docs, q).map((h) => h.ref);
    expect(ids("billing")).toEqual(expect.arrayContaining(["Q-1001", "Q-1003"])); expect(ids("billing")[0]).toBe("Q-1001");     // subject match beats body match
    expect(ids("recieve receipt").length).toBe(0);                                  // "recieve" matches nothing here and every word is needed
    expect(ids("receit invoce")).toEqual(["Q-1002"]);
    expect(ids("PRIYA")).toEqual(["Q-1002"]); expect(ids("sam@example")).toEqual(["Q-1001"]); expect(ids("school.org")).toEqual(["Q-1002"]);
    expect(ids("charged twice")).toEqual(["Q-1001"]); expect(ids("fracions")).toEqual(["F-1001"]);
    expect(ids("q-1002")).toEqual(["Q-1002"]); expect(ids("Q1002")).toEqual(["Q-1002"]); expect(ids("f-1001")).toEqual(["F-1001"]); expect(ids("f-1002")).toEqual([]);
    expect(ids("1003")).toEqual(["Q-1003"]); expect(ids("q-1001")).not.toContain("F-1001");
    expect(ids("")).toEqual([]); expect(ids("a")).toEqual([]); expect(ids("zzzzqqq")).toEqual([]);
  });
  it("returns the folder, a snippet round the match, and the words to highlight", () => {
    const [hit] = searchDocs(docs, "refund");
    expect(hit.folder).toBe("messages"); expect(hit.marks).toContain("refund");
    const long = doc({ who: "A b@c.org", subject: "x", body: `${"Filler words here. ".repeat(20)}The unicorn is the key phrase.${" More filler.".repeat(20)}`, ref: "Q-2000" });
    const [h2] = searchDocs([long], "unicorn");
    expect(h2.snippet).toContain("unicorn"); expect(h2.snippet.length).toBeLessThan(220); expect(h2.snippet.startsWith("…")).toBe(true);
  });
  it("limits the query and the number of results", () => {
    expect(searchDocs(docs, "billing ".repeat(50)).length).toBeGreaterThan(0);
    const many = Array.from({ length: 100 }, (_, i) => doc({ who: `p${i}@x.org`, subject: "common word", body: "common", ref: `Q-${3000 + i}` }));
    expect(searchDocs(many, "common").length).toBe(60);
  });
});

let db: Db;
beforeAll(async () => { configureTickets("search test secret of some length 99"); db = await connectMemory(); await migrate(db); }, 60_000);
const form = async (email: string, message: string) => { const c = cleanContact({ email, message, topic: "question" }); if (!c.ok) throw new Error("x"); return saveContact(db, c.value); };
let n = 0; const inbound = (from: string, text: string, subject = "Hello") => recordInbound(db, { emailId: `${String(++n).padStart(8, "0")}-2222-3333-4444-555555555555`, from, name: null, subject, text, messageId: null, auth: null });

describe("searching the real mailbox", () => {
  it("finds each kind of item in its own folder, once, including drafts, the outbox and the Trash", async () => {
    const f = await form("form.person@example.com", "My zebrafish tank question about the app");
    await inbound("mailer.person@example.org", "Wondering about the zebrafish club", "Zebrafish club");
    const repo = makeRepo(db), p = await repo.upsertParent("user_search1");
    await repo.addFeedback(p.id, { category: "idea", rating: null, message: "More zebrafish facts in the science lab please", mayReply: false, context: null });
    await saveDraft(db, "admin:x", { kind: "new", to: "draft.person@example.org", subject: "About zebrafish", message: "A draft about zebrafish" });
    const failing = { live: true, send: async () => ({ ok: false as const, error: "down" }) };
    await sendOrQueue(db, failing, { kind: "new", conversationId: null, to: "outbox.person@example.org", subject: "Zebrafish reply", body: "Queued zebrafish text", html: "<p>x</p>", text: "x", inReplyTo: null, ticket: null, actor: "admin:x" });
    const sent = new FakeMailer(); await sendOrQueue(db, sent, { kind: "new", conversationId: null, to: "sent.person@example.org", subject: "Zebrafish hello", body: "Sent zebrafish text", html: "<p>x</p>", text: "x", inReplyTo: null, ticket: null, actor: "admin:x" });
    const trashed = await form("trashed.person@example.com", "Trashed zebrafish message"); await moveToTrash(db, "contact", trashed);
    const hits = await searchMail(db, "zebrafish");
    const byFolder = (fo: string) => hits.filter((h) => h.folder === fo).length;
    expect([byFolder("messages"), byFolder("inbox"), byFolder("feedback"), byFolder("drafts"), byFolder("outbox"), byFolder("sent"), byFolder("trash")]).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(hits.find((h) => h.id === f)!.folder).toBe("messages");
    expect(hits.length).toBe(7);                                                     // no item is listed twice
    expect((await searchMail(db, "zebrafsh tnak")).some((h) => h.id === f)).toBe(true); // slips in both words
    expect((await searchMail(db, "form.person")).map((h) => h.id)).toEqual([f]);
    expect(await searchMail(db, "nothing like this anywhere")).toEqual([]);
  });
  it("searches whole threads, not just the first message", async () => {
    await form("thread.person@example.com", "An ordinary first message about accounts");
    await inbound("thread.person@example.com", "Later I added the word quokka in a reply");
    const hits = await searchMail(db, "quokka");
    expect(hits).toHaveLength(1); expect(hits[0].snippet).toContain("quokka");
  });
  it("corpus has one document per thing and no secrets", async () => {
    const corpus = await buildCorpus(db);
    expect(new Set(corpus.map((d) => `${d.kind}:${d.id}`)).size).toBe(corpus.length);
    expect(JSON.stringify(corpus)).not.toMatch(/clerk|stripe/i);
  });
});

describe("pin and flag", () => {
  it("keep pinned conversations at the top of their folder, and gather flagged ones from every folder", async () => {
    const a = await form("pin.a@example.com", "First pin test message here"), b = await form("pin.b@example.com", "Second pin test message here");
    const repo = makeRepo(db), p = await repo.upsertParent("user_pin1");
    await repo.addFeedback(p.id, { category: "bug", rating: null, message: "Flag this feedback please", mayReply: false, context: null });
    const fb = (await listFolder(db, "feedback")).find((i) => i.preview.includes("Flag this"))!;
    const order = async () => (await listFolder(db, "messages")).map((i) => i.id);
    expect((await order()).indexOf(b)).toBeLessThan((await order()).indexOf(a));      // newest first
    expect(await setMark(db, "contact", a, "pinned", true)).toBe(true);
    expect((await order())[0]).toBe(a);                                               // pinned goes first
    expect((await listFolder(db, "messages")).find((i) => i.id === a)).toMatchObject({ pinned: true });
    await setMark(db, "contact", a, "pinned", false); expect((await order()).indexOf(b)).toBeLessThan((await order()).indexOf(a));
    const before = (await folderCounts(db)).flagged.total;
    await setMark(db, "contact", b, "flagged", true); await setMark(db, "feedback", fb.id, "flagged", true);
    const flagged = await listFolder(db, "flagged");
    expect(flagged.map((i) => i.id)).toEqual(expect.arrayContaining([b, fb.id])); expect(flagged.every((i) => i.flagged)).toBe(true);
    expect((await folderCounts(db)).flagged.total).toBe(before + 2);
    await moveToTrash(db, "contact", b);                                              // trashed items leave Flagged, and come back with their flag
    expect((await listFolder(db, "flagged")).some((i) => i.id === b)).toBe(false);
    await setMark(db, "contact", b, "flagged", false); expect(await setMark(db, "contact", "not-an-id", "flagged", true)).toBe(false);
    expect(await setMark(db, "contact", "11111111-2222-3333-4444-555555555555", "pinned", true)).toBe(false);
  });
});

describe("the search, pin and flag routes", () => {
  it("need the full proof, refuse short searches, and are audit-logged without what was searched for", async () => {
    const mailer = new FakeMailer(), auth = new FakeAuth(), counters = new MemoryCounters();
    const access = new OpsAccess({ auth, mailer, admins: new Set(["fake_boss@example.test"]), secret: "s".repeat(32) });
    await access.sendCode("fake_boss");
    const session = (access.verify("fake_boss", /ops code: (\d{6})/.exec(mailer.sent[0].subject)![1]) as { session: string }).session;
    const call = (method: string, path: string, body?: unknown, query = new URLSearchParams(), who = "fake_boss", sess = session) => handleOpsApi({ method, path, query, token: who, session: sess, body }, { db, auth, mailer, access, counters, inboundOn: true });
    const id = await form("route.person@example.com", "A narwhal question for the search route");
    for (const [m, p] of [["GET", "/api/ops/mail/search"], ["POST", "/api/ops/mail/pin"], ["POST", "/api/ops/mail/flag"]] as const) {
      expect((await call(m, p, { id }, new URLSearchParams({ q: "narwhal" }), "fake_rando", "")).status, p).toBe(404); expect((await call(m, p, { id }, new URLSearchParams({ q: "narwhal" }), "fake_boss", "")).status, p).toBe(404);
    }
    expect((await call("GET", "/api/ops/mail/search", undefined, new URLSearchParams({ q: "a" }))).status).toBe(400);
    const found = (await call("GET", "/api/ops/mail/search", undefined, new URLSearchParams({ q: "narwhall" }))).body as { hits: { id: string; folder: string; marks: string[] }[] };
    expect(found.hits[0]).toMatchObject({ id, folder: "messages" });
    expect((await call("POST", "/api/ops/mail/pin", { kind: "contact", id, on: true })).status).toBe(200);
    expect((await call("POST", "/api/ops/mail/flag", { kind: "contact", id, on: true })).status).toBe(200);
    expect((await call("POST", "/api/ops/mail/flag", { kind: "contact", id: "not-an-id", on: true })).status).toBe(404);
    const list = ((await call("GET", "/api/ops/mail", undefined, new URLSearchParams({ folder: "flagged" }))).body as { items: { id: string; pinned: boolean; flagged: boolean }[] }).items;
    expect(list.find((i) => i.id === id)).toMatchObject({ pinned: true, flagged: true });
    const audit = JSON.stringify((await call("GET", "/api/ops/audit")).body);
    expect(audit).toContain("mail-search"); expect(audit).toContain("mail-pin"); expect(audit).toContain("mail-flag"); expect(audit).not.toContain("narwhal");
    counters["hits" as never]; // (the per-person limit is covered by the other route tests)
  });
});
