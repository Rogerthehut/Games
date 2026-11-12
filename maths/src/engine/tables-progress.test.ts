import { describe, expect, it } from "vitest";
import { newProfile } from "./progress";
import { dayKey, recordFact } from "./tables";
import { recallGrid, speedTrend, streakOf, weekStartKey, weeklyBoard } from "./tables-progress";

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime();
const make = (name: string, answers: { now: number; ok?: boolean; ms?: number }[]) => {
  let p = { ...newProfile(name, 5), id: name };
  for (const a of answers) p = recordFact(p, 6, 7, a.ok ?? true, a.ms ?? 2000, a.now);
  return p;
};

describe("tables day log", () => {
  it("keeps one entry per day with answers, right answers and the average time", () => {
    const p = make("a", [{ now: at(2026, 3, 2) }, { now: at(2026, 3, 2), ms: 4000 }, { now: at(2026, 3, 2), ok: false }]);
    expect(p.tables!.days).toEqual([{ d: "2026-03-02", n: 3, r: 2, ms: 3000 }]);
  });
  it("makes a streak of days in a row, and today not yet done doesn't break it", () => {
    const p = make("a", [at(2026, 3, 2), at(2026, 3, 3), at(2026, 3, 4)].map((now) => ({ now })));
    expect(streakOf(p, at(2026, 3, 4, 20))).toMatchObject({ current: 3, practisedToday: true });
    expect(streakOf(p, at(2026, 3, 5, 8))).toMatchObject({ current: 3, practisedToday: false });
    expect(streakOf(p, at(2026, 3, 6, 8)).current).toBe(0);
    expect(streakOf(p, at(2026, 3, 6, 8)).best).toBe(3);
  });
  it("finds the best run even after a gap", () => {
    const p = make("a", [1, 2, 5, 6, 7, 8].map((d) => ({ now: at(2026, 3, d) })));
    expect(streakOf(p, at(2026, 3, 8)).best).toBe(4);
  });
  it("gives the recall-time trend with gaps as null", () => {
    const p = make("a", [{ now: at(2026, 3, 4), ms: 3000 }]);
    const t = speedTrend(p, 3, at(2026, 3, 5));
    expect(t.map((x) => x.ms)).toEqual([null, 3000, null]);
  });
  it("fills the recall grid from the facts answered", () => {
    const g = recallGrid(make("a", [{ now: 1, ms: 2500 }]));
    expect(g[4][5]).toBe(2500); // 6 x 7
    expect(g[0][0]).toBeNull();
  });
});

describe("weekly family winner", () => {
  const now = at(2026, 3, 11); // a Wednesday
  it("starts the week on Monday", () => { expect(weekStartKey(now)).toBe("2026-03-09"); expect(weekStartKey(at(2026, 3, 8))).toBe("2026-03-02"); });
  it("ranks this week's right answers, ignoring earlier weeks", () => {
    const a = make("Ann", [{ now: at(2026, 3, 9) }, { now: at(2026, 3, 10) }, { now: at(2026, 3, 3) }]);
    const b = make("Ben", [{ now: at(2026, 3, 9) }]);
    const w = weeklyBoard([b, a], "Ben", now);
    expect(w.rows.map((r) => [r.name, r.right, r.rank])).toEqual([["Ann", 2, 1], ["Ben", 1, 2]]);
    expect(w.winners).toEqual(["Ann"]);
  });
  it("shares a tie, gives nobody the win for no practice, and honours the board setting", () => {
    const a = make("Ann", [{ now: at(2026, 3, 9) }]), b = make("Ben", [{ now: at(2026, 3, 10) }]);
    expect(weeklyBoard([a, b], "Ann", now).winners.sort()).toEqual(["Ann", "Ben"]);
    expect(weeklyBoard([make("Cy", [])], "Cy", now).winners).toEqual([]);
    const hidden = { ...a, tables: { ...a.tables!, showOnBoard: false } };
    expect(weeklyBoard([hidden, b], "Ben", now).rows.map((r) => r.name)).toEqual(["Ben"]);
  });
  it("dayKey is local", () => { expect(dayKey(at(2026, 1, 5, 23))).toBe("2026-01-05"); });
});
