const env = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};

/** Clerk's publishable key (safe to ship in the browser). Accounts are on when it is set. */
export const CLERK_KEY = typeof env.VITE_CLERK_PUBLISHABLE_KEY === "string" ? env.VITE_CLERK_PUBLISHABLE_KEY : "";
/** A fake sign-in for development only. It is ignored in a production build, and the server refuses it in production too. */
export const FAKE_AUTH = !env.PROD && env.VITE_FAKE_AUTH === "1";
/** Without either, the app runs as before, keeping progress on the device only (local development, tests, a static preview). */
export const accountsOn = !!CLERK_KEY || FAKE_AUTH;
