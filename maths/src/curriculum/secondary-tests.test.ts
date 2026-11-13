import { describe, expect, it } from "vitest";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import { SKILL_BY_ID } from "./index";

const make = (id: string, level: number, n = 100) => Array.from({ length: n }, (_, i) => SKILL_BY_ID[id].generate(mulberry32(i * 37 + level), level));
const value = (q: Question) => (q.answer as { value: number }).value;

describe("the equation of a circle", () => {
  it("reads the radius, the right-hand side, the centre and whether a point is on the circle", () => {
    for (const q of make("circle-equation", 1)) { const r2 = Number(/= (\d+)\$/.exec(q.prompt)![1]); expect(value(q) ** 2).toBe(r2); }
    for (const q of make("circle-equation", 2)) { const rad = Number(/radius (\d+)\./.exec(q.prompt)![1]); expect(value(q)).toBe(rad * rad); }
    for (const q of make("circle-equation", 3)) {
      const m = /\(x (-|\+) (\d+)\)\^2 \+ \(y (-|\+) (\d+)\)\^2/.exec(q.prompt)!, a = (m[1] === "-" ? 1 : -1) * Number(m[2]), b = (m[3] === "-" ? 1 : -1) * Number(m[4]);
      expect((q.answer as { fields: { value: number }[] }).fields.map((f) => f.value)).toEqual([a, b]);
    }
    for (const q of make("circle-equation", 4)) { const m = /= (\d+)\$\. Does the point \$\((\d+), (\d+)\)/.exec(q.prompt)!; expect((q.answer as { correct: number }).correct).toBe(Number(m[2]) ** 2 + Number(m[3]) ** 2 === Number(m[1]) ? 0 : 1); }
    for (const q of make("circle-equation", 5)) { const m = /x\^2 \+ y\^2 = (\d+)\$/.exec(q.prompt)!, known = /\$(\d+)\^2 \+ b\^2|a\^2 \+ (\d+)\^2/.exec(q.prompt)!, k = Number(known[1] ?? known[2]); expect(value(q) ** 2 + k ** 2).toBe(+m[1]); expect(value(q)).toBeGreaterThan(0); }
  });
});

describe("algebraic proof", () => {
  const evalExpr = (t: string, n: number) => { const m = /^(\d*)n(?: ([+−-]) (\d+))?$/.exec(t.trim())!; const a = m[1] === "" ? 1 : Number(m[1]); return a * n + (m[2] ? (m[2] === "+" ? 1 : -1) * Number(m[3]) : 0); };
  it("always has exactly one option that is always odd, even or a multiple, and marks it", () => {
    for (const level of [1, 2, 3]) for (const q of make("algebraic-proof", level, 150)) {
      const a = q.answer as { kind: "choice"; options: { text: string }[]; correct: number }, p = q.prompt;
      const holds = (e: (n: number) => number) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every((n) => { const v = Math.abs(e(n)); return p.includes("always odd") ? v % 2 === 1 : p.includes("always even") ? v % 2 === 0 : v % Number(/multiple of (\d+)/.exec(p)![1]) === 0; });
      const flags = a.options.map((o) => holds((n) => evalExpr(o.text, n)));
      expect(flags.filter(Boolean)).toHaveLength(1); expect(flags[a.correct]).toBe(true); expect(new Set(a.options.map((o) => o.text)).size).toBe(4);
    }
  });
  it("expands to the right multiple", () => {
    for (const q of make("algebraic-proof", 4)) { const a = Number(/\(n \+ (\d+)\)\^2 - \(n - \d+\)\^2/.exec(q.prompt)![1]); expect(value(q)).toBe(4 * a); }
    for (const q of make("algebraic-proof", 5)) { const a = Number(/\(n \+ (\d+)\)\^2 - n\^2/.exec(q.prompt)![1]); expect(value(q)).toBe(2 * a); }
  });
});

describe("implicit differentiation", () => {
  it("gives the gradient that numerical differentiation of the curve gives", () => {
    for (const level of [1, 2, 3, 4, 5]) for (const q of make("implicit-differentiation", level, 80)) {
      const m = /passes through \$\((-?\d+), (\d+)\)\$/.exec(q.prompt)!, x = Number(m[1]), y = Number(m[2]), p = q.prompt;
      // each curve as F(x, y) = c, whose gradient is -Fx / Fy; the partial derivatives are found numerically
      const F = p.includes("x^2 + 2y^2") ? (a: number, b: number) => a * a + 2 * b * b : p.includes("x^2 + y^2") ? (a: number, b: number) => a * a + b * b : p.includes("y^2 =") ? (a: number, b: number) => b * b - Number(/y\^2 = (\d+)x/.exec(p)![1]) * a : (a: number, b: number) => a * b;
      const c = F(x, y), h = 1e-6, Fx = (F(x + h, y) - F(x - h, y)) / (2 * h), Fy = (F(x, y + h) - F(x, y - h)) / (2 * h);
      // the point really is on the curve named in the question
      if (p.includes("x^2 + 2y^2")) expect(c).toBe(Number(/= (\d+)\$ passes/.exec(p)![1])); else if (p.includes("x^2 + y^2")) expect(c).toBe(Number(/= (\d+)\$ passes/.exec(p)![1])); else if (p.includes("xy")) expect(c).toBe(Number(/xy = (\d+)\$/.exec(p)![1])); else expect(c).toBe(0);
      expect(value(q)).toBeCloseTo(-Fx / Fy, 4); expect(q.shown.length).toBeLessThan(9);
    }
  });
});
