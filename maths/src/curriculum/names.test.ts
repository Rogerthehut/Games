import { describe, expect, it } from "vitest";
import { ALL_SKILLS } from "./index";

describe("skill names on the map", () => {
  it("are short enough for the label under a stop, which holds three lines", () => {
    for (const s of ALL_SKILLS) expect(s.name.length, s.name).toBeLessThanOrEqual(46);
  });
});
