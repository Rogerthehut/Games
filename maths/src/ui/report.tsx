import { SKILL_BY_ID } from "../curriculum";
import { BAND_TEXT, BELOW_RANGE, yearLabel } from "../engine/diagnostic";
import type { BaselineRecord } from "../engine/progress";
import { useApp } from "./context";

const AXIS_MIN = 3, AXIS_MAX = 11;
const pos = (y: number) => `${Math.max(0, Math.min(100, ((y - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * 100))}%`;

function compare(theta: number, startYear: number): string {
  const diff = theta - (startYear + 0.3);
  if (diff >= 0.8) return `about ${diff >= 1.6 ? "two years" : "a year"} ahead of Year ${startYear}`;
  if (diff >= 0.3) return `a little ahead of Year ${startYear}`;
  if (diff > -0.4) return `right where we'd expect for Year ${startYear}`;
  if (diff >= -1.1) return `a little behind Year ${startYear}, which is very fixable`;
  return `about ${Math.round(-diff)} year${Math.round(-diff) > 1 ? "s" : ""} behind Year ${startYear}, so the plan starts with the foundations`;
}

export function Report({ rec: given }: { rec?: BaselineRecord }) {
  const { profile, go } = useApp();
  const rec = given ?? profile.baselines[profile.baselines.length - 1];
  if (!rec) {
    return (
      <div class="card"><h1>No check-up yet</h1><p class="lede">Take the check-up to see a report here.</p>
        <button class="btn primary" onClick={() => go({ name: "checkup" })}>Start the check-up</button></div>
    );
  }
  const prev = profile.baselines.length > 1 ? profile.baselines[profile.baselines.length - 2] : undefined;
  const band = BAND_TEXT[rec.readiness];
  const show11 = profile.year <= 7 || profile.goal?.exam === "gl" || profile.goal?.exam === "cem" || profile.goal?.exam === "unsure";
  const lo = rec.theta - rec.se, hi = rec.theta + rec.se;
  const gaps = rec.gaps.map((id) => SKILL_BY_ID[id]).filter(Boolean);
  const strengths = rec.strengths.map((id) => SKILL_BY_ID[id]).filter(Boolean).slice(0, 6);
  const sorted = [...rec.strands].sort((a, b) => b.theta - a.theta);

  return (
    <div class="report">
      <h1>{profile.name}'s check-up</h1>
      <p class="muted small">{new Date(rec.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {rec.questions} questions · {rec.minutes} minute{rec.minutes === 1 ? "" : "s"}</p>

      <section class="card hero" aria-labelledby="lvl">
        <h2 id="lvl">Working level</h2>
        <p class="big-level">{yearLabel(rec.theta)}</p>
        <p class="lede">
          {rec.theta < BELOW_RANGE
            ? <>Most questions were a stretch, and that's useful to know. The check-up starts at Year 3 level, so the plan begins with the foundations: number, place value and times tables.</>
            : <>{profile.name} is {compare(rec.theta, rec.startYear)}. Likely between {yearLabel(lo)} and {yearLabel(hi)}.</>}
          {prev && <> Since the last check-up this has moved {rec.theta >= prev.theta ? "up" : "down"} by about {Math.abs(rec.theta - prev.theta).toFixed(1)} of a school year.</>}
        </p>
      </section>

      {show11 && (
        <section class="card" aria-labelledby="r11">
          <h2 id="r11">11+ readiness <span class="badge">indicative</span></h2>
          <p class="band-label">{band.label}</p>
          <p>{band.detail}</p>
          <p class="small muted">This compares {profile.name}'s working level with the level we expect 11+ maths to need. It is an estimate to guide practice, not a prediction of any exam result, and it is not a score from GL Assessment or CEM.</p>
        </section>
      )}

      <section class="card" aria-labelledby="str">
        <h2 id="str">By topic area</h2>
        <p class="small muted">Each bar is the working level in that area. The marker shows the school year.</p>
        <ul class="bars">
          {sorted.map((s) => (
            <li key={s.strand}>
              <div class="bar-head"><span>{s.strand === "Ratio" ? "Ratio" : s.strand}</span><span class="muted small">{yearLabel(s.theta)}{s.n < 3 ? " · few questions" : ""}</span></div>
              <div class="bar-track" role="img" aria-label={`${s.strand}: ${yearLabel(s.theta)}`}>
                <i class="bar-fill" style={{ width: pos(s.theta) }} />
                <i class="bar-mark" style={{ left: pos(rec.startYear + 0.3) }} title={`Year ${rec.startYear}`} />
              </div>
            </li>
          ))}
        </ul>
        <div class="axis"><span>Year 3</span><span>Year 7</span><span>Year 11</span></div>
      </section>

      <section class="card" aria-labelledby="gp">
        <h2 id="gp">Gaps to work on</h2>
        {gaps.length === 0 ? <p>{rec.theta < BELOW_RANGE ? "Nothing was secure enough to call a single gap, so the plan simply starts at the beginning." : "No clear gaps showed up in this check-up. The plan focuses on moving up."}</p> : (
          <ul class="finding-list">
            {gaps.map((s) => {
              const miss = rec.responses.find((r) => r.skillId === s.id && !r.correct);
              return (
                <li key={s.id}>
                  <div><strong>{s.name}</strong> <span class="badge">Year {s.year}</span></div>
                  <p class="small muted">{miss ? `Missed a Year ${s.year}-level question. ` : ""}Ask: {s.talkAbout}</p>
                </li>
              );
            })}
          </ul>
        )}
        {strengths.length > 0 && (<><h3>Strengths</h3><p>{strengths.map((s) => s.name).join(", ")}.</p></>)}
      </section>

      <section class="card">
        <h2>What to do next</h2>
        <p>Turn this into a weekly plan, built from the gaps above and your exam date if there is one.</p>
        <div class="actions">
          <button class="btn primary" onClick={() => go({ name: "plan" })}>{profile.plan ? "See the plan" : "Build our plan"}</button>
          <button class="btn" onClick={() => go({ name: "home" })}>Start practising</button>
        </div>
      </section>

      <details class="card how">
        <summary>How this works, and what it can't tell you</summary>
        <p>The check-up picks each question to be close to the child's current level and adjusts after every answer. It spreads questions across topic areas, and follows up when something foundational might be missing.</p>
        <p><strong>It samples, so it can't find every gap.</strong> {rec.questions} questions can't cover every skill. Practice picks up the rest: any skill that goes wrong during practice is brought back and added to the plan. Re-take the check-up every 6 to 8 weeks to see progress.</p>
        <p><strong>It's an estimate.</strong> Question difficulty is based on when each topic is taught in the UK National Curriculum. We haven't yet calibrated it against large numbers of real children, so treat levels as a guide (the range above shows the uncertainty), not an official score.</p>
        <p><strong>A bad day shows.</strong> Tiredness, distraction or a new keyboard can pull the result down. If a result surprises you, repeat it on a better day.</p>
      </details>
    </div>
  );
}
