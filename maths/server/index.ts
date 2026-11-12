import { timingSafeEqual } from "node:crypto";
import { mailerFromEnv } from "./mail";
import { runDigestJob } from "./digest-job";
import { unsubscribePage } from "./unsubscribe-page";
import { OpsAccess, parseAdmins } from "./ops-access";
import { handleOpsApi, isOpsRoute } from "./ops-api";
import type { Db } from "./db";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_BODY, WriteLimiter, handleAccountApi, handleStripeWebhook, isAccountRoute, type AccountDeps } from "./accounts";
import { ClerkAuth, FakeAuth } from "./auth";
import { connect, connectMemory, migrate } from "./db";
import { AssistantLimiter } from "./assistant/policy";
import { makeOutcodeLookup, outwardCode } from "./postcode";
import { issuePass, passIsValid, turnstileConfig, verifyToken } from "./turnstile";
import { FakeGateway, StripeGateway, stripeConfig, type Gateway } from "./billing";
import { makeRepo } from "./db/repo";
import { handleTutor } from "./tutor/handler";
import { DEFAULT_LIMITS, Limiter } from "./tutor/policy";
import { AnthropicProvider, DEFAULT_CONFIG, OpenRouterProvider, ScriptedProvider, openRouterConfig, type Provider } from "./tutor/provider";

/**
 * The tutor service. It holds the API key, checks everything in both directions, rate limits, and stores nothing:
 * message text exists only for the length of one request and is never logged.
 */
const PORT = Number(process.env.PORT ?? 8787);
const ALLOWED = (process.env.TUTOR_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
const DIST = fileURLToPath(new URL("../dist", import.meta.url));

// Which model answers: TUTOR_PROVIDER=anthropic|openrouter, otherwise whichever key is set (Anthropic first).
const WHICH = (process.env.TUTOR_PROVIDER ?? (process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENROUTER_API_KEY ? "openrouter" : "anthropic")).toLowerCase();
const HAS_KEY = WHICH === "openrouter" ? !!process.env.OPENROUTER_API_KEY : !!process.env.ANTHROPIC_API_KEY;
if (!HAS_KEY && process.env.TUTOR_FAKE !== "1") console.warn(`${WHICH === "openrouter" ? "OPENROUTER_API_KEY" : "ANTHROPIC_API_KEY"} is not set: the tutor will answer 'unavailable' until it is.`);

// Accounts: parents sign in with Clerk and their learners' progress is kept in Postgres. Needs DATABASE_URL and CLERK_SECRET_KEY.
// AUTH_FAKE=1 swaps Clerk for a fake sign-in (the bearer token is the user id, e.g. fake_maya) and uses an in-memory database if there is no
// DATABASE_URL. It exists for development and is refused when NODE_ENV=production.
const AUTH_FAKE = process.env.AUTH_FAKE === "1" && process.env.NODE_ENV !== "production";
if (process.env.AUTH_FAKE === "1" && !AUTH_FAKE) console.warn("AUTH_FAKE is ignored in production.");
let accounts: AccountDeps | null = null;
let opsDb: Db | null = null;
if ((process.env.DATABASE_URL || AUTH_FAKE) && (process.env.CLERK_SECRET_KEY || AUTH_FAKE)) {
  const db = process.env.DATABASE_URL ? await connect() : await connectMemory();
  opsDb = db;
  const applied = await migrate(db);
  if (applied.length) console.log(`Database migrations applied: ${applied.join(", ")}`);
  const parties = (process.env.CLERK_AUTHORIZED_PARTIES ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  // Payments: Stripe when STRIPE_SECRET_KEY is set. BILLING_FAKE=1 pretends, for development only. With neither, there is no paywall.
  const stripeCfg = stripeConfig(process.env);
  let billing: Gateway | undefined;
  if (stripeCfg) {
    billing = new StripeGateway(stripeCfg);
    for (const [name, ok] of [["STRIPE_WEBHOOK_SECRET", stripeCfg.webhookSecret], ["STRIPE_PRICE_MONTHLY", stripeCfg.priceMonthly], ["STRIPE_PRICE_YEARLY", stripeCfg.priceYearly]] as const) if (!ok) console.warn(`${name} is not set: payments will not work properly until it is.`);
  } else if (process.env.BILLING_FAKE === "1" && process.env.NODE_ENV !== "production") billing = new FakeGateway(Number(process.env.TRIAL_DAYS ?? 7));
  if (!billing) console.warn("Payments are off: set STRIPE_SECRET_KEY (and the price ids) to turn on the paywall.");
  accounts = { repo: makeRepo(db), auth: AUTH_FAKE ? new FakeAuth() : new ClerkAuth(process.env.CLERK_SECRET_KEY!, parties), limiter: new WriteLimiter(), billing, appUrl: process.env.APP_URL };
} else {
  console.warn("Accounts are off: set DATABASE_URL and CLERK_SECRET_KEY to turn them on.");
}

// Email: Resend when RESEND_API_KEY is set, otherwise nothing is sent. The weekly email job is run by a scheduler calling /api/internal/digest.
const mailer = mailerFromEnv();
if (accounts && !mailer.live) console.warn("Email is off: set RESEND_API_KEY (and MAIL_FROM) to turn on the weekly parent email. See docs/EMAIL.md.");

// The team's ops page (/ops). Needs the allow-list, a secret to sign sessions with, and working email for the sign-in code.
const opsAdmins = parseAdmins(process.env.OPS_ADMINS);
const opsSecret = process.env.OPS_SESSION_SECRET ?? "";
// in development with the fake sign-in nothing is really sent, so the subject (which holds the code) is printed to the server log
const opsMailer: typeof mailer = AUTH_FAKE && !mailer.live ? { live: false, send: (e) => { console.log(`[dev email to ${e.to}] ${e.subject}`); return mailer.send(e); } } : mailer;
const opsAccess = accounts && opsDb && opsAdmins.size && opsSecret.length >= 24 && (mailer.live || AUTH_FAKE) ? new OpsAccess({ auth: accounts.auth, mailer: opsMailer, admins: opsAdmins, secret: opsSecret }) : null;
if (accounts && !opsAccess) console.warn("The ops page is off: set OPS_ADMINS, OPS_SESSION_SECRET (24+ characters) and RESEND_API_KEY to turn it on. See docs/OPS.md.");

const limiter = new Limiter({
  perDeviceDay: Number(process.env.TUTOR_PER_DEVICE_DAY ?? DEFAULT_LIMITS.perDeviceDay),
  perDeviceHour: Number(process.env.TUTOR_PER_DEVICE_HOUR ?? DEFAULT_LIMITS.perDeviceHour),
  perIpDay: Number(process.env.TUTOR_PER_IP_DAY ?? DEFAULT_LIMITS.perIpDay),
  globalDay: Number(process.env.TUTOR_GLOBAL_DAY ?? DEFAULT_LIMITS.globalDay),
});
// TUTOR_FAKE=1 answers from a script, so the app can be developed and tested without a key or any spend.
const FAKE = process.env.TUTOR_FAKE === "1";
const provider: Provider = FAKE
  ? new ScriptedProvider((req) => ({
      text: /answer please|tell me the answer/i.test(req.messages.at(-1)?.content ?? "")
        ? "Sure! The answer is 9." // a deliberately bad reply, to show the safety check catching it
        : "Good thinking. What is the very first thing you could do to this question? Try it and tell me what you get.",
      refused: false,
    }))
  : WHICH === "openrouter" ? new OpenRouterProvider(openRouterConfig()) : new AnthropicProvider(DEFAULT_CONFIG);

// The parents' assistant uses the same model service as the tutor, with its own, separate limits.
if (accounts) accounts.assistant = { provider, limiter: new AssistantLimiter(Number(process.env.ASSISTANT_PER_PARENT_DAY ?? 40), Number(process.env.ASSISTANT_PER_PARENT_HOUR ?? 20), Number(process.env.ASSISTANT_GLOBAL_DAY ?? 3000)), log: (e) => console.log(JSON.stringify({ t: new Date().toISOString(), assistant: true, ...e })) };

// Cloudflare Turnstile: when TURNSTILE_SECRET_KEY is set, the AI endpoints need a pass from a solved check. Off otherwise.
const turnstile = turnstileConfig(process.env);
if (!turnstile) console.warn("Turnstile is off: set TURNSTILE_SECRET_KEY (and VITE_TURNSTILE_SITE_KEY when building) to require the human check on the AI endpoints.");
const humanOk = (pass: string | undefined) => !turnstile || passIsValid(turnstile, pass);
if (accounts) accounts.humanPassOk = humanOk;
const verifyHits = new Map<string, number[]>();

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webmanifest": "application/manifest+json", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".webp": "image/webp" };

function cors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
}

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

function readBody(req: IncomingMessage, max = 16_384): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { size += c.length; if (size > max) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { const text = Buffer.concat(chunks).toString("utf8"); resolve(text.trim() ? JSON.parse(text) : {}); } catch { reject(new Error("bad json")); } });
    req.on("error", reject);
  });
}

const postcodeHits = new Map<string, number[]>();
const outcodeLookup = makeOutcodeLookup();

createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url ?? "/", "http://x");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  if (url.pathname === "/api/health") return send(res, 200, { ok: true, tutor: FAKE || HAS_KEY, provider: FAKE ? "fake" : WHICH, accounts: !!accounts, human: !!turnstile });

  if (url.pathname === "/api/humans/verify" && req.method === "POST") {
    if (!turnstile) return send(res, 200, { pass: "", expiresInSeconds: 0, off: true });
    const ip = (TRUST_PROXY ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "") || req.socket.remoteAddress || "unknown";
    const recent = (verifyHits.get(ip) ?? []).filter((t) => Date.now() - t < 3_600_000);
    if (recent.length >= 40) return send(res, 429, { error: "slow-down" });
    verifyHits.set(ip, [...recent, Date.now()]);
    let body: unknown;
    try { body = await readBody(req, 4096); } catch { return send(res, 400, { error: "bad-request" }); }
    const token = typeof (body as { token?: unknown })?.token === "string" ? (body as { token: string }).token : "";
    if (!(await verifyToken(turnstile.secret, token, ip))) return send(res, 403, { error: "check-failed" });
    return send(res, 200, issuePass(turnstile));
  }

  // 11+ finder: which council areas does the start of a postcode (such as BR1) cover? Only that outward code is ever sent here.
  if (url.pathname === "/api/outcode" && req.method === "GET") {
    const ip = (TRUST_PROXY ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "") || req.socket.remoteAddress || "unknown";
    const recent = (postcodeHits.get(ip) ?? []).filter((t) => Date.now() - t < 3_600_000);
    if (recent.length >= 60) return send(res, 429, { error: "slow-down" });
    postcodeHits.set(ip, [...recent, Date.now()]);
    const code = outwardCode(url.searchParams.get("code") ?? "");
    if (!code) return send(res, 400, { error: "not-a-postcode" });
    const found = await outcodeLookup(code);
    if (!found) return send(res, 503, { error: "lookup-unavailable" });
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" });
    return res.end(JSON.stringify(found));
  }

  // The weekly email. A scheduler calls this with the shared secret; nobody else can.
  if (url.pathname === "/api/internal/digest" && req.method === "POST") {
    const secret = process.env.CRON_SECRET;
    const given = String(req.headers["x-cron-secret"] ?? "");
    if (!accounts || !secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return send(res, 404, { error: "not-found" });
    const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "");
    const serverUrl = process.env.SERVER_URL || process.env.APP_URL || (host ? `${TRUST_PROXY ? "https" : "http"}://${host}` : "");
    const out = await runDigestJob({ repo: accounts.repo, auth: accounts.auth, mailer, appUrl: process.env.APP_URL || serverUrl, serverUrl });
    return send(res, 200, { ...out, live: mailer.live });
  }

  // Unsubscribing from the weekly email, from the link in it. A GET only shows a button (mail scanners open links); the POST does it.
  if (url.pathname === "/unsubscribe" && (req.method === "GET" || req.method === "POST")) {
    const token = url.searchParams.get("t") ?? "";
    const html = (title: string, body: string) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }); res.end(unsubscribePage(title, body)); };
    if (!accounts) return html("Not available", "<p>This isn't available just now.</p>");
    if (req.method === "POST") {
      req.resume();
      const done = await accounts.repo.unsubscribeByToken(token);
      return html(done ? "You're unsubscribed" : "That link isn't valid", done ? "<p>You won't get the weekly email any more. You can turn it back on any time in the Parents' area.</p>" : "<p>That unsubscribe link isn't valid or has already been used.</p>");
    }
    return html("Unsubscribe from the weekly email", `<p>Stop the weekly quarter progress email?</p><form method="post" action="/unsubscribe?t=${encodeURIComponent(token)}"><button type="submit">Unsubscribe</button></form>`);
  }

  // The team's ops page: the page itself is the app's shell (noindex); the API checks sign-in, allow-list and emailed code.
  if (isOpsRoute(url.pathname)) {
    if (!accounts || !opsDb || !opsAccess) return send(res, 404, { error: "not-found" });
    try {
      let body: unknown;
      if (req.method === "POST") { try { body = await readBody(req, 8192); } catch { return send(res, 400, { error: "bad-request" }); } }
      const token = /^Bearer (.+)$/i.exec(String(req.headers.authorization ?? ""))?.[1] ?? null;
      const out = await handleOpsApi({ method: req.method ?? "GET", path: url.pathname, query: url.searchParams, token, session: String(req.headers["x-ops-session"] ?? "") || undefined, body }, { db: opsDb, auth: accounts.auth, mailer: opsMailer, access: opsAccess });
      return send(res, out.status, out.body);
    } catch (e) { console.error("ops route failed:", (e as Error).name); return send(res, 500, { error: "server-error" }); }
  }

  if (url.pathname === "/ops" && (req.method === "GET" || req.method === "HEAD") && existsSync(join(DIST, "index.html"))) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
    return res.end(req.method === "HEAD" ? undefined : readFileSync(join(DIST, "index.html")));
  }

  if (url.pathname === "/api/stripe/webhook" && req.method === "POST") {
    if (!accounts?.billing) return send(res, 404, { error: "billing-off" });
    const chunks: Buffer[] = []; let size = 0;
    try {
      for await (const c of req as AsyncIterable<Buffer>) { size += c.length; if (size > 1_000_000) throw new Error("too large"); chunks.push(c); }
    } catch { return send(res, 413, { error: "too-large" }); }
    try {
      const out = await handleStripeWebhook(Buffer.concat(chunks), String(req.headers["stripe-signature"] ?? "") || undefined, accounts);
      return send(res, out.status, out.body);
    } catch (e) { console.error("stripe webhook failed:", (e as Error).name); return send(res, 500, { error: "server-error" }); }
  }

  if (isAccountRoute(url.pathname)) {
    if (!accounts) return send(res, 503, { error: "accounts-off", message: "Accounts are not set up on this server." });
    try {
      const token = /^Bearer (.+)$/i.exec(String(req.headers.authorization ?? ""))?.[1] ?? null;
      let body: unknown;
      if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
        try { body = await readBody(req, MAX_BODY); } catch { return send(res, 400, { error: "bad-request", message: "That request could not be read." }); }
      }
      const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "");
      const proto = TRUST_PROXY ? String(req.headers["x-forwarded-proto"] ?? "https").split(",")[0] : "http";
      const out = await handleAccountApi({ method: req.method ?? "GET", path: url.pathname, token, body, humanPass: String(req.headers["x-human-pass"] ?? "") || undefined, origin: host ? `${proto}://${host}` : undefined }, accounts);
      if (out.file) {
        try {
          const data = await readFile(new URL(`./assets/${out.file.name}`, import.meta.url));
          res.writeHead(200, { "Content-Type": out.file.type, "Content-Length": data.length, "Content-Disposition": `attachment; filename="${out.file.downloadAs}"`, "Cache-Control": "private, no-store" });
          return res.end(data);
        } catch { return send(res, 404, { error: "not-found", message: "That file isn't available just now." }); }
      }
      res.writeHead(out.status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...out.headers });
      return res.end(JSON.stringify(out.body));
    } catch (e) {
      console.error("account route failed:", (e as Error).name); // the error's name only: never request data
      return send(res, 500, { error: "server-error", message: "Something went wrong. Please try again." });
    }
  }

  if (url.pathname === "/api/tutor" && req.method === "POST") {
    if (!humanOk(String(req.headers["x-human-pass"] ?? "") || undefined)) return send(res, 401, { error: "human-required" });
    const ip = (TRUST_PROXY ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "") || req.socket.remoteAddress || "unknown";
    let body: unknown;
    try { body = await readBody(req); } catch { return send(res, 400, { error: "Bad request." }); }
    const out = await handleTutor(body, ip, {
      provider, limiter,
      log: (e) => console.log(JSON.stringify({ t: new Date().toISOString(), ...e, ...(provider instanceof OpenRouterProvider && provider.lastModel ? { model: provider.lastModel } : {}) })), // counts, flags and the model name only
    });
    return send(res, out.status, out.body);
  }

  // the built app, so one process can serve everything
  if ((req.method === "GET" || req.method === "HEAD") && existsSync(DIST)) {
    const rel = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
    const file = join(DIST, rel);
    if (file.startsWith(DIST) && existsSync(file)) {
      // built files in /assets carry a content hash in their name, so browsers may keep them; everything else is checked each time
      res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream", "Cache-Control": rel.replace(/\\/g, "/").startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache" });
      return res.end(req.method === "HEAD" ? undefined : readFileSync(file));
    }
  }
  send(res, 404, { error: "Not found." });
}).listen(PORT, () => console.log(WHICH === "openrouter" && !FAKE ? `quarter tutor service on :${PORT} (OpenRouter, model ${openRouterConfig().model}, data collection ${openRouterConfig().dataCollection})` : `quarter tutor service on :${PORT} (model ${DEFAULT_CONFIG.model}, effort ${DEFAULT_CONFIG.effort})`));
