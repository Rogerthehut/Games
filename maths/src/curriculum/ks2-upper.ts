import { int, pick, round } from "../engine/rng";
import { circleFig, parallelogramFig, similarPairFig, solidByName } from "./figures";
import type { Skill } from "../engine/types";
import { num } from "./ks2";

/** Key Stage 2, Years 5 and 6: more of the gaps in docs/ROADMAP.md. Each question works out its own answer. */
const place = (n: number) => n.toLocaleString("en-GB");
const neg = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
const isPrime = (n: number) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };

export const ks2UpperSkills: Skill[] = [
  // ---------------------------------------------------------------- Year 5
  num({
    id: "large-numbers", name: "Numbers to a million", stage: "KS2", year: 5, strand: "Number", prereqs: ["place-value"],
    blurb: "Read, write and compare numbers to 1,000,000, and multiply and divide by 10, 100 and 1,000.",
    explainer: "Each place is ten times bigger than the one on its right. Multiplying by 10 moves every digit one place to the left.",
    parentNote: "Say big numbers aloud in chunks: 345,207 is three hundred and forty-five thousand, two hundred and seven. A place-value chart helps with the zeros.",
    talkAbout: "What happens to the digits when you multiply by 1,000?",
  }, (r, l) => {
    if (l === 1) {
      const digits = Array.from({ length: 6 }, () => int(r, 1, 9)), k = int(r, 0, 5), n = Number(digits.join(""));
      const names = ["hundred thousands", "ten thousands", "thousands", "hundreds", "tens", "ones"], v = digits[k] * 10 ** (5 - k);
      return { prompt: `In the number ${place(n)}, what is the value of the digit ${digits[k]} in the ${names[k]} place?`, value: v, hint: "Think about which column the digit is in.", solution: [`The digit ${digits[k]} is in the ${names[k]} place.`, `Its value is ${place(v)}.`] };
    }
    if (l === 2) {
      const base = int(r, 12, 98) * 10 + int(r, 0, 9), m = pick(r, [10, 100, 1000]), up = r() < 0.6;
      return up
        ? { prompt: `What is ${place(base)} × ${place(m)}?`, value: base * m, hint: `Each digit moves ${String(m).length - 1} place${m > 10 ? "s" : ""} to the left.`, solution: [`${place(base)} × ${place(m)} = ${place(base * m)}.`] }
        : { prompt: `What is ${place(base * m)} ÷ ${place(m)}?`, value: base, hint: `Each digit moves ${String(m).length - 1} place${m > 10 ? "s" : ""} to the right.`, solution: [`${place(base * m)} ÷ ${place(m)} = ${place(base)}.`] };
    }
    const a = int(r, 1, 9), b = int(r, 1, 9), c = int(r, 1, 9), d = int(r, 1, 9), e = int(r, 0, 9), f = int(r, 0, 9);
    const n = a * 100000 + b * 10000 + c * 1000 + d * 100 + e * 10 + f;
    return { prompt: `Write ${a * 100000} + ${b * 10000} + ${c * 1000} + ${d * 100} + ${e * 10} + ${f} as one number, with no commas.`, value: n, hint: "Put each part in its own column.", solution: [`${place(a * 100000)} + ${place(b * 10000)} + ${place(c * 1000)} + ${d * 100} + ${e * 10} + ${f}`, `= ${place(n)}.`] };
  }),
  num({
    id: "primes-squares-cubes", name: "Prime, square and cube numbers", stage: "KS2", year: 5, strand: "Number", prereqs: ["factors-multiples"],
    blurb: "Know prime numbers up to 19, and use square and cube numbers.",
    explainer: "A prime number has exactly two factors: 1 and itself. A square number is a number times itself, and a cube is a number times itself three times.",
    parentNote: "2 is the only even prime, and 1 is not prime. A square number can be drawn as a square of dots: 4 × 4 = 16.",
    talkAbout: "How can you tell that 21 is not a prime number?",
  }, (r, l) => {
    if (l === 1) { const n = int(r, 3, 12); return { prompt: `What is ${n} squared? (${n} × ${n})`, value: n * n, hint: "Multiply the number by itself.", solution: [`${n} × ${n} = ${n * n}.`] }; }
    if (l === 2) {
      if (r() < 0.5) { const n = int(r, 2, 5); return { prompt: `What is ${n} cubed? (${n} × ${n} × ${n})`, value: n ** 3, hint: "Multiply the number by itself, and then by itself again.", solution: [`${n} × ${n} = ${n * n}.`, `${n * n} × ${n} = ${n ** 3}.`] }; }
      const start = int(r, 14, 30); let p = start + 1; while (!isPrime(p)) p++;
      return { prompt: `What is the smallest prime number that is bigger than ${start}?`, value: p, hint: "Check each number in turn. A prime has only two factors.", solution: [`Check the numbers after ${start} one by one.`, `${p} has only two factors, 1 and ${p}, so it is prime.`] };
    }
    const lo = int(r, 2, 4) * 10, hi = lo + 20, primes: number[] = [];
    for (let i = lo + 1; i < hi; i++) if (isPrime(i)) primes.push(i);
    return { prompt: `How many prime numbers are there between ${lo} and ${hi}?`, value: primes.length, hint: "A prime is only divisible by 1 and itself. Check each number.", solution: [`The primes between ${lo} and ${hi} are ${primes.join(", ")}.`, `That is ${primes.length} primes.`] };
  }),
  num({
    id: "frac-times-whole", name: "Multiplying fractions by whole numbers", stage: "KS2", year: 5, strand: "Number", prereqs: ["frac-equiv", "mixed-numbers"],
    blurb: "Multiply a fraction by a whole number, and write the answer as a mixed number.",
    explainer: "3 lots of two-fifths is six-fifths. Multiply the top number by the whole number. The bottom number stays the same.",
    parentNote: "Think of repeated addition: 3 × 2/5 = 2/5 + 2/5 + 2/5. If the top is bigger than the bottom, turn it into a mixed number.",
    talkAbout: "Why does the bottom number not change when you multiply?",
  }, (r, l) => {
    const d = int(r, 3, 9), n = int(r, 1, d - 1), k = int(r, 2, 6);
    if (l === 1) return { prompt: `$${k} \\times \\frac{${n}}{${d}} = \\frac{?}{${d}}$. What is the missing top number?`, value: k * n, hint: "Multiply the top number by the whole number.", solution: [`${k} × ${n} = ${k * n}.`, `So the answer is $\\frac{${k * n}}{${d}}$.`] };
    if (l === 2) { const total = k * n; return { prompt: `${k} friends each eat $\\frac{${n}}{${d}}$ of a pizza. What fraction of a pizza is eaten altogether? Give the top number of $\\frac{?}{${d}}$.`, value: total, hint: `Multiply ${k} lots of the fraction.`, solution: [`${k} × ${n} = ${total}.`, `$\\frac{${total}}{${d}}$ of a pizza is eaten.`] }; }
    let nn = int(r, 2, d - 1), kk = int(r, 2, 6), whole = Math.floor((kk * nn) / d);
    while (whole < 1 || (kk * nn) % d === 0) { nn = int(r, 2, d - 1); kk = int(r, 2, 6); whole = Math.floor((kk * nn) / d); }
    const rem = (kk * nn) % d;
    return { prompt: `$${kk} \\times \\frac{${nn}}{${d}}$ as a mixed number is ${whole} and $\\frac{?}{${d}}$. What is the missing top number?`, value: rem, hint: "Multiply first, then see how many wholes you can make.", solution: [`${kk} × ${nn} = ${kk * nn}, so the answer is $\\frac{${kk * nn}}{${d}}$.`, `${d} goes into ${kk * nn} ${whole} time${whole > 1 ? "s" : ""}, with ${rem} left over.`, `So it is ${whole} and $\\frac{${rem}}{${d}}$.`] };
  }),
  num({
    id: "shapes-3d", name: "3-D shapes", stage: "KS2", year: 5, strand: "Geometry", prereqs: [],
    blurb: "Count the faces, edges and vertices of 3-D shapes.",
    explainer: "A face is a flat side. An edge is where two faces meet. A vertex is a corner.",
    parentNote: "Hold a cereal box or a tent-shaped box and count together: faces first, then edges, then corners. Euler's rule: faces + vertices − edges is always 2.",
    talkAbout: "How can you keep track so you don't count an edge twice?",
  }, (r, l) => {
    const shapes: [string, number, number, number][] = [
      ["cube", 6, 12, 8], ["cuboid", 6, 12, 8], ["triangular prism", 5, 9, 6], ["square-based pyramid", 5, 8, 5],
      ["triangular-based pyramid", 4, 6, 4], ["hexagonal prism", 8, 18, 12], ["pentagonal prism", 7, 15, 10],
    ];
    const pool = l === 1 ? shapes.slice(0, 2) : l === 2 ? shapes.slice(2, 5) : shapes.slice(3);
    const [name, f, e, v] = pick(r, pool), which = pick(r, [["faces", f], ["edges", e], ["vertices", v]] as [string, number][]);
    return { figure: solidByName(name), prompt: `How many ${which[0]} does a ${name} have?`, value: which[1], hint: which[0] === "vertices" ? "A vertex is a corner." : which[0] === "edges" ? "An edge is where two faces meet." : "A face is a flat side.", solution: [`A ${name} has ${f} faces, ${e} edges and ${v} vertices.`, `So the number of ${which[0]} is ${which[1]}.`] };
  }),
  num({
    id: "imperial-metric", name: "Metric and imperial units", stage: "KS2", year: 5, strand: "Measures", prereqs: ["measures-convert"],
    blurb: "Convert between common metric and imperial units using a given rule, such as inches and centimetres, or miles and kilometres.",
    explainer: "Some measurements use old units, like inches and miles. The question gives a rule that links them, so use the rule.",
    parentNote: "The rules are approximate: 1 inch is about 2.5 cm, and 5 miles is about 8 km. Work out how many lots of the rule fit, then multiply.",
    talkAbout: "How many lots of the rule did you need?",
  }, (r, l) => {
    if (l === 1) { const n = int(r, 2, 12) * 2; return { prompt: `1 inch is about 2.5 cm. About how many cm is ${n} inches?`, value: n * 2.5, unit: "cm", hint: "Multiply by 2.5.", solution: [`${n} × 2.5 = ${n * 2.5}.`] }; }
    if (l === 2) { const k = int(r, 2, 8) * 5; return { prompt: `5 miles is about 8 km. About how many km is ${k} miles?`, value: (k / 5) * 8, unit: "km", hint: "Find how many lots of 5 miles there are.", solution: [`${k} ÷ 5 = ${k / 5} lots.`, `${k / 5} × 8 = ${(k / 5) * 8}.`] }; }
    const k = int(r, 2, 9) * 8; return { prompt: `5 miles is about 8 km. About how many miles is ${k} km?`, value: (k / 8) * 5, hint: "Find how many lots of 8 km there are.", solution: [`${k} ÷ 8 = ${k / 8} lots.`, `${k / 8} × 5 = ${(k / 8) * 5} miles.`] };
  }),

  // ---------------------------------------------------------------- Year 6
  num({
    id: "frac-multiply", name: "Multiplying fractions", stage: "KS2", year: 6, strand: "Number", prereqs: ["frac-equiv"],
    blurb: "Multiply proper fractions together.",
    explainer: "To multiply fractions, multiply the top numbers together and the bottom numbers together.",
    parentNote: "Draw a rectangle: shade 3/4 of it one way and 1/2 the other way, and count the double-shaded squares. Tops times tops, bottoms times bottoms.",
    talkAbout: "Why is a half of a half a quarter?",
  }, (r, l) => {
    if (l === 1) { const a = int(r, 2, 6), b = int(r, 2, 6); return { prompt: `$\\frac{1}{${a}} \\times \\frac{1}{${b}} = \\frac{1}{?}$. What is the missing bottom number?`, value: a * b, hint: "Multiply the bottom numbers.", solution: [`${a} × ${b} = ${a * b}.`, `So the answer is $\\frac{1}{${a * b}}$.`] }; }
    const d1 = int(r, 2, 6), d2 = int(r, 3, 7), n1 = int(r, 1, d1 - 1), n2 = int(r, 1, d2 - 1);
    if (l === 2) return { prompt: `$\\frac{${n1}}{${d1}} \\times \\frac{${n2}}{${d2}} = \\frac{?}{${d1 * d2}}$. What is the missing top number?`, value: n1 * n2, hint: "Multiply the top numbers together.", solution: [`${n1} × ${n2} = ${n1 * n2}.`, `${d1} × ${d2} = ${d1 * d2}.`, `So the answer is $\\frac{${n1 * n2}}{${d1 * d2}}$.`] };
    return { prompt: `What is $\\frac{${n1}}{${d1}}$ of $\\frac{${n2}}{${d2}}$? Give the top number of $\\frac{?}{${d1 * d2}}$.`, value: n1 * n2, hint: "'Of' means multiply.", solution: [`$\\frac{${n1}}{${d1}} \\times \\frac{${n2}}{${d2}}$: top numbers ${n1} × ${n2} = ${n1 * n2}, bottom numbers ${d1} × ${d2} = ${d1 * d2}.`, `The answer is $\\frac{${n1 * n2}}{${d1 * d2}}$.`] };
  }),
  num({
    id: "frac-divide", name: "Dividing fractions by whole numbers", stage: "KS2", year: 6, strand: "Number", prereqs: ["frac-equiv"],
    blurb: "Divide a proper fraction by a whole number.",
    explainer: "Dividing a fraction by a whole number makes the pieces smaller. Multiply the bottom number by the whole number.",
    parentNote: "Share half a pizza between 3 people: each gets a sixth of the whole pizza. The bottom number gets bigger because the pieces get smaller.",
    talkAbout: "Why does the bottom number get bigger when you divide?",
  }, (r, l) => {
    const d = int(r, 2, 6), k = int(r, 2, 5);
    if (l === 1) return { prompt: `$\\frac{1}{${d}} \\div ${k} = \\frac{1}{?}$. What is the missing bottom number?`, value: d * k, hint: "Multiply the bottom number by the whole number.", solution: [`${d} × ${k} = ${d * k}.`, `So the answer is $\\frac{1}{${d * k}}$.`] };
    if (l === 2) { const n = int(r, 2, 5); return { prompt: `$\\frac{${n}}{${d + n}} \\div ${k} = \\frac{${n}}{?}$. What is the missing bottom number?`, value: (d + n) * k, hint: "Multiply the bottom number by the whole number.", solution: [`${d + n} × ${k} = ${(d + n) * k}.`, `So the answer is $\\frac{${n}}{${(d + n) * k}}$.`] }; }
    return { prompt: `$\\frac{1}{${d}}$ of a cake is shared equally between ${k} children. Each child gets $\\frac{1}{?}$ of the whole cake. What is the missing bottom number?`, value: d * k, hint: "Sharing into more parts makes each part smaller.", solution: [`$\\frac{1}{${d}} \\div ${k}$: ${d} × ${k} = ${d * k}.`, `Each child gets $\\frac{1}{${d * k}}$ of the whole cake.`] };
  }),
  num({
    id: "fdp-convert", name: "Fractions, decimals and percentages", stage: "KS2", year: 6, strand: "Number", prereqs: ["decimals", "frac-equiv"],
    blurb: "Change between fractions, decimals and percentages.",
    explainer: "A percentage is a fraction out of 100. Divide the top by the bottom to get a decimal, and times by 100 to get a percentage.",
    parentNote: "Learn the common ones: 1/2 = 0.5 = 50%, 1/4 = 0.25 = 25%, 1/10 = 0.1 = 10%, 1/5 = 0.2 = 20%. Make the bottom 100 where you can.",
    talkAbout: "How could you turn a fraction into a percentage?",
  }, (r, l) => {
    if (l === 1) {
      const [n, d] = pick(r, [[1, 2], [1, 4], [3, 4], [1, 10], [3, 10], [7, 10], [1, 5], [2, 5]] as [number, number][]);
      return r() < 0.5
        ? { prompt: `Write $\\frac{${n}}{${d}}$ as a decimal.`, value: round(n / d, 2), hint: "Divide the top number by the bottom number.", solution: [`${n} ÷ ${d} = ${round(n / d, 2)}.`] }
        : { prompt: `Write $\\frac{${n}}{${d}}$ as a percentage. Type the number only.`, value: round((100 * n) / d, 1), hint: "Make the bottom number 100, or work out the decimal and times it by 100.", solution: [`${n} ÷ ${d} = ${round(n / d, 2)}.`, `${round(n / d, 2)} × 100 = ${round((100 * n) / d, 1)}%.`] };
    }
    if (l === 2) {
      const [n, d] = pick(r, [[3, 5], [7, 20], [9, 20], [3, 25], [11, 20], [13, 50], [4, 5], [17, 20]] as [number, number][]);
      return r() < 0.5
        ? { prompt: `Write $\\frac{${n}}{${d}}$ as a decimal.`, value: round(n / d, 3), hint: "Make the bottom number 100 first, then write it as a decimal.", solution: [`$\\frac{${n}}{${d}} = \\frac{${(100 / d) * n}}{100}$.`, `That is ${round(n / d, 3)}.`] }
        : { prompt: `Write $\\frac{${n}}{${d}}$ as a percentage. Type the number only.`, value: (100 * n) / d, hint: "Make the bottom number 100.", solution: [`$\\frac{${n}}{${d}} = \\frac{${(100 / d) * n}}{100}$.`, `So it is ${(100 / d) * n}%.`] };
    }
    const [n, d] = pick(r, [[1, 8], [3, 8], [5, 8], [7, 8], [3, 40], [9, 40]] as [number, number][]);
    return r() < 0.5
      ? { prompt: `Write $\\frac{${n}}{${d}}$ as a decimal.`, value: round(n / d, 4), hint: "Divide the top number by the bottom number.", solution: [`${n} ÷ ${d} = ${round(n / d, 4)}.`] }
      : { prompt: `Write $\\frac{${n}}{${d}}$ as a percentage. Type the number only.`, value: round((100 * n) / d, 2), hint: "Divide, then multiply by 100.", solution: [`${n} ÷ ${d} = ${round(n / d, 4)}.`, `${round(n / d, 4)} × 100 = ${round((100 * n) / d, 2)}%.`] };
  }),
  num({
    id: "scale-factor", name: "Scale factors and maps", stage: "KS2", year: 6, strand: "Ratio", prereqs: ["ratio-share"],
    blurb: "Use scale factors to enlarge shapes, and use map scales.",
    explainer: "A scale factor tells you how many times bigger a shape is. Multiply every length by the scale factor.",
    parentNote: "Every length is multiplied by the same number, but the angles stay the same. A map scale of 1:50,000 means 1 cm on the map is 50,000 cm in real life.",
    talkAbout: "What do you multiply by to go from the small shape to the big one?",
  }, (r, l) => {
    if (l === 1) { const k = int(r, 2, 5), a = int(r, 3, 9); return { figure: similarPairFig("rect", `${a} cm`, "?", k), prompt: `A shape is enlarged by scale factor ${k}. A side that was ${a} cm long becomes how long in cm?`, value: a * k, unit: "cm", hint: "Multiply the length by the scale factor.", solution: [`${a} × ${k} = ${a * k}.`] }; }
    if (l === 2) { const k = int(r, 2, 6), a = int(r, 3, 8); return { figure: similarPairFig("rect", `${a} cm`, `${a * k} cm`, k), prompt: `A shape is enlarged. A side of ${a} cm becomes ${a * k} cm. What is the scale factor?`, value: k, hint: "Divide the new length by the old length.", solution: [`${a * k} ÷ ${a} = ${k}.`] }; }
    const cm = pick(r, [2, 4, 6, 8]); return { prompt: `A map has a scale of 1 : 50 000, so 1 cm on the map is 50 000 cm in real life. Two towns are ${cm} cm apart on the map. How far apart are they in real life, in km? (100 000 cm = 1 km)`, value: cm / 2, hint: "Multiply by 50 000 to get centimetres, then change to kilometres.", solution: [`${cm} × 50 000 = ${place(cm * 50000)} cm.`, `${place(cm * 50000)} ÷ 100 000 = ${cm / 2} km.`] };
  }),
  num({
    id: "missing-number-eq", name: "Missing number equations", stage: "KS2", year: 6, strand: "Algebra", prereqs: ["times-tables", "add-sub"],
    blurb: "Find the missing number in a one-step or two-step equation.",
    explainer: "Work backwards. Do the opposite operation to find the number that goes in the box.",
    parentNote: "Use inverse operations: undo the last step first. For 3 × □ + 4 = 25, take away 4 then divide by 3.",
    talkAbout: "What is the opposite of each step, and in what order do you undo them?",
  }, (r, l) => {
    if (l === 1) {
      if (r() < 0.5) { const a = int(r, 12, 60), x = int(r, 8, 50); return { prompt: `Find the missing number: $\\square + ${a} = ${a + x}$.`, value: x, hint: "Take the number you know away from the total.", solution: [`${a + x} − ${a} = ${x}.`] }; }
      const a = int(r, 3, 9), x = int(r, 3, 12); return { prompt: `Find the missing number: $\\square \\times ${a} = ${a * x}$.`, value: x, hint: "Divide the total by the number you know.", solution: [`${a * x} ÷ ${a} = ${x}.`] };
    }
    const a = int(r, 2, 9), b = int(r, 2, 15), x = int(r, 2, 12);
    if (l === 2) return { prompt: `Find the missing number: $${a} \\times \\square + ${b} = ${a * x + b}$.`, value: x, hint: "Undo the + first, then undo the ×.", solution: [`${a * x + b} − ${b} = ${a * x}.`, `${a * x} ÷ ${a} = ${x}.`] };
    const x3 = int(r, 3, 12), b3 = int(r, 2, Math.min(15, a * x3 - 1)), ans = a * x3 - b3;
    return { prompt: `Find the missing number: $(\\square + ${b3}) \\div ${a} = ${x3}$.`, value: ans, hint: "Undo the ÷ first, then undo the + inside the brackets.", solution: [`${x3} × ${a} = ${a * x3}.`, `${a * x3} − ${b3} = ${ans}.`] };
  }),
  num({
    id: "two-unknowns", name: "Two unknowns", stage: "KS2", year: 6, strand: "Algebra", prereqs: ["missing-number-eq"],
    blurb: "Find pairs of numbers that satisfy two conditions, and test possibilities.",
    explainer: "Try pairs of numbers that fit one clue, then check each pair against the other clue.",
    parentNote: "List the pairs that fit the first clue in order, then cross out the ones that break the second. This is a first look at simultaneous equations.",
    talkAbout: "How can you check your pair against both clues?",
  }, (r, l) => {
    if (l <= 2) {
      const b = int(r, 3, 14), d = 2 * int(r, 1, 5), a = b + d, s = a + b;
      return { prompt: `Two numbers add up to ${s}. One is ${d} more than the other. What is the bigger number?`, value: a, hint: "If you take the extra away, the two numbers are equal.", solution: [`Take the extra ${d} away: ${s} − ${d} = ${s - d}.`, `Share it equally: ${s - d} ÷ 2 = ${b}. That is the smaller number.`, `The bigger number is ${b} + ${d} = ${a}.`] };
    }
    const a = int(r, 3, 12), b = int(r, 2, a - 1);
    return { prompt: `Two whole numbers multiply to make ${a * b} and add up to ${a + b}. What is the bigger number?`, value: a, hint: "List pairs that multiply to make the product, and check which pair adds up correctly.", solution: [`Try the pairs of factors of ${a * b}.`, `${a} × ${b} = ${a * b} and ${a} + ${b} = ${a + b}.`, `The bigger number is ${a}.`] };
  }),
  num({
    id: "parallelogram-area", name: "Area of a parallelogram", stage: "KS2", year: 6, strand: "Measures", prereqs: ["perimeter-area"],
    blurb: "Find the area of a parallelogram using its base and its perpendicular height.",
    explainer: "The area of a parallelogram is the base times the straight-up height. The slanted side is not the height.",
    parentNote: "Cut a triangle off one end of a paper parallelogram and move it to the other end: it becomes a rectangle with the same base and height.",
    talkAbout: "Why do we use the straight-up height, not the slanted side?",
  }, (r, l) => {
    const b = int(r, 4, 14), h = int(r, 3, 10), slant = h + int(r, 1, 4);
    if (l === 1) return { figure: parallelogramFig(b, h), prompt: `A parallelogram has a base of ${b} cm and a perpendicular height of ${h} cm. What is its area in cm²?`, value: b * h, unit: "cm²", hint: "Multiply the base by the perpendicular height.", solution: [`${b} × ${h} = ${b * h}.`] };
    if (l === 2) return { figure: parallelogramFig(b, h, slant), prompt: `A parallelogram has a base of ${b} cm, a slanted side of ${slant} cm and a perpendicular height of ${h} cm. What is its area in cm²?`, value: b * h, unit: "cm²", hint: "Use the perpendicular height, not the slanted side.", solution: [`The slanted side is not needed.`, `${b} × ${h} = ${b * h}.`] };
    return { figure: parallelogramFig(b, h, undefined, "?"), prompt: `A parallelogram has an area of ${b * h} cm² and a base of ${b} cm. What is its perpendicular height in cm?`, value: h, unit: "cm", hint: "Divide the area by the base.", solution: [`${b * h} ÷ ${b} = ${h}.`] };
  }),
  num({
    id: "coordinates-four-quadrants", name: "Coordinates in all four quadrants", stage: "KS2", year: 6, strand: "Geometry", prereqs: ["coordinates", "negative-numbers"],
    blurb: "Use coordinates with negative numbers, and find distances and areas on the full grid.",
    explainer: "The grid has four quarters. Numbers to the left of zero and below zero are negative.",
    parentNote: "Remind them: along the corridor (x) first, then up the stairs (y). To find a distance across zero, add the two parts together.",
    talkAbout: "How do you find the distance between −3 and 4 on a number line?",
  }, (r, l) => {
    if (l === 1) { const x1 = int(r, 2, 6), x2 = int(r, 2, 7), y = int(r, -4, 4); return { figure: { type: "coord-grid", min: -8, max: 8, points: [{ x: -x1, y, label: "A" }, { x: x2, y, label: "B" }], alt: `A coordinate grid with point A at (−${x1}, ${y}) and point B at (${x2}, ${y}).` }, prompt: `Point A is at (−${x1}, ${neg(y)}) and point B is at (${x2}, ${neg(y)}). How far apart are they, in squares?`, value: x1 + x2, hint: "They are on the same horizontal line. Count the squares to zero, then on to the other point.", solution: [`From −${x1} to 0 is ${x1} squares.`, `From 0 to ${x2} is ${x2} squares.`, `${x1} + ${x2} = ${x1 + x2}.`] }; }
    if (l === 2) { const y1 = int(r, 2, 6), y2 = int(r, 2, 6), x = int(r, -5, 5); return { figure: { type: "coord-grid", min: -8, max: 8, points: [{ x, y: y1, label: "C" }, { x, y: -y2, label: "D" }], alt: `A coordinate grid with point C at (${x}, ${y1}) and point D at (${x}, −${y2}).` }, prompt: `Point C is at (${neg(x)}, ${y1}) and point D is at (${neg(x)}, −${y2}). How far apart are they, in squares?`, value: y1 + y2, hint: "They are on the same vertical line. Count to zero and then on.", solution: [`From ${y1} down to 0 is ${y1} squares.`, `From 0 down to −${y2} is ${y2} squares.`, `${y1} + ${y2} = ${y1 + y2}.`] }; }
    const x1 = int(r, 2, 5), x2 = int(r, 2, 6), y1 = int(r, 1, 4), y2 = int(r, 1, 4);
    return { figure: { type: "coord-grid", min: -8, max: 8, points: [{ x: -x1, y: -y1, label: "" }, { x: x2, y: -y1, label: "" }, { x: x2, y: y2, label: "" }], poly: [[-x1, -y1], [x2, -y1], [x2, y2], [-x1, y2]], alt: `A rectangle on a coordinate grid with corners at (−${x1}, −${y1}), (${x2}, −${y1}), (${x2}, ${y2}) and (−${x1}, ${y2}).` }, prompt: `A rectangle has corners at (−${x1}, −${y1}), (${x2}, −${y1}) and (${x2}, ${y2}). What is its area in square units?`, value: (x1 + x2) * (y1 + y2), hint: "Find the width and the height first.", solution: [`The width is ${x1} + ${x2} = ${x1 + x2}.`, `The height is ${y1} + ${y2} = ${y1 + y2}.`, `${x1 + x2} × ${y1 + y2} = ${(x1 + x2) * (y1 + y2)}.`] };
  }),
  num({
    id: "circle-parts", name: "Parts of a circle", stage: "KS2", year: 6, strand: "Geometry", prereqs: [],
    blurb: "Use the radius and the diameter of a circle.",
    explainer: "The radius goes from the centre to the edge. The diameter goes all the way across through the centre, so it is twice the radius.",
    parentNote: "Radius × 2 = diameter. Draw a circle with a compass: the gap you set is the radius.",
    talkAbout: "How are the radius and the diameter linked?",
  }, (r, l) => {
    if (l === 1) { const rad = int(r, 3, 12); return { figure: circleFig("diameter", `${rad * 2} cm`), prompt: `A circle has a diameter of ${rad * 2} cm. What is its radius in cm?`, value: rad, unit: "cm", hint: "The radius is half the diameter.", solution: [`${rad * 2} ÷ 2 = ${rad}.`] }; }
    if (l === 2) { const rad = int(r, 3, 12) + 0.5; return { figure: circleFig("radius", `${rad} cm`), prompt: `A circle has a radius of ${rad} cm. What is its diameter in cm?`, value: rad * 2, unit: "cm", hint: "The diameter is twice the radius.", solution: [`${rad} × 2 = ${rad * 2}.`] }; }
    const n = int(r, 3, 5), rad = int(r, 3, 8); return { prompt: `${n} identical circles are placed in a straight line, touching each other. Each has a radius of ${rad} cm. How long is the whole row in cm?`, value: n * rad * 2, unit: "cm", hint: "Each circle takes up one diameter of the row.", solution: [`The diameter of each circle is ${rad} × 2 = ${rad * 2} cm.`, `${n} × ${rad * 2} = ${n * rad * 2}.`] };
  }),
  num({
    id: "pie-angles", name: "Drawing pie chart angles", stage: "KS2", year: 6, strand: "Statistics", prereqs: ["pie-chart-counts"],
    blurb: "Work out the angle for each slice of a pie chart, and use angles to find amounts.",
    explainer: "A whole pie chart is 360°. Find the angle for one person, then multiply by the number of people in the slice.",
    parentNote: "Divide 360 by the total to find the angle for each item, and multiply by the number in the group. Check that all the angles add up to 360°.",
    talkAbout: "What angle does a single person get, and how did you find it?",
  }, (r, l) => {
    const total = pick(r, [20, 24, 30, 36, 40, 45, 60, 72, 90]), each = 360 / total;
    if (l === 1) { const n = int(r, 3, Math.min(15, total - 5)); return { figure: { type: "pie", slices: [{ label: "football ?", value: n }, { label: "others", value: total - n }], alt: `A pie chart of ${total} children. The football slice is ${n} children and the rest chose other sports.` }, prompt: `${total} children voted for their favourite sport. ${n} voted for football. In a pie chart, what angle is the football slice? Type the number only.`, value: n * each, unit: "°", hint: "Divide 360 by the total to find the angle for one child.", solution: [`360 ÷ ${total} = ${each}° for each child.`, `${n} × ${each} = ${n * each}°.`] }; }
    if (l === 2) { const n = int(r, 3, Math.min(15, total - 5)); return { figure: { type: "pie", slices: [{ label: `cats ${n * each}°`, value: n }, { label: "others", value: total - n }], alt: `A pie chart of ${total} children. The cat slice has an angle of ${n * each} degrees.` }, prompt: `A pie chart shows the favourite pets of ${total} children. The cat slice has an angle of ${n * each}°. How many children chose cats?`, value: n, hint: `Each child is ${each}° of the pie chart.`, solution: [`360 ÷ ${total} = ${each}° for each child.`, `${n * each} ÷ ${each} = ${n}.`] }; }
    const a = int(r, 3, Math.floor(total / 4)), b = int(r, 3, Math.floor(total / 3)), rest = total - a - b;
    return { figure: { type: "pie", slices: [{ label: "apples", value: a }, { label: "bananas", value: b }, { label: "grapes ?", value: rest }], alt: `A pie chart of ${total} children: ${a} chose apples, ${b} bananas and the rest grapes.` }, prompt: `${total} children chose a fruit: ${a} chose apples and ${b} chose bananas. The rest chose grapes. What angle is the grapes slice? Type the number only.`, value: rest * each, unit: "°", hint: "First find how many chose grapes.", solution: [`${total} − ${a} − ${b} = ${rest} children chose grapes.`, `360 ÷ ${total} = ${each}° each.`, `${rest} × ${each} = ${rest * each}°.`] };
  }),
];
