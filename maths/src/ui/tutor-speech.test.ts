import { describe, expect, it } from "vitest";
import { spokenReply } from "./practice-audio";

describe("what a tutor reply sounds like", () => {
  it("reads plain text as it is, and simple sums as words", () => {
    expect(spokenReply("Good thinking. What is the first step?")).toBe("Good thinking. What is the first step?");
    expect(spokenReply("Try $12 \\times 3$ first.")).toBe("Try 12 times 3 first.");
  });
  it("turns richer maths into speech instead of reading out symbols", () => {
    const out = spokenReply("Half of it is $\\frac{x}{2}$ and then $x^2$ grows.");
    expect(out).toMatch(/x over 2/); expect(out).toMatch(/x squared/);
    expect(out).not.toMatch(/[$\\{}]/);
  });
  it("never says dollar signs, backslashes or braces", () => {
    expect(spokenReply("Use $\\sqrt{16} + \\alpha$ here.")).not.toMatch(/[$\\{}]/);
  });
});
