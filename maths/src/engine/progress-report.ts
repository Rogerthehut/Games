import { PAPERS } from "./mock";
import { ALL_SKILLS, SKILL_BY_ID, STAGE_LABEL, STRANDS } from "../curriculum";
import { BAND_TEXT, yearLabel } from "./diagnostic";
import { DAY, statusOf, type BaselineRecord, type MockRecord, type Profile, type Status } from "./progress";
import type { Strand } from "./types";
import { summarise as summariseTables, type TablesSummary } from "./tables";

export const STATUS_ORDER: Status[] = ["secure", "growing", "learning", "assumed", "new"];
export const STATUS_WORDS: Record<Status, string> = { secure: "Secure", growing: "Getting there", learning: "Learning", assumed: "Assumed known", new: "Not started" };

export interface SkillRow {
  id: string; name: string; strand: Strand; year: number; stage: string; status: Status;
  right: number; wrong: number; seen: number; accuracy: number | null; last: number | null; due: number | null;
  /** How many practice sessions in the chosen period included this topic. */
  inPeriod: number;
}
export interface StrandRow { strand: Strand; counts: Record<Status, number>; total: number }
/** One bar on the practice chart: a day or a week. `start` is its first moment, `end` its last. */
export interface WeekBar { start: number; end: number; minutes: number; answered: number }
/** A chosen stretch of time, from the start of the first day to the end of the last (both in ms). */
export interface Range { from: number; to: number }
export interface Attention { id: string; name: string; right: number; wrong: number; accuracy: number; ask: string; explain: string }

export interface ProgressReportData {
  name: string; year: number; generated: number; since: number;
  level: { label: string; detail: string; at: number; checkups: number } | null;
  period: { custom: boolean; from: number; to: number; sessions: number; minutes: number; answered: number; correct: number; accuracy: number | null; activeDays: number };
  /** "day" or "week": what each bar of the practice chart stands for. */
  unit: "day" | "week";
  allTime: { sessions: number; minutes: number; answered: number; accuracy: number | null };
  secure: { done: number; total: number };
  weeks: WeekBar[];
  strands: StrandRow[];
  checkups: { at: number; level: string; questions: number; correct: number; minutes: number }[];
  gaps: string[]; strengths: string[];
  papers: { at: number; paper: string; score: number; total: number; minutes: number; bySection: string }[];
  skills: SkillRow[];
  attention: Attention[];
  practised: { skill: string; sessions: number }[];
  mistakes: { skill: string; count: number; message: string }[];
  focus: string[];
  plan: { target: string; sessionsPerWeek: number; examDate: number | null; weekNumber: number | null; weekSkills: string[] } | null;
  tutorOn: boolean;
  /** Times tables, when the learner has used them: null if not. */
  tables: TablesSummary | null;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : null);
const dayKey = (t: number) => new Date(t).toDateString();

/** Everything a tutor or teacher would want to see, worked out from the learner's saved progress. */
export function buildProgressReport(p: Profile, now = Date.now(), range?: Range | null): ProgressReportData {
  const custom = !!range && range.to >= range.from;
  const from = custom ? range!.from : now - 28 * DAY, to = custom ? range!.to : now;
  const recent = p.sessions.filter((s) => s.at >= from && s.at <= to);
  const answered = recent.reduce((s, x) => s + x.answered, 0), correct = recent.reduce((s, x) => s + x.correct, 0);
  const allAnswered = p.sessions.reduce((s, x) => s + x.answered, 0), allCorrect = p.sessions.reduce((s, x) => s + x.correct, 0);

  // the practice chart: eight weeks to today by default; for a chosen period, a bar a day (up to two weeks) or a bar a week
  const days = Math.max(1, Math.round((to - from) / DAY));
  const unit: "day" | "week" = custom && days <= 14 ? "day" : "week";
  const weeks: WeekBar[] = [];
  const bar = (start: number, end: number) => {
    const inBar = p.sessions.filter((s) => s.at > start && s.at <= end);
    weeks.push({ start: start + 1, end, minutes: Math.round(inBar.reduce((s, x) => s + x.minutes, 0)), answered: inBar.reduce((s, x) => s + x.answered, 0) });
  };
  if (!custom) for (let i = 7; i >= 0; i--) bar(now - (i + 1) * 7 * DAY, now - i * 7 * DAY);
  else if (unit === "day") for (let i = 0; i < days; i++) bar(from + i * DAY - 1, Math.min(from + (i + 1) * DAY - 1, to));
  else { const n = Math.min(26, Math.ceil(days / 7)); for (let i = n - 1; i >= 0; i--) bar(Math.max(from - 1, to - (i + 1) * 7 * DAY), to - i * 7 * DAY); }

  const inPeriod: Record<string, number> = {};
  for (const sess of recent) for (const id of new Set(sess.skills)) inPeriod[id] = (inPeriod[id] ?? 0) + 1;

  const skills: SkillRow[] = ALL_SKILLS.map((s) => {
    const st = p.skills[s.id];
    return { id: s.id, name: s.name, strand: s.strand, year: s.year, stage: STAGE_LABEL[s.stage], status: statusOf(st), right: st?.right ?? 0, wrong: st?.wrong ?? 0, seen: st?.seen ?? 0,
      accuracy: pct(st?.right ?? 0, (st?.right ?? 0) + (st?.wrong ?? 0)), last: st && st.last > 0 ? st.last : null, due: st && st.seen > 0 ? st.due : null, inPeriod: inPeriod[s.id] ?? 0 };
  });
  const touched = skills.filter((s) => s.seen > 0);

  const ORDER: Strand[] = [...STRANDS, "STEM"];
  const strands: StrandRow[] = ORDER.map((strand) => {
    const counts: Record<Status, number> = { secure: 0, growing: 0, learning: 0, assumed: 0, new: 0 };
    for (const s of skills) if (s.strand === strand) counts[s.status]++;
    return { strand, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }).filter((r) => (r.strand !== "Reasoning" && r.strand !== "STEM") || r.counts.secure + r.counts.growing + r.counts.learning > 0);

  const last: BaselineRecord | undefined = p.baselines[p.baselines.length - 1];
  const name = (id: string) => SKILL_BY_ID[id]?.name ?? id;
  const attention: Attention[] = touched
    .filter((s) => s.wrong > s.right * 0.5 && s.seen >= 3)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)).slice(0, 5)
    .map((s) => ({ id: s.id, name: s.name, right: s.right, wrong: s.wrong, accuracy: s.accuracy ?? 0, ask: SKILL_BY_ID[s.id]?.talkAbout ?? "", explain: SKILL_BY_ID[s.id]?.parentNote ?? "" }));

  const mock = (m: MockRecord) => ({
    at: m.at, paper: m.paper ? PAPERS[m.paper]?.title ?? "Maths" : "Maths", score: m.score, total: m.total, minutes: Math.round(m.seconds / 60),
    bySection: (m.bySection ?? []).map((x) => `${x.section} ${x.right}/${x.n}`).join(", "),
  });

  const week = p.plan?.weeks.find((w) => w.start <= now && now < w.start + 7 * DAY);
  return {
    name: p.name, year: p.year, generated: now, since: p.createdAt,
    level: last ? { label: yearLabel(last.theta), detail: BAND_TEXT[last.readiness]?.label ?? "", at: last.at, checkups: p.baselines.length } : null,
    period: { custom, from, to, sessions: recent.length, minutes: Math.round(recent.reduce((s, x) => s + x.minutes, 0)), answered, correct, accuracy: pct(correct, answered), activeDays: new Set(recent.map((s) => dayKey(s.at))).size },
    allTime: { sessions: p.sessions.length, minutes: Math.round(p.sessions.reduce((s, x) => s + x.minutes, 0)), answered: allAnswered, accuracy: pct(allCorrect, allAnswered) },
    secure: { done: skills.filter((s) => s.status === "secure" && s.strand !== "STEM").length, total: skills.filter((s) => s.strand !== "STEM").length },
    unit, weeks, strands,
    practised: Object.entries(inPeriod).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, n]) => ({ skill: name(id), sessions: n })),
    checkups: p.baselines.filter((b) => !custom || (b.at >= from && b.at <= to)).map((b) => ({ at: b.at, level: yearLabel(b.theta), questions: b.questions, correct: b.correct, minutes: b.minutes })).reverse(),
    gaps: (last?.gaps ?? []).map(name), strengths: (last?.strengths ?? []).map(name),
    papers: (p.mocks ?? []).filter((m) => !custom || (m.at >= from && m.at <= to)).map(mock).reverse(),
    skills: touched.sort((a, b) => ORDER.indexOf(a.strand) - ORDER.indexOf(b.strand) || a.year - b.year || a.name.localeCompare(b.name)),
    attention,
    mistakes: Object.values(p.mistakes).sort((a, b) => b.count - a.count).slice(0, 5).map((m) => ({ skill: name(m.skill), count: m.count, message: m.message })),
    focus: p.focus.map(name),
    plan: p.plan ? { target: p.plan.target === "11plus" ? "11+ preparation" : "General", sessionsPerWeek: p.plan.sessionsPerWeek, examDate: p.goal?.examDate ?? p.plan.examDate ?? null, weekNumber: week?.n ?? null, weekSkills: (week?.skills ?? []).map(name) } : null,
    tutorOn: !!p.tutor?.enabled,
    tables: p.tables && Object.keys(p.tables.facts).length > 0 ? summariseTables(p) : null,
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
  const head = ["Skill", "Strand", "School year", "Status", "Right", "Wrong", "Accuracy %", "Last practised", "Next review", "Sessions in chosen period"];
  const rows = r.skills.map((s) => [s.name, s.strand, s.year, STATUS_WORDS[s.status], s.right, s.wrong, s.accuracy, date(s.last), date(s.due), s.inPeriod]);
  return [head, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const reportFileName = (r: ProgressReportData, ext: string) => `quarter-progress-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner"}-${date(r.generated)}.${ext}`;
