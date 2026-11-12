import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "../curriculum";
import { mulberry32 } from "../engine/rng";
import bank from "./try-bank.json";
import { Attempt, makeRound, summarise, verdict } from "./quickfire";
import { buildTryBank } from "./try-bank-build";
import { parseAnswer, sameNumber } from "./try-answer";
import type { TryItem } from "./try-types";

const items = bank as unknown as TryItem[];

describe("reading a typed answer", () => {
  it("accepts plain numbers, money, percentages and units", () => {
    expect(parseAnswer("42")).toBe(42); expect(parseAnswer(" 3.5 ")).toBe(3.5); expect(parseAnswer("£4.20")).toBe(4.2); expect(parseAnswer("1,250")).toBe(1250);
    expect(parseAnswer("45%")).toBe(45); expect(parseAnswer("50p")).toBe(50); expect(parseAnswer("12 cm")).toBe(12); expect(parseAnswer("−7")).toBe(-7); expect(parseAnswer(".5")).toBe(0.5);
  });
  it("rejects anything that isn't a number", () => { for (const t of ["", "abc", "1/2", "3..4", "--2"]) expect(parseAnswer(t), t).toBeNull(); });
  it("compares numbers without tripping over floating point", () => { expect(sameNumber(0.1 + 0.2, 0.3)).toBe(true); expect(sameNumber(5, 6)).toBe(false); });
});

describe("quick-fire times tables", () => {
  it("makes ten different facts from the 2 to 12 tables, with the right answers", () => {
    for (let s = 1; s < 80; s++) {
      const r = makeRound(mulberry32(s)), keys = new Set(r.map((f) => `${Math.min(f.a, f.b)}x${Math.max(f.a, f.b)}`));
      expect(r).toHaveLength(10); expect(keys.size).toBe(10);
      for (const f of r) { expect(f.a).toBeGreaterThanOrEqual(2); expect(f.b).toBeLessThanOrEqual(12); expect(f.answer).toBe(f.a * f.b); }
    }
  });
  it("summarises a round and says something fitting", () => {
    const f = (a: number, b: number) => ({ a, b, answer: a * b });
    const at: Attempt[] = [{ fact: f(6, 7), right: true, ms: 1800 }, { fact: f(8, 9), right: true, ms: 4200 }, { fact: f(3, 4), right: false, ms: 6000 }];
    const s = summarise(at);
    expect(s).toMatchObject({ right: 2, total: 3, averageMs: 3000 }); expect(s.fastest?.fact.a).toBe(6); expect(s.slowest?.fact.a).toBe(8);
    expect(verdict({ ...s, right: 10, total: 10, averageMs: 2000 })).toMatch(/quick/i); expect(verdict({ ...s, right: 4, total: 10 })).toMatch(/good start/i);
    expect(summarise([]).averageMs).toBeNull();
  });
});

describe("the 'Try one' question bank", () => {
  it("is up to date with the generators (run npm run try-bank if this fails)", () => { expect(JSON.parse(JSON.stringify(buildTryBank()))).toEqual(items); });
  it("has enough questions across enough topics", () => { expect(items.length).toBeGreaterThanOrEqual(40); expect(new Set(items.map((i) => i.skill)).size).toBeGreaterThanOrEqual(20); });
  it("every question has a number answer, steps and a picture of the method, and wrong answers are really wrong", () => {
    for (const i of items) {
      expect(Number.isFinite(i.value), i.id).toBe(true); expect(i.solution.length, i.id).toBeGreaterThan(0); expect(i.worked, i.id).toBeTruthy(); expect(i.year, i.id).toBeLessThanOrEqual(6);
      expect(new Set(i.slips.map((s) => s.value)).size, i.id).toBe(i.slips.length);
      for (const s of i.slips) { expect(sameNumber(s.value, i.value), i.id).toBe(false); expect(s.reason.length).toBeGreaterThan(8); }
    }
  });
  it("each question is exactly what its generator makes", () => {
    for (const i of items) { const q = SKILL_BY_ID[i.skill].generate(mulberry32(i.seed), i.level); expect(q.prompt, i.id).toBe(i.prompt); expect(q.answer.kind === "number" && q.answer.value, i.id).toBe(i.value); }
  });
});
