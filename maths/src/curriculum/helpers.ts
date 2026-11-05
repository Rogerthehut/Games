import { toLatex as polyLatex, term, type Poly } from "../engine/poly";
import type { Rng } from "../engine/rng";
import { int } from "../engine/rng";

export const frac = (n: number, d: number) => (d === 1 ? `${n}` : `\\frac{${n}}{${d}}`);
export const lin = (c: number, k: number) => polyLatex([k, c]); // c x + k
export const bracket = (c: number, k: number) => `\\left(${lin(c, k)}\\right)`;
export const signed = (n: number) => (n < 0 ? `- ${-n}` : `+ ${n}`);

/** "3x^{2} - 5x + 2" from a list of (coefficient, degree) parts, kept in the order given. */
export function sumLatex(parts: { c: number; d: number }[]): string {
  return parts
    .map((t, i) => {
      const body = polyLatex(term(Math.abs(t.c), t.d));
      return i === 0 ? (t.c < 0 ? `-${body}` : body) : `${t.c < 0 ? " - " : " + "}${body}`;
    })
    .join("");
}

export const plusMinus = (r: Rng) => (r() < 0.5 ? -1 : 1);
export const signedInt = (r: Rng, a: number, b: number) => plusMinus(r) * int(r, a, b);

export function shuffle<T>(r: Rng, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const polyTex = (p: Poly) => polyLatex(p);
export const dedupeWrong = <T extends { number?: number }>(ws: T[], correct: number) =>
  ws.filter((w) => w.number === undefined || (Number.isFinite(w.number) && Math.abs(w.number - correct) > 1e-9));
