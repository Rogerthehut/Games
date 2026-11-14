import type { Route } from "./context";
import type { IconName } from "./icons";
import type { Profile } from "../engine/progress";
import { hasAssessments } from "../engine/age";

export const primaryNav = [
  { id: "today", label: "Today", icon: "home", route: { name: "home" } },
  { id: "skills", label: "Skills", icon: "route", route: { name: "map" } },
  { id: "plan", label: "Plan", icon: "flag", route: { name: "plan" } },
  { id: "me", label: "Me", icon: "user", route: { name: "me" } },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: IconName; route: Route }>;

/** The tabs this learner is offered: no Plan for the youngest (it is built from the check-up). */
export const navFor = (profile: Pick<Profile, "year" | "early">) => primaryNav.filter((item) => item.id !== "plan" || hasAssessments(profile));
export type Tab = (typeof primaryNav)[number]["id"];

export function tabHref(tab: Tab): string {
  return tab === "today" ? "./" : `./?tab=${tab}`;
}

export function tabRoute(search: string): Route | undefined {
  const tab = new URLSearchParams(search).get("tab");
  return primaryNav.find((item) => item.id === tab)?.route;
}
