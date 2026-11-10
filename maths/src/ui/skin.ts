import type { Profile } from "../engine/progress";

export type Skin = "explorer" | "navigator" | "scholar";
export type ThemeChoice = "auto" | "light" | "dark";

/** Years 3-6 get the playful skin, 7-9 the in-between one, 10 and up the calm one. */
export const skinForYear = (year: number): Skin => (year <= 6 ? "explorer" : year <= 9 ? "navigator" : "scholar");

export function resolveSkin(p?: Pick<Profile, "year" | "skin">): Skin {
  if (!p) return "navigator";
  return !p.skin || p.skin === "auto" ? skinForYear(p.year) : p.skin;
}

const THEME_KEY = "mathpath.theme";

/** Light unless the person has chosen Dark or Auto (which follows the device). */
export function getTheme(): ThemeChoice {
  try { const v = localStorage.getItem(THEME_KEY); return v === "dark" || v === "auto" ? v : "light"; } catch { return "light"; }
}

export function applyTheme(t: ThemeChoice): void {
  const root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t); // no attribute means follow the device
  try { localStorage.setItem(THEME_KEY, t); } catch { /* not persisted */ }
}

export const applySkin = (s: Skin) => { document.documentElement.dataset.skin = s; };
