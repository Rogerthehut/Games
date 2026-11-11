import type { ComponentChildren } from "preact";
import type { AvatarRole } from "../engine/avatar";

/**
 * Teenage portraits for Years 11 to 13, drawn in code: longer faces, defined jaws and current hairstyles, in the same four
 * characters as the younger sets. Ten looks for each character, numbered 1 to 10.
 */
export const TEEN_VARIANTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/** Where the eyes sit, as percentages, so the glasses line up. */
export const TEEN_EYES = [42, 45, 58, 45] as const;

const SKIN: [string, string][] = [
  ["#f7d6bd", "#e8bb9b"], ["#f1c7a0", "#dfaa80"], ["#e4ae80", "#cd9261"], ["#cf9467", "#b87848"], ["#b07048", "#965a35"],
  ["#8a5334", "#744327"], ["#f4cfae", "#e2b48f"], ["#dca67a", "#c58b5c"], ["#c38a5d", "#aa7248"], ["#6e4129", "#5a321e"],
];
type Hair = "crop" | "sweep" | "long" | "puff" | "bun" | "wavy" | "buzz" | "plaits" | "quiff" | "bob";
const LOOKS: { skin: number; hair: Hair; colour: string }[] = [
  { skin: 0, hair: "crop", colour: "#6b3d22" }, { skin: 6, hair: "sweep", colour: "#c98a3a" }, { skin: 2, hair: "long", colour: "#2d2230" },
  { skin: 5, hair: "puff", colour: "#14110f" }, { skin: 1, hair: "bun", colour: "#3a2a22" }, { skin: 3, hair: "wavy", colour: "#251a1a" },
  { skin: 9, hair: "buzz", colour: "#14110f" }, { skin: 4, hair: "plaits", colour: "#1a1411" }, { skin: 7, hair: "quiff", colour: "#8a4a26" },
  { skin: 8, hair: "bob", colour: "#2b2b33" },
];
const BACKGROUND: Record<AvatarRole, string> = { explorer: "#b8bdf0", builder: "#f3cbab", artist: "#f1a9bd", skater: "#a9dcbd" };

/** Hair that sits behind the head and shoulders. */
function hairBack(style: Hair, c: string): ComponentChildren {
  switch (style) {
    case "long": return <path d="M30 40 C28 20 40 14 50 14 C60 14 72 20 70 40 L73 80 L27 80Z" fill={c} />;
    case "puff": return <circle cx="50" cy="31" r="23" fill={c} />;
    case "bun": return <><circle cx="50" cy="15" r="8" fill={c} /><path d="M33 40 C33 22 42 16 50 16 C58 16 67 22 67 40Z" fill={c} /></>;
    case "wavy": return <path d="M31 38 C29 20 40 15 50 15 C60 15 71 20 69 38 C75 50 73 64 69 74 L31 74 C27 64 25 50 31 38Z" fill={c} />;
    case "plaits": return <g fill="none" stroke={c} stroke-width="6.5" stroke-linecap="round"><path d="M32 44 C27 58 30 70 28 82" /><path d="M68 44 C73 58 70 70 72 82" /></g>;
    case "bob": return <path d="M30 40 C29 22 40 15 50 15 C60 15 71 22 70 40 L71 63 C64 66 58 63 50 63 C42 63 36 66 29 63Z" fill={c} />;
    default: return null;
  }
}

/** Hair on top of the forehead. */
function hairFront(style: Hair, c: string): ComponentChildren {
  const hairline = <path d="M32 37 C33 25 41 21 50 21 C59 21 67 25 68 37 C63 30 57 28 50 28 C43 28 37 30 32 37Z" fill={c} />;
  switch (style) {
    case "crop": return <path d="M32 38 C31 22 41 16 50 16 C59 16 69 22 68 38 C65 30 58 27 50 27 C42 27 35 30 32 38Z" fill={c} />;
    case "sweep": return <path d="M31 41 C28 22 40 14 53 15 C64 16 71 25 68 41 C66 31 60 26 50 26 C45 31 37 32 31 41Z" fill={c} />;
    case "quiff": return <path d="M32 41 C27 22 42 10 57 13 C69 15 73 27 67 41 C65 30 58 26 50 26 C42 26 36 31 32 41Z" fill={c} />;
    case "buzz": return <path d="M33.5 37 C33 24 41 19.5 50 19.5 C59 19.5 67 24 66.5 37 C63 29 57 26 50 26 C43 26 37 29 33.5 37Z" fill={c} opacity=".82" />;
    case "bob": return <path d="M31 38 C33 25 43 21 50 21 C57 21 67 25 69 38 L69 35 C62 30 56 30 50 30 C44 30 38 30 31 35Z" fill={c} />;
    case "puff": return <path d="M34 36 C36 28 43 26 50 26 C57 26 64 28 66 36 C62 31 56 30 50 30 C44 30 38 31 34 36Z" fill={c} />;
    default: return hairline;
  }
}

/** The clothes and extras for each character. */
function outfit(role: AvatarRole, n: number): { body: ComponentChildren; over: ComponentChildren } {
  switch (role) {
    case "explorer": return {
      body: <>
        <path d="M12 100 C14 82 28 76 40 74 L60 74 C72 76 86 82 88 100Z" fill="#3f8f7a" />
        <path d="M50 78 L50 100" stroke="#2b6a5a" stroke-width="1.6" /><path d="M41 75 L50 85 L59 75" fill="#e9f3ee" stroke="#2b6a5a" stroke-width="1.2" />
        <path d="M30 81 L33 100 M70 81 L67 100" stroke="#c98a2b" stroke-width="4" stroke-linecap="round" />
      </>,
      over: null,
    };
    case "builder": return {
      body: <>
        <path d="M12 100 C14 82 28 76 40 74 L60 74 C72 76 86 82 88 100Z" fill="#3b4a7a" />
        <path d="M42 75 L50 93 L58 75Z" fill="#f4efe6" />
        <path d="M42 75 L47 100 M58 75 L53 100" stroke="#2b3760" stroke-width="1.4" />
        {n % 2 === 0 && <path d="M49 80 L51 80 L52.2 95 L50 98 L47.8 95Z" fill="#c2415a" />}
        <circle cx="64" cy="86" r="1.8" fill="#d8b24a" />
      </>,
      over: null,
    };
    case "artist": return {
      body: <>
        <path d="M12 100 C14 82 28 76 40 74 L60 74 C72 76 86 82 88 100Z" fill="#4a78a8" />
        <path d="M43 75 L50 88 L57 75Z" fill="#f6efe4" /><path d="M50 88 L50 100" stroke="#365a82" stroke-width="1.4" />
        <circle cx="31" cy="90" r="2.6" fill="#f06a8a" /><circle cx="68" cy="93" r="2.2" fill="#f6c944" /><circle cx="36" cy="97" r="1.8" fill="#5ec2a0" /><circle cx="63" cy="84" r="1.6" fill="#f06a8a" />
      </>,
      over: <g stroke-linecap="round"><path d="M66 38 L76 20" stroke="#b9772a" stroke-width="1.8" /><path d="M76 20 L77.4 17.4" stroke="#f06a8a" stroke-width="2.4" /></g>,
    };
    case "skater": return {
      body: <>
        <path d="M34 78 C37 68 63 68 66 78Z" fill="#7650a0" />
        <path d="M12 100 C14 82 28 76 40 74 L60 74 C72 76 86 82 88 100Z" fill="#8a62b5" />
        <path d="M42 75 Q50 82 58 75" fill="#7650a0" stroke="#6a4592" stroke-width="1" />
        <path d="M46 80 L45 92 M54 80 L55 92" stroke="#f2eef7" stroke-width="1.4" stroke-linecap="round" />
      </>,
      over: <g>
        <path d="M31 44 C29 12 71 12 69 44" fill="none" stroke="#2a2630" stroke-width="2.6" stroke-linecap="round" />
        <rect x="27.5" y="41" width="6" height="11" rx="3" fill="#3a3540" /><rect x="66.5" y="41" width="6" height="11" rx="3" fill="#3a3540" />
      </g>,
    };
  }
}

export function TeenPortrait({ role, variant }: { role: AvatarRole; variant: number }) {
  const n = Math.min(Math.max(variant, 1), 10);
  const look = LOOKS[n - 1], [skin, shade] = SKIN[look.skin];
  const id = `teen-${role}-${n}`;
  const clothes = outfit(role, n);
  return (
    <svg class="avatar-drawn" viewBox="0 0 100 100" role="img" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-face`} cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".28" /><stop offset=".55" stop-color="#fff" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity=".1" /></radialGradient>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25" /><stop offset="1" stop-color="#000" stop-opacity=".06" /></linearGradient>
      </defs>
      <rect width="100" height="100" fill={BACKGROUND[role]} /><rect width="100" height="100" fill={`url(#${id}-bg)`} />
      {hairBack(look.hair, look.colour)}
      {clothes.body}
      <path d="M43 58 L43 77 Q50 83 57 77 L57 58Z" fill={shade} />
      <ellipse cx="33" cy="46" rx="2.6" ry="4.2" fill={skin} /><ellipse cx="67" cy="46" rx="2.6" ry="4.2" fill={skin} />
      <path d="M33 40 C33 26 41 21 50 21 C59 21 67 26 67 40 C67 52 62 63 50 65.5 C38 63 33 52 33 40Z" fill={skin} />
      <path d="M33 40 C33 26 41 21 50 21 C59 21 67 26 67 40 C67 52 62 63 50 65.5 C38 63 33 52 33 40Z" fill={`url(#${id}-face)`} />
      <g fill="#2b2230"><ellipse cx="42" cy="45" rx="2" ry="2.4" /><ellipse cx="58" cy="45" rx="2" ry="2.4" /></g>
      <g fill="#fff"><circle cx="42.7" cy="44.2" r=".7" /><circle cx="58.7" cy="44.2" r=".7" /></g>
      <g fill="none" stroke={look.colour} stroke-width="1.6" stroke-linecap="round" opacity=".9"><path d="M37.5 40.6 Q42 38.4 46.4 40" /><path d="M53.6 40 Q58 38.4 62.5 40.6" /></g>
      <path d="M50 46.5 Q48.4 53 51.2 54.2" fill="none" stroke={shade} stroke-width="1.3" stroke-linecap="round" />
      <path d="M44.6 58.4 Q50 62 55.4 58.4" fill="none" stroke="#8a3d3d" stroke-width="1.5" stroke-linecap="round" />
      <circle cx="38" cy="52" r="3" fill="#e0707a" opacity=".12" /><circle cx="62" cy="52" r="3" fill="#e0707a" opacity=".12" />
      {hairFront(look.hair, look.colour)}
      {clothes.over}
    </svg>
  );
}
