/** A polynomial in x as coefficients, index = degree. */
export type Poly = number[];

const EPS = 1e-9;

export function trim(p: Poly): Poly {
  const q = p.map((c) => (Math.abs(c) < EPS ? 0 : c));
  while (q.length > 1 && q[q.length - 1] === 0) q.pop();
  return q.length ? q : [0];
}
export const add = (a: Poly, b: Poly): Poly =>
  trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0)));
export const scale = (a: Poly, k: number): Poly => trim(a.map((c) => c * k));
export const sub = (a: Poly, b: Poly): Poly => add(a, scale(b, -1));
export function mul(a: Poly, b: Poly): Poly {
  const out = new Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return trim(out);
}
export const eq = (a: Poly, b: Poly): boolean => {
  const x = trim(a), y = trim(b);
  return x.length === y.length && x.every((c, i) => Math.abs(c - y[i]) < 1e-7);
};
export const term = (c: number, deg: number): Poly => {
  const p = new Array(deg + 1).fill(0);
  p[deg] = c;
  return p;
};
export const derivative = (a: Poly): Poly => trim(a.slice(1).map((c, i) => c * (i + 1)));

const num = (n: number) => String(Math.round(n * 1e6) / 1e6);

/** LaTeX for a polynomial, highest power first, e.g. x^{2}+5x+6 */
export function toLatex(p: Poly, v = "x"): string {
  let out = "";
  for (let d = p.length - 1; d >= 0; d--) {
    const c = p[d];
    if (Math.abs(c) < EPS) continue;
    const mag = Math.abs(c);
    const body =
      d === 0 ? num(mag) : `${mag === 1 ? "" : num(mag)}${v}${d === 1 ? "" : `^{${d}}`}`;
    out += out === "" ? (c < 0 ? "-" : "") + body : (c < 0 ? " - " : " + ") + body;
  }
  return out || "0";
}
