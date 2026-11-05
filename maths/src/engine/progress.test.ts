import { describe, expect, it } from "vitest";
import { DAY, buildSession, isUnlocked, levelOf, newProfile, pickSkills, practiceDaysThisWeek, recordAnswer, statusOf } from "./progress";
import { exportProfile, importProfile } from "./storage";
import { mulberry32 } from "./rng";
import { SKILL_BY_ID } from "../curriculum";

const NOW = new Date("2026-11-05T12:00:00Z").getTime();

describe("progress", () => {
  it("correct answers climb the boxes and push the next review out", () => {
    let p = newProfile("Sam", 3, NOW);
    for (let i = 1; i <= 4; i++) p = recordAnswer(p, "times-tables", "right", NOW);
    expect(p.skills["times-tables"].box).toBe(4);
    expect(statusOf(p.skills["times-tables"])).toBe("secure");
    expect(p.skills["times-tables"].due).toBe(NOW + 14 * DAY);
    expect(levelOf(p.skills["times-tables"])).toBe(3);
  });
  it("a wrong answer drops a box and is due straight away", () => {
    let p = newProfile("Sam", 3, NOW);
    p = recordAnswer(p, "times-tables", "right", NOW);
    p = recordAnswer(p, "times-tables", "right", NOW);
    p = recordAnswer(p, "times-tables", "wrong", NOW);
    expect(p.skills["times-tables"].box).toBe(1);
    expect(p.skills["times-tables"].due).toBe(NOW);
  });
  it("a helped answer does not change the box", () => {
    let p = newProfile("Sam", 3, NOW);
    p = recordAnswer(p, "times-tables", "right", NOW);
    p = recordAnswer(p, "times-tables", "helped", NOW);
    expect(p.skills["times-tables"].box).toBe(1);
  });
  it("year group marks earlier skills as assumed, not locked out", () => {
    const p = newProfile("Ava", 10, NOW);
    expect(p.skills["collect-terms"].assumed).toBe(true);
    expect(isUnlocked(p, SKILL_BY_ID["expand-double"])).toBe(true);
    expect(isUnlocked(newProfile("Ben", 7, NOW), SKILL_BY_ID["expand-double"])).toBe(false);
  });
  it("sessions mix up to three skills and start new learners at the beginning", () => {
    const p = newProfile("Ben", 3, NOW);
    const s = buildSession(p, NOW, mulberry32(1));
    expect(s).toHaveLength(9);
    const ids = new Set(s.map((x) => x.skillId));
    expect(ids.size).toBeLessThanOrEqual(3);
    for (const id of ids) expect(SKILL_BY_ID[id].prereqs).toEqual([]);
  });
  it("due reviews outrank new material, and grown-up focus is honoured", () => {
    let p = newProfile("Ava", 3, NOW);
    p = recordAnswer(p, "add-sub", "right", NOW - 5 * DAY); // box 1, due 4 days ago
    expect(pickSkills(p, NOW, mulberry32(2))[0].skillId).toBe("add-sub");
    p = { ...p, focus: ["decimals"] };
    expect(pickSkills(p, NOW, mulberry32(2)).map((x) => x.skillId)).toContain("decimals");
  });
  it("tracks practice days in the current week", () => {
    const p = { ...newProfile("Sam", 7, NOW), sessions: [{ at: NOW, minutes: 10, answered: 9, correct: 7, skills: [] }] };
    const days = practiceDaysThisWeek(p, NOW);
    expect(days.filter(Boolean)).toHaveLength(1);
    expect(days[3]).toBe(true); // 5 Nov 2026 is a Thursday
  });
});

describe("saving", () => {
  it("round-trips and detects edits", () => {
    const p = recordAnswer(newProfile("Sam", 9, NOW), "pythagoras", "right", NOW);
    expect(importProfile(exportProfile(p))).toEqual(p);
    expect(() => importProfile(exportProfile(p).replace('"Sam"', '"Eve"'))).toThrow(/damaged/);
    expect(() => importProfile("nope")).toThrow();
  });
});
