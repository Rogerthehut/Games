import { beforeEach, describe, expect, it } from "vitest";
import { forgetAgreement, hasAgreed, rememberAgreement } from "./agree";

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
});

describe("remembering the sign-up tick", () => {
  it("remembers it for the same version", () => { rememberAgreement("v1", 1000); expect(hasAgreed("v1", 2000)).toBe(true); });
  it("does not carry over to a newer version of the terms", () => { rememberAgreement("v1", 1000); expect(hasAgreed("v2", 2000)).toBe(false); });
  it("expires after an hour", () => { rememberAgreement("v1", 0); expect(hasAgreed("v1", 2 * 3_600_000)).toBe(false); });
  it("can be forgotten", () => { rememberAgreement("v1", 1000); forgetAgreement(); expect(hasAgreed("v1", 1001)).toBe(false); });
  it("is never believed if it is nonsense or from the future", () => {
    mem.set("quarter.agree.v1", "{oops"); expect(hasAgreed("v1")).toBe(false);
    rememberAgreement("v1", 5000); expect(hasAgreed("v1", 1000)).toBe(false);
  });
  it("copes with storage being blocked", () => {
    (globalThis as { localStorage?: unknown }).localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
    expect(() => rememberAgreement("v1")).not.toThrow();
    expect(hasAgreed("v1")).toBe(false);
  });
});
