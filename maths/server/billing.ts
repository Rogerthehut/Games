import Stripe from "stripe";
import type { Repo } from "./db/repo";
import type { Subscription } from "./db/schema";

export type Plan = "monthly" | "yearly";
export interface PriceInfo { amount: number; currency: string; interval: string }
export interface SubscriptionFacts { id: string | null; status: string; plan: Plan | null; trialEnd: Date | null; periodEnd: Date | null; cancelAtPeriodEnd: boolean }
export interface BillingEvent { id: string; customerId: string; subscription: SubscriptionFacts }

/** Everything the API needs from a payment provider. Stripe in production, a fake for development and tests. */
export interface Gateway {
  readonly fake: boolean;
  readonly trialDays: number;
  prices(): Promise<Record<Plan, PriceInfo | null>>;
  createCustomer(parentId: string): Promise<string>;
  checkoutUrl(o: { customerId: string; parentId: string; plan: Plan; trial: boolean; appUrl: string }): Promise<string>;
  portalUrl(customerId: string, appUrl: string): Promise<string>;
  /** Check the signature and read the event. Throws if the signature is wrong. Returns null for events we do not use. */
  parseWebhook(raw: Buffer, signature: string | undefined): BillingEvent | null;
  /** Delete the customer, which also cancels any subscription. */
  deleteCustomer(customerId: string): Promise<void>;
  /** The fake gateway only: pretend checkout finished. */
  completeFakeCheckout?(customerId: string, plan: Plan, trial: boolean): BillingEvent;
}

/** Paid, in a free trial, or a payment that Stripe is still retrying. */
export const HAS_ACCESS = new Set(["active", "trialing", "past_due"]);
export const hasAccess = (sub: Pick<Subscription, "status"> | null) => !!sub && HAS_ACCESS.has(sub.status);

export interface BillingSummary {
  enabled: boolean; access: boolean; status: string; plan: Plan | null; trialEnd: string | null; periodEnd: string | null;
  cancelAtPeriodEnd: boolean; trialDays: number; prices: Record<Plan, PriceInfo | null> | null; trialAvailable: boolean;
}
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export async function summarise(gateway: Gateway | undefined, sub: Subscription | null): Promise<BillingSummary> {
  if (!gateway) return { enabled: false, access: true, status: "off", plan: null, trialEnd: null, periodEnd: null, cancelAtPeriodEnd: false, trialDays: 0, prices: null, trialAvailable: false };
  return {
    enabled: true, access: hasAccess(sub), status: sub?.status ?? "none", plan: (sub?.plan as Plan | null) ?? null, trialEnd: iso(sub?.trialEnd),
    periodEnd: iso(sub?.currentPeriodEnd), cancelAtPeriodEnd: !!sub?.cancelAtPeriodEnd, trialDays: gateway.trialDays,
    prices: await gateway.prices(), trialAvailable: !sub?.everSubscribed && gateway.trialDays > 0,
  };
}

/** Record what a webhook says, once. */
export async function applyEvent(repo: Repo, ev: BillingEvent): Promise<"applied" | "duplicate" | "unknown-customer"> {
  if (!(await repo.firstSight(ev.id))) return "duplicate";
  return (await repo.applySubscription(ev.customerId, ev.subscription)) ? "applied" : "unknown-customer";
}

// ---- Stripe ----

export interface StripeConfig { secretKey: string; webhookSecret: string; priceMonthly: string; priceYearly: string; trialDays: number }
export function stripeConfig(env: NodeJS.ProcessEnv): StripeConfig | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  const days = Number(env.TRIAL_DAYS ?? 7);
  return {
    secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? "", priceMonthly: env.STRIPE_PRICE_MONTHLY ?? "", priceYearly: env.STRIPE_PRICE_YEARLY ?? "",
    trialDays: Number.isFinite(days) && days >= 0 && days <= 90 ? Math.floor(days) : 7,
  };
}

const seconds = (n: number | null | undefined) => (typeof n === "number" ? new Date(n * 1000) : null);

export class StripeGateway implements Gateway {
  readonly fake = false;
  readonly trialDays: number;
  private stripe: Stripe;
  private priceCache: { at: number; value: Record<Plan, PriceInfo | null> } | null = null;
  constructor(private cfg: StripeConfig, stripe?: Stripe) { this.stripe = stripe ?? new Stripe(cfg.secretKey); this.trialDays = cfg.trialDays; }

  private priceId(plan: Plan) { return plan === "yearly" ? this.cfg.priceYearly : this.cfg.priceMonthly; }
  private planOf(priceId: string | undefined): Plan | null { return priceId && priceId === this.cfg.priceYearly ? "yearly" : priceId && priceId === this.cfg.priceMonthly ? "monthly" : null; }

  async prices() {
    if (this.priceCache && Date.now() - this.priceCache.at < 600_000) return this.priceCache.value;
    const one = async (id: string): Promise<PriceInfo | null> => {
      if (!id) return null;
      try { const p = await this.stripe.prices.retrieve(id); return p.unit_amount == null ? null : { amount: p.unit_amount, currency: p.currency, interval: p.recurring?.interval ?? "month" }; }
      catch { return null; }
    };
    const value = { monthly: await one(this.cfg.priceMonthly), yearly: await one(this.cfg.priceYearly) };
    if (value.monthly || value.yearly) this.priceCache = { at: Date.now(), value };
    return value;
  }

  async createCustomer(parentId: string) { return (await this.stripe.customers.create({ metadata: { parent_id: parentId } })).id; }

  async checkoutUrl(o: { customerId: string; parentId: string; plan: Plan; trial: boolean; appUrl: string }) {
    const price = this.priceId(o.plan);
    if (!price) throw new Error("not-configured");
    const info = (await this.prices())[o.plan];
    const cost = info ? `${new Intl.NumberFormat("en-GB", { style: "currency", currency: info.currency.toUpperCase() }).format(info.amount / 100)} a ${info.interval}` : "the price shown";
    const trial = o.trial && this.trialDays > 0;
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription", customer: o.customerId, client_reference_id: o.parentId, locale: "en-GB",
      line_items: [{ price, quantity: 1 }], payment_method_collection: "always", allow_promotion_codes: true,
      subscription_data: { ...(trial ? { trial_period_days: this.trialDays } : {}), metadata: { parent_id: o.parentId } },
      custom_text: { submit: { message: `${trial ? `Your ${this.trialDays}-day free trial starts now and you won't be charged until it ends. Then ` : ""}${trial ? "y" : "Y"}ou pay ${cost}. Cancel any time before the trial ends in the Parents' area, under Subscription.` } },
      success_url: `${o.appUrl}/?checkout=success`, cancel_url: `${o.appUrl}/?checkout=cancelled`,
    });
    if (!session.url) throw new Error("no-url");
    return session.url;
  }

  async portalUrl(customerId: string, appUrl: string) { return (await this.stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl}/` })).url; }

  parseWebhook(raw: Buffer, signature: string | undefined): BillingEvent | null {
    if (!this.cfg.webhookSecret || !signature) throw new Error("unsigned");
    const ev = this.stripe.webhooks.constructEvent(raw, signature, this.cfg.webhookSecret);
    if (ev.type !== "customer.subscription.created" && ev.type !== "customer.subscription.updated" && ev.type !== "customer.subscription.deleted") return null;
    const s = ev.data.object as Stripe.Subscription;
    const item = s.items?.data?.[0];
    const periodEnd = (item as unknown as { current_period_end?: number })?.current_period_end ?? (s as unknown as { current_period_end?: number }).current_period_end;
    return {
      id: ev.id, customerId: typeof s.customer === "string" ? s.customer : s.customer.id,
      subscription: { id: s.id, status: ev.type === "customer.subscription.deleted" ? "canceled" : s.status, plan: this.planOf(item?.price?.id), trialEnd: seconds(s.trial_end), periodEnd: seconds(periodEnd), cancelAtPeriodEnd: s.cancel_at_period_end || s.cancel_at != null },
    };
  }

  async deleteCustomer(customerId: string) { await this.stripe.customers.del(customerId); }
}

// ---- Fake, for development and tests ----

export class FakeGateway implements Gateway {
  readonly fake = true;
  constructor(readonly trialDays = 7) {}
  async prices() { return { monthly: { amount: 499, currency: "gbp", interval: "month" }, yearly: { amount: 4900, currency: "gbp", interval: "year" } }; }
  async createCustomer(parentId: string) { return `cus_fake_${parentId}`; }
  async checkoutUrl(o: { appUrl: string }) { return `${o.appUrl}/?checkout=success`; }
  async portalUrl(_: string, appUrl: string) { return `${appUrl}/?portal=fake`; }
  parseWebhook(): BillingEvent | null { throw new Error("unsigned"); }
  async deleteCustomer() {}
  private n = 0;
  completeFakeCheckout(customerId: string, plan: Plan, trial: boolean): BillingEvent {
    const day = 86_400_000;
    return { id: `evt_fake_${++this.n}_${Date.now()}`, customerId, subscription: { id: `sub_fake_${customerId}`, status: trial && this.trialDays > 0 ? "trialing" : "active", plan,
      trialEnd: trial && this.trialDays > 0 ? new Date(Date.now() + this.trialDays * day) : null, periodEnd: new Date(Date.now() + (plan === "yearly" ? 365 : 30) * day), cancelAtPeriodEnd: false } };
  }
}
