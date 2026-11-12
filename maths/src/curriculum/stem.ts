import { int, pick, round } from "../engine/rng";
import type { Skill } from "../engine/types";
import { choiceSkill } from "./build";
import { shuffle } from "./helpers";
import { num } from "./ks2";

/**
 * The STEM lab: computing, data science, AI and machine learning, and the ideas of quantum physics, from Year 3 to Year 13.
 * Every question works out its own answer.
 * These topics sit in their own area, away from the maths plan, practice and 11+ papers.
 */
const bin = (n: number, bits = 0) => n.toString(2).padStart(bits, "0");
const distinct = <T,>(make: () => T, ok: (t: T) => boolean, tries = 200): T => { let t = make(); for (let i = 0; i < tries && !ok(t); i++) t = make(); return t; };

type Flow = Extract<NonNullable<import("../engine/types").Question["figure"]>, { type: "flow" }>;
const flow = (steps: Flow["steps"], alt: string, repeat?: Flow["repeat"]): Flow => ({ type: "flow", steps, repeat, alt });
const table = (head: string[], rows: (string | number)[][], alt: string) => ({ type: "table" as const, head, rows, alt });

export const stemSkills: Skill[] = [
  // ============================================================ Key Stage 2
  num({
    id: "stem-instructions", name: "Giving a robot precise instructions", stage: "KS2", year: 3, strand: "STEM", prereqs: [],
    blurb: "Follow a list of instructions step by step to see where a robot ends up.",
    explainer: "A computer does exactly what the instructions say, in order, with no guessing. Follow each step carefully.",
    parentNote: "This is the heart of programming: an algorithm is a list of precise steps. Try giving a family member instructions to cross the room, and see what goes wrong when a step is missing.",
    talkAbout: "What happens if you swap two of the instructions round?",
  }, (r, l) => {
    const x = int(r, 2, 6), y = int(r, 2, 6), a = int(r, 1, 3), b = int(r, 1, 2);
    if (l === 1) return { figure: { type: "board", mode: "line", size: 14, start: [x, 0], steps: [`right ${a + 2}`, `left ${b}`], ask: "x", alt: `A number line board from 0 to 14. The robot starts on square ${x}.` }, prompt: `A robot starts on square ${x} of a number line. It moves right ${a + 2}, then left ${b}. Which square is it on now?`, value: x + a + 2 - b, hint: "Right adds. Left takes away. Do one instruction at a time.", solution: [`${x} + ${a + 2} = ${x + a + 2}.`, `${x + a + 2} − ${b} = ${x + a + 2 - b}.`] };
    const u = int(r, 1, 4), d = int(r, 1, 2);
    if (l === 2) return { figure: { type: "board", mode: "grid", size: 12, start: [x, y], steps: [`up ${u + d}`, `down ${d}`, `right ${a}`], ask: "y", alt: `A grid board. The robot starts at (${x}, ${y}).` }, prompt: `A robot starts at $(${x}, ${y})$ on a grid. Its instructions are: up ${u + d}, down ${d}, right ${a}. What is its y-coordinate at the end?`, value: y + u, hint: "Up adds to y and down takes away. Right doesn't change y.", solution: [`${y} + ${u + d} = ${y + u + d}.`, `${y + u + d} − ${d} = ${y + u}.`, `Moving right doesn't change y, so y = ${y + u}.`] };
    return { figure: { type: "board", mode: "grid", size: 12, start: [x, y], steps: [`right ${a + 2}`, `up ${u + 1}`, `left ${a}`, "down 1"], ask: "dist", alt: `A grid board. The robot starts at (${x}, ${y}).` }, prompt: `A robot starts at $(${x}, ${y})$. Its instructions are: right ${a + 2}, up ${u + 1}, left ${a}, down 1. How many squares from the start is it, counting along the grid lines (across plus up or down)?`, value: Math.abs(2) + Math.abs(u), hint: "Work out how far it moved across and how far up or down overall. Then add them.", solution: [`Across: right ${a + 2}, left ${a}, so 2 to the right.`, `Up or down: up ${u + 1}, down 1, so ${u} up.`, `2 + ${u} = ${2 + u}.`] };
  }),
  num({
    id: "stem-loops", name: "Loops: repeating instructions", stage: "KS2", year: 3, strand: "STEM", prereqs: [],
    blurb: "Work out what a repeat loop does, and how many times things happen.",
    explainer: "A loop repeats instructions so you don't have to write them out again and again. 'Repeat 4 times' means do the instructions 4 times.",
    parentNote: "Loops make programs short. Ask your child to write the instructions for a dance with a repeating part, and count how many moves there are.",
    talkAbout: "Why is writing 'repeat 10 times' better than writing the instruction ten times?",
  }, (r, l) => {
    const k = int(r, 3, 6), n = int(r, 2, 5);
    if (l === 1) return { figure: flow([{ text: `move forward ${n}` }], `A loop: move forward ${n} squares, repeated ${k} times.`, { from: 0, to: 0, label: `× ${k}` }), prompt: `A program says: repeat ${k} times: move forward ${n} squares. How many squares does the robot move in total?`, value: k * n, hint: "Multiply the number of repeats by the squares in each repeat.", solution: [`${k} × ${n} = ${k * n}.`] };
    const m = int(r, 1, n - 1);
    if (l === 2) return { figure: flow([{ text: `forward ${n}` }, { text: `back ${m}` }], `A loop: forward ${n}, then back ${m}, repeated ${k} times.`, { from: 0, to: 1, label: `× ${k}` }), prompt: `A program says: repeat ${k} times: move forward ${n}, then back ${m}. How far is the robot from where it started at the end?`, value: k * (n - m), hint: "Find how far it gets forwards in one go, then repeat.", solution: [`One repeat: ${n} − ${m} = ${n - m} forwards.`, `${k} × ${n - m} = ${k * (n - m)}.`] };
    const a = int(r, 2, 4), b = int(r, 2, 3), c = int(r, 1, 3);
    return { figure: flow([{ text: `clap ${b} times` }, { text: `stamp ${c} time${c > 1 ? "s" : ""}` }], `A loop: clap ${b} times, then stamp ${c} time${c > 1 ? "s" : ""}, repeated ${a} times.`, { from: 0, to: 1, label: `× ${a}` }), prompt: `A program says: repeat ${a} times: (clap ${b} times, then stamp ${c} time${c > 1 ? "s" : ""}). How many claps and stamps are there altogether?`, value: a * (b + c), hint: "Count the actions in one repeat, then multiply.", solution: [`One repeat has ${b} + ${c} = ${b + c} actions.`, `${a} × ${b + c} = ${a * (b + c)}.`] };
  }),
  num({
    id: "stem-input-output", name: "Inputs, processes and outputs", stage: "KS2", year: 4, strand: "STEM", prereqs: [],
    blurb: "A program takes an input, does something to it, and gives an output. Work out the output, or the input.",
    explainer: "Every program has an input (what goes in), a process (what it does) and an output (what comes out). It works like a function machine.",
    parentNote: "Compare it to a vending machine: you press a button (input), the machine does its work (process), and a snack comes out (output). Working backwards is a great test of understanding.",
    talkAbout: "If you know the output, how can you work out the input?",
  }, (r, l) => {
    const a = int(r, 2, 6), b = int(r, 1, 9), n = int(r, 2, 9);
    if (l === 1) return { figure: flow([{ text: `Input: ${n}`, kind: "in" }, { text: `add ${b}` }, { text: "Output: ?", kind: "out" }], `A program: input ${n}, add ${b}, output unknown.`), prompt: `A program takes a number, adds ${b}, and shows the answer. The input is ${n}. What is the output?`, value: n + b, hint: "Do what the program says to the input.", solution: [`${n} + ${b} = ${n + b}.`] };
    if (l === 2) return { figure: flow([{ text: `Input: ${n}`, kind: "in" }, { text: `multiply by ${a}` }, { text: `add ${b}` }, { text: "Output: ?", kind: "out" }], `A program: input ${n}, multiply by ${a}, add ${b}, output unknown.`), prompt: `A program takes a number, multiplies it by ${a}, then adds ${b}. The input is ${n}. What is the output?`, value: n * a + b, hint: "Do the steps in order: multiply first, then add.", solution: [`${n} × ${a} = ${n * a}.`, `${n * a} + ${b} = ${n * a + b}.`] };
    return { figure: flow([{ text: "Input: ?", kind: "in" }, { text: `multiply by ${a}` }, { text: `add ${b}` }, { text: `Output: ${n * a + b}`, kind: "out" }], `A program: input unknown, multiply by ${a}, add ${b}, output ${n * a + b}.`), prompt: `A program takes a number, multiplies it by ${a}, then adds ${b}. The output is ${n * a + b}. What was the input?`, value: n, hint: "Work backwards: undo the last step first.", solution: [`Undo adding ${b}: ${n * a + b} − ${b} = ${n * a}.`, `Undo multiplying by ${a}: ${n * a} ÷ ${a} = ${n}.`] };
  }),
  num({
    id: "stem-sorting", name: "Sorting step by step", stage: "KS2", year: 4, strand: "STEM", prereqs: [],
    blurb: "Follow a simple sorting algorithm: swap neighbours that are in the wrong order.",
    explainer: "A computer sorts a list by comparing two neighbours at a time. If the left one is bigger, swap them. Do this along the whole list and repeat.",
    parentNote: "This is called bubble sort. It isn't the fastest, but it's easy to understand. Try it with playing cards: compare two neighbours, swap if needed, and move along.",
    talkAbout: "Why does the biggest number always end up at the right-hand end after one pass?",
  }, (r, l) => {
    const list = shuffle(r, [2, 3, 5, 6, 8, 9, 11, 14].slice(0, l === 1 ? 5 : 6).map((v, i) => v + (i % 2)));
    const pass = (a: number[]) => { const c = [...a]; let swaps = 0; for (let i = 0; i < c.length - 1; i++) if (c[i] > c[i + 1]) { [c[i], c[i + 1]] = [c[i + 1], c[i]]; swaps++; } return { c, swaps }; };
    const first = pass(list);
    let total = 0, cur = [...list];
    for (;;) { const p = pass(cur); if (!p.swaps) break; total += p.swaps; cur = p.c; }
    if (l === 1) return { figure: { type: "list-boxes", items: list, alt: `The list ${list.join(", ")}.` }, prompt: `Sort this list with one pass of swapping neighbours (swap if the left is bigger), starting from the left: ${list.join(", ")}. What number is at the far right at the end?`, value: first.c[first.c.length - 1], hint: "Compare the first two, swap if needed, then move one place along. Keep going to the end.", solution: [`After one pass the list is ${first.c.join(", ")}.`, `The far right is ${first.c[first.c.length - 1]}, the biggest number.`] };
    if (l === 2) return { figure: { type: "list-boxes", items: list, alt: `The list ${list.join(", ")}.` }, prompt: `One pass of swapping neighbours (swap if the left is bigger) is done on ${list.join(", ")}, starting from the left. How many swaps happen in that pass?`, value: first.swaps, hint: "Go through the list pair by pair and count every swap.", solution: [`After one pass the list is ${first.c.join(", ")}.`, `There were ${first.swaps} swaps.`] };
    return { figure: { type: "list-boxes", items: list, alt: `The list ${list.join(", ")}.` }, prompt: `You keep making passes of swapping neighbours until the list ${list.join(", ")} is fully sorted. How many swaps are made altogether?`, value: total, hint: "Do one pass at a time, counting swaps each time, until no swaps are needed.", solution: [`Pass 1 gives ${first.c.join(", ")} with ${first.swaps} swaps.`, `Carrying on until sorted, the total number of swaps is ${total}.`] };
  }),
  choiceSkill({
    id: "stem-debugging", name: "Spotting bugs", stage: "KS2", year: 5, strand: "STEM", prereqs: ["stem-loops"],
    blurb: "Find what is wrong with a short program and choose the fix.",
    explainer: "A bug is a mistake in a program. To find it, compare what the program should do with what it does, and look for the step that goes wrong.",
    parentNote: "Debugging is a real skill: read the instructions slowly, predict what will happen, then check. Everybody's programs have bugs, and finding them is part of the fun.",
    talkAbout: "How would you test a program to find out where the bug is?",
  }, (r, l) => {
    const codes: string[][] = [
      ["for i from 1 to 4:", "    print i"],
      ["repeat 3 times:", "    step"],
      ["repeat 10 times:", "    say Hello"],
      ["x = input", "x = x + 5", "print x"],
      ["if points > 8:", "    print \"You win!\""],
    ];
    const sets: [string, string, string[], string][] = [
      ["A program should print the numbers 1 to 5, but it prints 1, 2, 3, 4. What is the bug?", "The loop stops one number too early", ["The loop starts at 5", "The program prints letters", "The numbers are printed in a circle"], "The last number is missing, so the loop ends too soon."],
      ["A robot should walk to the door, 4 steps away, but it only does 'repeat 3 times: step'. What is the fix?", "Change 3 to 4", ["Change 'step' to 'jump'", "Add 'repeat 3 times' again", "Remove the loop"], "It needs 4 steps, so the loop must repeat 4 times."],
      ["A program should say 'Hello' once, but it says it 10 times. What is the most likely bug?", "The greeting is inside a loop that it shouldn't be in", ["The word is spelled wrong", "The computer is tired", "The program has no input"], "Something repeating by mistake means the line is in a loop."],
      ["A program adds 5 to a number, but should double it. Which change fixes it?", "Change 'add 5' to 'multiply by 2'", ["Change 'add 5' to 'add 2'", "Add another 5", "Take away the number"], "Doubling means multiplying by 2."],
      ["A game should let the player win at 10 points, but the player wins at 9. Which is the most likely bug?", "The test says 'more than 8' instead of 'at least 10'", ["The game has no sound", "The points are shown in red", "The player has too many lives"], "The condition for winning is wrong by one."],
    ];
    const at = int(r, 0, l === 1 ? 2 : sets.length - 1), [q, right, others, why] = sets[at];
    return { figure: { type: "code", lines: codes[at], alt: `The program: ${codes[at].join("; ").replace(/\s+/g, " ")}.` }, prompt: q, right, others, hint: "Compare what should happen with what does happen.", solution: [why] };
  }),
  num({
    id: "stem-data-detective", name: "Data detective", stage: "KS2", year: 5, strand: "STEM", prereqs: ["read-tables"],
    blurb: "Read a table of survey results and answer questions about it, like a data scientist.",
    explainer: "Data is information we collect. A table puts it in order so we can see patterns. Data scientists ask questions of data to find out what's true.",
    parentNote: "Run a small survey at home, such as favourite fruit, and put the results in a table. Ask what the data shows, and what it can't tell you.",
    talkAbout: "What other question could you answer with this data?",
  }, (r, l) => {
    const cats = shuffle(r, ["football", "swimming", "dancing", "cycling", "climbing"]).slice(0, 4);
    const total = pick(r, [20, 40]), cuts = [0, 0, 0].map(() => int(r, 2, total / 2 - 2)).sort((a, b) => a - b);
    let counts = [cuts[0], cuts[1] - cuts[0], cuts[2] - cuts[1], total - cuts[2]].map((c) => Math.max(c, 1));
    counts[3] = total - counts[0] - counts[1] - counts[2];
    if (counts.some((c) => c < 1)) counts = [total / 4, total / 4, total / 4, total / 4];
    const sorted = [...counts].sort((a, b) => b - a), table = cats.map((c, i) => `${c} ${counts[i]}`).join(", ");
    const bars = { type: "bars" as const, items: cats.map((c, i) => ({ label: c, value: counts[i] })), yLabel: "Children", alt: `A bar chart of favourite activities: ${table}.` };
    if (l === 1) return { figure: bars, prompt: `A survey asked children their favourite activity: ${table}. How many children were asked altogether?`, value: total, hint: "Add up all the counts.", solution: [`${counts.join(" + ")} = ${total}.`] };
    if (l === 2) return { figure: bars, prompt: `A survey asked children their favourite activity: ${table}. How many more children chose the most popular activity than the least popular?`, value: sorted[0] - sorted[3], hint: "Find the biggest and smallest counts, and take one from the other.", solution: [`Most popular: ${sorted[0]}. Least popular: ${sorted[3]}.`, `${sorted[0]} − ${sorted[3]} = ${sorted[0] - sorted[3]}.`] };
    return { figure: bars, prompt: `A survey asked ${total} children their favourite activity: ${table}. What percentage chose the most popular? Type the number.`, value: (sorted[0] / total) * 100, unit: "%", hint: `Divide the count by ${total}, then multiply by 100.`, solution: [`${sorted[0]} ÷ ${total} × 100 = ${(sorted[0] / total) * 100}.`] };
  }),
  choiceSkill({
    id: "stem-ai-features", name: "How computers learn from examples", stage: "KS2", year: 6, strand: "STEM", prereqs: ["stem-data-detective"],
    blurb: "Look at labelled examples and find the feature that tells two groups apart, like a machine learning program does.",
    explainer: "Machine learning programs learn by looking at lots of labelled examples and finding what is different between the groups. Each thing we can measure is called a feature.",
    parentNote: "Machine learning doesn't have rules typed in by a person. It finds patterns in examples. Try sorting a pile of objects into two groups and asking your child to explain the rule they found.",
    talkAbout: "What could go wrong if the examples were all the same kind of thing?",
  }, (r, l) => {
    const feats: { name: string; yes: string; no: string }[] = [
      { name: "wheels", yes: "has wheels", no: "has no wheels" }, { name: "colour", yes: "is red", no: "is blue" },
      { name: "size", yes: "is big", no: "is small" }, { name: "wings", yes: "has wings", no: "has no wings" },
    ];
    const [f1, f2] = shuffle(r, feats), noise = ["the day it was collected", "the shape of the label"];
    const cells = (yes: boolean) => Array.from({ length: 3 }, () => (l === 1 ? (yes ? f1.yes : f1.no) : `${yes ? f1.yes : f1.no}, ${r() < 0.5 ? f2.yes : f2.no}`));
    const ga = cells(true), gb = cells(false), group = (xs: string[]) => xs.map((x) => `(${x})`).join(" ");
    const opts = l === 1 ? [f2.name, ...noise] : [f2.name, ...noise.slice(0, 1), feats.find((f) => f !== f1 && f !== f2)!.name];
    return { figure: table(["", "Example 1", "Example 2", "Example 3"], [["Group A", ...ga], ["Group B", ...gb]], `A table of examples. Group A: ${ga.join("; ")}. Group B: ${gb.join("; ")}.`), prompt: `A computer is shown examples of two groups. Group A: ${group(ga)}. Group B: ${group(gb)}. Which feature should the computer look at to tell the groups apart?`, right: f1.name, others: opts.slice(0, 3), hint: "Which feature is always the same inside each group, but different between the two groups?", solution: [`In Group A every example ${f1.yes}. In Group B every example ${f1.no}.`, `So the feature that separates them is ${f1.name}.`] };
  }),

  // ============================================================ Key Stage 3
  num({
    id: "stem-binary", name: "Binary numbers", stage: "KS3", year: 7, strand: "STEM", prereqs: ["place-value"],
    blurb: "Convert between binary and ordinary (denary) numbers, and add in binary.",
    explainer: "Computers use binary, which only has 0 and 1. The place values go 1, 2, 4, 8, 16, 32, 64, 128, doubling each time.",
    parentNote: "Binary is place value with 2s instead of 10s. Write 128, 64, 32, 16, 8, 4, 2, 1 and put a 1 under every value you need. Everything on a computer is stored in this way.",
    talkAbout: "Why do computers use only 0 and 1?",
  }, (r, l) => {
    if (l === 1) { const n = int(r, 9, 255), b = bin(n); return { figure: { type: "bits", bits: b, alt: `The binary number ${b}, with place values over each digit.` }, prompt: `What is the binary number ${b} in ordinary (denary) numbers?`, value: n, hint: "Write the place values 128, 64, 32, 16, 8, 4, 2, 1 under the digits and add up the ones.", solution: [`Add the place values under each 1.`, `${b} = ${n}.`] }; }
    if (l === 2) { const n = int(r, 8, 200); return { figure: { type: "bits", bits: "00000000", alt: "Eight empty binary boxes with the place values 128, 64, 32, 16, 8, 4, 2 and 1 over them." }, prompt: `Write ${n} in binary. Type the 0s and 1s with no spaces.`, value: Number(bin(n)), shown: bin(n), hint: "Find the biggest place value that fits, write a 1, take it away, and carry on.", solution: [`${n} in binary is ${bin(n)}.`] }; }
    const a = int(r, 3, 14), b = int(r, 2, 14);
    return { prompt: `Add the binary numbers ${bin(a)} and ${bin(b)}. Type the answer in binary.`, value: Number(bin(a + b)), shown: bin(a + b), hint: "Change both to denary, add, then change back. Or add column by column: 1 + 1 = 10 in binary.", solution: [`${bin(a)} = ${a} and ${bin(b)} = ${b}.`, `${a} + ${b} = ${a + b}.`, `${a + b} in binary is ${bin(a + b)}.`] };
  }),
  choiceSkill({
    id: "stem-hex", name: "Hexadecimal and colours", stage: "KS3", year: 8, strand: "STEM", prereqs: ["stem-binary"],
    blurb: "Read hexadecimal (base 16) numbers, as used for colours on screens.",
    explainer: "Hexadecimal has 16 digits: 0 to 9, then A=10, B=11, C=12, D=13, E=14, F=15. The place values are 1 and 16.",
    parentNote: "Web colours like #FF0000 are three hex numbers for red, green and blue. FF is 255, the brightest. Hex is a short way to write long binary numbers: each hex digit is four binary digits.",
    talkAbout: "Why is hex handy for programmers who work with binary?",
  }, (r, l) => {
    const L = "0123456789ABCDEF";
    if (l === 1) { const d = int(r, 10, 15); const right = String(d); return { prompt: `In hexadecimal, what does the digit ${L[d]} stand for?`, right, others: [d - 1, d + 1, d + 5].map(String).filter((x) => x !== right), hint: "A is 10, B is 11, and so on up to F, which is 15.", solution: [`A=10, B=11, C=12, D=13, E=14, F=15.`, `${L[d]} = ${d}.`] }; }
    const h = int(r, 1, 15), lo = int(r, 0, 15), v = h * 16 + lo;
    if (l === 2) return { figure: table(["16s", "1s"], [[L[h], L[lo]]], `The hex number ${L[h]}${L[lo]}: ${L[h]} in the 16s place and ${L[lo]} in the 1s place.`), prompt: `What is the hex number ${L[h]}${L[lo]} in ordinary (denary) numbers?`, right: String(v), others: [v + 16, v - 1, lo * 16 + h, v + 10].map(String).filter((x) => x !== String(v)).slice(0, 3), hint: "The first digit is worth 16 each. Add the second digit.", solution: [`${L[h]} = ${h}, so ${h} × 16 = ${h * 16}.`, `${h * 16} + ${lo} = ${v}.`] };
    const right = `${L[h]}${L[lo]}`;
    return { prompt: `Which hex number is ${v} in ordinary numbers?`, right, others: [`${L[lo]}${L[h]}`, `${L[Math.min(15, h + 1)]}${L[lo]}`, `${L[h]}${L[(lo + 1) % 16]}`].filter((x) => x !== right), hint: "Divide by 16 for the first digit. The remainder is the second digit.", solution: [`${v} ÷ 16 = ${h} remainder ${lo}.`, `${h} is ${L[h]} and ${lo} is ${L[lo]}, so it is ${right}.`] };
  }),
  num({
    id: "stem-trace", name: "Tracing code", stage: "KS3", year: 8, strand: "STEM", prereqs: ["stem-loops"],
    blurb: "Follow a short piece of code line by line and work out the final value of a variable.",
    explainer: "A variable stores a value with a name. To trace code, follow each line in order, and keep track of what every variable holds, like a table of values.",
    parentNote: "Tracing is how programmers predict what code does before they run it. Ask your child to draw a little table with a column for each variable and a row for each step.",
    talkAbout: "What does x = x + 1 mean, when x can't be equal to x + 1?",
  }, (r, l) => {
    if (l === 1) { const x = int(r, 2, 9), y = int(r, 2, 6), z = int(r, 1, 5); return { figure: { type: "code", lines: [`x = ${x}`, `y = ${y}`, "x = x + y", `y = x − ${z}`], alt: `The code: x equals ${x}; y equals ${y}; x equals x plus y; y equals x minus ${z}.` }, prompt: `Trace this code. What is the final value of y?`, value: x + y - z, hint: "Do one line at a time and keep track of both x and y.", solution: [`After x = x + y: x = ${x + y}.`, `y = ${x + y} − ${z} = ${x + y - z}.`] }; }
    if (l === 2) { const n = int(r, 4, 9); return { figure: { type: "code", lines: ["total = 0", `for i from 1 to ${n}:`, "    total = total + i"], alt: `The code: total equals 0; then for i from 1 to ${n}, total equals total plus i.` }, prompt: `Trace this code. What is the final value of total?`, value: (n * (n + 1)) / 2, hint: "Add 1, then 2, then 3, and so on up to the last value of i.", solution: [`total = ${Array.from({ length: n }, (_, i) => i + 1).join(" + ")}.`, `= ${(n * (n + 1)) / 2}.`] }; }
    const lim = pick(r, [50, 100, 200, 500]), x0 = pick(r, [1, 3]);
    let x = x0, steps = 0; while (x < lim) { x *= 2; steps++; }
    return { figure: { type: "code", lines: [`x = ${x0}`, `while x < ${lim}:`, "    x = x × 2"], alt: `The code: x equals ${x0}; while x is less than ${lim}, x equals x times 2.` }, prompt: `Trace this code. What is the final value of x?`, value: x, hint: "Keep doubling x, and stop as soon as x is no longer less than the limit.", solution: [`Doubling ${steps} times gives ${x}.`, `${x} is not less than ${lim}, so the loop stops with x = ${x}.`] };
  }),
  choiceSkill({
    id: "stem-logic", name: "AND, OR and NOT", stage: "KS3", year: 8, strand: "STEM", prereqs: [],
    blurb: "Work out whether a logic statement is True or False.",
    explainer: "Computers make decisions with logic. A AND B is True only if both are True. A OR B is True if at least one is True. NOT flips True and False.",
    parentNote: "Logic gates in a computer chip do exactly this. Try everyday examples: 'You can go out if it's dry AND your homework is done.'",
    talkAbout: "Can you think of a rule in real life that uses AND, and one that uses OR?",
  }, (r, l) => {
    const A = r() < 0.5, B = r() < 0.5, C = r() < 0.5, t = (v: boolean) => (v ? "True" : "False");
    let expr: string, ans: boolean;
    if (l === 1) { const op = pick(r, ["AND", "OR"]); expr = `A ${op} B`; ans = op === "AND" ? A && B : A || B; }
    else if (l === 2) { const op = pick(r, ["AND", "OR"]); expr = `NOT A ${op} B`; ans = op === "AND" ? !A && B : !A || B; }
    else { expr = `(A OR B) AND NOT C`; ans = (A || B) && !C; }
    return { figure: table(l === 3 ? ["A", "B", "C"] : ["A", "B"], [l === 3 ? [t(A), t(B), t(C)] : [t(A), t(B)]], `The values: A is ${t(A)}, B is ${t(B)}${l === 3 ? `, C is ${t(C)}` : ""}.`), prompt: `A is ${t(A)}, B is ${t(B)}${l === 3 ? `, C is ${t(C)}` : ""}. What is ${expr}?`, right: t(ans), others: [t(!ans)], hint: l === 3 ? "Do the brackets first, then NOT, then AND." : "Remember: AND needs both True, OR needs at least one True, NOT flips it.", solution: [l === 3 ? `(${t(A)} OR ${t(B)}) = ${t(A || B)}, and NOT ${t(C)} = ${t(!C)}.` : `Work it out step by step.`, `The answer is ${t(ans)}.`] };
  }),
  choiceSkill({
    id: "stem-data-types", name: "Data types", stage: "KS3", year: 7, strand: "STEM", prereqs: [],
    blurb: "Name the data type of a value: whole number, decimal, text or True/False.",
    explainer: "Computers store different kinds of data in different ways. The main data types are integer (whole number), float (decimal number), string (text) and Boolean (True or False).",
    parentNote: "Quote marks make something text: \"7\" is a string, while 7 is an integer. This is why '7' + '3' can give '73' in some languages.",
    talkAbout: "Why does a computer need to know what type a value is?",
  }, (r, l) => {
    const pools: [string, string][][] = [
      [["42", "integer"], ["3.14", "float (decimal)"], ["\"hello\"", "string (text)"], ["True", "Boolean"]],
      [["-8", "integer"], ["0.5", "float (decimal)"], ["\"7\"", "string (text)"], ["False", "Boolean"], ["\"True\"", "string (text)"]],
    ];
    const [val, right] = pick(r, pools[l === 1 ? 0 : 1]);
    return { figure: { type: "code", lines: [`x = ${val}`], alt: `The code: x equals ${val}.` }, prompt: `What data type is the value ${val}?`, right, others: ["integer", "float (decimal)", "string (text)", "Boolean"].filter((x) => x !== right), hint: l === 1 ? "Is it a whole number, a decimal, words or a True/False?" : "Quote marks make something a string, even if it looks like a number.", solution: [`${val} is a ${right}.`] };
  }),
  num({
    id: "stem-outliers", name: "Odd one out in data", stage: "KS3", year: 8, strand: "STEM", prereqs: ["averages"],
    blurb: "Spot an outlier in a data set and see how much it changes the mean.",
    explainer: "An outlier is a value far away from all the others. It might be a mistake or something interesting. A data scientist checks outliers before trusting an average.",
    parentNote: "Outliers pull the mean towards them. Data scientists clean data by checking for outliers: was it a typing mistake, or a real unusual result?",
    talkAbout: "Would you always remove an outlier? What if it's real?",
  }, (r, l) => {
    const base = Array.from({ length: 4 }, () => int(r, 8, 16)); base[3] += (4 - (base.reduce((a, b) => a + b, 0) % 4)) % 4;
    const bs = base.reduce((a, b) => a + b, 0), o = distinct(() => int(r, 40, 90), (v) => (bs + v) % 5 === 0);
    const data = shuffle(r, [...base, o]), meanWith = (bs + o) / 5, meanWithout = bs / 4;
    const dots = { type: "number-line" as const, min: 0, max: Math.ceil((o + 1) / 10) * 10, points: data.map((v) => ({ v, tone: "blue" as const })), alt: `A number line with a dot at each lap time: ${data.join(", ")} seconds.` };
    if (l === 1) return { figure: dots, prompt: `A class timed how long (in seconds) it took to run a lap: ${data.join(", ")}. Which value is the outlier?`, value: o, hint: "Look for the number that is far away from all the others.", solution: [`Most values are between ${Math.min(...base)} and ${Math.max(...base)}.`, `${o} is far bigger, so it's the outlier.`] };
    if (l === 2) return { figure: dots, prompt: `The lap times (in seconds) are ${data.join(", ")}. What is the mean?`, value: meanWith, hint: "Add them all up and divide by how many there are.", solution: [`The total is ${bs + o}.`, `${bs + o} ÷ 5 = ${meanWith}.`] };
    return { figure: dots, prompt: `The lap times (in seconds) are ${data.join(", ")}. What is the mean if the outlier ${o} is removed?`, value: meanWithout, hint: "Leave out the outlier, add up the rest and divide by 4.", solution: [`Without ${o}, the total is ${bs}.`, `${bs} ÷ 4 = ${meanWithout}.`] };
  }),
  choiceSkill({
    id: "stem-bias", name: "Is the data fair?", stage: "KS3", year: 9, strand: "STEM", prereqs: ["stem-ai-features"],
    blurb: "Spot when data or a sample is unfair, and see why that matters for AI.",
    explainer: "An AI learns from its training data. If the data only shows some kinds of people or things, the AI may work badly for everyone else. That's called bias.",
    parentNote: "Real AI systems have been unfair because their training data left people out. Asking 'who's missing from this data?' is one of the most important questions in AI.",
    talkAbout: "Who might be missing from the data when you only ask your friends?",
  }, (r, l) => {
    const sets: [string, string, string[], string][] = [
      ["A face-recognition AI is trained on 10 000 photos, but nearly all of them show young adults. What problem is most likely?", "It may work poorly for children and older people", ["It will be too fast", "It will refuse to look at photos", "It will only recognise blue things"], "Few examples of some groups means the AI has little to learn from for them."],
      ["A school asks only the school football team which sports to buy for the school. Why is this unfair?", "The sample doesn't represent all pupils", ["Footballers can't answer surveys", "The sample is too big", "It's the right way to ask"], "The football team is not a fair sample of the whole school."],
      ["An AI is trained to spot good job applicants using only past hires, who were mostly men. What is likely?", "It may copy that unfairness and prefer men", ["It will be perfectly fair", "It will choose randomly", "It will stop working"], "AI copies patterns in its data, including unfair ones."],
      ["A weather app is trained on data from summer only. When might it be wrong?", "In winter, because it hasn't seen winter data", ["In summer", "Never", "Only on Mondays"], "It hasn't learned from data covering the whole year."],
    ];
    const [q, right, others, why] = pick(r, l === 1 ? sets.slice(1, 3) : sets);
    return { prompt: q, right, others, hint: "Ask: who or what is missing from the data?", solution: [why] };
  }),
  choiceSkill({
    id: "stem-nearest", name: "Nearest neighbour: how a machine decides", stage: "KS3", year: 9, strand: "STEM", prereqs: ["coordinates", "stem-ai-features"],
    blurb: "Use the nearest-neighbour idea to classify something new from labelled examples.",
    explainer: "To decide what a new thing is, find the labelled example it is closest to, and copy that label. This simple idea, nearest neighbour, is a real machine learning method.",
    parentNote: "Nearest neighbour is the easiest machine learning method to understand: 'you are probably like the things you are close to'. With more neighbours (k), the computer takes a vote.",
    talkAbout: "What could go wrong if the closest example happens to be a mistake?",
  }, (r, l) => {
    const colour = (b: boolean) => (b ? "red" : "blue");
    if (l === 1) {
      const a = int(r, 1, 4), b = int(r, 7, 10), x = distinct(() => int(r, 2, 9), (v) => Math.abs(v - a) !== Math.abs(v - b)), near = Math.abs(x - a) < Math.abs(x - b);
      return { figure: { type: "number-line", min: 0, max: 11, points: [{ v: a, tone: "red", label: "red" }, { v: b, tone: "blue", label: "blue" }, { v: x, tone: "new" }], alt: `A number line with a red example at ${a}, a blue example at ${b} and a new point at ${x}.` }, prompt: `On a number line, a red example is at ${a} and a blue example is at ${b}. A new point is at ${x}. Using nearest neighbour, what colour is it?`, right: colour(near), others: [colour(!near)], hint: "Which example is closer to the new point?", solution: [`Distance to red: ${Math.abs(x - a)}. Distance to blue: ${Math.abs(x - b)}.`, `The closer one is ${colour(near)}.`] };
    }
    if (l === 2) {
      const R: [number, number] = [int(r, 1, 3), int(r, 1, 3)], B: [number, number] = [int(r, 6, 9), int(r, 6, 9)], P = distinct(() => [int(r, 2, 8), int(r, 2, 8)] as [number, number], (p) => (p[0] - R[0]) ** 2 + (p[1] - R[1]) ** 2 !== (p[0] - B[0]) ** 2 + (p[1] - B[1]) ** 2);
      const dr = (P[0] - R[0]) ** 2 + (P[1] - R[1]) ** 2, db = (P[0] - B[0]) ** 2 + (P[1] - B[1]) ** 2;
      return { figure: { type: "coord-grid", min: 0, max: 10, points: [{ x: R[0], y: R[1], label: "red" }, { x: B[0], y: B[1], label: "blue" }, { x: P[0], y: P[1], label: "new" }], alt: `A coordinate grid with a red example at (${R}), a blue example at (${B}) and a new point at (${P}).` }, prompt: `A red example is at $(${R})$ and a blue example is at $(${B})$. A new point is at $(${P})$. Using nearest neighbour, what colour is it? (Compare squared distances: no need to take square roots.)`, right: colour(dr < db), others: [colour(dr >= db)], hint: "For each example, work out (difference in x)² + (difference in y)². The smaller is nearer.", solution: [`Red: (${P[0]} − ${R[0]})² + (${P[1]} − ${R[1]})² = ${dr}.`, `Blue: (${P[0]} − ${B[0]})² + (${P[1]} − ${B[1]})² = ${db}.`, `${dr < db ? "Red" : "Blue"} is nearer.`] };
    }
    const pts = distinct(() => Array.from({ length: 5 }, () => ({ v: int(r, 1, 20), c: r() < 0.5 })), (ps) => new Set(ps.map((p) => p.v)).size === 5 && new Set(ps.map((p) => p.c)).size === 2), x = distinct(() => int(r, 3, 18), (v) => !pts.some((p) => p.v === v));
    const byDist = [...pts].sort((a, b) => Math.abs(a.v - x) - Math.abs(b.v - x) || a.v - b.v), k3 = byDist.slice(0, 3), reds = k3.filter((p) => p.c).length;
    const tie = Math.abs(byDist[2].v - x) === Math.abs(byDist[3].v - x);
    if (tie) return { prompt: "A new point has the same distance from two examples, so it can't be decided by distance alone. What can the computer do?", right: "Use more neighbours or another rule to break the tie", others: ["Give up and crash", "Always choose red", "Delete the data"], hint: "Think about ways to get more information.", solution: ["Ties happen, and real programs have a rule to deal with them."] };
    return { figure: { type: "number-line", min: 0, max: 21, points: [...pts.map((p) => ({ v: p.v, tone: (p.c ? "red" : "blue") as "red" | "blue" })), { v: x, tone: "new" as const }], alt: `A number line with examples ${pts.map((p) => `${p.v} (${colour(p.c)})`).join(", ")} and a new point at ${x}.` }, prompt: `Examples on a number line: ${pts.map((p) => `${p.v} (${colour(p.c)})`).join(", ")}. A new point is at ${x}. Using the 3 nearest neighbours and taking a vote, what colour is it?`, right: colour(reds >= 2), others: [colour(reds < 2)], hint: "Find the 3 closest examples, then see which colour has the most votes.", solution: [`The 3 nearest are ${k3.map((p) => `${p.v} (${colour(p.c)})`).join(", ")}.`, `${reds} red and ${3 - reds} blue, so it is ${colour(reds >= 2)}.`] };
  }),
  num({
    id: "stem-neuron", name: "A tiny artificial neuron", stage: "KS3", year: 9, strand: "STEM", prereqs: ["negative-ops"],
    blurb: "Work out the output of a simple artificial neuron: multiply the inputs by weights, add them up, and compare.",
    explainer: "An artificial neuron multiplies each input by a weight (how much it matters), adds them up, and 'fires' (outputs 1) if the total is big enough. Networks of these power modern AI.",
    parentNote: "This is a real, simplified model of how neural networks work. Training an AI means adjusting the weights until its answers are right. The whole of modern AI is built from billions of tiny sums like this.",
    talkAbout: "If a weight is bigger, what does that tell us about that input?",
  }, (r, l) => {
    const x1 = int(r, 1, 5), x2 = int(r, 1, 5), w1 = int(r, 1, 4), w2 = int(r, -3, 3), s = x1 * w1 + x2 * w2;
    if (l === 1) return { figure: { type: "neuron", inputs: [x1, x2], weights: [w1, 2], alt: `A neuron with inputs ${x1} and ${x2} and weights ${w1} and 2.` }, prompt: `A neuron has inputs ${x1} and ${x2}, with weights ${w1} and 2. What is the weighted total, $${x1} \\times ${w1} + ${x2} \\times 2$?`, value: x1 * w1 + x2 * 2, hint: "Multiply each input by its weight, then add.", solution: [`${x1} × ${w1} = ${x1 * w1} and ${x2} × 2 = ${x2 * 2}.`, `${x1 * w1} + ${x2 * 2} = ${x1 * w1 + x2 * 2}.`] };
    const bias = int(r, -6, 2);
    if (l === 2) return { figure: { type: "neuron", inputs: [x1, x2], weights: [w1, w2], bias, alt: `A neuron with inputs ${x1} and ${x2}, weights ${w1} and ${w2}, and a bias of ${bias}.` }, prompt: `A neuron has inputs ${x1} and ${x2}, weights ${w1} and ${w2}, and a bias of ${bias}. What is the total: inputs × weights, added, plus the bias?`, value: s + bias, hint: "Work out each input × weight, add them, then add the bias.", solution: [`${x1} × ${w1} = ${x1 * w1}, and ${x2} × (${w2}) = ${x2 * w2}.`, `${x1 * w1} + (${x2 * w2}) + (${bias}) = ${s + bias}.`] };
    const out = s + bias > 0 ? 1 : 0;
    return { figure: { type: "neuron", inputs: [x1, x2], weights: [w1, w2], bias, alt: `A neuron with inputs ${x1} and ${x2}, weights ${w1} and ${w2}, and a bias of ${bias}.` }, prompt: `A neuron has inputs ${x1} and ${x2}, weights ${w1} and ${w2}, and a bias of ${bias}. It outputs 1 if the total is more than 0, otherwise 0. What does it output?`, value: out, hint: "Find the total, then check whether it is more than 0.", solution: [`Total = ${x1 * w1} + (${x2 * w2}) + (${bias}) = ${s + bias}.`, `${s + bias} is ${out ? "more than 0" : "not more than 0"}, so the output is ${out}.`] };
  }),
  num({
    id: "stem-accuracy", name: "How good is the model?", stage: "KS3", year: 9, strand: "STEM", prereqs: ["pct-amount"],
    blurb: "Work out how accurate a machine learning model is from its right and wrong answers.",
    explainer: "To test an AI model, we give it examples it hasn't seen, and count how many it gets right. Accuracy is the number right out of the total, as a percentage.",
    parentNote: "Testing on new examples matters. If a model is tested on the same examples it learned from, it can look great but fail in real life.",
    talkAbout: "Why shouldn't we test a model on the examples it learned from?",
  }, (r, l) => {
    const total = pick(r, [20, 50, 100, 200]), right = Math.round((int(r, 6, 19) / 20) * total);
    if (l === 1) return { figure: { type: "pie", slices: [{ label: "Right", value: right }, { label: "Wrong", value: total - right }], alt: `A pie chart of ${total} test pictures: ${right} right and ${total - right} wrong.` }, prompt: `A model is tested on ${total} new pictures and gets ${right} right. What is its accuracy as a percentage?`, value: (right / total) * 100, unit: "%", hint: "Divide right answers by the total, then multiply by 100.", solution: [`${right} ÷ ${total} × 100 = ${(right / total) * 100}.`] };
    if (l === 2) return { prompt: `A model is tested on ${total} new pictures and has an accuracy of ${(right / total) * 100}%. How many did it get wrong?`, value: total - right, hint: "Find how many it got right, then take that from the total.", solution: [`Right: ${(right / total) * 100}% of ${total} = ${right}.`, `${total} − ${right} = ${total - right}.`] };
    const tp = int(r, 20, 40), tn = int(r, 30, 50), fp = int(r, 2, 6), fn = 100 - tp - tn - fp;
    return { figure: table(["", "Really spam", "Really good"], [["Model said spam", tp, fp], ["Model said good", fn, tn]], `A table of 100 emails. Said spam and really spam: ${tp}. Said spam but really good: ${fp}. Said good but really spam: ${fn}. Said good and really good: ${tn}.`), prompt: `A model that spots spam is tested on 100 emails. It correctly spots ${tp} spam emails, correctly lets ${tn} good emails through, wrongly flags ${fp} good emails as spam and misses ${fn} spam emails. What is its accuracy as a percentage?`, value: tp + tn, unit: "%", hint: "Add the ones it got right (both kinds), out of 100.", solution: [`Right: ${tp} + ${tn} = ${tp + tn}.`, `${tp + tn} out of 100 is ${tp + tn}%.`] };
  }),

  // ============================================================ Key Stage 4
  num({
    id: "stem-binary-search", name: "Binary search", stage: "KS4", year: 10, strand: "STEM", prereqs: ["stem-sorting"],
    blurb: "See how halving the list each time finds an item quickly in a sorted list.",
    explainer: "In a sorted list, check the middle item. If it isn't the one you want, you can throw away half of the list. Keep halving until you find it.",
    parentNote: "This is the 'guess my number' game played cleverly. Each guess halves the possibilities, so even a list of a million items needs only 20 guesses.",
    talkAbout: "Why does binary search only work on a sorted list?",
  }, (r, l) => {
    const k = int(r, 3, 6), n = 2 ** k - 1;
    const items = n <= 15 ? Array.from({ length: n }, (_, i) => (i + 1) * 3) : null;
    const listFig = items ? { type: "list-boxes" as const, items, alt: `A sorted list of ${n} numbers: ${items.join(", ")}.` } : undefined;
    if (l === 1) return { figure: listFig, prompt: `A sorted list has ${n} items. You check the middle item first. Which position is the middle? (Position 1 is the first item.)`, value: (n + 1) / 2, hint: "The middle of the list is half way along.", solution: [`(${n} + 1) ÷ 2 = ${(n + 1) / 2}.`] };
    if (l === 2) return { figure: listFig, prompt: `After one check in binary search, half of a ${n}-item list is thrown away. About how many items are left, at most?`, value: (n - 1) / 2, hint: "The middle item was checked, and one half of the rest remains.", solution: [`Take away the middle item: ${n - 1} left, split into two halves of ${(n - 1) / 2}.`, `At most ${(n - 1) / 2} items remain.`] };
    const m = pick(r, [20, 50, 100, 500, 1000]);
    return { prompt: `What is the greatest number of checks binary search needs to find an item in a sorted list of ${m} items? (Keep halving until 1 item is left.)`, value: Math.floor(Math.log2(m)) + 1, hint: "How many times can you halve the list before you reach 1? Then add 1 for the last check.", solution: [`Halving ${m} again and again: it takes ${Math.floor(Math.log2(m))} halvings to get to about 1.`, `So at most ${Math.floor(Math.log2(m)) + 1} checks.`] };
  }),
  num({
    id: "stem-growth", name: "How fast does the work grow?", stage: "KS4", year: 10, strand: "STEM", prereqs: ["index-laws"],
    blurb: "Compare how the number of steps in an algorithm grows as the amount of data grows.",
    explainer: "Some algorithms take twice as long if you double the data. Others take four times as long, or far more. Choosing an algorithm that grows slowly can save hours.",
    parentNote: "This is the idea behind 'Big O' notation. Checking every item is linear. Comparing every pair is quadratic. Quadratic algorithms get slow very quickly as data grows.",
    talkAbout: "Which would you rather use on a list with a million items: one that takes n steps, or one that takes n × n?",
  }, (r, l) => {
    const n = pick(r, [10, 20, 50, 100]);
    const xs = [0, 1, 2, 3, 4, 5, 6], grow = { type: "function-graph" as const, xMin: 0, xMax: 6, yMin: 0, yMax: 36, xStep: 1, yStep: 12, curves: [{ pts: xs.map((x) => [x, x] as [number, number]), label: "n" }, { pts: xs.map((x) => [x, x * x] as [number, number]), label: "n × n" }], alt: "A graph comparing two ways the work grows as the number of items n goes from 0 to 6. The line n rises steadily. The curve n times n rises much faster." };
    if (l === 1) return { figure: grow, prompt: `An algorithm checks each item in a list once. How many checks does it make for a list of ${n} items?`, value: n, hint: "Once per item.", solution: [`${n} items, one check each: ${n}.`] };
    if (l === 2) return { figure: grow, prompt: `An algorithm compares every item with every item (including itself) in a list of ${n} items. How many comparisons is that?`, value: n * n, hint: "Each of the n items is compared with all n items.", solution: [`${n} × ${n} = ${n * n}.`] };
    const p = pick(r, [2, 3]);
    return { prompt: `An algorithm takes $n^${p}$ steps for $n$ items. How many times more steps does it take if the number of items is doubled?`, value: 2 ** p, hint: `Replace n with 2n, and see what happens to $n^${p}$.`, solution: [`$(2n)^${p} = 2^${p} \\times n^${p} = ${2 ** p} \\times n^${p}$.`, `So it takes ${2 ** p} times as many steps.`] };
  }),
  num({
    id: "stem-storage", name: "Storage and file sizes", stage: "KS4", year: 10, strand: "STEM", prereqs: ["stem-binary"],
    blurb: "Calculate how many bits and bytes are needed to store text, pictures and sound.",
    explainer: "8 bits make 1 byte. A picture is a grid of pixels, and each pixel needs some bits for its colour. Bigger pictures and more colours need more storage.",
    parentNote: "Storage calculations are number work with real meaning: pixels × bits per pixel gives bits, and dividing by 8 gives bytes. This is why photos are big and why compression matters.",
    talkAbout: "Why does a bigger picture take more storage?",
  }, (r, l) => {
    if (l === 1) { const b = int(r, 2, 20) * 8; return { prompt: `How many bytes is ${b} bits? (8 bits make 1 byte.) Type the number.`, value: b / 8, hint: "Divide the bits by 8.", solution: [`${b} ÷ 8 = ${b / 8}.`] }; }
    if (l === 2) { const w = pick(r, [8, 16, 32]), h = pick(r, [8, 16]), bpp = pick(r, [1, 8, 24]); return { figure: table(["Width", "Height", "Bits per pixel"], [[`${w} pixels`, `${h} pixels`, bpp]], `A picture ${w} pixels wide, ${h} pixels tall, ${bpp} bits per pixel.`), prompt: `A black-and-white style picture is ${w} pixels wide and ${h} pixels tall, with ${bpp} bit${bpp > 1 ? "s" : ""} per pixel. How many bits does it need?`, value: w * h * bpp, hint: "Multiply the width, the height and the bits per pixel.", solution: [`${w} × ${h} = ${w * h} pixels.`, `${w * h} × ${bpp} = ${w * h * bpp} bits.`] }; }
    const w = pick(r, [8, 16, 32, 64]), h = pick(r, [8, 16, 32]), bpp = pick(r, [8, 16, 24]);
    return { figure: table(["Width", "Height", "Bits per pixel"], [[`${w} pixels`, `${h} pixels`, bpp]], `An image ${w} pixels wide, ${h} pixels tall, ${bpp} bits per pixel.`), prompt: `An image is ${w} pixels wide and ${h} pixels tall, with ${bpp} bits per pixel. How many bytes of storage does it need? Type the number.`, value: (w * h * bpp) / 8, hint: "Work out the bits first, then divide by 8.", solution: [`${w} × ${h} × ${bpp} = ${w * h * bpp} bits.`, `${w * h * bpp} ÷ 8 = ${(w * h * bpp) / 8} bytes.`] };
  }),
  num({
    id: "stem-gradient-descent", name: "Learning by going downhill", stage: "KS5", year: 12, strand: "STEM", prereqs: ["differentiate"],
    blurb: "Take a step of gradient descent, the method that trains neural networks.",
    explainer: "A model has an error, called its loss. Gradient descent finds the slope of the loss and takes a small step downhill, again and again, until the error is small.",
    parentNote: "For loss = (w − a)², the gradient is 2(w − a). A new weight is: old weight − learning rate × gradient. This is the basic step that trains almost every modern AI.",
    talkAbout: "What would happen if the step (learning rate) was far too big?",
  }, (r, l) => {
    const a = int(r, 2, 8), d = pick(r, [2, 4, 6, 8]), w = a + d;
    const bowl = { type: "function-graph" as const, xMin: 0, xMax: 16, yMin: 0, yMax: 80, xStep: 2, yStep: 20, curves: [{ pts: Array.from({ length: 33 }, (_, i) => [i / 2, ((i / 2) - a) ** 2] as [number, number]), label: "loss" }], marks: [{ x: w, y: d * d, label: "w" }], alt: `A bowl-shaped graph of the loss (w − ${a}) squared, with its lowest point at w = ${a}. The model starts at w = ${w}, up the side of the bowl.` };
    if (l === 1) return { figure: bowl, prompt: `A model's loss is $(w - ${a})^2$. Its gradient is $2(w - ${a})$. What is the gradient when $w = ${w}$?`, value: 2 * d, hint: "Put the value of w into 2(w − a).", solution: [`2 × (${w} − ${a}) = 2 × ${d} = ${2 * d}.`] };
    const eta = pick(r, [0.1, 0.25, 0.5]);
    if (l === 2) return { figure: bowl, prompt: `The loss is $(w - ${a})^2$ with gradient $2(w - ${a})$. At $w = ${w}$ the learning rate is ${eta}. What is the new value of $w$ after one step, where new w = w − learning rate × gradient?`, value: round(w - eta * 2 * d, 4), hint: "Find the gradient, multiply by the learning rate, and take it away from w.", solution: [`Gradient: 2 × ${d} = ${2 * d}.`, `Step: ${eta} × ${2 * d} = ${round(eta * 2 * d, 4)}.`, `New w = ${w} − ${round(eta * 2 * d, 4)} = ${round(w - eta * 2 * d, 4)}.`] };
    const w1 = w - 0.5 * 2 * d, d1 = w1 - a;
    return { figure: bowl, prompt: `The loss is $(w - ${a})^2$ with gradient $2(w - ${a})$, and the learning rate is 0.5. Starting at $w = ${w}$, take two steps. What is $w$ after the second step?`, value: round(w1 - 0.5 * 2 * d1, 4), hint: "Do one step, then use the new w for the next step.", solution: [`Step 1: gradient ${2 * d}, new w = ${w} − ${d} = ${w1}.`, `Step 2: gradient ${2 * d1}, new w = ${w1} − ${d1} = ${round(w1 - d1, 4)}.`] };
  }),
  num({
    id: "stem-spam", name: "Probability and the spam filter", stage: "KS4", year: 11, strand: "STEM", prereqs: ["pct-amount"],
    blurb: "Use counts to find the chance that an email is spam, given that it contains a word.",
    explainer: "A spam filter learns that some words are more common in spam. If a word appears in many spam emails and few good ones, an email with that word is probably spam.",
    parentNote: "This is the idea behind Bayes' theorem. Natural frequencies (counting out of a big number) make it much easier than fractions of fractions.",
    talkAbout: "Why does a word being common in spam not make every email with it spam?",
  }, (r, l) => {
    const pairs: [number, number][] = [[3, 1], [1, 1], [4, 1], [9, 1], [1, 3], [3, 2], [7, 3]];
    const [a0, b0] = pick(r, pairs), m = int(r, 2, 8), a = a0 * m, b = b0 * m, pct = (a / (a + b)) * 100;
    if (l === 1) return { figure: table(["", "Spam", "Not spam"], [['Contain "prize"', a, b]], `Emails containing "prize": ${a} spam and ${b} not spam.`), prompt: `Of emails containing the word "prize", ${a} are spam and ${b} are not. What percentage of emails containing "prize" are spam?`, value: pct, unit: "%", hint: "Spam divided by all emails with the word, times 100.", solution: [`Total with the word: ${a} + ${b} = ${a + b}.`, `${a} ÷ ${a + b} × 100 = ${pct}.`] };
    if (l === 2) { const spamTotal = a + int(r, 10, 60), goodTotal = b + int(r, 100, 400); return { figure: table(["", "Spam", "Good"], [["All emails", spamTotal, goodTotal], ['With "prize"', a, b]], `Counts of spam and good emails: ${spamTotal} and ${goodTotal} in total, with the word "prize" in ${a} spam and ${b} good.`), prompt: `A filter looked at ${spamTotal} spam emails and ${goodTotal} good emails. The word "prize" appeared in ${a} of the spam emails and ${b} of the good emails. Of all the emails containing "prize", what percentage are spam?`, value: pct, unit: "%", hint: "Only emails containing the word count. Ignore the totals.", solution: [`Emails with "prize": ${a} + ${b} = ${a + b}.`, `${a} ÷ ${a + b} × 100 = ${pct}.`] }; }
    const N = 1000, combos: { S: number; w: number; h: number; pct: number }[] = [];
    for (const S of [0.1, 0.2, 0.5]) for (const w of [0.4, 0.5, 0.6, 0.8]) for (const h of [0.05, 0.1, 0.2, 0.25]) { const sp = N * S * w, gd = N * (1 - S) * h, p = (sp / (sp + gd)) * 100; if (Math.abs(p - Math.round(p)) < 1e-9) combos.push({ S, w, h, pct: Math.round(p) }); }
    const c = pick(r, combos), sp = N * c.S * c.w, gd = N * (1 - c.S) * c.h;
    return { figure: table(["", "Spam", "Good"], [[`Out of ${N}`, N * c.S, N * (1 - c.S)], ['Have "free"', `${Math.round(c.w * 100)}%`, `${Math.round(c.h * 100)}%`]], `Of ${N} emails, ${N * c.S} are spam. "free" appears in ${Math.round(c.w * 100)}% of spam and ${Math.round(c.h * 100)}% of good emails.`), prompt: `Out of ${N} emails, ${N * c.S} are spam. The word "free" appears in ${Math.round(c.w * 100)}% of spam emails and in ${Math.round(c.h * 100)}% of good emails. Of all emails containing "free", what percentage are spam?`, value: c.pct, unit: "%", hint: `Count how many spam emails and how many good emails contain "free". Then divide spam by the total.`, solution: [`Spam with "free": ${N * c.S} × ${c.w} = ${sp}.`, `Good with "free": ${N * (1 - c.S)} × ${c.h} = ${gd}.`, `${sp} ÷ ${sp + gd} × 100 = ${c.pct}.`] };
  }),
  choiceSkill({
    id: "stem-caesar", name: "Secret codes: Caesar cipher", stage: "KS4", year: 10, strand: "STEM", prereqs: ["stem-binary"],
    blurb: "Encrypt and decrypt messages by shifting letters, and use remainders to wrap around the alphabet.",
    explainer: "A Caesar cipher shifts every letter along the alphabet by the same amount. After Z, you go back round to A. This 'wrapping round' is called modular arithmetic.",
    parentNote: "Caesar ciphers are easy to crack, but they introduce the key ideas of encryption: a key, encrypting, decrypting. Modern encryption uses modular arithmetic with very large numbers.",
    talkAbout: "Why is a Caesar cipher easy to crack?",
  }, (r, l) => {
    const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", k = int(r, 1, 7);
    const alpha = { type: "alphabet" as const, note: `Shift: ${k}`, alt: `The alphabet with each letter's position, A = 0 to Z = 25. The shift is ${k}.` };
    if (l === 1) { const i = int(r, 0, 18); const right = L[i + k]; return { figure: alpha, prompt: `Encrypt the letter ${L[i]} with a Caesar shift of ${k}.`, right, others: [L[i + k + 1], L[i + k - 1], L[(i + 2 * k) % 26]].filter((x) => x !== right), hint: `Count ${k} letters forward in the alphabet.`, solution: [`${L[i]} moves ${k} places on to ${right}.`] }; }
    if (l === 2) { const i = int(r, k, 25); const c = L[i], right = L[i - k]; return { figure: alpha, prompt: `A message was encrypted with a Caesar shift of ${k}. One letter in the secret message is ${c}. What was the original letter?`, right, others: [L[(i + k) % 26], L[Math.max(0, i - k - 1)], L[Math.min(25, i - k + 1)]].filter((x) => x !== right), hint: `To decrypt, go back ${k} letters.`, solution: [`Go back ${k} from ${c}: ${right}.`] }; }
    const i = int(r, 20, 25), right = L[(i + k) % 26];
    return { figure: alpha, prompt: `Encrypt the letter ${L[i]} with a shift of ${k}. Remember the alphabet wraps from Z back to A. (Position of A = 0, so the new position is (${i} + ${k}) mod 26.)`, right, others: [L[(i + k + 1) % 26], L[(i + k - 1) % 26], L[Math.min(25, i + k)]].filter((x) => x !== right), hint: "If you go past Z, carry on from A.", solution: [`${i} + ${k} = ${i + k}. After taking away 26 if needed: ${(i + k) % 26}.`, `Position ${(i + k) % 26} is ${right}.`] };
  }),
  choiceSkill({
    id: "stem-quantum-ideas", name: "Quantum ideas", stage: "KS4", year: 11, strand: "STEM", prereqs: [],
    blurb: "Meet the big ideas of quantum physics: energy comes in packets, and nature at tiny scales works with probabilities.",
    explainer: "At the scale of atoms, energy comes in tiny packets called quanta. Light is made of packets called photons, and tiny particles don't have exact positions until they are measured.",
    parentNote: "Quantum physics describes the very small. The ideas feel strange, but they have been tested very carefully. We keep to the simple, true statements here: quantised energy, photons, probabilities and measurement.",
    talkAbout: "Why do you think quantum effects aren't noticeable in everyday life?",
  }, (r, l) => {
    const easy: [string, string, string[], string][] = [
      ["Light can be thought of as tiny packets of energy. What are these packets called?", "Photons", ["Atoms", "Molecules", "Magnets"], "Light comes in packets of energy called photons."],
      ["In an atom, an electron can have energy only at certain fixed levels. What word describes this?", "Quantised", ["Liquid", "Magnetic", "Random colours"], "Energy that can only take certain separate values is called quantised."],
      ["What does the word 'quantum' roughly mean?", "A small packet or amount", ["A very large machine", "A type of metal", "A speed"], "A quantum is a smallest packet of something, such as energy."],
    ];
    const hard: [string, string, string[], string][] = [
      ["Quantum theory can predict the chances of different results when you measure a tiny particle. What can it not do?", "Say exactly which result you'll get on a single measurement", ["Predict anything at all", "Say what happens on average over many measurements", "Work for atoms"], "It gives probabilities for single results, which add up reliably over many measurements."],
      ["When light shines on some metals, electrons are knocked out only if the light's frequency is high enough. Brighter light of low frequency doesn't help. What does this suggest?", "Each photon carries a packet of energy that depends on frequency", ["Light is a liquid", "Brighter light always has more energy per photon", "Electrons are not affected by light"], "The energy of one photon depends on frequency, so low-frequency photons can't free an electron however many there are."],
      ["Why don't we notice quantum effects when a ball rolls across a table?", "The packets of energy are tiny compared with the energy of everyday objects", ["Balls are not made of atoms", "Quantum physics only works in space", "Quantum effects are switched off by gravity"], "Quantum effects are tiny, so everyday objects look smooth and predictable."],
    ];
    const [q, right, others, why] = pick(r, l === 1 ? easy : l === 2 ? [...easy, ...hard.slice(2)] : hard);
    return { prompt: q, right, others, hint: "Think about what happens at the very smallest scales.", solution: [why] };
  }),

  // ============================================================ Key Stage 5
  num({
    id: "stem-qubit", name: "Qubits and probability", stage: "KS5", year: 12, strand: "STEM", prereqs: ["stem-quantum-ideas"],
    blurb: "Use the amplitudes of a qubit to find the chances of measuring 0 or 1.",
    explainer: "A classical bit is 0 or 1. A qubit can be in a mix of both, described by two numbers called amplitudes. The chance of each result is the amplitude squared.",
    parentNote: "A qubit state is a|0⟩ + b|1⟩, where a² + b² = 1 (real amplitudes, to keep it simple). Measuring gives 0 with probability a² and 1 with probability b². Amplitudes can also be negative or complex, which matters for interference.",
    talkAbout: "Why must the two probabilities add up to 1?",
  }, (r, l) => {
    const [a, b] = pick(r, [[0.6, 0.8], [0.8, 0.6], [0.28, 0.96], [0.96, 0.28], [0.36, 0.48]].slice(0, 4)) as [number, number];
    if (l === 1) return { prompt: `A qubit has amplitudes ${a} for |0⟩ and ${b} for |1⟩. What is the probability, as a percentage, of measuring 1?`, value: round(b * b * 100, 4), unit: "%", hint: "Square the amplitude of |1⟩, then change to a percentage.", solution: [`${b}² = ${round(b * b, 4)}.`, `As a percentage: ${round(b * b * 100, 4)}%.`] };
    if (l === 2) return { prompt: `A qubit has amplitudes ${a} for |0⟩ and ${b} for |1⟩. What is the probability, as a percentage, of measuring 0?`, value: round(a * a * 100, 4), unit: "%", hint: "Square the amplitude of |0⟩, then change to a percentage.", solution: [`${a}² = ${round(a * a, 4)}.`, `As a percentage: ${round(a * a * 100, 4)}%.`] };
    const k = pick(r, [1, 2]), x = 3 * k, y = 4 * k, tot = x * x + y * y;
    return { prompt: `A qubit is in the state ${x}|0⟩ + ${y}|1⟩, which isn't yet normalised (the squares don't add to 1). The chance of 1 is the square of its amplitude divided by the sum of the squares. What is the probability of measuring 1, as a percentage?`, value: round((y * y * 100) / tot, 4), unit: "%", hint: `Sum of squares: ${x}² + ${y}². Then divide ${y}² by that.`, solution: [`${x}² + ${y}² = ${tot}.`, `${y}² ÷ ${tot} = ${round((y * y) / tot, 4)}, which is ${round((y * y * 100) / tot, 4)}%.`] };
  }),
  num({
    id: "stem-qubit-states", name: "How many states can qubits hold?", stage: "KS5", year: 12, strand: "STEM", prereqs: ["index-laws"],
    blurb: "See how the number of possible measurement outcomes doubles with each extra qubit.",
    explainer: "One qubit has 2 possible results (0 or 1). Two qubits have 4 (00, 01, 10, 11). Each extra qubit doubles the number, so n qubits have 2ⁿ outcomes.",
    parentNote: "Describing n qubits needs 2ⁿ amplitudes, which grows very fast. That's why simulating a quantum computer on an ordinary one gets hard quickly, and it's part of why quantum computers could be powerful for some problems.",
    talkAbout: "What does doubling again and again do to a number?",
  }, (r, l) => {
    if (l === 1) { const n = int(r, 2, 5); return { prompt: `How many different results (such as 000, 001, …) can you measure from ${n} qubits?`, value: 2 ** n, hint: "Each qubit doubles the number of outcomes.", solution: [`2 × 2 × … (${n} times) = ${2 ** n}.`] }; }
    if (l === 2) { const n = int(r, 8, 12); return { prompt: `How many amplitudes are needed to describe ${n} qubits? (There is one for each possible outcome.)`, value: 2 ** n, hint: "That's 2 to the power of the number of qubits.", solution: [`$2^{${n}} = ${2 ** n}$.`] }; }
    const n = int(r, 4, 10);
    return { prompt: `A quantum computer has outcomes that can each be one of ${2 ** n} possibilities. What is the smallest number of qubits needed?`, value: n, hint: "Which power of 2 gives this number?", solution: [`$2^{${n}} = ${2 ** n}$, so ${n} qubits.`] };
  }),
  choiceSkill({
    id: "stem-quantum-gates", name: "Quantum gates", stage: "KS5", year: 13, strand: "STEM", prereqs: ["stem-qubit"],
    blurb: "Follow what the X and H gates do to a qubit, and work out the chance of each result.",
    explainer: "Quantum gates change a qubit's state. The X gate swaps 0 and 1. The H (Hadamard) gate turns a definite 0 or 1 into an equal mix of both. Applying H twice undoes it.",
    parentNote: "The X gate is the quantum version of NOT. The H gate puts a qubit into an equal superposition, so measuring gives 0 or 1 with a 50% chance each. Applying H twice gives back the starting state, which is an example of interference.",
    talkAbout: "How is the X gate like the NOT gate from classical logic?",
  }, (r, l) => {
    const sets: [string, string, string][] = [
      ["A qubit starts as |0⟩. You apply the X gate and then measure. What is the chance of measuring 1?", "100%", "X swaps 0 and 1, so |0⟩ becomes |1⟩: certain."],
      ["A qubit starts as |0⟩. You apply the X gate twice and then measure. What is the chance of measuring 1?", "0%", "X twice swaps back to the start, |0⟩."],
      ["A qubit starts as |0⟩. You apply the H gate and then measure. What is the chance of measuring 1?", "50%", "H makes an equal mix of |0⟩ and |1⟩."],
      ["A qubit starts as |0⟩. You apply the H gate twice and then measure. What is the chance of measuring 1?", "0%", "H twice undoes itself and gives |0⟩ again."],
      ["A qubit starts as |1⟩. You apply the X gate and then measure. What is the chance of measuring 1?", "0%", "X swaps |1⟩ into |0⟩."],
    ];
    const [q, right, why] = pick(r, l === 1 ? sets.slice(0, 2) : l === 2 ? sets.slice(0, 3).concat(sets.slice(4)) : sets.slice(2));
    return { prompt: q, right, others: ["0%", "25%", "50%", "100%"].filter((x) => x !== right).slice(0, 3), hint: "Follow the qubit through each gate, one at a time.", solution: [why] };
  }),
  num({
    id: "stem-network-layer", name: "A neural network layer", stage: "KS5", year: 13, strand: "STEM", prereqs: ["stem-neuron"],
    blurb: "Calculate the output of a layer of a neural network using a weights table (matrix), inputs, bias and ReLU.",
    explainer: "A neural network layer multiplies a list of inputs by a table of weights, adds a bias to each result, and then applies an activation function. ReLU turns any negative number into 0.",
    parentNote: "This is matrix–vector multiplication followed by a simple non-linear step. Stacking many such layers, with weights found by gradient descent, gives a deep neural network.",
    talkAbout: "Why might a network need an activation function like ReLU?",
  }, (r, l) => {
    const W = [[int(r, -2, 3), int(r, -2, 3)], [int(r, -2, 3), int(r, -2, 3)]], x = [int(r, 1, 4), int(r, 1, 4)], b = [int(r, -4, 4), int(r, -4, 4)];
    const row = int(r, 0, 1), z = W[row][0] * x[0] + W[row][1] * x[1], zb = z + b[row];
    const M = `$\\begin{pmatrix} ${W[0][0]} & ${W[0][1]} \\\\ ${W[1][0]} & ${W[1][1]} \\end{pmatrix}$`, v = `$\\begin{pmatrix} ${x[0]} \\\\ ${x[1]} \\end{pmatrix}$`;
    if (l === 1) return { prompt: `A layer has weights ${M} and the input is ${v}. What is the ${row === 0 ? "first" : "second"} number of the output (weights × input, before any bias)?`, value: z, hint: `Take row ${row + 1} of the weights, multiply by the input numbers and add.`, solution: [`${W[row][0]} × ${x[0]} + ${W[row][1]} × ${x[1]} = ${z}.`] };
    if (l === 2) return { prompt: `A layer has weights ${M}, input ${v} and bias $(${b[0]}, ${b[1]})$. What is the ${row === 0 ? "first" : "second"} number of weights × input + bias?`, value: zb, hint: "Multiply row by input, add them, then add the bias for that row.", solution: [`${W[row][0]} × ${x[0]} + ${W[row][1]} × ${x[1]} = ${z}.`, `${z} + (${b[row]}) = ${zb}.`] };
    return { prompt: `A layer has weights ${M}, input ${v} and bias $(${b[0]}, ${b[1]})$. After ReLU (negative numbers become 0), what is the ${row === 0 ? "first" : "second"} number of the output?`, value: Math.max(0, zb), hint: "Work out the number with the bias, then replace it with 0 if it's negative.", solution: [`${W[row][0]} × ${x[0]} + ${W[row][1]} × ${x[1]} + (${b[row]}) = ${zb}.`, zb < 0 ? `${zb} is negative, so ReLU gives 0.` : `${zb} is not negative, so ReLU leaves it as ${zb}.`] };
  }),
  num({
    id: "stem-information", name: "Information and bits", stage: "KS5", year: 12, strand: "STEM", prereqs: ["log-laws"],
    blurb: "Measure information in bits: how many yes/no questions are needed to pin down one outcome.",
    explainer: "A bit is the answer to one yes/no question. If there are 8 equally likely outcomes, you need 3 questions to find the right one, so there are 3 bits of information.",
    parentNote: "Information theory, started by Claude Shannon, measures surprise in bits: log₂ of the number of equally likely options. It sits behind compression, encryption and machine learning.",
    talkAbout: "Why do repeated halvings of the possibilities link to powers of 2?",
  }, (r, l) => {
    if (l === 1) { const k = int(r, 2, 7); return { prompt: `You are thinking of a number from 1 to ${2 ** k}. How many yes/no questions (each halving the possibilities) are needed to be certain of it?`, value: k, hint: `Halve ${2 ** k} again and again until you reach 1. Count the halvings.`, solution: [`$2^{${k}} = ${2 ** k}$.`, `So ${k} questions are needed.`] }; }
    if (l === 2) { const n = pick(r, [10, 20, 100, 1000]); return { prompt: `You are thinking of a number from 1 to ${n}. What is the smallest number of yes/no questions that is always enough? (Round up.)`, value: Math.ceil(Math.log2(n)), hint: "Find the smallest power of 2 that is at least as big as the number of options.", solution: [`$2^{${Math.ceil(Math.log2(n)) - 1}} = ${2 ** (Math.ceil(Math.log2(n)) - 1)}$ is too small, and $2^{${Math.ceil(Math.log2(n))}} = ${2 ** Math.ceil(Math.log2(n))}$ is enough.`, `So ${Math.ceil(Math.log2(n))} questions.`] }; }
    const n = int(r, 3, 12);
    return { prompt: `You flip a fair coin ${n} times and record each result. How many bits of information is that in total? (Each flip is one yes/no outcome.)`, value: n, hint: "Each fair coin flip carries one bit.", solution: [`One bit per flip, so ${n} bits.`] };
  }),
];

