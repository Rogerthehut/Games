import { useState } from "preact/hooks";
import type { SyncStatus } from "../account/sync";
import { useAccount } from "./account-context";

const LABEL: Record<SyncStatus, string> = { idle: "", saving: "Saving…", saved: "Saved to your account", offline: "Offline. Changes will save when you're back online.", error: "We couldn't save. Please check your connection." };

/** A small line saying whether progress is safely saved. Shows nothing when the app runs without accounts. */
export function SyncChip() {
  const a = useAccount();
  if (!a) return null;
  const text = a.notice || LABEL[a.status];
  return text ? <p class={`sync-chip ${a.status}`} role="status" data-testid="sync-chip">{text}</p> : null;
}

/** For the grown-ups' area: who is signed in, and the parent's rights over their family's data. */
export function AccountSection() {
  const a = useAccount();
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (!a) return null;

  const download = async () => {
    setBusy(true); setMsg("");
    try {
      const data = await a.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = "quarter-data.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg("Downloaded. This is everything quarter holds for this account.");
    } catch { setMsg("We couldn't get your data just now. Please try again."); }
    setBusy(false);
  };
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
        <button class="btn" disabled={busy} onClick={download} data-testid="download-data">Download my family's data</button>
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
