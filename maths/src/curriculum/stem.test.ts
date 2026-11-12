import { describe, expect, it } from "vitest";
import { SKILL_BY_ID, SKILLS, STEM_SKILLS } from ".";
import { THEME_OF } from "./stem-themes";

describe("the STEM lab", () => {
  it("is its own area: none of it is in the maths skills", () => {
    const maths = new Set(SKILLS.map((s) => s.id));
    for (const s of STEM_SKILLS) { expect(maths.has(s.id), s.id).toBe(false); expect(s.strand, s.id).toBe("STEM"); expect(s.id, s.id).toMatch(/^stem-/); }
  });
  it("covers every age from Year 3 to Year 13", () => {
    for (const [stage, lo, hi] of [["KS2", 3, 6], ["KS3", 7, 9], ["KS4", 10, 11], ["KS5", 12, 13]] as const) {
      const inStage = STEM_SKILLS.filter((s) => s.stage === stage);
      expect(inStage.length, stage).toBeGreaterThanOrEqual(5);
      for (const s of inStage) { expect(s.year, s.id).toBeGreaterThanOrEqual(lo); expect(s.year, s.id).toBeLessThanOrEqual(hi); }
    }
  });
  it("only builds on topics that exist, and never on something taught later", () => {
    for (const s of STEM_SKILLS) for (const p of s.prereqs) {
      const pre = SKILL_BY_ID[p];
      expect(pre, `${s.id} -> ${p}`).toBeDefined();
      expect(pre.year, `${s.id} -> ${p}`).toBeLessThanOrEqual(s.year);
    }
  });
  it("gives every topic a theme, an explainer and a note for the grown-up", () => {
    for (const s of STEM_SKILLS) { expect(THEME_OF[s.id], s.id).toBeDefined(); expect(s.explainer?.length, s.id).toBeGreaterThan(30); expect(s.parentNote.length, s.id).toBeGreaterThan(30); expect(s.talkAbout.length, s.id).toBeGreaterThan(10); }
  });
});

import { mulberry32 as seeded } from "../engine/rng";
describe("STEM pictures (batch 3)", () => {
  const pictured = ["stem-loops", "stem-input-output", "stem-debugging", "stem-ai-features", "stem-logic", "stem-data-types", "stem-outliers", "stem-gradient-descent", "stem-spam", "stem-caesar", "stem-growth", "stem-storage", "stem-accuracy", "stem-hex", "stem-binary"];
  it("these topics show a picture, and every picture says in words what it shows", () => {
    for (const id of pictured) {
      const s = STEM_SKILLS.find((x) => x.id === id)!;
      let withFigure = 0;
      for (let l = 1; l <= 3; l++) for (let i = 1; i <= 8; i++) {
        const f = s.generate(seeded(i * 17 + l), l).figure;
        if (f) { withFigure++; expect("alt" in f && (f as { alt: string }).alt.length, `${id} L${l}`).toBeGreaterThan(10); expect((f as { alt: string }).alt, `${id} L${l}`).not.toMatch(/\$/); }
      }
      expect(withFigure, id).toBeGreaterThan(0);
    }
  });
});
