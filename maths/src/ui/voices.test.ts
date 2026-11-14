import { describe, expect, it } from "vitest";
import { listVoices, rankVoices, scoreVoice, sentences, voiceKey, voiceLabel, type VoiceInfo } from "./voices";

const v = (name: string, lang: string, localService = true, voiceURI?: string): VoiceInfo => ({ name, lang, localService, voiceURI });
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

describe("telling similar voices apart", () => {
  const iphone = [
    v("Samantha", "en-US", true, "com.apple.voice.compact.en-US.Samantha"), v("Samantha", "en-US", true, "com.apple.voice.enhanced.en-US.Samantha"),
    v("Daniel", "en-GB", true, "com.apple.voice.compact.en-GB.Daniel"), v("Daniel", "en-GB", true, "com.apple.voice.premium.en-GB.Daniel"), v("Moira", "en-IE", true, "com.apple.voice.compact.en-IE.Moira"),
  ];
  it("labels say the region and quality, so two voices with the same name no longer look identical", () => {
    const labels = iphone.map(voiceLabel); expect(new Set(labels).size).toBe(iphone.length);
    expect(voiceLabel(iphone[3])).toBe("Daniel · UK · Premium"); expect(voiceLabel(iphone[0])).toBe("Samantha · US · Standard");
    expect(new Set(iphone.map(voiceKey)).size).toBe(iphone.length);
  });
  it("the better quality of the same voice ranks first, and exact duplicates are listed once", () => {
    const ranked = rankVoices(iphone, "male").map((x) => x.voiceURI); expect(ranked.indexOf("com.apple.voice.premium.en-GB.Daniel")).toBeLessThan(ranked.indexOf("com.apple.voice.compact.en-GB.Daniel"));
    expect(listVoices([...iphone, iphone[3]], "male").length).toBe(2);    // the two Daniels, the repeated one shown once, no women
    expect(listVoices(iphone, "female").length).toBe(3);                  // two Samanthas and Moira
  });
});

describe("the Voice list matches the female or male choice", () => {
  const all = [v("Samantha", "en-US"), v("Karen", "en-AU"), v("Moira", "en-IE"), v("Tessa", "en-ZA"), v("Daniel", "en-GB"), v("Rishi", "en-IN"), v("Arthur", "en-GB"), v("Google UK English Female", "en-GB", false), v("Google UK English Male", "en-GB", false), v("English United Kingdom", "en-GB")];
  it("female shows no male voices and male shows no female voices", () => {
    const f = listVoices(all, "female").map((x) => x.name), m = listVoices(all, "male").map((x) => x.name);
    for (const n of ["Daniel", "Rishi", "Arthur", "Google UK English Male"]) expect(f).not.toContain(n);
    for (const n of ["Samantha", "Karen", "Moira", "Tessa", "Google UK English Female"]) expect(m).not.toContain(n);
    expect(f).toContain("Samantha"); expect(m).toContain("Daniel");
  });
  it("a voice whose name doesn't say stays in both, so nothing is hidden by a wrong guess", () => {
    expect(listVoices(all, "female").map((x) => x.name)).toContain("English United Kingdom"); expect(listVoices(all, "male").map((x) => x.name)).toContain("English United Kingdom");
  });
});
