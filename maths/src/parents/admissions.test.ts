import { describe, expect, it } from "vitest";
import admissions from "./admissions.json";

describe("11+ test finder data", () => {
  it("has unique ids and at least one link per area", () => {
    const ids = admissions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of admissions) expect(a.links.length, a.id).toBeGreaterThan(0);
  });
  it("only states a test provider with a status, a date and a note", () => {
    for (const a of admissions) {
      const t = (a as { test?: { provider: string; status: string; checked: string; note: string; source?: { path: string } } }).test;
      if (!t) continue;
      expect(["confirmed", "reported", "disputed"], a.id).toContain(t.status);
      expect(t.checked, a.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(t.provider.length, a.id).toBeGreaterThan(2);
      expect(t.note.length, a.id).toBeGreaterThan(10);
    }
  });
  it("only calls a provider confirmed when it links to an official source", () => {
    for (const a of admissions) {
      const t = (a as { test?: { status: string; source?: { path: string } } }).test;
      if (t?.status === "confirmed") expect(t.source?.path, a.id).toMatch(/^https:\/\/www\.[a-z-]+\.gov\.uk\//);
    }
  });
});
