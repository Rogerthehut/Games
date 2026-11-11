import { REASONING_SKILLS, SKILLS } from "../curriculum";
import { shuffle } from "../curriculum/helpers";
import { mulberry32, type Rng } from "./rng";
import type { Strand } from "./types";

/**
 * Practice papers in the general style of 11+ tests: primary content, no hints, marks revealed at the end.
 * They are original practice material, not official or past papers, and the real format, length and timing vary by area and school.
 *
 * Three papers: maths, reasoning (verbal, non-verbal and problem solving), or both in one sitting.
 */
export type PaperKind = "maths" | "reasoning" | "both";
export type Section = "Maths" | "Verbal reasoning" | "Non-verbal reasoning" | "Problem solving";

export interface PaperFormat {
  kind: PaperKind;
  title: string;
  total: number;
  seconds: number;
  blurb: string;
}
export const PAPERS: Record<PaperKind, PaperFormat> = {
  maths: { kind: "maths", title: "Maths paper", total: 20, seconds: 25 * 60, blurb: "20 questions · 25 minutes" },
  reasoning: { kind: "reasoning", title: "Reasoning paper", total: 20, seconds: 20 * 60, blurb: "Verbal, non-verbal and problem solving · 20 questions · 20 minutes" },
  both: { kind: "both", title: "Maths and reasoning", total: 30, seconds: 35 * 60, blurb: "Two parts in one sitting · 30 questions · 35 minutes" },
};
export const MOCK_TOTAL = PAPERS.maths.total;
export const MOCK_SECONDS = PAPERS.maths.seconds;

export interface MockItem { skillId: string; level: number; section: Section }

const WEIGHTS: Partial<Record<Strand, number>> = { Number: 0.5, Measures: 0.15, Ratio: 0.1, Geometry: 0.1, Algebra: 0.08, Statistics: 0.07 };

/** Which part of a paper a skill belongs to. */
export function sectionOf(skillId: string): Section {
  return skillId.startsWith("vr-") ? "Verbal reasoning" : skillId.startsWith("nvr-") ? "Non-verbal reasoning" : skillId.startsWith("ps-") ? "Problem solving" : "Maths";
}

function mathsItems(rng: Rng, count: number): MockItem[] {
  // Written-answer topics only: a maths paper has no multiple choice.
  const pool = SKILLS.filter((s) => s.year <= 6 && s.generate(mulberry32(7), 2).answer.kind !== "choice");
  const used: Record<string, number> = {};
  const out: MockItem[] = [];
  const strands = Object.keys(WEIGHTS) as Strand[];
  while (out.length < count) {
    let roll = rng() * strands.reduce((t, k) => t + (WEIGHTS[k] ?? 0), 0);
    const strand = strands.find((k) => (roll -= WEIGHTS[k] ?? 0) <= 0) ?? "Number";
    const options = pool.filter((s) => s.strand === strand && (used[s.id] ?? 0) < 2);
    if (!options.length) continue;
    const skill = options[Math.floor(rng() * options.length)];
    used[skill.id] = (used[skill.id] ?? 0) + 1;
    out.push({ skillId: skill.id, level: rng() < 0.6 ? 2 : 3, section: "Maths" });
  }
  return shuffle(rng, out);
}

/** Questions for one part of a reasoning paper: spread over the skills in that part, none used more than twice. */
function reasoningItems(rng: Rng, section: Section, count: number): MockItem[] {
  const skills = REASONING_SKILLS.filter((s) => sectionOf(s.id) === section);
  const out: MockItem[] = [];
  let bag: typeof skills = [];
  while (out.length < count) {
    if (!bag.length) bag = shuffle(rng, skills);
    const skill = bag.pop()!;
    const roll = rng();
    out.push({ skillId: skill.id, level: roll < 0.2 ? 1 : roll < 0.7 ? 2 : 3, section });
  }
  return out;
}

const REASONING_PARTS: Record<PaperKind, [Section, number][]> = {
  maths: [],
  reasoning: [["Verbal reasoning", 9], ["Non-verbal reasoning", 7], ["Problem solving", 4]],
  both: [["Verbal reasoning", 7], ["Non-verbal reasoning", 5], ["Problem solving", 3]],
};

/**
 * The questions for a paper. Maths is mixed together. In a reasoning paper the parts follow one another (verbal, then non-verbal,
 * then problem solving), and in the combined paper the maths comes first, as separate papers do in a real sitting.
 */
export function buildMock(rng: Rng, kind: PaperKind = "maths"): MockItem[] {
  const parts = REASONING_PARTS[kind];
  const mathsCount = kind === "maths" ? PAPERS.maths.total : kind === "both" ? 15 : 0;
  return [
    ...(mathsCount ? mathsItems(rng, mathsCount) : []),
    ...parts.flatMap(([section, n]) => shuffle(rng, reasoningItems(rng, section, n))),
  ];
}
