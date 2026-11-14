import { describe, expect, it } from "vitest";
import { advance, shapeCount, shapesFor, countRound, DIGIT_PATHS, shapeRound, sumRound, waypoints } from "./little";
import { mulberry32 } from "./rng";
import { artFor, artNumbers, COLOUR_ART } from "./little-art";

describe("little ones activities", () => {
  it("counting and sums stay within the range for the stage", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 300; i++) {
      expect(countRound(r, 5).n).toBeGreaterThanOrEqual(1); expect(countRound(r, 5).n).toBeLessThanOrEqual(5);
      const s = sumRound(r, i % 2 ? 5 : 10), max = i % 2 ? 5 : 10;
      expect(s.start).toBeGreaterThanOrEqual(1); expect(s.change).toBeGreaterThanOrEqual(1); expect(s.result).toBeGreaterThanOrEqual(0); expect(s.result).toBeLessThanOrEqual(max);
      expect(s.op === "add" ? s.start + s.change : s.start - s.change).toBe(s.result);
    }
  });
  it("every digit 0 to 9 has a stroke that a finger can follow from start to end", () => {
    for (let d = 0; d <= 9; d++) {
      const strokes = [DIGIT_PATHS[d]]; expect(strokes[0].length).toBeGreaterThan(20);
      for (const s of strokes) {
        const pts = waypoints(s); expect(pts.length).toBeGreaterThan(8);
        for (const [x, y] of pts) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(100); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(140); }
        let next = 0; for (const p of pts) next = advance(pts, next, p); expect(next).toBe(pts.length);          // following the path exactly finishes it
        expect(advance(pts, 0, [pts[pts.length - 1][0], pts[pts.length - 1][1]])).toBeLessThan(pts.length);        // jumping to the end does not
      }
    }
  });
  it("the round digits flow: no sharp turns along 0, 6, 8, 9 and the bowls of the 3 and 5", () => {
    const worst = (pts: [number, number][]) => { let w = 0; for (let i = 2; i < pts.length; i++) { const a = Math.atan2(pts[i - 1][1] - pts[i - 2][1], pts[i - 1][0] - pts[i - 2][0]), b = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]); let d = Math.abs(b - a); if (d > Math.PI) d = 2 * Math.PI - d; w = Math.max(w, d); } return (w * 180) / Math.PI; };
    for (const d of [0, 6, 8, 9]) expect(worst(DIGIT_PATHS[d])).toBeLessThan(40);
    expect(worst(DIGIT_PATHS[5].slice(Math.floor(DIGIT_PATHS[5].length * 0.55)))).toBeLessThan(40);   // the bowl of the 5 (its top corner is meant to be sharp)
    expect(worst(DIGIT_PATHS[3].slice(0, 43))).toBeLessThan(40); expect(worst(DIGIT_PATHS[3].slice(44))).toBeLessThan(40);   // each bowl of the 3 is smooth (they meet at a point, as a 3 does)
  });
  it("shape rounds have no repeats, and each picture uses only coloured numbers from its palette", () => {
    const r = mulberry32(3); for (let n = 2; n <= 4; n++) { const s = shapeRound(r, n); expect(new Set(s).size).toBe(n); }
    for (const stage of ["nursery", "reception", "older"] as const) { const pool = shapesFor(stage); expect(pool.length).toBeGreaterThanOrEqual(shapeCount(stage)); const s = shapeRound(r, shapeCount(stage), pool); expect(new Set(s).size).toBe(shapeCount(stage)); s.forEach((k) => expect(pool).toContain(k)); }
    expect(shapesFor("older").length).toBe(15);
    for (const stage of ["nursery", "reception", "older"] as const) expect(artFor(stage).length).toBeGreaterThanOrEqual(2);
    for (const a of COLOUR_ART) {
      expect(artNumbers(a).length).toBeGreaterThanOrEqual(2);
      for (const r of a.regions) { expect(a.palette[r.n]).toBeTruthy(); expect(r.d).not.toMatch(/NaN|undefined/); expect(r.d.length).toBeGreaterThan(8); }
      for (const d of a.decor) expect(d.d).not.toMatch(/NaN|undefined/);
      for (const n of Object.keys(a.palette)) expect(artNumbers(a)).toContain(+n);     // no colour in the palette that the picture never uses
    }
  });
});

import { buildProgressReport } from "./progress-report";
import { newProfile } from "./progress";
import { LITTLE_ACTIVITIES } from "./little";
describe("Little ones in the parent report and notes", () => {
  it("every activity has notes for a grown-up", () => {
    for (const a of LITTLE_ACTIVITIES) for (const k of ["builds", "teach", "help", "ask", "skill"] as const) expect(a[k].length).toBeGreaterThan(k === "skill" ? 4 : 20);
  });
  it("the report lists the activities for early learners, with how often each was finished, and not for others", () => {
    const kid = newProfile("Bo", 1); kid.early = "nursery"; kid.little = { count: 2 };
    const r = buildProgressReport(kid);
    expect(r.yearLabel).toBe("Nursery"); expect(r.little.length).toBe(7); expect(r.little.find((x) => x.id === "count")!.plays).toBe(2); expect(r.little.find((x) => x.id === "trace")!.plays).toBe(0);
    const older = buildProgressReport(newProfile("Max", 6)); expect(older.little).toEqual([]); expect(older.yearLabel).toBe("Year 6");
  });
});

import { Randomiser } from "./little-random";
import { buildTarget, digitsOf, findTargets, hundredMax, littleFor, readOptions, splitTens } from "./little";
describe("numbers to 100", () => {
  it("ranges follow the stage, and nursery doesn't get tens and ones", () => {
    expect([hundredMax("nursery"), hundredMax("reception"), hundredMax("older")]).toEqual([10, 20, 100]);
    expect(littleFor("nursery").map((a) => a.id)).not.toContain("tens"); expect(littleFor("reception").map((a) => a.id)).toContain("tens"); expect(littleFor(undefined).length).toBe(8);
  });
  it("targets are different and in range; build targets and read options are sound", () => {
    const r = mulberry32(11);
    for (let i = 0; i < 200; i++) {
      const t = findTargets(r, 100, 5); expect(new Set(t).size).toBe(5); t.forEach((n) => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(100); });
      const n = buildTarget(r, i % 2 ? "reception" : "older"); expect(n).toBeGreaterThanOrEqual(11); expect(n).toBeLessThanOrEqual(i % 2 ? 30 : 99);
      const o = readOptions(r, n); expect(o.length).toBe(3); expect(new Set(o).size).toBe(3); expect(o).toContain(n); o.forEach((x) => { expect(x).toBeGreaterThanOrEqual(10); expect(x).toBeLessThanOrEqual(99); });
    }
    expect(splitTens(47)).toEqual({ tens: 4, ones: 7 }); expect(digitsOf(47)).toEqual([4, 7]);
  });
});

import { isSnap, snapDeck, snapMax, SNAP_THINGS, type SnapCard } from "./little";
describe("Snap", () => {
  it("what counts as a snap depends on the stage", () => {
    const lemons3: SnapCard = { kind: "objects", thing: "lemon", n: 3 }, apples3: SnapCard = { kind: "objects", thing: "apple", n: 3 }, num3: SnapCard = { kind: "num", n: 3 }, sum: SnapCard = { kind: "sum", a: 2, b: 1, n: 3 };
    expect(isSnap(lemons3, { ...lemons3 }, "nursery")).toBe(true); expect(isSnap(lemons3, apples3, "nursery")).toBe(false); expect(isSnap(lemons3, num3, "nursery")).toBe(false);
    expect(isSnap(lemons3, apples3, "reception")).toBe(true); expect(isSnap(lemons3, num3, "reception")).toBe(true); expect(isSnap(num3, sum, "reception")).toBe(false);
    expect(isSnap(num3, sum, "older")).toBe(true); expect(isSnap(lemons3, { kind: "num", n: 4 }, "older")).toBe(false); expect(isSnap(undefined, num3, "older")).toBe(false);
  });
  it("a deck has exactly the planned snaps, none next to each other, and every card is in range", () => {
    for (const stage of ["nursery", "reception", "older"] as const) {
      const r = new Randomiser(17 + stage.length);
      for (let k = 0; k < 120; k++) {
        const max = snapMax(stage), numbers = Array.from({ length: max }, (_, i) => i + 1), deck = snapDeck(r.rng, stage, 14, 4, numbers, SNAP_THINGS.slice(0, 5));
        expect(deck.length).toBe(14);
        const hits = deck.map((c, i) => isSnap(deck[i - 1], c, stage));
        expect(hits.filter(Boolean).length).toBe(4); hits.forEach((h, i) => { if (h) expect(hits[i + 1] ?? false).toBe(false); });
        deck.forEach((c) => { expect(c.n).toBeGreaterThanOrEqual(1); expect(c.n).toBeLessThanOrEqual(max); if (c.kind === "sum") expect(c.a + c.b).toBe(c.n); if (stage === "nursery") expect(c.kind).toBe("objects"); if (stage !== "older") expect(c.kind).not.toBe("sum"); });
      }
    }
  });
});
