import { describe, expect, it } from "vitest";
import { Randomiser } from "./little-random";

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
