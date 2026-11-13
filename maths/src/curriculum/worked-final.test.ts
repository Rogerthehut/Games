import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from ".";
import { mulberry32 } from "../engine/rng";
import type { Figure, Question } from "../engine/types";
import { hasWorkedBuilder } from "./worked-skills";
import { roundSig, traceOrder } from "./worked-final";

const many = (id: string, per = 80) => [1, 2, 3].flatMap((level) => Array.from({ length: per }, (_, i) => SKILL_BY_ID[id].generate(mulberry32(12000 + i * 11 + level), level)));
const fig = <T extends Figure["type"]>(q: Question, t: T) => (q.worked?.type === t ? (q.worked as Extract<Figure, { type: T }>) : undefined);
const value = (q: Question) => (q.answer.kind === "number" ? q.answer.value : NaN);
const alt = (q: Question) => (q.worked as { alt?: string } | undefined)?.alt ?? "";

/** Every question of these topics has a picture (apart from forms listed on purpose), and the picture describes itself in plain words. */
export function expectCovered(id: string, allowed?: RegExp, per = 80) {
  const missing: string[] = [];
  for (const q of many(id, per)) {
    if (!q.worked) { missing.push(q.prompt.slice(0, 90)); continue; }
    expect(alt(q).length, `${id}: ${q.prompt}`).toBeGreaterThan(15);
    expect(alt(q), `${id}: ${q.prompt}`).not.toMatch(/\$|\\[a-z]/);
  }
  expect(missing.filter((m) => !allowed || !allowed.test(m)), `${id} without a picture:\n${missing.slice(0, 4).join("\n")}`).toEqual([]);
}

describe("final worked pictures, batch 1 (number)", () => {
  it("every topic has a builder, and covers its questions", () => {
    for (const id of ["time-facts", "multiply-three", "using-formulae", "order-ops", "mixed-number-ops", "sig-figs", "word-problems"]) { expect(hasWorkedBuilder(id), id).toBe(true); expectCovered(id); }
  });
  it("order of operations: the traced steps end on the answer, and each step has one fewer operation", () => {
    for (const q of many("order-ops")) {
      const t = fig(q, "table")!; const last = t.rows[t.rows.length - 1];
      expect(Number(String(last[1]).replace("−", "-")), q.prompt).toBeCloseTo(value(q), 9);
      expect(t.rows.length, q.prompt).toBeGreaterThanOrEqual(2);
    }
    expect(traceOrder("4 + 2 × 2^{2}")?.rows.map((r) => r[1])).toEqual(["4 + 2 × 2²", "4 + 2 × 4", "4 + 8", "12"]);
    expect(traceOrder("(2 + 3) × 3")?.value).toBe(15);
    expect(traceOrder("3^{2} + 2 × (8 + 3)")?.value).toBe(31);
    expect(traceOrder("10 - (9 - 1)")?.value).toBe(2);
    expect(traceOrder("not maths")).toBeNull();
  });
  it("significant figures: rounding is right and the marked digits are the significant ones", () => {
    expect(roundSig("7629", 2)).toBe("7600"); expect(roundSig("0.001296", 2)).toBe("0.0013"); expect(roundSig("4.0551", 3)).toBe("4.06");
    for (const q of many("sig-figs")) { const t = fig(q, "table"); if (!/Round/.test(q.prompt)) continue; expect(Number(t!.rows[3][1]), q.prompt).toBeCloseTo(value(q), 9); expect(String(t!.rows[1][1]), q.prompt).toMatch(/\[\d[\d.]*\]/); }
  });
  it("mixed numbers: the simplified fraction is the answer", () => {
    for (const q of many("mixed-number-ops")) {
      const t = fig(q, "table")!, last = String(t.rows[t.rows.length - 1][1]), [n, d] = last.split("/").map(Number);
      expect(n / d, q.prompt).toBeCloseTo(value(q), 9);
    }
  });
  it("time facts: the blocks add up to the answer", () => {
    for (const q of many("time-facts")) {
      const b = fig(q, "bar-model"); if (!b) continue;
      const per = value(q) / b.rows.length;
      for (const r of b.rows) { const sum = r.segments.reduce((t, s) => t + Number(s.label), 0); expect(r.segments.length === per || sum === per, q.prompt).toBe(true); }
    }
  });
  it("using a formula: the rectangle is labelled with the question's own sides", () => {
    for (const q of many("using-formulae")) { const f = fig(q, "polygon")!; expect(f.labels.length, q.prompt).toBeGreaterThanOrEqual(4); if (/long and/.test(q.prompt)) expect(alt(q), q.prompt).toContain(`= ${value(q)} cm`); }
  });
});

const ID_BATCH2 = ["quadratic-sequences", "completing-square", "rearrange-formulae", "algebraic-fractions", "simultaneous", "solve-quad", "quadratic-formula"];
describe("final worked pictures, batch 2 (Year 10 algebra)", () => {
  it("every topic has a builder, and covers its questions", () => { for (const id of ID_BATCH2) { expect(hasWorkedBuilder(id), id).toBe(true); expectCovered(id, undefined, 60); } });
  it("quadratic sequences: the differences are right and lead to the answer", () => {
    for (const q of many("quadratic-sequences")) {
      const t = fig(q, "table")!, term = t.rows[0].slice(1), first = t.rows[1].slice(2), second = t.rows[2].slice(3);
      const n = (s: string | number) => Number(String(s).replace("−", "-").replace("+", ""));
      const terms = term.filter((x) => x !== "?").map(n);
      expect(first.slice(0, terms.length - 1).map(n), q.prompt).toEqual(terms.slice(1).map((x, i) => x - terms[i]));
      expect(new Set(second.map(n)).size, q.prompt).toBe(1);
      if (/second difference/.test(q.prompt)) expect(n(second[0]), q.prompt).toBe(value(q));
      if (/next term/.test(q.prompt)) expect(terms[terms.length - 1] + n(first[first.length - 1]), q.prompt).toBe(value(q));
      if (/10th term/.test(q.prompt)) { const rest = t.rows[4].slice(1).map(n), b = rest[1] - rest[0], c = rest[0] - b, a = n(second[0]) / 2; expect(a * 100 + b * 10 + c, q.prompt).toBe(value(q)); }
    }
  });
  it("completing the square: the bracket and the constant match the question", () => {
    for (const q of many("completing-square")) {
      const t = fig(q, "table")!, done = String(t.rows[5][1]), m = done.match(/\(x ([+−]) (\d+)\)² ([+−]) (\d+)/)!;
      const p = (m[1] === "−" ? -1 : 1) * Number(m[2]), qq = (m[3] === "−" ? -1 : 1) * Number(m[4]);
      expect(/What is \$p/.test(q.prompt) ? p : qq, q.prompt).toBe(value(q));
      const [, b, c] = String(t.rows[0][1]).replace(/−/g, "-").match(/x² ([+-]) (\d+)x ([+-]) (\d+)/)!.map((x, i) => (i === 2 || i === 4 ? Number(x) : x)) as [string, string | number, number];
      expect(p, q.prompt).toBe(Number(String(t.rows[1][1]).split("= ")[1]));
      expect(typeof b === "string" || typeof b === "number").toBe(true); expect(Number.isFinite(c as number)).toBe(true);
    }
  });
  it("rearranging: a flow from the formula to its rearranged form", () => {
    for (const q of many("rearrange-formulae")) { const f = fig(q, "flow")!; expect(f.steps[0].kind, q.prompt).toBe("in"); expect(f.steps[f.steps.length - 1].kind).toBe("out"); expect(f.steps.length, q.prompt).toBeGreaterThanOrEqual(3); }
  });
  it("simultaneous equations: the table's x and y are the answer", () => {
    for (const q of many("simultaneous", 120)) {
      if (q.answer.kind !== "multi") continue;
      const t = fig(q, "table")!, last = String(t.rows[t.rows.length - 1][1]).replace(/−/g, "-").match(/x = (-?[\d.]+), y = (-?[\d.]+)/)!;
      expect([Number(last[1]), Number(last[2])], q.prompt).toEqual(q.answer.fields.map((f) => f.value));
    }
  });
  it("solving quadratics: the graph crosses the axis at both answers", () => {
    for (const q of many("solve-quad")) {
      if (q.answer.kind !== "multi") continue;
      const f = fig(q, "function-graph")!, roots = q.answer.fields.map((x) => x.value).sort((a, b) => a - b);
      expect(f.marks!.map((m) => m.x).sort((a, b) => a - b), q.prompt).toEqual(roots);
      const b = -(roots[0] + roots[1]), c = roots[0] * roots[1];
      for (const [x, y] of f.curves[0].pts) expect(Math.abs(y - (x * x + b * x + c)), q.prompt).toBeLessThan(0.02);
      for (const m of f.marks!) { expect(m.y).toBe(0); expect(f.curves[0].pts.some(([x, y]) => x === m.x && y === 0), q.prompt).toBe(true); }
    }
  });
  it("the quadratic formula: the table reaches the answer", () => {
    for (const q of many("quadratic-formula")) {
      const t = fig(q, "table")!, last = String(t.rows[t.rows.length - 1][1]).replace(/−/g, "-");
      if (/discriminant/.test(q.prompt)) expect(Number(last.split("= ").pop()), q.prompt).toBe(value(q));
      else expect(Math.max(...(last.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)), q.prompt).toBe(value(q));
    }
  });
});
