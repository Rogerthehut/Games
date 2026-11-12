import { SKILL_BY_ID } from "../curriculum";
import { DAY, type Pick, type Profile } from "./progress";
import type { Rng } from "./rng";

/**
 * A quick-fire refresher: a short mixed set drawn from the topics practised in the last week (or since the last refresher, if
 * that was more recent), leaning towards the ones that were wobbly. It runs as ordinary practice, so every answer feeds progress
 * and the plan: shaky topics come back sooner, secure ones later.
 */
export const REFRESHER_DAYS = 7;
export const REFRESHER_QUESTIONS = 10;
/** Fewer than this many topics and there isn't enough to revise. */
export const REFRESHER_MIN_TOPICS = 3;

export interface RefresherTopic { skillId: string; weight: number; wobbly: boolean }

/** Topics practised in the window, each with how much it needs revising. */
export function refresherTopics(p: Profile, now = Date.now()): RefresherTopic[] {
  const since = Math.max(now - REFRESHER_DAYS * DAY, p.lastRefresher ?? 0);
  const out: RefresherTopic[] = [];
  for (const [skillId, st] of Object.entries(p.skills)) {
    if (!SKILL_BY_ID[skillId] || st.assumed || st.last < since || st.seen === 0) continue;
    const recentMiss = st.wrong > 0 && st.wrong >= st.right * 0.4;
    const wobbly = st.box <= 2 || recentMiss;
    out.push({ skillId, wobbly, weight: 1 + (5 - Math.min(5, st.box)) * 0.6 + (recentMiss ? 1.5 : 0) });
  }
  return out.sort((a, b) => b.weight - a.weight || a.skillId.localeCompare(b.skillId));
}

export const canRefresh = (p: Profile, now = Date.now()) => refresherTopics(p, now).length >= REFRESHER_MIN_TOPICS;

/** The questions: every topic at least once (the most in need first when there are too many), then more of the wobbly ones. */
export function buildRefresher(p: Profile, now: number, rng: Rng, size = REFRESHER_QUESTIONS): Pick[] {
  const topics = refresherTopics(p, now);
  if (topics.length === 0) return [];
  const chosen = topics.slice(0, size);
  const maxPer = Math.max(2, Math.ceil(size / chosen.length)); // two at most, unless there are too few topics to fill the set
  const counts = new Map(chosen.map((t) => [t.skillId, 1]));
  const picks: string[] = chosen.map((t) => t.skillId);
  while (picks.length < size) {
    const open = chosen.filter((t) => (counts.get(t.skillId) ?? 0) < maxPer);
    if (!open.length) break;
    let roll = rng() * open.reduce((sum, t) => sum + t.weight, 0);
    const t = open.find((x) => (roll -= x.weight) <= 0) ?? open[open.length - 1];
    counts.set(t.skillId, (counts.get(t.skillId) ?? 0) + 1);
    picks.push(t.skillId);
  }
  // mix them, but never the same topic twice in a row if it can be avoided
  for (let i = picks.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]]; }
  for (let i = 1; i < picks.length; i++) {
    if (picks[i] !== picks[i - 1]) continue;
    const k = picks.findIndex((id, at) => at > i && id !== picks[i] && id !== picks[at - 1]);
    if (k > -1) [picks[i], picks[k]] = [picks[k], picks[i]];
  }
  return picks.map((skillId) => ({ skillId, reason: "refresher" as const }));
}
