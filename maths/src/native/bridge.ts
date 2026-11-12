/**
 * The link between the web app and the quarter iPhone/iPad app (the Expo shell in /mobile), which shows this same app in a web view.
 * A web view can't print or download files by itself, so in the app those jobs are handed to the phone: the shell announces itself
 * with `window.__quarterNative` and listens for the messages below. In an ordinary browser nothing here changes anything.
 */
export interface NativeInfo { platform: "ios" | "android"; version: string; tablet: boolean }

/** What the shell sends back to the page. */
export type FromNative = { type: "print-done" };
/** What the page asks the shell to do. */
export type ToNative =
  | { type: "print"; html: string }
  | { type: "share-file"; filename: string; mime: string; base64: string }
  | { type: "open-url"; url: string }
  | { type: "haptic"; kind: "tap" | "success" | "error" };

interface NativeWindow { __quarterNative?: NativeInfo; ReactNativeWebView?: { postMessage(message: string): void } }
const win = (): (NativeWindow & Window) | null => (typeof window === "undefined" ? null : (window as unknown as NativeWindow & Window));

export const nativeInfo = (): NativeInfo | null => win()?.__quarterNative ?? null;
/** True inside the quarter app, where payments, printing and file saving work differently. */
export const isNativeApp = (): boolean => { const w = win(); return !!w?.__quarterNative && typeof w.ReactNativeWebView?.postMessage === "function"; };

/** Sends a message to the app. False when this isn't running inside it. */
export function toNative(message: ToNative): boolean {
  const w = win();
  if (!isNativeApp() || !w) return false;
  w.ReactNativeWebView!.postMessage(JSON.stringify(message));
  return true;
}

/** The page as it is now, with its own address as the base so the app's print preview can find the styles. */
export function pageSnapshot(doc: Document = document, base = location.origin): string {
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script").forEach((s) => s.remove());
  const head = clone.querySelector("head");
  if (head && !head.querySelector("base")) { const b = doc.createElement("base"); b.setAttribute("href", `${base}/`); head.prepend(b); }
  return `<!doctype html>${clone.outerHTML}`;
}

/** Opens the print dialog, or the iPad/iPhone print sheet in the app (where saving a PDF is on the share button). */
export function printPage(snapshot: () => string = pageSnapshot): void {
  if (isNativeApp()) { toNative({ type: "print", html: snapshot() }); return; }
  window.print();
}

/** Base64 of a file, in chunks so a large PDF doesn't overflow the call stack. */
async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Saves a file: a download in a browser, the share sheet (Save to Files, AirDrop, Mail...) in the app. */
export async function saveFile(filename: string, content: Blob | string, type = "application/octet-stream"): Promise<void> {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content;
  if (isNativeApp()) { toNative({ type: "share-file", filename, mime: blob.type || type, base64: await toBase64(blob) }); return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Messages from the app: when the print sheet closes, behave as a browser does after printing. */
export function onNativeMessage(raw: unknown): void {
  let m: FromNative | null = null;
  try { m = JSON.parse(String(raw)) as FromNative; } catch { return; }
  if (m?.type === "print-done") dispatchEvent(new Event("afterprint"));
}
if (typeof window !== "undefined") {
  // iOS delivers messages on `window`; Android on `document`
  window.addEventListener("message", (e) => onNativeMessage((e as MessageEvent).data));
  document.addEventListener("message", (e) => onNativeMessage((e as MessageEvent).data));
}
