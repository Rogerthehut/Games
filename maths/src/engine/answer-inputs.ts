import { asFraction } from "./answer";
import type { Question } from "./types";

/** Turn a poly into text a student could type. */
export function plain(p: number[]): string {
  const parts: string[] = [];
  for (let d = p.length - 1; d >= 0; d--) {
    const c = p[d];
    if (c === 0) continue;
    const body = d === 0 ? `${Math.abs(c)}` : `${Math.abs(c) === 1 ? "" : Math.abs(c)}x${d > 1 ? `^${d}` : ""}`;
    parts.push((c < 0 ? "-" : parts.length ? "+" : "") + body);
  }
  return parts.join("") || "0";
}
const fromShown = (s: string) => s.replace(/\$|\\left|\\right|[{}]/g, "").replace(/\\times/g, "*");

export function correctInputs(q: Question): string[] {
  const a = q.answer;
  if (a.kind === "number") {
    const f = a.form === "fraction" ? asFraction(a.value) : null;
    return [f && f[1] !== 1 ? `${f[0]}/${f[1]}` : String(a.value)];
  }
  if (a.kind === "multi") return a.fields.map((f) => String(f.value));
  if (a.kind === "choice") return [String(a.correct)];
  return [a.form === "factorised" ? fromShown(q.shown) : plain(a.value)];
}

