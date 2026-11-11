import { int, pick, round } from "../engine/rng";
import { toLatex as polyLatex, type Poly } from "../engine/poly";
import type { Skill } from "../engine/types";
import { choiceSkill, exprSkill, fracSkill } from "./build";
import { num } from "./ks2";

/** Key Stage 3 (Years 7 to 9): the foundations GCSE rests on. Each question works out its own answer. */
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const primeFactors = (n: number) => { const out: number[] = []; for (let p = 2; p * p <= n; p++) while (n % p === 0) { out.push(p); n /= p; } if (n > 1) out.push(n); return out; };

export const ks3Skills: Skill[] = [
  // ---------------------------------------------------------------- Year 7
  num({
    id: "prime-factors", name: "Prime factors", stage: "KS3", year: 7, strand: "Number", prereqs: ["factors-multiples"],
    blurb: "Break a number into prime factors, and read powers of primes.",
    explainer: "Every whole number bigger than 1 is a product of primes. A factor tree breaks it down step by step.",
    parentNote: "Divide by the smallest prime that fits, again and again. Write repeats as powers: 2 × 2 × 3 = 2² × 3.",
    talkAbout: "Why do we start by dividing by 2, then 3, then 5?",
  }, (r, l) => {
    const pool = l === 1 ? [30, 42, 66, 70, 78, 105] : l === 2 ? [72, 60, 84, 90, 108, 126, 150] : [180, 360, 540, 600, 720, 900];
    const n = pick(r, pool), f = primeFactors(n), counts = new Map<number, number>();
    f.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1));
    const asPowers = [...counts].map(([p, c]) => (c > 1 ? `${p}^{${c}}` : `${p}`)).join(" \\times ");
    if (l === 1) return { prompt: `What is the largest prime factor of ${n}?`, value: Math.max(...f), hint: "Break the number into primes first.", solution: [`${n} = ${f.join(" × ")}.`, `The largest prime is ${Math.max(...f)}.`] };
    if (l === 2) return { prompt: `How many prime factors does ${n} have when you count repeats? For example, 12 = 2 × 2 × 3 has 3.`, value: f.length, hint: "Write the number as a product of primes and count them.", solution: [`${n} = ${f.join(" × ")}.`, `That is ${f.length} prime factors.`] };
    const p = pick(r, [...counts.keys()]);
    return { prompt: `${n} written as a product of prime factors is $${asPowers}$. What is the power of ${p}?`, value: counts.get(p)!, hint: `Count how many times ${p} appears.`, solution: [`${n} = ${f.join(" × ")} = $${asPowers}$.`, `${p} appears ${counts.get(p)} time${counts.get(p)! > 1 ? "s" : ""}.`] };
  }),
  num({
    id: "sig-figs", name: "Significant figures and estimating", stage: "KS3", year: 7, strand: "Number", prereqs: ["rounding"],
    blurb: "Round to significant figures, and estimate a calculation by rounding.",
    explainer: "Significant figures count from the first digit that is not zero. To estimate, round every number to 1 significant figure first.",
    parentNote: "The first significant figure is the first non-zero digit. Estimating first shows whether an exact answer is sensible.",
    talkAbout: "How could an estimate tell you that you pressed the wrong button on a calculator?",
  }, (r, l) => {
    if (l === 1) { const n = int(r, 1100, 9899), v = Math.round(n / 100) * 100; return { prompt: `Round ${n} to 2 significant figures.`, value: v, hint: "The first two digits are the 2 significant figures. Look at the next digit to round.", solution: [`The first two digits are ${String(n).slice(0, 2)}.`, `Rounding to the nearest hundred gives ${v}.`] }; }
    if (l === 2) { const n = int(r, 1000, 9999) / 1e6, v = round(n, 4); return { prompt: `Round ${n} to 2 significant figures.`, value: v, hint: "Leading zeros are not significant. Count from the first digit that is not zero.", solution: [`The first two significant figures are the first two digits after the zeros.`, `Rounded to 2 significant figures: ${v}.`] }; }
    const a = int(r, 31, 69), b = int(r, 21, 39), c = pick(r, [0.5, 0.2]), ea = Math.round(a / 10) * 10, eb = Math.round(b / 10) * 10;
    return { prompt: `Estimate $\\frac{${a} \\times ${b}}{${c * 10 === 5 ? "0.5" : "0.2"}}$ by rounding each number to 1 significant figure.`, value: (ea * eb) / c, hint: `Round ${a} to ${ea} and ${b} to ${eb}. Then calculate.`, solution: [`${a} ≈ ${ea}, ${b} ≈ ${eb}.`, `${ea} × ${eb} = ${ea * eb}.`, `${ea * eb} ÷ ${c} = ${(ea * eb) / c}.`] };
  }),
  fracSkill({
    id: "mixed-number-ops", name: "Adding and subtracting mixed numbers", stage: "KS3", year: 7, strand: "Number", prereqs: ["mixed-numbers", "frac-add"],
    blurb: "Add and subtract mixed numbers, giving the answer as an improper fraction.",
    explainer: "Change each mixed number into an improper fraction, give them the same bottom number, then add or take away.",
    parentNote: "A mixed number such as 2 3/4 is 11/4. Make the denominators match before adding. Simplify at the end.",
    talkAbout: "Would it be easier to add the whole numbers and the fractions separately, or to change both to improper fractions?",
  }, (r, l) => {
    const d = pick(r, l === 1 ? [4, 5, 6, 8] : [6, 8, 9, 10, 12]), w1 = int(r, 2, 5), w2 = int(r, 1, w1 - 1), n1 = int(r, 1, d - 1), n2 = int(r, 1, d - 1);
    const sub = l >= 2, A = w1 * d + n1, B = w2 * d + n2, N = sub ? A - B : A + B, g = gcd(N, d);
    return { prompt: `Work out $${w1}\\frac{${n1}}{${d}} ${sub ? "-" : "+"} ${w2}\\frac{${n2}}{${d}}$. Give the answer as an improper fraction in its simplest form.`, n: N / g, d: d / g, hint: "Change both mixed numbers to improper fractions first.", solution: [`$${w1}\\frac{${n1}}{${d}} = \\frac{${A}}{${d}}$ and $${w2}\\frac{${n2}}{${d}} = \\frac{${B}}{${d}}$.`, `$\\frac{${A}}{${d}} ${sub ? "-" : "+"} \\frac{${B}}{${d}} = \\frac{${N}}{${d}}$.`, g > 1 ? `Simplify by ${g}: $\\frac{${N / g}}{${d / g}}$.` : `It is already in its simplest form.`] };
  }),
  num({
    id: "ratio-problems", name: "Ratio problems", stage: "KS3", year: 7, strand: "Ratio", prereqs: ["ratio-share"],
    blurb: "Solve ratio problems when you are given one share or the difference between two shares.",
    explainer: "Find what one part is worth, then use it to find any share or the total.",
    parentNote: "Add the parts to see how many equal parts there are. If you are told one share, divide to find the value of one part.",
    talkAbout: "How do you find the value of one part when you know one share?",
  }, (r, l) => {
    let a = int(r, 2, 5), b = a + int(r, 1, 4);
    while (gcd(a, b) !== 1) { a = int(r, 2, 5); b = a + int(r, 1, 4); }
    const part = int(r, 3, 12);
    if (l === 1) return { prompt: `Amy and Ben share some sweets in the ratio ${a} : ${b}. Amy gets ${a * part} sweets. How many sweets are there altogether?`, value: (a + b) * part, hint: "Find the value of one part first.", solution: [`${a} parts = ${a * part}, so 1 part = ${part}.`, `${a + b} parts × ${part} = ${(a + b) * part}.`] };
    if (l === 2) return { prompt: `Two people share money in the ratio ${a} : ${b}. The difference between their shares is £${(b - a) * part}. How much is the bigger share in pounds?`, value: b * part, hint: "The difference in parts is worth the difference in money.", solution: [`${b} − ${a} = ${b - a} parts is worth £${(b - a) * part}.`, `So 1 part is £${part}, and the bigger share is ${b} × £${part} = £${b * part}.`] };
    const c = b + int(r, 1, 3);
    return { prompt: `Money is shared in the ratio ${a} : ${b} : ${c}. The smallest share is £${a * part}. How much is the largest share in pounds?`, value: c * part, hint: "Find one part, then multiply by the largest number in the ratio.", solution: [`${a} parts = £${a * part}, so 1 part = £${part}.`, `${c} × £${part} = £${c * part}.`] };
  }),
  num({
    id: "direct-proportion", name: "Proportion problems", stage: "KS3", year: 7, strand: "Ratio", prereqs: ["division"],
    blurb: "Use the unitary method for direct proportion, and halve the time when you double the workers.",
    explainer: "If 5 pens cost £3.50, one pen costs £3.50 ÷ 5. Find the cost of one first, then multiply.",
    parentNote: "Find the value of one, then multiply by how many you want. Check: more items should cost more.",
    talkAbout: "How can you check whether your answer is sensible?",
  }, (r, l) => {
    const one = int(r, 3, 15) * (l === 1 ? 2 : 1), n = int(r, 3, 9), m = n + int(r, 2, 9);
    if (l === 1) return { prompt: `${n} notebooks cost £${one * n}. How much do ${m} notebooks cost in pounds?`, value: one * m, hint: "Find the cost of one notebook first.", solution: [`£${one * n} ÷ ${n} = £${one} for one.`, `£${one} × ${m} = £${one * m}.`] };
    if (l === 2) { const speed = int(r, 3, 12); return { prompt: `A machine makes ${speed * n} bottles in ${n} minutes. How many bottles does it make in ${m} minutes?`, value: speed * m, hint: "Find how many it makes in 1 minute.", solution: [`${speed * n} ÷ ${n} = ${speed} bottles per minute.`, `${speed} × ${m} = ${speed * m}.`] }; }
    const w = pick(r, [2, 3, 4, 6]), d = pick(r, [6, 8, 12]);
    return { prompt: `${w} workers take ${d} days to dig a trench, all working at the same rate. How many days would ${w * 2} workers take?`, value: d / 2, hint: "Twice as many workers take half as long.", solution: [`${w} × ${d} = ${w * d} worker-days of work.`, `${w * d} ÷ ${w * 2} = ${d / 2} days.`] };
  }),
  num({
    id: "compound-area", name: "Area of compound shapes", stage: "KS3", year: 7, strand: "Measures", prereqs: ["area-triangle"],
    blurb: "Split a compound shape into rectangles and triangles, and add or subtract their areas.",
    explainer: "Cut the shape into simple pieces you know the area of. Work out each area, then add them together.",
    parentNote: "Draw dotted lines to split the shape. Check you have used each part once. Sometimes it is easier to take a piece away from a big rectangle.",
    talkAbout: "Is there more than one way to split this shape?",
  }, (r, l) => {
    const w = int(r, 6, 14), h = int(r, 4, 9);
    if (l === 1) { const b = int(r, 2, 5), c = int(r, 2, 4); return { prompt: `An L-shape is a ${w} cm by ${h} cm rectangle with a ${b} cm by ${c} cm rectangle cut from one corner. What is its area in cm²?`, value: w * h - b * c, unit: "cm²", hint: "Take the cut-out away from the big rectangle.", solution: [`${w} × ${h} = ${w * h}.`, `${b} × ${c} = ${b * c}.`, `${w * h} − ${b * c} = ${w * h - b * c}.`] }; }
    if (l === 2) { const th = 2 * int(r, 2, 4); return { prompt: `A house shape is a ${w} cm by ${h} cm rectangle with a triangle of base ${w} cm and height ${th} cm on top. What is the total area in cm²?`, value: w * h + (w * th) / 2, unit: "cm²", hint: "Add the area of the rectangle and the area of the triangle.", solution: [`Rectangle: ${w} × ${h} = ${w * h}.`, `Triangle: ½ × ${w} × ${th} = ${(w * th) / 2}.`, `${w * h} + ${(w * th) / 2} = ${w * h + (w * th) / 2}.`] }; }
    const t = int(r, 3, 6), a = int(r, 6, 12), b = a + int(r, 2, 6);
    return { prompt: `A trapezium has parallel sides of ${a} cm and ${b} cm, and a height of ${t * 2} cm. A ${t} cm by ${t} cm square is cut out of it. What is the area left in cm²?`, value: ((a + b) * t * 2) / 2 - t * t, unit: "cm²", hint: "Work out the trapezium, then take the square away.", solution: [`Trapezium: ½ × (${a} + ${b}) × ${t * 2} = ${((a + b) * t * 2) / 2}.`, `Square: ${t} × ${t} = ${t * t}.`, `${((a + b) * t * 2) / 2} − ${t * t} = ${((a + b) * t * 2) / 2 - t * t}.`] };
  }),

  // ---------------------------------------------------------------- Year 8
  num({
    id: "substitute-negatives", name: "Substituting negative numbers", stage: "KS3", year: 8, strand: "Algebra", prereqs: ["substitute", "negative-ops"],
    blurb: "Substitute negative numbers into expressions and formulae.",
    explainer: "Put the number in brackets when you substitute a negative. Then follow the order of operations.",
    parentNote: "Brackets around a negative keep the signs right: x² when x = −4 is (−4)² = 16, not −16.",
    talkAbout: "Why does (−3)² give a positive answer?",
  }, (r, l) => {
    const x = -int(r, 2, 6), a = int(r, 2, 6), b = int(r, 1, 9);
    if (l === 1) return { prompt: `Work out $${a}x + ${b}$ when $x = ${x}$.`, value: a * x + b, hint: "Put the number in brackets.", solution: [`$${a} \\times (${x}) + ${b} = ${a * x} + ${b} = ${a * x + b}$.`] };
    if (l === 2) return { prompt: `Work out $x^{2} - ${a}x$ when $x = ${x}$.`, value: x * x - a * x, hint: "Square first, then multiply, then subtract. Careful with the signs.", solution: [`$(${x})^{2} = ${x * x}$.`, `$${a} \\times (${x}) = ${a * x}$.`, `$${x * x} - (${a * x}) = ${x * x - a * x}$.`] };
    const y = int(r, 2, 5);
    return { prompt: `Work out $${a}x^{2} - ${b}y$ when $x = ${x}$ and $y = -${y}$.`, value: a * x * x + b * y, hint: "Square the x first. Taking away a negative adds.", solution: [`$${a} \\times (${x})^{2} = ${a * x * x}$.`, `$${b} \\times (-${y}) = ${-b * y}$.`, `$${a * x * x} - (${-b * y}) = ${a * x * x + b * y}$.`] };
  }),
  exprSkill({
    id: "factorise-common", name: "Factorising with a common factor", stage: "KS3", year: 8, strand: "Algebra", prereqs: ["expand-single"],
    blurb: "Factorise expressions by taking out the highest common factor.",
    explainer: "Factorising is expanding backwards. Find the biggest number (and letter) that goes into every term and write it outside brackets.",
    parentNote: "Find the highest common factor of the terms. Divide each term by it and write the results in brackets. Expand to check.",
    talkAbout: "How can you check your factorised answer is right?",
  }, (r, l) => {
    const k = int(r, 2, 9);
    let p = int(r, 1, 6), q = int(r, 1, 7);
    while (gcd(p, q) !== 1) { p = int(r, 1, 6); q = int(r, 1, 7); }
    if (l === 1) { const value: Poly = [k * q, k * p]; return { prompt: `Factorise $${polyLatex(value)}$ fully.`, value, form: "factorised", shown: `$${k}(${polyLatex([q, p])})$`, hint: "What is the biggest number that goes into both terms?", solution: [`The highest common factor of ${k * p} and ${k * q} is ${k}.`, `$${polyLatex(value)} = ${k}(${polyLatex([q, p])})$.`] }; }
    if (l === 2) { const value: Poly = [-k * q, k * p]; return { prompt: `Factorise $${polyLatex(value)}$ fully.`, value, form: "factorised", shown: `$${k}(${polyLatex([-q, p])})$`, hint: "Take out the highest common factor of both terms.", solution: [`The highest common factor is ${k}.`, `$${polyLatex(value)} = ${k}(${polyLatex([-q, p])})$.`] }; }
    const value: Poly = [0, k * q, k * p]; return { prompt: `Factorise $${polyLatex(value)}$ fully.`, value, form: "factorised", shown: `$${k}x(${polyLatex([q, p])})$`, hint: "Both terms have a number in common and also an x.", solution: [`The highest common factor of ${k * p}x² and ${k * q}x is ${k}x.`, `$${polyLatex(value)} = ${k}x(${polyLatex([q, p])})$.`] };
  }),
  num({
    id: "inequalities", name: "Solving inequalities", stage: "KS3", year: 8, strand: "Algebra", prereqs: ["solve-linear"],
    blurb: "Solve linear inequalities and find the largest or smallest whole number that works.",
    explainer: "Solve an inequality like an equation. If you multiply or divide by a negative number, the inequality sign flips.",
    parentNote: "Treat the inequality sign like an equals sign, but remember that dividing by a negative reverses it. Test a value to check.",
    talkAbout: "Why does the sign flip when you divide by a negative number?",
  }, (r, l) => {
    const a = int(r, 2, 7), x = int(r, 2, 9), b = int(r, 1, 9);
    if (l === 1) return { prompt: `Solve $x + ${b} < ${x + b}$. What is the largest whole number that $x$ can be?`, value: x - 1, hint: "Solve it like an equation. The inequality is strict, so x cannot equal the boundary.", solution: [`$x < ${x}$.`, `The largest whole number below ${x} is ${x - 1}.`] };
    if (l === 2) return { prompt: `Solve $${a}x + ${b} \\le ${a * x + b + 1}$. What is the largest whole number that $x$ can be?`, value: x, hint: "Take away the number, then divide.", solution: [`$${a}x \\le ${a * x + 1}$, so $x \\le ${round((a * x + 1) / a, 2)}$.`, `The largest whole number is ${x}.`] };
    return { prompt: `Solve $-${a}x > ${a * x}$. What is the largest whole number that $x$ can be?`, value: -x - 1, hint: "Dividing by a negative number flips the inequality sign.", solution: [`Divide by $-${a}$ and flip the sign: $x < -${x}$.`, `The largest whole number below $-${x}$ is $${-x - 1}$.`] };
  }),
  num({
    id: "nth-term", name: "The nth term", stage: "KS3", year: 8, strand: "Algebra", prereqs: ["sequences"],
    blurb: "Find the rule for the nth term of a linear sequence, and use it.",
    explainer: "In a linear sequence the nth term is an + b. The number a is the difference between terms.",
    parentNote: "The difference gives the number in front of n. Compare the sequence with the times table of that number to find b.",
    talkAbout: "How do you know what number goes in front of n?",
  }, (r, l) => {
    const a = int(r, 2, 9), b = int(r, -4, 9), seq = [1, 2, 3, 4].map((n) => a * n + b);
    if (l === 1) return { prompt: `The sequence ${seq.join(", ")}, … has nth term $an + b$. What is $a$?`, value: a, hint: "Find the difference between the terms.", solution: [`${seq[1]} − ${seq[0]} = ${a}.`, `So $a = ${a}$.`] };
    if (l === 2) return { prompt: `The sequence ${seq.join(", ")}, … has nth term $${a}n + b$. What is $b$?`, value: b, hint: `Compare with the ${a} times table.`, solution: [`The ${a} times table starts ${a}, ${2 * a}, ${3 * a}, …`, `${seq[0]} − ${a} = ${b}, so $b = ${b}$.`] };
    const n = int(r, 15, 40);
    return { prompt: `The nth term of a sequence is $${a}n ${b < 0 ? "-" : "+"} ${Math.abs(b)}$. Which term of the sequence is equal to ${a * n + b}?`, value: n, hint: "Set the nth term equal to the number and solve.", solution: [`$${a}n ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${a * n + b}$.`, `$${a}n = ${a * n}$, so $n = ${n}$.`] };
  }),
  num({
    id: "transformations", name: "Transformations", stage: "KS3", year: 8, strand: "Geometry", prereqs: ["coordinates-four-quadrants"],
    blurb: "Translate, reflect, rotate and enlarge points on a coordinate grid.",
    explainer: "A translation slides a shape. A reflection flips it over a mirror line. A rotation turns it. An enlargement changes its size.",
    parentNote: "Move one point at a time. For a reflection, each point is the same distance from the mirror line on the other side.",
    talkAbout: "How can you check a reflection is the right distance from the mirror line?",
  }, (r, l) => {
    const x = int(r, -6, 6), y = int(r, -6, 6);
    if (l === 1) { const dx = int(r, -5, 5), dy = int(r, -5, 5); return { prompt: `The point (${x}, ${y}) is translated by the vector $\\begin{pmatrix} ${dx} \\\\ ${dy} \\end{pmatrix}$. What is the new y-coordinate?`, value: y + dy, hint: "The bottom number moves the point up or down.", solution: [`${y} + (${dy}) = ${y + dy}.`] }; }
    if (l === 2) { const k = int(r, 1, 5); return { prompt: `The point (${x}, ${y}) is reflected in the line $x = ${k}$. What is the new x-coordinate?`, value: 2 * k - x, hint: "The point and its image are the same distance from the line.", solution: [`The point is ${x} − ${k} = ${x - k} from the line (a negative number means it is to the left).`, `The image is the same distance on the other side: ${k} − (${x - k}) = ${2 * k - x}.`] }; }
    const k = int(r, 2, 4);
    return r() < 0.5
      ? { prompt: `The point (${x}, ${y}) is rotated 90° anticlockwise about the origin. What is the new x-coordinate? (Hint: (x, y) becomes (−y, x).)`, value: -y, hint: "A 90° anticlockwise rotation takes (x, y) to (−y, x).", solution: [`(${x}, ${y}) becomes (${-y}, ${x}).`, `The new x-coordinate is ${-y}.`] }
      : { prompt: `The point (${x}, ${y}) is enlarged by scale factor ${k} with the origin as the centre. What is the new y-coordinate?`, value: k * y, hint: "Multiply both coordinates by the scale factor.", solution: [`${k} × (${y}) = ${k * y}.`] };
  }),
  num({
    id: "frequency-mean", name: "Averages from tables", stage: "KS3", year: 8, strand: "Statistics", prereqs: ["averages"],
    blurb: "Find the total frequency and the mean from a frequency table.",
    explainer: "Multiply each value by how many times it happens, add the results, then divide by the total frequency.",
    parentNote: "Make a third row for value × frequency. The mean is the sum of that row divided by the sum of the frequencies.",
    talkAbout: "Why do we multiply the value by the frequency?",
  }, (r, l) => {
    const vals = [1, 2, 3, 4], freq = vals.map(() => int(r, 2, 8));
    const table = vals.map((v, i) => `${v} → ${freq[i]}`).join(", ");
    const total = freq.reduce((a, b) => a + b, 0), sum = vals.reduce((a, v, i) => a + v * freq[i], 0);
    if (l === 1) return { prompt: `A survey records how many pets each child has (number of pets → number of children): ${table}. How many children were surveyed?`, value: total, hint: "Add up the frequencies.", solution: [`${freq.join(" + ")} = ${total}.`] };
    if (l === 2) return { prompt: `A survey records how many pets each child has (number of pets → number of children): ${table}. How many pets are there altogether?`, value: sum, hint: "Multiply each number of pets by how many children, then add.", solution: [vals.map((v, i) => `${v} × ${freq[i]} = ${v * freq[i]}`).join(", ") + ".", `Total: ${sum}.`] };
    const f2 = [4, 6, 8, 2], v2 = [1, 2, 3, 4], tot = 20, s2 = v2.reduce((a, v, i) => a + v * f2[i], 0);
    return { prompt: `Pets per child (number of pets → number of children): 1 → 4, 2 → 6, 3 → 8, 4 → 2. What is the mean number of pets per child?`, value: s2 / tot, hint: "Divide the total number of pets by the number of children.", solution: [`Pets: 1×4 + 2×6 + 3×8 + 4×2 = ${s2}.`, `Children: 4 + 6 + 8 + 2 = ${tot}.`, `${s2} ÷ ${tot} = ${s2 / tot}.`] };
  }),
  num({
    id: "outcomes", name: "Listing outcomes", stage: "KS3", year: 8, strand: "Statistics", prereqs: ["probability-fractions"],
    blurb: "List all the possible outcomes of two events, and count the ways of getting a total.",
    explainer: "Write every outcome in an organised list or a table, so you do not miss any. The total number of outcomes is the product of the numbers of choices.",
    parentNote: "Use a two-way table: rows for one event, columns for the other. Count the cells that match.",
    talkAbout: "How does an organised list make sure you do not miss an outcome?",
  }, (r, l) => {
    if (l === 1) { const a = int(r, 2, 4), b = int(r, 3, 6); return { prompt: `A spinner has ${a} equal sections and a dice has ${b} faces. How many different outcomes are there when you spin and roll?`, value: a * b, hint: "Multiply the number of choices.", solution: [`${a} × ${b} = ${a * b}.`] }; }
    const total = int(r, 4, 10);
    const ways = Array.from({ length: 6 }, (_, i) => i + 1).filter((d) => total - d >= 1 && total - d <= 6).length;
    if (l === 2) return { prompt: `Two fair dice are rolled and the scores are added. In how many ways can the total be ${total}?`, value: ways, hint: "List the pairs that add to the total.", solution: [`The pairs are ${Array.from({ length: 6 }, (_, i) => i + 1).filter((d) => total - d >= 1 && total - d <= 6).map((d) => `(${d}, ${total - d})`).join(", ")}.`, `That is ${ways} ways.`] };
    const atLeast = int(r, 8, 11), count = [1, 2, 3, 4, 5, 6].reduce((n, d1) => n + [1, 2, 3, 4, 5, 6].filter((d2) => d1 + d2 >= atLeast).length, 0);
    return { prompt: `Two fair dice are rolled and the scores are added. In how many of the 36 outcomes is the total at least ${atLeast}?`, value: count, hint: "Count the ways for each total from the target up to 12.", solution: [`Count the pairs with a total of ${atLeast} or more.`, `There are ${count} outcomes out of 36.`] };
  }),

  // ---------------------------------------------------------------- Year 9
  num({
    id: "line-equation", name: "Equation of a straight line", stage: "KS3", year: 9, strand: "Algebra", prereqs: ["linear-gradient"],
    blurb: "Use y = mx + c: find the gradient and intercept, and work out a point on the line.",
    explainer: "In y = mx + c, m is the gradient and c is where the line crosses the y-axis.",
    parentNote: "Parallel lines have the same gradient. To find c, put a known point into y = mx + c.",
    talkAbout: "What does c tell you about where the line is on the graph?",
  }, (r, l) => {
    const m = int(r, 2, 6) * (r() < 0.4 ? -1 : 1), c = int(r, -6, 8), x = int(r, 2, 6);
    const eq = `y = ${m === 1 ? "" : m === -1 ? "-" : m}x ${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
    if (l === 1) return { prompt: `A line has the equation $${eq}$. What is the value of $y$ when $x = ${x}$?`, value: m * x + c, hint: "Put the value of x into the equation.", solution: [`$y = ${m} \\times ${x} ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${m * x + c}$.`] };
    if (l === 2) { const x1 = int(r, 1, 3), x2 = x1 + int(r, 1, 3); return { prompt: `A straight line goes through (${x1}, ${m * x1 + c}) and (${x2}, ${m * x2 + c}). The equation is $y = mx + c$. What is $c$?`, value: c, hint: "First find the gradient m, then put one point into the equation.", solution: [`m = (${m * x2 + c} − ${m * x1 + c}) ÷ (${x2} − ${x1}) = ${m}.`, `${m * x1 + c} = ${m} × ${x1} + c, so c = ${c}.`] }; }
    const k = int(r, 1, 4), c2 = int(r, -8, -1);
    return { prompt: `A line is parallel to $${eq}$ and crosses the y-axis at $(0, ${c2})$. What is the value of $y$ on this line when $x = ${k}$?`, value: m * k + c2, hint: "Parallel lines have the same gradient.", solution: [`The gradient is ${m}, so the line is $y = ${m}x ${c2 < 0 ? "-" : "+"} ${Math.abs(c2)}$.`, `When x = ${k}: ${m} × ${k} + (${c2}) = ${m * k + c2}.`] };
  }),
  num({
    id: "bearings", name: "Bearings", stage: "KS3", year: 9, strand: "Geometry", prereqs: ["angles-parallel"],
    blurb: "Use three-figure bearings, and find the back bearing.",
    explainer: "A bearing is an angle measured clockwise from north, written with three figures. To go back the other way, add or subtract 180°.",
    parentNote: "Always measure clockwise from north. The back bearing: add 180° if the bearing is under 180°, and subtract 180° if it is over.",
    talkAbout: "Why does the back bearing differ by 180°?",
  }, (r, l) => {
    const b = l === 1 ? int(r, 10, 170) : l === 2 ? int(r, 190, 350) : int(r, 20, 340);
    const back = b < 180 ? b + 180 : b - 180, pad = (n: number) => String(n).padStart(3, "0");
    if (l <= 2) return { prompt: `The bearing of B from A is ${pad(b)}°. What is the bearing of A from B? Type the number of degrees.`, value: back, unit: "°", hint: b < 180 ? "Add 180°." : "Subtract 180°.", solution: [`${b} ${b < 180 ? "+" : "−"} 180 = ${back}.`, `The bearing of A from B is ${pad(back)}°.`] };
    const turn = int(r, 30, 90);
    const nb = (b + turn) % 360;
    return { prompt: `A ship sails on a bearing of ${pad(b)}°. It then turns ${turn}° clockwise. What is its new bearing? Type the number of degrees.`, value: nb, unit: "°", hint: "Turning clockwise adds to the bearing. If it goes past 360°, take 360° off.", solution: [`${b} + ${turn} = ${b + turn}.`, b + turn >= 360 ? `${b + turn} − 360 = ${nb}.` : `The new bearing is ${pad(nb)}°.`] };
  }),
  num({
    id: "cylinder-volume", name: "Volume of a cylinder", stage: "KS3", year: 9, strand: "Measures", prereqs: ["circumference", "volume-prisms"],
    blurb: "Find the volume of a cylinder from its radius and height.",
    explainer: "A cylinder is a prism with a circle for its cross-section. Volume = area of the circle × height.",
    parentNote: "Area of the circle is π × radius × radius. Multiply by the height. Check the units are cubed.",
    talkAbout: "Why can you treat a cylinder like a prism?",
  }, (r, l) => {
    const rad = int(r, 2, 8), h = int(r, 3, 12), area = round(3.14 * rad * rad, 2);
    if (l === 1) return { prompt: `The base of a cylinder has an area of ${area} cm². The cylinder is ${h} cm tall. What is its volume in cm³?`, value: round(area * h, 2), unit: "cm³", hint: "Volume = base area × height.", solution: [`${area} × ${h} = ${round(area * h, 2)}.`] };
    if (l === 2) return { prompt: `A cylinder has a radius of ${rad} cm and a height of ${h} cm. Use $\\pi = 3.14$. What is its volume in cm³?`, value: round(3.14 * rad * rad * h, 2), unit: "cm³", hint: "Find the area of the circle first.", solution: [`Area = 3.14 × ${rad} × ${rad} = ${area}.`, `Volume = ${area} × ${h} = ${round(area * h, 2)}.`] };
    return { prompt: `A cylindrical tin has a diameter of ${rad * 2} cm and a height of ${h} cm. Use $\\pi = 3.14$. What is its volume in cm³?`, value: round(3.14 * rad * rad * h, 2), unit: "cm³", hint: "The radius is half the diameter.", solution: [`Radius = ${rad * 2} ÷ 2 = ${rad} cm.`, `Area = 3.14 × ${rad}² = ${area}.`, `Volume = ${area} × ${h} = ${round(area * h, 2)}.`] };
  }),
  num({
    id: "venn-counts", name: "Venn diagrams", stage: "KS3", year: 9, strand: "Statistics", prereqs: ["probability-fractions"],
    blurb: "Use Venn diagrams to find how many are in both sets, either, or neither.",
    explainer: "The overlap holds the people in both sets. Add the two sets and take off the overlap once, because it was counted twice.",
    parentNote: "Fill in the middle (both) first, then the rest of each circle, then the outside. Everything must add up to the total.",
    talkAbout: "Why do you take off the overlap once when you add two sets?",
  }, (r, l) => {
    const both = int(r, 3, 9), onlyA = int(r, 4, 12), onlyB = int(r, 3, 11), none = int(r, 2, 8);
    const A = onlyA + both, B = onlyB + both, total = onlyA + onlyB + both + none;
    if (l === 1) return { prompt: `In a class, ${A} children play football and ${B} play tennis. ${both} play both. How many play football only?`, value: onlyA, hint: "Take the ones who play both away from the football total.", solution: [`${A} − ${both} = ${onlyA}.`] };
    if (l === 2) return { prompt: `In a class, ${A} children play football and ${B} play tennis. ${both} play both. How many play at least one of the sports?`, value: onlyA + onlyB + both, hint: "Add the two totals and take off the overlap once.", solution: [`${A} + ${B} − ${both} = ${onlyA + onlyB + both}.`] };
    return { prompt: `There are ${total} children in a year group. ${A} play football and ${B} play tennis. ${both} play both. How many play neither?`, value: none, hint: "Find how many play at least one sport, then take that from the total.", solution: [`At least one: ${A} + ${B} − ${both} = ${onlyA + onlyB + both}.`, `${total} − ${onlyA + onlyB + both} = ${none}.`] };
  }),
  choiceSkill({
    id: "correlation", name: "Scatter graphs and correlation", stage: "KS3", year: 9, strand: "Statistics", prereqs: ["averages"],
    blurb: "Describe the type of correlation shown by data, and know that correlation is not cause.",
    explainer: "Positive correlation: both go up together. Negative correlation: one goes up as the other goes down. No correlation: no pattern.",
    parentNote: "Sketch a few dots going up, down or all over the place. Two things that go together do not always cause each other.",
    talkAbout: "Can you think of two things that rise together but one does not cause the other?",
  }, (r, l) => {
    const sets: [string, string, string][] = [
      ["The temperature outside rises, and more ice creams are sold.", "positive correlation", "Both increase together."],
      ["The more a car is driven, the lower its value.", "negative correlation", "As one goes up the other goes down."],
      ["The age of a person and the number of letters in their first name.", "no correlation", "There is no pattern between them."],
      ["The higher a candle is burned, the shorter it gets.", "negative correlation", "As the time goes up, the height goes down."],
      ["Taller people tend to have bigger feet.", "positive correlation", "Both increase together."],
    ];
    const [text, right, why] = pick(r, l === 1 ? sets.slice(0, 3) : sets);
    return { prompt: `${text} What type of correlation does a scatter graph of this show?`, right, others: ["positive correlation", "negative correlation", "no correlation"].filter((x) => x !== right), hint: "Think about what happens to one thing as the other goes up.", solution: [why, `So it is ${right}.`] };
  }),
];

