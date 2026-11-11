import { asFraction } from "./answer";
import { describe, expect, it } from "vitest";
import { SKILLS, STEM_SKILLS, SKILL_BY_ID } from "../curriculum";
import { withBarChartHelp } from "../curriculum/expansion";
import { check } from "./check";
import { mulberry32 } from "./rng";
import { numberOf, parse, polyOf, previewLatex } from "./expr";
import type { Question } from "./types";

/** Turn a poly into text a student could type. */
function plain(p: number[]): string {
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

function correctInputs(q: Question): string[] {
  const a = q.answer;
  if (a.kind === "number") {
    const f = a.form === "fraction" ? asFraction(a.value) : null;
    return [f && f[1] !== 1 ? `${f[0]}/${f[1]}` : String(a.value)];
  }
  if (a.kind === "multi") return a.fields.map((f) => String(f.value));
  if (a.kind === "choice") return [String(a.correct)];
  return [a.form === "factorised" ? fromShown(q.shown) : plain(a.value)];
}

describe("tenths and hundredths", () => {
  it("explains when an equivalent fraction needs to be written as a decimal", () => {
    const question = SKILLS.find((entry) => entry.id === "hundredths")!.generate(() => 0, 1);
    expect(check(question, ["1/10"]).outcome).toBe("almost");
    expect(check(question, ["0.1"]).outcome).toBe("correct");
  });
});

describe("worked bar charts", () => {
  it("reads both vote counts, including when a saved question had older help", () => {
    const numbers = [0, 0.5, 0];
    const q = SKILL_BY_ID["read-bar-charts"].generate(() => numbers.shift() ?? 0, 1);
    expect(q.hint).toContain("numbers on the left");
    expect(q.solution.join(" ")).not.toContain("interval");
    expect(q.solution.at(-1)).toContain("12 − 4 = 8");
    expect(check(q, ["8"]).outcome).toBe("correct");
    expect(withBarChartHelp({ ...q, hint: "Old hint", solution: ["Old step"] })).toEqual(q);
  });
});

describe("worked percentages", () => {
  it("teaches 50% of 40 by halving", () => {
    const skill = SKILLS.find((entry) => entry.id === "pct-amount")!;
    const rolls = [0.65, 0];
    const example = skill.generate(() => rolls.shift() ?? 0, 1);
    expect(example.prompt).toBe("Work out $50\\%$ of $40$.");
    expect(example.solution).toEqual([
      "$50\\%$ means half. Split $40$ into 2 equal groups.",
      "One group has $40 \\div 2 = 20$.",
    ]);
    expect(check(example, ["20"]).outcome).toBe("correct");
  });
});

describe("expression parsing", () => {
  it("reads numbers and fractions", () => {
    expect(numberOf("3/4")).toBe(0.75);
    expect(numberOf("-0.5")).toBe(-0.5);
    expect(numberOf("−2")).toBe(-2);
    expect(numberOf("x")).toBeNull();
  });
  it("reads polynomials with implicit multiplication", () => {
    expect(polyOf("2x^2 + 3x - 5")).toEqual([-5, 3, 2]);
    expect(polyOf("(x+2)(x+3)")).toEqual([6, 5, 1]);
    expect(polyOf("3(x-1)")).toEqual([-3, 3]);
    expect(polyOf("x(x+4)")).toEqual([0, 4, 1]);
    expect(polyOf("1/2x")).toEqual([0, 0.5]);
  });
  it("rejects nonsense", () => {
    expect(polyOf("2y")).toBeNull();
    expect(polyOf("1/x")).toBeNull();
    expect(polyOf("(x+")).toBeNull();
  });
  it("previews", () => {
    expect(previewLatex("3/4")).toContain("frac");
    expect(previewLatex("x^2+1")).toContain("^{2}");
    expect(previewLatex("(")).toBeNull();
  });
  it("parse handles precedence", () => {
    expect(parse("2+3*4")).toBeTruthy();
    expect(numberOf("2+3*4")).toBe(14);
    expect(numberOf("2^3")).toBe(8);
  });
});

describe("checking", () => {
  const fq = SKILLS.find((s) => s.id === "factorise-quad")!.generate(mulberry32(3), 1);
  it("asks for factorising rather than accepting the expanded form", () => {
    const a = fq.answer as { value: number[] };
    expect(check(fq, [plain(a.value)]).outcome).toBe("almost");
  });
  it("asks for simplified fractions", () => {
    const q = SKILLS.find((s) => s.id === "frac-add")!.generate(mulberry32(5), 1);
    expect(q.answer.kind).toBe("number");
  });
  it("blank is invalid, not wrong", () => {
    expect(check(fq, [""]).outcome).toBe("invalid");
  });
});

describe.each([...SKILLS, ...STEM_SKILLS])("skill $id", (skill) => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: 150 questions are well formed and self-consistent`, () => {
      for (let seed = 1; seed <= 150; seed++) {
        const q = skill.generate(mulberry32(seed * 7919 + level), level);
        const ctx = `${skill.id} L${level} seed ${seed}: ${q.prompt}`;
        expect(q.skill, ctx).toBe(skill.id);
        // balanced maths delimiters
        for (const t of [q.prompt, q.shown, q.hint, ...q.solution]) {
          expect((t.match(/\$/g) ?? []).length % 2, `${ctx} | ${t}`).toBe(0);
          expect(t, ctx).not.toMatch(/NaN|undefined|Infinity/);
        }
        expect(q.solution.length, ctx).toBeGreaterThan(0);
        // wording: you add TO and subtract FROM
        for (const t of q.solution) expect(t, `${ctx} wording`).not.toMatch(/Add [^.]*from|Subtract [^.]*to both/);
        // primary-school answers are sensible quantities (counts, money, lengths), never negative, apart from the topics about counting below zero
        if (skill.year <= 6 && !["negative-numbers", "count-through-zero"].includes(skill.id) && q.answer.kind === "number") expect(q.answer.value, `${ctx} negative answer`).toBeGreaterThanOrEqual(0);
        // grammar: ordinals (22nd, not 22th)
        expect(q.prompt, `${ctx} ordinal`).not.toMatch(/(?<!1)[123]th\b/);
        // its own answer is accepted
        const inputs = correctInputs(q);
        expect(check(q, inputs).outcome, `${ctx} | input ${inputs}`).toBe("correct");
        // a deliberately wrong answer is not
        if (q.answer.kind === "number") expect(check(q, [String(q.answer.value + 1)]).outcome, ctx).not.toBe("correct");
        // known mistakes are recognised and never equal the right answer
        for (const w of q.wrong ?? []) {
          const input =
            w.number !== undefined ? [String(w.number)] : w.poly ? [plain(w.poly)] : (w.multi ?? []).map(String);
          const res = check(q, input);
          expect(res.outcome, `${ctx} | misconception ${w.tag}`).not.toBe("correct");
          expect(res.tag, `${ctx} | ${w.tag} -> ${JSON.stringify(input)}`).toBe(w.tag);
        }
      }
    });
  }
});
