import { describe, expect, it } from "vitest";
import { makeSearchIndex } from "./search";

const find = makeSearchIndex([
  { title: "Reading bar charts", keywords: "statistics display data Year 3", year: 3, stage: "KS2" },
  { title: "Angles in polygons", keywords: "geometry interior degrees Year 7 Key Stage 3", year: 7, stage: "KS3" },
  { title: "Equivalent fractions", keywords: "same value Year 4", year: 4, stage: "KS2" },
  { title: "Comparing fractions", keywords: "order by size Year 3", year: 3, stage: "KS2" },
]);

describe("Quarter search", () => {
  it("ranks exact names first and matches keywords across fields", () => {
    expect(find("EQUIVALENT FRACTIONS")[0]?.title).toBe("Equivalent fractions");
    expect(find("charts statistics year 3").map((item) => item.title)).toEqual(["Reading bar charts"]);
  });

  it("uses year and stage qualifiers as exact curriculum filters", () => {
    expect(find("year 3").map((item) => item.title)).toEqual(["Comparing fractions", "Reading bar charts"]);
    expect(find("Y3 fractns").map((item) => item.title)).toEqual(["Comparing fractions"]);
    expect(find("year 3 frac*").map((item) => item.title)).toEqual(["Comparing fractions"]);
    expect(find("Key Stage 3").map((item) => item.title)).toEqual(["Angles in polygons"]);
    expect(find("KS2 year 4").map((item) => item.title)).toEqual(["Equivalent fractions"]);
    expect(find("KS3 year 3")).toEqual([]);
  });

  it("matches prefixes and tolerates swapped or missing letters", () => {
    expect(find("equiv fractns")[0]?.title).toBe("Equivalent fractions");
    expect(find("anlges polygns")[0]?.title).toBe("Angles in polygons");
  });

  it("supports whole-word wildcard patterns", () => {
    expect(find("fr*ions")).toHaveLength(2);
    expect(find("b?r ch?rt*").map((item) => item.title)).toEqual(["Reading bar charts"]);
    expect(find("b??r")).toEqual([]);
    expect(find("***")).toEqual([]);
  });

  it("requires every keyword and ignores punctuation", () => {
    expect(find("Bar, charts!")[0]?.title).toBe("Reading bar charts");
    expect(find("fraction dinosaurs")).toEqual([]);
    expect(find(" ")).toEqual([]);
  });
});
