/**
 * Picking the nicest voice a device has, and speaking in a natural rhythm. Browsers and phones all ship several voices of very different quality
 * (an "Enhanced" or "Natural" voice sounds like a person, a "compact" one sounds like a robot), and none says which is best, so this ranks them.
 * Nothing leaves the device: it only chooses among the voices already installed.
 */
export type VoicePreference = "female" | "male";
export interface VoiceInfo { name: string; lang: string; localService?: boolean; voiceURI?: string }

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
  const id = `${v.name} ${v.voiceURI ?? ""}`;                    // iPhones keep the quality (compact, enhanced, premium) in the voice's id, not its name
  if (QUALITY.test(id)) s += 7;
  if (GOOD.test(v.name)) s += 4;
  if (/\bcompact\b/i.test(id)) s -= 5;
  if (v.localService) s += 1;
  const other = preference === "female" ? MALE : FEMALE, want = preference === "female" ? FEMALE : MALE;
  if (want.test(v.name)) s += 5; else if (other.test(v.name)) s -= 6;
  return s;
}

/** What identifies one installed voice. Several voices share a name (Samantha in two qualities, Daniel in two), so the name alone can't be used to pick one. */
export const voiceKey = (v: VoiceInfo): string => v.voiceURI || `${v.name}|${v.lang}`;
const REGION: Record<string, string> = { "en-GB": "UK", "en-US": "US", "en-AU": "Australia", "en-IE": "Ireland", "en-ZA": "South Africa", "en-IN": "India", "en-NZ": "New Zealand", "en-SG": "Singapore", "en-CA": "Canada" };
/** A name that tells similar voices apart: "Daniel · UK · Enhanced". */
export function voiceLabel(v: VoiceInfo): string {
  const lang = v.lang.replace("_", "-"), id = `${v.name} ${v.voiceURI ?? ""}`;
  const tier = /\bpremium\b/i.test(id) ? "Premium" : /\benhanced\b/i.test(id) ? "Enhanced" : /\b(neural|natural|online)\b/i.test(id) ? "Natural" : /\bcompact\b/i.test(id) ? "Standard" : "";
  return [v.name.replace(/\s*\((?:Enhanced|Premium|Compact)\)/i, ""), REGION[lang] ?? lang, tier].filter(Boolean).join(" · ");
}
/** The voices to offer in a list: ranked, with exact duplicates (same name, language and quality) shown once. */
export function listVoices<T extends VoiceInfo>(voices: readonly T[], preference: VoicePreference): T[] {
  const seen = new Set<string>(), out: T[] = [];
  for (const x of rankVoices(voices, preference)) { const k = voiceLabel(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
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
  const named = chosenName ? all.find((v) => voiceKey(v) === chosenName) ?? all.find((v) => v.name === chosenName) : undefined;
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
