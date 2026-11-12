import { describe, expect, it } from "vitest";

import { mergeFromOtherScreen } from "./storage";
import { newProfile } from "./progress";
describe("two screens at once", () => {
  const a = { ...newProfile("A", 4), id: "a" }, b = { ...newProfile("B", 5), id: "b" };
  it("takes the other screen's changes to other children and keeps its own child as it is", () => {
    const mine = { version: 1, profiles: [{ ...a, points: 10 }, b], activeId: "a" };
    const saved = { version: 1, profiles: [{ ...a, points: 99 }, { ...b, points: 7 }], activeId: "b" };
    const out = mergeFromOtherScreen(mine, saved);
    expect(out.profiles[0].points).toBe(10); // own child kept
    expect(out.profiles[1].points).toBe(7); // the other child updated
    expect(out.activeId).toBe("a"); // and this screen keeps showing its own child
  });
  it("returns the same store when nothing differs, so two screens don't keep re-saving", () => {
    const mine = { version: 1, profiles: [a, b], activeId: "a" };
    expect(mergeFromOtherScreen(mine, { version: 1, profiles: [a, b], activeId: "b" })).toBe(mine);
  });
  it("accepts a child removed on the other screen, and keeps one just added here", () => {
    const c = { ...newProfile("C", 6), id: "c" };
    expect(mergeFromOtherScreen({ version: 1, profiles: [a, b], activeId: "a" }, { version: 1, profiles: [a], activeId: "a" }).profiles.map((p) => p.id)).toEqual(["a"]);
    expect(mergeFromOtherScreen({ version: 1, profiles: [a, c], activeId: "c" }, { version: 1, profiles: [a], activeId: "a" }).profiles.map((p) => p.id)).toEqual(["a", "c"]);
  });
});
