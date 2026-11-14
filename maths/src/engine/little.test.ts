import { describe, expect, it } from "vitest";
import { advance, countRound, COLOUR_PICTURES, coloursNeeded, DIGIT_STROKES, shapeRound, sumRound, waypoints } from "./little";
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
      const strokes = DIGIT_STROKES[d]; expect(strokes.length).toBeGreaterThan(0);
      for (const s of strokes) {
        const pts = waypoints(s); expect(pts.length).toBeGreaterThan(8);
        for (const [x, y] of pts) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(100); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(140); }
        let next = 0; for (const p of pts) next = advance(pts, next, p); expect(next).toBe(pts.length);          // following the path exactly finishes it
        expect(advance(pts, 0, [pts[pts.length - 1][0], pts[pts.length - 1][1]])).toBeLessThan(pts.length);        // jumping to the end does not
      }
    }
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
