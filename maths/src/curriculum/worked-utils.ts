import type { Figure, Question } from "../engine/types";
import { jumpLine } from "../engine/worked";

/** Shared by the builders that attach a picture of the method to a finished question (see worked-skills.ts). */
export interface Built { figure: Figure; steps?: string[] }
export type Builder = (q: Question) => Built | null;

export const clean = (t: string) => t.replace(/\\,|\\;|\\ | | /g, "").replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/(\d) (?=\d{3}\b)/g, "$1").replace(/[−–]/g, "-").replace(/\$/g, "");
export const numbers = (t: string): number[] => (clean(t).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
export const val = (q: Question): number | null => (q.answer.kind === "number" ? q.answer.value : null);
export const fmt = (n: number) => String(n);
export const thin = (n: number) => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const dec = (n: number) => String(Math.round(n * 1e6) / 1e6);


/** A number line with equal hops through a sequence, with the answer marked. */
export function sequenceLine(start: number, step: number, count: number, answerAt = count - 1): Built {
  const terms = Array.from({ length: count }, (_, i) => start + i * step), lo = Math.min(...terms), hi = Math.max(...terms), pad = Math.abs(step) / 2;
  const labels: Record<number, string> = {}; terms.forEach((t, i) => { if (count <= 8 || i < 4 || i >= count - 1) labels[t] = String(t).replace("-", "−"); });
  return { figure: jumpLine({ min: lo - pad, max: hi + pad, step: Math.abs(step), tickLabels: labels, marks: [{ v: terms[0], tone: "start" }, { v: terms[answerAt], tone: "end", label: answerAt === count - 1 ? undefined : "?" }], jumps: terms.slice(1).map((t, i) => ({ from: terms[i], to: t, label: `${step > 0 ? "+" : "−"}${Math.abs(step)}` })), alt: `A number line with hops of ${Math.abs(step)} ${step > 0 ? "up" : "down"}: ${terms.join(", ")}.` }) };
}
