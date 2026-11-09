import type { ComponentChildren } from "preact";
import { ALL_SKILLS, STAGE_LABEL, STRANDS } from "../curriculum";
import { STAGE_ORDER } from "../engine/activity";
import type { Stage, Strand } from "../engine/types";

export type SkillFilters = { stage?: Stage; topic?: Strand };

export const topicLabel = (topic: Strand) => topic === "Ratio" ? "Ratio and proportion" : topic === "Reasoning" ? "Reasoning (11+)" : topic;

export function filterSkills({ stage, topic }: SkillFilters) {
  return ALL_SKILLS.filter((skill) => (!stage || skill.stage === stage) && (!topic || skill.strand === topic));
}

export function SkillFilterControls({ filters, onChange, count, children }: {
  filters: SkillFilters; onChange: (filters: SkillFilters) => void; count: number; children?: ComponentChildren;
}) {
  const topics = STRANDS.filter((topic) => ALL_SKILLS.some((skill) => (!filters.stage || skill.stage === filters.stage) && skill.strand === topic));
  return (
    <div class={`skills-filter${children ? " has-view" : ""}`} role="group" aria-label="Filter skills">
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
