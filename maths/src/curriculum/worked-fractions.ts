import type { Figure } from "../engine/types";
import { clean, dec, val, type Builder } from "./worked-utils";

/**
 * Pictures for fractions, percentages, ratio and multiplying: bar models, a fraction grid, a table for scaling, arrays and pictograms.
 * Read from each question's own wording and answer; if a question can't be read the builder returns nothing (see worked-skills.ts).
 */
type Row = Extract<Figure, { type: "bar-model" }>["rows"][number];
type Seg = Row["segments"][number];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const fracs = (text: string) => [...clean(text).matchAll(/\\frac\{(\d+|\\square|\?)\}\{(\d+|\\square|\?)\}/g)].map((m) => [m[1], m[2]] as const);
const num = (x: string) => (/^\d+$/.test(x) ? Number(x) : NaN);

/** A bar cut into `parts` equal pieces with the first `shaded` coloured. Pieces are labelled when there's room. */
function fracBar(label: string, parts: number, shaded: number, tone: Seg["tone"] = "b", note?: string): Row {
  return { label, note, segments: Array.from({ length: parts }, (_, i) => ({ label: parts <= 12 && i < shaded ? `1/${parts}` : "", tone: i < shaded ? tone : "none" })) };
}
const bars = (rows: Row[], alt: string): Figure => ({ type: "bar-model", rows, alt });
const ok = (parts: number) => parts >= 1 && parts <= 100;

const fracEquiv: Builder = (q) => {
  const f = fracs(q.prompt), shown = fracs(q.shown), a = val(q);
  let n1: number, d1: number, n2: number, d2: number;
  if (f.length === 2 && a !== null) {
    const fill = (x: string) => (x === "\\square" ? a : num(x));
    [n1, d1, n2, d2] = [fill(f[0][0]), fill(f[0][1]), fill(f[1][0]), fill(f[1][1])];
  } else if (f.length === 1 && shown.length === 1) { [n1, d1] = [num(f[0][0]), num(f[0][1])]; [n2, d2] = [num(shown[0][0]), num(shown[0][1])]; }
  else return null;
  if (![n1, d1, n2, d2].every((x) => Number.isFinite(x)) || !ok(d1) || !ok(d2) || n1 * d2 !== n2 * d1) return null;
  return { figure: bars([fracBar(`${n1}/${d1}`, d1, n1, "a"), fracBar(`${n2}/${d2}`, d2, n2, "b", "same amount")], `Two bars of the same length. One is cut into ${d1} parts with ${n1} shaded, the other into ${d2} parts with ${n2} shaded. They are the same amount, so ${n1} over ${d1} equals ${n2} over ${d2}.`) };
};

const fracOrder: Builder = (q) => {
  const f = fracs(q.prompt).map(([n, d]) => [num(n), num(d)]);
  if (f.length < 2 || f.some(([n, d]) => !Number.isFinite(n) || !ok(d))) return null;
  const [[n1, d1], [n2, d2]] = f;
  return { figure: bars([fracBar(`${n1}/${d1}`, d1, n1, "a"), fracBar(`${n2}/${d2}`, d2, n2, "b")], `Two bars, one with ${n1} of ${d1} parts shaded and one with ${n2} of ${d2} parts shaded. The one with more shaded is larger.`) };
};

const sameDenom: Builder = (q) => {
  const p = clean(q.prompt), f = fracs(p).map(([n, d]) => [num(n), num(d)]);
  if (f.length >= 2 && Number.isFinite(f[0][0]) && f[0][1] === f[1][1]) {
    const [[a, d], [b]] = f, add = /\}\s*\+\s*\\frac/.test(p), sub = /\}\s*-\s*\\frac/.test(p);
    if (!ok(d) || (!add && !sub)) return null;
    const segs: Seg[] = Array.from({ length: d }, (_, i) => (add ? (i < a ? { label: "", tone: "a" as const } : i < a + b ? { label: "", tone: "b" as const } : { label: "", tone: "none" as const }) : (i < a - b ? { label: "", tone: "b" as const } : i < a ? { label: "", tone: "c" as const } : { label: "", tone: "none" as const })));
    return { figure: bars([{ label: add ? `${a}/${d} + ${b}/${d}` : `${a}/${d} − ${b}/${d}`, segments: segs, note: `${add ? a + b : a - b}/${d}` }], `A bar cut into ${d} equal parts. ${add ? `${a} parts are shaded, then ${b} more are added, making ${a + b}` : `${a} parts are shaded and ${b} of them are taken away, leaving ${a - b}`}.`) };
  }
  const m = p.match(/cut into (\d+) equal (?:slices|pieces|parts).*?(\d+) (?:slices|pieces|parts)? (?:is|are) (?:eaten|taken|used)/);
  if (m) { const d = Number(m[1]), k = Number(m[2]); return ok(d) ? { figure: bars([{ label: "Eaten and left", segments: Array.from({ length: d }, (_, i) => ({ label: "", tone: i < k ? ("c" as const) : ("b" as const) })), note: `${d - k}/${d} left` }], `A bar cut into ${d} equal slices. ${k} are eaten and ${d - k} are left.`) } : null; }
  return null;
};

const fracAmount: Builder = (q) => {
  const p = clean(q.prompt), f = fracs(p);
  if (!f.length) return null;
  const a = num(f[0][0]), b = num(f[0][1]), total = Number(p.match(/(?:of|has|holds) (\d+)/)?.[1] ?? p.match(/\\frac\{\d+\}\{\d+\}\s*of\s*(\d+)/)?.[1] ?? p.match(/(\d+) (?:sweets|pencils|marbles|stickers|counters|cards|beads)/)?.[1]);
  if (!Number.isFinite(total) || !ok(b) || total % b) return null;
  const per = total / b;
  return { figure: bars([{ label: `${a}/${b} of ${total}`, segments: Array.from({ length: b }, (_, i) => ({ label: String(per), tone: i < a ? ("b" as const) : ("none" as const) })), note: `${total} in all` }], `A bar for ${total} cut into ${b} equal parts of ${per}. ${a} parts are shaded, which is ${a * per}.`) };
};

const fracAdd: Builder = (q) => {
  const text = clean(q.prompt);
  if (/\d\\frac/.test(text)) return null;                // a mixed number: no picture is drawn
  const f = fracs(q.prompt).map(([n, d]) => [num(n), num(d)]);
  if (f.length < 2) return null;
  const [[a, b], [c, d]] = f, L = lcm(b, d);
  if (!ok(L) || L > 72) return null;
  if (/\\frac\{\d+\}\{\d+\}\s*-\s*\\frac/.test(text)) {   // taking one fraction from another: the same bars, with the second taken off the first
    const x = (a * L) / b, y = (c * L) / d;
    if (x < y) return null;
    return { figure: bars([fracBar(`${a}/${b}`, b, a, "a"), fracBar(`= ${x}/${L}`, L, x, "a"), fracBar(`${c}/${d}`, d, c, "b"), fracBar(`= ${y}/${L}`, L, y, "b"), { label: "What is left", segments: Array.from({ length: L }, (_, i) => ({ label: "", tone: i < x - y ? ("a" as const) : i < x ? ("b" as const) : ("none" as const) })), note: `${x - y}/${L}` }], `Bars to take ${c}/${d} away from ${a}/${b}. Cut into ${L} equal parts, they become ${x}/${L} and ${y}/${L}. Taking ${y} parts from ${x} leaves ${x - y} out of ${L}.`) };
  }
  if (b === d) return sameDenom(q);
  const x = (a * L) / b, y = (c * L) / d;
  return { figure: bars([fracBar(`${a}/${b}`, b, a, "a"), fracBar(`= ${x}/${L}`, L, x, "a"), fracBar(`${c}/${d}`, d, c, "b"), fracBar(`= ${y}/${L}`, L, y, "b"), { label: "Together", segments: Array.from({ length: L }, (_, i) => ({ label: "", tone: i < x ? ("a" as const) : i < x + y ? ("b" as const) : ("none" as const) })), note: `${x + y}/${L}` }], `Bars to add ${a}/${b} and ${c}/${d}. Cut into ${L} equal parts, they become ${x}/${L} and ${y}/${L}. Together that is ${x + y} out of ${L}.`) };
};

const mixed: Builder = (q) => {
  const m = clean(q.prompt).match(/(\d+)\\frac\{(\d+)\}\{(\d+)\}/);
  if (!m) return null;
  const n = Number(m[1]), a = Number(m[2]), d = Number(m[3]);
  if (!ok(d) || n > 5) return null;
  return { figure: bars([...Array.from({ length: n }, () => fracBar("a whole", d, d, "b")), fracBar("the rest", d, a, "a", `${n * d + a}/${d} in all`)], `${n} whole bars, each cut into ${d} parts and all shaded, then one more bar with ${a} of ${d} parts shaded. That is ${n * d + a} parts of size one over ${d}.`) };
};

const timesWhole: Builder = (q) => {
  const p = clean(q.prompt), f = fracs(p);
  if (!f.length) return null;
  const a = num(f[0][0]), d = num(f[0][1]), n = Number(p.match(/^(\d+) \\times/)?.[1] ?? p.match(/(\d+) (?:friends|children|people|boys|girls)/)?.[1] ?? p.match(/\\times\\s*\\frac/)?.[1] ?? p.match(/(\d+)\s*\\times\s*\\frac/)?.[1]);
  if (!Number.isFinite(n) || !ok(d) || a * n > d * 6) return null;
  const T = a * n, count = Math.ceil(T / d);
  return { figure: bars(Array.from({ length: count }, (_, i) => ({ label: i === 0 ? `${n} lots of ${a}/${d}` : "", segments: Array.from({ length: d }, (_, k) => ({ label: "", tone: i * d + k < T ? ((Math.floor((i * d + k) / a) % 2 ? "b" : "a") as Seg["tone"]) : ("none" as const) })), note: i === count - 1 ? `${T}/${d}` : undefined })), `${n} lots of ${a} over ${d}, shown as ${T} parts of size one over ${d} across ${count} bar${count > 1 ? "s" : ""}.`) };
};

const fracMultiply: Builder = (q) => {
  const f = fracs(q.prompt).map(([n, d]) => [num(n), num(d)]);
  if (f.length < 2) return null;
  const [[a, b], [c, d]] = f;
  if (![a, b, c, d].every(Number.isFinite) || b > 12 || d > 12) return null;
  return { figure: { type: "fraction-grid", rows: b, cols: d, shadeRows: a, shadeCols: c, alt: `A grid of ${b} rows and ${d} columns. ${a} of the ${b} rows are shaded one way and ${c} of the ${d} columns another way. The cells shaded both ways, ${a * c} out of ${b * d}, show ${a}/${b} times ${c}/${d}.` } };
};

const fracDivide: Builder = (q) => {
  const p = clean(q.prompt), f = fracs(p), n = Number(p.match(/\\div (\d+)/)?.[1] ?? p.match(/between (\d+)/)?.[1]);
  if (!f.length || !Number.isFinite(n)) return null;
  const a = num(f[0][0]), b = num(f[0][1]);
  if (!ok(b * n) || b * n > 100) return null;
  return { figure: bars([fracBar(`${a}/${b}`, b, a, "a"), { label: `cut each part into ${n}`, segments: Array.from({ length: b * n }, (_, i) => ({ label: "", tone: i < a ? ("b" as const) : ("none" as const) })), note: `one share = ${a}/${b * n}` }], `A bar showing ${a}/${b}. Cutting every part into ${n} gives ${b * n} parts, and one share is ${a} of them: ${a} over ${b * n}.`) };
};

const fdpConvert: Builder = (q) => {
  const f = fracs(q.prompt);
  if (!f.length) return null;
  const a = num(f[0][0]), d = num(f[0][1]);
  if (!Number.isFinite(a) || !ok(d)) return null;
  const pct = Math.round((a / d) * 1e5) / 1e3, pctLabel = `${dec(pct)}%`, asDec = /decimal/.test(q.prompt);
  return { figure: bars([fracBar(`${a}/${d}`, d, a, "a"), { label: asDec ? "as a decimal" : "as a percentage", segments: [{ label: asDec ? dec(pct / 100) : pctLabel, size: pct, tone: "b" }, { label: "", size: 100 - pct, tone: "none" }], note: asDec ? `${dec(pct / 100)} of 1` : `${pctLabel} of 100%` }], `A bar showing ${a} out of ${d}, and a second bar of the same length showing the same amount as ${asDec ? dec(pct / 100) + " of one whole" : pctLabel}.`) };
};

const pctAmount: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  const m = p.match(/(\d+(?:\.\d+)?)\\%\s*of\s*(\d+)/);
  let pct: number, total: number;
  if (m) { pct = Number(m[1]); total = Number(m[2]); }
  else { const pm = p.match(/(\d+(?:\.\d+)?)\\%/), tm = p.match(/£(\d+)/); if (!pm || !tm) return null; pct = Number(pm[1]); total = Number(tm[1]); }
  const part = Math.round(total * pct) / 100;
  if (!Number.isFinite(part) || a === null) return null;
  return { figure: bars([{ label: `${dec(pct)}% of the whole`, segments: [{ label: `${dec(pct)}%`, size: pct, tone: "b" }, { label: `${dec(100 - pct)}%`, size: 100 - pct, tone: "none" }] }, { label: `${dec(pct)}% of ${total}`, segments: [{ label: dec(part), size: pct, tone: "b" }, { label: dec(total - part), size: 100 - pct, tone: "none" }], note: `${total} in all` }], `A bar for 100 percent, with ${dec(pct)} percent shaded. Below it the same bar for ${total}: the shaded part is ${dec(part)} and the rest is ${dec(total - part)}.`) };
};

const ratioShare: Builder = (q) => {
  const p = clean(q.prompt), r = p.match(/ratio (\d+):(\d+)(?::(\d+))?/), t = p.match(/£(\d+)/) ?? p.match(/share (\d+)/);
  if (!r || !t) return null;
  const parts = [r[1], r[2], r[3]].filter(Boolean).map(Number), total = Number(t[1]), sum = parts.reduce((x, y) => x + y, 0), one = total / sum, unit = /£/.test(p) ? "£" : "";
  const tones = ["a", "b", "c"] as const;
  return { figure: bars([{ label: `${parts.join(" : ")}  (${sum} equal parts)`, segments: parts.flatMap((n, gi) => Array.from({ length: n }, () => ({ label: `${unit}${dec(one)}`, tone: tones[gi] }))), note: `${unit}${total} in all` }], `A bar cut into ${sum} equal parts of ${unit}${dec(one)}. The shares have ${parts.join(", ")} parts.`) };
};

const twoUnknowns: Builder = (q) => {
  const p = clean(q.prompt), m = p.match(/add up to (\d+)\. One is (\d+) more/);
  if (!m) return null;
  const S = Number(m[1]), D = Number(m[2]), x = (S - D) / 2;
  if (!Number.isInteger(x)) return null;
  return { figure: bars([{ label: "smaller number", segments: [{ label: String(x), size: x, tone: "a" }], note: `${x}` }, { label: "bigger number", segments: [{ label: String(x), size: x, tone: "a" }, { label: `+${D}`, size: D, tone: "c" }], note: `${x + D}` }], `Two bars. The smaller number is ${x}. The bigger is ${x} with ${D} extra. Together they make ${S}.`) };
};

const scaleRecipes: Builder = (q) => {
  const m = q.prompt.replace(/\$/g, "").match(/for (\d+) \w+ uses (\d+(?:\.\d+)?) (\w+) .*?for (\d+) \w+/);
  if (!m) return null;
  const n1 = Number(m[1]), a = Number(m[2]), n2 = Number(m[4]), unit = m[3];
  return { figure: { type: "table", head: ["People", `Amount (${unit})`], rows: [[n1, dec(a)], [1, dec(a / n1)], [n2, dec((a / n1) * n2)]], alt: `A table. For ${n1} people, ${dec(a)} ${unit}. For 1 person, ${dec(a / n1)} ${unit}. For ${n2} people, ${dec((a / n1) * n2)} ${unit}.` } };
};

const timesTables: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  let m = p.match(/Work out (\d+) \\times (\d+)/);
  if (m) return Number(m[1]) <= 12 && Number(m[2]) <= 12 ? { figure: { type: "array", rows: Number(m[1]), cols: Number(m[2]), alt: `${m[1]} rows of ${m[2]} dots. ${Number(m[1]) * Number(m[2])} dots altogether.` } } : null;
  m = p.match(/Work out (\d+) \\div (\d+)/);
  if (m && a !== null) return a <= 12 && Number(m[2]) <= 12 ? { figure: { type: "array", rows: Number(m[2]), cols: a, alt: `${m[1]} dots shared into ${m[2]} equal rows of ${a}.` } } : null;
  m = p.match(/\\square \\times (\d+) = (\d+)/);
  if (m && a !== null) return a <= 12 && Number(m[1]) <= 12 ? { figure: { type: "array", rows: a, cols: Number(m[1]), alt: `${m[2]} dots in ${a} rows of ${m[1]}.` } } : null;
  m = p.match(/(\d+) \\times \\square = (\d+)/);
  if (m && a !== null) return a <= 12 && Number(m[1]) <= 12 ? { figure: { type: "array", rows: Number(m[1]), cols: a, alt: `${m[2]} dots in ${m[1]} rows of ${a}.` } } : null;
  return null;
};

const pictograms: Builder = (q) => {
  const p = q.prompt, per = Number(p.match(/stands for (\d+)/)?.[1]);
  if (!Number.isFinite(per)) return null;
  const one = p.match(/row for (\w+) has (\d+)(?: whole)? ☺(?: and one half ☺)?/), two = p.match(/(\w+) has (\d+) ☺ and (\w+) has (\d+) ☺/);
  if (two) return { figure: { type: "pictogram", per, symbol: "☺", rows: [{ label: two[1], full: Number(two[2]) }, { label: two[3], full: Number(two[4]) }], alt: `A pictogram where each face stands for ${per} children. ${two[1]} has ${two[2]} faces and ${two[3]} has ${two[4]}.` } };
  if (one) return { figure: { type: "pictogram", per, symbol: "☺", rows: [{ label: one[1], full: Number(one[2]), half: /half/.test(p) }], alt: `A pictogram where each face stands for ${per} children. ${one[1]} has ${one[2]} whole faces${/half/.test(p) ? " and one half face" : ""}.` } };
  return null;
};

export const FRACTION_BUILDERS: Record<string, Builder> = {
  "frac-equiv": fracEquiv, "fraction-order": fracOrder, "frac-same-denom": sameDenom, "frac-amount": fracAmount, "frac-add": fracAdd, "mixed-numbers": mixed,
  "frac-times-whole": timesWhole, "frac-multiply": fracMultiply, "frac-divide": fracDivide, "fdp-convert": fdpConvert, "pct-amount": pctAmount, "ratio-share": ratioShare,
  "two-unknowns": twoUnknowns, "scale-recipes": scaleRecipes, "times-tables": timesTables, pictograms,
};
