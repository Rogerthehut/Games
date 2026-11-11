import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "./index";
import { KS2_OUTCOMES } from "./ks2-outcomes";

describe("Key Stage 2 outcome coverage", () => {
  it("every outcome is covered by at least one real topic, and partial ones say what is left", () => {
    for (const o of KS2_OUTCOMES) {
      expect(o.skills.length, o.text).toBeGreaterThan(0);
      for (const id of o.skills) expect(SKILL_BY_ID[id], `${id} in "${o.text}"`).toBeTruthy();
      if (o.cover === "part") expect(o.note, o.text).toBeTruthy();
    }
  });

  it("no topic is practised before the year the outcome is taught, by more than a year", () => {
    for (const o of KS2_OUTCOMES) for (const id of o.skills) expect(SKILL_BY_ID[id].year, `${id} for "${o.text}"`).toBeLessThanOrEqual(o.year + 1);
  });
});
