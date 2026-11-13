/**
 * Anonymous question statistics (docs/DATA_COLLECTION.md). Each answered practice question adds one small record to a queue: the topic, the
 * difficulty level, the child's age band, how it went (right first time, right with help, wrong), the seconds taken, and the short code of the
 * mistake if there was one. No name, no learner or device id, no question text and nothing typed. The queue is sent in batches to the server,
 * which adds it to weekly counts and doesn't store who sent it. A grown-up can switch it off per learner (Parents' area, Settings).
 */
export interface QEvent { skill: string; level: number; band: "ks2" | "ks3" | "ks4" | "ks5"; r: 0 | 1 | 2; s: number; tags: string[] }
type Sender = (events: QEvent[]) => Promise<void>;

export const bandOfYear = (year: number): QEvent["band"] => (year <= 6 ? "ks2" : year <= 9 ? "ks3" : year <= 11 ? "ks4" : "ks5");

let sender: Sender | null = null;
let queue: QEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const BATCH = 25, MAX_QUEUE = 200, EVERY_MS = 60_000;

/** Set when a parent is signed in, and cleared on sign-out (which also drops anything not yet sent). */
export function setQuestionStatsSender(s: Sender | null) { sender = s; if (!s) { queue = []; if (timer) clearTimeout(timer); timer = null; } }

export function noteQuestion(e: { skill: string; level: number; year: number; kind: "right" | "helped" | "wrong"; secs: number; tags?: string[] }, enabled: boolean) {
  if (!enabled || !sender) return;
  queue.push({ skill: e.skill, level: Math.max(0, Math.min(10, Math.round(e.level))), band: bandOfYear(e.year), r: e.kind === "right" ? 0 : e.kind === "helped" ? 1 : 2, s: Math.max(0, Math.min(180, Math.round(e.secs))), tags: e.kind === "wrong" ? (e.tags ?? []).slice(0, 3) : [] });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (queue.length >= BATCH) void flushQuestionStats();
  else if (!timer) timer = setTimeout(() => { timer = null; void flushQuestionStats(); }, EVERY_MS);
}

/** Sends what is waiting. Best effort: if it fails the batch is dropped, because this data is never worth interrupting a child for. */
export async function flushQuestionStats() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!sender || !queue.length) return;
  const batch = queue.splice(0, 100);
  try { await sender(batch); } catch { /* dropped on purpose */ }
}
