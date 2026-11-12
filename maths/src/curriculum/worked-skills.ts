import type { Question } from "../engine/types";
import { chunkWork, columnManyWork, columnWork, jumpLine, placeChart } from "../engine/worked";

/**
 * Attaches a picture of the method to a finished question, for the topics where the working is easier to follow drawn than described:
 * place value charts, number lines with hops, columns with decimals, long division by chunking, time and money. Each builder reads the
 * question's own wording and answer; if it can't make sense of a question it returns nothing and the question stays as it was. The
 * tests check every builder against the question's own answer, so a picture can't disagree with it.
 */
import { dec, fmt, thin, clean, numbers, val, sequenceLine, type Built, type Builder } from "./worked-utils";
import { FRACTION_BUILDERS } from "./worked-fractions";
import { MORE_BUILDERS } from "./worked-more";
import { SECONDARY_BUILDERS } from "./worked-secondary";

// ---------------------------------------------------------------------------------------------- place value
const placeValueBuilder: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  let m = p.match(/(?:digit|digit \d) (\d) in (?:the number )?(\d+)/) ?? p.match(/In (\d+), what is the value/);
  if (/value of the digit/.test(p)) { const n = p.match(/in (\d+)\??$/)?.[1] ?? p.match(/in the number (\d+)/)?.[1] ?? p.match(/In (\d+)/)?.[1]; if (n) return { figure: placeChart([{ label: "Number", value: n }], `The number ${n} in a place value chart.`) }; }
  m = p.match(/What is (\d+) (more|less) than (\d+)/);
  if (m && a !== null) return { figure: placeChart([{ label: "Start", value: m[3] }, { label: "Answer", value: fmt(a) }], `A place value chart: ${m[3]} and, ${m[2]} by ${m[1]}, ${a}. Only one column changes.`) };
  m = p.match(/How many (\w+) are there in (\d+)/);
  if (m) return { figure: placeChart([{ label: "Number", value: m[2] }], `The number ${m[2]} in a place value chart.`) };
  if (/Write .* as (?:a|one) number/.test(p) && a !== null) return { figure: placeChart([{ label: "Answer", value: fmt(a) }], `The number ${a} in a place value chart, with each part in its own column.`) };
  const n = numbers(p).find((x) => Number.isInteger(x) && x >= 10);
  return n !== undefined ? { figure: placeChart([{ label: "Number", value: fmt(n) }], `The number ${n} in a place value chart.`) } : null;
};

const shiftBuilder: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  const m = p.match(/What is (\d+(?:\.\d+)?) (×|÷) (\d+)\?/) ?? p.match(/Work out (\d+(?:\.\d+)?) (\\times|\\div) (\d+)/);
  if (!m || a === null) return null;
  const mult = m[2] === "×" || m[2] === "\\times", places = String(m[3]).length - 1;
  return { figure: placeChart([{ label: "Start", value: m[1] }, { label: "Answer", value: dec(a) }], `A place value chart showing ${m[1]} and ${dec(a)}. Every digit moves ${places} place${places > 1 ? "s" : ""} ${mult ? "left" : "right"}.`) };
};

const decimalNumberBuilder: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  const frac = p.match(/\\frac\{(\d+)\}\{(\d+)\}/);
  if (frac && a !== null) return { figure: placeChart([{ label: `${frac[1]}/${frac[2]}`, value: dec(a) }], `${frac[1]} over ${frac[2]} written as the decimal ${dec(a)} in a place value chart.`) };
  const d = p.match(/(\d+\.\d+)/);
  if (d) return { figure: placeChart([{ label: "Number", value: d[1] }], `The decimal ${d[1]} in a place value chart.`) };
  return null;
};

// ---------------------------------------------------------------------------------------------- rounding
const roundingBuilder: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  let m = p.match(/Round (\d+(?:\.\d+)?) to the nearest (\d+)/);
  if (m && a !== null) {
    const n = Number(m[1]), to = Number(m[2]), lo = Math.floor(n / to) * to, hi = lo + to, mid = lo + to / 2;
    return { figure: jumpLine({ min: lo, max: hi, step: to / 10, tickLabels: { [lo]: thin(lo), [mid]: `${thin(mid)} (halfway)`, [hi]: thin(hi) }, marks: [{ v: n, tone: "start", label: thin(n) }], jumps: [{ from: n, to: a, label: n >= mid ? "round up" : "round down" }], alt: `A number line from ${lo} to ${hi}. ${n} is ${n >= mid ? "past" : "before"} the halfway point ${mid}, so it rounds ${n >= mid ? "up" : "down"} to ${a}.` }) };
  }
  m = p.match(/Round (\d+(?:\.\d+)?) to (\d) decimal place/);
  if (m && a !== null) {
    const n = Number(m[1]), dp = Number(m[2]), unit = 10 ** -dp, lo = Math.floor(n / unit + 1e-9) * unit, hi = lo + unit, mid = lo + unit / 2, r = (x: number) => Math.round(x * 1e6) / 1e6;
    return { figure: jumpLine({ min: r(lo), max: r(hi), step: r(unit / 10), tickLabels: { [r(lo)]: dec(lo), [r(mid)]: `${dec(mid)} (halfway)`, [r(hi)]: dec(hi) }, marks: [{ v: n, tone: "start", label: dec(n) }], jumps: [{ from: n, to: a, label: n >= mid ? "round up" : "round down" }], alt: `A number line from ${dec(lo)} to ${dec(hi)}. ${n} is ${n >= mid ? "past" : "before"} the halfway point ${dec(mid)}, so it rounds ${n >= mid ? "up" : "down"} to ${a}.` }) };
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- counting in steps, and through zero
const countingBuilder: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  if (a === null) return null;
  const back = /count back/i.test(p);
  let m = p.match(/Count (?:back )?in (\d+)s: ([^.?]*)/);
  if (m) {
    const step = (back ? -1 : 1) * Number(m[1]), terms: string[] = m[2].match(/-?\d+|__/g) ?? [];
    const first = Number(terms[0]);
    if (/next number/.test(p)) return sequenceLine(first, step, terms.filter((t) => t !== "__").length + 1);
    if (/missing number/.test(p)) return sequenceLine(first, step, terms.length, terms.indexOf("__"));
    const nth = p.match(/the (\d+)(?:st|nd|rd|th)/);
    if (nth) return sequenceLine(first, step, Number(nth[1]));
  }
  m = p.match(/Count back in (\d+)s from (\d+)/);
  if (m) { const nth = p.match(/the (\d+)(?:st|nd|rd|th)/); if (nth) return sequenceLine(Number(m[2]), -Number(m[1]), Number(nth[1])); }
  return null;
};

const temperatureBuilder: Builder = (q) => {
  const p = clean(q.prompt);
  const start = p.match(/is (-?\d+)(?:\^\\circ|°)/)?.[1];
  if (!start) return null;
  const moves: number[] = []; const re = /(falls|drops|goes down|rises|goes up)[^\d-]*(\d+)/g; let m: RegExpExecArray | null;
  while ((m = re.exec(p))) moves.push((/fall|drop|down/.test(m[1]) ? -1 : 1) * Number(m[2]));
  if (!moves.length) return null;
  let at = Number(start); const pts = [at], jumps: { from: number; to: number; label: string }[] = [];
  for (const d of moves) { jumps.push({ from: at, to: at + d, label: `${d > 0 ? "+" : "−"}${Math.abs(d)}` }); at += d; pts.push(at); }
  const lo = Math.min(...pts, 0) - 1, hi = Math.max(...pts, 0) + 1;
  return { figure: jumpLine({ min: lo, max: hi, step: 1, tickLabels: Object.fromEntries([...new Set([...pts, 0])].map((v) => [v, String(v).replace("-", "−")])), marks: [{ v: pts[0], tone: "start", label: `${pts[0]}°`.replace("-", "−") }, { v: at, tone: "end", label: `${at}°`.replace("-", "−") }], jumps, alt: `A thermometer line from ${lo} to ${hi}. Start at ${pts[0]} degrees, ${moves.map((d) => `${d < 0 ? "fall" : "rise"} ${Math.abs(d)}`).join(" then ")}, to finish at ${at} degrees.` }) };
};

const negativesBuilder: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  if (a === null) return null;
  const hot = temperatureBuilder(q); if (hot) return hot;
  let m = p.match(/difference between (-?\d+)(?:\^\\circ|°)?C? and (-?\d+)/);
  if (m) {
    const x = Number(m[1]), y = Number(m[2]), lo = Math.min(x, y), hi = Math.max(x, y), jumps = lo < 0 && hi > 0 ? [{ from: lo, to: 0, label: `+${-lo}` }, { from: 0, to: hi, label: `+${hi}` }] : [{ from: lo, to: hi, label: `+${hi - lo}` }];
    return { figure: jumpLine({ min: Math.min(lo, 0) - 1, max: Math.max(hi, 0) + 1, step: Math.ceil((hi - lo) / 12) || 1, tickLabels: Object.fromEntries([lo, 0, hi].map((v) => [v, String(v).replace("-", "−")])), marks: [{ v: lo, tone: "start" }, { v: hi, tone: "end" }], jumps, alt: `A number line from ${lo} up to ${hi}, passing zero. The distance between them is ${a}.` }) };
  }
  m = p.match(/Work out (-?\d+) ([+-]) (-?\d+)/);
  if (m) {
    const x = Number(m[1]), d = (m[2] === "+" ? 1 : -1) * Number(m[3]), lo = Math.min(x, x + d, 0) - 1, hi = Math.max(x, x + d, 0) + 1;
    return { figure: jumpLine({ min: lo, max: hi, step: Math.ceil((hi - lo) / 14) || 1, tickLabels: Object.fromEntries([...new Set([x, x + d, 0])].map((v) => [v, String(v).replace("-", "−")])), marks: [{ v: x, tone: "start" }, { v: x + d, tone: "end" }], jumps: [{ from: x, to: x + d, label: `${d > 0 ? "+" : "−"}${Math.abs(d)}` }], alt: `A number line. Start at ${x} and move ${Math.abs(d)} ${d > 0 ? "up" : "down"} to ${x + d}.` }) };
  }
  return null;
};

// ---------------------------------------------------------------------------------------------- time and money on a line
const mins = (h: number, m: number) => h * 60 + m;
const clock = (t: number) => `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
const timeBuilder: Builder = (q) => {
  const p = q.prompt.replace(/\$/g, ""), t = [...p.matchAll(/(\d{1,2}):(\d{2})/g)].map((x) => mins(Number(x[1]), Number(x[2])));
  if (t.length < 2) return null;
  const [s, e] = t;
  const stops = [s]; for (let h = Math.floor(s / 60) * 60 + 60; h < e; h += 60) stops.push(h); stops.push(e);
  const jumps = stops.slice(1).map((to, i) => ({ from: stops[i], to, label: `+${to - stops[i]} min` }));
  const step = e - s <= 60 ? 5 : e - s <= 180 ? 10 : 30;
  return { figure: jumpLine({ min: s - (s % step), max: e + ((step - (e % step)) % step), step, tickLabels: Object.fromEntries(stops.map((v) => [v, clock(v)])), marks: [{ v: s, tone: "start" }, { v: e, tone: "end" }], jumps, alt: `A time line from ${clock(s)} to ${clock(e)}. ${jumps.map((j) => `Jump ${j.label.replace("+", "")} to ${clock(j.to)}`).join(", ")}. Total ${e - s} minutes.` }) };
};

const changeBuilder: Builder = (q) => {
  const p = q.prompt.replace(/\$/g, ""), a = val(q);
  if (a === null) return null;
  const items = [...p.matchAll(/(\d+)p/g)].map((x) => Number(x[1])), paid = Number(p.match(/pay with (?:a )?£(\d+)/)?.[1] ?? p.match(/You pay £(\d+)/)?.[1]);
  if (!items.length || !paid) return null;
  const price = items.reduce((t, x) => t + x, 0), target = paid * 100, stops = [price];
  for (const step of [10, 100]) { const next = Math.ceil(stops[stops.length - 1] / step) * step; if (next > stops[stops.length - 1] && next < target) stops.push(next); }
  for (let v = Math.floor(stops[stops.length - 1] / 100) * 100 + 100; v < target; v += 100) if (v > stops[stops.length - 1]) stops.push(v);
  stops.push(target);
  const label = (n: number) => (n >= 100 && n % 100 === 0 ? `£${n / 100}` : `${n}p`);
  return { figure: jumpLine({ min: price, max: target, step: Math.max(1, (target - price) / 10), tickLabels: Object.fromEntries(stops.map((v) => [v, label(v)])), marks: [{ v: price, tone: "start", label: `${price}p` }, { v: target, tone: "end" }], jumps: stops.slice(1).map((to, i) => ({ from: stops[i], to, label: `+${label(to - stops[i])}` })), alt: `Counting on from ${price}p up to ${label(target)}. The jumps add up to the change: ${a}p.` }) };
};

const decimalTimesDivide: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  const m = p.match(/Work out (\d+(?:\.\d+)?) (\\times|\\div) (\d+(?:\.\d+)?)/);
  if (!m || a === null) return null;
  const x = Number(m[1]), y = Number(m[3]), mult = m[2] === "\\times";
  if ([10, 100, 1000].includes(y)) return shiftBuilder(q);
  if (mult && Number.isInteger(y) && y <= 12) return { figure: { type: "bar-model", rows: [{ label: `${y} lots of ${dec(x)}`, segments: Array.from({ length: y }, () => ({ label: dec(x) })), note: `= ${dec(a)}` }], alt: `${y} equal bars of ${dec(x)}. Together they make ${dec(a)}.` } };
  if (!mult && Number.isInteger(y) && y <= 12) return { figure: { type: "bar-model", rows: [{ label: `${dec(x)} shared into ${y} equal parts`, segments: Array.from({ length: y }, () => ({ label: dec(a) })), note: `${dec(x)} in all` }], alt: `A bar of ${dec(x)} split into ${y} equal parts of ${dec(a)}.` } };
  return null;
};

// ---------------------------------------------------------------------------------------------- columns with decimals
const moneyColumns: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  const pounds = [...q.prompt.replace(/\$/g, "").matchAll(/£(\d+(?:\.\d+)?)/g)].map((x) => Math.round(Number(x[1]) * 100));
  if (a === null || pounds.length < 2) return null;
  if (/change/.test(p)) { const paid = pounds[pounds.length - 1], cost = pounds.slice(0, -1).reduce((t, x) => t + x, 0); return paid > cost ? columnWork(paid, cost, "-", { dp: 2, prefix: "£", names: ["pence", "tens of pence", "pounds", "tens of pounds"] }) : null; }
  return pounds.length === 2 ? columnWork(pounds[0], pounds[1], "+", { dp: 2, prefix: "£", names: ["pence", "tens of pence", "pounds", "tens of pounds"] }) : columnManyWork(pounds, { dp: 2, prefix: "£", names: ["pence", "tens of pence", "pounds", "tens of pounds"] });
};

const decimalColumns: Builder = (q) => {
  const p = clean(q.prompt);
  const m = p.match(/Work out (\d+(?:\.\d+)?) ([+-]) (\d+(?:\.\d+)?)/);
  if (!m) return null;
  const dp = Math.max((m[1].split(".")[1] ?? "").length, (m[3].split(".")[1] ?? "").length), k = 10 ** dp, x = Math.round(Number(m[1]) * k), y = Math.round(Number(m[3]) * k);
  if (m[2] === "-" && x < y) return null;
  return columnWork(x, y, m[2] === "+" ? "+" : "-", { dp });
};

const measureColumns: Builder = (q) => {
  const p = q.prompt.replace(/\$/g, ""), a = val(q);
  if (a === null) return null;
  const metres = p.match(/(\d+) m (\d+) cm/), cms = [...p.matchAll(/(\d+) cm/g)].map((x) => Number(x[1]));
  if (metres && cms.length >= 2) return columnWork(Number(metres[1]) * 100 + Number(metres[2]), cms[cms.length - 1], "+");
  const litres = p.match(/(\d+) l\b.*?(\d+) ml/);
  if (litres && /left|pour/.test(p)) return columnWork(Number(litres[1]) * 1000, Number(litres[2]), "-");
  const two = [...p.matchAll(/(\d+) (cm|m|ml|g|mm)/g)].map((x) => Number(x[1]));
  if (two.length >= 2 && /altogether/.test(p)) return columnWork(two[0], two[1], "+");
  if (two.length >= 2 && /left|difference|longer|more/.test(p)) return two[0] >= two[1] ? columnWork(two[0], two[1], "-") : null;
  return null;
};

// ---------------------------------------------------------------------------------------------- long division by chunking
const chunkingBuilder: Builder = (q) => {
  const p = clean(q.prompt), m = p.match(/(\d+) ÷ (\d+)/) ?? p.match(/(\d+) \\div (\d+)/);
  return m ? chunkWork(Number(m[1]), Number(m[2])) : null;
};

const BUILDERS: Record<string, Builder> = {
  ...FRACTION_BUILDERS, ...MORE_BUILDERS, ...SECONDARY_BUILDERS,
  "place-value": placeValueBuilder, "place-value-millions": placeValueBuilder, "large-numbers": (q) => (/[×÷]/.test(clean(q.prompt)) ? shiftBuilder(q) : placeValueBuilder(q)),
  "divide-10-100": shiftBuilder, hundredths: decimalNumberBuilder, thousandths: decimalNumberBuilder,
  rounding: roundingBuilder, "count-steps": countingBuilder, "count-steps-more": countingBuilder, "count-through-zero": (q) => (temperatureBuilder(q) ?? countingBuilder(q)),
  "negative-numbers": negativesBuilder, "elapsed-time": timeBuilder, timetables: timeBuilder, "money-change": changeBuilder,
  "add-sub-money": moneyColumns, decimals: (q) => (/[×÷]|times|div/.test(clean(q.prompt)) ? decimalTimesDivide(q) : decimalColumns(q)), "measure-add": measureColumns, "long-division": chunkingBuilder,
};

/** The question with a picture of the method, if there's a builder for its topic and it understood the question. */
export function addWorkedPicture(q: Question): Question {
  if (q.worked) return q;
  const build = BUILDERS[q.skill];
  if (!build) return q;
  let out: Built | null = null;
  try { out = build(q); } catch { out = null; }
  return out ? { ...q, worked: out.figure, ...(out.steps ? { solution: out.steps } : {}) } : q;
}
export const hasWorkedBuilder = (skillId: string) => skillId in BUILDERS;
