import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleTutor } from "./tutor/handler";
import { DEFAULT_LIMITS, Limiter } from "./tutor/policy";
import { AnthropicProvider, DEFAULT_CONFIG } from "./tutor/provider";

/**
 * The tutor service. It holds the API key, checks everything in both directions, rate limits, and stores nothing:
 * message text exists only for the length of one request and is never logged.
 */
const PORT = Number(process.env.PORT ?? 8787);
const ALLOWED = (process.env.TUTOR_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
const DIST = fileURLToPath(new URL("../dist", import.meta.url));

if (!process.env.ANTHROPIC_API_KEY) console.warn("ANTHROPIC_API_KEY is not set: the tutor will answer 'unavailable' until it is.");

const limiter = new Limiter({
  perDeviceDay: Number(process.env.TUTOR_PER_DEVICE_DAY ?? DEFAULT_LIMITS.perDeviceDay),
  perDeviceHour: Number(process.env.TUTOR_PER_DEVICE_HOUR ?? DEFAULT_LIMITS.perDeviceHour),
  perIpDay: Number(process.env.TUTOR_PER_IP_DAY ?? DEFAULT_LIMITS.perIpDay),
  globalDay: Number(process.env.TUTOR_GLOBAL_DAY ?? DEFAULT_LIMITS.globalDay),
});
const provider = new AnthropicProvider(DEFAULT_CONFIG);

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webmanifest": "application/manifest+json", ".json": "application/json" };

function cors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { reject(new Error("bad json")); } });
    req.on("error", reject);
  });
}

createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url ?? "/", "http://x");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  if (url.pathname === "/api/health") return send(res, 200, { ok: true, tutor: !!process.env.ANTHROPIC_API_KEY });

  if (url.pathname === "/api/tutor" && req.method === "POST") {
    const ip = (TRUST_PROXY ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "") || req.socket.remoteAddress || "unknown";
    let body: unknown;
    try { body = await readBody(req); } catch { return send(res, 400, { error: "Bad request." }); }
    const out = await handleTutor(body, ip, {
      provider, limiter,
      log: (e) => console.log(JSON.stringify({ t: new Date().toISOString(), ...e })), // counts and flags only
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
}).listen(PORT, () => console.log(`MathPath tutor service on :${PORT} (model ${DEFAULT_CONFIG.model}, effort ${DEFAULT_CONFIG.effort})`));
