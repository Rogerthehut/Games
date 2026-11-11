import { describe, expect, it } from "vitest";
import { avatarBand, avatarForYear } from "./avatar";

describe("avatar age bands", () => {
  it("matches the school year to a band", () => {
    expect([3, 4, 6].map(avatarBand)).toEqual(["junior", "junior", "junior"]);
    expect([7, 8, 10].map(avatarBand)).toEqual(["older", "older", "older"]);
    expect([11, 12, 13].map(avatarBand)).toEqual(["teen", "teen", "teen"]);
  });
  it("keeps a portrait from the learner's own band", () => {
    expect(avatarForYear({ role: "artist", variant: 4, band: "older" }, 9)).toMatchObject({ role: "artist", variant: 4, band: "older" });
    expect(avatarForYear({ role: "skater", variant: 3 }, 5)).toMatchObject({ role: "skater", variant: 3, band: "junior" });
  });
  it("moves a learner to their band's first portrait when the year changes, keeping character and glasses", () => {
    expect(avatarForYear({ role: "builder", variant: 7, glasses: "round" }, 8)).toEqual({ role: "builder", variant: 1, glasses: "round", band: "older" });
    expect(avatarForYear({ role: "explorer", variant: 2, band: "older" }, 12)).toMatchObject({ role: "explorer", variant: 1, band: "teen" });
    expect(avatarForYear({ role: "explorer", variant: 2, band: "teen" }, 5)).toMatchObject({ variant: 0, band: "junior" });
  });
  it("treats an old or missing saved avatar as the youngest band", () => {
    expect(avatarForYear(undefined, 4)).toMatchObject({ role: "explorer", variant: 0, band: "junior" });
    expect(avatarForYear("artist", 11)).toMatchObject({ role: "artist", band: "teen" });
  });
});
