import { SKILLS, STAGE_LABEL } from "../curriculum";
import { shuffle } from "../curriculum/helpers";
import { statusOf, type Profile } from "./progress";
import type { Rng } from "./rng";
import type { Stage } from "./types";

const STAGES: Stage[] = ["KS2", "KS3", "KS4", "KS5"];
export const PATHWAY_PASS_PERCENT = 80;

export interface PathwayCertificate {
  stage: Stage;
  at: number;
  score: number;
  total: number;
}

export const nextStage = (stage: Stage): Stage | undefined => STAGES[STAGES.indexOf(stage) + 1];

export function activePathwayStage(profile: Profile): Stage | undefined {
  const first = profile.year < 7 ? 0 : profile.year < 10 ? 1 : profile.year < 12 ? 2 : 3;
  return STAGES.slice(first).find((stage) => !profile.certificates?.some((certificate) => certificate.stage === stage));
}

export function pathwayProgress(profile: Profile, stage: Stage) {
  const skills = SKILLS.filter((skill) => skill.stage === stage && !skill.interactive);
  const ready = skills.filter((skill) => statusOf(profile.skills[skill.id]) === "secure").length;
  return { ready, total: skills.length };
}

// The longer questions combine knowledge from more than one topic.
const APPLICATION_SKILLS: Record<Stage, string[]> = {
  KS2: ["scale-recipes", "pie-chart-counts", "word-problems"],
  KS3: ["linear-gradient", "probability-fractions"],
  KS4: ["reverse-percentages", "circle-area"],
  KS5: ["constant-acceleration", "definite-integrals"],
};

/** How many questions each pathway test has: a fair sample across the topic areas, not one for every topic. */
const PATHWAY_LENGTH: Record<Stage, number> = { KS2: 30, KS3: 24, KS4: 24, KS5: 24 };
function testLength(stage: Stage) {
  return Math.min(PATHWAY_LENGTH[stage], SKILLS.filter((skill) => skill.stage === stage && !skill.interactive).length);
}

/**
 * A test of questions from across the pathway: the applied questions first, then the rest shared between the topic areas
 * (number, algebra, geometry …) in proportion to how many topics each has, with at least one from every area, and no topic twice
 * until every topic in its area has been used. A different mix each time, so a retake isn't the same paper.
 */
export function buildPathwayTest(stage: Stage, rng: Rng) {
  const all = SKILLS.filter((skill) => skill.stage === stage && !skill.interactive), length = testLength(stage);
  const applications = shuffle(rng, APPLICATION_SKILLS[stage]).slice(0, Math.min(APPLICATION_SKILLS[stage].length, Math.floor(length / 8))).map((skillId) => ({ skillId, level: 3 }));
  const room = length - applications.length;
  const areas = [...new Set(all.map((skill) => skill.strand))].map((strand) => ({ strand, pool: shuffle(rng, all.filter((skill) => skill.strand === strand)) }));
  // share the places out by size, then hand any left over to the biggest areas
  const quota = new Map(areas.map((a) => [a.strand, Math.max(1, Math.floor((a.pool.length / all.length) * room))]));
  let given = [...quota.values()].reduce((t, n) => t + n, 0);
  const bySize = [...areas].sort((x, y) => y.pool.length - x.pool.length);
  for (let i = 0; given < room; i = (i + 1) % bySize.length, given++) quota.set(bySize[i].strand, quota.get(bySize[i].strand)! + 1);
  for (let i = bySize.length - 1; given > room; i = (i - 1 + bySize.length) % bySize.length) if (quota.get(bySize[i].strand)! > 1) { quota.set(bySize[i].strand, quota.get(bySize[i].strand)! - 1); given--; }
  const coverage = areas.flatMap((a) => Array.from({ length: quota.get(a.strand)! }, (_, i) => ({ skillId: a.pool[i % a.pool.length].id, level: i % 3 === 2 ? 3 : 2 })));
  return shuffle(rng, [...coverage, ...applications]);
}

export function canTakePathwayTest(profile: Profile, stage: Stage) {
  const { ready, total } = pathwayProgress(profile, stage);
  return stage === activePathwayStage(profile) && total > 0 && ready === total;
}

export const pathwayPassMark = (total: number) => Math.ceil(total * PATHWAY_PASS_PERCENT / 100);
export const pathwayTestName = (stage: Stage) => `${STAGE_LABEL[stage]} pathway test`;

export function awardPathwayCertificate(profile: Profile, stage: Stage, score: number, total: number, at: number): Profile {
  if (!canTakePathwayTest(profile, stage) || total !== testLength(stage) ||
    !Number.isInteger(score) || score > total || score < pathwayPassMark(total)) return profile;
  return { ...profile, certificates: [...(profile.certificates ?? []), { stage, at, score, total }] };
}
