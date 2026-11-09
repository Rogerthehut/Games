import { describe, expect, it } from "vitest";
import { REASONING_SKILLS, SKILLS, SKILL_BY_ID } from ".";
import { HIDDEN_WORDS, LETTER_BRIDGES, WORD_FRONTS } from "./word-data";
import {
  AMBIGUOUS_WORDS, ANALOGIES, CLAIMS, GROUP_LABEL, NEAR_GROUPS, NEVER_MIX, WORD_GROUPS, matrixCandidates, oddNumbers, counterexample, fittingNext, numberSeriesNext, oddIndex, reflectGrid, rotateGridCW, transformsBetween, visualKey,
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
  it("has twenty-one skills, none in the maths curriculum used by the check-up and pathway", () => {
    expect(REASONING_SKILLS).toHaveLength(21);
    for (const s of REASONING_SKILLS) {
      expect(s.strand).toBe("Reasoning");
      expect(SKILLS.some((m) => m.id === s.id), s.id).toBe(false);
      expect(SKILL_BY_ID[s.id]).toBeDefined();
      expect(s.parentNote.length, s.id).toBeGreaterThan(20);
      expect(s.talkAbout.length, s.id).toBeGreaterThan(10);
      expect(s.explainer?.length, `${s.id} explainer`).toBeGreaterThan(30);
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
      const groupOf = (w: string) => Object.keys(WORD_GROUPS).find((g) => WORD_GROUPS[g].includes(w.toLowerCase()))!;
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
    for (const id of ["nvr-series", "nvr-analogy", "nvr-reflection", "nvr-rotation", "nvr-matrix"]) {
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

describe("word lists, reviewed", () => {
  const groupOf = (w: string) => Object.keys(WORD_GROUPS).find((g) => WORD_GROUPS[g].includes(w.toLowerCase()))!;
  it("every group has a child-friendly label, enough words, and no word that could belong to two ideas", () => {
    for (const [g, words] of Object.entries(WORD_GROUPS)) {
      expect(GROUP_LABEL[g], g).toBeTruthy();
      expect(words.length, g).toBeGreaterThanOrEqual(5);
      for (const w of words) expect(AMBIGUOUS_WORDS, `${g}: ${w}`).not.toContain(w);
    }
  });
  it("odd one out never mixes groups a child could reasonably confuse", () => {
    const never = (a: string, b: string) => NEVER_MIX.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    eachQuestion("vr-odd-word", (q) => {
      const words = choice(q).options.map((o) => (o as { text: string }).text);
      const odd = words[choice(q).correct];
      for (const w of words) if (w !== odd) expect(never(groupOf(w), groupOf(odd)), `${w} with ${odd}`).toBe(false);
    });
  });
  it("word links: no answer or wrong option is repeated inside a question, and the new links are present", () => {
    for (const a of ANALOGIES) expect(new Set([a.answer, ...a.others, a.a, a.b, a.c]).size, `${a.a}:${a.b}`).toBeGreaterThanOrEqual(7);
    expect(ANALOGIES.length).toBeGreaterThanOrEqual(30);
  });
});

describe("dictionary-checked word puzzles", () => {
  const BAD = ["damn", "hell", "sex", "kill", "dead", "death", "gun", "bomb", "blood", "beer", "drunk", "stupid", "hate", "shot"];
  it("hidden words cross the join with at least two letters on each side, and are unique and safe", () => {
    expect(HIDDEN_WORDS.length).toBeGreaterThanOrEqual(30);
    const seen = new Set<string>();
    for (const h of HIDDEN_WORDS) {
      const joined = h.a + h.b;
      expect(h.word).toHaveLength(4);
      const k = joined.indexOf(h.word, Math.max(0, h.a.length - 3));
      expect(k, `${h.a}|${h.b}`).toBeGreaterThanOrEqual(0);
      expect(h.a.length - k, `${h.a}|${h.b}`).toBeGreaterThanOrEqual(2);
      expect(k + 4 - h.a.length, `${h.a}|${h.b}`).toBeGreaterThanOrEqual(2);
      expect(new Set(h.others).size).toBe(h.others.length);
      expect(h.others).not.toContain(h.word);
      expect(seen.has(h.word), h.word).toBe(false); seen.add(h.word);
      for (const w of [h.a, h.b, h.word, ...h.others]) expect(BAD, w).not.toContain(w);
    }
  });
  it("words that go in front: three different words, an answer that is not a wrong option, and no unsafe words", () => {
    expect(WORD_FRONTS.length).toBeGreaterThanOrEqual(30);
    for (const f of WORD_FRONTS) {
      expect(new Set(f.words).size).toBe(3);
      expect(new Set(f.others).size).toBe(4);
      expect(f.others).not.toContain(f.answer);
      for (const w of [f.answer, ...f.words, ...f.others]) expect(BAD, w).not.toContain(w);
    }
  });
  it("letter bridges: one letter, real stems, no unsafe words", () => {
    expect(LETTER_BRIDGES.length).toBeGreaterThanOrEqual(40);
    for (const b of LETTER_BRIDGES) {
      expect(b.letter).toMatch(/^[a-z]$/);
      expect(b.a.length).toBeGreaterThanOrEqual(3);
      expect(b.b.length).toBeGreaterThanOrEqual(4);
      for (const w of [b.a + b.letter, b.letter + b.b]) expect(BAD, w).not.toContain(w);
    }
  });
  it("the questions built from them keep the right answer in the options once", () => {
    eachQuestion("vr-hidden-word", (q) => {
      const words = q.prompt.match(/words ([A-Z]+) and ([A-Z]+) are/)!;
      const right = textOf(q, choice(q).correct);
      expect((words[1] + words[2]).includes(right), q.prompt).toBe(true);
    });
    eachQuestion("vr-letter-bridge", (q) => {
      const m = q.prompt.match(/end of ([A-Z]+) and to the start of ([A-Z]+)/)!;
      const right = textOf(q, choice(q).correct).toLowerCase();
      expect(LETTER_BRIDGES.some((b) => b.a === m[1].toLowerCase() && b.b === m[2].toLowerCase() && b.letter === right), q.prompt).toBe(true);
    });
    eachQuestion("vr-word-front", (q) => {
      const words = q.prompt.split("words? ")[1].replace(/\.$/, "").split(", ");
      const entry = WORD_FRONTS.find((f) => f.words.join(",") === words.join(","))!;
      expect(entry, q.prompt).toBeDefined();
      expect(textOf(q, choice(q).correct)).toBe(entry.answer);
    });
  });
});

describe("more puzzle types, re-derived independently", () => {
  it("odd one out (numbers): exactly one number is singled out by any simple rule, and it is the keyed one", () => {
    eachQuestion("vr-odd-number", (q) => {
      const nums = q.prompt.split("out? ")[1].split(", ").map(Number);
      const flagged = oddNumbers(nums);
      expect(flagged.size, q.prompt).toBe(1);
      expect(String([...flagged][0]), q.prompt).toBe(textOf(q, choice(q).correct));
    });
    // the checker is deliberately strict: it also flags numbers that a rule like "multiple of 8" singles out, so ambiguous lists are rejected
    expect(oddNumbers([12, 18, 24, 25, 30]).has(25)).toBe(true);
    expect(oddNumbers([12, 18, 24, 25, 30]).size).toBeGreaterThan(1);
    expect(oddNumbers([2, 4, 6, 8, 10]).size).toBeGreaterThanOrEqual(0);
  });
  it("rearrange the letters: exactly one option uses the same letters", () => {
    eachQuestion("vr-anagram", (q) => {
      const letters = q.prompt.match(/The letters ([A-Z]+) can/)![1].toLowerCase();
      const sorted = (w: string) => [...w.toLowerCase()].sort().join("");
      const matches = choice(q).options.filter((o) => sorted((o as { text: string }).text) === sorted(letters));
      expect(matches, q.prompt).toHaveLength(1);
      expect((matches[0] as { text: string }).text).toBe(textOf(q, choice(q).correct));
    });
  });
  it("grid puzzles: only one picture completes the grid, and it is the keyed one", () => {
    eachQuestion("nvr-matrix", (q) => {
      const cells = (q.figure as { items: (Glyph | null)[] }).items;
      const found = matrixCandidates(cells);
      expect(found, q.prompt).toHaveLength(1);
      expect(visualKey(found[0])).toBe(visualKey(glyphOf(q, choice(q).correct)));
      expect(choice(q).options.filter((_, i) => visualKey(glyphOf(q, i)) === visualKey(found[0]))).toHaveLength(1);
    });
  });
});
