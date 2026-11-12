import type { Question } from "../engine/types";
import { FigureView } from "./figure";
import { Maths } from "./maths";

/**
 * The steps to a solution, with the method drawn above them when there is a picture of it (the column layout, a grid, a bus stop).
 * `count` shows only the first few steps, as in a step-by-step lesson; the picture waits until every step is showing, so it doesn't
 * give the answer away early.
 */
export function Solution({ q, count, class: cls = "steps" }: { q: Pick<Question, "solution" | "worked">; count?: number; class?: string }) {
  const all = count === undefined || count >= q.solution.length;
  return (
    <>
      {q.worked && all && <div class="worked" data-testid="worked-figure"><FigureView fig={q.worked} locked /></div>}
      <ol class={cls}>{q.solution.slice(0, count ?? q.solution.length).map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>
    </>
  );
}
