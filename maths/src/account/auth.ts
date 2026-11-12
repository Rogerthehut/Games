import { isNativeApp } from "../native/bridge";
import { CLERK_KEY, FAKE_AUTH } from "./config";

export interface AuthUser { id: string; email?: string }
/** Signing in, as the app needs it. Clerk in production; a fake for development. */
export interface AuthClient {
  user(): AuthUser | null;
  getToken(): Promise<string | null>;
  subscribe(cb: () => void): () => void;
  /** Show the sign-in or sign-up form inside `el`. Returns a function that removes it. */
  mount(kind: "sign-in" | "sign-up", el: HTMLDivElement): () => void;
  signOut(): Promise<void>;
}

export async function createAuth(): Promise<AuthClient> {
  return CLERK_KEY ? clerkAuth(CLERK_KEY) : fakeAuth();
}

async function clerkAuth(key: string): Promise<AuthClient> {
  // Loaded only when accounts are on, so the local-only build stays small.
  // clerk-js no longer carries the sign-in screens, so they come from @clerk/ui and are passed in. Without it every mount fails.
  const [{ Clerk }, { ui }] = await Promise.all([import("@clerk/clerk-js"), import("@clerk/ui")]);
  const clerk = new Clerk(key);
  await clerk.load({
    ui,
    appearance: {
      variables: { colorPrimary: "#2f3a73", colorText: "#1e2140", fontFamily: "Figtree, system-ui, sans-serif", borderRadius: "14px", fontSize: "16px" },
      // our own tabs switch between sign in and sign up, so hide Clerk's link between them
      elements: { footerAction: { display: "none" }, cardBox: { boxShadow: "none", width: "100%" }, rootBox: { width: "100%" },
        // Google refuses to sign people in from inside another app's web view, so the app offers the other ways in
        ...(isNativeApp() ? { socialButtonsBlockButton__google: { display: "none" }, socialButtonsIconButton__google: { display: "none" } } : {}) },
    },
  });
  return {
    user: () => (clerk.user ? { id: clerk.user.id, email: clerk.user.primaryEmailAddress?.emailAddress } : null),
    getToken: async () => (await clerk.session?.getToken()) ?? null,
    subscribe: (cb) => clerk.addListener(() => cb()),
    mount(kind, el) {
      if (kind === "sign-in") { clerk.mountSignIn(el); return () => clerk.unmountSignIn(el); }
      clerk.mountSignUp(el);
      return () => clerk.unmountSignUp(el);
    },
    signOut: () => clerk.signOut(),
  };
}

/** Development only: type any name to be "signed in" as that parent. The token is the id; the dev server accepts it only with AUTH_FAKE=1. */
function fakeAuth(): AuthClient {
  if (!FAKE_AUTH) throw new Error("No sign-in is configured.");
  const KEY = "quarter.fake.user";
  const listeners = new Set<() => void>();
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const notify = () => listeners.forEach((l) => l());
  return {
    user: () => { const id = read(); return id ? { id, email: `${id.replace(/^fake_/, "")}@test.invalid` } : null; },
    getToken: async () => read(),
    subscribe: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    mount(kind, el) {
      el.innerHTML = `<form class="fake-auth" data-testid="fake-auth"><p class="small muted">Test sign-in (development only). Type a name to ${kind === "sign-up" ? "create" : "open"} that parent account.</p>
        <input name="who" aria-label="Parent name" placeholder="Parent name" autocomplete="off" maxlength="30" />
        <button class="btn primary big" type="submit" data-testid="fake-auth-go">Continue</button></form>`;
      const form = el.querySelector("form")!;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const who = (form.querySelector("input") as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
        if (!who) return;
        try { localStorage.setItem(KEY, `fake_${who}`); } catch { /* ignore */ }
        notify();
      });
      return () => { el.innerHTML = ""; };
    },
    signOut: async () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } notify(); },
  };
}
