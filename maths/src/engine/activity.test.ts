import { describe, expect, it } from "vitest";
import { skillDestination } from "./activity";
import { newProfile } from "./progress";

describe("where Skills opens", () => {
  it("uses the learner's school stage before their first activity", () => {
    expect([3, 7, 10, 12].map((year) => skillDestination(newProfile("Sam", year)).stage))
      .toEqual(["KS2", "KS3", "KS4", "KS5"]);
  });

  it("restores the most recent topic and gives explicit navigation precedence", () => {
    const profile = { ...newProfile("Sam", 8), lastSkill: "elapsed-time" };
    expect(skillDestination(profile)).toEqual({ skill: "elapsed-time", stage: "KS2" });
    expect(skillDestination(profile, "KS3")).toEqual({ skill: undefined, stage: "KS3" });
    expect(skillDestination(profile, undefined, "frac-equiv")).toEqual({ skill: "frac-equiv", stage: "KS2" });
  });
});
