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
