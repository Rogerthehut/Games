import { useEffect } from "preact/hooks";
import { letterName } from "./welcome-lettering";

const HELLO_MS = 1450;
const colours = ["yellow", "pink", "periwinkle", "mint"];

function InkGradient({ id, width }: { id: string; width: number }) {
  return <defs>
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
      {colours.map((colour, i) => <stop key={colour} offset={i / (colours.length - 1)} stop-color={`var(--quarter-${colour})`} />)}
    </linearGradient>
  </defs>;
}

export function Welcome({ name, onContinue }: { name: string; onContinue: () => void }) {
  const lettering = letterName(name);
  const count = lettering?.strokes.length ?? 0;
  const writingMs = Math.min(1600, Math.max(580, count * 125));
  useEffect(() => {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onContinue, reducedMotion ? 1000 : HELLO_MS + writingMs + 800);
    return () => window.clearTimeout(timer);
  }, [onContinue, writingMs]);

  return (
    <main class="welcome-screen">
      <h1 class="welcome-greeting" aria-label={`Hello, ${name}`}>
        <svg viewBox="0 0 460 164" aria-hidden="true" focusable="false">
          <InkGradient id="welcome-hello-ink" width={460} />
          <path class="welcome-ink" pathLength="1" fill="none" stroke="url(#welcome-hello-ink)" style={{ animationDuration: `${HELLO_MS}ms` }} stroke-width="11"
            stroke-linecap="round" stroke-linejoin="round"
            d="M18 138C46 123 79 101 94 74C107 52 114 24 98 20C74 14 68 76 57 146C64 115 79 89 97 88C118 87 111 106 108 123C103 148 124 151 151 138C174 126 191 100 174 88C159 78 142 96 143 116C144 137 161 148 179 147C202 146 218 128 233 104C255 71 270 22 251 19C225 14 208 82 213 117C217 145 233 153 256 143C282 133 300 102 313 72C325 45 326 21 310 20C289 19 270 76 274 115C277 141 293 152 312 146C329 141 341 124 349 103C357 82 380 77 395 89C411 102 407 134 390 144C370 156 348 145 348 122C348 108 354 94 367 88C379 82 389 86 401 91C416 98 431 91 443 80" />
        </svg>
        {lettering && count > 0 ? (
          <svg class="welcome-lettering" viewBox={`0 -14 ${lettering.width} 56`}
            style={{ maxWidth: `${lettering.width * 2.65}px` }} aria-hidden="true" focusable="false">
            <InkGradient id="welcome-name-ink" width={lettering.width} />
            <g fill="none" stroke="url(#welcome-name-ink)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              {lettering.strokes.map(({ x, y, path }, i) => (
                <path key={i} class="welcome-ink welcome-letter" d={path} pathLength="1" transform={`translate(${x} ${y ?? 0})`}
                  style={{ animationDelay: `${HELLO_MS + writingMs * i / count}ms`, animationDuration: `${writingMs / count}ms` }} />
              ))}
            </g>
          </svg>
        ) : (
          <span class="welcome-name" aria-hidden="true" dir="auto" style={{ animationDelay: `${HELLO_MS}ms` }}>{name}</span>
        )}
      </h1>
      <button class="btn small welcome-continue" type="button" onClick={onContinue}>Continue <span aria-hidden="true">→</span></button>
    </main>
  );
}
