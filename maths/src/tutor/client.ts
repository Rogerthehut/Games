import type { TutorRequest, TutorResponse } from "./types";

/** Empty means "same origin as the app". Set VITE_TUTOR_URL to point at a separate tutor service. */
const BASE = ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_TUTOR_URL ?? "").replace(/\/$/, "");

/** A random id for this browser, used by the service only to rate-limit. It identifies no one. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem("mathpath.device");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("mathpath.device", id); }
    return id;
  } catch {
    return `session-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }
}

async function timed(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

/** Is a tutor service reachable and configured? Quietly false anywhere it isn't. */
export async function tutorAvailable(): Promise<boolean> {
  try {
    const r = await timed(`${BASE}/api/health`, {}, 3000);
    if (!r.ok) return false;
    const j = (await r.json()) as { tutor?: boolean };
    return j.tutor === true;
  } catch {
    return false;
  }
}

export async function askTutor(req: Omit<TutorRequest, "deviceId">): Promise<TutorResponse> {
  const r = await timed(`${BASE}/api/tutor`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req, deviceId: deviceId() }) }, 35_000);
  const j = (await r.json().catch(() => null)) as TutorResponse | { error: string } | null;
  if (j && "reply" in j) return j;
  throw new Error(j && "error" in j ? j.error : `Tutor error ${r.status}`);
}
