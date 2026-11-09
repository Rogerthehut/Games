import type { Profile } from "./progress";

export const STORE_VERSION = 1;
const KEY = "mathpath.v1";

export interface Store {
  version: number;
  profiles: Profile[];
  activeId: string | null;
}

export const emptyStore = (): Store => ({ version: STORE_VERSION, profiles: [], activeId: null });

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const s = JSON.parse(raw) as Store;
    return s?.version === STORE_VERSION && Array.isArray(s.profiles) ? { ...s, profiles: s.profiles.map((p) => ({ ...p, baselines: p.baselines ?? [] })) } : emptyStore();
  } catch {
    return emptyStore();
  }
}

export function saveStore(s: Store): void {
  try {
    if (s.profiles.length) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch { /* storage unavailable: progress lasts this visit only */ }
}

/* --- Exporting a learner as a file or pasteable text, so progress can move between devices --- */

function checksum(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function exportProfile(p: Profile, now = new Date()): string {
  return JSON.stringify({ app: "mathpath", version: STORE_VERSION, savedAt: now.toISOString(), checksum: checksum(JSON.stringify(p)), profile: p }, null, 2);
}

export function importProfile(text: string): Profile {
  let f: { app?: string; version?: number; checksum?: string; profile?: Profile };
  try { f = JSON.parse(text); } catch { throw new Error("That text isn't a valid Quarter save."); }
  if (f?.app !== "mathpath" || !f.profile) throw new Error("That isn't a Quarter save.");
  if ((f.version ?? 0) > STORE_VERSION) throw new Error("This save is from a newer version of Quarter.");
  if (f.checksum !== checksum(JSON.stringify(f.profile))) throw new Error("This save looks damaged or has been edited.");
  return { ...f.profile, baselines: f.profile.baselines ?? [] };
}
