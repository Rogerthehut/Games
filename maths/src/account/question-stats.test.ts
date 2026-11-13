import { afterEach, describe, expect, it, vi } from "vitest";
import { bandOfYear, flushQuestionStats, noteQuestion, setQuestionStatsSender, type QEvent } from "./question-stats";

afterEach(() => { setQuestionStatsSender(null); vi.useRealTimers(); });
const note = (o: Partial<Parameters<typeof noteQuestion>[0]> = {}, on = true) => noteQuestion({ skill: "add", level: 2, year: 5, kind: "right", secs: 8, ...o }, on);

describe("question statistics queue", () => {
  it("sends only what the server needs, and nothing identifying", async () => {
    const sent: QEvent[][] = []; setQuestionStatsSender(async (e) => { sent.push(e); });
    note(); note({ kind: "wrong", year: 8, secs: 400, tags: ["a", "b", "c", "d"] }); note({ kind: "helped", level: 99 });
    await flushQuestionStats();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual([
      { skill: "add", level: 2, band: "ks2", r: 0, s: 8, tags: [] },
      { skill: "add", level: 2, band: "ks3", r: 2, s: 180, tags: ["a", "b", "c"] },
      { skill: "add", level: 10, band: "ks2", r: 1, s: 8, tags: [] },
    ]);
  });
  it("does nothing when switched off or signed out", async () => {
    const send = vi.fn(async () => {}); note(); setQuestionStatsSender(send); note({}, false); await flushQuestionStats();
    expect(send).not.toHaveBeenCalled();
  });
  it("drops what is waiting on sign-out, and a failed send never throws", async () => {
    const send = vi.fn(async () => {}); setQuestionStatsSender(send); note(); setQuestionStatsSender(null); setQuestionStatsSender(send); await flushQuestionStats();
    expect(send).not.toHaveBeenCalled();
    setQuestionStatsSender(async () => { throw new Error("offline"); }); note(); await expect(flushQuestionStats()).resolves.toBeUndefined();
  });
  it("sends a full batch at once and a small one after a minute", async () => {
    vi.useFakeTimers(); const send = vi.fn(async () => {}); setQuestionStatsSender(send);
    for (let i = 0; i < 25; i++) note(); expect(send).toHaveBeenCalledTimes(1);
    note(); expect(send).toHaveBeenCalledTimes(1); await vi.advanceTimersByTimeAsync(61_000); expect(send).toHaveBeenCalledTimes(2);
  });
  it("bands match the server's", () => { expect([3, 6, 7, 9, 10, 11, 12, 13].map(bandOfYear)).toEqual(["ks2", "ks2", "ks3", "ks3", "ks4", "ks4", "ks5", "ks5"]); });
});
