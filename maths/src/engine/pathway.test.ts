import { describe, expect, it } from "vitest";
import { SKILLS, SKILL_BY_ID } from "../curriculum";
import { activePathwayStage, awardPathwayCertificate, buildPathwayTest, canTakePathwayTest, nextStage, pathwayPassMark } from "./pathway";
import { newProfile, SECURE_BOX } from "./progress";
import { mulberry32 } from "./rng";
import { exportProfile, importProfile } from "./storage";

describe("pathway certificates", () => {
  it("samples the stage fairly: right length, only its topics, every topic area, the applied questions", () => {
    const lengths = { KS2: 30, KS3: 24, KS4: 24, KS5: 24 } as const;
    for (const stage of ["KS2", "KS3", "KS4", "KS5"] as const) {
      const inStage = SKILLS.filter((skill) => skill.stage === stage);
      const ids = new Set(inStage.map((skill) => skill.id));
      for (const seed of [1, 2, 3]) {
        const paper = buildPathwayTest(stage, mulberry32(seed));
        expect(paper.length, `${stage} ${seed}`).toBe(lengths[stage]);
        expect(paper.every((item) => ids.has(item.skillId))).toBe(true);
        const strands = new Set(paper.map((item) => SKILL_BY_ID[item.skillId].strand));
        expect(strands, `${stage} ${seed}`).toEqual(new Set(inStage.map((skill) => skill.strand)));
        expect(paper.filter((item) => item.level === 3).length).toBeGreaterThanOrEqual(2);
        // no topic appears twice while others in its area are unused
        const counts = new Map<string, number>();
        for (const item of paper) counts.set(item.skillId, (counts.get(item.skillId) ?? 0) + 1);
        expect(Math.max(...counts.values()), `${stage} ${seed}`).toBeLessThanOrEqual(2);
      }
      expect(buildPathwayTest(stage, mulberry32(1))).toEqual(buildPathwayTest(stage, mulberry32(1)));
      expect(buildPathwayTest(stage, mulberry32(1)).map((i) => i.skillId)).not.toEqual(buildPathwayTest(stage, mulberry32(2)).map((i) => i.skillId));
    }
  });

  it("does not unlock the final test when all topics are only assumed", () => {
    const profile = newProfile("Alex", 13, 1);
    expect(activePathwayStage(profile)).toBe("KS5");
    // topics for earlier years are assumed; this year\u2019s own topics are not, but nothing has been secured either way
    expect(SKILLS.filter((skill) => skill.stage === "KS5" && skill.year < 13).every((skill) => profile.skills[skill.id]?.assumed)).toBe(true);
    expect(canTakePathwayTest(profile, "KS5")).toBe(false);
  });

  it("requires a ready pathway and a full passing paper, then retains one certificate and advances", () => {
    const profile = newProfile("Alex", 6, 1);
    const total = buildPathwayTest("KS2", mulberry32(2)).length;
    const pass = pathwayPassMark(total);
    expect(canTakePathwayTest(profile, "KS2")).toBe(false);
    expect(awardPathwayCertificate(profile, "KS2", total, total, 2)).toBe(profile);

    for (const skill of SKILLS.filter((entry) => entry.stage === "KS2")) {
      profile.skills[skill.id] = { box: SECURE_BOX, seen: 4, right: 4, wrong: 0, due: 1, last: 1 };
    }
    expect(canTakePathwayTest(profile, "KS2")).toBe(true);
    expect(awardPathwayCertificate(profile, "KS2", total - 1, total - 1, 2)).toBe(profile);
    expect(awardPathwayCertificate(profile, "KS2", pass - 1, total, 2)).toBe(profile);
    const awarded = awardPathwayCertificate(profile, "KS2", pass, total, 3);
    expect(importProfile(exportProfile(awarded)).certificates).toEqual([{ stage: "KS2", at: 3, score: pass, total }]);
    expect(awardPathwayCertificate(awarded, "KS2", total, total, 4)).toBe(awarded);
    expect(activePathwayStage(awarded)).toBe(nextStage("KS2"));
    expect(awarded.year).toBe(6);
  });
});
