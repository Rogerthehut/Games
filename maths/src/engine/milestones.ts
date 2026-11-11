import { SKILL_BY_ID } from "../curriculum";
import { statusOf, type Profile } from "./progress";

/**
 * Milestones a child can explain ("I can read a clock"), earned when every topic behind them is secure.
 * They are worked out from progress, so they can never get out of step with it.
 */
export interface Milestone { id: string; title: string; blurb: string; tone: "gold" | "rose" | "mint" | "peri"; skills: string[] }

export const MILESTONES: Milestone[] = [
  { id: "clock", title: "Clock reader", blurb: "Tells the time and works out how long things take.", tone: "gold", skills: ["analogue-clocks", "elapsed-time", "convert-time"] },
  { id: "money", title: "Money wizard", blurb: "Counts coins, adds up bills and gives change.", tone: "mint", skills: ["coins-notes", "pounds-pence", "add-sub-money", "shopping-bills"] },
  { id: "tables", title: "Times tables star", blurb: "Knows the tables and uses them to multiply and divide.", tone: "rose", skills: ["times-tables", "mult-written", "division"] },
  { id: "place-value", title: "Number detective", blurb: "Understands place value, rounding and negative numbers.", tone: "peri", skills: ["place-value", "rounding", "negative-numbers"] },
  { id: "fractions", title: "Fraction fan", blurb: "Finds equivalent fractions, adds them and takes fractions of amounts.", tone: "gold", skills: ["frac-equiv", "frac-add", "frac-amount"] },
  { id: "shapes", title: "Shape spotter", blurb: "Spots symmetry and knows 3-D shapes and their nets.", tone: "mint", skills: ["symmetry-lines", "shapes-3d", "nets-solids"] },
  { id: "graphs", title: "Graph reader", blurb: "Reads pictograms, bar charts and line graphs.", tone: "peri", skills: ["pictograms", "read-bar-charts", "line-graphs"] },
  { id: "angles", title: "Angle ace", blurb: "Measures and calculates angles in lines, triangles and polygons.", tone: "rose", skills: ["right-angles", "angles-basic", "angles-polygon"] },
  { id: "algebra", title: "Algebra starter", blurb: "Uses letters for numbers and solves simple equations.", tone: "gold", skills: ["substitute", "solve-linear", "expand-single"] },
  { id: "sequences", title: "Pattern finder", blurb: "Spots the rule in a sequence and finds any term.", tone: "mint", skills: ["sequences", "nth-term"] },
  { id: "pythagoras", title: "Triangle expert", blurb: "Uses Pythagoras' theorem and trigonometry.", tone: "peri", skills: ["pythagoras", "trig"] },
  { id: "calculus", title: "Calculus explorer", blurb: "Differentiates and integrates.", tone: "rose", skills: ["differentiate", "integrate-polynomials"] },
  { id: "code", title: "Code cracker", blurb: "Reads and writes binary and hexadecimal.", tone: "mint", skills: ["stem-binary", "stem-hex"] },
  { id: "robot", title: "Robot programmer", blurb: "Gives precise instructions, uses loops and finds bugs.", tone: "gold", skills: ["stem-instructions", "stem-loops", "stem-debugging"] },
  { id: "data", title: "Data detective", blurb: "Reads survey data and spots the odd one out.", tone: "peri", skills: ["stem-data-detective", "stem-outliers"] },
  { id: "machine", title: "Machine teacher", blurb: "Understands how a machine learns from examples.", tone: "rose", skills: ["stem-ai-features", "stem-nearest"] },
  { id: "quantum", title: "Quantum curious", blurb: "Knows the big ideas of quantum physics and what a qubit is.", tone: "mint", skills: ["stem-quantum-ideas", "stem-qubit"] },
];

export interface MilestoneState extends Milestone { done: number; total: number; earned: boolean; /** the first topic still to secure */ next?: string; /** the oldest year group any of its topics belongs to */ year: number }

export function milestoneStates(profile: Profile): MilestoneState[] {
  return MILESTONES.map((m) => {
    const secure = m.skills.filter((id) => statusOf(profile.skills[id]) === "secure");
    return { ...m, done: secure.length, total: m.skills.length, earned: secure.length === m.skills.length, next: m.skills.find((id) => !secure.includes(id)), year: Math.max(...m.skills.map((id) => SKILL_BY_ID[id].year)) };
  });
}

/** What to show a learner: everything they've earned, plus what's within reach for their year (up to three years ahead). */
export function shelf(profile: Profile): { earned: MilestoneState[]; coming: MilestoneState[]; nextUp?: MilestoneState } {
  const all = milestoneStates(profile);
  const earned = all.filter((m) => m.earned);
  const coming = all.filter((m) => !m.earned && m.year <= profile.year + 3);
  const nextUp = [...coming].sort((a, b) => b.done / b.total - a.done / a.total || a.year - b.year)[0];
  return { earned, coming, nextUp };
}

/** The ones earned that the learner hasn't been shown yet. */
export const newlyEarned = (profile: Profile) => milestoneStates(profile).filter((m) => m.earned && !profile.milestonesSeen?.includes(m.id));
