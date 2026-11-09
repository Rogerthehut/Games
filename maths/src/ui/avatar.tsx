import { clayAvatar, type AvatarRole } from "../engine/avatar";
import { AVATAR_EYES } from "./avatar-eyes";
import type { Profile } from "../engine/progress";
import explorer from "../assets/avatars/explorer-clay.webp";
import builder from "../assets/avatars/scholar-wooden-protractor.webp";
import artist from "../assets/avatars/artist-painter.webp";
import skater from "../assets/avatars/skater-clay.webp";

const originals = { explorer, builder, artist, skater };
const variants = import.meta.glob<string>("../assets/avatars/variants/*.webp", { eager: true, import: "default" });

export function avatarVariants(role: AvatarRole) {
  return [0, ...Object.keys(variants)
    .filter((path) => path.includes(`/${role}-`))
    .map((path) => Number(path.slice(path.lastIndexOf("-") + 1, -5)))
    .sort((a, b) => a - b)];
}

export function Avatar({ choice, size = 40, pose, showProp = false }: {
  choice?: Profile["avatar"];
  size?: number;
  pose?: "wave" | "think" | "cheer";
  showProp?: boolean;
}) {
  const { role, variant, glasses } = clayAvatar(choice);
  const portrait = variants[`../assets/avatars/variants/${role}-${variant}.webp`];
  const eyes = AVATAR_EYES[role]?.[variant];
  const className = ["learner-avatar", showProp && "avatar-with-prop", pose && `pip pip-${pose}`].filter(Boolean).join(" ");
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
