import type { Store } from "../engine/storage";

/** A copy of the signed-in family's data on this device, so the app opens fast and works without a connection. Removed on sign-out. */
const PREFIX = "quarter.cache.";
const LEGACY_KEY = "mathpath.v1";
const DECLINED = "quarter.legacy.declined";

export interface Cached { store: Store; versions: Record<string, number>; savedAt: number }

const safe = <T,>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };

export const loadCache = (userId: string): Cached | null =>
  safe(() => { const raw = localStorage.getItem(PREFIX + userId); return raw ? (JSON.parse(raw) as Cached) : null; }, null);
export const saveCache = (userId: string, c: Cached) => safe(() => localStorage.setItem(PREFIX + userId, JSON.stringify(c)), undefined);
/** Everything held for any family: used when someone signs out of a shared device. */
export const clearCaches = () => safe(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX) || k === "quarter.active") localStorage.removeItem(k);
}, undefined);

/** Progress saved on this device before accounts existed. */
export const loadLegacy = (): Store | null =>
  safe(() => { const raw = localStorage.getItem(LEGACY_KEY); const s = raw ? (JSON.parse(raw) as Store) : null; return s && Array.isArray(s.profiles) && s.profiles.length ? s : null; }, null);
export const clearLegacy = () => safe(() => localStorage.removeItem(LEGACY_KEY), undefined);
export const legacyDeclined = () => safe(() => localStorage.getItem(DECLINED) === "1", false);
export const declineLegacy = () => safe(() => localStorage.setItem(DECLINED, "1"), undefined);

export const loadActive = (userId: string) => safe(() => localStorage.getItem(`quarter.active.${userId}`), null);
export const saveActive = (userId: string, id: string | null) => safe(() => { if (id) localStorage.setItem(`quarter.active.${userId}`, id); }, undefined);
