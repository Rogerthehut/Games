import { describe, expect, it } from "vitest";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import { SKILL_BY_ID } from "./index";

const make = (id: string, level: number, n = 80) => Array.from({ length: n }, (_, i) => SKILL_BY_ID[id].generate(mulberry32(i * 53 + level), level));
const ints = (p: string) => [...p.matchAll(/\d[\d,]*/g)].map((m) => Number(m[0].replace(/,/g, "")));
const value = (q: Question) => (q.answer as { value: number }).value;

describe("estimate, then check", () => {
  it("rounds as asked and adds up the estimate", () => {
    for (const q of make("estimate-check", 1)) { const [a, b] = ints(q.prompt), add = q.prompt.includes("+"); expect(value(q)).toBe(add ? Math.round(a / 100) * 100 + Math.round(b / 100) * 100 : Math.round(a / 100) * 100 - Math.round(b / 100) * 100); }
    for (const q of make("estimate-check", 2)) {
      const [a, b] = ints(q.prompt);
      if (q.prompt.includes("nearest 1,000")) expect(value(q)).toBe(Math.round(a / 1000) * 1000 - Math.round(b / 1000) * 1000);
      else if (q.prompt.includes("each number to the nearest 10")) expect(value(q)).toBe(Math.round(a / 10) * 10 * Math.round(b / 10) * 10);
      else expect(value(q)).toBe(Math.round(a / 100) * 100 * b);
    }
  });
  it("gives the result of the check, which matches the start only when the answer was right", () => {
    for (const q of make("estimate-check", 3, 120)) {
      const [x, y, z] = ints(q.prompt);    // for a subtraction: start, taken away, claimed answer
      if (q.prompt.includes("−")) expect(value(q)).toBe(z + y); else expect(value(q)).toBe(z - y);
      expect(q.solution.join(" ")).toMatch(q.prompt.includes("−") ? (z + y === x ? /answer is right/ : /answer is wrong/) : (z - y === x ? /answer is right/ : /answer is wrong/));
    }
  });
  it("names the inverse calculation, with the right one exactly once among the choices", () => {
    for (const level of [4, 5]) for (const q of make("estimate-check", level)) {
      const a = q.answer as { kind: "choice"; options: { text: string }[]; correct: number };
      expect(a.kind).toBe("choice"); expect(new Set(a.options.map((o) => o.text)).size).toBe(a.options.length);
      const right = a.options[a.correct].text.replace(/,/g, ""), nums = ints(q.prompt);
      const [p, r, t] = [nums[0], nums[1], nums[2]];
      if (q.prompt.includes("+")) expect(right).toBe(`${t} − ${r}`); else if (q.prompt.includes("−")) expect(right).toBe(`${t} + ${r}`);
      else if (q.prompt.includes("×")) expect(right).toBe(`${t} ÷ ${r}`); else expect(right).toBe(`${t} × ${r}`);
      expect(p).toBeGreaterThan(0);
    }
  });
});

describe("scaling and correspondence", () => {
  it("multiplies for 'times as', pairs by multiplying, and divides to scale back", () => {
    for (const q of make("correspondence", 1)) { const [x, k] = ints(q.prompt.replace(/£(\d+)\.(\d+)/, (_, a, b) => String(Number(a) * 100 + Number(b)))); expect(value(q)).toBe(x * k); }
    for (const q of make("correspondence", 2)) { const [x, y] = ints(q.prompt); expect(value(q)).toBe(x * y); }
    for (const q of make("correspondence", 3)) { const n = ints(q.prompt); expect(value(q)).toBe(q.prompt.includes("rope") ? n[0] * n[1] * n[2] : n[0] * (n[1] + n[2])); }
    for (const q of make("correspondence", 4)) { const [tall, k] = ints(q.prompt); expect(value(q) * k).toBe(tall); }
  });
});

describe("listing combinations", () => {
  it("agrees with counting them by brute force", () => {
    for (const q of make("combinations", 1)) { const t = Number(/total of (\d+)/.exec(q.prompt)![1]); let n = 0; for (let a = 1; a < t; a++) if (t - a > 0) n++; expect(value(q)).toBe(n); }
    for (const q of make("combinations", 2)) { const n = ints(q.prompt).pop() as number, target = Number(/× b = (\d+)/.exec(q.prompt)![1]); let c = 0; for (let a = 1; a <= target; a++) if (target % a === 0) c++; expect(value(q)).toBe(c); void n; }
    for (const q of make("combinations", 3)) { const d = /digits from ([\d, ]+),/.exec(q.prompt)![1].split(",").map((x) => Number(x.trim())); const set = new Set<string>(); for (const a of d) for (const b of d) if (a !== b) set.add(`${a}${b}`); expect(value(q)).toBe(set.size); }
    for (const q of make("combinations", 4)) { const total = Number(/= (\d+)\. How many/.exec(q.prompt)![1]); let c = 0; for (let b = 1; b < total; b++) if (total - 2 * b > 0) c++; expect(value(q)).toBe(c); }
    for (const q of make("combinations", 5)) { const d = /digits ([\d, ]+) once each/.exec(q.prompt)![1].split(",").map((x) => Number(x.trim())); const set = new Set<string>(); for (const a of d) for (const b of d) for (const c of d) if (new Set([a, b, c]).size === 3) set.add(`${a}${b}${c}`); expect(value(q)).toBe(set.size); }
  });
});

describe("translating on a grid", () => {
  it("moves the point or corner by the amounts asked, and stays on the grid", () => {
    for (const level of [1, 2, 4]) for (const q of make("translate-grid", level)) {
      const a = q.answer as { kind: "multi"; fields: { value: number }[] }, [x, y] = a.fields.map((f) => f.value);
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(8); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(8);
      const start = /\((\d+), (\d+)\)/.exec(q.prompt)!, sx = Number(start[1]), sy = Number(start[2]);
      const right = /(\d+) squares? right/.exec(q.prompt), left = /(\d+) squares? left/.exec(q.prompt), up = /(\d+) squares? up/.exec(q.prompt), down = /(\d+) squares? down/.exec(q.prompt);
      expect(x).toBe(sx + (right ? Number(right[1]) : 0) - (left ? Number(left[1]) : 0)); expect(y).toBe(sy + (up ? Number(up[1]) : 0) - (down ? Number(down[1]) : 0));
    }
    for (const q of make("translate-grid", 3)) { const [pts] = [[...q.prompt.matchAll(/\((\d+), (\d+)\)/g)]]; const [ax, ay, bx, by] = [pts[0][1], pts[0][2], pts[1][1], pts[1][2]].map(Number); expect(value(q)).toBe(/right|left/.test(q.prompt.split("did it move")[0].slice(-12)) ? Math.abs(bx - ax) : Math.abs(by - ay)); }
  });
  it("says 1 square, not 1 squares", () => { for (const q of make("translate-grid", 2, 200)) expect(q.prompt).not.toMatch(/\b1 squares/); });
  it("has a grid picture with a description", () => { for (const level of [1, 2, 3, 4]) for (const q of make("translate-grid", level, 5)) { expect(q.figure?.type).toBe("coord-grid"); expect((q.figure as { alt: string }).alt.length).toBeGreaterThan(10); } });
});
