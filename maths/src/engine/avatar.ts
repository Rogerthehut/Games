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

export interface ClayAvatar {
  role: AvatarRole;
  variant: number;
  glasses?: Glasses;
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
