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
  | { type: "coord-grid"; max: number; min?: number; points: { x: number; y: number; label: string }[]; poly?: [number, number][]; mirror?: { axis: "x" | "y"; value: number }; alt: string }
  | { type: "function-graph"; xMin: number; xMax: number; yMin: number; yMax: number; xStep: number; yStep: number; curves: { pts: [number, number][]; label?: string; dashed?: boolean }[]; marks?: { x: number; y: number; label?: string }[]; strips?: [number, number][]; alt: string }
  | { type: "polygon"; pts: [number, number][]; more?: [number, number][][]; labels: { x: number; y: number; text: string; anchor?: "start" | "middle" | "end" }[]; dashed?: [number, number, number, number][]; rights?: [number, number, number, number, number, number][]; alt: string }
  | { type: "circle-diagram"; mode: "radius" | "diameter" | "sector"; label: string; angle?: number; angleLabel?: string; alt: string }
  | { type: "pie"; slices: { label: string; value: number }[]; alt: string }
  | { type: "parallel-lines"; t: number; marks: { pos: "UTL" | "UTR" | "UBL" | "UBR" | "LTL" | "LTR" | "LBL" | "LBR"; text: string }[]; alt: string }
  | { type: "net"; solid: "cube" | "cuboid" | "triangular prism" | "square-based pyramid" | "triangular-based pyramid"; alt: string }
  | { type: "square-grid"; rows: number; cols: number; cut?: { rows: number; cols: number }; alt: string }
  | { type: "solid"; kind: "cuboid" | "cylinder" | "cone" | "sphere" | "hemisphere" | "tri-prism" | "pyramid" | "tetrahedron"; a?: string; b?: string; c?: string; alt: string }
  | { type: "circle-theorem"; kind: "centre" | "cyclic" | "semicircle"; angles: { at: string; text: string }[]; alt: string }
  | { type: "boxplot"; min: number; lq: number; med: number; uq: number; max: number; labelled: ("lq" | "uq" | "min" | "max" | "med")[]; alt: string }
  | { type: "angle-rays"; total: 180 | 360; parts: { deg: number; label: string }[]; alt: string }
  | { type: "histogram"; bars: { lo: number; hi: number; h: number; note?: string }[]; yMax: number; yLabel: string; alt: string }
  | { type: "code"; lines: string[]; alt: string }
  | { type: "bits"; bits: string; alt: string }
  | { type: "list-boxes"; items: (number | string)[]; alt: string }
  | { type: "number-line"; min: number; max: number; points: { v: number; tone: "red" | "blue" | "new"; label?: string }[]; alt: string }
  | { type: "neuron"; inputs: number[]; weights: number[]; bias?: number; alt: string }
  | { type: "bars"; items: { label: string; value: number }[]; yLabel: string; alt: string }
  /** A small table: a header row and rows of cells (the first cell of each row is a row heading). */
  | { type: "table"; head: string[]; rows: (string | number)[][]; alt: string }
  /** A sum worked in columns. `carries` (addition) are written under the answer; `exchanges` (subtraction) over the top digit, which is struck through. One entry per column, left to right. */
  | { type: "column-sum"; op: "+" | "-"; top: string; bottom: string; result: string; carries: string[]; exchanges: ({ was: string; now: string } | null)[]; alt: string }
  /** Short division: the dividend under the bus stop, the answer above it and the carried remainders. */
  | { type: "bus-stop"; divisor: number; digits: string; quotient: string; carries: string[]; remainder: number; alt: string }
  /** Boxes joined by arrows, top to bottom: an input, steps and an output. `repeat` draws a loop bracket round the steps from `from` to `to`. */
  | { type: "flow"; steps: { text: string; kind?: "in" | "out" | "step" }[]; repeat?: { from: number; to: number; label: string }; alt: string }
  /** The alphabet in two rows with each letter's position (A = 0), for codes and ciphers. */
  | { type: "alphabet"; note?: string; alt: string }
  /** A board with a piece the learner moves by tap, drag, arrow keys or buttons. The piece's place becomes their answer. */
  | { type: "board"; mode: "line" | "grid"; size: number; start: [number, number]; steps: string[]; ask: "x" | "y" | "dist"; alt: string }
  /** A protractor over an angle, to read its size. `from` is the side the first arm points to. */
  | { type: "protractor"; angle: number; from: "left" | "right"; alt: string }
  /** A protractor with a loose arm to turn. The angle it shows becomes the answer. */
  | { type: "angle-draw"; start: number; alt: string }
  /** A grid to draw a rectangle or a right-angled triangle on. The answer is 1 when the sizes match `target` (width and height, or the two short sides). */
  | { type: "shape-draw"; cols: number; rows: number; shape: "rectangle" | "triangle"; target: [number, number]; alt: string }
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
  /** A picture of the method worked through (the column layout, a grid, a bus stop), shown with the steps once the answer is given or asked for. */
  worked?: Figure;
  answer: Answer;
  hint: string;
  /** Worked solution, one step per entry, same $maths$ syntax. */
  solution: string[];
  /** The seed it was made from, so the same question can be made again (for the grown-ups' report). */
  seed?: number;
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
  /** Answered by drawing or moving something on screen, so it is practised and taught but left out of timed papers, check-ups and pathway tests. */
  interactive?: boolean;
  generate: (rng: () => number, level: number) => Question;
}
