import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "./index";
import { mulberry32 } from "../engine/rng";

/**
 * The shapes of calculation that the Key Stage 2 tests use (see docs/SATS_COVERAGE.md): long multiplication with three and four digits by two digits,
 * four-digit numbers divided by one digit, shorter second numbers when adding and subtracting, and fractions taken away from each other.
 */
const make = (id: string, level: number, n = 60) => Array.from({ length: n }, (_, i) => SKILL_BY_ID[id].generate(mulberry32(i * 97 + level), level));
const nums = (p: string) => [...p.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, "")));

describe("Year 6 long multiplication", () => {
  it("asks for three digits by two digits, then four digits by two digits, and the answer is the product", () => {
    for (const q of make("mult-written", 4)) { const [a, b] = nums(q.prompt); expect(String(a)).toHaveLength(3); expect(String(b)).toHaveLength(2); expect(q.answer).toMatchObject({ kind: "number", value: a * b }); }
    for (const q of make("mult-written", 5)) { const [a, b] = nums(q.prompt); expect(String(a)).toHaveLength(4); expect(String(b)).toHaveLength(2); expect(q.answer).toMatchObject({ kind: "number", value: a * b }); expect(q.prompt).toMatch(/\d,\d{3}/); }
  });
});

describe("four-digit short division", () => {
  it("divides a four-digit number by one digit, exactly and then with a remainder", () => {
    for (const q of make("division", 4)) { const [n, d] = nums(q.prompt); expect(String(n)).toHaveLength(4); expect(d).toBeLessThan(10); expect(n % d).toBe(0); expect(q.answer).toMatchObject({ kind: "number", value: n / d }); }
    for (const q of make("division", 5)) {
      const [n, d] = nums(q.prompt), a = q.answer as { kind: "multi"; fields: { value: number }[] };
      expect(String(n)).toHaveLength(4); expect(a.fields[0].value).toBe(Math.floor(n / d)); expect(a.fields[1].value).toBe(n % d); expect(n % d).toBeGreaterThan(0);
    }
  });
});

describe("adding and subtracting", () => {
  it("sometimes has a shorter second number, and the answer is right", () => {
    for (const level of [1, 2]) {
      const qs = make("add-sub", level, 120); let shorter = 0;
      for (const q of qs) {
        const [a, b] = nums(q.prompt), add = q.prompt.includes("+");
        expect(q.answer).toMatchObject({ kind: "number", value: add ? a + b : a - b }); expect(add ? true : a > b).toBe(true);
        if (String(b).length < String(a).length) shorter++;
      }
      expect(shorter).toBeGreaterThan(20);
    }
  });
});

describe("adding and taking away fractions", () => {
  const value = (p: string) => { const f = [...p.matchAll(/(\d+)?(?:\\,)?\\frac\{(\d+)\}\{(\d+)\}/g)].map((m) => Number(m[1] ?? 0) + Number(m[2]) / Number(m[3])); return p.includes("-") ? f[0] - f[1] : f[0] + f[1]; };
  it("takes one fraction from another from level 2, never leaving nothing or less", () => {
    let takeaways = 0;
    for (const level of [2, 3, 4, 5]) for (const q of make("frac-add", level, 80)) {
      const v = value(q.prompt), a = q.answer as { value: number };
      expect(v).toBeGreaterThan(1e-9); expect(a.value).toBeCloseTo(v, 9); if (q.prompt.includes("-")) takeaways++;
    }
    expect(takeaways).toBeGreaterThan(80);
  });
  it("starts with a mixed number at levels 4 and 5, and stays an addition at level 1", () => {
    for (const q of make("frac-add", 4)) expect(q.prompt).toMatch(/\d\\,\\frac/);
    for (const q of make("frac-add", 1)) expect(q.prompt).not.toContain("-");
  });
  it("draws a picture for a takeaway with no mixed number", () => {
    const q = make("frac-add", 3, 80).find((x) => x.prompt.includes("-"))!;
    expect(q.worked?.type).toBe("bar-model");
  });
});
