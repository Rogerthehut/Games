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

/** Paths on the site that stay out of the app when a link to them is tapped: the team's page, the API and the unsubscribe page. */
const NOT_IN_APP = /^\/(ops|api|unsubscribe|\.well-known)(\/|$)/i;

/**
 * The address to show when the app is opened from a link to the site, or null if the link isn't one the app should open: another site, a path in
 * NOT_IN_APP, or a link with a user name or password in it. Only the path, query and hash are kept, on the app's own address.
 */
export function deepLink(link: string, appUrl: string, appHost: string): string | null {
  let u: URL;
  try { u = new URL(link); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (host !== appHost.toLowerCase() && host !== `www.${appHost.toLowerCase()}`) return null;
  if (NOT_IN_APP.test(u.pathname)) return null;
  return `${appUrl.replace(/\/$/, "")}${u.pathname}${u.search}${u.hash}`;
}
