import { describe, expect, it } from "vitest";
import { DAY, newProfile, recordAnswer, type Profile } from "./progress";
import { buildRefresher, canRefresh, refresherTopics, REFRESHER_QUESTIONS } from "./refresher";
import { mulberry32 } from "./rng";

const NOW = 1_700_000_000_000;
const practised = (ids: string[], daysAgo = 2, wrongOn: string[] = []): Profile => {
  let p = newProfile("Sam", 4, NOW - 30 * DAY);
  for (const id of ids) {
    p = recordAnswer(p, id, "right", NOW - daysAgo * DAY);
    if (wrongOn.includes(id)) p = recordAnswer(p, id, "wrong", NOW - daysAgo * DAY);
  }
  return p;
};
const IDS = ["place-value", "add-sub", "times-tables", "rounding", "division"];

describe("quick-fire refresher", () => {
  it("is offered once enough topics were practised this week", () => {
    expect(canRefresh(newProfile("Sam", 4, NOW), NOW)).toBe(false);
    expect(canRefresh(practised(IDS.slice(0, 2)), NOW)).toBe(false);
    expect(canRefresh(practised(IDS.slice(0, 3)), NOW)).toBe(true);
  });

  it("only draws on the last week, and only on what was really practised", () => {
    expect(canRefresh(practised(IDS, 9), NOW)).toBe(false);
    const topics = refresherTopics(practised(IDS), NOW).map((t) => t.skillId);
    expect(topics.sort()).toEqual([...IDS].sort()); // not the topics assumed from the learner's year
  });

  it("starts from the last refresher when that was more recent", () => {
    const p = { ...practised(IDS, 3), lastRefresher: NOW - 1 * DAY };
    expect(canRefresh(p, NOW)).toBe(false);
  });

  it("builds a mixed set that covers every topic and leans to the wobbly ones", () => {
    const p = practised(IDS, 2, ["division"]);
    const picks = buildRefresher(p, NOW, mulberry32(3));
    expect(picks).toHaveLength(REFRESHER_QUESTIONS);
    for (const id of IDS) expect(picks.some((x) => x.skillId === id), id).toBe(true);
    const count = (id: string) => picks.filter((x) => x.skillId === id).length;
    expect(Math.max(...IDS.map(count))).toBeLessThanOrEqual(2);
    for (let i = 1; i < picks.length; i++) expect(picks[i].skillId).not.toBe(picks[i - 1].skillId);
    let more = 0;
    for (let seed = 1; seed <= 40; seed++) if (buildRefresher(p, NOW, mulberry32(seed)).filter((x) => x.skillId === "division").length === 2) more++;
    expect(more).toBeGreaterThan(20);
  });

  it("fills the set from a few topics, never repeating one back to back where it can be avoided", () => {
    const picks = buildRefresher(practised(IDS.slice(0, 3)), NOW, mulberry32(9));
    expect(picks).toHaveLength(REFRESHER_QUESTIONS);
    for (let i = 1; i < picks.length; i++) expect(picks[i].skillId).not.toBe(picks[i - 1].skillId);
  });

  it("puts the topics most in need first when there are more than fit", () => {
    const many = ["place-value", "add-sub", "times-tables", "rounding", "division", "decimals", "frac-equiv", "frac-amount", "measures-convert", "perimeter-area", "factors-multiples", "angles-basic"];
    const p = practised(many, 2, ["angles-basic"]);
    const picks = buildRefresher(p, NOW, mulberry32(5));
    expect(picks).toHaveLength(10);
    expect(picks.some((x) => x.skillId === "angles-basic")).toBe(true);
  });
});
