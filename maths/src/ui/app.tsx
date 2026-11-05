import { useEffect, useState } from "preact/hooks";
import { loadStore, saveStore, type Store } from "../engine/storage";
import type { Profile } from "../engine/progress";
import { Ctx, type Route } from "./context";
import { Onboarding } from "./onboarding";
import { Home } from "./home";
import { SkillMap } from "./skillmap";
import { Practice } from "./practice";
import { Parent } from "./parent";
import { Checkup } from "./checkup";
import { Report } from "./report";
import { Mock } from "./mock";
import { PlanView } from "./planview";
import { applySkin, applyTheme, getTheme, resolveSkin } from "./skin";
import { Shell, type Tab } from "./shell";
import { Me } from "./me";
import { ParentGate, parentUnlocked } from "./gate";

export function App() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [route, setRouteRaw] = useState<Route>(() => (loadStore().profiles.length ? { name: "home" } : { name: "onboard", first: true }));
  useEffect(() => saveStore(store), [store]);
  useEffect(() => applyTheme(getTheme()), []);

  // Screen changes cross-fade and slide with the browser's View Transitions API where it exists.
  const setRoute = (r: Route) => {
    const d = document as Document & { startViewTransition?: (cb: () => Promise<void>) => unknown };
    if (!d.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return setRouteRaw(r);
    // Resolve once Preact has committed the new screen (it renders in a microtask). Waiting for a frame here would
    // stall until the browser's 4 second transition timeout, because rendering is paused during the callback.
    d.startViewTransition(() => new Promise<void>((done) => { setRouteRaw(r); setTimeout(done, 0); }));
  };
  useEffect(() => window.scrollTo(0, 0), [route.name]);

  const profile = store.profiles.find((p) => p.id === store.activeId) ?? store.profiles[0];
  const skin = resolveSkin(profile);
  useEffect(() => applySkin(skin), [skin, route.name]);

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
  if (route.name === "mock")
    return <Ctx.Provider value={ctx}><Mock /></Ctx.Provider>;
  if (route.name === "checkup")
    return <Ctx.Provider value={ctx}><Checkup /></Ctx.Provider>;
  if (route.name === "practice")
    return <Ctx.Provider value={ctx}><Practice plan={route.plan} /></Ctx.Provider>;

  const tab: Tab = route.name === "map" ? "skills" : route.name === "plan" || route.name === "report" ? "plan" : route.name === "me" || route.name === "parent" ? "me" : "today";
  return (
    <Ctx.Provider value={ctx}>
      <Shell tab={tab}>
        {route.name === "home" && <Home />}
        {route.name === "map" && <SkillMap />}
        {route.name === "plan" && <PlanView />}
        {route.name === "report" && <Report />}
        {route.name === "me" && <Me />}
        {route.name === "parent" && (parentUnlocked() ? <Parent /> : <ParentGate onPass={() => setRoute({ name: "parent" })} onCancel={() => setRoute({ name: "me" })} />)}
      </Shell>
    </Ctx.Provider>
  );
}
