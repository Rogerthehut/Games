import { printPage, saveFile } from "../native/bridge";
import { useMemo, useState } from "preact/hooks";
import { buildProgressReport, type Range, reportCsv, reportFileName, STATUS_ORDER, STATUS_WORDS, type ProgressReportData } from "../engine/progress-report";
import type { Profile } from "../engine/progress";
import { useApp } from "./context";
import { Icon } from "./icons";
import { MoreBelow } from "./qshell";
import { Maths } from "./maths";
import { CubeMark, Wordmark } from "./wordmark";

const fmt = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const short = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const pctText = (n: number | null) => (n === null ? "–" : `${n}%`);

export function downloadProgressCsv(profile: Profile, range?: Range | null) {
  const r = buildProgressReport(profile, Date.now(), range);
  void saveFile(reportFileName(r, "csv"), "﻿" + reportCsv(r), "text/csv;charset=utf-8");
}

/** Opens the print dialog with a sensible file name, so "Save as PDF" gives quarter-progress-name-date.pdf. */
function printReport(r: ProgressReportData) {
  const before = document.title;
  document.title = reportFileName(r, "pdf").replace(/\.pdf$/, "");
  const restore = () => { document.title = before; removeEventListener("afterprint", restore); };
  addEventListener("afterprint", restore);
  printPage();
}

function Weeks({ weeks, unit }: { weeks: ProgressReportData["weeks"]; unit: "day" | "week" }) {
  const max = Math.max(10, ...weeks.map((w) => w.minutes));
  const n = weeks.length, step = 320 / n, w = Math.min(24, step * 0.6);
  const every = Math.ceil(n / 9); // label about nine bars at most, so the dates never crowd
  const label = (b: ProgressReportData["weeks"][number]) => short(b.start);
  return (
    <svg class="pr-weeks" viewBox="0 0 320 130" role="img" aria-label={`Minutes practised each ${unit}: ${weeks.map((b) => `${label(b)} ${b.minutes}`).join(", ")}`}>
      <line x1="0" y1="100" x2="320" y2="100" stroke="currentColor" stroke-opacity=".25" />
      {weeks.map((b, i) => {
        const h = Math.round((b.minutes / max) * 78), cx = i * step + step / 2;
        return (
          <g key={i}>
            <rect x={cx - w / 2} y={100 - h} width={w} height={Math.max(h, b.minutes ? 2 : 0)} rx="4" fill="var(--pr-mint)" stroke="currentColor" stroke-opacity=".5" />
            {n <= 16 && <text x={cx} y={94 - h} text-anchor="middle" font-size="10" fill="currentColor">{b.minutes || ""}</text>}
            {i % every === 0 && <text x={cx} y="116" text-anchor="middle" font-size="9" fill="currentColor" opacity=".7">{label(b)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

const DAY_MS = 86_400_000;
const iso = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const startOfDay = (isoDay: string) => { const [y, m, d] = isoDay.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
const endOfDay = (isoDay: string) => { const [y, m, d] = isoDay.split("-").map(Number); return new Date(y, m - 1, d, 23, 59, 59, 999).getTime(); };
const mondayOf = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const addDays = (t: number, n: number) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };

/** Choose which dates the report covers. Quick choices for the usual ones, and a calendar for anything else. */
function PeriodPicker({ value, onChange, since }: { value: { from: string; to: string } | null; onChange: (v: { from: string; to: string } | null) => void; since: number }) {
  const today = iso(Date.now());
  const min = iso(since);
  const preset = (from: number, to: number) => onChange({ from: iso(from), to: iso(to) });
  const thisMon = mondayOf(Date.now());
  const shift = (dir: -1 | 1) => {
    if (!value) return;
    const f = startOfDay(value.from), t = startOfDay(value.to), span = Math.round((t - f) / DAY_MS) + 1;
    onChange({ from: iso(addDays(f, dir * span)), to: iso(addDays(t, dir * span)) });
  };
  const bad = value && value.from > value.to;
  return (
    <section class="pr-period" aria-label="Choose the dates for this report" data-testid="period-picker">
      <div class="pr-period-quick" role="group" aria-label="Quick choices">
        <button type="button" class={`chip-btn${!value ? " on" : ""}`} aria-pressed={!value} onClick={() => onChange(null)}>Last 4 weeks</button>
        <button type="button" class="chip-btn" onClick={() => preset(thisMon, Date.now())}>This week</button>
        <button type="button" class="chip-btn" onClick={() => preset(addDays(thisMon, -7), addDays(thisMon, -1))}>Last week</button>
        <button type="button" class="chip-btn" onClick={() => { const d = new Date(); preset(new Date(d.getFullYear(), d.getMonth(), 1).getTime(), Date.now()); }}>This month</button>
        <button type="button" class="chip-btn" onClick={() => onChange({ from: min, to: today })}>Since they started</button>
      </div>
      <div class="pr-period-dates">
        <label>From <input type="date" value={value?.from ?? iso(Date.now() - 28 * DAY_MS)} min={min} max={today} data-testid="period-from"
          onChange={(e) => { const v = (e.target as HTMLInputElement).value; if (v) onChange({ from: v, to: value?.to ?? today }); }} /></label>
        <label>To <input type="date" value={value?.to ?? today} min={min} max={today} data-testid="period-to"
          onChange={(e) => { const v = (e.target as HTMLInputElement).value; if (v) onChange({ from: value?.from ?? iso(Date.now() - 28 * DAY_MS), to: v }); }} /></label>
        {value && !bad && (
          <span class="pr-period-step">
            <button type="button" class="btn" onClick={() => shift(-1)} aria-label="The same length of time, earlier" data-testid="period-earlier">‹ Earlier</button>
            <button type="button" class="btn" onClick={() => shift(1)} disabled={value.to >= today} aria-label="The same length of time, later" data-testid="period-later">Later ›</button>
          </span>
        )}
      </div>
      {bad && <p class="pr-period-bad" role="alert">The “From” date needs to be on or before the “To” date.</p>}
    </section>
  );
}

export function ProgressReport() {
  const { profile, go } = useApp();
  const [chosen, setChosen] = useState<{ from: string; to: string } | null>(null);
  const range = useMemo<Range | null>(() => (chosen && chosen.from <= chosen.to ? { from: startOfDay(chosen.from), to: endOfDay(chosen.to) } : null), [chosen]);
  const r = useMemo(() => buildProgressReport(profile, Date.now(), range), [profile, range]);
  const span = r.period.custom ? `${fmt(r.period.from)} to ${fmt(r.period.to)}` : "the last 4 weeks";
  const lvl = r.level;

  return (
    <main class="pr-page">
      <div class="pr-toolbar">
        <button type="button" class="btn" onClick={() => go({ name: "parent" })}><Icon name="back" size={18} /> Back</button>
        <div class="pr-toolbar-actions">
          <button type="button" class="btn" onClick={() => downloadProgressCsv(profile, range)} data-testid="report-csv">Spreadsheet (CSV)</button>
          <button type="button" class="btn primary" onClick={() => printReport(r)} data-testid="report-print">Save as PDF or print</button>
        </div>
      </div>
      <p class="pr-hint">To save a PDF, choose “Save as PDF” as the printer in the print window.</p>
      <PeriodPicker value={chosen} onChange={setChosen} since={profile.createdAt} />

      <article class="pr-doc" data-testid="progress-report">
        <header class="pr-head">
          <div class="pr-brand"><CubeMark /><Wordmark /></div>
          <div class="pr-title">
            <p class="pr-kicker">Progress report</p>
            <h1>{r.name}</h1>
            <p class="pr-sub">{r.yearLabel} · Prepared {fmt(r.generated)} · Practising since {fmt(r.since)}{r.period.custom ? ` · Showing ${span}` : ""}</p>
          </div>
        </header>

        <section class="pr-tiles" aria-label="At a glance">
          <div class="pr-tile pr-t1"><span>Working level</span><strong>{lvl ? lvl.label : "No check-up yet"}</strong><small>{lvl ? `${lvl.detail}. Check-up on ${fmt(lvl.at)}.` : "A check-up finds the starting point."}</small></div>
          <div class="pr-tile pr-t2"><span>{r.period.custom ? "In this period" : "Last 4 weeks"}</span><strong>{r.period.sessions} session{r.period.sessions === 1 ? "" : "s"} · {r.period.minutes} min</strong><small>{r.period.answered} questions, {pctText(r.period.accuracy)} right, on {r.period.activeDays} different day{r.period.activeDays === 1 ? "" : "s"}</small></div>
          <div class="pr-tile pr-t3"><span>Topics secure</span><strong>{r.secure.done} of {r.secure.total}</strong><small>Right without help across several days</small></div>
          <div class="pr-tile pr-t4"><span>All time</span><strong>{r.allTime.sessions} sessions · {r.allTime.minutes} min</strong><small>{r.allTime.answered} questions, {pctText(r.allTime.accuracy)} right</small></div>
        </section>

        <section class="pr-sec">
          <h2>{r.unit === "day" ? "Practice each day" : "Practice each week"}</h2>
          <Weeks weeks={r.weeks} unit={r.unit} />
          <p class="pr-cap">{r.period.custom ? `Minutes practised in each ${r.unit}, ${span}.` : `Minutes practised in each of the last eight weeks, ending ${short(r.generated)}.`}</p>
          {r.practised.length > 0 && (<>
            <h3>Topics practised {r.period.custom ? "in this period" : "in the last 4 weeks"}</h3>
            <ul class="pr-list pr-practised">{r.practised.map((t) => <li key={t.skill}><strong>{t.skill}</strong> <span class="small muted">{t.sessions} session{t.sessions === 1 ? "" : "s"}</span></li>)}</ul>
          </>)}
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

        {r.little.length > 0 && (
          <section class="pr-sec pr-keep" data-testid="report-little">
            <h2>Little ones</h2>
            <p>Touch-and-play activities for early years. There are no scores: the count shows how often each activity was finished, which is a good sign of interest and practice.</p>
            <ul class="pr-strands">
              {r.little.map((a) => (
                <li key={a.id}><span class="pr-strand-name">{a.title}</span>
                  <span class="pr-strand-n">{a.plays === 0 ? "not tried yet" : `finished ${a.plays} ${a.plays === 1 ? "time" : "times"}`}</span>
                  <small class="muted">Builds: {a.builds}</small></li>
              ))}
            </ul>
          </section>
        )}

        {r.tables && (
          <section class="pr-sec pr-keep" data-testid="report-tables">
            <h2>Times tables</h2>
            <p>{r.tables.counts.quick} of {r.tables.total} facts are quick and secure (answered right in about three seconds or less). {r.tables.counts.slow} are right but still slow, and {r.tables.counts.learning} are still being learned.</p>
            <ul class="pr-strands">
              {r.tables.byTable.map((t) => (
                <li key={t.table}><span class="pr-strand-name">{t.table} times table</span>
                  <span class="pr-bar" role="img" aria-label={`${t.quick} of ${t.of} quick`}><i class="pr-seg st-secure" style={{ width: `${(100 * t.quick) / t.of}%` }} /></span>
                  <span class="pr-strand-n">{t.quick} / {t.of} quick</span></li>
              ))}
            </ul>
            {r.tables.workOn.length > 0 && <p><strong>Worth practising:</strong> {r.tables.workOn.map((w) => `${w.text}${w.ms ? ` (about ${Math.round(w.ms / 100) / 10}s)` : ""}`).join(", ")}.</p>}
            {r.tables.checks.length > 0 && <p><strong>Timed check practice:</strong> {r.tables.checks.slice(-3).map((c) => `${c.score}/${c.total} on ${fmt(c.at)}`).join(", ")}.</p>}
          </section>
        )}

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
      <MoreBelow />
    </main>
  );
}
