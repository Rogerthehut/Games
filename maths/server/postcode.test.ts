import { describe, expect, it } from "vitest";
import { makeOutcodeLookup, outwardCode } from "./postcode";

describe("outward codes", () => {
  it("keeps only the first half of a postcode", () => {
    expect(outwardCode("br1 3ab")).toBe("BR1");
    expect(outwardCode("BR13AB")).toBe("BR1");
    expect(outwardCode("SW1A 1AA")).toBe("SW1A");
    expect(outwardCode(" m1 ")).toBe("M1");
    expect(outwardCode("CT10")).toBe("CT10");
  });
  it("rejects anything that is not a postcode", () => {
    for (const t of ["Bromley", "123", "BR", "BR1 3A", "A".repeat(12), ""]) expect(outwardCode(t), t).toBeNull();
  });
});

const ok = (result: unknown) => async () => ({ ok: true, status: 200, json: async () => ({ result }) });

describe("the outward code lookup", () => {
  it("returns the council areas, counties and country, with no repeats", async () => {
    const look = makeOutcodeLookup(ok({ admin_district: ["Bromley", "Lewisham"], admin_county: [], country: ["England", "England"] }));
    expect((await look("BR1"))?.areas).toEqual(["Bromley", "Lewisham", "England"]);
  });
  it("asks only for the outward code, and only once a day", async () => {
    const urls: string[] = []; let t = 0;
    const look = makeOutcodeLookup(async (u) => { urls.push(u); return { ok: true, status: 200, json: async () => ({ result: { admin_district: ["Kent"] } }) }; }, () => t);
    await look("TN1"); await look("TN1");
    expect(urls).toEqual(["https://api.postcodes.io/outcodes/TN1"]);
    t = 2 * 86_400_000; await look("TN1");
    expect(urls).toHaveLength(2);
  });
  it("says there are no areas for an unknown code, and null when the service is down", async () => {
    expect(await makeOutcodeLookup(async () => ({ ok: false, status: 404, json: async () => ({}) }))("ZZ99")).toEqual({ code: "ZZ99", areas: [] });
    expect(await makeOutcodeLookup(async () => { throw new Error("offline"); })("BR1")).toBeNull();
    expect(await makeOutcodeLookup(async () => ({ ok: false, status: 500, json: async () => ({}) }))("BR1")).toBeNull();
  });
  it("never calls out for something that is not an outward code", async () => {
    let called = false;
    const look = makeOutcodeLookup(async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; });
    expect(await look("../etc")).toBeNull();
    expect(called).toBe(false);
  });
});
