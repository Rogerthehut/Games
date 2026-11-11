import { int, type Rng } from "../engine/rng";
import { cuboidFig, graph, lineGraph, pointGridFig, sample } from "./figures";
import type { Figure, Question, Skill } from "../engine/types";
import { frac } from "./helpers";

type NumericTask = {
  prompt: string;
  value: number;
  hint: string;
  solution: string[];
  unit?: string;
  figure?: Figure;
};

function numericSkill(info: Omit<Skill, "generate">, task: (rng: Rng, level: number) => NumericTask): Skill {
  return {
    ...info,
    generate(rng, level): Question {
      const { prompt, value, hint, solution, unit, figure } = task(rng, level);
      return {
        skill: info.id, level, prompt, answer: { kind: "number", value, unit }, figure,
        hint, solution, shown: `${value}${unit ? ` ${unit}` : ""}`,
      };
    },
  };
}

export function withBarChartHelp(question: Question): Question {
  if (question.skill !== "read-bar-charts" || question.figure?.type !== "bar-chart") return question;
  const { bars, interval } = question.figure;
  const rabbit = bars.find((bar) => bar.label === "Rabbit");
  const fish = bars.find((bar) => bar.label === "Fish");
  if (!rabbit || !fish) return question;
  return { ...question, ...barChartHelp(fish.height * interval, rabbit.height * interval) };
}

function barChartHelp(fishVotes: number, rabbitVotes: number) {
  return {
    hint: "Look across from the top of each bar to the numbers on the left. Then take the fish votes away from the rabbit votes.",
    solution: [
      `Look across from the top of the rabbit bar. It shows ${rabbitVotes} votes.`,
      `Do the same for the fish bar. It shows ${fishVotes} votes.`,
      `Take away the fish votes: ${rabbitVotes} − ${fishVotes} = ${rabbitVotes - fishVotes} more votes for the rabbit.`,
    ],
  };
}

export const expansionSkills: Skill[] = [
  numericSkill({
    id: "money-change", name: "Money and change", stage: "KS2", year: 3, strand: "Measures", prereqs: ["add-sub"],
    blurb: "Add prices and work out change in pence.", parentNote: "Convert £1 to 100p before subtracting.", talkAbout: "How could you count up to the amount paid?",
  }, (r, l) => {
    const paid = 100 * l, a = int(r, 21, 48), b = l > 1 ? int(r, 31, 79) : 0;
    return {
      prompt: `A pencil costs ${a}p.${b ? ` A ruler costs ${b}p.` : ""} You pay £${l}. How much change should you get? Give your answer in pence.`,
      value: paid - a - b, unit: "p", hint: `Start by writing £${l} in pence.`,
      solution: [`£${l} is ${paid}p.`, b ? `The two items cost ${a}p + ${b}p = ${a+b}p. Subtract that from ${paid}p.` : `Subtract the price, ${a}p, from ${paid}p.`],
    };
  }),
  numericSkill({
    id: "elapsed-time", name: "How much time has passed?", stage: "KS2", year: 3, strand: "Measures", prereqs: ["add-sub"],
    blurb: "Find the time between two clock readings.", parentNote: "Count to the next hour and then count on.", talkAbout: "Why do we count to 60 minutes instead of 100?",
  }, (r, l) => {
    const hour = int(r, 8, 11), start = int(r, 2, 9) * 5, end = l === 1 ? int(r, 1, 2) * 5 : int(r, 2, 10) * 5;
    const value = 60 - start + end + (l === 3 ? 60 : 0);
    const finishHour = hour + (l === 3 ? 2 : 1);
    return {
      prompt: `A journey starts at ${hour}:${start}. It ends at ${finishHour}:${String(end).padStart(2, "0")} on the same day. How many minutes does the journey take?`,
      value, unit: "min", hint: `Find the number of minutes from ${hour}:${start} to ${hour+1}:00 first.`,
      solution: [`It takes ${60-start} minutes to reach ${hour+1}:00.`, `Add the remaining ${end + (l === 3 ? 60 : 0)} minutes.`],
    };
  }),
  numericSkill({
    id: "fraction-order", name: "Comparing fractions", stage: "KS2", year: 3, strand: "Number", prereqs: ["times-tables"],
    blurb: "Compare fractions that have the same denominator.", parentNote: "For equal-sized wholes, a larger numerator means more of the same-sized pieces.", talkAbout: "Would the same rule work if the denominators were different?",
  }, (r, l) => {
    const d = int(r, 4 + l, 9 + l), a = int(r, 1, d - 2), b = int(r, a + 1, d - 1);
    const first = r() < .5 ? a : b, second = first === a ? b : a;
    return {
      prompt: `Which is larger, $${frac(first,d)}$ or $${frac(second,d)}$? Enter the numerator of the larger fraction.`,
      value: b, hint: "The pieces are the same size. Which fraction has more pieces?",
      solution: [
        `The bottom number is ${d} in both fractions, so the pieces are the same size.`,
        `${b} pieces are more than ${a} pieces. Enter ${b}, the top number (the numerator).`,
      ],
    };
  }),
  numericSkill({
    id: "read-bar-charts", name: "Reading bar charts", stage: "KS2", year: 4, strand: "Statistics", prereqs: ["times-tables"],
    blurb: "Use the numbers on the left to read and compare bars.", parentNote: "Ask your child to look across from the top of a bar and read its number.", talkAbout: "How many votes does each gap between the lines stand for?",
  }, (r, l) => {
    const scale = l * 2, a = int(r, 2, 5), b = int(r, a + 1, 8);
    return {
      prompt: "The chart shows votes for a class pet. How many more votes did the rabbit get than the fish?",
      figure: { type: "bar-chart", interval: scale, intervals: 8, bars: [{ label: "Fish", height: a }, { label: "Rabbit", height: b }, { label: "Hamster", height: int(r, 2, 7) }] },
      value: (b-a)*scale, ...barChartHelp(a * scale, b * scale),
    };
  }),
  numericSkill({
    id: "hundredths", name: "Tenths and hundredths", stage: "KS2", year: 4, strand: "Number", prereqs: ["frac-equiv", "place-value"],
    blurb: "Connect fractions over 10 and 100 with decimal notation.", parentNote: "Use a hundred square to show that one tenth is ten hundredths.", talkAbout: "What does the zero mean in 0.07?",
  }, (r, l) => {
    const n = l === 1 ? int(r, 1, 9) : int(r, 11, 99), d = l === 1 ? 10 : 100;
    return {
      prompt: `Write $${frac(n,d)}$ as a decimal.`, value: n/d, hint: d === 10 ? "Tenths go in the first place after the decimal point." : "Hundredths go in the second place after the decimal point.",
      solution: [
        `The bottom number is ${d}, so the top number counts ${d === 10 ? "tenths" : "hundredths"}.`,
        `${n} ${d === 10 ? (n === 1 ? "tenth" : "tenths") : "hundredths"} is ${n / d} as a decimal.`,
      ],
    };
  }),
  numericSkill({
    id: "mixed-numbers", name: "Mixed numbers and improper fractions", stage: "KS2", year: 5, strand: "Number", prereqs: ["frac-equiv", "division"],
    blurb: "Count the fraction pieces in whole numbers and mixed numbers.", parentNote: "Draw the wholes in equal parts before counting the extra pieces.", talkAbout: "Why does the denominator stay the same?",
  }, (r, l) => {
    const d = int(r, 3, 4+l), whole = int(r, 1, 2+l), n = int(r, 1, d-1);
    return {
      prompt: `Write $${whole}\\,${frac(n,d)}$ as a fraction with denominator ${d}. Enter the numerator.`,
      value: whole*d+n, hint: `Each whole is made of ${d} equal pieces.`,
      solution: [
        `There are ${d} pieces in each whole, so ${whole} × ${d} = ${whole * d} pieces.`,
        `Add ${n} more to get ${whole * d + n} pieces. That's the top number (the numerator). The bottom number stays ${d}.`,
      ],
    };
  }),
  numericSkill({
    id: "volume-cuboids", name: "Volume of cuboids", stage: "KS2", year: 5, strand: "Measures", prereqs: ["perimeter-area", "mult-written"],
    blurb: "Use layers of cubes to calculate volume.", parentNote: "Calculate the number of cubes in one layer, then multiply by the number of layers.", talkAbout: "What does one cubic centimetre look like?",
  }, (r, l) => {
    const a = int(r, 2, 4+l), b = int(r, 2, 5+l), c = int(r, 2, 4+l);
    return { figure: cuboidFig(a, b, c), prompt: `A cuboid is ${a} cm long, ${b} cm wide and ${c} cm high. What is its volume in cubic centimetres?`,
      value: a*b*c, unit: "cm³", hint: "Find how many 1 cm cubes fit in one layer.", solution: [`One layer holds ${a} × ${b} = ${a*b} cubes.`, `Multiply by the ${c} layers.`] };
  }),
  numericSkill({
    id: "pie-chart-counts", name: "Interpreting pie charts", stage: "KS2", year: 6, strand: "Statistics", prereqs: ["frac-amount", "angles-basic"],
    blurb: "Use a sector's share of a whole circle to find a count.", parentNote: "Connect the sector angle to a fraction of 360°.", talkAbout: "What would a semicircle tell you?",
  }, (r, l) => {
    const divisions = [4, 6, 8][l-1] ?? 4, units = int(r, 3, 11), sectors = int(r, 1, divisions-1);
    const total = divisions * units;
    const angle = 360 / divisions * sectors;
    return { figure: { type: "pie", slices: [{ label: `football ${angle}°`, value: sectors * units }, { label: "others", value: total - sectors * units }], alt: `A pie chart of ${total} votes. The football slice has an angle of ${angle} degrees.` }, prompt: `A pie chart shows ${total} votes. The slice for football has an angle of ${angle}°. How many votes did football get?`,
      value: sectors * units, hint: angle === 180
        ? "A full circle is 360°. What share of the circle is a 180° slice?"
        : `Picture the circle cut into equal slices of ${360 / divisions}° each. How many of those fit in the football slice?`,
      solution: angle === 180
        ? ["The football slice is 180°. That's half of 360°, so football got half the votes.", `${total} ÷ 2 = ${total / 2} votes.`]
        : [
          `Split the circle into ${divisions} equal slices of ${360 / divisions}° each. The football slice takes up ${sectors} of them.`,
          `Share the ${total} votes equally between the ${divisions} slices. That's ${units} votes for each slice.`,
          `Count ${sectors} lots of ${units}: ${sectors} × ${units} = ${sectors * units} votes.`,
        ] };
  }),
  numericSkill({
    id: "scale-recipes", name: "Scaling recipes", stage: "KS2", year: 6, strand: "Ratio", prereqs: ["division", "mult-written"],
    blurb: "Scale an ingredient to make a different number of servings.", parentNote: "Find the amount per serving before scaling up.", talkAbout: "How could you check your answer is the right size?",
  }, (r, l) => {
    const each = int(r, 15, 30), old = int(r, 2, 4+l), next = old + int(r, 2, 4+l);
    return { prompt: `A recipe for ${old} people uses ${each*old} g of flour. How many grams of flour are needed for ${next} people?`,
      value: each*next, unit: "g", hint: "Find the amount of flour for one person first.",
      solution: [`Divide ${each*old} g by ${old} to get ${each} g per person.`, `Multiply by ${next} people.`] };
  }),
  numericSkill({
    id: "substitute", name: "Substituting into expressions", stage: "KS3", year: 7, strand: "Algebra", prereqs: ["order-ops"],
    blurb: "Replace a letter with its value and calculate.", parentNote: "Write the substitution before carrying out the operations.", talkAbout: "Why does 4x mean four times x?",
  }, (r, l) => {
    const x = int(r, 2, 8), a = int(r, 2, 6), b = int(r, 2, 8), squared = l === 3;
    return { prompt: `Calculate $${a}x${squared ? "^2" : ""} + ${b}$ when $x = ${x}$.`,
      value: a*(squared ? x*x : x)+b, hint: "Replace x with the given number, then follow the order of operations.",
      solution: [`Substitute ${x} for x.`, squared ? `Square ${x} first, multiply by ${a}, then add ${b}.` : `Multiply ${x} by ${a}, then add ${b}.`] };
  }),
  numericSkill({
    id: "probability-fractions", name: "Simple probability", stage: "KS3", year: 7, strand: "Statistics", prereqs: ["frac-equiv"],
    blurb: "Work out the chance of an event with equally likely outcomes.", parentNote: "Divide the number of favourable outcomes by the total.", talkAbout: "How would adding another blue counter change the probability?",
  }, (r, l) => {
    const blue = int(r, 2, 4+l), red = int(r, 2, 6+l), green = l === 3 ? int(r, 2, 5) : 0;
    const total = blue+red+green;
    return { prompt: `A bag holds ${blue} blue counters and ${red} red counters${green ? `, plus ${green} green counters` : ""}. One counter is picked at random. What is the probability it is blue? Give a fraction or a decimal.`,
      value: blue/total, hint: "Count the blue counters and then count all the counters.",
      solution: [`There are ${total} counters altogether and ${blue} are blue.`, `The probability is $${frac(blue,total)}$.`] };
  }),
  numericSkill({
    id: "linear-gradient", name: "Gradient of a straight line", stage: "KS3", year: 9, strand: "Algebra", prereqs: ["substitute"],
    blurb: "Find how much y changes for each unit of x.", parentNote: "Compare vertical change with horizontal change.", talkAbout: "What does a gradient of zero tell you?",
  }, (r, l) => {
    const x = int(r, 1, 5), y = int(r, 2, 8), dx = int(r, 2, 5), gradient = int(r, 1, 2+l);
    return { figure: lineGraph(gradient, y - gradient * x, 0, x + dx + 1, [{ x, y, label: `(${x}, ${y})` }, { x: x + dx, y: y + dx * gradient, label: `(${x + dx}, ${y + dx * gradient})` }]), prompt: `A straight line passes through $(${x}, ${y})$ and $(${x+dx}, ${y+dx*gradient})$. Find its gradient.`,
      value: gradient, hint: "Divide the change in y by the change in x.", solution: [`The change in y is ${dx*gradient}.`, `The change in x is ${dx}. Divide the two changes.`] };
  }),
  numericSkill({
    id: "reverse-percentages", name: "Reverse percentages", stage: "KS4", year: 10, strand: "Number", prereqs: ["pct-amount"],
    blurb: "Recover an original price after a percentage change.", parentNote: "Identify the percentage of the original represented by the final price.", talkAbout: "Why does adding 20% back to a sale price give the wrong answer?",
  }, (r, l) => {
    const change = [10, 20, 25][l-1] ?? 20, original = int(r, 4, 16)*20;
    const final = original*(100-change)/100;
    return { prompt: `A jacket costs £${final} after a ${change}% discount. What was its original price in pounds?`,
      value: original, hint: `The sale price is ${100-change}% of the original.`,
      solution: [`Write ${100-change}% as ${(100-change)/100}.`, `Divide £${final} by ${(100-change)/100} to find the original price.`] };
  }),
  numericSkill({
    id: "standard-form", name: "Standard form", stage: "KS4", year: 10, strand: "Number", prereqs: ["place-value", "decimals"],
    blurb: "Interpret powers of ten in standard form.", parentNote: "Identify the direction and size of the place value shift.", talkAbout: "What changes when the power of ten is negative?",
  }, (r, l) => {
    const a = int(r, 11, 98)/10, power = l === 3 ? -int(r, 2, 4) : int(r, 2, 2+l);
    return { prompt: `Write $${a} \\times 10^{${power}}$ as an ordinary number.`,
      value: Number((a*10**power).toPrecision(8)), hint: power < 0 ? "A negative power of ten makes the number smaller." : "A positive power of ten makes the number larger.",
      solution: [`Multiply ${a} by 10 to the power ${power}. Each factor of ten changes the place value by one place.`] };
  }),
  numericSkill({
    id: "circle-area", name: "Area of a circle", stage: "KS4", year: 10, strand: "Geometry", prereqs: ["perimeter-area", "order-ops"],
    blurb: "Use radius or diameter to calculate the area of a circle.", parentNote: "Check whether the question gives the radius or diameter.", talkAbout: "What happens to the area when the radius doubles?",
  }, (r, l) => {
    const radius = int(r, 3, 7+l);
    const exact = Math.PI*radius*radius;
    return { prompt: `A circle has a ${l === 1 ? `radius of ${radius}` : `diameter of ${2*radius}`} cm. Calculate its area in square centimetres to 1 decimal place.`,
      value: Math.round(exact*10)/10, unit: "cm²", hint: "Use the radius in the formula $A = \\pi r^2$.",
      solution: [`The radius is ${radius} cm.`, `Calculate $\\pi \\times ${radius}^2$, then round to one decimal place.`] };
  }),
  numericSkill({
    id: "stationary-points", name: "Finding stationary points", stage: "KS5", year: 12, strand: "Calculus", prereqs: ["differentiate", "linear-gradient"],
    blurb: "Connect a zero derivative with a horizontal tangent.", parentNote: "Solve the derivative equation, then check what the gradient does either side.", talkAbout: "Why does a zero derivative alone not establish a minimum?",
  }, (r, l) => {
    const a = int(r, 1, 3+l), x = int(r, 2, 8), c = int(r, 1, 12);
    const xs = x, curve = [{ pts: sample((t) => a * t * t - 2 * a * xs * t + c, -1, 2 * xs + 1) }];
    return { figure: graph(curve, [-1, 2 * xs + 1, 1], `The graph of y = ${a}x² − ${2 * a * xs}x + ${c}, a U-shaped curve.`), prompt: `Find the x-coordinate of the stationary point of $y = ${a}x^2 - ${2*a*x}x + ${c}$.`,
      value: x, hint: "Differentiate and set the derivative equal to zero.",
      solution: [`The gradient is $${2*a}x - ${2*a*x}$.`, `A stationary point has zero gradient. Solve $${2*a}x = ${2*a*x}$.`] };
  }),
  numericSkill({
    id: "definite-integrals", name: "Definite integrals of linear functions", stage: "KS5", year: 12, strand: "Calculus", prereqs: ["differentiate", "substitute"],
    blurb: "Find an antiderivative and evaluate it at two limits.", parentNote: "Evaluate at both limits before subtracting.", talkAbout: "Why does the constant of integration cancel?",
  }, (r, l) => {
    const a = int(r, 1, 5), b = int(r, 1, 5+l), low = l === 1 ? 0 : int(r, 1, 3), high = low + int(r, 2, 4+l);
    return { prompt: `Evaluate $\\int_{${low}}^{${high}} (${2*a}x + ${b})\\,dx$.`,
      value: a*(high*high-low*low)+b*(high-low), hint: "Find an antiderivative, then subtract its value at the lower limit from its value at the upper limit.",
      solution: [`An antiderivative is $${a}x^2 + ${b}x$.`, `Evaluate it at ${high} and ${low}, then subtract.`] };
  }),
  numericSkill({
    id: "coordinates", name: "Moving on a grid", stage: "KS2", year: 4, strand: "Geometry", prereqs: ["place-value"],
    blurb: "Move points left and right on a coordinate grid.", parentNote: "Read the horizontal coordinate before the vertical one.", talkAbout: "What would change if you moved up instead?",
  }, (r, l) => {
    const x = int(r, 4, 8), y = int(r, 1, 8), step = int(r, 1, 3);
    const left = l > 1;
    return {
      figure: pointGridFig(x, y, 12),
      prompt: `A point starts at (${x}, ${y}) and moves ${step} ${step === 1 ? "square" : "squares"} ${left ? "left" : "right"}. What is its new horizontal coordinate?`,
      value: x + (left ? -step : step), hint: "The horizontal coordinate is the first number.",
      solution: [`Start at ${x} on the horizontal axis.`, `${left ? "Subtract" : "Add"} ${step}. The vertical coordinate stays at ${y}.`],
    };
  }),
  numericSkill({
    id: "using-formulae", name: "Using a formula", stage: "KS2", year: 6, strand: "Algebra", prereqs: ["mult-written", "division"],
    blurb: "Use a simple formula for the perimeter of a rectangle.", parentNote: "Label the two long sides and the two short sides.", talkAbout: "How would you find the width if you knew the perimeter and length?",
  }, (r, l) => {
    const width = int(r, 2, 5), length = int(r, 6, 11), perimeter = 2*(length+width);
    return {
      prompt: l === 3 ? `A rectangle has a perimeter of ${perimeter} cm and a length of ${length} cm. What is its width in centimetres?`
        : `Use the rule “perimeter = 2 × (length + width)”. Find the perimeter of a rectangle that is ${length} cm long and ${width} cm wide.`,
      value: l === 3 ? width : perimeter, unit: "cm",
      hint: l === 3 ? "Half the perimeter is one length plus one width." : "Add the length and width before doubling.",
      solution: l === 3 ? [`Half the perimeter is ${perimeter/2} cm.`, `Subtract the length, ${length} cm, to find the width.`]
        : [`Add ${length} cm and ${width} cm.`, `Double ${length+width} cm to count both pairs of sides.`],
    };
  }),
  numericSkill({
    id: "constant-acceleration", name: "Motion with constant acceleration", stage: "KS5", year: 12, strand: "Measures", prereqs: ["substitute"],
    blurb: "Choose and use a constant-acceleration equation.", parentNote: "List the known quantities and check their signs before substituting.", talkAbout: "Why does the equation depend on acceleration being constant?",
  }, (r, l) => {
    const u = int(r, 2, 8), a = int(r, 2, 5), t = 2 * int(r, 2, 5), v = u+a*t;
    return {
      prompt: l === 3 ? `A cyclist moving at ${u} m/s accelerates at a constant rate to ${v} m/s in ${t} seconds. How far do they travel in metres?`
        : `A cyclist is moving at ${u} m/s. They accelerate at a constant rate of ${a} m/s² for ${t} seconds. Find their final speed in metres per second.`,
      value: l === 3 ? (u+v)*t/2 : v,
      unit: l === 3 ? "m" : undefined,
      hint: l === 3 ? "Average the starting and finishing speeds, then use the time." : "Use $v = u + at$.",
      solution: l === 3 ? [`Their average speed is (${u} + ${v}) ÷ 2 = ${(u+v)/2} m/s.`, `Multiply by ${t} seconds to find the distance.`]
        : [`The increase in speed is ${a} × ${t} = ${a*t} m/s.`, `Add that to their starting speed of ${u} m/s.`],
    };
  }),
];
