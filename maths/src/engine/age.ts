import type { Profile } from "./progress";

/**
 * What suits each age. Nursery (2 to 4) gets Little ones only. Reception, Year 1 and Year 2 get Little ones alongside the usual practice and skills,
 * but not the check-up, plan or tests (they start at Year 3 content, so they would only ever be asked things too hard). Year 3 and up get everything.
 */
export type AgeBand = "nursery" | "early" | "school";
export const ageBand = (p: Pick<Profile, "year" | "early">): AgeBand => (p.early === "nursery" ? "nursery" : p.early === "reception" || p.year <= 2 ? "early" : "school");
/** The check-up, the plan, mock and practice papers, the stage tests and certificates, and the check-up report. */
export const hasAssessments = (p: Pick<Profile, "year" | "early">) => ageBand(p) === "school";
/** Practice, the skills list, times tables, the STEM lab and lessons (all written from Year 3). */
export const hasSchoolWork = (p: Pick<Profile, "year" | "early">) => ageBand(p) !== "nursery";

const ASSESSMENT_ROUTES = ["checkup", "plan", "mock", "pathway-test", "certificate", "report", "print-paper"];
const SCHOOL_ROUTES = ["practice", "tables", "stem", "lesson", "equal-groups", "time-lesson", "angles-lesson", "fractions-lesson"];
/** Is this screen offered to this learner? Used to send someone back to Today if an old link or saved screen points somewhere that isn't for them. */
export function routeAllowed(p: Pick<Profile, "year" | "early">, routeName: string): boolean {
  if (ASSESSMENT_ROUTES.includes(routeName)) return hasAssessments(p);
  if (SCHOOL_ROUTES.includes(routeName)) return hasSchoolWork(p);
  return true;
}
