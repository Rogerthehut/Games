import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PARENT_IDLE_MS, keepParentsOpen, lockParents, parentUnlocked, unlockParents } from "./gate";

describe("the grown-ups' area lock", () => {
  beforeEach(() => { vi.useFakeTimers(); lockParents(); });
  afterEach(() => vi.useRealTimers());

  it("never reopens by itself: activity can't unlock a locked area", () => {
    keepParentsOpen();
    expect(parentUnlocked()).toBe(false);
  });
  it("stays open while it is being used, and locks after five idle minutes", () => {
    unlockParents();
    vi.advanceTimersByTime(4 * 60_000); expect(parentUnlocked()).toBe(true);
    keepParentsOpen();                                  // a tap at 4 minutes
    vi.advanceTimersByTime(4 * 60_000); expect(parentUnlocked()).toBe(true);
    keepParentsOpen();
    vi.advanceTimersByTime(PARENT_IDLE_MS + 1000); expect(parentUnlocked()).toBe(false);
  });
  it("locks at once when asked", () => { unlockParents(); lockParents(); expect(parentUnlocked()).toBe(false); });
  it("has five minutes of idle time", () => expect(PARENT_IDLE_MS).toBe(5 * 60_000));
});
