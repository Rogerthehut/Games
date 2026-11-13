import { flushQuestionStats, setQuestionStatsSender } from "../account/question-stats";
import { isNativeApp, saveFile } from "../native/bridge";
import { useEffect, useRef, useState } from "preact/hooks";
import { clearAllPins } from "./pin";
import { AccountApi, AccountError, NO_BILLING, type BillingInfo, type Plan } from "../account/api";
import { createAuth, type AuthClient } from "../account/auth";
import { forgetAgreement, hasAgreed, rememberAgreement } from "../account/agree";
import { clearCaches, clearLegacy, declineLegacy, legacyDeclined, loadActive, loadCache, loadLegacy, saveActive, saveCache } from "../account/cache";
import { Sync, forServer, type RemoteLearner, type SyncStatus } from "../account/sync";
import type { Profile } from "../engine/progress";
import type { Store } from "../engine/storage";
import { TERMS_VERSION } from "../legal/terms-version";
import { AccountCtx, type AccountBridge, type AccountInfoCtx } from "./account-context";
import { LazyApp, preloadApp } from "./app-lazy";
import { Splash } from "./splash";
import { Icon } from "./icons";
import { CubeMark, Wordmark } from "./wordmark";
import { LegalFooter } from "./legal";
import { Landing } from "./landing";
import { MyDataPage } from "./my-data";

export { AccountCtx, useAccount } from "./account-context";
export type { AccountBridge, AccountInfoCtx } from "./account-context";

type Phase =
  | { name: "loading"; text?: string }
  | { name: "signed-out" }
  | { name: "consent" }
  | { name: "paywall"; billing: BillingInfo }
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
        <h1>quarter isn't set up yet</h1>
        <p class="onboard-sub">Sign-in hasn't been configured for this site, so nothing can be saved safely. Please check back soon.</p>
        <p class="small muted">Site owner: set VITE_CLERK_PUBLISHABLE_KEY, then rebuild.</p>
      </div>
      <LegalFooter />
    </main>
  );
}

export function AccountGate() {
  const [phase, setPhase] = useState<Phase>(() => (likelySignedIn() ? { name: "loading" } : { name: "signed-out" }));
  const [authReady, setAuthReady] = useState<AuthClient | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [notice, setNotice] = useState("");
  const auth = useRef<AuthClient | null>(null);
  const api = useRef<AccountApi | null>(null);
  const sync = useRef<Sync | null>(null);
  const handlers = useRef<{ remap(a: string, b: string): void; remote(r: RemoteLearner): void } | null>(null);
  const userId = useRef("");
  const email = useRef<string | undefined>(undefined);
  const booting = useRef(false);
  const billing = useRef<BillingInfo>(NO_BILLING);

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
        let info = await api.current!.getAccount();
        if (!info.consented && hasAgreed(TERMS_VERSION)) {
          // they ticked the box on the sign-up page: record it on the account instead of asking again
          try { await api.current!.consent(TERMS_VERSION); info = await api.current!.getAccount(); } catch { /* fall through to the consent screen */ }
        }
        if (info.consented) forgetAgreement();
        if (!info.consented) { setPhase({ name: "consent" }); return; }
        billing.current = info.billing ?? NO_BILLING;
        const back = new URLSearchParams(location.search).get("checkout");
        if (back) history.replaceState(null, "", location.pathname + location.hash);
        // coming back from paying: Stripe tells us a moment later, so wait for it briefly
        if (back === "success" && billing.current.enabled && !billing.current.access) {
          setPhase({ name: "loading", text: "Confirming your subscription…" });
          for (let i = 0; i < 8 && !billing.current.access; i++) {
            await new Promise((r) => setTimeout(r, 1500));
            info = await api.current!.getAccount();
            billing.current = info.billing ?? NO_BILLING;
          }
        }
        if (billing.current.enabled && !billing.current.access) { setPhase({ name: "paywall", billing: billing.current }); return; }
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
        if (likelySignedIn()) void preloadApp();
        // a new visitor sees the welcome page first, so let it finish loading before fetching the (large) sign-in library
        else await new Promise<void>((done) => ((window as { requestIdleCallback?: (cb: () => void, o: { timeout: number }) => void }).requestIdleCallback ?? ((cb: () => void, o: { timeout: number }) => setTimeout(cb, o.timeout / 2)))(() => done(), { timeout: 2500 }));
        const a = await createAuth();
        if (!alive) return;
        auth.current = a;
        setAuthReady(a);
        api.current = new AccountApi(() => a.getToken());
        setQuestionStatsSender((events) => api.current!.sendQuestionStats(events));
        off = a.subscribe(() => {
          const now = a.user();
          if (!now) { setQuestionStatsSender(null); sync.current?.dispose(); sync.current = null; handlers.current = null; setPhase({ name: "signed-out" }); }
          else if (now.id !== userId.current || phaseRef.current === "signed-out") void boot();
        });
        await boot();
      } catch {
        setPhase({ name: "error", message: "Sign-in isn't available right now. Please try again in a moment." });
      }
    })();
    const online = () => void sync.current?.flushNow();
    const hide = () => { if (document.visibilityState === "hidden") { void sync.current?.flushNow(); void flushQuestionStats(); } };
    addEventListener("online", online);
    document.addEventListener("visibilitychange", hide);
    return () => { alive = false; off(); removeEventListener("online", online); document.removeEventListener("visibilitychange", hide); };
  }, []);
  const phaseRef = useRef(phase.name);
  phaseRef.current = phase.name;

  const signOut = async () => {
    try { await sync.current?.flushNow(); } catch { /* signing out matters more than a last save */ }
    sync.current?.dispose(); sync.current = null;
    setQuestionStatsSender(null);
    clearCaches();           // nothing about the account stays on a shared device
    clearAllPins();
    await auth.current?.signOut();
  };

  const info: AccountInfoCtx = {
    email: email.current, userId: userId.current, status, notice, signOut,
    exportData: () => api.current!.exportData(),
    getWeeklyEmail: async () => (await api.current!.getEmailPrefs()).weeklyDigest,
    setWeeklyEmail: async (on) => (await api.current!.setWeeklyEmail(on)).weeklyDigest,
    billing: billing.current,
    ask: (m, h, y) => api.current!.ask(m, h, y),
    sendFeedback: (f) => api.current!.sendFeedback(f),
    manageBilling: async () => { location.assign(await api.current!.portal()); },
    downloadBooklet: async () => {
      await saveFile("quarter-curriculum.pdf", await api.current!.booklet(), "application/pdf");
    },
    deleteAccount: async () => { await api.current!.deleteAccount(); clearCaches(); clearAllPins(); clearLegacy(); await auth.current?.signOut().catch(() => undefined); },
  };

  if (phase.name === "ready")
    return (
      <AccountCtx.Provider value={info}>
        <LazyApp key={userId.current} initialStore={phase.store} bridge={phase.bridge} />
      </AccountCtx.Provider>
    );
  if (phase.name === "signed-out") return <SignedOut auth={authReady} />;
  if (phase.name === "paywall")
    return <Paywall billing={phase.billing} email={email.current} onChoose={(plan) => api.current!.checkout(plan)} onSignOut={signOut} onExport={() => api.current!.exportData()} />;
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
  return <Splash label={phase.text ?? "Loading"} />;
}

const money = (p: { amount: number; currency: string }) => new Intl.NumberFormat("en-GB", { style: "currency", currency: p.currency.toUpperCase() }).format(p.amount / 100);

/** Where a parent with no subscription lands. Payment itself happens on Stripe's page. */
function Paywall({ billing, email, onChoose, onSignOut, onExport }: { billing: BillingInfo; email?: string; onChoose(plan: Plan): Promise<string>; onSignOut(): Promise<void>; onExport(): Promise<unknown> }) {
  const [plan, setPlan] = useState<Plan>(billing.prices?.yearly ? "yearly" : "monthly");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const prices = billing.prices;
  const chosen = prices?.[plan] ?? null;
  const saving = prices?.monthly && prices?.yearly ? prices.monthly.amount * 12 - prices.yearly.amount : 0;
  const trial = billing.trialAvailable && billing.trialDays > 0;
  const per = (p: { interval: string }) => (p.interval === "year" ? "year" : "month");

  const go = async () => {
    setBusy(true); setErr("");
    try { location.assign(await onChoose(plan)); }
    catch (e) { setErr(e instanceof AccountError && e.code === "already-subscribed" ? "This account already has a subscription. Refresh the page." : "We couldn't open the payment page. Please try again."); setBusy(false); }
  };
  const [viewing, setViewing] = useState(false);
  if (viewing) return <MyDataPage load={onExport} email={email} onBack={() => setViewing(false)} />;
  // in the iPhone and iPad app a subscription has to be bought through the App Store, not with a card on a web page
  if (isNativeApp()) return (
    <Shell wide>
      <h1 data-testid="paywall-title">Subscriptions are coming to the app</h1>
      <p class="onboard-sub">In-app subscriptions are being set up. Please check back soon.{email ? <> Signed in as {email}.</> : null}</p>
      <button type="button" class="btn" onClick={() => void onSignOut()} data-testid="paywall-signout">Sign out</button>
    </Shell>
  );
  return (
    <Shell wide>
      <h1 data-testid="paywall-title">{trial ? `Start your ${billing.trialDays}\u2011day free trial` : "Subscribe to carry on"}</h1>
      <p class="onboard-sub">One subscription covers every learner on the account.{email ? <> Signed in as {email}.</> : null}</p>
      {prices && (prices.monthly || prices.yearly) ? (
        <div class="plans" role="radiogroup" aria-label="Plan">
          {(["yearly", "monthly"] as const).map((k) => prices[k] && (
            <button key={k} type="button" role="radio" aria-checked={plan === k} class={`plan ${plan === k ? "on" : ""}`} onClick={() => setPlan(k)} data-testid={`plan-${k}`}>
              <strong>{k === "yearly" ? "Yearly" : "Monthly"}</strong>
              <span class="plan-price">{money(prices[k]!)}<small> / {per(prices[k]!)}</small></span>
              {k === "yearly" && saving > 0 && <span class="plan-save">Save {money({ amount: saving, currency: prices[k]!.currency })} a year</span>}
            </button>
          ))}
        </div>
      ) : <p class="alert-note" role="alert">Prices aren't available just now. Please try again in a moment.</p>}
      <button type="button" class="btn primary big" disabled={busy || !chosen} onClick={go} data-testid="start-checkout">{busy ? "Opening…" : trial ? `Start ${billing.trialDays}-day free trial` : "Continue to payment"}</button>
      {chosen && (
        <p class="small muted account-hint">
          {trial ? `You won't be charged until the trial ends. Then ${money(chosen)} a ${per(chosen)}, renewing automatically until you cancel.` : `You'll be charged ${money(chosen)} now, then every ${per(chosen)} until you cancel.`}
          {" "}Cancel any time in the Parents' area, under Subscription. Payment is handled by Stripe, so we never see your card details. See the <a href="./?info=terms">terms</a> and <a href="./?info=privacy">privacy notice</a>.
        </p>
      )}
      {err && <p class="alert-note" role="alert">{err}</p>}
      <p class="small account-hint"><button type="button" class="linkish" onClick={() => setViewing(true)} data-testid="paywall-info">See my information</button> · <button type="button" class="linkish" onClick={() => void onSignOut()} data-testid="paywall-sign-out">Sign out</button></p>
      <Legal />
    </Shell>
  );
}

/**
 * Clerk keeps a small "client_uat" cookie that is 0 (or missing) when nobody is signed in. Reading it lets the welcome page appear straight away
 * for a new visitor, instead of waiting for the sign-in library to load just to find out nobody is signed in.
 */
function likelySignedIn(): boolean {
  try {
    const found = [...document.cookie.matchAll(/(?:^|;\s*)__client_uat(?:_[A-Za-z0-9]+)?=(\d+)/g)];
    return found.some((m) => m[1] !== "0");
  } catch { return true; }
}

function SignedOut({ auth }: { auth: AuthClient | null }) {
  // Visitors land on the welcome page first. A hash means Clerk is mid-flow (Clerk mid-flow), so go straight to the form.
  const [kind, setKind] = useState<"sign-up" | "sign-in" | null>(() => (location.hash.length > 1 ? "sign-in" : null));
  const box = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState("");
  const [agreed, setAgreed] = useState(() => hasAgreed(TERMS_VERSION));
  const formOpen = kind === "sign-in" || (kind === "sign-up" && agreed);
  useEffect(() => {
    setStuck("");
    const el = box.current;
    if (!el || !kind || !formOpen || !auth) return;
    let stop: (() => void) | undefined;
    try { stop = auth.mount(kind, el); }
    catch (e) { console.error("Sign-in form failed to open", e); setStuck(`The sign-in form couldn't open (${e instanceof Error ? e.message.slice(0, 140) : "unknown error"}).`); }
    // If Clerk's form never appears (blocked script, wrong allowed domain, an embedded preview), say so instead of showing an empty card.
    const timer = setTimeout(() => { if (!el.childElementCount) setStuck("The sign-in form hasn't loaded."); }, 6000);
    return () => { clearTimeout(timer); try { stop?.(); } catch { /* already removed */ } };
  }, [kind, formOpen, auth]);
  if (!kind) return <Landing onStart={setKind} />;
  return (
    <Shell wide>
      <button type="button" class="linkish account-back" onClick={() => setKind(null)}>← Back to welcome page</button>
      <h1>Welcome to <Wordmark /></h1>
      <p class="onboard-sub">quarter is set up by a parent or guardian. Children don't need their own login: you add each learner after you sign in.</p>
      <div class="seg account-tabs" role="tablist" aria-label="Sign up or sign in">
        <button type="button" role="tab" aria-selected={kind === "sign-up"} class={kind === "sign-up" ? "on" : ""} onClick={() => setKind("sign-up")} data-testid="tab-sign-up">Create an account</button>
        <button type="button" role="tab" aria-selected={kind === "sign-in"} class={kind === "sign-in" ? "on" : ""} onClick={() => setKind("sign-in")} data-testid="tab-sign-in">Sign in</button>
      </div>
      {kind === "sign-up" && (
        <div class="agree-box">
          <label class="account-check">
            <input type="checkbox" checked={agreed} data-testid="agree-terms" onChange={(e) => {
              const on = (e.target as HTMLInputElement).checked;
              setAgreed(on);
              if (on) rememberAgreement(TERMS_VERSION); else forgetAgreement();
            }} />
            <span>I’m a parent or guardian, setting this account up on behalf of my child (or children). I agree to the <a href="./?info=terms" target="_blank" rel="noopener">terms of use</a> and have read the <a href="./?info=privacy" target="_blank" rel="noopener">privacy notice</a>.</span>
          </label>
          {!agreed && <p class="small muted">Please tick the box to create your account.</p>}
        </div>
      )}
      <div class={`clerk-mount${formOpen ? " open" : ""}`} ref={box} data-testid="auth-box" />
      {formOpen && !auth && <p class="small muted account-hint" role="status">Getting the sign-in form ready…</p>}
      {formOpen && !stuck && <p class="small muted account-hint" data-testid="check-junk">After you continue, we email you a code or link to confirm your address. If it doesn't arrive within a minute or two, check your junk or spam folder.</p>}
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
      <p class="onboard-sub">Here is what quarter keeps for this account.</p>
      <ul class="account-points">
        <li><strong>We keep:</strong> each learner's nickname, school year, avatar and learning progress, so it follows them from device to device.</li>
        <li><strong>We don't keep:</strong> real names, birthdays, photos, or anything the AI tutor chats about. Tutor chats stay on the device for you to read there.</li>
        <li><strong>You're in charge:</strong> you can download everything we hold, or delete your account and every learner in it, any time from the grown-ups' area.</li>
        <li><strong>Who helps:</strong> Clerk handles sign-in. Account data is stored in a database in Europe (EU). See the privacy notice for the details.</li>
      </ul>
      <label class="account-check">
        <input type="checkbox" checked={ok} onChange={() => setOk(!ok)} data-testid="consent-check" />
        <span>I'm a parent or guardian, setting this up on behalf of my child (or children), and I agree to the <a href="./?info=privacy" target="_blank" rel="noopener">privacy notice</a> and <a href="./?info=terms" target="_blank" rel="noopener">terms of use</a>.</span>
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
