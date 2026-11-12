import type { Figure } from "../engine/types";
import { jumpLine } from "../engine/worked";
import { clean, dec, sequenceLine, val, type Builder } from "./worked-utils";

/**
 * Pictures for Years 6 to 9 topics where the working is easier to see laid out: prime factor ladders, negative number hops and sign rules,
 * proportion tables, ratio bars, algebra grids, frequency tables, outcome grids, percentage change bars and number patterns.
 */
const table = (head: string[], rows: (string | number)[][], alt: string): Figure => ({ type: "table", head, rows, alt });
const plain = (t: string) => t.replace(/\$/g, "");
const money = (n: number) => `£${dec(n)}`;

const primeFactors: Builder = (q) => {
  const p = plain(q.prompt), n = Number(p.match(/\d+/)?.[0]);
  if (!Number.isFinite(n) || n < 4) return null;
  const rows: (string | number)[][] = []; let left = n;
  for (let d = 2; left > 1; d++) while (left % d === 0) { rows.push([`÷ ${d}`, `${left} → ${left / d}`]); left /= d; }
  const factors = rows.map((r) => String(r[0]).slice(2));
  return { figure: table(["Divide by a prime", "Number"], rows, `Dividing ${n} by primes until 1: ${rows.map((r) => `${String(r[0]).replace("÷", "divide by")} gives ${String(r[1]).split("→")[1].trim()}`).join(", ")}. So ${n} is ${factors.join(" times ")}.`) };
};

const negativeOps: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  if (a === null) return null;
  let m = p.match(/Calculate (-?\d+) ([+-]) \((-?\d+)\)/);
  if (m) {
    const x = Number(m[1]), y = Number(m[3]), d = m[2] === "+" ? y : -y, to = x + d, lo = Math.min(x, to, 0) - 1, hi = Math.max(x, to, 0) + 1;
    return { figure: jumpLine({ min: lo, max: hi, step: Math.ceil((hi - lo) / 14) || 1, tickLabels: Object.fromEntries([...new Set([x, to, 0])].map((v) => [v, String(v).replace("-", "−")])), marks: [{ v: x, tone: "start" }, { v: to, tone: "end" }], jumps: [{ from: x, to, label: `${m[2]} (${y < 0 ? "−" : ""}${Math.abs(y)}) = ${d > 0 ? "+" : "−"}${Math.abs(d)}` }], alt: `A number line. Start at ${x}. ${m[2]} (${y}) means move ${Math.abs(d)} ${d > 0 ? "up" : "down"}, to ${to}.` }) };
  }
  m = p.match(/Calculate \(?(-?\d+)\)? (\\times|\\div) \(?(-?\d+)\)?/);
  if (m) {
    const x = Number(m[1]), y = Number(m[3]), same = Math.sign(x) === Math.sign(y), op = m[2] === "\\times" ? "×" : "÷", show = (n: number) => (n < 0 ? `(${String(n).replace("-", "−")})` : String(n));
    return { figure: table(["Sum", "Signs", "Answer"], [[`${show(x)} ${op} ${show(y)}`, same ? "same signs, so positive" : "different signs, so negative", dec(a)]], `${x} ${op} ${y}: the signs are ${same ? "the same, so the answer is positive" : "different, so the answer is negative"}. The answer is ${dec(a)}.`) };
  }
  return null;
};

const proportion: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), ns = (p.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (a === null || ns.length < 3) return null;
  const [n1, v1, n2] = /workers?|people|painters/.test(p) && /days|hours/.test(p) && ns.length === 3 && !/cost/.test(p) ? [ns[0], ns[1], ns[2]] : [ns[0], ns[1], ns[2]];
  const inverse = /workers?|painters|pumps|machines/.test(p) && /take|days to/.test(p);
  const rows = inverse ? [[n1, v1], [1, dec(n1 * v1)], [n2, dec(a)]] : [[n1, dec(v1)], [1, dec(v1 / n1)], [n2, dec(a)]];
  return { figure: table(["Number", inverse ? "Time" : "Amount"], rows, `${inverse ? "More workers take less time, so find the total for 1 worker first" : "Find the amount for 1 first"}: ${n1} gives ${v1}, 1 gives ${rows[1][1]}, ${n2} gives ${dec(a)}.`) };
};

const ratioProblems: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), r = p.match(/ratio (\d+) : (\d+)(?: : (\d+))?/);
  if (!r || a === null) return null;
  const parts = [r[1], r[2], r[3]].filter(Boolean).map(Number), sum = parts.reduce((x, y) => x + y, 0), one = /altogether|in total/.test(p) ? a / sum : a / Math.max(...parts), unit = /£|money/.test(p) ? "£" : "", tones = ["a", "b", "c"] as const;
  if (!Number.isFinite(one)) return null;
  return { figure: { type: "bar-model", rows: [{ label: `ratio ${parts.join(" : ")}`, segments: parts.flatMap((n, gi) => Array.from({ length: n }, () => ({ label: `${unit}${dec(one)}`, tone: tones[gi] }))), note: `${unit}${dec(one * sum)} in all` }], alt: `A bar of ${sum} equal parts of ${unit}${dec(one)}, split ${parts.join(" and ")}.` } };
};

const coef = (n: number, v: string) => `${n < 0 ? "−" : ""}${Math.abs(n) === 1 && v ? "" : Math.abs(n)}${v}`;
const expandGrid: Builder = (q) => {
  const m = clean(q.prompt).match(/\\left\((-?\d*)x ([+-]) (\d+)\\right\)\\left\((-?\d*)x ([+-]) (\d+)\\right\)/) ?? clean(q.prompt).match(/\(\s*(-?\d*)x ([+-]) (\d+)\s*\)\(\s*(-?\d*)x ([+-]) (\d+)\s*\)/);
  if (!m) return null;
  const num = (s: string) => (s === "" ? 1 : s === "-" ? -1 : Number(s)), a = num(m[1]), b = (m[2] === "-" ? -1 : 1) * Number(m[3]), c = num(m[4]), d = (m[5] === "-" ? -1 : 1) * Number(m[6]);
  const h = (n: number, v: string) => (v ? coef(n, v) : String(n));
  return { figure: table(["×", h(a, "x"), h(b, "")], [[h(c, "x"), h(a * c, "x²"), h(b * c, "x")], [h(d, ""), h(a * d, "x"), String(b * d)]], `A grid for the two brackets. Across the top: ${h(a, "x")} and ${b}. Down the side: ${h(c, "x")} and ${d}. The four boxes are ${h(a * c, "x²")}, ${h(b * c, "x")}, ${h(a * d, "x")} and ${b * d}. Add the boxes, collecting the x terms.`) };
};

const factoriseGrid: Builder = (q) => {
  const sq = clean(q.prompt).match(/Factorise x\^\{2\} - (\d+)\b(?!x)/);
  if (sq) { const r = Math.sqrt(Number(sq[1])); if (Number.isInteger(r)) return { figure: table(["×", "x", `+${r}`], [["x", "x²", `+${r}x`], [`−${r}`, `−${r}x`, `−${sq[1]}`]], `A grid for the difference of two squares. The boxes ${r}x and minus ${r}x cancel, leaving x squared minus ${sq[1]}. So the sides are x minus ${r} and x plus ${r}.`) }; }
  const m = clean(q.prompt).match(/Factorise x\^\{2\} ([+-]) (\d*)x ([+-]) (\d+)/);
  if (!m) return null;
  const b = (m[1] === "-" ? -1 : 1) * (m[2] === "" ? 1 : Number(m[2])), c = (m[3] === "-" ? -1 : 1) * Number(m[4]);
  let pq: [number, number] | null = null;
  for (let i = -Math.abs(c) - Math.abs(b); i <= Math.abs(c) + Math.abs(b) && !pq; i++) if (i !== 0 && c % i === 0 && i + c / i === b) pq = [i, c / i];
  if (!pq) return null;
  const [p, r] = pq, h = (n: number, v: string) => `${n < 0 ? "−" : "+"}${Math.abs(n)}${v}`;
  return { figure: table(["×", "x", h(p, "")], [["x", "x²", h(p, "x")], [h(r, ""), h(r, "x"), h(p * r, "").replace("+", "")]], `A grid with x² in the corner and ${c} in the opposite corner. The two other boxes, ${p}x and ${r}x, add to ${b}x. So the sides are x ${p < 0 ? "−" : "+"} ${Math.abs(p)} and x ${r < 0 ? "−" : "+"} ${Math.abs(r)}.`) };
};

const frequencyTable: Builder = (q) => {
  const pairs = [...plain(q.prompt).matchAll(/(\d+) → (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
  if (pairs.length < 2) return null;
  const totalF = pairs.reduce((t, [, f]) => t + f, 0), totalX = pairs.reduce((t, [x, f]) => t + x * f, 0);
  return { figure: table(["Pets", "Children", "Pets × children"], [...pairs.map(([x, f]) => [x, f, x * f]), ["Total", totalF, totalX]], `A frequency table. ${pairs.map(([x, f]) => `${x} pets: ${f} children, ${x * f} pets`).join("; ")}. Totals: ${totalF} children and ${totalX} pets.`) };
};

const outcomes: Builder = (q) => {
  const p = plain(q.prompt);
  if (/Two fair dice/.test(p)) {
    const head = ["+", ...[1, 2, 3, 4, 5, 6].map(String)];
    return { figure: table(head, [1, 2, 3, 4, 5, 6].map((a) => [a, ...[1, 2, 3, 4, 5, 6].map((b) => a + b)]), "A grid of all 36 totals from two dice, one down the side and one across the top.") };
  }
  const m = p.match(/spinner has (\d+) equal sections and a dice has (\d+) faces/);
  if (m) { const a = Number(m[1]), b = Number(m[2]); if (a > 8 || b > 8) return null; return { figure: table(["", ...Array.from({ length: b }, (_, i) => `D${i + 1}`)], Array.from({ length: a }, (_, i) => [`S${i + 1}`, ...Array.from({ length: b }, (_, k) => `S${i + 1}D${k + 1}`)]), `A grid of every spinner and dice pair: ${a} rows by ${b} columns, ${a * b} outcomes.`) }; }
  return null;
};

const percentChange: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  let m = p.match(/costs £(\d+)\. The price goes (up|down) by (\d+)%/);
  if (m && a !== null) {
    const N = Number(m[1]), pct = Number(m[3]), part = (N * pct) / 100, up = m[2] === "up";
    return { figure: { type: "bar-model", rows: [{ label: `${pct}% of ${money(N)}`, segments: [{ label: `${pct}%`, size: pct, tone: up ? "b" : "c" }, { label: `${100 - pct}%`, size: 100 - pct, tone: "none" }], note: money(part) }, { label: up ? "new price" : "new price", segments: up ? [{ label: money(N), size: N, tone: "a" }, { label: `+${money(part)}`, size: part, tone: "b" }] : [{ label: money(N - part), size: N - part, tone: "a" }, { label: `−${money(part)}`, size: part, tone: "c" }], note: money(a) }], alt: `${pct} percent of ${money(N)} is ${money(part)}. The price ${up ? "goes up to" : "goes down to"} ${money(a)}.` } };
  }
  m = p.match(/from £(\d+) to £(\d+)/);
  if (m) { const o = Number(m[1]), n = Number(m[2]), change = Math.abs(n - o), up = n > o; return { figure: { type: "bar-model", rows: [{ label: `${up ? "rise" : "fall"} from ${money(o)} to ${money(n)}`, segments: up ? [{ label: money(o), size: o, tone: "a" }, { label: `+${money(change)}`, size: change, tone: "b" }] : [{ label: money(n), size: n, tone: "a" }, { label: `−${money(change)}`, size: change, tone: "c" }], note: `${dec((change / o) * 100)}% of ${money(o)}` }], alt: `The price goes from ${money(o)} to ${money(n)}, a change of ${money(change)}. ${money(change)} out of ${money(o)} is ${dec((change / o) * 100)} percent.` } }; }
  return null;
};

const sequences: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  let m = p.match(/sequence\?\s*((?:-?\d+, )+)…/);
  if (m) { const t = m[1].split(",").map((x) => Number(x.trim())).filter((x) => Number.isFinite(x)); return sequenceLine(t[0], t[1] - t[0], t.length + 1); }
  m = p.match(/sequence ((?:-?\d+, )+)… continues in the same way\. What is the (\d+)(?:st|nd|rd|th) term/);
  if (m) { const t = m[1].split(",").map((x) => Number(x.trim())).filter((x) => Number.isFinite(x)), n = Number(m[2]); return n <= 20 ? sequenceLine(t[0], t[1] - t[0], n) : null; }
  m = p.match(/nth term of a sequence is (-?\d*)n ([+-]) (\d+)/);
  if (m && a !== null) { const k = m[1] === "" ? 1 : m[1] === "-" ? -1 : Number(m[1]), c = (m[2] === "-" ? -1 : 1) * Number(m[3]); return { figure: table(["n", "1", "2", "3", "4", "5"], [["term", ...[1, 2, 3, 4, 5].map((n) => k * n + c)]], `The first five terms of the sequence with nth term ${k}n ${m[2]} ${m[3]}: ${[1, 2, 3, 4, 5].map((n) => k * n + c).join(", ")}.`) }; }
  return null;
};

export const SECONDARY_BUILDERS: Record<string, Builder> = {
  "prime-factors": primeFactors, "negative-ops": negativeOps, "direct-proportion": proportion, "ratio-problems": ratioProblems, "expand-double": expandGrid, "factorise-quad": factoriseGrid,
  "frequency-mean": frequencyTable, outcomes, "percent-change": percentChange, sequences,
};
