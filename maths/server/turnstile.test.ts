import { describe, expect, it } from "vitest";
import { issuePass, passIsValid, turnstileConfig, verifyToken } from "./turnstile";

const cfg = turnstileConfig({ TURNSTILE_SECRET_KEY: "secret-one" } as NodeJS.ProcessEnv)!;

describe("Turnstile", () => {
  it("is off without a secret and clamps the pass lifetime", () => {
    expect(turnstileConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(turnstileConfig({ TURNSTILE_SECRET_KEY: "s", TURNSTILE_PASS_MINUTES: "9999" } as NodeJS.ProcessEnv)!.passMinutes).toBe(120);
    expect(turnstileConfig({ TURNSTILE_SECRET_KEY: "s", TURNSTILE_PASS_MINUTES: "1" } as NodeJS.ProcessEnv)!.passMinutes).toBe(5);
  });
  it("accepts a token only when Cloudflare says it is genuine, and sends the secret, token and address", async () => {
    let sent: URLSearchParams | null = null;
    const yes = async (_u: string, i: { body: URLSearchParams }) => { sent = i.body; return { ok: true, json: async () => ({ success: true }) }; };
    expect(await verifyToken("sec", "tok", "1.2.3.4", yes)).toBe(true);
    expect(sent!.get("secret")).toBe("sec"); expect(sent!.get("response")).toBe("tok"); expect(sent!.get("remoteip")).toBe("1.2.3.4");
    expect(await verifyToken("sec", "tok", "unknown", yes)).toBe(true);
    expect(sent!.get("remoteip")).toBeNull();
    expect(await verifyToken("sec", "tok", undefined, async () => ({ ok: true, json: async () => ({ success: false }) }))).toBe(false);
    expect(await verifyToken("sec", "tok", undefined, async () => ({ ok: false, json: async () => ({ success: true }) }))).toBe(false);
    expect(await verifyToken("sec", "tok", undefined, async () => { throw new Error("network"); })).toBe(false);
    expect(await verifyToken("sec", "", undefined, yes)).toBe(false);
    expect(await verifyToken("sec", "x".repeat(3000), undefined, yes)).toBe(false);
  });
  it("issues a pass that checks out, and only for a while", () => {
    const t = 1_700_000_000_000;
    const { pass, expiresInSeconds } = issuePass(cfg, t);
    expect(expiresInSeconds).toBe(1800);
    expect(passIsValid(cfg, pass, t + 1000)).toBe(true);
    expect(passIsValid(cfg, pass, t + 31 * 60_000)).toBe(false);
  });
  it("refuses forged, altered, borrowed and malformed passes", () => {
    const t = 1_700_000_000_000;
    const { pass } = issuePass(cfg, t);
    const [exp, nonce, sig] = pass.split(".");
    expect(passIsValid(cfg, `${Number(exp) + 99999}.${nonce}.${sig}`, t)).toBe(false);
    expect(passIsValid(cfg, `${exp}.${nonce}.${sig.slice(0, -2)}AA`, t)).toBe(false);
    expect(passIsValid({ ...cfg, secret: "secret-two" }, pass, t)).toBe(false);
    for (const bad of [undefined, null, "", "a.b", "a.b.c.d", "x".repeat(300), "1.2.3"]) expect(passIsValid(cfg, bad as string, t), String(bad)).toBe(false);
  });
  it("agrees between server instances that share the secret", () => {
    const other = turnstileConfig({ TURNSTILE_SECRET_KEY: "secret-one" } as NodeJS.ProcessEnv)!;
    expect(passIsValid(other, issuePass(cfg).pass)).toBe(true);
  });
});
