import { describe, expect, it } from "vitest";
import { SKILLS } from "../curriculum";
import { activePathwayStage, awardPathwayCertificate, buildPathwayTest, canTakePathwayTest, nextStage, pathwayPassMark } from "./pathway";
import { newProfile, SECURE_BOX } from "./progress";
import { mulberry32 } from "./rng";
import { exportProfile, importProfile } from "./storage";

describe("pathway certificates", () => {
  it("sets one question for every topic and uses only topics from the stage", () => {
    for (const stage of ["KS2", "KS3", "KS4", "KS5"] as const) {
      const expected = SKILLS.filter((skill) => skill.stage === stage).map((skill) => skill.id);
      const paper = buildPathwayTest(stage, mulberry32(1));
      expect(paper.length).toBeGreaterThanOrEqual(8);
      expect([...new Set(paper.map((item) => item.skillId))].sort()).toEqual(expected.sort());
    }
  });

  it("does not unlock the final test when all topics are only assumed", () => {
    const profile = newProfile("Alex", 13, 1);
    expect(activePathwayStage(profile)).toBe("KS5");
    expect(SKILLS.filter((skill) => skill.stage === "KS5").every((skill) => profile.skills[skill.id]?.assumed)).toBe(true);
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
