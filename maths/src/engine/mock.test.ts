import { describe, expect, it } from "vitest";
import { REASONING_SKILLS, SKILL_BY_ID, SKILLS } from "../curriculum";
import { MOCK_TOTAL, PAPERS, buildMock, sectionOf, type PaperKind } from "./mock";
import { buildPlan, orderSkills } from "./plan";
import { newProfile } from "./progress";
import { check } from "./check";
import { mulberry32 } from "./rng";

describe("practice paper", () => {
  it("builds a paper of primary content, number-heavy, with no skill overused", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const items = buildMock(mulberry32(seed));
      expect(items).toHaveLength(MOCK_TOTAL);
      const counts: Record<string, number> = {};
      let number = 0;
      for (const it of items) {
        const skill = SKILL_BY_ID[it.skillId];
        expect(skill.year).toBeLessThanOrEqual(6);
        expect([2, 3]).toContain(it.level);
        expect(it.section).toBe("Maths");
        counts[it.skillId] = (counts[it.skillId] ?? 0) + 1;
        if (skill.strand === "Number") number++;
      }
      expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2);
      expect(number).toBeGreaterThanOrEqual(6);
      expect(number).toBeLessThanOrEqual(16);
    }
  });
});

describe("reasoning and combined papers", () => {
  const runs = (kind: PaperKind, fn: (items: ReturnType<typeof buildMock>) => void) => {
    for (let seed = 1; seed <= 100; seed++) fn(buildMock(mulberry32(seed), kind));
  };
  const sectionRuns = (items: { section: string }[]) => items.map((i) => i.section).filter((s, i, a) => a.indexOf(s) === i && a.indexOf(s) === i);

  it("a reasoning paper has verbal, then non-verbal, then problem solving, and no maths", () => {
    runs("reasoning", (items) => {
      expect(items).toHaveLength(PAPERS.reasoning.total);
      expect(sectionRuns(items)).toEqual(["Verbal reasoning", "Non-verbal reasoning", "Problem solving"]);
      expect(items.filter((i) => i.section === "Verbal reasoning")).toHaveLength(9);
      expect(items.filter((i) => i.section === "Non-verbal reasoning")).toHaveLength(7);
      expect(items.filter((i) => i.section === "Problem solving")).toHaveLength(4);
      for (const it of items) {
        expect(REASONING_SKILLS.some((s) => s.id === it.skillId)).toBe(true);
        expect(sectionOf(it.skillId)).toBe(it.section);
        expect([1, 2, 3]).toContain(it.level);
      }
    });
  });

  it("the combined paper has the maths part first, then the reasoning parts", () => {
    runs("both", (items) => {
      expect(items).toHaveLength(PAPERS.both.total);
      expect(sectionRuns(items)).toEqual(["Maths", "Verbal reasoning", "Non-verbal reasoning", "Problem solving"]);
      expect(items.slice(0, 15).every((i) => i.section === "Maths")).toBe(true);
      expect(items.filter((i) => i.section !== "Maths")).toHaveLength(15);
    });
  });

  it("no skill is used more than twice in any paper, and every question can be generated and marked", () => {
    for (const kind of ["maths", "reasoning", "both"] as PaperKind[]) {
      for (let seed = 1; seed <= 40; seed++) {
        const items = buildMock(mulberry32(seed), kind);
        const counts: Record<string, number> = {};
        items.forEach((it, i) => {
          counts[it.skillId] = (counts[it.skillId] ?? 0) + 1;
          const q = SKILL_BY_ID[it.skillId].generate(mulberry32(seed * 31 + i), it.level);
          if (it.section === "Maths") expect(q.answer.kind).not.toBe("choice");
          if (q.answer.kind === "choice") expect(check(q, [String(q.answer.correct)]).outcome).toBe("correct");
        });
        expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2);
      }
    }
  });

  it("papers fit their time: about a minute or less a question", () => {
    for (const f of Object.values(PAPERS).filter((x) => (x.stage ?? "KS2") === "KS2")) expect(f.seconds / f.total).toBeLessThanOrEqual(75);
    for (const f of Object.values(PAPERS).filter((x) => x.stage === "KS4")) expect(f.seconds / f.total).toBeLessThanOrEqual(190);    // GCSE questions are worth several marks: about three minutes each
    for (const f of Object.values(PAPERS).filter((x) => x.stage === "KS5")) expect(f.seconds / f.total).toBeLessThanOrEqual(400);   // A-level: about six minutes each
  });
});

describe("plans with reasoning", () => {
  const profile = () => newProfile("Test", 5, 1_700_000_000_000);
  const plan = (reasoning: boolean | undefined, target: "11plus" | "general" = "11plus") =>
    buildPlan(profile(), 1_700_000_000_000, { sessionsPerWeek: 4, target, reasoning });

  it("leaves reasoning out unless it is asked for", () => {
    expect(plan(undefined).ordered.some((id) => id.startsWith("vr-") || id.startsWith("nvr-") || id.startsWith("ps-"))).toBe(false);
    expect(plan(false).reasoning).toBeUndefined();
  });
  it("adds every reasoning skill to an 11+ plan when asked, and marks the plan", () => {
    const p = plan(true);
    expect(p.reasoning).toBe(true);
    for (const s of REASONING_SKILLS) expect(p.ordered, s.id).toContain(s.id);
    expect(p.ordered.length).toBeGreaterThan(plan(false).ordered.length);
  });
  it("ignores the request for a general (non-11+) plan", () => {
    const p = plan(true, "general");
    expect(p.reasoning).toBeUndefined();
    expect(p.ordered.some((id) => id.startsWith("vr-"))).toBe(false);
  });
  it("does not change the maths-only ordering", () => {
    expect(orderSkills(profile(), "11plus")).toEqual(orderSkills(profile(), "11plus", false));
    expect(orderSkills(profile(), "11plus").every((id) => SKILLS.some((s) => s.id === id))).toBe(true);
  });
});

describe("papers timed like real tests", () => {
  const TEST_PAPERS = (Object.keys(PAPERS) as PaperKind[]).filter((k) => PAPERS[k].group === "test");
  it("each says what its timing is based on, and its total matches its parts", () => {
    expect(TEST_PAPERS.length).toBeGreaterThanOrEqual(4);
    for (const k of TEST_PAPERS) {
      expect(PAPERS[k].basis?.length, k).toBeGreaterThan(20);
      expect(PAPERS[k].total, k).toBe(PAPERS[k].parts.reduce((n, [, c]) => n + c, 0));
    }
  });
  it("match the published figures they cite", () => {
    expect(PAPERS["quest-maths"]).toMatchObject({ total: 60, seconds: 40 * 60 });
    expect(PAPERS.ripon).toMatchObject({ total: 65, seconds: 45 * 60 });
    expect(PAPERS["maths-50"].seconds).toBe(50 * 60);
    expect(PAPERS["maths-60"].seconds).toBe(60 * 60);
  });
  it("build the right questions in the right order, with maths skills used at most twice", () => {
    for (const k of TEST_PAPERS) for (let seed = 1; seed <= 20; seed++) {
      const items = buildMock(mulberry32(seed), k);
      expect(items, k).toHaveLength(PAPERS[k].total);
      const counts: Record<string, number> = {};
      for (const it of items) if (it.section === "Maths") counts[it.skillId] = (counts[it.skillId] ?? 0) + 1;
      expect(Math.max(0, ...Object.values(counts)), k).toBeLessThanOrEqual(2);
    }
    const ripon = buildMock(mulberry32(3), "ripon");
    expect(ripon.slice(0, 40).every((i) => i.section === "Non-verbal reasoning")).toBe(true);
    expect(ripon.slice(40).every((i) => i.section === "Maths")).toBe(true);
  });
});

import { papersForStage, stageOfPaper } from "./mock";
import { hasPapers, papersName, papersStage } from "./age";
describe("GCSE and A-level papers", () => {
  it("each stage has a quick paper and a timed one", () => {
    expect(papersForStage("KS4")).toEqual(["gcse-quick", "gcse-paper"]); expect(papersForStage("KS5")).toEqual(["alevel-quick", "alevel-paper"]);
    expect(papersForStage("KS2")).toEqual(expect.arrayContaining(["maths", "reasoning", "quest-maths"]));
    expect(PAPERS["gcse-paper"]).toMatchObject({ total: 30, seconds: 90 * 60, group: "test" }); expect(PAPERS["alevel-paper"]).toMatchObject({ total: 20, seconds: 120 * 60, group: "test" });
    expect(PAPERS["alevel-quick"].parts.map(([s]) => s)).toEqual(["Pure maths", "Statistics", "Mechanics"]);
  });
  it("papers use only that stage's written-answer skills, with at most two questions per skill, and a different mix each time", () => {
    for (const kind of ["gcse-quick", "gcse-paper", "alevel-quick", "alevel-paper"] as PaperKind[]) {
      const stage = stageOfPaper(kind), mixes = new Set<string>();
      for (let s = 1; s <= 40; s++) {
        const items = buildMock(mulberry32(s * 977), kind), counts: Record<string, number> = {};
        expect(items.length).toBe(PAPERS[kind].total);
        for (const it of items) { const sk = SKILL_BY_ID[it.skillId]; expect(sk.stage).toBe(stage); expect(sk.interactive).toBeFalsy(); expect(sk.generate(mulberry32(7), it.level).answer.kind).not.toBe("choice"); counts[it.skillId] = (counts[it.skillId] ?? 0) + 1; }
        for (const c of Object.values(counts)) expect(c).toBeLessThanOrEqual(2);
        mixes.add(items.map((i) => i.skillId).join(","));
      }
      expect(mixes.size).toBeGreaterThan(30);
    }
  });
  it("A-level papers follow their parts: pure, statistics, mechanics", () => {
    const items = buildMock(mulberry32(5), "alevel-paper"), by = (sec: string) => items.filter((i) => i.section === sec).length;
    expect([by("Pure maths"), by("Statistics"), by("Mechanics")]).toEqual([14, 3, 3]);
    for (const it of items) expect(sectionOf(it.skillId)).toBe(it.section);
  });
  it("who is offered which papers", () => {
    expect([5, 6].map((y) => papersStage({ year: y }))).toEqual(["KS2", "KS2"]); expect([10, 11].map((y) => papersStage({ year: y }))).toEqual(["KS4", "KS4"]); expect([12, 13].map((y) => papersStage({ year: y }))).toEqual(["KS5", "KS5"]);
    for (const y of [3, 4, 7, 8, 9]) expect(hasPapers({ year: y })).toBe(false);
    expect(hasPapers({ year: 1, early: "reception" })).toBe(false); expect(papersName({ year: 11 })).toBe("GCSE practice papers");
  });
});
