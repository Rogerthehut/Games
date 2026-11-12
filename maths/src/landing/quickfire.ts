import { int, type Rng } from "../engine/rng";

/** The quick-fire times tables round on the marketing page: ten different facts from the 2 to 12 tables. */
export interface Fact { a: number; b: number; answer: number }
export interface Attempt { fact: Fact; right: boolean; ms: number }
export const ROUND_LENGTH = 10;
export const SECONDS_EACH = 6;

export function makeRound(rng: Rng, n = ROUND_LENGTH): Fact[] {
  const seen = new Set<string>(), out: Fact[] = [];
  while (out.length < n) {
    const a = int(rng, 2, 12), b = int(rng, 2, 12), key = `${Math.min(a, b)}x${Math.max(a, b)}`;
    if (seen.has(key)) continue;
    seen.add(key); out.push({ a, b, answer: a * b });
  }
  return out;
}

export interface RoundSummary { right: number; total: number; averageMs: number | null; fastest: Attempt | null; slowest: Attempt | null }
export function summarise(attempts: Attempt[]): RoundSummary {
  const rights = attempts.filter((x) => x.right), times = rights.map((x) => x.ms);
  const byTime = [...rights].sort((x, y) => x.ms - y.ms);
  return { right: rights.length, total: attempts.length, averageMs: times.length ? Math.round(times.reduce((t, x) => t + x, 0) / times.length) : null, fastest: byTime[0] ?? null, slowest: byTime.length > 1 ? byTime[byTime.length - 1] : null };
}
/** What to say about a finished round. */
export function verdict(s: RoundSummary): string {
  if (s.right === s.total) return s.averageMs !== null && s.averageMs <= 3000 ? "Every one right, and quick. That's secure recall." : "Every one right. Now to get quicker.";
  if (s.right >= s.total * 0.7) return "Nearly there. A few facts to firm up.";
  return "A good start. A few little rounds a day make these stick.";
}
