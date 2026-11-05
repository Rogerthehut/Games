import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Pick, Profile } from "../engine/progress";

export type Route =
  | { name: "home" }
  | { name: "map" }
  | { name: "parent" }
  | { name: "plan" }
  | { name: "checkup" }
  | { name: "mock" }
  | { name: "report" }
  | { name: "onboard"; first?: boolean }
  | { name: "practice"; plan: Pick[] };

export interface AppCtx {
  profile: Profile;
  profiles: Profile[];
  update: (fn: (p: Profile) => Profile) => void;
  go: (r: Route) => void;
  addProfile: (p: Profile) => void;
  replaceProfile: (p: Profile) => void;
  removeProfile: (id: string) => void;
  switchTo: (id: string) => void;
}

export const Ctx = createContext<AppCtx>(null as unknown as AppCtx);
export const useApp = () => useContext(Ctx);
