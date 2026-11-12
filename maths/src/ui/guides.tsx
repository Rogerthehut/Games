import { useEffect, useState } from "preact/hooks";
import { useRemembered } from "./memory";
import { CHILD_GUIDE, PARENT_GUIDE, type GuideSection } from "../guides/content";
import { useApp } from "./context";
import { Icon } from "./icons";
import { readPracticeQuestion, stopPracticeNarration } from "./practice-audio";

/** The colours of the sticky notes the tips sit on, in turn. */
const NOTE = ["yellow", "mint", "rose", "peri"] as const;

/**
 * The user guides: one for grown-ups, one to read with a child. Each section opens and closes, and a guide can be printed.
 * With `only`, a single guide is shown on its own, without the switch, for a screen a child can open.
 */
export function Guides({ only }: { only?: "parents" | "children" }) {
  const [saved, setWhich] = useRemembered<"parents" | "children">("device:guides.which", "parents");
  const which = only ?? saved;
  const [printing, setPrinting] = useState(false);
  const { profile } = useApp();
  const [reading, setReading] = useState<string | null>(null);   // the section being read aloud
  const canSpeak = typeof speechSynthesis !== "undefined";
  const guide = which === "parents" ? PARENT_GUIDE : CHILD_GUIDE;
  const stop = () => { stopPracticeNarration(); setReading(null); };
  useEffect(() => stop, []);                                      // leaving the page stops the voice
  useEffect(() => { stop(); }, [which]);
  // when the voice has finished, the button goes back to "Read aloud"
  useEffect(() => {
    if (!reading) return;
    const id = setInterval(() => { if (!speechSynthesis.speaking && !speechSynthesis.pending) setReading(null); }, 700);
    return () => clearInterval(id);
  }, [reading]);
  const read = (s: GuideSection) => {
    if (reading === s.id) { stop(); return; }
    stopPracticeNarration(); setReading(s.id);
    readPracticeQuestion(spokenGuide(s), profile.narrationVoice ?? "female", (status) => { if (status === "idle" || status === "error") setReading((now) => (now === s.id ? null : now)); });
  };

  // print everything open, then put the page back
  useEffect(() => {
    if (!printing) return;
    document.body.classList.add("printing-guide");
    const done = () => { document.body.classList.remove("printing-guide"); setPrinting(false); };
    addEventListener("afterprint", done, { once: true });
    const t = setTimeout(() => window.print(), 80);
    return () => { clearTimeout(t); removeEventListener("afterprint", done); document.body.classList.remove("printing-guide"); };
  }, [printing]);

  return (
    <section class="card guides" aria-labelledby="guides-h">
      <h2 id="guides-h">{only === "children" ? "How quarter works" : "User guides"}</h2>
      {!only && (
        <div class="seg" role="tablist" aria-label="Which guide">
          <button role="tab" aria-selected={which === "parents"} class={which === "parents" ? "on" : ""} onClick={() => setWhich("parents")} data-testid="guide-parents">For parents</button>
          <button role="tab" aria-selected={which === "children"} class={which === "children" ? "on" : ""} onClick={() => setWhich("children")} data-testid="guide-children">For children</button>
        </div>
      )}
      <p class="small muted">{which === "parents" ? "How quarter works, and how to get the most from it." : "Read this together, or on your own. It's short and easy to follow."}</p>
      <div class="guide-actions"><button type="button" class="btn small" onClick={() => setPrinting(true)} data-testid="guide-print"><Icon name="book" size={16} /> Print this guide</button></div>
      <div class="guide-list" data-testid="guide-list">
        {guide.map((s, i) => <GuideBlock key={`${which}-${s.id}`} section={s} open={printing || i === 0} tone={NOTE[i % NOTE.length]} onRead={canSpeak ? () => read(s) : undefined} reading={reading === s.id} />)}
      </div>
    </section>
  );
}

/** A section as words to say: the title, then the text, the steps numbered, and the tips. */
export function spokenGuide(s: GuideSection): string {
  const end = (t: string) => (/[.!?]$/.test(t) ? t : `${t}.`);
  return [end(s.title), ...(s.text ?? []).map(end), ...(s.steps ?? []).map((t, i) => `Step ${i + 1}. ${end(t)}`), ...(s.tips ?? []).map(end)].join(" ");
}

function GuideBlock({ section, open, tone, onRead, reading }: { section: GuideSection; open: boolean; tone: typeof NOTE[number]; onRead?: () => void; reading?: boolean }) {
  return (
    <details class={`guide-block tone-${tone}`} open={open}>
      <summary><span class="guide-icon" aria-hidden="true"><Icon name={section.icon} size={20} /></span>{section.title}</summary>
      {onRead && <button type="button" class={`btn small ghost guide-read${reading ? " on" : ""}`} aria-pressed={reading} onClick={onRead} data-testid={`read-${section.id}`}><Icon name={reading ? "mute" : "speaker"} size={16} /> {reading ? "Stop reading" : "Read aloud"}</button>}
      {section.text?.map((t) => <p key={t}>{t}</p>)}
      {section.steps && <ol class="guide-steps">{section.steps.map((t) => <li key={t}>{t}</li>)}</ol>}
      {section.tips && <ul class="guide-tips">{section.tips.map((t) => <li key={t}>{t}</li>)}</ul>}
    </details>
  );
}

/** The children's guide as a page of its own, reachable from Me without the grown-ups' PIN. */
export function ChildGuidePage({ onBack }: { onBack: () => void }) {
  return (
    <div class="parent child-guide">
      <header class="parent-head">
        <button class="icon-btn" onClick={onBack} aria-label="Back to Me"><Icon name="back" size={22} /></button>
        <div><h1>How quarter works</h1><p class="muted">A quick guide for learners</p></div>
      </header>
      <Guides only="children" />
    </div>
  );
}
