import { useState } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import { buildPlan, currentWeek, planProgress, type PlanTarget } from "../engine/plan";
import type { Goal } from "../engine/progress";
import { DAY } from "../engine/progress";
import { useApp } from "./context";
import { Icon } from "./icons";

const EXAMS: { id: Goal["exam"]; label: string; note: string }[] = [
  { id: "gl", label: "GL Assessment style", note: "Used in many grammar-school areas." },
  { id: "cem", label: "CEM style", note: "Mixed, quick-fire papers. CEM-style practice isn't built yet, so the plan covers the maths both tests share." },
  { id: "unsure", label: "Not sure yet", note: "We'll plan around general 11+ maths. You can change this any time." },
  { id: "none", label: "No 11+, just getting stronger", note: "A general plan to close gaps and move up." },
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
      <div class="empty">
        <h1>Your plan</h1>
        <p class="lede">Do the check-up first. It shows what to work on, and the plan is built from that.</p>
        <button class="btn primary" onClick={() => go({ name: "checkup" })}>Start the check-up</button>
      </div>
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
  const left = prog.total - prog.done;
  const examInfo = EXAMS.find((x) => x.id === (profile.goal?.exam ?? exam));
  const weeksToExam = plan?.examDate ? Math.floor((plan.examDate - now) / (7 * DAY)) : undefined;
  const visible = plan ? (showAll ? plan.weeks : plan.weeks.filter((w, i) => i < 5 || w.kind === "mock" || w.n === cw?.n)) : [];

  return (
    <div class="plan-page">
      <h1>Your plan</h1>

      {plan && !editing && (
        <>
          <section class="summary-card" aria-labelledby="ps">
            <p class="eyebrow" id="ps">Still to go</p>
            <p class="big-number">{left}<small> topic{left === 1 ? "" : "s"}</small></p>
            <p class="level-sentence">About {plan.weeks.filter((w) => w.kind === "learn").length} weeks at {plan.sessionsPerWeek} sessions a week{weeksToExam !== undefined && weeksToExam >= 0 ? `. The exam is in about ${weeksToExam} weeks` : ""}.</p>
            <div class="progress on-card" role="progressbar" aria-valuenow={prog.done} aria-valuemin={0} aria-valuemax={prog.total} aria-label="Plan progress"><i style={{ width: `${prog.total ? (100 * prog.done) / prog.total : 0}%` }} /></div>
            <p class="small on-card-note">{prog.done} of {prog.total} done</p>
          </section>

          {plan.deferred.length > 0 && (
            <div class="fb bad" role="status"><p><strong>Not everything fits before the exam at this pace.</strong> Left out for now: {plan.deferred.map((id) => SKILL_BY_ID[id].name).join(", ")}. More sessions a week would bring them back.</p></div>
          )}
          {profile.goal?.exam === "cem" && examInfo && <div class="fb hint"><span class="fb-icon"><Icon name="bulb" size={20} /></span><p>{examInfo.note}</p></div>}

          <section class="block" aria-labelledby="wk">
            <h2 id="wk">Week by week</h2>
            <ol class="weeks">
              {visible.map((w) => (
                <li key={w.n} class={`week ${cw?.n === w.n ? "now" : ""} ${w.kind}`}>
                  <span class="week-n">{w.n}</span>
                  <div>
                    <p class="week-title">{w.kind === "mock" ? "Practice paper" : w.kind === "review" ? "Revision" : w.note}</p>
                    {w.kind !== "learn" && <p class="small muted">{w.note}</p>}
                  </div>
                  {cw?.n === w.n && <span class="chip next">This week</span>}
                </li>
              ))}
            </ol>
            {plan.weeks.length > 5 && <button class="linkish" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer" : `Show all ${plan.weeks.length} weeks`}</button>}
          </section>

          <ul class="rows">
            {profile.goal?.exam !== "none" && (
              <li><button class="row" onClick={() => go({ name: "mock" })} data-testid="take-mock"><Icon name="target" /><span>Take a practice paper<small>{profile.mocks?.length ? `Last time: ${profile.mocks[profile.mocks.length - 1].score} out of ${profile.mocks[profile.mocks.length - 1].total}` : "20 questions · 25 minutes"}</small></span><Icon name="chevron" size={18} /></button></li>
            )}
            <li><button class="row" onClick={() => setEditing(true)} data-testid="edit-plan"><Icon name="sliders" /><span>Change the plan<small>{examInfo?.label}{plan.examDate ? ` · ${new Date(plan.examDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}{profile.goal?.area ? ` · ${profile.goal.area}` : ""}</small></span><Icon name="chevron" size={18} /></button></li>
            <li><button class="row" onClick={() => go({ name: "report" })}><Icon name="book" /><span>Read the check-up report</span><Icon name="chevron" size={18} /></button></li>
          </ul>
        </>
      )}

      {editing && (
        <form class="form plan-form" onSubmit={save}>
          <fieldset class="options">
            <legend class="field-label">What are you aiming for?</legend>
            {EXAMS.map((x) => (
              <label key={x.id} class={`option ${exam === x.id ? "on" : ""}`}>
                <input type="radio" name="exam" checked={exam === x.id} onChange={() => setExam(x.id)} />
                <span><strong>{x.label}</strong><br /><span class="small muted">{x.note}</span></span>
              </label>
            ))}
          </fieldset>

          <label>
            <span class="field-label">Exam date (optional)</span>
            <input id="exam-date" type="date" value={date} onInput={(e) => setDate((e.target as HTMLInputElement).value)} />
          </label>

          <div>
            <span class="field-label" id="spw-l">Sessions a week</span>
            <div class="seg" role="radiogroup" aria-labelledby="spw-l">
              {[2, 3, 4, 5, 6].map((n) => <button type="button" key={n} role="radio" aria-checked={spw === n} class={spw === n ? "on" : ""} onClick={() => setSpw(n)}>{n}</button>)}
            </div>
            <p class="small muted">About 10 minutes each. 4 works well for most people.</p>
          </div>

          <details class="more" open={!!(area || schools)}>
            <summary>Add your area and schools (optional)</summary>
            <label>
              <span class="field-label">Town or postcode area</span>
              <input id="area" value={area} maxLength={12} onInput={(e) => setArea((e.target as HTMLInputElement).value)} placeholder="e.g. SW11" />
            </label>
            <label>
              <span class="field-label">Schools you like, one per line</span>
              <textarea id="schools" rows={3} value={schools} onInput={(e) => setSchools((e.target as HTMLTextAreaElement).value)} />
            </label>
            <p class="small muted">Kept on this device, and only used to tailor advice. Not sure which test your schools use? Their admissions pages say, and it changes between years.</p>
          </details>

          <div class="actions">
            <button class="btn primary" type="submit" data-testid="build-plan-go">Build my plan</button>
            {plan && <button class="btn ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </form>
      )}
    </div>
  );
}
