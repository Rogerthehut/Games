import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { loadStore, saveStore, type Store } from "../engine/storage";
import type { Profile } from "../engine/progress";
import { Ctx, type Route } from "./context";
import { Onboarding } from "./onboarding";
import { Welcome } from "./welcome";
import { Home } from "./home";
import { SkillMap } from "./skillmap";
import { FractionsLesson } from "./fractions-lesson";
import { TimeLesson } from "./time-lesson";
import { AnglesLesson } from "./angles-lesson";
import { EqualGroups } from "./equal-groups";
import { Practice } from "./practice";
import { Parent } from "./parent";
import { Checkup } from "./checkup";
import { Report } from "./report";
import { Certificate } from "./certificate";
import { ProgressReport } from "./progress-report";
import { MyDataRoute } from "./my-data-route";
import { Mock } from "./mock";
import { PlanView } from "./planview";
import { applySkin, applyTheme, getTheme, resolveSkin } from "./skin";
import { Shell } from "./shell";
import { primaryNav, tabHref, tabRoute, type Tab } from "./navigation";
import { Me } from "./me";
import { ParentGate, parentUnlocked } from "./gate";
import type { AccountBridge } from "./account-context";
import type { RemoteLearner } from "../account/sync";

function hrefForRoute(route: Route): string | undefined {
  const tab = primaryNav.find((item) => item.route.name === route.name);
  return tab && tabHref(tab.id);
}

/** Without `bridge` the app keeps progress on the device only. With one, a signed-in parent's learners are saved to their account. */
export function App({ initialStore, bridge }: { initialStore?: Store; bridge?: AccountBridge } = {}) {
  const [store, setStore] = useState<Store>(() => initialStore ?? loadStore());
  const [showWelcome, setShowWelcome] = useState(() => store.profiles.length > 0);
  const closeWelcome = useCallback(() => setShowWelcome(false), []);
  const session = useRef(Math.random().toString(36).slice(2));
  const [route, setRouteRaw] = useState<Route>(() => tabRoute(location.search) ?? (store.profiles.length ? { name: "home" } : { name: "onboard", first: true }));
  useEffect(() => { if (bridge) bridge.persist(store); else saveStore(store); }, [store]);
  useEffect(() => {
    bridge?.setHandlers({
      // a learner made on this device got its permanent id from the server
      remap: (localId: string, remoteId: string) => setStore((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === localId ? { ...p, id: remoteId } : p)), activeId: s.activeId === localId ? remoteId : s.activeId })),
      // another device saved newer progress: take it, but keep this device's tutor chat log
      remote: (r: RemoteLearner) => setStore((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === r.id ? ({ ...(r.data as unknown as Profile), id: r.id, tutorLog: p.tutorLog } as Profile) : p)) })),
    });
  }, []);
  useEffect(() => applyTheme(getTheme()), []);

  // Screen changes cross-fade and slide with the browser's View Transitions API where it exists.
  const showRoute = (r: Route) => {
    const d = document as Document & { startViewTransition?: (cb: () => Promise<void>) => unknown };
    if (!d.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return setRouteRaw(r);
    // Resolve once Preact has committed the new screen (it renders in a microtask). Waiting for a frame here would
    // stall until the browser's 4 second transition timeout, because rendering is paused during the callback.
    d.startViewTransition(() => new Promise<void>((done) => { setRouteRaw(r); setTimeout(done, 0); }));
  };
  useEffect(() => {
    const currentSession = session.current;
    history.replaceState({ quarter: currentSession, route, canLeave: false }, "");
    const oldRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const pop = (event: PopStateEvent) => {
      if (event.state?.quarter === currentSession) setRouteRaw(event.state.route);
    };
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      history.scrollRestoration = oldRestoration;
    };
  }, []);

  const setRoute = (next: Route, returnTo?: Route) => {
    if (returnTo) history.replaceState({ ...history.state, route: returnTo }, "", hrefForRoute(returnTo));
    if (JSON.stringify(route) !== JSON.stringify(next) || returnTo) {
      history.pushState({ quarter: session.current, route: next, canLeave: true }, "", hrefForRoute(next));
    }
    showRoute(next);
  };

  useEffect(() => {
    if (showWelcome) return;
    window.scrollTo(0, 0);
    document.getElementById("main")?.scrollTo(0, 0);
    if (route.name === "map") return;
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("#main h1, .splash h1, .qbody h1");
      if (!heading) return;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      const id = route.name === "plan" && route.week ? `plan-week-${route.week}`
        : route.name === "me" && route.section ? `${route.section}-h` : undefined;
      const target = id && document.getElementById(id);
      if (target) {
        target.tabIndex = -1;
        target.scrollIntoView({ block: "center" });
        target.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [route, showWelcome]);

  const profile = store.profiles.find((p) => p.id === store.activeId) ?? store.profiles[0];
  const skin = resolveSkin(profile);
  useEffect(() => applySkin(skin), [skin, route.name]);

  const ctx = {
    profile: profile as Profile,
    profiles: store.profiles,
    go: setRoute,
    leave: (fallback: Route) => {
      if (history.state?.quarter === session.current && history.state.canLeave) history.back();
      else setRoute(fallback);
    },
    update: (fn: (p: Profile) => Profile) =>
      setStore((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === (s.activeId ?? s.profiles[0]?.id) ? fn(p) : p)) })),
    addProfile: (p: Profile) => setStore((s) => ({ ...s, profiles: [...s.profiles, p], activeId: p.id })),
    replaceProfile: (p: Profile) =>
      setStore((s) => {
        const has = s.profiles.some((x) => x.id === p.id);
        return { ...s, profiles: has ? s.profiles.map((x) => (x.id === p.id ? p : x)) : [...s.profiles, p], activeId: p.id };
      }),
    removeProfile: (id: string) => {
      bridge?.forget(id);
      setStore((s) => {
        const profiles = s.profiles.filter((p) => p.id !== id);
        return { ...s, profiles, activeId: profiles[0]?.id ?? null };
      });
      setRoute(store.profiles.length > 1 ? { name: "home" } : { name: "onboard", first: true });
    },
    switchTo: (id: string) => { setStore((s) => ({ ...s, activeId: id })); setRoute({ name: "home" }); },
  };

  if (!profile || route.name === "onboard")
    return <Ctx.Provider value={ctx}><Onboarding first={!profile} account={!!bridge} destination={route.name === "onboard" ? undefined : route} /></Ctx.Provider>;
  if (showWelcome && route.name === "home") return <Welcome name={profile.name} onContinue={closeWelcome} />;
  if (route.name === "mock")
    return <Ctx.Provider value={ctx}><Mock /></Ctx.Provider>;
  if (route.name === "pathway-test")
    return <Ctx.Provider value={ctx}><Mock key={route.stage} pathway={route.stage} /></Ctx.Provider>;
  if (route.name === "certificate")
    return <Ctx.Provider value={ctx}><Certificate stage={route.stage} /></Ctx.Provider>;
  if (route.name === "progress-report")
    return <Ctx.Provider value={ctx}>{parentUnlocked() ? <ProgressReport /> : <ParentGate onPass={() => setRoute({ name: "progress-report" })} onCancel={() => setRoute({ name: "me" })} />}</Ctx.Provider>;
  if (route.name === "my-data")
    return <Ctx.Provider value={ctx}>{parentUnlocked() ? <MyDataRoute /> : <ParentGate onPass={() => setRoute({ name: "my-data" })} onCancel={() => setRoute({ name: "me" })} />}</Ctx.Provider>;
  if (route.name === "checkup")
    return <Ctx.Provider value={ctx}><Checkup /></Ctx.Provider>;
  if (route.name === "practice")
    return <Ctx.Provider value={ctx}><Practice plan={route.plan} resume={route.resume} /></Ctx.Provider>;

  if (route.name === "fractions-lesson")
    return <Ctx.Provider value={ctx}><FractionsLesson /></Ctx.Provider>;

  if (route.name === "angles-lesson")
    return <Ctx.Provider value={ctx}><AnglesLesson /></Ctx.Provider>;

  if (route.name === "time-lesson")
    return <Ctx.Provider value={ctx}><TimeLesson /></Ctx.Provider>;

  if (route.name === "equal-groups")
    return <Ctx.Provider value={ctx}><EqualGroups /></Ctx.Provider>;

  const tab: Tab = route.name === "map" ? "skills" : route.name === "plan" || route.name === "report" ? "plan" : route.name === "me" || route.name === "parent" ? "me" : "today";
  return (
    <Ctx.Provider value={ctx}>
      <Shell tab={tab}>
        {route.name === "home" && <Home />}
        {route.name === "map" && <SkillMap key={`${profile.id}:${route.stage ?? ""}:${route.skill ?? ""}:${route.view ?? ""}`} navigation={route} />}
        {route.name === "plan" && <PlanView initialWeek={route.week} />}
        {route.name === "report" && <Report />}
        {route.name === "me" && <Me />}
        {route.name === "parent" && (parentUnlocked() ? <Parent /> : <ParentGate onPass={() => setRoute({ name: "parent" })} onCancel={() => setRoute({ name: "me" })} />)}
      </Shell>
    </Ctx.Provider>
  );
}
