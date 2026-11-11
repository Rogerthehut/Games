import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "../curriculum";
import { MILESTONES, milestoneStates, newlyEarned, shelf } from "./milestones";
import { newProfile, SECURE_BOX } from "./progress";

const secure = (p: ReturnType<typeof newProfile>, ids: string[]) => { for (const id of ids) p.skills[id] = { box: SECURE_BOX, seen: 4, right: 4, wrong: 0, due: 1, last: 1 }; };

describe("milestones", () => {
  it("only name topics that exist, with unique ids", () => {
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length);
    for (const m of MILESTONES) for (const s of m.skills) expect(SKILL_BY_ID[s], `${m.id} -> ${s}`).toBeDefined();
  });
  it("are earned only when every topic behind them is secure", () => {
    const p = newProfile("Ella", 4, 1);
    const clock = MILESTONES.find((m) => m.id === "clock")!;
    secure(p, clock.skills.slice(0, 2));
    let s = milestoneStates(p).find((m) => m.id === "clock")!;
    expect(s).toMatchObject({ earned: false, done: 2, total: 3, next: clock.skills[2] });
    secure(p, clock.skills);
    s = milestoneStates(p).find((m) => m.id === "clock")!;
    expect(s.earned).toBe(true);
    expect(s.next).toBeUndefined();
  });
  it("shows what's earned plus what's near for the learner's year, with a next step", () => {
    const p = newProfile("Ella", 4, 1);
    secure(p, MILESTONES.find((m) => m.id === "clock")!.skills);
    const { earned, coming, nextUp } = shelf(p);
    expect(earned.map((m) => m.id)).toContain("clock");
    expect(coming.map((m) => m.id)).not.toContain("calculus"); // years away
    expect(nextUp?.earned).toBe(false);
  });
  it("tells which were earned since they were last shown", () => {
    const p = newProfile("Ella", 4, 1);
    secure(p, MILESTONES.find((m) => m.id === "clock")!.skills);
    expect(newlyEarned(p).map((m) => m.id)).toEqual(["clock"]);
    expect(newlyEarned({ ...p, milestonesSeen: ["clock"] })).toEqual([]);
  });
});
