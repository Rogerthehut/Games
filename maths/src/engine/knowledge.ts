import { ALL_SKILLS, SKILL_BY_ID } from "../curriculum";
import { STAGE_LABEL } from "../curriculum";
import type { Skill } from "./types";

/**
 * The app's own teaching notes, used to ground the AI helpers. It is the same text parents read under each topic,
 * so the assistants explain things the way quarter does, not in some other method.
 */
export interface Note { id: string; name: string; year: number; stage: string; strand: string; summary: string; explain: string; ask: string; childLine: string }

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")}…` : s);
const strip = (s: string) => s.replace(/\$/g, "").replace(/\s+/g, " ").trim();

export function noteFor(skill: Skill): Note {
  return {
    id: skill.id, name: skill.name, year: skill.year, stage: STAGE_LABEL[skill.stage], strand: skill.strand,
    summary: clip(strip(skill.blurb), 220), explain: clip(strip(skill.parentNote), 520), ask: clip(strip(skill.talkAbout), 220), childLine: clip(strip(skill.explainer ?? ""), 220),
  };
}

const STOP = new Set(["the", "a", "an", "of", "to", "and", "or", "in", "on", "is", "are", "how", "do", "does", "i", "my", "me", "we", "you", "it", "what", "why", "with", "for", "can", "this", "that", "child", "kid", "kids", "help", "explain", "teach", "year", "there", "hello", "hi", "please", "thanks", "thank", "about", "when", "where", "which", "some", "just", "need", "want", "like", "know", "does", "have", "get"]);
/** Words parents use, mapped to the words the topics use. */
const SYNONYMS: Record<string, string[]> = {
  "bus": ["written", "division", "short"], "stop": ["written", "division"], "carry": ["written", "adding", "addition"], "carrying": ["written", "adding"],
  "borrow": ["subtracting", "subtraction"], "borrowing": ["subtracting"], "times": ["multiplying", "tables", "multiplication"], "timestables": ["tables"],
  "multiply": ["multiplying"], "divide": ["dividing", "division"], "fraction": ["fractions"], "decimal": ["decimals"], "percent": ["percentages"], "percentage": ["percentages"],
  "clock": ["time"], "money": ["money", "change"], "angles": ["angles"], "algebra": ["algebra", "equations"], "ratio": ["ratio", "sharing", "scaling"], "shape": ["geometry", "shapes"],
  "grid": ["multiplying", "written"], "chunking": ["dividing", "division"], "bar": ["bar", "model"],
};

const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9+\s]/g, " ").split(/\s+/).filter((t) => t && !STOP.has(t));

/** The topics most likely to help with a question. Plain keyword scoring: fast, explainable, and needs no extra service. */
export function searchNotes(query: string, limit = 3, year?: number): Note[] {
  const words = [...new Set(tokens(query).flatMap((t) => [t, ...(SYNONYMS[t] ?? [])]))];
  if (!words.length) return [];
  const scored = ALL_SKILLS.map((s) => {
    const name = s.name.toLowerCase(), blurb = s.blurb.toLowerCase(), note = s.parentNote.toLowerCase(), ask = s.talkAbout.toLowerCase(), id = s.id.toLowerCase();
    let score = 0, strong = false;
    for (const w of words) {
      const stem = w.length > 4 ? w.slice(0, w.length - 1) : w;
      if (name.includes(stem)) { score += 6; strong = true; }
      if (id.includes(stem)) { score += 3; strong = true; }
      if (blurb.includes(stem)) { score += 2; strong = true; }
      if (note.includes(stem)) score += 2;
      if (ask.includes(stem)) score += 1;
    }
    if (score > 0 && year) {
      score += Math.max(0, 1.5 - Math.abs(s.year - year) * 0.4); // nudge towards the child's year
      if (s.year > year + 2) score *= 0.5; // a topic taught years later is rarely what a parent of a younger child means
    }
    return { s, score: strong ? score : 0 }; // the topic must be named or described by the words, not just mentioned in passing
  }).filter((x) => x.score >= 4).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => noteFor(x.s));
}

export const noteById = (id: string): Note | null => (SKILL_BY_ID[id] ? noteFor(SKILL_BY_ID[id]) : null);
