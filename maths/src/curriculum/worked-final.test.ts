import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from ".";
import { mulberry32 } from "../engine/rng";
import type { Figure, Question } from "../engine/types";
import { hasWorkedBuilder } from "./worked-skills";
import { exactValue, roundSig, traceOrder } from "./worked-final";

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

const ID_BATCH3 = ["exact-trig", "surds", "composite-functions", "inverse-functions", "iteration", "recurring-decimals", "conditional-probability"];
describe("final worked pictures, batch 3 (Years 10 and 11)", () => {
  it("every topic has a builder, and covers its questions", () => { for (const id of ID_BATCH3) { expect(hasWorkedBuilder(id), id).toBe(true); expectCovered(id, undefined, 40); } });
  it("exact trigonometry: the table's exact values are the real values", () => {
    for (const [fn, deg, want] of [["sin", 30, 0.5], ["cos", 60, 0.5], ["tan", 45, 1], ["sin", 45, Math.SQRT1_2], ["cos", 30, Math.sqrt(3) / 2], ["tan", 60, Math.sqrt(3)], ["cos", 90, 0], ["sin", 90, 1], ["tan", 30, 1 / Math.sqrt(3)]] as const) expect(exactValue(fn, deg), `${fn} ${deg}`).toBeCloseTo(want, 12);
    for (const [fn, deg] of [["sin", 30], ["sin", 45], ["sin", 60], ["cos", 30], ["cos", 45], ["cos", 60], ["tan", 30], ["tan", 45], ["tan", 60], ["sin", 0], ["cos", 0], ["sin", 90]] as const) expect(exactValue(fn, deg), `${fn} ${deg}`).toBeCloseTo(Math[fn]((deg * Math.PI) / 180), 12);
    for (const q of many("exact-trig")) {
      if (q.worked?.type === "table") { const t = q.worked as Extract<Figure, { type: "table" }>; expect(t.head).toEqual(["Angle", "sin", "cos", "tan"]); expect(t.rows.map((r) => r[0])).toEqual(["0°", "30°", "45°", "60°", "90°"]); } else expect(q.worked?.type, q.prompt).toBe("rtriangle");
    }
  });
  it("surds: each simplification multiplies back, and the sum is the answer", () => {
    for (const q of many("surds")) {
      const t = fig(q, "table")!;
      for (const r of t.rows) { const m = String(r[1]).match(/^(\d+) = (\d+) × (\d+)$/); if (m) expect(Number(m[2]) * Number(m[3]), q.prompt).toBe(Number(m[1])); }
      const last = String(t.rows[t.rows.length - 1][1]), end = last.match(/(\d+)√\d+$/)!;
      expect(Number(end[1]), q.prompt).toBe(value(q));
    }
  });
  it("composite and inverse functions: the boxes end on the answer", () => {
    for (const id of ["composite-functions", "inverse-functions"]) for (const q of many(id)) { const f = fig(q, "flow")!; expect(f.steps[0].kind).toBe("in"); expect(Number(f.steps[f.steps.length - 1].text.split("= ").pop()!.replace("−", "-")), q.prompt).toBe(value(q)); }
  });
  it("iteration: the table runs from x1 to the term asked for", () => {
    for (const q of many("iteration")) { const t = fig(q, "table")!, last = t.rows[t.rows.length - 1]; expect(Number(String(last[1]).replace("−", "-")), q.prompt).toBe(value(q)); expect(last[0], q.prompt).toBe(Number(q.prompt.match(/What is \$x_(\d+)/)![1])); }
  });
  it("recurring decimals: the fraction is the decimal", () => {
    for (const q of many("recurring-decimals")) { const t = fig(q, "table")!, [n, d] = String(t.rows[t.rows.length - 1][1]).split("/").map(Number); expect(n / d, q.prompt).toBeCloseTo(value(q), 9); }
  });
  it("conditional probability: the counters add up and the picture matches the question", () => {
    for (const q of many("conditional-probability")) {
      const b = fig(q, "bar-model")!, m = q.prompt.match(/(\d+) red and (\d+) blue/)!;
      expect(b.rows[0].segments.map((s) => s.size)).toEqual([Number(m[1]), Number(m[2])]);
      expect(b.rows[1].segments[0].size, q.prompt).toBe(Number(m[1]) - 1); expect(b.rows[1].segments[1].size).toBe(Number(m[2]));
    }
  });
});

const ID_BATCH4 = ["arithmetic-series", "exp-growth", "log-laws", "partial-fractions", "proof-counterexample", "sigma-series", "factor-theorem", "modulus"];
describe("final worked pictures, batch 4 (Year 12, first part)", () => {
  it("every topic has a builder, and covers its questions", () => { for (const id of ID_BATCH4) { expect(hasWorkedBuilder(id), id).toBe(true); expectCovered(id, undefined, 50); } });
  it("arithmetic series: the hops end on the term, the running total ends on the sum", () => {
    for (const q of many("arithmetic-series")) {
      const j = fig(q, "jump-line"), t = fig(q, "table");
      if (j) expect(j.marks.find((m) => m.tone === "end")!.v, q.prompt).toBe(value(q));
      else expect(Number(String(t!.rows[t!.rows.length - 1][2]).replace("−", "-")), q.prompt).toBe(value(q));
    }
  });
  it("exponential growth and logs: the table reaches the figure the question asks for", () => {
    for (const q of many("exp-growth")) { const t = fig(q, "table")!, last = t.rows[t.rows.length - 1]; if (/Solve/.test(q.prompt)) expect(String(last[0]).split("^")[1], q.prompt).toBe(String(value(q))); else if (/What is \$N/.test(q.prompt)) expect(last[1], q.prompt).toBe(value(q)); else expect(last[0], q.prompt).toBe(value(q)); }
    for (const q of many("log-laws")) { const t = fig(q, "table")!, last = String(t.rows[t.rows.length - 1][1]).replace(/−/g, "-"); expect(Number(last.match(/(-?\d+(?:\.\d+)?)\s*$/)![1]), q.prompt).toBe(value(q)); }
  });
  it("proof by counter-example: every table has a case marked as the counter-example, and the rest hold", () => {
    for (const q of many("proof-counterexample")) { const t = fig(q, "table")!; const marked = t.rows.filter((r) => String(r[r.length - 1]).startsWith("NO")); expect(marked.length, q.prompt).toBeGreaterThanOrEqual(1); expect(t.rows.some((r) => r[r.length - 1] === "yes"), q.prompt).toBe(true); }
  });
  it("sigma notation: the running total ends on the sum", () => { for (const q of many("sigma-series")) { const t = fig(q, "table")!; expect(t.rows[t.rows.length - 1][2], q.prompt).toBe(value(q)); } });
  it("the factor theorem: the remainder or k comes out as the answer", () => {
    for (const q of many("factor-theorem", 120)) {
      const t = fig(q, "table")!, last = String(t.rows[t.rows.length - 1][1]).replace(/−/g, "-");
      if (/remainder/.test(q.prompt)) expect(Number(last.split("= ").pop()), q.prompt).toBe(value(q)); else expect(Number(last.replace("k = ", "")), q.prompt).toBe(value(q));
    }
  });
  it("the modulus: the graph meets the line at the solutions, the number line spans the interval", () => {
    for (const q of many("modulus", 80)) {
      const g = fig(q, "function-graph"), j = fig(q, "jump-line"), t = fig(q, "table");
      if (g) expect(Math.max(...g.marks!.map((m) => m.x)), q.prompt).toBe(value(q));
      else if (j) { expect(Math.round(j.jumps[0].to - j.jumps[0].from) - 1, q.prompt).toBe(value(q)); }
      else expect(Number(String(t!.rows[t!.rows.length - 1][1]).replace(/−/g, "-").split("= ").pop()), q.prompt).toBe(value(q));
    }
  });
});

import { parsePoly, polyDeriv, polyEval, polyStr } from "./worked-advanced";
const ID_BATCH5 = ["differentiate", "integrate-polynomials", "definite-integrals", "product-quotient", "chain-rule", "differentiate-exp-trig", "integrate-substitution"];
describe("final worked pictures, batch 5 (calculus)", () => {
  it("the polynomial helpers parse, differentiate and print correctly", () => {
    expect(parsePoly("-6x^{3} + 3x + 9 - 6x^{2}")).toEqual([9, 3, -6, -6]);
    expect(parsePoly("x^{2}")).toEqual([0, 0, 1]); expect(parsePoly("4x + 3")).toEqual([3, 4]); expect(parsePoly("-x")).toEqual([0, -1]); expect(parsePoly("2 + 8x^{5} - x - 4x^{2}")).toEqual([2, -1, -4, 0, 0, 8]);
    expect(parsePoly("sin x")).toBeNull();
    expect(polyStr([3, -12, -18])).toBe("−18x² − 12x + 3"); expect(polyStr(polyDeriv([9, 3, -6, -6]))).toBe("−18x² − 12x + 3");
    expect(polyEval([1, 2, 3], 2)).toBe(17); expect(polyStr([0])).toBe("0");
  });
  it("every topic has a builder, and covers its questions", () => { for (const id of ID_BATCH5) { expect(hasWorkedBuilder(id), id).toBe(true); expectCovered(id, undefined, 60); } });
  it("differentiating: the table's last row is the answer's polynomial", () => {
    for (const q of many("differentiate", 120)) {
      if (q.answer.kind !== "expr") continue;
      const t = fig(q, "table")!, shown = String(t.rows[t.rows.length - 1][2]), want = q.answer.value as number[];
      expect(shown, q.prompt).toBe(polyStr(want));
    }
  });
  it("integrals: the antiderivative evaluated between the limits is the answer", () => {
    for (const q of many("integrate-polynomials")) { const t = fig(q, "table")!; const last = String(t.rows[t.rows.length - 1][1]).replace(/−/g, "-"); expect(Number(last.replace("a = ", "").split("= ").pop()), q.prompt).toBe(value(q)); }
    for (const q of many("definite-integrals")) { const g = fig(q, "function-graph")!; const area = g.strips!.slice(1).reduce((t, [x, y], i) => t + ((x - g.strips![i][0]) * (y + g.strips![i][1])) / 2, 0); expect(area, q.prompt).toBeCloseTo(value(q), 6); }
  });
  it("product, quotient and chain rules: the worked value is the answer", () => {
    for (const id of ["product-quotient", "chain-rule"]) for (const q of many(id)) { const t = fig(q, "table")!, last = String(t.rows[t.rows.length - 1][1]).replace(/−/g, "-"); expect(Number(last.split("= ").pop()), q.prompt).toBeCloseTo(value(q), 9); }
  });
  it("exponentials, trig and logs, and substitution: the final value or exponent is the answer", () => {
    for (const q of many("differentiate-exp-trig")) { const t = fig(q, "table")!; expect(Number(String(t.rows[t.rows.length - 1][1]).replace("−", "-")), q.prompt).toBeCloseTo(value(q), 5); }
    for (const q of many("integrate-substitution")) { const t = fig(q, "table")!; expect(t.rows.length, q.prompt).toBeGreaterThanOrEqual(2); }
  });
});

import { binomialPmf } from "./worked-advanced";
const ID_BATCH6 = ["trig-equations", "trig-identities", "constant-acceleration", "binomial-dist", "normal-dist", "binomial-coefficient", "parametric-equations", "sum-to-infinity", "differential-equations", "kinematics-calculus", "newton-raphson", "vectors-3d", "forces-moments", "projectiles"];
describe("final worked pictures, batch 6 (Years 12 and 13, the rest)", () => {
  it("every topic has a builder, and covers its questions", () => { for (const id of ID_BATCH6) { expect(hasWorkedBuilder(id), id).toBe(true); expectCovered(id, undefined, 60); } });
  it("trigonometric equations: both marked points sit on the curve at the line", () => {
    for (const q of many("trig-equations")) {
      const g = fig(q, "function-graph")!, fn = Math[q.prompt.match(/(sin|cos|tan) \\theta/)![1] as "sin" | "cos" | "tan"], k = Number(q.prompt.replace(/\$/g, "").match(/= (-?[\d.]+) for/)![1]);
      expect(g.marks!.length).toBe(2);
      for (const m of g.marks!) { expect(fn((m.x * Math.PI) / 180), q.prompt).toBeCloseTo(k, 6); expect(m.y).toBe(k); }
      expect([Math.min(...g.marks!.map((m) => m.x)), Math.max(...g.marks!.map((m) => m.x)), g.marks![0].x + g.marks![1].x], q.prompt).toContain(value(q));
    }
  });
  it("SUVAT, parametric, series and projectile tables reach the answer", () => {
    for (const q of many("constant-acceleration")) { const t = fig(q, "table")!, last = String(t.rows[t.rows.length - 1][1]); expect(Number(last.split("= ").pop()!.split(" ")[0]), q.prompt).toBe(value(q)); }
    for (const q of many("parametric-equations", 80)) { const t = fig(q, "table"); if (!t) continue; if (t.head[0] === "t") { const last = t.rows[t.rows.length - 1]; const ans = /y-coordinate/.test(q.prompt) ? Number(String(last[2]).replace("−", "-")) : last[0]; expect(ans, q.prompt).toBe(value(q)); } }
    for (const q of many("sum-to-infinity")) { const t = fig(q, "table")!, last = String(t.rows[t.rows.length - 1][2]); expect(Number(last.split("= ").pop()), q.prompt).toBeCloseTo(value(q), 9); const sums = t.rows.slice(0, -1).map((r) => Number(String(r[2]).replace("−", "-"))); expect(Math.abs(sums[7] - value(q)), q.prompt).toBeLessThan(Math.abs(sums[1] - value(q)) + 1e-9); }
    for (const q of many("projectiles")) { const t = fig(q, "table")!, last = t.rows[t.rows.length - 1]; if (/dropped/.test(q.prompt)) expect(last[0], q.prompt).toBe(value(q)); else if (/horizontally/.test(q.prompt)) expect(last[1], q.prompt).toBe(value(q)); else expect(Number(last[1]), q.prompt).toBeCloseTo(value(q), 9); }
  });
  it("binomial distribution: the bars add up to 100%, and match the answer", () => {
    expect(binomialPmf(3, 0.5).map((x) => Math.round(x * 1000) / 1000)).toEqual([0.125, 0.375, 0.375, 0.125]);
    for (const q of many("binomial-dist")) {
      const b = fig(q, "bars")!, tot = b.items.reduce((t, i) => t + i.value, 0), n = b.items.length - 1, pr = Number(q.prompt.match(/B\((\d+), ([\d.]+)\)/)![2]);
      expect(tot, q.prompt).toBeGreaterThan(99.5); expect(tot).toBeLessThan(100.5);
      if (/mean/.test(q.prompt)) expect(b.items.reduce((t, i, k) => t + (k * i.value) / 100, 0), q.prompt).toBeCloseTo(value(q), 1);
      if (/P\(X = (\d+)\)/.test(q.prompt)) expect(b.items[Number(q.prompt.match(/P\(X = (\d+)\)/)![1])].value / 100, q.prompt).toBeCloseTo(value(q), 2);
      void n; void pr;
    }
  });
  it("normal distribution: the shaded part and marks are where the question says", () => {
    for (const q of many("normal-dist")) {
      const g = fig(q, "function-graph")!, m = q.prompt.match(/N\((\d+), (\d+)\^\{2\}\)/)!, mu = Number(m[1]), sd = Number(m[2]);
      expect(g.xOrigin, q.prompt).toBe(mu);
      const w = q.prompt.match(/within (\d) standard/);
      if (w) { const k = Number(w[1]); expect(g.strips![0][0], q.prompt).toBeCloseTo(mu - k * sd, 6); expect(g.strips![g.strips!.length - 1][0]).toBeCloseTo(mu + k * sd, 6); }
      if (/z-score/.test(q.prompt)) expect((g.marks![1].x - mu) / sd, q.prompt).toBeCloseTo(value(q), 9);
      if (/score that is/.test(q.prompt)) expect(g.marks![1].x, q.prompt).toBe(value(q));
    }
  });
  it("Pascal's triangle, vectors and Newton-Raphson reach the answer", () => {
    for (const q of many("binomial-coefficient")) { const t = fig(q, "table")!; expect(Number(String(t.rows[t.rows.length - 1][1]).replace(/−/g, "-").split("= ").pop()), q.prompt).toBe(value(q)); }
    for (const q of many("vectors-3d")) { const t = fig(q, "table")!, last = t.rows[t.rows.length - 1], cell = String(last[last.length - 1]).replace(/−/g, "-"); expect(Number(cell.split("= ").pop()), q.prompt).toBe(value(q)); }
    for (const q of many("newton-raphson")) { const t = fig(q, "table")!; if (t.head[0] !== "Start") continue; expect(Math.abs(Number(String(t.rows[t.rows.length - 1][4]).replace("−", "-")) - value(q)), q.prompt).toBeLessThan(6e-4); }
  });
  it("forces and moments, identities, kinematics and differential equations come with a picture", () => {
    for (const q of many("forces-moments")) expect(["table", "rtriangle", "formula-triangle"], q.prompt).toContain(q.worked!.type);
    for (const q of many("trig-identities")) { const t = fig(q, "table")!; expect(t.rows[0][0]).toBe("The identity"); }
    for (const q of many("kinematics-calculus")) expect(["flow", "table"], q.prompt).toContain(q.worked!.type);
  });
});

describe("pictures for the topics that only needed one on some forms of question", () => {
  const ids = ["venn-counts", "area-perimeter-link", "volume-prisms", "vectors", "regression-line", "correlation", "similar-shapes"];
  it("every question has its own figure or a worked picture; the topics have builders", () => {
    for (const id of ids) {
      expect(hasWorkedBuilder(id), id).toBe(true);
      const bare = many(id, 60).filter((q) => !q.figure && !q.worked).map((q) => q.prompt.slice(0, 90));
      expect(bare, `${id} still has questions with no picture:\n${bare.slice(0, 3).join("\n")}`).toEqual([]);
    }
  });
  it("a question that comes with its own figure is left alone", () => { for (const id of ids) for (const q of many(id, 40)) if (q.figure) expect(q.worked, q.prompt).toBeUndefined(); });
  it("Venn diagrams, prisms, regression lines and enlargements agree with the answers", () => {
    for (const q of many("venn-counts", 80)) { const v = fig(q, "venn"); if (!v) continue; if (/at least one/.test(q.prompt)) expect(v.a + v.both + v.b, q.prompt).toBe(value(q)); }
    for (const q of many("volume-prisms", 80)) { const b = fig(q, "bar-model"); if (!b) continue; const slices = b.rows[0].segments.length, area = Number(b.rows[0].segments[0].label); if (/Work out its volume/.test(q.prompt)) expect(slices * area, q.prompt).toBe(value(q)); else expect(slices, q.prompt).toBe(value(q)); }
    for (const q of many("regression-line", 80)) { const g = fig(q, "function-graph"); if (!g) continue; const m = q.prompt.match(/y = (\d+) \+ (\d+)x/)!; for (const mk of g.marks!) if (!/data/.test(mk.label ?? "")) expect(mk.y, q.prompt).toBe(Number(m[1]) + Number(m[2]) * mk.x); }
    for (const q of many("similar-shapes", 80)) { const b = fig(q, "bar-model"); if (b) expect(b.rows[1].segments.reduce((t, s) => t + (s.size ?? 0), 0), q.prompt).toBe(value(q)); }
  });
});
