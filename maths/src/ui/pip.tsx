export type PipPose = "wave" | "think" | "cheer" | "rest";

/** Decorative workbook illustrations for wayfinding, hints and celebrations. */
export function Pip({ pose = "wave", size = 96 }: { pose?: PipPose; size?: number }) {
  return (
    <svg class={`pip pip-${pose}`} width={size} height={size} viewBox="0 0 96 96" fill="none"
      stroke="#20243a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true" focusable="false">
      {pose === "wave" && <>
        <path d="m36 64 29-47 15 9-29 47-22 12Z" fill="#f5a5c0" />
        <path d="m36 64 15 9-22 12Zm23-38 15 9" fill="#fff7e4" />
        <path d="M26 19v19m-9-9h18m42 29v12m-6-6h12" stroke="#a23c68" />
      </>}
      {pose === "think" && <>
        <path d="M34 62c0-9-11-12-11-26a25 25 0 0 1 50 0c0 14-11 17-11 26Z" fill="#f4cd76" />
        <path d="M36 63h24v12H36Zm7 12v6h10v-6M48 60V44l-7-7m7 7 7-7" fill="#fff7e4" />
        <path d="M10 34h6m64 0h6M48 2v5" stroke="#a23c68" />
      </>}
      {pose === "cheer" && <>
        <path d="m48 13 11 23 25 4-18 18 4 25-22-12-22 12 4-25-18-18 25-4Z" fill="#f4cd76" />
        <path d="M41 55q7 7 14 0M39 48h.1m17 0h.1" />
        <path d="M15 14v14m-7-7h14m62 44v14m-7-7h14" stroke="#a23c68" />
      </>}
      {pose === "rest" && <>
        <path d="M48 31c-12-9-24-10-34-7v45c12-3 24-1 34 7 10-8 22-10 34-7V24c-10-3-22-2-34 7Zm0 0v45" fill="#b6e6d3" />
        <path d="M25 40q8 0 14 5m-14 8q8 0 14 5m18-13q6-5 14-5m-14 18q6-5 14-5" />
      </>}
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
