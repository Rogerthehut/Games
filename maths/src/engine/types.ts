import type { Poly } from "./poly";

export type Strand = "Number" | "Ratio" | "Algebra" | "Geometry" | "Measures" | "Statistics" | "Calculus" | "Reasoning" | "STEM";
export type Stage = "KS2" | "KS3" | "KS4" | "KS5";

/** One drawn shape in a non-verbal reasoning puzzle. Drawn on a 100 x 100 square. */
export interface Mark {
  shape: "circle" | "square" | "triangle" | "diamond" | "pentagon" | "hexagon" | "heptagon" | "octagon" | "star" | "cross" | "arrow" | "ell" | "half";
  /** 1 small, 2 medium, 3 large. */
  size: 1 | 2 | 3;
  /** Degrees clockwise. */
  rot: number;
  fill: "none" | "solid" | "stripe" | "light";
  /** Offset from the centre, in the 100 x 100 box. */
  x?: number;
  y?: number;
  /** Mirror left to right before turning. */
  flip?: boolean;
}
/** A picture: either drawn marks, or a grid of shaded cells (0 empty, 1 shaded). */
export type Glyph = { marks: Mark[] } | { grid: number[][] };

export type Figure =
  | { type: "rtriangle"; base: string; height: string; hyp: string; angle?: string }
  | { type: "bar-chart"; interval: number; intervals: number; bars: { label: string; height: number }[] }
  /** Pictures for reasoning questions. A null item is the missing one, drawn as a question mark. */
  | { type: "glyphs"; layout: "series" | "analogy" | "mirror" | "single" | "matrix"; items: (Glyph | null)[]; caption?: string }
  /** Someone's working, one line per step, for "find the mistake" questions. */
  | { type: "working"; lines: string[] }
  /** Drawn diagrams. `alt` says in words what the picture shows, for screen readers and for the AI tutor. */
  | { type: "clock"; h: number; m: number; alt: string }
  | { type: "scale"; start: number; end: number; gaps: number; unit: string; pointer?: number; alt: string }
  | { type: "line-graph"; xs: string[]; ys: number[]; xLabel: string; yLabel: string; yMax: number; alt: string }
  | { type: "scatter"; points: [number, number][]; xLabel: string; yLabel: string; alt: string }
  | { type: "coord-grid"; max: number; points: { x: number; y: number; label: string }[]; mirror?: { axis: "x" | "y"; value: number }; alt: string }
  | { type: "function-graph"; xMin: number; xMax: number; yMin: number; yMax: number; xStep: number; yStep: number; curves: { pts: [number, number][]; label?: string; dashed?: boolean }[]; marks?: { x: number; y: number; label?: string }[]; strips?: [number, number][]; alt: string }
  | { type: "polygon"; pts: [number, number][]; labels: { x: number; y: number; text: string; anchor?: "start" | "middle" | "end" }[]; dashed?: [number, number, number, number][]; rights?: [number, number, number, number, number, number][]; alt: string }
  | { type: "circle-diagram"; mode: "radius" | "diameter" | "sector"; label: string; angle?: number; alt: string }
  | { type: "pie"; slices: { label: string; value: number }[]; alt: string }
  | { type: "parallel-lines"; t: number; marks: { pos: "UTL" | "UTR" | "UBL" | "UBR" | "LTL" | "LTR" | "LBL" | "LBR"; text: string }[]; alt: string }
  | { type: "net"; solid: "cube" | "cuboid" | "triangular prism" | "square-based pyramid" | "triangular-based pyramid"; alt: string }
  | { type: "bearing"; angle: number; from: string; to: string; alt: string }
  | { type: "venn"; labelA: string; labelB: string; a: number; both: number; b: number; alt: string };

/** A choice in a multiple-choice question: words (with $maths$ allowed) or a picture. */
export type ChoiceOption = { text: string } | { glyph: Glyph };

/** Something a student commonly gets wrong, matched against what they typed. */
export interface Misconception {
  tag: string;
  message: string;
  number?: number;
  poly?: Poly;
  multi?: number[];
}

export type Answer =
  | {
      kind: "number"; value: number; tol?: number; label?: string; simplestFraction?: boolean;
      /** How the answer is meant to be written. Worked out for every skill from its wording (see curriculum/index.ts). */
      unit?: string;
      money?: boolean;
      /** Decimal places asked for, and the unrounded value, so "right but rounded wrongly" can be told apart from "wrong". */
      dp?: number;
      exact?: number;
      form?: "integer" | "decimal" | "fraction";
    }
  | { kind: "expr"; value: Poly; form: "collected" | "factorised"; label?: string }
  | { kind: "multi"; fields: { label: string; value: number }[] }
  /** Pick one. The value typed into the answer box is the option's position, "0" to "4". */
  | { kind: "choice"; options: ChoiceOption[]; correct: number };

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
  /** UK school year the skill is first taught (3-13). */
  year: number;
  strand: Strand;
  blurb: string;
  prereqs: string[];
  /** One line for the child, shown the first time they meet the topic. */
  explainer?: string;
  /** For the grown-up: how to explain it. */
  parentNote: string;
  /** For the grown-up: a question to ask to check understanding. */
  talkAbout: string;
  generate: (rng: () => number, level: number) => Question;
}
