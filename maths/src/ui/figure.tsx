import { useEffect, useRef, useState } from "preact/hooks";
import { AngleDrawFigure, ProtractorFigure, ShapeDrawFigure } from "./instrument-figures";
import type { Figure } from "../engine/types";

type Of<T extends Figure["type"]> = Extract<Figure, { type: T }>;
import { GlyphFigure } from "./glyph";
import { Maths } from "./maths";

/** Pictures the learner answers by drawing on them, so the typed answer box is hidden. */
export const isDrawing = (fig?: Figure) => fig?.type === "angle-draw" || fig?.type === "shape-draw";

export function FigureView({ fig, onBoard, locked }: { fig: Figure; /** called with the piece's new place, when the figure is a board */ onBoard?: (answer: number) => void; locked?: boolean }) {
  if (fig.type === "board") return <BoardFigure {...fig} onBoard={onBoard} locked={locked} />;
  if (fig.type === "protractor") return <ProtractorFigure {...fig} />;
  if (fig.type === "angle-draw") return <AngleDrawFigure {...fig} onBoard={onBoard} locked={locked} />;
  if (fig.type === "shape-draw") return <ShapeDrawFigure {...fig} onBoard={onBoard} locked={locked} />;
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
  if (fig.type === "code") return <CodeFigure {...fig} />;
  if (fig.type === "bits") return <BitsFigure {...fig} />;
  if (fig.type === "list-boxes") return <ListBoxesFigure {...fig} />;
  if (fig.type === "number-line") return <NumberLineFigure {...fig} />;
  if (fig.type === "neuron") return <NeuronFigure {...fig} />;
  if (fig.type === "bars") return <BarsFigure {...fig} />;
  if (fig.type === "table") return <TableFigure {...fig} />;
  if (fig.type === "flow") return <FlowFigure {...fig} />;
  if (fig.type === "alphabet") return <AlphabetFigure {...fig} />;
  if (fig.type === "histogram") return <HistogramFigure {...fig} />;
  if (fig.type === "square-grid") return <SquareGridFigure {...fig} />;
  if (fig.type === "solid") return <SolidFigure {...fig} />;
  if (fig.type === "circle-theorem") return <CircleTheoremFigure {...fig} />;
  if (fig.type === "boxplot") return <BoxplotFigure {...fig} />;
  if (fig.type === "angle-rays") return <AngleRaysFigure {...fig} />;
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

function CoordGridFigure({ max, min = 0, points, poly, mirror, alt }: Of<"coord-grid">) {
  const L = 34, S = 232, n = max - min, step = S / n, px = (v: number) => L + (v - min) * step, py = (v: number) => S + 12 - (v - min) * step, every = n > 12 ? 2 : 1;
  const ticks = Array.from({ length: n + 1 }, (_, i) => min + i);
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 280" role="img" aria-label={alt}>
      {ticks.map((i) => <g key={i}><line x1={px(i)} y1={py(min)} x2={px(i)} y2={py(max)} stroke="currentColor" opacity={i === 0 ? .8 : .16} stroke-width={i === 0 ? 2 : 1} /><line x1={px(min)} y1={py(i)} x2={px(max)} y2={py(i)} stroke="currentColor" opacity={i === 0 ? .8 : .16} stroke-width={i === 0 ? 2 : 1} />
        {i !== 0 && i % every === 0 && <><text x={px(i)} y={py(0) + 14} text-anchor="middle" class="fig-label" font-size="10">{i}</text><text x={px(0) - 5} y={py(i) + 4} text-anchor="end" class="fig-label" font-size="10">{i}</text></>}</g>)}
      {poly && <polygon points={poly.map(([x, y]) => `${px(x)},${py(y)}`).join(" ")} fill="var(--accent)" fill-opacity=".18" stroke="var(--accent)" stroke-width="2" />}
      {mirror && (mirror.axis === "x"
        ? <line x1={px(mirror.value)} y1={py(min)} x2={px(mirror.value)} y2={py(max)} stroke="#c2410c" stroke-width="3" stroke-dasharray="7 5" />
        : <line x1={px(min)} y1={py(mirror.value)} x2={px(max)} y2={py(mirror.value)} stroke="#c2410c" stroke-width="3" stroke-dasharray="7 5" />)}
      {points.map((p, i) => <g key={i}><circle cx={px(p.x)} cy={py(p.y)} r="5.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2" /><text x={px(p.x) + 8} y={py(p.y) - 8} class="fig-label" font-size="13">{p.label}</text></g>)}
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

function PolygonFigure({ pts, more, labels, dashed, rights, alt }: Of<"polygon">) {
  const allPts = [...pts, ...(more ?? []).flat()], xs = [...allPts.map((p) => p[0]), ...labels.map((l) => l.x)], ys = [...allPts.map((p) => p[1]), ...labels.map((l) => l.y)];
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), W = 300, H = 200, pad = 38;
  const k = Math.min((W - 2 * pad) / Math.max(x1 - x0, 0.01), (H - 2 * pad) / Math.max(y1 - y0, 0.01));
  const ox = (W - k * (x1 - x0)) / 2 - k * x0, oy = (H + k * (y1 - y0)) / 2 + k * y0;
  const X = (x: number) => r2(ox + k * x), Y = (y: number) => r2(oy - k * y), sq = Math.max(x1 - x0, y1 - y0) * 0.07;
  return (
    <svg class="figure figure-wide" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={alt}>
      <polygon points={pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ")} class="fig-shape" />
      {more?.map((m, i) => <polygon key={`m${i}`} points={m.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ")} class="fig-shape" />)}
      {dashed?.map((d, i) => <line key={i} x1={X(d[0])} y1={Y(d[1])} x2={X(d[2])} y2={Y(d[3])} stroke="#c2410c" stroke-width="2.2" stroke-dasharray="6 4" />)}
      {rights?.map(([cx, cy, ux, uy, vx, vy], i) => <polyline key={i} points={`${X(cx + ux * sq)},${Y(cy + uy * sq)} ${X(cx + (ux + vx) * sq)},${Y(cy + (uy + vy) * sq)} ${X(cx + vx * sq)},${Y(cy + vy * sq)}`} fill="none" stroke="currentColor" stroke-width="1.6" />)}
      {labels.map((l, i) => <text key={i} x={X(l.x)} y={Y(l.y) + 5} text-anchor={l.anchor ?? "middle"} class="fig-label" font-size="14">{l.text}</text>)}
    </svg>
  );
}

function CircleFigure({ mode, label, angle, angleLabel, alt }: Of<"circle-diagram">) {
  const cx = 150, cy = 100, R = 74;
  const pt = (deg: number, len: number): [number, number] => [r2(cx + len * Math.cos((deg * Math.PI) / 180)), r2(cy - len * Math.sin((deg * Math.PI) / 180))];
  const a = angle ?? 90, end = pt(a, R);
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 200" role="img" aria-label={alt}>
      <circle cx={cx} cy={cy} r={R} class="fig-shape" />
      {mode === "radius" && <><line x1={cx} y1={cy} x2={pt(35, R)[0]} y2={pt(35, R)[1]} stroke="#c2410c" stroke-width="3" /><circle cx={cx} cy={cy} r="4" fill="currentColor" /><text x={r2((cx + pt(35, R)[0]) / 2 + 4)} y={r2((cy + pt(35, R)[1]) / 2 - 8)} class="fig-label" font-size="14">{label}</text></>}
      {mode === "diameter" && <><line x1={pt(180, R)[0]} y1={cy} x2={pt(0, R)[0]} y2={cy} stroke="#c2410c" stroke-width="3" /><circle cx={cx} cy={cy} r="4" fill="currentColor" /><text x={cx} y={cy + 24} text-anchor="middle" class="fig-label" font-size="14">{label}</text></>}
      {mode === "sector" && <><path d={`M ${cx} ${cy} L ${pt(0, R)[0]} ${cy} A ${R} ${R} 0 ${a > 180 ? 1 : 0} 0 ${end[0]} ${end[1]} Z`} fill="var(--accent)" fill-opacity=".25" stroke="currentColor" stroke-width="2" /><text x={r2(cx + 30)} y={r2(cy - 8)} class="fig-label" font-size="13">{angleLabel ?? `${angle}°`}</text><text x={r2(cx + R / 2)} y={cy + 20} text-anchor="middle" class="fig-label" font-size="13">{label}</text></>}
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

function SquareGridFigure({ rows, cols, cut, alt }: Of<"square-grid">) {
  const cell = Math.min(24, 250 / cols, 150 / rows), W = cols * cell, H = rows * cell, x0 = (300 - W) / 2, y0 = (190 - H) / 2 + 6;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 190" role="img" aria-label={alt}>
      {Array.from({ length: rows * cols }, (_, i) => { const r = Math.floor(i / cols), c = i % cols; if (cut && r < cut.rows && c >= cols - cut.cols) return null; return <rect key={i} x={r2(x0 + c * cell)} y={r2(y0 + r * cell)} width={r2(cell)} height={r2(cell)} fill="#c1c5ee" fill-opacity=".6" stroke="currentColor" stroke-width="1.2" />; })}
    </svg>
  );
}

function SolidFigure({ kind, a, b, c, alt }: Of<"solid">) {
  const lab = (x: number, y: number, t: string | undefined, anchor = "middle") => (t ? <text x={x} y={y} text-anchor={anchor} class="fig-label" font-size="14">{t}</text> : null);
  const fill = "#c1c5ee", edge = { stroke: "currentColor", "stroke-width": 2, "stroke-linejoin": "round" } as const;
  let body;
  if (kind === "cuboid") body = <>
    <polygon points="70,70 190,70 230,40 110,40" fill="#e0e3f7" {...edge} /><polygon points="190,70 230,40 230,120 190,150" fill="#a9afe0" {...edge} /><rect x="70" y="70" width="120" height="80" fill={fill} {...edge} />
    {lab(130, 172, a)}{lab(222, 150, b, "start")}{lab(60, 114, c, "end")}</>;
  else if (kind === "tri-prism") body = <>
    <polygon points="60,150 150,150 105,70" fill={fill} {...edge} /><polygon points="150,150 230,120 185,40 105,70 60,150" fill="#a9afe0" fill-opacity=".7" {...edge} /><polygon points="60,150 150,150 105,70" fill={fill} {...edge} /><line x1="105" y1="70" x2="185" y2="40" {...edge} />
    {lab(105, 172, a)}{lab(80, 108, b, "end")}{lab(208, 144, c, "start")}</>;
  else if (kind === "cylinder") body = <>
    <path d="M 90 50 L 90 140 A 60 18 0 0 0 210 140 L 210 50" fill={fill} {...edge} /><ellipse cx="150" cy="50" rx="60" ry="18" fill="#e0e3f7" {...edge} />
    <line x1="150" y1="50" x2="210" y2="50" stroke="#c2410c" stroke-width="3" />{lab(182, 30, a)}{lab(222, 100, b, "start")}</>;
  else if (kind === "cone") body = <>
    <path d="M 150 25 L 90 140 A 60 18 0 0 0 210 140 Z" fill={fill} {...edge} /><line x1="150" y1="25" x2="150" y2="140" stroke="#c2410c" stroke-width="2.5" stroke-dasharray="6 4" /><line x1="150" y1="140" x2="210" y2="140" stroke="#c2410c" stroke-width="3" />
    {lab(180, 134, a)}{lab(158, 90, b, "start")}</>;
  else if (kind === "pyramid") body = <>
    <polygon points="70,130 190,130 230,100 110,100" fill="#e0e3f7" {...edge} stroke-dasharray="5 4" /><polygon points="70,130 190,130 150,25" fill={fill} {...edge} /><polygon points="190,130 230,100 150,25" fill="#a9afe0" {...edge} /></>;
  else if (kind === "tetrahedron") body = <>
    <polygon points="60,140 210,140 150,30" fill={fill} {...edge} /><polygon points="210,140 250,100 150,30" fill="#a9afe0" {...edge} /><line x1="60" y1="140" x2="250" y2="100" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" /></>;
  else body = <>
    {kind === "sphere" ? <circle cx="150" cy="90" r="64" fill={fill} {...edge} /> : <path d="M 86 90 A 64 64 0 0 1 214 90 Z" fill={fill} {...edge} />}
    <ellipse cx="150" cy="90" rx="64" ry="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" /><line x1="150" y1="90" x2="214" y2="90" stroke="#c2410c" stroke-width="3" /><circle cx="150" cy="90" r="3.5" fill="currentColor" />{lab(184, 112, a)}</>;
  return <svg class="figure figure-wide" viewBox="0 0 300 190" role="img" aria-label={alt}>{body}</svg>;
}

function CircleTheoremFigure({ kind, angles, alt }: Of<"circle-theorem">) {
  const cx = 150, cy = 100, R = 72, P = (deg: number): [number, number] => [r2(cx + R * Math.cos((deg * Math.PI) / 180)), r2(cy - R * Math.sin((deg * Math.PI) / 180))];
  const set = kind === "centre" ? { A: 210, B: 330, C: 90 } : kind === "cyclic" ? { A: 200, B: 110, C: 20, D: 290 } : { A: 180, B: 0, C: 70 };
  const pts = Object.fromEntries(Object.entries(set).map(([k, d]) => [k, P(d)])) as Record<string, [number, number]>;
  const line = (a: string, b: string) => <line x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke="currentColor" stroke-width="2.2" />;
  const centre: [number, number] = [cx, cy];
  const label = (name: string, text: string) => { const v = name === "O" ? centre : pts[name]; const t = name === "O" ? 0 : 0.3; return <text key={name} x={r2(v[0] + (cx - v[0]) * t)} y={r2(v[1] + (cy - v[1]) * t + (name === "O" ? -12 : 5))} text-anchor="middle" class="fig-label" font-size="13" fill="#c2410c">{text}</text>; };
  const names = Object.keys(pts);
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 200" role="img" aria-label={alt}>
      <circle cx={cx} cy={cy} r={R} fill="var(--surface)" stroke="currentColor" stroke-width="2.5" />
      {kind === "centre" && <>{line("A", "C")}{line("B", "C")}<line x1={cx} y1={cy} x2={pts.A[0]} y2={pts.A[1]} stroke="var(--accent)" stroke-width="2.2" /><line x1={cx} y1={cy} x2={pts.B[0]} y2={pts.B[1]} stroke="var(--accent)" stroke-width="2.2" /><circle cx={cx} cy={cy} r="3.5" fill="currentColor" /></>}
      {kind === "cyclic" && <>{line("A", "B")}{line("B", "C")}{line("C", "D")}{line("D", "A")}</>}
      {kind === "semicircle" && <>{line("A", "B")}{line("A", "C")}{line("B", "C")}<circle cx={cx} cy={cy} r="3.5" fill="currentColor" /></>}
      {names.map((k) => { const v = pts[k], out = 1.17; return <text key={k} x={r2(cx + (v[0] - cx) * out)} y={r2(cy + (v[1] - cy) * out + 5)} text-anchor="middle" class="fig-label" font-size="14">{k}</text>; })}
      {kind !== "cyclic" && <text x={cx + 8} y={cy + 20} class="fig-label" font-size="13">O</text>}
      {angles.map((a) => label(a.at, a.text))}
    </svg>
  );
}

function BoxplotFigure({ min, lq, med, uq, max, labelled, alt }: Of<"boxplot">) {
  const L = 24, R = 276, span = max - min, X = (v: number) => r2(L + ((v - min) / span) * (R - L)), y = 70, h = 44;
  const lab = (k: "lq" | "uq" | "min" | "max" | "med", v: number) => labelled.includes(k) ? <text key={k} x={X(v)} y={y + h + 24} text-anchor="middle" class="fig-label" font-size="13">{v}</text> : null;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 160" role="img" aria-label={alt}>
      <line x1={X(min)} y1={y + h / 2} x2={X(lq)} y2={y + h / 2} stroke="currentColor" stroke-width="2.5" /><line x1={X(uq)} y1={y + h / 2} x2={X(max)} y2={y + h / 2} stroke="currentColor" stroke-width="2.5" />
      <line x1={X(min)} y1={y + 10} x2={X(min)} y2={y + h - 10} stroke="currentColor" stroke-width="2.5" /><line x1={X(max)} y1={y + 10} x2={X(max)} y2={y + h - 10} stroke="currentColor" stroke-width="2.5" />
      <rect x={X(lq)} y={y} width={X(uq) - X(lq)} height={h} fill="#c1c5ee" fill-opacity=".7" stroke="currentColor" stroke-width="2.5" /><line x1={X(med)} y1={y} x2={X(med)} y2={y + h} stroke="#c2410c" stroke-width="3" />
      {lab("min", min)}{lab("lq", lq)}{lab("med", med)}{lab("uq", uq)}{lab("max", max)}
    </svg>
  );
}

function AngleRaysFigure({ total, parts, alt }: Of<"angle-rays">) {
  const cx = 150, cy = total === 180 ? 130 : 100, R = total === 180 ? 100 : 72, start = total === 180 ? 0 : 20;
  let acc = start;
  const pt = (d: number, len: number): [number, number] => [r2(cx + len * Math.cos((d * Math.PI) / 180)), r2(cy - len * Math.sin((d * Math.PI) / 180))];
  const rays = [start, ...parts.map((p) => (acc += p.deg, acc))];
  acc = start;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 200" role="img" aria-label={alt}>
      {total === 180 && <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="currentColor" stroke-width="2.5" />}
      {rays.slice(0, parts.reduce((s, p) => s + p.deg, 0) === 360 ? -1 : undefined).map((d, i) => <line key={i} x1={cx} y1={cy} x2={pt(d, R)[0]} y2={pt(d, R)[1]} stroke="currentColor" stroke-width="2.5" />)}
      {parts.map((p, i) => { const a0 = acc, a1 = acc + p.deg, mid = (a0 + a1) / 2; acc = a1; const s = pt(a0, 26), e = pt(a1, 26), t = pt(mid, 44 + (p.deg < 40 ? 8 : 0)); return <g key={i}><path d={`M ${s[0]} ${s[1]} A 26 26 0 ${p.deg > 180 ? 1 : 0} 0 ${e[0]} ${e[1]}`} fill="none" stroke="#c2410c" stroke-width="2.5" /><text x={t[0]} y={t[1] + 5} text-anchor="middle" class="fig-label" font-size="13">{p.label}</text></g>; })}
      <circle cx={cx} cy={cy} r="3.5" fill="currentColor" />
    </svg>
  );
}

function HistogramFigure({ bars, yMax, yLabel, alt }: Of<"histogram">) {
  const L = 44, R = 284, T = 34, B = 150, lo = Math.min(...bars.map((b) => b.lo)), hi = Math.max(...bars.map((b) => b.hi)), X = (v: number) => r2(L + ((v - lo) / (hi - lo)) * (R - L)), Y = (v: number) => r2(B - (v / yMax) * (B - T));
  const step = yMax <= 6 ? 1 : yMax <= 12 ? 2 : 5;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 190" role="img" aria-label={alt}>
      {Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step).map((v) => <g key={v}><line x1={L} x2={R} y1={Y(v)} y2={Y(v)} stroke="currentColor" opacity={v === 0 ? .8 : .15} /><text x={L - 6} y={Y(v) + 4} text-anchor="end" class="fig-label" font-size="11">{v}</text></g>)}
      {bars.map((b, i) => <g key={i}><rect x={X(b.lo)} y={Y(b.h)} width={X(b.hi) - X(b.lo)} height={B - Y(b.h)} fill="#c1c5ee" fill-opacity=".75" stroke="currentColor" stroke-width="2" />{b.note && <text x={r2((X(b.lo) + X(b.hi)) / 2)} y={Y(b.h) - 6} text-anchor="middle" class="fig-label" font-size="12">{b.note}</text>}</g>)}
      {[...new Set(bars.flatMap((b) => [b.lo, b.hi]))].map((v) => <text key={v} x={X(v)} y={B + 16} text-anchor="middle" class="fig-label" font-size="11">{v}</text>)}
      <text x="8" y="12" class="fig-label" font-size="11" opacity=".75">{yLabel}</text>
    </svg>
  );
}

function CodeFigure({ lines, alt }: Of<"code">) {
  return (
    <figure class="code-figure" role="img" aria-label={alt}>
      <ol aria-hidden="true">{lines.map((l, i) => <li key={i}><code>{l}</code></li>)}</ol>
    </figure>
  );
}

function BitsFigure({ bits, alt }: Of<"bits">) {
  const n = bits.length, w = Math.min(40, 280 / n), x0 = (300 - n * w) / 2;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 100" role="img" aria-label={alt}>
      {bits.split("").map((b, i) => <g key={i}><text x={x0 + i * w + w / 2} y="18" text-anchor="middle" class="fig-label" font-size="12" opacity=".7">{2 ** (n - 1 - i)}</text><rect x={x0 + i * w + 2} y="26" width={w - 4} height="46" rx="7" fill={b === "1" ? "#84d8ba" : "var(--surface)"} stroke="currentColor" stroke-width="2" /><text x={x0 + i * w + w / 2} y="58" text-anchor="middle" class="fig-label" font-size="22">{b}</text></g>)}
    </svg>
  );
}

function ListBoxesFigure({ items, alt }: Of<"list-boxes">) {
  const n = items.length, w = Math.min(44, 290 / n), x0 = (300 - n * w) / 2;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 80" role="img" aria-label={alt}>
      {items.map((v, i) => <g key={i}><rect x={x0 + i * w + 2} y="18" width={w - 4} height="44" rx="8" fill="#c1c5ee" fill-opacity=".6" stroke="currentColor" stroke-width="2" /><text x={x0 + i * w + w / 2} y="47" text-anchor="middle" class="fig-label" font-size="18">{v}</text></g>)}
    </svg>
  );
}

function NumberLineFigure({ min, max, points, alt }: Of<"number-line">) {
  const L = 20, R = 280, X = (v: number) => r2(L + ((v - min) / (max - min)) * (R - L)), tone = { red: "#f6a0bc", blue: "#c1c5ee", new: "#fff" };
  // up to about 21 marks at one apiece; a longer line is marked every 2, 5, 10... so the numbers don't run together
  const step = [1, 2, 5, 10, 20, 50].find((k) => (max - min) / k <= (max >= 30 ? 12 : 21)) ?? 100;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 110" role="img" aria-label={alt}>
      <line x1={L} y1="62" x2={R} y2="62" stroke="currentColor" stroke-width="2.5" />
      {Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step).map((v) => <g key={v}><line x1={X(v)} y1="56" x2={X(v)} y2="68" stroke="currentColor" stroke-width="1.5" /><text x={X(v)} y="88" text-anchor="middle" class="fig-label" font-size="10">{v}</text></g>)}
      {points.map((p, i) => <g key={i}><circle cx={X(p.v)} cy="62" r="9" fill={tone[p.tone]} stroke="currentColor" stroke-width="2.5" />{p.tone === "new" && <text x={X(p.v)} y="66" text-anchor="middle" class="fig-label" font-size="12">?</text>}{p.label && <text x={X(p.v)} y="40" text-anchor="middle" class="fig-label" font-size="12">{p.label}</text>}</g>)}
    </svg>
  );
}

function NeuronFigure({ inputs, weights, bias, alt }: Of<"neuron">) {
  const n = inputs.length, ys = inputs.map((_, i) => 30 + (i * 100) / Math.max(1, n - 1) + (n === 1 ? 35 : 0));
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 160" role="img" aria-label={alt}>
      {inputs.map((v, i) => <g key={i}><circle cx="34" cy={ys[i]} r="18" fill="#84d8ba" stroke="currentColor" stroke-width="2" /><text x="34" y={ys[i] + 5} text-anchor="middle" class="fig-label" font-size="15">{v}</text><line x1="52" y1={ys[i]} x2="160" y2="80" stroke="currentColor" stroke-width="2" /><text x="104" y={(ys[i] + 80) / 2 + (ys[i] < 80 ? -6 : 14)} text-anchor="middle" class="fig-label" font-size="12" fill="#c2410c">× {weights[i]}</text></g>)}
      <circle cx="182" cy="80" r="26" fill="#f0be65" stroke="currentColor" stroke-width="2" /><text x="182" y="85" text-anchor="middle" class="fig-label" font-size="13">add</text>
      {bias !== undefined && <text x="182" y="130" text-anchor="middle" class="fig-label" font-size="12" fill="#c2410c">bias {bias}</text>}
      <line x1="208" y1="80" x2="248" y2="80" stroke="currentColor" stroke-width="2" /><rect x="248" y="62" width="40" height="36" rx="9" fill="#f6a0bc" stroke="currentColor" stroke-width="2" /><text x="268" y="86" text-anchor="middle" class="fig-label" font-size="18">?</text>
    </svg>
  );
}

function BarsFigure({ items, yLabel, alt }: Of<"bars">) {
  const L = 40, R = 290, T = 26, B = 150, max = Math.max(...items.map((i) => i.value)), top = Math.ceil(max / 5) * 5 || 5, w = (R - L) / items.length, Y = (v: number) => r2(B - (v / top) * (B - T));
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 190" role="img" aria-label={alt}>
      {[0, top / 2, top].map((v) => <g key={v}><line x1={L} x2={R} y1={Y(v)} y2={Y(v)} stroke="currentColor" opacity={v === 0 ? .8 : .15} /><text x={L - 6} y={Y(v) + 4} text-anchor="end" class="fig-label" font-size="11">{v}</text></g>)}
      {items.map((it, i) => <g key={i}><rect x={L + i * w + w * 0.18} y={Y(it.value)} width={w * 0.64} height={B - Y(it.value)} rx="4" fill="#c1c5ee" fill-opacity=".8" stroke="currentColor" stroke-width="2" /><text x={L + i * w + w / 2} y={B + 16} text-anchor="middle" class="fig-label" font-size="11">{it.label}</text></g>)}
      <text x="8" y="14" class="fig-label" font-size="11" opacity=".75">{yLabel}</text>
    </svg>
  );
}

function TableFigure({ head, rows, alt }: Of<"table">) {
  return (
    <figure class="table-figure">
      <table aria-label={alt}>
        <thead><tr>{head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}>{row.map((c, j) => (j === 0 && head[0] === "" ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
      </table>
    </figure>
  );
}

function FlowFigure({ steps, repeat, alt }: Of<"flow">) {
  const W = 300, bw = 190, bh = 38, gap = 20, x0 = repeat ? 40 : (W - bw) / 2, H = steps.length * bh + (steps.length - 1) * gap + 16;
  const top = (i: number) => 8 + i * (bh + gap);
  return (
    <svg class="figure figure-wide" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={alt}>
      <defs><marker id="flow-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor" /></marker></defs>
      {steps.map((st, i) => (
        <g key={i}>
          <rect x={x0} y={top(i)} width={bw} height={bh} rx={st.kind === "step" || !st.kind ? 8 : 19} fill={st.kind === "in" ? "#84d8ba" : st.kind === "out" ? "#f6a0bc" : "#c1c5ee"} fill-opacity=".7" stroke="currentColor" stroke-width="2" />
          <text x={x0 + bw / 2} y={top(i) + bh / 2 + 5} text-anchor="middle" class="fig-label" font-size="14">{st.text}</text>
          {i > 0 && <line x1={x0 + bw / 2} y1={top(i - 1) + bh + 1} x2={x0 + bw / 2} y2={top(i) - 2} stroke="currentColor" stroke-width="2" marker-end="url(#flow-head)" />}
        </g>
      ))}
      {repeat && (() => {
        const y1 = top(repeat.from) - 4, y2 = top(repeat.to) + bh + 4, x = x0 + bw + 14;
        return <g><path d={`M${x0 + bw + 4} ${y1} H${x} V${y2} H${x0 + bw + 4}`} fill="none" stroke="currentColor" stroke-width="2" /><text x={x + 8} y={(y1 + y2) / 2 + 5} class="fig-label" font-size="13" font-weight="700">{repeat.label}</text></g>;
      })()}
    </svg>
  );
}

function AlphabetFigure({ note, alt }: Of<"alphabet">) {
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", w = 21;
  return (
    <svg class="figure figure-wide" viewBox="0 0 300 140" role="img" aria-label={alt}>
      {[0, 1].map((row) => L.slice(row * 13, row * 13 + 13).split("").map((c, i) => (
        <g key={c}>
          <rect x={12 + i * w} y={10 + row * 58} width={w - 2} height="26" rx="4" fill="#c1c5ee" fill-opacity=".6" stroke="currentColor" stroke-width="1.5" />
          <text x={12 + i * w + (w - 2) / 2} y={28 + row * 58} text-anchor="middle" class="fig-label" font-size="14" font-weight="700">{c}</text>
          <text x={12 + i * w + (w - 2) / 2} y={49 + row * 58} text-anchor="middle" class="fig-label" font-size="10" opacity=".75">{row * 13 + i}</text>
        </g>
      )))}
      {note && <text x="150" y="134" text-anchor="middle" class="fig-label" font-size="12">{note}</text>}
    </svg>
  );
}

/** A board for movement questions: a number line or a grid. Tap a square, drag the piece, use the arrow keys or the big arrow buttons. */
function BoardFigure({ mode, size, start, steps, ask, alt, onBoard, locked }: Of<"board"> & { onBoard?: (answer: number) => void; locked?: boolean }) {
  const [pos, setPos] = useState<[number, number]>(start);
  const [travelled, setTravelled] = useState(0);
  const dragging = useRef(false), svg = useRef<SVGSVGElement>(null);
  const n = size + 1, line = mode === "line", cols = n, rows = line ? 1 : n, cell = 300 / cols, H = rows * cell + (line ? 40 : 24);
  const valueOf = (p: [number, number]) => (ask === "x" ? p[0] : ask === "y" ? p[1] : Math.abs(p[0] - start[0]) + Math.abs(p[1] - start[1]));
  useEffect(() => { setPos(start); setTravelled(0); }, [start[0], start[1], steps.join()]);
  const moveTo = (to: [number, number], count = true) => {
    if (locked) return;
    const next: [number, number] = [Math.max(0, Math.min(size, to[0])), line ? 0 : Math.max(0, Math.min(size, to[1]))];
    if (next[0] === pos[0] && next[1] === pos[1]) return;
    if (count) setTravelled((t) => t + Math.abs(next[0] - pos[0]) + Math.abs(next[1] - pos[1]));
    setPos(next); onBoard?.(valueOf(next));
  };
  const at = (e: PointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 300, y = ((e.clientY - r.top) / r.height) * H;
    return [Math.floor(x / cell), line ? 0 : size - Math.floor(y / cell)];
  };
  const key = (e: KeyboardEvent) => {
    const d: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }, m = d[e.key];
    if (!m || (line && m[1])) return;
    e.preventDefault(); moveTo([pos[0] + m[0], pos[1] + m[1]]);
  };
  const reset = () => { if (locked) return; setPos(start); setTravelled(0); onBoard?.(valueOf(start)); };
  const X = (x: number) => x * cell, Y = (y: number) => (size - y) * cell;
  const pieceX = X(pos[0]) + cell / 2, pieceY = (line ? 0 : Y(pos[1])) + cell / 2 + (line ? 6 : 0);
  return (
    <div class="board" data-testid="board">
      <ol class="board-steps" aria-label="The instructions">{steps.map((st, i) => <li key={i}><span class="board-step-n">{i + 1}</span>{st}</li>)}</ol>
      <svg ref={svg} class="board-svg" viewBox={`0 0 300 ${H}`} role="group" aria-label={`${alt} Use the arrow keys, the arrow buttons, or tap and drag the piece.`} tabindex={locked ? -1 : 0}
        onKeyDown={key as unknown as (e: KeyboardEvent) => void}
        onPointerDown={(e: PointerEvent) => { if (locked) return; dragging.current = true; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); moveTo(at(e)); }}
        onPointerMove={(e: PointerEvent) => { if (dragging.current) moveTo(at(e)); }}
        onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
        {Array.from({ length: cols * rows }, (_, i) => { const cx = i % cols, cy = line ? 0 : size - Math.floor(i / cols); return <g key={i}><rect x={X(cx) + 1} y={(line ? 0 : Y(cy)) + 1 + (line ? 6 : 0)} width={cell - 2} height={cell - 2} rx="4" fill={cx === start[0] && cy === start[1] ? "#c1c5ee" : "var(--surface)"} stroke="currentColor" stroke-opacity=".3" />{line && <text x={X(cx) + cell / 2} y={cell + 22} text-anchor="middle" class="fig-label" font-size="9">{cx}</text>}</g>; })}
        {!line && Array.from({ length: n }, (_, i) => <g key={i}><text x={X(i) + cell / 2} y={rows * cell + 14} text-anchor="middle" class="fig-label" font-size="9">{i}</text></g>)}
        <text x={X(start[0]) + cell / 2} y={line ? cell + 32 : Y(start[1]) + cell / 2 + 3} text-anchor="middle" font-size="8" opacity=".6" class="fig-label">start</text>
        <g style={{ transform: `translate(${pieceX}px, ${pieceY}px)`, transition: "transform 160ms ease" }}>
          <circle r={Math.max(7, cell * 0.36)} fill="#f6a0bc" stroke="currentColor" stroke-width="2.5" /><circle cx={-cell * 0.1} cy={-cell * 0.05} r="1.8" fill="currentColor" /><circle cx={cell * 0.1} cy={-cell * 0.05} r="1.8" fill="currentColor" />
        </g>
      </svg>
      <p class="board-status" aria-live="polite">The piece is on {line ? `square ${pos[0]}` : `(${pos[0]}, ${pos[1]})`}. Squares moved so far: <strong>{travelled}</strong>.</p>
      {!locked && (
        <div class="board-pad" role="group" aria-label="Move the piece">
          <button type="button" class="btn" aria-label="Move left" onClick={() => moveTo([pos[0] - 1, pos[1]])}>←</button>
          {!line && <button type="button" class="btn" aria-label="Move up" onClick={() => moveTo([pos[0], pos[1] + 1])}>↑</button>}
          {!line && <button type="button" class="btn" aria-label="Move down" onClick={() => moveTo([pos[0], pos[1] - 1])}>↓</button>}
          <button type="button" class="btn" aria-label="Move right" onClick={() => moveTo([pos[0] + 1, pos[1]])}>→</button>
          <button type="button" class="btn small" onClick={reset}>Back to start</button>
        </div>
      )}
    </div>
  );
}
