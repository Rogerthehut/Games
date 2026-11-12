import { describe, expect, it } from "vitest";
import { ALL_SKILLS } from "../curriculum";
import { LAST_SCREEN, LESSON_DRAFT_DAYS, buildLesson, finishLesson, hasLesson, pausedLesson } from "./lesson";
import { newProfile, statusOf } from "./progress";
import { isCorrect } from "./check";
import { correctInputs } from "./answer-inputs";

const lessonSkills = ALL_SKILLS.filter((s) => hasLesson(s.id));

describe("worked-example lessons", () => {
  it("are available for a good share of topics, including the KS2 core", () => {
    expect(lessonSkills.length).toBeGreaterThan(100);
    for (const id of ["place-value", "add-sub", "frac-add", "long-division", "pct-amount"]) expect(hasLesson(id), id).toBe(true);
  });

  it("build the same lesson every time, from questions that mark correctly and have worked steps", () => {
    for (const s of lessonSkills) {
      const a = buildLesson(s.id), b = buildLesson(s.id);
      expect(b.model.prompt, s.id).toBe(a.model.prompt);
      const all = [a.model, a.guided, ...a.independent, a.revisit.q];
      expect(new Set([a.model, a.guided, ...a.independent].map((q) => q.prompt)).size, `${s.id} repeats a question`).toBeGreaterThanOrEqual(4);
      for (const q of all) {
        expect(q.solution.length, s.id).toBeGreaterThan(0);
        expect(isCorrect(q, correctInputs(q)), `${s.id}: ${q.prompt}`).toBe(true);
      }
      expect(a.given, s.id).toBeGreaterThanOrEqual(0);
      expect(a.given, s.id).toBeLessThan(a.guided.solution.length);
    }
  });

  it("revisit an earlier topic when there is one", () => {
    expect(buildLesson("frac-add").revisit.skillId).not.toBe("frac-add");
    expect(buildLesson("frac-add").revisit.harder).toBe(false);
  });

  it("record progress, points and the date, and don't punish a shaky lesson", () => {
    const now = 1_700_000_000_000, p = newProfile("Sam", 5, now), lesson = buildLesson("frac-add");
    const good = finishLesson(p, lesson, { helped: false, independentRight: 3, revisitRight: true }, now);
    expect(good.skills["frac-add"].box).toBeGreaterThan(p.skills["frac-add"]?.box ?? 0);
    expect(good.lessons?.["frac-add"]).toBe(now);
    expect(good.points).toBeGreaterThan(p.points);
    const shaky = finishLesson(p, lesson, { helped: true, independentRight: 0, revisitRight: false }, now);
    expect(shaky.skills["frac-add"].wrong).toBe(0);
    expect(statusOf(shaky.skills["frac-add"])).not.toBe("new");
  });
});

describe("a lesson left part-way", () => {
  const draft = (over = {}) => ({ skillId: "place-value", at: 3, helped: false, right: 1, revisit: false, savedAt: Date.now(), ...over });
  it("is offered again, and only while it is recent and not finished", () => {
    const p = { ...newProfile("Maya", 5), lessonDraft: draft() };
    expect(pausedLesson(p)?.at).toBe(3);
    expect(pausedLesson({ ...p, lessonDraft: draft({ savedAt: Date.now() - (LESSON_DRAFT_DAYS + 1) * 86_400_000 }) })).toBeNull();
    expect(pausedLesson({ ...p, lessonDraft: draft({ at: LAST_SCREEN }) })).toBeNull();
    expect(pausedLesson({ ...p, lessonDraft: draft({ skillId: "no-such-topic" }) })).toBeNull();
    expect(pausedLesson(newProfile("Maya", 5))).toBeNull();
  });
  it("is cleared when the lesson is finished", () => {
    const lesson = buildLesson("place-value");
    const p = { ...newProfile("Maya", 5), lessonDraft: draft() };
    const done = finishLesson(p, lesson, { helped: false, independentRight: 3, revisitRight: true });
    expect(done.lessonDraft).toBeUndefined();
    expect(done.lessons?.["place-value"]).toBeGreaterThan(0);
  });
});
