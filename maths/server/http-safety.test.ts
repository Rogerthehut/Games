import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CSP, clientIp, resolveStatic, securityHeaders } from "./http-safety";

function site() {
  const root = mkdtempSync(join(tmpdir(), "quarter-safety-"));
  const dist = join(root, "dist");
  mkdirSync(join(dist, "assets"), { recursive: true }); mkdirSync(join(dist, "blog"), { recursive: true }); mkdirSync(join(dist, "empty"));
  writeFileSync(join(dist, "index.html"), "home"); writeFileSync(join(dist, "assets", "a.js"), "js"); writeFileSync(join(dist, "blog", "index.html"), "blog");
  writeFileSync(join(root, "secret.txt"), "secret");
  mkdirSync(join(root, "dist-secret")); writeFileSync(join(root, "dist-secret", "x.txt"), "x"); // a sibling whose name starts with "dist"
  return dist;
}

describe("which file a web address may serve", () => {
  const dist = site();
  it("serves real files, and a folder's index.html", () => {
    expect(resolveStatic(dist, "/")).toBe(join(dist, "index.html"));
    expect(resolveStatic(dist, "/assets/a.js")).toBe(join(dist, "assets", "a.js"));
    expect(resolveStatic(dist, "/blog")).toBe(join(dist, "blog", "index.html"));
    expect(resolveStatic(dist, "/blog/")).toBe(join(dist, "blog", "index.html"));
  });
  it("never throws for a folder without an index, or for a missing file (this used to crash the server)", () => {
    expect(resolveStatic(dist, "/assets")).toBeNull();
    expect(resolveStatic(dist, "/empty")).toBeNull();
    expect(resolveStatic(dist, "/nope.html")).toBeNull();
  });
  it("cannot be pointed outside the app folder", () => {
    for (const bad of ["/../secret.txt", "/..%2fsecret.txt", "/%2e%2e/secret.txt", "/%2e%2e%2fsecret.txt", "/assets/../../secret.txt", "/../dist-secret/x.txt", "/%00", "/assets/%00.js", "/%E0%A4%A", "//etc/passwd", "/\\..\\secret.txt"]) {
      expect(resolveStatic(dist, bad), bad).toBeNull();
    }
  });
});

describe("which address a request came from", () => {
  it("without a proxy, uses the connection, and ignores a made-up header", () => {
    expect(clientIp("6.6.6.6", "10.0.0.5", false)).toBe("10.0.0.5");
    expect(clientIp(undefined, undefined, false)).toBe("unknown");
  });
  it("behind one proxy, trusts the last entry (the one the proxy added), not the first (typed by the caller)", () => {
    expect(clientIp("6.6.6.6, 203.0.113.9", "10.0.0.5", true)).toBe("203.0.113.9");
    expect(clientIp("203.0.113.9", "10.0.0.5", true)).toBe("203.0.113.9");
  });
  it("with two proxies in front, steps back one more", () => {
    expect(clientIp("6.6.6.6, 203.0.113.9, 172.70.1.1", "10.0.0.5", true, 2)).toBe("203.0.113.9");
  });
  it("falls back to the connection when the header is missing or too short", () => {
    expect(clientIp(undefined, "10.0.0.5", true)).toBe("10.0.0.5");
    expect(clientIp("203.0.113.9", "10.0.0.5", true, 2)).toBe("10.0.0.5");
  });
});

describe("headers on every response", () => {
  const fake = () => { const h: Record<string, string> = {}; return { h, res: { setHeader: (k: string, v: string) => { h[k] = v; } } as never }; };
  it("always sends the basic protections", () => {
    const { h, res } = fake();
    securityHeaders({ headers: {} } as never, res, { trustProxy: false, enforceCsp: false, hsts: false });
    expect(h["X-Content-Type-Options"]).toBe("nosniff"); expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBeTruthy(); expect(h["Permissions-Policy"]).toContain("camera=()");
    expect(h["Strict-Transport-Security"]).toBeUndefined();
  });
  it("sends the content policy as report-only until it is switched to enforcing", () => {
    const a = fake(); securityHeaders({ headers: {} } as never, a.res, { trustProxy: false, enforceCsp: false, hsts: false });
    expect(a.h["Content-Security-Policy-Report-Only"]).toBe(CSP); expect(a.h["Content-Security-Policy"]).toBeUndefined();
    const b = fake(); securityHeaders({ headers: {} } as never, b.res, { trustProxy: false, enforceCsp: true, hsts: false });
    expect(b.h["Content-Security-Policy"]).toBe(CSP);
    expect(CSP).toContain("frame-ancestors 'none'"); expect(CSP).toContain("object-src 'none'");
  });
  it("sends HSTS only over HTTPS", () => {
    const a = fake(); securityHeaders({ headers: { "x-forwarded-proto": "https" } } as never, a.res, { trustProxy: true, enforceCsp: false, hsts: false });
    expect(a.h["Strict-Transport-Security"]).toContain("max-age=");
    const b = fake(); securityHeaders({ headers: { "x-forwarded-proto": "http" } } as never, b.res, { trustProxy: true, enforceCsp: false, hsts: false });
    expect(b.h["Strict-Transport-Security"]).toBeUndefined();
  });
});

import { looksLive } from "./http-safety";
describe("looksLive", () => {
  it("treats production, Replit deployments and real keys as live", () => {
    expect(looksLive({ NODE_ENV: "production" })).toBe(true);
    expect(looksLive({ REPLIT_DEPLOYMENT: "1" })).toBe(true);
    expect(looksLive({ CLERK_SECRET_KEY: "sk" })).toBe(true);
    expect(looksLive({ STRIPE_SECRET_KEY: "sk" })).toBe(true);
    expect(looksLive({})).toBe(false);
  });
});
