import { describe, expect, it } from "vitest";
import { SKILLS, STEM_SKILLS } from "../curriculum";
import { buildBooklet } from "./model";

describe("the curriculum booklet", () => {
  const { pages, contents } = buildBooklet();
  const text = pages.map((p) => p.html).join("\n");
  it("has a cover, a contents page and a back cover, numbered in order", () => {
    expect(pages[0].title).toBe("Cover");
    expect(pages[3].title).toBe("Contents");
    expect(pages[pages.length - 1].title).toBe("Back cover");
    pages.forEach((p, i) => expect(p.n).toBe(i + 1));
  });
  it("sends every chapter in the contents to a real page", () => {
    for (const c of contents) expect(pages[c.page - 1]?.chapter, c.chapter).toBe(c.chapter);
  });
  it("lists every topic, so it can never drift from what the app covers", () => {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    for (const s of [...SKILLS.filter((s) => s.strand !== "STEM"), ...STEM_SKILLS]) expect(text, s.id).toContain(`<h3>${esc(s.name.replace(/\$([^$]*)\$/g, "$1"))}</h3>`);
  });
  it("has no broken text", () => {
    expect(text).not.toMatch(/NaN|undefined|\[object|\$\$|\\frac|\\times/);
  });
});
