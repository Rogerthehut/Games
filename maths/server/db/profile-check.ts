export const MAX_LEARNERS = 8;
export const MAX_PROFILE_BYTES = 400_000;

export type Cleaned = { ok: true; data: Record<string, unknown>; nickname: string; year: number } | { ok: false; error: string };

/**
 * What the server is willing to store for a learner. The app owns the shape of a profile; the server only checks it is a sane object,
 * that the nickname and year are in range, and drops anything that should never leave the device.
 */
export function cleanProfile(input: unknown): Cleaned {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "A learner must be an object." };
  const p = { ...(input as Record<string, unknown>) };
  const nickname = typeof p.name === "string" ? p.name.trim() : "";
  if (nickname.length < 1 || nickname.length > 24) return { ok: false, error: "A nickname must be 1 to 24 characters." };
  const year = p.year;
  if (typeof year !== "number" || !Number.isInteger(year) || year < 1 || year > 13) return { ok: false, error: "The school year must be a whole number from 1 to 13." };
  if (!p.skills || typeof p.skills !== "object" || Array.isArray(p.skills)) return { ok: false, error: "A learner needs a skills record." };
  // The tutor chat log is kept on the device only, for the grown-up to read there. It never goes to the server.
  delete p.tutorLog;
  p.name = nickname;
  if (JSON.stringify(p).length > MAX_PROFILE_BYTES) return { ok: false, error: "That learner's progress is too large to save." };
  return { ok: true, data: p, nickname, year };
}
