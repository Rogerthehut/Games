import { TERMS_VERSION } from "../src/legal/terms-version";
import type { AuthProvider } from "./auth";
import { MAX_PROFILE_BYTES } from "./db/profile-check";
import type { Repo } from "./db/repo";

export interface ApiRequest { method: string; path: string; token: string | null; body?: unknown }
export interface ApiResponse { status: number; body: unknown; headers?: Record<string, string> }
export interface AccountDeps { repo: Repo; auth: AuthProvider; limiter?: WriteLimiter }

/** A cap on how often one parent can write, so a stuck or hostile client cannot flood the database. */
export class WriteLimiter {
  private hits = new Map<string, number[]>();
  constructor(private perHour = 900, private now: () => number = Date.now) {}
  allow(key: string): boolean {
    const t = this.now(), recent = (this.hits.get(key) ?? []).filter((x) => t - x < 3_600_000);
    if (recent.length >= this.perHour) { this.hits.set(key, recent); return false; }
    recent.push(t); this.hits.set(key, recent);
    return true;
  }
}

export const MAX_BODY = MAX_PROFILE_BYTES + 20_000;
const reply = (status: number, body: unknown, headers?: Record<string, string>): ApiResponse => ({ status, body, headers });
const err = (status: number, code: string, message: string) => reply(status, { error: code, message });
const LEARNER = /^\/api\/learners\/([^/]+)$/;
export const isAccountRoute = (path: string) => path === "/api/account" || path.startsWith("/api/account/") || path === "/api/learners" || LEARNER.test(path);

/**
 * Parents' accounts and their learners' saved progress. Signed-in parents only; every query is scoped to the parent.
 * The tutor chat log never reaches here (the app keeps it on the device and the server drops it if sent).
 */
export async function handleAccountApi(req: ApiRequest, deps: AccountDeps): Promise<ApiResponse> {
  const who = await deps.auth.authenticate(req.token);
  if (!who) return err(401, "signed-out", "Please sign in.");
  const parent = await deps.repo.upsertParent(who.userId);
  const consented = parent.consentVersion === TERMS_VERSION;
  const writing = req.method !== "GET";
  if (writing && deps.limiter && !deps.limiter.allow(parent.id)) return err(429, "slow-down", "Too many changes just now. Please wait a moment.");
  const body = (req.body ?? {}) as Record<string, unknown>;

  // the account itself
  if (req.path === "/api/account" && req.method === "GET") {
    const learners = consented ? await deps.repo.loadLearners(parent.id) : [];
    return reply(200, { termsVersion: TERMS_VERSION, consented, learners }, { "Cache-Control": "no-store" });
  }
  if (req.path === "/api/account/consent" && req.method === "POST") {
    if (body.version !== TERMS_VERSION) return err(400, "wrong-version", "That is not the current version of the privacy notice and terms.");
    await deps.repo.recordConsent(parent.id, TERMS_VERSION);
    return reply(200, { termsVersion: TERMS_VERSION, consented: true });
  }
  if (req.path === "/api/account/export" && req.method === "GET") {
    return reply(200, await deps.repo.exportParent(parent.id), { "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="quarter-data.json"' });
  }
  if (req.path === "/api/account" && req.method === "DELETE") {
    if (body.confirm !== "delete my account") return err(400, "not-confirmed", 'Send {"confirm":"delete my account"} to delete the account and everything saved under it.');
    await deps.repo.deleteParent(parent.id);
    await deps.auth.deleteUser?.(who.userId).catch(() => undefined); // our data is gone either way; the sign-in identity is removed if we can
    return reply(200, { deleted: true });
  }

  // learners: nothing is saved until the parent has agreed to the current terms
  if (req.path === "/api/learners" && req.method === "POST") {
    if (!consented) return err(403, "consent-required", "Please agree to the privacy notice and terms first.");
    const out = await deps.repo.createLearner(parent.id, body.profile);
    if (!out.ok) return err(out.reason === "limit" ? 409 : 400, out.reason, out.error);
    return reply(201, { id: out.id, version: out.version });
  }
  const m = LEARNER.exec(req.path);
  if (m && req.method === "PUT") {
    if (!consented) return err(403, "consent-required", "Please agree to the privacy notice and terms first.");
    const base = body.baseVersion;
    if (typeof base !== "number" || !Number.isInteger(base) || base < 1) return err(400, "invalid", "baseVersion must be the version you last loaded or saved.");
    const out = await deps.repo.saveProgress(parent.id, m[1], body.profile, base);
    if (out.ok) return reply(200, { version: out.version });
    if (out.reason === "conflict") return reply(409, { error: "conflict", message: "Another device saved newer progress.", current: out.current });
    if (out.reason === "not-found") return err(404, "not-found", "No such learner.");
    return err(400, "invalid", out.error);
  }
  if (m && req.method === "DELETE") {
    return (await deps.repo.deleteLearner(parent.id, m[1])) ? reply(200, { deleted: true }) : err(404, "not-found", "No such learner.");
  }
  return err(404, "not-found", "No such route.");
}
