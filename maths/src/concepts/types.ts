/** The study library: short, illustrated explanations of the ideas behind the topics, for learners and for the grown-ups helping them. */
export type Block = { p: string } | { h: string } | { list: string[] };

export type FigureId =
  | "pascal" | "factor-tree" | "place-value" | "fraction-bars" | "array" | "number-line" | "hundred-square"
  | "triangle-angles" | "pythagoras" | "circle-parts" | "gradient" | "parabola" | "prob-tree" | "tangent" | "averages";

export interface Concept {
  id: string;
  title: string;
  /** For example "Years 3 to 6". */
  years: string;
  /** One line, shown in lists and search results. */
  summary: string;
  /** In plain words a learner can read (about Year 5 reading level, or simpler). */
  kid: Block[];
  /** For the grown-up: how to teach it, and the mistakes to look out for. */
  grownUp: Block[];
  figure: { id: FigureId; caption: string; /** a number the picture can be changed by, where it makes sense */ param?: number };
  example: { prompt: string; steps: string[] };
  /** Where this idea shows up in real life or in later maths. */
  why: string;
  /** The topics in quarter that use this idea. */
  skills: string[];
  related: string[];
  /** Places to read more. Links only: we do not copy their text. */
  further: { label: string; url: string }[];
}
