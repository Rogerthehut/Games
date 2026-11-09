import tapUrl from "../assets/kenney/click_002.mp3";
import successUrl from "../assets/kenney/confirmation_001.mp3";

export type NarrationVoice = "female" | "male";

// Browser voices have names and locales, but no standard gender field.
const VOICE_NAMES: Record<NarrationVoice, RegExp> = {
  female: /\b(female|kate|serena|martha|sonia|libby|susan|hazel|samantha|aria|jenny|zira|ava|allison|karen)\b/i,
  male: /\b(male|daniel|oliver|arthur|ryan|george|thomas|alex|guy|davis|david|fred|lee|tom)\b/i,
};

export type NarrationStatus = "idle" | "loading" | "playing" | "fallback" | "error";

let activeNarration: SpeechSynthesisUtterance | undefined;
let narrationTimer: ReturnType<typeof setTimeout> | undefined;

export function stopPracticeNarration() {
  clearTimeout(narrationTimer);
  activeNarration = undefined;
  const speech = window.speechSynthesis;
  if (speech?.speaking || speech?.pending || speech?.paused) speech.cancel();
}

export function readPracticeQuestion(text: string, preference: NarrationVoice, report: (status: NarrationStatus) => void) {
  const speech = window.speechSynthesis;
  stopPracticeNarration();
  const english = speech.getVoices().filter(({ lang }) => /^en\b/i.test(lang.replace("_", "-")));
  const ranked = [...english].sort((a, b) => voiceRank(b) - voiceRank(a));
  const match = ranked.find(({ name }) => VOICE_NAMES[preference].test(name));
  const selected = match ?? ranked[0];
  const say = (voice?: SpeechSynthesisVoice) => {
    const utterance = new SpeechSynthesisUtterance(/[.!?]$/.test(text) ? text : `${text}.`);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-GB";
    utterance.rate = 0.95;
    utterance.pitch = 1.02;
    activeNarration = utterance;
    const fail = () => {
      if (activeNarration !== utterance) return;
      stopPracticeNarration();
      if (voice) say();
      else report("error");
    };
    utterance.onstart = () => {
      if (activeNarration !== utterance) return;
      clearTimeout(narrationTimer);
      report(voice && voice === match ? "playing" : "fallback");
    };
    utterance.onend = () => {
      if (activeNarration !== utterance) return;
      clearTimeout(narrationTimer);
      activeNarration = undefined;
      report(voice && voice === match ? "idle" : "fallback");
    };
    utterance.onerror = fail;
    narrationTimer = setTimeout(fail, 4500);
    try {
      if (speech.paused) speech.resume();
      speech.speak(utterance);
    } catch { fail(); }
  };
  report("loading");
  say(selected);
}

function voiceRank(voice: SpeechSynthesisVoice): number {
  return (/^en[-_]GB$/i.test(voice.lang) ? 4 : 0)
    + (/\b(premium|enhanced|natural|online)\b/i.test(voice.name) ? 2 : 0)
    + (voice.localService ? 1 : 0);
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
