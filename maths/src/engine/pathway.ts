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
  const skills = SKILLS.filter((skill) => skill.stage === stage);
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

function testLength(stage: Stage) {
  return Math.max(8, SKILLS.filter((skill) => skill.stage === stage).length + APPLICATION_SKILLS[stage].length);
}

export function buildPathwayTest(stage: Stage, rng: Rng) {
  const skills = shuffle(rng, SKILLS.filter((skill) => skill.stage === stage));
  const coverage = skills.map((skill) => ({ skillId: skill.id, level: 2 }));
  const applications = shuffle(rng, APPLICATION_SKILLS[stage]).map((skillId) => ({ skillId, level: 3 }));
  const extra = Array.from({ length: testLength(stage) - coverage.length - applications.length }, (_, i) => ({
    skillId: skills[i % skills.length].id, level: i % 2 === 0 ? 1 : 3,
  }));
  return [...coverage, ...extra, ...applications];
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
