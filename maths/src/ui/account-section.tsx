import { isNativeApp } from "../native/bridge";
import { useEffect, useState } from "preact/hooks";
import type { SyncStatus } from "../account/sync";
import { useAccount } from "./account-context";
import { useApp } from "./context";

const LABEL: Record<SyncStatus, string> = { idle: "", saving: "Saving…", saved: "Saved to your account", offline: "Offline. Changes will save when you're back online.", error: "We couldn't save. Please check your connection." };

/** A small line saying whether progress is safely saved. Shows nothing when the app runs without accounts. */
export function SyncChip() {
  const a = useAccount();
  if (!a) return null;
  const text = a.notice || LABEL[a.status];
  return text ? <p class={`sync-chip ${a.status}`} role="status" data-testid="sync-chip">{text}</p> : null;
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

/** For the grown-ups' area: the subscription, with a button that opens Stripe's page to change plan, update the card or cancel. */
export function SubscriptionSection() {
  const a = useAccount();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!a || !a.billing.enabled || isNativeApp()) return null; // in the app, subscriptions go through the App Store, not Stripe
  const b = a.billing;
  const what = b.cancelAtPeriodEnd
    ? `Cancelled. You keep full access until ${day(b.periodEnd ?? b.trialEnd)}.`
    : b.status === "trialing" ? `Free trial until ${day(b.trialEnd)}, then it renews${b.plan ? ` ${b.plan}` : ""}. Cancel before then and you won't be charged.`
    : b.status === "past_due" ? "Your last payment didn't go through. Please update your card to keep access."
    : b.status === "active" ? `Active${b.plan ? `, ${b.plan}` : ""}. Renews on ${day(b.periodEnd)}.`
    : "No active subscription.";
  const open = async () => { setBusy(true); setErr(""); try { await a.manageBilling(); } catch { setErr("We couldn't open the billing page just now. Please try again."); setBusy(false); } };
  return (
    <section class="card" data-testid="subscription-section">
      <h2>Subscription</h2>
      <p data-testid="subscription-status">{what}</p>
      <div class="actions"><button class="btn" disabled={busy} onClick={open} data-testid="manage-subscription">Manage subscription</button></div>
      <p class="small muted">Change plan, update your card, download invoices or cancel, on Stripe's secure page.</p>
      {err && <p class="alert-note" role="alert">{err}</p>}
    </section>
  );
}

/** For the grown-ups' area: who is signed in, and the parent's rights over the information held. */
export function AccountSection() {
  const a = useAccount();
  const { go } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (!a) return null;

  const remove = async () => {
    setBusy(true); setMsg("");
    try { await a.deleteAccount(); } catch { setMsg("We couldn't delete the account just now. Please try again."); setBusy(false); }
  };

  return (
    <section class="card" data-testid="account-section">
      <h2>Your account</h2>
      <p>Signed in{a.email ? <> as <strong>{a.email}</strong></> : null}.</p>
      <SyncChip />
      <div class="actions">
        <button class="btn" onClick={() => void a.signOut()} data-testid="sign-out">Sign out</button>
        <button class="btn" onClick={() => go({ name: "my-data" })} data-testid="download-data">See and download my information</button>
      </div>
      {msg && <p role="status" class="small">{msg}</p>}
      <h3>Delete everything</h3>
      <p class="small muted">This removes your account and every learner in it, for good. It can't be undone.</p>
      {!confirm
        ? <button class="btn danger" onClick={() => setConfirm(true)} data-testid="delete-account">Delete my account</button>
        : (
          <div class="actions">
            <label><span class="field-label">Type DELETE to confirm</span><input value={typed} onInput={(e) => setTyped((e.target as HTMLInputElement).value)} data-testid="delete-confirm" autoComplete="off" /></label>
            <button class="btn danger" disabled={busy || typed.trim().toUpperCase() !== "DELETE"} onClick={remove} data-testid="delete-everything">Delete everything</button>
            <button class="btn" onClick={() => { setConfirm(false); setTyped(""); }}>Cancel</button>
          </div>
        )}
    </section>
  );
}

/** For the grown-ups' area: the weekly progress email, which is off until the parent turns it on. */
export function WeeklyEmailSection() {
  const a = useAccount();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { let live = true; a?.getWeeklyEmail().then((v) => { if (live) setOn(v); }).catch(() => { if (live) setOn(null); }); return () => { live = false; }; }, []);
  if (!a) return null;
  const change = async (next: boolean) => {
    setBusy(true); setErr("");
    try { setOn(await a.setWeeklyEmail(next)); } catch { setErr("We couldn't save that just now. Please try again."); }
    setBusy(false);
  };
  return (
    <section class="card" aria-labelledby="weekly-h" data-testid="weekly-email">
      <h2 id="weekly-h">Weekly email</h2>
      <p>A short email each week: how many days your child practised, which topics were tricky and why, and one small thing to try together. It's only sent if they practised that week.</p>
      <label class="check"><input type="checkbox" checked={!!on} disabled={busy || on === null} onChange={(e) => void change((e.target as HTMLInputElement).checked)} data-testid="weekly-email-toggle" /> Send me the weekly email{a.email ? ` at ${a.email}` : ""}</label>
      <p class="small muted">Every email has an unsubscribe link. We look up your email address from your sign-in when we send it, and don't keep a copy.</p>
      {err && <p class="alert-note" role="alert">{err}</p>}
    </section>
  );
}
