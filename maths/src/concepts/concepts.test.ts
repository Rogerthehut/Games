import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "../curriculum";
import { CONCEPTS, CONCEPT_BY_ID, conceptsForSkill } from "./library";
import { FIGURES, figureSvg, pascalTriangle } from "./figures";
import { blocksToHtml, conceptBodyHtml, mathsToHtml, plainText } from "./render";
import type { Block } from "./types";

const texts = (c: (typeof CONCEPTS)[number]): string[] => {
  const fromBlocks = (bs: Block[]) => bs.flatMap((b) => ("p" in b ? [b.p] : "h" in b ? [b.h] : b.list));
  return [c.summary, c.why, c.figure.caption, c.example.prompt, ...c.example.steps, ...fromBlocks(c.kid), ...fromBlocks(c.grownUp)];
};

describe("the study library", () => {
  it("has unique ids, and every id is a safe file name", () => {
    const ids = CONCEPTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it("only points at topics and concepts that exist", () => {
    for (const c of CONCEPTS) {
      for (const s of c.skills) expect(SKILL_BY_ID[s], `${c.id} -> ${s}`).toBeDefined();
      for (const r of c.related) expect(CONCEPT_BY_ID[r], `${c.id} -> ${r}`).toBeDefined();
      expect(c.related).not.toContain(c.id);
    }
  });
  it("has real content for learners and for grown-ups", () => {
    for (const c of CONCEPTS) {
      expect(c.kid.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.grownUp.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.example.steps.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.skills.length, c.id).toBeGreaterThan(0);
      expect(c.further.length, c.id).toBeGreaterThan(0);
    }
  });
  it("keeps the learner text short and in plain words", () => {
    for (const c of CONCEPTS) for (const b of c.kid) if ("p" in b) expect(plainText(b.p).split(/\s+/).length, `${c.id}: ${b.p.slice(0, 40)}`).toBeLessThan(65);
  });
  it("has balanced maths markers in every paragraph", () => {
    for (const c of CONCEPTS) for (const t of texts(c)) expect((t.match(/\$/g) ?? []).length % 2, `${c.id}: ${t.slice(0, 50)}`).toBe(0);
  });
  it("links only to https pages, and never copies another site's text", () => {
    for (const c of CONCEPTS) for (const f of c.further) expect(f.url, c.id).toMatch(/^https:\/\//);
  });
  it("finds the concepts for a topic", () => {
    expect(conceptsForSkill("binomial-coefficient").map((c) => c.id)).toContain("pascals-triangle");
    expect(conceptsForSkill("pythagoras").map((c) => c.id)).toContain("pythagoras-theorem");
    expect(conceptsForSkill("no-such-skill")).toEqual([]);
  });
});

describe("the pictures", () => {
  it("draw a valid, labelled SVG for every figure the library uses", () => {
    for (const id of Object.keys(FIGURES) as (keyof typeof FIGURES)[]) {
      const svg = figureSvg(id);
      expect(svg.startsWith("<svg"), id).toBe(true);
      expect(svg.endsWith("</svg>"), id).toBe(true);
      expect(svg, id).toMatch(/aria-label="[^"]{8,}"/);
      expect(svg, id).not.toMatch(/NaN|undefined/);
    }
    for (const c of CONCEPTS) expect(FIGURES[c.figure.id], c.id).toBeDefined();
  });
  it("gets Pascal's triangle right", () => {
    const svg = pascalTriangle(6);
    for (const n of [1, 5, 10]) expect(svg).toContain(`>${n}</text>`);
    expect((svg.match(/<rect /g) ?? []).length).toBe(21); // 1 + 2 + … + 6
  });
});

describe("turning a concept into a page", () => {
  it("renders the maths, escapes the rest and includes every section", () => {
    expect(mathsToHtml("<b> and $x^2$")).toContain("&lt;b&gt;");
    expect(mathsToHtml("$x^2$")).toContain("katex");
    expect(blocksToHtml([{ h: "A & B" }, { list: ["one"] }])).toContain("A &amp; B");
    const html = conceptBodyHtml(CONCEPT_BY_ID["pascals-triangle"], { "binomial-coefficient": "Binomial expansion coefficients" });
    for (const part of ["For learners", "A worked example", "For grown-ups", "Why it matters", "Read more", "Binomial expansion coefficients", "<svg"]) expect(html).toContain(part);
  });
});

import { readFileSync } from "node:fs";
import { conceptPages } from "../../scripts/concept-pages";

describe("the public study pages", () => {
  const pages = conceptPages('<link rel="stylesheet" href="/x.css">');
  it("make an index and one page for each concept, each readable on its own", () => {
    expect(pages.map((p) => p.path)).toEqual(["learn/index.html", ...CONCEPTS.map((c) => `learn/${c.id}.html`)]);
    for (const p of pages) {
      expect(p.html, p.path).toContain('<base href="/">');
      expect(p.html, p.path).toMatch(/<title>[^<]+ \| quarter<\/title>/);
      expect(p.html, p.path).toContain('rel="canonical"');
      expect(p.html, p.path).toContain("application/ld+json");
      expect(p.html, p.path).not.toMatch(/NaN|undefined|\[object/);
    }
  });
  it("are all in the sitemap, so search engines can find them", () => {
    const sitemap = readFileSync("public/sitemap.xml", "utf8");
    for (const p of pages) expect(sitemap, p.path).toContain(`https://yourquarter.co.uk/${p.path}`);
  });
});
