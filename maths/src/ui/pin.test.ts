import { beforeEach, describe, expect, it } from "vitest";
import { checkPin, clearAllPins, clearPin, hasPin, pinProblem, setPin } from "./pin";

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  // a Storage lookalike: methods, plus Object.keys() listing what is stored, as in a browser
  (globalThis as { localStorage?: unknown }).localStorage = new Proxy({} as Record<string, unknown>, {
    get: (_t, k) => (k === "getItem" ? (x: string) => mem.get(x) ?? null : k === "setItem" ? (x: string, v: string) => void mem.set(x, v) : k === "removeItem" ? (x: string) => void mem.delete(x) : undefined),
    ownKeys: () => [...mem.keys()],
    getOwnPropertyDescriptor: (_t, k) => (mem.has(String(k)) ? { enumerable: true, configurable: true, value: mem.get(String(k)) } : undefined),
  });
});

describe("the parents' area PIN", () => {
  it("accepts only 6 or 8 digits that are not obvious", () => {
    for (const bad of ["12345", "1234567", "12ab56", "111111", "123456", "654321", "00000000", "12345678", "", "1234 56"]) expect(pinProblem(bad), bad).not.toBeNull();
    for (const good of ["482915", "73019284", "902317"]) expect(pinProblem(good), good).toBeNull();
  });
  it("stores a salted hash and not the PIN", async () => {
    expect(await setPin("u1", "482915")).toBe(true);
    expect(hasPin("u1")).toBe(true);
    const raw = [...mem.values()].join(" ");
    expect(raw).not.toContain("482915");
    expect(await setPin("u2", "482915")).toBe(true);
    expect(mem.get("quarter.pin.u1")).not.toBe(mem.get("quarter.pin.u2")); // different salts
  });
  it("lets the right PIN in and keeps the wrong one out", async () => {
    await setPin("u1", "482915");
    expect(await checkPin("u1", "482915")).toEqual({ ok: true });
    expect(await checkPin("u1", "482916")).toMatchObject({ ok: false, triesLeft: 4 });
    expect(await checkPin("nobody", "482915")).toMatchObject({ ok: false });
  });
  it("locks for a minute after five wrong tries, then longer, and a right PIN resets the count", async () => {
    await setPin("u1", "482915");
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) await checkPin("u1", "000999", t);
    const fifth = await checkPin("u1", "000999", t);
    expect(fifth).toMatchObject({ ok: false, waitSeconds: 60, triesLeft: 0 });
    expect(await checkPin("u1", "482915", t + 1000)).toMatchObject({ ok: false, waitSeconds: 59 }); // even the right PIN waits
    expect(await checkPin("u1", "482915", t + 61_000)).toEqual({ ok: true });
    for (let i = 0; i < 3; i++) await checkPin("u1", "000999", t + 100_000);
    expect(await checkPin("u1", "000999", t + 100_000)).toMatchObject({ ok: false, triesLeft: 1 }); // after a good PIN the count restarted
    expect(await checkPin("u1", "000999", t + 200_000)).toMatchObject({ waitSeconds: 60 });
    for (let i = 0; i < 4; i++) await checkPin("u1", "000999", t + 300_000);
    expect(await checkPin("u1", "000999", t + 300_000)).toMatchObject({ ok: false, waitSeconds: 120 }); // longer the next time
  });
  it("is removed on sign-out", async () => {
    await setPin("u1", "482915"); await setPin("u2", "482915");
    clearPin("u1"); expect(hasPin("u1")).toBe(false); expect(hasPin("u2")).toBe(true);
    clearAllPins(); expect(hasPin("u2")).toBe(false);
  });
});
