import { useEffect, useRef, useState } from "preact/hooks";

/** A protractor with both scales, centred on the vertex. Drawn on a 300 x 190 sheet. */
const CX = 150, CY = 168, R = 142;
const pt = (a: number, r: number): [number, number] => [Math.round((CX + r * Math.cos((a * Math.PI) / 180)) * 100) / 100, Math.round((CY - r * Math.sin((a * Math.PI) / 180)) * 100) / 100];

export function Scale() {
  const ticks = [];
  for (let a = 0; a <= 180; a++) {
    const len = a % 10 === 0 ? 14 : a % 5 === 0 ? 10 : 5;
    const [x1, y1] = pt(a, R), [x2, y2] = pt(a, R - len);
    ticks.push(<line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" stroke-width={a % 10 === 0 ? 1.1 : 0.6} opacity={a % 10 === 0 ? 0.9 : 0.55} />);
  }
  const labels = [];
  for (let a = 0; a <= 180; a += 10) {
    const [ox, oy] = pt(a, R - 22), [ix, iy] = pt(a, R - 49);
    labels.push(<text key={`o${a}`} x={ox} y={oy + 3} text-anchor="middle" font-size="8.5" class="fig-label">{a}</text>);
    labels.push(<text key={`i${a}`} x={ix} y={iy + 3} text-anchor="middle" font-size="6.5" class="fig-label" opacity=".75">{180 - a}</text>);
  }
  return (
    <g>
      <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY} Z`} fill="#c1c5ee" fill-opacity=".28" stroke="currentColor" stroke-width="1.6" />
      {ticks}{labels}
      <line x1={CX - R - 4} y1={CY} x2={CX + R + 4} y2={CY} stroke="currentColor" stroke-width="1.4" />
    </g>
  );
}

/** An angle drawn with a protractor over it, for reading the size. `from` is the side the first arm points to. */
export function ProtractorFigure({ angle, from, alt }: { angle: number; from: "left" | "right"; alt: string }) {
  const a2 = from === "right" ? angle : 180 - angle;
  const [x2, y2] = pt(a2, R + 6), [bx] = [from === "right" ? CX + R + 6 : CX - R - 6];
  return (
    <svg class="figure figure-wide protractor" viewBox="0 0 300 190" role="img" aria-label={alt}>
      <Scale />
      <line x1={CX} y1={CY} x2={bx} y2={CY} stroke="#c2410c" stroke-width="2.6" stroke-linecap="round" />
      <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="#c2410c" stroke-width="2.6" stroke-linecap="round" />
      <circle cx={CX} cy={CY} r="3.4" fill="currentColor" />
    </svg>
  );
}

/** An angle the learner makes: drag the loose arm (or use the buttons or arrow keys) until it is the size asked for. */
export function AngleDrawFigure({ start, alt, onBoard, locked }: { start: number; alt: string; onBoard?: (answer: number) => void; locked?: boolean }) {
  const [angle, setAngle] = useState(start);
  const svg = useRef<SVGSVGElement>(null), dragging = useRef(false);
  useEffect(() => setAngle(start), [start]);
  const set = (a: number) => {
    if (locked) return;
    const next = Math.max(0, Math.min(180, Math.round(a)));
    if (next === angle) return;
    setAngle(next); onBoard?.(next);
  };
  const fromPointer = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 300 - CX, y = CY - ((e.clientY - r.top) / r.height) * 190;
    set((Math.atan2(y, x) * 180) / Math.PI);
  };
  const [x2, y2] = pt(angle, R + 6);
  return (
    <div class="angle-draw" data-testid="angle-draw">
      <svg ref={svg} class="figure figure-wide protractor" viewBox="0 0 300 190" role="group" tabindex={locked ? -1 : 0}
        aria-label={`${alt} Use the left and right arrow keys, or the buttons, to turn the loose arm. Hold Shift to turn it by 10 degrees. Or drag it.`}
        onKeyDown={(e: KeyboardEvent) => {
          const big = e.shiftKey ? 10 : 1;
          if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); set(angle + big); }
          else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); set(angle - big); }
        }}
        onPointerDown={(e: PointerEvent) => { if (locked) return; dragging.current = true; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); fromPointer(e); }}
        onPointerMove={(e: PointerEvent) => { if (dragging.current) fromPointer(e); }}
        onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
        <Scale />
        <line x1={CX} y1={CY} x2={CX + R + 6} y2={CY} stroke="#c2410c" stroke-width="2.6" stroke-linecap="round" />
        <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="#2563eb" stroke-width="3" stroke-linecap="round" />
        <circle cx={x2} cy={y2} r="9" fill="#2563eb" fill-opacity=".22" stroke="#2563eb" stroke-width="1.6" />
        <circle cx={CX} cy={CY} r="3.4" fill="currentColor" />
      </svg>
      <p class="board-status" aria-live="polite">Your angle: <strong>{angle}°</strong></p>
      {!locked && (
        <div class="board-pad" role="group" aria-label="Turn the loose arm">
          <button type="button" class="btn" aria-label="Smaller by 10 degrees" onClick={() => set(angle - 10)}>−10°</button>
          <button type="button" class="btn" aria-label="Smaller by 1 degree" onClick={() => set(angle - 1)}>−1°</button>
          <button type="button" class="btn" aria-label="Bigger by 1 degree" onClick={() => set(angle + 1)}>+1°</button>
          <button type="button" class="btn" aria-label="Bigger by 10 degrees" onClick={() => set(angle + 10)}>+10°</button>
        </div>
      )}
    </div>
  );
}

/**
 * A grid of 1 cm squares to draw a shape on. A rectangle has one corner to drag; a right-angled triangle has two points, one on each
 * edge. It reports 1 when the shape drawn has the sizes asked for, and 0 when it does not.
 */
export function ShapeDrawFigure({ cols, rows, shape, target, alt, onBoard, locked }: { cols: number; rows: number; shape: "rectangle" | "triangle"; target: [number, number]; alt: string; onBoard?: (answer: number) => void; locked?: boolean }) {
  const [a, setA] = useState<[number, number]>([1, 1]);       // rectangle corner, or [x of the point on the bottom edge, y of the point on the left edge]
  const [which, setWhich] = useState(0);                       // triangle: the point being moved
  const svg = useRef<SVGSVGElement>(null), dragging = useRef(false);
  const cell = Math.min(300 / (cols + 1), 190 / (rows + 1)), left = 24, bottom = 190 - 18;
  const X = (x: number) => left + x * cell, Y = (y: number) => bottom - y * cell;
  useEffect(() => setA([1, 1]), [target[0], target[1], shape]);
  const report = (next: [number, number]) => onBoard?.(next[0] === target[0] && next[1] === target[1] ? 1 : 0);
  const clampTo = (v: number, max: number) => Math.max(1, Math.min(max, Math.round(v)));
  const move = (dx: number, dy: number, which2 = which) => {
    if (locked) return;
    const next: [number, number] = shape === "rectangle" ? [clampTo(a[0] + dx, cols), clampTo(a[1] + dy, rows)]
      : which2 === 0 ? [clampTo(a[0] + dx, cols), a[1]] : [a[0], clampTo(a[1] + dy, rows)];
    if (next[0] === a[0] && next[1] === a[1]) return;
    setA(next); report(next);
  };
  const fromPointer = (e: PointerEvent, pick = false) => {
    const r = svg.current!.getBoundingClientRect();
    const gx = (((e.clientX - r.left) / r.width) * 300 - left) / cell, gy = (bottom - ((e.clientY - r.top) / r.height) * 190) / cell;
    let which2 = which;
    if (pick && shape === "triangle") { which2 = Math.abs(gx - a[0]) + Math.abs(gy) <= Math.abs(gx) + Math.abs(gy - a[1]) ? 0 : 1; setWhich(which2); }
    const want: [number, number] = shape === "rectangle" ? [clampTo(gx, cols), clampTo(gy, rows)] : which2 === 0 ? [clampTo(gx, cols), a[1]] : [a[0], clampTo(gy, rows)];
    if (want[0] !== a[0] || want[1] !== a[1]) { setA(want); report(want); }
  };
  const poly = shape === "rectangle" ? [[0, 0], [a[0], 0], [a[0], a[1]], [0, a[1]]] : [[0, 0], [a[0], 0], [0, a[1]]];
  const handles: [number, number][] = shape === "rectangle" ? [[a[0], a[1]]] : [[a[0], 0], [0, a[1]]];
  return (
    <div class="shape-draw" data-testid="shape-draw">
      <svg ref={svg} class="figure figure-wide" viewBox="0 0 300 190" role="group" tabindex={locked ? -1 : 0}
        aria-label={`${alt} Use the arrow keys or the buttons to move the corner${shape === "triangle" ? "s" : ""}. Or drag.`}
        onKeyDown={(e: KeyboardEvent) => {
          const d: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }, m = d[e.key];
          if (m) { e.preventDefault(); move(m[0], m[1]); }
        }}
        onPointerDown={(e: PointerEvent) => { if (locked) return; dragging.current = true; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); fromPointer(e, true); }}
        onPointerMove={(e: PointerEvent) => { if (dragging.current) fromPointer(e); }}
        onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
        {Array.from({ length: cols + 1 }, (_, i) => <line key={`v${i}`} x1={X(i)} y1={Y(0)} x2={X(i)} y2={Y(rows)} stroke="currentColor" opacity=".2" />)}
        {Array.from({ length: rows + 1 }, (_, i) => <line key={`h${i}`} x1={X(0)} y1={Y(i)} x2={X(cols)} y2={Y(i)} stroke="currentColor" opacity=".2" />)}
        {Array.from({ length: cols + 1 }, (_, i) => i % 2 === 0 && <text key={`x${i}`} x={X(i)} y={bottom + 12} text-anchor="middle" font-size="8" class="fig-label">{i}</text>)}
        {Array.from({ length: rows + 1 }, (_, i) => i % 2 === 0 && <text key={`y${i}`} x={left - 6} y={Y(i) + 3} text-anchor="end" font-size="8" class="fig-label">{i}</text>)}
        <polygon points={poly.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")} fill="#f6a0bc" fill-opacity=".35" stroke="#c2410c" stroke-width="2.2" stroke-linejoin="round" />
        {handles.map(([x, y], i) => <circle key={i} cx={X(x)} cy={Y(y)} r="8" fill="#2563eb" fill-opacity={shape === "triangle" && which !== i ? 0.15 : 0.3} stroke="#2563eb" stroke-width="1.8" />)}
      </svg>
      <p class="board-status" aria-live="polite">{shape === "rectangle" ? <>Width <strong>{a[0]} cm</strong>, height <strong>{a[1]} cm</strong></> : <>Along the bottom <strong>{a[0]} cm</strong>, up the side <strong>{a[1]} cm</strong></>}</p>
      {!locked && (
        <div class="board-pad" role="group" aria-label="Move the corner">
          {shape === "triangle" && <>
            <button type="button" class="btn small" aria-pressed={which === 0} onClick={() => setWhich(0)}>Bottom point</button>
            <button type="button" class="btn small" aria-pressed={which === 1} onClick={() => setWhich(1)}>Side point</button>
          </>}
          {(shape === "rectangle" || which === 0) && <>
            <button type="button" class="btn" aria-label="Shorter across" onClick={() => move(-1, 0)}>←</button>
            <button type="button" class="btn" aria-label="Longer across" onClick={() => move(1, 0)}>→</button>
          </>}
          {(shape === "rectangle" || which === 1) && <>
            <button type="button" class="btn" aria-label="Shorter up" onClick={() => move(0, -1)}>↓</button>
            <button type="button" class="btn" aria-label="Taller" onClick={() => move(0, 1)}>↑</button>
          </>}
        </div>
      )}
    </div>
  );
}
