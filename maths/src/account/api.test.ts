import { describe, expect, it } from "vitest";
import type { Profile } from "../engine/progress";
import { AccountApi, AccountError } from "./api";

const prof = { id: "x", name: "Maya", year: 5, skills: {}, tutorLog: [{ question: "private" }] } as unknown as Profile;
const reply = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });
const api = (fetchFn: typeof fetch, token: string | null = "tok") => new AccountApi(async () => token, fetchFn);

describe("account API client", () => {
  it("sends the session token and the learner, without the tutor log", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const a = api((async (url: string, init: RequestInit) => { seen = { url, init }; return new Response(JSON.stringify({ id: "n1", version: 1 }), { status: 201 }); }) as never);
    expect(await a.createLearner(prof)).toEqual({ id: "n1", version: 1 });
    expect(seen!.url).toBe("/api/learners");
    expect((seen!.init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(String(seen!.init.body)).not.toMatch(/private|tutorLog/);
  });
  it("sends no Authorization header when signed out", async () => {
    let headers: Record<string, string> = {};
    await api((async (_u: string, init: RequestInit) => { headers = init.headers as Record<string, string>; return new Response("{}", { status: 200 }); }) as never, null).getAccount();
    expect(headers.Authorization).toBeUndefined();
  });
  it("turns a version clash into a conflict result, not an error", async () => {
    const current = { id: "a", version: 3, data: { name: "Maya" } };
    const a = api(reply(409, { error: "conflict", current }) as never);
    expect(await a.saveLearner("a", prof, 1)).toEqual({ ok: false, conflict: current });
    expect(await api(reply(200, { version: 2 }) as never).saveLearner("a", prof, 1)).toEqual({ ok: true, version: 2 });
  });
  it("reports no connection as 'offline'", async () => {
    const a = api((async () => { throw new TypeError("Failed to fetch"); }) as never);
    const e = await a.getAccount().catch((x) => x as AccountError);
    expect(e).toBeInstanceOf(AccountError);
    expect(e).toMatchObject({ code: "offline", status: undefined });
  });
  it("keeps the server's status and code for refused requests", async () => {
    const e = await api(reply(403, { error: "consent-required", message: "Please agree first." }) as never).createLearner(prof).catch((x) => x as AccountError);
    expect(e).toMatchObject({ status: 403, code: "consent-required", message: "Please agree first." });
  });
  it("treats deleting something already gone as done", async () => {
    await expect(api(reply(404, { error: "not-found" }) as never).deleteLearner("a")).resolves.toBeUndefined();
    await expect(api(reply(500, {}) as never).deleteLearner("a")).rejects.toBeInstanceOf(AccountError);
  });
  it("asks for the delete confirmation the server wants", async () => {
    let body = "";
    await api((async (_u: string, init: RequestInit) => { body = String(init.body); return new Response("{}"); }) as never).deleteAccount();
    expect(JSON.parse(body)).toEqual({ confirm: "delete my account" });
  });
});
