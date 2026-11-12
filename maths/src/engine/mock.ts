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
export type PaperKind = "maths" | "reasoning" | "both" | "quest-maths" | "ripon" | "maths-50" | "maths-60";
export type Section = "Maths" | "Verbal reasoning" | "Non-verbal reasoning" | "Problem solving";

export interface PaperFormat {
  kind: PaperKind;
  title: string;
  total: number;
  seconds: number;
  blurb: string;
  /** The parts of the paper, in order, with how many questions each has. */
  parts: [Section, number][];
  /** "quick" papers are short practice; "test" papers are timed like a published real test. */
  group: "quick" | "test";
  /** For "test" papers: what the timing is based on. The questions are always quarter's own. */
  basis?: string;
}
const paper = (f: Omit<PaperFormat, "total" | "blurb"> & { blurb?: string }): PaperFormat => {
  const total = f.parts.reduce((n, [, c]) => n + c, 0);
  return { ...f, total, blurb: f.blurb ?? `${total} questions · ${f.seconds / 60} minutes` };
};
export const PAPERS: Record<PaperKind, PaperFormat> = {
  maths: paper({ kind: "maths", title: "Maths paper", seconds: 25 * 60, parts: [["Maths", 20]], group: "quick" }),
  reasoning: paper({ kind: "reasoning", title: "Reasoning paper", seconds: 20 * 60, parts: [["Verbal reasoning", 9], ["Non-verbal reasoning", 7], ["Problem solving", 4]], group: "quick", blurb: "Verbal, non-verbal and problem solving · 20 questions · 20 minutes" }),
  both: paper({ kind: "both", title: "Maths and reasoning", seconds: 35 * 60, parts: [["Maths", 15], ["Verbal reasoning", 7], ["Non-verbal reasoning", 5], ["Problem solving", 3]], group: "quick", blurb: "Two parts in one sitting · 30 questions · 35 minutes" }),
  "quest-maths": paper({ kind: "quest-maths", title: "Quest-style maths", seconds: 40 * 60, parts: [["Maths", 60]], group: "test", basis: "Colyton Grammar School's Quest maths paper: 60 questions in 40 minutes." }),
  ripon: paper({ kind: "ripon", title: "Ripon-style reasoning and maths", seconds: 45 * 60, parts: [["Non-verbal reasoning", 40], ["Maths", 25]], group: "test", basis: "Ripon Grammar School's non-verbal reasoning with mathematics paper: two non-verbal sections of 20 questions (10 minutes each), then about 25 maths questions in 25 minutes." }),
  "maths-50": paper({ kind: "maths-50", title: "Maths, 50 minutes", seconds: 50 * 60, parts: [["Maths", 40]], group: "test", basis: "Bournemouth School for Girls' GL Assessment maths paper (50 minutes). The school doesn't say how many questions, so the number is ours." }),
  "maths-60": paper({ kind: "maths-60", title: "Maths, 60 minutes", seconds: 60 * 60, parts: [["Maths", 50]], group: "test", basis: "The Essex (CSSE) maths paper (60 minutes). The number of questions is ours." }),
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
  const pool = SKILLS.filter((s) => s.year <= 6 && !s.interactive && s.generate(mulberry32(7), 2).answer.kind !== "choice");
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

/**
 * The questions for a paper, part by part in the order the format gives. Maths is mixed together; each reasoning part keeps together
 * (verbal, then non-verbal, then problem solving), and where a paper has both, they follow one another as separate papers do in a real sitting.
 */
export function buildMock(rng: Rng, kind: PaperKind = "maths"): MockItem[] {
  return PAPERS[kind].parts.flatMap(([section, n]) => (section === "Maths" ? mathsItems(rng, n) : shuffle(rng, reasoningItems(rng, section, n))));
}
