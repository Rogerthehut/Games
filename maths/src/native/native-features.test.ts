import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { biometric, haptic, hasNativeDock, setDock, hapticsOn, nativeHas, onNativeMessage, setHapticsOn, setReminders } from "./bridge";
import { clearDeviceSettings, faceIdOn, loadReminders, maybeAskForReview, saveReminders, setFaceIdOn } from "./device-settings";

const sent: Record<string, unknown>[] = [];
const store = new Map<string, string>();
const g = globalThis as Record<string, unknown>;
const app = (features: string[] = ["haptics2", "biometric", "reminders", "review"]) => {
  g.window = { __quarterNative: { platform: "ios", version: "1.1.0", tablet: true, features }, ReactNativeWebView: { postMessage: (m: string) => sent.push(JSON.parse(m)) } };
};
beforeEach(() => { store.clear(); g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }; });
afterEach(() => { delete g.window; delete g.localStorage; sent.length = 0; vi.useRealTimers(); });

describe("the app's own tab dock", () => {
  it("is only used by a build that has it, and only a known tab navigates", () => {
    setDock(true, "today"); expect(sent).toEqual([]);                    // a browser
    app(["review"]); expect(hasNativeDock()).toBe(false); setDock(true, "today"); expect(sent).toEqual([]);   // an older app: the page keeps its own tab bar
    app(["dock"]); expect(hasNativeDock()).toBe(true); setDock(true, "skills"); expect(sent).toEqual([{ type: "dock", visible: true, tab: "skills" }]);
    const seen: string[] = []; g.dispatchEvent = (e: CustomEvent) => seen.push(e.detail); g.CustomEvent = class { detail: unknown; constructor(_t: string, o: { detail: unknown }) { this.detail = o.detail; } };
    onNativeMessage(JSON.stringify({ type: "navigate", tab: "plan" })); expect(seen).toEqual(["plan"]);
    delete g.dispatchEvent; delete g.CustomEvent;
  });
});

describe("features of the app", () => {
  it("are only asked of an app build that has them", async () => {
    expect(nativeHas("biometric")).toBe(false); expect(await biometric("x")).toBe("unavailable");   // a browser
    app(["review"]);                                                                                // an app built before Face ID existed
    expect(nativeHas("biometric")).toBe(false); expect(await biometric("x")).toBe("unavailable"); expect(await setReminders({ enabled: true, hour: 9, minute: 0, days: [2] })).toBe("unsupported");
    haptic("success"); expect(sent).toEqual([]);
  });
  it("sends haptics only when switched on, and a grown-up can switch them off", () => {
    app(); expect(hapticsOn()).toBe(true); haptic("soft"); setHapticsOn(false); expect(hapticsOn()).toBe(false); haptic("tap"); setHapticsOn(true); haptic("success");
    expect(sent).toEqual([{ type: "haptic", kind: "soft" }, { type: "haptic", kind: "success" }]);
  });
  it("matches a Face ID answer to its question by id, and ignores answers it didn't ask for", async () => {
    app(); const p = biometric("Open the Parents' area");
    const ask = sent[0] as { type: string; id: string; reason: string };
    expect(ask).toMatchObject({ type: "biometric", reason: "Open the Parents' area" });
    onNativeMessage(JSON.stringify({ type: "biometric-result", id: "someone-else", result: "ok" }));   // not ours: must not unlock anything
    onNativeMessage(JSON.stringify({ type: "biometric-result", id: ask.id, result: "failed" }));
    expect(await p).toBe("failed");
    onNativeMessage(JSON.stringify({ type: "biometric-result", id: ask.id, result: "ok" }));          // a second answer to the same question does nothing
  });
  it("gives up on Face ID after a minute with no answer", async () => {
    vi.useFakeTimers(); app(); const p = biometric("x"); await vi.advanceTimersByTimeAsync(61_000); expect(await p).toBe("cancelled");
  });
  it("sets reminders and reports what the phone said", async () => {
    app(); const p = setReminders({ enabled: true, hour: 16, minute: 30, days: [2, 3] });
    expect(sent[0]).toEqual({ type: "reminders", enabled: true, hour: 16, minute: 30, days: [2, 3] });
    onNativeMessage(JSON.stringify({ type: "reminders-result", result: "denied" }));
    expect(await p).toBe("denied");
  });
});

describe("settings kept on the device", () => {
  it("remember Face ID and reminders, and forget both on sign-out (cancelling the reminders)", () => {
    app(); setFaceIdOn(true); saveReminders({ enabled: true, hour: 8, minute: 15, days: [1, 7] });
    expect(faceIdOn()).toBe(true); expect(loadReminders()).toEqual({ enabled: true, hour: 8, minute: 15, days: [1, 7] });
    clearDeviceSettings();
    expect(faceIdOn()).toBe(false); expect(loadReminders().enabled).toBe(false);
    expect(sent).toContainEqual({ type: "reminders", enabled: false, hour: 16, minute: 30, days: [2, 3, 4, 5, 6] });
  });
  it("fall back to sensible defaults if what was saved is damaged", () => {
    store.set("quarter.reminders", "{not json"); expect(loadReminders()).toMatchObject({ enabled: false, hour: 16, minute: 30 });
    store.set("quarter.reminders", JSON.stringify({ enabled: true, hour: "x", minute: 0, days: [1] })); expect(loadReminders().enabled).toBe(false);
    store.set("quarter.reminders", JSON.stringify({ enabled: true, hour: 9, minute: 0, days: [0, 3, 9, "a"] })); expect(loadReminders().days).toEqual([3]);
  });
});

describe("the rating prompt", () => {
  it("is for a grown-up who has used it a fair bit, and at most every 90 days", () => {
    app(); const day = 86_400_000, t0 = Date.UTC(2026, 11, 1);
    expect(maybeAskForReview(3, t0)).toBe(false);
    expect(maybeAskForReview(12, t0)).toBe(true);
    expect(maybeAskForReview(40, t0 + 30 * day)).toBe(false);
    expect(maybeAskForReview(40, t0 + 91 * day)).toBe(true);
    expect(sent.filter((m) => m.type === "review")).toHaveLength(2);
  });
  it("does nothing in an app build without it", () => { app(["haptics2"]); expect(maybeAskForReview(50)).toBe(false); expect(sent).toEqual([]); expect(store.has("quarter.review.at")).toBe(false); });
});
