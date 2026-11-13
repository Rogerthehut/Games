import { int, pick } from "../engine/rng";
import type { Figure, Question, Skill } from "../engine/types";

/**
 * "Complete the table" questions, as the Key Stage 2 reasoning papers ask them (about one question in ten). A blank cell is written "?1", "?2" and so on in the
 * table; the table figure draws it as a numbered dashed box, and the answer boxes below are labelled "Box 1 =", "Box 2 =". Each question works out its own answer.
 */
type Cell = string | number;
const blank = (n: number) => `?${n}`;
const label = (n: number) => `Box ${n} =`;

function table(head: string[], rows: Cell[][], note: string): Figure {
  const desc = rows.map((r) => r.map((c) => (typeof c === "string" && /^\?\d+$/.test(c) ? `box ${c.slice(1)}` : String(c))).join(", ")).join("; ");
  return { type: "table", head, rows, alt: `${note} The columns are ${head.join(", ")}. The rows are: ${desc}.` };
}

function make(level: number, prompt: string, figure: Figure, values: number[], hint: string, solution: string[]): Question {
  return { skill: "complete-table", level, prompt, figure, answer: { kind: "multi", fields: values.map((value, i) => ({ label: label(i + 1), value })) }, hint, solution, shown: values.map((v, i) => `Box ${i + 1}: ${v}`).join(", ") };
}

export const completeTable: Skill = {
  id: "complete-table", name: "Complete the table", stage: "KS2", year: 4, strand: "Number", prereqs: ["times-tables", "read-tables"],
  blurb: "Find the missing numbers in a table by spotting the rule.",
  explainer: "Look along a row or down a column to find the rule, such as 'add 3 each time' or 'multiply by 4'. Check the rule on a pair you already know before you use it to fill the gaps.",
  parentNote: "Ask them to say the rule out loud before they write anything: 'each pack has 6 pencils, so it goes up by 6'. Then check each missing number against the rule.",
  talkAbout: "How did you find the rule, and how could you check it?",
  generate(r, level): Question {
    if (level === 1) {
      const per = pick(r, [3, 4, 5, 6, 8]), n = [1, 2, 3, 4, 5], gaps = [int(r, 2, 3), 5];
      const row: Cell[] = n.map((k) => (k === gaps[0] ? blank(1) : k === gaps[1] ? blank(2) : per * k));
      return make(1, "Each pack has the same number of pencils. Complete the table.", table(["Packs", ...n.map(String)], [["Pencils", ...row]], "A table of packs and pencils."), gaps.map((k) => per * k),
        `Find how many pencils are in one pack, then count on in that number.`, [`One pack has ${per} pencils, so each pack adds ${per}.`, ...gaps.map((k, i) => `Box ${i + 1}: ${k} packs is ${k} × ${per} = ${per * k}.`)]);
    }
    if (level === 2) {
      const price = pick(r, [20, 30, 40, 50, 60, 75]), n = [1, 2, 3, 4, 6];
      const gaps = [1, 2, 3, 4].sort(() => r() - 0.5).slice(0, 3).sort((x, y) => x - y);
      const row: Cell[] = n.map((k, i) => (gaps.includes(i) ? blank(gaps.indexOf(i) + 1) : price * k));
      return make(2, `Stickers cost ${price}p each. Complete the table to show the cost in pence. Type the number only.`, table(["Stickers", ...n.map(String)], [["Cost (p)", ...row]], "A table of stickers and their cost in pence."), gaps.map((i) => price * n[i]),
        "Multiply the number of stickers by the price of one.", [`One sticker costs ${price}p.`, ...gaps.map((i, k) => `Box ${k + 1}: ${n[i]} × ${price} = ${price * n[i]}.`)]);
    }
    if (level === 3) {
      const mul = r() < 0.5, k = int(r, 2, 6), ins = [2, 3, 5, 7, 9], rule = (x: number) => (mul ? x * k : x + k + 3);
      const a = int(r, 0, 1) + 1, b = 3, row2: Cell[] = ins.map((x, i) => (i === a ? blank(1) : i === b ? blank(2) : rule(x)));
      const outTarget = rule(ins[4]), rows: Cell[][] = [["Input", ...ins.slice(0, 4), blank(3)], ["Output", ...row2.slice(0, 4), outTarget]];
      return make(3, `A rule changes the input into the output. Complete the table.`, table(["", "A", "B", "C", "D", "E"], rows, "An input and output table for a rule."), [rule(ins[a]), rule(ins[b]), ins[4]],
        "Use a pair that is complete to find the rule. Then use it for the gaps, working backwards for the input.", [`The input ${ins[0]} gives ${rule(ins[0])}, so the rule is ${mul ? `multiply by ${k}` : `add ${k + 3}`}.`, `Box 1: input ${ins[a]} gives ${rule(ins[a])}. Box 2: input ${ins[b]} gives ${rule(ins[b])}.`, `Box 3: the output ${outTarget} came from input ${ins[4]}${mul ? ` (${outTarget} ÷ ${k})` : ` (${outTarget} − ${k + 3})`}.`]);
    }
    if (level === 4) {
      const [from, to, f, small, big] = pick(r, [["Kilometres", "Metres", 1000, "km", "m"], ["Kilograms", "Grams", 1000, "kg", "g"], ["Litres", "Millilitres", 1000, "l", "ml"], ["Metres", "Centimetres", 100, "m", "cm"]] as [string, string, number, string, string][]);
      const rows: Cell[][] = [[1, f], [2, blank(1)], [blank(2), 5 * f], [7, blank(3)]];
      return make(4, `Complete the table to convert between ${from.toLowerCase()} and ${to.toLowerCase()}.`, table([from, to], rows, `A conversion table between ${small} and ${big}.`), [2 * f, 5, 7 * f],
        `The first row shows how many ${big} are in 1 ${small}. Use it for every row.`, [`1 ${small} = ${f} ${big}.`, `Box 1: 2 × ${f} = ${2 * f}. Box 2: ${5 * f} ÷ ${f} = 5. Box 3: 7 × ${f} = ${7 * f}.`]);
    }
    const days = ["Mon", "Tue", "Wed", "Thu"], a = int(r, 4, 9), c = int(r, 4, 9), d = 2 * c, tuesday = int(r, 3, 8), total = a + tuesday + c + d;
    return make(5, `A class counts the books read each day. Thursday is double Wednesday. The total is ${total}. Complete the table.`, table(["Day", ...days, "Total"], [["Books read", a, blank(1), c, blank(2), total]], "A table of books read each day with a total."), [tuesday, d],
      "Find Thursday first from Wednesday. Then take everything else off the total to find Tuesday.", [`Thursday is double Wednesday: ${c} × 2 = ${d}. That is box 2.`, `Take the known days off the total: ${total} − ${a} − ${c} − ${d} = ${tuesday}. That is box 1.`]);
  },
};

export const ks2TableSkills: Skill[] = [completeTable];
