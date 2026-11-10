/**
 * A short PIN (6 or 8 digits) kept on this device for the Parents' area, in addition to the sum.
 * It is a lock against a child, not a vault: only a salted hash is stored, wrong tries are slowed down, and signing out of the
 * account removes it, so a parent who forgets it can sign out, sign back in and set a new one.
 */
const PREFIX = "quarter.pin.";
const ITER = 100_000;

interface Saved { salt: string; hash: string; iter: number; fails: number; until: number }
const read = (key: string): Saved | null => { try { const raw = localStorage.getItem(PREFIX + key); return raw ? (JSON.parse(raw) as Saved) : null; } catch { return null; } };
const write = (key: string, v: Saved) => { try { localStorage.setItem(PREFIX + key, JSON.stringify(v)); return true; } catch { return false; } };

const toHex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b instanceof Uint8Array ? b : b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => new Uint8Array((h.match(/../g) ?? []).map((x) => parseInt(x, 16)));

async function derive(pin: string, salt: Uint8Array, iter: number): Promise<string> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return toHex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter }, base, 256));
}

/** 6 or 8 digits, and not something a child would guess. */
export function pinProblem(pin: string): string | null {
  if (!/^\d+$/.test(pin) || (pin.length !== 6 && pin.length !== 8)) return "Use 6 or 8 digits.";
  if (/^(\d)\1+$/.test(pin)) return "Please don't use the same digit every time.";
  const asc = "0123456789012345678901", desc = "9876543210987654321098";
  if (asc.includes(pin) || desc.includes(pin)) return "Please don't use a run of digits like 123456.";
  return null;
}

export const hasPin = (key: string) => read(key) !== null;
export const clearPin = (key: string) => { try { localStorage.removeItem(PREFIX + key); } catch { /* nothing to remove */ } };
export const clearAllPins = () => { try { for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k); } catch { /* nothing to remove */ } };

export async function setPin(key: string, pin: string): Promise<boolean> {
  if (pinProblem(pin)) return false;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return write(key, { salt: toHex(salt), hash: await derive(pin, salt, ITER), iter: ITER, fails: 0, until: 0 });
}

export type PinCheck = { ok: true } | { ok: false; waitSeconds: number; triesLeft: number };

/** Five wrong tries lock it for a minute, then longer each time, so guessing is not worth a child's while. */
export async function checkPin(key: string, pin: string, now = Date.now()): Promise<PinCheck> {
  const s = read(key);
  if (!s) return { ok: false, waitSeconds: 0, triesLeft: 0 };
  if (now < s.until) return { ok: false, waitSeconds: Math.ceil((s.until - now) / 1000), triesLeft: 0 };
  const hash = await derive(pin, fromHex(s.salt), s.iter);
  if (hash === s.hash) { write(key, { ...s, fails: 0, until: 0 }); return { ok: true }; }
  const fails = s.fails + 1;
  const lock = fails % 5 === 0 ? Math.min(60 * 2 ** (fails / 5 - 1), 3600) * 1000 : 0;
  write(key, { ...s, fails, until: lock ? now + lock : 0 });
  return { ok: false, waitSeconds: Math.ceil(lock / 1000), triesLeft: lock ? 0 : 5 - (fails % 5) };
}
