import type { Profile } from "../engine/progress";
import { forgetHumanPass, humanHeaders } from "../humans/turnstile";
import type { AssistantResponse, AssistantTurn } from "../assistant/types";
import { forServer, type RemoteLearner, type SaveOutcome, type SyncApi } from "./sync";

export class AccountError extends Error {
  constructor(public status: number | undefined, public code: string, message: string, public body?: unknown) { super(message); }
}
export type Plan = "monthly" | "yearly";
export interface PriceInfo { amount: number; currency: string; interval: string }
export interface BillingInfo {
  enabled: boolean; access: boolean; status: string; plan: Plan | null; trialEnd: string | null; periodEnd: string | null;
  cancelAtPeriodEnd: boolean; trialDays: number; prices: Record<Plan, PriceInfo | null> | null; trialAvailable: boolean;
}
export const NO_BILLING: BillingInfo = { enabled: false, access: true, status: "off", plan: null, trialEnd: null, periodEnd: null, cancelAtPeriodEnd: false, trialDays: 0, prices: null, trialAvailable: false };
export interface AccountInfo { termsVersion: string; consented: boolean; learners: RemoteLearner[]; billing?: BillingInfo }

/** The browser's side of the account API. `token` returns the signed-in parent's session token. */
export class AccountApi implements SyncApi {
  constructor(private token: () => Promise<string | null>, private fetchFn: typeof fetch = (...a) => fetch(...a), private base = "") {}

  private async request<T>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<{ status: number; data: T }> {
    let res: Response;
    try {
      const token = await this.token();
      res = await this.fetchFn(`${this.base}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
  /** Ask the parents' assistant a question. */
  async ask(message: string, history: AssistantTurn[], year: number | null): Promise<AssistantResponse> {
    const go = async () => (await this.request<AssistantResponse>("POST", "/api/assistant", { message, history, year }, await humanHeaders())).data;
    try { return await go(); }
    catch (e) {
      const err = e as AccountError;
      if (err.status === 401 && err.code === "human-required") { forgetHumanPass(); return go(); } // the quick check lapsed: do it again once
      if (err.status === 429 && err.body) return err.body as AssistantResponse;
      throw e;
    }
  }
  /** Where to send the parent to pay. */
  async checkout(plan: Plan): Promise<string> { return (await this.request<{ url: string }>("POST", "/api/billing/checkout", { plan })).data.url; }
  /** Where to send the parent to change card, switch plan or cancel. */
  async portal(): Promise<string> { return (await this.request<{ url: string }>("POST", "/api/billing/portal")).data.url; }
  async exportData(): Promise<unknown> { return (await this.request("GET", "/api/account/export")).data; }
  async deleteAccount() { await this.request("DELETE", "/api/account", { confirm: "delete my account" }); }
}
