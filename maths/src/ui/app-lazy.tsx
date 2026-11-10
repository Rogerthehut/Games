import { useEffect, useState } from "preact/hooks";
import type { AccountBridge } from "./account-context";
import type { Store } from "../engine/storage";
import { Splash } from "./splash";

type AppComponent = typeof import("./app").App;
let loaded: AppComponent | null = null;
let loading: Promise<AppComponent> | null = null;
/** Starts fetching the app code. Safe to call early and more than once. */
export const preloadApp = () => (loading ??= import("./app").then((m) => (loaded = m.App)));

/** The learning app, fetched only when it is needed, so the welcome page opens without waiting for it. */
export function LazyApp(props: { initialStore?: Store; bridge?: AccountBridge }) {
  // held in an object: a component is a function, and a function given to setState would be called as an updater
  const [ready, setReady] = useState<{ App: AppComponent } | null>(loaded ? { App: loaded } : null);
  useEffect(() => { if (!ready) void preloadApp().then((App) => setReady({ App })); }, []);
  return ready ? <ready.App {...props} /> : <Splash />;
}
