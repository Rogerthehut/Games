/** What the web page can ask the app to do (the other half of src/native/bridge.ts in the web app). Everything is checked before it is used. */
export type FromWeb =
  | { type: "print"; html: string }
  | { type: "share-file"; filename: string; mime: string; base64: string }
  | { type: "open-url"; url: string }
  | { type: "haptic"; kind: "tap" | "success" | "error" };

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
    case "haptic": return m.kind === "tap" || m.kind === "success" || m.kind === "error" ? { type: "haptic", kind: m.kind } : null;
    default: return null;
  }
}
