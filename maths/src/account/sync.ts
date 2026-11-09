import type { Profile } from "../engine/progress";
import type { Store } from "../engine/storage";

export type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";
export interface RemoteLearner { id: string; version: number; data: Record<string, unknown> }
export type SaveOutcome = { ok: true; version: number } | { ok: false; conflict: RemoteLearner };

export interface SyncApi {
  createLearner(profile: Profile): Promise<{ id: string; version: number }>;
  saveLearner(id: string, profile: Profile, baseVersion: number): Promise<SaveOutcome>;
  deleteLearner(id: string): Promise<void>;
}
export interface SyncHooks {
  onStatus(status: SyncStatus): void;
  /** A learner made on this device now has its permanent id from the server. */
  onRemap(localId: string, remoteId: string): void;
  /** Another device saved newer progress for this learner: use it instead of ours. */
  onRemoteUpdate(remote: RemoteLearner): void;
}
export interface SyncTiming { debounceMs: number; retryMs: number[] }
const DEFAULT_TIMING: SyncTiming = { debounceMs: 2000, retryMs: [3000, 10_000, 30_000, 120_000] };

/** Failures worth trying again: no network (the API layer reports it as code "offline"), a busy server, or a rate limit. Anything else (a refused request, a bug) will not get better by waiting. */
export const isRetryable = (e: unknown) => {
  const x = e as { status?: number; code?: string };
  return x?.code === "offline" || (typeof x?.status === "number" && (x.status >= 500 || x.status === 429));
};

/** The same text for the same data whatever order its keys are in (Postgres reorders JSON keys). */
export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** What goes to the server for a learner. The tutor chat log stays on the device. */
export const forServer = (p: Profile): Profile => { const { tutorLog: _kept, ...rest } = p as Profile & { tutorLog?: unknown }; return rest as Profile; };

/**
 * Keeps the learners in the app and on the server the same. The app is the source of truth while someone is practising: changes are
 * saved a couple of seconds after they stop, one learner at a time, each with the version it last saw. If another device saved first,
 * its copy replaces ours and the app is told. If the network is down it tries again, with longer waits, and says so.
 */
export class Sync {
  private known = new Map<string, { version: number; json: string }>();
  private latest: Store | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private again = false;
  private attempt = 0;
  private pendingDeletes = new Set<string>();
  status: SyncStatus = "idle";

  constructor(private api: SyncApi, private hooks: SyncHooks, private timing: SyncTiming = DEFAULT_TIMING, private clock = { set: setTimeout, clear: clearTimeout }) {}

  /** Tell it what the server already holds (after signing in), so nothing is sent back for no reason. */
  seed(learners: RemoteLearner[]) {
    this.known.clear();
    for (const l of learners) this.known.set(l.id, { version: l.version, json: stable(forServer(l.data as unknown as Profile)) });
  }

  /** The app's learners changed. */
  notify(store: Store) {
    this.latest = store;
    if (this.timer) this.clock.clear(this.timer);
    this.timer = this.clock.set(() => void this.flush(), this.timing.debounceMs);
  }

  /** Remove a learner from the server too. */
  forget(id: string) {
    if (this.known.has(id)) { this.known.delete(id); this.pendingDeletes.add(id); }
    this.queue(0);
  }

  /** Save everything now (before the page closes, or when signing out). */
  flushNow() { if (this.timer) this.clock.clear(this.timer); return this.flush(); }

  dispose() { if (this.timer) this.clock.clear(this.timer); this.timer = null; }

  private queue(ms: number) {
    if (this.timer) this.clock.clear(this.timer);
    this.timer = this.clock.set(() => void this.flush(), ms);
  }

  private setStatus(s: SyncStatus) { if (s !== this.status) { this.status = s; this.hooks.onStatus(s); } }

  private async flush() {
    this.timer = null;
    if (this.running) { this.again = true; return; }
    this.running = true;
    try {
      this.setStatus("saving");
      for (const id of [...this.pendingDeletes]) { await this.api.deleteLearner(id); this.pendingDeletes.delete(id); }
      for (const p of this.latest?.profiles ?? []) await this.saveOne(p);
      this.attempt = 0;
      this.setStatus("saved");
    } catch (e) {
      if (isRetryable(e)) {
        this.setStatus("offline");
        const wait = this.timing.retryMs[Math.min(this.attempt++, this.timing.retryMs.length - 1)];
        this.queue(wait);
      } else this.setStatus("error");
    } finally {
      this.running = false;
      if (this.again) { this.again = false; this.queue(0); }
    }
  }

  private async saveOne(p: Profile) {
    const mine = forServer(p);
    const known = this.known.get(p.id);
    if (!known) {
      const made = await this.api.createLearner(mine);
      this.known.set(made.id, { version: made.version, json: stable({ ...mine, id: made.id }) });
      this.hooks.onRemap(p.id, made.id);
      return;
    }
    const json = stable(mine);
    if (json === known.json) return;
    const out = await this.api.saveLearner(p.id, mine, known.version);
    if (out.ok) { known.version = out.version; known.json = json; return; }
    this.known.set(out.conflict.id, { version: out.conflict.version, json: stable(forServer(out.conflict.data as unknown as Profile)) });
    this.hooks.onRemoteUpdate(out.conflict);
  }
}
