import type { Figure } from "../engine/types";

export function FigureView({ fig }: { fig: Figure }) {
  if (fig.type === "bar-chart") {
    const baseline = 163;
    const row = 16;
    const description = fig.bars.map(({ label, height }) => `${label}: ${height * fig.interval}`).join(", ");
    return (
      <svg class="figure" viewBox="0 0 300 194" role="img" aria-label={`Votes for a class pet. ${description}.`}>
        <text x="48" y="18" class="fig-label">Votes</text>
        {Array.from({ length: fig.intervals + 1 }, (_, i) => {
          const y = baseline - row * i;
          return <g key={i}>
            <line x1="42" x2="286" y1={y} y2={y} stroke="currentColor" opacity={i === 0 ? .8 : .2} />
            <text x="35" y={y + 4} text-anchor="end" class="fig-label">{i * fig.interval}</text>
          </g>;
        })}
        {fig.bars.map(({ label, height }, i) => {
          const x = 78 + i * 82;
          return <g key={label}>
            <rect x={x - 19} y={baseline - row * height} width="38" height={row * height} rx="3" class="fig-shape" />
            <text x={x} y={baseline + 23} text-anchor="middle" class="fig-label">{label}</text>
          </g>;
        })}
      </svg>
    );
  }
  // The right angle is at the bottom right and the marked angle is at the bottom left.
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
