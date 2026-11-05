import type { Figure } from "../engine/types";

/** Right-angled triangle: right angle bottom right, the marked angle bottom left. */
export function FigureView({ fig }: { fig: Figure }) {
  const A = [34, 150], B = [206, 150], C = [206, 34];
  const label = (s: string, x: number, y: number, anchor = "middle") =>
    s ? <text x={x} y={y} text-anchor={anchor} class="fig-label">{s}</text> : null;
  return (
    <svg class="figure" viewBox="0 0 300 190" role="img" aria-label="Right-angled triangle">
      <polygon points={`${A} ${B} ${C}`} class="fig-shape" />
      <polyline points="190,150 190,134 206,134" class="fig-right" />
      {label(fig.base, 120, 176)}
      {label(fig.height, 226, 98, "start")}
      {label(fig.hyp, 106, 84, "end")}
      {fig.angle && <path d="M 66 150 A 32 32 0 0 0 58.5 129" class="fig-right" />}
      {fig.angle && label(fig.angle, 82, 142, "start")}
    </svg>
  );
}
