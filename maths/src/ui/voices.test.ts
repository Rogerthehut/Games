import { describe, expect, it } from "vitest";
import { rankVoices, scoreVoice, sentences, type VoiceInfo } from "./voices";

const v = (name: string, lang: string, localService = true): VoiceInfo => ({ name, lang, localService });
const installed = [
  v("Albert", "en-US"), v("Fred", "en-US"), v("Samantha", "en-US"), v("Daniel (Enhanced)", "en-GB"), v("Daniel", "en-GB"), v("Serena (Premium)", "en-GB"), v("Kate", "en-GB"),
  v("Google UK English Female", "en-GB", false), v("Microsoft Libby Online (Natural) - English (United Kingdom)", "en-GB", false), v("Karen (Compact)", "en-AU"), v("Amelie", "fr-FR"), v("eSpeak English", "en"),
];

describe("choosing the nicest voice", () => {
  it("prefers premium and natural British voices, and never a novelty or non-English voice", () => {
    const f = rankVoices(installed, "female").map((x) => x.name);
    expect(f[0]).toMatch(/Serena \(Premium\)|Libby Online/); expect(f.slice(0, 3).join(" ")).toMatch(/Serena|Libby/);
    expect(f).not.toContain("Albert"); expect(f).not.toContain("Fred"); expect(f).not.toContain("Amelie"); expect(f).not.toContain("eSpeak English");
    const m = rankVoices(installed, "male").map((x) => x.name);
    expect(m[0]).toBe("Daniel (Enhanced)"); expect(m.indexOf("Daniel (Enhanced)")).toBeLessThan(m.indexOf("Daniel"));
  });
  it("a compact voice ranks below the same kind of voice that isn't", () => {
    expect(scoreVoice(v("Karen (Compact)", "en-AU"), "female")).toBeLessThan(scoreVoice(v("Kate", "en-GB"), "female"));
    expect(scoreVoice(v("Amelie", "fr-FR"), "female")).toBeLessThan(0);
  });
  it("an English voice is still found when nothing is named well", () => {
    const only = rankVoices([v("English United Kingdom", "en-GB")], "female"); expect(only.length).toBe(1);
  });
});
describe("speaking in sentences", () => {
  it("splits at the end of each sentence and keeps the last part", () => {
    expect(sentences("Ready to give it a go? What is eight plus five?")).toEqual(["Ready to give it a go?", "What is eight plus five?"]);
    expect(sentences("Count the apples.  Then tap 3!  Well done")).toEqual(["Count the apples.", "Then tap 3!", "Well done"]);
    expect(sentences("")).toEqual([]);
  });
});
