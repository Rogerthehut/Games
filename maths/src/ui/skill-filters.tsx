import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ALL_SKILLS, STAGE_LABEL, STRANDS } from "../curriculum";
import { STAGE_ORDER } from "../engine/activity";
import type { Stage, Strand } from "../engine/types";

export type SkillFilters = { stage?: Stage; topic?: Strand };

export const topicLabel = (topic: Strand) => topic === "Ratio" ? "Ratio and proportion" : topic === "Reasoning" ? "Reasoning (11+)" : topic;

export function filterSkills({ stage, topic }: SkillFilters) {
  return ALL_SKILLS.filter((skill) => skill.strand !== "STEM" && (!stage || skill.stage === stage) && (!topic || skill.strand === topic));
}

/** True while the person is scrolling down the list, so the filter panel can fade out of the way and come back when they scroll up. */
function useFadeOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    const born = performance.now();
    let last = -1, run = 0;
    const on = (e: Event) => {
      const el = ref.current, t = e.target as Document | HTMLElement;
      if (!el || !(t === document || t.contains?.(el))) return;
      const y = t === document ? window.scrollY : (t as HTMLElement).scrollTop;
      if (last < 0 || performance.now() - born < 800) { last = y; return; } // the page settling in isn't the person scrolling
      const dy = y - last; last = y;
      run = Math.sign(dy) === Math.sign(run) ? run + dy : dy; // distance travelled in one direction
      if (y < 80) { setFaded(false); run = 0; } else if (run > 24) setFaded(true); else if (run < -12) setFaded(false);
    };
    document.addEventListener("scroll", on, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", on, { capture: true } as EventListenerOptions);
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
        <button type="button" class="btn ghost small" disabled={!filters.stage && !filters.topic} onClick={() => onChange({})}>Clear filters</button>
      </div>
    </div>
  );
}
