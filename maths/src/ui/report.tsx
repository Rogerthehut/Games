import { SKILL_BY_ID } from "../curriculum";
import { BAND_TEXT, BELOW_RANGE, yearLabel } from "../engine/diagnostic";
import type { BaselineRecord } from "../engine/progress";
import { useApp } from "./context";
import { Icon } from "./icons";

const AXIS_MIN = 3, AXIS_MAX = 12;
const pos = (y: number) => `${Math.max(0, Math.min(100, ((y - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * 100))}%`;

function sentence(theta: number, startYear: number): string {
  const diff = theta - (startYear + 0.3);
  if (diff >= 1.6) return `Around two years ahead of Year ${startYear}.`;
  if (diff >= 0.8) return `About a year ahead of Year ${startYear}.`;
  if (diff >= 0.3) return `A little ahead of Year ${startYear}.`;
  if (diff > -0.4) return `Right on track for Year ${startYear}.`;
  if (diff >= -1.1) return `A little behind Year ${startYear}. Very fixable.`;
  return `About ${Math.round(-diff)} year${Math.round(-diff) > 1 ? "s" : ""} behind Year ${startYear}, so we'll start with the foundations.`;
}

/** Where the child is on the school-year scale, next to where they are at school. */
function LevelScale({ theta, se, school }: { theta: number; se: number; school: number }) {
  const lo = Math.max(AXIS_MIN, theta - se), hi = Math.min(AXIS_MAX, theta + se);
  return (
    <div class="scale" role="img" aria-label={`Working at ${yearLabel(theta)}. At school in Year ${school}.`}>
      <div class="scale-track">
        <i class="scale-band" style={{ left: pos(lo), width: `${((hi - lo) / (AXIS_MAX - AXIS_MIN)) * 100}%` }} />
        <i class="scale-school" style={{ left: pos(school + 0.3) }} />
        <i class="scale-you" style={{ left: pos(theta) }} />
      </div>
      <div class="scale-axis"><span>Year 3</span><span>Year 6</span><span>Year 9</span><span>Year 12</span></div>
      <p class="scale-key"><i class="k-you" /> You <i class="k-school" /> At school, Year {school}</p>
    </div>
  );
}

export function Report({ rec: given }: { rec?: BaselineRecord }) {
  const { profile, go } = useApp();
  const rec = given ?? profile.baselines[profile.baselines.length - 1];
  if (!rec) {
    return (
      <div class="empty"><h1>No check-up yet</h1><p class="lede">Do the check-up and your report will show up here.</p>
        <button class="btn primary" onClick={() => go({ name: "checkup" })}>Start the check-up</button></div>
    );
  }
  const prev = profile.baselines.length > 1 ? profile.baselines[profile.baselines.length - 2] : undefined;
  const band = BAND_TEXT[rec.readiness];
  const show11 = profile.year <= 7 || profile.goal?.exam === "gl" || profile.goal?.exam === "cem" || profile.goal?.exam === "unsure";
  const gaps = rec.gaps.map((id) => SKILL_BY_ID[id]).filter(Boolean).slice(0, 5);
  const strengths = rec.strengths.map((id) => SKILL_BY_ID[id]).filter(Boolean).slice(0, 6);
  const sorted = [...rec.strands].sort((a, b) => b.theta - a.theta);
  const low = rec.theta < BELOW_RANGE;

  return (
    <div class="report">
      <header>
        <p class="kicker">Check-up · {new Date(rec.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
        <h1>{profile.name}'s level</h1>
      </header>

      <section class="level-card" aria-labelledby="lvl">
        <p class="eyebrow" id="lvl">Working at</p>
        <p class="big-level">{yearLabel(rec.theta)}</p>
        <p class="level-sentence">
          {low ? "Most of it was a stretch, which is useful to know. We'll start with the basics: number, place value and times tables." : sentence(rec.theta, rec.startYear)}
          {prev && !low && <> {rec.theta >= prev.theta ? "Up" : "Down"} {Math.abs(rec.theta - prev.theta).toFixed(1)} of a year since last time.</>}
        </p>
        {!low && <LevelScale theta={rec.theta} se={rec.se} school={rec.startYear} />}
      </section>

      {show11 && (
        <section class="block" aria-labelledby="r11">
          <h2 id="r11">11+ check <span class="badge">estimate</span></h2>
          <p class="band-label">{band.label}</p>
          <p>{band.detail}</p>
          <p class="small muted">A guide for practice. Not a prediction, and not a GL or CEM score.</p>
        </section>
      )}

      <section class="block" aria-labelledby="str">
        <h2 id="str">By topic</h2>
        <ul class="bars">
          {sorted.map((s) => (
            <li key={s.strand}>
              <div class="bar-head"><span>{s.strand}</span><span class="muted small">{yearLabel(s.theta)}</span></div>
              <div class="bar-track" role="img" aria-label={`${s.strand}: ${yearLabel(s.theta)}`}>
                <i class="bar-fill" style={{ width: pos(s.theta) }} />
                <i class="bar-mark" style={{ left: pos(rec.startYear + 0.3) }} title={`Year ${rec.startYear}`} />
              </div>
            </li>
          ))}
        </ul>
        <p class="small muted legend"><i class="bar-mark inline" /> Where you are at school</p>
      </section>

      <section class="block" aria-labelledby="gp">
        <h2 id="gp">Let's work on</h2>
        {gaps.length === 0 ? <p>{low ? "We'll start from the beginning." : "Nothing stood out. We'll focus on moving you up."}</p> : (
          <ul class="rows tight">
            {gaps.map((s) => (
              <li key={s.id} class="gap-row"><strong>{s.name}</strong><span class="badge">Year {s.year}</span></li>
            ))}
          </ul>
        )}
        {strengths.length > 0 && (
          <>
            <h3>You're strong at</h3>
            <p class="chips">{strengths.map((s) => <span class="chip good" key={s.id}>{s.name}</span>)}</p>
          </>
        )}
      </section>

      <div class="cta">
        <button class="btn primary big" onClick={() => go({ name: "plan" })} data-testid="to-plan">{profile.plan ? "See my plan" : "Build my plan"} <Icon name="arrow" size={20} /></button>
        <button class="btn ghost" onClick={() => go({ name: "home" })}>Start practising</button>
      </div>

      <details class="block how">
        <summary>About this score</summary>
        <p>The check-up picks each question close to your level and adjusts as you answer. It covers every topic area, and follows up when a basic skill might be missing.</p>
        <p><strong>It can't find every gap.</strong> {rec.questions} questions can't cover everything. Practice picks up the rest, and any skill that goes wrong gets brought back. Do the check-up again in 6 to 8 weeks to see how far you've come.</p>
        <p><strong>It's an estimate.</strong> The estimate uses the difficulty of the topics covered in Quarter. It hasn't been tested on large numbers of children yet, so read the level as a guide, not an official score.</p>
        <p><strong>Bad days show.</strong> If the result surprises you, try again on a better day.</p>
      </details>
    </div>
  );
}
