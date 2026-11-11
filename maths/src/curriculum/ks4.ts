import { int, pick, round } from "../engine/rng";
import { graph, sample } from "./figures";
import type { Skill } from "../engine/types";
import { exprSkill, fracSkill } from "./build";
import { toLatex } from "../engine/poly";
import { num } from "./ks2";

/** GCSE (Years 10 and 11), filling out the topics tied to the Foundation and Higher specifications. Each question works out its own answer. */
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const PI = "$\\pi = 3.14$";

export const ks4Skills: Skill[] = [
  // ---------------------------------------------------------------- Year 10
  num({
    id: "rearrange-formulae", name: "Rearranging formulae", stage: "KS4", year: 10, strand: "Algebra", prereqs: ["solve-linear", "substitute"],
    blurb: "Change the subject of a formula, and use it to find a missing value.",
    explainer: "To make a letter the subject, do the same to both sides until it is on its own. Undo the operations in reverse order.",
    parentNote: "Treat a formula like an equation. Undo addition and subtraction first, then multiplication and division, always doing the same to both sides.",
    talkAbout: "Which operation do you undo first, and why?",
  }, (r, l) => {
    const u = int(r, 2, 9), a = int(r, 2, 6), t = int(r, 2, 9), v = u + a * t;
    if (l === 1) return { prompt: `The formula $v = u + at$ is used for motion. Find $t$ when $v = ${v}$, $u = ${u}$ and $a = ${a}$.`, value: t, hint: "Make t the subject first: $t = \\frac{v - u}{a}$.", solution: [`$v - u = at$, so $t = \\frac{v - u}{a}$.`, `$t = \\frac{${v} - ${u}}{${a}} = ${t}$.`] };
    if (l === 2) { const A = int(r, 2, 8), k = int(r, 3, 9); return { prompt: `The formula $y = ${A}x + ${k}$ links $x$ and $y$. Make $x$ the subject, and find $x$ when $y = ${A * k + k}$.`, value: k, hint: "Take away the number, then divide.", solution: [`$y - ${k} = ${A}x$, so $x = \\frac{y - ${k}}{${A}}$.`, `$x = \\frac{${A * k + k} - ${k}}{${A}} = ${k}$.`] }; }
    const rad = int(r, 2, 8), h = int(r, 3, 9);
    return { prompt: `The area of the curved surface of a cylinder is $A = 2\\pi r h$. Use ${PI}. Find $r$ when $A = ${round(2 * 3.14 * rad * h, 2)}$ and $h = ${h}$.`, value: rad, hint: "Make r the subject: $r = \\frac{A}{2\\pi h}$.", solution: [`$r = \\frac{A}{2\\pi h}$.`, `$r = \\frac{${round(2 * 3.14 * rad * h, 2)}}{2 \\times 3.14 \\times ${h}} = ${rad}$.`] };
  }),
  num({
    id: "surds", name: "Simplifying surds", stage: "KS4", year: 10, strand: "Number", prereqs: ["prime-factors", "index-laws"],
    blurb: "Simplify surds by taking out square factors, and add them.",
    explainer: "A surd is a square root that is not a whole number. Split it into a square number times something else, and take the square root of the square.",
    parentNote: "Look for the biggest square factor: √72 = √(36 × 2) = 6√2. Surds can be added when the number under the root is the same.",
    talkAbout: "Which square numbers should you look for first?",
  }, (r, l) => {
    const pairs = l === 1 ? [[2, 3], [2, 2], [3, 5], [2, 7]] : [[3, 2], [4, 3], [5, 2], [6, 2], [3, 3]];
    const [k, m] = pick(r, pairs);
    if (l <= 2) { const n = k * k * m; return { prompt: `Write $\\sqrt{${n}}$ in the form $a\\sqrt{${m}}$. What is $a$?`, value: k, hint: `Find a square number that divides ${n}.`, solution: [`$${n} = ${k * k} \\times ${m}$.`, `$\\sqrt{${n}} = \\sqrt{${k * k}} \\times \\sqrt{${m}} = ${k}\\sqrt{${m}}$.`] }; }
    const a = int(r, 2, 4), b = int(r, 2, 5);
    return { prompt: `Simplify $\\sqrt{${a * a * 2}} + \\sqrt{${b * b * 2}}$. Write the answer as $k\\sqrt{2}$. What is $k$?`, value: a + b, hint: "Simplify each surd first, then add the coefficients.", solution: [`$\\sqrt{${a * a * 2}} = ${a}\\sqrt{2}$ and $\\sqrt{${b * b * 2}} = ${b}\\sqrt{2}$.`, `$${a}\\sqrt{2} + ${b}\\sqrt{2} = ${a + b}\\sqrt{2}$.`] };
  }),
  num({
    id: "proportion-direct-inverse", name: "Direct and inverse proportion", stage: "KS4", year: 10, strand: "Ratio", prereqs: ["direct-proportion", "substitute"],
    blurb: "Use y = kx and y = k/x to solve proportion problems.",
    explainer: "Direct proportion: y = kx, so doubling x doubles y. Inverse proportion: y = k/x, so doubling x halves y.",
    parentNote: "Find the constant k using the pair of values you are given, then use it to find the missing value.",
    talkAbout: "How do you know whether two things are in direct or inverse proportion?",
  }, (r, l) => {
    const k = int(r, 2, 9), x1 = int(r, 2, 6), x2 = x1 + int(r, 2, 5);
    if (l <= 2) return { prompt: `$y$ is directly proportional to $x$. When $x = ${x1}$, $y = ${k * x1}$. What is $y$ when $x = ${x2}$?`, value: k * x2, hint: "Find the constant: y = kx.", solution: [`$k = ${k * x1} \\div ${x1} = ${k}$.`, `$y = ${k} \\times ${x2} = ${k * x2}$.`] };
    const K = pick(r, [12, 24, 36, 48]), p = pick(r, [2, 3, 4, 6]), q = pick(r, [8, 12].filter((n) => K % n === 0 && n !== p));
    return { prompt: `$y$ is inversely proportional to $x$. When $x = ${p}$, $y = ${K / p}$. What is $y$ when $x = ${q}$?`, value: K / q, hint: "Find the constant: y = k ÷ x, so k = xy.", solution: [`$k = ${p} \\times ${K / p} = ${K}$.`, `$y = ${K} \\div ${q} = ${K / q}$.`] };
  }),
  num({
    id: "quadratic-formula", name: "The quadratic formula", stage: "KS4", year: 10, strand: "Algebra", prereqs: ["solve-quad"],
    blurb: "Use the discriminant, and solve quadratics with the formula.",
    explainer: "For ax² + bx + c = 0, the discriminant is b² − 4ac. The solutions are x = (−b ± √(b² − 4ac)) ÷ 2a.",
    parentNote: "Write down a, b and c with their signs, work out the discriminant first, then put everything into the formula.",
    talkAbout: "What does it tell you if the discriminant is negative?",
  }, (r, l) => {
    const p = int(r, 1, 6);
    let q = int(r, -5, 6);
    while (q === 0 || q === p) q = int(r, -5, 6);
    const a = l === 3 ? int(r, 2, 3) : 1, b = -a * (p + q), c = a * p * q;
    const disc = b * b - 4 * a * c, bt = b < 0 ? `- ${-b}` : `+ ${b}`, ct = c < 0 ? `- ${-c}` : `+ ${c}`, quad = `${a === 1 ? "" : a}x^{2} ${bt}x ${ct} = 0`;
    if (l === 1) return { prompt: `For $${quad}$, work out the discriminant $b^{2} - 4ac$.`, value: disc, hint: `Here a = ${a}, b = ${b} and c = ${c}.`, solution: [`$b^{2} - 4ac = (${b})^{2} - 4 \\times ${a} \\times (${c})$.`, `$= ${b * b} - (${4 * a * c}) = ${disc}$.`] };
    const root = Math.max(p, q), s = Math.sqrt(disc);
    return { prompt: `Solve $${quad}$ using the quadratic formula. What is the larger solution?`, value: root, hint: "Work out the discriminant first. Its square root is a whole number here.", solution: [`$a = ${a}$, $b = ${b}$, $c = ${c}$. Discriminant: ${disc}, and $\\sqrt{${disc}} = ${s}$.`, `$x = \\frac{${-b} \\pm ${s}}{${2 * a}}$.`, `The larger solution is $x = ${root}$.`] };
  }),
  num({
    id: "completing-square", name: "Completing the square", stage: "KS4", year: 10, strand: "Algebra", prereqs: ["factorise-quad"],
    blurb: "Write x² + bx + c as (x + p)² + q, and find the minimum point.",
    explainer: "Half the number in front of x goes inside the bracket. Then take away its square and add the original number.",
    parentNote: "x² + 6x + 2 = (x + 3)² − 9 + 2. The smallest value of a square is 0, so the minimum of the curve is the q part.",
    talkAbout: "Why is the minimum value the number outside the bracket?",
  }, (r, l) => {
    const p = int(r, 1, 6) * (r() < 0.5 ? 1 : -1), c = int(r, -8, 9), b = 2 * p, q = c - p * p;
    const eq = `x^{2} ${b < 0 ? "-" : "+"} ${Math.abs(b)}x ${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
    if (l === 1) return { prompt: `Write $${eq}$ in the form $(x + p)^{2} + q$. What is $p$?`, value: p, hint: "p is half the number in front of x.", solution: [`Half of ${b} is ${p}.`, `So $p = ${p}$.`] };
    if (l === 2) return { prompt: `Write $${eq}$ in the form $(x + p)^{2} + q$. What is $q$?`, value: q, hint: "q = c − p².", solution: [`$(x ${p < 0 ? "-" : "+"} ${Math.abs(p)})^{2} = x^{2} ${b < 0 ? "-" : "+"} ${Math.abs(b)}x + ${p * p}$.`, `To get back to ${c}, add ${c} − ${p * p} = ${q}.`] };
    return { prompt: `What is the minimum value of $y = ${eq}$?`, value: q, hint: "Complete the square. The minimum value is the number added at the end.", solution: [`$y = (x ${p < 0 ? "-" : "+"} ${Math.abs(p)})^{2} ${q < 0 ? "-" : "+"} ${Math.abs(q)}$.`, `The square is at least 0, so the minimum value is ${q}.`] };
  }),
  exprSkill({
    id: "algebraic-fractions", name: "Simplifying algebraic fractions", stage: "KS4", year: 10, strand: "Algebra", prereqs: ["factorise-common", "factorise-quad"],
    blurb: "Simplify algebraic fractions by factorising and cancelling.",
    explainer: "Factorise the top, then cancel any factor that is also on the bottom.",
    parentNote: "Only cancel factors, never terms. (x + 3)/x is not 3. Factorise first, then cancel the common factor.",
    talkAbout: "Why can you cancel a factor but not a single term?",
  }, (r, l) => {
    const k = int(r, 2, 6), q = int(r, 1, 7);
    if (l === 1) return { prompt: `Simplify $\\frac{${k * 2}x + ${k * 2 * q}}{${k}}$.`, value: [2 * q, 2], form: "collected", shown: `$${polyL([2 * q, 2])}$`, hint: "Divide every term on the top by the number on the bottom.", solution: [`$${k * 2}x \\div ${k} = 2x$ and $${k * 2 * q} \\div ${k} = ${2 * q}$.`, `The answer is $${polyL([2 * q, 2])}$.`] };
    if (l === 2) return { prompt: `Simplify $\\frac{x^{2} + ${q}x}{x}$.`, value: [q, 1], form: "collected", shown: `$${polyL([q, 1])}$`, hint: "Factorise the top: x(x + a). Then cancel the x.", solution: [`$x^{2} + ${q}x = x(x + ${q})$.`, `Cancel the x: $x + ${q}$.`] };
    const s = int(r, 2, 8);
    return { prompt: `Simplify $\\frac{x^{2} - ${s * s}}{x - ${s}}$.`, value: [s, 1], form: "collected", shown: `$${polyL([s, 1])}$`, hint: "The top is a difference of two squares.", solution: [`$x^{2} - ${s * s} = (x - ${s})(x + ${s})$.`, `Cancel $(x - ${s})$: $x + ${s}$.`] };
  }),
  num({
    id: "arcs-sectors", name: "Arc length and sector area", stage: "KS4", year: 10, strand: "Geometry", prereqs: ["circumference", "circle-area"],
    blurb: "Find the length of an arc and the area of a sector.",
    explainer: "A sector is a slice of a circle. Work out what fraction of the whole circle it is: angle ÷ 360.",
    parentNote: "Arc length = fraction × circumference. Sector area = fraction × area of the circle. Use the same fraction for both.",
    talkAbout: "What fraction of the circle is a 90° sector?",
  }, (r, l) => {
    const ang = pick(r, [90, 60, 120, 45, 180]), rad = pick(r, [6, 12, 8, 10, 4]), f = ang / 360;
    if (l === 1) { const k = pick(r, [2, 3, 4, 6, 8, 9, 10]); return { prompt: `A sector is $\\frac{1}{${k}}$ of a whole circle. What is its angle in degrees?`, value: 360 / k, unit: "°", hint: "A whole circle is 360°.", solution: [`360 ÷ ${k} = ${360 / k}°.`] }; }
    if (l === 2) return { prompt: `A sector of a circle has radius ${rad} cm and angle ${ang}°. Use ${PI}. What is the arc length in cm, to 2 decimal places?`, value: round(f * 2 * 3.14 * rad, 2), unit: "cm", hint: "Arc length = (angle ÷ 360) × 2πr.", solution: [`Circumference = 2 × 3.14 × ${rad} = ${round(2 * 3.14 * rad, 2)}.`, `Fraction = ${ang}/360.`, `Arc = ${round(f * 2 * 3.14 * rad, 2)} cm.`] };
    return { prompt: `A sector of a circle has radius ${rad} cm and angle ${ang}°. Use ${PI}. What is the area of the sector in cm², to 2 decimal places?`, value: round(f * 3.14 * rad * rad, 2), unit: "cm²", hint: "Sector area = (angle ÷ 360) × πr².", solution: [`Area of circle = 3.14 × ${rad}² = ${round(3.14 * rad * rad, 2)}.`, `Sector = ${ang}/360 × ${round(3.14 * rad * rad, 2)} = ${round(f * 3.14 * rad * rad, 2)} cm².`] };
  }),
  num({
    id: "cones-spheres", name: "Volume of cones and spheres", stage: "KS4", year: 10, strand: "Measures", prereqs: ["cylinder-volume", "circle-area"],
    blurb: "Use the formulae for the volume of a cone and a sphere.",
    explainer: "Cone: ⅓πr²h. Sphere: ⁴⁄₃πr³. A cone is a third of the cylinder with the same base and height.",
    parentNote: "Learn which formula is which: the cone has ⅓ and r²h; the sphere has ⁴⁄₃ and r cubed. Use the π button or the value given.",
    talkAbout: "How is the volume of a cone related to the volume of a cylinder?",
  }, (r, l) => {
    const rad = pick(r, [3, 6, 9]), h = int(r, 2, 9) * 3;
    if (l === 1) return { prompt: `A cone has base radius ${rad} cm and height ${h} cm. Use ${PI}. What is its volume in cm³, to 2 decimal places?`, value: round((3.14 * rad * rad * h) / 3, 2), unit: "cm³", hint: "Volume = ⅓ × π × r² × h.", solution: [`3.14 × ${rad}² × ${h} = ${round(3.14 * rad * rad * h, 2)}.`, `÷ 3 = ${round((3.14 * rad * rad * h) / 3, 2)}.`] };
    if (l === 2) return { prompt: `A sphere has radius ${rad} cm. Use ${PI}. What is its volume in cm³, to 2 decimal places?`, value: round((4 * 3.14 * rad ** 3) / 3, 2), unit: "cm³", hint: "Volume = ⁴⁄₃ × π × r³.", solution: [`r³ = ${rad ** 3}.`, `4 × 3.14 × ${rad ** 3} ÷ 3 = ${round((4 * 3.14 * rad ** 3) / 3, 2)}.`] };
    const hemi = rad;
    return { prompt: `A solid hemisphere has radius ${hemi} cm. Use ${PI}. What is its volume in cm³, to 2 decimal places?`, value: round((2 * 3.14 * hemi ** 3) / 3, 2), unit: "cm³", hint: "A hemisphere is half a sphere.", solution: [`Sphere: 4 × 3.14 × ${hemi ** 3} ÷ 3 = ${round((4 * 3.14 * hemi ** 3) / 3, 2)}.`, `Half of that: ${round((2 * 3.14 * hemi ** 3) / 3, 2)}.`] };
  }),
  num({
    id: "sine-cosine-rules", name: "Sine and cosine rules", stage: "KS4", year: 10, strand: "Geometry", prereqs: ["trig"],
    blurb: "Use the sine rule, the cosine rule and ½ab sin C in any triangle.",
    explainer: "The sine rule links sides with the sines of their opposite angles. The cosine rule finds a side from two sides and the angle between them.",
    parentNote: "Label the triangle: side a is opposite angle A. Use the sine rule when you have a matching side and angle pair, and the cosine rule when you have two sides and the included angle.",
    talkAbout: "How do you decide between the sine rule and the cosine rule?",
  }, (r, l) => {
    if (l === 1) { const a = int(r, 3, 12) * 5, b = a * 2; return { prompt: `In a triangle, $\\sin A = 0.4$ and $\\sin B = 0.8$. Side $a = ${a}$ cm is opposite angle $A$. Use the sine rule to find side $b$ in cm.`, value: b, unit: "cm", hint: "The sine rule: $\\frac{a}{\\sin A} = \\frac{b}{\\sin B}$.", solution: [`$\\frac{${a}}{0.4} = \\frac{b}{0.8}$.`, `$b = \\frac{${a} \\times 0.8}{0.4} = ${b}$.`] }; }
    if (l === 2) { const [x, y, z] = pick(r, [[3, 8, 7], [5, 8, 7], [8, 15, 13], [7, 15, 13]] as [number, number, number][]); return { prompt: `In triangle ABC, $a = ${x}$ cm, $b = ${y}$ cm and angle $C = 60°$ (so $\\cos C = 0.5$). Use the cosine rule to find side $c$ in cm.`, value: z, unit: "cm", hint: "$c^{2} = a^{2} + b^{2} - 2ab\\cos C$.", solution: [`$c^{2} = ${x}^{2} + ${y}^{2} - 2 \\times ${x} \\times ${y} \\times 0.5 = ${x * x + y * y - x * y}$.`, `$c = \\sqrt{${z * z}} = ${z}$.`] }; }
    const a = int(r, 3, 12) * 2, b = int(r, 3, 9) * 2; return { prompt: `A triangle has sides ${a} cm and ${b} cm with angle $30°$ between them ($\\sin 30° = 0.5$). What is its area in cm²?`, value: (a * b) / 4, unit: "cm²", hint: "Area = ½ab sin C.", solution: [`Area = ½ × ${a} × ${b} × 0.5.`, `= ${(a * b) / 4}.`] };
  }),
  num({
    id: "exact-trig", name: "Exact trigonometric values", stage: "KS4", year: 10, strand: "Geometry", prereqs: ["trig"],
    blurb: "Know the exact values of sin, cos and tan for 0°, 30°, 45°, 60° and 90°.",
    explainer: "sin 30° = ½, cos 60° = ½, tan 45° = 1, sin 90° = 1, cos 0° = 1. Learn them, or draw the triangles that give them.",
    parentNote: "Learn the values for 30°, 60° and 45°. Draw an equilateral triangle cut in half to see sin 30° = ½ and cos 30° = √3/2.",
    talkAbout: "How can a half equilateral triangle help you remember the values?",
  }, (r, l) => {
    const t: [string, number][] = [["sin 30°", 0.5], ["cos 60°", 0.5], ["tan 45°", 1], ["sin 90°", 1], ["cos 0°", 1], ["cos 90°", 0], ["sin 0°", 0]];
    if (l === 1) { const [name, v] = pick(r, t); return { prompt: `Write the exact value of ${name}.`, value: v, hint: "Think of the standard triangles, or the table of exact values.", solution: [`${name} = ${v}.`] }; }
    if (l === 2) { const a = int(r, 2, 8); return { prompt: `Work out $${a} \\sin 30° + \\tan 45°$.`, value: a * 0.5 + 1, hint: "sin 30° = 0.5 and tan 45° = 1.", solution: [`$${a} \\times 0.5 + 1 = ${a * 0.5 + 1}$.`] }; }
    const a = int(r, 2, 6) * 2; return { prompt: `A ladder ${a} m long leans against a vertical wall and makes an angle of 30° with the wall. How far is the foot of the ladder from the wall, in metres?`, value: a * 0.5, unit: "m", hint: "The distance from the wall is the side opposite the 30° angle: ladder × sin 30°.", solution: [`Distance = ${a} × sin 30° = ${a} × 0.5 = ${a * 0.5}.`] };
  }),
  num({
    id: "circle-theorems", name: "Circle theorems", stage: "KS4", year: 10, strand: "Geometry", prereqs: ["angles-polygon"],
    blurb: "Use the angle at the centre, angles in a semicircle, cyclic quadrilaterals and tangents.",
    explainer: "The angle at the centre is twice the angle at the circumference. Angles in a semicircle are 90°. Opposite angles of a cyclic quadrilateral add up to 180°.",
    parentNote: "Draw the circle and mark the arc each angle stands on. Always say which theorem you use.",
    talkAbout: "Which circle theorem did you use, and how did you know?",
  }, (r, l) => {
    const x = int(r, 20, 80);
    if (l === 1) return { prompt: `The angle at the circumference is ${x}°, standing on the same arc as the angle at the centre. What is the angle at the centre in degrees?`, value: 2 * x, unit: "°", hint: "The angle at the centre is twice the angle at the circumference.", solution: [`2 × ${x} = ${2 * x}°.`] };
    if (l === 2) return { prompt: `ABCD is a cyclic quadrilateral. Angle A = ${x + 30}°. What is the opposite angle C in degrees?`, value: 180 - (x + 30), unit: "°", hint: "Opposite angles in a cyclic quadrilateral add up to 180°.", solution: [`180 − ${x + 30} = ${180 - x - 30}°.`] };
    return { prompt: `AB is the diameter of a circle and C is on the circumference. Angle BAC = ${x}°. What is angle ABC in degrees?`, value: 90 - x, unit: "°", hint: "The angle in a semicircle is 90°, then use the angles in a triangle.", solution: [`Angle ACB = 90° (angle in a semicircle).`, `Angle ABC = 180 − 90 − ${x} = ${90 - x}°.`] };
  }),
  num({
    id: "vectors", name: "Vectors", stage: "KS4", year: 10, strand: "Geometry", prereqs: ["transformations", "pythagoras"],
    blurb: "Add and scale column vectors, and find the length of a vector.",
    explainer: "A vector has a size and a direction. Add vectors by adding the top numbers and the bottom numbers. The length uses Pythagoras.",
    parentNote: "Treat the top number as how far across and the bottom as how far up. A negative number means left or down.",
    talkAbout: "How can you draw a vector on a grid?",
  }, (r, l) => {
    const a = [int(r, -4, 6), int(r, -4, 6)], b = [int(r, -4, 6), int(r, -4, 6)], k = int(r, 2, 4);
    const vec = (v: number[]) => `\\begin{pmatrix} ${v[0]} \\\\ ${v[1]} \\end{pmatrix}`;
    if (l === 1) return { prompt: `$\\mathbf{a} = ${vec(a)}$ and $\\mathbf{b} = ${vec(b)}$. What is the top number of $\\mathbf{a} + \\mathbf{b}$?`, value: a[0] + b[0], hint: "Add the top numbers.", solution: [`${a[0]} + (${b[0]}) = ${a[0] + b[0]}.`] };
    if (l === 2) return { prompt: `$\\mathbf{a} = ${vec(a)}$ and $\\mathbf{b} = ${vec(b)}$. What is the bottom number of $${k}\\mathbf{a} - \\mathbf{b}$?`, value: k * a[1] - b[1], hint: "Multiply a's bottom number by the scalar, then subtract b's.", solution: [`${k} × (${a[1]}) − (${b[1]}) = ${k * a[1] - b[1]}.`] };
    const [p, q, h] = pick(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]] as [number, number, number][]);
    return { prompt: `What is the length of the vector $\\begin{pmatrix} ${p} \\\\ ${q} \\end{pmatrix}$?`, value: h, hint: "Use Pythagoras: length = √(across² + up²).", solution: [`$\\sqrt{${p}^{2} + ${q}^{2}} = \\sqrt{${p * p + q * q}} = ${h}$.`] };
  }),
  num({
    id: "histograms", name: "Histograms and frequency density", stage: "KS4", year: 10, strand: "Statistics", prereqs: ["frequency-mean"],
    blurb: "Use frequency density = frequency ÷ class width to read and draw histograms.",
    explainer: "In a histogram the area of a bar shows the frequency. The height is the frequency density.",
    parentNote: "Frequency density = frequency ÷ class width. Frequency = frequency density × class width. Use it when the bars are different widths.",
    talkAbout: "Why do we use frequency density instead of frequency for the height?",
  }, (r, l) => {
    const w = pick(r, [5, 10, 20]), fd = int(r, 2, 8);
    if (l === 1) return { prompt: `A histogram class has width ${w} and frequency ${fd * w}. What is the frequency density?`, value: fd, hint: "Divide the frequency by the class width.", solution: [`${fd * w} ÷ ${w} = ${fd}.`] };
    if (l === 2) return { prompt: `A histogram bar has frequency density ${fd} and class width ${w}. What is the frequency?`, value: fd * w, hint: "Multiply the frequency density by the class width.", solution: [`${fd} × ${w} = ${fd * w}.`] };
    const w3 = pick(r, [10, 20]), part = w3 / 2; return { prompt: `A class 20 ≤ x < ${20 + w3} has frequency density ${fd}. Estimate how many values are in the part 20 ≤ x < ${20 + part}.`, value: fd * part, hint: "Use the frequency density × the width of that part.", solution: [`The part has width ${part}.`, `${fd} × ${part} = ${fd * part}.`] };
  }),

  // ---------------------------------------------------------------- Year 11
  num({
    id: "box-plots", name: "Cumulative frequency and box plots", stage: "KS4", year: 11, strand: "Statistics", prereqs: ["frequency-mean"],
    blurb: "Find the median and quartiles from a cumulative frequency graph, and the interquartile range.",
    explainer: "The median is the middle value, the lower quartile is a quarter of the way up, and the upper quartile three quarters of the way. The IQR is the upper quartile minus the lower quartile.",
    parentNote: "Read the cumulative frequency at ½n, ¼n and ¾n on the vertical axis, then go across to the graph and down to the value.",
    talkAbout: "What does a small interquartile range tell you about the data?",
  }, (r, l) => {
    const n = pick(r, [40, 60, 80, 100, 120]);
    if (l === 1) { const f = pick(r, [[2, "median"], [4, "lower quartile"]] as [number, string][]); return { prompt: `A cumulative frequency graph shows ${n} values. At what cumulative frequency do you read the ${f[1]}?`, value: n / f[0], hint: f[0] === 2 ? "The median is halfway." : "The lower quartile is a quarter of the way.", solution: [`${n} ÷ ${f[0]} = ${n / f[0]}.`] }; }
    const lq = int(r, 20, 40), uq = lq + int(r, 8, 25), mn = lq - int(r, 5, 12), mx = uq + int(r, 10, 20);
    if (l === 2) return { prompt: `The lower quartile of a data set is ${lq} and the upper quartile is ${uq}. What is the interquartile range?`, value: uq - lq, hint: "Upper quartile minus lower quartile.", solution: [`${uq} − ${lq} = ${uq - lq}.`] };
    return { prompt: `Class A has a range of ${mx - mn} and an interquartile range of ${uq - lq}. Class B has a range of ${mx - mn + 6} and an interquartile range of ${uq - lq + 4}. How much bigger is Class B's interquartile range than Class A's?`, value: 4, hint: "Subtract the two interquartile ranges. The range is not needed.", solution: [`${uq - lq + 4} − ${uq - lq} = 4.`, "The range was extra information."] };
  }),
  fracSkill({
    id: "conditional-probability", name: "Conditional probability", stage: "KS4", year: 11, strand: "Statistics", prereqs: ["tree-probability"],
    blurb: "Find probabilities when items are taken without replacement.",
    explainer: "When you do not put an item back, the numbers change for the second pick. Multiply the probabilities along the branches.",
    parentNote: "After the first pick, there is one fewer item and the counts change. Draw a tree diagram and multiply along the branches.",
    talkAbout: "Why do the bottom numbers go down after the first pick?",
  }, (r, l) => {
    const red = int(r, 3, 6), blue = int(r, 3, 6), total = red + blue;
    if (l === 1) { const n = red * (red - 1), d = total * (total - 1), g = gcd(n, d); return { prompt: `A bag has ${red} red and ${blue} blue counters. Two counters are taken at random without replacement. What is the probability that both are red? Give a fraction in its simplest form.`, n: n / g, d: d / g, hint: "Multiply the probability of the first red by the probability of the second red.", solution: [`P(first red) = ${red}/${total}.`, `P(second red) = ${red - 1}/${total - 1}.`, `${red}/${total} × ${red - 1}/${total - 1} = ${n}/${d}${g > 1 ? ` = ${n / g}/${d / g}` : ""}.`] }; }
    const n = 2 * red * blue, d = total * (total - 1), g = gcd(n, d);
    return { prompt: `A bag has ${red} red and ${blue} blue counters. Two counters are taken at random without replacement. What is the probability that they are different colours? Give a fraction in its simplest form.`, n: n / g, d: d / g, hint: "Red then blue, plus blue then red.", solution: [`Red then blue: ${red}/${total} × ${blue}/${total - 1} = ${red * blue}/${d}.`, `Blue then red: ${blue}/${total} × ${red}/${total - 1} = ${red * blue}/${d}.`, `Together: ${n}/${d}${g > 1 ? ` = ${n / g}/${d / g}` : ""}.`] };
  }),
  num({
    id: "growth-decay", name: "Growth and decay", stage: "KS4", year: 11, strand: "Number", prereqs: ["compound-interest"],
    blurb: "Use multipliers for repeated percentage growth and decay.",
    explainer: "Increase by 5%: multiply by 1.05. Decrease by 20%: multiply by 0.8. For several years, multiply that many times.",
    parentNote: "Write the multiplier first. Repeated change over n steps means multiplying by the multiplier n times, or using a power.",
    talkAbout: "What is the multiplier for a 12% decrease?",
  }, (r, l) => {
    const v = int(r, 5, 20) * 1000, p = pick(r, [10, 20, 25]), n = int(r, 2, 3), m = 1 - p / 100;
    if (l === 1) return { prompt: `A car is worth £${v}. It loses ${p}% of its value each year. What is it worth after 1 year, in pounds?`, value: v * m, hint: `Multiply by ${m}.`, solution: [`The multiplier is ${m}.`, `£${v} × ${m} = £${v * m}.`] };
    if (l === 2) return { prompt: `A car is worth £${v}. It loses ${p}% of its value each year. What is it worth after ${n} years, to the nearest pound?`, value: Math.round(v * m ** n), hint: `Multiply by ${m} for each year.`, solution: [`The multiplier is ${m}.`, `£${v} × ${m}^${n} = £${round(v * m ** n, 2)}.`, `To the nearest pound: £${Math.round(v * m ** n)}.`] };
    const g = pick(r, [10, 20, 50]), pop = int(r, 2, 8) * 1000; return { prompt: `A town has a population of ${pop}. It grows by ${g}% each year. What will the population be after 2 years?`, value: round(pop * (1 + g / 100) ** 2, 2), hint: `Multiply by ${1 + g / 100} twice.`, solution: [`The multiplier is ${1 + g / 100}.`, `${pop} × ${1 + g / 100}² = ${round(pop * (1 + g / 100) ** 2, 2)}.`] };
  }),
  num({
    id: "iteration", name: "Iteration", stage: "KS4", year: 11, strand: "Algebra", prereqs: ["substitute", "sequences"],
    blurb: "Use an iterative formula to find the next terms.",
    explainer: "An iterative formula gives the next term from the last one. Put each answer back into the formula.",
    parentNote: "Write down x₁, put it into the formula to get x₂, then use x₂ to get x₃. Check each step on the calculator.",
    talkAbout: "How do you use the answer from one step in the next one?",
  }, (r, l) => {
    const a = int(r, 2, 4), b = int(r, 1, 5), x1 = int(r, 1, 3);
    const x2 = a * x1 + b, x3 = a * x2 + b, x4 = a * x3 + b;
    if (l === 1) return { prompt: `$x_{n+1} = ${a}x_n + ${b}$ and $x_1 = ${x1}$. What is $x_2$?`, value: x2, hint: "Put 1 into the formula for x_n.", solution: [`$x_2 = ${a} \\times ${x1} + ${b} = ${x2}$.`] };
    if (l === 2) return { prompt: `$x_{n+1} = ${a}x_n + ${b}$ and $x_1 = ${x1}$. What is $x_3$?`, value: x3, hint: "Find x₂ first, then use it to find x₃.", solution: [`$x_2 = ${a} \\times ${x1} + ${b} = ${x2}$.`, `$x_3 = ${a} \\times ${x2} + ${b} = ${x3}$.`] };
    return { prompt: `$x_{n+1} = ${a}x_n + ${b}$ and $x_1 = ${x1}$. What is $x_4$?`, value: x4, hint: "Work forwards one step at a time.", solution: [`$x_2 = ${x2}$.`, `$x_3 = ${a} \\times ${x2} + ${b} = ${x3}$.`, `$x_4 = ${a} \\times ${x3} + ${b} = ${x4}$.`] };
  }),
  num({
    id: "inverse-functions", name: "Inverse functions", stage: "KS4", year: 11, strand: "Algebra", prereqs: ["composite-functions", "rearrange-formulae"],
    blurb: "Find the inverse of a function and use it.",
    explainer: "The inverse function undoes the function. If f takes x to y, then the inverse takes y back to x.",
    parentNote: "Write y = f(x), then rearrange to make x the subject. Swap x and y at the end.",
    talkAbout: "How can you check that you have the right inverse?",
  }, (r, l) => {
    const a = int(r, 2, 6), b = int(r, 1, 9), x = int(r, 2, 9), y = a * x + b;
    if (l === 1) return { prompt: `$f(x) = ${a}x + ${b}$. What is $f^{-1}(${y})$?`, value: x, hint: "Find the value of x that gives this output.", solution: [`Solve $${a}x + ${b} = ${y}$.`, `$x = ${x}$, so $f^{-1}(${y}) = ${x}$.`] };
    if (l === 2) return { prompt: `$f(x) = ${a}x + ${b}$. The inverse is $f^{-1}(x) = \\frac{x - ${b}}{${a}}$. What is $f^{-1}(${y + a * 2})$?`, value: x + 2, hint: "Put the number into the inverse function.", solution: [`$f^{-1}(${y + a * 2}) = \\frac{${y + a * 2} - ${b}}{${a}} = ${x + 2}$.`] };
    return { prompt: `$f(x) = \\frac{x + ${b}}{${a}}$. What is $f^{-1}(${x})$?`, value: a * x - b, hint: "Undo the ÷ then the +: multiply by the number, then subtract.", solution: [`$y = \\frac{x + ${b}}{${a}}$ gives $x = ${a}y - ${b}$.`, `$f^{-1}(${x}) = ${a} \\times ${x} - ${b} = ${a * x - b}$.`] };
  }),
  num({
    id: "quadratic-graphs", name: "Quadratic graphs", stage: "KS4", year: 11, strand: "Algebra", prereqs: ["completing-square", "solve-quad"],
    blurb: "Find the turning point, intercepts and symmetry of a quadratic graph.",
    explainer: "A quadratic graph is a parabola. It is symmetrical, and the turning point is halfway between the roots.",
    parentNote: "For y = x² + bx + c the line of symmetry is x = −b/2. The y-intercept is c. The roots are where the curve crosses the x-axis.",
    talkAbout: "Where is the turning point, compared with the two roots?",
  }, (r, l) => {
    const p = int(r, 1, 6), q = int(r, 1, 6) * (r() < 0.5 ? 1 : -1), b = -(p + q), c = p * q, eq = `x^{2} ${b < 0 ? "-" : "+"} ${Math.abs(b)}x ${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
    const lo = Math.min(p, q, 0) - 1, hi = Math.max(p, q, 0) + 1, curve = [{ pts: sample((x) => x * x + b * x + c, lo, hi) }], alt = `The graph of y = ${eq.replace(/[{}]/g, "")}, a U-shaped curve.`;
    if (l === 1) return { figure: graph(curve, [lo, hi, 1], alt), prompt: `The curve $y = ${eq}$ crosses the y-axis. What is the y-coordinate where it crosses?`, value: c, hint: "Put x = 0 into the equation.", solution: [`When x = 0, y = ${c}.`] };
    if (l === 2) return { figure: graph(curve, [lo, hi, 1], alt + ` It crosses the x-axis at ${p} and ${q}.`, { marks: [{ x: p, y: 0, label: `${p}` }, { x: q, y: 0, label: `${q}` }] }), prompt: `The curve $y = ${eq}$ crosses the x-axis at ${p} and ${q}. What is the x-coordinate of its turning point?`, value: (p + q) / 2, hint: "The turning point is halfway between the roots.", solution: [`(${p} + (${q})) ÷ 2 = ${(p + q) / 2}.`] };
    const xt = (p + q) / 2; return { figure: graph(curve, [lo, hi, 1], alt), prompt: `The curve $y = ${eq}$ has its turning point at $x = ${xt}$. What is the y-coordinate of the turning point?`, value: xt * xt + b * xt + c, hint: "Put the x-coordinate into the equation.", solution: [`$y = (${xt})^{2} ${b < 0 ? "-" : "+"} ${Math.abs(b)}(${xt}) ${c < 0 ? "-" : "+"} ${Math.abs(c)}$.`, `$y = ${xt * xt + b * xt + c}$.`] };
  }),
  fracSkill({
    id: "recurring-decimals", name: "Recurring decimals as fractions", stage: "KS4", year: 11, strand: "Number", prereqs: ["fdp-convert", "solve-linear"],
    blurb: "Turn a recurring decimal into a fraction.",
    explainer: "Multiply by a power of 10 so the repeating part lines up, then subtract to remove it.",
    parentNote: "For 0.333…: let x = 0.333…, then 10x = 3.333…. Subtract: 9x = 3, so x = 1/3. For two repeating digits, multiply by 100.",
    talkAbout: "Why does subtracting make the repeating part disappear?",
  }, (r, l) => {
    if (l === 1) { const d = int(r, 1, 8), g = gcd(d, 9); return { prompt: `Write $0.\\dot{${d}}$ (that is 0.${String(d).repeat(6)}…) as a fraction in its simplest form.`, n: d / g, d: 9 / g, hint: "Let x = the decimal. Multiply by 10 and subtract.", solution: [`$10x - x = ${d}$, so $9x = ${d}$.`, `$x = \\frac{${d}}{9}$${g > 1 ? ` = $\\frac{${d / g}}{${9 / g}}$` : ""}.`] }; }
    const a = int(r, 1, 9), b = int(r, 0, 9), n2 = a * 10 + b, g2 = gcd(n2, 99);
    return { prompt: `Write $0.\\dot{${a}}\\dot{${b}}$ (that is 0.${String(n2).padStart(2, "0").repeat(4)}…) as a fraction in its simplest form.`, n: n2 / g2, d: 99 / g2, hint: "Let x = the decimal. Multiply by 100 and subtract.", solution: [`$100x - x = ${n2}$, so $99x = ${n2}$.`, `$x = \\frac{${n2}}{99}$${g2 > 1 ? ` = $\\frac{${n2 / g2}}{${99 / g2}}$` : ""}.`] };
  }),
];

function polyL(p: number[]) { return toLatex(p); }
