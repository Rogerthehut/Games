import { useEffect, useState } from "preact/hooks";
import type { ShapeKind } from "../engine/little";

/** Sound for the Little ones activities: a soft blip that goes up with each number, and a gentle voice. Both can be switched off with the speaker button. */
const KEY = "quarter.littleSound";
let audio: AudioContext | null = null;
export const littleSoundOn = (): boolean => { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } };
export function setLittleSound(on: boolean) { try { if (on) localStorage.removeItem(KEY); else localStorage.setItem(KEY, "off"); } catch { /* private mode */ } if (!on) stopSpeaking(); }
export function stopSpeaking() { try { speechSynthesis?.cancel(); } catch { /* no speech */ } }
export function blip(step = 0, kind: "tap" | "win" | "oops" = "tap") {
  if (!littleSoundOn()) return;
  try {
    audio ??= new (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = audio.currentTime, notes = kind === "win" ? [523, 659, 784, 1047] : kind === "oops" ? [260, 220] : [392 * Math.pow(1.122, step % 12)];
    notes.forEach((f, i) => {
      const o = audio!.createOscillator(), g = audio!.createGain(); o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.11); g.gain.exponentialRampToValueAtTime(0.16, now + i * 0.11 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.11 + 0.28);
      o.connect(g).connect(audio!.destination); o.start(now + i * 0.11); o.stop(now + i * 0.11 + 0.3);
    });
  } catch { /* no audio */ }
}
export function say(text: string) {
  if (!littleSoundOn()) return;
  try { stopSpeaking(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-GB"; u.rate = 0.85; u.pitch = 1.25; speechSynthesis.speak(u); } catch { /* no speech */ }
}
export const buzz = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* no vibration */ } };

/** A burst of coloured dots, for finishing something. */
export function Burst() {
  const dots = Array.from({ length: 22 }, (_, i) => i);
  return <div class="little-burst" aria-hidden="true">{dots.map((i) => <i key={i} style={{ "--a": `${(i / dots.length) * 360}deg`, "--d": `${70 + (i % 4) * 22}px`, "--c": ["#f5dc63", "#f782a9", "#8294e9", "#4cc6a7"][i % 4], animationDelay: `${(i % 5) * 20}ms` } as never} />)}</div>;
}

export function usePlaying(): [boolean, () => void] { const [on, setOn] = useState(littleSoundOn); useEffect(() => stopSpeaking, []); return [on, () => { setLittleSound(!on); setOn(!on); }]; }

export type Critter = "star" | "duck" | "apple" | "fish" | "ball" | "biscuit" | "lemon" | "strawberry" | "cherry" | "flower";
/** A friendly drawn thing to count: 60 x 60. */
export function CritterArt({ kind }: { kind: Critter }) {
  const eyes = <><circle cx="24" cy="26" r="3" fill="#121522" /><circle cx="38" cy="26" r="3" fill="#121522" /></>;
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" aria-hidden="true">
      {kind === "star" && <><path d="M30 5l7 16 17 2-13 12 4 17-15-9-15 9 4-17L6 23l17-2z" fill="#f5dc63" stroke="#d9a400" stroke-width="2" stroke-linejoin="round" />{eyes}<path d="M26 35q4 4 8 0" stroke="#121522" stroke-width="2" fill="none" stroke-linecap="round" /></>}
      {kind === "duck" && <><circle cx="30" cy="32" r="20" fill="#f5dc63" />{eyes}<path d="M24 36q6 7 12 0l-6-4z" fill="#f08a3c" /><path d="M22 14q8-8 16 0" fill="#f5dc63" /></>}
      {kind === "apple" && <><circle cx="30" cy="34" r="20" fill="#ef6f6c" /><path d="M30 14q2-8 9-8-1 8-9 8z" fill="#4cc6a7" /><path d="M30 14v6" stroke="#7a4a2a" stroke-width="3" stroke-linecap="round" /><circle cx="24" cy="30" r="3" fill="#121522" /><circle cx="37" cy="30" r="3" fill="#121522" /><path d="M26 39q4 4 8 0" stroke="#121522" stroke-width="2" fill="none" stroke-linecap="round" /></>}
      {kind === "fish" && <><ellipse cx="28" cy="30" rx="20" ry="14" fill="#8294e9" /><path d="M46 30l12-12v24z" fill="#8294e9" /><circle cx="18" cy="26" r="3" fill="#fff" /><circle cx="18" cy="26" r="1.5" fill="#121522" /><path d="M22 38q5 3 9 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" /></>}
      {kind === "ball" && <><circle cx="30" cy="30" r="22" fill="#f782a9" /><path d="M10 22q20 10 40 0M10 40q20-10 40 0" stroke="#fff" stroke-width="3" fill="none" /></>}
      {kind === "lemon" && <><path d="M8 32Q10 14 30 12Q50 14 52 32Q50 50 30 52Q10 50 8 32z" fill="#f5dc63" stroke="#d9a400" stroke-width="2" /><path d="M6 32L11 30M54 32L49 34" stroke="#d9a400" stroke-width="3" stroke-linecap="round" /><path d="M30 12Q34 5 42 6Q38 12 30 12z" fill="#4cc6a7" />{eyes}<path d="M26 38q4 4 8 0" stroke="#121522" stroke-width="2" fill="none" stroke-linecap="round" /></>}
      {kind === "strawberry" && <><path d="M30 54Q8 40 10 22Q14 12 30 14Q46 12 50 22Q52 40 30 54z" fill="#ef4f5f" stroke="#b32d3d" stroke-width="2" /><path d="M16 14Q30 6 44 14Q30 20 16 14z" fill="#4cc6a7" /><circle cx="22" cy="28" r="1.6" fill="#fff6c8" /><circle cx="38" cy="28" r="1.6" fill="#fff6c8" /><circle cx="30" cy="40" r="1.6" fill="#fff6c8" /><circle cx="24" cy="38" r="1.4" fill="#fff6c8" />{eyes}</>}
      {kind === "cherry" && <><path d="M20 38Q24 12 40 8M40 38Q38 14 40 8" stroke="#4a8a3a" stroke-width="2.5" fill="none" stroke-linecap="round" /><circle cx="20" cy="42" r="11" fill="#d62f4a" stroke="#9c1f35" stroke-width="2" /><circle cx="42" cy="42" r="11" fill="#d62f4a" stroke="#9c1f35" stroke-width="2" /><circle cx="17" cy="38" r="2.4" fill="#fff" opacity=".7" /><circle cx="39" cy="38" r="2.4" fill="#fff" opacity=".7" /></>}
      {kind === "flower" && <><g fill="#f782a9" stroke="#c94f7c" stroke-width="1.5"><circle cx="30" cy="14" r="9" /><circle cx="46" cy="26" r="9" /><circle cx="40" cy="44" r="9" /><circle cx="20" cy="44" r="9" /><circle cx="14" cy="26" r="9" /></g><circle cx="30" cy="31" r="9" fill="#f5dc63" stroke="#d9a400" stroke-width="1.5" /></>}
      {kind === "biscuit" && <><circle cx="30" cy="30" r="22" fill="#e3b26a" stroke="#c28a3d" stroke-width="2" /><circle cx="22" cy="24" r="3" fill="#7a4a2a" /><circle cx="36" cy="22" r="3" fill="#7a4a2a" /><circle cx="26" cy="38" r="3" fill="#7a4a2a" /><circle cx="38" cy="36" r="3" fill="#7a4a2a" /></>}
    </svg>
  );
}

export const SHAPE_NAME: Record<ShapeKind, string> = { circle: "circle", square: "square", triangle: "triangle", star: "star", rectangle: "rectangle", oval: "oval", diamond: "diamond", heart: "heart", pentagon: "pentagon", hexagon: "hexagon", octagon: "octagon", semicircle: "semicircle", crescent: "crescent moon", cross: "cross", trapezium: "trapezium" };
export function ShapeArt({ kind, colour, outline }: { kind: ShapeKind; colour: string; outline?: boolean }) {
  const p = outline ? { fill: "#00000010", stroke: "#8a87a0", "stroke-width": 3, "stroke-dasharray": "5 5" } : { fill: colour, stroke: "#121522", "stroke-width": 2.5 };
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" aria-hidden="true" stroke-linejoin="round">
      {kind === "circle" && <circle cx="30" cy="30" r="24" {...p} />}
      {kind === "square" && <rect x="8" y="8" width="44" height="44" rx="4" {...p} />}
      {kind === "triangle" && <path d="M30 6L55 52H5z" {...p} />}
      {kind === "star" && <path d="M30 4l8 17 18 2-14 13 4 18-16-10-16 10 4-18L4 23l18-2z" {...p} />}
      {kind === "rectangle" && <rect x="4" y="14" width="52" height="32" rx="3" {...p} />}
      {kind === "oval" && <ellipse cx="30" cy="30" rx="26" ry="16" {...p} />}
      {kind === "diamond" && <path d="M30 4L54 30L30 56L6 30z" {...p} />}
      {kind === "heart" && <path d="M30 54C8 38 2 24 12 14C20 7 28 10 30 18C32 10 40 7 48 14C58 24 52 38 30 54z" {...p} />}
      {kind === "pentagon" && <path d="M30 5L55 23L46 53H14L5 23z" {...p} />}
      {kind === "hexagon" && <path d="M16 8H44L57 30L44 52H16L3 30z" {...p} />}
      {kind === "octagon" && <path d="M20 4H40L56 20V40L40 56H20L4 40V20z" {...p} />}
      {kind === "semicircle" && <path d="M5 42A25 25 0 0 1 55 42z" {...p} />}
      {kind === "crescent" && <path d="M40 6A26 26 0 1 0 40 54A20 20 0 1 1 40 6z" {...p} />}
      {kind === "cross" && <path d="M22 4H38V22H56V38H38V56H22V38H4V22H22z" {...p} />}
      {kind === "trapezium" && <path d="M16 12H44L56 48H4z" {...p} />}
    </svg>
  );
}
