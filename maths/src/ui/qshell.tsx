import type { ComponentChildren } from "preact";
import { Icon } from "./icons";

/** The top of every question screen: a close button, how far through you are, and an optional extra on the right. */
export function QTop({ onClose, closeLabel, index, total, right }: { onClose: () => void; closeLabel: string; index: number; total: number; right?: ComponentChildren }) {
  const pct = Math.round((index / total) * 100);
  return (
    <div class="qtop">
      <button class="icon-btn" onClick={onClose} aria-label={closeLabel} data-testid="close"><Icon name="x" size={22} /></button>
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
export function QBar({ left, right }: { left?: ComponentChildren; right: ComponentChildren }) {
  return (
    <div class="qbar"><div class="qbar-in"><div class="qbar-left">{left}</div><div class="qbar-right">{right}</div></div></div>
  );
}
