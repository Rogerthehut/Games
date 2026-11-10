import Stripe from "stripe";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TERMS_VERSION } from "../src/legal/terms-version";
import { WriteLimiter, handleAccountApi, handleStripeWebhook, type AccountDeps } from "./accounts";
import { FakeAuth } from "./auth";
import { FakeGateway, StripeGateway, stripeConfig, type BillingEvent } from "./billing";
import { connectMemory, migrate, type Db } from "./db";
import { makeRepo } from "./db/repo";

const profile = { id: "p", name: "Maya", year: 5, skills: {}, points: 1 };
let db: Db, deps: AccountDeps, gateway: FakeGateway;
beforeAll(async () => { db = await connectMemory(); await migrate(db); });
beforeEach(async () => {
  await db.execute("TRUNCATE parents CASCADE" as never);
  await db.execute("TRUNCATE stripe_events" as never);
  gateway = new FakeGateway(7);
  deps = { repo: makeRepo(db), auth: new FakeAuth(), limiter: new WriteLimiter(1000), billing: gateway, appUrl: "https://example.test" };
});
const via = (over: object) => Object.assign(Object.create(gateway), over) as never;
const call = (token: string | null, method: string, path: string, body?: unknown) => handleAccountApi({ method, path, token, body }, deps);
const agree = (t: string) => call(t, "POST", "/api/account/consent", { version: TERMS_VERSION });
type Billing = { access: boolean; status: string; plan: string | null; trialAvailable: boolean; cancelAtPeriodEnd: boolean };
const billing = async (t: string) => ((await call(t, "GET", "/api/account")).body as { billing: Billing }).billing;

describe("the paywall", () => {
  it("shows prices and an available trial, and no access, to someone who has not subscribed", async () => {
    await agree("fake_a");
    const b = (await call("fake_a", "GET", "/api/account")).body as { billing: Billing & { prices: { monthly: { amount: number } }; trialDays: number } };
    expect(b.billing).toMatchObject({ enabled: true, access: false, status: "none", trialAvailable: true, trialDays: 7 });
    expect(b.billing.prices.monthly.amount).toBe(499);
  });

  it("will not save or add learners without a subscription, but still lets people read, download and delete", async () => {
    await agree("fake_a");
    expect((await call("fake_a", "POST", "/api/learners", { profile })).status).toBe(402);
    expect((await call("fake_a", "GET", "/api/account/export")).status).toBe(200);
    expect((await call("fake_a", "DELETE", "/api/account", { confirm: "delete my account" })).status).toBe(200);
  });

  it("opens up after checkout, with a trial the first time", async () => {
    await agree("fake_a");
    const r = await call("fake_a", "POST", "/api/billing/checkout", { plan: "yearly" });
    expect(r.status).toBe(200);
    expect((r.body as { url: string }).url).toContain("https://example.test/");
    expect(await billing("fake_a")).toMatchObject({ access: true, status: "trialing", plan: "yearly", trialAvailable: false });
    expect((await call("fake_a", "POST", "/api/learners", { profile })).status).toBe(201);
  });

  it("needs the privacy notice and terms agreed first, and a real plan", async () => {
    expect((await call("fake_a", "POST", "/api/billing/checkout", { plan: "monthly" })).status).toBe(403);
    await agree("fake_a");
    for (const plan of ["weekly", "", undefined, 5]) expect((await call("fake_a", "POST", "/api/billing/checkout", { plan })).status, String(plan)).toBe(400);
  });

  it("does not sell a second subscription to someone who already has one", async () => {
    await agree("fake_a");
    await call("fake_a", "POST", "/api/billing/checkout", { plan: "monthly" });
    expect((await call("fake_a", "POST", "/api/billing/checkout", { plan: "yearly" })).status).toBe(409);
  });

  it("keeps each account's subscription to itself", async () => {
    await agree("fake_a"); await agree("fake_b");
    await call("fake_a", "POST", "/api/billing/checkout", { plan: "monthly" });
    expect((await billing("fake_b")).access).toBe(false);
  });

  it("needs sign-in for every billing route", async () => {
    for (const p of ["/api/billing/checkout", "/api/billing/portal"]) expect((await call(null, "POST", p, { plan: "monthly" })).status).toBe(401);
  });

  it("opens the billing portal only for someone with a customer record", async () => {
    await agree("fake_a");
    expect((await call("fake_a", "POST", "/api/billing/portal")).status).toBe(404);
    await call("fake_a", "POST", "/api/billing/checkout", { plan: "monthly" });
    expect((await call("fake_a", "POST", "/api/billing/portal")).status).toBe(200);
  });

  it("closes again when the subscription ends, and does not offer a second free trial", async () => {
    await agree("fake_a");
    await call("fake_a", "POST", "/api/billing/checkout", { plan: "monthly" });
    const sub = (await deps.repo.getSubscription((await deps.repo.upsertParent("fake_a")).id))!;
    const ended: BillingEvent = { id: "evt_end", customerId: sub.stripeCustomerId, subscription: { id: sub.stripeSubscriptionId, status: "canceled", plan: "monthly", trialEnd: null, periodEnd: null, cancelAtPeriodEnd: false } };
    deps.billing = via({ parseWebhook: () => ended });
    expect((await handleStripeWebhook(Buffer.from("{}"), "sig", deps)).status).toBe(200);
    expect(await billing("fake_a")).toMatchObject({ access: false, status: "canceled", trialAvailable: false });
    expect((await call("fake_a", "POST", "/api/learners", { profile })).status).toBe(402);
  });

  it("applies a repeated webhook only once", async () => {
    await agree("fake_a");
    await call("fake_a", "POST", "/api/billing/checkout", { plan: "monthly" });
    const sub = (await deps.repo.getSubscription((await deps.repo.upsertParent("fake_a")).id))!;
    const ev = (status: string): BillingEvent => ({ id: "evt_same", customerId: sub.stripeCustomerId, subscription: { id: sub.stripeSubscriptionId, status, plan: "monthly", trialEnd: null, periodEnd: null, cancelAtPeriodEnd: false } });
    deps.billing = via({ parseWebhook: () => ev("past_due") });
    expect(((await handleStripeWebhook(Buffer.from("{}"), "s", deps)).body as { result: string }).result).toBe("applied");
    deps.billing = via({ parseWebhook: () => ev("canceled") });
    expect(((await handleStripeWebhook(Buffer.from("{}"), "s", deps)).body as { result: string }).result).toBe("duplicate");
    expect((await billing("fake_a")).status).toBe("past_due"); // the repeat did not overwrite it
    expect((await billing("fake_a")).access).toBe(true);       // a payment Stripe is still retrying keeps access
  });

  it("deletes the Stripe customer along with the account, and keeps the account if that fails", async () => {
    await agree("fake_a");
    await call("fake_a", "POST", "/api/billing/checkout", { plan: "monthly" });
    deps.billing = via({ deleteCustomer: async () => { throw new Error("stripe down"); } });
    expect((await call("fake_a", "DELETE", "/api/account", { confirm: "delete my account" })).status).toBe(502);
    expect((await call("fake_a", "GET", "/api/account")).status).toBe(200);
    deps.billing = gateway;
    expect((await call("fake_a", "DELETE", "/api/account", { confirm: "delete my account" })).status).toBe(200);
  });

  it("does not exist when payments are off", async () => {
    deps.billing = undefined;
    await agree("fake_a");
    expect((await call("fake_a", "POST", "/api/billing/checkout", { plan: "monthly" })).status).toBe(404);
    expect((await call("fake_a", "POST", "/api/learners", { profile })).status).toBe(201);
  });
});

describe("Stripe's webhook", () => {
  const secret = "whsec_test_secret";
  const cfg = stripeConfig({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: secret, STRIPE_PRICE_MONTHLY: "price_m", STRIPE_PRICE_YEARLY: "price_y" } as NodeJS.ProcessEnv)!;
  const stripe = new Stripe("sk_test_x");
  const gw = new StripeGateway(cfg, stripe);
  const payload = (type: string, extra: Record<string, unknown> = {}) => JSON.stringify({ id: "evt_1", object: "event", type, data: { object: {
    id: "sub_1", object: "subscription", customer: "cus_1", status: "trialing", trial_end: 1_800_000_000, cancel_at_period_end: false, cancel_at: null,
    items: { data: [{ price: { id: "price_y" }, current_period_end: 1_800_100_000 }] }, ...extra } } });
  const sign = (body: string) => stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  it("reads a correctly signed subscription event", () => {
    const body = payload("customer.subscription.updated");
    const ev = gw.parseWebhook(Buffer.from(body), sign(body))!;
    expect(ev).toMatchObject({ id: "evt_1", customerId: "cus_1", subscription: { id: "sub_1", status: "trialing", plan: "yearly", cancelAtPeriodEnd: false } });
    expect(ev.subscription.periodEnd?.getTime()).toBe(1_800_100_000_000);
  });
  it("treats a scheduled cancellation as cancelling at the end of the period, and a deleted subscription as cancelled", () => {
    const a = payload("customer.subscription.updated", { cancel_at_period_end: true });
    expect(gw.parseWebhook(Buffer.from(a), sign(a))!.subscription.cancelAtPeriodEnd).toBe(true);
    const d = payload("customer.subscription.deleted", { status: "active" });
    expect(gw.parseWebhook(Buffer.from(d), sign(d))!.subscription.status).toBe("canceled");
  });
  it("ignores events it does not use", () => {
    const body = payload("invoice.paid");
    expect(gw.parseWebhook(Buffer.from(body), sign(body))).toBeNull();
  });
  it("refuses anything with a missing, wrong or old signature, or the wrong body", () => {
    const body = payload("customer.subscription.updated");
    expect(() => gw.parseWebhook(Buffer.from(body), undefined)).toThrow();
    expect(() => gw.parseWebhook(Buffer.from(body), "t=1,v1=bad")).toThrow();
    expect(() => gw.parseWebhook(Buffer.from(body + " "), sign(body))).toThrow();
    const wrong = stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_other" });
    expect(() => gw.parseWebhook(Buffer.from(body), wrong)).toThrow();
  });
  it("answers 400 and changes nothing when the signature is wrong", async () => {
    await agree("fake_s");
    const body = payload("customer.subscription.updated");
    const out = await handleStripeWebhook(Buffer.from(body), "t=1,v1=bad", { repo: deps.repo, billing: gw });
    expect(out.status).toBe(400);
  });
  it("does not run without a webhook secret", () => {
    const open = new StripeGateway({ ...cfg, webhookSecret: "" }, stripe);
    const body = payload("customer.subscription.updated");
    expect(() => open.parseWebhook(Buffer.from(body), sign(body))).toThrow();
  });
});
