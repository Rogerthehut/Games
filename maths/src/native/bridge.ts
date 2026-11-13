/**
 * The link between the web app and the quarter iPhone/iPad app (the Expo shell in /mobile), which shows this same app in a web view.
 * A web view can't print or download files by itself, so in the app those jobs are handed to the phone: the shell announces itself
 * with `window.__quarterNative` and listens for the messages below. In an ordinary browser nothing here changes anything.
 */
export interface NativeInfo { platform: "ios" | "android"; version: string; tablet: boolean; /** What this build of the app can do, so a page never asks an older app for something it doesn't have. */ features?: string[] }

/** What the shell sends back to the page. */
export type FromNative =
  | { type: "print-done" }
  | { type: "biometric-result"; id: string; result: BiometricResult }
  | { type: "reminders-result"; result: "scheduled" | "off" | "denied" };
export type BiometricResult = "ok" | "cancelled" | "failed" | "unavailable";
/** What the page asks the shell to do. */
export type ToNative =
  | { type: "print"; html: string }
  | { type: "share-file"; filename: string; mime: string; base64: string }
  | { type: "open-url"; url: string }
  | { type: "haptic"; kind: "tap" | "soft" | "success" | "error" }
  | { type: "biometric"; id: string; reason: string }
  | { type: "reminders"; enabled: boolean; hour: number; minute: number; days: number[] }
  | { type: "review" };

interface NativeWindow { __quarterNative?: NativeInfo; ReactNativeWebView?: { postMessage(message: string): void } }
const win = (): (NativeWindow & Window) | null => (typeof window === "undefined" ? null : (window as unknown as NativeWindow & Window));

export const nativeInfo = (): NativeInfo | null => win()?.__quarterNative ?? null;
/** True inside the quarter app, where payments, printing and file saving work differently. */
export const isNativeApp = (): boolean => { const w = win(); return !!w?.__quarterNative && typeof w.ReactNativeWebView?.postMessage === "function"; };

/** True inside the app, and only when this build of the app has the feature (see FEATURES in mobile/src/App.tsx). */
export const nativeHas = (feature: string): boolean => isNativeApp() && !!nativeInfo()?.features?.includes(feature);

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

// ---- things only the phone can do. Each is a no-op, or answers "unavailable", in a browser or in an app built before the feature.
const HAPTICS_KEY = "quarter.haptics";
/** A short tap on the phone (on by default in the app; a grown-up can turn it off). */
export function haptic(kind: "tap" | "soft" | "success" | "error"): void {
  if (!nativeHas("haptics2") || !hapticsOn()) return;
  toNative({ type: "haptic", kind });
}
export function hapticsOn(): boolean { try { return localStorage.getItem(HAPTICS_KEY) !== "off"; } catch { return true; } }
export function setHapticsOn(on: boolean): void { try { if (on) localStorage.removeItem(HAPTICS_KEY); else localStorage.setItem(HAPTICS_KEY, "off"); } catch { /* private mode */ } }

/** A light tap for every button, key and tab press inside the app. Installed once at start; does nothing in a browser or when haptics are off. */
let buttonHaptics = false;
export function installButtonHaptics(): void {
  if (buttonHaptics || typeof document === "undefined") return;
  buttonHaptics = true;
  document.addEventListener("click", (e) => {
    const t = (e.target as Element | null)?.closest?.("button, [role=button], [role=tab], [role=radio], [role=menuitem], summary");
    if (!t || (t as HTMLButtonElement).disabled || t.getAttribute("aria-disabled") === "true") return;
    haptic("tap");
  }, true);
}

const waiting = new Map<string, (r: BiometricResult) => void>();
/** Asks for Face ID or Touch ID. Resolves "unavailable" at once outside the app or without the feature, and "cancelled" if nothing answers in a minute. */
export function biometric(reason: string): Promise<BiometricResult> {
  if (!nativeHas("biometric")) return Promise.resolve("unavailable");
  const id = Math.random().toString(36).slice(2, 12);
  return new Promise((resolve) => {
    const done = (r: BiometricResult) => { clearTimeout(t); waiting.delete(id); resolve(r); };
    const t = setTimeout(() => done("cancelled"), 60_000);
    waiting.set(id, done);
    if (!toNative({ type: "biometric", id, reason })) done("unavailable");
  });
}

let remindersWaiting: ((r: "scheduled" | "off" | "denied" | "unsupported") => void) | null = null;
/** Sets (or clears) the weekly practice reminders on this phone. Days: 1 Sunday to 7 Saturday. */
export function setReminders(r: { enabled: boolean; hour: number; minute: number; days: number[] }): Promise<"scheduled" | "off" | "denied" | "unsupported"> {
  if (!nativeHas("reminders")) return Promise.resolve("unsupported");
  return new Promise((resolve) => {
    const t = setTimeout(() => { remindersWaiting = null; resolve("off"); }, 30_000);
    remindersWaiting = (x) => { clearTimeout(t); remindersWaiting = null; resolve(x); };
    toNative({ type: "reminders", ...r });
  });
}

/** Asks Apple to show its rating prompt (it decides whether to). Only ever for a grown-up, never for a child. */
export function askForReview(): void { if (nativeHas("review")) toNative({ type: "review" }); }

/** Messages from the app: when the print sheet closes, behave as a browser does after printing; and the answers to the questions above. */
export function onNativeMessage(raw: unknown): void {
  let m: FromNative | null = null;
  try { m = JSON.parse(String(raw)) as FromNative; } catch { return; }
  if (m?.type === "print-done") dispatchEvent(new Event("afterprint"));
  else if (m?.type === "biometric-result") waiting.get(m.id)?.(m.result);
  else if (m?.type === "reminders-result") remindersWaiting?.(m.result);
}
if (typeof window !== "undefined") {
  // iOS delivers messages on `window`; Android on `document`
  window.addEventListener("message", (e) => onNativeMessage((e as MessageEvent).data));
  document.addEventListener("message", (e) => onNativeMessage((e as MessageEvent).data));
}
