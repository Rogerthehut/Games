/**
 * Prints a saved-progress file for a Year 6 learner with several weeks of practice, mistakes, papers and a plan,
 * so the progress report can be looked at with realistic content.   npx tsx scripts/seed-rich-profile.ts > store.json
 */
import { ALL_SKILLS } from "../src/curriculum";
import { buildPlan } from "../src/engine/plan";
import { DAY, newProfile, recordAnswer, recordMistake } from "../src/engine/progress";

const now = Date.now();
let p = newProfile("Maya", 6, now - 70 * DAY);
const pick = ALL_SKILLS.filter((s) => s.year >= 4 && s.year <= 6).slice(0, 26);
let n = 0;
pick.forEach((s, i) => {
  const rounds = 3 + (i % 9);
  for (let k = 0; k < rounds; k++) {
    const good = i % 5 === 3 ? k % 3 === 0 : i % 7 !== 4 || k % 2 === 0;
    p = recordAnswer(p, s.id, good ? (k > 4 ? "right" : "helped") : "wrong", now - (rounds - k) * 2 * DAY + n++);
  }
});
p.sessions = Array.from({ length: 22 }, (_, i) => ({ at: now - (i * 2.6 + 0.3) * DAY, minutes: 8 + (i % 4) * 2, answered: 8 + (i % 3), correct: 5 + (i % 4), skills: [] }));
p = recordMistake(p, "carry", pick[4].id, "Forgot to carry the ten when adding the ones column.", now - 3 * DAY);
p = recordMistake(p, "carry", pick[4].id, "Forgot to carry the ten when adding the ones column.", now - 2 * DAY);
p = recordMistake(p, "denoms", pick[9].id, "Added the bottoms of the fractions as well as the tops.", now - DAY);
p.focus = [pick[4].id];
p.baselines = [
  { at: now - 66 * DAY, startYear: 6, theta: 4.9, se: 0.4, strands: [], gaps: [pick[4].id], strengths: [pick[1].id], readiness: "building" as never, questions: 24, correct: 12, minutes: 21, responses: [] },
  { at: now - 9 * DAY, startYear: 6, theta: 5.8, se: 0.3, strands: [], gaps: [pick[4].id, pick[9].id], strengths: [pick[1].id, pick[2].id], readiness: "on-track" as never, questions: 24, correct: 17, minutes: 19, responses: [] },
];
p.mocks = [{ at: now - 12 * DAY, total: 20, score: 12, seconds: 1320, limitSeconds: 1500, byStrand: [], paper: "maths" }, { at: now - 4 * DAY, total: 30, score: 22, seconds: 1900, limitSeconds: 2100, byStrand: [], paper: "both", bySection: [{ section: "Maths", right: 11, n: 15 }, { section: "Verbal reasoning", right: 7, n: 9 }, { section: "Non-verbal reasoning", right: 4, n: 6 }] }];
p.goal = { exam: "gl", area: "", schools: [], sessionsPerWeek: 4, reasoning: true, examDate: now + 80 * DAY };
p.plan = buildPlan(p, now, { sessionsPerWeek: 4, target: "11plus", reasoning: true });
console.log(JSON.stringify({ version: 1, profiles: [p], activeId: p.id }));
