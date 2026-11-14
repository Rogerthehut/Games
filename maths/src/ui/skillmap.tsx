import { SKILL_BY_ID, STAGE_LABEL, STRANDS } from "../curriculum";
import { isUnlocked, skillName, statusOf } from "../engine/progress";
import { useEffect, useRef, useState } from "preact/hooks";
import { useApp, type Route } from "./context";
import { recall, remember } from "./memory";
import { Journey } from "./journey";
import { LittleSkills } from "./little";
import { hasSchoolWork } from "../engine/age";
import { hasLesson } from "../engine/lesson";
import { resolveSkin } from "./skin";
import { STATUS_LABEL } from "./labels";
import { activePathwayStage } from "../engine/pathway";
import { PathwayFinish } from "./certificate";
import { Icon } from "./icons";
import { skillDestination, STAGE_ORDER } from "../engine/activity";
import { SkillFilterControls, filterSkills, topicLabel, type SkillFilters } from "./skill-filters";

type SkillsRoute = Extract<Route, { name: "map" }>;

/** Where each learner last was on the map and on the list, so coming back puts them in the same place (kept on the device). */
const lastSpot = { get: (k: string) => recall<number | undefined>(k, undefined), set: (k: string, v: number) => remember(k, v) };
/** The element that scrolls the page: the nearest scrolling ancestor, or null for the window itself. */
function scroller(el: Element | null): HTMLElement | null {
  for (let e = el?.parentElement; e; e = e.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1) return e;
  }
  return null;
}

export function SkillMap({ navigation }: { navigation: SkillsRoute }) {
  const { profile, go, update } = useApp();
  const destination = skillDestination(profile, navigation.stage, navigation.skill);
  const lastNavigation = useRef(navigation);
  const [view, setView] = useState(navigation.view ?? profile.skillsView ?? (resolveSkin(profile) === "explorer" ? "journey" : "list"));
  const [picked, setPicked] = useState(destination.skill);
  const [filters, setFilters] = useState<SkillFilters>(() => navigation.filters ?? recall<SkillFilters>(`${profile.id}:skills.filters`, {}));
  useEffect(() => { remember(`${profile.id}:skills.filters`, Object.keys(filters).length ? filters : undefined); }, [filters]);
  const filterStart = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const spotKey = `${profile.id}:skills.${profile.year}.${view}`;
  // remember where they are as they scroll (not the first moments, while the page is still settling into place)
  useEffect(() => {
    const born = performance.now();
    let frame = 0;
    const on = () => {
      if (performance.now() - born < 600) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { const sc = scroller(root.current); lastSpot.set(spotKey, sc ? sc.scrollTop : window.scrollY); });
    };
    document.addEventListener("scroll", on, { capture: true, passive: true });
    return () => { cancelAnimationFrame(frame); document.removeEventListener("scroll", on, { capture: true } as EventListenerOptions); };
  }, [spotKey]);
  const visibleSkills = filterSkills(filters);
  const littleOnly = !hasSchoolWork(profile);   // Nursery: the topics start at Year 3, so only Little ones is shown
  const setListFilters = (next: SkillFilters) => {
    setFilters(next);
    if (next.q === filters.q) filterStart.current?.scrollIntoView({ block: "start" }); // not on every letter typed
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
    let retry = 0;
    const frame = requestAnimationFrame(() => {
      // Coming back with no particular topic or stage asked for: go to exactly where they were.
      const saved = !targetSkill && !navigation.stage ? lastSpot.get(spotKey) : undefined;
      if (saved !== undefined) {
        // the list can still be laying itself out, so keep trying for a moment until the page is tall enough to reach the spot
        let tries = 0;
        const place = () => {
          const sc = scroller(root.current);
          if (sc) sc.scrollTop = saved; else window.scrollTo(0, saved);
          const at = sc ? sc.scrollTop : window.scrollY;
          if (Math.abs(at - saved) > 2 && ++tries < 30) retry = requestAnimationFrame(place);
        };
        place();
        return;
      }
      // With nothing chosen, open the map where the learner is now, not at the top of their stage.
      const here = !targetSkill && view === "journey" ? document.querySelector<HTMLElement>(".journey .node.here") : null;
      const target = here ?? document.getElementById(id);
      target?.scrollIntoView({ block: targetSkill || here ? "center" : "start" });
      target?.focus({ preventScroll: true });
    });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(retry); };
  }, [view, navigation]);
  const stage = activePathwayStage(profile);
  const viewSwitch = (
    <button type="button" class="btn small" onClick={() => changeView(view === "journey" ? "list" : "journey")}>
      <Icon name={view === "journey" ? "list" : "route"} size={18} />
      <span class="lbl-long">{view === "journey" ? "Show as a list" : "Show journey map"}</span>
      <span class="lbl-short">{view === "journey" ? "List" : "Map"}</span>
    </button>
  );
  const heading = (
    <div class="journey-head">
      <p class="workbook-tab"><Icon name="book" size={16} /> Chapter index</p>
      <h1>Skills</h1>
    </div>
  );
  if (littleOnly) return (
    <div class="map" ref={root}>
      {heading}
      <LittleSkills />
    </div>
  );
  if (view === "journey") return <div ref={root} style="display:contents"><Journey picked={picked} setPicked={pickOnMap} heading={<><div class="skills-view-control">{viewSwitch}</div>{heading}{Object.keys(filters).length === 0 && <LittleSkills banner />}</>} /></div>;
  return (
    <div class="map" ref={root}>
      {heading}
      <p class="lede">Tap Practise on anything you want to work on.</p>
      <div ref={filterStart} />
      <SkillFilterControls filters={filters} onChange={setListFilters} count={visibleSkills.length}>{viewSwitch}</SkillFilterControls>
      {Object.keys(filters).length === 0 && <LittleSkills />}
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
                          {hasLesson(s.id) && <button class="btn small" onClick={() => go({ name: "lesson", skill: s.id }, backToSkill)} data-testid={`lesson-${s.id}`}>{profile.lessons?.[s.id] ? "Lesson again" : "Learn this"}</button>}
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
