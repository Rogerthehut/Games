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
  if (fig.type === "function-graph") return <FunctionGraphFigure {...fig} />;
  if (fig.type === "bearing") return <BearingFigure {...fig} />;
  if (fig.type === "polygon") return <PolygonFigure {...fig} />;
  if (fig.type === "circle-diagram") return <CircleFigure {...fig} />;
  if (fig.type === "pie") return <PieFigure {...fig} />;
  if (fig.type === "parallel-lines") return <ParallelFigure {...fig} />;
  if (fig.type === "net") return <NetFigure {...fig} />;
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

function FunctionGraphFigure({ xMin, xMax, yMin, yMax, xStep, yStep, curves, marks, strips, alt }: Of<"function-graph">) {
  const L = 40, R = 288, T = 14, B = 186, px = (x: number) => L + ((x - xMin) / (xMax - xMin)) * (R - L), py = (y: number) => B - ((y - yMin) / (yMax - yMin)) * (B - T);
  const xs: number[] = [], ys: number[] = [];
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) xs.push(r2(x));
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) ys.push(r2(y));
  const x0 = Math.min(Math.max(0, xMin), xMax), y0 = Math.min(Math.max(0, yMin), yMax);
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 214" role="img" aria-label={alt}>
      {xs.map((x) => <g key={`x${x}`}><line x1={px(x)} x2={px(x)} y1={T} y2={B} stroke="currentColor" opacity=".13" /><text x={px(x)} y={B + 16} text-anchor="middle" class="fig-label" font-size="11">{x}</text></g>)}
      {ys.map((y) => <g key={`y${y}`}><line x1={L} x2={R} y1={py(y)} y2={py(y)} stroke="currentColor" opacity=".13" /><text x={L - 6} y={py(y) + 4} text-anchor="end" class="fig-label" font-size="11">{y}</text></g>)}
      <line x1={px(x0)} x2={px(x0)} y1={T} y2={B} stroke="currentColor" stroke-width="2" /><line x1={L} x2={R} y1={py(y0)} y2={py(y0)} stroke="currentColor" stroke-width="2" />
      {strips && strips.length > 1 && strips.slice(0, -1).map(([x, y], i) => { const [x2, y2] = strips[i + 1]; return <polygon key={i} points={`${px(x)},${py(0)} ${px(x)},${py(y)} ${px(x2)},${py(y2)} ${px(x2)},${py(0)}`} fill="var(--accent)" fill-opacity=".22" stroke="var(--accent)" stroke-width="1.5" />; })}
      {strips && strips.map(([x, y], i) => <circle key={`s${i}`} cx={px(x)} cy={py(y)} r="3.5" fill="var(--accent)" />)}
      {curves.map((c, i) => <polyline key={i} points={c.pts.map(([x, y]) => `${r2(px(x))},${r2(py(y))}`).join(" ")} fill="none" stroke={c.dashed ? "#c2410c" : "var(--accent)"} stroke-width="3" stroke-linejoin="round" stroke-dasharray={c.dashed ? "8 5" : undefined} />)}
      {curves.map((c, i) => c.label ? <text key={`l${i}`} x={Math.min(px(c.pts[c.pts.length - 1][0]) , R - 4)} y={Math.max(T + 10, Math.min(B - 4, py(c.pts[c.pts.length - 1][1]) - 6))} text-anchor="end" class="fig-label" font-size="13" fill={c.dashed ? "#c2410c" : "var(--accent)"}>{c.label}</text> : null)}
      {marks?.map((m, i) => <g key={`m${i}`}><circle cx={px(m.x)} cy={py(m.y)} r="5" fill="#c2410c" stroke="var(--surface)" stroke-width="1.5" />{m.label && <text x={px(m.x) + (px(m.x) > 190 ? -8 : 8)} y={py(m.y) - 7} text-anchor={px(m.x) > 190 ? "end" : "start"} class="fig-label" font-size="12">{m.label}</text>}</g>)}
    </svg>
  );
}

function BearingFigure({ angle, from, to, alt }: Of<"bearing">) {
  const cx = 150, cy = 118, len = 86, rad = (angle * Math.PI) / 180, tx = r2(cx + len * Math.sin(rad)), ty = r2(cy - len * Math.cos(rad));
  const arcR = 30, ax = r2(cx + arcR * Math.sin(rad)), ay = r2(cy - arcR * Math.cos(rad)), large = angle > 180 ? 1 : 0;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 230" role="img" aria-label={alt}>
      <line x1={cx} y1={cy} x2={cx} y2="18" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" /><polygon points={`${cx},8 ${cx - 6},22 ${cx + 6},22`} fill="currentColor" /><text x={cx + 12} y="22" class="fig-label" font-size="14">N</text>
      <path d={`M ${cx} ${cy - arcR} A ${arcR} ${arcR} 0 ${large} 1 ${ax} ${ay}`} fill="none" stroke="#c2410c" stroke-width="3" />
      <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="var(--accent)" stroke-width="3" />
      <circle cx={cx} cy={cy} r="5.5" fill="currentColor" /><circle cx={tx} cy={ty} r="5.5" fill="var(--accent)" />
      <text x={cx - 10} y={cy + 20} text-anchor="end" class="fig-label" font-size="15">{from}</text><text x={tx + (tx >= cx ? 9 : -9)} y={ty + (ty < cy ? -8 : 18)} text-anchor={tx >= cx ? "start" : "end"} class="fig-label" font-size="15">{to}</text>
    </svg>
  );
}

const NET_FILL = ["#c1c5ee", "#f6a0bc", "#84d8ba", "#f0be65"];

function PolygonFigure({ pts, labels, dashed, rights, alt }: Of<"polygon">) {
  const xs = [...pts.map((p) => p[0]), ...labels.map((l) => l.x)], ys = [...pts.map((p) => p[1]), ...labels.map((l) => l.y)];
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), W = 300, H = 200, pad = 38;
  const k = Math.min((W - 2 * pad) / Math.max(x1 - x0, 0.01), (H - 2 * pad) / Math.max(y1 - y0, 0.01));
  const ox = (W - k * (x1 - x0)) / 2 - k * x0, oy = (H + k * (y1 - y0)) / 2 + k * y0;
  const X = (x: number) => r2(ox + k * x), Y = (y: number) => r2(oy - k * y), sq = Math.max(x1 - x0, y1 - y0) * 0.07;
  return (
    <svg class="figure figure-wide" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={alt}>
      <polygon points={pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ")} class="fig-shape" />
      {dashed?.map((d, i) => <line key={i} x1={X(d[0])} y1={Y(d[1])} x2={X(d[2])} y2={Y(d[3])} stroke="#c2410c" stroke-width="2.2" stroke-dasharray="6 4" />)}
      {rights?.map(([cx, cy, ux, uy, vx, vy], i) => <polyline key={i} points={`${X(cx + ux * sq)},${Y(cy + uy * sq)} ${X(cx + (ux + vx) * sq)},${Y(cy + (uy + vy) * sq)} ${X(cx + vx * sq)},${Y(cy + vy * sq)}`} fill="none" stroke="currentColor" stroke-width="1.6" />)}
      {labels.map((l, i) => <text key={i} x={X(l.x)} y={Y(l.y) + 5} text-anchor={l.anchor ?? "middle"} class="fig-label" font-size="14">{l.text}</text>)}
    </svg>
  );
}

function CircleFigure({ mode, label, angle, alt }: Of<"circle-diagram">) {
  const cx = 150, cy = 100, R = 74;
  const pt = (deg: number, len: number): [number, number] => [r2(cx + len * Math.cos((deg * Math.PI) / 180)), r2(cy - len * Math.sin((deg * Math.PI) / 180))];
  const a = angle ?? 90, end = pt(a, R);
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 200" role="img" aria-label={alt}>
      <circle cx={cx} cy={cy} r={R} class="fig-shape" />
      {mode === "radius" && <><line x1={cx} y1={cy} x2={pt(35, R)[0]} y2={pt(35, R)[1]} stroke="#c2410c" stroke-width="3" /><circle cx={cx} cy={cy} r="4" fill="currentColor" /><text x={r2((cx + pt(35, R)[0]) / 2 + 4)} y={r2((cy + pt(35, R)[1]) / 2 - 8)} class="fig-label" font-size="14">{label}</text></>}
      {mode === "diameter" && <><line x1={pt(180, R)[0]} y1={cy} x2={pt(0, R)[0]} y2={cy} stroke="#c2410c" stroke-width="3" /><circle cx={cx} cy={cy} r="4" fill="currentColor" /><text x={cx} y={cy + 24} text-anchor="middle" class="fig-label" font-size="14">{label}</text></>}
      {mode === "sector" && <><path d={`M ${cx} ${cy} L ${pt(0, R)[0]} ${cy} A ${R} ${R} 0 ${a > 180 ? 1 : 0} 0 ${end[0]} ${end[1]} Z`} fill="var(--accent)" fill-opacity=".25" stroke="currentColor" stroke-width="2" /><text x={r2(cx + 30)} y={r2(cy - 8)} class="fig-label" font-size="13">{angle}°</text><text x={r2(cx + R / 2)} y={cy + 20} text-anchor="middle" class="fig-label" font-size="13">{label}</text></>}
    </svg>
  );
}

function PieFigure({ slices, alt }: Of<"pie">) {
  const cx = 150, cy = 105, R = 62, total = slices.reduce((t, s) => t + s.value, 0), tones = ["#f6a0bc", "#c1c5ee", "#84d8ba", "#f0be65", "#e8d5a0"];
  let start = -90;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 210" role="img" aria-label={alt}>
      {slices.map((s, i) => {
        const sweep = (s.value / total) * 360, a0 = (start * Math.PI) / 180, a1 = ((start + sweep) * Math.PI) / 180, mid = ((start + sweep / 2) * Math.PI) / 180;
        start += sweep;
        const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1), c = Math.cos(mid);
        return <g key={i}>
          {slices.length === 1 ? <circle cx={cx} cy={cy} r={R} fill={tones[i]} stroke="currentColor" stroke-width="2" /> : <path d={`M ${cx} ${cy} L ${r2(x0)} ${r2(y0)} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${r2(x1)} ${r2(y1)} Z`} fill={tones[i % tones.length]} stroke="currentColor" stroke-width="2" />}
          <text x={r2(cx + (R + 10) * c)} y={r2(cy + (R + 10) * Math.sin(mid) + 5)} text-anchor={c > 0.3 ? "start" : c < -0.3 ? "end" : "middle"} class="fig-label" font-size="13">{s.label}</text>
        </g>;
      })}
    </svg>
  );
}

function ParallelFigure({ t: given, marks, alt }: Of<"parallel-lines">) {
  const t = Math.max(40, Math.min(75, given)), W = 300, H = 200, y1 = 60, y2 = 140, rad = (t * Math.PI) / 180, dx = (y2 - y1) / Math.tan(rad), cxU = 150 + dx / 2, cxL = 150 - dx / 2; // the transversal runs up to the right
  const sectors: Record<string, [number, number]> = { TR: [0, t], TL: [t, 180], BL: [180, 180 + t], BR: [180 + t, 360] };
  return (
    <svg class="figure figure-wide" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={alt}>
      <line x1="14" y1={y1} x2="286" y2={y1} stroke="currentColor" stroke-width="2.5" /><line x1="14" y1={y2} x2="286" y2={y2} stroke="currentColor" stroke-width="2.5" />
      <polygon points="262,54 274,60 262,66" fill="currentColor" /><polygon points="262,134 274,140 262,146" fill="currentColor" />
      <line x1={r2(cxL - 40 / Math.tan(rad))} y1={y2 + 40} x2={r2(cxU + 40 / Math.tan(rad))} y2={y1 - 40} stroke="var(--accent)" stroke-width="2.5" />
      {marks.map((m, i) => {
        const upper = m.pos[0] === "U", key = m.pos.slice(1), [a, b] = sectors[key], cx = upper ? cxU : cxL, cy = upper ? y1 : y2, mid = (((a + b) / 2) * Math.PI) / 180;
        const p0 = [cx + 22 * Math.cos((a * Math.PI) / 180), cy - 22 * Math.sin((a * Math.PI) / 180)], p1 = [cx + 22 * Math.cos((b * Math.PI) / 180), cy - 22 * Math.sin((b * Math.PI) / 180)];
        return <g key={i}><path d={`M ${r2(p0[0])} ${r2(p0[1])} A 22 22 0 0 0 ${r2(p1[0])} ${r2(p1[1])}`} fill="none" stroke="#c2410c" stroke-width="2.5" /><text x={r2(cx + 42 * Math.cos(mid))} y={r2(cy - 42 * Math.sin(mid) + 5)} text-anchor="middle" class="fig-label" font-size="14">{m.text}</text></g>;
      })}
    </svg>
  );
}

type NetPiece = [number, number][];
const rectP = (x: number, y: number, w: number, h: number): NetPiece => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const NETS: Record<Of<"net">["solid"], NetPiece[]> = {
  cube: [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]].map(([x, y]) => rectP(x, y, 1, 1)),
  cuboid: [rectP(0, 2, 2, 1.5), rectP(2, 2, 3, 1.5), rectP(5, 2, 2, 1.5), rectP(7, 2, 3, 1.5), rectP(2, 3.5, 3, 2), rectP(2, 0, 3, 2)],
  "triangular prism": [rectP(0, 1.7, 2, 3), rectP(2, 1.7, 2, 3), rectP(4, 1.7, 2, 3), [[2, 1.7], [4, 1.7], [3, 0]], [[2, 4.7], [4, 4.7], [3, 6.4]]],
  "square-based pyramid": [rectP(2, 2, 2, 2), [[2, 4], [4, 4], [3, 6]], [[2, 2], [4, 2], [3, 0]], [[2, 2], [2, 4], [0, 3]], [[4, 2], [4, 4], [6, 3]]],
  "triangular-based pyramid": [[[0, 0], [2, 0], [1, 1.73]], [[2, 0], [4, 0], [3, 1.73]], [[1, 1.73], [3, 1.73], [2, 3.46]], [[2, 0], [3, 1.73], [1, 1.73]]],
};

function NetFigure({ solid, alt }: Of<"net">) {
  const pieces = NETS[solid], all = pieces.flat(), x0 = Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0])), y0 = Math.min(...all.map((p) => p[1])), y1 = Math.max(...all.map((p) => p[1]));
  const W = 300, H = 200, pad = 18, k = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0)), ox = (W - k * (x1 - x0)) / 2 - k * x0, oy = (H - k * (y1 - y0)) / 2 - k * y0;
  return (
    <svg class="figure figure-wide" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={alt}>
      {pieces.map((pc, i) => <polygon key={i} points={pc.map(([x, y]) => `${r2(ox + k * x)},${r2(oy + k * y)}`).join(" ")} fill={NET_FILL[i % NET_FILL.length]} fill-opacity=".7" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />)}
    </svg>
  );
}
