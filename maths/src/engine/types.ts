import type { Poly } from "./poly";

export type Strand = "Number" | "Ratio" | "Algebra" | "Geometry" | "Calculus";
export type Stage = "KS3" | "KS4" | "KS5";

export type Figure =
  | { type: "rtriangle"; base: string; height: string; hyp: string; angle?: string };

/** Something a student commonly gets wrong, matched against what they typed. */
export interface Misconception {
  tag: string;
  message: string;
  number?: number;
  poly?: Poly;
  multi?: number[];
}

export type Answer =
  | { kind: "number"; value: number; tol?: number; label?: string; simplestFraction?: boolean }
  | { kind: "expr"; value: Poly; form: "collected" | "factorised"; label?: string }
  | { kind: "multi"; fields: { label: string; value: number }[] };

export interface Question {
  skill: string;
  level: number;
  /** Text with $inline$ and $$display$$ maths. */
  prompt: string;
  figure?: Figure;
  answer: Answer;
  hint: string;
  /** Worked solution, one step per entry, same $maths$ syntax. */
  solution: string[];
  /** The answer as it should be shown, with $maths$. */
  shown: string;
  wrong?: Misconception[];
}

export interface Skill {
  id: string;
  name: string;
  stage: Stage;
  /** UK school year the skill is first taught (7-13). */
  year: number;
  strand: Strand;
  blurb: string;
  prereqs: string[];
  /** For the grown-up: how to explain it. */
  parentNote: string;
  /** For the grown-up: a question to ask to check understanding. */
  talkAbout: string;
  generate: (rng: () => number, level: number) => Question;
}
