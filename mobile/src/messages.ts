/** What the web page can ask the app to do (the other half of src/native/bridge.ts in the web app). Everything is checked before it is used. */
export type FromWeb =
  | { type: "print"; html: string }
  | { type: "share-file"; filename: string; mime: string; base64: string }
  | { type: "open-url"; url: string }
  | { type: "haptic"; kind: "tap" | "soft" | "success" | "error" }
  /** Ask for Face ID / Touch ID (the Parents' area). The answer comes back as a `biometric-result` with the same id. */
  | { type: "biometric"; id: string; reason: string }
  /** The parent's practice reminders: weekly local notifications on chosen days (1 = Sunday ... 7 = Saturday) at a chosen time. */
  | { type: "reminders"; enabled: boolean; hour: number; minute: number; days: number[] }
  /** Show Apple's rating prompt (Apple decides whether it appears; at most three times a year). */
  | { type: "review" }
  /** Show, hide or update the app's own tab dock. */
  | { type: "dock"; visible: boolean; tab: string };

export const DOCK_TABS = [{ id: "today", label: "Today" }, { id: "skills", label: "Skills" }, { id: "plan", label: "Plan" }, { id: "search", label: "Search" }] as const;
export type DockTab = (typeof DOCK_TABS)[number]["id"];
export const isDockTab = (v: unknown): v is DockTab => DOCK_TABS.some((t) => t.id === v);
/** "none" is sent on screens that belong to none of the tabs (Me, the Parents' area): the dock shows with nothing selected. */
export const isDockSelection = (v: unknown): v is DockTab | "none" => v === "none" || isDockTab(v);

export const MAX_HTML = 3_000_000;
export const MAX_FILE_CHARS = 40_000_000; // about 30 MB of file in base64
/** Types of file the page may hand to the share sheet. */
export const ALLOWED_MIME = /^(application\/pdf|application\/json|text\/csv|text\/plain)(;.*)?$/i;

/** A file name that can't point anywhere else: no folders, no hidden files, no odd characters, never empty. */
export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[^\w.\- ]+/g, "_").replace(/^\.+/, "").trim().slice(0, 80);
  return clean || "quarter-file";
}

export function parseMessage(raw: string): FromWeb | null {
  let m: Record<string, unknown>;
  try { m = JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
  if (!m || typeof m !== "object") return null;
  switch (m.type) {
    case "print": return typeof m.html === "string" && m.html.length > 0 && m.html.length <= MAX_HTML ? { type: "print", html: m.html } : null;
    case "share-file": {
      if (typeof m.filename !== "string" || typeof m.mime !== "string" || typeof m.base64 !== "string") return null;
      if (!ALLOWED_MIME.test(m.mime) || m.base64.length === 0 || m.base64.length > MAX_FILE_CHARS || !/^[A-Za-z0-9+/]*={0,2}$/.test(m.base64)) return null;
      return { type: "share-file", filename: safeFilename(m.filename), mime: m.mime, base64: m.base64 };
    }
    case "open-url": return typeof m.url === "string" && /^https:\/\//i.test(m.url) && m.url.length < 2000 ? { type: "open-url", url: m.url } : null;
    case "haptic": return m.kind === "tap" || m.kind === "soft" || m.kind === "success" || m.kind === "error" ? { type: "haptic", kind: m.kind } : null;
    case "biometric": return typeof m.id === "string" && /^[\w-]{1,40}$/.test(m.id) && typeof m.reason === "string" ? { type: "biometric", id: m.id, reason: m.reason.replace(/[\r\n]+/g, " ").slice(0, 120) || "Unlock the Parents' area" } : null;
    case "reminders": {
      if (typeof m.enabled !== "boolean") return null;
      const int = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : null);
      const hour = int(m.hour, 0, 23), minute = int(m.minute, 0, 59);
      if (hour === null || minute === null || !Array.isArray(m.days) || m.days.length > 7) return null;
      const days = [...new Set(m.days.map((d) => int(d, 1, 7)))];
      if (days.includes(null)) return null;
      return { type: "reminders", enabled: m.enabled, hour, minute, days: (days as number[]).sort((a, b) => a - b) };
    }
    case "review": return { type: "review" };
    case "dock": return typeof m.visible === "boolean" && isDockSelection(m.tab) ? { type: "dock", visible: m.visible, tab: m.tab } : null;
    default: return null;
  }
}
