import { ALL_SKILLS, SKILL_BY_ID, STAGE_LABEL, STRANDS } from "../curriculum";
import { BAND_TEXT, yearLabel } from "./diagnostic";
import { DAY, statusOf, type BaselineRecord, type MockRecord, type Profile, type Status } from "./progress";
import type { Strand } from "./types";

export const STATUS_ORDER: Status[] = ["secure", "growing", "learning", "assumed", "new"];
export const STATUS_WORDS: Record<Status, string> = { secure: "Secure", growing: "Getting there", learning: "Learning", assumed: "Assumed known", new: "Not started" };

export interface SkillRow {
  id: string; name: string; strand: Strand; year: number; stage: string; status: Status;
  right: number; wrong: number; seen: number; accuracy: number | null; last: number | null; due: number | null;
}
export interface StrandRow { strand: Strand; counts: Record<Status, number>; total: number }
export interface WeekBar { start: number; minutes: number; answered: number }
export interface Attention { id: string; name: string; right: number; wrong: number; accuracy: number; ask: string; explain: string }

export interface ProgressReportData {
  name: string; year: number; generated: number; since: number;
  level: { label: string; detail: string; at: number; checkups: number } | null;
  last28: { sessions: number; minutes: number; answered: number; correct: number; accuracy: number | null; activeDays: number };
  allTime: { sessions: number; minutes: number; answered: number; accuracy: number | null };
  secure: { done: number; total: number };
  weeks: WeekBar[];
  strands: StrandRow[];
  checkups: { at: number; level: string; questions: number; correct: number; minutes: number }[];
  gaps: string[]; strengths: string[];
  papers: { at: number; paper: string; score: number; total: number; minutes: number; bySection: string }[];
  skills: SkillRow[];
  attention: Attention[];
  mistakes: { skill: string; count: number; message: string }[];
  focus: string[];
  plan: { target: string; sessionsPerWeek: number; examDate: number | null; weekNumber: number | null; weekSkills: string[] } | null;
  tutorOn: boolean;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : null);
const dayKey = (t: number) => new Date(t).toDateString();

/** Everything a tutor or teacher would want to see, worked out from the learner's saved progress. */
export function buildProgressReport(p: Profile, now = Date.now()): ProgressReportData {
  const since28 = now - 28 * DAY;
  const recent = p.sessions.filter((s) => s.at >= since28);
  const answered = recent.reduce((s, x) => s + x.answered, 0), correct = recent.reduce((s, x) => s + x.correct, 0);
  const allAnswered = p.sessions.reduce((s, x) => s + x.answered, 0), allCorrect = p.sessions.reduce((s, x) => s + x.correct, 0);

  const weeks: WeekBar[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = now - (i + 1) * 7 * DAY, end = now - i * 7 * DAY;
    const inWeek = p.sessions.filter((s) => s.at > start && s.at <= end);
    weeks.push({ start: end, minutes: Math.round(inWeek.reduce((s, x) => s + x.minutes, 0)), answered: inWeek.reduce((s, x) => s + x.answered, 0) });
  }

  const skills: SkillRow[] = ALL_SKILLS.map((s) => {
    const st = p.skills[s.id];
    return { id: s.id, name: s.name, strand: s.strand, year: s.year, stage: STAGE_LABEL[s.stage], status: statusOf(st), right: st?.right ?? 0, wrong: st?.wrong ?? 0, seen: st?.seen ?? 0,
      accuracy: pct(st?.right ?? 0, (st?.right ?? 0) + (st?.wrong ?? 0)), last: st && st.last > 0 ? st.last : null, due: st && st.seen > 0 ? st.due : null };
  });
  const touched = skills.filter((s) => s.seen > 0);

  const strands: StrandRow[] = STRANDS.map((strand) => {
    const counts: Record<Status, number> = { secure: 0, growing: 0, learning: 0, assumed: 0, new: 0 };
    for (const s of skills) if (s.strand === strand) counts[s.status]++;
    return { strand, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }).filter((r) => r.strand !== "Reasoning" || r.counts.secure + r.counts.growing + r.counts.learning > 0);

  const last: BaselineRecord | undefined = p.baselines[p.baselines.length - 1];
  const name = (id: string) => SKILL_BY_ID[id]?.name ?? id;
  const attention: Attention[] = touched
    .filter((s) => s.wrong > s.right * 0.5 && s.seen >= 3)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)).slice(0, 5)
    .map((s) => ({ id: s.id, name: s.name, right: s.right, wrong: s.wrong, accuracy: s.accuracy ?? 0, ask: SKILL_BY_ID[s.id]?.talkAbout ?? "", explain: SKILL_BY_ID[s.id]?.parentNote ?? "" }));

  const mock = (m: MockRecord) => ({
    at: m.at, paper: m.paper === "reasoning" ? "Reasoning" : m.paper === "both" ? "Maths and reasoning" : "Maths", score: m.score, total: m.total, minutes: Math.round(m.seconds / 60),
    bySection: (m.bySection ?? []).map((x) => `${x.section} ${x.right}/${x.n}`).join(", "),
  });

  const week = p.plan?.weeks.find((w) => w.start <= now && now < w.start + 7 * DAY);
  return {
    name: p.name, year: p.year, generated: now, since: p.createdAt,
    level: last ? { label: yearLabel(last.theta), detail: BAND_TEXT[last.readiness]?.label ?? "", at: last.at, checkups: p.baselines.length } : null,
    last28: { sessions: recent.length, minutes: Math.round(recent.reduce((s, x) => s + x.minutes, 0)), answered, correct, accuracy: pct(correct, answered), activeDays: new Set(recent.map((s) => dayKey(s.at))).size },
    allTime: { sessions: p.sessions.length, minutes: Math.round(p.sessions.reduce((s, x) => s + x.minutes, 0)), answered: allAnswered, accuracy: pct(allCorrect, allAnswered) },
    secure: { done: skills.filter((s) => s.status === "secure").length, total: skills.length },
    weeks, strands,
    checkups: p.baselines.map((b) => ({ at: b.at, level: yearLabel(b.theta), questions: b.questions, correct: b.correct, minutes: b.minutes })).reverse(),
    gaps: (last?.gaps ?? []).map(name), strengths: (last?.strengths ?? []).map(name),
    papers: (p.mocks ?? []).map(mock).reverse(),
    skills: touched.sort((a, b) => STRANDS.indexOf(a.strand) - STRANDS.indexOf(b.strand) || a.year - b.year || a.name.localeCompare(b.name)),
    attention,
    mistakes: Object.values(p.mistakes).sort((a, b) => b.count - a.count).slice(0, 5).map((m) => ({ skill: name(m.skill), count: m.count, message: m.message })),
    focus: p.focus.map(name),
    plan: p.plan ? { target: p.plan.target === "11plus" ? "11+ preparation" : "General", sessionsPerWeek: p.plan.sessionsPerWeek, examDate: p.goal?.examDate ?? p.plan.examDate ?? null, weekNumber: week?.n ?? null, weekSkills: (week?.skills ?? []).map(name) } : null,
    tutorOn: !!p.tutor?.enabled,
  };
}

/** A spreadsheet cell that cannot be read as a formula by Excel or Sheets, and is quoted if it needs to be. */
export function csvCell(v: string | number | null): string {
  let s = v === null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const date = (t: number | null) => (t ? new Date(t).toISOString().slice(0, 10) : "");

/** One row per skill the learner has worked on, for a tutor who prefers a spreadsheet. */
export function reportCsv(r: ProgressReportData): string {
  const head = ["Skill", "Strand", "School year", "Status", "Right", "Wrong", "Accuracy %", "Last practised", "Next review"];
  const rows = r.skills.map((s) => [s.name, s.strand, s.year, STATUS_WORDS[s.status], s.right, s.wrong, s.accuracy, date(s.last), date(s.due)]);
  return [head, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const reportFileName = (r: ProgressReportData, ext: string) => `quarter-progress-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner"}-${date(r.generated)}.${ext}`;
