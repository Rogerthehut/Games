import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./icons";

/** The top of every question screen: a close button, how far through you are, and an optional extra on the right. */
export function QTop({ onClose, closeLabel, closeText, index, total, right }: { onClose: () => void; closeLabel: string; closeText?: string; index: number; total: number; right?: ComponentChildren }) {
  const pct = Math.round((index / total) * 100);
  return (
    <div class="qtop">
      <button class={closeText ? "btn ghost save-activity" : "icon-btn"} onClick={onClose} aria-label={closeLabel} data-testid="close">{closeText ?? <Icon name="x" size={22} />}</button>
      {total <= 12 ? (
        <ol class="segs" role="progressbar" aria-valuenow={index} aria-valuemin={0} aria-valuemax={total} aria-label="Progress">
          {Array.from({ length: total }, (_, i) => <li key={i} class={i < index ? "done" : i === index ? "now" : ""} />)}
        </ol>
      ) : (
        <div class="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress"><i style={{ width: `${pct}%` }} /></div>
      )}
      <div class="qtop-right">{right ?? <span class="count">{Math.min(index + 1, total)}/{total}</span>}</div>
    </div>
  );
}

/** Sticky actions at the bottom, where a thumb is. */
export function QBar({ left, right, help = false }: { left?: ComponentChildren; right?: ComponentChildren; help?: boolean }) {
  const bar = useRef<HTMLDivElement>(null);
  const scrollBody = useRef<HTMLElement | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [moreBelow, setMoreBelow] = useState(false);

  useEffect(() => {
    const body = bar.current?.parentElement?.querySelector<HTMLElement>(":scope > .qbody");
    if (!body) return;
    scrollBody.current = body;
    const panel = body.querySelector<HTMLElement>("#question-tools");
    setHelpOpen(!!panel && !panel.hidden);
    const update = () => {
      const style = getComputedStyle(body);
      const remaining = body.scrollHeight - body.clientHeight - body.scrollTop - parseFloat(style.paddingBottom);
      setMoreBelow(style.overflowY === "auto" && remaining > 4);
    };
    const resize = new ResizeObserver(update);
    resize.observe(body);
    Array.from(body.children).forEach((child) => resize.observe(child));
    body.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      resize.disconnect();
      body.removeEventListener("scroll", update);
      scrollBody.current = null;
    };
  });

  function scrollDown() {
    const body = scrollBody.current;
    if (!body) return;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    body.scrollBy({ top: body.clientHeight * 0.75, behavior: reduceMotion ? "instant" : "smooth" });
  }

  function toggleHelp() {
    const panel = scrollBody.current?.querySelector<HTMLElement>("#question-tools");
    if (!panel) return;
    const opening = panel.hidden;
    panel.hidden = !opening;
    setHelpOpen(opening);
    if (opening) {
      panel.focus({ preventScroll: true });
      const desk = panel.closest(".question-desk");
      if (!desk || getComputedStyle(desk).display !== "grid") {
        panel.scrollIntoView({ block: "start", behavior: "instant" });
      }
    }
  }

  return (
    <div class="qbar" ref={bar}>
      {moreBelow && <button type="button" class="qbar-more" onClick={scrollDown}>Scroll for more <Icon name="chevron" size={18} /></button>}
      <div class="qbar-in">
        <div class="qbar-left">
          {left}
          {help && <button type="button" class="btn ghost" aria-controls="question-tools" aria-expanded={helpOpen} onClick={toggleHelp}><Icon name="pencil" size={20} /> <span class="lbl-long">{helpOpen ? "Hide tools" : "Working-out tools"}</span><span class="lbl-short">{helpOpen ? "Hide" : "Tools"}</span></button>}
        </div>
        <div class="qbar-right">
          {right}
        </div>
      </div>
    </div>
  );
}
