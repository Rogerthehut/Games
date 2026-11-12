import { useEffect, useState } from "preact/hooks";
import { useApp } from "./context";
import { ParentGate, parentUnlocked } from "./gate";
import { Icon } from "./icons";

/**
 * The Parents' area entry at the bottom of the left-hand panel: a small padlock that stays shut until it's tapped. It then opens the
 * sum and PIN in place, and after them takes the grown-up into the Parents' area in the main panel.
 */
export function RailParents({ tab }: { tab: string }) {
  const { go } = useApp();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [tab]); // moving to another screen closes it
  const toggle = () => { if (parentUnlocked()) go({ name: "parent" }); else setOpen(!open); };
  return (
    <div class={`rail-parents${open ? " open" : ""}`}>
      {open && (
        <div class="rail-gate" id="rail-gate">
          <ParentGate embedded onCancel={() => setOpen(false)} onPass={() => { setOpen(false); go({ name: "parent" }); }} />
        </div>
      )}
      <button type="button" class="rail-lock" aria-expanded={open} aria-controls={open ? "rail-gate" : undefined} onClick={toggle} data-testid="rail-parents">
        <Icon name="lock" size={18} /><span>Parents' area</span><Icon name="chevron" size={16} class="rail-lock-chev" />
      </button>
    </div>
  );
}
