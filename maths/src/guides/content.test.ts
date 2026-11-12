import { describe, expect, it } from "vitest";
import { CHILD_GUIDE, PARENT_GUIDE, type GuideSection } from "./content";

const words = (g: GuideSection[]) => g.flatMap((s) => [s.title, ...(s.text ?? []), ...(s.steps ?? []), ...(s.tips ?? [])]);

describe("user guides", () => {
  it("have unique sections that each say something", () => {
    for (const guide of [PARENT_GUIDE, CHILD_GUIDE]) {
      expect(new Set(guide.map((s) => s.id)).size).toBe(guide.length);
      for (const s of guide) expect((s.text?.length ?? 0) + (s.steps?.length ?? 0) + (s.tips?.length ?? 0), s.id).toBeGreaterThan(0);
    }
  });
  it("use British spelling and no em dashes", () => {
    for (const t of [...words(PARENT_GUIDE), ...words(CHILD_GUIDE)]) {
      expect(t, t).not.toMatch(/\b(color|organize|practice session|favorite|center)\b/i);
      expect(t, t).not.toContain("—");
    }
  });
  it("keep the children's guide to short sentences", () => {
    for (const t of words(CHILD_GUIDE)) for (const sentence of t.split(/(?<=[.!?])\s+/)) expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(45);
  });
});
