import { avatarBands, avatarForYear, clayAvatar, type AvatarBand, type AvatarChoice, type AvatarRole } from "../engine/avatar";
import { AVATAR_EYES, AVATAR_EYES_BAND } from "./avatar-eyes";
import type { Profile } from "../engine/progress";
import explorer from "../assets/avatars/explorer-clay.webp";
import builder from "../assets/avatars/scholar-wooden-protractor.webp";
import artist from "../assets/avatars/artist-painter.webp";
import skater from "../assets/avatars/skater-clay.webp";

const originals = { explorer, builder, artist, skater };
const junior = import.meta.glob<string>("../assets/avatars/variants/*.webp", { eager: true, import: "default" });
// Art for Years 6 to 10 goes in variants-older/ and for Years 11 to 13 in variants-teen/, named like the others (explorer-1.webp).
const teen = import.meta.glob<string>("../assets/avatars/variants-teen/*.webp", { eager: true, import: "default" });
const older = import.meta.glob<string>("../assets/avatars/variants-older/*.webp", { eager: true, import: "default" });

// Portraits for Nursery to Year 2 (variants-little/, named like the others) are offered alongside the youngest set.
const little = import.meta.glob<string>("../assets/avatars/variants-little/*.webp", { eager: true, import: "default" });

const SETS: Record<AvatarBand, { folder: string; files: Record<string, string> }> = {
  junior: { folder: "variants", files: junior }, older: { folder: "variants-older", files: older }, teen: { folder: "variants-teen", files: teen }, little: { folder: "variants-little", files: little },
};
const hasArt = (band: AvatarBand, role: AvatarRole) => Object.keys(SETS[band].files).some((path) => path.includes(`/${role}-`));

/** The portrait numbers a learner in this band can pick for a character. Until a band has its own art, it shows the youngest set. */
export function avatarVariants(role: AvatarRole, band: AvatarBand = "junior"): number[] {
  const set = hasArt(band, role) ? band : "junior";
  const numbers = Object.keys(SETS[set].files)
    .filter((path) => path.includes(`/${role}-`))
    .map((path) => Number(path.slice(path.lastIndexOf("-") + 1, -5)))
    .sort((a, b) => a - b);
  return set === "junior" && band === "junior" ? [0, ...numbers] : numbers;
}

/** Every portrait a learner of this year may pick for a character: the Little ones set first for Nursery to Year 2, then the usual set. */
export function avatarOptions(role: AvatarRole, year: number): { band: AvatarBand; variant: number }[] {
  return avatarBands(year).flatMap((band) => avatarVariants(role, band).map((variant) => ({ band, variant })));
}

export function Avatar({ choice, year, size = 40, pose, showProp = false }: {
  choice?: Profile["avatar"] | AvatarChoice;
  /** The learner's school year. When given, only a portrait from their age band is shown. */
  year?: number;
  size?: number;
  pose?: "wave" | "think" | "cheer";
  showProp?: boolean;
}) {
  // Nobody has picked a character yet (a brand new learner): a plain purple circle with a simple head and shoulders, until they choose one in Me.
  if (choice === undefined) {
    return (
      <span class={`learner-avatar avatar-blank${pose ? ` pip pip-${pose}` : ""}`} style={{ width: size, height: size }} aria-hidden="true" data-testid="avatar-blank">
        <svg viewBox="0 0 100 100"><circle cx="50" cy="38" r="17" /><path d="M16 94c0-21 15-33 34-33s34 12 34 33z" /></svg>
      </span>
    );
  }
  const { role, variant, glasses, band = "junior" } = year === undefined ? clayAvatar(choice) : avatarForYear(choice, year);
  const own = band !== "junior" && SETS[band].files[`../assets/avatars/${SETS[band].folder}/${role}-${variant}.webp`];
  const portrait = own || junior[`../assets/avatars/variants/${role}-${variant}.webp`];
  const eyes = own ? AVATAR_EYES_BAND[band as "older" | "teen"]?.[role]?.[variant] : AVATAR_EYES[role]?.[variant];
  // Until a band has its own art, older learners get the youngest portraits styled to look more grown up: head and shoulders
  // only (no toys), calmer colours and a different frame.
  const restyled = band !== "junior" && band !== "little" && !own;
  const className = ["learner-avatar", own && band !== "little" && "avatar-cut", showProp && !restyled && "avatar-with-prop", restyled && `avatar-${band}`, pose && `pip pip-${pose}`].filter(Boolean).join(" ");
  return (
    <span class={className} style={{ width: size, height: size }} aria-hidden="true">
      <span class="avatar-art">
        <img src={portrait ?? originals[role] ?? explorer} alt="" draggable={false} />
        {eyes && (glasses === "round" || glasses === "square") && <Glasses eyes={eyes} square={glasses === "square"} />}
      </span>
    </span>
  );
}

function Glasses({ eyes: [left, leftY, right, rightY], square }: { eyes: readonly number[]; square: boolean }) {
  const width = (right - left) * .43;
  const height = width * .85;
  return (
    <svg class="avatar-glasses" viewBox="0 0 100 100" fill="none" stroke="#2f2836" stroke-width="1.4" stroke-linecap="round">
      {[{ x: left, y: leftY }, { x: right, y: rightY }].map(({ x, y }) => square
        ? <rect key={x} x={x - width} y={y - height} width={width * 2} height={height * 2} rx={width * .36} />
        : <ellipse key={x} cx={x} cy={y} rx={width} ry={height} />)}
      <path d={`M${left + width} ${leftY} Q${(left + right) / 2} ${(leftY + rightY) / 2 - 2} ${right - width} ${rightY}
        M${left - width} ${leftY} l-3 -1 M${right + width} ${rightY} l3 -1`} />
    </svg>
  );
}
