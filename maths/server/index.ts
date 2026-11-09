import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_BODY, WriteLimiter, handleAccountApi, isAccountRoute, type AccountDeps } from "./accounts";
import { ClerkAuth, FakeAuth } from "./auth";
import { connect, connectMemory, migrate } from "./db";
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
if ((process.env.DATABASE_URL || AUTH_FAKE) && (process.env.CLERK_SECRET_KEY || AUTH_FAKE)) {
  const db = process.env.DATABASE_URL ? await connect() : await connectMemory();
  const applied = await migrate(db);
  if (applied.length) console.log(`Database migrations applied: ${applied.join(", ")}`);
  const parties = (process.env.CLERK_AUTHORIZED_PARTIES ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  accounts = { repo: makeRepo(db), auth: AUTH_FAKE ? new FakeAuth() : new ClerkAuth(process.env.CLERK_SECRET_KEY!, parties), limiter: new WriteLimiter() };
} else {
  console.warn("Accounts are off: set DATABASE_URL and CLERK_SECRET_KEY to turn them on.");
}

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

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webmanifest": "application/manifest+json", ".json": "application/json" };

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

createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url ?? "/", "http://x");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  if (url.pathname === "/api/health") return send(res, 200, { ok: true, tutor: FAKE || HAS_KEY, provider: FAKE ? "fake" : WHICH, accounts: !!accounts });

  if (isAccountRoute(url.pathname)) {
    if (!accounts) return send(res, 503, { error: "accounts-off", message: "Accounts are not set up on this server." });
    try {
      const token = /^Bearer (.+)$/i.exec(String(req.headers.authorization ?? ""))?.[1] ?? null;
      let body: unknown;
      if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
        try { body = await readBody(req, MAX_BODY); } catch { return send(res, 400, { error: "bad-request", message: "That request could not be read." }); }
      }
      const out = await handleAccountApi({ method: req.method ?? "GET", path: url.pathname, token, body }, accounts);
      res.writeHead(out.status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...out.headers });
      return res.end(JSON.stringify(out.body));
    } catch (e) {
      console.error("account route failed:", (e as Error).name); // the error's name only: never request data
      return send(res, 500, { error: "server-error", message: "Something went wrong. Please try again." });
    }
  }

  if (url.pathname === "/api/tutor" && req.method === "POST") {
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
  if (req.method === "GET" && existsSync(DIST)) {
    const rel = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
    const file = join(DIST, rel);
    if (file.startsWith(DIST) && existsSync(file)) {
      res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
      return res.end(readFileSync(file));
    }
  }
  send(res, 404, { error: "Not found." });
}).listen(PORT, () => console.log(WHICH === "openrouter" && !FAKE ? `Quarter tutor service on :${PORT} (OpenRouter, model ${openRouterConfig().model}, data collection ${openRouterConfig().dataCollection})` : `Quarter tutor service on :${PORT} (model ${DEFAULT_CONFIG.model}, effort ${DEFAULT_CONFIG.effort})`));
