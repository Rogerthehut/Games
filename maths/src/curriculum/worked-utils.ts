import type { Figure, Question } from "../engine/types";

/** Shared by the builders that attach a picture of the method to a finished question (see worked-skills.ts). */
export interface Built { figure: Figure; steps?: string[] }
export type Builder = (q: Question) => Built | null;

export const clean = (t: string) => t.replace(/\\,|\\;|\\ | | /g, "").replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/(\d) (?=\d{3}\b)/g, "$1").replace(/[−–]/g, "-").replace(/\$/g, "");
export const numbers = (t: string): number[] => (clean(t).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
export const val = (q: Question): number | null => (q.answer.kind === "number" ? q.answer.value : null);
export const fmt = (n: number) => String(n);
export const thin = (n: number) => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const dec = (n: number) => String(Math.round(n * 1e6) / 1e6);

