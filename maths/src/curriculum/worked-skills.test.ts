import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from ".";
import { mulberry32 } from "../engine/rng";
import type { Figure, Question } from "../engine/types";
import { hasWorkedBuilder } from "./worked-skills";

const many = (id: string, per = 60) => [1, 2, 3].flatMap((level) => Array.from({ length: per }, (_, i) => SKILL_BY_ID[id].generate(mulberry32(7000 + i * 13 + level), level)));
const ids = ["place-value", "place-value-millions", "large-numbers", "divide-10-100", "hundredths", "thousandths", "rounding", "count-steps", "count-steps-more", "count-through-zero", "negative-numbers", "elapsed-time", "timetables", "money-change", "add-sub-money", "decimals", "measure-add", "long-division", "frac-equiv", "fraction-order", "frac-same-denom", "frac-amount", "frac-add", "mixed-numbers", "frac-times-whole", "frac-multiply", "frac-divide", "fdp-convert", "pct-amount", "ratio-share", "two-unknowns", "scale-recipes", "times-tables", "pictograms", "coins-notes", "pounds-pence", "shopping-bills", "best-value", "currency-exchange", "multiply-divide-money", "measures-convert", "imperial-metric", "convert-time", "roman-numerals", "factors-multiples", "primes-squares-cubes", "averages", "read-tables", "missing-number-eq", "prime-factors", "negative-ops", "direct-proportion", "ratio-problems", "expand-double", "factorise-quad", "frequency-mean", "outcomes", "percent-change", "sequences", "solve-linear", "collect-terms", "expand-single", "factorise-common", "substitute", "substitute-negatives", "inequalities", "nth-term", "simple-interest", "compound-interest", "growth-decay", "tree-probability", "speed-distance-time", "profit-loss", "vat-wages", "circle-area", "index-laws"];
const type = <T extends Figure["type"]>(q: Question, _t: T) => q.worked as Extract<Figure, { type: T }>;
const value = (q: Question) => (q.answer.kind === "number" ? q.answer.value : NaN);

describe("worked pictures (number, money, time)", () => {
  it("every topic on the list has a builder", () => { for (const id of ids) expect(hasWorkedBuilder(id), id).toBe(true); });
  it("every question of those topics that has a picture to show has one, and the picture describes itself in words", () => {
    const missing: string[] = [];
    for (const id of ids) for (const q of many(id)) {
      if (!q.worked) { missing.push(`${id}: ${q.prompt.slice(0, 80)}`); continue; }
      const alt = (q.worked as { alt: string }).alt;
      expect(alt.length, id).toBeGreaterThan(15); expect(alt, id).not.toMatch(/\$|\\/);
    }
    // forms of question with no useful picture are listed here on purpose; everything else must be covered
    const allowed = /Zara's trip|buses|digit|What digit|Write this|How many tens|How many thousandths|multiply to make|Find the missing number: \$\\frac|cubed|mean of|\(\\square|mode|Find the mean|Find the mode|bag of|How many weeks|On Friday|jug|ribbon.*left|A bottle|A bag of flour|\$\\square|\$\d+ \\times \\square|\$\\square/;
    expect(missing.filter((m) => !allowed.test(m.split(": ")[1])), missing.slice(0, 5).join("\n")).toEqual([]);
  });
  it("long division: the chunks add up and the remainder is right", () => {
    for (const q of many("long-division")) {
      const f = type(q, "chunking"); if (!f) continue;
      expect(f.chunks.reduce((t, c) => t + c.amount, 0) + f.remainder, q.prompt).toBe(f.dividend);
      expect(f.dividend, q.prompt).toBe(f.quotient * f.divisor + f.remainder);
      expect(f.remainder).toBeLessThan(f.divisor);
      if (q.answer.kind === "number" && !/remainder|decimal/.test(q.prompt)) expect(f.quotient, q.prompt).toBe(q.answer.value);
      if (/remainder only/.test(q.prompt)) expect(f.remainder, q.prompt).toBe(value(q));
    }
  });
  it("rounding: the hop lands on the answer", () => {
    for (const q of many("rounding")) { const f = type(q, "jump-line"); expect(f.jumps[0].to, q.prompt).toBeCloseTo(value(q), 6); expect(f.min).toBeLessThanOrEqual(f.marks[0].v); expect(f.max).toBeGreaterThanOrEqual(f.marks[0].v); }
  });
  it("counting in steps: the last mark is the answer", () => {
    for (const id of ["count-steps", "count-steps-more", "count-through-zero"]) for (const q of many(id)) { const f = type(q, "jump-line"); if (!f) continue; const end = f.marks.find((m) => m.tone === "end")!; expect(end.v, q.prompt).toBe(value(q)); }
  });
  it("negative numbers and temperatures: the hops end on the answer", () => {
    for (const q of many("negative-numbers")) { const f = type(q, "jump-line"); if (!f) continue; if (/difference/.test(q.prompt)) { expect(f.jumps.reduce((t, j) => t + (j.to - j.from), 0), q.prompt).toBe(value(q)); } else { const end = f.marks.find((m) => m.tone === "end")!; expect(end.v, q.prompt).toBe(value(q)); } }
  });
  it("time and money change: the hops add up to the answer", () => {
    for (const q of many("elapsed-time")) { const f = type(q, "jump-line"); expect(f.jumps.reduce((t, j) => t + (j.to - j.from), 0), q.prompt).toBe(value(q)); }
    for (const q of many("timetables")) { const f = type(q, "jump-line"); if (f && /How many minutes/.test(q.prompt)) expect(f.jumps.reduce((t, j) => t + (j.to - j.from), 0), q.prompt).toBe(value(q)); }
    for (const q of many("money-change")) { const f = type(q, "jump-line"); expect(f.jumps.reduce((t, j) => t + (j.to - j.from), 0), q.prompt).toBe(value(q)); }
  });
  it("money and decimal columns: the result is the answer, and the decimal point is in the right place", () => {
    for (const q of many("add-sub-money")) { const f = type(q, "column-sum"); if (f?.type !== "column-sum") continue; expect(f.dp).toBe(2); expect(Number(f.result) / 100, q.prompt).toBeCloseTo(value(q), 6); }
    for (const q of many("decimals")) { const f = type(q, "column-sum"); if (f?.type !== "column-sum") continue; expect(Number(f.result) / 10 ** (f.dp ?? 0), q.prompt).toBeCloseTo(value(q), 6); }
    for (const q of many("measure-add")) { const f = type(q, "column-sum"); if (f?.type !== "column-sum") continue; expect(Number(f.result), q.prompt).toBe(value(q)); }
  });
  it("place value charts: the 'Answer' row is the answer", () => {
    for (const id of ["place-value", "place-value-millions", "large-numbers", "divide-10-100"]) for (const q of many(id)) {
      const f = type(q, "table"); if (!f) continue;
      const row = f.rows.find((r) => r[0] === "Answer"); if (!row) continue;
      expect(Number(row.slice(1).join("").replace(/\s/g, "")), q.prompt).toBeCloseTo(value(q), 6);
    }
  });
});
