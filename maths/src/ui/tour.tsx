import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ActivityArt } from "./activity-art";
import { useApp } from "./context";
import { Icon } from "./icons";
import { readPracticeQuestion, stopPracticeNarration } from "./practice-audio";
import { CubeMark } from "./wordmark";

interface Page { id: string; colour: string; title: string; text: string; art: ComponentChildren }

/** A tiny times table grid, drawn with the same colours as the real one. */
const TablesArt = () => (
  <svg class="activity-art tour-art" viewBox="0 0 120 100" aria-hidden="true" focusable="false">
    {Array.from({ length: 5 }, (_, y) => Array.from({ length: 6 }, (_, x) => {
      const n = (x * 5 + y * 3) % 7, fill = n < 2 ? "#8fd3a9" : n < 4 ? "#f6e0a0" : n < 5 ? "#f6b9c6" : "#fff7e4";
      return <rect key={`${x}${y}`} x={8 + x * 17} y={8 + y * 17} width="14" height="14" rx="3.5" fill={fill} stroke="currentColor" stroke-width="2.4" />;
    }))}
  </svg>
);
const IconArt = ({ name }: { name: "bulb" | "lock" | "star" }) => <span class="tour-icon" aria-hidden="true"><Icon name={name} size={84} /></span>;

/** The little buttons under each question, drawn the way they look there, so a child knows them when they see them. */
const HelpersArt = ({ ask }: { ask: boolean }) => (
  <span class="tour-pills" aria-hidden="true">
    <span class="tour-pill"><span class="pill"><Icon name="bulb" size={20} /> Hint</span><small>a clue</small></span>
    <span class="tour-pill"><span class="pill"><Icon name="pencil" size={20} /> Working-out tools</span><small>paper to work on</small></span>
    {ask && <span class="tour-pill"><span class="pill"><Icon name="chat" size={20} /> Ask</span><small>chat to your tutor</small></span>}
  </span>
);

const pagesFor = (name: string, ask: boolean): Page[] => [
  { id: "hello", colour: "#f0be65", title: `Hello, ${name}!`, text: "Let's have a quick look around. It only takes a minute.", art: <span class="tour-icon tour-cube" aria-hidden="true"><CubeMark /></span> },
  { id: "practice", colour: "#f6a0bc", title: "Practice", text: "Tap here to do a few questions. A little every day helps you grow.", art: <ActivityArt kind="practice" /> },
  { id: "skills", colour: "#c1c5ee", title: "Skills", text: "Pick any maths topic you would like to try.", art: <ActivityArt kind="skills" /> },
  { id: "checkup", colour: "#f0be65", title: "Find your level", text: "Answer some questions, and we will find the best place to start.", art: <ActivityArt kind="checkup" /> },
  { id: "tables", colour: "#84d8ba", title: "Times tables", text: "Learn your tables. Each square turns green when you know it.", art: <TablesArt /> },
  { id: "oops", colour: "#f6a0bc", title: "Oops is okay", text: "A mistake just means you are learning. Have a go first!", art: <IconArt name="bulb" /> },
  { id: "helpers", colour: "#f0be65", title: "Little helpers", text: "Stuck? Look at the bottom of the screen. These little buttons are there to help.", art: <HelpersArt ask={ask} /> },
  { id: "grownups", colour: "#c1c5ee", title: "For grown-ups", text: "Grown-ups have a special place with progress and settings. It has a lock for them.", art: <IconArt name="lock" /> },
  { id: "go", colour: "#84d8ba", title: "Ready?", text: "Let's start. You can see this again in Me.", art: <IconArt name="star" /> },
];

/**
 * A short, skippable tour for a new learner: one idea a page, big pictures, short words, and a Read to me button on every page.
 * Written for children from about five. Nothing is mandatory: Skip is always on screen.
 */
export function Tour({ name, onDone }: { name: string; onDone: () => void }) {
  const { profile } = useApp();
  const pages = pagesFor(name, !!profile.tutor?.enabled);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [reading, setReading] = useState(false);
  const [auto, setAuto] = useState(false);
  const page = pages[i], last = i === pages.length - 1;
  const heading = useRef<HTMLHeadingElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const canSpeak = typeof speechSynthesis !== "undefined";

  const read = () => {
    if (!canSpeak) return;
    setReading(true);
    readPracticeQuestion(`${page.title}${/[.!?]$/.test(page.title) ? "" : "."} ${page.text}`, profile.narrationVoice ?? "female", (s) => setReading(s === "loading" || s === "playing" || s === "fallback"));
  };
  const go = (n: number) => {
    if (n < 0 || n >= pages.length) return;
    stopPracticeNarration(); setReading(false);
    setDir(n > i ? "forward" : "back"); setI(n);
  };
  const finish = () => { stopPracticeNarration(); onDone(); };

  useEffect(() => { heading.current?.focus({ preventScroll: true }); if (auto) read(); }, [i]);
  useEffect(() => () => stopPracticeNarration(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1); else if (e.key === "ArrowLeft") go(i - 1); else if (e.key === "Escape") finish();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  return (
    <main class="tour" aria-labelledby="tour-h"
      onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const s = swipe.current; swipe.current = null;
        if (!s) return;
        const dx = e.clientX - s.x, dy = e.clientY - s.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? i + 1 : i - 1);
      }}>
      <div class="tour-top">
        <ol class="tour-dots" aria-label={`Page ${i + 1} of ${pages.length}`}>
          {pages.map((p, n) => <li key={p.id} class={n === i ? "now" : n < i ? "done" : ""} />)}
        </ol>
        <button type="button" class="btn ghost tour-skip" onClick={finish} data-testid="tour-skip">Skip</button>
      </div>

      <div class={`tour-page ${dir}`} key={page.id} data-testid="tour-page">
        <div class="tour-card" style={{ "--tour-colour": page.colour }}>{page.art}</div>
        <h1 id="tour-h" ref={heading} tabIndex={-1}>{page.title}</h1>
        <p class="tour-text">{page.text}</p>
        {canSpeak && (
          <button type="button" class={`btn tour-read${reading ? " on" : ""}`} onClick={read} data-testid="tour-read" aria-label={`Read this page to me`}>
            <Icon name="speaker" size={24} /> Read to me
          </button>
        )}
      </div>

      <div class="tour-bottom">
        <button type="button" class="btn ghost tour-back" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Back"><Icon name="back" size={22} /> Back</button>
        {canSpeak && i === 0 && <label class="tour-auto"><input type="checkbox" checked={auto} onChange={(e) => { const on = (e.target as HTMLInputElement).checked; setAuto(on); if (on) read(); else { stopPracticeNarration(); setReading(false); } }} /> Read every page to me</label>}
        <button type="button" class="btn primary big tour-next" onClick={() => (last ? finish() : go(i + 1))} data-testid="tour-next">{last ? "Let's go!" : "Next"} <Icon name="arrow" size={22} /></button>
      </div>
    </main>
  );
}
