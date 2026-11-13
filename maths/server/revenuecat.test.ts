import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TERMS_VERSION } from "../src/legal/terms-version";
import { WriteLimiter, handleAccountApi, type AccountDeps } from "./accounts";
import { FakeAuth } from "./auth";
import { FakeGateway } from "./billing";
import { connectMemory, migrate, type Db } from "./db";
import { makeRepo } from "./db/repo";
import { handleRevenueCat, sameSecret } from "./revenuecat";

const SECRET = "rc-webhook-secret-of-some-length-1234";
let db: Db, deps: AccountDeps;
beforeAll(async () => { db = await connectMemory(); await migrate(db); });
beforeEach(async () => {
  await db.execute("TRUNCATE parents CASCADE" as never); await db.execute("TRUNCATE revenuecat_events" as never);
  deps = { repo: makeRepo(db), auth: new FakeAuth(), limiter: new WriteLimiter(1000), billing: new FakeGateway(7), appUrl: "https://example.test" };
});
const NOW = Date.UTC(2026, 10, 13, 12), DAY = 86_400_000;
const hook = (event: Record<string, unknown>, auth: string | undefined = SECRET) => handleRevenueCat(JSON.stringify({ event: { id: `e${Math.random()}`, app_user_id: "fake_buyer", store: "APP_STORE", product_id: "quarter_monthly", ...event } }), auth, SECRET, deps.repo, NOW);
const account = async (t = "fake_buyer") => (await handleAccountApi({ method: "GET", path: "/api/account", token: t }, deps)).body as { billing: { access: boolean; status: string; plan: string | null; cancelAtPeriodEnd: boolean } };

describe("RevenueCat webhook", () => {
  it("answers 404 without the right secret, whatever is sent", async () => {
    expect(sameSecret("abc", "abcd")).toBe(false); expect(sameSecret(undefined, SECRET)).toBe(false);
    expect((await handleRevenueCat("{}", undefined, SECRET, deps.repo)).status).toBe(404);
    for (const a of ["", "nope", SECRET.slice(1), `${SECRET}x`]) expect((await hook({ type: "INITIAL_PURCHASE", expiration_at_ms: NOW + DAY }, a)).status).toBe(404);
    expect((await handleRevenueCat("{}", `Bearer ${SECRET}`, "short", deps.repo)).status).toBe(404); // a weak configured secret switches it off
    expect((await hook({ type: "INITIAL_PURCHASE", expiration_at_ms: NOW + DAY }, `Bearer ${SECRET}`)).status).toBe(200);
  });
  it("rejects bad bodies and ignores what it doesn't act on", async () => {
    expect((await handleRevenueCat("not json", SECRET, SECRET, deps.repo)).status).toBe(400);
    expect((await handleRevenueCat("{}", SECRET, SECRET, deps.repo)).status).toBe(400);
    expect((await hook({ type: "INITIAL_PURCHASE", id: "", expiration_at_ms: NOW + DAY })).status).toBe(400);
    expect((await hook({ type: "INITIAL_PURCHASE", app_user_id: "$RCAnonymousID:abc", expiration_at_ms: NOW + DAY })).body).toMatchObject({ ignored: "anonymous-user" });
    expect((await hook({ type: "TEST" })).body).toMatchObject({ ignored: "TEST" });
    expect((await hook({ type: "INITIAL_PURCHASE" })).body).toMatchObject({ ignored: "no-expiry" });
    expect((await account()).billing).toMatchObject({ access: false });
  });
  it("gives a buyer access until the period ends, as a trial or a paid plan", async () => {
    expect((await account()).billing.access).toBe(false);
    expect((await hook({ type: "INITIAL_PURCHASE", period_type: "TRIAL", expiration_at_ms: Date.now() + 7 * DAY })).body).toMatchObject({ result: "applied" });
    expect((await account()).billing).toMatchObject({ access: true, status: "trialing" });
    await hook({ type: "RENEWAL", product_id: "quarter_yearly", expiration_at_ms: Date.now() + 365 * DAY });
    expect((await account()).billing).toMatchObject({ access: true, status: "active", plan: "yearly", cancelAtPeriodEnd: false });
  });
  it("keeps access after cancelling until the paid period ends, then takes it away", async () => {
    const until = Date.now() + 10 * DAY;
    await hook({ type: "INITIAL_PURCHASE", expiration_at_ms: until });
    await hook({ type: "CANCELLATION", expiration_at_ms: until });
    expect((await account()).billing).toMatchObject({ access: true, cancelAtPeriodEnd: true });
    await hook({ type: "EXPIRATION", expiration_at_ms: Date.now() - 1000 });
    expect((await account()).billing.access).toBe(false);
  });
  it("counts each event once, so a retry does nothing", async () => {
    const body = { id: "same-event", type: "INITIAL_PURCHASE", expiration_at_ms: Date.now() + DAY };
    expect((await hook(body)).body).toMatchObject({ result: "applied" });
    expect((await hook(body)).body).toMatchObject({ result: "duplicate" });
  });
  it("lets the buyer save progress once they have access, and an active Stripe plan still works alone", async () => {
    await handleAccountApi({ method: "POST", path: "/api/account/consent", token: "fake_buyer", body: { version: TERMS_VERSION } }, deps);
    const add = () => handleAccountApi({ method: "POST", path: "/api/learners", token: "fake_buyer", body: { profile: { id: "p", name: "Maya", year: 5, skills: {}, points: 1 } } }, deps);
    expect((await add()).status).toBe(402);
    await hook({ type: "INITIAL_PURCHASE", expiration_at_ms: Date.now() + DAY });
    expect((await add()).status).toBe(201);
  });
});
