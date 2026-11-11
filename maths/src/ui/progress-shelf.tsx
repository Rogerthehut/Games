import { useEffect, useMemo } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import { newlyEarned, shelf, type MilestoneState } from "../engine/milestones";
import { useApp } from "./context";
import { Icon } from "./icons";

/** "My progress": milestones a child can explain, earned when the topics behind them are secure, with a clear next step. */
export function MyProgress() {
  const { profile, update, go } = useApp();
  const { earned, coming, nextUp } = useMemo(() => shelf(profile), [profile]);
  const fresh = useMemo(() => new Set(newlyEarned(profile).map((m) => m.id)), []); // those new when this screen opened
  // once they've been seen, they're no longer new
  useEffect(() => {
    const ids = newlyEarned(profile).map((m) => m.id);
    if (!ids.length) return;
    const t = setTimeout(() => update((p) => ({ ...p, milestonesSeen: [...new Set([...(p.milestonesSeen ?? []), ...ids])] })), 1500);
    return () => clearTimeout(t);
  }, [profile.skills]);
  const practise = (m: MilestoneState) => { if (m.next) go({ name: "practice", plan: Array.from({ length: 6 }, () => ({ skillId: m.next!, reason: "continue" as const })) }, { name: "me" }); };
  if (!earned.length && !coming.length) return null;
  return (
    <section aria-labelledby="progress-h" class="my-progress" data-testid="my-progress">
      <h2 id="progress-h">My progress</h2>
      {nextUp && (
        <div class={`mp-next tone-${nextUp.tone}`}>
          <div><p class="mp-next-title">Next up: <strong>{nextUp.title}</strong></p><p class="small">{nextUp.done} of {nextUp.total} topics secure. {nextUp.next && <>Try “{SKILL_BY_ID[nextUp.next].name}”.</>}</p></div>
          <button type="button" class="btn small primary" onClick={() => practise(nextUp)} data-testid="mp-practise">Practise</button>
        </div>
      )}
      {!!earned.length && (
        <ul class="mp-shelf" aria-label="Earned">
          {earned.map((m) => (
            <li key={m.id} class={`mp-badge tone-${m.tone} earned${fresh.has(m.id) ? " new" : ""}`} data-testid={`milestone-${m.id}`}>
              <span class="mp-medal" aria-hidden="true"><Icon name="star" size={30} /></span>
              <strong>{m.title}</strong>
              <span class="small">{fresh.has(m.id) ? "New!" : m.blurb}</span>
            </li>
          ))}
        </ul>
      )}
      {!!coming.length && (
        <details class="mp-coming">
          <summary>Still to earn ({coming.length})</summary>
          <ul class="mp-shelf">
            {coming.map((m) => (
              <li key={m.id} class={`mp-badge tone-${m.tone}`} data-testid={`milestone-${m.id}`}>
                <span class="mp-medal" aria-hidden="true"><span class="mp-count">{m.done}/{m.total}</span></span>
                <strong>{m.title}</strong>
                <span class="small">{m.blurb}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
