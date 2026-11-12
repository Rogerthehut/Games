import { companyLine, contactEmail } from "../src/legal/content";
import { buildLearningReport, lastDays } from "../src/engine/learning-report";
import { statusOf, weekStats, type Profile } from "../src/engine/progress";

/**
 * The weekly email for a parent: for each learner who practised, how the week went, which topics were tricky and why, and one small
 * thing to do about it. Plain and short. Built from the learner's stored progress, so nothing extra is collected for it.
 */
const DAY = 86_400_000;

export interface LearnerWeek {
  name: string;
  days: number;
  minutes: number;
  answered: number;
  accuracy: number | null;
  secureTopics: number;
  tricky: { name: string; wrong: number; reason: string | null }[];
}
export interface DigestInput { learners: Profile[]; appUrl: string; unsubscribeUrl: string; now: number }
export interface Digest { subject: string; text: string; html: string; learners: LearnerWeek[] }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

/** Strips the maths markers the app uses in its notes, so an email shows plain words. */
const plain = (s: string) => s.replace(/\$+/g, "").replace(/\\[a-z]+/g, "").replace(/\s+/g, " ").trim();

export function weekOf(p: Profile, now: number): LearnerWeek | null {
  const stats = weekStats(p, now);
  if (stats.sessions === 0) return null;
  const since = now - 7 * DAY;
  const days = new Set(p.sessions.filter((s) => s.at >= since).map((s) => new Date(s.at).toDateString())).size;
  const report = buildLearningReport(p, lastDays(7, now));
  return {
    name: p.name, days, minutes: stats.minutes, answered: stats.answered, accuracy: stats.accuracy,
    secureTopics: Object.values(p.skills).filter((s) => statusOf(s) === "secure").length,
    tricky: report.topics.slice(0, 2).map((t) => ({ name: t.name, wrong: t.total, reason: plain(t.reasons.find((r) => r.kind === "pattern")?.text ?? "") || null })),
  };
}

/** Null when nobody practised this week: there is nothing to say, and an email that says so every week would be noise. */
export function buildDigest({ learners, appUrl, unsubscribeUrl, now }: DigestInput): Digest | null {
  const weeks = learners.map((p) => weekOf(p, now)).filter((w): w is LearnerWeek => !!w);
  if (!weeks.length) return null;
  const one = weeks.length === 1 ? weeks[0] : null;
  const subject = one
    ? `${one.name}'s week on quarter: ${plural(one.days, "day")}, ${plural(one.answered, "question")}`
    : `This week on quarter: ${list(weeks.map((w) => w.name))} practised`;

  const lines: string[] = ["Hello,", "", "Here's how the week went on quarter.", ""];
  for (const w of weeks) {
    lines.push(`${w.name}`, `  Practised on ${plural(w.days, "day")}, ${plural(w.minutes, "minute")} in all.`, `  ${plural(w.answered, "question")} answered${w.accuracy !== null ? `, ${w.accuracy}% right` : ""}.`);
    if (w.tricky.length) {
      lines.push("  Tricky this week:");
      for (const t of w.tricky) lines.push(`   - ${t.name} (${plural(t.wrong, "question")} to revisit)${t.reason ? `. ${t.reason}` : ""}`);
      lines.push(`  A good next step: ten minutes on ${w.tricky[0].name}, together.`);
    } else lines.push("  Nothing tricky showed up. Lovely.");
    lines.push("");
  }
  lines.push(`See the questions, why they may be hard and how to help: open the Parents' area at ${appUrl} and choose Progress, then the learning report.`, "", `You're getting this because you turned on the weekly email. Unsubscribe: ${unsubscribeUrl}`, companyLine);
  const text = lines.join("\n");

  const card = (w: LearnerWeek) => `<tr><td style="padding:14px 16px;background:#fffdf6;border:1px solid #e4d9bd;border-radius:12px">
<p style="margin:0 0 6px;font:700 17px/1.3 Georgia,serif;color:#1e2038">${esc(w.name)}</p>
<p style="margin:0 0 6px;font:15px/1.5 system-ui,sans-serif;color:#1e2038">Practised on <b>${plural(w.days, "day")}</b> (${plural(w.minutes, "minute")}). ${plural(w.answered, "question")} answered${w.accuracy !== null ? `, <b>${w.accuracy}%</b> right` : ""}.</p>
${w.tricky.length
    ? `<p style="margin:8px 0 4px;font:700 14px/1.4 system-ui,sans-serif;color:#1e2038">Tricky this week</p><ul style="margin:0 0 6px;padding-left:18px;font:14px/1.5 system-ui,sans-serif;color:#1e2038">${w.tricky.map((t) => `<li><b>${esc(t.name)}</b> (${plural(t.wrong, "question")} to revisit)${t.reason ? `. ${esc(t.reason)}` : ""}</li>`).join("")}</ul><p style="margin:0;font:14px/1.5 system-ui,sans-serif;color:#1e2038">A good next step: ten minutes on <b>${esc(w.tricky[0].name)}</b>, together.</p>`
    : `<p style="margin:6px 0 0;font:14px/1.5 system-ui,sans-serif;color:#1e2038">Nothing tricky showed up. Lovely.</p>`}
</td></tr>`;
  const html = `<!doctype html><html lang="en-GB"><body style="margin:0;background:#f8f4e8"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4e8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td style="padding:0 0 12px;font:800 22px Georgia,serif;color:#1e2038">quarter</td></tr>
<tr><td style="padding:0 0 14px;font:16px/1.5 system-ui,sans-serif;color:#1e2038">Here's how the week went.</td></tr>
${weeks.map((w) => `${card(w)}<tr><td style="height:12px"></td></tr>`).join("\n")}
<tr><td style="padding:6px 0 16px"><a href="${esc(appUrl)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#1e2038;color:#ffffff;text-decoration:none;font:700 15px system-ui,sans-serif">Open the learning report</a>
<p style="margin:8px 0 0;font:13px/1.5 system-ui,sans-serif;color:#5c5f78">In the Parents' area, choose Progress. You'll see the exact questions, why they may be hard, and how to help.</p></td></tr>
<tr><td style="padding:12px 0 0;border-top:1px solid #e4d9bd;font:12px/1.6 system-ui,sans-serif;color:#5c5f78">You're getting this because you turned on the weekly email. <a href="${esc(unsubscribeUrl)}" style="color:#5c5f78">Unsubscribe</a> any time, or reply to ask a question (${esc(contactEmail)}).<br>${esc(companyLine)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html, learners: weeks };
}
