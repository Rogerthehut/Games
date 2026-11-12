import type { Figure } from "../engine/types";

/** One question for the "Try one" card on the marketing page, made ahead of time from the real generators (see try-bank-build.ts). */
export interface TryItem {
  id: string;
  /** Where it came from, so the bank can be checked against the generators. */
  skill: string; level: number; seed: number;
  name: string; year: number;
  prompt: string;
  value: number;
  unit?: string;
  shown: string;
  hint: string;
  solution: string[];
  worked: Figure;
  /** Wrong answers a child is likely to give, with the reason the learning report would give. */
  slips: { value: number; reason: string }[];
}
