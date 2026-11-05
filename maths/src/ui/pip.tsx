export type PipPose = "wave" | "think" | "cheer" | "rest";

/**
 * Pip, a small sprout-headed creature. Drawn in SVG from theme colours so it works in light and dark.
 * Only the Explorer skin shows it (other skins hide `.pip` in CSS), and it is decorative, never the only signal.
 */
export function Pip({ pose = "wave", size = 96 }: { pose?: PipPose; size?: number }) {
  const happy = pose === "cheer";
  const asleep = pose === "rest";
  return (
    <svg class={`pip pip-${pose}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      {/* sprout */}
      <g class="pip-sprout">
        <path d="M60 26 C60 18 59 13 56 9" fill="none" stroke="var(--good)" stroke-width="4" stroke-linecap="round" />
        <path d="M56 11 C46 3 36 8 36 16 C47 18 54 16 56 11 Z" fill="var(--good)" />
        <path d="M58 12 C66 2 79 5 80 13 C70 17 62 16 58 12 Z" fill="var(--good)" opacity=".8" />
      </g>
      {/* arms */}
      {pose === "wave" && <g class="pip-arm"><path d="M92 66 C104 58 108 46 104 38" fill="none" stroke="var(--pip-body)" stroke-width="9" stroke-linecap="round" /><circle cx="104" cy="37" r="6" fill="var(--pip-body)" /></g>}
      {happy && <><path d="M26 64 C14 56 12 44 16 36" fill="none" stroke="var(--pip-body)" stroke-width="9" stroke-linecap="round" /><path d="M94 64 C106 56 108 44 104 36" fill="none" stroke="var(--pip-body)" stroke-width="9" stroke-linecap="round" /></>}
      {pose === "think" && <path d="M88 80 C78 86 70 88 64 84" fill="none" stroke="var(--pip-body)" stroke-width="9" stroke-linecap="round" />}
      {/* feet */}
      <ellipse cx="44" cy="109" rx="12" ry="6" fill="var(--pip-deep)" />
      <ellipse cx="76" cy="109" rx="12" ry="6" fill="var(--pip-deep)" />
      {/* body */}
      <path d="M60 24 C92 24 104 50 104 76 C104 98 86 110 60 110 C34 110 16 98 16 76 C16 50 28 24 60 24 Z" fill="var(--pip-body)" />
      <path d="M30 94 C40 104 80 104 90 94 C88 104 76 110 60 110 C44 110 32 104 30 94 Z" fill="var(--pip-deep)" opacity=".35" />
      {/* face */}
      {asleep ? (
        <><path d="M38 66 Q46 72 54 66" fill="none" stroke="#1d2b36" stroke-width="3.5" stroke-linecap="round" /><path d="M66 66 Q74 72 82 66" fill="none" stroke="#1d2b36" stroke-width="3.5" stroke-linecap="round" /></>
      ) : happy ? (
        <><path d="M38 70 Q46 58 54 70" fill="none" stroke="#1d2b36" stroke-width="4" stroke-linecap="round" /><path d="M66 70 Q74 58 82 70" fill="none" stroke="#1d2b36" stroke-width="4" stroke-linecap="round" /></>
      ) : (
        <g class="pip-eyes">
          <ellipse cx="46" cy="66" rx="8" ry="10" fill="#fff" /><ellipse cx="74" cy="66" rx="8" ry="10" fill="#fff" />
          <circle cx={pose === "think" ? 49 : 47} cy={pose === "think" ? 62 : 67} r="4.6" fill="#1d2b36" /><circle cx={pose === "think" ? 77 : 75} cy={pose === "think" ? 62 : 67} r="4.6" fill="#1d2b36" />
          <circle cx={pose === "think" ? 50.5 : 48.5} cy={pose === "think" ? 60.5 : 65.5} r="1.4" fill="#fff" /><circle cx={pose === "think" ? 78.5 : 76.5} cy={pose === "think" ? 60.5 : 65.5} r="1.4" fill="#fff" />
        </g>
      )}
      <ellipse cx="33" cy="82" rx="6" ry="4" fill="#ff8fa3" opacity=".55" /><ellipse cx="87" cy="82" rx="6" ry="4" fill="#ff8fa3" opacity=".55" />
      {happy ? <path d="M50 82 Q60 96 70 82 Z" fill="#1d2b36" /> : asleep ? <path d="M54 84 Q60 88 66 84" fill="none" stroke="#1d2b36" stroke-width="3" stroke-linecap="round" /> : pose === "think" ? <path d="M54 86 H66" stroke="#1d2b36" stroke-width="3.5" stroke-linecap="round" /> : <path d="M52 82 Q60 90 68 82" fill="none" stroke="#1d2b36" stroke-width="3.5" stroke-linecap="round" />}
      {asleep && <text x="92" y="38" font-size="16" font-weight="800" fill="var(--muted)" class="pip-z">z</text>}
      {pose === "think" && <g fill="var(--muted)"><circle cx="96" cy="34" r="3" /><circle cx="104" cy="24" r="4" /></g>}
    </svg>
  );
}

/** A short burst of stars, used on a correct answer. Size and count are tuned per skin in CSS. */
export function Sparkles() {
  return (
    <span class="sparkles" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <svg key={i} class="spark" viewBox="0 0 20 20" style={{ "--a": `${i * 45}deg`, "--d": `${(i % 3) * 40}ms` } as Record<string, string>}>
          <path d="M10 1 L12.4 7.6 L19 10 L12.4 12.4 L10 19 L7.6 12.4 L1 10 L7.6 7.6 Z" fill={i % 2 ? "var(--effort)" : "var(--accent)"} />
        </svg>
      ))}
    </span>
  );
}
