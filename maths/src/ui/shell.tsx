import type { ComponentChildren } from "preact";
import { useApp, type Route } from "./context";
import { Icon, type IconName } from "./icons";

export type Tab = "today" | "skills" | "plan" | "me";

const ITEMS: { id: Tab; label: string; icon: IconName; route: Route }[] = [
  { id: "today", label: "Today", icon: "home", route: { name: "home" } },
  { id: "skills", label: "Skills", icon: "route", route: { name: "map" } },
  { id: "plan", label: "Plan", icon: "flag", route: { name: "plan" } },
  { id: "me", label: "Me", icon: "user", route: { name: "me" } },
];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return <span class="avatar-chip" style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.45}px` }} aria-hidden="true">{name.trim().charAt(0).toUpperCase() || "?"}</span>;
}

/** Bottom tab bar on phones and tablets, side rail on wide screens. */
export function Shell({ tab, children }: { tab: Tab; children: ComponentChildren }) {
  const { go, profile } = useApp();
  const nav = (cls: string) => (
    <nav class={cls} aria-label="Main">
      {ITEMS.map((it) => (
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
        <button class="brand" onClick={() => go({ name: "home" })} aria-label="MathPath, go to Today">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M3 18 L9 9 L13 14 L21 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /><circle cx="21" cy="5" r="2.2" fill="var(--effort)" /></svg>
          <span>MathPath</span>
        </button>
        {nav("rail-nav")}
        <button class="rail-me" onClick={() => go({ name: "me" })} aria-label={`${profile.name}, open Me`}>
          <Avatar name={profile.name} size={36} />
          <span><strong>{profile.name}</strong><small>Year {profile.year}</small></span>
        </button>
      </aside>
      <main class="content" id="main">{children}</main>
      {nav("tabbar")}
    </div>
  );
}
