import { useEffect, useRef, useState } from "preact/hooks";
import { AccountApi, AccountError } from "../account/api";
import { createAuth, type AuthClient } from "../account/auth";
import { clearCaches, clearLegacy, declineLegacy, legacyDeclined, loadActive, loadCache, loadLegacy, saveActive, saveCache } from "../account/cache";
import { Sync, forServer, type RemoteLearner, type SyncStatus } from "../account/sync";
import type { Profile } from "../engine/progress";
import type { Store } from "../engine/storage";
import { TERMS_VERSION } from "../legal/terms-version";
import { AccountCtx, type AccountBridge, type AccountInfoCtx } from "./account-context";
import { App } from "./app";
import { Icon } from "./icons";
import { CubeMark, Wordmark } from "./wordmark";
import { LegalFooter } from "./legal";

export { AccountCtx, useAccount } from "./account-context";
export type { AccountBridge, AccountInfoCtx } from "./account-context";

type Phase =
  | { name: "loading"; text?: string }
  | { name: "signed-out" }
  | { name: "consent" }
  | { name: "migrate"; legacy: Store }
  | { name: "error"; message: string }
  | { name: "ready"; store: Store; bridge: AccountBridge };

const Shell = ({ children, wide }: { children: preact.ComponentChildren; wide?: boolean }) => (
  <main class="onboard"><div class={`onboard-in account-card ${wide ? "wide" : ""}`}>{children}</div></main>
);
const Legal = () => (
  <p class="small muted account-legal">
    <a href="./?info=privacy">Privacy notice</a> · <a href="./?info=terms">Terms of use</a> · <a href="./?info=cookies">Cookies</a>
  </p>
);

/** Shown by a live build that has no sign-in key, instead of silently running without accounts. */
export function NotSetUp() {
  return (
    <main class="onboard">
      <div class="onboard-in">
        <div class="welcome-mark"><CubeMark /></div>
        <h1>Quarter isn't set up yet</h1>
        <p class="onboard-sub">Sign-in hasn't been configured for this site, so nothing can be saved safely. Please check back soon.</p>
        <p class="small muted">Site owner: set VITE_CLERK_PUBLISHABLE_KEY, then rebuild.</p>
      </div>
      <LegalFooter />
    </main>
  );
}

export function AccountGate() {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [notice, setNotice] = useState("");
  const auth = useRef<AuthClient | null>(null);
  const api = useRef<AccountApi | null>(null);
  const sync = useRef<Sync | null>(null);
  const handlers = useRef<{ remap(a: string, b: string): void; remote(r: RemoteLearner): void } | null>(null);
  const userId = useRef("");
  const email = useRef<string | undefined>(undefined);
  const booting = useRef(false);

  const enter = (learners: RemoteLearner[], offline = false, logs: Record<string, unknown> = {}) => {
    const a = api.current!;
    const s = new Sync(a, {
      onStatus: setStatus,
      onRemap: (l, r) => handlers.current?.remap(l, r),
      onRemoteUpdate: (r) => { handlers.current?.remote(r); setNotice("Updated from another device."); setTimeout(() => setNotice(""), 6000); },
    });
    s.seed(learners);
    sync.current = s;
    const profiles = learners.map((l) => ({ ...(l.data as unknown as Profile), id: l.id, ...(logs[l.id] ? { tutorLog: logs[l.id] } : {}) }) as Profile);
    const wanted = loadActive(userId.current);
    const store: Store = { version: 1, profiles, activeId: profiles.find((p) => p.id === wanted)?.id ?? profiles[0]?.id ?? null };
    const uid = userId.current;
    const bridge: AccountBridge = {
      persist: (next) => {
        const versions: Record<string, number> = {};
        for (const [id, v] of s.versions()) versions[id] = v;
        saveCache(uid, { store: next, versions, savedAt: Date.now() });
        saveActive(uid, next.activeId);
        s.notify(next);
      },
      forget: (id) => s.forget(id),
      setHandlers: (h) => { handlers.current = h; },
    };
    if (offline) setStatus("offline");
    setPhase({ name: "ready", store, bridge });
  };

  const boot = async () => {
    if (booting.current) return;
    booting.current = true;
    const user = auth.current!.user();
    try {
      if (!user) { setPhase({ name: "signed-out" }); return; }
      userId.current = user.id; email.current = user.email;
      setPhase({ name: "loading" });
      try {
        const info = await api.current!.getAccount();
        if (!info.consented) { setPhase({ name: "consent" }); return; }
        const legacy = loadLegacy();
        if (info.learners.length === 0 && legacy && !legacyDeclined()) { setPhase({ name: "migrate", legacy }); return; }
        enter(info.learners);
      } catch (e) {
        const cached = (e as AccountError).code === "offline" ? loadCache(user.id) : null;
        if (cached) {
          const learners = cached.store.profiles.map((p) => ({ id: p.id, version: cached.versions[p.id] ?? 1, data: forServer(p) as unknown as Record<string, unknown> }));
          enter(learners, true);
        } else setPhase({ name: "error", message: (e as AccountError).code === "offline" ? "You're offline, and nothing is saved on this device yet. Connect and try again." : "We couldn't load your account. Please try again." });
      }
    } finally { booting.current = false; }
  };

  useEffect(() => {
    let off = () => {};
    let alive = true;
    (async () => {
      try {
        const a = await createAuth();
        if (!alive) return;
        auth.current = a;
        api.current = new AccountApi(() => a.getToken());
        off = a.subscribe(() => {
          const now = a.user();
          if (!now) { sync.current?.dispose(); sync.current = null; handlers.current = null; setPhase({ name: "signed-out" }); }
          else if (now.id !== userId.current || phaseRef.current === "signed-out") void boot();
        });
        await boot();
      } catch {
        setPhase({ name: "error", message: "Sign-in isn't available right now. Please try again in a moment." });
      }
    })();
    const online = () => void sync.current?.flushNow();
    const hide = () => { if (document.visibilityState === "hidden") void sync.current?.flushNow(); };
    addEventListener("online", online);
    document.addEventListener("visibilitychange", hide);
    return () => { alive = false; off(); removeEventListener("online", online); document.removeEventListener("visibilitychange", hide); };
  }, []);
  const phaseRef = useRef(phase.name);
  phaseRef.current = phase.name;

  const signOut = async () => {
    try { await sync.current?.flushNow(); } catch { /* signing out matters more than a last save */ }
    sync.current?.dispose(); sync.current = null;
    clearCaches();           // nothing about the family stays on a shared device
    await auth.current?.signOut();
  };

  const info: AccountInfoCtx = {
    email: email.current, status, notice, signOut,
    exportData: () => api.current!.exportData(),
    deleteAccount: async () => { await api.current!.deleteAccount(); clearCaches(); clearLegacy(); await auth.current?.signOut().catch(() => undefined); },
  };

  if (phase.name === "ready")
    return (
      <AccountCtx.Provider value={info}>
        <App key={userId.current} initialStore={phase.store} bridge={phase.bridge} />
      </AccountCtx.Provider>
    );
  if (phase.name === "signed-out") return <SignedOut auth={auth.current!} />;
  if (phase.name === "consent")
    return <Consent onAgree={async () => { await api.current!.consent(TERMS_VERSION); booting.current = false; await boot(); }} onSignOut={signOut} />;
  if (phase.name === "migrate")
    return <Migrate legacy={phase.legacy} api={api.current!} onDone={(learners, logs) => { clearLegacy(); enter(learners, false, logs); }} onSkip={() => { declineLegacy(); enter([]); }} />;
  if (phase.name === "error")
    return (
      <Shell>
        <h1>Something went wrong</h1>
        <p class="onboard-sub">{phase.message}</p>
        <button class="btn primary big" onClick={() => { booting.current = false; void boot(); }}>Try again</button>
        <button class="linkish" onClick={signOut}>Sign out</button>
      </Shell>
    );
  return <Shell><p class="onboard-sub" role="status">{phase.text ?? "Loading…"}</p></Shell>;
}

function SignedOut({ auth }: { auth: AuthClient }) {
  const [kind, setKind] = useState<"sign-up" | "sign-in">("sign-up");
  const box = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState("");
  useEffect(() => {
    setStuck("");
    const el = box.current;
    if (!el) return;
    let stop: (() => void) | undefined;
    try { stop = auth.mount(kind, el); }
    catch (e) { console.error("Sign-in form failed to open", e); setStuck("The sign-in form couldn't open."); }
    // If Clerk's form never appears (blocked script, wrong allowed domain, an embedded preview), say so instead of showing an empty card.
    const timer = setTimeout(() => { if (!el.childElementCount) setStuck("The sign-in form hasn't loaded."); }, 6000);
    return () => { clearTimeout(timer); try { stop?.(); } catch { /* already removed */ } };
  }, [kind]);
  return (
    <Shell wide>
      <h1>Welcome to <Wordmark /></h1>
      <p class="onboard-sub">Quarter is set up by a parent or guardian. Children don't need their own login: you add each learner after you sign in.</p>
      <div class="seg account-tabs" role="tablist" aria-label="Sign up or sign in">
        <button type="button" role="tab" aria-selected={kind === "sign-up"} class={kind === "sign-up" ? "on" : ""} onClick={() => setKind("sign-up")} data-testid="tab-sign-up">Create an account</button>
        <button type="button" role="tab" aria-selected={kind === "sign-in"} class={kind === "sign-in" ? "on" : ""} onClick={() => setKind("sign-in")} data-testid="tab-sign-in">Sign in</button>
      </div>
      <div class="clerk-mount" ref={box} data-testid="auth-box" />
      {stuck && <p class="alert-note" role="alert" data-testid="auth-stuck">{stuck} Try opening this page in its own browser tab. If it still doesn't load, the site owner should check that this address is an allowed domain in the Clerk dashboard.</p>}
      <Legal />
    </Shell>
  );
}

/** Draft wording: have it reviewed before launch (see docs/ACCOUNTS.md). */
function Consent({ onAgree, onSignOut }: { onAgree(): Promise<void>; onSignOut(): void }) {
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => { setBusy(true); setErr(""); try { await onAgree(); } catch { setErr("We couldn't save that. Please try again."); setBusy(false); } };
  return (
    <Shell wide>
      <h1>Before we start</h1>
      <p class="onboard-sub">Here is what Quarter keeps for your family.</p>
      <ul class="account-points">
        <li><strong>We keep:</strong> each learner's nickname, school year, avatar and learning progress, so it follows them from device to device.</li>
        <li><strong>We don't keep:</strong> real names, birthdays, photos, or anything the AI tutor chats about. Tutor chats stay on the device for you to read there.</li>
        <li><strong>You're in charge:</strong> you can download everything we hold, or delete your account and every learner in it, any time from the grown-ups' area.</li>
        <li><strong>Who helps:</strong> Clerk handles sign-in. Your family's data is stored in a database we run. See the privacy notice for the details.</li>
      </ul>
      <label class="account-check">
        <input type="checkbox" checked={ok} onChange={() => setOk(!ok)} data-testid="consent-check" />
        <span>I'm a parent or guardian, and I agree to the <a href="./?info=privacy" target="_blank" rel="noopener">privacy notice</a> and <a href="./?info=terms" target="_blank" rel="noopener">terms of use</a>.</span>
      </label>
      {err && <p class="error" role="alert">{err}</p>}
      <button class="btn primary big" disabled={!ok || busy} onClick={go} data-testid="consent-go">Agree and continue <Icon name="arrow" size={20} /></button>
      <button class="linkish" onClick={onSignOut}>Sign out</button>
    </Shell>
  );
}

function Migrate({ legacy, api, onDone, onSkip }: { legacy: Store; api: AccountApi; onDone(l: RemoteLearner[], logs: Record<string, unknown>): void; onSkip(): void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const names = legacy.profiles.map((p) => p.name);
  const add = async () => {
    setBusy(true); setErr("");
    try {
      const out: RemoteLearner[] = [];
      for (const p of legacy.profiles) {
        const made = await api.createLearner(p);
        out.push({ id: made.id, version: made.version, data: { ...(forServer(p) as unknown as Record<string, unknown>), id: made.id } });
      }
      // the tutor chat log stays on this device: carry it over from the old copy
      const logs: Record<string, unknown> = {};
      out.forEach((l, i) => { const log = (legacy.profiles[i] as unknown as { tutorLog?: unknown }).tutorLog; if (log) logs[l.id] = log; });
      onDone(out, logs);
    } catch { setErr("We couldn't add them just now. Please try again."); setBusy(false); }
  };
  return (
    <Shell wide>
      <h1>We found progress on this device</h1>
      <p class="onboard-sub">{names.join(", ")} {names.length === 1 ? "has" : "have"} progress saved on this device from before accounts. Add {names.length === 1 ? "it" : "them"} to your account so {names.length === 1 ? "it" : "they"} can follow you to other devices?</p>
      {err && <p class="error" role="alert">{err}</p>}
      <button class="btn primary big" disabled={busy} onClick={add} data-testid="migrate-yes">{busy ? "Adding…" : "Add to my account"}</button>
      <button class="linkish" disabled={busy} onClick={onSkip} data-testid="migrate-no">Not now, start fresh</button>
    </Shell>
  );
}
