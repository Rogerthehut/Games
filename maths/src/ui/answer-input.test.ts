import { describe, expect, it } from "vitest";
import { applyKey } from "./answer-input";
import { currentStreak, newProfile } from "../engine/progress";
import { check } from "../engine/check";
import { SKILLS } from "../curriculum";
import { mulberry32 } from "../engine/rng";

describe("keypad editing", () => {
  it("inserts at the caret and moves it on", () => {
    expect(applyKey("12", "5", 1, 1)).toEqual({ text: "152", caret: 2 });
    expect(applyKey("", "7", 0, 0)).toEqual({ text: "7", caret: 1 });
  });
  it("replaces a selection", () => {
    expect(applyKey("1234", "9", 1, 3)).toEqual({ text: "194", caret: 2 });
  });
  it("deletes before the caret, or the selection, and is safe at the start", () => {
    expect(applyKey("123", "⌫", 3, 3)).toEqual({ text: "12", caret: 2 });
    expect(applyKey("123", "⌫", 1, 3)).toEqual({ text: "1", caret: 1 });
    expect(applyKey("123", "⌫", 0, 0)).toEqual({ text: "123", caret: 0 });
  });
  it("turns the minus key into a plain hyphen so it can be marked", () => {
    expect(applyKey("", "−", 0, 0).text).toBe("-");
  });
});

describe("what the keypad types is understood by the marker", () => {
  it("accepts an answer typed key by key, including fractions, minus and decimals", () => {
    const typed = (answer: string) => answer.split("").reduce((t, ch) => applyKey(t, ch === "-" ? "−" : ch, t.length, t.length).text, "");
    for (const skill of SKILLS.filter((s) => s.year <= 6)) {
      for (let seed = 1; seed <= 20; seed++) {
        const q = skill.generate(mulberry32(seed * 13), 2);
        if (q.answer.kind === "number") {
          const v = q.answer.simplestFraction
            ? (() => { for (let d = 1; d <= 60; d++) { const n = Math.round(q.answer.kind === "number" ? q.answer.value * d : 0); if (Math.abs(n / d - (q.answer as { value: number }).value) < 1e-9) return `${n}/${d}`; } return String(q.answer.value); })()
            : String(q.answer.value);
          expect(check(q, [typed(v)]).outcome, `${skill.id} ${v}`).not.toBe("wrong");
        }
      }
    }
  });
});

describe("streaks", () => {
  const day = (d: number, h = 12) => new Date(2026, 10, d, h).getTime();
  const withSessions = (days: number[]) => ({ ...newProfile("Sam", 5, day(1)), sessions: days.map((d) => ({ at: day(d), minutes: 10, answered: 9, correct: 7, skills: [] })) });
  it("counts consecutive days ending today", () => expect(currentStreak(withSessions([3, 4, 5]), day(5, 20))).toBe(3));
  it("does not lose the streak just because today hasn't been done yet", () => expect(currentStreak(withSessions([3, 4]), day(5, 8))).toBe(2));
  it("breaks after a missed day", () => expect(currentStreak(withSessions([1, 2, 4]), day(5, 8))).toBe(1));
  it("is zero with no recent practice", () => expect(currentStreak(withSessions([1]), day(9))).toBe(0));
});
