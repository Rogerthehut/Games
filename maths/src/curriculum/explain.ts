import { int, pick } from "../engine/rng";
import type { Question, Skill } from "../engine/types";

/**
 * "Explain" questions, as the tests ask them (about one in ten reasoning questions). The app can't read writing, so each question has a model answer and a few
 * key points; the child writes, compares, and ticks the points their own answer included (see ExplainInput in ui/answer-input.tsx). They mark it themselves.
 * Every claim in a model answer is worked out from the numbers in the question, never typed in.
 */
const n$ = (n: number) => n.toLocaleString("en-GB");
const isPrime = (n: number) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
const NAMES = ["Maya", "Ben", "Zara", "Leo", "Priya", "Sam", "Amy", "Omar", "Mia", "Kai"];

function explain(skill: string, level: number, prompt: string, model: string, points: string[]): Question {
  return {
    skill, level, prompt, answer: { kind: "explain", model, points },
    hint: "Say what the answer is, then give a reason using the numbers in the question.",
    solution: [`A model answer: ${model}`, "Your answer should include:", ...points.map((p) => `• ${p}`)], shown: model,
  };
}

function kind2(r: () => number, level: number): Question {
  const N = pick(r, NAMES), t = int(r, 0, 6);
  if (t === 0) {          // prime or not
    const pool = [51, 57, 63, 69, 77, 81, 87, 91, 93, 111, 119, 121, 133];
    const primes = [53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
    const n = r() < 0.5 ? pick(r, pool) : pick(r, primes), prime = isPrime(n), f = [3, 7, 11, 13, 9, 17, 19].find((d) => n % d === 0 && d < n) ?? 3;
    return prime
      ? explain("explain-why", level, `Is ${n} a prime number? Explain how you know.`, `Yes. ${n} is not in the 2, 3, 5 or 7 times tables, so it has no factors except 1 and ${n}.`, ["Says that it is a prime number", `Says it has no factor except 1 and ${n}, for example by showing 2, 3, 5 and 7 do not divide it`])
      : explain("explain-why", level, `Is ${n} a prime number? Explain how you know.`, `No. ${n} = ${f} × ${n / f}, so it has factors other than 1 and ${n}.`, ["Says that it is not a prime number", `Gives a factor other than 1 and ${n}, such as ${f}, or writes ${n} = ${f} × ${n / f}`]);
  }
  if (t === 1) {          // comparing fractions
    let a = int(r, 1, 6), b = int(r, a + 1, 9), c = int(r, 1, 6), d = int(r, c + 1, 9);
    while (b === d || a * d === c * b) { a = int(r, 1, 6); b = int(r, a + 1, 9); c = int(r, 1, 6); d = int(r, c + 1, 9); }
    const L = b * d, x = a * d, y = c * b, claimBigger = r() < 0.5, truth = claimBigger ? x > y : x < y, bigger = x > y ? `${a}/${b}` : `${c}/${d}`;
    return explain("explain-why", level, `${N} says that ${a}/${b} is ${claimBigger ? "bigger" : "smaller"} than ${c}/${d}. Is ${N} right? Explain.`,
      `${truth ? "Yes" : "No"}. Using ${L} as the bottom number, ${a}/${b} = ${x}/${L} and ${c}/${d} = ${y}/${L}, so ${bigger} is the bigger one.`,
      [`Says that ${N} is ${truth ? "right" : "wrong"}`, `Changes both to the same denominator (such as ${L}) or to decimals, and compares them`]);
  }
  if (t === 2) {          // decimals with different numbers of places
    const tenths = int(r, 5, 9), hundredths = tenths * 10 - int(r, 2, 9);
    return explain("explain-why", level, `${N} says that 0.${tenths} is smaller than 0.${hundredths} because ${tenths} is smaller than ${hundredths}. Explain ${N}'s mistake.`,
      `0.${tenths} is the same as 0.${tenths}0, and ${tenths}0 hundredths is more than ${hundredths} hundredths. The number of digits does not tell you which is bigger.`,
      [`Says that 0.${tenths} is bigger than 0.${hundredths}`, `Writes 0.${tenths} as 0.${tenths}0, or compares the tenths, so that both have the same number of decimal places`]);
  }
  if (t === 3) {          // rounding a halfway number
    const h = int(r, 12, 88) * 100, n = h + 50;
    return explain("explain-why", level, `Explain why ${n$(n)} rounds to ${n$(h + 100)}, and not ${n$(h)}, to the nearest 100.`,
      `${n$(n)} is exactly halfway between ${n$(h)} and ${n$(h + 100)}, and a number that is halfway rounds up.`, [`Says that ${n$(n)} is halfway between ${n$(h)} and ${n$(h + 100)}`, "Says that halfway numbers round up"]);
  }
  if (t === 4) {          // divisible by 9
    const n = int(r, 200, 9800), digits = String(n).split("").map(Number), s = digits.reduce((x, y) => x + y, 0), yes = s % 9 === 0;
    return explain("explain-why", level, `Is ${n$(n)} a multiple of 9? Explain how you know.`, `${yes ? "Yes" : "No"}. The digits add up to ${digits.join(" + ")} = ${s}, and ${s} ${yes ? "is" : "is not"} in the 9 times table.`,
      [`Says that ${n$(n)} ${yes ? "is" : "is not"} a multiple of 9`, `Adds the digits (${s}) and checks whether the total is a multiple of 9`]);
  }
  if (t === 5) {
    return explain("explain-why", level, `${N} says that a square is not a rectangle. Explain why ${N} is wrong.`, "A rectangle is a shape with four right angles and opposite sides equal. A square has all of these, so it is a special kind of rectangle.",
      ["Says that a square is a rectangle", "Says that a square has four right angles and equal opposite sides, like a rectangle"]);
  }
  const a = pick(r, [3, 5, 7, 9, 11]), b = pick(r, [13, 15, 17, 19]);
  return explain("explain-why", level, `${N} says that when you add two odd numbers the answer is always even. Is ${N} right? Show an example and explain why.`,
    `Yes. For example ${a} + ${b} = ${a + b}, which is even. An odd number is one more than an even number, so two odd numbers make an even number plus 2, which is even.`,
    [`Says that ${N} is right`, `Gives an example, such as ${a} + ${b} = ${a + b}`, "Gives a reason: each odd number is one more than an even number, so the two extra ones make an even number"]);
}

function kind4(r: () => number, level: number): Question {
  const t = int(r, 0, 4);
  if (t === 0) { const k = int(r, 1, 5); return explain("explain-algebra", level, `n is a whole number. Explain why ${2 * k}n + 1 is always odd.`, `${2 * k}n is ${k} lots of 2n, so it is always even. Adding 1 to an even number always gives an odd number.`, [`Says that ${2 * k}n is even (a multiple of 2)`, "Says that one more than an even number is odd"]); }
  if (t === 1) { const k = pick(r, [3, 4, 5, 6]), m = int(r, 2, 5), j = int(r, 1, 4); return explain("explain-algebra", level, `n is a whole number. Explain why ${k * m}n + ${k * j} is always a multiple of ${k}.`, `${k * m}n + ${k * j} = ${k}(${m}n + ${j}). The bracket is a whole number, so the expression is ${k} times a whole number.`, [`Takes out a factor of ${k}, writing it as ${k}(${m}n + ${j})`, `Says that ${m}n + ${j} is a whole number, so the whole expression is a multiple of ${k}`]); }
  if (t === 2) return explain("explain-algebra", level, "Explain why the sum of three consecutive whole numbers is always a multiple of 3.", "Call the numbers n, n + 1 and n + 2. Their sum is 3n + 3 = 3(n + 1), which is 3 times a whole number.", ["Writes the numbers as n, n + 1 and n + 2", "Adds them to get 3n + 3", "Factorises to 3(n + 1) and says this is a multiple of 3"]);
  if (t === 3) { const a = int(r, 2, 6); return explain("explain-algebra", level, `Explain why $(n + ${a})^2 - (n - ${a})^2$ is always a multiple of ${4 * a}.`, `$(n + ${a})^2 = n^2 + ${2 * a}n + ${a * a}$ and $(n - ${a})^2 = n^2 - ${2 * a}n + ${a * a}$. Taking one from the other leaves $${4 * a}n$, which is ${4 * a} times a whole number.`, ["Expands both brackets", `Says that the $n^2$ and $${a * a}$ terms cancel`, `Gets $${4 * a}n$ and says that it is a multiple of ${4 * a}`]); }
  return explain("explain-algebra", level, "n is a whole number. Explain why $n^2 + n$ is always even.", "$n^2 + n = n(n + 1)$. The numbers n and n + 1 are consecutive, so one of them is even, and an even number times anything is even.", ["Factorises to $n(n + 1)$", "Says that n and n + 1 are consecutive, so one of them is even", "Says that the product is therefore even"]);
}

export const explainWhy: Skill = {
  id: "explain-why", name: "Explain your answer", stage: "KS2", year: 6, strand: "Number", prereqs: ["word-problems"], interactive: true,
  blurb: "Say in words how you know, as the reasoning papers ask.",
  explainer: "When a question says 'explain', give your answer first, then say why using the numbers. Marks go for the answer and for the reason. You mark this one yourself against a model answer.",
  parentNote: "The app can't read writing, so the child compares their answer with a model answer and ticks the points they included. Encourage them to be honest: ticking a point they didn't really make doesn't help them. Ask them to tell you the reason out loud, too.",
  talkAbout: "Which point did you leave out, and how would you add it next time?",
  generate: kind2,
};

export const explainAlgebra: Skill = {
  id: "explain-algebra", name: "Explain with algebra", stage: "KS4", year: 11, strand: "Algebra", prereqs: ["algebraic-proof"], interactive: true,
  blurb: "Explain why something is always true, using algebra.",
  explainer: "To explain why something is always true, write it with n for any whole number, expand or factorise, and say what the result tells you: for example, a factor of 3 outside the bracket means a multiple of 3.",
  parentNote: "Marks go for each step of the argument. The skill is saying what each step shows. You mark this by comparing with the model answer and ticking the steps included.",
  talkAbout: "What does having a factor of 3 outside the bracket tell you?",
  generate: kind4,
};

export const explainSkills: Skill[] = [explainWhy, explainAlgebra];
