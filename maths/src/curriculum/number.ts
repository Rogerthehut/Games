import type { Question, Skill } from "../engine/types";
import { gcd, int, lcm, pick } from "../engine/rng";
import { dedupeWrong, frac } from "./helpers";

function fracAdd(r: () => number, level: number): Question {
  let d1: number, d2: number;
  if (level === 1) d1 = d2 = int(r, 3, 9);
  else if (level === 2) { d1 = int(r, 2, 6); d2 = d1 * int(r, 2, 3); }
  else do { d1 = int(r, 3, 9); d2 = int(r, 3, 9); } while (d1 === d2 || d1 % d2 === 0 || d2 % d1 === 0);
  const a = int(r, 1, d1 - 1), b = int(r, 1, d2 - 1);
  const L = lcm(d1, d2);
  const n = a * (L / d1) + b * (L / d2);
  const g = gcd(n, L);
  const num = n / g, den = L / g;
  const naive = (a + b) / (d1 + d2);
  const steps: string[] = [];
  if (d1 !== d2)
    steps.push(`The lowest common denominator is $${L}$. Rewrite both: $\\frac{${a}}{${d1}}=\\frac{${a * (L / d1)}}{${L}}$ and $\\frac{${b}}{${d2}}=\\frac{${b * (L / d2)}}{${L}}$.`);
  steps.push(`Add the numerators and keep the denominator: $\\frac{${a * (L / d1)}}{${L}}+\\frac{${b * (L / d2)}}{${L}}=\\frac{${n}}{${L}}$.`);
  if (g > 1) steps.push(`Simplify by dividing top and bottom by $${g}$: $\\frac{${n}}{${L}}=${frac(num, den)}$.`);
  return {
    skill: "frac-add", level,
    prompt: `Work out $\\frac{${a}}{${d1}} + \\frac{${b}}{${d2}}$. Give your answer as a fraction in its simplest form.`,
    answer: { kind: "number", value: n / L, simplestFraction: true },
    hint: d1 === d2
      ? "The denominators already match. Add the numerators and keep the denominator the same."
      : `Make the denominators the same first. What is the smallest number that both ${d1} and ${d2} go into?`,
    solution: steps,
    shown: `$${frac(num, den)}$`,
    wrong: dedupeWrong([{ tag: "add-denominators", number: naive, message: "It looks like the denominators were added too. The denominator tells you the size of the pieces, so it only changes when you rewrite with a common denominator." }], n / L),
  };
}

function percentOf(r: () => number, level: number): Question {
  if (level < 3) {
    const p = level === 1 ? pick(r, [10, 20, 25, 50, 75]) : 5 * int(r, 1, 19);
    const N = pick(r, level === 1 ? [40, 80, 120, 160, 200, 240] : [20, 40, 60, 80, 120, 140, 160, 180, 200, 240]);
    const ans = (p * N) / 100;
    return {
      skill: "pct-amount", level,
      prompt: `Work out $${p}\\%$ of $${N}$.`,
      answer: { kind: "number", value: ans },
      hint: "Find 10% by dividing by 10, then build up to the percentage you need. 5% is half of 10%.",
      solution: [`$1\\%$ of $${N}$ is $${N / 100}$.`, `So $${p}\\%$ is $${p} \\times ${N / 100} = ${ans}$.`],
      shown: `$${ans}$`,
    };
  }
  const p = 5 * int(r, 1, 12), N = pick(r, [20, 40, 60, 80, 120, 160, 200, 240]);
  const up = r() < 0.5;
  const change = (p * N) / 100;
  const ans = up ? N + change : N - change;
  return {
    skill: "pct-amount", level,
    prompt: `A jacket costs £${N}. The price ${up ? "goes up" : "is reduced"} by $${p}\\%$. What is the new price in pounds?`,
    answer: { kind: "number", value: ans, label: "£" },
    hint: `First find $${p}\\%$ of £${N}. Then ${up ? "add it to" : "take it away from"} the original price.`,
    solution: [`$${p}\\%$ of $${N}$ is $${change}$.`, `${up ? "Add" : "Subtract"}: $${N} ${up ? "+" : "-"} ${change} = ${ans}$.`],
    shown: `£$${ans}$`,
    wrong: dedupeWrong([{ tag: "change-only", number: change, message: `That's the ${up ? "increase" : "reduction"} itself. The question asks for the new price, so ${up ? "add it to" : "subtract it from"} the original.` }], ans),
  };
}

function ratioShare(r: () => number, level: number): Question {
  const k = pick(r, [2, 3, 4, 5, 6, 8, 10]);
  let parts: number[], ask: number, askName: string;
  if (level === 1) { const a = int(r, 1, 4); parts = [a, a + int(r, 1, 3)]; ask = 1; askName = "larger"; }
  else if (level === 2) { const b = int(r, 2, 6); parts = [b - int(r, 1, b - 1), b]; ask = 0; askName = "smaller"; }
  else { parts = [int(r, 1, 5), int(r, 1, 6), int(r, 1, 5)]; ask = 1; askName = "middle"; }
  const total = parts.reduce((s, x) => s + x, 0);
  const N = k * total;
  const share = k * parts[ask];
  const ratioText = parts.join(":");
  return {
    skill: "ratio-share", level,
    prompt: `${level < 3 ? "Two friends" : "Three friends"} share £${N} in the ratio $${ratioText}$. How much does the ${askName} share get, in pounds?`,
    answer: { kind: "number", value: share, label: "£" },
    hint: `Add up the parts to find how many equal parts there are. Then find the value of one part.`,
    solution: [
      `Total parts: $${parts.join(" + ")} = ${total}$.`,
      `One part is $${N} \\div ${total} = ${k}$.`,
      `The ${askName} share has $${parts[ask]}$ part${parts[ask] > 1 ? "s" : ""}: $${parts[ask]} \\times ${k} = ${share}$.`,
    ],
    shown: `£$${share}$`,
    wrong: dedupeWrong([{ tag: "one-part", number: k, message: "That's the value of one part. The share you want is made of more than one part, so multiply." }], share),
  };
}

export const numberSkills: Skill[] = [
  { id: "frac-add", name: "Adding fractions", stage: "KS3", year: 7, strand: "Number", blurb: "Add fractions with different denominators.", prereqs: [],
    parentNote: "Think of fractions as pieces of a pizza. You can only add pieces that are the same size, so rewrite both fractions with the same denominator first.",
    talkAbout: "Why can't we just add the bottom numbers together?", generate: fracAdd },
  { id: "pct-amount", name: "Percentages of amounts", stage: "KS3", year: 7, strand: "Number", blurb: "Find percentages, then increase and decrease amounts.", prereqs: [],
    parentNote: "Build percentages from 10% and 1%. 10% is a tenth, so divide by 10. 5% is half of that. Increases and decreases mean finding the change, then adding or subtracting it.",
    talkAbout: "A shop takes 20% off £60. How would you work out the sale price without a calculator?", generate: percentOf },
  { id: "ratio-share", name: "Sharing in a ratio", stage: "KS3", year: 8, strand: "Ratio", blurb: "Split an amount in a given ratio.", prereqs: [],
    parentNote: "Add the parts of the ratio to get the total number of equal pieces. Divide the amount by that to find one piece, then multiply for each share.",
    talkAbout: "If two people share in the ratio 3:2, what fraction of the money does each get?", generate: ratioShare },
];
