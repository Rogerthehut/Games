import type { Profile } from "../engine/progress";
import { forServer, type RemoteLearner, type SaveOutcome, type SyncApi } from "./sync";

export class AccountError extends Error {
  constructor(public status: number | undefined, public code: string, message: string, public body?: unknown) { super(message); }
}
export interface AccountInfo { termsVersion: string; consented: boolean; learners: RemoteLearner[] }

/** The browser's side of the account API. `token` returns the signed-in parent's session token. */
export class AccountApi implements SyncApi {
  constructor(private token: () => Promise<string | null>, private fetchFn: typeof fetch = (...a) => fetch(...a), private base = "") {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    let res: Response;
    try {
      const token = await this.token();
      res = await this.fetchFn(`${this.base}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new AccountError(undefined, "offline", "No connection.");
    }
    const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
    if (!res.ok && res.status !== 409) throw new AccountError(res.status, data.error ?? "error", data.message ?? "Something went wrong.", data);
    return { status: res.status, data };
  }

  async getAccount(): Promise<AccountInfo> { return (await this.request<AccountInfo>("GET", "/api/account")).data; }
  async consent(version: string) { await this.request("POST", "/api/account/consent", { version }); }
  async createLearner(profile: Profile): Promise<{ id: string; version: number }> {
    return (await this.request<{ id: string; version: number }>("POST", "/api/learners", { profile: forServer(profile) })).data;
  }
  async saveLearner(id: string, profile: Profile, baseVersion: number): Promise<SaveOutcome> {
    const r = await this.request<{ version: number; current?: RemoteLearner }>("PUT", `/api/learners/${encodeURIComponent(id)}`, { profile: forServer(profile), baseVersion });
    return r.status === 409 && r.data.current ? { ok: false, conflict: r.data.current } : { ok: true, version: r.data.version };
  }
  async deleteLearner(id: string) {
    try { await this.request("DELETE", `/api/learners/${encodeURIComponent(id)}`); } catch (e) { if ((e as AccountError).status !== 404) throw e; }
  }
  async exportData(): Promise<unknown> { return (await this.request("GET", "/api/account/export")).data; }
  async deleteAccount() { await this.request("DELETE", "/api/account", { confirm: "delete my account" }); }
}
