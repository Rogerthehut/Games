import { describe, expect, it } from "vitest";
import { ageBand, hasAssessments, hasSchoolWork, routeAllowed } from "./age";

const nursery = { year: 1, early: "nursery" as const }, reception = { year: 1, early: "reception" as const }, y1 = { year: 1 }, y2 = { year: 2 }, y3 = { year: 3 }, y13 = { year: 13 };
describe("what suits each age", () => {
  it("bands", () => { expect([nursery, reception, y1, y2, y3, y13].map(ageBand)).toEqual(["nursery", "early", "early", "early", "school", "school"]); });
  it("only Year 3 and up get the check-up, plan, tests and certificates", () => {
    for (const p of [nursery, reception, y1, y2]) { expect(hasAssessments(p)).toBe(false); for (const r of ["checkup", "plan", "mock", "pathway-test", "certificate", "report", "print-paper"]) expect(routeAllowed(p, r)).toBe(false); }
    for (const p of [y3, y13]) for (const r of ["checkup", "plan", "pathway-test"]) expect(routeAllowed(p, r)).toBe(true);
    // practice papers: 11+ for Years 5 and 6, GCSE for 10 and 11, A-level for 12 and 13 (nothing yet for Years 3, 4 and 7 to 9)
    for (const y of [5, 6, 10, 11, 12, 13]) expect(routeAllowed({ year: y }, "mock")).toBe(true);
    for (const y of [3, 4, 7, 8, 9]) expect(routeAllowed({ year: y }, "mock")).toBe(false);
  });
  it("nursery has no school practice, but Reception to Year 2 keep it, and Little ones is open to all", () => {
    expect(hasSchoolWork(nursery)).toBe(false); expect(routeAllowed(nursery, "practice")).toBe(false); expect(routeAllowed(nursery, "tables")).toBe(false);
    for (const p of [reception, y1, y2, y3]) expect(routeAllowed(p, "practice")).toBe(true);
    for (const p of [nursery, reception, y3]) { expect(routeAllowed(p, "little")).toBe(true); expect(routeAllowed(p, "me")).toBe(true); expect(routeAllowed(p, "home")).toBe(true); }
  });
});
