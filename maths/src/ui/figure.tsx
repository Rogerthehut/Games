import type { Figure } from "../engine/types";

type Of<T extends Figure["type"]> = Extract<Figure, { type: T }>;
import { GlyphFigure } from "./glyph";
import { Maths } from "./maths";

export function FigureView({ fig }: { fig: Figure }) {
  if (fig.type === "glyphs") return <GlyphFigure layout={fig.layout} items={fig.items} caption={fig.caption} />;
  if (fig.type === "working") {
    return (
      <ol class="working-lines" aria-label="Someone's working">
        {fig.lines.map((line, i) => <li key={i}><span class="line-no">Line {i + 1}</span> <Maths text={line} /></li>)}
      </ol>
    );
  }
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
  if (fig.type === "clock") return <ClockFigure {...fig} />;
  if (fig.type === "scale") return <ScaleFigure {...fig} />;
  if (fig.type === "line-graph") return <LineGraphFigure {...fig} />;
  if (fig.type === "scatter") return <ScatterFigure {...fig} />;
  if (fig.type === "coord-grid") return <CoordGridFigure {...fig} />;
  if (fig.type === "venn") return <VennFigure {...fig} />;
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

const r2 = (n: number) => Math.round(n * 100) / 100;

function ClockFigure({ h, m, alt }: Of<"clock">) {
  const cx = 110, cy = 110, R = 92;
  const pt = (deg: number, len: number): [number, number] => [r2(cx + len * Math.sin((deg * Math.PI) / 180)), r2(cy - len * Math.cos((deg * Math.PI) / 180))];
  const hand = pt(((h % 12) + m / 60) * 30, 40), minute = pt(m * 6, 62);
  return (
    <svg class="figure figure-clock" viewBox="0 0 220 220" role="img" aria-label={alt}>
      <circle cx={cx} cy={cy} r={R} class="fig-face" />
      {Array.from({ length: 60 }, (_, i) => { const a = pt(i * 6, R - 2), b = pt(i * 6, R - (i % 5 === 0 ? 9 : 5)); return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="currentColor" stroke-width={i % 5 === 0 ? 2 : 1} />; })}
      {Array.from({ length: 12 }, (_, i) => { const [x, y] = pt((i + 1) * 30, R - 27); return <text key={i} x={x} y={y + 6} text-anchor="middle" class="fig-label" font-size="18">{i + 1}</text>; })}
      <line x1={cx} y1={cy} x2={hand[0]} y2={hand[1]} class="fig-hand-short" />
      <line x1={cx} y1={cy} x2={minute[0]} y2={minute[1]} class="fig-hand-long" />
      <circle cx={cx} cy={cy} r="5" fill="currentColor" />
    </svg>
  );
}

function ScaleFigure({ start, end, gaps, unit, pointer, alt }: Of<"scale">) {
  const x0 = 24, x1 = 276, y = 54, step = (x1 - x0) / gaps;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 120" role="img" aria-label={alt}>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke="currentColor" stroke-width="2.5" />
      {Array.from({ length: gaps + 1 }, (_, i) => <line key={i} x1={x0 + i * step} y1={y - (i === 0 || i === gaps ? 14 : 9)} x2={x0 + i * step} y2={y + (i === 0 || i === gaps ? 14 : 9)} stroke="currentColor" stroke-width="2" />)}
      <text x={x0} y={y + 36} text-anchor="middle" class="fig-label">{start}</text>
      <text x={x1} y={y + 36} text-anchor="middle" class="fig-label">{end}</text>
      <text x="150" y="112" text-anchor="middle" class="fig-label" opacity=".7">{unit}</text>
      {pointer !== undefined && <g><polygon points={`${x0 + pointer * step},${y - 4} ${x0 + pointer * step - 8},${y - 24} ${x0 + pointer * step + 8},${y - 24}`} fill="#c2410c" /><line x1={x0 + pointer * step} y1={y - 24} x2={x0 + pointer * step} y2="6" stroke="#c2410c" stroke-width="3" /></g>}
    </svg>
  );
}

function LineGraphFigure({ xs, ys, xLabel, yLabel, yMax, alt }: Of<"line-graph">) {
  const L = 44, R = 288, T = 30, B = 156, px = (i: number) => L + (i * (R - L)) / Math.max(1, xs.length - 1), py = (v: number) => B - (v / yMax) * (B - T);
  const ticks = 4;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 200" role="img" aria-label={alt}>
      {Array.from({ length: ticks + 1 }, (_, i) => { const v = (yMax / ticks) * i; return <g key={i}><line x1={L} x2={R} y1={py(v)} y2={py(v)} stroke="currentColor" opacity={i === 0 ? .8 : .2} /><text x={L - 6} y={py(v) + 4} text-anchor="end" class="fig-label" font-size="12">{v}</text></g>; })}
      <polyline points={ys.map((v, i) => `${px(i)},${py(v)}`).join(" ")} fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" />
      {ys.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r="4.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5" />)}
      {xs.map((x, i) => <text key={i} x={px(i)} y={B + 17} text-anchor="middle" class="fig-label" font-size="12">{x}</text>)}
      <text x={(L + R) / 2} y="196" text-anchor="middle" class="fig-label" font-size="12" opacity=".75">{xLabel}</text>
      <text x="12" y="12" class="fig-label" font-size="12" opacity=".75">{yLabel}</text>
    </svg>
  );
}

function ScatterFigure({ points, xLabel, yLabel, alt }: Of<"scatter">) {
  const L = 34, R = 286, T = 14, B = 160, px = (v: number) => L + v * (R - L) / 10, py = (v: number) => B - v * (B - T) / 10;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 200" role="img" aria-label={alt}>
      <line x1={L} y1={B} x2={R} y2={B} stroke="currentColor" stroke-width="2" /><line x1={L} y1={T} x2={L} y2={B} stroke="currentColor" stroke-width="2" />
      {points.map(([x, y], i) => <circle key={i} cx={px(x)} cy={py(y)} r="5" fill="var(--accent)" opacity=".85" />)}
      <text x={(L + R) / 2} y="190" text-anchor="middle" class="fig-label" font-size="13">{xLabel}</text>
      <text x="10" y="10" class="fig-label" font-size="13">{yLabel}</text>
    </svg>
  );
}

function CoordGridFigure({ max, points, mirror, alt }: Of<"coord-grid">) {
  const L = 30, S = 240, step = S / max, px = (v: number) => L + v * step, py = (v: number) => S + 10 - v * step;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 280" role="img" aria-label={alt}>
      {Array.from({ length: max + 1 }, (_, i) => <g key={i}><line x1={px(i)} y1={py(0)} x2={px(i)} y2={py(max)} stroke="currentColor" opacity={i === 0 ? .8 : .18} /><line x1={px(0)} y1={py(i)} x2={px(max)} y2={py(i)} stroke="currentColor" opacity={i === 0 ? .8 : .18} />
        <text x={px(i)} y={py(0) + 17} text-anchor="middle" class="fig-label" font-size="12">{i}</text><text x={px(0) - 8} y={py(i) + 4} text-anchor="end" class="fig-label" font-size="12">{i}</text></g>)}
      {mirror && (mirror.axis === "x"
        ? <line x1={px(mirror.value)} y1={py(0)} x2={px(mirror.value)} y2={py(max)} stroke="#c2410c" stroke-width="3" stroke-dasharray="7 5" />
        : <line x1={px(0)} y1={py(mirror.value)} x2={px(max)} y2={py(mirror.value)} stroke="#c2410c" stroke-width="3" stroke-dasharray="7 5" />)}
      {points.map((p, i) => <g key={i}><circle cx={px(p.x)} cy={py(p.y)} r="6" fill="var(--accent)" stroke="var(--surface)" stroke-width="2" /><text x={px(p.x) + 9} y={py(p.y) - 8} class="fig-label" font-size="14">{p.label}</text></g>)}
    </svg>
  );
}

function VennFigure({ labelA, labelB, a, both, b, alt }: Of<"venn">) {
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 180" role="img" aria-label={alt}>
      <rect x="6" y="6" width="288" height="168" rx="10" fill="none" stroke="currentColor" opacity=".35" />
      <circle cx="116" cy="94" r="62" fill="#f6a0bc" fill-opacity=".55" stroke="currentColor" stroke-width="2" />
      <circle cx="184" cy="94" r="62" fill="#84d8ba" fill-opacity=".55" stroke="currentColor" stroke-width="2" />
      <text x="90" y="30" text-anchor="middle" class="fig-label" font-size="13">{labelA}</text><text x="210" y="30" text-anchor="middle" class="fig-label" font-size="13">{labelB}</text>
      <text x="92" y="100" text-anchor="middle" class="fig-label" font-size="20">{a}</text><text x="150" y="100" text-anchor="middle" class="fig-label" font-size="20">{both}</text><text x="208" y="100" text-anchor="middle" class="fig-label" font-size="20">{b}</text>
    </svg>
  );
}
