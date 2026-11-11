import { int, pick, round } from "../engine/rng";
import type { Skill } from "../engine/types";
import { choiceSkill } from "./build";
import { num } from "./ks2";

/** A-level (Years 12 and 13). Pure maths, statistics and mechanics, each worked out by the generator. */
const nCr = (n: number, k: number) => { let v = 1; for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i; return Math.round(v); };
const sg = (n: number) => (n < 0 ? `- ${-n}` : `+ ${n}`);
const co = (n: number) => (n === 1 ? "" : `${n}`);

export const ks5Skills: Skill[] = [
  // ---------------------------------------------------------------- Year 12: pure
  num({
    id: "factor-theorem", name: "The factor theorem and remainders", stage: "KS5", year: 12, strand: "Algebra", prereqs: ["expand-double", "solve-quad"],
    blurb: "Use f(a) to find remainders and factors of polynomials.",
    explainer: "When f(x) is divided by (x − a), the remainder is f(a). If f(a) = 0 then (x − a) is a factor.",
    parentNote: "Substitute the number a into the polynomial. A zero result means (x − a) is a factor; any other result is the remainder.",
    talkAbout: "What does it tell you if f(a) = 0?",
  }, (r, l) => {
    const a = int(r, 1, 4), b = int(r, -5, 6), c = int(r, -6, 8), k = int(r, -3, 4);
    if (l === 1) { const f = a ** 3 + b * a * a + c * a + k; return { prompt: `What is the remainder when $x^{3} ${sg(b)}x^{2} ${sg(c)}x ${sg(k)}$ is divided by $(x - ${a})$?`, value: f, hint: "The remainder is f(a). Put x = a into the polynomial.", solution: [`$f(${a}) = ${a}^{3} ${sg(b)}(${a})^{2} ${sg(c)}(${a}) ${sg(k)}$.`, `$= ${f}$.`] }; }
    if (l === 2) { const f = -(a ** 3) + b * a * a - c * a + k; return { prompt: `What is the remainder when $x^{3} ${sg(b)}x^{2} ${sg(c)}x ${sg(k)}$ is divided by $(x + ${a})$?`, value: f, hint: "x + a = x − (−a), so put x = −a into the polynomial.", solution: [`$f(-${a}) = (-${a})^{3} ${sg(b)}(-${a})^{2} ${sg(c)}(-${a}) ${sg(k)}$.`, `$= ${f}$.`] }; }
    const kk = int(r, -4, 5), root = int(r, 1, 3), bb = int(r, -4, 5), cc = -(root ** 3 + kk * root * root + bb * root);
    return { prompt: `$(x - ${root})$ is a factor of $x^{3} + kx^{2} ${sg(bb)}x ${sg(cc)}$. What is the value of $k$?`, value: kk, hint: "Put x = the root in. The result must be 0. Then solve for k.", solution: [`$f(${root}) = ${root ** 3} + ${root * root}k ${sg(bb * root)} ${sg(cc)} = 0$.`, `$${root * root}k = ${-(root ** 3 + bb * root + cc)}$, so $k = ${kk}$.`] };
  }),
  num({
    id: "radians", name: "Radians", stage: "KS5", year: 12, strand: "Geometry", prereqs: ["arcs-sectors"],
    blurb: "Convert between degrees and radians, and find arc lengths and sector areas in radians.",
    explainer: "π radians is 180°. For an angle θ in radians, the arc length is rθ and the area of a sector is ½r²θ.",
    parentNote: "Multiply degrees by π/180 to get radians. The formulae for arc length and sector area are simpler in radians.",
    talkAbout: "How many degrees is one radian roughly?",
  }, (r, l) => {
    const k = pick(r, [2, 3, 4, 6]), m = int(r, 1, 3);
    if (l === 1) return { prompt: `Convert $\\frac{${m}\\pi}{${k}}$ radians into degrees.`, value: (180 * m) / k, unit: "°", hint: "π radians is 180°.", solution: [`$\\pi = 180°$, so $\\frac{${m}\\pi}{${k}} = \\frac{${m} \\times 180}{${k}}$.`, `$= ${(180 * m) / k}°$.`] };
    const rad = pick(r, [6, 12]), kk = pick(r, [2, 3, 6]);
    if (l === 2) return { prompt: `A sector has radius ${rad} cm and angle $\\frac{\\pi}{${kk}}$ radians. The arc length is $a\\pi$ cm. What is $a$?`, value: rad / kk, hint: "Arc length = r × θ.", solution: [`$${rad} \\times \\frac{\\pi}{${kk}} = ${rad / kk}\\pi$.`] };
    return { prompt: `A sector has radius ${rad} cm and angle $\\frac{\\pi}{${kk}}$ radians. The area is $b\\pi$ cm². What is $b$?`, value: (rad * rad) / (2 * kk), hint: "Area = ½ r² θ.", solution: [`$\\frac{1}{2} \\times ${rad}^{2} \\times \\frac{\\pi}{${kk}} = ${(rad * rad) / (2 * kk)}\\pi$.`] };
  }),
  num({
    id: "trig-equations", name: "Solving trigonometric equations", stage: "KS5", year: 12, strand: "Geometry", prereqs: ["exact-trig"],
    blurb: "Solve simple trigonometric equations for angles between 0° and 360°.",
    explainer: "A sine or cosine equation usually has two solutions between 0° and 360°. Use the graph or the CAST diagram.",
    parentNote: "Find the first angle on the calculator, then use symmetry: sin θ = sin(180° − θ), cos θ = cos(360° − θ), tan θ repeats every 180°.",
    talkAbout: "Why are there two solutions between 0° and 360°?",
  }, (r, l) => {
    const sets: [string, number, number][] = [["\\sin \\theta = 0.5", 30, 150], ["\\cos \\theta = 0.5", 60, 300], ["\\tan \\theta = 1", 45, 225], ["\\sin \\theta = -0.5", 210, 330], ["\\cos \\theta = -0.5", 120, 240]];
    const [eq, lo, hi] = pick(r, sets);
    if (l === 1) return { prompt: `Solve $${eq}$ for $0° \\le \\theta \\le 360°$. What is the smaller solution?`, value: lo, unit: "°", hint: "Use the calculator for the first angle.", solution: [`The solutions are ${lo}° and ${hi}°.`, `The smaller is ${lo}°.`] };
    if (l === 2) return { prompt: `Solve $${eq}$ for $0° \\le \\theta \\le 360°$. What is the larger solution?`, value: hi, unit: "°", hint: "Use the symmetry of the graph to find the second angle.", solution: [`The solutions are ${lo}° and ${hi}°.`, `The larger is ${hi}°.`] };
    return { prompt: `Solve $${eq}$ for $0° \\le \\theta \\le 360°$. What is the sum of the two solutions?`, value: lo + hi, unit: "°", hint: "Find both solutions, then add them.", solution: [`The solutions are ${lo}° and ${hi}°.`, `${lo} + ${hi} = ${lo + hi}°.`] };
  }),
  num({
    id: "exp-growth", name: "Exponential growth and logarithms", stage: "KS5", year: 12, strand: "Algebra", prereqs: ["log-laws"],
    blurb: "Use exponential models, and logarithms to solve for the time.",
    explainer: "In N = A × bᵗ, the number grows by a factor of b each time step. A logarithm undoes a power.",
    parentNote: "To solve for t, isolate the power, then take logs of both sides. When the answer is a whole number you can use trial and error.",
    talkAbout: "What does taking a logarithm do to a power?",
  }, (r, l) => {
    const A = int(r, 2, 9) * 50, b = pick(r, [2, 3]), t = int(r, 2, 5);
    if (l === 1) return { prompt: `A population is modelled by $N = ${A} \\times ${b}^{t}$, with $t$ in years. What is $N$ when $t = ${t}$?`, value: A * b ** t, hint: "Put t into the formula.", solution: [`$N = ${A} \\times ${b}^{${t}} = ${A} \\times ${b ** t} = ${A * b ** t}$.`] };
    if (l === 2) return { prompt: `Solve $${b}^{x} = ${b ** t}$.`, value: t, hint: `Write ${b ** t} as a power of ${b}.`, solution: [`${b ** t} = ${b}^${t}.`, `So $x = ${t}$.`] };
    return { prompt: `A population is modelled by $N = ${A} \\times ${b}^{t}$. After how many years is the population ${A * b ** t}?`, value: t, hint: "Divide by the starting number, then write the result as a power.", solution: [`${A * b ** t} ÷ ${A} = ${b ** t} = ${b}^${t}.`, `So $t = ${t}$ years.`] };
  }),
  num({
    id: "product-quotient", name: "The product and quotient rules", stage: "KS5", year: 12, strand: "Calculus", prereqs: ["differentiate", "chain-rule"],
    blurb: "Differentiate products and quotients, and find the gradient at a point.",
    explainer: "Product rule: d/dx(uv) = u′v + uv′. Quotient rule: d/dx(u/v) = (u′v − uv′) ÷ v².",
    parentNote: "Name the two parts u and v, differentiate each, then put them into the rule. Substitute the x-value at the end.",
    talkAbout: "Which part is u and which is v, and how did you choose?",
  }, (r, l) => {
    const a = int(r, 2, 5), b = int(r, 1, 6), c = int(r, 2, 6), x = int(r, 1, 3);
    if (l === 1) return { prompt: `$y = x^{2}(${a}x + ${b})$. Use the product rule to find $\\frac{dy}{dx}$ when $x = ${x}$.`, value: 2 * x * (a * x + b) + a * x * x, hint: "u = x², v = ax + b. Then u′v + uv′.", solution: [`$u = x^{2}$, $u' = 2x$, $v = ${a}x + ${b}$, $v' = ${a}$.`, `$\\frac{dy}{dx} = 2x(${a}x + ${b}) + ${a}x^{2}$.`, `At $x = ${x}$: $${2 * x * (a * x + b)} + ${a * x * x} = ${2 * x * (a * x + b) + a * x * x}$.`] };
    if (l === 2) { const p = int(r, 2, 4), q = int(r, 1, 4), s = int(r, 1, 4); return { prompt: `$y = (${p}x + ${q})(x^{2} - ${s})$. Find $\\frac{dy}{dx}$ when $x = ${x}$.`, value: p * (x * x - s) + (p * x + q) * 2 * x, hint: "u = px + q, v = x² − s.", solution: [`$u' = ${p}$, $v' = 2x$.`, `$\\frac{dy}{dx} = ${p}(x^{2} - ${s}) + (${p}x + ${q}) \\times 2x$.`, `At $x = ${x}$: ${p * (x * x - s)} + ${(p * x + q) * 2 * x} = ${p * (x * x - s) + (p * x + q) * 2 * x}.`] }; }
    const xx = pick(r, [1, 2, 4]); return { prompt: `$y = \\frac{${c}x + ${c * 2}}{x}$. Use the quotient rule to find $\\frac{dy}{dx}$ when $x = ${xx}$.`, value: -(c * 2) / (xx * xx), hint: "u = cx + 2c, v = x. Then (u′v − uv′) ÷ v².", solution: [`$u' = ${c}$, $v' = 1$.`, `$\\frac{dy}{dx} = \\frac{${c} \\times x - (${c}x + ${c * 2}) \\times 1}{x^{2}} = \\frac{-${c * 2}}{x^{2}}$.`, `At $x = ${xx}$: ${-(c * 2) / (xx * xx)}.`] };
  }),
  num({
    id: "integrate-polynomials", name: "Integrating polynomials", stage: "KS5", year: 12, strand: "Calculus", prereqs: ["definite-integrals"],
    blurb: "Integrate powers of x, and evaluate definite integrals, including areas under curves.",
    explainer: "To integrate xⁿ, add 1 to the power and divide by the new power. A definite integral is the value at the top limit minus the value at the bottom.",
    parentNote: "Integrate term by term. For a definite integral, put the top limit in, then the bottom limit, and subtract.",
    talkAbout: "How is integration the reverse of differentiation?",
  }, (r, l) => {
    const a = int(r, 1, 4), b = int(r, 1, 5), hi = int(r, 2, 4), lo = int(r, 0, 1);
    if (l === 1) return { prompt: `$\\int ${a * 3}x^{2}\\,dx = ax^{3} + c$. What is $a$?`, value: a, hint: "Add 1 to the power, then divide by the new power.", solution: [`$\\int ${a * 3}x^{2}dx = \\frac{${a * 3}x^{3}}{3} + c = ${co(a)}x^{3} + c$.`] };
    const F = (x: number) => a * x ** 3 + b * x * x;
    const value = F(hi) - F(lo);
    return { prompt: `Evaluate $\\int_{${lo}}^{${hi}} (${3 * a}x^{2} + ${2 * b}x)\\,dx$.`, value, hint: "Integrate, then put in the limits and subtract.", solution: [`$\\int (${3 * a}x^{2} + ${2 * b}x)\\,dx = ${co(a)}x^{3} + ${co(b)}x^{2}$.`, `Top: ${F(hi)}. Bottom: ${F(lo)}.`, `${F(hi)} − ${F(lo)} = ${value}.`] };
  }),
  num({
    id: "partial-fractions", name: "Partial fractions", stage: "KS5", year: 12, strand: "Algebra", prereqs: ["expand-double", "algebraic-fractions"],
    blurb: "Split an algebraic fraction into two simpler fractions.",
    explainer: "A fraction with two different brackets on the bottom can be written as two fractions, one for each bracket.",
    parentNote: "Put x equal to the root of one bracket to make the other term vanish (the cover-up method). Check by combining the fractions again.",
    talkAbout: "Why does putting x equal to a root make one of the terms disappear?",
  }, (r, l) => {
    const A = int(r, 1, 5), B = int(r, 1, 5), a = int(r, 1, 3), b = int(r, 1, 3), c1 = A + B, c0 = A * b - B * a;
    const num_ = `${c1}x ${c0 < 0 ? "-" : "+"} ${Math.abs(c0)}`;
    const eq = `\\frac{${num_}}{(x - ${a})(x + ${b})} \\equiv \\frac{A}{x - ${a}} + \\frac{B}{x + ${b}}`;
    if (l <= 2) return { prompt: `Write $${eq}$. Find $A$.`, value: A, hint: `Put $x = ${a}$ so that the $B$ term disappears.`, solution: [`Multiply through: $${num_} = A(x + ${b}) + B(x - ${a})$.`, `Put $x = ${a}$: $${c1 * a + c0} = A(${a + b})$.`, `$A = ${A}$.`] };
    return { prompt: `Write $${eq}$. Find $B$.`, value: B, hint: `Put $x = -${b}$ so that the $A$ term disappears.`, solution: [`Multiply through: $${num_} = A(x + ${b}) + B(x - ${a})$.`, `Put $x = -${b}$: $${-c1 * b + c0} = B(-${a + b})$.`, `$B = ${B}$.`] };
  }),
  num({
    id: "sigma-series", name: "Sigma notation", stage: "KS5", year: 12, strand: "Algebra", prereqs: ["arithmetic-series"],
    blurb: "Evaluate sums written with sigma notation, using the standard results.",
    explainer: "The sigma sign means add up. Substitute each value of r from the start to the end, and add the terms.",
    parentNote: "Useful results: ∑r = n(n+1)/2 and ∑r² = n(n+1)(2n+1)/6. You can also list a few terms and add them.",
    talkAbout: "How could you check a sum of 5 terms without a formula?",
  }, (r, l) => {
    const n = int(r, 4, 8), a = int(r, 2, 4), b = int(r, 1, 5);
    if (l === 1) { let s = 0; const terms: number[] = []; for (let k = 1; k <= 4; k++) { terms.push(a * k + b); s += a * k + b; } return { prompt: `Evaluate $\\sum_{r=1}^{4} (${a}r + ${b})$.`, value: s, hint: "Put r = 1, 2, 3 and 4 into the expression and add.", solution: [`${terms.join(" + ")} = ${s}.`] }; }
    if (l === 2) { const v = (n * (n + 1)) / 2; return { prompt: `Use $\\sum_{r=1}^{n} r = \\frac{n(n+1)}{2}$ to find $\\sum_{r=1}^{${n}} r$.`, value: v, hint: "Put n in the formula.", solution: [`$\\frac{${n} \\times ${n + 1}}{2} = ${v}$.`] }; }
    const v = (n * (n + 1) * (2 * n + 1)) / 6; return { prompt: `Use $\\sum_{r=1}^{n} r^{2} = \\frac{n(n+1)(2n+1)}{6}$ to find $\\sum_{r=1}^{${n}} r^{2}$.`, value: v, hint: "Put n in the formula.", solution: [`$\\frac{${n} \\times ${n + 1} \\times ${2 * n + 1}}{6} = ${v}$.`] };
  }),
  num({
    id: "binomial-dist", name: "The binomial distribution", stage: "KS5", year: 12, strand: "Statistics", prereqs: ["binomial-coefficient", "tree-probability"],
    blurb: "Use X ~ B(n, p): the mean, the variance and the probability of exactly k successes.",
    explainer: "X ~ B(n, p) counts successes in n independent trials, each with probability p. The mean is np and the variance is np(1 − p).",
    parentNote: "Check the four conditions: fixed number of trials, two outcomes, constant probability, independent trials. P(X = k) = nCk × pᵏ × (1 − p)ⁿ⁻ᵏ.",
    talkAbout: "What conditions must be true for a binomial model?",
  }, (r, l) => {
    const n = int(r, 4, 10), p = pick(r, [0.2, 0.25, 0.4, 0.5]);
    if (l === 1) return { prompt: `$X \\sim B(${n}, ${p})$. What is the mean of $X$?`, value: round(n * p, 2), hint: "Mean = np.", solution: [`${n} × ${p} = ${round(n * p, 2)}.`] };
    if (l === 2) return { prompt: `$X \\sim B(${n}, ${p})$. What is the variance of $X$?`, value: round(n * p * (1 - p), 4), hint: "Variance = np(1 − p).", solution: [`${n} × ${p} × ${round(1 - p, 2)} = ${round(n * p * (1 - p), 4)}.`] };
    const m = int(r, 3, 6), k = int(r, 1, m - 1);
    return { prompt: `$X \\sim B(${m}, 0.5)$. What is $P(X = ${k})$? Give your answer to 4 decimal places.`, value: round(nCr(m, k) / 2 ** m, 4), hint: "P(X = k) = nCk × 0.5ⁿ.", solution: [`${m}C${k} = ${nCr(m, k)}.`, `0.5^${m} = ${round(1 / 2 ** m, 6)}.`, `${nCr(m, k)} × ${round(1 / 2 ** m, 6)} = ${round(nCr(m, k) / 2 ** m, 4)}.`] };
  }),
  num({
    id: "normal-dist", name: "The normal distribution", stage: "KS5", year: 12, strand: "Statistics", prereqs: ["averages"],
    blurb: "Use the mean, standard deviation, z-scores and the 68-95-99.7 rule.",
    explainer: "About 68% of values lie within 1 standard deviation of the mean, 95% within 2 and 99.7% within 3. A z-score is (value − mean) ÷ standard deviation.",
    parentNote: "The z-score tells you how many standard deviations a value is from the mean. Use it to compare values from different distributions.",
    talkAbout: "What does a z-score of −1 tell you?",
  }, (r, l) => {
    const mu = int(r, 40, 100), sd = int(r, 3, 12);
    if (l === 1) { const k = pick(r, [1, 2, 3]); return { prompt: `$X \\sim N(${mu}, ${sd}^{2})$. About what percentage of values lie within ${k} standard deviation${k > 1 ? "s" : ""} of the mean? Type the number only (use 68, 95 or 99.7).`, value: [68, 95, 99.7][k - 1], unit: "%", hint: "Use the 68-95-99.7 rule.", solution: [`Within ${k} standard deviation${k > 1 ? "s" : ""} is about ${[68, 95, 99.7][k - 1]}%.`] }; }
    if (l === 2) { const z = int(r, -3, 3); return { prompt: `$X \\sim N(${mu}, ${sd}^{2})$. What is the z-score of the value ${mu + z * sd}?`, value: z, hint: "z = (x − μ) ÷ σ.", solution: [`z = (${mu + z * sd} − ${mu}) ÷ ${sd} = ${z}.`] }; }
    const k = int(r, 1, 3); return { prompt: `Test scores follow $N(${mu}, ${sd}^{2})$. What is the score that is ${k} standard deviation${k > 1 ? "s" : ""} above the mean?`, value: mu + k * sd, hint: "Mean + k × standard deviation.", solution: [`${mu} + ${k} × ${sd} = ${mu + k * sd}.`] };
  }),
  choiceSkill({
    id: "hypothesis-basics", name: "Hypothesis testing: the ideas", stage: "KS5", year: 12, strand: "Statistics", prereqs: ["binomial-dist"],
    blurb: "Write hypotheses, say whether a test is one-tailed or two-tailed, and decide whether to reject H₀.",
    explainer: "H₀ is what we assume to be true. H₁ is what we suspect instead. If the result is very unlikely under H₀, we reject H₀.",
    parentNote: "Compare the probability of the result with the significance level. A small probability is evidence against H₀, not proof.",
    talkAbout: "Why do we say 'not enough evidence to reject H₀' rather than 'H₀ is true'?",
  }, (r, l) => {
    if (l === 1) {
      const sets: [string, string, string][] = [
        ["A coin may be biased towards heads. H₀: p = 0.5. H₁: p > 0.5.", "one-tailed", "H₁ only looks in one direction."],
        ["A coin may be biased. H₀: p = 0.5. H₁: p ≠ 0.5.", "two-tailed", "H₁ allows the probability to be higher or lower."],
        ["A new medicine may lower the recovery time. H₀: μ = 8. H₁: μ < 8.", "one-tailed", "H₁ only looks in one direction."],
      ];
      const [text, right, why] = pick(r, sets);
      return { prompt: `${text} Is this test one-tailed or two-tailed?`, right, others: ["one-tailed", "two-tailed"].filter((x) => x !== right), hint: "Look at the sign in H₁.", solution: [why, `So it is a ${right} test.`] };
    }
    const p = pick(r, [0.02, 0.03, 0.04, 0.07, 0.1]), level = pick(r, [0.05, 0.1]), reject = p < level;
    return { prompt: `A hypothesis test gives a probability of ${p} under H₀. The significance level is ${level * 100}%. What is the conclusion?`, right: reject ? "Reject H₀" : "Do not reject H₀", others: [reject ? "Do not reject H₀" : "Reject H₀", "Accept H₁ as certainly true"], hint: "Compare the probability with the significance level.", solution: [`${p} is ${reject ? "less" : "not less"} than ${level}.`, reject ? "The result is unlikely under H₀, so reject H₀." : "There is not enough evidence to reject H₀."] };
  }),
  choiceSkill({
    id: "proof-counterexample", name: "Proof by counter-example", stage: "KS5", year: 12, strand: "Algebra", prereqs: ["prime-factors"],
    blurb: "Disprove a statement with a counter-example.",
    explainer: "To show a statement is not always true, find just one example where it fails. That is a counter-example.",
    parentNote: "Test small values first. One failing example is enough to disprove 'for all' statements, but no number of passing examples can prove one.",
    talkAbout: "Why does one counter-example disprove a statement, but many examples do not prove it?",
  }, (r) => {
    const sets: [string, string, string[], string][] = [
      ["All prime numbers are odd.", "2", ["3", "5", "7"], "2 is prime and even."],
      ["$n^{2} > n$ for every whole number $n$.", "$n = 1$", ["$n = 2$", "$n = 3$", "$n = 5$"], "When n = 1, n² = 1, which is not greater than 1."],
      ["The sum of two prime numbers is always even.", "2 + 3", ["3 + 5", "5 + 7", "7 + 11"], "2 + 3 = 5, which is odd."],
      ["$n^{2} + n + 11$ is prime for every whole number $n \\ge 0$.", "$n = 11$", ["$n = 3$", "$n = 5$", "$n = 8$"], "When n = 11 the value is 143 = 11 × 13."],
      ["If $a > b$ then $a^{2} > b^{2}$.", "$a = 1, b = -3$", ["$a = 3, b = 1$", "$a = 5, b = 2$", "$a = 4, b = 0$"], "1 > −3, but 1² = 1 is less than (−3)² = 9."],
    ];
    const [statement, right, others, why] = pick(r, sets);
    return { prompt: `Which of these is a counter-example to the statement "${statement}"?`, right, others, hint: "Find the one example where the statement is false.", solution: [why] };
  }),
  num({
    id: "modulus", name: "The modulus function", stage: "KS5", year: 12, strand: "Algebra", prereqs: ["solve-linear", "inequalities"],
    blurb: "Evaluate and solve equations and inequalities with a modulus.",
    explainer: "|x| is the distance of x from 0, so it is never negative. |2x − 3| = 7 means 2x − 3 is 7 or −7.",
    parentNote: "Split into two cases: the inside equals the number, or the inside equals minus the number. Check both in the original.",
    talkAbout: "Why does an equation with a modulus often have two solutions?",
  }, (r, l) => {
    if (l === 1) { const p = int(r, 2, 9), q = int(r, 2, 9); return { prompt: `Work out $|-${p}| + |${q}| - |-${Math.min(p, q)}|$.`, value: p + q - Math.min(p, q), hint: "The modulus makes each number positive.", solution: [`${p} + ${q} − ${Math.min(p, q)} = ${p + q - Math.min(p, q)}.`] }; }
    if (l === 2) { const k = int(r, 1, 6), n = int(r, 2, 6); return { prompt: `Solve $|x - ${k}| = ${n}$. What is the larger solution?`, value: k + n, hint: "x − k = n or x − k = −n.", solution: [`$x - ${k} = ${n}$ gives $x = ${k + n}$.`, `$x - ${k} = -${n}$ gives $x = ${k - n}$.`, `The larger is ${k + n}.`] }; }
    const k = int(r, 1, 5), n = int(r, 2, 5); return { prompt: `How many whole numbers $x$ satisfy $|x - ${k}| < ${n}$?`, value: 2 * n - 1, hint: `This means ${k - n} < x < ${k + n}.`, solution: [`$${k - n} < x < ${k + n}$.`, `The whole numbers are ${Array.from({ length: 2 * n - 1 }, (_, i) => k - n + 1 + i).join(", ")}.`, `That is ${2 * n - 1} numbers.`] };
  }),

  // ---------------------------------------------------------------- Year 13
  num({
    id: "integrate-substitution", name: "Integration by substitution", stage: "KS5", year: 13, strand: "Calculus", prereqs: ["integrate-polynomials", "chain-rule"],
    blurb: "Integrate a function when part of it is the derivative of another part.",
    explainer: "Let u be the inside part. Replace dx and the other part so that everything is in terms of u, integrate, then change back.",
    parentNote: "Look for a pattern like 2x(x² + 1)ⁿ: the 2x is the derivative of the bracket's inside. Then the integral is (x² + 1)ⁿ⁺¹ ÷ (n + 1).",
    talkAbout: "How can you tell which part to call u?",
  }, (r, l) => {
    const n = int(r, 2, 4), k = int(r, 1, 3), hi = int(r, 1, 2), F = (x: number) => (x * x + k) ** (n + 1) / (n + 1);
    const v = round(F(hi) - F(0), 2);
    if (l === 1) return { prompt: `Use $u = x^{2} + ${k}$ to find $\\int 2x(x^{2} + ${k})^{${n}}\\,dx$. The answer is $\\frac{(x^{2} + ${k})^{m}}{m} + c$. What is $m$?`, value: n + 1, hint: "Integrating uⁿ gives uⁿ⁺¹ ÷ (n + 1).", solution: [`$du = 2x\\,dx$, so the integral is $\\int u^{${n}}du$.`, `$= \\frac{u^{${n + 1}}}{${n + 1}}$, so $m = ${n + 1}$.`] };
    return { prompt: `Evaluate $\\int_{0}^{${hi}} 2x(x^{2} + ${k})^{${n}}\\,dx$. Give your answer to 2 decimal places.`, value: v, hint: "Use u = x² + k. The integral is (x² + k)ⁿ⁺¹ ÷ (n + 1).", solution: [`Antiderivative: $\\frac{(x^{2} + ${k})^{${n + 1}}}{${n + 1}}$.`, `At ${hi}: ${round(F(hi), 3)}. At 0: ${round(F(0), 3)}.`, `${round(F(hi), 3)} − ${round(F(0), 3)} = ${v}.`] };
  }),
  num({
    id: "differential-equations", name: "Differential equations", stage: "KS5", year: 13, strand: "Calculus", prereqs: ["integrate-polynomials"],
    blurb: "Solve simple differential equations by integrating, using a given point.",
    explainer: "A differential equation gives dy/dx. Integrate to find y, and use a known point to find the constant.",
    parentNote: "Integrate both sides, add + c, then put in the known point to find c. Check by differentiating your answer.",
    talkAbout: "How do you find the value of the constant after integrating?",
  }, (r, l) => {
    const a = int(r, 2, 6), c0 = int(r, 1, 9), x = int(r, 2, 4);
    if (l === 1) return { prompt: `$\\frac{dy}{dx} = ${2 * a}x$ and $y = ${c0}$ when $x = 0$. What is $y$ when $x = ${x}$?`, value: a * x * x + c0, hint: "Integrate, then use the point to find c.", solution: [`$y = ${a}x^{2} + c$. When $x = 0$, $y = ${c0}$, so $c = ${c0}$.`, `At $x = ${x}$: $${a} \\times ${x * x} + ${c0} = ${a * x * x + c0}$.`] };
    if (l === 2) { const b = int(r, 1, 5); return { prompt: `$\\frac{dy}{dx} = ${3 * a}x^{2} + ${b}$ and $y = ${c0}$ when $x = 0$. What is $y$ when $x = ${x}$?`, value: a * x ** 3 + b * x + c0, hint: "Integrate each term.", solution: [`$y = ${a}x^{3} + ${b}x + c$, and $c = ${c0}$.`, `At $x = ${x}$: ${a * x ** 3} + ${b * x} + ${c0} = ${a * x ** 3 + b * x + c0}.`] }; }
    const k = int(r, 2, 4), y1 = int(r, 5, 12); return { prompt: `$\\frac{dy}{dx} = ${3 * k}x^{2}$ and $y = ${y1}$ when $x = 1$. What is $y$ when $x = 2$?`, value: 8 * k + (y1 - k), hint: "Integrate, then use the point (1, y) to find c.", solution: [`$y = ${k}x^{3} + c$. At $x = 1$: $${k} + c = ${y1}$, so $c = ${y1 - k}$.`, `At $x = 2$: ${8 * k} + ${y1 - k} = ${8 * k + y1 - k}.`] };
  }),
  num({
    id: "differentiate-exp-trig", name: "Differentiating exponentials and trigonometric functions", stage: "KS5", year: 13, strand: "Calculus", prereqs: ["chain-rule", "product-quotient"],
    blurb: "Differentiate eᵏˣ, sin kx, cos kx and ln x, and find the gradient at a point.",
    explainer: "d/dx(eᵏˣ) = k eᵏˣ. d/dx(sin kx) = k cos kx. d/dx(cos kx) = −k sin kx. d/dx(ln x) = 1 ÷ x.",
    parentNote: "With a number in front of x inside the function, multiply by that number (the chain rule). Angles are in radians.",
    talkAbout: "What does the number in front of x do to the derivative?",
  }, (r, l) => {
    const k = int(r, 2, 5), a = int(r, 2, 6);
    if (l === 1) return { prompt: `$y = ${a}e^{${k}x}$. What is $\\frac{dy}{dx}$ when $x = 0$?`, value: a * k, hint: "d/dx(eᵏˣ) = k eᵏˣ, and e⁰ = 1.", solution: [`$\\frac{dy}{dx} = ${a * k}e^{${k}x}$.`, `At $x = 0$: ${a * k}.`] };
    if (l === 2) return { prompt: `$y = ${a}\\sin ${k}x$. What is $\\frac{dy}{dx}$ when $x = 0$?`, value: a * k, hint: "d/dx(sin kx) = k cos kx, and cos 0 = 1.", solution: [`$\\frac{dy}{dx} = ${a * k}\\cos ${k}x$.`, `At $x = 0$: ${a * k}.`] };
    const x = pick(r, [1, 2, 4]); return { prompt: `$y = ${a} \\ln x$. What is $\\frac{dy}{dx}$ when $x = ${x}$?`, value: a / x, hint: "d/dx(ln x) = 1 ÷ x.", solution: [`$\\frac{dy}{dx} = \\frac{${a}}{x}$.`, `At $x = ${x}$: ${a / x}.`] };
  }),
  num({
    id: "projectiles", name: "Projectile motion", stage: "KS5", year: 13, strand: "Measures", prereqs: ["constant-acceleration"],
    blurb: "Split projectile motion into horizontal and vertical parts, with g = 9.8 m s⁻².",
    explainer: "Horizontally the speed stays constant. Vertically the object accelerates downwards at g.",
    parentNote: "Treat the two directions separately: horizontal distance = speed × time, and vertical motion uses s = ut + ½at² with a = 9.8.",
    talkAbout: "Why can you treat the horizontal and vertical motion separately?",
  }, (r, l) => {
    const t = int(r, 1, 3), h = round(4.9 * t * t, 2), v = int(r, 5, 20);
    if (l === 1) return { prompt: `A ball is dropped from rest from a height of ${h} m. Use $g = 9.8$ m s⁻² and $s = \\frac{1}{2}gt^{2}$. How long does it take to hit the ground, in seconds?`, value: t, hint: "Put s = h and solve for t.", solution: [`$${h} = 4.9t^{2}$, so $t^{2} = ${t * t}$.`, `$t = ${t}$ seconds.`] };
    if (l === 2) return { prompt: `A ball is thrown horizontally at ${v} m s⁻¹ from a cliff ${h} m high. It takes ${t} s to hit the ground. How far from the base of the cliff does it land, in metres?`, value: v * t, unit: "m", hint: "Horizontal distance = horizontal speed × time.", solution: [`${v} × ${t} = ${v * t} m.`] };
    return { prompt: `A ball falls from rest for ${t} s. Use $v = gt$ with $g = 9.8$ m s⁻². What is its speed at the end, in m s⁻¹?`, value: round(9.8 * t, 1), hint: "v = u + at with u = 0.", solution: [`$v = 9.8 \\times ${t} = ${round(9.8 * t, 1)}$.`] };
  }),
  num({
    id: "forces-moments", name: "Forces and moments", stage: "KS5", year: 13, strand: "Measures", prereqs: ["constant-acceleration", "exact-trig"],
    blurb: "Resolve forces, use F = ma, and balance moments.",
    explainer: "A moment is a force times its perpendicular distance from the pivot. A balanced beam has equal clockwise and anticlockwise moments.",
    parentNote: "Draw the forces. For a balanced beam: clockwise moments = anticlockwise moments. For motion: resultant force = mass × acceleration.",
    talkAbout: "Which direction does each force turn the beam?",
  }, (r, l) => {
    if (l === 1) { const F = int(r, 3, 9) * 10, d1 = int(r, 2, 4), d2 = pick(r, [1, 2, 3, 5, 6].filter((x) => (F * d1) % x === 0 && x !== d1)); return { prompt: `A light beam balances on a pivot. A force of ${F} N acts ${d1} m to the left of the pivot. A second force acts ${d2} m to the right. What force in newtons balances the beam?`, value: (F * d1) / d2, hint: "Clockwise moment = anticlockwise moment.", solution: [`${F} × ${d1} = ${F * d1}.`, `${F * d1} ÷ ${d2} = ${(F * d1) / d2} N.`] }; }
    if (l === 2) { const F = int(r, 2, 8) * 10; return { prompt: `A force of ${F} N acts at 60° to the horizontal. What is the horizontal component in newtons? ($\\cos 60° = 0.5$)`, value: F / 2, hint: "Horizontal component = F cos θ.", solution: [`${F} × cos 60° = ${F} × 0.5 = ${F / 2} N.`] }; }
    const m = int(r, 2, 8), a = int(r, 2, 5), fr = int(r, 3, 12); return { prompt: `A ${m} kg box is pushed with a force of ${m * a + fr} N along a rough floor. The friction force is ${fr} N. What is the acceleration in m s⁻²?`, value: a, hint: "Resultant force = driving force − friction, then F = ma.", solution: [`Resultant = ${m * a + fr} − ${fr} = ${m * a} N.`, `$a = ${m * a} \\div ${m} = ${a}$.`] };
  }),
  num({
    id: "kinematics-calculus", name: "Kinematics using calculus", stage: "KS5", year: 13, strand: "Calculus", prereqs: ["differentiate", "constant-acceleration"],
    blurb: "Differentiate displacement to find velocity and acceleration.",
    explainer: "Velocity is the derivative of displacement, and acceleration is the derivative of velocity.",
    parentNote: "Differentiate s with respect to t to get v. Differentiate again to get a. Set v = 0 to find when the object is momentarily at rest.",
    talkAbout: "What does it mean if velocity is zero at a moment?",
  }, (r, l) => {
    const p = int(r, 1, 3), q = int(r, 1, 4), t = int(r, 1, 4);
    if (l === 1) return { prompt: `A particle has displacement $s = ${p}t^{3} + ${q}t$ metres. What is its velocity at $t = ${t}$ s, in m s⁻¹?`, value: 3 * p * t * t + q, hint: "v = ds/dt.", solution: [`$v = ${3 * p}t^{2} + ${q}$.`, `At t = ${t}: ${3 * p * t * t + q}.`] };
    if (l === 2) return { prompt: `A particle has velocity $v = ${co(p)}t^{3} - ${co(q)}t$ m s⁻¹. What is its acceleration at $t = ${t}$ s in m s⁻²?`, value: 3 * p * t * t - q, hint: "a = dv/dt.", solution: [`$a = ${3 * p}t^{2} - ${q}$.`, `At t = ${t}: ${3 * p * t * t - q}.`] };
    const [t1, t2] = pick(r, [[1, 3], [2, 4], [1, 5], [3, 5]] as [number, number][]), c2 = (3 * (t1 + t2)) / 2;
    return { prompt: `A particle has displacement $s = t^{3} - ${c2}t^{2} + ${3 * t1 * t2}t$ metres. At what time $t$ (in seconds) is it first at rest?`, value: t1, hint: "At rest means v = 0. Differentiate, then solve v = 0.", solution: [`$v = 3t^{2} - ${2 * c2}t + ${3 * t1 * t2} = 3(t - ${t1})(t - ${t2})$.`, `$v = 0$ at $t = ${t1}$ and $t = ${t2}$. The first time is ${t1}.`] };
  }),
  num({
    id: "newton-raphson", name: "Newton-Raphson iteration", stage: "KS5", year: 13, strand: "Calculus", prereqs: ["differentiate", "iteration"],
    blurb: "Use Newton-Raphson to improve an estimate of a root.",
    explainer: "Newton-Raphson improves a guess: x₂ = x₁ − f(x₁) ÷ f′(x₁). Repeat to get closer to the root.",
    parentNote: "Work out f(x) and f′(x) at the current estimate, then subtract their ratio. It converges quickly when the guess is close.",
    talkAbout: "Why does the formula use the gradient of the curve?",
  }, (r, l) => {
    const k = pick(r, [4, 9, 16, 25]), x1 = int(r, 1, 3);
    const f1 = x1 * x1 - k, d1 = 2 * x1, x2 = x1 - f1 / d1;
    if (l === 1) return { prompt: `$f(x) = x^{2} - ${k}$. What is $f'(${x1})$?`, value: d1, hint: "Differentiate first: f′(x) = 2x.", solution: [`$f'(x) = 2x$.`, `$f'(${x1}) = ${d1}$.`] };
    if (l === 2) return { prompt: `Use one step of Newton-Raphson on $f(x) = x^{2} - ${k}$ with $x_1 = ${x1}$ to find $x_2$. Give your answer to 3 decimal places.`, value: round(x2, 3), hint: "x₂ = x₁ − f(x₁) ÷ f′(x₁).", solution: [`$f(${x1}) = ${f1}$ and $f'(${x1}) = ${d1}$.`, `$x_2 = ${x1} - \\frac{${f1}}{${d1}} = ${round(x2, 3)}$.`] };
    const x3 = x2 - (x2 * x2 - k) / (2 * x2);
    return { prompt: `Use two steps of Newton-Raphson on $f(x) = x^{2} - ${k}$ with $x_1 = ${x1}$ to find $x_3$. Give your answer to 3 decimal places.`, value: round(x3, 3), hint: "Find x₂ first, then use it to find x₃.", solution: [`$x_2 = ${x1} - \\frac{${f1}}{${d1}} = ${round(x2, 4)}$.`, `$x_3 = x_2 - \\frac{x_2^{2} - ${k}}{2x_2} = ${round(x3, 3)}$.`] };
  }),
  num({
    id: "vectors-3d", name: "Vectors in three dimensions", stage: "KS5", year: 13, strand: "Geometry", prereqs: ["vectors"],
    blurb: "Work with 3-D vectors: their length, the scalar product and the distance between points.",
    explainer: "A 3-D vector has three components. Its length is √(x² + y² + z²). The scalar product multiplies matching components and adds them.",
    parentNote: "Extend what you know about 2-D vectors. The scalar product is a number, not a vector, and is 0 when the vectors are perpendicular.",
    talkAbout: "What does it tell you if the scalar product of two vectors is zero?",
  }, (r, l) => {
    const [p, q, s, len] = pick(r, [[2, 3, 6, 7], [1, 4, 8, 9], [2, 6, 9, 11], [4, 4, 7, 9]] as [number, number, number, number][]);
    if (l === 1) return { prompt: `What is the length of the vector $\\begin{pmatrix} ${p} \\\\ ${q} \\\\ ${s} \\end{pmatrix}$?`, value: len, hint: "Length = √(x² + y² + z²).", solution: [`$\\sqrt{${p}^{2} + ${q}^{2} + ${s}^{2}} = \\sqrt{${p * p + q * q + s * s}} = ${len}$.`] };
    const a = [int(r, 1, 4), int(r, -3, 3), int(r, 1, 5)], b = [int(r, 1, 4), int(r, 1, 5), int(r, -3, 4)];
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    if (l === 2) return { prompt: `$\\mathbf{a} = \\begin{pmatrix} ${a[0]} \\\\ ${a[1]} \\\\ ${a[2]} \\end{pmatrix}$ and $\\mathbf{b} = \\begin{pmatrix} ${b[0]} \\\\ ${b[1]} \\\\ ${b[2]} \\end{pmatrix}$. What is $\\mathbf{a} \\cdot \\mathbf{b}$?`, value: dot, hint: "Multiply matching components and add.", solution: [`${a[0]}×${b[0]} + (${a[1]})×${b[1]} + ${a[2]}×(${b[2]}) = ${dot}.`] };
    const A = [int(r, 0, 3), int(r, 0, 3), int(r, 0, 3)];
    return { prompt: `Points A(${A[0]}, ${A[1]}, ${A[2]}) and B(${A[0] + p}, ${A[1] + q}, ${A[2] + s}). What is the distance AB?`, value: len, hint: "Find the vector AB, then its length.", solution: [`$\\overrightarrow{AB} = (${p}, ${q}, ${s})$.`, `Length = $\\sqrt{${p * p + q * q + s * s}} = ${len}$.`] };
  }),
];
