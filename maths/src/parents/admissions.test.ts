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

describe("per-school entries", () => {
  it("each carry a test, a note, a dated source and a link to a school or council site", () => {
    for (const a of admissions) for (const sc of (a as { schools?: { name: string; test: string; note: string; checked: string; source: { path: string } }[] }).schools ?? []) {
      expect(sc.name.length, a.id).toBeGreaterThan(3);
      expect(sc.test.length, sc.name).toBeGreaterThan(2);
      expect(sc.note.length, sc.name).toBeGreaterThan(10);
      expect(sc.checked, sc.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(sc.source.path, sc.name).toMatch(/^https:\/\//);
    }
  });
});

describe("11+ finder areas for postcode search", () => {
  it("lists the council names each area covers", () => {
    for (const a of admissions) {
      const c = (a as { councils?: string[] }).councils;
      expect(Array.isArray(c) && c.length > 0, a.id).toBe(true);
      for (const name of c ?? []) expect(name.trim().length, a.id).toBeGreaterThan(2);
    }
  });
});
