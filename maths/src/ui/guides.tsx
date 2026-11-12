import { useState } from "preact/hooks";
import { CHILD_GUIDE, PARENT_GUIDE, type GuideSection } from "../guides/content";

/** The two user guides: one for grown-ups, one to read with a child. Each section opens and closes. */
export function Guides() {
  const [which, setWhich] = useState<"parents" | "children">("parents");
  const guide = which === "parents" ? PARENT_GUIDE : CHILD_GUIDE;
  return (
    <section class="card guides" aria-labelledby="guides-h">
      <h2 id="guides-h">User guides</h2>
      <div class="seg" role="tablist" aria-label="Which guide">
        <button role="tab" aria-selected={which === "parents"} class={which === "parents" ? "on" : ""} onClick={() => setWhich("parents")} data-testid="guide-parents">For parents</button>
        <button role="tab" aria-selected={which === "children"} class={which === "children" ? "on" : ""} onClick={() => setWhich("children")} data-testid="guide-children">For children</button>
      </div>
      <p class="small muted">{which === "parents" ? "How quarter works, and how to get the most from it." : "Read this together, or hand the device over. It's written to be easy to follow."}</p>
      <div class="guide-list" data-testid="guide-list">
        {guide.map((s, i) => <GuideBlock key={`${which}-${s.id}`} section={s} open={i === 0} />)}
      </div>
    </section>
  );
}

function GuideBlock({ section, open }: { section: GuideSection; open: boolean }) {
  return (
    <details class="guide-block" open={open}>
      <summary>{section.title}</summary>
      {section.text?.map((t) => <p key={t}>{t}</p>)}
      {section.steps && <ol>{section.steps.map((t) => <li key={t}>{t}</li>)}</ol>}
      {section.tips && <ul>{section.tips.map((t) => <li key={t}>{t}</li>)}</ul>}
    </details>
  );
}
