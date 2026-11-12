import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "../curriculum";
import { buildLearningReport, diagnoseAttempt, lastDays, regenerate } from "./learning-report";
import { newProfile, recordAnswer, type Profile } from "./progress";
import { mulberry32 } from "./rng";
import { WRONG_LOG_DAYS, WRONG_LOG_MAX, fixPlan, pruneWrongLog, recordWrong, recordWrongOnce, wrongLogOf } from "./wrong-log";
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

describe("fixing it", () => {
  it("asks the exact questions that went wrong again, then fresh ones at the same level, and asks no repeats", () => {
    let p = newProfile("Sam", 5, NOW - 30 * DAY);
    for (const [seed, ago] of [[11, 1], [12, 2], [12, 3], [13, 4], [14, 5], [15, 6]] as const) p = miss(p, "frac-add", seed, ["3"], "missed", NOW - ago * DAY, 2);
    p = miss(p, "rounding", 5, ["1"], "missed", NOW - DAY);
    const plan = fixPlan(wrongLogOf(p), "frac-add");
    expect(plan.every((x) => x.skillId === "frac-add" && x.reason === "fix")).toBe(true);
    expect(plan.slice(0, 4).map((x) => x.seed)).toEqual([11, 12, 13, 14]); // newest first, the repeat of 12 left out
    expect(plan.slice(4).every((x) => x.seed === undefined && x.level === 2)).toBe(true);
    expect(plan).toHaveLength(8);
    expect(fixPlan(wrongLogOf(p), "division")).toHaveLength(8); // nothing logged: fresh questions only
  });
  it("logs a question answered once, counting a blank as skipped", () => {
    const q = SKILL_BY_ID["rounding"].generate(mulberry32(3), 1);
    let p = recordWrongOnce(newProfile("Sam", 5, NOW), q, ["19"], "check-up", undefined, undefined, NOW);
    p = recordWrongOnce(p, { ...q, prompt: "Another" }, [""], "paper", "t", "Note", NOW + 120_000);
    expect(wrongLogOf(p).map((e) => [e.outcome, e.source])).toEqual([["missed", "check-up"], ["gave-up", "paper"]]);
  });
  it("compares with the same length of time before, and lists topics that have got better", () => {
    let p = newProfile("Sam", 5, NOW - 60 * DAY);
    p = miss(p, "frac-add", 1, ["3"], "missed", NOW - 20 * DAY); p = miss(p, "frac-add", 2, ["3"], "missed", NOW - 18 * DAY);   // before
    p = miss(p, "frac-add", 3, ["3"], "missed", NOW - 2 * DAY);                                                                  // now
    p = miss(p, "rounding", 4, ["1"], "missed", NOW - 19 * DAY);                                                                 // before, none now
    p = recordAnswer(p, "rounding", "right", NOW - DAY);
    const r = buildLearningReport(p, lastDays(14, NOW));
    expect(r.topics.find((t) => t.skillId === "frac-add")).toMatchObject({ total: 1, previous: 2 });
    expect(r.improving.map((i) => i.skillId)).toEqual(["rounding"]);
    expect(r.improving[0].before).toBe(1);
    p = { ...p, fixes: [{ skill: "frac-add", at: NOW - DAY, right: 6, total: 8 }] };
    expect(buildLearningReport(p, lastDays(14, NOW)).topics[0].fix).toEqual({ sets: 1, last: { right: 6, total: 8, at: NOW - DAY } });
  });
});
