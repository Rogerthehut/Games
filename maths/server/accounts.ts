import { cleanEvents } from "./question-stats";
import { MemoryCounters, type Counters } from "./counters";
import { TERMS_VERSION } from "../src/legal/terms-version";
import type { AuthProvider } from "./auth";
import { MAX_PROFILE_BYTES } from "./db/profile-check";
import type { Repo } from "./db/repo";
import { handleAssistant, type AssistantDeps } from "./assistant/handler";
import { applyEvent, hasAccess, summarise, type Gateway, type Plan } from "./billing";

export interface ApiRequest { method: string; path: string; token: string | null; body?: unknown; origin?: string; humanPass?: string; /** the caller's address, for the per-address limit (see WriteLimiter.allowAddress) */ ip?: string }
export interface ApiResponse { status: number; body: unknown; headers?: Record<string, string>; /** send this file from server/assets instead of a JSON body */ file?: { name: string; type: string; downloadAs: string } }
export interface AccountDeps { repo: Repo; auth: AuthProvider; limiter?: WriteLimiter; billing?: Gateway; appUrl?: string; assistant?: AssistantDeps; humanPassOk?: (pass: string | undefined) => boolean }

/** How many requests each kind of caller gets. Generous for real use (a family, or a whole school behind one address), tight for a script. */
export interface AccountLimits { readsPerHour: number; perAddressHour: number; bookletPerDay: number }
export const DEFAULT_ACCOUNT_LIMITS: AccountLimits = { readsPerHour: 1500, perAddressHour: 6000, bookletPerDay: 8 };

/**
 * Caps on the account API, so a stuck or hostile client cannot flood the database or scrape it: how often one parent can write, how
 * often one parent can read, how many requests one address can make in total (signed in or not), and how often the booklet can be
 * downloaded. Counts live in the shared counters (see counters.ts), keyed so no address or account id is stored in the clear.
 */
export class WriteLimiter {
  constructor(private perHour = 900, private now: () => number = Date.now, private counters: Counters = new MemoryCounters(), private limits: AccountLimits = DEFAULT_ACCOUNT_LIMITS) {}
  /** Counts a change by this parent and says whether it is within the hourly limit. */
  async allow(key: string): Promise<boolean> {
    return (await this.counters.hit(`w:${key}`, 3_600_000, this.now())) <= this.perHour;
  }
  /** Counts a read by this parent. */
  async allowRead(key: string): Promise<boolean> {
    return (await this.counters.hit(`r:${key}`, 3_600_000, this.now())) <= this.limits.readsPerHour;
  }
  /** Counts a request from this address, whoever it says it is. */
  async allowAddress(ip: string): Promise<boolean> {
    return (await this.counters.hit(`a:${ip}`, 3_600_000, this.now())) <= this.limits.perAddressHour;
  }
  /** Counts a booklet download by this parent (a day's worth). */
  async allowBooklet(key: string): Promise<boolean> {
    return (await this.counters.hit(`b:${key}`, 86_400_000, this.now())) <= this.limits.bookletPerDay;
  }
}
const SLOW_DOWN = (message: string) => reply(429, { error: "slow-down", message }, { "Retry-After": "60", "Cache-Control": "no-store" });

export const FEEDBACK_CATEGORIES = ["bug", "idea", "question", "other"] as const;
export const FEEDBACK_MAX = 2000;
const FEEDBACK_PER_DAY = 5;
/** Checks a feedback message from the browser. Anything unexpected is dropped rather than stored. */
export function cleanFeedback(b: Record<string, unknown>) {
  const category = typeof b.category === "string" && (FEEDBACK_CATEGORIES as readonly string[]).includes(b.category) ? b.category : null;
  const message = typeof b.message === "string" ? b.message.trim().slice(0, FEEDBACK_MAX) : "";
  if (!category || !message) return null;
  const rating = typeof b.rating === "number" && Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5 ? b.rating : null;
  const context = typeof b.context === "string" && b.context.trim() ? b.context.trim().slice(0, 120) : null;
  return { category, rating, message, mayReply: b.mayReply === true, context };
}

export const MAX_BODY = MAX_PROFILE_BYTES + 20_000;
const reply = (status: number, body: unknown, headers?: Record<string, string>): ApiResponse => ({ status, body, headers });
const err = (status: number, code: string, message: string) => reply(status, { error: code, message });
const LEARNER = /^\/api\/learners\/([^/]+)$/;
export const isAccountRoute = (path: string) => path === "/api/account" || path.startsWith("/api/account/") || path.startsWith("/api/billing/") || path === "/api/assistant" || path === "/api/feedback" || path === "/api/stats/questions" || path === "/api/learners" || LEARNER.test(path);

/**
 * Parents' accounts and their learners' saved progress. Signed-in parents only; every query is scoped to the parent.
 * The tutor chat log never reaches here (the app keeps it on the device and the server drops it if sent).
 */
export async function handleAccountApi(req: ApiRequest, deps: AccountDeps): Promise<ApiResponse> {
  // one address making a flood of requests, signed in or not, is slowed before anything else happens
  if (deps.limiter && req.ip && !(await deps.limiter.allowAddress(req.ip))) return SLOW_DOWN("Too many requests from this connection. Please wait a moment.");
  const who = await deps.auth.authenticate(req.token);
  if (!who) return err(401, "signed-out", "Please sign in.");
  const parent = await deps.repo.upsertParent(who.userId);
  const consented = parent.consentVersion === TERMS_VERSION;
  const writing = req.method !== "GET";
  if (writing && deps.limiter && !(await deps.limiter.allow(parent.id))) return err(429, "slow-down", "Too many changes just now. Please wait a moment.");
  if (!writing && deps.limiter && !(await deps.limiter.allowRead(parent.id))) return SLOW_DOWN("Too many requests just now. Please wait a moment.");
  const body = (req.body ?? {}) as Record<string, unknown>;

  // the account itself
  if (req.path === "/api/account" && req.method === "GET") {
    const learners = consented ? await deps.repo.loadLearners(parent.id) : [];
    const billing = await summarise(deps.billing, await deps.repo.getSubscription(parent.id));
    return reply(200, { termsVersion: TERMS_VERSION, consented, learners, billing }, { "Cache-Control": "no-store" });
  }
  if (req.path === "/api/account/consent" && req.method === "POST") {
    if (body.version !== TERMS_VERSION) return err(400, "wrong-version", "That is not the current version of the privacy notice and terms.");
    await deps.repo.recordConsent(parent.id, TERMS_VERSION);
    return reply(200, { termsVersion: TERMS_VERSION, consented: true });
  }
  if (req.path === "/api/account/export" && req.method === "GET") {
    return reply(200, await deps.repo.exportParent(parent.id), { "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="quarter-data.json"' });
  }
  if (req.path === "/api/account" && req.method === "DELETE") {
    if (body.confirm !== "delete my account") return err(400, "not-confirmed", 'Send {"confirm":"delete my account"} to delete the account and everything saved under it.');
    const sub = await deps.repo.getSubscription(parent.id);
    if (sub && deps.billing) {
      // cancel the subscription first: if that fails we keep the account, so nobody is billed for something they deleted
      try { await deps.billing.deleteCustomer(sub.stripeCustomerId); } catch { return err(502, "billing-error", "We couldn't cancel your subscription just now, so nothing was deleted. Please try again."); }
    }
    await deps.repo.deleteParent(parent.id);
    await deps.auth.deleteUser?.(who.userId).catch(() => undefined); // our data is gone either way; the sign-in identity is removed if we can
    return reply(200, { deleted: true });
  }

  // the parents' AI assistant: signed in, agreed to the terms and, where payments are on, subscribed
  if (req.path === "/api/assistant" && req.method === "POST") {
    if (!deps.assistant) return err(503, "assistant-off", "The assistant is not available right now.");
    if (deps.humanPassOk && !deps.humanPassOk(req.humanPass)) return err(401, "human-required", "Please complete the quick check and try again.");
    if (!consented) return err(403, "consent-required", "Please agree to the privacy notice and terms first.");
    if (deps.billing && !hasAccess(await deps.repo.getSubscription(parent.id))) return err(402, "subscription-required", "A subscription is needed to use the assistant.");
    const out = await handleAssistant(req.body, parent.id, deps.assistant);
    return reply(out.status, out.body, { "Cache-Control": "no-store" });
  }

  // the curriculum booklet (PDF): signed in, agreed to the terms and, where payments are on, subscribed
  if (req.path === "/api/account/booklet" && req.method === "GET") {
    if (!consented) return err(403, "consent-required", "Please agree to the privacy notice and terms first.");
    if (deps.billing && !hasAccess(await deps.repo.getSubscription(parent.id))) return err(402, "subscription-required", "A subscription is needed to download the booklet.");
    if (deps.limiter && !(await deps.limiter.allowBooklet(parent.id))) return SLOW_DOWN("The booklet has been downloaded a few times today. Please try again tomorrow.");
    return { status: 200, body: null, file: { name: "quarter-curriculum.pdf", type: "application/pdf", downloadAs: "quarter-curriculum.pdf" } };
  }

  // feedback: any signed-in parent who has agreed to the terms (no subscription needed, so people can always tell us about a problem)
  if (req.path === "/api/feedback" && req.method === "POST") {
    if (deps.humanPassOk && !deps.humanPassOk(req.humanPass)) return err(401, "human-required", "Please complete the quick check and try again.");
    if (!consented) return err(403, "consent-required", "Please agree to the privacy notice and terms first.");
    const f = cleanFeedback(body);
    if (!f) return err(400, "invalid", "Please choose a topic and write a short message.");
    if ((await deps.repo.recentFeedbackCount(parent.id)) >= FEEDBACK_PER_DAY) return err(429, "slow-down", "Thanks, we have plenty from you today. Please try again tomorrow.");
    await deps.repo.addFeedback(parent.id, f);
    return reply(201, { saved: true });
  }

  // anonymous question statistics (docs/DATA_COLLECTION.md): the sender is only used to stop floods and is never stored
  if (req.path === "/api/stats/questions" && req.method === "POST") {
    if (!consented) return err(403, "consent-required", "Please agree to the privacy notice and terms first.");
    const events = cleanEvents(body);
    if (!events.length) return err(400, "invalid", "Nothing to record.");
    await deps.repo.recordQuestionStats(events);
    return reply(202, { recorded: events.length });
  }

  // the weekly email: a parent's own choice, off until they turn it on
  if (req.path === "/api/account/email-prefs") {
    if (req.method === "GET") return reply(200, { weeklyDigest: (await deps.repo.emailPrefsFor(parent.id)).weeklyDigest }, { "Cache-Control": "no-store" });
    if (req.method === "PUT") {
      if (!consented) return err(403, "consent-required", "Please agree to the privacy notice and terms first.");
      if (typeof body.weeklyDigest !== "boolean") return err(400, "invalid", "Choose on or off.");
      await deps.repo.setWeeklyDigest(parent.id, body.weeklyDigest);
      return reply(200, { weeklyDigest: body.weeklyDigest });
    }
  }

  // subscriptions
  if (req.path.startsWith("/api/billing/")) {
    if (!deps.billing) return err(404, "billing-off", "Payments are not turned on.");
    const appUrl = (deps.appUrl ?? req.origin ?? "").replace(/\/+$/, "");
    if (!appUrl) return err(500, "no-app-url", "The site address is not set.");
    if (req.path === "/api/billing/checkout" && req.method === "POST") {
      if (!consented) return err(403, "consent-required", "Please agree to the privacy notice and terms first.");
      const plan = body.plan as Plan;
      if (plan !== "monthly" && plan !== "yearly") return err(400, "invalid", "Choose monthly or yearly.");
      let sub = await deps.repo.getSubscription(parent.id);
      if (hasAccess(sub) && sub?.status !== "past_due") return err(409, "already-subscribed", "This account already has a subscription. Use Manage subscription.");
      try {
        if (!sub) sub = await deps.repo.setCustomer(parent.id, await deps.billing.createCustomer(parent.id));
        const trial = !sub.everSubscribed;
        if (deps.billing.fake && deps.billing.completeFakeCheckout) await applyEvent(deps.repo, deps.billing.completeFakeCheckout(sub.stripeCustomerId, plan, trial));
        return reply(200, { url: await deps.billing.checkoutUrl({ customerId: sub.stripeCustomerId, parentId: parent.id, plan, trial, appUrl }) });
      } catch (e) {
        return err(503, (e as Error).message === "not-configured" ? "not-configured" : "billing-error", "We couldn't start checkout just now. Please try again.");
      }
    }
    if (req.path === "/api/billing/portal" && req.method === "POST") {
      const sub = await deps.repo.getSubscription(parent.id);
      if (!sub) return err(404, "no-subscription", "There is no subscription to manage yet.");
      try { return reply(200, { url: await deps.billing.portalUrl(sub.stripeCustomerId, appUrl) }); }
      catch { return err(503, "billing-error", "We couldn't open the billing page just now. Please try again."); }
    }
    return err(404, "not-found", "Not found.");
  }

  // learners: nothing is saved until the parent has agreed to the current terms and, where payments are on, has a subscription
  const paid = !deps.billing || hasAccess(await deps.repo.getSubscription(parent.id));
  if (req.path === "/api/learners" && req.method === "POST") {
    if (!consented) return err(403, "consent-required", "Please agree to the privacy notice and terms first.");
    if (!paid) return err(402, "subscription-required", "A subscription is needed to add learners.");
    const out = await deps.repo.createLearner(parent.id, body.profile);
    if (!out.ok) return err(out.reason === "limit" ? 409 : 400, out.reason, out.error);
    return reply(201, { id: out.id, version: out.version });
  }
  const m = LEARNER.exec(req.path);
  if (m && req.method === "PUT") {
    if (!consented) return err(403, "consent-required", "Please agree to the privacy notice and terms first.");
    if (!paid) return err(402, "subscription-required", "A subscription is needed to save progress.");
    const base = body.baseVersion;
    if (typeof base !== "number" || !Number.isInteger(base) || base < 1) return err(400, "invalid", "baseVersion must be the version you last loaded or saved.");
    const out = await deps.repo.saveProgress(parent.id, m[1], body.profile, base);
    if (out.ok) return reply(200, { version: out.version });
    if (out.reason === "conflict") return reply(409, { error: "conflict", message: "Another device saved newer progress.", current: out.current });
    if (out.reason === "not-found") return err(404, "not-found", "No such learner.");
    return err(400, "invalid", out.error);
  }
  if (m && req.method === "DELETE") {
    return (await deps.repo.deleteLearner(parent.id, m[1])) ? reply(200, { deleted: true }) : err(404, "not-found", "No such learner.");
  }
  return err(404, "not-found", "No such route.");
}

/** Stripe's webhook. Only the signature proves it came from Stripe, so nothing is read from it before that is checked. */
export async function handleStripeWebhook(raw: Buffer, signature: string | undefined, deps: Pick<AccountDeps, "repo" | "billing">): Promise<ApiResponse> {
  if (!deps.billing) return err(404, "billing-off", "Payments are not turned on.");
  let ev;
  try { ev = deps.billing.parseWebhook(raw, signature); } catch { return err(400, "bad-signature", "Signature check failed."); }
  if (!ev) return reply(200, { received: true });
  const result = await applyEvent(deps.repo, ev);
  // an unknown customer is not an error worth retrying: it is not one of ours
  return reply(200, { received: true, result });
}
