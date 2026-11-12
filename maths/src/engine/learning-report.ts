import { conceptsForSkill } from "../concepts";
import { SKILL_BY_ID } from "../curriculum";
import { familyFor, type HelpFamily } from "./help-methods";
import { hasLesson } from "./lesson";
import { mulberry32 } from "./rng";
import { statusOf, type Profile, type Status } from "./progress";
import type { Question } from "./types";
import { wrongLogOf, type WrongEntry } from "./wrong-log";

/**
 * The grown-ups' learning report: for a chosen period, exactly which questions were wrong, how, and why that may be happening, with
 * methods to try together and study material to use. Reasons come from the answers themselves (what was typed, which common mistakes
 * the marking recognised, how often help was needed), so they say "likely", never "diagnosis".
 */
const DAY = 86_400_000;

export interface Period { from: number; to: number; label: string }
export const PERIODS = [
  { id: "7", label: "Last 7 days", days: 7 }, { id: "14", label: "Last 14 days", days: 14 }, { id: "30", label: "Last 30 days", days: 30 }, { id: "90", label: "Last 90 days", days: 90 },
] as const;
export const lastDays = (days: number, now = Date.now()): Period => ({ from: now - days * DAY, to: now, label: days === 7 ? "the last 7 days" : `the last ${days} days` });

// ---------------------------------------------------------------------------------------------- what the typed answer tells us
export interface Diagnosis { tag: string; reason: string }
const numbersIn = (text: string) => (text.replace(/[,\s](?=\d{3}\b)/g, "").match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const asNumber = (t: string) => { const n = Number(t.replace(/[^\d.\-−/]/g, "").replace("−", "-")); return Number.isFinite(n) && /\d/.test(t) ? n : NaN; };

/** What a wrong numerical answer suggests. Returns null when nothing clear can be said. */
export function diagnoseAttempt(entry: Pick<WrongEntry, "prompt" | "shown" | "tried">, attempt: string): Diagnosis | null {
  const t = asNumber(attempt), c = asNumber(entry.shown.replace(/\$/g, ""));
  if (!attempt.trim()) return { tag: "blank", reason: "left it blank" };
  if (!Number.isFinite(t) || !Number.isFinite(c) || t === c) return null;
  const nums = numbersIn(entry.prompt);
  if (Math.abs(t - c) === 1) return { tag: "off-by-one", reason: "was one away from the right answer, which is usually a counting or carrying slip" };
  if (c !== 0 && t === -c) return { tag: "sign", reason: "had the right size but the wrong sign (plus or minus)" };
  if (c !== 0 && (t === c * 10 || t === c / 10 || t === c * 100 || t === c / 100)) return { tag: "place-value", reason: "had the right digits but in the wrong place (a place-value or zero slip)" };
  if (String(Math.abs(t)).length > 1 && String(Math.abs(t)).split("").reverse().join("") === String(Math.abs(c))) return { tag: "reversed", reason: "had the right digits in the wrong order" };
  if (nums.length >= 2) {
    const [a, b] = nums;
    const ops: [string, number][] = [["added", a + b], ["subtracted", Math.abs(a - b)], ["multiplied", a * b], ["divided", b !== 0 ? a / b : NaN]];
    const hit = ops.find(([, v]) => v === t);
    if (hit) return { tag: "wrong-operation", reason: `${hit[0]} the numbers in the question, so the question may have been read as a different kind of sum` };
  }
  if (nums.includes(t)) return { tag: "copied-number", reason: "gave back a number from the question, which suggests they weren't sure what to do with it" };
  if (c !== 0 && Math.abs(t - c) <= Math.max(2, Math.abs(c) * 0.1)) return { tag: "near-miss", reason: "was close to the right answer, which is usually a small calculation slip" };
  return null;
}

// ---------------------------------------------------------------------------------------------- the report
export interface Example { entry: WrongEntry; question: Question | null }
export interface Reason { text: string; kind: "pattern" | "general"; count?: number }
export interface TopicFinding {
  skillId: string; name: string; year: number; strand: string;
  missed: number; helped: number; gaveUp: number; total: number; lastAt: number; score: number;
  examples: Example[];
  reasons: Reason[];
  family: HelpFamily;
  studyGuides: { id: string; title: string }[];
  hasLesson: boolean;
  /** Earlier topics this builds on that aren't secure yet. */
  shaky: { id: string; name: string }[];
  /** How many questions were wrong in the same length of time just before this period, to show it getting better or worse. */
  previous: number;
  /** Where the topic stands now. */
  status: Status;
  /** "Fix this" practice done on it: how many sets, and how the latest went. */
  fix: { sets: number; last: { right: number; total: number; at: number } } | null;
}
/** A topic that had wrong answers before this period and none in it, while still being practised: a problem getting better. */
export interface Improving { skillId: string; name: string; before: number; status: Status }
export interface LearningReport { period: Period; totals: { questions: number; missed: number; helped: number; gaveUp: number; topics: number }; topics: TopicFinding[]; improving: Improving[]; secureNow: string[] }

/** Makes the question again from its seed, if it still matches what was asked, so the report can show its picture and steps. */
export function regenerate(e: WrongEntry): Question | null {
  const skill = SKILL_BY_ID[e.skill];
  if (!skill || e.seed === undefined) return null;
  try {
    const q = skill.generate(mulberry32(e.seed), e.level);
    return q.prompt === e.prompt || q.prompt.startsWith(e.prompt.replace(/…$/, "")) ? { ...q, seed: e.seed } : null;
  } catch { return null; }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function buildLearningReport(p: Profile, period: Period): LearningReport {
  const log = wrongLogOf(p).filter((e) => SKILL_BY_ID[e.skill]);
  const inPeriod = log.filter((e) => e.at >= period.from && e.at <= period.to);
  const length = period.to - period.from;
  const before = (skill: string) => log.filter((e) => e.skill === skill && e.at >= period.from - length && e.at < period.from).length;
  const by = new Map<string, WrongEntry[]>();
  for (const e of inPeriod) by.set(e.skill, [...(by.get(e.skill) ?? []), e]);
  const topics: TopicFinding[] = [];
  for (const [skillId, entries] of by) {
    const skill = SKILL_BY_ID[skillId], family = familyFor(skillId);
    const missed = entries.filter((e) => e.outcome === "missed").length, helped = entries.filter((e) => e.outcome === "helped").length, gaveUp = entries.filter((e) => e.outcome === "gave-up").length;
    const reasons: Reason[] = [];
    // 1. mistakes the marking recognised, in its own words
    const notes = new Map<string, number>();
    for (const e of entries) for (const n of e.notes) notes.set(n, (notes.get(n) ?? 0) + 1);
    for (const [text, count] of [...notes].sort((a, b) => b[1] - a[1]).slice(0, 2)) reasons.push({ text, kind: "pattern", count });
    // 2. what the typed answers suggest
    const found = new Map<string, { reason: string; count: number }>();
    for (const e of entries) for (const t of e.tried) { const d = diagnoseAttempt(e, t); if (d) found.set(d.tag, { reason: d.reason, count: (found.get(d.tag)?.count ?? 0) + 1 }); }
    for (const [, d] of [...found].sort((a, b) => b[1].count - a[1].count).slice(0, 2)) reasons.push({ text: `They ${d.reason}${d.count > 1 ? ` (${plural(d.count, "time")})` : ""}.`, kind: "pattern", count: d.count });
    // 3. how they went about it
    if (gaveUp >= 2 || gaveUp > entries.length / 2) reasons.push({ text: `They asked to see the steps without trying on ${plural(gaveUp, "question")}. That usually means they weren't sure where to start.`, kind: "pattern", count: gaveUp });
    if (entries.length >= 3 && new Set(entries.map((e) => e.level)).size === 1 && entries[0].level >= 2) reasons.push({ text: "The slips are at the harder levels, so the basics may be fine and the extra step is the problem.", kind: "pattern" });
    // 4. earlier topics that aren't secure
    const shaky = skill.prereqs.filter((id) => SKILL_BY_ID[id] && ["new", "learning"].includes(statusOf(p.skills[id]))).map((id) => ({ id, name: SKILL_BY_ID[id].name }));
    if (shaky.length) reasons.push({ text: `This builds on ${shaky.map((s) => s.name).join(" and ")}, which ${shaky.length === 1 ? "isn't" : "aren't"} secure yet.`, kind: "pattern" });
    // 5. what is common for this kind of topic
    for (const text of family.why.slice(0, Math.max(1, 3 - reasons.length))) reasons.push({ text, kind: "general" });
    const distinct: WrongEntry[] = [];
    for (const e of [...entries].sort((a, b) => b.at - a.at)) if (!distinct.some((d) => d.prompt === e.prompt)) distinct.push(e);
    const guides = conceptsForSkill(skillId).slice(0, 3).map((c) => ({ id: c.id, title: c.title }));
    topics.push({
      skillId, name: skill.name, year: skill.year, strand: skill.strand, missed, helped, gaveUp, total: entries.length, lastAt: Math.max(...entries.map((e) => e.at)),
      score: missed * 3 + gaveUp * 2 + helped, examples: distinct.slice(0, 4).map((entry) => ({ entry, question: regenerate(entry) })),
      reasons: reasons.slice(0, 5), family, studyGuides: guides, hasLesson: hasLesson(skillId), shaky,
      previous: before(skillId), status: statusOf(p.skills[skillId]), fix: fixSummary(p, skillId),
    });
  }
  topics.sort((a, b) => b.score - a.score || b.lastAt - a.lastAt);
  const improving: Improving[] = [...new Set(log.filter((e) => e.at >= period.from - length && e.at < period.from).map((e) => e.skill))]
    .filter((id) => !by.has(id) && (p.skills[id]?.last ?? 0) >= period.from)
    .map((id) => ({ skillId: id, name: SKILL_BY_ID[id].name, before: before(id), status: statusOf(p.skills[id]) }))
    .sort((a, b) => b.before - a.before);
  const secureNow = topics.filter((t) => statusOf(p.skills[t.skillId]) === "secure").map((t) => t.name);
  return { period, totals: { questions: inPeriod.length, missed: topics.reduce((s, t) => s + t.missed, 0), helped: topics.reduce((s, t) => s + t.helped, 0), gaveUp: topics.reduce((s, t) => s + t.gaveUp, 0), topics: topics.length }, topics, improving, secureNow };
}

/** How "fix this" practice on a topic has gone. */
export function fixSummary(p: Profile, skillId: string): TopicFinding["fix"] {
  const mine = (p.fixes ?? []).filter((f) => f.skill === skillId);
  if (!mine.length) return null;
  const { right, total, at } = mine[mine.length - 1];
  return { sets: mine.length, last: { right, total, at } };
}
