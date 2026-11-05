import { SKILLS, STAGE_LABEL, STRANDS } from "../curriculum";
import { isUnlocked, skillName, statusOf, type Status } from "../engine/progress";
import { useApp } from "./context";

const LABEL: Record<Status, string> = { new: "Not started", assumed: "Assumed known", learning: "Learning", growing: "Growing", secure: "Secure" };

export function SkillMap() {
  const { profile, go } = useApp();
  return (
    <div class="map">
      <h1>Skills</h1>
      <p class="lede">Everything here follows the UK National Curriculum. Pick any skill to practise it, or let Today choose for you.</p>
      {STRANDS.map((strand) => {
        const skills = SKILLS.filter((s) => s.strand === strand).sort((a, b) => a.year - b.year);
        if (!skills.length) return null;
        return (
          <section key={strand} class="strand">
            <h2>{strand === "Ratio" ? "Ratio and proportion" : strand === "Geometry" ? "Geometry and measures" : strand}</h2>
            <ul class="skill-list">
              {skills.map((s) => {
                const st = profile.skills[s.id];
                const status = statusOf(st);
                const open = isUnlocked(profile, s);
                return (
                  <li class={`skill ${status}`} key={s.id}>
                    <div class="skill-main">
                      <div class="skill-title">
                        <strong>{s.name}</strong>
                        <span class="badge">{STAGE_LABEL[s.stage]} · Y{s.year}</span>
                      </div>
                      <p class="muted">{s.blurb}</p>
                      {!open && <p class="small muted">Builds on: {s.prereqs.map(skillName).join(", ")}</p>}
                    </div>
                    <div class="skill-side">
                      <span class={`status ${status}`}>{LABEL[status]}</span>
                      <span class="pips" role="img" aria-label={`Level ${st?.box ?? 0} of 5`}>
                        {[1, 2, 3, 4, 5].map((n) => <i key={n} class={(st?.box ?? 0) >= n ? "on" : ""} />)}
                      </span>
                      <button class="btn small" onClick={() => go({ name: "practice", plan: Array.from({ length: 9 }, () => ({ skillId: s.id, reason: "continue" as const })) })}>
                        {open ? "Practise" : "Try anyway"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
