import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "../src/curriculum";
import { newProfile, type Profile } from "../src/engine/progress";
import { mulberry32 } from "../src/engine/rng";
import { recordWrong } from "../src/engine/wrong-log";
import { TERMS_VERSION } from "../src/legal/terms-version";
import { WriteLimiter, handleAccountApi, type AccountDeps } from "./accounts";
import { FakeAuth } from "./auth";
import { connectMemory, migrate, type Db } from "./db";
import { makeRepo } from "./db/repo";
import { buildDigest } from "./digest";
import { DIGEST_GAP_MS, runDigestJob, unsubscribeUrl } from "./digest-job";
import { FakeMailer, ResendMailer, mailerFromEnv } from "./mail";

const NOW = 1_800_000_000_000, DAY = 86_400_000;
const week = (name: string, daysPracticed: number, withMistakes = true): Profile => {
  let p: Profile = newProfile(name, 5, NOW - 40 * DAY);
  for (let d = 0; d < daysPracticed; d++) p = { ...p, sessions: [...p.sessions, { at: NOW - (d + 1) * DAY, minutes: 8, answered: 10, correct: 7, skills: ["frac-add"] }] };
  if (withMistakes) for (let i = 0; i < 3; i++) {
    const q = { ...SKILL_BY_ID["frac-add"].generate(mulberry32(300 + i), 2), seed: 300 + i };
    p = recordWrong(p, { q, outcome: "missed", tried: ["3"], tags: ["x"], notes: ["They added the bottoms as well as the tops."], source: "practice" }, NOW - (i + 1) * DAY);
  }
  return p;
};

describe("the weekly email text", () => {
  const input = (learners: Profile[]) => ({ learners, appUrl: "https://app.test", unsubscribeUrl: "https://app.test/unsubscribe?t=abc", now: NOW });
  it("says how the week went, what was tricky and why, with an unsubscribe link and the company line", () => {
    const d = buildDigest(input([week("Maya", 4)]))!;
    expect(d.subject).toBe("Maya's week on quarter: 4 days, 40 questions");
    for (const part of ["Practised on 4 days", "70% right", "Adding fractions", "added the bottoms", "ten minutes on Adding fractions", "unsubscribe", "Wristed Ltd"]) expect(d.text.toLowerCase(), part).toContain(part.toLowerCase());
    expect(d.html).toContain("https://app.test/unsubscribe?t=abc");
    expect(d.html).toContain("Open the learning report");
  });
  it("covers every learner who practised, and leaves out the ones who didn't", () => {
    const d = buildDigest(input([week("Maya", 3), week("Leo", 0, false), week("Tess", 2)]))!;
    expect(d.learners.map((l) => l.name)).toEqual(["Maya", "Tess"]);
    expect(d.subject).toBe("This week on quarter: Maya and Tess practised");
  });
  it("sends nothing when nobody practised", () => expect(buildDigest(input([week("Leo", 0, false)]))).toBeNull());
  it("never puts a learner's name into the page as markup", () => {
    const d = buildDigest(input([week("<b>Mo</b>", 2)]))!;
    expect(d.html).not.toContain("<b>Mo</b>");
    expect(d.html).toContain("&lt;b&gt;Mo");
  });
  it("is kind when nothing was tricky", () => expect(buildDigest(input([week("Maya", 2, false)]))!.text).toContain("Nothing tricky"));
});

describe("sending", () => {
  it("Resend: posts the email with the key, a reply-to and the one-click unsubscribe headers, and doesn't leak the address on failure", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const ok = new ResendMailer("re_key", "quarter <weekly@mail.yourquarter.co.uk>", "hello@yourquarter.co.uk", (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response("{}", { status: 200 }); }) as unknown as typeof fetch);
    expect(await ok.send({ to: "a@b.test", subject: "S", text: "T", html: "<p>T</p>", unsubscribeUrl: "https://x/u" })).toEqual({ ok: true });
    const sent = JSON.parse(String(calls[0].init.body));
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer re_key");
    expect(sent).toMatchObject({ to: ["a@b.test"], reply_to: "hello@yourquarter.co.uk", headers: { "List-Unsubscribe": "<https://x/u>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
    const bad = new ResendMailer("k", "f", undefined, (async () => new Response("a@b.test is invalid", { status: 422 })) as unknown as typeof fetch);
    const r = await bad.send({ to: "a@b.test", subject: "S", text: "T", html: "T" });
    expect(r).toEqual({ ok: false, error: "Resend answered 422" });
  });
  it("uses a fake that sends nothing when there is no key", () => {
    expect(mailerFromEnv({}).live).toBe(false);
    expect(mailerFromEnv({ RESEND_API_KEY: "re_x" }).live).toBe(true);
  });
});

describe("the weekly job and the parent's choice", () => {
  let db: Db, auth: FakeAuth, deps: AccountDeps, mailer: FakeMailer;
  beforeAll(async () => { db = await connectMemory(); await migrate(db); });
  beforeEach(async () => {
    await db.execute("TRUNCATE parents CASCADE" as never);
    auth = new FakeAuth(); mailer = new FakeMailer();
    deps = { repo: makeRepo(db), auth, limiter: new WriteLimiter(1000) };
  });
  const call = (token: string, method: string, path: string, body?: unknown) => handleAccountApi({ method, path, token, body }, deps);
  const family = async (token: string, learners: Profile[]) => {
    await call(token, "POST", "/api/account/consent", { version: TERMS_VERSION });
    for (const l of learners) expect((await call(token, "POST", "/api/learners", { profile: l })).status).toBe(201);
  };
  const run = () => runDigestJob({ repo: deps.repo, auth, mailer, appUrl: "https://app.test", serverUrl: "https://app.test", now: () => NOW });

  it("starts off, can be turned on only after agreeing to the terms, and can be turned off", async () => {
    expect((await call("fake_a", "GET", "/api/account/email-prefs")).body).toEqual({ weeklyDigest: false });
    expect((await call("fake_a", "PUT", "/api/account/email-prefs", { weeklyDigest: true })).status).toBe(403);
    await call("fake_a", "POST", "/api/account/consent", { version: TERMS_VERSION });
    expect((await call("fake_a", "PUT", "/api/account/email-prefs", { weeklyDigest: "yes" })).status).toBe(400);
    expect((await call("fake_a", "PUT", "/api/account/email-prefs", { weeklyDigest: true })).body).toEqual({ weeklyDigest: true });
    expect((await call("fake_a", "PUT", "/api/account/email-prefs", { weeklyDigest: false })).body).toEqual({ weeklyDigest: false });
    expect((await call(null as unknown as string, "GET", "/api/account/email-prefs")).status).toBe(401);
  });

  it("emails only parents who opted in, only if their child practised, and never twice in a week", async () => {
    await family("fake_on", [week("Maya", 4)]); await family("fake_off", [week("Leo", 4)]); await family("fake_quiet", [week("Zed", 0, false)]);
    await call("fake_on", "PUT", "/api/account/email-prefs", { weeklyDigest: true });
    await call("fake_quiet", "PUT", "/api/account/email-prefs", { weeklyDigest: true });
    const first = await run();
    expect(first).toEqual({ considered: 2, sent: 1, quiet: 1, noAddress: 0, failed: 0 });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({ to: "fake_on@example.test" });
    expect(mailer.sent[0].unsubscribeUrl).toMatch(/^https:\/\/app\.test\/unsubscribe\?t=/);
    expect(mailer.sent[0].text).toContain("Maya");
    expect(mailer.sent[0].text).not.toContain("Leo");
    expect((await run()).sent).toBe(0); // the job ran again the same day
    expect(mailer.sent).toHaveLength(1);
    const later = await runDigestJob({ repo: deps.repo, auth, mailer, appUrl: "https://app.test", serverUrl: "https://app.test", now: () => NOW + DIGEST_GAP_MS + 1000 });
    expect(later.considered).toBe(2); // due again a week on (nothing recent to say, so nothing sent, but it is considered)
  });

  it("tries again next time if sending failed, and skips a parent with no address", async () => {
    await family("fake_a", [week("Maya", 3)]); await call("fake_a", "PUT", "/api/account/email-prefs", { weeklyDigest: true });
    mailer.failNext = true;
    expect((await run()).failed).toBe(1);
    expect((await run()).sent).toBe(1);
    auth.emailOf = async () => null;
    await family("fake_b", [week("Leo", 3)]); await call("fake_b", "PUT", "/api/account/email-prefs", { weeklyDigest: true });
    expect((await run()).noAddress).toBe(1);
  });

  it("unsubscribes from the link in the email, and a wrong or reused link does nothing", async () => {
    await family("fake_a", [week("Maya", 3)]); await call("fake_a", "PUT", "/api/account/email-prefs", { weeklyDigest: true });
    await run();
    const token = /t=([^&\s]+)/.exec(mailer.sent[0].unsubscribeUrl!)![1];
    expect(await deps.repo.unsubscribeByToken("nope")).toBe(false);
    expect(await deps.repo.unsubscribeByToken("x".repeat(30))).toBe(false);
    expect(await deps.repo.unsubscribeByToken(decodeURIComponent(token))).toBe(true);
    expect((await call("fake_a", "GET", "/api/account/email-prefs")).body).toEqual({ weeklyDigest: false });
    expect(unsubscribeUrl("https://a.test/", "t k")).toBe("https://a.test/unsubscribe?t=t%20k");
  });
});
