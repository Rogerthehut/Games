import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ALL_SKILLS, STAGE_LABEL, STRANDS } from "../curriculum";
import { STAGE_ORDER } from "../engine/activity";
import type { Skill, Stage, Strand } from "../engine/types";
import { makeSearchIndex } from "../engine/search";

export type SkillFilters = { stage?: Stage; topic?: Strand; /** words to find: * and ? work as wildcards, and small spelling slips are fine */ q?: string };

export const topicLabel = (topic: Strand) => topic === "Ratio" ? "Ratio and proportion" : topic === "Reasoning" ? "Reasoning (11+)" : topic;

// the same matching as the search across the app: wildcards, spelling slips, "year 6" and "ks2"
let finder: ReturnType<typeof makeSearchIndex<{ title: string; keywords: string; year: number; stage: Stage; skill: Skill }>> | undefined;
const find = (q: string) => (finder ??= makeSearchIndex(ALL_SKILLS.filter((s) => s.strand !== "STEM").map((skill) => ({
  title: skill.name, year: skill.year, stage: skill.stage, skill,
  keywords: `${skill.blurb} ${skill.strand} ${topicLabel(skill.strand)} ${skill.stage} ${STAGE_LABEL[skill.stage]} year ${skill.year} y${skill.year}`,
}))))(q).map((r) => r.skill);

/** The skills that match the filters. With words to find, they come best match first; otherwise in curriculum order. */
export function filterSkills({ stage, topic, q }: SkillFilters) {
  const pool = q?.trim() ? find(q) : ALL_SKILLS.filter((skill) => skill.strand !== "STEM");
  return pool.filter((skill) => (!stage || skill.stage === stage) && (!topic || skill.strand === topic));
}

/** True while the person is scrolling down the list, so the filter panel can fade out of the way and come back when they scroll up. */
/**
 * The search panel stays put at the top while the list scrolls under it. It is shown whenever the first topic in the list is still below
 * the top of the page, and fades out only once that first topic has scrolled up to the top, then comes back as it scrolls down again
 * to that point. Where you are in the list decides, not how fast or in which direction you scroll, so it never flickers.
 */
function useFadeOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      const panel = ref.current;
      const first = panel?.parentElement?.querySelector<HTMLElement>(".topics > li, .skill-list > li");
      if (!panel || !first) { setFaded(false); return; }
      // "the top of the page" is where the panel sticks: its own top offset inside whatever scrolls
      let edge = 0;
      for (let e: HTMLElement | null = panel.parentElement; e; e = e.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1) { edge = e.getBoundingClientRect().top; break; }
      }
      setFaded(first.getBoundingClientRect().top <= edge + (parseFloat(getComputedStyle(panel).top) || 0) + 2);
    };
    const on = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(check); };
    document.addEventListener("scroll", on, { capture: true, passive: true });
    addEventListener("resize", on);
    on();
    return () => { cancelAnimationFrame(frame); document.removeEventListener("scroll", on, { capture: true } as EventListenerOptions); removeEventListener("resize", on); };
  }, []);
  return { ref, faded };
}

export function SkillFilterControls({ filters, onChange, count, children }: {
  filters: SkillFilters; onChange: (filters: SkillFilters) => void; count: number; children?: ComponentChildren;
}) {
  const topics = STRANDS.filter((topic) => ALL_SKILLS.some((skill) => (!filters.stage || skill.stage === filters.stage) && skill.strand === topic));
  const { ref, faded } = useFadeOnScroll();
  return (
    <div ref={ref} class={`skills-filter${children ? " has-view" : ""}${faded ? " faded" : ""}`} role="group" aria-label="Filter skills">
      <label class="skills-find">
        Find a topic
        <input type="search" autoComplete="off" maxLength={80} placeholder="Try fractions, frac*, angles or Year 6" value={filters.q ?? ""} data-testid="topic-search"
          onInput={(event) => onChange({ ...filters, q: event.currentTarget.value })} />
      </label>
      <label>
        Stage
        <select value={filters.stage ?? ""} onChange={(event) => {
          const stage = (event.currentTarget.value || undefined) as Stage | undefined;
          const topic = filterSkills({ stage, topic: filters.topic }).length ? filters.topic : undefined;
          onChange({ stage, topic });
        }}>
          <option value="">All stages</option>
          {STAGE_ORDER.map((stage) => <option key={stage} value={stage}>{STAGE_LABEL[stage]}</option>)}
        </select>
      </label>
      <label>
        Topic
        <select value={filters.topic ?? ""} onChange={(event) =>
          onChange({ ...filters, topic: (event.currentTarget.value || undefined) as Strand | undefined })
        }>
          <option value="">All topics</option>
          {topics.map((topic) => <option key={topic} value={topic}>{topicLabel(topic)}</option>)}
        </select>
      </label>
      {children && <div class="skills-filter-view">{children}</div>}
      <div class="skills-filter-summary">
        <span class="small muted" role="status">{count} {count === 1 ? "skill" : "skills"}</span>
        <button type="button" class="btn ghost small" disabled={!filters.stage && !filters.topic && !filters.q} onClick={() => onChange({})}>Clear filters</button>
      </div>
    </div>
  );
}
