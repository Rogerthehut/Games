export const AVATAR_ROLES = [
  { id: "explorer", label: "Explorer" },
  { id: "builder", label: "Scholar" },
  { id: "artist", label: "Artist" },
  { id: "skater", label: "Skater" },
] as const;

export type AvatarRole = typeof AVATAR_ROLES[number]["id"];

export const GLASSES = [
  { id: "none", label: "None" },
  { id: "round", label: "Round" },
  { id: "square", label: "Square" },
] as const;

type Glasses = typeof GLASSES[number]["id"];

/**
 * Portraits come in three age bands, matched to the learner's school year: the youngest set for Years 3 to 6 (and below),
 * slightly older ones for Years 7 to 10, and teenage ones for Years 11 to 13. A learner only gets portraits from their own band.
 */
export const AVATAR_BANDS = [
  { id: "junior", label: "Years 3 to 6", from: 0, to: 6 },
  { id: "older", label: "Years 7 to 10", from: 7, to: 10 },
  { id: "teen", label: "Years 11 to 13", from: 11, to: 99 },
] as const;
export type AvatarBand = typeof AVATAR_BANDS[number]["id"];
export const avatarBand = (year: number): AvatarBand => AVATAR_BANDS.find(({ from, to }) => year >= from && year <= to)?.id ?? "junior";

export interface ClayAvatar {
  role: AvatarRole;
  variant: number;
  glasses?: Glasses;
  /** Which age band the portrait is from. Missing means the youngest set. */
  band?: AvatarBand;
}

const legacyPresets = [
  "white-girl", "east-asian-girl", "south-asian-girl", "black-girl", "polynesian-girl",
  "white-boy", "east-asian-boy", "south-asian-boy", "black-boy", "polynesian-boy",
] as const;

export type AvatarChoice = AvatarRole | ClayAvatar | { preset: string; glasses?: Glasses };

export function clayAvatar(choice?: AvatarChoice): ClayAvatar {
  if (!choice || typeof choice === "string") {
    return { role: AVATAR_ROLES.find(({ id }) => id === choice)?.id ?? "explorer", variant: 0 };
  }
  if ("role" in choice) return choice;
  const index = legacyPresets.findIndex((id) => id === choice.preset);
  return { role: "explorer", variant: index + 1, glasses: choice.glasses };
}

/**
 * The avatar a learner of this year may have. If the saved one is from another band (the year was changed, or the profile is old),
 * they keep their character and glasses and get the first portrait of the right band.
 */
export function avatarForYear(choice: AvatarChoice | undefined, year: number): ClayAvatar {
  const mine = clayAvatar(choice), band = avatarBand(year);
  if ((mine.band ?? "junior") === band) return { ...mine, band };
  return { role: mine.role, variant: band === "junior" ? 0 : 1, glasses: mine.glasses, band };
}
