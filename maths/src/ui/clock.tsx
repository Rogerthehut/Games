export function ClockFace({ hour, minute, label }: { hour: number; minute: number; label: string }) {
  return (
    <svg class="lesson-clock" viewBox="0 0 200 200" role="img" aria-label={label}>
      <circle cx="100" cy="100" r="96" fill="var(--surface)" stroke="var(--line)" stroke-width="3" />
      {Array.from({ length: 60 }, (_, i) =>
        <line key={i} x1="100" x2="100" y1="9" y2={i % 5 === 0 ? 19 : 14} stroke="currentColor" stroke-width={i % 5 === 0 ? 2 : 1} transform={`rotate(${i * 6} 100 100)`} />,
      )}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = i * Math.PI / 6;
        return <text key={i} x={100 + 69 * Math.sin(angle)} y={100 - 69 * Math.cos(angle)} text-anchor="middle" dominant-baseline="central" fill="currentColor" font-size="15" font-weight="750">{i || 12}</text>;
      })}
      <line x1="100" y1="100" x2="100" y2="64" stroke="currentColor" stroke-width="7" stroke-linecap="round" transform={`rotate(${(hour % 12) * 30 + minute / 2} 100 100)`} />
      <line x1="100" y1="100" x2="100" y2="42" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" transform={`rotate(${minute * 6} 100 100)`} />
      <circle cx="100" cy="100" r="5" fill="currentColor" />
    </svg>
  );
}

export function ExamTimer({ seconds, total }: { seconds: number; total: number }) {
  const remaining = Math.max(0, seconds);
  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return (
    <div class={`timer exam-timer ${remaining < 120 ? "low" : ""}`} role="timer" aria-live="off"
      aria-label={`${minutes} minutes and ${secs} seconds remaining`}>
      <svg viewBox="0 0 36 36" width="32" height="32" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" stroke-opacity=".24" stroke-width="3" />
        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" stroke-width="3"
          pathLength="100" stroke-dasharray={`${100 * remaining / total} 100`} transform="rotate(-90 18 18)" />
        <path d="M18 18V8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          transform={`rotate(${secs * 6} 18 18)`} />
      </svg>
      <span aria-hidden="true">{minutes}:{String(secs).padStart(2, "0")}</span>
    </div>
  );
}
