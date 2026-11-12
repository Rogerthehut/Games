import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";

/**
 * Draws pop-ups straight onto the page body, outside the screen they were opened from. A screen that is animated or transformed can
 * turn a "fixed" pop-up into one placed against the whole (long) screen instead of the part you can see, which is how the Parents' area
 * sum could open half way up the page, out of sight, on an iPhone.
 */
export function Portal({ children }: { children: ComponentChildren }) {
  return typeof document === "undefined" ? <>{children}</> : createPortal(children, document.body);
}
