import { init, globalHandlersIntegration, dedupeIntegration, linkedErrorsIntegration } from "@sentry/browser";
import { scrubEvent, IGNORED_ERRORS, type ReportEvent } from "./scrub";

const env = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
const DSN = typeof env.VITE_SENTRY_DSN === "string" ? env.VITE_SENTRY_DSN : "";

/**
 * Error reporting for the browser, switched on only when VITE_SENTRY_DSN is set at build time. main.tsx loads this file after the app has started so the first
 * screen isn't slowed, sets no cookies, and reports crashes only: no session replay, no tracing, no breadcrumbs, no user, and a scrubber
 * (./scrub.ts) removes anything else before sending. See docs/MONITORING.md.
 */
export function startMonitoring(): void {
  if (!DSN || !env.PROD) return;
  try {
    init({
      dsn: DSN,
      environment: typeof env.VITE_SENTRY_ENV === "string" ? env.VITE_SENTRY_ENV : "production",
      release: typeof env.VITE_RELEASE === "string" ? env.VITE_RELEASE : undefined,
      defaultIntegrations: false,                       // only the ones listed below: no breadcrumbs, no console or click capture
      integrations: [globalHandlersIntegration(), dedupeIntegration(), linkedErrorsIntegration()],
      maxBreadcrumbs: 0, tracesSampleRate: 0, attachStacktrace: true, sampleRate: 1,
      ignoreErrors: IGNORED_ERRORS,
      denyUrls: [/^chrome-extension:/i, /^moz-extension:/i, /^safari-(web-)?extension:/i, /extensions\//i],
      beforeBreadcrumb: () => null,
      beforeSend: (event) => scrubEvent(event as unknown as ReportEvent) as unknown as typeof event,
    });
  } catch { /* monitoring must never get in the way of the app */ }
}
