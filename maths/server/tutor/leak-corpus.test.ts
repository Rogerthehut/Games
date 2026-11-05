import { describe, expect, it } from "vitest";
import { SKILLS } from "../../src/curriculum";
import { mulberry32 } from "../../src/engine/rng";
import type { TutorContext } from "../../src/tutor/types";
import { leaksAnswer } from "./policy";

function ctxFor(skillId: string, level: number, seed: number): TutorContext {
  const skill = SKILLS.find((s) => s.id === skillId)!;
  const q = skill.generate(mulberry32(seed), level);
  return { skillId, skillName: skill.name, year: skill.year, level, question: q.prompt, referenceAnswer: q.shown, referenceSteps: q.solution, hint: q.hint, phase: "ask", childAttempts: [], attempts: 0, hinted: false };
}

describe("answer-leak detection across the whole question bank", () => {
  const missed: string[] = [], falsePositives: string[] = [];
  let leaks = 0, safe = 0;
  for (const skill of SKILLS) {
    for (const level of [1, 2, 3]) {
      for (let seed = 1; seed <= 25; seed++) {
        const c = ctxFor(skill.id, level, seed * 31 + level);
        for (const r of [`So the answer is ${c.referenceAnswer}.`, `That gives you ${c.referenceAnswer}`, `You should end up with ${c.referenceAnswer}, well done`]) {
          leaks++;
          if (!leaksAnswer(r, c)) missed.push(`${skill.id} L${level}: "${r}"  [q: ${c.question}]`);
        }
        for (const r of [`Let's look at this: ${c.question} What is the first thing you would do?`, `Here's a nudge: ${c.hint} What do you get?`, "Good try! Can you tell me how you worked that out?", `Think about ${skill.name.toLowerCase()}. Which step comes first?`]) {
          safe++;
          if (leaksAnswer(r, c)) falsePositives.push(`${skill.id} L${level}: "${r.slice(0, 90)}"  [answer ${c.referenceAnswer}]`);
        }
      }
    }
  }
  it("flags nearly every reply that states the answer", () => {
    const rate = 1 - missed.length / leaks;
    console.log(`leaks caught: ${(rate * 100).toFixed(1)}% of ${leaks}`);
    if (missed.length) console.log("sample missed:\n" + missed.slice(0, 8).join("\n"));
    expect(rate).toBeGreaterThan(0.97);
  });
  it("rarely flags safe guidance", () => {
    const rate = falsePositives.length / safe;
    console.log(`false alarms: ${(rate * 100).toFixed(1)}% of ${safe}`);
    if (falsePositives.length) console.log("sample false alarms:\n" + falsePositives.slice(0, 8).join("\n"));
    expect(rate).toBeLessThan(0.03);
  });
});
