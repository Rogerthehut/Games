/**
 * A parent ticks "I agree to the terms and privacy notice" before the sign-up form opens. Signing up can leave the page
 * (Google, Apple, a link in an email), so the tick is remembered briefly and recorded on the account when they arrive back signed in.
 */
const KEY = "quarter.agree.v1";
const MAX_AGE_MS = 3_600_000;

export function rememberAgreement(version: string, now = Date.now()) {
  try { localStorage.setItem(KEY, JSON.stringify({ version, at: now })); } catch { /* the consent screen will ask instead */ }
}
export function forgetAgreement() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to remove */ }
}
/** True if the parent ticked the box for this version of the terms, recently, on this device. */
export function hasAgreed(version: string, now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as { version?: unknown; at?: unknown };
    return v.version === version && typeof v.at === "number" && now - v.at >= 0 && now - v.at < MAX_AGE_MS;
  } catch { return false; }
}
