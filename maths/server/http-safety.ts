import { statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Small, testable pieces of web-server safety: where a file request may point, which address a request really came from, and the headers
 * every response carries. See docs/SECURITY.md.
 */

/** The file a URL path should serve from the built app, or null. Never leaves the folder, and a folder serves its index.html. */
export function resolveStatic(dist: string, urlPath: string): string | null {
  let path: string;
  try { path = decodeURIComponent(urlPath); } catch { return null; }
  if (path.includes("\0")) return null;
  const file = join(dist, normalize(path === "/" ? "/index.html" : path));
  if (file !== dist && !file.startsWith(dist + sep)) return null;
  try {
    const st = statSync(file);
    if (st.isFile()) return file;
    if (st.isDirectory()) { const index = join(file, "index.html"); return statSync(index).isFile() ? index : null; }
  } catch { /* not there */ }
  return null;
}

/**
 * The address a request came from. Behind one trusted proxy, the proxy adds the real address to the END of X-Forwarded-For, so we take the entry
 * `hops` from the end. The first entry is whatever the caller typed, so it is never trusted. Without a proxy, the connection's own address.
 */
export function clientIp(forwardedFor: string | string[] | undefined, socketAddress: string | undefined, trustProxy: boolean, hops = 1): string {
  if (trustProxy) {
    const list = String(Array.isArray(forwardedFor) ? forwardedFor.join(",") : forwardedFor ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const at = list.length - Math.max(1, hops);
    if (at >= 0 && list[at]) return list[at].slice(0, 64);
  }
  return socketAddress || "unknown";
}

/**
 * A Content-Security-Policy for the app: our own files, plus the sign-in (Clerk), the human check (Cloudflare Turnstile) and crash reports (Sentry).
 * Sent as Report-Only unless CSP_ENFORCE=1, so a missing source shows up in the browser console instead of breaking sign-in. Check the live site
 * with the console open, add anything it lists, then set CSP_ENFORCE=1.
 */
export const CSP = [
  "default-src 'self'",
  "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.yourquarter.co.uk",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.yourquarter.co.uk https://challenges.cloudflare.com https://*.ingest.de.sentry.io",
  "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
  "worker-src 'self' blob:",
].join("; ");

/** Headers for every response. HSTS only goes out over HTTPS (known from the proxy, or HSTS=1). */
export function securityHeaders(req: IncomingMessage, res: ServerResponse, o: { trustProxy: boolean; enforceCsp: boolean; hsts: boolean }) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups"); // keeps sign-in pop-ups working
  res.setHeader(o.enforceCsp ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", CSP);
  const https = o.hsts || (o.trustProxy && String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim() === "https");
  if (https) res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
}

/**
 * Whether this looks like a live deployment. The development-only fakes (fake sign-in, fake payments) are refused when it does, so a stray
 * AUTH_FAKE=1 or BILLING_FAKE=1 can never open the live site up even if NODE_ENV was not set. Any real secret key counts as a sign it is live.
 */
export function looksLive(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV === "production" || !!env.REPLIT_DEPLOYMENT || !!env.CLERK_SECRET_KEY || !!env.STRIPE_SECRET_KEY;
}

/**
 * Where a request for the "www." version of our own address should go: the same page on the main address (so there is one address for the site,
 * for search engines and for sign-in). Built only from APP_URL, never from what the request says, so it can't be turned into an open redirect.
 * Returns null for any other host, or when APP_URL isn't set.
 */
export function wwwRedirect(hostHeader: string | undefined, appUrl: string | undefined, path: string): string | null {
  if (!appUrl || !hostHeader) return null;
  let app: URL;
  try { app = new URL(appUrl); } catch { return null; }
  const host = hostHeader.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  if (app.protocol !== "https:" || host !== `www.${app.hostname}`) return null;
  return `${app.origin}${path.startsWith("/") ? path : `/${path}`}`;
}
