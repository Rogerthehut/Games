import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useApp } from "./context";
import { Icon } from "./icons";
import { primaryNav, type Tab } from "./navigation";
import { Avatar } from "./avatar";
import { SearchDialog } from "./search";

import { CubeMark, Wordmark } from "./wordmark";
import { BrowserStorageNotice, LegalFooter } from "./legal";

function ProfileHi() {
  return <svg class="profile-hi" viewBox="0 0 24 18" aria-hidden="true" focusable="false">
    <path d="M2 11C7 7 12 1 9 1.5 6.5 1.7 4.2 11 3.5 16c3-5 5.8-7.5 7.1-6.8 1.2.6-1.9 5.1-.3 5.8 1.2.5 3.5-1.4 5.4-4.5m1.6-2.4c-1.1 2.1-3.7 6.1-2 6.7 1.3.5 3.6-1.3 6.3-4.1" />
    <circle cx="19" cy="4.4" r="1.1" />
  </svg>;
}

/** Bottom tab bar on phones and tablets, side rail on wide screens. */
export function Shell({ tab, children }: { tab: Tab; children: ComponentChildren }) {
  const { go, profile } = useApp();
  const searchDialog = useRef<HTMLDialogElement>(null);
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
      {primaryNav.filter((item) => cls !== "rail-nav" || item.id !== "me").map((it) => (
        <button key={it.id} class={`nav-item ${tab === it.id ? "on" : ""}`} aria-current={tab === it.id ? "page" : undefined} data-testid={`nav-${it.id}`} onClick={() => go(it.route)}>
          <Icon name={it.icon} size={24} />
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
  return (
    <div class="app">
      <aside class="rail">
        {brand()}
        {nav("rail-nav")}
        {searchButton(false)}
        <button class="rail-me" aria-current={tab === "me" ? "page" : undefined} onClick={() => go({ name: "me" })} aria-label={`${profile.name}, open Me`}>
          <Avatar choice={profile.avatar} size={36} />
          <span><ProfileHi /><strong>{profile.name}</strong><small>Year {profile.year}</small></span>
        </button>
      </aside>
      <header class="mobile-wordmark">
        {brand()}
        {searchButton(true)}
        <button class="mobile-profile" onClick={() => go({ name: "me" })} aria-label={`${profile.name}, open Me`}>
          <span class="mobile-profile-label"><ProfileHi /><span class="mobile-profile-name">{profile.name}</span></span>
          <Avatar choice={profile.avatar} size={32} />
        </button>
      </header>
      <main class="content" id="main">
        {children}
        <LegalFooter />
      </main>
      <SearchDialog dialog={searchDialog} />
      <BrowserStorageNotice />
      {nav("tabbar")}
    </div>
  );
}
