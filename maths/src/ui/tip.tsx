import { useEffect, useRef, useState } from "preact/hooks";
import { Icon, type IconName } from "./icons";

/**
 * An icon-only button that says what it is. The label shows at once when a mouse rests on it or the keyboard reaches it, and on a
 * touch screen when it's pressed and held (the tap itself still does the thing). Screen readers always get the label.
 */
export function TipButton({ icon, label, onClick, testId, size = 22, class: cls = "icon-btn" }: { icon: IconName; label: string; onClick: () => void; testId?: string; size?: number; class?: string }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(), hide = useRef<ReturnType<typeof setTimeout>>();
  const held = useRef(false);
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(hide.current); }, []);
  const flash = () => { held.current = true; setShow(true); clearTimeout(hide.current); hide.current = setTimeout(() => { setShow(false); held.current = false; }, 2200); };
  return (
    <span class="tip-wrap">
      <button type="button" class={cls} aria-label={label} data-testid={testId}
        onClick={() => { if (held.current) { held.current = false; return; } /* a long press showed the label; it isn't a tap */ setShow(false); onClick(); }}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") setShow(true); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setShow(false); }}
        onPointerDown={(e) => { if (e.pointerType !== "mouse") { clearTimeout(timer.current); timer.current = setTimeout(flash, 450); } }}
        onPointerUp={() => clearTimeout(timer.current)} onPointerCancel={() => clearTimeout(timer.current)}
        onContextMenu={(e) => e.preventDefault()}
        onFocus={(e) => { if ((e.currentTarget as HTMLElement).matches(":focus-visible")) setShow(true); }} onBlur={() => setShow(false)}
        onKeyDown={(e) => { if (e.key === "Escape") setShow(false); }}>
        <Icon name={icon} size={size} />
      </button>
      <span class={`tip${show ? " on" : ""}`} role="tooltip" aria-hidden="true">{label}</span>
    </span>
  );
}
