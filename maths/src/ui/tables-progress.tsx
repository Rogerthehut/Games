import { Avatar } from "./avatar";
import { useApp } from "./context";
import { speedTrend, streakOf, weeklyBoard } from "../engine/tables-progress";

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** Days in a row, and how quickly right answers came over the last two weeks (lower is quicker). */
export function StreakCard() {
  const { profile } = useApp();
  const st = streakOf(profile), trend = speedTrend(profile, 14);
  const pts = trend.map((x, i) => ({ i, ms: x.ms })).filter((x): x is { i: number; ms: number } => x.ms !== null);
  const W = 280, H = 90, top = Math.max(4000, ...pts.map((x) => x.ms)), X = (i: number) => 8 + (i * (W - 16)) / 13, Y = (ms: number) => 8 + (ms / top) * (H - 24);
  const first = pts[0], last = pts[pts.length - 1];
  const faster = first && last && last.i !== first.i && last.ms < first.ms - 200;
  return (
    <section class="tt-card" aria-labelledby="tt-streak" data-testid="tables-streak">
      <h2 id="tt-streak">My streak and speed</h2>
      <p class="tt-streak-line">
        <strong data-testid="streak-days">{st.current}</strong> {st.current === 1 ? "day" : "days"} in a row
        {st.current === 0 ? ". Do a few facts today to start one." : !st.practisedToday ? ". Practise today to keep it going." : "."}
        {st.best > st.current && <span class="small muted"> Your best is {st.best}.</span>}
      </p>
      {pts.length === 0 ? <p class="small muted">Answer some facts and your speed will show here.</p> : (
        <>
          <svg class="tt-speed" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Average time for a right answer over the last 14 days. ${faster ? "You're getting quicker." : "Keep practising to see it change."} Latest ${secs(last.ms)}.`}>
            <line x1="8" y1={Y(3000)} x2={W - 8} y2={Y(3000)} class="tt-speed-goal" />
            <text x={W - 8} y={Y(3000) - 3} text-anchor="end" class="tt-speed-note">quick: 3s</text>
            {pts.length > 1 && <polyline points={pts.map((x) => `${X(x.i)},${Y(x.ms)}`).join(" ")} class="tt-speed-line" fill="none" />}
            {pts.map((x) => <circle key={x.i} cx={X(x.i)} cy={Y(x.ms)} r="3.5" class="tt-speed-dot" />)}
          </svg>
          <p class="small muted">{faster ? "You're answering quicker than before. " : ""}Lower is quicker. The line is how long right answers took each day.</p>
        </>
      )}
    </section>
  );
}

/** This week's winner and everyone's right answers so far. Weeks start on Monday. */
export function WeekBoard() {
  const { profile, profiles } = useApp();
  const { rows, winners } = weeklyBoard(profiles, profile.id);
  const alone = rows.length < 2;
  return (
    <section class="tt-card" aria-labelledby="tt-week" data-testid="week-board">
      <h2 id="tt-week">{alone ? "This week" : "This week's winner"}</h2>
      {!alone && (winners.length ? <p class="tt-winner">🏆 <strong>{winners.map((id) => rows.find((r) => r.id === id)!.name).join(" and ")}</strong>{winners.length > 1 ? " are level" : " is ahead"}. Most right answers wins, from Monday.</p> : <p class="muted">Nobody has practised yet this week. Be first!</p>)}
      <ol class="tt-rank">
        {rows.map((r) => (
          <li key={r.id} class={`${r.you ? "you" : ""}${winners.includes(r.id) ? " first" : ""}`}>
            <span class="tt-place" aria-hidden="true">{winners.includes(r.id) ? "🏆" : "–"}</span>
            <Avatar choice={r.avatar} year={r.year} size={36} />
            <span class="tt-who"><strong>{r.name}{r.you ? " (you)" : ""}</strong><small class="muted">{r.days} {r.days === 1 ? "day" : "days"} this week</small></span>
            <span class="tt-pts">{r.right} right</span>
          </li>
        ))}
      </ol>
      {alone && <p class="small muted">Other learners on this account will appear here, so brothers and sisters can compete. It starts again every Monday.</p>}
    </section>
  );
}
