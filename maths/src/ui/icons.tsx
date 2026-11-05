/** One small, consistent icon set: 24px grid, 2px rounded strokes, inherits the text colour. */
const PATHS = {
  home: <><path d="M3.5 11 12 3.5 20.5 11" /><path d="M5.5 9.5V20h5v-5.5h3V20h5V9.5" /></>,
  route: <><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8.2 18H14a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6h4.8" /></>,
  flag: <><path d="M5.5 21V4" /><path d="M5.5 4.5h11l-2.2 4 2.2 4h-11" /></>,
  user: <><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20.5c.6-3.6 3.8-5.5 7.5-5.5s6.9 1.9 7.5 5.5" /></>,
  bulb: <><path d="M9.5 18h5M10.5 21h3" /><path d="M12 3a6 6 0 0 0-3.7 10.7c.8.7 1.2 1.5 1.2 2.3h5c0-.8.4-1.6 1.2-2.3A6 6 0 0 0 12 3z" /></>,
  chat: <><path d="M4 5.5h16v11H10l-4.5 3.5v-3.5H4z" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  arrow: <><path d="M5 12h14M13.5 6l6 6-6 6" /></>,
  back: <><path d="M19 12H5M10.5 6l-6 6 6 6" /></>,
  chevron: <><path d="M9 5.5 15.5 12 9 18.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="9.5" rx="2.2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  flame: <><path d="M12 3c.8 3.2 5 5.2 5 10.2a5 5 0 0 1-10 0c0-2 .9-3.4 2.2-4.4.1 1.8 1 2.8 2 2.8C11.6 8.8 10.6 6 12 3z" /></>,
  backspace: <><path d="M20.5 5.5H9.2L3.5 12l5.7 6.5h11.3z" /><path d="M13.5 9.5l4 5M17.5 9.5l-4 5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  sliders: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  swap: <><path d="M4 9h13M13.5 5.5 17 9l-3.5 3.5M20 15H7M10.5 11.5 7 15l3.5 3.5" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".8" fill="currentColor" /></>,
  book: <><path d="M4.5 5.5c2.6-.8 5.2-.5 7.5 1 2.3-1.5 4.9-1.8 7.5-1v13c-2.6-.8-5.2-.5-7.5 1-2.3-1.5-4.9-1.8-7.5-1z" /><path d="M12 6.5v13" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, class: cls }: { name: IconName; size?: number; class?: string }) {
  return (
    <svg class={`icon ${cls ?? ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
