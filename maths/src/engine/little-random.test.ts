import { describe, expect, it } from "vitest";
import { Randomiser } from "./little-random";
import { afterEach, beforeEach } from "vitest";

describe("the Little ones randomiser", () => {
  it("is repeatable with a seed, and different without one", () => {
    const a = new Randomiser(5), b = new Randomiser(5), c = new Randomiser(6);
    const xs = Array.from({ length: 8 }, () => a.int(1, 100)), ys = Array.from({ length: 8 }, () => b.int(1, 100)), zs = Array.from({ length: 8 }, () => c.int(1, 100));
    expect(xs).toEqual(ys); expect(xs).not.toEqual(zs);
  });
  it("a bag gives every item once before any repeats, and never the same one twice in a row", () => {
    const r = new Randomiser(9), items = ["a", "b", "c", "d", "e"];
    let prev = "";
    for (let round = 0; round < 40; round++) {
      const seen = new Set<string>();
      for (let i = 0; i < items.length; i++) { const v = r.bag("k", items); expect(seen.has(v)).toBe(false); expect(v).not.toBe(prev); seen.add(v); prev = v; }
      expect(seen.size).toBe(items.length);
    }
  });
  it("intFresh avoids the last few, stays in range, and still covers the whole range", () => {
    const r = new Randomiser(3), seen = new Set<number>(), history: number[] = [];
    for (let i = 0; i < 600; i++) { const v = r.intFresh("n", 1, 10, 4); expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(10); expect(history.slice(-4)).not.toContain(v); history.push(v); seen.add(v); }
    expect(seen.size).toBe(10);
    const tiny = new Randomiser(1); let p = 0; for (let i = 0; i < 50; i++) { const v = tiny.intFresh("t", 1, 2, 4); expect(v).not.toBe(p); p = v; }   // a range of two just alternates
  });
  it("pickFresh gives different items each time while there are spare ones", () => {
    const r = new Randomiser(4), pool = Array.from({ length: 12 }, (_, i) => i);
    for (let i = 0; i < 100; i++) { const a = r.pickFresh("s", pool, 4), b = r.pickFresh("s", pool, 4); expect(new Set(a).size).toBe(4); expect(a.filter((x) => b.includes(x)).length).toBe(0); }
  });
  it("is fair: every item comes up about equally often", () => {
    const r = new Randomiser(21), counts = new Map<number, number>();
    for (let i = 0; i < 3000; i++) { const v = r.bag("f", [1, 2, 3, 4, 5, 6]); counts.set(v, (counts.get(v) ?? 0) + 1); }
    for (const c of counts.values()) expect(c).toBe(500);
  });
});

describe("the rotation carries on after the app is closed", () => {
  const store = new Map<string, string>(); const g = globalThis as Record<string, unknown>;
  beforeEach(() => { store.clear(); g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }; });
  afterEach(() => { delete g.localStorage; });
  it("a new visit continues the same bag: every picture is shown once before any comes back, even across restarts", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g"]; const seen: string[] = [];
    for (let visit = 0; visit < 7; visit++) { const r = new Randomiser(visit + 1, true); seen.push(r.bag("art", items)); }   // seven visits, one picture each
    expect(new Set(seen).size).toBe(7);
    const more: string[] = []; for (let visit = 7; visit < 14; visit++) { const r = new Randomiser(visit + 1, true); more.push(r.bag("art", items)); }
    expect(new Set(more).size).toBe(7); expect(more[0]).not.toBe(seen[6]);
  });
  it("copes with a smaller set of pictures than the saved bag", () => {
    const r1 = new Randomiser(1, true); r1.bag("art", ["a", "b", "c", "d", "e"]);
    const r2 = new Randomiser(2, true); const small = ["a", "b"]; const got = [r2.bag("art", small), r2.bag("art", small), r2.bag("art", small)];
    got.forEach((x) => expect(small).toContain(x));
  });
});
