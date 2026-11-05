import { SKILLS, STAGE_LABEL, STRANDS } from "../curriculum";
import { isUnlocked, skillName, statusOf } from "../engine/progress";
import { useState } from "preact/hooks";
import { useApp } from "./context";
import { Journey } from "./journey";
import { resolveSkin } from "./skin";
import { STATUS_LABEL } from "./labels";

export function SkillMap() {
  const { profile, go } = useApp();
  const [list, setList] = useState(false);
  if (resolveSkin(profile) === "explorer" && !list) return <Journey onList={() => setList(true)} />;
  return (
    <div class="map">
      <h1>Skills</h1>
      <p class="lede">Tap Practise on anything you want to work on.</p>
      {STRANDS.map((strand) => {
        const skills = SKILLS.filter((s) => s.strand === strand).sort((a, b) => a.year - b.year);
        if (!skills.length) return null;
        return (
          <section key={strand} class="strand">
            <h2>{strand === "Ratio" ? "Ratio and proportion" : strand === "Measures" ? "Measures" : strand === "Statistics" ? "Statistics" : strand}</h2>
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
                      {!open && <p class="small muted">Easier with {s.prereqs.map(skillName).join(" and ")} first</p>}
                    </div>
                    <div class="skill-side">
                      <span class={`status ${status}`}>{STATUS_LABEL[status]}</span>
                      <span class="pips" role="img" aria-label={`Level ${st?.box ?? 0} of 5`}>
                        {[1, 2, 3, 4, 5].map((n) => <i key={n} class={(st?.box ?? 0) >= n ? "on" : ""} />)}
                      </span>
                      <button class="btn small" onClick={() => go({ name: "practice", plan: Array.from({ length: 9 }, () => ({ skillId: s.id, reason: "continue" as const })) })}>
                        Practise
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
