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


/** The nearest ancestor that scrolls by itself, or null when the whole page scrolls. */
function scrollerOf(el: HTMLElement | null): HTMLElement | null {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY;
    if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight + 1) return n;
  }
  return null;
}

/**
 * "Scroll for more": a small pill that appears while a page carries on below the screen and goes when the end is reached.
 * Put it last inside the page. It sticks to the bottom of the visible area, clear of the tab bar.
 */
export function MoreBelow() {
  const anchor = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const update = () => {
      const sc = scrollerOf(anchor.current?.parentElement ?? null);
      const doc = document.scrollingElement ?? document.documentElement;
      const remaining = sc ? sc.scrollHeight - sc.clientHeight - sc.scrollTop : doc.scrollHeight - innerHeight - doc.scrollTop;
      setMore(remaining > 60);
    };
    const watch = new ResizeObserver(update);
    watch.observe(document.body);
    if (anchor.current?.parentElement) watch.observe(anchor.current.parentElement);
    document.addEventListener("scroll", update, { capture: true, passive: true });
    addEventListener("resize", update);
    update();
    const soon = setTimeout(update, 400); // pages that fade in or load a little late
    return () => { watch.disconnect(); document.removeEventListener("scroll", update, true); removeEventListener("resize", update); clearTimeout(soon); };
  });
  const down = () => {
    const sc = scrollerOf(anchor.current?.parentElement ?? null);
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    if (sc) sc.scrollBy({ top: sc.clientHeight * 0.75, behavior }); else scrollBy({ top: innerHeight * 0.75, behavior });
  };
  return (
    <div class="more-below" ref={anchor}>
      {more && <button type="button" class="more-cue" onClick={down} data-testid="more-below">Scroll for more <Icon name="chevron" size={18} /></button>}
    </div>
  );
}
