import { describe, expect, it } from "vitest";
import { SKILLS } from "../curriculum";
import { TEST_LENGTH, applyBaseline, applyResponse, bandOf, difficulty, nextItem, replay, startState, summarise, yearLabel } from "./diagnostic";
import { buildPlan, currentWeek, orderSkills, planFocus } from "./plan";
import { DAY, newProfile, statusOf, type DiagResponse } from "./progress";
import { mulberry32 } from "./rng";

/** A pretend child: knows things at or below their level, with an optional hole in one skill. */
function simulate(trueLevel: number, startYear: number, seed: number, hole?: string, cascade = false) {
  const r = mulberry32(seed);
  let s = startState(startYear);
  for (;;) {
    const item = nextItem(s, r);
    if (!item) break;
    const d = difficulty(item.skillId, item.level);
    let p = 1 / (1 + Math.exp(-(trueLevel - d) / 0.7));
    if (item.skillId === hole) p = 0.03;
    else if (cascade && hole && SKILLS.find((k) => k.id === item.skillId)!.prereqs.includes(hole)) p *= 0.25; // weak foundations hurt what is built on them
    s = applyResponse(s, { skillId: item.skillId, level: item.level, correct: r() < p, ms: 20000 });
  }
  return s;
}

describe("check-up", () => {
  it("asks exactly TEST_LENGTH questions and never repeats one", () => {
    const s = simulate(6, 6, 1);
    expect(s.n).toBe(TEST_LENGTH);
    expect(s.asked.size).toBe(TEST_LENGTH);
  });

  it("finds the working level, wherever the child starts", () => {
    const errs: number[] = [];
    for (let i = 0; i < 60; i++) {
      const truth = 3.5 + (i % 12) * 0.7; // 3.5 .. 11.2
      const start = Math.max(3, Math.min(13, Math.round(truth + ((i * 7) % 5) - 2))); // a start year up to 2 away
      errs.push(simulate(truth, start, 100 + i).theta - truth);
    }
    const mean = errs.reduce((a, b) => a + Math.abs(b), 0) / errs.length;
    const worst = Math.max(...errs.map(Math.abs));
    expect(mean).toBeLessThan(0.7);
    expect(worst).toBeLessThan(1.7);
  });

  it("spreads questions across topic strands", () => {
    const s = simulate(6.5, 6, 7);
    const strands = new Set(s.responses.map((r) => SKILLS.find((k) => k.id === r.skillId)!.strand));
    expect(strands.size).toBeGreaterThanOrEqual(4);
  });

  it("flags a hole in a skill near the child's level whenever it is asked", () => {
    let asked = 0, flagged = 0;
    for (let i = 0; i < 80; i++) {
      const s = simulate(6.2, 6, 500 + i, "frac-amount");
      if (s.responses.some((r) => r.skillId === "frac-amount")) {
        asked++;
        if (summarise(s).gaps.includes("frac-amount")) flagged++;
      }
    }
    expect(asked).toBeGreaterThan(11); // the pool of topics keeps growing, so any one topic is asked a little less often
    // Misses above the working level are deliberately not called gaps, so this is not 100%.
    expect(flagged / asked).toBeGreaterThan(0.7);
  });

  it("traces a weak foundation by probing prerequisites after misses on skills built on it", () => {
    let found = 0, total = 0;
    for (let i = 0; i < 80; i++) {
      const s = simulate(6.4, 6, 900 + i, "times-tables", true);
      total++;
      if (summarise(s).gaps.includes("times-tables")) found++;
    }
    expect(found / total).toBeGreaterThanOrEqual(0.68); // more topics now build on times tables, so the probe has more to choose from
  });

  it("does not manufacture gaps for a child with none (a few slips on single questions are expected)", () => {
    let gapCount = 0;
    for (let i = 0; i < 40; i++) gapCount += summarise(simulate(6.5, 6, 1300 + i)).gaps.length;
    expect(gapCount / 40).toBeLessThan(3); // a gap needs only one clear miss, and a strong child still slips a couple of times in 24 questions
  });

  it("is deterministic for a given set of responses (so a paused test resumes exactly)", () => {
    const s = simulate(5.5, 5, 9);
    expect(replay(5, s.responses).theta).toBe(s.theta);
  });

  it("labels levels and readiness sensibly", () => {
    expect(yearLabel(5.5)).toBe("mid Year 5");
    expect(yearLabel(6.9)).toBe("late Year 6");
    expect(bandOf(7)).toBe("ready");
    expect(bandOf(5.9)).toBe("on-track");
    expect(bandOf(5)).toBe("building");
    expect(bandOf(3.5)).toBe("early");
  });
});

describe("turning a check-up into a starting point", () => {
  const NOW = new Date("2026-11-05T12:00:00Z").getTime();

  it("marks gaps as learning, correct skills as progressing, and sets earlier untested skills as assumed", () => {
    const s = simulate(6.2, 6, 11, "division");
    const rec = summarise(s, NOW);
    const p = applyBaseline(newProfile("Sam", 6, NOW), rec, NOW);
    expect(p.baselines).toHaveLength(1);
    expect(p.diag).toBeUndefined();
    if (rec.gaps.includes("division")) {
      expect(p.skills["division"].box).toBe(0);
      expect(statusOf(p.skills["division"])).toBe("learning");
    }
    // a Year 3 skill, comfortably below the working level, is either tested-and-right or assumed known
    expect(["secure", "growing", "assumed"]).toContain(statusOf(p.skills["place-value"]));
  });

  it("removes a year-group assumption when the check-up shows the child is below it", () => {
    const start = newProfile("Ava", 9, NOW); // assumes Year 3-8 content is known
    expect(start.skills["sequences"]?.assumed).toBe(true);
    const low: DiagResponse[] = [];
    let s = startState(9);
    const r = mulberry32(3);
    for (;;) {
      const item = nextItem(s, r);
      if (!item) break;
      const correct = difficulty(item.skillId, item.level) <= 4.2;
      low.push({ skillId: item.skillId, level: item.level, correct, ms: 1000 });
      s = applyResponse(s, low[low.length - 1]);
    }
    const p = applyBaseline(start, summarise(s, NOW), NOW);
    expect(p.skills["frac-add"]?.assumed).toBeUndefined(); // Year 6 content is no longer assumed
  });
});

describe("secure skills stay out of the plan", () => {
  const NOW = new Date("2026-11-05T12:00:00Z").getTime();
  it("does not plan skills the child answered correctly far below their level", () => {
    const rec = summarise(simulate(7.5, 5, 77), NOW);
    const p = applyBaseline(newProfile("Ava", 5, NOW), rec, NOW);
    const plan = orderSkills(p, "11plus");
    for (const r of rec.responses) {
      const easy = r.correct && difficulty(r.skillId, r.level) <= rec.theta - 0.7 && !rec.gaps.includes(r.skillId);
      if (easy) expect(plan, r.skillId).not.toContain(r.skillId);
    }
  });
  it("says 'below Year 3' rather than inventing a Year 2 level", () => {
    expect(yearLabel(2.4)).toBe("below Year 3");
  });
});

describe("action plan", () => {
  const NOW = new Date("2026-11-05T12:00:00Z").getTime();
  const profileWithGaps = () => {
    const s = simulate(5.0, 5, 21, "frac-equiv");
    return applyBaseline(newProfile("Zara", 5, NOW), summarise(s, NOW), NOW);
  };

  it("puts prerequisites before the skills that need them", () => {
    const p = profileWithGaps();
    const order = orderSkills(p, "11plus");
    for (const id of order) {
      const skill = SKILLS.find((k) => k.id === id)!;
      for (const q of skill.prereqs) if (order.includes(q)) expect(order.indexOf(q)).toBeLessThan(order.indexOf(id));
    }
  });

  it("only includes primary content for the 11+, and leaves out what is secure", () => {
    const p = profileWithGaps();
    for (const id of orderSkills(p, "11plus")) expect(SKILLS.find((k) => k.id === id)!.year).toBeLessThanOrEqual(6);
  });

  it("fits what it can before the exam date and says what it had to leave out", () => {
    const p = profileWithGaps();
    const generous = buildPlan(p, NOW, { sessionsPerWeek: 5, target: "11plus", examDate: NOW + 60 * 7 * DAY });
    const tight = buildPlan(p, NOW, { sessionsPerWeek: 2, target: "11plus", examDate: NOW + 6 * 7 * DAY });
    expect(generous.deferred).toHaveLength(0);
    expect(tight.deferred.length).toBeGreaterThan(0);
    expect(tight.weeks.length).toBeLessThanOrEqual(6);
    expect(generous.weeks.at(-1)?.kind).toBe("mock");
  });

  it("uses spare time before a distant exam for revision, and keeps mock papers for the end", () => {
    const p = profileWithGaps();
    const plan = buildPlan(p, NOW, { sessionsPerWeek: 5, target: "11plus", examDate: NOW + 60 * 7 * DAY });
    const kinds = plan.weeks.map((w) => w.kind);
    expect(kinds.filter((k) => k === "review").length).toBeGreaterThan(0);
    expect(kinds.slice(-2)).toEqual(["mock", "mock"]);
    expect(kinds.indexOf("review")).toBeGreaterThan(kinds.indexOf("learn"));
  });

  it("gives this week's skills to the practice engine, then moves on as weeks pass", () => {
    let p = profileWithGaps();
    p = { ...p, plan: buildPlan(p, NOW, { sessionsPerWeek: 4, target: "11plus" }) };
    const now = planFocus(p, NOW);
    expect(now.length).toBeGreaterThan(0);
    expect(now.length).toBeLessThanOrEqual(3);
    const week1 = currentWeek(p.plan!, NOW)!;
    const later = currentWeek(p.plan!, NOW + 2 * 7 * DAY)!;
    expect(later.n).toBeGreaterThan(week1.n);
  });
});
