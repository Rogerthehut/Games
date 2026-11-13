import { describe, expect, it } from "vitest";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import { SKILL_BY_ID } from "./index";

const make = (id: string, level: number, n = 120) => Array.from({ length: n }, (_, i) => SKILL_BY_ID[id].generate(mulberry32(i * 71 + level), level));
const num = (s: string) => Number(s.replace(/,/g, ""));
const words = (p: string) => (p.match(/[A-Za-z]{2,}/g) ?? []).length;

describe("longer test-style problems", () => {
  it("are longer than our usual questions, with a name and a number that isn't needed", () => {
    for (const level of [1, 2, 3, 4, 5]) for (const q of make("test-problems", level, 60)) {
      expect(words(q.prompt)).toBeGreaterThan(24); expect(q.prompt).toMatch(/\b[A-Z][a-z]+\b/); expect(q.solution[0]).toMatch(/not needed|free|nothing/i);
    }
  });
  it("have answers that agree with working the story through again", () => {
    for (const level of [1, 2, 3, 4, 5]) for (const q of make("test-problems", level, 80)) {
      const p = q.prompt, a = (q.answer as { value: number }).value;
      if (p.includes("party bags")) { const m = /buys (\d+) packs.*?costs £(\d+)\. \S+ also buys a card for £(\d+)(?: and a balloon for £(\d+))?/.exec(p)!; expect(a).toBe(+m[1] * +m[2] + +m[3] + (m[4] ? +m[4] : 0)); }
      else if (p.includes("baking")) { const m = /uses (\d+) g of flour to make (\d+) biscuits\. \S+ wants to make (\d+) biscuits/.exec(p)!; expect(a).toBe((+m[1] * +m[3]) / +m[2]); }
      else if (p.includes("walks to school")) { const m = /lives (\d+) km.*?lives (\d+) km.*?, (\d+) days a week/.exec(p)!; expect(a).toBe(2 * +m[3] * (+m[1] - +m[2])); }
      else if (p.includes("library")) { const m = /has ([\d,]+) fiction books, ([\d,]+) non-fiction books and (\d+) comics\..*?(\d+) of the fiction/.exec(p)!; expect(a).toBe(num(m[1]) + num(m[2]) + +m[3] - +m[4]); }
      else { const m = /buys (\d+) notebooks at £(\d+) each.*?pays with £(\d+)/.exec(p)!; expect(a).toBe(+m[3] - +m[1] * +m[2]); expect(a).toBeGreaterThan(0); }
    }
  });
});

describe("which statement is true, and is it correct?", () => {
  const trueStatement = (t: string): boolean => {
    let m = /^([\d,]+) rounded to the nearest ([\d,]+) is ([\d,]+)\.$/.exec(t);
    if (m) return Math.round(num(m[1]) / num(m[2])) * num(m[2]) === num(m[3]);
    m = /^(\d+) is a multiple of (\d+)\.$/.exec(t);
    if (m) return +m[1] % +m[2] === 0;
    m = /^(\d+)\/(\d+) of (\d+) is greater than (\d+)\/(\d+) of \3\.$/.exec(t);
    if (m) return (+m[1] / +m[2]) > (+m[4] / +m[5]);
    m = /^([\d,]+) × (\d+) = ([\d,]+)\.$/.exec(t);
    if (m) return num(m[1]) * +m[2] === num(m[3]);
    m = /^([\d,]+) ÷ (\d+) is bigger than ([\d,]+)\.$/.exec(t);
    if (m) return num(m[1]) / +m[2] > num(m[3]);
    throw new Error(`unrecognised statement: ${t}`);
  };
  it("always has exactly one true statement, and it is the one marked", () => {
    for (const level of [1, 3, 5]) for (const q of make("test-claims", level, 150)) {
      const a = q.answer as { kind: "choice"; options: { text: string }[]; correct: number };
      expect(a.options.length).toBeGreaterThanOrEqual(3); expect(new Set(a.options.map((o) => o.text)).size).toBe(a.options.length);
      const truths = a.options.map((o) => trueStatement(o.text)); expect(truths.filter(Boolean)).toHaveLength(1); expect(truths[a.correct]).toBe(true);
    }
  });
  it("says correctly whether someone is right", () => {
    for (const level of [2, 4]) for (const q of make("test-claims", level, 150) as Question[]) {
      const a = q.answer as { kind: "choice"; correct: number }, p = q.prompt; let truth: boolean;
      let m = /"([\d,]+) \+ ([\d,]+) = ([\d,]+)\."/.exec(p);
      if (m) truth = num(m[1]) + num(m[2]) === num(m[3]);
      else if ((m = /"(\d+)% of (\d+) is (\d+)\."/.exec(p))) truth = (+m[1] * +m[2]) / 100 === +m[3];
      else { m = /works out (\d+) × (\d+) \+ (\d+) and says the answer is (\d+)/.exec(p)!; truth = +m[1] * +m[2] + +m[3] === +m[4]; }
      expect(a.correct).toBe(truth ? 0 : 1);
    }
  });
});
