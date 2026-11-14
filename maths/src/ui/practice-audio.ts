import { chooseVoice, loadVoices, sentences, SPEECH_STYLE } from "./voices";
import tapUrl from "../assets/kenney/click_002.mp3";
import successUrl from "../assets/kenney/confirmation_001.mp3";

export type NarrationVoice = "female" | "male";

export type NarrationStatus = "idle" | "loading" | "playing" | "fallback" | "error";

let activeNarration: SpeechSynthesisUtterance | undefined;
let narrationTimer: ReturnType<typeof setTimeout> | undefined;

export function stopPracticeNarration() {
  clearTimeout(narrationTimer);
  activeNarration = undefined;
  const speech = window.speechSynthesis;
  if (speech?.speaking || speech?.pending || speech?.paused) speech.cancel();
}

/** The voice a grown-up chose by name for the learner who is using the app, if any. Set whenever the active learner changes. */
let chosenName: string | undefined;
export const setChosenVoiceName = (name?: string) => { chosenName = name; };
export const getChosenVoiceName = () => chosenName;

/**
 * Reads text aloud with the best voice the device has (see voices.ts), a sentence at a time so it keeps a natural rhythm and long passages don't
 * cut out. `report` says when it starts and ends, and whether it had to fall back to a plain voice.
 */
export async function readPracticeQuestion(text: string, preference: NarrationVoice, report: (status: NarrationStatus) => void) {
  const speech = window.speechSynthesis;
  stopPracticeNarration();
  report("loading");
  await loadVoices();
  const match = chooseVoice(preference, chosenName);
  const parts = sentences(/[.!?]$/.test(text) ? text : `${text}.`);
  if (!parts.length) { report("idle"); return; }
  const token = {} as SpeechSynthesisUtterance; // marks this reading, so a newer one (or Stop) ends this one quietly
  activeNarration = token;
  const speakPart = (k: number, voice?: SpeechSynthesisVoice) => {
    if (activeNarration !== token) return;
    const utterance = new SpeechSynthesisUtterance(parts[k]);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-GB";
    utterance.rate = SPEECH_STYLE.reading.rate;
    utterance.pitch = SPEECH_STYLE.reading.pitch;
    const fail = () => {
      if (activeNarration !== token) return;
      clearTimeout(narrationTimer);
      if (voice) { speakPart(k); return; }          // this voice failed: try the device's default one
      stopPracticeNarration(); report("error");
    };
    utterance.onstart = () => { if (activeNarration !== token) return; clearTimeout(narrationTimer); if (k === 0) report(voice && voice === match ? "playing" : "fallback"); };
    utterance.onend = () => {
      if (activeNarration !== token) return;
      clearTimeout(narrationTimer);
      if (k + 1 < parts.length) { speakPart(k + 1, voice); return; }
      activeNarration = undefined; report(voice && voice === match ? "idle" : "fallback");
    };
    utterance.onerror = fail;
    narrationTimer = setTimeout(fail, 6000);
    try { if (speech.paused) speech.resume(); speech.speak(utterance); } catch { fail(); }
  };
  speakPart(0, match);
}

/** Read plain text and simple arithmetic. Leave richer notation to the on-screen maths renderer. */
export function spokenQuestion(prompt: string): string | undefined {
  const tokens: Record<string, string> = {
    "\\times": " times ", "\\div": " divided by ", "\\square": " blank ", "\\,": "", "\\%": " percent ",
    "+": " plus ", "-": " minus ", "−": " minus ", "×": " times ", "÷": " divided by ",
    "=": " equals ", "<": " is less than ", ">": " is greater than ", "%": " percent ",
  };
  const expressions = prompt.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
  for (let index = 1; index < expressions.length; index += 2) {
    const maths = expressions[index].replace(/\$/g, "");
    const fraction = maths.match(/^\\frac\{(\d+|\\square)\}\{(\d+|\\square)\}$/);
    const simple = fraction ? fraction.slice(1).join(" ÷ ") : maths;
    const token = /\\times\b|\\div\b|\\square\b|\\[, %]|[+\-−×÷=<>%]/g;
    if (!/^[\d\s.,]*$/.test(simple.replace(token, ""))) return;
    expressions[index] = simple.replace(token, (symbol) => fraction && symbol === "÷" ? " over " : tokens[symbol] ?? " ");
  }
  return expressions.join("").replace(/\s+/g, " ").trim();
}

/** What a tutor reply sounds like read out: simple arithmetic as words, and any other maths notation turned into plain speech or dropped. */
export function spokenReply(text: string): string {
  const plain = spokenQuestion(text);
  if (plain !== undefined) return plain;
  return text
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, " $1 over $2 ")
    .replace(/\^2\b/g, " squared ").replace(/\^3\b/g, " cubed ").replace(/\^\{?([\w.-]+)\}?/g, " to the power $1 ")
    .replace(/\\times|×/g, " times ").replace(/\\div|÷/g, " divided by ").replace(/\\square/g, " blank ").replace(/\\(?:%|,)/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ").replace(/[$\\{}]/g, " ")
    .replace(/(\d)\s*=\s*(?=\S)/g, "$1 equals ").replace(/\s+/g, " ").trim();
}

export function playPracticeSound(kind: "tap" | "success") {
  const sound = new Audio(kind === "tap" ? tapUrl : successUrl);
  if (kind === "success") {
    sound.volume = .45;
    void playClaps().catch(() => { /* The chime still plays if Web Audio is unavailable. */ });
  }
  void sound.play().catch(() => { /* Audio is optional on browsers that block playback. */ });
}

let effectsContext: AudioContext | undefined;

async function playClaps() {
  effectsContext ??= new AudioContext();
  const context = effectsContext;
  if (context.state === "suspended") await context.resume();
  const burst = context.createBuffer(1, Math.round(context.sampleRate * .07), context.sampleRate);
  const samples = burst.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = (Math.random() * 2 - 1) * Math.exp(-5 * i / samples.length);
  }
  const start = context.currentTime;
  for (const delay of [.07, .23]) {
    const clap = context.createBufferSource();
    clap.buffer = burst;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1150;
    filter.Q.value = .8;
    const volume = context.createGain();
    volume.gain.value = .17;
    clap.connect(filter).connect(volume).connect(context.destination);
    clap.onended = () => { clap.disconnect(); filter.disconnect(); volume.disconnect(); };
    clap.start(start + delay);
  }
}
