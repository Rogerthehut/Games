import { SKILL_BY_ID } from "../curriculum";
import type { Result } from "./check";
import type { Pick, Profile } from "./progress";
import type { Question, Stage } from "./types";

export const STAGE_ORDER: readonly Stage[] = ["KS2", "KS3", "KS4", "KS5"];

export function skillDestination(profile: Profile, stage?: Stage, skill?: string) {
  const latest = skill ?? (stage ? undefined : profile.lastSkill ?? profile.sessions.at(-1)?.skills.at(-1));
  const item = latest ? SKILL_BY_ID[latest] : undefined;
  return {
    skill: item?.id,
    stage: stage ?? item?.stage ?? (profile.year < 7 ? "KS2" : profile.year < 10 ? "KS3" : profile.year < 12 ? "KS4" : "KS5"),
  };
}

export interface AnsweredQuestion {
  q: Question;
  inputs: string[];
  correct: boolean;
  tag?: string;
  message?: string;
}

export interface PathwayDraft {
  questions: Question[];
  taken: AnsweredQuestion[];
  values: string[];
}

export interface PracticeDraft {
  plan: Pick[];
  startedAt: number;
  index: number;
  q: Question;
  phase: "intro" | "ask" | "correct" | "reveal";
  values: string[];
  result: Result | null;
  lastChecked: string;
  attempts: number;
  hinted: boolean;
  showHint: boolean;
  stepsShown: number;
  praise: string;
  tally: {
    answered: number; correct: number; points: number; skills: string[]; seenPrompts: string[];
    introduced: string[]; activeMs: number; giveUps: number; bounces: number;
  };
}
