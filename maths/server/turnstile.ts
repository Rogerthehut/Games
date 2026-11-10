import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Cloudflare Turnstile: a privacy-friendly check that a visitor is a person, not a script.
 * The browser solves it once, we confirm with Cloudflare, and hand back a short-lived signed "pass" that the AI endpoints require.
 * With no TURNSTILE_SECRET_KEY the check is off (development, tests).
 */
export interface TurnstileConfig { secret: string; passMinutes: number }
export const turnstileConfig = (env: NodeJS.ProcessEnv): TurnstileConfig | null =>
  env.TURNSTILE_SECRET_KEY ? { secret: env.TURNSTILE_SECRET_KEY, passMinutes: Math.min(120, Math.max(5, Number(env.TURNSTILE_PASS_MINUTES ?? 30) || 30)) } : null;

type Fetch = (url: string, init: { method: string; body: URLSearchParams }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
const VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Ask Cloudflare whether this token is genuine. Any failure means "no". */
export async function verifyToken(secret: string, token: string, ip: string | undefined, fetchFn: Fetch = (u, i) => fetch(u, i)): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetchFn(VERIFY, { method: "POST", body });
    if (!res.ok) return false;
    return ((await res.json()) as { success?: unknown }).success === true;
  } catch { return false; }
}

/** A pass is `expiry.nonce.signature`. The key comes from the secret, so every server instance agrees on it. */
const key = (secret: string) => createHmac("sha256", "quarter-human-pass").update(secret).digest();
const sign = (secret: string, payload: string) => createHmac("sha256", key(secret)).update(payload).digest("base64url");

export function issuePass(cfg: TurnstileConfig, now = Date.now()): { pass: string; expiresInSeconds: number } {
  const payload = `${Math.floor(now / 1000) + cfg.passMinutes * 60}.${randomBytes(8).toString("base64url")}`;
  return { pass: `${payload}.${sign(cfg.secret, payload)}`, expiresInSeconds: cfg.passMinutes * 60 };
}

export function passIsValid(cfg: TurnstileConfig, pass: string | null | undefined, now = Date.now()): boolean {
  if (!pass || pass.length > 200) return false;
  const parts = pass.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(cfg.secret, payload)), given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const exp = Number(parts[0]);
  return Number.isFinite(exp) && exp * 1000 > now;
}
