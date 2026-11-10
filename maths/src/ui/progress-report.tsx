import { useMemo } from "preact/hooks";
import { buildProgressReport, reportCsv, reportFileName, STATUS_ORDER, STATUS_WORDS, type ProgressReportData } from "../engine/progress-report";
import type { Profile } from "../engine/progress";
import { useApp } from "./context";
import { Icon } from "./icons";
import { Maths } from "./maths";
import { CubeMark, Wordmark } from "./wordmark";

const fmt = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const short = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const pctText = (n: number | null) => (n === null ? "–" : `${n}%`);

export function downloadProgressCsv(profile: Profile) {
  const r = buildProgressReport(profile);
  const url = URL.createObjectURL(new Blob(["﻿", reportCsv(r)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = reportFileName(r, "csv"); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the print dialog with a sensible file name, so "Save as PDF" gives quarter-progress-name-date.pdf. */
function printReport(r: ProgressReportData) {
  const before = document.title;
  document.title = reportFileName(r, "pdf").replace(/\.pdf$/, "");
  const restore = () => { document.title = before; removeEventListener("afterprint", restore); };
  addEventListener("afterprint", restore);
  print();
}

function Weeks({ weeks }: { weeks: ProgressReportData["weeks"] }) {
  const max = Math.max(10, ...weeks.map((w) => w.minutes));
  return (
    <svg class="pr-weeks" viewBox="0 0 320 130" role="img" aria-label={`Minutes practised each week for the last eight weeks: ${weeks.map((w) => w.minutes).join(", ")}`}>
      <line x1="0" y1="100" x2="320" y2="100" stroke="currentColor" stroke-opacity=".25" />
      {weeks.map((w, i) => {
        const h = Math.round((w.minutes / max) * 78);
        return (
          <g key={i}>
            <rect x={i * 40 + 8} y={100 - h} width="24" height={Math.max(h, w.minutes ? 2 : 0)} rx="4" fill="var(--pr-mint)" stroke="currentColor" stroke-opacity=".5" />
            <text x={i * 40 + 20} y={94 - h} text-anchor="middle" font-size="10" fill="currentColor">{w.minutes || ""}</text>
            <text x={i * 40 + 20} y="116" text-anchor="middle" font-size="9" fill="currentColor" opacity=".7">{short(w.start - 7 * 86_400_000 + 1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ProgressReport() {
  const { profile, go } = useApp();
  const r = useMemo(() => buildProgressReport(profile), [profile]);
  const lvl = r.level;

  return (
    <main class="pr-page">
      <div class="pr-toolbar">
        <button type="button" class="btn" onClick={() => go({ name: "parent" })}><Icon name="back" size={18} /> Back</button>
        <div class="pr-toolbar-actions">
          <button type="button" class="btn" onClick={() => downloadProgressCsv(profile)} data-testid="report-csv">Spreadsheet (CSV)</button>
          <button type="button" class="btn primary" onClick={() => printReport(r)} data-testid="report-print">Save as PDF or print</button>
        </div>
      </div>
      <p class="pr-hint">To save a PDF, choose “Save as PDF” as the printer in the print window.</p>

      <article class="pr-doc" data-testid="progress-report">
        <header class="pr-head">
          <div class="pr-brand"><CubeMark /><Wordmark /></div>
          <div class="pr-title">
            <p class="pr-kicker">Progress report</p>
            <h1>{r.name}</h1>
            <p class="pr-sub">Year {r.year} · Prepared {fmt(r.generated)} · Practising since {fmt(r.since)}</p>
          </div>
        </header>

        <section class="pr-tiles" aria-label="At a glance">
          <div class="pr-tile pr-t1"><span>Working level</span><strong>{lvl ? lvl.label : "No check-up yet"}</strong><small>{lvl ? `${lvl.detail}. Check-up on ${fmt(lvl.at)}.` : "A check-up finds the starting point."}</small></div>
          <div class="pr-tile pr-t2"><span>Last 4 weeks</span><strong>{r.last28.sessions} session{r.last28.sessions === 1 ? "" : "s"} · {r.last28.minutes} min</strong><small>{r.last28.answered} questions, {pctText(r.last28.accuracy)} right, on {r.last28.activeDays} different day{r.last28.activeDays === 1 ? "" : "s"}</small></div>
          <div class="pr-tile pr-t3"><span>Topics secure</span><strong>{r.secure.done} of {r.secure.total}</strong><small>Right without help across several days</small></div>
          <div class="pr-tile pr-t4"><span>All time</span><strong>{r.allTime.sessions} sessions · {r.allTime.minutes} min</strong><small>{r.allTime.answered} questions, {pctText(r.allTime.accuracy)} right</small></div>
        </section>

        <section class="pr-sec">
          <h2>Practice each week</h2>
          <Weeks weeks={r.weeks} />
          <p class="pr-cap">Minutes practised in each of the last eight weeks, ending {short(r.generated)}.</p>
        </section>

        <section class="pr-sec">
          <h2>Where they are, by topic area</h2>
          <ul class="pr-strands">
            {r.strands.map((s) => (
              <li key={s.strand}>
                <span class="pr-strand-name">{s.strand === "Ratio" ? "Ratio and proportion" : s.strand === "Reasoning" ? "Reasoning (11+)" : s.strand}</span>
                <span class="pr-bar" role="img" aria-label={STATUS_ORDER.map((k) => `${s.counts[k]} ${STATUS_WORDS[k].toLowerCase()}`).join(", ")}>
                  {STATUS_ORDER.map((k) => s.counts[k] > 0 && <i key={k} class={`pr-seg st-${k}`} style={{ width: `${(100 * s.counts[k]) / s.total}%` }} />)}
                </span>
                <span class="pr-strand-n">{s.counts.secure} / {s.total} secure</span>
              </li>
            ))}
          </ul>
          <p class="pr-key">{STATUS_ORDER.map((k) => <span key={k}><i class={`pr-seg st-${k}`} />{STATUS_WORDS[k]}</span>)}</p>
        </section>

        {(r.attention.length > 0 || r.mistakes.length > 0 || r.focus.length > 0) && (
          <section class="pr-sec pr-keep">
            <h2>Worth a conversation</h2>
            {r.attention.map((a) => (
              <div key={a.id} class="pr-attn">
                <h3>{a.name} <span class="pr-pill">{a.right} right, {a.wrong} wrong</span></h3>
                {a.explain && <p><strong>How to explain it.</strong> <Maths text={a.explain} /></p>}
                {a.ask && <p><strong>Ask them.</strong> {a.ask}</p>}
              </div>
            ))}
            {r.mistakes.length > 0 && (<>
              <h3>Mistakes that keep coming up</h3>
              <ul class="pr-list">{r.mistakes.map((m, i) => <li key={i}><strong>{m.skill}</strong> ({m.count}×): <Maths text={m.message} /></li>)}</ul>
            </>)}
            {r.focus.length > 0 && <p><strong>Topics a grown-up has asked them to focus on:</strong> {r.focus.join(", ")}.</p>}
          </section>
        )}

        {lvl && (r.gaps.length > 0 || r.strengths.length > 0) && (
          <section class="pr-sec pr-keep">
            <h2>From the latest check-up</h2>
            <div class="pr-two">
              <div><h3>Strengths</h3>{r.strengths.length ? <ul class="pr-list">{r.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p class="pr-none">None flagged.</p>}</div>
              <div><h3>Gaps to close</h3>{r.gaps.length ? <ul class="pr-list">{r.gaps.map((s) => <li key={s}>{s}</li>)}</ul> : <p class="pr-none">None flagged.</p>}</div>
            </div>
          </section>
        )}

        {r.checkups.length > 0 && (
          <section class="pr-sec pr-keep">
            <h2>Check-ups</h2>
            <table class="pr-table"><thead><tr><th>Date</th><th>Working level</th><th>Questions</th><th>Right</th><th>Minutes</th></tr></thead>
              <tbody>{r.checkups.map((c) => <tr key={c.at}><td>{fmt(c.at)}</td><td>{c.level}</td><td>{c.questions}</td><td>{c.correct}</td><td>{c.minutes}</td></tr>)}</tbody></table>
          </section>
        )}

        {r.papers.length > 0 && (
          <section class="pr-sec pr-keep">
            <h2>Practice papers</h2>
            <table class="pr-table"><thead><tr><th>Date</th><th>Paper</th><th>Score</th><th>Time</th><th>By part</th></tr></thead>
              <tbody>{r.papers.map((m) => <tr key={m.at}><td>{fmt(m.at)}</td><td>{m.paper}</td><td>{m.score} / {m.total} ({Math.round((100 * m.score) / Math.max(1, m.total))}%)</td><td>{m.minutes} min</td><td>{m.bySection || "–"}</td></tr>)}</tbody></table>
          </section>
        )}

        {r.plan && (
          <section class="pr-sec pr-keep">
            <h2>Plan</h2>
            <p>{r.plan.target}, {r.plan.sessionsPerWeek} sessions a week{r.plan.examDate ? `, aiming for ${fmt(r.plan.examDate)}` : ""}.{r.plan.weekNumber ? ` This is week ${r.plan.weekNumber}${r.plan.weekSkills.length ? `: ${r.plan.weekSkills.join(", ")}` : ""}.` : ""}</p>
          </section>
        )}

        <section class="pr-sec">
          <h2>Topic by topic</h2>
          {r.skills.length === 0 ? <p class="pr-none">No topics practised yet.</p> : (
            <table class="pr-table pr-skills"><thead><tr><th>Topic</th><th>Yr</th><th>Status</th><th>Right</th><th>Wrong</th><th>Acc.</th><th>Last</th><th>Review</th></tr></thead>
              <tbody>{r.skills.map((s) => (
                <tr key={s.id}><td><strong>{s.name}</strong><small>{s.strand === "Ratio" ? "Ratio and proportion" : s.strand}</small></td><td>{s.year}</td>
                  <td><span class={`pr-status st-${s.status}`}>{STATUS_WORDS[s.status]}</span></td><td>{s.right}</td><td>{s.wrong}</td><td>{pctText(s.accuracy)}</td>
                  <td>{s.last ? short(s.last) : "–"}</td><td>{s.due ? short(s.due) : "–"}</td></tr>
              ))}</tbody></table>
          )}
        </section>

        <footer class="pr-foot">
          <p><strong>How to read this.</strong> “Secure” means answered right without help across several days. “Getting there” and “Learning” are topics still being built. “Assumed known” topics come from earlier years and have not been checked yet. “Review” is when the topic is next due for a recap.</p>
          <p>The working level comes from a short adaptive check-up and is an estimate. It has not been tested on large numbers of children, so treat it as a conversation starter, not a grade.{r.tutorOn ? " An AI tutor was available in practice; its conversations are kept on the family’s device and are not part of this report." : ""}</p>
          <p class="pr-credit">Prepared by quarter, a trading name of Wristed Ltd · yourquarter.co.uk · from practice done in the app. Contains a first name or nickname and maths progress only.</p>
        </footer>
      </article>
    </main>
  );
}
