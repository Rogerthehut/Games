import { useEffect, useRef, useState } from "preact/hooks";
import { Avatar } from "./avatar";
import { useApp } from "./context";
import { ParentGate, parentUnlocked } from "./gate";
import { Icon } from "./icons";
import { KidPinGate, needsKidPin } from "./kid-pin";
import type { Profile } from "../engine/progress";
import { ProfileHi } from "./profile-hi";

/**
 * The learner card at the bottom of the left-hand panel. It shows who is using this screen, and opens a list to switch to another
 * learner on the account (asking for their PIN if a grown-up has given them one), to open Me and its settings, or to add someone.
 */
export function RailSwitcher({ tab }: { tab: string }) {
  const { profile, profiles, switchTo, go } = useApp();
  const [open, setOpen] = useState(false);
  const [kidGate, setKidGate] = useState<Profile | null>(null);
  const [addGate, setAddGate] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const choose = (p: Profile) => {
    setOpen(false);
    if (p.id === profile.id) return;
    if (needsKidPin(p.id)) setKidGate(p); else switchTo(p.id);
  };

  return (
    <div class="rail-switch" ref={box}>
      {open && (
        <ul class="rail-switch-list" role="menu" aria-label="Who's learning" data-testid="rail-switch-list">
          {profiles.map((p) => (
            <li key={p.id} role="none">
              <button role="menuitemradio" aria-checked={p.id === profile.id} class={`rail-switch-row${p.id === profile.id ? " current" : ""}`} onClick={() => choose(p)} data-testid={`rail-switch-${p.id}`}>
                <Avatar choice={p.avatar} year={p.year} size={30} /><span class="rail-switch-label">{p.name}<small>Year {p.year}</small></span>
                {p.id === profile.id && <Icon name="check" size={16} />}
              </button>
            </li>
          ))}
          <li role="none"><button role="menuitem" class="rail-switch-row plain" onClick={() => { setOpen(false); go({ name: "me" }); }} data-testid="rail-open-me"><Icon name="user" size={20} /><span class="rail-switch-label">Me and settings</span></button></li>
          <li role="none"><button role="menuitem" class="rail-switch-row plain" onClick={() => { setOpen(false); if (parentUnlocked()) go({ name: "onboard" }); else setAddGate(true); }} data-testid="rail-add-learner"><Icon name="plus" size={20} /><span class="rail-switch-label">Add someone, or change year</span></button></li>
        </ul>
      )}
      <button class="rail-me" aria-expanded={open} aria-haspopup="menu" aria-current={tab === "me" ? "page" : undefined} onClick={() => setOpen(!open)} aria-label={`${profile.name}, switch learner`} data-testid="rail-me">
        <Avatar choice={profile.avatar} year={profile.year} size={36} />
        <span><ProfileHi /><strong>{profile.name}</strong><small>Year {profile.year}</small></span>
        <Icon name="chevron" size={16} class={`rail-me-caret${open ? " up" : ""}`} />
      </button>
      {kidGate && <KidPinGate learner={kidGate} onCancel={() => setKidGate(null)} onPass={() => { const id = kidGate.id; setKidGate(null); switchTo(id); }} />}
      {addGate && <ParentGate onCancel={() => setAddGate(false)} onPass={() => { setAddGate(false); go({ name: "onboard" }); }} />}
    </div>
  );
}
