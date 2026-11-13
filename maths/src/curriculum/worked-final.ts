import type { Figure } from "../engine/types";
import { clean, dec, val, type Built, type Builder } from "./worked-utils";
import { graph } from "./figures";

/**
 * The last batch of worked pictures: topics where the working is easier to follow laid out than described. Order of operations is traced
 * one operation at a time by evaluating the expression itself, significant figures marks the digits that count, formulae are drawn on the
 * shape, and so on. Every builder reads the question's own wording and answer, and the tests check each picture against that answer.
 */
export const plain = (t: string) => t.replace(/\$/g, "");
/** LaTeX from our own generators, read as plain text for a table cell or a label. */
export const flat = (t: string) => plain(t).replace(/\\left|\\right/g, "").replace(/\\times/g, "×").replace(/\\div/g, "÷").replace(/\\le\b/g, "≤").replace(/\\ge\b/g, "≥").replace(/\\pi\s*(?=[a-z])/g, "π").replace(/\\pi/g, "π").replace(/\\approx/g, "≈").replace(/\\sqrt\{([^}]*)\}/g, "√$1").replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, (_m, a: string, b: string) => `${/[+−-]/.test(a.trim().replace(/^-/, "")) ? `(${a})` : a}/${/^(?:[a-zA-Z]|\d+)$/.test(b.trim()) ? b : `(${b})`}`).replace(/\^\{2\}/g, "²").replace(/\^\{3\}/g, "³").replace(/\^\{(\d+)\}/g, "^$1").replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/\\\\/g, "").replace(/\\,|\\;|\\ /g, " ").replace(/(\d)-(?=\d)/g, "$1−").replace(/ - /g, " − ").replace(/^-(?=\d)/, "−").replace(/\s+/g, " ").trim();
export const table = (head: string[], rows: (string | number)[][], alt: string): Figure => ({ type: "table", head, rows, alt });
const num = (n: number) => dec(n).replace("-", "−");
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/** The solution written out as a table, one row a line: "Label: working" becomes two cells. For topics where the steps are the method. */
export function solutionTable(q: { solution: string[]; prompt: string }, head: [string, string] = ["Step", "Working"], start?: string): Built | null {
  const lines = q.solution.map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const rows: (string | number)[][] = start ? [["Start", start]] : [];
  lines.forEach((l, n) => { const i = l.indexOf(":"); rows.push(i > 0 && i < 40 ? [flat(l.slice(0, i)), flat(l.slice(i + 1)).replace(/\.$/, "")] : [`Step ${n + 1}`, flat(l).replace(/\.$/, "")]); });
  return { figure: table(head, rows, `The working, one step at a time: ${rows.map((r) => `${r[0] ? r[0] + ": " : ""}${r[1]}`).join(". ")}.`) };
}
/** The solution as boxes joined by arrows, from what we start with to the answer. */
export function solutionFlow(start: string, q: { solution: string[] }, answer: string, max = 5): Built | null {
  const lines = q.solution.map((l) => flat(l).replace(/\.$/, "")).filter(Boolean).slice(0, max);
  if (!lines.length) return null;
  return { figure: { type: "flow", steps: [{ text: start, kind: "in" }, ...lines.map((text) => ({ text, kind: "step" as const })), { text: answer, kind: "out" }], alt: `${start}. ${lines.join(", then ")}. The answer is ${answer}.` } };
}

// ---------------------------------------------------------------------------------------------- time facts
const MONTHS: [string, number][] = [["January", 31], ["February", 28], ["March", 31], ["April", 30], ["May", 31], ["June", 30], ["July", 31], ["August", 31], ["September", 30], ["October", 31], ["November", 30], ["December", 31]];
const timeFacts: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  if (a === null) return null;
  if (/How many days are in (?:[A-Z][a-z]+)\b/.test(p) && MONTHS.some(([m]) => p.includes(m)) || /a leap year|not a leap year/.test(p) && /February/.test(p)) {
    const rows = Array.from({ length: 6 }, (_, i) => [MONTHS[i][0], i === 1 ? "28 or 29" : MONTHS[i][1], MONTHS[i + 6][0], MONTHS[i + 6][1]]);
    return { figure: table(["Month", "Days", "Month", "Days"], rows, `The days in each month: ${MONTHS.map(([m, d]) => `${m} ${m === "February" ? "28, or 29 in a leap year" : d}`).join(", ")}.`) };
  }
  if (/days are in a (?:normal |leap )?year|not a leap year/.test(p)) return { figure: table(["Year", "Days"], [["A normal year", 365], ["A leap year (one extra day, 29 February)", 366]], "A normal year has 365 days. A leap year has 366, because February has an extra day, the 29th.") };
  const m = p.match(/How many (\w+) are in (\d+) (\w+)\?/) ?? p.match(/How many (\w+) are in 1 (\w+)\?/);
  if (!m) return null;
  const n = m.length === 4 ? Number(m[2]) : 1, big = m[m.length - 1].replace(/s$/, ""), small = m[1], per = a / n;
  if (!Number.isInteger(per) || n > 3) return null;
  // a long run of tiny blocks is hard to read, so 24 and 60 are shown as equal groups
  const group = per > 12 ? (per === 24 ? 6 : per === 60 ? 10 : 0) : 1;
  if (!group) return null;
  const blocks = per / group;
  const rows = Array.from({ length: n }, () => ({ label: `1 ${big}`, segments: Array.from({ length: blocks }, (_, i) => ({ label: group === 1 ? String(i + 1) : String(group), tone: (i % 2 ? "b" : "a") as "a" | "b" })), note: `${per} ${small}${group > 1 ? ` (${blocks} × ${group})` : ""}` }));
  return { figure: { type: "bar-model", rows, alt: `${n > 1 ? `${n} lots of ` : ""}1 ${big} is ${per} ${small}${group > 1 ? `, drawn as ${blocks} blocks of ${group}` : ""}${n > 1 ? `, so ${n} × ${per} = ${a}` : ""}.` } };
};

// ---------------------------------------------------------------------------------------------- multiplying three numbers
const multiplyThree: Builder = (q) => {
  const nums = (clean(q.prompt).match(/Work out (\d+) × (\d+) × (\d+)/) ?? []).slice(1).map(Number), a = val(q);
  if (nums.length !== 3 || a === null) return null;
  return solutionFlow(nums.join(" × "), q, String(a));
};

// ---------------------------------------------------------------------------------------------- using a formula: perimeter of a rectangle
const usingFormulae: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  const scale = (l: number, w: number) => { const k = 10 / Math.max(l, w); return [l * k, w * k] as const; };
  let m = p.match(/rectangle that is (\d+) cm long and (\d+) cm wide/);
  if (m && a !== null) {
    const l = Number(m[1]), w = Number(m[2]), [X, Y] = scale(l, w);
    return { figure: { type: "polygon", pts: [[0, 0], [X, 0], [X, Y], [0, Y]], labels: [{ x: X / 2, y: Y + 0.9, text: `${l} cm` }, { x: X / 2, y: -0.9, text: `${l} cm` }, { x: -0.5, y: Y / 2, text: `${w} cm`, anchor: "end" }, { x: X + 0.5, y: Y / 2, text: `${w} cm`, anchor: "start" }], alt: `A rectangle ${l} cm long and ${w} cm wide with all four sides marked. Going all the way round: ${l} + ${w} + ${l} + ${w} = ${a} cm.` } };
  }
  m = p.match(/perimeter of (\d+) cm and a length of (\d+) cm/);
  if (m && a !== null) {
    const per = Number(m[1]), l = Number(m[2]), [X, Y] = scale(l, a);
    return { figure: { type: "polygon", pts: [[0, 0], [X, 0], [X, Y], [0, Y]], labels: [{ x: X / 2, y: Y + 0.9, text: `${l} cm` }, { x: X / 2, y: -0.9, text: `${l} cm` }, { x: -0.5, y: Y / 2, text: "?", anchor: "end" }, { x: X + 0.5, y: Y / 2, text: "?", anchor: "start" }, { x: X / 2, y: Y / 2, text: `all round: ${per} cm` }], alt: `A rectangle with a length of ${l} cm and an unknown width, and a perimeter of ${per} cm. Half the perimeter is ${per / 2} cm, which is a length plus a width, so the width is ${per / 2} − ${l} = ${a} cm.` } };
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- order of operations, traced one operation at a time
type Tok = string;
const isNum = (t: Tok) => /^\d+(?:\.\d+)?$/.test(t);
const tokenise = (s: string): Tok[] | null => {
  const t = s.replace(/\s+/g, "").replace(/\\times/g, "×").replace(/\\div/g, "÷").replace(/\^\{(\d+)\}/g, "^$1").match(/\d+(?:\.\d+)?|[+\-×÷^()]/g);
  return t && t.join("") === s.replace(/\s+/g, "").replace(/\\times/g, "×").replace(/\\div/g, "÷").replace(/\^\{(\d+)\}/g, "^$1") ? t : null;
};
const show = (toks: Tok[]) => toks.join(" ").replace(/ \^ (\d)/g, (_, d: string) => (d === "2" ? "²" : d === "3" ? "³" : `^${d}`)).replace(/\( /g, "(").replace(/ \)/g, ")").replace(/-/g, "−");
const apply = (a: number, op: string, b: number) => (op === "+" ? a + b : op === "-" ? a - b : op === "×" ? a * b : op === "÷" ? a / b : a ** b);
const OPNAME: Record<string, string> = { "^": "Power", "×": "Multiply", "÷": "Divide", "+": "Add", "-": "Subtract" };
export function traceOrder(expr: string): { rows: (string | number)[][]; value: number } | null {
  let toks = tokenise(expr);
  if (!toks) return null;
  const rows: (string | number)[][] = [["Start", show(toks)]];
  for (let guard = 0; guard < 20 && !(toks.length === 1 && isNum(toks[0])); guard++) {
    // the innermost brackets first; inside them (or, with none, across the whole line) powers, then × and ÷, then + and −
    let lo = 0, hi: number = toks.length, inBrackets = false;
    const close = toks.indexOf(")");
    if (close >= 0) { const open = toks.lastIndexOf("(", close); if (open < 0) return null; lo = open + 1; hi = close; inBrackets = true; }
    const inner = toks.slice(lo, hi);
    if (inner.length === 1 && isNum(inner[0]) && inBrackets) { toks = [...toks.slice(0, lo - 1), inner[0], ...toks.slice(hi + 1)]; continue; }
    let at = inner.indexOf("^");
    if (at < 0) at = inner.findIndex((t) => t === "×" || t === "÷");
    if (at < 0) at = inner.findIndex((t) => t === "+" || t === "-");
    if (at < 1 || at > inner.length - 2 || !isNum(inner[at - 1]) || !isNum(inner[at + 1])) return null;
    const a = Number(inner[at - 1]), b = Number(inner[at + 1]), r = apply(a, inner[at], b);
    if (!Number.isFinite(r)) return null;
    const label = `${inBrackets ? "Brackets" : OPNAME[inner[at]]}: ${show([String(a), inner[at], String(b)])} = ${num(r)}`;
    const next = [...inner.slice(0, at - 1), String(r), ...inner.slice(at + 2)];
    toks = [...toks.slice(0, lo), ...next, ...toks.slice(hi)];
    rows.push([label, show(toks)]);
  }
  return toks.length === 1 && isNum(toks[0]) ? { rows, value: Number(toks[0]) } : null;
}
const orderOps: Builder = (q) => {
  const m = clean(q.prompt).replace(/\\times/g, "×").replace(/\\div/g, "÷").match(/Work out (.+?)\.?$/), a = val(q);
  if (!m || a === null) return null;
  const t = traceOrder(m[1]);
  if (!t || t.rows.length < 2) return null;
  return { figure: table(["Step", "Now we have"], t.rows, `Working out ${show(tokenise(m[1]) ?? [])} one operation at a time: ${t.rows.map((r) => `${r[0]}, giving ${r[1]}`).join("; ")}. The answer is ${num(t.value)}.`) };
};

// ---------------------------------------------------------------------------------------------- adding and subtracting mixed numbers
const mixedNumbers: Builder = (q) => {
  const m = plain(q.prompt).match(/(\d+)\\frac\{(\d+)\}\{(\d+)\} ([+-]) (\d+)\\frac\{(\d+)\}\{(\d+)\}/), a = val(q);
  if (!m || a === null) return null;
  const [w1, n1, d1, w2, n2, d2] = [m[1], m[2], m[3], m[5], m[6], m[7]].map(Number), add = m[4] === "+";
  const i1 = w1 * d1 + n1, i2 = w2 * d2 + n2, d = d1 === d2 ? d1 : d1 * d2 / gcd(d1, d2), t1 = i1 * (d / d1), t2 = i2 * (d / d2);
  const top = add ? t1 + t2 : t1 - t2, g = gcd(top, d), sn = top / g, sd = d / g;
  const rows: (string | number)[][] = [["Write each as an improper fraction", `${w1} ${n1}/${d1} = ${i1}/${d1}   and   ${w2} ${n2}/${d2} = ${i2}/${d2}`]];
  if (d1 !== d2) rows.push(["Use the same bottom number", `${t1}/${d} ${add ? "+" : "−"} ${t2}/${d}`]);
  rows.push([`${add ? "Add" : "Subtract"} the top numbers`, `${t1}/${d} ${add ? "+" : "−"} ${t2}/${d} = ${top}/${d}`]);
  rows.push(g > 1 ? [`Simplify (divide both by ${g})`, `${sn}/${sd}`] : ["Already in its simplest form", `${sn}/${sd}`]);
  const approx = Math.abs(sn / sd - a) < 1e-9;
  return approx ? { figure: table(["Step", "Working"], rows, `Mixed numbers ${add ? "added" : "subtracted"} as improper fractions: ${rows.map((r) => `${r[0]}: ${r[1]}`).join(". ")}.`) } : null;
};

// ---------------------------------------------------------------------------------------------- significant figures
export function roundSig(x: string, n: number): string {
  const v = Number(x);
  return v === 0 ? "0" : String(Number(v.toPrecision(n)));
}
const sigFigs: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  const m = p.match(/Round (\d+(?:\.\d+)?) to (\d) significant figures?/);
  if (m && a !== null) {
    const s = m[1], n = Number(m[2]), digits = s.replace(".", ""), first = digits.search(/[1-9]/);
    if (first < 0 || digits.length < first + n + 1) return null;
    let seen = -1, marked = "";
    for (const ch of s) { if (ch === ".") { marked += ch; continue; } seen++; marked += seen === first ? "[" + ch : ch; if (seen === first + n - 1) marked += "]"; }
    const next = Number(digits[first + n]), answer = roundSig(s, n);
    if (Math.abs(Number(answer) - a) > 1e-9) return null;
    return { figure: table(["Step", "Working"], [
      ["The number", s],
      [`Count ${n} significant figures, starting at the first digit that isn't zero`, marked],
      [`Look at the next digit: ${next}`, next >= 5 ? "5 or more, so round up" : "4 or less, so stay the same"],
      ["Keep the place values (fill with zeros)", answer],
    ], `Rounding ${s} to ${n} significant figures: the first ${n} are marked ${marked}. The next digit is ${next}, so it ${next >= 5 ? "rounds up" : "stays"}. The answer is ${answer}.`) };
  }
  return /Estimate/.test(p) ? solutionTable(q, ["Step", "Working"]) : null;
};

// ---------------------------------------------------------------------------------------------- multi-step word problems
const wordProblems: Builder = (q) => solutionTable(q, ["Step", "Working"]);

// ---------------------------------------------------------------------------------------------- Year 10 algebra
const sg = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);
const coef = (n: number, v: string) => (n === 1 ? v : n === -1 ? `−${v}` : `${n < 0 ? "−" : ""}${Math.abs(n)}${v}`);
/** "ax + by = c" written the way a person would: no 1s in front, no zero terms, a minus rather than "+ −". */
const eq = (a: number, b: number, c: number) => `${a ? coef(a, "x") : ""}${a ? (b ? (b < 0 ? " − " : " + ") + coef(Math.abs(b), "y") : "") : coef(b, "y")} = ${c < 0 ? "−" + -c : c}`;
const quad = (a: number, b: number, c: number) => `${a === 1 ? "" : a}x² ${b < 0 ? "−" : "+"} ${Math.abs(b)}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}`;

const quadraticSequence: Builder = (q) => {
  const m = plain(q.prompt).replace(/−/g, "-").match(/(?:sequence:|begins) (-?\d+(?:, -?\d+){3})/), a = val(q);
  if (!m || a === null) return null;
  const t = m[1].split(", ").map(Number), d1 = t.slice(1).map((x, i) => x - t[i]), d2 = d1.slice(1).map((x, i) => x - d1[i]);
  if (new Set(d2).size !== 1) return null;
  const sd = d2[0], next = /next term/.test(q.prompt), nth = /\dth term|nth term/.test(q.prompt);
  const n = t.length + (next ? 1 : 0), head = ["n", ...Array.from({ length: n }, (_, i) => String(i + 1))];
  const terms: (string | number)[] = ["Term", ...t.map(num), ...(next ? ["?"] : [])];
  const firsts: (string | number)[] = ["1st diff", "", ...d1.map(sg), ...(next ? [sg(d1[d1.length - 1] + sd)] : [])];
  const seconds: (string | number)[] = ["2nd diff", "", "", ...d2.map(sg), ...(next ? [sg(sd)] : [])];
  const rows = [terms, firsts, seconds];
  let words = `The terms ${t.join(", ")} have first differences ${d1.join(", ")} and a constant second difference of ${sd}.`;
  if (nth) {
    const half = sd / 2, rest = t.map((x, i) => x - half * (i + 1) ** 2);
    rows.push([`${half}n²`, ...t.map((_, i) => num(half * (i + 1) ** 2))], ["Left over", ...rest.map(num)]);
    words += ` Half of ${sd} is ${half}, so the n squared part is ${half}n². Taking it away leaves ${rest.join(", ")}, which goes up by ${rest[1] - rest[0]} each time.`;
  }
  if (next) words += ` The next first difference is ${d1[d1.length - 1] + sd}, so the next term is ${a}.`;
  return { figure: table(head, rows, words) };
};

const completingSquare: Builder = (q) => {
  const m = plain(q.prompt).replace(/−/g, "-").match(/x\^\{2\} ([+-]) (\d+)x ([+-]) (\d+)/);
  if (!m) return null;
  const b = (m[1] === "-" ? -1 : 1) * Number(m[2]), c = (m[3] === "-" ? -1 : 1) * Number(m[4]), a = val(q);
  if (b % 2) return null;
  const p = b / 2, qq = c - p * p, bracket = `(x ${p < 0 ? "−" : "+"} ${Math.abs(p)})²`, done = `${bracket} ${qq < 0 ? "−" : "+"} ${Math.abs(qq)}`;
  const asked = /What is \$p\$/.test(q.prompt) ? p : /What is \$q\$/.test(q.prompt) ? qq : /minimum/.test(q.prompt) ? qq : NaN;
  if (a === null || asked !== a) return null;
  const rows: (string | number)[][] = [
    ["Start", `x² ${b < 0 ? "−" : "+"} ${Math.abs(b)}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}`],
    ["Halve the number in front of x", `${b} ÷ 2 = ${p}`],
    ["Write the bracket", bracket],
    ["Expand it to see what it makes", `${bracket} = x² ${b < 0 ? "−" : "+"} ${Math.abs(b)}x + ${p * p}`],
    ["Put the constant right", `${c} − ${p * p} = ${qq}`],
    ["Completed square", done],
  ];
  if (/minimum/.test(q.prompt)) rows.push(["Smallest value (the bracket can't go below 0)", `${qq}, when x = ${-p}`]);
  return { figure: table(["Step", "Working"], rows, `Completing the square: halve ${b} to get ${p}, write ${bracket}, which expands with a constant of ${p * p}, so adjust by ${c} − ${p * p} = ${qq}. The result is ${done}.`) };
};

const rearrange: Builder = (q) => {
  const p = plain(q.prompt), line0 = q.solution[0] ?? "", result = /so (.+?)\.?$/.exec(plain(line0))?.[1] ?? /^(.+?=.+?)\.?$/.exec(plain(line0))?.[1];
  let m = p.match(/The formula ([a-z]) = ([a-z]) \+ ([a-z])([a-z]) is/), ops: string[] | null = null, start = "";
  if (m) { start = `${m[1]} = ${m[2]} + ${m[3]}${m[4]}`; ops = [`Subtract ${m[2]}`, `Divide by ${m[3]}`]; }
  m = p.match(/The formula ([a-z]) = (\d+)([a-z]) \+ (\d+) links/);
  if (m) { start = `${m[1]} = ${m[2]}${m[3]} + ${m[4]}`; ops = [`Subtract ${m[4]}`, `Divide by ${m[2]}`]; }
  if (/A = 2\\pi r h/.test(p)) { start = "A = 2πrh"; ops = ["Divide by 2πh"]; }
  if (!ops || !result) return null;
  const answer = flat(result);
  return { figure: { type: "flow", steps: [{ text: start, kind: "in" }, ...ops.map((text) => ({ text, kind: "step" as const })), { text: answer.replace(/\s*=\s*\d.*$/, "") || answer, kind: "out" }], alt: `${start}. ${ops.join(", then ")}, doing the same to both sides. This makes ${flat(result)}.` } };
};

const algebraicFractions: Builder = (q) => {
  const f = /Simplify \$\\frac\{(.+)\}\{(.+)\}\$/.exec(q.prompt);
  return f ? solutionTable(q, ["Step", "Working"], `(${flat(f[1])}) ÷ ${/^[a-z0-9]+$/.test(flat(f[2])) ? flat(f[2]) : `(${flat(f[2])})`}`) : null;
};

const simultaneous: Builder = (q) => {
  const lines = [...plain(q.prompt).matchAll(/(-?\d*)x ([+-]) (\d*)y &= (-?\d+)/g)];
  const mult = /Multiply \(1\) by \$(-?\d+)\$ and \(2\) by \$(-?\d+)\$/.exec(q.solution[0] ?? "");
  if (lines.length !== 2 || !mult || q.answer.kind !== "multi") return null;
  const co = (s: string) => (s === "" ? 1 : s === "-" ? -1 : Number(s));
  const [a1, b1, c1, a2, b2, c2] = lines.flatMap((l) => [co(l[1]), (l[2] === "-" ? -1 : 1) * co(l[3]), Number(l[4])]);
  const mm = Number(mult[1]), nn = Number(mult[2]);
  if (b1 * mm !== b2 * nn) return null;
  const ax = a1 * mm - a2 * nn, cx = c1 * mm - c2 * nn;
  if (!ax || cx % ax) return null;
  const x = cx / ax, y = (c1 - a1 * x) / b1;
  const [fx, fy] = q.answer.fields.map((f) => f.value);
  if (x !== fx || y !== fy) return null;
  const rows: (string | number)[][] = [["Equation (1)", eq(a1, b1, c1)], ["Equation (2)", eq(a2, b2, c2)]];
  if (mm !== 1 || nn !== 1) rows.push([`Make the y terms match: (1) × ${mm} and (2) × ${nn}`, `${eq(a1 * mm, b1 * mm, c1 * mm)}   and   ${eq(a2 * nn, b2 * nn, c2 * nn)}`]);
  rows.push(["Subtract to remove y", `${coef(ax, "x")} = ${cx < 0 ? "−" + -cx : cx}`], ["Solve for x", `x = ${num(x)}`], ["Put x back in (1) to find y", `${eq(a1, b1, c1).replace("x", `(${num(x)})`).replace(/^(.*?)\(([^)]*)\)/, (_m, pre: string, v: string) => `${pre.replace(/(\d)$/, "$1 × ")}${v.startsWith("−") ? `(${v})` : v}`)}, so y = ${num(y)}`], ["Answer", `x = ${num(x)}, y = ${num(y)}`]);
  return { figure: table(["Step", "Working"], rows, `Elimination: ${rows.map((r) => `${r[0]}: ${r[1]}`).join(". ")}.`) };
};

const solveQuadratic: Builder = (q) => {
  if (q.answer.kind !== "multi" || q.answer.fields.length !== 2) return null;
  const [r1, r2] = q.answer.fields.map((f) => f.value), b = -(r1 + r2), c = r1 * r2;
  const lo = Math.min(r1, r2) - 2, hi = Math.max(r1, r2) + 2, steps = 40, pts: [number, number][] = Array.from({ length: steps + 1 }, (_, i) => { const x = lo + ((hi - lo) * i) / steps; return [Math.round(x * 1e4) / 1e4, Math.round((x * x + b * x + c) * 100) / 100]; });
  pts.push([r1, 0], [r2, 0]); pts.sort((u, v) => u[0] - v[0]); // the curve passes exactly through both roots
  const span = hi - lo, xStep = span <= 8 ? 1 : span <= 16 ? 2 : span <= 40 ? 5 : 10;
  const g = graph([{ pts, label: "y" }], [Math.floor(lo / xStep) * xStep, Math.ceil(hi / xStep) * xStep, xStep], `The graph of y = ${quad(1, b, c)}. It crosses the x axis at x = ${r1} and x = ${r2}, which are the solutions of the equation.`, { marks: [{ x: r1, y: 0, label: `x = ${num(r1)}` }, { x: r2, y: 0, label: `x = ${num(r2)}` }] });
  return { figure: g };
};

const quadraticFormula: Builder = (q) => {
  const m = plain(q.prompt).replace(/−/g, "-").match(/(\d*)x\^\{2\} ([+-]) (\d+)x ([+-]) (\d+) = 0/), a = val(q);
  if (!m || a === null) return null;
  const A = m[1] === "" ? 1 : Number(m[1]), B = (m[2] === "-" ? -1 : 1) * Number(m[3]), C = (m[4] === "-" ? -1 : 1) * Number(m[5]), disc = B * B - 4 * A * C;
  const bs = B < 0 ? `(${num(B)})` : String(B);
  const rows: (string | number)[][] = [["Read off a, b and c", `a = ${A},  b = ${num(B)},  c = ${num(C)}`], ["Discriminant  b² − 4ac", `${bs}² − 4 × ${A} × ${C < 0 ? `(${num(C)})` : C} = ${disc}`]];
  if (/discriminant/.test(q.prompt)) return disc === a ? { figure: table(["Step", "Working"], rows, `a is ${A}, b is ${B} and c is ${C}, so b squared minus 4ac is ${disc}.`) } : null;
  const root = Math.sqrt(disc);
  if (!Number.isInteger(root)) return null;
  const x1 = (-B + root) / (2 * A), x2 = (-B - root) / (2 * A);
  rows.push(["Square root of it", `√${disc} = ${root}`], ["Put into the formula", `x = (${num(-B)} ± ${root}) ÷ ${2 * A}`], ["The two solutions", `x = ${num(x1)}   or   x = ${num(x2)}`]);
  return Math.max(x1, x2) === a ? { figure: table(["Step", "Working"], rows, `The quadratic formula with a = ${A}, b = ${B}, c = ${C}: the discriminant is ${disc}, its square root is ${root}, and x = ${x1} or ${x2}.`) } : null;
};

// ---------------------------------------------------------------------------------------------- Year 10 and 11: trigonometry, surds, functions, iteration
const EXACT: Record<string, [string, number][]> = {
  sin: [["0", 0], ["1/2", 0.5], ["√2/2", Math.SQRT1_2], ["√3/2", Math.sqrt(3) / 2], ["1", 1]],
  cos: [["1", 1], ["√3/2", Math.sqrt(3) / 2], ["√2/2", Math.SQRT1_2], ["1/2", 0.5], ["0", 0]],
  tan: [["0", 0], ["1/√3", 1 / Math.sqrt(3)], ["1", 1], ["√3", Math.sqrt(3)], ["not defined", NaN]],
};
const ANGLES = [0, 30, 45, 60, 90];
export const exactValue = (fn: string, deg: number) => EXACT[fn]?.[ANGLES.indexOf(deg)]?.[1] ?? NaN;
const exactTrig: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  if (a === null) return null;
  const ladder = p.match(/A ladder (\d+) m long .* angle of (\d+)° with the wall/);
  if (ladder) {
    const hyp = Number(ladder[1]);
    return { figure: { type: "rtriangle", base: "?", height: "wall", hyp: `${hyp} m`, angle: `${ladder[2]}°`, alt: `A ladder ${hyp} m long leaning on a wall, making ${ladder[2]}° with the wall. The distance from the wall to the foot of the ladder is opposite the ${ladder[2]}° angle, so it is ${hyp} × sin ${ladder[2]}° = ${a} m.` } };
  }
  const fns = [...p.matchAll(/(sin|cos|tan) (\d+)°/g)].map((m) => [m[1], Number(m[2])] as const);
  if (!fns.length || !/exact value|Work out/.test(p)) return null;
  const rows = ANGLES.map((d, i) => [`${d}°`, EXACT.sin[i][0], EXACT.cos[i][0], EXACT.tan[i][0]]);
  const asked = fns.map(([f, d]) => `${f} ${d}° = ${EXACT[f][ANGLES.indexOf(d)][0]}`).join(", ");
  return { figure: table(["Angle", "sin", "cos", "tan"], rows, `The exact values to learn. In this question: ${asked}. The full table: ${rows.map((r) => `${r[0]}: sin ${r[1]}, cos ${r[2]}, tan ${r[3]}`).join("; ")}.`) };
};

const squareFactor = (n: number) => { let best = 1; for (let s = 2; s * s <= n; s++) if (n % (s * s) === 0) best = s; return best; };
const surds: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), ns = [...p.matchAll(/(?<![a-z])\\sqrt\{(\d+)\}/g)].map((m) => Number(m[1]));
  if (a === null || !ns.length) return null;
  const parts = ns.map((n) => { const sq = squareFactor(n); return { n, sq, rest: n / (sq * sq) }; });
  if (parts.some((x) => x.sq === 1)) return null;
  const once = parts.filter((x, i) => parts.findIndex((y) => y.n === x.n) === i); // the same surd twice is only worked out once
  const rows: (string | number)[][] = once.map((x) => [`√${x.n}: biggest square factor`, `${x.n} = ${x.sq * x.sq} × ${x.rest}`]);
  once.forEach((x) => rows.push([`Take the square root of ${x.sq * x.sq}`, `√${x.n} = √${x.sq * x.sq} × √${x.rest} = ${x.sq}√${x.rest}`]));
  if (parts.length === 2) {
    if (parts[0].rest !== parts[1].rest) return null;
    const k = parts[0].sq + parts[1].sq;
    rows.push(["Add like terms", `${parts[0].sq}√${parts[0].rest} + ${parts[1].sq}√${parts[0].rest} = ${k}√${parts[0].rest}`]);
    return k === a ? { figure: table(["Step", "Working"], rows, `Simplify each surd first: ${parts.map((x) => `√${x.n} = ${x.sq}√${x.rest}`).join(" and ")}. Adding gives ${k}√${parts[0].rest}.`) } : null;
  }
  return parts[0].sq === a ? { figure: table(["Step", "Working"], rows, `√${parts[0].n} = √${parts[0].sq * parts[0].sq} × √${parts[0].rest} = ${parts[0].sq}√${parts[0].rest}.`) } : null;
};

const composite: Builder = (q) => {
  const m = plain(q.prompt).match(/Work out ([fg])\(([fg])\((-?\d+)\)\)/), a = val(q);
  if (!m || a === null) return null;
  const lines = q.solution.map((l) => flat(l).replace(/\.$/, "")).filter(Boolean);
  if (lines.length < 2) return null;
  return { figure: { type: "flow", steps: [{ text: `Start with ${m[3].replace("-", "−")}`, kind: "in" }, { text: `${m[2]} first: ${lines[0]}`.length > 28 ? lines[0] : `${m[2]} first: ${lines[0]}`, kind: "step" }, { text: lines[1], kind: "step" }, { text: String(a).replace("-", "−"), kind: "out" }], alt: `Work from the inside out. ${lines.join(". ")}. The answer is ${a}.` } };
};

const inverseFunctions: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), inp = p.match(/f\^\{-1\}\((-?\d+)\)/)?.[1];
  if (a === null || inp === undefined) return null;
  const v = Number(inp);
  let m = p.match(/f\(x\) = (\d*)x \+ (\d+)\./);
  if (m) {
    const k = m[1] === "" ? 1 : Number(m[1]), c = Number(m[2]), t = v - c;
    if (t / k !== a) return null;
    return { figure: { type: "flow", steps: [{ text: `Start with f⁻¹ input: ${v}`, kind: "in" }, { text: `Undo + ${c}: ${v} − ${c} = ${t}`, kind: "step" }, { text: k === 1 ? "Undo × 1: no change" : `Undo × ${k}: ${t} ÷ ${k} = ${a}`, kind: "step" }, { text: `f⁻¹(${v}) = ${a}`, kind: "out" }], alt: `f(x) = ${k === 1 ? "" : k}x + ${c} multiplies by ${k} then adds ${c}. To undo it, start from ${v}, take away ${c} to get ${t}, then divide by ${k} to get ${a}.` } };
  }
  m = p.match(/f\(x\) = \\frac\{x \+ (\d+)\}\{(\d+)\}/);
  if (m) {
    const c = Number(m[1]), d = Number(m[2]), t = v * d;
    if (t - c !== a) return null;
    return { figure: { type: "flow", steps: [{ text: `Start with f⁻¹ input: ${v}`, kind: "in" }, { text: `Undo ÷ ${d}: ${v} × ${d} = ${t}`, kind: "step" }, { text: `Undo + ${c}: ${t} − ${c} = ${a}`, kind: "step" }, { text: `f⁻¹(${v}) = ${a}`, kind: "out" }], alt: `f(x) adds ${c} then divides by ${d}. To undo it, start from ${v}, multiply by ${d} to get ${t}, then take away ${c} to get ${a}.` } };
  }
  return null;
};

const iteration: Builder = (q) => {
  const m = plain(q.prompt).match(/x_\{n\+1\} = (-?\d*)x_n ([+-]) (\d+) and x_1 = (-?\d+)\. What is x_(\d+)\?/), a = val(q);
  if (!m || a === null) return null;
  const k = m[1] === "" ? 1 : m[1] === "-" ? -1 : Number(m[1]), c = (m[2] === "-" ? -1 : 1) * Number(m[3]), last = Number(m[5]);
  let x = Number(m[4]); const rows: (string | number)[][] = [[1, num(x), "the start"]];
  for (let n = 2; n <= last && n < 9; n++) { const next = k * x + c; rows.push([n, num(next), `${k === 1 ? "" : `${k} × `}${num(x)} ${c < 0 ? "−" : "+"} ${Math.abs(c)}`]); x = next; }
  return x === a && rows.length === last ? { figure: table(["n", "xₙ", "Working"], rows, `Starting at ${m[4]}, use the rule each time: ${rows.map((r) => `x${r[0]} = ${r[1]}`).join(", ")}.`) } : null;
};

const recurringDecimals: Builder = (q) => {
  const m = plain(q.prompt).match(/0\.((?:\\dot\{\d\})+)/), a = val(q);
  if (!m || a === null) return null;
  const digits = [...m[1].matchAll(/\\dot\{(\d)\}/g)].map((x) => x[1]).join(""), n = digits.length, mult = 10 ** n, top = Number(digits), bottom = mult - 1, g = gcd(top, bottom);
  if (Math.abs(top / bottom - a) > 1e-9) return null;
  const rep = digits.repeat(4);
  const rows: (string | number)[][] = [["Call it x", `x = 0.${rep}…`], [`Multiply by ${mult} (${n} repeating digit${n > 1 ? "s" : ""})`, `${mult}x = ${digits}.${rep}…`], ["Subtract: the repeating parts cancel", `${mult}x − x = ${digits}, so ${bottom}x = ${digits}`], ["Divide by " + bottom, `x = ${digits}/${bottom}`]];
  rows.push(g > 1 ? [`Simplify (divide both by ${g})`, `${top / g}/${bottom / g}`] : ["Already in its simplest form", `${top}/${bottom}`]);
  return { figure: table(["Step", "Working"], rows, `0.${rep}… times ${mult}, minus itself, leaves ${digits}, so ${bottom}x = ${digits} and x = ${top / g}/${bottom / g}.`) };
};

const conditional: Builder = (q) => {
  const m = plain(q.prompt).match(/A bag has (\d+) red and (\d+) blue counters\. Two counters are taken at random without replacement\. What is the probability that (both are red|they are different colours)/), a = val(q);
  if (!m || a === null) return null;
  const r = Number(m[1]), b = Number(m[2]), t = r + b, both = m[3] === "both are red";
  const seg = (red: number, blue: number) => [{ label: `${red} red`, size: red, tone: "a" as const }, { label: `${blue} blue`, size: blue, tone: "b" as const }];
  const rows = [{ label: "1st counter", segments: seg(r, b), note: `${r} red out of ${t}` }, { label: "2nd, if the 1st was red", segments: seg(r - 1, b), note: `${r - 1} red out of ${t - 1}` }];
  if (!both) rows.push({ label: "2nd, if the 1st was blue", segments: seg(r, b - 1), note: `${r} red out of ${t - 1}` });
  const prob = both ? (r / t) * ((r - 1) / (t - 1)) : (2 * r * b) / (t * (t - 1));
  return Math.abs(prob - a) < 1e-9 ? { figure: { type: "bar-model", rows, alt: `The bag has ${r} red and ${b} blue counters. After a red is taken there are ${r - 1} red and ${b} blue left, so the chances for the second counter change${both ? "" : "; after a blue is taken there are " + r + " red and " + (b - 1) + " blue"}.` } } : null;
};

export const FINAL_BUILDERS: Record<string, Builder> = {
  "quadratic-sequences": quadraticSequence, "completing-square": completingSquare, "rearrange-formulae": rearrange, "algebraic-fractions": algebraicFractions,
  simultaneous, "solve-quad": solveQuadratic, "quadratic-formula": quadraticFormula,
  "exact-trig": exactTrig, surds, "composite-functions": composite, "inverse-functions": inverseFunctions, iteration, "recurring-decimals": recurringDecimals, "conditional-probability": conditional,
  "time-facts": timeFacts, "multiply-three": multiplyThree, "using-formulae": usingFormulae, "order-ops": orderOps,
  "mixed-number-ops": mixedNumbers, "sig-figs": sigFigs, "word-problems": wordProblems,
};
