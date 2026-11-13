import { describe, expect, it } from "vitest";
import { check } from "../engine/check";
import { correctInputs } from "../engine/answer-inputs";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import { SKILL_BY_ID } from "./index";

const make = (id: string, n = 200) => Array.from({ length: n }, (_, i) => SKILL_BY_ID[id].generate(mulberry32(i * 29 + 3), 3));
const ex = (q: Question) => q.answer as { kind: "explain"; model: string; points: string[] };
const num = (s: string) => Number(s.replace(/,/g, ""));
const isPrime = (n: number) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };

describe("explain questions are self-marked", () => {
  it("are excluded from timed papers and check-ups, and have a model answer with key points", () => {
    for (const id of ["explain-why", "explain-algebra"]) {
      expect(SKILL_BY_ID[id].interactive).toBe(true);
      for (const q of make(id, 60)) { expect(q.answer.kind).toBe("explain"); expect(ex(q).points.length).toBeGreaterThanOrEqual(2); expect(ex(q).model.length).toBeGreaterThan(20); expect(q.solution.join(" ")).toContain("Your answer should include"); }
    }
  });
  it("marks by the points the child ticks, and asks for writing and for ticks first", () => {
    for (const q of make("explain-why", 40)) {
      const pts = ex(q).points.length, words = "I think it is because of the numbers";
      expect(check(q, [""]).outcome).toBe("invalid"); expect(check(q, ["yes"]).outcome).toBe("invalid");              // too short
      expect(check(q, [words]).outcome).toBe("invalid");                                                              // written but not yet compared
      expect(check(q, [words, "1".repeat(pts)]).outcome).toBe("correct");
      const partial = "1".repeat(pts - 1) + "0", r = check(q, [words, partial]); expect(r.outcome).toBe("wrong"); expect(r.feedback).toContain(ex(q).points[pts - 1]);
      expect(check(q, [words, "0".repeat(pts)]).outcome).toBe("wrong");
      expect(correctInputs(q)).toEqual([ex(q).model, "1".repeat(pts)]);
    }
  });
});

describe("every claim in a model answer is true", () => {
  it("prime or not", () => {
    for (const q of make("explain-why").filter((x) => /Is \d+ a prime number/.test(x.prompt))) {
      const n = Number(/Is (\d+) a prime/.exec(q.prompt)![1]), yes = ex(q).model.startsWith("Yes");
      expect(yes).toBe(isPrime(n));
      if (!yes) { const m = /= (\d+) × (\d+)/.exec(ex(q).model)!; expect(Number(m[1]) * Number(m[2])).toBe(n); expect(Number(m[1])).toBeGreaterThan(1); }
    }
  });
  it("comparing fractions", () => {
    for (const q of make("explain-why").filter((x) => /says that \d+\/\d+ is (bigger|smaller) than/.test(x.prompt))) {
      const m = /that (\d+)\/(\d+) is (bigger|smaller) than (\d+)\/(\d+)/.exec(q.prompt)!, a = +m[1] / +m[2], c = +m[4] / +m[5], truth = m[3] === "bigger" ? a > c : a < c;
      expect(ex(q).model.startsWith(truth ? "Yes" : "No")).toBe(true);
      const e = /(\d+)\/(\d+) = (\d+)\/(\d+) and (\d+)\/(\d+) = (\d+)\/(\d+)/.exec(ex(q).model)!;
      expect(+e[3] / +e[4]).toBeCloseTo(+e[1] / +e[2], 9); expect(+e[7] / +e[8]).toBeCloseTo(+e[5] / +e[6], 9); expect(e[4]).toBe(e[8]);
    }
  });
  it("decimals, rounding and the digit-sum test for 9", () => {
    for (const q of make("explain-why").filter((x) => /smaller than 0\.\d+ because/.test(x.prompt))) { const m = /that 0\.(\d+) is smaller than 0\.(\d+) because/.exec(q.prompt)!; expect(Number("0." + m[1])).toBeGreaterThan(Number("0." + m[2])); }
    for (const q of make("explain-why").filter((x) => /rounds to/.test(x.prompt))) { const m = /why ([\d,]+) rounds to ([\d,]+), and not ([\d,]+)/.exec(q.prompt)!; expect(num(m[1]) - num(m[3])).toBe(50); expect(num(m[2]) - num(m[3])).toBe(100); }
    for (const q of make("explain-why").filter((x) => /multiple of 9/.test(x.prompt))) {
      const n = num(/Is ([\d,]+) a multiple of 9/.exec(q.prompt)![1]), yes = n % 9 === 0; expect(ex(q).model.startsWith(yes ? "Yes" : "No")).toBe(true);
      expect(Number(/= (\d+),/.exec(ex(q).model)![1])).toBe(String(n).split("").reduce((s, d) => s + Number(d), 0));
    }
  });
  it("the algebra explanations hold for whole numbers", () => {
    for (const q of make("explain-algebra", 120)) {
      const p = q.prompt;
      let m = /Explain why (\d+)n \+ 1 is always odd/.exec(p); if (m) for (let n = 0; n < 12; n++) expect((+m[1] * n + 1) % 2).toBe(1);
      m = /Explain why (\d+)n \+ (\d+) is always a multiple of (\d+)/.exec(p); if (m) for (let n = 0; n < 12; n++) expect((+m[1] * n + +m[2]) % +m[3]).toBe(0);
      m = /\(n \+ (\d+)\)\^2 - \(n - \d+\)\^2\$ is always a multiple of (\d+)/.exec(p); if (m) for (let n = 0; n < 12; n++) expect(((n + +m[1]) ** 2 - (n - +m[1]) ** 2) % +m[2]).toBe(0);
      if (p.includes("n^2 + n")) for (let n = 0; n < 12; n++) expect((n * n + n) % 2).toBe(0);
      if (p.includes("three consecutive")) for (let n = 0; n < 12; n++) expect((n + n + 1 + n + 2) % 3).toBe(0);
    }
  });
});
