import type { ToolId } from "../ui/working-out";

/**
 * How a grown-up can help with a topic: the usual reasons children struggle with it, the methods taught in school, what to say, and which
 * working-out tool suits it. Grouped by kind of topic, with a general fallback, so every topic has something useful.
 */
export interface Method { title: string; steps: string[] }
export interface HelpFamily {
  id: string;
  name: string;
  test: RegExp;
  /** Common reasons children find this kind of topic hard. */
  why: string[];
  methods: Method[];
  /** Things to say or ask, in a child's terms. */
  ask: string[];
  tool?: ToolId;
}

export const FAMILIES: HelpFamily[] = [
  {
    id: "place-value", name: "place value, rounding and decimals", test: /^(place-value|large-numbers|rounding|decimals|thousandths|hundredths|divide-10-100|place-value-millions|count-steps|roman-numerals)/,
    why: ["The value of a digit depends on its place, and it's easy to read the digits without thinking about their size.", "Rounding asks for the digit to the right, and children often look at the wrong one.", "Zeros as placeholders are easy to drop."],
    methods: [
      { title: "Use a place-value chart", steps: ["Draw columns: thousands, hundreds, tens, ones (and tenths, hundredths).", "Write the number with one digit in each column.", "Read each digit with its value: 4 in the tens column is 40."] },
      { title: "Rounding with a number line", steps: ["Draw the two nearby tens, hundreds or whole numbers, with the number between them.", "Mark the halfway point.", "If it is at or past halfway, round up. Otherwise round down."] },
    ],
    ask: ["Which column is that digit in?", "What is it really worth?", "Which two tens is this number between?"], tool: "numberline",
  },
  {
    id: "add-sub", name: "adding and subtracting", test: /^(add-sub|measure-add|add-sub-money|money-change|coins-notes|pounds-pence|shopping-bills)/,
    why: ["Carrying (or exchanging) across a column is the usual slip.", "Lining up digits by place value, not from the left.", "Money needs the pence kept in their own column."],
    methods: [
      { title: "Column (bus-stop) method", steps: ["Line the numbers up by place value, ones under ones.", "Add or subtract the ones first, then the tens, then the hundreds.", "Carry (add) or exchange (subtract) a ten when needed, writing it small.", "Check by doing the opposite: add to check a subtraction."] },
      { title: "Jump along a number line", steps: ["Start at the bigger or smaller number.", "Jump in tens and ones, or round to the next ten then jump the rest.", "Write down each jump so none are lost."] },
    ],
    ask: ["Which column do we start with?", "Do we need to carry or exchange here?", "How could you check it with the opposite sum?"], tool: "column",
  },
  {
    id: "times", name: "multiplying and times tables", test: /^(times-tables|mult-written|multiply-three|multiply-divide-money|factors-multiples|primes-squares-cubes)/,
    why: ["Tables facts are not yet automatic, so working them out takes the attention needed for the method.", "In written multiplication, a missed placeholder zero or an unmatched carry.", "Mixing up factors, multiples and primes."],
    methods: [
      { title: "Arrays and skip counting", steps: ["Draw the sum as rows and columns of dots: 6 × 4 is 6 rows of 4.", "Count in steps of the table: 4, 8, 12, 16, 20, 24.", "Use a fact you know and adjust: 6 × 4 is double 3 × 4."] },
      { title: "Grid method for bigger numbers", steps: ["Split each number into tens and ones.", "Multiply each part in its own box.", "Add the boxes up to get the answer."] },
    ],
    ask: ["Which table fact do we need?", "Can you split it into easier parts?", "Does your answer look sensible? Estimate first."], tool: "hundred",
  },
  {
    id: "division", name: "dividing", test: /^(division|long-division)/,
    why: ["Not seeing division as sharing or grouping.", "Working left to right and losing track of the remainder.", "Weak times tables slow every step."],
    methods: [
      { title: "Short division (bus stop)", steps: ["Write the number inside the bus stop and the divisor outside.", "Divide the first digit; write the answer on top.", "Carry any remainder to the next digit.", "Check by multiplying the answer by the divisor and adding any remainder."] },
      { title: "Chunking (for long division)", steps: ["Write out some multiples of the divisor.", "Take away the biggest chunk that fits, and note it.", "Repeat with what is left until nothing (or a remainder) is left.", "Add up the chunks for the answer."] },
    ],
    ask: ["How many groups of this fit in the number?", "What is left over?", "Can you multiply back to check?"], tool: "column",
  },
  {
    id: "fractions", name: "fractions", test: /^(frac|fraction|mixed-numbers)/,
    why: ["Treating the top and bottom as two separate whole numbers.", "Adding the denominators when adding fractions.", "Forgetting the parts must be the same size to compare or add."],
    methods: [
      { title: "Picture it with a fraction wall or bar", steps: ["Draw a bar and split it into the number of equal parts on the bottom.", "Shade the number of parts on the top.", "Compare or add by lining the bars up."] },
      { title: "Equivalent fractions", steps: ["Multiply (or divide) the top and bottom by the same number.", "That changes how it is cut up, not how much it is.", "To add, make the bottoms the same first, then add the tops only."] },
      { title: "Fraction of an amount", steps: ["Divide the amount by the bottom number to find one part.", "Multiply by the top number to get the parts you want."] },
    ],
    ask: ["How many equal parts is it cut into?", "Are the pieces the same size?", "What do we do to the top if we change the bottom?"], tool: "wall",
  },
  {
    id: "percent", name: "percentages, ratio and proportion", test: /^(pct|fdp|ratio|scale|best-value|currency|percent|proportion)/,
    why: ["Percent means 'out of 100', and children skip that step.", "In ratio, the numbers are parts, not amounts.", "Mixing up which quantity is being scaled."],
    methods: [
      { title: "The 10% method", steps: ["Find 10% by dividing by 10.", "Build the percentage from tens and ones: 30% is three lots of 10%; 5% is half of 10%.", "Add the pieces up."] },
      { title: "Bar model for ratio", steps: ["Draw a bar split into the total number of parts.", "Divide the total by the parts to find one part.", "Multiply by each share."] },
      { title: "Find one, then scale", steps: ["Work out what one is worth (divide).", "Multiply to get what you need."] },
    ],
    ask: ["What is 10% of it?", "How many equal parts is the whole split into?", "What would one of them cost?"], tool: "paper",
  },
  {
    id: "negative", name: "negative numbers", test: /^(negative-numbers|count-through-zero)/,
    why: ["Direction on the number line is unclear.", "Subtracting a larger number from a smaller one feels impossible."],
    methods: [{ title: "Use a number line or a thermometer", steps: ["Draw the number line with zero in the middle.", "Adding moves right, taking away moves left.", "Count the steps across zero carefully."] }],
    ask: ["Which way do we move?", "How many steps to zero, then how many more?"], tool: "numberline",
  },
  {
    id: "time", name: "time", test: /^(analogue-clocks|elapsed-time|convert-time|timetables|time-facts)/,
    why: ["Both clock hands are read at once, and the hour hand is often misread.", "Time is not in tens (60 minutes, 24 hours), so decimal habits cause slips.", "Crossing an hour when finding how long something takes."],
    methods: [
      { title: "Jump to the next hour", steps: ["Start at the first time on a number line.", "Jump to the next whole hour, then add the rest.", "Add the jumps to find how long."] },
      { title: "Read the clock in two steps", steps: ["Say the hour hand first (the hour just gone).", "Count the minutes by fives round the minute hand.", "Say it as 'minutes past' or 'to'."] },
    ],
    ask: ["What was the last hour on the clock?", "How many minutes to the next hour?", "What is the first jump?"], tool: "numberline",
  },
  {
    id: "measures", name: "measures and scales", test: /^(measures-convert|imperial-metric|scales-reading|measure)/,
    why: ["Not working out what each small mark on a scale is worth.", "Multiplying and dividing by 10, 100 and 1000 the wrong way round.", "Units not matching before calculating."],
    methods: [
      { title: "Read a scale carefully", steps: ["Find two labelled numbers next to each other.", "Count how many gaps are between them.", "Divide the difference by the gaps to find what each mark is worth."] },
      { title: "Convert with the 'bigger unit, smaller number' rule", steps: ["A bigger unit means fewer of them; a smaller unit means more.", "Multiply or divide by 10, 100 or 1000 depending on the units.", "Write the units next to the answer."] },
    ],
    ask: ["What is each little mark worth?", "Are the units the same?", "Will there be more or fewer of the new unit?"], tool: "numberline",
  },
  {
    id: "area", name: "perimeter, area and volume", test: /^(perimeter|area|rectangle-properties|volume|parallelogram|circle)/,
    why: ["Mixing up perimeter (around) and area (inside).", "Forgetting the units: cm for perimeter, cm² for area.", "Missing a hidden side on an L-shaped figure."],
    methods: [
      { title: "Sketch, label, then calculate", steps: ["Redraw the shape and write every length on it, including hidden ones.", "Perimeter: walk round the outside and add every side.", "Area: count squares inside, or length × width."] },
    ],
    ask: ["Are we measuring round the edge or the space inside?", "Which sides are missing?", "What units go with this?"], tool: "paper",
  },
  {
    id: "angles", name: "angles and shapes", test: /^(angles|right-angles|angle-types|measure-angles|draw-angles|shape|shapes|draw-shapes|polygon|symmetry|line-types|vertically|nets|reflect|coordinates)/,
    why: ["Reading the wrong scale on a protractor.", "Not estimating first, so an impossible answer isn't noticed.", "Mixing up the names of shapes and angles."],
    methods: [
      { title: "Estimate, then measure", steps: ["Is it smaller or bigger than a right angle?", "Pick the protractor scale that starts at 0 on your arm.", "Check your reading matches your estimate."] },
      { title: "Key facts to know", steps: ["Angles on a straight line add to 180°.", "Angles in a triangle add to 180°; in a quadrilateral, 360°.", "Angles round a point add to 360°."] },
      { title: "Coordinates: along the corridor, then up the stairs", steps: ["Say the first number (across) before the second (up).", "Count the squares rather than the lines."] },
    ],
    ask: ["Is it bigger or smaller than a right angle?", "Which scale starts at 0 here?", "Which numbers go together on a straight line?"], tool: "paper",
  },
  {
    id: "data", name: "charts, data and averages", test: /^(pictograms|read-bar-charts|read-tables|line-graphs|pie|averages|scale-recipes|stats|histogram|boxplot|probability|cumulative)/,
    why: ["Not reading the title, key and axis labels first.", "Scales that go up in twos, fives or tens, not ones.", "Mixing up mean, median, mode and range."],
    methods: [
      { title: "Read the chart in order", steps: ["Read the title and what each axis or symbol means.", "Check the scale: what does one step or one picture stand for?", "Only then read off the value."] },
      { title: "Averages: MMMR", steps: ["Mean: add them all, divide by how many.", "Median: put them in order, take the middle.", "Mode: the one that appears most.", "Range: biggest minus smallest."] },
    ],
    ask: ["What is the chart about?", "What does one square or picture stand for?", "Which average is the question asking for?"], tool: "paper",
  },
  {
    id: "problems", name: "word problems and algebra", test: /^(word-problems|order-ops|missing-number|two-unknowns|using-formulae|sequences|substitute|solve-linear|expand|factoris|nth-term|simultaneous|quadratic|algebra)/,
    why: ["Not knowing which operation the words ask for.", "Skipping the order of operations (brackets, then powers, then × ÷, then + −).", "In algebra, treating letters as words rather than numbers."],
    methods: [
      { title: "Read, picture, choose, solve, check", steps: ["Read it twice and underline the question.", "Draw a bar model or quick sketch.", "Pick the operation and write the sum.", "Solve it, then ask if the answer makes sense."] },
      { title: "Balance method for equations", steps: ["Whatever you do to one side, do to the other.", "Undo the adding or taking away first, then the multiplying or dividing.", "Check by putting the answer back in."] },
      { title: "Order of operations (BIDMAS)", steps: ["Brackets, then powers, then multiply and divide, then add and subtract, left to right."] },
    ],
    ask: ["What is the question really asking?", "Can you draw it?", "What happens if we put your answer back in?"], tool: "paper",
  },
  {
    id: "secondary", name: "trigonometry, calculus and advanced algebra", test: /^(pythagoras|trig|differentiate|integrate|binomial|logarithm|exponential|vectors|series|geometric|arithmetic|newton|factor-theorem|circle-theorems|surds|indices|functions|bounds|similar)/,
    why: ["Not labelling the sides or setting the problem up before calculating.", "Rules (power rule, chain rule, log laws) recalled loosely rather than practised.", "Arithmetic slips inside a long method."],
    methods: [
      { title: "Set it up first", steps: ["Draw and label a diagram, or write the formula in full.", "Substitute values carefully, keeping brackets.", "Check units and that the answer is sensible."] },
      { title: "Use a worked example as a template", steps: ["Find a worked example of the same type in the study guide.", "Match each of its steps to the question.", "Then try one with the answer covered."] },
    ],
    ask: ["Which rule or formula is this?", "What does each letter stand for here?", "Can you do the first step and tell me why?"], tool: "paper",
  },
];

const GENERAL: HelpFamily = {
  id: "general", name: "this topic", test: /./,
  why: ["The topic may not be secure yet, so the method is still being worked out each time.", "Rushing past the question's key words."],
  methods: [{ title: "Slow down and talk it through", steps: ["Read the question aloud together.", "Ask your child to say it in their own words.", "Do the first step together, then let them do the next one.", "Swap: they explain the steps to you."] }],
  ask: ["What is the question asking?", "What do you already know?", "What is the first step?"], tool: "paper",
};

export const familyFor = (skillId: string): HelpFamily => FAMILIES.find((f) => f.test.test(skillId)) ?? GENERAL;
