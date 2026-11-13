import { timingSafeEqual } from "node:crypto";
import type { Repo } from "./db/repo";

/**
 * RevenueCat tells us when someone buys, renews, cancels or lets lapse an App Store subscription, by a webhook we set up in RevenueCat's
 * dashboard (Project settings, Integrations, Webhooks) with an Authorization header value of our choosing (REVENUECAT_WEBHOOK_AUTH).
 * We trust nothing in the body beyond what that secret protects, and we only ever read these fields. The app tells RevenueCat who the buyer is
 * by setting its "app user id" to the parent's sign-in id (see docs/MOBILE.md), so the purchase lands on the right account and the web and
 * the app agree. Access is the later of the Stripe subscription and this one (Repo.effectiveSubscription).
 */
export interface RcResult { status: number; body: Record<string, unknown> }
const ok = (body: Record<string, unknown> = {}): RcResult => ({ status: 200, body: { ok: true, ...body } });

const GRANT = new Set(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE", "NON_RENEWING_PURCHASE", "SUBSCRIPTION_EXTENDED", "TEMPORARY_ENTITLEMENT_GRANT"]);
const END = new Set(["EXPIRATION"]);
const ID = /^[A-Za-z]{2,10}_[A-Za-z0-9_]{1,64}$/;      // a sign-in id such as user_2abc...; anonymous RevenueCat ids ($RCAnonymousID:...) are ignored

export function sameSecret(given: string | undefined, secret: string): boolean {
  if (!given || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

export async function handleRevenueCat(rawBody: string, authHeader: string | undefined, secret: string, repo: Repo, now = Date.now()): Promise<RcResult> {
  if (secret.length < 24 || !sameSecret(authHeader?.replace(/^Bearer\s+/i, ""), secret)) return { status: 404, body: { error: "not-found" } };
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return { status: 400, body: { error: "invalid" } }; }
  const e = (payload as { event?: Record<string, unknown> } | null)?.event;
  if (!e || typeof e !== "object") return { status: 400, body: { error: "invalid" } };
  const id = typeof e.id === "string" ? e.id.slice(0, 120) : "", type = typeof e.type === "string" ? e.type : "", user = typeof e.app_user_id === "string" ? e.app_user_id : "";
  if (!id || !type) return { status: 400, body: { error: "invalid" } };
  if (!ID.test(user)) return ok({ ignored: "anonymous-user" });
  const expiresMs = typeof e.expiration_at_ms === "number" && Number.isFinite(e.expiration_at_ms) ? e.expiration_at_ms : null;
  const product = typeof e.product_id === "string" ? e.product_id.slice(0, 100) : null, store = typeof e.store === "string" ? e.store.slice(0, 30) : null;
  const inTrial = e.period_type === "TRIAL";
  if (GRANT.has(type)) {
    if (!expiresMs) return ok({ ignored: "no-expiry" });
    return ok({ result: await repo.applyEntitlement(id, user, { product, store, expiresAt: new Date(expiresMs), willRenew: true, inTrial }) });
  }
  if (type === "CANCELLATION") {                                  // switched off auto-renew: access runs on to the end of the paid period
    return ok({ result: await repo.applyEntitlement(id, user, { product, store, expiresAt: expiresMs ? new Date(expiresMs) : null, willRenew: false, inTrial }) });
  }
  if (END.has(type)) return ok({ result: await repo.applyEntitlement(id, user, { product, store, expiresAt: new Date(Math.min(expiresMs ?? now, now)), willRenew: false, inTrial: false }) });
  return ok({ ignored: type });                                   // billing issues, transfers, tests and the rest change nothing
}
