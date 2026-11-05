import { SKILLS } from "../curriculum";
import { shuffle } from "../curriculum/helpers";
import type { Rng } from "./rng";
import type { Strand } from "./types";

/**
 * A practice paper in the general style of 11+ maths: all primary content, weighted towards number work, no hints,
 * marks revealed at the end. It is original practice material, not an official or past paper, and the real
 * format and timing vary by area.
 */
export const MOCK_TOTAL = 20;
export const MOCK_SECONDS = 25 * 60;

const WEIGHTS: Partial<Record<Strand, number>> = { Number: 0.5, Measures: 0.15, Ratio: 0.1, Geometry: 0.1, Algebra: 0.08, Statistics: 0.07 };

export function buildMock(rng: Rng): { skillId: string; level: number }[] {
  const pool = SKILLS.filter((s) => s.year <= 6);
  const used: Record<string, number> = {};
  const out: { skillId: string; level: number }[] = [];
  const strands = Object.keys(WEIGHTS) as Strand[];
  while (out.length < MOCK_TOTAL) {
    let roll = rng() * strands.reduce((t, k) => t + (WEIGHTS[k] ?? 0), 0);
    const strand = strands.find((k) => (roll -= WEIGHTS[k] ?? 0) <= 0) ?? "Number";
    const options = pool.filter((s) => s.strand === strand && (used[s.id] ?? 0) < 2);
    if (!options.length) continue;
    const skill = options[Math.floor(rng() * options.length)];
    used[skill.id] = (used[skill.id] ?? 0) + 1;
    out.push({ skillId: skill.id, level: rng() < 0.6 ? 2 : 3 });
  }
  return shuffle(rng, out);
}
