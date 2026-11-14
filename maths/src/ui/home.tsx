import { useMemo } from "preact/hooks";
import { pausedLesson } from "../engine/lesson";
import { buildRefresher, canRefresh, refresherTopics } from "../engine/refresher";
import { DAY, buildSession, currentStreak, practiceDaysThisWeek, skillName } from "../engine/progress";
import { mulberry32 } from "../engine/rng";
import { currentWeek, planFocus } from "../engine/plan";
import { TEST_LENGTH } from "../engine/diagnostic";
import { STAGE_ORDER } from "../engine/activity";
import { pathwayTestName } from "../engine/pathway";
import { useApp } from "./context";
import { Icon } from "./icons";
import { StemNote, TablesNote, useWide } from "./tables-note";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Lead with one concrete topic, and mention the rest underneath. */
const topicTitle = (names: string[]) => names[0] ?? "Practice";
const topicRest = (names: string[]) => (names.length > 1 ? `plus ${names.slice(1).join(" and ")}` : "");

export function Home() {
  const { profile, go } = useApp();
  const wide = useWide();
  const startRefresher = () => go({ name: "practice", plan: buildRefresher(profile, Date.now(), mulberry32(Date.now())) });
  const refresherCount = canRefresh(profile) ? refresherTopics(profile).length : 0;
  const now = Date.now();
  // The grown-up's focus topics and this week's plan topics both steer today's session.
  const steer = useMemo(() => ({ ...profile, focus: [...new Set([...profile.focus, ...planFocus(profile, now)])] }), [profile]);
  const plan = useMemo(() => buildSession(steer, now, mulberry32(Math.floor(now / DAY))), [steer]);
  const last = profile.baselines[profile.baselines.length - 1];
  const week = profile.plan ? currentWeek(profile.plan, now) : undefined;
  const midTest = profile.diag?.responses.length ?? 0;
  const pausedCheckup = !!profile.diag?.draft || midTest > 0;
  const names = [...new Set(plan.map((p) => skillName(p.skillId)))];
  const hasReview = plan.some((p) => p.reason === "review");
  const days = practiceDaysThisWeek(profile, now);
  const todayIdx = (new Date(now).getDay() + 6) % 7;
  const streak = currentStreak(profile, now);

  const pausedLessonNow = pausedLesson(profile);
  const pausedAngles = !!profile.anglesLesson && profile.anglesLesson.step < 3;
  const hasSavedActivity = !!pausedLessonNow || pausedAngles || pausedCheckup || profile.practiceDraft || Object.keys(profile.pathwayDrafts ?? {}).length > 0
    || (profile.fractionsLesson && profile.fractionsLesson < 3) || (profile.groupsLesson && profile.groupsLesson.step < 3)
    || (profile.timeLesson && profile.timeLesson.step < 3);
  const firstPractice = !last && profile.sessions.length === 0;
  const practicePlan = firstPractice ? plan.slice(0, 3) : plan;

  const assessed = hasAssessments(profile);   // the check-up and plan are for Year 3 and up
  if (profile.early === "nursery") return <div class="today"><LittleCards /></div>;
  const showLittle = profile.early === "reception" || profile.year <= 2;
  return (
    <div class="today">
      {showLittle && (
        <button type="button" class="little-banner" onClick={() => go({ name: "little" })} data-testid="open-little">
          <span class="little-banner-art" aria-hidden="true">🎈</span><span><strong>Little ones</strong><small>Counting, tracing, shapes and colours to touch and play</small></span><Icon name="arrow" size={22} />
        </button>
      )}
      {!wide && <div class="today-notes"><TablesNote variant="inline" /><StemNote variant="inline" /></div>}
      <section class="activity-section" aria-labelledby="activity-title">
        <div class="activity-heading">
          <svg class="activity-trail" viewBox="0 0 260 96" fill="none" aria-hidden="true" focusable="false">
            <path d="M5 77c35-39 67 15 103-15 27-22 16-55 44-51 26 4-2 53 28 60 23 5 44-23 73-43" />
            <path class="trail-arrow" d="m233 30 21-3-7 20" />
          </svg>
          <h1 id="activity-title">What shall we <em class="workbook-underline">practise?</em></h1>
          <p>Choose an activity to get started.</p>
        </div>
        <div class="activity-grid">
          <ActivityCard kind="practice" label="01 / Practice" title={firstPractice ? "A little maths today." : topicTitle(names)}
            compactDetail={firstPractice ? "A quick warm-up." : `${plan.length} questions`}
            detail={firstPractice ? "A short warm-up to get started." : `${topicRest(names) ? topicRest(names) + ". " : ""}${plan.length} questions · about 10 min${hasReview ? " · includes review" : ""}`}
            action={firstPractice ? `Try ${practicePlan.length} questions` : "Start practice"} testId="start-practice"
            onClick={() => go({ name: "practice", plan: practicePlan })} />
          <ActivityCard kind="skills" label="02 / Skills" title="Pick a skill."
            detail="Explore topics and practise something you choose." action="Explore skills" onClick={() => go({ name: "map" })} />
          {assessed && <ActivityCard kind="checkup" label="03 / Check-up" title={pausedCheckup ? "Keep going." : "Find your level."}
            detail={pausedCheckup ? `${midTest} of ${TEST_LENGTH} questions done.` : `${TEST_LENGTH} questions · about 20 min`}
            action={pausedCheckup ? "Continue check-up" : last ? "Take another check-up" : "Start check-up"} testId="start-checkup"
            onClick={() => go({ name: "checkup" })} />}
          {assessed && <ActivityCard kind="plan" label="04 / Plan" title="See your next steps."
            detail={week ? `Week ${week.n} · ${week.kind === "learn" ? week.note : week.kind === "review" ? "Revision" : "Practice paper"}` : "See what to work on and make a plan."}
            action={last && !profile.plan ? "Build your plan" : "View plan"} testId="build-plan"
            onClick={() => go({ name: "plan" })} />}
        </div>
      </section>

      <section class="strip paper-edge" aria-label="This week">
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
        {streak > 0 && <span class="streak">
          <Icon name="book" size={18} />
          <span><span class="streak-label">Practice run</span><strong>{streak} {streak === 1 ? "day" : "days"} in a row</strong></span>
        </span>}
      </section>

      {hasSavedActivity ? (
        <section class="saved-activities" aria-labelledby="saved-heading">
          <h2 id="saved-heading">Pick up where you left off</h2>
          <div class="saved-actions">
            {pausedCheckup && <button class="btn primary" onClick={() => go({ name: "checkup" })}>Continue your check-up</button>}
            {profile.practiceDraft && <button class="btn" onClick={() => {
              const draft = profile.practiceDraft;
              if (draft) go({ name: "practice", plan: draft.plan, resume: true });
            }}>Continue practice · {skillName(profile.practiceDraft.q.skill)}</button>}
            {STAGE_ORDER.filter((stage) => profile.pathwayDrafts?.[stage]).map((stage) =>
              <button key={stage} class="btn" onClick={() => go({ name: "pathway-test", stage })}>Continue {pathwayTestName(stage)}</button>
            )}
            {profile.fractionsLesson && profile.fractionsLesson < 3 ? <button class="btn" onClick={() => go({ name: "fractions-lesson" })}>Continue equivalent fractions</button> : null}
            {profile.groupsLesson && profile.groupsLesson.step < 3 && <button class="btn" onClick={() => go({ name: "equal-groups" })}>Continue equal groups</button>}
            {profile.timeLesson && profile.timeLesson.step < 3 && <button class="btn" onClick={() => go({ name: "time-lesson" })}>Continue telling the time</button>}
            {pausedAngles && <button class="btn" onClick={() => go({ name: "angles-lesson" })}>Continue angles lesson</button>}
            {pausedLessonNow && <button class="btn" onClick={() => go({ name: "lesson", skill: pausedLessonNow.skillId })} data-testid="continue-lesson">Continue lesson · {skillName(pausedLessonNow.skillId)}</button>}
            {refresherCount > 0 && <button class="btn" onClick={startRefresher} data-testid="start-refresher" aria-label={`Quick-fire refresher: 10 questions from the ${refresherCount} topics you practised this week`} title={`10 questions from the ${refresherCount} topics you practised this week`}><Icon name="target" size={18} /> Quick-fire refresher</button>}
          </div>
        </section>
      ) : null}

      {refresherCount > 0 && !hasSavedActivity && (
        <ul class="rows refresher-row">
          <li><button class="row" onClick={startRefresher} data-testid="start-refresher"><Icon name="target" /><span>Quick-fire refresher<small>10 questions from the {refresherCount} topics you practised this week</small></span><Icon name="chevron" size={18} /></button></li>
        </ul>
      )}

      {week?.kind === "mock" && (
        <ul class="rows">
        <li><button class="row" onClick={() => go({ name: "mock" })} data-testid="start-mock"><Icon name="target" /><span>Take a practice paper<small>20 questions · 25 minutes</small></span><Icon name="chevron" size={18} /></button></li>
        </ul>
      )}
    </div>
  );
}


import { ActivityArt, type ActivityKind } from "./activity-art";
import { LittleCards } from "./little";
import { hasAssessments } from "../engine/age";

function ActivityCard({ kind, label, title, detail, compactDetail, action, testId, onClick }: {
  kind: ActivityKind; label: string; title: string; detail: string; compactDetail?: string; action: string; testId?: string; onClick: () => void;
}) {
  return (
    <button type="button" class={`activity-card activity-${kind}`} onClick={onClick} data-testid={testId}>
      <span class="activity-label">{label}</span>
      <span class="activity-title">{title}</span>
      <span class={`activity-detail${compactDetail ? " activity-detail-full" : ""}`}>{detail}</span>
      {compactDetail && <span class="activity-detail activity-detail-compact">{compactDetail}</span>}
      <ActivityArt kind={kind} />
      <span class="activity-action">{action}<span aria-hidden="true">↗</span></span>
    </button>
  );
}

