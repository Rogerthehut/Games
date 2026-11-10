import { describe, expect, it } from "vitest";
import { DAY, newProfile, type Profile } from "./progress";
import { mulberry32 } from "./rng";
import { ALL_FACTS, CHECK_LENGTH, QUICK_MS, checkQuestions, defaultTables, factKey, factStatus, pickRound, recordFact, summarise, tablesOf } from "./tables";

const now = Date.UTC(2026, 10, 10, 12);
const fresh = () => newProfile("Maya", 5, now);

describe("times table facts", () => {
  it("treats 7 × 8 and 8 × 7 as one fact, and covers 2 to 12", () => {
    expect(factKey(8, 7)).toBe("7x8");
    expect(ALL_FACTS).toHaveLength(66);
  });
  it("starts with the easy tables for younger years and everything from Year 5", () => {
    expect(defaultTables(3)).toEqual([2, 5, 10]);
    expect(defaultTables(5)).toHaveLength(11);
  });
  it("moves a fact up only when the answer is right and quick", () => {
    let p = fresh();
    for (let i = 0; i < 4; i++) p = recordFact(p, 7, 8, true, 1500, now);
    expect(factStatus(tablesOf(p).facts["7x8"])).toBe("quick");
    let q = fresh();
    for (let i = 0; i < 6; i++) q = recordFact(q, 7, 8, true, QUICK_MS + 2000, now);
    expect(factStatus(tablesOf(q).facts["7x8"])).toBe("slow"); // right every time, but still worked out
    expect(tablesOf(q).facts["7x8"].b).toBeLessThanOrEqual(2);
  });
  it("sends a wrong answer back and makes it due straight away", () => {
    let p = fresh();
    for (let i = 0; i < 3; i++) p = recordFact(p, 6, 9, true, 1500, now);
    p = recordFact(p, 9, 6, false, 4000, now);
    const st = tablesOf(p).facts["6x9"];
    expect(st.b).toBe(3);
    expect(st.d).toBe(now);
    expect(st.n).toBe(4);
  });
  it("does not change the learner's other progress", () => {
    const p = fresh(), q = recordFact(p, 3, 4, true, 1000, now);
    expect(q.skills).toBe(p.skills);
    expect(p.tables).toBeUndefined();
  });
  it("brings a secure fact back after a few days", () => {
    let p = fresh();
    for (let i = 0; i < 5; i++) p = recordFact(p, 2, 3, true, 900, now);
    expect(tablesOf(p).facts["2x3"].d).toBeGreaterThanOrEqual(now + 8 * DAY);
  });
});

describe("a practice round", () => {
  it("stays inside the chosen tables and has ten questions with the right answers", () => {
    const p = { ...fresh(), tables: { facts: {}, active: [3], rounds: 0, checks: [] } };
    const round = pickRound(p, now, mulberry32(1));
    expect(round).toHaveLength(10);
    for (const q of round) {
      expect(q.a === 3 || q.b === 3).toBe(true);
      expect(q.answer).toBe(q.op === "×" ? q.a * q.b : q.b);
    }
  });
  it("never asks the same fact twice in a row, and leans on the facts that are wrong", () => {
    let p: Profile = { ...fresh(), tables: { facts: {}, active: [6, 7], rounds: 0, checks: [] } };
    for (let i = 0; i < 4; i++) p = recordFact(p, 6, 6, true, 1000, now);
    for (let i = 0; i < 3; i++) p = recordFact(p, 7, 8, false, 5000, now);
    let hard = 0, easy = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const round = pickRound(p, now, mulberry32(seed), { size: 12 });
      round.forEach((q, i) => { if (i) expect(factKey(q.a, q.b)).not.toBe(factKey(round[i - 1].a, round[i - 1].b)); });
      for (const q of round) { const k = factKey(q.a, q.b); if (k === "7x8") hard++; if (k === "6x6") easy++; }
    }
    expect(hard).toBeGreaterThan(easy);
  });
  it("can practise one table on its own", () => {
    const round = pickRound(fresh(), now, mulberry32(2), { only: 9 });
    expect(round.every((q) => q.a === 9 || q.b === 9)).toBe(true);
  });
  it("only turns a fact into a division question once it has been answered right", () => {
    const round = pickRound(fresh(), now, mulberry32(3), { size: 30 });
    expect(round.every((q) => q.op === "×")).toBe(true);
  });
});

describe("the timed check", () => {
  it("is 25 multiplication questions from 2 to 12", () => {
    const qs = checkQuestions(mulberry32(5));
    expect(qs).toHaveLength(CHECK_LENGTH);
    expect(qs.every((q) => q.op === "×" && q.a >= 2 && q.b <= 12 && q.answer === q.a * q.b)).toBe(true);
  });
});

describe("the summary", () => {
  it("counts facts by how well they are known and lists the ones to work on", () => {
    let p = fresh();
    for (let i = 0; i < 4; i++) p = recordFact(p, 2, 2, true, 1000, now);
    p = recordFact(p, 7, 8, false, 5000, now);
    const s = summarise(p);
    expect(s.total).toBe(66);
    expect(s.counts.quick).toBe(1);
    expect(s.counts.learning).toBe(1);
    expect(s.counts.new).toBe(64);
    expect(s.workOn[0].text).toBe("7 × 8");
    expect(s.byTable[0]).toMatchObject({ table: 2, quick: 1 });
  });
});
