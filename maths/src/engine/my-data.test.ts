import { describe, expect, it } from "vitest";
import { describeExport } from "./my-data";

describe("your information, in plain terms", () => {
  const raw = {
    parent: { consentVersion: "2026-11-10b", consentedAt: "2026-11-10T03:39:16.824Z", createdAt: "2026-11-10T03:38:57.854Z" },
    subscription: { status: "trialing", plan: "yearly", trialEnd: "2026-11-17T00:00:00Z", currentPeriodEnd: null, cancelAtPeriodEnd: false },
    learners: [{ id: "a", version: 3, data: { name: "Maya", year: 5, createdAt: 1_790_000_000_000, points: 12, tutor: { enabled: true }, focus: ["x"], baselines: [{}], mocks: [{}, {}],
      skills: { a: { seen: 3, last: 1_790_100_000_000 }, b: { seen: 0, last: 0 } }, sessions: [{ at: 1_790_200_000_000, answered: 9 }, { at: 1_790_300_000_000, answered: 8 }] } }],
  };
  it("summarises the account and each learner", () => {
    const d = describeExport(raw, "a@b.co");
    expect(d).toMatchObject({ email: "a@b.co", agreedVersion: "2026-11-10b", subscription: { status: "trialing", plan: "yearly", cancelling: false } });
    expect(d.created).toBe(Date.parse("2026-11-10T03:38:57.854Z"));
    expect(d.learners[0]).toMatchObject({ name: "Maya", year: 5, points: 12, topicsPractised: 1, questionsAnswered: 17, sessions: 2, checkups: 1, papers: 2, tutorOn: true, focusTopics: 1, lastPractised: 1_790_300_000_000 });
  });
  it("copes with a learner who has done nothing, a missing subscription and strange input", () => {
    expect(describeExport({ parent: {}, learners: [{ data: { name: "Zed", year: 3 } }] }).learners[0]).toMatchObject({ name: "Zed", topicsPractised: 0, lastPractised: null, sessions: 0, tutorOn: false });
    expect(describeExport({ parent: {}, learners: [] }).subscription).toBeNull();
    for (const bad of [null, undefined, 5, "x", [], { learners: "no" }]) expect(() => describeExport(bad)).not.toThrow();
  });
});
