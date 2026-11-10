export type ActivityKind = "practice" | "skills" | "checkup" | "plan" | "tutor";

/** The small drawings on the Today tiles and the welcome page. Kept on its own so the welcome page does not load the whole app. */
export function ActivityArt({ kind }: { kind: ActivityKind }) {
  return (
    <svg class="activity-art" viewBox="0 0 120 100" fill="#fff7e4" stroke="currentColor" stroke-width="3.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      {kind === "practice" && <g transform="rotate(25 60 50)">
        <path d="M50 13h20v61L60 89 50 74zM50 28h20M50 74h20" />
        <path d="M33 21v16m-8-8h16" fill="none" />
      </g>}
      {kind === "skills" && <>
        <path d="m15 30 29-11 31 10 29-11v56L75 85 44 75 15 86zM44 19v56m31-46v56" />
        <path d="M25 65c22-1 23-23 43-16s20-4 24-12" fill="none" stroke-dasharray="2 6" />
      </>}
      {kind === "checkup" && <>
        <circle cx="54" cy="53" r="35" /><circle cx="54" cy="53" r="23" fill="none" /><circle cx="54" cy="53" r="10" fill="none" />
        <path d="m54 53 42-41m-14 2 15-3-2 15" fill="none" />
      </>}
      {kind === "plan" && <>
        <path d="M60 29c-13-10-27-12-45-9v58c19-3 33 1 45 10 12-9 26-13 45-10V20c-18-3-32-1-45 9zm0 0v59" />
        <path d="M27 35c7 0 14 2 21 6m-21 8c7 0 14 2 21 6m24-14c7-4 14-6 21-6m-21 20c7-4 14-6 21-6" fill="none" />
      </>}
      {kind === "tutor" && <>
        <path d="M18 18h84v52H52L32 88V70H18z" />
        <path d="M34 38h52M34 52h34" fill="none" />
      </>}
      <g fill="none" stroke-width="2" opacity=".48">
        {kind === "practice" && <path d="M92 29l7-4m-5 13 9 1M17 68c-5 6-3 11 3 13" />}
        {kind === "skills" && <path d="M14 17l-4-6m11 3 1-7m74 82 4 5m3-10 7 3" />}
        {kind === "checkup" && <path d="M103 43l8-3m-10 11 8 2M17 22l-5-5m11 1-1-7" />}
        {kind === "tutor" && <path d="M104 22l6-5m-3 14 8 1M12 92l-4 5" />}
        {kind === "plan" && <path d="M60 7c0 6 2 8 8 8-6 0-8 2-8 8 0-6-2-8-8-8 6 0 8-2 8-8zM17 90l6-4m76 3 6 4" />}
      </g>
    </svg>
  );
}
