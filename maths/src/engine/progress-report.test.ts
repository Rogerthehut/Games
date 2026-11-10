import { describe, expect, it } from "vitest";
import { buildProgressReport, csvCell, reportCsv, reportFileName } from "./progress-report";
import { DAY, newProfile, type Profile } from "./progress";

const now = Date.UTC(2026, 10, 10, 12);
const learner = (): Profile => {
  const p = newProfile("Maya", 5, now - 60 * DAY);
  p.skills["frac-add"] = { box: 5, due: now + 14 * DAY, seen: 12, right: 11, wrong: 1, last: now - DAY };
  p.skills["add-sub"] = { box: 1, due: now, seen: 8, right: 3, wrong: 5, last: now - 2 * DAY };
  p.sessions = [
    { at: now - DAY, minutes: 10, answered: 9, correct: 8, skills: ["frac-add"] },
    { at: now - 3 * DAY, minutes: 12, answered: 9, correct: 5, skills: ["add-sub"] },
    { at: now - 40 * DAY, minutes: 8, answered: 6, correct: 6, skills: [] },
  ];
  p.mistakes = { m1: { count: 4, skill: "add-sub", last: now, message: "Forgot to carry" } };
  p.focus = ["add-sub"];
  return p;
};

describe("the progress report", () => {
  const r = buildProgressReport(learner(), now);
  it("counts the last four weeks and all time separately", () => {
    expect(r.period).toMatchObject({ sessions: 2, minutes: 22, answered: 18, correct: 13, accuracy: 72, activeDays: 2 });
    expect(r.allTime).toMatchObject({ sessions: 3, answered: 24 });
  });
  it("bars the last eight weeks, oldest first", () => {
    expect(r.weeks).toHaveLength(8);
    expect(r.weeks[7].minutes).toBe(22);
    expect(r.weeks[0].start).toBeLessThan(r.weeks[7].start);
  });
  it("lists only skills that have been practised, with their status and accuracy", () => {
    const ids = r.skills.map((s) => s.id);
    expect(ids).toContain("frac-add"); expect(ids).toContain("add-sub");
    expect(r.skills.every((s) => s.seen > 0)).toBe(true);
    expect(r.skills.find((s) => s.id === "frac-add")).toMatchObject({ status: "secure", accuracy: 92 });
  });
  it("flags topics that need help, with something to ask and how to explain it", () => {
    expect(r.attention.map((a) => a.id)).toContain("add-sub");
    expect(r.attention[0].ask.length).toBeGreaterThan(5);
    expect(r.attention.find((a) => a.id === "frac-add")).toBeUndefined();
  });
  it("includes the repeated mistakes and the topics the parent asked to focus on", () => {
    expect(r.mistakes[0]).toMatchObject({ count: 4, message: "Forgot to carry" });
    expect(r.focus.length).toBe(1);
  });
  it("copes with a learner who has done nothing yet", () => {
    const e = buildProgressReport(newProfile("Zed", 4, now), now);
    expect(e.period).toMatchObject({ sessions: 0, accuracy: null });
    expect(e.level).toBeNull(); expect(e.skills).toEqual([]); expect(e.attention).toEqual([]);
  });
  it("tallies each strand once", () => {
    for (const s of r.strands) expect(Object.values(s.counts).reduce((a, b) => a + b, 0)).toBe(s.total);
  });
});

describe("the spreadsheet", () => {
  it("quotes cells that need it and defuses anything that could run as a formula", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("@x")).toBe("'@x");
    expect(csvCell("-5")).toBe("-5");
    expect(csvCell(null)).toBe("");
  });
  it("has a header and a row for each practised skill", () => {
    const lines = reportCsv(buildProgressReport(learner(), now)).trim().split("\r\n");
    expect(lines[0]).toBe("Skill,Strand,School year,Status,Right,Wrong,Accuracy %,Last practised,Next review,Sessions in chosen period");
    expect(lines.length).toBe(1 + 2);
  });
  it("names files safely", () => {
    expect(reportFileName(buildProgressReport(newProfile("Ma/ya O'Neil", 5, now), now), "pdf")).toBe("quarter-progress-ma-ya-o-neil-2026-11-10.pdf");
    expect(reportFileName(buildProgressReport(newProfile("???", 5, now), now), "csv")).toBe("quarter-progress-learner-2026-11-10.csv");
  });
});

describe("a chosen period", () => {
  const p = learner();
  it("counts only the sessions inside the dates, with a bar for each day when it is short", () => {
    const r = buildProgressReport(p, now, { from: now - 4 * DAY, to: now });
    expect(r.period).toMatchObject({ custom: true, sessions: 2, minutes: 22 });
    expect(r.unit).toBe("day");
    expect(r.weeks).toHaveLength(4);
    expect(r.weeks.reduce((n, b) => n + b.minutes, 0)).toBe(22);
  });
  it("can pick out a single week and leave the rest out", () => {
    const r = buildProgressReport(p, now, { from: now - 2 * DAY - 1, to: now });
    expect(r.period.sessions).toBe(1);
    expect(r.period.minutes).toBe(10);
    expect(r.practised).toEqual([{ skill: expect.any(String), sessions: 1 }]);
  });
  it("uses a bar a week for a long period and includes the old session", () => {
    const r = buildProgressReport(p, now, { from: now - 60 * DAY, to: now });
    expect(r.unit).toBe("week");
    expect(r.period.sessions).toBe(3);
    expect(r.weeks.reduce((n, b) => n + b.minutes, 0)).toBe(30);
  });
  it("shows nothing for a period with no practice, and the spreadsheet says how many sessions each topic had in it", () => {
    const quiet = buildProgressReport(p, now, { from: now - 30 * DAY, to: now - 20 * DAY });
    expect(quiet.period).toMatchObject({ sessions: 0, accuracy: null });
    const csv = reportCsv(buildProgressReport(p, now, { from: now - 4 * DAY, to: now }));
    expect(csv.split("\r\n")[0]).toContain("Sessions in chosen period");
  });
});
