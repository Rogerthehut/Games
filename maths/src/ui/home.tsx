import { useMemo } from "preact/hooks";
import { DAY, buildSession, currentStreak, practiceDaysThisWeek, skillName } from "../engine/progress";
import { mulberry32 } from "../engine/rng";
import { currentWeek, planFocus } from "../engine/plan";
import { TEST_LENGTH, yearLabel } from "../engine/diagnostic";
import { useApp } from "./context";
import { Icon } from "./icons";
import { Pip } from "./pip";
import { resolveSkin } from "./skin";
import { voice } from "./voice";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Lead with one concrete topic, and mention the rest underneath. */
const topicTitle = (names: string[]) => names[0] ?? "Practice";
const topicRest = (names: string[]) => (names.length > 1 ? `plus ${names.slice(1).join(" and ")}` : "");

export function Home() {
  const { profile, go } = useApp();
  const skin = resolveSkin(profile);
  const now = Date.now();
  // The grown-up's focus topics and this week's plan topics both steer today's session.
  const steer = useMemo(() => ({ ...profile, focus: [...new Set([...profile.focus, ...planFocus(profile, now)])] }), [profile]);
  const plan = useMemo(() => buildSession(steer, now, mulberry32(Math.floor(now / DAY))), [steer]);
  const last = profile.baselines[profile.baselines.length - 1];
  const week = profile.plan ? currentWeek(profile.plan, now) : undefined;
  const midTest = profile.diag?.responses.length ?? 0;
  const names = [...new Set(plan.map((p) => skillName(p.skillId)))];
  const hasReview = plan.some((p) => p.reason === "review");
  const days = practiceDaysThisWeek(profile, now);
  const todayIdx = (new Date(now).getDay() + 6) % 7;
  const streak = currentStreak(profile, now);
  const doneToday = days[todayIdx];

  return (
    <div class="today">
      <header class="today-head">
        <h1>{voice.greeting(profile.name, skin)}</h1>
        {streak > 0 && <span class="streak" title={`${streak} days in a row`}><Icon name="flame" size={18} />{streak}<span class="sr"> day streak</span></span>}
      </header>

      {!last ? (
        <section class="focus-card" aria-labelledby="hero-h">
          <p class="eyebrow">{midTest ? "Check-up" : "First things first"}</p>
          <h2 id="hero-h">{midTest ? "Finish your check-up" : "Let's find your starting point"}</h2>
          <p class="focus-meta">{midTest ? `${midTest} of ${TEST_LENGTH} done` : `${TEST_LENGTH} questions · about 20 minutes`}</p>
          <button class="btn on-focus big" onClick={() => go({ name: "checkup" })} data-testid="start-checkup">{midTest ? "Keep going" : "Start"}<Icon name="arrow" size={20} /></button>
          <span class="focus-pip"><Pip pose="wave" size={110} /></span>
        </section>
      ) : (
        <section class="focus-card" aria-labelledby="hero-h">
          <p class="eyebrow">{doneToday ? "Nice work today" : "Today"}</p>
          <h2 id="hero-h">{topicTitle(names)}</h2>
          <p class="focus-meta">{topicRest(names) ? `${topicRest(names)}. ` : ""}{plan.length} questions, about 10 min{hasReview ? ", with a quick review" : ""}.</p>
          <button class="btn on-focus big" onClick={() => go({ name: "practice", plan })} data-testid="start-practice">{doneToday ? "Do some more" : "Start"}<Icon name="arrow" size={20} /></button>
          <span class="focus-pip"><Pip pose="wave" size={110} /></span>
        </section>
      )}

      <section class="strip" aria-label="This week">
        <ol class="dots">
          {days.map((on, i) => (
            <li key={i} class={`${on ? "on" : ""} ${i === todayIdx ? "now" : ""}`}>
              <span class="dot" aria-hidden="true">{on ? <Icon name="check" size={14} /> : null}</span>
              <span class="dow" aria-hidden="true">{DAYS[i]}</span>
              <span class="sr">{on ? "practised" : "not yet"}</span>
            </li>
          ))}
        </ol>
        <p class="strip-note">{days.filter(Boolean).length === 0 ? "Nothing yet this week" : `${days.filter(Boolean).length} ${days.filter(Boolean).length === 1 ? "day" : "days"} this week`}</p>
      </section>

      <ul class="rows">
        {!last && <li><button class="row" onClick={() => go({ name: "practice", plan })}><Icon name="book" /><span>Skip the check-up and practise</span><Icon name="chevron" size={18} /></button></li>}
        {last && !profile.plan && <li><button class="row" onClick={() => go({ name: "plan" })} data-testid="build-plan"><Icon name="flag" /><span>Build your plan<small>You're working at {yearLabel(last.theta)}</small></span><Icon name="chevron" size={18} /></button></li>}
        {week && week.kind === "learn" && <li><button class="row" onClick={() => go({ name: "plan" })}><Icon name="flag" /><span>This week: {week.note}<small>Week {week.n} of {profile.plan!.weeks.length}</small></span><Icon name="chevron" size={18} /></button></li>}
        {week && week.kind === "review" && <li><button class="row" onClick={() => go({ name: "plan" })}><Icon name="flag" /><span>This week is revision<small>Week {week.n} of {profile.plan!.weeks.length}</small></span><Icon name="chevron" size={18} /></button></li>}
        {week && week.kind === "mock" && <li><button class="row" onClick={() => go({ name: "mock" })} data-testid="start-mock"><Icon name="target" /><span>Take a practice paper<small>20 questions · 25 minutes</small></span><Icon name="chevron" size={18} /></button></li>}
      </ul>
    </div>
  );
}
