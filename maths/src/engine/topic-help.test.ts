import { describe, expect, it } from "vitest";
import { SKILLS } from "../curriculum";
import { familyFor } from "./help-methods";
import { TOPIC_HELP } from "./topic-help";

describe("per-topic help", () => {
  it("every topic has advice of its own or a family's, never only the general fallback", () => {
    for (const s of SKILLS) expect(familyFor(s.id).id, s.id).not.toBe("general");
  });
  it("only names topics that exist", () => {
    const ids = new Set(SKILLS.map((s) => s.id));
    for (const id of Object.keys(TOPIC_HELP)) expect(ids.has(id), id).toBe(true);
  });
  it("each entry has reasons, a method with steps and questions", () => {
    for (const [id, h] of Object.entries(TOPIC_HELP)) {
      expect(h.why.length, id).toBeGreaterThan(0); expect(h.method.steps.length, id).toBeGreaterThanOrEqual(2); expect(h.ask.length, id).toBeGreaterThan(0);
    }
  });
  it("puts the topic's own method first", () => {
    expect(familyFor("bearings").methods[0].title).toMatch(/North/);
  });
});
