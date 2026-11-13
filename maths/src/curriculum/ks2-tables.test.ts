import { describe, expect, it } from "vitest";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import { SKILL_BY_ID } from "./index";

const make = (level: number, n = 80) => Array.from({ length: n }, (_, i) => SKILL_BY_ID["complete-table"].generate(mulberry32(i * 61 + level), level));
const grid = (q: Question) => (q.figure as { head: string[]; rows: (string | number)[][] }).rows;
const fields = (q: Question) => (q.answer as { kind: "multi"; fields: { label: string; value: number }[] }).fields;
const blanks = (q: Question) => grid(q).flat().filter((c) => typeof c === "string" && /^\?\d+$/.test(c)) as string[];

describe("complete the table", () => {
  it("has one answer box for every blank cell, in order, and a described table", () => {
    for (let level = 1; level <= 5; level++) for (const q of make(level, 40)) {
      expect(q.answer.kind).toBe("multi"); expect(q.figure?.type).toBe("table");
      const b = blanks(q).map((c) => Number(c.slice(1))).sort((x, y) => x - y), f = fields(q);
      expect(b).toEqual(f.map((_, i) => i + 1)); expect(f.map((x) => x.label)).toEqual(f.map((_, i) => `Box ${i + 1} =`));
      expect((q.figure as { alt: string }).alt).toMatch(/box 1/);
    }
  });
  const fill = (q: Question) => { const f = fields(q); return grid(q).map((row) => row.map((c) => (typeof c === "string" && /^\?\d+$/.test(c) ? f[Number(c.slice(1)) - 1].value : c))); };
  it("makes the filled table follow its rule", () => {
    for (const q of make(1)) { const [row] = fill(q), cells = row.slice(1) as number[], per = cells[0]; cells.forEach((c, i) => expect(c).toBe(per * (i + 1))); }
    for (const q of make(2)) { const [row] = fill(q), cost = row.slice(1) as number[], head = (q.figure as { head: string[] }).head.slice(1).map(Number), price = cost[0]; cost.forEach((c, i) => expect(c).toBe(price * head[i])); }
    for (const q of make(3)) { const [ins, outs] = fill(q).map((r) => r.slice(1) as number[]); const k = outs[0] - ins[0], mul = outs[0] % ins[0] === 0 && outs[1] === (outs[0] / ins[0]) * ins[1] && ins[0] !== outs[0] - 0 && outs[0] / ins[0] > 1; ins.forEach((x, i) => expect(outs[i]).toBe(mul && outs[0] / ins[0] > 1 && (outs[0] - ins[0]) !== (outs[1] - ins[1]) ? x * (outs[0] / ins[0]) : x + k)); }
    for (const q of make(4)) { const rows = fill(q) as number[][], f = rows[0][1] / rows[0][0]; expect([100, 1000]).toContain(f); rows.forEach(([a, b]) => expect(b).toBe(a * f)); }
    for (const q of make(5)) { const [row] = fill(q), [a, tue, wed, thu, total] = row.slice(1) as number[]; expect(thu).toBe(2 * wed); expect(a + tue + wed + thu).toBe(total); expect(tue).toBeGreaterThan(0); }
  });
});
