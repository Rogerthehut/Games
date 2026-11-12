import type { Figure } from "../engine/types";
import { jumpLine } from "../engine/worked";
import { clean, dec, sequenceLine, val, type Builder } from "./worked-utils";

/**
 * Pictures for Years 7 to 11 topics: working laid out as a table (equations, substituting, interest and growth), number lines for
 * inequalities, grids for expanding, probability trees, formula triangles, bars for profit and VAT, and written-out powers.
 */
const table = (head: string[], rows: (string | number)[][], alt: string): Figure => ({ type: "table", head, rows, alt });
const plain = (t: string) => t.replace(/\$/g, "");
const money = (n: number) => { const r = Math.round(n * 100) / 100; return `£${Number.isInteger(r) ? r : r.toFixed(2)}`; };
/** LaTeX from our own generators, read as plain text for a table cell. */
const flat = (t: string) => plain(t).replace(/\\left|\\right/g, "").replace(/\\times/g, "×").replace(/\\div/g, "÷").replace(/\\le\b/g, "≤").replace(/\\ge\b/g, "≥").replace(/\\pi/g, "π").replace(/\^\{2\}/g, "²").replace(/\^\{3\}/g, "³").replace(/\^\{(\d+)\}/g, "^$1").replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/\\\\/g, "").replace(/-/g, "−").replace(/\s+/g, " ").trim();

/** Each step of the solution as a row: what is done, and what it gives. */
const stepsTable: Builder = (q) => {
  const lines = q.solution.filter((l) => l.trim());
  if (lines.length < 2) return null;
  const start = flat(q.prompt).replace(/^(Solve|Simplify|Expand and simplify|Expand|Factorise)\s*/i, "").replace(/\.$/, "").replace(/ fully$/, "");
  const rows: (string | number)[][] = [["Start", start]];
  for (const l of lines) { const i = l.indexOf(":"); rows.push(i > 0 && i < 48 ? [flat(l.slice(0, i)), flat(l.slice(i + 1)).replace(/\.$/, "")] : ["", flat(l).replace(/\.$/, "")]); }
  return { figure: table(["Step", "Working"], rows, `The working, one step at a time: ${rows.map((r) => `${r[0] ? r[0] + ": " : ""}${r[1]}`).join(". ")}.`) };
};

const substitute: Builder = (q) => {
  const m = clean(q.prompt).match(/(?:Calculate|Work out) (.+?) when x = (-?\d+(?:\.\d+)?)/), a = val(q);
  if (!m || a === null) return null;
  const v = m[2], shown = v.startsWith("-") ? `(${v.replace("-", "−")})` : v;
  const worked = flat(m[1]).replace(/(\d)x²/g, `$1 × ${shown}²`).replace(/(\d)x/g, `$1 × ${shown}`).replace(/x²/g, `${shown}²`).replace(/x/g, shown);
  return { figure: table(["x is", "Put it in", "Answer"], [[v.replace("-", "−"), worked, dec(a)]], `Replace x with ${v} in ${flat(m[1])}: ${worked}, which is ${dec(a)}.`) };
};

const inequality: Builder = (q) => {
  const first = flat(q.solution[0] ?? ""), m = first.match(/x\s*(<|>|≤|≥)\s*(−?\d+(?:\.\d+)?)/), a = val(q);
  if (!m || a === null) return null;
  const b = Number(m[2].replace("−", "-")), strict = m[1] === "<" || m[1] === ">", left = m[1] === "<" || m[1] === "≤", lo = Math.floor(b) - 4, hi = Math.ceil(b) + 4;
  const edge = left ? lo + 0.5 : hi - 0.5, round = (n: number) => Math.round(n * 100) / 100;
  return { figure: jumpLine({ min: lo, max: hi, step: 1, tickLabels: Object.fromEntries([...new Set([lo, Math.round(b), hi, a])].map((v) => [v, String(v).replace("-", "−")])), marks: [{ v: round(b), tone: strict ? "mid" : "start", label: `x ${m[1]} ${dec(b)}`.replace("-", "−") }, { v: a, tone: "end" }], jumps: [{ from: round(b), to: edge, label: left ? "x can be these" : "x can be these" }], alt: `A number line. ${strict ? "An open circle" : "A filled circle"} at ${dec(b)}, and the values ${left ? "below" : "above"} it are allowed. The largest whole number that works is ${a}.` }) };
};

const nthTerm: Builder = (q) => {
  const p = clean(q.prompt), list = p.match(/sequence ((?:-?\d+, )+)…/), rule = p.match(/nth term of a sequence is (-?\d*)n ([+-]) (\d+)/);
  if (list) { const t = list[1].split(",").map((x) => Number(x.trim())).filter((x) => Number.isFinite(x)); if (t.length >= 2) return sequenceLine(t[0], t[1] - t[0], t.length + 1); }
  if (rule) { const k = rule[1] === "" ? 1 : rule[1] === "-" ? -1 : Number(rule[1]), c = (rule[2] === "-" ? -1 : 1) * Number(rule[3]); return { figure: table(["n", "1", "2", "3", "4", "5"], [["term", ...[1, 2, 3, 4, 5].map((n) => k * n + c)]], `The first five terms with nth term ${k}n ${rule[2]} ${rule[3]}: ${[1, 2, 3, 4, 5].map((n) => k * n + c).join(", ")}.`) }; }
  return null;
};

const simpleInterest: Builder = (q) => {
  const p = plain(q.prompt), m = p.match(/£(\d+) .* (\d+(?:\.\d+)?)% simple interest.* (\d+) years?/);
  const one = p.match(/£(\d+) .* (\d+(?:\.\d+)?)% simple interest/);
  const years = Number(p.match(/in (\d+) years?|after (\d+) years?/)?.[1] ?? p.match(/after (\d+) years?/)?.[1] ?? 1);
  const pr = Number((m ?? one)?.[1]), rate = Number((m ?? one)?.[2]);
  if (!Number.isFinite(pr) || !Number.isFinite(rate) || years > 8) return null;
  const each = (pr * rate) / 100;
  return { figure: table(["Year", "Interest this year", "Interest so far", "Total"], Array.from({ length: years }, (_, i) => [i + 1, money(each), money(each * (i + 1)), money(pr + each * (i + 1))]), `${rate} percent of ${money(pr)} is ${money(each)} each year. After ${years} year${years > 1 ? "s" : ""} the interest is ${money(each * years)} and the total ${money(pr + each * years)}.`) };
};

const growth = (start: number, mult: number, years: number) => Array.from({ length: years + 1 }, (_, i) => start * mult ** i);
const compoundInterest: Builder = (q) => {
  const m = plain(q.prompt).match(/£(\d+) is invested for (\d+) years? at (\d+(?:\.\d+)?)% compound/);
  if (!m) return null;
  const P = Number(m[1]), n = Number(m[2]), r = Number(m[3]), mult = 1 + r / 100, vals = growth(P, mult, n);
  return { figure: table(["Year", "Start", `× ${dec(mult)}`, "End"], vals.slice(1).map((end, i) => [i + 1, money(vals[i]), `+${money(end - vals[i])}`, money(end)]), `${money(P)} grows by ${r} percent each year, for ${n} years: ${vals.slice(1).map((v, i) => `year ${i + 1} ends at ${money(v)}`).join(", ")}.`) };
};

const growthDecay: Builder = (q) => {
  const p = plain(q.prompt), m = p.match(/(?:worth |population of |is |costs )£?(\d+)\b.*?(loses|falls|drops|decreases|grows|increases|rises|goes up) (?:by )?(\d+(?:\.\d+)?)%/), years = Number(p.match(/after (\d+) years?/)?.[1]);
  if (!m || !Number.isFinite(years) || years > 8) return null;
  const down = /loses|falls|drops|decreases/.test(m[2]), mult = 1 + (down ? -1 : 1) * Number(m[3]) / 100, start = Number(m[1]), vals = growth(start, mult, years), pound = /£/.test(p);
  const f = (n: number) => (pound ? money(n) : dec(Math.round(n * 100) / 100));
  return { figure: table(["Year", "Start", `× ${dec(mult)}`, "End"], vals.slice(1).map((end, i) => [i + 1, f(vals[i]), `${down ? "−" : "+"}${f(Math.abs(end - vals[i]))}`, f(end)]), `Each year the value is multiplied by ${dec(mult)}: ${vals.slice(1).map((v, i) => `year ${i + 1} gives ${f(v)}`).join(", ")}.`) };
};

const tree: Builder = (q) => {
  const p = plain(q.prompt), ev = [...p.matchAll(/probability that (.+?) is (0\.\d+)/g)].map((m) => ({ name: m[1], p: Number(m[2]) }));
  if (ev.length < 2) return null;
  const short = (s: string) => (s.length > 16 ? `${s.slice(0, 15)}…` : s);
  return { figure: { type: "tree", first: { name: short(ev[0].name), p: ev[0].p }, second: { name: short(ev[1].name), p: ev[1].p }, alt: `A probability tree for two independent events. ${ev[0].name} has probability ${ev[0].p} and ${ev[1].name} has probability ${ev[1].p}. Each of the four outcomes is found by multiplying along its branches.` } };
};

const speedDistanceTime: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  if (a === null) return null;
  const nums = (p.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (/How far/.test(p) && nums.length >= 2) return { figure: { type: "formula-triangle", top: "Distance", left: "Speed", right: "Time", find: "top", values: { left: `${nums[0]} mph`, right: `${nums[1]} h` }, alt: `A formula triangle with distance on top and speed and time below. Cover distance: speed times time. ${nums[0]} times ${nums[1]} is ${dec(a)}.` } };
  if (/what is the speed/i.test(p) && nums.length >= 2) return { figure: { type: "formula-triangle", top: "Distance", left: "Speed", right: "Time", find: "left", values: { top: `${nums[0]} mi`, right: `${nums[1]} h` }, alt: `A formula triangle. Cover speed: distance divided by time. ${nums[0]} divided by ${nums[1]} is ${dec(a)}.` } };
  if (/How many hours|how long/i.test(p) && nums.length >= 2) return { figure: { type: "formula-triangle", top: "Distance", left: "Speed", right: "Time", find: "right", values: { top: `${nums[0]} mi`, left: `${nums[1]} mph` }, alt: `A formula triangle. Cover time: distance divided by speed. ${nums[0]} divided by ${nums[1]} is ${dec(a)}.` } };
  return null;
};

const profitLoss: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  let m = p.match(/buys .* for £(\d+) and sells it for £(\d+)/);
  if (m) { const cost = Number(m[1]), sell = Number(m[2]), diff = Math.abs(sell - cost), gain = sell >= cost; return { figure: { type: "bar-model", rows: [{ label: `cost ${money(cost)}, sold for ${money(sell)}`, segments: gain ? [{ label: money(cost), size: cost, tone: "a" }, { label: `profit ${money(diff)}`, size: diff, tone: "b" }] : [{ label: money(sell), size: sell, tone: "a" }, { label: `loss ${money(diff)}`, size: diff, tone: "c" }], note: /percentage/.test(p) ? `${dec((diff / cost) * 100)}% of the cost` : undefined }], alt: `A bar for the cost, ${money(cost)}, and the ${gain ? "profit" : "loss"}, ${money(diff)}. Sold for ${money(sell)}.` } }; }
  m = p.match(/buys .* for £(\d+) and sells it at a (loss|profit) of (\d+)%/);
  if (m && a !== null) { const cost = Number(m[1]), pct = Number(m[3]), part = (cost * pct) / 100, loss = m[2] === "loss"; return { figure: { type: "bar-model", rows: [{ label: `${pct}% of ${money(cost)} = ${money(part)}`, segments: [{ label: `${pct}%`, size: pct, tone: loss ? "c" : "b" }, { label: `${100 - pct}%`, size: 100 - pct, tone: "none" }] }, { label: "selling price", segments: loss ? [{ label: money(cost - part), size: cost - part, tone: "a" }, { label: `−${money(part)}`, size: part, tone: "c" }] : [{ label: money(cost), size: cost, tone: "a" }, { label: `+${money(part)}`, size: part, tone: "b" }], note: money(a) }], alt: `${pct} percent of ${money(cost)} is ${money(part)}. The selling price is ${money(a)}.` } }; }
  return null;
};

const vatWages: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  let m = p.match(/costs £(\d+) before VAT\. VAT is (\d+)%/);
  if (m && a !== null) { const base = Number(m[1]), pct = Number(m[2]), vat = (base * pct) / 100; return { figure: { type: "bar-model", rows: [{ label: "price before VAT, then VAT", segments: [{ label: money(base), size: base, tone: "a" }, { label: `VAT ${money(vat)}`, size: vat, tone: "b" }], note: money(base + vat) }], alt: `${pct} percent of ${money(base)} is ${money(vat)}. With VAT the price is ${money(base + vat)}.` } }; }
  m = p.match(/costs £(\d+) including (\d+)% VAT/);
  if (m && a !== null) { const total = Number(m[1]), pct = Number(m[2]); return { figure: { type: "bar-model", rows: [{ label: `${100 + pct}% is ${money(total)}`, segments: [{ label: "100%", size: 100, tone: "a" }, { label: `${pct}%`, size: pct, tone: "b" }], note: money(total) }, { label: "so 100% is", segments: [{ label: money(a), size: 100, tone: "a" }, { label: money(total - a), size: pct, tone: "b" }] }], alt: `The price with VAT is ${100 + pct} percent, ${money(total)}. Dividing by ${dec(1 + pct / 100)} gives the price before VAT, ${money(a)}.` } }; }
  m = p.match(/£(\d+) an hour for (\d+) hours.*\((\d+(?:\.\d+)?) ×.*for (\d+) hours of overtime/);
  if (m && a !== null) { const rate = Number(m[1]), h = Number(m[2]), mult = Number(m[3]), oh = Number(m[4]); return { figure: table(["", "Hours", "Rate", "Pay"], [["Normal", h, money(rate), money(h * rate)], ["Overtime", oh, money(rate * mult), money(oh * rate * mult)], ["Total", h + oh, "", money(a)]], `Normal pay ${h} times ${money(rate)} is ${money(h * rate)}. Overtime ${oh} times ${money(rate * mult)} is ${money(oh * rate * mult)}. Total ${money(a)}.`) }; }
  return null;
};

const circleArea: Builder = (q) => {
  const p = plain(q.prompt), m = p.match(/(radius|diameter) of (\d+(?:\.\d+)?) cm/);
  if (!m) return null;
  return { figure: { type: "circle-diagram", mode: m[1] as "radius" | "diameter", label: `${m[2]} cm`, alt: `A circle with a ${m[1]} of ${m[2]} centimetres marked.` } };
};

const sup = (n: number) => String(n).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
const indexLaws: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  if (a === null) return null;
  const run = (b: number, n: number) => (n > 5 ? `${b} × ${b} × … × ${b} (${n} of them)` : Array.from({ length: n }, () => b).join(" × "));
  let m = p.match(/(\d+)\^\{(\d+)\} \\times \1\^\{(\d+)\}/);
  if (m) { const b = Number(m[1]), x = Number(m[2]), y = Number(m[3]); return true ? { figure: table(["", "Written out"], [[`${b}${sup(x)} × ${b}${sup(y)}`, `(${run(b, x)}) × (${run(b, y)})`], ["Count the " + b + "s", `${x} + ${y} = ${x + y}`], ["As a power", `${b}${sup(x + y)}`]], `${b} to the power ${x} times ${b} to the power ${y}: ${x} lots of ${b} and ${y} lots of ${b} make ${x + y} lots, so ${b} to the ${x + y}.`) } : null; }
  m = p.match(/(\d+)\^\{(\d+)\} \\div \1\^\{(\d+)\}/);
  if (m) { const b = Number(m[1]), x = Number(m[2]), y = Number(m[3]); return true ? { figure: table(["", "Written out"], [[`${b}${sup(x)} ÷ ${b}${sup(y)}`, `(${run(b, x)}) ÷ (${run(b, y)})`], ["Cancel " + y + " of them", `${x} − ${y} = ${x - y} left`], ["As a power", `${b}${sup(x - y)}`]], `${b} to the ${x} divided by ${b} to the ${y}: cancel ${y} lots of ${b}, leaving ${x - y}, so ${b} to the ${x - y}.`) } : null; }
  m = p.match(/\((\d+)\^\{(\d+)\}\)\^\{(\d+)\}/);
  if (m) { const b = Number(m[1]), x = Number(m[2]), y = Number(m[3]); return true ? { figure: table(["", "Written out"], [[`(${b}${sup(x)})${sup(y)}`, Array.from({ length: y }, () => `${b}${sup(x)}`).join(" × ")], ["Add the powers", `${Array.from({ length: y }, () => x).join(" + ")} = ${x * y}`], ["As a power", `${b}${sup(x * y)}`]], `${b} to the ${x}, taken ${y} times over, is ${x} lots of ${b} ${y} times: ${x * y} lots, so ${b} to the ${x * y}.`) } : null; }
  return null;
};

const expandSingle: Builder = (q) => {
  const m = clean(q.prompt).match(/Expand (-?\d*)(x?)\\left\((-?\d*)(x?) ([+-]) (\d+)\\right\)/) ?? clean(q.prompt).match(/Expand (-?\d*)(x?)\((-?\d*)(x?) ([+-]) (\d+)\)/);
  if (!m) return null;
  const n = (s: string) => (s === "" ? 1 : s === "-" ? -1 : Number(s)), a = n(m[1]), ax = m[2], b = n(m[3]), bx = m[4], c = (m[5] === "-" ? -1 : 1) * Number(m[6]);
  const term = (k: number, pow: number) => `${k < 0 ? "−" : ""}${pow === 0 || Math.abs(k) !== 1 ? Math.abs(k) : ""}${pow === 0 ? "" : pow === 1 ? "x" : "x²"}`;
  const px = (ax ? 1 : 0) + (bx ? 1 : 0);
  return { figure: table(["×", term(b, bx ? 1 : 0), `${c < 0 ? "−" : "+"}${Math.abs(c)}`], [[term(a, ax ? 1 : 0), term(a * b, px), term(a * c, ax ? 1 : 0)]], `A grid. Across the top: ${term(b, bx ? 1 : 0)} and ${c}. Down the side: ${term(a, ax ? 1 : 0)}. The two boxes are ${term(a * b, px)} and ${term(a * c, ax ? 1 : 0)}; together they are the answer.`) };
};

export const ALGEBRA_BUILDERS: Record<string, Builder> = {
  "solve-linear": stepsTable, "collect-terms": stepsTable, "expand-single": (q) => expandSingle(q) ?? stepsTable(q), "factorise-common": stepsTable, substitute, "substitute-negatives": substitute,
  inequalities: inequality, "nth-term": nthTerm, "simple-interest": simpleInterest, "compound-interest": compoundInterest, "growth-decay": growthDecay, "tree-probability": tree,
  "speed-distance-time": speedDistanceTime, "profit-loss": profitLoss, "vat-wages": vatWages, "circle-area": circleArea, "index-laws": indexLaws,
};
