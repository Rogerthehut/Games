import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySvix } from "./svix";

// the worked example from Svix's own documentation
const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw", ID = "msg_p5jXN8AQM9LWM0D4loKWxJek", TS = "1614265330", BODY = '{"test": 2432232314}', SIG = "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=";
const at = Number(TS) * 1000;
const sign = (secret: string, id: string, ts: string, body: string) => `v1,${createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${id}.${ts}.${body}`).digest("base64")}`;

describe("verifySvix", () => {
  it("accepts the documented example", () => expect(verifySvix(SECRET, { id: ID, timestamp: TS, signature: SIG }, BODY, at)).toBe(true));
  it("rejects a changed body, id, timestamp or secret", () => {
    expect(verifySvix(SECRET, { id: ID, timestamp: TS, signature: SIG }, BODY + " ", at)).toBe(false);
    expect(verifySvix(SECRET, { id: ID + "x", timestamp: TS, signature: SIG }, BODY, at)).toBe(false);
    expect(verifySvix(SECRET, { id: ID, timestamp: String(Number(TS) + 1), signature: SIG }, BODY, at)).toBe(false);
    expect(verifySvix("whsec_" + Buffer.from("another secret entirely!").toString("base64"), { id: ID, timestamp: TS, signature: SIG }, BODY, at)).toBe(false);
  });
  it("rejects missing headers, a bad secret format and non-v1 signatures", () => {
    expect(verifySvix(SECRET, { id: ID, timestamp: TS }, BODY, at)).toBe(false);
    expect(verifySvix("not-a-secret", { id: ID, timestamp: TS, signature: SIG }, BODY, at)).toBe(false);
    expect(verifySvix(SECRET, { id: ID, timestamp: TS, signature: SIG.replace("v1", "v2") }, BODY, at)).toBe(false);
    expect(verifySvix(SECRET, { id: ID, timestamp: "abc", signature: SIG }, BODY, at)).toBe(false);
  });
  it("refuses an old or future timestamp, so a recorded request can't be replayed", () => {
    expect(verifySvix(SECRET, { id: ID, timestamp: TS, signature: SIG }, BODY, at + 301_000)).toBe(false);
    expect(verifySvix(SECRET, { id: ID, timestamp: TS, signature: SIG }, BODY, at - 301_000)).toBe(false);
    expect(verifySvix(SECRET, { id: ID, timestamp: TS, signature: SIG }, BODY, at + 299_000)).toBe(true);
  });
  it("accepts one good signature among several (a secret being rotated)", () => {
    const other = sign("whsec_" + Buffer.from("an old secret 0123456789").toString("base64"), ID, TS, BODY);
    expect(verifySvix(SECRET, { id: ID, timestamp: TS, signature: `${other} ${SIG}` }, BODY, at)).toBe(true);
    expect(verifySvix(SECRET, { id: ID, timestamp: TS, signature: other }, BODY, at)).toBe(false);
  });
});
