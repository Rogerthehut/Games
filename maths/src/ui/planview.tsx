import { useState } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import { buildPlan, currentWeek, planProgress, type PlanTarget } from "../engine/plan";
import type { Goal } from "../engine/progress";
import { DAY } from "../engine/progress";
import { useApp } from "./context";

const EXAMS: { id: Goal["exam"]; label: string; note: string }[] = [
  { id: "gl", label: "GL Assessment style", note: "Used in many grammar-school areas. Practice is built around this format." },
  { id: "cem", label: "CEM style", note: "Mixed, speed-focused papers. CEM-style practice isn't built yet, so the plan covers the maths content both tests share." },
  { id: "unsure", label: "Not sure yet", note: "We'll plan around general 11+ maths. You can change this when you know." },
  { id: "none", label: "Not preparing for the 11+", note: "A general plan to close gaps and move up." },
];

const dateInput = (t?: number) => (t ? new Date(t).toISOString().slice(0, 10) : "");

export function PlanView() {
  const { profile, update, go } = useApp();
  const last = profile.baselines[profile.baselines.length - 1];
  const goal: Goal = profile.goal ?? { exam: profile.year <= 6 ? "gl" : "none", area: "", schools: [], sessionsPerWeek: 4 };
  const [exam, setExam] = useState<Goal["exam"]>(goal.exam);
  const [area, setArea] = useState(goal.area);
  const [schools, setSchools] = useState(goal.schools.join("\n"));
  const [date, setDate] = useState(dateInput(goal.examDate));
  const [spw, setSpw] = useState(goal.sessionsPerWeek);
  const [editing, setEditing] = useState(!profile.plan);
  const [showAll, setShowAll] = useState(false);

  if (!last) {
    return (
      <div class="card"><h1>Plan</h1><p class="lede">The plan is built from the check-up, so we know where to start and what to fix first.</p>
        <button class="btn primary" onClick={() => go({ name: "checkup" })}>Start the check-up</button></div>
    );
  }

  const save = (e: Event) => {
    e.preventDefault();
    const examDate = date ? new Date(date + "T09:00:00").getTime() : undefined;
    const g: Goal = { exam, area: area.trim().slice(0, 12), schools: schools.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8), examDate, sessionsPerWeek: spw };
    const target: PlanTarget = exam === "none" ? "general" : "11plus";
    update((p) => ({ ...p, goal: g, plan: buildPlan(p, Date.now(), { sessionsPerWeek: spw, target, examDate }) }));
    setEditing(false);
  };

  const plan = profile.plan;
  const now = Date.now();
  const cw = plan ? currentWeek(plan, now) : undefined;
  const prog = planProgress(profile);
  const examInfo = EXAMS.find((x) => x.id === (profile.goal?.exam ?? exam));
  const weeksToExam = plan?.examDate ? Math.floor((plan.examDate - now) / (7 * DAY)) : undefined;

  return (
    <div class="plan-page">
      <h1>Action plan</h1>
      {plan && !editing && (
        <>
          <section class="card" aria-labelledby="ps">
            <h2 id="ps">Where this is heading</h2>
            <p>{prog.total - prog.done} topic{prog.total - prog.done === 1 ? "" : "s"} left to secure, at {plan.sessionsPerWeek} sessions a week of about 10 minutes.
              {weeksToExam !== undefined && weeksToExam >= 0 && <> The exam is in about {weeksToExam} weeks.</>}</p>
            <div class="progress" role="progressbar" aria-valuenow={prog.done} aria-valuemin={0} aria-valuemax={prog.total} aria-label="Plan progress"><i style={{ width: `${prog.total ? (100 * prog.done) / prog.total : 0}%` }} /></div>
            <p class="small muted">{prog.done} of {prog.total} planned topics secure.</p>
            {plan.deferred.length > 0 && (
              <div class="banner wrong" role="status">
                <strong>Not everything fits before the exam at this pace.</strong> Left out for now: {plan.deferred.map((id) => SKILL_BY_ID[id].name).join(", ")}. More sessions each week would bring them back in.
              </div>
            )}
            {examInfo && profile.goal?.exam === "cem" && <p class="banner hint">{examInfo.note}</p>}
          </section>

          <section class="card" aria-labelledby="wk">
            <h2 id="wk">Week by week</h2>
            <ol class="weeks">
              {(showAll ? plan.weeks : plan.weeks.filter((w) => w.n <= 8 || w.kind === "mock" || w.n === cw?.n)).map((w) => (
                <li key={w.n} class={`week ${cw?.n === w.n ? "now" : ""} ${w.kind}`}>
                  <div class="week-head"><strong>Week {w.n}</strong>{cw?.n === w.n && <span class="chip next">This week</span>}{w.kind === "mock" && <span class="chip focus">Mock paper</span>}{w.kind === "review" && <span class="chip review">Revision</span>}</div>
                  <p>{w.note}</p>
                </li>
              ))}
            </ol>
            {plan.weeks.length > 8 && <button class="linkish" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer weeks" : `Show all ${plan.weeks.length} weeks`}</button>}
          </section>

          {profile.goal?.exam !== "none" && (
            <section class="card">
              <h2>Practice paper</h2>
              <p>{profile.mocks?.length ? `Last paper: ${profile.mocks[profile.mocks.length - 1].score} out of ${profile.mocks[profile.mocks.length - 1].total}.` : "20 questions in the style of 11+ maths, with a guide time of 25 minutes. Best attempted once or twice before the exam, after the main topics are secure."}</p>
              <button class="btn" onClick={() => go({ name: "mock" })}>Take a practice paper</button>
            </section>
          )}

          <section class="card">
            <h2>Your 11+ details</h2>
            <dl class="facts">
              <div><dt>Exam</dt><dd>{examInfo?.label}</dd></div>
              {profile.goal?.area && <div><dt>Area</dt><dd>{profile.goal.area}</dd></div>}
              {profile.goal?.schools.length ? <div><dt>Schools</dt><dd>{profile.goal.schools.join(", ")}</dd></div> : null}
              {plan.examDate && <div><dt>Exam date</dt><dd>{new Date(plan.examDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd></div>}
            </dl>
            <div class="actions">
              <button class="btn" onClick={() => setEditing(true)}>Change details and rebuild</button>
              <button class="btn primary" onClick={() => go({ name: "home" })}>Practise this week's topics</button>
            </div>
          </section>
        </>
      )}

      {editing && (
        <form class="card form" onSubmit={save}>
          <h2>Tell us what you're working towards</h2>
          <fieldset class="options">
            <legend class="field-label">Which test?</legend>
            {EXAMS.map((x) => (
              <label key={x.id} class={`option ${exam === x.id ? "on" : ""}`}>
                <input type="radio" name="exam" checked={exam === x.id} onChange={() => setExam(x.id)} />
                <span><strong>{x.label}</strong><br /><span class="small muted">{x.note}</span></span>
              </label>
            ))}
          </fieldset>
          <label>
            <span class="field-label">Area (optional)</span>
            <input id="area" value={area} maxLength={12} onInput={(e) => setArea((e.target as HTMLInputElement).value)} placeholder="Town or first half of postcode, e.g. SW11" />
          </label>
          <label>
            <span class="field-label">Schools you're considering (optional, one per line)</span>
            <textarea id="schools" rows={3} value={schools} onInput={(e) => setSchools((e.target as HTMLTextAreaElement).value)} />
          </label>
          <p class="note">Area and school names stay on this device. They help us tailor advice, and we ask for as little location as possible. Not sure which test your schools use? Check their admissions pages or your local authority, because it changes between years.</p>
          <label>
            <span class="field-label">Exam date (optional)</span>
            <input id="exam-date" type="date" value={date} onInput={(e) => setDate((e.target as HTMLInputElement).value)} />
          </label>
          <label>
            <span class="field-label">Sessions per week</span>
            <select id="spw" value={spw} onChange={(e) => setSpw(+(e.target as HTMLSelectElement).value)}>
              {[2, 3, 4, 5, 6].map((n) => <option value={n}>{n} sessions{n === 4 ? " (recommended)" : ""}</option>)}
            </select>
          </label>
          <div class="actions">
            <button class="btn primary" type="submit">Build the plan</button>
            {plan && <button class="btn" type="button" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </form>
      )}
    </div>
  );
}
