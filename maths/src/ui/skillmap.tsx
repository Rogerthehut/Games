import { SKILL_BY_ID, STAGE_LABEL, STRANDS } from "../curriculum";
import { isUnlocked, skillName, statusOf } from "../engine/progress";
import { useEffect, useRef, useState } from "preact/hooks";
import { useApp, type Route } from "./context";
import { Journey } from "./journey";
import { resolveSkin } from "./skin";
import { STATUS_LABEL } from "./labels";
import { activePathwayStage } from "../engine/pathway";
import { PathwayFinish } from "./certificate";
import { Icon } from "./icons";
import { skillDestination, STAGE_ORDER } from "../engine/activity";
import { SkillFilterControls, filterSkills, topicLabel, type SkillFilters } from "./skill-filters";

type SkillsRoute = Extract<Route, { name: "map" }>;

export function SkillMap({ navigation }: { navigation: SkillsRoute }) {
  const { profile, go, update } = useApp();
  const destination = skillDestination(profile, navigation.stage, navigation.skill);
  const lastNavigation = useRef(navigation);
  const [view, setView] = useState(navigation.view ?? profile.skillsView ?? (resolveSkin(profile) === "explorer" ? "journey" : "list"));
  const [picked, setPicked] = useState(destination.skill);
  const [filters, setFilters] = useState<SkillFilters>(navigation.filters ?? {});
  const filterStart = useRef<HTMLDivElement>(null);
  const visibleSkills = filterSkills(filters);
  const setListFilters = (next: SkillFilters) => {
    setFilters(next);
    filterStart.current?.scrollIntoView({ block: "start" });
  };
  const pickOnMap = (id?: string) => {
    setPicked(id);
    const skill = id && SKILL_BY_ID[id];
    if (skill && ((filters.stage && filters.stage !== skill.stage) || (filters.topic && filters.topic !== skill.strand))) {
      setFilters({});
    }
  };
  const changeView = (next: "list" | "journey") => {
    setView(next);
    update((p) => ({ ...p, skillsView: next }));
  };
  useEffect(() => {
    const revisiting = lastNavigation.current !== navigation;
    lastNavigation.current = navigation;
    const targetSkill = revisiting ? destination.skill : picked;
    if (revisiting) setPicked(targetSkill);
    const id = targetSkill ? `skill-${targetSkill}` : `${view}-world-${destination.stage}`;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(id);
      target?.scrollIntoView({ block: targetSkill ? "center" : "start" });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [view, navigation]);
  const stage = activePathwayStage(profile);
  const viewSwitch = (
    <button type="button" class="btn small" onClick={() => changeView(view === "journey" ? "list" : "journey")}>
      <Icon name={view === "journey" ? "list" : "route"} size={18} />
      {view === "journey" ? "Show as a list" : "Show journey map"}
    </button>
  );
  const heading = (
    <div class="journey-head">
      <p class="workbook-tab"><Icon name="book" size={16} /> Chapter index</p>
      <h1>Skills</h1>
    </div>
  );
  if (view === "journey") return <Journey picked={picked} setPicked={pickOnMap} heading={<><div class="skills-view-control">{viewSwitch}</div>{heading}</>} />;
  return (
    <div class="map">
      {heading}
      <p class="lede">Tap Practise on anything you want to work on.</p>
      <div ref={filterStart} />
      <SkillFilterControls filters={filters} onChange={setListFilters} count={visibleSkills.length}>{viewSwitch}</SkillFilterControls>
      {STAGE_ORDER.filter((stage) => visibleSkills.some((skill) => skill.stage === stage)).map((listStage) => (
        <section key={listStage} class="skills-stage">
          <h2 class="skills-stage-heading" id={`list-world-${listStage}`} tabIndex={-1}>{STAGE_LABEL[listStage]}</h2>
          {STRANDS.map((strand) => {
            const skills = visibleSkills.filter((s) => s.stage === listStage && s.strand === strand).sort((a, b) => a.year - b.year);
            if (!skills.length) return null;
            return (
              <section key={strand} class="strand">
                <h3>{topicLabel(strand)}</h3>
                <ul class="skill-list">
                  {skills.map((s) => {
                    const backToSkill: SkillsRoute = { name: "map", view: "list", skill: s.id, filters };
                    const st = profile.skills[s.id];
                    const status = statusOf(st);
                    const open = isUnlocked(profile, s);
                    return (
                      <li class={`skill ${status} ${picked === s.id ? "selected-skill" : ""}`} key={s.id} id={`skill-${s.id}`} tabIndex={-1}>
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
                          {s.id === "times-tables" && <button class="btn small" onClick={() => go({ name: "equal-groups" }, backToSkill)}>{profile.groupsLesson && profile.groupsLesson.step < 3 ? "Continue lesson" : "Learn this"}</button>}
                          {s.id === "elapsed-time" && <button class="btn small" onClick={() => go({ name: "time-lesson" }, backToSkill)}>{profile.timeLesson && profile.timeLesson.step < 3 ? "Continue telling the time" : "Learn to tell the time"}</button>}
                          {s.id === "angles-basic" && <button class="btn small" onClick={() => go({ name: "angles-lesson" }, backToSkill)}>{profile.anglesLesson && profile.anglesLesson.step < 3 ? "Continue angles lesson" : "Learn about angles"}</button>}
                          {s.id === "frac-equiv" && <button class="btn small" onClick={() => go({ name: "fractions-lesson" }, backToSkill)}>{profile.fractionsLesson === 1 || profile.fractionsLesson === 2 ? "Continue lesson" : "Learn this"}</button>}
                          <button class="btn small" onClick={() => go({ name: "practice", plan: Array.from({ length: 9 }, () => ({ skillId: s.id, reason: "continue" as const })) }, backToSkill)}>
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
        </section>
      ))}
      {stage && !filters.topic && (!filters.stage || filters.stage === stage) && <PathwayFinish stage={stage} />}
    </div>
  );
}
