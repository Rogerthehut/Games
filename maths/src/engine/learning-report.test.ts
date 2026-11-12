import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "../curriculum";
import { buildLearningReport, diagnoseAttempt, lastDays, regenerate } from "./learning-report";
import { newProfile, type Profile } from "./progress";
import { mulberry32 } from "./rng";
import { WRONG_LOG_DAYS, WRONG_LOG_MAX, pruneWrongLog, recordWrong, wrongLogOf } from "./wrong-log";
import { familyFor } from "./help-methods";
import { ALL_SKILLS } from "../curriculum";

const NOW = 1_700_000_000_000, DAY = 86_400_000;
const miss = (p: Profile, skill: string, seed: number, tried: string[], outcome: "missed" | "helped" | "gave-up", at: number, level = 1, notes: string[] = []) => {
  const q = { ...SKILL_BY_ID[skill].generate(mulberry32(seed), level), seed };
  return recordWrong(p, { q, outcome, tried, tags: notes.length ? ["tag"] : [], notes, source: "practice" }, at);
};

describe("diagnosing a wrong answer", () => {
  const e = (prompt: string, shown: string) => ({ prompt, shown, tried: [] as string[] });
  it("spots the usual slips", () => {
    expect(diagnoseAttempt(e("Work out 7 × 8.", "56"), "")?.tag).toBe("blank");
    expect(diagnoseAttempt(e("Work out 7 × 8.", "56"), "57")?.tag).toBe("off-by-one");
    expect(diagnoseAttempt(e("Work out 7 − 12.", "-5"), "5")?.tag).toBe("sign");
    expect(diagnoseAttempt(e("Work out 7 × 8.", "56"), "560")?.tag).toBe("place-value");
    expect(diagnoseAttempt(e("Work out 7 × 8.", "56"), "65")?.tag).toBe("reversed");
    expect(diagnoseAttempt(e("Work out 7 × 8.", "56"), "15")?.reason).toMatch(/added/);
    expect(diagnoseAttempt(e("What is 23 rounded to the nearest 10?", "20"), "23")?.tag).toBe("copied-number");
    expect(diagnoseAttempt(e("Work out 7 × 8.", "56"), "56")).toBeNull();
  });
});

describe("the wrong-question log", () => {
  it("keeps what was asked, what was tried and the seed, and prunes old and surplus entries", () => {
    let p = newProfile("Sam", 5, NOW);
    p = miss(p, "add-sub", 11, ["120"], "missed", NOW);
    expect(wrongLogOf(p)[0]).toMatchObject({ skill: "add-sub", seed: 11, tried: ["120"], outcome: "missed" });
    const old = { ...wrongLogOf(p)[0], at: NOW - (WRONG_LOG_DAYS + 1) * DAY };
    expect(pruneWrongLog([old, ...wrongLogOf(p)], NOW)).toHaveLength(1);
    let big = newProfile("Sam", 5, NOW);
    for (let i = 0; i < WRONG_LOG_MAX + 20; i++) big = miss(big, "add-sub", i, ["1"], "missed", NOW + i * 120_000);
    expect(wrongLogOf(big)).toHaveLength(WRONG_LOG_MAX);
  });
  it("doesn't add the same question twice in a row", () => {
    let p = miss(newProfile("Sam", 5, NOW), "add-sub", 5, ["1"], "missed", NOW);
    p = miss(p, "add-sub", 5, ["2"], "missed", NOW + 1000);
    expect(wrongLogOf(p)).toHaveLength(1);
  });
});

describe("the learning report", () => {
  it("lists the wrong questions in the period, worst topic first, with reasons, methods and resources", () => {
    let p = newProfile("Sam", 5, NOW - 20 * DAY);
    for (let i = 0; i < 4; i++) p = miss(p, "frac-add", 100 + i, ["3"], "missed", NOW - (i + 1) * DAY, 2, ["They added the bottoms as well as the tops."]);
    p = miss(p, "rounding", 7, ["19"], "helped", NOW - 2 * DAY);
    p = miss(p, "division", 9, [], "gave-up", NOW - 30 * DAY); // outside a 14-day window
    const r = buildLearningReport(p, lastDays(14, NOW));
    expect(r.totals).toMatchObject({ topics: 2, missed: 4, helped: 1 });
    expect(r.topics[0].skillId).toBe("frac-add");
    const top = r.topics[0];
    expect(top.reasons[0]).toMatchObject({ kind: "pattern", count: 4 });
    expect(top.reasons.some((x) => x.kind === "general")).toBe(true);
    expect(top.family.id).toBe("fractions");
    expect(top.family.methods.length).toBeGreaterThan(0);
    expect(top.examples.length).toBeGreaterThan(0);
    expect(buildLearningReport(p, lastDays(90, NOW)).topics.map((t) => t.skillId)).toContain("division");
  });

  it("makes a question again from its seed, with its steps, and declines when it no longer matches", () => {
    const p = miss(newProfile("Sam", 5, NOW), "frac-add", 42, ["2"], "missed", NOW);
    const e = wrongLogOf(p)[0], q = regenerate(e)!;
    expect(q.prompt).toBe(e.prompt);
    expect(q.solution.length).toBeGreaterThan(0);
    expect(regenerate({ ...e, prompt: "Something else entirely" })).toBeNull();
    expect(regenerate({ ...e, seed: undefined })).toBeNull();
  });

  it("gives every maths topic a family of help, so no topic is left with nothing", () => {
    for (const s of ALL_SKILLS) { const f = familyFor(s.id); expect(f.methods.length, s.id).toBeGreaterThan(0); expect(f.ask.length, s.id).toBeGreaterThan(0); }
  });
});
