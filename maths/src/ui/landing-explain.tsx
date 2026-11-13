import { useEffect, useMemo, useRef, useState } from "preact/hooks";

/**
 * "See how quarter explains tricky problems": a quiet, self-playing panel on the marketing page that draws three worked examples step by step (taking away
 * with an exchange, adding fractions, sharing with a bus stop), the way the app shows the method under every answer. Nothing to click.
 * It moves only position and opacity, plays only while on screen, can be paused, and stands still for people who prefer reduced motion.
 */
interface Frame { caption: string; svg: preact.JSX.Element }
interface Scene { id: string; title: string; frames: Frame[]; alt: string }

const INK = "#121522", INDIGO = "#2f3a73", TEAL = "#2fb28a", PINK = "#d8557f", ORANGE = "#c2410c";
const txt = { "text-anchor": "middle", "font-family": "'Figtree Variable', system-ui, sans-serif", "font-weight": 800 } as const;

// ---------------------------------------------------------------------------------------------- scene 1: taking away, with an exchange (342 - 158)
function takeAway(): Scene {
  const top = [3, 4, 2], low = [1, 5, 8], cur = [...top], N = 3, cx = (i: number) => 84 + i * 56;
  type Mark = { was: number; now: number };
  const marks: (Mark | null)[] = [null, null, null], result: (number | null)[] = [null, null, null];
  const names = ["ones", "tens", "hundreds"], units = ["one", "ten", "hundred"];
  const stage = (shown: number) => {
    const m = marks.map((x) => (x ? { ...x } : null)), r = [...result];
    return (
      <svg viewBox="0 0 260 190" class="ex-svg" aria-hidden="true">
        {["H", "T", "O"].map((h, i) => <text key={h} x={cx(i)} y="16" {...txt} font-size="12" fill={INDIGO} opacity=".55">{h}</text>)}
        {top.map((d, i) => (
          <g key={i}>
            <text x={cx(i)} y="84" {...txt} font-size="34" fill={INK}>{d}</text>
            {m[i] && <line key={`s${i}-${m[i]!.now}`} class="ex-in" x1={cx(i) - 13} y1="74" x2={cx(i) + 13} y2="74" stroke={ORANGE} stroke-width="3" />}
            {m[i] && <text key={`m${i}-${m[i]!.now}`} class="ex-pop" x={cx(i) - (m[i]!.now > 9 ? 4 : 0)} y="46" {...txt} font-size="22" fill={ORANGE}>{m[i]!.now}</text>}
          </g>
        ))}
        {low.map((d, i) => <text key={i} x={cx(i)} y="126" {...txt} font-size="34" fill={INK}>{d}</text>)}
        <text x="26" y="126" {...txt} font-size="32" fill={INK}>−</text>
        <line x1="34" y1="140" x2="226" y2="140" stroke={INK} stroke-width="3.5" stroke-linecap="round" />
        {r.map((d, i) => d !== null && <text key={`r${i}-${shown}`} class="ex-pop" x={cx(i)} y="178" {...txt} font-size="36" fill={TEAL}>{d}</text>)}
      </svg>
    );
  };
  const frames: Frame[] = [{ caption: "Line the digits up: ones under ones, tens under tens.", svg: stage(0) }];
  for (let k = 0; k < N; k++) {
    const i = N - 1 - k;
    if (cur[i] < low[i]) {
      let j = i - 1; while (j >= 0 && cur[j] === 0) j--;
      cur[j]--; cur[i] += 10;
      marks[j] = { was: top[j], now: cur[j] }; marks[i] = { was: top[i], now: cur[i] };
      frames.push({ caption: `${top[i]} is too small to take away ${low[i]}, so swap 1 ${units[k + 1]} for 10 ${names[k]}.`, svg: stage(frames.length) });
    }
    result[i] = cur[i] - low[i];
    frames.push({ caption: `${cur[i]} − ${low[i]} = ${result[i]}`, svg: stage(frames.length) });
  }
  frames.push({ caption: "342 − 158 = 184. Every step is shown, so a child can see why.", svg: stage(frames.length) });
  return { id: "subtract", title: "Taking away", frames, alt: "Subtracting 158 from 342 in columns: swap a ten for ten ones, then a hundred for ten tens, then take away each column to get 184." };
}

// ---------------------------------------------------------------------------------------------- scene 2: adding fractions (1/2 + 1/4)
function fractions(): Scene {
  const W = 220, X = 20, bar = (y: number, parts: number, shaded: number, color: string, from = 0, label: string, key: string) => (
    <g key={key} class="ex-in">
      {Array.from({ length: parts }, (_, i) => <rect key={i} x={X + (W / parts) * i} y={y} width={W / parts} height="30" rx="3" fill={i >= from && i < from + shaded ? color : "#fff"} fill-opacity={i >= from && i < from + shaded ? 0.85 : 1} stroke={INK} stroke-width="2.5" />)}
      <text x={X + W + 10} y={y + 21} text-anchor="start" font-family="'Figtree Variable', system-ui, sans-serif" font-weight="800" font-size="15" fill={INK}>{label}</text>
    </g>
  );
  const stage = (n: number) => (
    <svg viewBox="0 0 260 190" class="ex-svg" aria-hidden="true">
      {n >= 0 && bar(14, 2, 1, TEAL, 0, "½", "a")}
      {n >= 1 && bar(56, 4, 2, TEAL, 0, "2⁄4", "b")}
      {n >= 2 && bar(98, 4, 1, PINK, 0, "¼", "c")}
      {n >= 3 && bar(150, 4, 3, INDIGO, 0, "¾", "d")}
      {n >= 3 && <text x="130" y="144" {...txt} font-size="12" fill={INDIGO} class="ex-pop">together</text>}
    </svg>
  );
  return {
    id: "fractions", title: "Adding fractions", alt: "A half bar, shown as two quarters, then one more quarter added, makes three quarters.",
    frames: [
      { caption: "Start with a half.", svg: stage(0) },
      { caption: "Cut it into quarters: a half is the same as 2 quarters.", svg: stage(1) },
      { caption: "Now add one more quarter.", svg: stage(2) },
      { caption: "½ + ¼ = ¾. You can see why it works.", svg: stage(3) },
    ],
  };
}

// ---------------------------------------------------------------------------------------------- scene 3: sharing with a bus stop (156 ÷ 4)
function busStop(): Scene {
  const cx = (i: number) => 90 + i * 52;
  const stage = (n: number) => (
    <svg viewBox="0 0 260 150" class="ex-svg" aria-hidden="true">
      <text x="48" y="96" {...txt} font-size="34" fill={INK}>4</text>
      <path d="M64 108V58H236" fill="none" stroke={INK} stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
      {[1, 5, 6].map((d, i) => <text key={i} x={cx(i)} y="96" {...txt} font-size="34" fill={INK}>{d}</text>)}
      {n >= 1 && <text key="c1" class="ex-pop" x={cx(1) - 18} y="72" {...txt} font-size="17" fill={ORANGE}>1</text>}
      {n >= 2 && <text key="q1" class="ex-pop" x={cx(1)} y="46" {...txt} font-size="34" fill={TEAL}>3</text>}
      {n >= 2 && <text key="c2" class="ex-pop" x={cx(2) - 18} y="72" {...txt} font-size="17" fill={ORANGE}>3</text>}
      {n >= 3 && <text key="q2" class="ex-pop" x={cx(2)} y="46" {...txt} font-size="34" fill={TEAL}>9</text>}
    </svg>
  );
  return {
    id: "share", title: "Sharing equally", alt: "Dividing 156 by 4 with a bus stop: 1 doesn't go into 4, carry it; 15 divided by 4 is 3 remainder 3; 36 divided by 4 is 9. The answer is 39.",
    frames: [
      { caption: "156 ÷ 4: work along the digits from the left.", svg: stage(0) },
      { caption: "1 ÷ 4 doesn't go, so carry the 1 to make 15.", svg: stage(1) },
      { caption: "15 ÷ 4 = 3, and 3 is left over. Carry the 3 to make 36.", svg: stage(2) },
      { caption: "36 ÷ 4 = 9. So 156 ÷ 4 = 39.", svg: stage(3) },
    ],
  };
}

const FRAME_MS = 1500, HOLD = 2;

export function ExplainCard({ onStart }: { onStart(kind: "sign-up" | "sign-in"): void }) {
  const scenes = useMemo(() => [takeAway(), fractions(), busStop()], []);
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [scene, setScene] = useState(0);
  const [frame, setFrame] = useState(reduced ? scenes[0].frames.length - 1 : 0);
  const [playing, setPlaying] = useState(!reduced);
  const [live, setLive] = useState(false);
  const hold = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current; if (!el || typeof IntersectionObserver === "undefined") { setLive(true); return; }
    const io = new IntersectionObserver((es) => setLive(es.some((e) => e.isIntersecting)), { threshold: 0.25 });
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || !live) return;
    const id = setInterval(() => {
      const last = scenes[scene].frames.length - 1;
      if (frame < last) { setFrame(frame + 1); hold.current = 0; return; }
      if (++hold.current <= HOLD) return;
      hold.current = 0; setScene((scene + 1) % scenes.length); setFrame(0);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [playing, live, scene, frame, scenes]);

  const s = scenes[scene], f = s.frames[Math.min(frame, s.frames.length - 1)];
  const go = (i: number) => { hold.current = 0; setScene(i); setFrame(reduced ? scenes[i].frames.length - 1 : 0); };
  return (
    <div class={`ex-card${live ? "" : " ex-off"}`} ref={box} data-testid="explain-card">
      <div class="ex-head">
        <p class="ex-kicker">06 / Explained</p>
        <h3 class="ex-title">See how quarter explains tricky problems</h3>
        <p class="ex-sub">Every answer comes with the method drawn out step by step, so your child learns why it works, not just what the answer is.</p>
      </div>
      <div class="ex-stage" role="img" aria-label={s.alt}>
        <div class="ex-scene" key={`${s.id}-${scene}`}>{f.svg}</div>
        <span class="ex-chip">{s.title}</span>
      </div>
      <p class="ex-caption" data-testid="explain-caption" key={`${scene}-${frame}`}>{f.caption}</p>
      <div class="ex-controls">
        <div class="ex-dots" role="group" aria-label="Examples">
          {scenes.map((x, i) => <button key={x.id} type="button" class={`ex-dot${i === scene ? " on" : ""}`} aria-label={`Show: ${x.title}`} aria-pressed={i === scene} onClick={() => go(i)} data-testid={`explain-dot-${x.id}`} />)}
        </div>
        <div class="ex-progress" aria-hidden="true"><i style={{ transform: `scaleX(${(frame + 1) / s.frames.length})` }} /></div>
        <button type="button" class="ex-pause" aria-pressed={!playing} aria-label={playing ? "Pause the examples" : "Play the examples"} onClick={() => setPlaying(!playing)} data-testid="explain-pause">{playing ? "❚❚" : "▶"}</button>
      </div>
      <button type="button" class="ex-go" onClick={() => onStart("sign-up")}>Every topic, Year 3 to Year 13<span aria-hidden="true">↗</span></button>
      <ul class="sr">{scenes.map((x) => <li key={x.id}>{x.title}: {x.alt}</li>)}</ul>
    </div>
  );
}
