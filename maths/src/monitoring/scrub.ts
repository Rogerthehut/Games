/**
 * What may leave quarter in an error report. Reports go to Sentry (EU region) and are kept to the bare minimum for fixing a crash:
 * the error type and a trimmed message, the code location, and the browser or Node version. No user, no cookies, no request details,
 * no page addresses beyond the path, no breadcrumbs, no extra data, and nothing a child or parent typed. Used by the browser and the server.
 */
type Json = Record<string, unknown>;
export interface ReportEvent {
  user?: unknown; request?: Json & { url?: string; headers?: unknown; cookies?: unknown; data?: unknown; query_string?: unknown };
  breadcrumbs?: unknown; extra?: unknown; contexts?: Json; tags?: Record<string, unknown>; server_name?: unknown; message?: string;
  exception?: { values?: { type?: string; value?: string; [k: string]: unknown }[] }; transaction?: string; [k: string]: unknown;
}

const EMAIL = /[^\s@"'<>()]+@[^\s@"'<>()]+\.[^\s@"'<>()]+/g;
const LONG_TOKEN = /\b[A-Za-z0-9_-]{24,}\b/g;
const MAX_MESSAGE = 200;

/** A message with anything that looks like an email address or a token removed, and trimmed. */
export function cleanMessage(text: string | undefined): string | undefined {
  if (!text) return text;
  return text.replace(EMAIL, "[email]").replace(LONG_TOKEN, "[token]").slice(0, MAX_MESSAGE);
}
/** An address reduced to its path: no domain-specific query, no hash, no learner or topic ids after "?" or "#". */
export function cleanUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try { const u = new URL(url, "https://x.invalid"); return u.pathname; } catch { return url.split(/[?#]/)[0]; }
}

/** Removes everything except the minimum. `serverSide` also reduces error messages to their type, because a server error can quote a request. */
export function scrubEvent<T extends ReportEvent>(event: T, serverSide = false): T {
  delete event.user; delete event.breadcrumbs; delete event.extra; delete event.server_name;
  if (event.request) event.request = event.request.url ? { url: cleanUrl(event.request.url) } : undefined;
  if (!event.request) delete event.request;
  if (event.transaction) event.transaction = cleanUrl(event.transaction);
  // keep only the technical context (browser, operating system, runtime): drop anything else, including device identifiers
  if (event.contexts) {
    const keep: Json = {};
    for (const k of ["browser", "os", "runtime"]) if (event.contexts[k]) keep[k] = event.contexts[k];
    event.contexts = keep;
  }
  if (event.tags) for (const k of Object.keys(event.tags)) if (!["area", "handled", "mechanism", "level"].includes(k)) delete event.tags[k];
  event.message = cleanMessage(event.message);
  for (const v of event.exception?.values ?? []) v.value = serverSide ? undefined : cleanMessage(v.value);
  return event;
}

/** Errors that say nothing about quarter: browser extensions, flaky networks and known harmless browser notices. */
export const IGNORED_ERRORS = [
  /ResizeObserver loop/i, /^Script error\.?$/i, /Non-Error promise rejection/i, /Load failed/i, /Failed to fetch/i, /NetworkError/i,
  /chrome-extension|moz-extension|safari-extension/i, /AbortError/i, /The operation was aborted/i, /cancelled|canceled/i,
];
