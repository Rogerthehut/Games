/**
 * The 11+ finder's postcode lookup. The browser sends only the first half of a postcode (such as "BR1"), never the full postcode.
 * We ask postcodes.io which council areas that outward code covers and send back just the names. Nothing is stored or logged.
 */
export const OUTCODE = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/;

/** "br1 3ab", "BR13AB" and "br1" all give "BR1". Returns null when it is not a UK postcode or outward code. */
export function outwardCode(input: string): string | null {
  const t = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const full = /^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9][A-Z]{2})$/.exec(t);
  const out = full ? full[1] : t;
  return OUTCODE.test(out) ? out : null;
}

export interface OutcodeAreas { code: string; areas: string[] }
type Fetcher = (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export function makeOutcodeLookup(fetcher: Fetcher = fetch as unknown as Fetcher, now: () => number = Date.now) {
  const cache = new Map<string, { at: number; value: OutcodeAreas | null }>();
  const DAY = 86_400_000;
  return async function lookup(code: string): Promise<OutcodeAreas | null> {
    if (!OUTCODE.test(code)) return null;
    const hit = cache.get(code);
    if (hit && now() - hit.at < DAY) return hit.value;
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 6000);
    try {
      const res = await fetcher(`https://api.postcodes.io/outcodes/${code}`, { signal: ctl.signal, headers: { Accept: "application/json" } });
      if (res.status === 404) { cache.set(code, { at: now(), value: { code, areas: [] } }); return { code, areas: [] }; }
      if (!res.ok) return null;
      const r = ((await res.json()) as { result?: Record<string, unknown> }).result ?? {};
      const names = (k: string) => (Array.isArray(r[k]) ? (r[k] as unknown[]).filter((x): x is string => typeof x === "string") : []);
      const value = { code, areas: [...new Set([...names("admin_district"), ...names("admin_county"), ...names("country")])] };
      cache.set(code, { at: now(), value });
      return value;
    } catch { return null; } finally { clearTimeout(timer); }
  };
}
