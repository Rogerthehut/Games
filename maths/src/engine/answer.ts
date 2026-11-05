import { gcd } from "./rng";
import { numberOf } from "./expr";
import type { Answer } from "./types";

type NumberAnswer = Extract<Answer, { kind: "number" }>;

const UNIT_RE = /\s*(cm²|cm2|cm\^2|cm³|cm3|cm\^3|m²|m2|m\^2|km|cm|mm|kg|ml|litres?|metres?|degrees?|grams?|pounds?|pence|°|%|m|g|l|p)\s*$/;
const UNIT_CANON: Record<string, string> = {
  "cm2": "cm²", "cm^2": "cm²", "cm3": "cm³", "cm^3": "cm³", "m2": "m²", "m^2": "m²",
  litre: "l", litres: "l", metre: "m", metres: "m", degree: "°", degrees: "°", gram: "g", grams: "g", pound: "£", pounds: "£", pence: "p",
};

export interface ParsedNumber {
  value: number | null;
  unit?: string;
  typedFraction: boolean;
  mixed: boolean;
  decimals: number;
}

/**
 * Reads a number the way a person writes one: "x = 9", "9 cm", "£5.50", "50p", "1,000", "1 1/2", "9.".
 * Anything that is plainly the same number is accepted; the caller decides whether the form was what was asked for.
 */
export function parseNumberAnswer(raw: string, a: Pick<NumberAnswer, "money">): ParsedNumber {
  let s = raw.normalize("NFKC").toLowerCase().trim().replace(/[−–—]/g, "-");
  s = s.replace(/^\s*(?:the\s+)?(?:answer\s*(?:is)?|ans)\s*[:=]?\s*/, "");
  s = s.replace(/^\s*(?:[a-zθ]+\s*){1,3}(?:\([a-z]\))?\s*[=:]\s*/, ""); // x =, smaller x =, θ =
  const pound = s.includes("£");
  s = s.replace(/£/g, "").replace(/,/g, "").replace(/\.$/, "").trim();
  if (!s.includes("/")) s = s.replace(/(\d)\s+(?=\d{3}(?:\D|$))/g, "$1"); // 1 000 -> 1000, but leave 1 1/2 alone

  let unit: string | undefined;
  const m = s.match(UNIT_RE);
  if (m && m.index !== undefined && /\d/.test(s.slice(0, m.index))) {
    const u = m[1];
    unit = UNIT_CANON[u] ?? u;
    s = s.slice(0, m.index).trim();
  }
  if (pound) unit = unit ?? "£";

  const mixed = s.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  let value: number | null;
  if (mixed) value = +mixed[4] === 0 ? null : (mixed[1] ? -1 : 1) * (+mixed[2] + +mixed[3] / +mixed[4]);
  else value = numberOf(s);
  if (value !== null && (unit === "p" || unit === "pence") && a.money) value = value / 100;
  return { value, unit, typedFraction: /\d\s*\/\s*\d/.test(s), mixed: !!mixed, decimals: (s.match(/\.(\d+)/)?.[1] ?? "").length };
}

/** n/d in lowest terms for a value, if one with a small denominator exists. */
export function asFraction(value: number, maxDen = 400): [number, number] | null {
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(value * d);
    if (Math.abs(n / d - value) < 1e-9) { const g = gcd(Math.abs(n), d) || 1; return [n / g, d / g]; }
  }
  return null;
}

export interface FormatHelp {
  /** One plain line shown under the answer box. */
  line: string;
  /** Other ways of writing the right answer that will also be accepted. */
  also: string[];
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** How to write this answer, in words a child can follow. */
export function formatHelp(a: Answer): FormatHelp {
  if (a.kind === "number") {
    const frac = asFraction(a.value);
    if (a.simplestFraction || a.form === "fraction") {
      const [n, d] = frac ?? [1, 2];
      const improper = Math.abs(a.value) > 1 && d !== 1;
      return {
        line: "Write it as a fraction in its simplest form, like 3/4.",
        also: [d === 1 ? String(n) : `${n}/${d}`, ...(improper ? [`${Math.trunc(a.value)} ${Math.abs(n) - Math.trunc(a.value) * d}/${d}`] : [])].filter((x, i, arr) => arr.indexOf(x) === i),
      };
    }
    if (a.money) {
      const v = a.value;
      return { line: "Write the amount in pounds, like 12.50. Whole pounds can be just 12.", also: [String(v), v.toFixed(2), `£${v.toFixed(2)}`, ...(v < 1 ? [`${Math.round(v * 100)}p`] : [])].filter((x, i, arr) => arr.indexOf(x) === i) };
    }
    if (a.dp !== undefined) {
      const ex = (a.exact ?? a.value).toFixed(a.dp);
      return { line: `Round it to ${plural(a.dp, "decimal place")}, like ${ex}.`, also: [ex, `${ex}${a.unit ? ` ${a.unit}` : ""}`] };
    }
    const unitNote = a.unit ? ` The unit (${a.unit}) is added for you, so just type the number.` : "";
    const base = Number.isInteger(a.value) ? "Type a whole number." : "Type a decimal like 2.5, or a fraction like 5/2.";
    const neg = a.value < 0 ? " Use − for minus." : "";
    const also = [String(a.value)];
    if (Number.isInteger(a.value)) also.push(a.value >= 1000 ? a.value.toLocaleString("en-GB") : `${a.value}.0`);
    if (a.unit) also.push(`${a.value} ${a.unit}`);
    if (a.label && /=\s*$/.test(a.label)) also.push(`${a.label.trim()} ${a.value}`);
    return { line: `${base}${neg}${unitNote}`, also };
  }
  if (a.kind === "multi") {
    const rem = a.fields.some((f) => /remainder/i.test(f.label));
    return { line: rem ? "Fill both boxes: the whole-number answer, then what's left over." : "Fill in each box.", also: rem ? [`${a.fields[0].value} r ${a.fields[1].value}  (in the first box)`] : [] };
  }
  return a.form === "factorised"
    ? { line: "Write it as brackets multiplied together, like (x + 2)(x + 3).", also: [] }
    : { line: "Multiply out and simplify. Write powers with ^, like x^2.", also: ["Any order of terms is fine: 3 + 2x or 2x + 3"] };
}

/** A kind, specific nudge when the right value was written in the wrong form. */
export const formNudge = {
  fraction: "That's the right value. Write it as a fraction, like 3/4.",
  simplify: "That's the right value. Now simplify the fraction as far as you can.",
  unit: (u: string) => `Right number. This answer is in ${u === "£" ? "pounds" : u}.`,
  round: (dp: number) => `Close. Round it to ${plural(dp, "decimal place")}.`,
};
