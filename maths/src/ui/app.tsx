import { useEffect, useState } from "preact/hooks";
import { loadStore, saveStore, type Store } from "../engine/storage";
import type { Profile } from "../engine/progress";
import { Ctx, type Route } from "./context";
import { Onboarding } from "./onboarding";
import { Home } from "./home";
import { SkillMap } from "./skillmap";
import { Practice } from "./practice";
import { Parent } from "./parent";

export function App() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [route, setRoute] = useState<Route>(() => (loadStore().profiles.length ? { name: "home" } : { name: "onboard", first: true }));
  useEffect(() => saveStore(store), [store]);
  useEffect(() => window.scrollTo(0, 0), [route.name]);

  const profile = store.profiles.find((p) => p.id === store.activeId) ?? store.profiles[0];

  const ctx = {
    profile: profile as Profile,
    profiles: store.profiles,
    go: setRoute,
    update: (fn: (p: Profile) => Profile) =>
      setStore((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === (s.activeId ?? s.profiles[0]?.id) ? fn(p) : p)) })),
    addProfile: (p: Profile) => setStore((s) => ({ ...s, profiles: [...s.profiles, p], activeId: p.id })),
    replaceProfile: (p: Profile) =>
      setStore((s) => {
        const has = s.profiles.some((x) => x.id === p.id);
        return { ...s, profiles: has ? s.profiles.map((x) => (x.id === p.id ? p : x)) : [...s.profiles, p], activeId: p.id };
      }),
    removeProfile: (id: string) => {
      setStore((s) => {
        const profiles = s.profiles.filter((p) => p.id !== id);
        return { ...s, profiles, activeId: profiles[0]?.id ?? null };
      });
      setRoute(store.profiles.length > 1 ? { name: "home" } : { name: "onboard", first: true });
    },
    switchTo: (id: string) => { setStore((s) => ({ ...s, activeId: id })); setRoute({ name: "home" }); },
  };

  if (!profile || route.name === "onboard")
    return <Ctx.Provider value={ctx}><Onboarding first={!profile} /></Ctx.Provider>;
  if (route.name === "practice")
    return <Ctx.Provider value={ctx}><Practice plan={route.plan} /></Ctx.Provider>;

  const tab = route.name;
  return (
    <Ctx.Provider value={ctx}>
      <header class="topbar">
        <button class="brand" onClick={() => setRoute({ name: "home" })} aria-label="MathPath home">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 18 L9 9 L13 14 L21 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /><circle cx="21" cy="5" r="2.2" fill="var(--effort)" /></svg>
          MathPath
        </button>
        <nav class="tabs" aria-label="Main">
          <button class={tab === "home" ? "on" : ""} onClick={() => setRoute({ name: "home" })}>Today</button>
          <button class={tab === "map" ? "on" : ""} onClick={() => setRoute({ name: "map" })}>Skills</button>
          <button class={tab === "parent" ? "on" : ""} onClick={() => setRoute({ name: "parent" })}>Grown-up</button>
        </nav>
        {store.profiles.length > 1 && (
          <select class="who" aria-label="Who is learning" value={profile.id} onChange={(e) => ctx.switchTo((e.target as HTMLSelectElement).value)}>
            {store.profiles.map((p) => <option value={p.id}>{p.name}</option>)}
          </select>
        )}
      </header>
      <main class="page">
        {route.name === "home" && <Home />}
        {route.name === "map" && <SkillMap />}
        {route.name === "parent" && <Parent />}
      </main>
    </Ctx.Provider>
  );
}

