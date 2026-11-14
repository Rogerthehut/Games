import { MoreBelow } from "./qshell";
import { hasNativeDock, setDock } from "../native/bridge";
import { StemNote, TablesNote, useWide } from "./tables-note";
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useApp } from "./context";
import { Icon } from "./icons";
import { navFor, type Tab } from "./navigation";
import { RailParents } from "./rail-parents";
import { SearchDialog } from "./search";

import { CubeMark, Wordmark } from "./wordmark";
import { BrowserStorageNotice } from "./legal";
import { RailSwitcher } from "./rail-switcher";


const RAIL_KEY = "quarter.railWidth", RAIL_DEFAULT = 264, RAIL_MIN = 76, RAIL_MAX = 380, RAIL_SLIM = 150;
const readRail = () => { try { const n = Number(localStorage.getItem(RAIL_KEY)); return n >= RAIL_MIN && n <= RAIL_MAX ? n : RAIL_DEFAULT; } catch { return RAIL_DEFAULT; } };
/** Drag the edge of the side menu to make it wider or narrower; narrow enough and it shrinks to icons, so the page gets the room. Remembered on this device. */
function useRailWidth() {
  const [width, setWidth] = useState(readRail);
  const set = (w: number, keep = true) => {
    const v = Math.round(Math.min(RAIL_MAX, Math.max(RAIL_MIN, w)));
    // below the slim line, snap to icons only
    const snapped = v < RAIL_SLIM ? RAIL_MIN : v;
    setWidth(snapped);
    if (keep) try { localStorage.setItem(RAIL_KEY, String(snapped)); } catch { /* private mode: it just isn't remembered */ }
  };
  return { width, slim: width <= RAIL_SLIM, set };
}

/** Bottom tab bar on phones and tablets, side rail on wide screens. */
export function Shell({ tab, children }: { tab: Tab; children: ComponentChildren }) {
  const wide = useWide();
  const { go, profile } = useApp();
  const tabs = navFor(profile);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const rail = useRailWidth();
  const [dock, setDockOn] = useState(hasNativeDock);
  useEffect(() => { const off = () => setDockOn(false); window.addEventListener("quarter-dock-fallback", off); return () => window.removeEventListener("quarter-dock-fallback", off); }, []);
  // In the app, a glass dock drawn by the phone replaces the bottom tab bar (on a wide iPad the side menu is used instead)
  useEffect(() => {
    if (!dock) return;
    const narrow = matchMedia("(max-width: 899px)"), send = (visible = true) => setDock(visible && narrow.matches, tab === "me" ? "none" : tab, tabs.filter((t) => t.id !== "me").map((t) => t.id));
    const nav = (e: Event) => { if ((e as CustomEvent<string>).detail === "search") { openSearch(); return; } const hit = tabs.find((i) => i.id === (e as CustomEvent<string>).detail); if (hit) go(hit.route); };
    send(); narrow.addEventListener("change", () => send());
    window.addEventListener("quarter-native-nav", nav);
    document.documentElement.classList.add("native-dock");
    return () => { window.removeEventListener("quarter-native-nav", nav); document.documentElement.classList.remove("native-dock"); setDock(false, tab); };
  }, [dock, tab, tabs.length]);
  const dragging = useRef(false);
  const openSearch = () => {
    const dialog = searchDialog.current;
    if (dialog && !dialog.open && !document.querySelector("dialog[open]")) dialog.showModal();
  };
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "k") return;
      if (document.querySelector("dialog[open]") && !searchDialog.current?.open) return;
      event.preventDefault();
      openSearch();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const searchButton = (mobile: boolean) => (
    <button type="button" class={mobile ? "mobile-search btn small" : "nav-item"} aria-label="Search quarter"
      aria-haspopup="dialog" aria-keyshortcuts="Control+k Meta+k" onClick={openSearch}>
      <Icon name="search" size={22} />{!mobile && <span>Search</span>}
    </button>
  );
  const logoSpin = useRef<Animation | null>(null);
  const spinLogo = (button: HTMLButtonElement) => {
    const mark = button.querySelector(".cube-mark");
    if (mark?.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      logoSpin.current?.cancel();
      logoSpin.current = mark.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        { duration: 440, easing: "cubic-bezier(.2,.7,.25,1)" },
      );
    }
  };
  const openToday = (button: HTMLButtonElement) => {
    spinLogo(button);
    if (tab !== "today") go({ name: "home" });
    else {
      document.getElementById("main")?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    }
  };
  const brand = () => (
    <button type="button" class="brand" aria-label="quarter, go to Today"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") spinLogo(event.currentTarget); }}
      onClick={(event) => openToday(event.currentTarget)}>
      <CubeMark /><Wordmark />
    </button>
  );
  const nav = (cls: string) => (
    <nav class={cls} aria-label="Main">
      {tabs.filter((item) => item.id !== "me").map((it) => (
        <button key={it.id} class={`nav-item ${tab === it.id ? "on" : ""}`} aria-current={tab === it.id ? "page" : undefined} data-testid={`nav-${it.id}`} onClick={() => go(it.route)}>
          <Icon name={it.icon} size={24} />
          <span>{it.label}</span>
        </button>
      ))}
      {cls === "tabbar" && <button class="nav-item" aria-haspopup="dialog" data-testid="nav-search" onClick={openSearch}><Icon name="search" size={24} /><span>Search</span></button>}
    </nav>
  );
  return (
    <div class={`app${rail.slim ? " rail-slim" : ""}`} style={{ "--rail-w": `${rail.width}px` } as never}>
      <aside class="rail">
        <button type="button" class="rail-min" onClick={() => rail.set(rail.slim ? RAIL_DEFAULT : RAIL_MIN)} aria-label={rail.slim ? "Expand the side menu" : "Minimise the side menu"} title={rail.slim ? "Expand the side menu" : "Minimise the side menu"} data-testid="rail-min">
          {rail.slim
            ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
            : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>}
        </button>
        {brand()}
        {nav("rail-nav")}
        {searchButton(false)}
        {wide && (tab === "today"
          ? <><TablesNote variant="rail" /><StemNote variant="rail" /></>
          : <div class="note-minis" aria-label="Quick links"><TablesNote variant="mini" /><StemNote variant="mini" /></div>)}
        <RailSwitcher tab={tab} slim={rail.slim} />
        <RailParents tab={tab} slim={rail.slim} />
        <div class="rail-grip" role="separator" aria-orientation="vertical" tabIndex={0} aria-label="Side menu width. Drag, or use the arrow keys. Press Enter to switch between icons and full menu."
          aria-valuemin={RAIL_MIN} aria-valuemax={RAIL_MAX} aria-valuenow={rail.width} data-testid="rail-grip"
          onPointerDown={(e) => { dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); e.preventDefault(); }}
          onPointerMove={(e) => { if (dragging.current) rail.set(e.clientX, false); }}
          onPointerUp={(e) => { if (dragging.current) { dragging.current = false; rail.set(e.clientX); } }}
          onDblClick={() => rail.set(rail.slim ? RAIL_DEFAULT : RAIL_MIN)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") { e.preventDefault(); rail.set(rail.width - 24); }
            else if (e.key === "ArrowRight") { e.preventDefault(); rail.set(rail.slim ? RAIL_DEFAULT : rail.width + 24); }
            else if (e.key === "Enter") { e.preventDefault(); rail.set(rail.slim ? RAIL_DEFAULT : RAIL_MIN); }
          }} />
      </aside>
      <header class="mobile-wordmark">
        {brand()}
        <RailSwitcher tab={tab} top />
      </header>
      <main class="content" id="main">
        {children}
        <MoreBelow />
      </main>
      <SearchDialog dialog={searchDialog} />
      <BrowserStorageNotice />
      {!dock && nav("tabbar")}
    </div>
  );
}
