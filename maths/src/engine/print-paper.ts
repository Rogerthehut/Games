import { SKILL_BY_ID } from "../curriculum";
import type { Question } from "./types";
import { PAPERS, buildMock, type PaperKind } from "./mock";
import { mulberry32 } from "./rng";

/**
 * Printable practice papers: the same maths papers as the timed ones on screen, made from a paper number so that the paper, its answer
 * sheet and its mark scheme always match, today or next month. Only papers with written answers can be printed (the reasoning
 * papers are multiple choice with drawn pictures and stay on screen).
 */
export const PRINTABLE: PaperKind[] = (Object.keys(PAPERS) as PaperKind[]).filter((k) => PAPERS[k].parts.every(([part]) => part === "Maths"));
export const isPrintable = (k: string): k is PaperKind => (PRINTABLE as string[]).includes(k);

export const MAX_PAPER_NUMBER = 9999;
/** A paper number 1 to 9999: the same number always gives the same paper. */
export const clampNumber = (n: number) => (Number.isFinite(n) ? Math.min(MAX_PAPER_NUMBER, Math.max(1, Math.floor(n))) : 1);
export const randomPaperNumber = (r: () => number = Math.random) => 1 + Math.floor(r() * MAX_PAPER_NUMBER);

export interface PrintQuestion { n: number; skillId: string; skill: string; question: Question }
export interface PrintPaper { kind: PaperKind; number: number; title: string; seconds: number; marks: number; questions: PrintQuestion[] }

export function buildPrintPaper(kind: PaperKind, number: number): PrintPaper {
  const num = clampNumber(number), seed = num * 1_000_003, format = PAPERS[kind];
  const items = buildMock(mulberry32(seed), kind);
  const questions = items.map((item, i) => {
    const skill = SKILL_BY_ID[item.skillId];
    return { n: i + 1, skillId: item.skillId, skill: skill.name, question: { ...skill.generate(mulberry32(seed + i * 7919), item.level), seed: seed + i * 7919 } };
  });
  return { kind, number: num, title: format.title, seconds: format.seconds, marks: questions.length, questions };
}

/** What to write on the answer line after the answer, for example "%" or "cm". */
export const unitOf = (q: Question): string => (q.answer.kind === "number" ? q.answer.unit ?? "" : "");
export const fieldsOf = (q: Question): string[] => (q.answer.kind === "multi" ? q.answer.fields.map((f) => f.label) : []);
