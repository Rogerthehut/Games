import type { Skill } from "../engine/types";

/** The four themes of the STEM lab, and which topic belongs to which. */
export type Theme = "computing" | "data" | "ai" | "quantum";
export const THEMES: { id: Theme; label: string; blurb: string }[] = [
  { id: "computing", label: "Computing", blurb: "Instructions, loops, binary and how computers think." },
  { id: "data", label: "Data science", blurb: "Collecting, checking and making sense of data." },
  { id: "ai", label: "AI and machine learning", blurb: "How machines learn from examples." },
  { id: "quantum", label: "Quantum ideas", blurb: "The strange, true rules of the very small." },
];
export const THEME_OF: Record<string, Theme> = {
  "stem-instructions": "computing", "stem-loops": "computing", "stem-input-output": "computing", "stem-sorting": "computing", "stem-debugging": "computing",
  "stem-binary": "computing", "stem-hex": "computing", "stem-trace": "computing", "stem-logic": "computing", "stem-data-types": "computing",
  "stem-binary-search": "computing", "stem-growth": "computing", "stem-storage": "computing", "stem-caesar": "computing", "stem-information": "computing",
  "stem-data-detective": "data", "stem-outliers": "data",
  "stem-ai-features": "ai", "stem-bias": "ai", "stem-nearest": "ai", "stem-neuron": "ai", "stem-accuracy": "ai", "stem-gradient-descent": "ai", "stem-spam": "ai", "stem-network-layer": "ai",
  "stem-quantum-ideas": "quantum", "stem-qubit": "quantum", "stem-qubit-states": "quantum", "stem-quantum-gates": "quantum",
};
export const themeOf = (s: Skill): Theme => THEME_OF[s.id] ?? "computing";
