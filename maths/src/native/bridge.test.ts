import { afterEach, describe, expect, it, vi } from "vitest";
import { isNativeApp, nativeInfo, onNativeMessage, printPage, saveFile, toNative } from "./bridge";

const sent: string[] = [];
const app = () => { (globalThis as { window?: unknown }).window = { __quarterNative: { platform: "ios", version: "1.0.0", tablet: true }, ReactNativeWebView: { postMessage: (m: string) => sent.push(m) }, print: vi.fn() }; };
afterEach(() => { delete (globalThis as { window?: unknown }).window; delete (globalThis as { dispatchEvent?: unknown }).dispatchEvent; sent.length = 0; });

describe("the link to the quarter app", () => {
  it("does nothing in an ordinary browser", () => {
    (globalThis as { window?: unknown }).window = { print: vi.fn() };
    expect(isNativeApp()).toBe(false); expect(nativeInfo()).toBeNull(); expect(toNative({ type: "haptic", kind: "tap" })).toBe(false);
    printPage(); expect((window as unknown as { print: () => void }).print).toHaveBeenCalledTimes(1);
  });
  it("knows it is in the app only when the shell has announced itself and can receive messages", () => {
    app(); expect(isNativeApp()).toBe(true); expect(nativeInfo()).toMatchObject({ platform: "ios", tablet: true });
    (globalThis as { window?: unknown }).window = { __quarterNative: { platform: "ios", version: "1", tablet: false } }; // no way to send: treat as a browser
    expect(isNativeApp()).toBe(false);
  });
  it("asks the app to print, sending the page, instead of calling the browser's print", () => {
    app(); printPage(() => "<html>paper</html>");
    expect(sent.map((m) => JSON.parse(m))).toEqual([{ type: "print", html: "<html>paper</html>" }]);
    expect((window as unknown as { print: () => void }).print).not.toHaveBeenCalled();
  });
  it("hands a saved file to the app as base64, with its name and type", async () => {
    app(); await saveFile("report.csv", "a,b\n1,2", "text/csv");
    const m = JSON.parse(sent[0]);
    expect(m).toMatchObject({ type: "share-file", filename: "report.csv", mime: "text/csv" });
    expect(Buffer.from(m.base64, "base64").toString()).toBe("a,b\n1,2");
  });
  it("copes with a large file", async () => {
    app(); await saveFile("big.pdf", new Blob([new Uint8Array(300_000).fill(7)], { type: "application/pdf" }));
    expect(Buffer.from(JSON.parse(sent[0]).base64, "base64").length).toBe(300_000);
  });
  it("turns the app's 'print finished' into the browser's afterprint event, and ignores anything else", () => {
    const events: string[] = []; (globalThis as { dispatchEvent?: unknown }).dispatchEvent = (e: Event) => { events.push(e.type); return true; };
    (globalThis as { Event?: unknown }).Event ??= class { constructor(public type: string) {} };
    onNativeMessage(JSON.stringify({ type: "print-done" })); onNativeMessage("not json"); onNativeMessage(JSON.stringify({ type: "other" }));
    expect(events).toEqual(["afterprint"]);
  });
});
