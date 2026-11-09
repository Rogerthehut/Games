import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "../engine/progress";
import type { Store } from "../engine/storage";
import { Sync, forServer, stable, type RemoteLearner, type SaveOutcome, type SyncApi, type SyncStatus } from "./sync";

const prof = (id: string, over: Record<string, unknown> = {}) => ({ id, name: "Maya", year: 5, skills: {}, points: 0, ...over }) as unknown as Profile;
const store = (...ps: Profile[]): Store => ({ version: 1, profiles: ps, activeId: ps[0]?.id ?? null });
const err = (status: number | undefined, code?: string) => Object.assign(new Error("x"), { status, code });

/** A fake server plus a log of what was asked of it. */
function fakeApi() {
  const calls: string[] = [];
  const sent: Record<string, unknown>[] = [];
  const server = new Map<string, { version: number; data: Record<string, unknown> }>();
  let n = 0;
  const api: SyncApi & { fail: (() => unknown) | null; conflictWith: RemoteLearner | null } = {
    fail: null, conflictWith: null,
    async createLearner(p) { calls.push("create"); sent.push(p as unknown as Record<string, unknown>); if (api.fail) throw api.fail() as Error; const id = `srv-${++n}`; server.set(id, { version: 1, data: { ...p, id } }); return { id, version: 1 }; },
    async saveLearner(id, p, base): Promise<SaveOutcome> {
      calls.push(`save:${id}:${base}`); sent.push(p as unknown as Record<string, unknown>);
      if (api.fail) throw api.fail() as Error;
      if (api.conflictWith) return { ok: false, conflict: api.conflictWith };
      const s = server.get(id)!; s.version++; s.data = { ...p }; return { ok: true, version: s.version };
    },
    async deleteLearner(id) { calls.push(`delete:${id}`); if (api.fail) throw api.fail() as Error; server.delete(id); },
  };
  return { api, calls, sent, server };
}

let statuses: SyncStatus[], remaps: [string, string][], updates: RemoteLearner[];
const hooks = () => ({ onStatus: (s: SyncStatus) => statuses.push(s), onRemap: (a: string, b: string) => remaps.push([a, b]), onRemoteUpdate: (r: RemoteLearner) => updates.push(r) });
beforeEach(() => { vi.useFakeTimers(); statuses = []; remaps = []; updates = []; });

describe("saving", () => {
  it("waits until changes stop, then saves once", async () => {
    const f = fakeApi(); const s = new Sync(f.api, hooks());
    s.seed([{ id: "a", version: 1, data: prof("a") as never }]); f.server.set("a", { version: 1, data: {} });
    s.notify(store(prof("a", { points: 1 }))); await vi.advanceTimersByTimeAsync(1000);
    s.notify(store(prof("a", { points: 2 }))); await vi.advanceTimersByTimeAsync(1000);
    s.notify(store(prof("a", { points: 3 }))); await vi.advanceTimersByTimeAsync(1999);
    expect(f.calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(10);
    expect(f.calls).toEqual(["save:a:1"]);
    expect(f.sent[0]).toMatchObject({ points: 3 });
    expect(s.status).toBe("saved");
  });

  it("sends nothing when nothing changed, even if the server returns keys in another order", async () => {
    const f = fakeApi(); const s = new Sync(f.api, hooks());
    s.seed([{ id: "a", version: 4, data: { points: 0, year: 5, skills: {}, name: "Maya", id: "a" } }]);   // jsonb order
    s.notify(store(prof("a"))); await vi.advanceTimersByTimeAsync(3000);
    expect(f.calls).toEqual([]);
    expect(stable({ b: 1, a: { d: 1, c: 2 } })).toBe(stable({ a: { c: 2, d: 1 }, b: 1 }));
  });

  it("creates a learner that only exists on this device and tells the app its permanent id", async () => {
    const f = fakeApi(); const s = new Sync(f.api, hooks());
    s.notify(store(prof("p_local"))); await vi.advanceTimersByTimeAsync(3000);
    expect(f.calls).toEqual(["create"]);
    expect(remaps).toEqual([["p_local", "srv-1"]]);
    // once the app has switched to the new id, nothing more is sent
    s.notify(store(prof("srv-1"))); await vi.advanceTimersByTimeAsync(3000);
    expect(f.calls).toEqual(["create"]);
  });

  it("never sends the tutor chat log", async () => {
    const f = fakeApi(); const s = new Sync(f.api, hooks());
    s.notify(store(prof("p_local", { tutorLog: [{ question: "private" }] }))); await vi.advanceTimersByTimeAsync(3000);
    expect(JSON.stringify(f.sent)).not.toMatch(/private|tutorLog/);
    expect(forServer(prof("x", { tutorLog: [1] }))).not.toHaveProperty("tutorLog");
  });

  it("saves each learner that changed, not the others", async () => {
    const f = fakeApi(); const s = new Sync(f.api, hooks());
    s.seed([{ id: "a", version: 1, data: prof("a") as never }, { id: "b", version: 7, data: prof("b") as never }]); f.server.set("b", { version: 7, data: {} });
    s.notify(store(prof("a"), prof("b", { points: 5 }))); await vi.advanceTimersByTimeAsync(3000);
    expect(f.calls).toEqual(["save:b:7"]);
  });
});

describe("another device saved first", () => {
  it("replaces our copy with theirs and says so", async () => {
    const f = fakeApi(); const s = new Sync(f.api, hooks());
    s.seed([{ id: "a", version: 1, data: prof("a") as never }]); f.server.set("a", { version: 1, data: {} });
    f.api.conflictWith = { id: "a", version: 3, data: { ...prof("a", { points: 99 }) } as never };
    s.notify(store(prof("a", { points: 1 }))); await vi.advanceTimersByTimeAsync(3000);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ id: "a", version: 3 });
    // the app now holds their copy, so the next notify sends nothing
    f.api.conflictWith = null;
    s.notify(store(prof("a", { points: 99 }))); await vi.advanceTimersByTimeAsync(3000);
    expect(f.calls).toEqual(["save:a:1"]);
  });
});

describe("no connection", () => {
  it("says it is offline, tries again later with longer waits, and catches up", async () => {
    const f = fakeApi(); const s = new Sync(f.api, hooks(), { debounceMs: 100, retryMs: [1000, 5000] });
    s.seed([{ id: "a", version: 1, data: prof("a") as never }]); f.server.set("a", { version: 1, data: {} });
    f.api.fail = () => err(undefined, "offline");
    s.notify(store(prof("a", { points: 1 }))); await vi.advanceTimersByTimeAsync(150);
    expect(s.status).toBe("offline");
    await vi.advanceTimersByTimeAsync(1000); expect(f.calls).toHaveLength(2);            // second try after 1s, still failing
    await vi.advanceTimersByTimeAsync(4000); expect(f.calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1100); expect(f.calls).toHaveLength(3);            // third try after 5s
    f.api.fail = null;
    await vi.advanceTimersByTimeAsync(5100);
    expect(s.status).toBe("saved");
    expect(f.calls.at(-1)).toBe("save:a:1");
  });

  it("does not keep retrying a request the server refused", async () => {
    const f = fakeApi(); const s = new Sync(f.api, hooks(), { debounceMs: 100, retryMs: [1000] });
    s.seed([{ id: "a", version: 1, data: prof("a") as never }]); f.server.set("a", { version: 1, data: {} });
    f.api.fail = () => err(400, "invalid");
    s.notify(store(prof("a", { points: 1 }))); await vi.advanceTimersByTimeAsync(60_000);
    expect(s.status).toBe("error");
    expect(f.calls).toHaveLength(1);
  });

  it("treats a busy server and a rate limit as worth retrying", async () => {
    for (const status of [429, 500, 503]) {
      const f = fakeApi(); const s = new Sync(f.api, hooks(), { debounceMs: 10, retryMs: [100] });
      s.seed([{ id: "a", version: 1, data: prof("a") as never }]); f.server.set("a", { version: 1, data: {} });
      f.api.fail = () => err(status);
      s.notify(store(prof("a", { points: 1 }))); await vi.advanceTimersByTimeAsync(250);
      expect(s.status, String(status)).toBe("offline");
    }
  });
});

describe("removing a learner", () => {
  it("deletes it on the server, and only the one asked for", async () => {
    const f = fakeApi(); const s = new Sync(f.api, hooks());
    s.seed([{ id: "a", version: 1, data: prof("a") as never }, { id: "b", version: 1, data: prof("b") as never }]); f.server.set("a", { version: 1, data: {} }); f.server.set("b", { version: 1, data: {} });
    s.forget("a"); s.notify(store(prof("b")));
    await vi.advanceTimersByTimeAsync(3000);
    expect(f.calls).toEqual(["delete:a"]);
  });
  it("keeps trying to delete until the server hears it", async () => {
    const f = fakeApi(); const s = new Sync(f.api, hooks(), { debounceMs: 10, retryMs: [100] });
    s.seed([{ id: "a", version: 1, data: prof("a") as never }]); f.server.set("a", { version: 1, data: {} });
    f.api.fail = () => err(undefined, "offline");
    s.forget("a"); await vi.advanceTimersByTimeAsync(50);
    expect(s.status).toBe("offline");
    f.api.fail = null; await vi.advanceTimersByTimeAsync(300);
    expect(f.server.has("a")).toBe(false);
    expect(f.calls.filter((c) => c === "delete:a").length).toBeGreaterThanOrEqual(2);
    expect(s.status).toBe("saved");
  });
});
