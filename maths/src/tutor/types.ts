/** Shared by the app and the tutor service. Keep it dependency-free. */

export type RevealPolicy = "guide" | "after-tries";
export type TutorFlag = "personal-info" | "off-topic" | "limit" | "unavailable";

/** What the child is working on. The tutor sees this, never anything else about the child. */
export interface TutorContext {
  skillId: string;
  skillName: string;
  year: number;
  level: number;
  /** The question, with $maths$. */
  question: string;
  /** The correct answer as shown, with $maths$. Private to the tutor: it must not give this away early. */
  referenceAnswer: string;
  referenceSteps: string[];
  hint: string;
  phase: "ask" | "correct" | "reveal";
  /** What the child has typed so far for this question. */
  childAttempts: string[];
  /** Number of wrong submissions so far. */
  attempts: number;
  hinted: boolean;
}

export interface TutorTurn { role: "child" | "tutor"; text: string }

export interface TutorRequest {
  /** Random per-device id, used only to rate-limit. It identifies no one. */
  deviceId: string;
  context: TutorContext;
  history: TutorTurn[];
  message: string;
  revealPolicy: RevealPolicy;
}

export interface TutorResponse {
  reply: string;
  flag?: TutorFlag;
  remainingToday?: number;
}

export const LIMITS = {
  message: 400,
  turn: 900,
  history: 12,
  question: 900,
  step: 600,
  steps: 8,
  attempt: 120,
  attempts: 6,
} as const;
