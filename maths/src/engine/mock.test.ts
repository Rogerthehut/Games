import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "../curriculum";
import { MOCK_TOTAL, buildMock } from "./mock";
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
        counts[it.skillId] = (counts[it.skillId] ?? 0) + 1;
        if (skill.strand === "Number") number++;
      }
      expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2);
      expect(number).toBeGreaterThanOrEqual(6);
      expect(number).toBeLessThanOrEqual(16);
    }
  });
});
