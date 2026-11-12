import type { Profile } from "./progress";

export const STORE_VERSION = 1;
const KEY = "mathpath.v1";

export interface Store {
  version: number;
  profiles: Profile[];
  activeId: string | null;
}

export const emptyStore = (): Store => ({ version: STORE_VERSION, profiles: [], activeId: null });

/** Which child this browser tab is showing. A tab remembers its own choice (even after a reload), so two screens can show two children. */
const TAB_KEY = "mathpath.tab-active";
const tabChoice = (): string | null => { try { return sessionStorage.getItem(TAB_KEY); } catch { return null; } };

/**
 * Takes the changes another screen saved (the shared save changed under us), keeping what this screen is showing: its own child's
 * progress stays as it is here, and every other child comes from the other screen. Without this, the screen that saved last would
 * overwrite the other's work. Returns the same object when nothing differs.
 */
export function mergeFromOtherScreen(mine: Store, saved: Store): Store {
  const own = mine.activeId ?? mine.profiles[0]?.id;
  const ownProfile = mine.profiles.find((p) => p.id === own);
  const profiles = saved.profiles.map((p) => (p.id === own && ownProfile ? ownProfile : p));
  if (ownProfile && !profiles.some((p) => p.id === own)) profiles.push(ownProfile); // a child just added here stays
  const same = profiles.length === mine.profiles.length && profiles.every((p, i) => JSON.stringify(p) === JSON.stringify(mine.profiles[i]));
  return same ? mine : { ...mine, profiles };
}
export const parseStore = (raw: string | null): Store | null => {
  try { const s = raw ? (JSON.parse(raw) as Store) : null; return s?.version === STORE_VERSION && Array.isArray(s.profiles) ? { ...s, profiles: s.profiles.map((p) => ({ ...p, baselines: p.baselines ?? [] })) } : null; } catch { return null; }
};
export const STORE_KEY = KEY;

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const s = JSON.parse(raw) as Store;
    if (s?.version !== STORE_VERSION || !Array.isArray(s.profiles)) return emptyStore();
    const mine = tabChoice(), activeId = mine && s.profiles.some((p) => p.id === mine) ? mine : s.activeId;
    return { ...s, activeId, profiles: s.profiles.map((p) => ({ ...p, baselines: p.baselines ?? [] })) };
  } catch {
    return emptyStore();
  }
}

export function saveStore(s: Store): void {
  try {
    if (s.profiles.length) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
    try { if (s.activeId) sessionStorage.setItem(TAB_KEY, s.activeId); } catch { /* ignore */ }
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
  try { f = JSON.parse(text); } catch { throw new Error("That text isn't a valid quarter save."); }
  if (f?.app !== "mathpath" || !f.profile) throw new Error("That isn't a quarter save.");
  if ((f.version ?? 0) > STORE_VERSION) throw new Error("This save is from a newer version of quarter.");
  if (f.checksum !== checksum(JSON.stringify(f.profile))) throw new Error("This save looks damaged or has been edited.");
  return { ...f.profile, baselines: f.profile.baselines ?? [] };
}
