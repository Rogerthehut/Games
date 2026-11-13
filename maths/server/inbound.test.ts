import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { contactList } from "./contact";
import { MemoryCounters } from "./counters";
import { connectMemory, migrate } from "./db";
import { handleInbound, isAutomated, newPartOf } from "./inbound";

const SECRET = "whsec_" + Buffer.from("a test secret of a decent length").toString("base64");
const NOW = 1_800_000_000_000;
const EMAIL_ID = "11111111-2222-3333-4444-555555555555";
const sign = (body: string, id = "msg_1", ts = String(Math.floor(NOW / 1000))) => ({ id, timestamp: ts, signature: `v1,${createHmac("sha256", Buffer.from(SECRET.slice(6), "base64")).update(`${id}.${ts}.${body}`).digest("base64")}` });
const event = (o: Record<string, unknown> = {}) => JSON.stringify({ type: "email.received", created_at: "x", data: { email_id: EMAIL_ID, from: "parent@example.com", to: ["hello@yourquarter.co.uk"], subject: "Help", ...o } });
const fetcherFor = (email: Record<string, unknown>, status = 200) => (async () => new Response(JSON.stringify(email), { status })) as unknown as typeof fetch;
const goodEmail = { text: "Hello, how do I add a second child?\n\nOn Fri, 13 Nov 2026 at 01:17, quarter <hello@yourquarter.co.uk> wrote:\n> earlier text", headers: { from: "Sam Parent <parent@example.com>" }, subject: "Help", message_id: "<abc123@mail.example.com>", authentication: { spf: "pass", dkim: "pass", dmarc: "pass" } };
async function setup(email: Record<string, unknown> = goodEmail, status = 200) {
  const db = await connectMemory(); await migrate(db);
  const counters = new MemoryCounters();
  const deps = { db, counters, apiKey: "re_test", secret: SECRET, now: () => NOW, fetcher: fetcherFor(email, status) };
  return { db, counters, deps };
}

describe("isAutomated and newPartOf", () => {
  it("spots automatic mail", () => {
    expect(isAutomated({ "auto-submitted": "auto-replied" }, "a@b.co")).toBe(true);
    expect(isAutomated({ "auto-submitted": "no" }, "a@b.co")).toBe(false);
    expect(isAutomated({ precedence: "bulk" }, "a@b.co")).toBe(true);
    expect(isAutomated({ "list-id": "<x.y>" }, "a@b.co")).toBe(true);
    expect(isAutomated({ "return-path": "<>" }, "a@b.co")).toBe(true);
    expect(isAutomated({}, "mailer-daemon@b.co")).toBe(true);
    expect(isAutomated({}, "noreply@b.co")).toBe(true);
    expect(isAutomated({}, "sam@b.co")).toBe(false);
  });
  it("keeps the new part and drops quoted history", () => {
    expect(newPartOf("Thanks, that worked!\n\nOn Mon, 1 Jan 2026 at 10:00, quarter <hello@yourquarter.co.uk> wrote:\n> Hi")).toBe("Thanks, that worked!");
    expect(newPartOf("Thanks\n> quoted\nmore")).toBe("Thanks");
    expect(newPartOf("Hello\n\n-----Original Message-----\nFrom: x\nSent: y")).toBe("Hello");
    expect(newPartOf("Hi there\n\nFrom: Roger\nSent: Monday\nTo: me\nSubject: Re: x\nold")).toBe("Hi there");
    expect(newPartOf("> only a quote")).toBe("> only a quote");
    expect(newPartOf("x".repeat(9000)).length).toBe(6000);
  });
});

describe("handleInbound", () => {
  it("refuses unsigned, wrongly signed, stale and oversized requests, without calling Resend", async () => {
    const { deps } = await setup();
    let calls = 0; const counting = { ...deps, fetcher: (async () => { calls++; return new Response("{}"); }) as unknown as typeof fetch };
    const body = event();
    expect((await handleInbound(body, {}, counting)).status).toBe(400);
    expect((await handleInbound(body, { ...sign(body), signature: "v1,AAAA" }, counting)).status).toBe(400);
    expect((await handleInbound(body, sign(body, "msg_1", String(Math.floor(NOW / 1000) - 3600)), counting)).status).toBe(400);
    expect((await handleInbound(body + " ", sign(body), counting)).status).toBe(400);
    expect((await handleInbound("x".repeat(70_000), sign("x".repeat(70_000)), counting)).status).toBe(400);
    expect(calls).toBe(0);
  });
  it("saves a new conversation from a signed email, with plain text only and the sender's checks", async () => {
    const { db, deps } = await setup();
    const body = event(); const out = await handleInbound(body, sign(body), deps);
    expect(out.status).toBe(200);
    const [c] = await contactList(db);
    expect(c).toMatchObject({ email: "parent@example.com", name: "Sam Parent", source: "email", subject: "Help", message: "Hello, how do I add a second child?", auth: "spf=pass dkim=pass dmarc=pass", waiting: true });
  });
  it("turns HTML into text and never keeps markup", async () => {
    const { db, deps } = await setup({ ...goodEmail, text: null, html: '<p>Hi <b>there</b><script>alert(1)</script></p><img src="x" onerror="y">' });
    const body = event(); await handleInbound(body, sign(body), deps);
    expect((await contactList(db))[0].message).toBe("Hi there");
  });
  it("adds a second email from the same sender to the same conversation, and counts it as waiting", async () => {
    const { db, deps } = await setup();
    const b1 = event(); await handleInbound(b1, sign(b1, "msg_1"), deps);
    const b2 = event({ email_id: "22222222-2222-3333-4444-555555555555" });
    await handleInbound(b2, sign(b2, "msg_2"), { ...deps, fetcher: fetcherFor({ ...goodEmail, text: "One more thing", message_id: "<second@mail.example.com>" }) });
    const list = await contactList(db);
    expect(list.length).toBe(1);
    expect(list[0].replies).toMatchObject([{ direction: "in", message: "One more thing" }]);
    expect(list[0].waiting).toBe(true);
  });
  it("counts a webhook delivered twice only once", async () => {
    const { db, deps } = await setup();
    const body = event();
    expect(((await handleInbound(body, sign(body), deps)).body as { saved: boolean }).saved).toBe(true);
    expect(((await handleInbound(body, sign(body, "msg_retry"), deps)).body as { saved: boolean }).saved).toBe(false);
    expect((await contactList(db)).length).toBe(1);
  });
  it("drops automatic mail, mail from our own domain, empty mail and ignored event types", { timeout: 60_000 }, async () => {
    for (const [email, extra] of [[{ ...goodEmail, headers: { "auto-submitted": "auto-replied" } }, {}], [goodEmail, { from: "hello@yourquarter.co.uk" }], [goodEmail, { from: "x@mail.yourquarter.co.uk" }], [{ ...goodEmail, text: "  " }, {}]] as const) {
      const { db, deps } = await setup(email as Record<string, unknown>);
      const body = event(extra); const out = await handleInbound(body, sign(body), deps);
      expect(out.status).toBe(200); expect(await contactList(db)).toEqual([]);
    }
    const { db, deps } = await setup();
    const other = JSON.stringify({ type: "email.delivered", data: {} });
    expect((await handleInbound(other, sign(other), deps)).status).toBe(200); expect(await contactList(db)).toEqual([]);
  });
  it("ignores an email id or sender that doesn't look right, without calling Resend", async () => {
    const { deps } = await setup(); let calls = 0;
    const d2 = { ...deps, fetcher: (async () => { calls++; return new Response("{}"); }) as unknown as typeof fetch };
    for (const odd of [{ email_id: "../../etc/passwd" }, { email_id: EMAIL_ID + "x" }, { from: "not an address" }, { from: "a@b.co, c@d.co" }]) { const b = event(odd); expect((await handleInbound(b, sign(b), d2)).status).toBe(200); }
    expect(calls).toBe(0);
  });
  it("limits one sender to 20 a day", { timeout: 60_000 }, async () => {
    const { db, deps } = await setup();
    for (let i = 0; i < 25; i++) { const b = event({ email_id: `${String(i).padStart(8, "0")}-2222-3333-4444-555555555555` }); await handleInbound(b, sign(b, `m${i}`), deps); }
    const c = (await contactList(db))[0];
    expect(1 + c.replies.length).toBe(20);
  });
  it("asks Resend to retry when the content can't be fetched, and then records it once it can", async () => {
    const { db, deps } = await setup(goodEmail, 500);
    const body = event();
    expect((await handleInbound(body, sign(body), deps)).status).toBe(502);
    expect(await contactList(db)).toEqual([]);
    expect((await handleInbound(body, sign(body), { ...deps, fetcher: fetcherFor(goodEmail) })).status).toBe(200);
    expect((await contactList(db)).length).toBe(1);
  });
  it("flags a sender whose checks fail, so spoofing shows", async () => {
    const { db, deps } = await setup({ ...goodEmail, authentication: { spf: "fail", dkim: "gray", dmarc: "fail" } });
    const body = event(); await handleInbound(body, sign(body), deps);
    expect((await contactList(db))[0].auth).toBe("spf=fail dkim=gray dmarc=fail");
  });
  it("sends the request to Resend's receiving endpoint with the API key only", async () => {
    const { deps } = await setup(); const seen: { url: string; auth?: string }[] = [];
    const f = (async (u: string, init: RequestInit) => { seen.push({ url: u, auth: (init.headers as Record<string, string>).Authorization }); return new Response(JSON.stringify(goodEmail)); }) as unknown as typeof fetch;
    const body = event(); await handleInbound(body, sign(body), { ...deps, fetcher: f });
    expect(seen[0].url).toBe(`https://api.resend.com/emails/receiving/${EMAIL_ID}?html_format=cid`); expect(seen[0].auth).toBe("Bearer re_test");
  });
});
