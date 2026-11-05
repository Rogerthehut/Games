import { useMemo } from "preact/hooks";
import { DAY, buildSession, practiceDaysThisWeek, skillName, statusOf, type Reason } from "../engine/progress";
import { mulberry32 } from "../engine/rng";
import { currentWeek, planFocus } from "../engine/plan";
import { TEST_LENGTH, yearLabel } from "../engine/diagnostic";
import { SKILLS } from "../curriculum";
import { useApp } from "./context";
import { Pip } from "./pip";

const REASON: Record<Reason, string> = { review: "Keep it fresh", focus: "Grown-up's pick", continue: "Keep going", next: "New" };
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function Home() {
  const { profile, go } = useApp();
  const now = Date.now();
  // The grown-up's focus topics and this week's plan topics both steer today's session.
  const steer = useMemo(() => ({ ...profile, focus: [...new Set([...profile.focus, ...planFocus(profile, now)])] }), [profile]);
  const plan = useMemo(() => buildSession(steer, now, mulberry32(Math.floor(now / DAY))), [steer]);
  const last = profile.baselines[profile.baselines.length - 1];
  const week = profile.plan ? currentWeek(profile.plan, now) : undefined;
  const midTest = profile.diag?.responses.length ?? 0;
  const shown = [...new Map(plan.map((p) => [p.skillId, p])).values()];
  const days = practiceDaysThisWeek(profile, now);
  const todayIdx = (new Date(now).getDay() + 6) % 7;
  const secure = SKILLS.filter((s) => statusOf(profile.skills[s.id]) === "secure").length;
  const started = profile.sessions.length > 0;

  return (
    <div class="home">
      <div class="greet-row"><h1 class="greet">{greeting()}, {profile.name}</h1><Pip pose="wave" size={84} /></div>
      {!last && (
        <section class="card checkup-card" aria-labelledby="cu">
          <h2 id="cu">{midTest ? "Finish your check-up" : "Start with a check-up"}</h2>
          <p>{midTest ? `You're ${midTest} of ${TEST_LENGTH} questions in.` : `About ${TEST_LENGTH} questions, around 20 minutes. It finds your real starting point and any gaps, so practice and the plan fit you.`}</p>
          <button class="btn primary" onClick={() => go({ name: "checkup" })}>{midTest ? "Continue" : "Start the check-up"}</button>
        </section>
      )}
      {last && !profile.plan && (
        <section class="card checkup-card" aria-labelledby="cp">
          <h2 id="cp">Your check-up is done</h2>
          <p>Working at {yearLabel(last.theta)}. Build a weekly plan from the gaps it found.</p>
          <div class="actions"><button class="btn primary" onClick={() => go({ name: "plan" })}>Build our plan</button><button class="btn" onClick={() => go({ name: "report" })}>See the report</button></div>
        </section>
      )}
      {week && (
        <section class="card checkup-card" aria-labelledby="wf">
          <h2 id="wf">{week.kind === "learn" ? `This week: ${week.note}` : week.kind === "review" ? "This week: revision" : "This week: mock paper"}</h2>
          <p class="muted small">Week {week.n} of {profile.plan!.weeks.length} · {profile.plan!.sessionsPerWeek} sessions of about 10 minutes</p>
          {week.kind !== "learn" && <p>{week.note}.</p>}
          <div class="actions">
            {week.kind === "mock" && <button class="btn primary" onClick={() => go({ name: "mock" })}>Start a practice paper</button>}
            <button class="btn" onClick={() => go({ name: "plan" })}>See the plan</button>
          </div>
        </section>
      )}
      <section class="card today" aria-labelledby="today-h">
        <h2 id="today-h">{started ? "Today's practice" : "Let's get started"}</h2>
        <p class="muted">{plan.length} questions · about 10 minutes · no timer</p>
        <ul class="plan">
          {shown.map((p) => (
            <li key={p.skillId}>
              <span class="plan-name">{skillName(p.skillId)}</span>
              <span class={`chip ${p.reason}`}>{REASON[p.reason]}</span>
            </li>
          ))}
        </ul>
        <button class="btn primary big" onClick={() => go({ name: "practice", plan })}>{started ? "Continue" : "Start"}</button>
      </section>
      <section class="card week" aria-labelledby="week-h">
        <h2 id="week-h">Your week</h2>
        <ol class="dots" aria-label="Days practised this week">
          {days.map((on, i) => (
            <li key={i} class={`${on ? "on" : ""} ${i === todayIdx ? "today" : ""}`}>
              <span class="dot" aria-hidden="true">{on ? "✓" : ""}</span>
              <span class="dow">{DAYS[i]}</span>
              <span class="sr">{on ? "practised" : "not yet"}</span>
            </li>
          ))}
        </ol>
        <dl class="stats">
          <div><dt>Effort points</dt><dd>{profile.points}</dd></div>
          <div><dt>Skills secure</dt><dd>{secure} of {SKILLS.length}</dd></div>
        </dl>
        <p class="muted small">Points are for trying, not for speed. A missed day costs nothing.</p>
      </section>
    </div>
  );
}
