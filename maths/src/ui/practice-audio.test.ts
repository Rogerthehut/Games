import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Reading aloud: the best voice is picked, each sentence is said in turn, and a newer reading cancels an older one. */
const spoken: { text: string; voice?: string; rate: number }[] = [];
let queue: { u: FakeUtterance }[] = [];
class FakeUtterance { text: string; voice?: { name: string; lang: string }; lang = ""; rate = 1; pitch = 1; onstart?: () => void; onend?: () => void; onerror?: () => void; constructor(t: string) { this.text = t; } }
const voices = [{ name: "Albert", lang: "en-US", localService: true }, { name: "Daniel (Enhanced)", lang: "en-GB", localService: true }, { name: "Serena (Premium)", lang: "en-GB", localService: true }];
const g = globalThis as Record<string, unknown>;
beforeEach(() => {
  spoken.length = 0; queue = [];
  const synth = { speaking: false, pending: false, paused: false, getVoices: () => voices, addEventListener: () => {}, removeEventListener: () => {}, cancel: () => { queue = []; }, resume: () => {}, speak: (u: FakeUtterance) => { spoken.push({ text: u.text, voice: u.voice?.name, rate: u.rate }); queue.push({ u }); setTimeout(() => { u.onstart?.(); u.onend?.(); }, 0); } };
  g.window = { speechSynthesis: synth }; g.speechSynthesis = synth; g.SpeechSynthesisUtterance = FakeUtterance;
});
afterEach(() => { delete g.window; delete g.speechSynthesis; delete g.SpeechSynthesisUtterance; vi.resetModules(); });

describe("reading aloud", () => {
  it("says each sentence in turn with the best voice for the preference, and ends as idle", async () => {
    const { readPracticeQuestion } = await import("./practice-audio");
    const status: string[] = [];
    await readPracticeQuestion("Ready to go? What is eight plus five?", "female", (s) => status.push(s));
    await new Promise((r) => setTimeout(r, 30));
    expect(spoken.map((s) => s.text)).toEqual(["Ready to go?", "What is eight plus five?"]);
    expect(new Set(spoken.map((s) => s.voice))).toEqual(new Set(["Serena (Premium)"]));
    expect(spoken[0].rate).toBeLessThan(1);
    expect(status[0]).toBe("loading"); expect(status).toContain("playing"); expect(status[status.length - 1]).toBe("idle");
  });
  it("uses a male voice when asked, and the voice a grown-up chose by name", async () => {
    const { readPracticeQuestion, setChosenVoiceName } = await import("./practice-audio");
    await readPracticeQuestion("Hello there", "male", () => {}); await new Promise((r) => setTimeout(r, 20));
    expect(spoken[0].voice).toBe("Daniel (Enhanced)");
    spoken.length = 0; setChosenVoiceName("Albert");
    await readPracticeQuestion("Hello again", "female", () => {}); await new Promise((r) => setTimeout(r, 20));
    expect(spoken[0].voice).toBe("Albert");
  });
});
