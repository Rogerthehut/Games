import type { Skin } from "./skin";

/** Short, plain wording, tuned a little for the age. Nothing here explains itself; if a line needs a footnote, cut it. */
const pickOne = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export const voice = {
  greeting(name: string, skin: Skin, hour = new Date().getHours()): string {
    if (skin === "explorer") return `Hi ${name}!`;
    if (skin === "navigator") return `Hey ${name}`;
    return `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, ${name}`;
  },
  praise(skin: Skin): string {
    return pickOne(skin === "explorer" ? ["Yes!", "Brilliant!", "You got it!", "Nice one!"] : skin === "navigator" ? ["Nice.", "Spot on.", "That's it.", "Yep."] : ["Correct.", "Right.", "Good.", "Exactly."]);
  },
  notQuite(skin: Skin): string {
    return skin === "explorer" ? "Not quite. Have another go!" : skin === "navigator" ? "Not quite. Try again." : "Not quite.";
  },
  nearly: "Nearly there.",
  reveal(skin: Skin): string {
    return skin === "explorer" ? "No worries, here's how it works." : "Here's how it works.";
  },
  /** `share` is the fraction answered right. Kind when it was a hard one, never gushing about nothing. */
  finished(name: string, skin: Skin, share = 1): string {
    if (share < 0.35) return skin === "scholar" ? "Session done" : `Good effort, ${name}`;
    return skin === "explorer" ? `Great work, ${name}!` : skin === "navigator" ? `Nice one, ${name}` : "Session done";
  },
};
