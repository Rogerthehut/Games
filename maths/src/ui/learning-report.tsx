import { useEffect, useMemo, useState } from "preact/hooks";
import { buildLearningReport, lastDays, PERIODS, type Example, type Period, type TopicFinding } from "../engine/learning-report";
import { STAGE_LABEL } from "../curriculum";
import { SKILL_BY_ID } from "../curriculum";
import { useApp } from "./context";
import { FigureView } from "./figure";
import { Icon } from "./icons";
import { Maths } from "./maths";
import { TOOL_NAMES, suggestedTool } from "./working-out";

const DAY = 86_400_000;
const dateText = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const toInput = (ms: number) => new Date(ms - new Date(ms).getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

/** A short summary for the Parents' area: how many questions were wrong this week, and the topics to start with. */
export function LearningSummaryCard() {
  const { profile, go } = useApp();
  const report = useMemo(() => buildLearningReport(profile, lastDays(7)), [profile.wrongLog]);
  return (
    <section class="card" aria-labelledby="lr-card" data-testid="learning-card">
      <h2 id="lr-card">Where {profile.name} is struggling</h2>
      {report.totals.questions === 0
        ? <p class="muted">No wrong answers in the last 7 days. As {profile.name} practises, the questions they find tricky will appear here, with why and how to help.</p>
        : <>
            <p><strong>{plural(report.totals.questions, "question")}</strong> needed another go in the last 7 days, across {plural(report.totals.topics, "topic")}. Start with: {report.topics.slice(0, 3).map((t) => t.name).join(", ")}.</p>
          </>}
      <div class="actions"><button class="btn primary" onClick={() => go({ name: "learning-report" })} data-testid="open-learning-report">Open the learning report</button></div>
    </section>
  );
}

/** Exactly which questions were wrong in a period, why that may be happening, and how to help. */
export function LearningReport() {
  const { profile, go, leave } = useApp();
  const [days, setDays] = useState<number | "custom">(14);
  const [from, setFrom] = useState(toInput(Date.now() - 14 * DAY)), [to, setTo] = useState(toInput(Date.now()));
  const [printing, setPrinting] = useState(false);
  const period: Period = useMemo(() => days === "custom"
    ? { from: new Date(`${from}T00:00:00`).getTime(), to: new Date(`${to}T23:59:59`).getTime(), label: `${dateText(new Date(`${from}T00:00:00`).getTime())} to ${dateText(new Date(`${to}T00:00:00`).getTime())}` }
    : lastDays(days), [days, from, to]);
  const report = useMemo(() => buildLearningReport(profile, period), [profile.wrongLog, profile.skills, period.from, period.to]);

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add("printing-report");
    const done = () => { document.body.classList.remove("printing-report"); setPrinting(false); };
    addEventListener("afterprint", done, { once: true });
    const t = setTimeout(() => window.print(), 80);
    return () => { clearTimeout(t); removeEventListener("afterprint", done); document.body.classList.remove("printing-report"); };
  }, [printing]);

  return (
    <div class="parent learning-report" data-testid="learning-report">
      <header class="parent-head">
        <button class="icon-btn" onClick={() => leave({ name: "parent" })} aria-label="Back to the Parents' area"><Icon name="back" size={22} /></button>
        <div><h1>Learning report</h1><p class="muted">{profile.name} · Year {profile.year}</p></div>
        <button class="btn small lr-print" onClick={() => setPrinting(true)} data-testid="lr-print"><Icon name="book" size={16} /> Print</button>
      </header>

      <div class="tt-chips lr-periods" role="group" aria-label="Period">
        {PERIODS.map((p) => <button key={p.id} type="button" class={`chip-btn${days === p.days ? " on" : ""}`} aria-pressed={days === p.days} onClick={() => setDays(p.days)} data-testid={`period-${p.id}`}>{p.label}</button>)}
        <button type="button" class={`chip-btn${days === "custom" ? " on" : ""}`} aria-pressed={days === "custom"} onClick={() => setDays("custom")} data-testid="period-custom">Choose dates</button>
      </div>
      {days === "custom" && (
        <div class="lr-dates">
          <label>From <input type="date" value={from} max={to} onInput={(e) => setFrom(e.currentTarget.value)} /></label>
          <label>To <input type="date" value={to} min={from} onInput={(e) => setTo(e.currentTarget.value)} /></label>
        </div>
      )}

      <section class="card lr-summary" aria-labelledby="lr-sum">
        <h2 id="lr-sum">In {period.label}</h2>
        {report.totals.questions === 0 ? (
          <p>No wrong answers in this period. {profile.wrongLog?.length ? "Try a longer period to see earlier ones." : `Questions ${profile.name} gets wrong from now on will appear here.`}</p>
        ) : (
          <>
            <dl class="stats wide">
              <div><dt>Questions to revisit</dt><dd data-testid="lr-total">{report.totals.questions}</dd></div>
              <div><dt>Not got</dt><dd>{report.totals.missed}</dd></div>
              <div><dt>Right on a second go</dt><dd>{report.totals.helped}</dd></div>
              <div><dt>Topics</dt><dd>{report.totals.topics}</dd></div>
            </dl>
            <p class="small muted">Topics are listed with the most to work on first. The reasons come from the answers {profile.name} gave, so they are likely explanations, not a diagnosis. You know your child best.</p>
          </>
        )}
      </section>

      {report.topics.map((t, i) => <TopicBlock key={t.skillId} topic={t} open={printing || i === 0} go={go} />)}
    </div>
  );
}

function TopicBlock({ topic: t, open, go }: { topic: TopicFinding; open: boolean; go: ReturnType<typeof useApp>["go"] }) {
  const { profile } = useApp();
  const back = { name: "learning-report" as const };
  const tool = t.family.tool ?? suggestedTool(t.skillId, t.strand, profile.year);
  const practise = () => go({ name: "practice", plan: Array.from({ length: 6 }, () => ({ skillId: t.skillId, reason: "focus" as const })) }, back);
  return (
    <details class="card lr-topic" open={open} data-testid={`topic-${t.skillId}`}>
      <summary>
        <span class="lr-topic-name"><strong>{t.name}</strong><small class="muted">{STAGE_LABEL[SKILL_BY_ID[t.skillId].stage]} · Year {t.year}</small></span>
        <span class="lr-counts">
          {t.missed > 0 && <span class="lr-badge bad">{t.missed} not got</span>}
          {t.helped > 0 && <span class="lr-badge ok">{t.helped} on 2nd go</span>}
          {t.gaveUp > 0 && <span class="lr-badge skip">{t.gaveUp} skipped</span>}
        </span>
      </summary>

      <h3>The questions</h3>
      <ol class="lr-examples">{t.examples.map((x) => <ExampleView key={x.entry.at} example={x} />)}</ol>

      <h3>Why {profile.name} may be struggling</h3>
      <ul class="lr-reasons">
        {t.reasons.map((r, i) => <li key={i}><span class={`lr-source ${r.kind}`}>{r.kind === "pattern" ? "From their answers" : `Common with ${t.family.name}`}</span> {r.text}</li>)}
      </ul>

      <h3>How to help</h3>
      {t.family.methods.map((m) => (
        <div class="lr-method" key={m.title}>
          <strong>{m.title}</strong>
          <ol>{m.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      ))}
      <p><strong>Things to ask:</strong></p>
      <ul>{t.family.ask.map((a) => <li key={a}>“{a}”</li>)}</ul>
      <p class="small">In practice, open <strong>Working-out tools</strong> and use <strong>{TOOL_NAMES[tool]}</strong>.{SKILL_BY_ID[t.skillId].parentNote ? ` ${SKILL_BY_ID[t.skillId].parentNote}` : ""}</p>

      <h3>Study together</h3>
      <div class="actions lr-actions">
        <button class="btn primary" onClick={practise} data-testid={`practise-${t.skillId}`}>Practise this topic</button>
        {t.hasLesson && <button class="btn" onClick={() => go({ name: "lesson", skill: t.skillId }, back)}>Learn this (lesson)</button>}
        {t.studyGuides.map((g) => <button class="btn" key={g.id} onClick={() => go({ name: "concept", id: g.id }, back)}>Study guide: {g.title}</button>)}
      </div>
      {t.shaky.length > 0 && (
        <p class="small">Worth strengthening first: {t.shaky.map((s, i) => <span key={s.id}>{i ? ", " : ""}<button class="linkish" onClick={() => go({ name: "practice", plan: Array.from({ length: 6 }, () => ({ skillId: s.id, reason: "focus" as const })) }, back)}>{s.name}</button></span>)}.</p>
      )}
    </details>
  );
}

function ExampleView({ example: { entry, question } }: { example: Example }) {
  const [steps, setSteps] = useState(false);
  const outcomeText = entry.outcome === "missed" ? "Didn't get it" : entry.outcome === "helped" ? "Got it on the second go" : "Skipped to the steps";
  return (
    <li class="lr-example">
      <p class="lr-when small muted">{dateText(entry.at)} · {outcomeText}{entry.source === "lesson" ? " · in a lesson" : ""}</p>
      <p class="lr-q"><Maths text={question?.prompt ?? entry.prompt} /></p>
      {question?.figure && <FigureView fig={question.figure} locked />}
      <p class="lr-answers">
        {entry.tried.length > 0 && <span>They answered: <strong>{entry.tried.filter(Boolean).join(", ") || "nothing"}</strong>. </span>}
        <span>Right answer: <strong><Maths text={question?.shown ?? entry.shown} /></strong></span>
      </p>
      {entry.notes.length > 0 && <p class="small lr-note"><Maths text={entry.notes[0]} /></p>}
      {question && question.solution.length > 0 && (
        <div>
          <button class="btn small ghost" onClick={() => setSteps(!steps)} aria-expanded={steps}>{steps ? "Hide the steps" : "Show the steps to work through together"}</button>
          {(steps) && <ol class="steps lr-steps">{question.solution.map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>}
          {steps && question.hint && <p class="small muted">Hint to give first: <Maths text={question.hint} /></p>}
        </div>
      )}
    </li>
  );
}
