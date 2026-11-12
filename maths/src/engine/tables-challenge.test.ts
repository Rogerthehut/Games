import { describe, expect, it } from "vitest";
import { newProfile, type Profile } from "./progress";
import { mulberry32 } from "./rng";
import { factKey, tablesOf } from "./tables";
import { RACE_LENGTH, RACE_PENALTY_MS, bestKey, challengesOf, describeScore, familyBoard, isBetter, nextChallengeQ, recordChallenge, scoreOf } from "./tables-challenge";

const NOW = 1_700_000_000_000;
const kid = (name: string) => newProfile(name, 5, NOW - 86_400_000 * 9);

describe("times tables challenges", () => {
  it("score the blitz by right answers and the race by time with penalties", () => {
    expect(scoreOf("blitz", 22, 60_000, 3)).toBe(22);
    expect(scoreOf("race", 25, 61_000, 2)).toBe(61_000 + 2 * RACE_PENALTY_MS);
    expect(isBetter("blitz", 23, 22)).toBe(true);
    expect(isBetter("race", 60_000, 61_000)).toBe(true);
  });

  it("ask questions from the chosen tables, never the same fact twice running", () => {
    const p: Profile = { ...kid("Sam"), tables: { facts: {}, active: [3], rounds: 0, checks: [] } };
    const r = mulberry32(4);
    let last = "";
    for (let i = 0; i < 300; i++) {
      const q = nextChallengeQ(p, "mine", r, last);
      expect(q.a === 3 || q.b === 3, q.prompt).toBe(true);
      expect(q.answer).toBe(q.a * q.b);
      expect(factKey(q.a, q.b)).not.toBe(last);
      last = factKey(q.a, q.b);
    }
    const all = new Set(Array.from({ length: 300 }, () => nextChallengeQ(p, "all", r).a));
    expect(all.size).toBeGreaterThan(8);
  });

  it("keep the personal best, and only replace it with something better", () => {
    let p = kid("Sam");
    let rec = recordChallenge(p, "blitz", "all", 18, 2, 60_000, NOW);
    expect(rec.newBest).toBe(true); p = rec.profile;
    rec = recordChallenge(p, "blitz", "all", 15, 1, 60_000, NOW + 1000);
    expect(rec.newBest).toBe(false); p = rec.profile;
    expect(challengesOf(p).bests[bestKey("blitz", "all")].score).toBe(18);
    rec = recordChallenge(p, "blitz", "all", 21, 0, 60_000, NOW + 2000);
    expect(rec.newBest).toBe(true);
    expect(rec.previous?.score).toBe(18);
    expect(challengesOf(rec.profile).history).toHaveLength(3);
    // the other scope has its own best
    expect(challengesOf(rec.profile).bests[bestKey("blitz", "mine")]).toBeUndefined();
  });

  it("only count a race once all the questions were answered, and a blitz once something was right", () => {
    const p = kid("Sam");
    expect(recordChallenge(p, "race", "all", 10, 2, 30_000, NOW).newBest).toBe(false);
    expect(recordChallenge(p, "race", "all", RACE_LENGTH - 2, 2, 50_000, NOW).newBest).toBe(true);
    expect(recordChallenge(p, "blitz", "all", 0, 5, 60_000, NOW).newBest).toBe(false);
  });

  it("give points for trying, and never take any away", () => {
    const p = kid("Sam");
    expect(recordChallenge(p, "blitz", "all", 12, 3, 60_000, NOW).profile.points).toBeGreaterThan(p.points);
    expect(recordChallenge(p, "blitz", "all", 0, 3, 60_000, NOW).profile.points).toBe(p.points);
  });

  it("rank the family: best first, ties share a place, hidden learners left off, newcomers last", () => {
    const [a, b, c, d, e] = ["Ava", "Ben", "Cal", "Dee", "Eli"].map(kid);
    const done = (p: Profile, right: number, at: number) => recordChallenge(p, "blitz", "all", right, 0, 60_000, at).profile;
    const A = done(a, 20, NOW), B = done(b, 25, NOW + 1), C = done(c, 20, NOW + 2);
    const D = { ...done(d, 30, NOW), tables: { ...tablesOf(done(d, 30, NOW)), showOnBoard: false } };
    const board = familyBoard([A, B, C, D, e], "blitz", "all", A.id);
    expect(board.map((r) => r.name)).toEqual(["Ben", "Ava", "Cal", "Eli"]);
    expect(board.map((r) => r.rank)).toEqual([1, 2, 2, 0]);
    expect(board.find((r) => r.name === "Ava")?.you).toBe(true);
    // the race: faster is better
    const fast = recordChallenge(a, "race", "all", 25, 0, 55_000, NOW).profile, slow = recordChallenge(b, "race", "all", 25, 0, 70_000, NOW).profile;
    expect(familyBoard([slow, fast], "race", "all", fast.id).map((r) => r.name)).toEqual(["Ava", "Ben"]);
  });

  it("describe scores in words", () => {
    expect(describeScore("blitz", { score: 23, right: 23 })).toBe("23 right");
    expect(describeScore("race", { score: 72_400, right: 25 })).toBe("1:12.4");
    expect(describeScore("race", { score: 58_000, right: 25 })).toBe("0:58.0");
  });
});
