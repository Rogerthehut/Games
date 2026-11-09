const colours = ["yellow", "pink", "periwinkle", "mint"];
const scrollports = ".app > .content, .qpage > .qbody, .search-panel, .search-results, .browser-storage-notice, .onboard-in";

export function tintScrollbars() {
  const preference = matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)");
  const pending = new Set<HTMLElement>();
  let frame: number | undefined;

  document.addEventListener("scroll", (event) => {
    if (preference.matches) return;
    const target = event.target === document ? document.scrollingElement : event.target;
    if (!(target instanceof HTMLElement) || (target !== document.scrollingElement && !target.matches(scrollports))) return;
    pending.add(target);
    frame ??= requestAnimationFrame(() => {
      frame = undefined;
      for (const element of pending) {
        const range = element.scrollHeight - element.clientHeight;
        const progress = range > 0 ? Math.min(1, Math.max(0, element.scrollTop / range)) : 0;
        const position = progress * (colours.length - 1);
        const start = Math.min(Math.floor(position), colours.length - 2);
        const weight = (100 * (1 - (position - start))).toFixed(1);
        element.style.setProperty("--quarter-scroll-ink",
          `color-mix(in oklab, var(--quarter-${colours[start]}) ${weight}%, var(--quarter-${colours[start + 1]}))`);
      }
      pending.clear();
    });
  }, { capture: true, passive: true });
}
