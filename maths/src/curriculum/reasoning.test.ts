import { describe, expect, it } from "vitest";
import { REASONING_SKILLS, SKILLS, SKILL_BY_ID } from ".";
import {
  ANALOGIES, CLAIMS, NEAR_GROUPS, WORD_GROUPS, counterexample, fittingNext, numberSeriesNext, oddIndex, reflectGrid, rotateGridCW, transformsBetween, visualKey,
} from "./reasoning";
import { check } from "../engine/check";
import { mulberry32 } from "../engine/rng";
import type { Answer, Glyph, Question } from "../engine/types";

type Choice = Extract<Answer, { kind: "choice" }>;
const SEEDS = 120;
const gen = (id: string, level: number, seed: number): Question => SKILL_BY_ID[id].generate(mulberry32(seed * 7919 + level), level);
const choice = (q: Question) => q.answer as Choice;
const optKey = (o: unknown) => (typeof o === "object" && o && "glyph" in o ? `g:${visualKey((o as { glyph: Glyph }).glyph)}` : JSON.stringify(o));
const eachQuestion = (id: string, fn: (q: Question, level: number, seed: number) => void) => {
  for (const level of [1, 2, 3]) for (let seed = 1; seed <= SEEDS; seed++) fn(gen(id, level, seed), level, seed);
};
const glyphOf = (q: Question, i: number) => (choice(q).options[i] as { glyph: Glyph }).glyph;
const textOf = (q: Question, i: number) => (choice(q).options[i] as { text: string }).text;

describe("reasoning skills: set-up", () => {
  it("has fifteen skills, none in the maths curriculum used by the check-up and pathway", () => {
    expect(REASONING_SKILLS).toHaveLength(15);
    for (const s of REASONING_SKILLS) {
      expect(s.strand).toBe("Reasoning");
      expect(SKILLS.some((m) => m.id === s.id), s.id).toBe(false);
      expect(SKILL_BY_ID[s.id]).toBeDefined();
      expect(s.parentNote.length, s.id).toBeGreaterThan(20);
      expect(s.talkAbout.length, s.id).toBeGreaterThan(10);
    }
  });
});

describe("every reasoning question is well formed", () => {
  for (const skill of REASONING_SKILLS) {
    it(`${skill.id}: ${SEEDS * 3} questions are valid, marked correctly and never ambiguous`, () => {
      eachQuestion(skill.id, (q, level, seed) => {
        const ctx = `${skill.id} L${level} seed ${seed}: ${q.prompt}`;
        expect(q.solution.length, ctx).toBeGreaterThan(0);
        expect(q.hint.length, ctx).toBeGreaterThan(5);
        expect(q.prompt, `${ctx} ordinal`).not.toMatch(/(?<!1)[123]th\b/);
        for (const line of q.solution) expect(line, `${ctx} wording`).not.toMatch(/Add [^.]*from|Subtract [^.]*to both/);
        if (q.answer.kind === "choice") {
          const a = q.answer;
          expect(a.options.length, ctx).toBeGreaterThanOrEqual(3);
          expect(a.options.length, ctx).toBeLessThanOrEqual(5);
          // odd one out shows four matching pictures on purpose, so only its odd picture has to be unique
          if (skill.id !== "nvr-odd-one-out") expect(new Set(a.options.map(optKey)).size, `${ctx} distinct options`).toBe(a.options.length);
          expect(a.correct, ctx).toBeGreaterThanOrEqual(0);
          expect(a.correct, ctx).toBeLessThan(a.options.length);
          // its own answer is accepted, in both forms the box allows, and every other option is not
          expect(check(q, [String(a.correct)]).outcome, ctx).toBe("correct");
          expect(check(q, ["ABCDE"[a.correct]]).outcome, ctx).toBe("correct");
          a.options.forEach((_, i) => { if (i !== a.correct) expect(check(q, [String(i)]).outcome, `${ctx} option ${i}`).toBe("wrong"); });
          expect(check(q, ["9"]).outcome, ctx).toBe("invalid");
          expect(q.shown.startsWith("ABCDE"[a.correct]), ctx).toBe(true);
          for (const w of q.wrong ?? []) {
            expect(w.number, ctx).not.toBe(a.correct);
            expect(check(q, [String(w.number)]).tag, `${ctx} ${w.tag}`).toBe(w.tag);
          }
        } else if (q.answer.kind === "number") {
          expect(Number.isInteger(q.answer.value) && q.answer.value > 0, ctx).toBe(true);
          expect(check(q, [String(q.answer.value)]).outcome, ctx).toBe("correct");
          expect(check(q, [String(q.answer.value + 1)]).outcome, ctx).not.toBe("correct");
        }
      });
    });
  }
});

describe("verbal reasoning: answers re-derived independently", () => {
  it("odd one out (words): four from one group, one from another, and groups never share a word", () => {
    const all = Object.values(WORD_GROUPS).flat();
    expect(new Set(all).size).toBe(all.length);
    for (const [a, b] of NEAR_GROUPS) { expect(WORD_GROUPS[a]).toBeDefined(); expect(WORD_GROUPS[b]).toBeDefined(); }
    eachQuestion("vr-odd-word", (q) => {
      const words = choice(q).options.map((o) => (o as { text: string }).text);
      const groupOf = (w: string) => Object.keys(WORD_GROUPS).find((g) => WORD_GROUPS[g].includes(w))!;
      const groups = words.map(groupOf);
      const odd = groups.filter((g) => groups.filter((x) => x === g).length === 1);
      expect(odd).toHaveLength(1);
      expect(words[choice(q).correct]).toBe(words[groups.indexOf(odd[0])]);
    });
  });

  it("word links: the answer is never among the wrong options, and every item is unique", () => {
    expect(new Set(ANALOGIES.map((a) => `${a.a}:${a.b}:${a.c}`)).size).toBe(ANALOGIES.length);
    for (const a of ANALOGIES) {
      expect(a.others).toHaveLength(4);
      expect(new Set(a.others).size).toBe(4);
      expect(a.others).not.toContain(a.answer);
    }
  });

  it("number series: exactly one simple rule fits, and it gives the keyed answer", () => {
    eachQuestion("vr-number-series", (q) => {
      const nums = q.prompt.split("series?")[1].match(/-?\d+/g)!.map(Number);
      const next = numberSeriesNext(nums);
      expect(next, q.prompt).toHaveLength(1);
      expect(String(next[0]), q.prompt).toBe(textOf(q, choice(q).correct));
    });
  });

  it("number-series solver understands the classic rules", () => {
    expect(numberSeriesNext([2, 4, 6, 8])).toEqual([10]);
    expect(numberSeriesNext([1, 2, 4, 8])).toEqual([16]);
    expect(numberSeriesNext([1, 4, 9, 16])).toEqual([25]);
    expect(numberSeriesNext([1, 1, 2, 3, 5])).toEqual([8]);
    expect(numberSeriesNext([1, 2, 4, 7, 11])).toEqual([16]);
  });

  it("letter series: the keyed letter follows from the gaps", () => {
    eachQuestion("vr-letter-series", (q, level) => {
      const letters = q.prompt.split("series? ")[1].replace(", ?", "").split(", ").map((c) => c.charCodeAt(0) - 65);
      const d = letters.slice(1).map((x, i) => x - letters[i]);
      const n = letters.length;
      let next: number;
      if (level === 1) { expect(new Set(d).size, q.prompt).toBe(1); next = letters[n - 1] + d[0]; }
      else if (level === 2) { expect(d.every((x, i) => x === d[i % 2]), q.prompt).toBe(true); next = letters[n - 1] + d[(n - 1) % 2]; }
      else { next = letters[n - 2] + (letters[n - 2] - letters[n - 4]); }
      expect(String.fromCharCode(65 + next), q.prompt).toBe(textOf(q, choice(q).correct));
    });
  });

  it("alphabet codes: re-derive the rule from the example and apply it", () => {
    const shift = (w: string, s: number) => [...w].map((c) => String.fromCharCode(65 + ((c.charCodeAt(0) - 65 + s) % 26 + 26) % 26)).join("");
    eachQuestion("vr-alphabet-codes", (q, level) => {
      const right = textOf(q, choice(q).correct);
      if (level === 1) {
        const m = q.prompt.match(/^In a code, (\w+) is written as (\w+)\. How is (\w+) written/)!;
        const s = (m[2].charCodeAt(0) - m[1].charCodeAt(0) + 26) % 26;
        expect(shift(m[1], s)).toBe(m[2]);
        expect(shift(m[3], s)).toBe(right);
      } else if (level === 2) {
        const word = q.prompt.match(/value of the word (\w+)\?/)![1];
        expect(String([...word].reduce((t, c) => t + c.charCodeAt(0) - 64, 0))).toBe(right);
      } else {
        const m = q.prompt.match(/(\w+) is written (\w+)\. How is (\w+) written/)!;
        const mirror = (w: string) => [...w].map((c) => String.fromCharCode(90 - (c.charCodeAt(0) - 65))).join("");
        expect(mirror(m[1])).toBe(m[2]);
        expect(mirror(m[3])).toBe(right);
      }
    });
  });

  it("ordering: names in the options are exactly the people in the clues", () => {
    eachQuestion("vr-ordering", (q) => {
      const names = choice(q).options.map((o) => (o as { text: string }).text);
      for (const n of names) expect(q.prompt, q.prompt).toContain(n);
    });
  });
});

describe("non-verbal reasoning: answers re-derived independently", () => {
  it("odd one out: exactly one picture differs and it is the keyed one", () => {
    eachQuestion("nvr-odd-one-out", (q) => {
      const items = choice(q).options.map((_, i) => glyphOf(q, i));
      expect(oddIndex(items)).toBe(choice(q).correct);
    });
  });

  it("shape series: every rule that fits the pictures gives the keyed picture, and no other option", () => {
    eachQuestion("nvr-series", (q) => {
      const fig = q.figure as { type: "glyphs"; items: (Glyph | null)[] };
      const shown = fig.items.filter((g): g is Glyph => g !== null);
      const candidates = fittingNext(shown);
      expect(candidates.length, q.prompt).toBeGreaterThan(0);
      const key = visualKey;
      for (const c of candidates) expect(key(c), q.prompt).toBe(key(glyphOf(q, choice(q).correct)));
      const matching = choice(q).options.filter((_, i) => candidates.some((c) => key(c) === key(glyphOf(q, i))));
      expect(matching, q.prompt).toHaveLength(1);
    });
  });

  it("picture links: one change explains the first pair, and applying it to the third gives the keyed picture", () => {
    eachQuestion("nvr-analogy", (q) => {
      const [a, b, c] = (q.figure as { items: (Glyph | null)[] }).items as Glyph[];
      const fits = transformsBetween(a, b);
      expect(fits).toHaveLength(1);
      const want = visualKey(fits[0].apply(c));
      expect(visualKey(glyphOf(q, choice(q).correct))).toBe(want);
      expect(choice(q).options.filter((_, i) => visualKey(glyphOf(q, i)) === want)).toHaveLength(1);
    });
  });

  it("pictures that only differ in an invisible way count as the same picture", () => {
    const circle = (rot: number): Glyph => ({ marks: [{ shape: "circle", size: 2, rot, fill: "solid" }] });
    expect(visualKey(circle(0))).toBe(visualKey(circle(90)));
    const sq = (rot: number): Glyph => ({ marks: [{ shape: "square", size: 2, rot, fill: "none" }] });
    expect(visualKey(sq(0))).toBe(visualKey(sq(90)));
    expect(visualKey(sq(0))).not.toBe(visualKey(sq(45)));
    const ell = (flip: boolean): Glyph => ({ marks: [{ shape: "ell", size: 2, rot: 0, fill: "none", flip }] });
    expect(visualKey(ell(false))).not.toBe(visualKey(ell(true)));
  });

  it("no two options in any picture question look the same", () => {
    for (const id of ["nvr-series", "nvr-analogy", "nvr-reflection", "nvr-rotation"]) {
      eachQuestion(id, (q) => {
        const keys = choice(q).options.map((_, i) => visualKey(glyphOf(q, i)));
        expect(new Set(keys).size, `${id}: ${q.prompt}`).toBe(keys.length);
      });
    }
  });

  it("mirror images and quarter turns match a fresh calculation", () => {
    eachQuestion("nvr-reflection", (q) => {
      const g = ((q.figure as { items: { grid: number[][] }[] }).items[0]).grid;
      expect((glyphOf(q, choice(q).correct) as { grid: number[][] }).grid).toEqual(reflectGrid(g));
    });
    eachQuestion("nvr-rotation", (q) => {
      const g = ((q.figure as { items: { grid: number[][] }[] }).items[0]).grid;
      expect((glyphOf(q, choice(q).correct) as { grid: number[][] }).grid).toEqual(rotateGridCW(g));
    });
    expect(rotateGridCW([[1, 0], [0, 0]])).toEqual([[0, 1], [0, 0]]);
    expect(reflectGrid([[1, 0, 0]])).toEqual([[0, 0, 1]]);
  });
});

describe("problem solving: answers re-derived independently", () => {
  it("always true: the keyed statement has no counter-example and every other option has one", () => {
    eachQuestion("ps-always-true", (q) => {
      const text = (i: number) => textOf(q, i);
      const claim = (s: string) => CLAIMS.find((c) => c.text === s)!;
      choice(q).options.forEach((_, i) => {
        const c = claim(text(i));
        expect(c, text(i)).toBeDefined();
        expect(counterexample(c) === null, `${q.prompt} ${text(i)}`).toBe(i === choice(q).correct);
      });
    });
  });

  it("find the mistake: the keyed line really is the one that is wrong", () => {
    eachQuestion("ps-find-error", (q) => {
      const lines = (q.figure as { lines: string[] }).lines;
      const wrong = lines.map((l, i) => {
        const m = l.replace(/\$/g, "").replace(/\\times/g, "*").replace(/\\div/g, "/").match(/^(\d+) ([+\-*/]) (\d+) = (\d+)$/)!;
        const [, a, op, b, c] = m; const A = +a, B = +b;
        const v = op === "+" ? A + B : op === "-" ? A - B : op === "*" ? A * B : A / B;
        return v === +c ? -1 : i;
      }).filter((i) => i >= 0);
      const answer = textOf(q, choice(q).correct);
      const orderOfOps = /^\w+ works out \d+ \+ \d+ × \d+\./.test(q.prompt) && lines[0].includes("+");
      if (answer === "There is no mistake") expect(wrong, q.prompt).toEqual([]);
      else if (orderOfOps) expect(answer).toBe("Line 1");
      else expect([`Line ${wrong[0] + 1}`], q.prompt).toEqual([answer]);
      if (!orderOfOps) expect(wrong.length, q.prompt).toBeLessThanOrEqual(1);
    });
  });

  it("claims: there are enough true and false statements to make a question", () => {
    const holds = CLAIMS.filter((c) => counterexample(c) === null).length;
    expect(holds).toBeGreaterThanOrEqual(6);
    expect(CLAIMS.length - holds).toBeGreaterThanOrEqual(8);
  });

  it("counting: the answers match a fresh enumeration", () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const q2 = gen("ps-combinations", 2, seed);
      const m = q2.prompt.match(/digits ([\d, ]+)\?/)!;
      const ds = m[1].split(", ").map(Number);
      let count = 0; for (const a of ds) for (const b of ds) if (a !== b) count++;
      expect((q2.answer as { value: number }).value).toBe(count);
      const q3 = gen("ps-combinations", 3, seed);
      const hs = q3.prompt.match(/^(\d+) friends/);
      if (hs) expect((q3.answer as { value: number }).value).toBe(+hs[1] * (+hs[1] - 1) / 2);
      const sum = q3.prompt.match(/add up to (\d+)/);
      if (sum) { let c = 0; for (let n = 10; n <= 99; n++) if (Math.floor(n / 10) + (n % 10) === +sum[1]) c++; expect((q3.answer as { value: number }).value).toBe(c); }
    }
  });

  it("logic puzzles give each question a single answer by construction", () => {
    eachQuestion("ps-deduction", (q) => {
      expect(q.prompt).toMatch(/Who has /);
      expect(choice(q).options.length).toBeGreaterThanOrEqual(3);
    });
  });
});
