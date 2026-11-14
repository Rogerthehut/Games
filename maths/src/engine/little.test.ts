import { describe, expect, it } from "vitest";
import { advance, countRound, COLOUR_PICTURES, coloursNeeded, DIGIT_PATHS, shapeRound, sumRound, waypoints } from "./little";
import { mulberry32 } from "./rng";

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
    for (const p of COLOUR_PICTURES) { expect(p.cells.length).toBe(p.size * p.size); for (const c of coloursNeeded(p)) expect(p.palette[c]).toBeTruthy(); }
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
    expect(r.yearLabel).toBe("Nursery"); expect(r.little.length).toBe(5); expect(r.little.find((x) => x.id === "count")!.plays).toBe(2); expect(r.little.find((x) => x.id === "trace")!.plays).toBe(0);
    const older = buildProgressReport(newProfile("Max", 6)); expect(older.little).toEqual([]); expect(older.yearLabel).toBe("Year 6");
  });
});
