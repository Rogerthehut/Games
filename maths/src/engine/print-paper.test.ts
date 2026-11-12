import { describe, expect, it } from "vitest";
import { PAPERS } from "./mock";
import { PRINTABLE, buildPrintPaper, clampNumber, isPrintable } from "./print-paper";

describe("printable papers", () => {
  it("offers the written-answer maths papers and not the multiple-choice reasoning ones", () => {
    expect(PRINTABLE).toEqual(expect.arrayContaining(["maths", "quest-maths", "maths-50", "maths-60"]));
    for (const k of ["reasoning", "both", "ripon"] as const) expect(isPrintable(k), k).toBe(false);
  });
  it("makes exactly the same paper from the same number, and a different one from another", () => {
    const a = buildPrintPaper("maths", 214), b = buildPrintPaper("maths", 214), c = buildPrintPaper("maths", 215);
    expect(a.questions.map((q) => q.question.prompt)).toEqual(b.questions.map((q) => q.question.prompt));
    expect(a.questions.map((q) => q.question.prompt)).not.toEqual(c.questions.map((q) => q.question.prompt));
  });
  it("has the right number of questions, one mark each, and every question has an answer and steps", () => {
    for (const k of PRINTABLE) {
      const p = buildPrintPaper(k, 7);
      expect(p.questions.length, k).toBe(PAPERS[k].total);
      expect(p.marks).toBe(p.questions.length);
      for (const q of p.questions) { expect(q.question.shown.length, `${k} ${q.n}`).toBeGreaterThan(0); expect(q.question.solution.length, `${k} ${q.n}`).toBeGreaterThan(0); expect(q.question.answer.kind, `${k} ${q.n}`).not.toBe("choice"); }
    }
  });
  it("keeps paper numbers in range", () => { expect(clampNumber(0)).toBe(1); expect(clampNumber(99999)).toBe(9999); expect(clampNumber(NaN)).toBe(1); expect(clampNumber(12.7)).toBe(12); });
});
