/**
 * Which addresses the app's web view may open itself, which go to the phone's browser sheet, and which are refused.
 * The site, and the few services its sign-in and human check need, stay in the app; every other web address opens in a
 * browser sheet over the app; mail and phone links go to the phone; anything else (such as a link that tries to open another app) is refused.
 */
export type Decision = "allow" | "browser" | "external" | "block";

/** Services the page itself needs, in the app, to sign in and to prove a visitor is a person. */
const SERVICE_SUFFIXES = [".clerk.accounts.dev", ".clerk.com", ".clerk.services", "challenges.cloudflare.com", "appleid.apple.com", "idmsa.apple.com"];

export function decideNavigation(url: string, appHost: string, opts: { isTopFrame?: boolean } = {}): Decision {
  let u: URL;
  try { u = new URL(url); } catch { return "block"; }
  // pages inside the page (the sign-in form, the human check) load as frames: let them
  if (opts.isTopFrame === false) return u.protocol === "https:" || u.protocol === "about:" || u.protocol === "data:" ? "allow" : "block";
  if (u.protocol === "about:") return u.href === "about:blank" ? "allow" : "block";
  if (u.protocol === "mailto:" || u.protocol === "tel:" || u.protocol === "sms:") return "external";
  if (u.protocol !== "https:" && !(u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1") && appHost === u.hostname)) return "block";
  const host = u.hostname.toLowerCase(), app = appHost.toLowerCase();
  if (host === app || host === `www.${app}` || `www.${host}` === app) return "allow";
  if (SERVICE_SUFFIXES.some((s) => (s.startsWith(".") ? host.endsWith(s) : host === s || host.endsWith(`.${s}`)))) return "allow";
  return "browser";
}

/** True for an address on the app's own site (used to trust messages from the page). */
export function isAppUrl(url: string, appHost: string): boolean {
  try { const u = new URL(url); return u.protocol === "https:" || u.hostname === "localhost" ? u.hostname === appHost || u.hostname === `www.${appHost}` : false; } catch { return false; }
}
