/**
 * Picking the nicest voice a device has, and speaking in a natural rhythm. Browsers and phones all ship several voices of very different quality
 * (an "Enhanced" or "Natural" voice sounds like a person, a "compact" one sounds like a robot), and none says which is best, so this ranks them.
 * Nothing leaves the device: it only chooses among the voices already installed.
 */
export type VoicePreference = "female" | "male";
export interface VoiceInfo { name: string; lang: string; localService?: boolean }

// Browser voices have names and locales, but no standard gender field.
const FEMALE = /\b(female|kate|serena|martha|sonia|libby|susan|hazel|samantha|aria|jenny|zira|ava|allison|karen|stephanie|moira|fiona|tessa|amy|emma|olivia|mia|sara|jane)\b/i;
const MALE = /\b(male|daniel|oliver|arthur|ryan|george|thomas|alex|guy|davis|david|fred|lee|tom|james|brian|nathan|rishi)\b/i;
/** Voices known to sound good, by name. */
const GOOD = /\b(libby|sonia|ryan|aria|jenny|serena|daniel|kate|martha|arthur|stephanie|oliver|samantha|google uk english|google us english)\b/i;
/** Quality markers in a voice's name. */
const QUALITY = /\b(premium|enhanced|neural|natural|online|siri|studio|wavenet)\b/i;
/** Novelty and low-quality voices that must never be picked. */
const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|junior|organ|princess|ralph|trinoids|whisper|zarvox|espeak|fred|kathy|superstar|jester|wobble|grandma|grandpa|rocko|shelley|sandy|eddy|flo|reed)\b/i;

export function scoreVoice(v: VoiceInfo, preference: VoicePreference): number {
  const lang = v.lang.replace("_", "-");
  if (!/^en\b/i.test(lang) || NOVELTY.test(v.name)) return -100;
  let s = 0;
  s += /^en-GB$/i.test(lang) ? 6 : /^en-(IE|AU|ZA|NZ)$/i.test(lang) ? 2 : /^en-US$/i.test(lang) ? 1 : 0;
  if (QUALITY.test(v.name)) s += 7;
  if (GOOD.test(v.name)) s += 4;
  if (/\bcompact\b/i.test(v.name)) s -= 5;
  if (v.localService) s += 1;
  const other = preference === "female" ? MALE : FEMALE, want = preference === "female" ? FEMALE : MALE;
  if (want.test(v.name)) s += 5; else if (other.test(v.name)) s -= 6;
  return s;
}

/** English voices, best first for the preference. */
export function rankVoices<T extends VoiceInfo>(voices: readonly T[], preference: VoicePreference): T[] {
  return voices.filter((v) => scoreVoice(v, preference) > -50).sort((a, b) => scoreVoice(b, preference) - scoreVoice(a, preference));
}

let cache: SpeechSynthesisVoice[] = [];
/** The installed voices. Many browsers fill the list a moment after loading, so this waits briefly for it. */
export function loadVoices(timeout = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = typeof speechSynthesis === "undefined" ? undefined : speechSynthesis;
    if (!synth) return resolve([]);
    const now = synth.getVoices(); if (now.length) { cache = now; return resolve(now); }
    const done = () => { synth.removeEventListener?.("voiceschanged", done); clearTimeout(t); cache = synth.getVoices(); resolve(cache); };
    const t = setTimeout(done, timeout); synth.addEventListener?.("voiceschanged", done);
  });
}
export const cachedVoices = (): SpeechSynthesisVoice[] => { try { if (!cache.length && typeof speechSynthesis !== "undefined") cache = speechSynthesis.getVoices(); } catch { /* none */ } return cache; };

/** The voice to use: the one the grown-up chose by name if it's still installed, otherwise the best for the preference. */
export function chooseVoice(preference: VoicePreference, chosenName?: string): SpeechSynthesisVoice | undefined {
  const all = cachedVoices();
  const named = chosenName ? all.find((v) => v.name === chosenName) : undefined;
  return named ?? rankVoices(all, preference)[0];
}

/** Splits text into sentences, so each is said with its own natural rise and fall and long passages don't cut out (some Android voices stop after about 15 seconds). */
export function sentences(text: string): string[] {
  const parts = text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [];
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** How the voice sounds: a little slower and warmer for young children. */
export const SPEECH_STYLE = { reading: { rate: 0.94, pitch: 1.0 }, little: { rate: 0.82, pitch: 1.12 } } as const;

let preference: VoicePreference = "female";
let chosen: string | undefined;
/** Remembers which voice the learner using the app wants, for the spoken parts that don't know about the profile (Little ones). */
export function setVoicePrefs(p: VoicePreference, name?: string) { preference = p; chosen = name; }
export const currentVoice = () => chooseVoice(preference, chosen);
