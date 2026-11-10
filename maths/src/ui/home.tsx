import { useMemo } from "preact/hooks";
import { DAY, buildSession, currentStreak, practiceDaysThisWeek, skillName } from "../engine/progress";
import { mulberry32 } from "../engine/rng";
import { currentWeek, planFocus } from "../engine/plan";
import { TEST_LENGTH } from "../engine/diagnostic";
import { STAGE_ORDER } from "../engine/activity";
import { pathwayTestName } from "../engine/pathway";
import { useApp } from "./context";
import { Icon } from "./icons";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Lead with one concrete topic, and mention the rest underneath. */
const topicTitle = (names: string[]) => names[0] ?? "Practice";
const topicRest = (names: string[]) => (names.length > 1 ? `plus ${names.slice(1).join(" and ")}` : "");

export function Home() {
  const { profile, go } = useApp();
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

  const pausedAngles = !!profile.anglesLesson && profile.anglesLesson.step < 3;
  const hasSavedActivity = pausedAngles || pausedCheckup || profile.practiceDraft || Object.keys(profile.pathwayDrafts ?? {}).length > 0
    || (profile.fractionsLesson && profile.fractionsLesson < 3) || (profile.groupsLesson && profile.groupsLesson.step < 3)
    || (profile.timeLesson && profile.timeLesson.step < 3);
  const firstPractice = !last && profile.sessions.length === 0;
  const practicePlan = firstPractice ? plan.slice(0, 3) : plan;

  return (
    <div class="today">
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
          <ActivityCard kind="checkup" label="03 / Check-up" title={pausedCheckup ? "Keep going." : "Find your level."}
            detail={pausedCheckup ? `${midTest} of ${TEST_LENGTH} questions done.` : `${TEST_LENGTH} questions · about 20 min`}
            action={pausedCheckup ? "Continue check-up" : last ? "Take another check-up" : "Start check-up"} testId="start-checkup"
            onClick={() => go({ name: "checkup" })} />
          <ActivityCard kind="plan" label="04 / Plan" title="See your next steps."
            detail={week ? `Week ${week.n} · ${week.kind === "learn" ? week.note : week.kind === "review" ? "Revision" : "Practice paper"}` : "See what to work on and make a plan."}
            action={last && !profile.plan ? "Build your plan" : "View plan"} testId="build-plan"
            onClick={() => go({ name: "plan" })} />
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
          </div>
        </section>
      ) : null}

      {week?.kind === "mock" && (
        <ul class="rows">
        <li><button class="row" onClick={() => go({ name: "mock" })} data-testid="start-mock"><Icon name="target" /><span>Take a practice paper<small>20 questions · 25 minutes</small></span><Icon name="chevron" size={18} /></button></li>
        </ul>
      )}
    </div>
  );
}


export type ActivityKind = "practice" | "skills" | "checkup" | "plan" | "tutor";

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

export function ActivityArt({ kind }: { kind: ActivityKind }) {
  return (
    <svg class="activity-art" viewBox="0 0 120 100" fill="#fff7e4" stroke="currentColor" stroke-width="3.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      {kind === "practice" && <g transform="rotate(25 60 50)">
        <path d="M50 13h20v61L60 89 50 74zM50 28h20M50 74h20" />
        <path d="M33 21v16m-8-8h16" fill="none" />
      </g>}
      {kind === "skills" && <>
        <path d="m15 30 29-11 31 10 29-11v56L75 85 44 75 15 86zM44 19v56m31-46v56" />
        <path d="M25 65c22-1 23-23 43-16s20-4 24-12" fill="none" stroke-dasharray="2 6" />
      </>}
      {kind === "checkup" && <>
        <circle cx="54" cy="53" r="35" /><circle cx="54" cy="53" r="23" fill="none" /><circle cx="54" cy="53" r="10" fill="none" />
        <path d="m54 53 42-41m-14 2 15-3-2 15" fill="none" />
      </>}
      {kind === "plan" && <>
        <path d="M60 29c-13-10-27-12-45-9v58c19-3 33 1 45 10 12-9 26-13 45-10V20c-18-3-32-1-45 9zm0 0v59" />
        <path d="M27 35c7 0 14 2 21 6m-21 8c7 0 14 2 21 6m24-14c7-4 14-6 21-6m-21 20c7-4 14-6 21-6" fill="none" />
      </>}
      {kind === "tutor" && <>
        <path d="M18 18h84v52H52L32 88V70H18z" />
        <path d="M34 38h52M34 52h34" fill="none" />
      </>}
      <g fill="none" stroke-width="2" opacity=".48">
        {kind === "practice" && <path d="M92 29l7-4m-5 13 9 1M17 68c-5 6-3 11 3 13" />}
        {kind === "skills" && <path d="M14 17l-4-6m11 3 1-7m74 82 4 5m3-10 7 3" />}
        {kind === "checkup" && <path d="M103 43l8-3m-10 11 8 2M17 22l-5-5m11 1-1-7" />}
        {kind === "tutor" && <path d="M104 22l6-5m-3 14 8 1M12 92l-4 5" />}
        {kind === "plan" && <path d="M60 7c0 6 2 8 8 8-6 0-8 2-8 8 0-6-2-8-8-8 6 0 8-2 8-8zM17 90l6-4m76 3 6 4" />}
      </g>
    </svg>
  );
}
