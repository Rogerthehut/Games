import { Solution } from "./solution";
import { printPage } from "../native/bridge";
import { useEffect, useMemo, useState } from "preact/hooks";
import { useRemembered } from "./memory";
import { buildLearningReport, diagnoseAttempt, lastDays, PERIODS, type Example, type Period, type TopicFinding } from "../engine/learning-report";
import { fixPlan, wrongLogOf } from "../engine/wrong-log";
import { STATUS_LABEL_PARENT, schoolLabel } from "./labels";
import { STAGE_LABEL } from "../curriculum";
import { SKILL_BY_ID } from "../curriculum";
import { familyFor } from "../engine/help-methods";
import { useAccount } from "./account-context";
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
  const account = useAccount();
  return (
    <section class="card" aria-labelledby="lr-card" data-testid="learning-card">
      <h2 id="lr-card">Where {profile.name} is struggling</h2>
      {report.totals.questions === 0
        ? <p class="muted">No wrong answers in the last 7 days. As {profile.name} practises, the questions they find tricky will appear here, with why and how to help.</p>
        : <>
            <p><strong>{plural(report.totals.questions, "question")}</strong> needed another go in the last 7 days, across {plural(report.totals.topics, "topic")}. Start with: {report.topics.slice(0, 3).map((t) => t.name).join(", ")}.</p>
          </>}
      <div class="actions"><button class="btn primary" onClick={() => go({ name: "learning-report" })} data-testid="open-learning-report">Open the learning report</button></div>
      {account && <p class="small muted">Want this in your inbox each week? Turn on the weekly email in Settings.</p>}
    </section>
  );
}

/** Exactly which questions were wrong in a period, why that may be happening, and how to help. */
export function LearningReport() {
  const { profile, go, leave } = useApp();
  const [days, setDays] = useRemembered<number | "custom">(`${profile.id}:report.days`, 14);
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
    const t = setTimeout(() => printPage(), 80);
    return () => { clearTimeout(t); removeEventListener("afterprint", done); document.body.classList.remove("printing-report"); };
  }, [printing]);

  return (
    <div class="parent learning-report" data-testid="learning-report">
      <header class="parent-head">
        <button class="icon-btn" onClick={() => leave({ name: "parent" })} aria-label="Back to the Parents' area"><Icon name="back" size={22} /></button>
        <div><h1>Learning report</h1><p class="muted">{profile.name} · {schoolLabel(profile)}</p></div>
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

      {report.improving.length > 0 && (
        <section class="card lr-improving" aria-labelledby="lr-better" data-testid="lr-improving">
          <h2 id="lr-better">Looking better</h2>
          <p class="small muted">These had wrong answers before, and none in {period.label}, while {profile.name} kept practising them.</p>
          <ul>{report.improving.map((i) => <li key={i.skillId}><strong>{i.name}</strong>: {i.before === 1 ? "1 wrong answer" : `${i.before} wrong answers`} before, none now. {STATUS_LABEL_PARENT[i.status]}.</li>)}</ul>
        </section>
      )}

      {report.topics.map((t, i) => <TopicBlock key={t.skillId} topic={t} open={printing || i === 0} go={go} />)}
    </div>
  );
}

function TopicBlock({ topic: t, open, go }: { topic: TopicFinding; open: boolean; go: ReturnType<typeof useApp>["go"] }) {
  const { profile } = useApp();
  const back = { name: "learning-report" as const };
  const tool = t.family.tool ?? suggestedTool(t.skillId, t.strand, profile.year);
  const practise = () => go({ name: "practice", plan: Array.from({ length: 6 }, () => ({ skillId: t.skillId, reason: "focus" as const })) }, back);
  const fix = () => go({ name: "practice", plan: fixPlan(wrongLogOf(profile), t.skillId) }, back);
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

      <div class="lr-trend" data-testid={`trend-${t.skillId}`}>
        <span><b>{t.total}</b> wrong {t.total === 1 ? "answer" : "answers"} now{t.previous > 0 || t.total > 0 ? <>, <b>{t.previous}</b> in the same time before{t.previous > t.total ? " (getting better)" : t.previous < t.total ? " (more this time)" : ""}</> : null}</span>
        <span>Now: <b>{STATUS_LABEL_PARENT[t.status]}</b></span>
        {t.fix && <span>Fix practice: <b>{t.fix.sets} {t.fix.sets === 1 ? "set" : "sets"}</b>, latest {t.fix.last.right} of {t.fix.last.total} right</span>}
      </div>

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
        <button class="btn primary" onClick={fix} data-testid={`fix-${t.skillId}`}>Fix this: practise these questions again</button>
        <button class="btn" onClick={practise} data-testid={`practise-${t.skillId}`}>Practise this topic</button>
        {t.hasLesson && <button class="btn" onClick={() => go({ name: "lesson", skill: t.skillId }, back)}>Learn this (lesson)</button>}
        {t.studyGuides.map((g) => <button class="btn" key={g.id} onClick={() => go({ name: "concept", id: g.id }, back)}>Study guide: {g.title}</button>)}
      </div>
      {t.shaky.length > 0 && (
        <p class="small">Worth strengthening first: {t.shaky.map((s, i) => <span key={s.id}>{i ? ", " : ""}<button class="linkish" onClick={() => go({ name: "practice", plan: Array.from({ length: 6 }, () => ({ skillId: s.id, reason: "focus" as const })) }, back)}>{s.name}</button></span>)}.</p>
      )}
    </details>
  );
}

const SOURCE_TEXT: Record<string, string> = { lesson: " · in a lesson", paper: " · in a practice paper or test", "check-up": " · in the check-up" };

/** A parent's script for working through one question with their child, a step at a time. */
function WalkThrough({ example: { entry, question } }: { example: Example & { question: NonNullable<Example["question"]> } }) {
  const { profile, go } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  const family = familyFor(entry.skill);
  const found = entry.tried.map((t) => diagnoseAttempt(entry, t)).find(Boolean);
  const similar = () => go({ name: "practice", plan: [{ skillId: entry.skill, reason: "fix" as const, level: entry.level }, { skillId: entry.skill, reason: "fix" as const, level: entry.level }] }, { name: "learning-report" });
  if (!open) return <button class="btn small" onClick={() => { setOpen(true); setStep(0); setShown(0); }} data-testid="walk-start">Work through this together</button>;
  const steps: { title: string; body: preact.ComponentChildren }[] = [
    { title: "1. Read it together", body: <p>Read the question aloud. Ask {profile.name} to say what it's asking in their own words. Don't help yet.</p> },
    { title: "2. Let them try again", body: <><p>Ask: “{family.ask[0]}” Let them have another go, with a working-out tool if they want one.</p>{question.hint && <p class="small muted">If they're stuck, a hint: <Maths text={question.hint} /></p>}</> },
    { title: "3. Find where it slipped", body: <><p>{profile.name} answered <strong>{entry.tried.filter(Boolean).join(", ") || "nothing"}</strong>. The right answer is <strong><Maths text={question.shown} /></strong>.</p><p>{found ? <>It looks like they {found.reason}. Ask: “How did you get that?”</> : <>Ask: “Talk me through what you did first.” The first step they got wrong is the one to work on.</>}</p></> },
    { title: "4. Work it through, a step at a time", body: <><Solution q={question} count={shown + 1} />{shown + 1 < question.solution.length && <button class="btn small ghost" onClick={() => setShown(shown + 1)}>Show the next step</button>}</> },
    { title: "5. Now they teach you", body: <><p>Ask {profile.name} to explain it back to you, step by step, as if you're the one who's stuck. Then try one like it.</p><button class="btn small primary" onClick={similar} data-testid="walk-similar">Try two like this</button></> },
  ];
  const s = steps[step];
  return (
    <div class="lr-walk" role="region" aria-label="Work through this together" data-testid="walk">
      <p class="lr-walk-title"><strong>{s.title}</strong> <span class="small muted">({step + 1} of {steps.length})</span></p>
      {s.body}
      <div class="actions">
        <button class="btn small ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
        {step < steps.length - 1 ? <button class="btn small primary" onClick={() => setStep(step + 1)} data-testid="walk-next">Next</button> : <button class="btn small" onClick={() => setOpen(false)}>Done</button>}
      </div>
    </div>
  );
}

function ExampleView({ example: { entry, question } }: { example: Example }) {
  const [steps, setSteps] = useState(false);
  const outcomeText = entry.outcome === "missed" ? "Didn't get it" : entry.outcome === "helped" ? "Got it on the second go" : "Skipped to the steps";
  return (
    <li class="lr-example">
      <p class="lr-when small muted">{dateText(entry.at)} · {outcomeText}{SOURCE_TEXT[entry.source] ?? ""}</p>
      <p class="lr-q"><Maths text={question?.prompt ?? entry.prompt} /></p>
      {question?.figure && <FigureView fig={question.figure} locked />}
      <p class="lr-answers">
        {entry.tried.length > 0 && <span>They answered: <strong>{entry.tried.filter(Boolean).join(", ") || "nothing"}</strong>. </span>}
        <span>Right answer: <strong><Maths text={question?.shown ?? entry.shown} /></strong></span>
      </p>
      {entry.notes.length > 0 && <p class="small lr-note"><Maths text={entry.notes[0]} /></p>}
      {question && <WalkThrough example={{ entry, question }} />}
      {question && question.solution.length > 0 && (
        <div>
          <button class="btn small ghost" onClick={() => setSteps(!steps)} aria-expanded={steps}>{steps ? "Hide the steps" : "Show the steps to work through together"}</button>
          {(steps) && <Solution q={question} class="steps lr-steps" />}
          {steps && question.hint && <p class="small muted">Hint to give first: <Maths text={question.hint} /></p>}
        </div>
      )}
    </li>
  );
}
