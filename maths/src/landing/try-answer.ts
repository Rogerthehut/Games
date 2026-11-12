/** Reads what someone typed for a number answer: ignores £, commas, spaces, a % sign and a unit after the number (50p, 12 cm). */
export function parseAnswer(text: string): number | null {
  const t = text.trim().replace(/[−–]/g, "-").replace(/[£,\s]/g, "").replace(/%$/, "").replace(/[a-zA-Z²³]+$/, "");
  if (!/^-?\d*\.?\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
export const sameNumber = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));
