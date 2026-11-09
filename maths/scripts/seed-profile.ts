/**
 * Prints a saved-progress file for a Year 5 learner who has finished the check-up and has a plan with reasoning included.
 * Used by the screen-size audit so it can reach screens that need a plan.   npx tsx scripts/seed-profile.ts > store.json
 */
import { buildPlan } from "../src/engine/plan";
import { newProfile } from "../src/engine/progress";

const now = Date.now();
const p = newProfile("Maya", 5, now);
p.baselines = [{ at: now, startYear: 5, theta: 5.4, se: 0.3, strands: [], gaps: [], strengths: [], readiness: "on-track" as never, questions: 24, correct: 15, minutes: 20, responses: [] }];
p.goal = { exam: "gl", area: "", schools: [], sessionsPerWeek: 4, reasoning: true };
p.plan = buildPlan(p, now, { sessionsPerWeek: 4, target: "11plus", reasoning: true });
console.log(JSON.stringify({ version: 1, profiles: [p], activeId: p.id }));
