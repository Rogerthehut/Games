/**
 * Cloudflare Turnstile in the browser. Solved once per half hour or so (usually invisibly), then a signed pass from our server
 * is sent with each AI request. With no VITE_TURNSTILE_SITE_KEY nothing happens, so local development and tests are unaffected.
 */
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const SITE_KEY = env.VITE_TURNSTILE_SITE_KEY ?? "";
const BASE = (env.VITE_TUTOR_URL ?? "").replace(/\/$/, "");
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  remove(id: string): void;
}
declare global { interface Window { turnstile?: TurnstileApi } }

export const humanCheckOn = SITE_KEY !== "";
let pass: { value: string; until: number } | null = null;
let pending: Promise<string | null> | null = null;

let scriptReady: Promise<void> | null = null;
const loadScript = () => (scriptReady ??= new Promise<void>((resolve, reject) => {
  if (window.turnstile) return resolve();
  const s = document.createElement("script");
  s.src = SCRIPT; s.async = true; s.defer = true;
  s.onload = () => resolve();
  s.onerror = () => { scriptReady = null; reject(new Error("turnstile script")); };
  document.head.appendChild(s);
}));

/** Show the widget (invisible unless Cloudflare needs the person to do something) and wait for a token. */
async function solve(): Promise<string> {
  await loadScript();
  return new Promise<string>((resolve, reject) => {
    const box = document.createElement("div");
    box.className = "turnstile-box";
    document.body.appendChild(box);
    let id = "";
    const done = () => { try { if (id) window.turnstile?.remove(id); } catch { /* already gone */ } box.remove(); };
    const timer = setTimeout(() => { done(); reject(new Error("timeout")); }, 60_000);
    id = window.turnstile!.render(box, {
      sitekey: SITE_KEY, appearance: "interaction-only", theme: "auto", language: "en-GB",
      callback: (token: string) => { clearTimeout(timer); done(); resolve(token); },
      "error-callback": () => { clearTimeout(timer); done(); reject(new Error("error")); },
      "timeout-callback": () => { clearTimeout(timer); done(); reject(new Error("expired")); },
    });
  });
}

/** A current pass, or null when the check is switched off or could not be completed. */
export async function humanPass(): Promise<string | null> {
  if (!humanCheckOn) return null;
  if (pass && Date.now() < pass.until) return pass.value;
  return (pending ??= (async () => {
    try {
      const token = await solve();
      const res = await fetch(`${BASE}/api/humans/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (!res.ok) return null;
      const j = (await res.json()) as { pass?: string; expiresInSeconds?: number };
      if (!j.pass) return null;
      pass = { value: j.pass, until: Date.now() + Math.max(60, (j.expiresInSeconds ?? 0) - 60) * 1000 };
      return pass.value;
    } catch { return null; } finally { pending = null; }
  })());
}
export const forgetHumanPass = () => { pass = null; };

/** Header to add to an AI request. Empty when the check is off. */
export async function humanHeaders(): Promise<Record<string, string>> {
  const p = await humanPass();
  return p ? { "X-Human-Pass": p } : {};
}
