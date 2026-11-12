import { describe, expect, it } from "vitest";
import { SKILLS } from "../curriculum";
import { asFraction, formatHelp, parseNumberAnswer } from "./answer";
import { check } from "./check";
import { mulberry32, gcd } from "./rng";
import type { Question } from "./types";

describe("reading a number the way a child writes it", () => {
  const n = (s: string, money = false) => parseNumberAnswer(s, { money }).value;
  it("accepts assignments, units, currency, separators and mixed numbers", () => {
    expect(n("x = 9")).toBe(9);
    expect(n("smaller x = -6")).toBe(-6);
    expect(n("θ = 36.9")).toBe(36.9);
    expect(n("9 cm")).toBe(9);
    expect(n("12cm²")).toBe(12);
    expect(n("45°")).toBe(45);
    expect(n("£5.50")).toBe(5.5);
    expect(n("50p", true)).toBe(0.5);
    expect(n("1,000")).toBe(1000);
    expect(n("1 000")).toBe(1000);
    expect(n("1 1/2")).toBe(1.5);
    expect(n("-2 1/4")).toBe(-2.25);
    expect(n("3/4")).toBe(0.75);
    expect(n("9.")).toBe(9);
    expect(n("The answer is 12")).toBe(12);
    expect(n("−7")).toBe(-7);
  });
  it("still refuses things that are not numbers", () => {
    for (const bad of ["abc", "5 apples", "x", "1/0", "--"]) expect(n(bad), bad).toBeNull();
  });
  it("turns values into simple fractions", () => {
    expect(asFraction(0.75)).toEqual([3, 4]);
    expect(asFraction(4 / 3)).toEqual([4, 3]);
    expect(asFraction(2)).toEqual([2, 1]);
  });
});

/** Ways a child might reasonably write the right answer. Every one should be accepted. */
function variants(q: Question): string[] {
  const a = q.answer;
  const out: string[] = [];
  if (a.kind === "number") {
    const v = a.value;
    const s = String(v);
    const fr = a.form === "fraction" || a.simplestFraction;
    const ff = fr ? asFraction(v) : null;
    const s0 = ff && ff[1] !== 1 ? `${ff[0]}/${ff[1]}` : s;
    out.push(s0, ` ${s0} `);
    if (a.unit) out.push(`${s}${a.unit}`, `${s} ${a.unit}`);
    if (a.label && /=\s*$/.test(a.label)) out.push(`${a.label.trim()} ${s}`);
    if (a.money) { out.push(`£${s}`, v.toFixed(2), `£${v.toFixed(2)}`); if (v < 1) out.push(`${Math.round(v * 100)}p`); }
    if (Number.isInteger(v) && v >= 1000) out.push(v.toLocaleString("en-GB"));
    if (Number.isInteger(v) && a.dp === undefined && !fr) out.push(`${s}.0`, `${s}.`);
    const f = asFraction(v);
    if (f && a.simplestFraction) {
      out.push(f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`);
      if (f[1] !== 1 && Math.abs(v) > 1) out.push(`${Math.trunc(v)} ${Math.abs(f[0]) - Math.trunc(v) * f[1]}/${f[1]}`);
    } else if (f && f[1] !== 1 && !a.dp && a.exact === undefined && a.form !== "fraction" && a.form !== "decimal") out.push(`${f[0]}/${f[1]}`);
  } else if (a.kind === "multi") {
    if (a.fields.length === 2 && /remainder/i.test(a.fields[1].label)) out.push(`${a.fields[0].value} r ${a.fields[1].value}`);
  }
  return out;
}

describe("every sensible way of writing the right answer is accepted, across all skills", () => {
  const rejected: string[] = [];
  const wrongAccepted: string[] = [];
  let tried = 0;
  for (const skill of SKILLS) {
    for (const level of [1, 2, 3]) {
      for (let seed = 1; seed <= 25; seed++) {
        const q = skill.generate(mulberry32(seed * 977 + level), level);
        const a = q.answer;
        const inputs = (text: string) => (a.kind === "multi" ? [text, ...a.fields.slice(1).map(() => "")] : [text]);
        for (const v of variants(q)) {
          tried++;
          const res = check(q, inputs(v));
          if (res.outcome !== "correct") rejected.push(`${skill.id} L${level}: "${v}" → ${res.outcome} (${res.feedback ?? ""}) [${q.prompt.slice(0, 60)}]`);
        }
        if (a.kind === "number") {
          for (const bad of [String(a.value + (a.tol ?? 0) + 1), String(a.value * 10 + 3)]) {
            if (a.tol && Math.abs(a.value * 10 + 3 - a.value) < a.tol) continue;
            if (check(q, [bad]).outcome === "correct") wrongAccepted.push(`${skill.id} L${level}: "${bad}" accepted for ${a.value}`);
          }
        }
      }
    }
  }
  it("accepts all of them", () => {
    console.log(`alternative forms tried: ${tried}, rejected: ${rejected.length}`);
    if (rejected.length) console.log("sample:\n" + rejected.slice(0, 10).join("\n"));
    expect(rejected).toEqual([]);
  });
  it("still rejects wrong answers", () => expect(wrongAccepted).toEqual([]));
});

describe("right value, wrong form: a specific nudge instead of 'wrong'", () => {
  const fractionQ = (() => { for (let s = 1; s < 200; s++) { const q = SKILLS.find((k) => k.id === "frac-add")!.generate(mulberry32(s), 2); if (q.answer.kind === "number" && q.answer.simplestFraction && !Number.isInteger(q.answer.value)) return q; } throw new Error("no fraction question"); })();
  const f = asFraction((fractionQ.answer as { value: number }).value)!;
  it("asks for simplifying when the fraction isn't in its simplest form", () => {
    const r = check(fractionQ, [`${f[0] * 2}/${f[1] * 2}`]);
    expect(r.outcome).toBe("almost");
    expect(r.feedback).toMatch(/simplify/i);
  });
  it("asks for a fraction when a decimal was typed", () => {
    const r = check(fractionQ, [String((fractionQ.answer as { value: number }).value)]);
    expect(r.outcome).toBe("almost");
    expect(r.feedback).toMatch(/fraction/i);
  });
  it("tells you when the unit is for something else", () => {
    const q = SKILLS.find((k) => k.id === "measures-convert")!.generate(mulberry32(3), 1);
    const a = q.answer as { value: number; unit?: string };
    expect(a.unit).toBeTruthy();
    const other = a.unit === "m" ? "kg" : "m";
    expect(check(q, [`${a.value} ${other}`]).outcome).toBe("almost");
  });
  it("asks for rounding when the value is right but not rounded", () => {
    for (let s = 1; s < 300; s++) {
      const q = SKILLS.find((k) => k.id === "pythagoras")!.generate(mulberry32(s), 3);
      const a = q.answer as { value: number; exact?: number; dp?: number };
      if (a.exact === undefined || a.dp === undefined) continue;
      const r = check(q, [a.exact.toFixed(3)]);
      expect(r.outcome).toBe("almost");
      expect(r.feedback).toMatch(/decimal place/i);
      return;
    }
    throw new Error("no rounding question found");
  });
});

describe("how-to-write hints", () => {
  const hintFor = (skillId: string, level: number) => formatHelp(SKILLS.find((k) => k.id === skillId)!.generate(mulberry32(5), level).answer);
  it("tells children the form for each kind of answer", () => {
    expect(hintFor("frac-add", 1).line).toMatch(/fraction.*simplest/i);
    expect(hintFor("ratio-share", 1).line).toMatch(/pounds/i);
    expect(hintFor("pythagoras", 3).line).toMatch(/decimal place/i);
    expect(hintFor("division", 2).line).toMatch(/both boxes/i);
    expect(hintFor("factorise-quad", 1).line).toMatch(/brackets/i);
    expect(hintFor("times-tables", 1).line).toMatch(/whole number/i);
  });
  it("does not use the solution as a format example", () => {
    expect(formatHelp({ kind: "number", value: 907.54, dp: 2 }))
      .toEqual(formatHelp({ kind: "number", value: 1.29, dp: 2 }));
    const division = (quotient: number, remainder: number) => formatHelp({
      kind: "multi", fields: [{ label: "quotient =", value: quotient }, { label: "remainder =", value: remainder }],
    });
    expect(division(36, 5)).toEqual(division(24, 1));
  });
  it("gcd sanity", () => expect(gcd(12, 18)).toBe(6));
});
