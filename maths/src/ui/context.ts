import type { Stage, Strand } from "../engine/types";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Pick, Profile } from "../engine/progress";

export type Route =
  | { name: "home" }
  | { name: "map"; stage?: Stage; skill?: string; view?: "journey" | "list"; filters?: { stage?: Stage; topic?: Strand } }
  | { name: "equal-groups" }
  | { name: "tables" }
  | { name: "time-lesson" }
  | { name: "angles-lesson" }
  | { name: "fractions-lesson" }
  | { name: "parent" }
  | { name: "plan"; week?: number }
  | { name: "me"; section?: "who" | "avatar" | "look" | "sound" }
  | { name: "checkup" }
  | { name: "mock" }
  | { name: "pathway-test"; stage: Stage }
  | { name: "certificate"; stage: Stage }
  | { name: "report" }
  | { name: "progress-report" }
  | { name: "my-data" }
  | { name: "onboard"; first?: boolean }
  | { name: "practice"; plan: Pick[]; resume?: boolean };

export interface AppCtx {
  profile: Profile;
  profiles: Profile[];
  update: (fn: (p: Profile) => Profile) => void;
  go: (r: Route, returnTo?: Route) => void;
  leave: (fallback: Route) => void;
  addProfile: (p: Profile) => void;
  replaceProfile: (p: Profile) => void;
  removeProfile: (id: string) => void;
  switchTo: (id: string) => void;
}

export const Ctx = createContext<AppCtx>(null as unknown as AppCtx);
export const useApp = () => useContext(Ctx);
