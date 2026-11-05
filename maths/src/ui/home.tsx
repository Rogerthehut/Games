import { useMemo } from "preact/hooks";
import { DAY, buildSession, practiceDaysThisWeek, skillName, statusOf, type Reason } from "../engine/progress";
import { mulberry32 } from "../engine/rng";
import { SKILLS } from "../curriculum";
import { useApp } from "./context";

const REASON: Record<Reason, string> = { review: "Keep it fresh", focus: "Grown-up's pick", continue: "Keep going", next: "New" };
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function Home() {
  const { profile, go } = useApp();
  const now = Date.now();
  const plan = useMemo(() => buildSession(profile, now, mulberry32(Math.floor(now / DAY))), [profile]);
  const shown = [...new Map(plan.map((p) => [p.skillId, p])).values()];
  const days = practiceDaysThisWeek(profile, now);
  const todayIdx = (new Date(now).getDay() + 6) % 7;
  const secure = SKILLS.filter((s) => statusOf(profile.skills[s.id]) === "secure").length;
  const started = profile.sessions.length > 0;

  return (
    <div class="home">
      <h1 class="greet">{greeting()}, {profile.name}</h1>
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
        <h2 id="week-h">This week</h2>
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
