import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "./index";
import { SATS_CODES, SATS_PARTIAL, SATS_STATEMENTS, SATS_TOPICS } from "./sats-map";

describe("the Key Stage 2 test map", () => {
  const used = new Set<string>();
  for (const papers of Object.values(SATS_CODES)) for (const paper of Object.values(papers)) for (const codes of Object.values(paper)) codes.forEach((c) => used.add(c));
  it("has a topic or more for every code the tests used, and every topic exists in Key Stage 2", () => {
    for (const c of used) expect(SATS_TOPICS[c]?.length, c).toBeGreaterThan(0);
    for (const [c, ids] of Object.entries(SATS_TOPICS)) for (const id of ids) { expect(SKILL_BY_ID[id], `${c} -> ${id}`).toBeDefined(); expect(SKILL_BY_ID[id].stage, `${c} -> ${id}`).toBe("KS2"); }
  });
  it("only lists a partial note for a code that is mapped, and codes from the right year", () => {
    for (const c of Object.keys(SATS_PARTIAL)) expect(SATS_TOPICS[c], c).toBeDefined();
    for (const c of used) expect(c).toMatch(/^[3-6][A-Z]\d{1,2}[a-z]?$/);
  });
  it("covers both tests with their three papers, and keeps no question text", () => {
    expect(Object.keys(SATS_CODES)).toEqual(["2024", "2025"]);
    for (const papers of Object.values(SATS_CODES)) expect(Object.keys(papers)).toEqual(["P1", "P2", "P3"]);
    expect(Object.values(SATS_STATEMENTS).every((s) => s.length < 260)).toBe(true);
  });
  it("matches the number of questions the mark schemes list", () => {
    expect(Object.keys(SATS_CODES["2025"].P1)).toHaveLength(36);
    expect(Object.keys(SATS_CODES["2024"].P1)).toHaveLength(36);
  });
});
