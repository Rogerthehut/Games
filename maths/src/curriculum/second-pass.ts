import { int, pick, round } from "../engine/rng";
import type { Skill } from "../engine/types";
import { choiceSkill } from "./build";
import { num } from "./ks2";

/**
 * The second pass of the curriculum: topics the first pass left out, from Year 3 to Year 13.
 * Each question works out its own answer, so the answer can never disagree with the question.
 */

const t2 = (n: number) => String(n).padStart(2, "0");
const clock = (h: number, m: number) => `${h}:${t2(m)}`;


const nice = (lo: number, hi: number) => { const span = hi - lo, step = span <= 8 ? 1 : span <= 16 ? 2 : span <= 40 ? 5 : span <= 80 ? 10 : 20; return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step }; };
const sample = (f: (x: number) => number, a: number, b: number, n = 80): [number, number][] => Array.from({ length: n + 1 }, (_, i) => { const x = a + ((b - a) * i) / n; return [x, f(x)] as [number, number]; });
const graph = (curves: { pts: [number, number][]; label?: string; dashed?: boolean }[], xr: [number, number, number], alt: string, extra: { marks?: { x: number; y: number; label?: string }[]; strips?: [number, number][] } = {}) => {
  const ys = curves.flatMap((c) => c.pts.map((p) => p[1])).concat((extra.marks ?? []).map((m) => m.y), (extra.strips ?? []).map((q) => q[1]), 0), y = nice(Math.min(...ys) - 0.5, Math.max(...ys) + 0.5);
  return { type: "function-graph" as const, xMin: xr[0], xMax: xr[1], xStep: xr[2], yMin: y.lo, yMax: y.hi, yStep: y.step, curves, alt, ...extra };
};

export const secondPassSkills: Skill[] = [
  // ---------------------------------------------------------------- earlier years
  num({
    id: "analogue-clocks", name: "Reading analogue clocks", stage: "KS2", year: 3, strand: "Measures", prereqs: [],
    blurb: "Tell the time from the hands of a clock, to the nearest five minutes, and change to 24-hour time.",
    explainer: "The short hand shows the hour and the long hand shows the minutes. Each number the long hand passes is 5 more minutes.",
    parentNote: "Use a real clock. When the long hand is on the 6 it is half past. Past 6, say how many minutes to the next hour.",
    talkAbout: "Where is the long hand at quarter past, and why is it there?",
  }, (r, l) => {
    const h = int(r, 1, 11);
    const fig = (m: number) => ({ type: "clock" as const, h, m, alt: `An analogue clock. The short hand is ${m === 0 ? "pointing at" : m < 30 ? "just past" : "nearly at"} the ${m < 30 || m === 0 ? h : h + 1}. The long hand points to the ${m / 5 === 0 ? 12 : m / 5}.` });
    if (l === 1) { const m = pick(r, [0, 15, 30, 45]); return { prompt: `Look at the clock. How many minutes past the hour is it? (If the long hand is on the 12, type 0.)`, value: m, unit: "min", figure: fig(m), hint: "Count in 5s round the clock face: the 1 is 5 minutes, the 2 is 10 minutes, and so on.", solution: [`The long hand points to ${m === 0 ? 12 : m / 5}.`, m === 0 ? "The 12 means exactly on the hour: 0 minutes." : `${m / 5} × 5 = ${m} minutes past.`] }; }
    if (l === 2) { const m = int(r, 1, 11) * 5; return { prompt: `Look at the clock. How many minutes past the hour is it?`, value: m, unit: "min", figure: fig(m), hint: "Count in 5s for each number the long hand has passed.", solution: [`The long hand points to ${m / 5}.`, `${m / 5} × 5 = ${m} minutes past.`] }; }
    const m = pick(r, [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    return { prompt: `It is ${clock(h, m)} pm. In 24-hour time the hour is written as a number. What is that number?`, value: h + 12, hint: "For pm times, add 12 to the hour.", solution: [`${h} + 12 = ${h + 12}.`, `So ${clock(h, m)} pm is ${h + 12}:${t2(m)}.`] };
  }),
  num({
    id: "scales-reading", name: "Reading scales", stage: "KS2", year: 4, strand: "Measures", prereqs: ["measures-convert"],
    blurb: "Work out what each mark on a scale is worth, then read the value the pointer shows.",
    explainer: "First count how many gaps there are between two numbers you can see. Divide the difference by the number of gaps to find what one gap is worth.",
    parentNote: "Use a measuring jug or kitchen scale. Always ask what one small mark is worth before reading the pointer.",
    talkAbout: "How can you tell what each little mark is worth when only some marks have numbers?",
  }, (r, l) => {
    const gaps = pick(r, [2, 4, 5, 10]), step = gaps === 4 ? pick(r, [5, 25, 50]) : gaps === 2 ? pick(r, [5, 25, 50, 100]) : pick(r, [2, 5, 10, 20, 50]);
    const start = pick(r, [0, 100, 200, 500]), end = start + gaps * step, unit = pick(r, ["ml", "g"]);
    const fig = (pointer?: number) => ({ type: "scale" as const, start, end, gaps, unit, pointer, alt: `A scale from ${start} ${unit} to ${end} ${unit} with ${gaps} equal gaps${pointer === undefined ? "" : `. A pointer shows ${pointer} gap${pointer === 1 ? "" : "s"} up from ${start}`}.` });
    if (l === 1) return { prompt: `Look at the scale. It goes from ${start} ${unit} to ${end} ${unit}, with ${gaps} equal gaps. What is one gap worth in ${unit}?`, figure: fig(), value: step, unit, hint: "Divide the difference between the two labels by the number of gaps.", solution: [`${end} − ${start} = ${end - start}.`, `${end - start} ÷ ${gaps} = ${step}.`] };
    const k = int(r, 1, gaps - 1);
    if (l === 2) return { prompt: `Look at the scale, which goes from ${start} ${unit} to ${end} ${unit} in ${gaps} equal gaps. What does the pointer read?`, figure: fig(k), value: start + k * step, unit, hint: "Find what one gap is worth, then count up from the lower label.", solution: [`One gap is (${end} − ${start}) ÷ ${gaps} = ${step}.`, `${start} + ${k} × ${step} = ${start + k * step}.`] };
    const sub = int(r, 1, gaps - 1);
    return { prompt: `Look at the scale, which goes from ${start} ${unit} to ${end} ${unit} in ${gaps} equal gaps. What does the pointer read?`, figure: fig(gaps - sub), value: end - sub * step, unit, hint: "Work out one gap, then count down from the top label.", solution: [`One gap is ${step}.`, `${end} − ${sub} × ${step} = ${end - sub * step}.`] };
  }),
  num({
    id: "timetables", name: "Timetables and journey times", stage: "KS2", year: 4, strand: "Measures", prereqs: ["elapsed-time", "convert-time"],
    blurb: "Read a timetable and work out how long a journey takes, in minutes.",
    explainer: "To find a journey time, count on from the start time to the next whole hour, then on to the finish time, and add the two parts.",
    parentNote: "Use real bus or train times. Count up to the hour first, then add the remaining minutes. Say the answer in minutes.",
    talkAbout: "Why is it handy to count up to the next whole hour first?",
  }, (r, l) => {
    const h = int(r, 6, 16);
    if (l === 1) { const m1 = pick(r, [5, 10, 15, 20]), d = pick(r, [15, 20, 25, 30, 35]); return { prompt: `A bus leaves at ${t2(h)}:${t2(m1)} and arrives at ${t2(h)}:${t2(m1 + d)}. How many minutes is the journey?`, value: d, unit: "min", hint: "Both times are in the same hour. Take the minutes away.", solution: [`${m1 + d} − ${m1} = ${d} minutes.`] }; }
    if (l === 2) { const m1 = pick(r, [35, 40, 45, 50, 55]), d = int(r, 25, 55), end = m1 + d - 60; return { prompt: `A train leaves at ${t2(h)}:${t2(m1)} and arrives at ${t2(h + 1)}:${t2(end)}. How many minutes is the journey?`, value: d, unit: "min", hint: "Count up to the next whole hour first.", solution: [`From ${t2(h)}:${t2(m1)} to ${t2(h + 1)}:00 is ${60 - m1} minutes.`, `Then ${end} more minutes to ${t2(h + 1)}:${t2(end)}.`, `${60 - m1} + ${end} = ${d}.`] }; }
    const a = int(r, 20, 50), wait = pick(r, [10, 15, 20, 25]), b = int(r, 15, 45);
    return { prompt: `Zara's trip has two buses. The first takes ${a} minutes. She waits ${wait} minutes at the stop. The second bus takes ${b} minutes. How many minutes is her whole trip?`, value: a + wait + b, unit: "min", hint: "Add the two bus times and the waiting time.", solution: [`${a} + ${wait} + ${b} = ${a + wait + b}.`] };
  }),
  num({
    id: "line-graphs", name: "Line graphs", stage: "KS2", year: 5, strand: "Statistics", prereqs: ["read-tables"],
    blurb: "Read values from a line graph, find changes, and estimate between two readings.",
    explainer: "Each point on a line graph is a reading. The line between two points shows how the value changed.",
    parentNote: "Draw a quick temperature graph with your child. Ask how much it rose between two times, and what it might have been halfway between.",
    talkAbout: "What does a steep line tell you compared with a flat line?",
  }, (r, l) => {
    const t0 = int(r, 6, 7), v0 = int(r, 8, 16), ys = [v0]; // the temperature at 5 times, an hour apart
    for (let i = 1; i < 5; i++) ys.push(ys[i - 1] + int(r, 1, 4) * (r() < 0.75 ? 1 : -1));
    const xs = ys.map((_, i) => `${t0 + i}am`), top = Math.ceil((Math.max(...ys) + 1) / 4) * 4;
    const figure = { type: "line-graph" as const, xs, ys, xLabel: "Time", yLabel: "Temperature (°)", yMax: top, alt: `A line graph of temperature. ${xs.map((x, i) => `${x}: ${ys[i]}°`).join(", ")}.` };
    const i = int(r, 0, 3), j = int(r, i + 1, 4);
    if (l === 1) return { prompt: `The line graph shows the temperature each hour. What was the temperature at ${xs[i]}?`, figure, value: ys[i], unit: "°", hint: "Find the time along the bottom, go up to the dot, and read across.", solution: [`At ${xs[i]} the dot is at ${ys[i]}°.`] };
    if (l === 2) return { prompt: `The line graph shows the temperature each hour. By how many degrees did it change between ${xs[i]} and ${xs[j]}? (Type a number. If it went down, still type a positive number.)`, figure, value: Math.abs(ys[j] - ys[i]), unit: "°", hint: "Read both temperatures and take the smaller from the larger.", solution: [`${xs[i]}: ${ys[i]}°. ${xs[j]}: ${ys[j]}°.`, `The difference is ${Math.abs(ys[j] - ys[i])}°.`] };
    return { prompt: `The line graph shows the temperature each hour. How many degrees higher was the warmest reading than the coolest?`, figure, value: Math.max(...ys) - Math.min(...ys), unit: "°", hint: "Find the highest and the lowest dots.", solution: [`Highest: ${Math.max(...ys)}°. Lowest: ${Math.min(...ys)}°.`, `${Math.max(...ys)} − ${Math.min(...ys)} = ${Math.max(...ys) - Math.min(...ys)}.`] };
  }),
  num({
    id: "nets-solids", name: "Nets and 3D solids", stage: "KS2", year: 5, strand: "Geometry", prereqs: ["shapes-3d"],
    blurb: "Count the faces, edges and corners of a solid, and use them to check a net.",
    explainer: "A net is a solid folded flat. Each face of the solid is one shape in the net. Edges are where faces meet, and vertices are the corners.",
    parentNote: "Open up a cereal box and look at its net. Count the faces, then count edges and corners on the folded box.",
    talkAbout: "Which solids have the same number of faces but different numbers of corners?",
  }, (r, l) => {
    const solids: [string, number, number, number][] = [["cube", 6, 12, 8], ["cuboid", 6, 12, 8], ["triangular prism", 5, 9, 6], ["square-based pyramid", 5, 8, 5], ["triangular-based pyramid", 4, 6, 4], ["pentagonal prism", 7, 15, 10], ["hexagonal prism", 8, 18, 12]];
    const [name, f, e, v] = pick(r, l === 1 ? solids.slice(0, 4) : solids), a = /^[aeiou]/.test(name) ? "an" : "a";
    if (l === 1) return { prompt: `How many faces does ${a} ${name} have? (That is how many shapes there are in its net.)`, value: f, hint: "Picture each flat side of the solid.", solution: [`${a[0].toUpperCase() + a.slice(1)} ${name} has ${f} faces.`] };
    if (l === 2) return { prompt: `How many edges does ${a} ${name} have?`, value: e, hint: "An edge is where two faces meet.", solution: [`${a[0].toUpperCase() + a.slice(1)} ${name} has ${e} edges.`] };
    return { prompt: `A solid has ${f} faces and ${v} vertices (corners). Use faces + vertices − edges = 2 to find how many edges it has.`, value: e, hint: "Rearrange the rule: edges = faces + vertices − 2.", solution: [`${f} + ${v} = ${f + v}.`, `${f + v} − 2 = ${e}.`] };
  }),
  num({
    id: "reflect-translate", name: "Reflecting and translating points", stage: "KS2", year: 6, strand: "Geometry", prereqs: ["coordinates-four-quadrants"],
    blurb: "Find the new coordinates of a point after a translation or a reflection.",
    explainer: "A translation slides every point the same way. A reflection flips a point to the same distance on the other side of the mirror line.",
    parentNote: "Draw a grid. Move the point right or up by counting squares. For a reflection, count how far the point is from the mirror and go the same distance past it.",
    talkAbout: "Does a reflection change how far the point is from the mirror line?",
  }, (r, l) => {
    const x = int(r, 1, 6), y = int(r, 1, 6);
    const grid = (extra: { x: number; y: number; label: string }[] = [], mirror?: { axis: "x" | "y"; value: number }, alt2 = "") => ({ type: "coord-grid" as const, max: 12, points: [{ x, y, label: "A" }, ...extra], mirror, alt: `A coordinate grid from 0 to 12 with point A at (${x}, ${y})${alt2}.` });
    if (l === 1) { const dx = int(r, 1, 5); return { prompt: `The point $(${x}, ${y})$ is translated ${dx} to the right. What is the new x-coordinate?`, figure: grid(), value: x + dx, hint: "Moving right adds to x.", solution: [`${x} + ${dx} = ${x + dx}.`] }; }
    if (l === 2) { const dy = int(r, 2, 6), dx = int(r, 1, x), askX = r() < 0.5; return { prompt: `The point $(${x}, ${y})$ is translated ${dx} to the left and ${dy} up. What is the new ${askX ? "x" : "y"}-coordinate?`, figure: grid(), value: askX ? x - dx : y + dy, hint: askX ? "Moving left takes away from x." : "Moving up adds to y.", solution: askX ? [`${x} − ${dx} = ${x - dx}.`] : [`${y} + ${dy} = ${y + dy}.`] }; }
    const k = int(r, 3, 6), d = int(r, 1, k - 1), horizontal = r() < 0.5;
    // the point is d to one side of the mirror line, so its image is d on the other side
    const mirror = (axis: "x" | "y", px: number, py: number) => ({ type: "coord-grid" as const, max: 12, points: [{ x: px, y: py, label: "A" }], mirror: { axis, value: k }, alt: `A coordinate grid from 0 to 12 with point A at (${px}, ${py}) and a dashed mirror line ${axis === "x" ? "x" : "y"} = ${k}.` });
    if (horizontal) return { prompt: `The point $(${k - d}, ${y})$ is reflected in the vertical line $x = ${k}$ (the dashed line). What is the new x-coordinate?`, figure: mirror("x", k - d, y), value: k + d, hint: `Find how far ${k - d} is from ${k}, then go the same distance the other side.`, solution: [`${k - d} is ${d} to the left of the line.`, `The image is ${d} to the right: ${k} + ${d} = ${k + d}.`] };
    return { prompt: `The point $(${x}, ${k + d})$ is reflected in the horizontal line $y = ${k}$ (the dashed line). What is the new y-coordinate?`, figure: mirror("y", x, k + d), value: k - d, hint: "Find how far the point is above the line, then go the same distance below.", solution: [`${k + d} is ${d} above the line.`, `The image is ${d} below: ${k} − ${d} = ${k - d}.`] };
  }),

  // ---------------------------------------------------------------- Key Stage 3
  choiceSkill({
    id: "constructions-loci", name: "Constructions and loci", stage: "KS3", year: 8, strand: "Geometry", prereqs: ["circle-parts", "angles-basic"],
    blurb: "Know which construction gives a perpendicular bisector or an angle bisector, and describe a locus.",
    explainer: "A locus is every point that follows a rule. Compasses draw points that are the same distance from somewhere.",
    parentNote: "A locus is a path made by a rule. Points exactly 3 cm from one point make a circle. Points the same distance from two points make a straight line between them.",
    talkAbout: "Why does a pair of compasses help when a rule says 'the same distance'?",
  }, (r, l) => {
    const easy: [string, string, string, string[]][] = [
      ["What is the locus of points that are exactly 3 cm from a fixed point P?", "A circle with centre P and radius 3 cm", "Every point 3 cm from P is on a circle round P.", ["A straight line through P", "A square with P in the middle", "A line 3 cm long starting at P"]],
      ["What is the locus of points that are exactly 2 cm from a straight line that goes on for ever?", "Two lines parallel to it, one on each side", "Points 2 cm either side make two parallel lines.", ["A circle of radius 2 cm", "One line crossing it at 90°", "A single parallel line on one side only"]],
    ];
    const hard: [string, string, string, string[]][] = [
      ["What is the locus of points the same distance from two points A and B?", "The perpendicular bisector of AB", "Points equally far from A and B lie on the line that cuts AB in half at right angles.", ["A circle with centre A", "The line AB itself", "The angle bisector at A"]],
      ["What is the locus of points the same distance from two straight lines that meet at a point?", "The angle bisector", "Points equally far from both lines lie on the line that splits the angle in two.", ["The perpendicular bisector", "A circle round the meeting point", "One of the two lines"]],
      ["To construct an angle bisector, what do you do after drawing an arc across both arms of the angle from the corner?", "Draw two more arcs of the same radius from where the first arc cuts the arms, and join the corner to where they cross", "The crossing point of the two arcs is the same distance from both arms.", ["Join the two places where the arc cuts the arms with a straight line", "Measure the angle with a protractor and halve it by eye", "Draw a circle round the corner"]],
      ["To construct an equilateral triangle on a line, what should the compass radius be set to?", "The length of the line", "All three sides must be the same length, so use the line's length from both ends.", ["Half the length of the line", "Twice the length of the line", "Any length you like"]],
    ];
    const [q, right, why, others] = pick(r, l === 1 ? easy : l === 2 ? [...easy, ...hard.slice(0, 2)] : hard);
    return { prompt: q, right, others, hint: "Think about what the rule says about distance.", solution: [why] };
  }),
  num({
    id: "standard-form-first", name: "Standard form: first steps", stage: "KS3", year: 9, strand: "Number", prereqs: ["place-value", "large-numbers"],
    blurb: "Write large and small numbers as a number between 1 and 10 times a power of ten, and multiply them.",
    explainer: "Standard form is a number from 1 up to 10, times a power of 10. 45 000 is 4.5 × 10⁴.",
    parentNote: "Move the decimal point until the number is between 1 and 10, then count how many places you moved. Big numbers have a positive power, small ones a negative power.",
    talkAbout: "Why is a calculator's 'E' notation just standard form in disguise?",
  }, (r, l) => {
    if (l === 1) { const a = int(r, 12, 99) / 10, n = int(r, 3, 8); const full = round(a * 10 ** n, 0); return { prompt: `Write ${full.toLocaleString("en-GB")} in standard form as $a \\times 10^n$. What is $n$?`, value: n, hint: "Count how many places the decimal point moves to leave a number between 1 and 10.", solution: [`${full.toLocaleString("en-GB")} = $${a} \\times 10^{${n}}$.`, `So n = ${n}.`] }; }
    if (l === 2) { const a = int(r, 12, 99) / 10, n = int(r, 3, 6); return { prompt: `Write $${a} \\times 10^{${n}}$ as an ordinary number.`, value: round(a * 10 ** n, 0), hint: `Multiply by 10 ${n} times, or move the decimal point ${n} places right.`, solution: [`$${a} \\times 10^{${n}} = ${round(a * 10 ** n, 0)}$.`] }; }
    const a = pick(r, [1, 2, 3]), b = pick(r, [2, 3]), m = int(r, 2, 6), n = int(r, 2, 6);
    return { prompt: `Work out $(${a} \\times 10^{${m}}) \\times (${b} \\times 10^{${n}})$. Give your answer as $c \\times 10^{p}$. What is $p$?`, value: m + n, hint: "Multiply the numbers, then add the powers of 10.", solution: [`${a} × ${b} = ${a * b}, which is between 1 and 10.`, `Add the powers: ${m} + ${n} = ${m + n}.`, `The answer is $${a * b} \\times 10^{${m + n}}$, so p = ${m + n}.`] };
  }),

  // ---------------------------------------------------------------- GCSE
  num({
    id: "compound-measures", name: "Density and pressure", stage: "KS4", year: 10, strand: "Measures", prereqs: ["speed-distance-time"],
    blurb: "Use density = mass ÷ volume and pressure = force ÷ area.",
    explainer: "Density says how much mass fits in each cm³. Pressure says how much force presses on each m². Both are one amount divided by another.",
    parentNote: "Use a formula triangle. Density = mass ÷ volume, so mass = density × volume and volume = mass ÷ density. Pressure works the same way with force and area.",
    talkAbout: "Why does a high heel press harder on the floor than a flat shoe, if the force is the same?",
  }, (r, l) => {
    const vol = pick(r, [2, 4, 5, 8, 10, 20, 25, 50]), dens = pick(r, [2, 3, 4, 5, 8, 9]), mass = vol * dens;
    if (l === 1) return { prompt: `A block has a mass of ${mass} g and a volume of ${vol} cm³. What is its density in g/cm³? Type the number.`, value: dens, hint: "Density = mass ÷ volume.", solution: [`${mass} ÷ ${vol} = ${dens}.`] };
    if (l === 2) return { prompt: `A metal has a density of ${dens} g/cm³. What is the mass of ${vol} cm³ of it, in g?`, value: mass, unit: "g", hint: "Mass = density × volume.", solution: [`${dens} × ${vol} = ${mass}.`] };
    const area = pick(r, [2, 4, 5, 10]), p = pick(r, [20, 30, 50, 60, 100]);
    return r() < 0.5
      ? { prompt: `A force of ${p * area} N acts on an area of ${area} m². What is the pressure in N/m²? Type the number.`, value: p, hint: "Pressure = force ÷ area.", solution: [`${p * area} ÷ ${area} = ${p}.`] }
      : { prompt: `A solid has a mass of ${mass} g and a density of ${dens} g/cm³. What is its volume in cm³?`, value: vol, hint: "Volume = mass ÷ density.", solution: [`${mass} ÷ ${dens} = ${vol}.`] };
  }),
  num({
    id: "quadratic-sequences", name: "Quadratic sequences", stage: "KS4", year: 10, strand: "Algebra", prereqs: ["nth-term"],
    blurb: "Use the second difference to spot a quadratic sequence, and find later terms.",
    explainer: "In a quadratic sequence the differences are not constant, but the differences of the differences are. Half the second difference is the number in front of n².",
    parentNote: "Find the first differences, then the second differences. If the second differences match, the nth term has an n² part. The number in front of n² is half the second difference.",
    talkAbout: "Why is the second difference always twice the coefficient of n²?",
  }, (r, l) => {
    const a = int(r, 1, 4), b = int(r, -2, 5), c = int(r, -3, 6), term = (n: number) => a * n * n + b * n + c;
    const seq = [1, 2, 3, 4].map(term).join(", ");
    const d1 = [term(2) - term(1), term(3) - term(2), term(4) - term(3)];
    if (l === 1) return { prompt: `Here is a quadratic sequence: ${seq}. What is the second difference?`, value: 2 * a, hint: "Find the differences between terms, then the differences between those.", solution: [`First differences: ${d1.join(", ")}.`, `Second differences: ${d1[1] - d1[0]}, ${d1[2] - d1[1]}.`, `The second difference is ${2 * a}.`] };
    if (l === 2) return { prompt: `Here is a quadratic sequence: ${seq}. What is the next term?`, value: term(5), hint: "Keep the second difference going to find the next first difference.", solution: [`First differences: ${d1.join(", ")}. They go up by ${2 * a} each time.`, `The next first difference is ${d1[2] + 2 * a}.`, `${term(4)} + ${d1[2] + 2 * a} = ${term(5)}.`] };
    return { prompt: `A quadratic sequence begins ${seq}. What is the 10th term?`, value: term(10), hint: "Half the second difference gives the n² part. Subtract it from the sequence to see what is left.", solution: [`The second difference is ${2 * a}, so the n² part is ${a}n².`, `Take ${a}n² away: the rest is linear. The nth term is $${a}n^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}n ${c < 0 ? "-" : "+"} ${Math.abs(c)}$.`, `Put in n = 10: ${a * 100} ${b < 0 ? "−" : "+"} ${Math.abs(b) * 10} ${c < 0 ? "−" : "+"} ${Math.abs(c)} = ${term(10)}.`] };
  }),
  choiceSkill({
    id: "graph-transformations", name: "Transforming graphs", stage: "KS4", year: 11, strand: "Algebra", prereqs: ["quadratic-graphs"],
    blurb: "Describe how y = f(x) moves, stretches or reflects when the equation changes.",
    explainer: "Changes outside the brackets move the graph up or down, or stretch it up and down. Changes inside the brackets work sideways, and they do the opposite of what you expect.",
    parentNote: "f(x) + a moves up a. f(x + a) moves left a, which feels backwards. −f(x) flips over the x-axis, and f(−x) flips over the y-axis.",
    talkAbout: "Why does f(x + 3) move the graph left, not right?",
  }, (r, l) => {

    const f = (x: number) => ((x - 1) * (x - 1)) / 6 - 1, a = int(r, 1, 3);
    type T = [string, string, string[], (x: number) => number, string?];
    const lv1: T[] = [
      [`f(x) + ${a}`, `a translation of ${a} up`, [`a translation of ${a} down`, `a translation of ${a} to the right`, `a translation of ${a} to the left`], (x) => f(x) + a],
      [`f(x) − ${a}`, `a translation of ${a} down`, [`a translation of ${a} up`, `a translation of ${a} to the right`, `a translation of ${a} to the left`], (x) => f(x) - a],
    ];
    const lv2: T[] = [
      [`f(x + ${a})`, `a translation of ${a} to the left`, [`a translation of ${a} to the right`, `a translation of ${a} up`, `a translation of ${a} down`], (x) => f(x + a)],
      [`f(x − ${a})`, `a translation of ${a} to the right`, [`a translation of ${a} to the left`, `a translation of ${a} up`, `a translation of ${a} down`], (x) => f(x - a)],
    ];
    const lv3: T[] = [
      ["−f(x)", "a reflection in the x-axis", ["a reflection in the y-axis", "a rotation of 180°", "a translation down"], (x) => -f(x)],
      ["f(−x)", "a reflection in the y-axis", ["a reflection in the x-axis", "a rotation of 180°", "a translation to the left"], (x) => f(-x)],
      ["2f(x)", "a vertical stretch with scale factor 2", ["a horizontal stretch with scale factor 2", "a translation of 2 up", "a vertical stretch with scale factor 1/2"], (x) => 2 * f(x)],
      ["f(2x)", "a horizontal stretch with scale factor 1/2", ["a horizontal stretch with scale factor 2", "a vertical stretch with scale factor 2", "a translation of 2 to the left"], (x) => f(2 * x)],
    ];
    const [eq, right, others, g] = pick(r, l === 1 ? lv1 : l === 2 ? lv2 : lv3);
    const figure = graph([{ pts: sample(f, -6, 6) }, { pts: sample(g, -6, 6), dashed: true }], [-6, 6, 2], `A graph of y = f(x), a curve with its lowest point near (1, −1), and a dashed copy: the new graph, y = ${eq}.`);
    return { prompt: `The solid curve is $y = f(x)$. The dashed curve is $y = ${eq.replace(/−/g, "-")}$. Which describes the change?`, figure, right, others, hint: "Compare the lowest points of the two curves. Where has the dashed curve gone, and has it been flipped or stretched?", solution: [`$y = ${eq.replace(/−/g, "-")}$ is ${right}.`] };
  }),
  num({
    id: "trig-graphs", name: "Graphs of sine and cosine", stage: "KS4", year: 11, strand: "Geometry", prereqs: ["exact-trig"],
    blurb: "Use the shape of sin and cos graphs: amplitude, maximum, minimum and period.",
    explainer: "A sine or cosine wave goes between −1 and 1 and repeats every 360°. A number in front stretches it up and down. A number inside squashes it sideways.",
    parentNote: "For y = a sin x, the highest point is a and the lowest is −a. For y = sin(kx), the wave repeats every 360 ÷ k degrees.",
    talkAbout: "What happens to the wave if you multiply x by 2 inside the brackets?",
  }, (r, l) => {

    const fn = pick(r, ["sin", "cos"]), F = fn === "sin" ? Math.sin : Math.cos, rad = (d: number) => (d * Math.PI) / 180;
    if (l === 1) { const a = int(r, 2, 5); return { prompt: `The graph shows $y = ${a} \\${fn} x$. What is its maximum value?`, figure: graph([{ pts: sample((x) => a * F(rad(x)), 0, 360, 120) }], [0, 360, 90], `The graph of y = ${a} ${fn} x from 0° to 360°, a wave between −${a} and ${a}.`), value: a, hint: "Find the highest point of the wave.", solution: [`The wave goes as high as ${a}.`, `So the maximum value is ${a}.`] }; }
    if (l === 2) { const k = pick(r, [2, 3, 4]); return { prompt: `The graph shows $y = \\${fn}(${k}x)$ from 0° to 360°. How many degrees long is one full cycle?`, figure: graph([{ pts: sample((x) => F(rad(k * x)), 0, 360, 240) }], [0, 360, 90], `The graph of y = ${fn}(${k}x) from 0° to 360°, which repeats ${k} times.`), value: 360 / k, unit: "°", hint: "The wave repeats several times between 0° and 360°. Divide 360° by the number of cycles.", solution: [`The graph has ${k} full cycles in 360°.`, `360 ÷ ${k} = ${360 / k}.`] }; }
    const a = int(r, 2, 4), c = int(r, 1, 4);
    return { prompt: `The graph shows $y = ${a} \\${fn} x + ${c}$. What is its minimum value?`, figure: graph([{ pts: sample((x) => a * F(rad(x)) + c, 0, 360, 120) }], [0, 360, 90], `The graph of y = ${a} ${fn} x + ${c} from 0° to 360°, a wave between ${c - a} and ${c + a}.`), value: c - a, hint: "Find the lowest point of the wave.", solution: [`The smallest ${fn} x can be is −1.`, `${a} × (−1) + ${c} = ${c - a}.`] };
  }),

  // ---------------------------------------------------------------- A-level
  num({
    id: "regression-line", name: "Regression lines and residuals", stage: "KS5", year: 12, strand: "Statistics", prereqs: ["correlation", "line-equation"],
    blurb: "Use a regression line to predict, read its gradient in context, and find a residual.",
    explainer: "A regression line is the line of best fit for the data. Its gradient says how much y changes for each extra 1 in x. A residual is the real value minus the prediction.",
    parentNote: "Put x into the equation to predict y. The gradient is the change in y per unit of x. Predicting beyond the data is extrapolation, which can be unreliable.",
    talkAbout: "Why is a prediction outside the range of the data less trustworthy?",
  }, (r, l) => {
    const a = int(r, 5, 40), b = int(r, 2, 9), x = int(r, 3, 12);
    const line = graph([{ pts: [[0, a], [14, a + 14 * b]] }], [0, 14, 2], `A straight regression line from (0, ${a}) rising by ${b} for each 1 along. y is sales in pounds and x is temperature in degrees.`);
    if (l === 1) return { prompt: `A regression line for ice-cream sales (y, in £) against temperature (x, in °C) is $y = ${a} + ${b}x$ (drawn). Predict the sales when the temperature is ${x}°C.`, figure: line, value: a + b * x, hint: "Put the value of x into the equation.", solution: [`y = ${a} + ${b} × ${x}.`, `y = ${a + b * x}.`] };
    if (l === 2) { const k = int(r, 2, 6); return { prompt: `A regression line is $y = ${a} + ${b}x$, with y in £ and x in °C. By how much does the predicted sales figure change when the temperature goes up by ${k}°C? Type the change in £.`, value: b * k, unit: "", hint: "The gradient is the change in y for each 1 in x.", solution: [`The gradient is ${b}.`, `${b} × ${k} = ${b * k}.`] }; }
    const diff = int(r, 1, 9) * (r() < 0.5 ? 1 : -1), obs = a + b * x + diff;
    return { prompt: `A regression line is $y = ${a} + ${b}x$. When x = ${x} the observed value of y is ${obs}. What is the residual (observed − predicted)?`, value: diff, hint: "Predict y first, then subtract it from the observed value.", solution: [`Predicted: ${a} + ${b} × ${x} = ${a + b * x}.`, `${obs} − ${a + b * x} = ${diff}.`] };
  }),
  num({
    id: "trig-identities", name: "Trigonometric identities", stage: "KS5", year: 12, strand: "Geometry", prereqs: ["trig-equations"],
    blurb: "Use sin²θ + cos²θ = 1 and tan θ = sin θ ÷ cos θ to find missing values.",
    explainer: "Two identities are always true: sin²θ + cos²θ = 1, and tan θ = sin θ ÷ cos θ. Use them to turn what you know into what you want.",
    parentNote: "The first identity comes from Pythagoras on a circle with radius 1. If you know sin²θ, take it from 1 to get cos²θ.",
    talkAbout: "Why is sin²θ + cos²θ = 1 just Pythagoras' theorem in disguise?",
  }, (r, l) => {
    if (l === 1) { const s = int(r, 1, 24) * 4 / 100; return { prompt: `Given $\\sin^2\\theta = ${s}$, find $\\cos^2\\theta$.`, value: round(1 - s, 2), hint: "Use $\\sin^2\\theta + \\cos^2\\theta = 1$.", solution: [`cos²θ = 1 − sin²θ.`, `1 − ${s} = ${round(1 - s, 2)}.`] }; }
    const sc = pick(r, [[0.6, 0.8], [0.8, 0.6], [0.28, 0.96], [0.96, 0.28], [0.36, 0.48]]);
    const [s, c] = sc;
    if (l === 2 && s * s + c * c > 0.999 && s * s + c * c < 1.001) return { prompt: `Given $\\sin\\theta = ${s}$ and $\\cos\\theta = ${c}$, find $\\tan\\theta$ as a decimal.`, value: round(s / c, 4), hint: "$\\tan\\theta = \\sin\\theta \\div \\cos\\theta$.", solution: [`tan θ = ${s} ÷ ${c} = ${round(s / c, 4)}.`] };
    if (l === 2) return { prompt: `Given $\\sin\\theta = 0.6$ and $\\cos\\theta = 0.8$, find $\\tan\\theta$ as a decimal.`, value: 0.75, hint: "$\\tan\\theta = \\sin\\theta \\div \\cos\\theta$.", solution: [`tan θ = 0.6 ÷ 0.8 = 0.75.`] };
    const k = pick(r, [1, 2, 3]), a = 3 * k, b = 4 * k, asCos = r() < 0.5;
    return { prompt: `Given $\\tan\\theta = ${asCos ? `\\frac{${a}}{${b}}` : `\\frac{${b}}{${a}}`}$ with $\\theta$ acute, use $1 + \\tan^2\\theta = \\frac{1}{\\cos^2\\theta}$ to find $\\cos^2\\theta$ as a decimal.`, value: asCos ? 0.64 : 0.36, hint: "Work out $1 + \\tan^2\\theta$, then flip it.", solution: [`tan²θ = ${asCos ? `(${a}/${b})² = 0.5625` : `(${b}/${a})² = ${round((b / a) ** 2, 4)}`}.`, `1 + tan²θ = ${asCos ? 1.5625 : round(1 + (b / a) ** 2, 4)}.`, `cos²θ = 1 ÷ ${asCos ? 1.5625 : round(1 + (b / a) ** 2, 4)} = ${asCos ? 0.64 : 0.36}.`] };
  }),
  choiceSkill({
    id: "sampling-methods", name: "Sampling methods", stage: "KS5", year: 12, strand: "Statistics", prereqs: ["averages"],
    blurb: "Name a sampling method from how it works, and spot where it could be biased.",
    explainer: "A sample is a small group chosen to stand for everyone. How you choose it decides whether it is fair.",
    parentNote: "Simple random: every member has an equal chance. Systematic: every k-th item from a list. Stratified: the same proportions as the groups in the population. Opportunity (convenience): whoever is easy to reach.",
    talkAbout: "Why might asking only your friends give a biased result?",
  }, (r, l) => {
    const easy: [string, string, string][] = [
      ["Every student in a school is given a number. A computer picks 40 numbers at random. What sampling method is this?", "Simple random sampling", "Every student has an equal chance of being picked."],
      ["A researcher asks the first 30 people who walk past a shop. What sampling method is this?", "Opportunity (convenience) sampling", "She uses whoever is easy to reach."],
    ];
    const hard: [string, string, string][] = [
      ["From an alphabetical list of 500 customers, a manager picks every 25th name starting from a random point. What sampling method is this?", "Systematic sampling", "She takes every k-th item from an ordered list."],
      ["A school has 300 boys and 200 girls. A sample of 50 has 30 boys and 20 girls. What sampling method is this?", "Stratified sampling", "The sample has the same proportions as the groups in the population."],
      ["A survey about a town's bus service is carried out only at the bus station at 8 am. Why might the results be biased?", "It only includes people who already use buses, at one time of day", "The sample does not represent everyone in the town."],
    ];
    const [q, right, why] = pick(r, l === 1 ? easy : l === 2 ? [...easy, ...hard.slice(0, 2)] : hard);
    const all = ["Simple random sampling", "Opportunity (convenience) sampling", "Systematic sampling", "Stratified sampling"];
    const others = right.startsWith("It only") ? ["It uses a random number generator", "It covers every group in proportion", "The sample is too large to be useful"] : all.filter((x) => x !== right);
    return { prompt: q, right, others, hint: "Think about how the sample was chosen.", solution: [why, `So the answer is: ${right}.`] };
  }),

  // ---------------------------------------------------------------- Year 13
  num({
    id: "parametric-equations", name: "Parametric equations", stage: "KS5", year: 13, strand: "Algebra", prereqs: ["differentiate"],
    blurb: "Find points on a curve from x(t) and y(t), and find dy/dx using the chain rule.",
    explainer: "In parametric equations, x and y both depend on a third letter, t. Put in a value of t to get a point. For the gradient, divide dy/dt by dx/dt.",
    parentNote: "Substitute t into both equations to get a point. The gradient is dy/dx = (dy/dt) ÷ (dx/dt).",
    talkAbout: "Why is dy/dx the same as dy/dt divided by dx/dt?",
  }, (r, l) => {
    const a = int(r, 1, 4), c = int(r, -3, 5), k = int(r, 1, 3), d = int(r, -4, 4), t = int(r, 1, 4);
    const x = `${a}t ${c < 0 ? "-" : "+"} ${Math.abs(c)}`, y = `${a * k}t^2 ${d < 0 ? "-" : "+"} ${Math.abs(d)}`;
    if (l === 1) return { prompt: `A curve has parametric equations $x = ${x}$ and $y = ${y}$. Find the y-coordinate when $t = ${t}$.`, value: a * k * t * t + d, hint: "Put the value of t into the y equation.", solution: [`y = ${a * k} × ${t}² ${d < 0 ? "−" : "+"} ${Math.abs(d)} = ${a * k * t * t + d}.`] };
    if (l === 2) return { prompt: `A curve has parametric equations $x = ${x}$ and $y = ${y}$. Find the value of $t$ at the point where $x = ${a * t + c}$.`, value: t, hint: "Solve the x equation for t.", solution: [`${a}t ${c < 0 ? "−" : "+"} ${Math.abs(c)} = ${a * t + c}.`, `${a}t = ${a * t}, so t = ${t}.`] };
    return { prompt: `A curve has parametric equations $x = ${x}$ and $y = ${y}$. Find $\\frac{dy}{dx}$ when $t = ${t}$.`, value: 2 * k * t, hint: "Find dy/dt and dx/dt, then divide.", solution: [`dx/dt = ${a}, dy/dt = ${2 * a * k}t.`, `dy/dx = ${2 * a * k}t ÷ ${a} = ${2 * k}t.`, `When t = ${t}: ${2 * k * t}.`] };
  }),
  num({
    id: "trapezium-rule", name: "The trapezium rule", stage: "KS5", year: 13, strand: "Calculus", prereqs: ["definite-integrals"],
    blurb: "Estimate the area under a curve by splitting it into trapeziums.",
    explainer: "Cut the area into thin strips of the same width h. The estimate is h ÷ 2 × (first + last + 2 × all the middle values).",
    parentNote: "List the y-values, add the first and last, double the middle ones and add them on, then multiply by half the strip width.",
    talkAbout: "Would more strips make the estimate better or worse, and why?",
  }, (r, l) => {

    const strips = l === 1 ? 2 : l === 2 ? 3 : 4, h = l === 3 ? pick(r, [0.5, 1]) : pick(r, [1, 2]);
    const ys = Array.from({ length: strips + 1 }, () => int(r, 2, 12));
    const mid = ys.slice(1, -1).reduce((a, b) => a + b, 0), total = (h / 2) * (ys[0] + ys[strips] + 2 * mid);
    const pts = ys.map((y, i) => [i * h, y] as [number, number]);
    const figure = graph([], [0, strips * h, h], `${strips} trapezium strips, each ${h} wide. The y-values are ${ys.join(", ")}.`, { strips: pts });
    return { prompt: `The diagram shows ${strips} strips of width ${h} under a curve, with y-values ${ys.join(", ")}. Use the trapezium rule to estimate the area.`, figure, value: round(total, 3), hint: "Add the first and last, add double the middle ones, then multiply by h ÷ 2.", solution: [`First + last = ${ys[0]} + ${ys[strips]} = ${ys[0] + ys[strips]}.`, `Double the middle values: 2 × ${mid} = ${2 * mid}.`, `Total in brackets = ${ys[0] + ys[strips] + 2 * mid}.`, `${h} ÷ 2 × ${ys[0] + ys[strips] + 2 * mid} = ${round(total, 3)}.`] };
  }),
];
