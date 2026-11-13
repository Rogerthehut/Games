/**
 * The few settings that belong to a phone, not an account: Face ID for the Parents' area and the practice reminders. Kept on the device only,
 * and cleared (with the reminders cancelled) when someone signs out, so a shared device keeps nothing.
 */
import { askForReview, nativeHas, setReminders } from "./bridge";

const FACE = "quarter.faceid";
const REM = "quarter.reminders";
export interface Reminders { enabled: boolean; hour: number; minute: number; days: number[] }
export const DEFAULT_REMINDERS: Reminders = { enabled: false, hour: 16, minute: 30, days: [2, 3, 4, 5, 6] };

export function faceIdOn(): boolean { try { return localStorage.getItem(FACE) === "on"; } catch { return false; } }
export function setFaceIdOn(on: boolean): void { try { if (on) localStorage.setItem(FACE, "on"); else localStorage.removeItem(FACE); } catch { /* private mode */ } }

export function loadReminders(): Reminders {
  try {
    const r = JSON.parse(localStorage.getItem(REM) ?? "null") as Partial<Reminders> | null;
    if (r && typeof r.enabled === "boolean" && Number.isInteger(r.hour) && Number.isInteger(r.minute) && Array.isArray(r.days)) return { enabled: r.enabled, hour: r.hour!, minute: r.minute!, days: r.days.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7) };
  } catch { /* fall through */ }
  return { ...DEFAULT_REMINDERS };
}
export function saveReminders(r: Reminders): void { try { localStorage.setItem(REM, JSON.stringify(r)); } catch { /* private mode */ } }

/** Signing out or deleting the account: no reminders and no Face ID left behind. */
export function clearDeviceSettings(): void {
  try { localStorage.removeItem(FACE); localStorage.removeItem(REM); } catch { /* private mode */ }
  void setReminders({ ...DEFAULT_REMINDERS, enabled: false });
}

const REVIEW = "quarter.review.at";
const REVIEW_GAP = 90 * 86_400_000;
/**
 * Asks Apple to show its rating prompt, to a grown-up only: from the Parents' area, once the learner has practised at least ten times, and at most
 * once every 90 days (Apple limits it further and decides whether to show it). Never for a child, never in the middle of practice.
 */
export function maybeAskForReview(sessions: number, now = Date.now()): boolean {
  if (sessions < 10 || !nativeHas("review")) return false;
  try {
    const last = Number(localStorage.getItem(REVIEW) ?? 0);
    if (now - last < REVIEW_GAP) return false;
    localStorage.setItem(REVIEW, String(now));
  } catch { return false; }
  askForReview();
  return true;
}
