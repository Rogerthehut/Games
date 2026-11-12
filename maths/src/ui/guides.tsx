import { useEffect, useState } from "preact/hooks";
import { CHILD_GUIDE, PARENT_GUIDE, type GuideSection } from "../guides/content";
import { Icon } from "./icons";

/** The colours of the sticky notes the tips sit on, in turn. */
const NOTE = ["yellow", "mint", "rose", "peri"] as const;

/**
 * The user guides: one for grown-ups, one to read with a child. Each section opens and closes, and a guide can be printed.
 * With `only`, a single guide is shown on its own, without the switch, for a screen a child can open.
 */
export function Guides({ only }: { only?: "parents" | "children" }) {
  const [which, setWhich] = useState<"parents" | "children">(only ?? "parents");
  const [printing, setPrinting] = useState(false);
  const guide = which === "parents" ? PARENT_GUIDE : CHILD_GUIDE;

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
        {guide.map((s, i) => <GuideBlock key={`${which}-${s.id}`} section={s} open={printing || i === 0} tone={NOTE[i % NOTE.length]} />)}
      </div>
    </section>
  );
}

function GuideBlock({ section, open, tone }: { section: GuideSection; open: boolean; tone: typeof NOTE[number] }) {
  return (
    <details class={`guide-block tone-${tone}`} open={open}>
      <summary><span class="guide-icon" aria-hidden="true"><Icon name={section.icon} size={20} /></span>{section.title}</summary>
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
