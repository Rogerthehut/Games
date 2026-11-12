import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { AuthProvider } from "./auth";
import type { Mailer } from "./mail";

/**
 * Who may open the team's ops page, and how they prove it. Three things are needed, all on the server:
 *   1. a valid parent sign-in (Clerk),
 *   2. that sign-in's email address is on the OPS_ADMINS allow-list,
 *   3. a six-digit code, emailed to that address, entered within ten minutes (the second step).
 * Passing all three gives a signed session that lasts an hour. Nothing here stores an email address: it is looked up each time.
 */
const MIN = 60_000;
export const CODE_TTL_MS = 10 * MIN;
export const SESSION_TTL_MS = 60 * MIN;
const CODE_GAP_MS = 30_000;       // at least this long between codes for one person
const MAX_ATTEMPTS = 5;
const ADMIN_RECHECK_MS = 5 * MIN; // a removed admin loses access within this long

export const parseAdmins = (v: string | undefined) => new Set((v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
/** What the audit log calls someone: never their email or name. */
export const actorOf = (userId: string) => `admin:${userId.replace(/^user_/, "").slice(0, 10)}`;

export interface OpsAccessDeps { auth: AuthProvider; mailer: Mailer; admins: Set<string>; secret: string; now?: () => number }
export type CodeOutcome = "sent" | "not-admin" | "too-soon" | "mail-failed";
export type VerifyOutcome = { ok: true; session: string; expiresAt: number } | { ok: false; reason: "no-code" | "wrong" | "locked" };

export class OpsAccess {
  private pending = new Map<string, { hash: string; expires: number; attempts: number; sentAt: number }>();
  private adminCache = new Map<string, { ok: boolean; at: number }>();
  constructor(private d: OpsAccessDeps) {}
  private now() { return (this.d.now ?? Date.now)(); }
  private hash(code: string) { return createHash("sha256").update(`${this.d.secret}:${code}`).digest("hex"); }

  /** True when the sign-in's email address is on the allow-list. Re-checked every few minutes. */
  async isAdmin(userId: string): Promise<boolean> {
    const hit = this.adminCache.get(userId);
    if (hit && this.now() - hit.at < ADMIN_RECHECK_MS) return hit.ok;
    const email = (await this.d.auth.emailOf?.(userId))?.toLowerCase() ?? null;
    const ok = !!email && this.d.admins.has(email);
    this.adminCache.set(userId, { ok, at: this.now() });
    return ok;
  }

  async sendCode(userId: string): Promise<CodeOutcome> {
    if (!(await this.isAdmin(userId))) return "not-admin";
    const prev = this.pending.get(userId);
    if (prev && this.now() - prev.sentAt < CODE_GAP_MS) return "too-soon";
    const to = await this.d.auth.emailOf?.(userId);
    if (!to) return "not-admin";
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const res = await this.d.mailer.send({
      to, subject: `Your quarter ops code: ${code}`,
      text: `Your quarter ops code is ${code}. It works for 10 minutes. If you didn't ask for it, ignore this email: nothing happens without the code.`,
      html: `<p style="font:16px system-ui,sans-serif">Your quarter ops code is</p><p style="font:700 32px/1.2 ui-monospace,monospace;letter-spacing:4px">${code}</p><p style="font:14px system-ui,sans-serif;color:#555">It works for 10 minutes. If you didn't ask for it, ignore this email: nothing happens without the code.</p>`,
    });
    if (!res.ok) return "mail-failed";
    this.pending.set(userId, { hash: this.hash(code), expires: this.now() + CODE_TTL_MS, attempts: 0, sentAt: this.now() });
    return "sent";
  }

  verify(userId: string, code: string): VerifyOutcome {
    const p = this.pending.get(userId);
    if (!p || p.expires < this.now()) { this.pending.delete(userId); return { ok: false, reason: "no-code" }; }
    if (p.attempts >= MAX_ATTEMPTS) { this.pending.delete(userId); return { ok: false, reason: "locked" }; }
    p.attempts++;
    const given = Buffer.from(this.hash(code.replace(/\s/g, "")));
    const want = Buffer.from(p.hash);
    if (given.length !== want.length || !timingSafeEqual(given, want)) return { ok: false, reason: "wrong" };
    this.pending.delete(userId);
    const expiresAt = this.now() + SESSION_TTL_MS;
    return { ok: true, session: this.sign(userId, expiresAt), expiresAt };
  }

  private sign(userId: string, expiresAt: number) {
    const body = `${userId}.${expiresAt}`;
    return `${body}.${createHmac("sha256", this.d.secret).update(body).digest("hex")}`;
  }
  /** True if the session was issued to this person, hasn't expired, and they are still an admin. */
  async sessionOk(userId: string, session: string | undefined): Promise<boolean> {
    if (!session) return false;
    const i = session.lastIndexOf(".");
    if (i < 0) return false;
    const body = session.slice(0, i);
    const sig = Buffer.from(session.slice(i + 1)), want = Buffer.from(createHmac("sha256", this.d.secret).update(body).digest("hex"));
    if (sig.length !== want.length || !timingSafeEqual(sig, want)) return false;
    const [who, exp] = [body.slice(0, body.lastIndexOf(".")), Number(body.slice(body.lastIndexOf(".") + 1))];
    if (who !== userId || !Number.isFinite(exp) || exp < this.now()) return false;
    return this.isAdmin(userId);
  }
}
