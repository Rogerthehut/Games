import * as Sentry from "@sentry/node";
import { IGNORED_ERRORS, scrubEvent, type ReportEvent } from "../src/monitoring/scrub";

/**
 * Error reporting for the server, switched on only when SENTRY_DSN is set. Crashes and failures in the routes only: no request bodies, no
 * headers, no user, no tracing, and error messages reduced to their type (a server error message can quote a request). See docs/MONITORING.md.
 */
let on = false;
export function startMonitoring(env: Record<string, string | undefined> = process.env): boolean {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn || on) return on;
  Sentry.init({
    dsn, environment: env.SENTRY_ENV || env.NODE_ENV || "production", release: env.RELEASE || undefined,
    sendDefaultPii: false, defaultIntegrations: false,
    integrations: [Sentry.onUncaughtExceptionIntegration(), Sentry.onUnhandledRejectionIntegration(), Sentry.dedupeIntegration(), Sentry.linkedErrorsIntegration()],
    tracesSampleRate: 0, maxBreadcrumbs: 0, ignoreErrors: IGNORED_ERRORS,
    beforeBreadcrumb: () => null,
    beforeSend: (event) => scrubEvent(event as unknown as ReportEvent, true) as unknown as typeof event,
  });
  on = true;
  return true;
}
/** Reports an error from a route. `area` says where (for example "ops"); it is the only extra detail sent. */
export function reportError(error: unknown, area: string): void {
  if (!on) return;
  Sentry.withScope((scope) => { scope.setTag("area", area); Sentry.captureException(error); });
}
