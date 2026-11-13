import { useEffect, useRef, useState } from "preact/hooks";
import { createAuth, type AuthClient } from "../account/auth";

/**
 * The team's ops page (/ops). Three things stand between a visitor and the data, all checked by the server: a parent sign-in, the admin
 * allow-list, and a code emailed to the admin's address. Nothing is cached in the browser beyond the tab's one-hour session.
 */
const KEY = "quarter.ops.session";
const read = () => { try { const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { s: string; exp: number } | null; return v && v.exp > Date.now() ? v : null; } catch { return null; } };
const keep = (v: { s: string; exp: number } | null) => { try { v ? sessionStorage.setItem(KEY, JSON.stringify(v)) : sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

type Item = { id: string; at: string; category: string; rating: number | null; context: string | null; message: string; mayReply: boolean; replies: { at: string; actor: string; message: string }[] };
type Tab = "inbox" | "numbers" | "account" | "audit" | "messages";

export function OpsPage() {
  const [auth, setAuth] = useState<AuthClient | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [session, setSession] = useState(read);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    document.title = "Ops | quarter";
    const meta = document.createElement("meta"); meta.name = "robots"; meta.content = "noindex, nofollow"; document.head.appendChild(meta);
    let off = () => {};
    createAuth().then((a) => { setAuth(a); setUser(a.user()?.id ?? null); off = a.subscribe(() => setUser(a.user()?.id ?? null)); }).catch(() => setFailed(true));
    return () => { off(); meta.remove(); };
  }, []);

  const call = async <T,>(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T & { message?: string } }> => {
    const token = await auth?.getToken();
    const res = await fetch(path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(session ? { "X-Ops-Session": session.s } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404 && session) { keep(null); setSession(null); }   // the session ended
    return { ok: res.ok, status: res.status, data };
  };

  return (
    <main class="ops" style="max-width:860px;margin:0 auto;padding:16px">
      <h1>quarter ops</h1>
      {failed ? <p>Sign-in isn't available.</p>
        : !auth ? <p>Loading…</p>
        : !user ? <SignIn auth={auth} />
        : !session ? <Code call={call} onDone={(s) => { keep(s); setSession(s); }} signOut={() => auth.signOut()} />
        : <Dashboard call={call} leave={() => { keep(null); setSession(null); }} />}
    </main>
  );
}

function SignIn({ auth }: { auth: AuthClient }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => (el.current ? auth.mount("sign-in", el.current) : undefined), []);
  return <section class="card"><h2>Sign in</h2><div ref={el} /></section>;
}

type Call = <T>(m: string, p: string, b?: unknown) => Promise<{ ok: boolean; status: number; data: T & { message?: string } }>;

function Code({ call, onDone, signOut }: { call: Call; onDone: (s: { s: string; exp: number }) => void; signOut: () => void }) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    setBusy(true); setMsg("");
    const r = await call("POST", "/api/ops/code");
    setBusy(false);
    if (r.ok) setSent(true); else setMsg(r.status === 404 ? "This account can't open the ops page." : r.data.message ?? "Something went wrong.");
  };
  const check = async (e: Event) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = await call<{ session: string; expiresAt: number }>("POST", "/api/ops/verify", { code });
    setBusy(false);
    if (r.ok) onDone({ s: r.data.session, exp: r.data.expiresAt }); else setMsg(r.data.message ?? "That didn't work.");
  };
  return (
    <section class="card">
      <h2>Second step</h2>
      {!sent ? <p><button class="btn primary" disabled={busy} onClick={ask} data-testid="ops-send">Email me a code</button></p> : (
        <form onSubmit={check}>
          <p>Enter the six-digit code we emailed you.</p>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onInput={(e) => setCode((e.target as HTMLInputElement).value)} aria-label="Six-digit code" data-testid="ops-code" />{" "}
          <button class="btn primary" disabled={busy || code.length < 6} data-testid="ops-verify">Open</button>
        </form>
      )}
      {msg && <p role="alert">{msg}</p>}
      <p><button class="btn small ghost" onClick={signOut}>Sign out</button></p>
    </section>
  );
}

function Dashboard({ call, leave }: { call: Call; leave: () => void }) {
  const [tab, setTab] = useState<Tab>("inbox");
  const tabs: [Tab, string][] = [["inbox", "Feedback"], ["messages", "Messages"], ["numbers", "Numbers"], ["account", "Account lookup"], ["audit", "Audit log"]];
  return (
    <>
      <div class="seg" role="tablist" aria-label="Ops sections">
        {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} class={tab === id ? "on" : ""} onClick={() => setTab(id)} data-testid={`ops-tab-${id}`}>{label}</button>)}
        <button class="btn small ghost" onClick={leave}>Lock</button>
      </div>
      {tab === "inbox" && <Inbox call={call} />}
      {tab === "messages" && <Messages call={call} />}
      {tab === "numbers" && <Numbers call={call} />}
      {tab === "account" && <Lookup call={call} />}
      {tab === "audit" && <Audit call={call} />}
    </>
  );
}

function Inbox({ call }: { call: Call }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [only, setOnly] = useState(true);
  const load = async () => { const r = await call<{ items: Item[] }>("GET", `/api/ops/feedback?days=90${only ? "&unreplied=1" : ""}`); setItems(r.ok ? r.data.items : []); };
  useEffect(() => { load(); }, [only]);
  return (
    <section class="card" data-testid="ops-inbox">
      <h2>Feedback</h2>
      <label><input type="checkbox" checked={only} onChange={(e) => setOnly((e.target as HTMLInputElement).checked)} /> Only ones waiting for a reply</label>
      {!items ? <p>Loading…</p> : !items.length ? <p class="muted">Nothing here.</p> : items.map((i) => <FeedbackCard key={i.id} item={i} call={call} onSent={load} />)}
    </section>
  );
}

function FeedbackCard({ item, call, onSent }: { item: Item; call: Call; onSent: () => void }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true); setMsg("");
    const r = await call("POST", "/api/ops/feedback/reply", { id: item.id, message: text });
    setBusy(false);
    if (r.ok) { setText(""); onSent(); } else setMsg(r.data.message ?? "Couldn't send.");
  };
  return (
    <article class="card" style="margin:12px 0">
      <p class="small muted">{item.at.slice(0, 16).replace("T", " ")} · {item.category}{item.rating ? ` · ${item.rating}/5` : ""}{item.context ? ` · ${item.context}` : ""} · {item.mayReply ? "may reply" : "no reply wanted"}</p>
      <p style="white-space:pre-wrap">{item.message}</p>
      {item.replies.map((r) => <blockquote key={r.at} style="margin:8px 0;padding-left:12px;border-left:3px solid #ccc"><span class="small muted">Replied {r.at.slice(0, 10)}</span><br />{r.message}</blockquote>)}
      {item.mayReply && <>
        <textarea rows={3} style="width:100%" value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} aria-label="Your reply" placeholder="Write a reply. It's emailed from hello@yourquarter.co.uk." />
        <button class="btn small primary" disabled={busy || text.trim().length < 5} onClick={send} data-testid="ops-reply">Send reply</button>
        {msg && <span role="alert"> {msg}</span>}
      </>}
    </article>
  );
}

type Entry = { at: string; actor: string; direction: "in" | "out"; message: string; auth: string | null };
type ContactItem = { id: string; at: string; name: string | null; email: string; topic: string; source: string; subject: string | null; auth: string | null; message: string; replies: Entry[]; waiting: boolean };
type SigLite = { id: string; name: string; isDefault: boolean };
type SigFull = SigLite & { html: string };

/** A preview of cleaned signature HTML that can't run anything: a sandboxed frame with no scripts, a policy that blocks everything but https images, and no links that open in it. */
function SignaturePreview({ html }: { html: string }) {
  const doc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'"><base target="_blank"><body style="margin:12px;font:15px/1.5 system-ui,sans-serif;color:#111;background:#fff">${html}</body>`;
  return <iframe class="ops-sig-preview" sandbox="" referrerpolicy="no-referrer" srcdoc={doc} title="Signature preview" style="width:100%;height:170px;border:1px solid #ccc;border-radius:8px;background:#fff" />;
}

/** Messages from parents: the Message us form and email to hello@. A reply is emailed from the sending address to the sender, under the signature chosen. */
function Messages({ call }: { call: Call }) {
  const [items, setItems] = useState<ContactItem[] | null>(null);
  const [only, setOnly] = useState(true);
  const [inbound, setInbound] = useState(false);
  const [sigs, setSigs] = useState<SigFull[]>([]);
  const [managing, setManaging] = useState(false);
  const [composing, setComposing] = useState(false);
  const loadSigs = async () => { const r = await call<{ items: SigFull[] }>("GET", "/api/ops/signatures"); if (r.ok) setSigs(r.data.items); };
  const load = async () => { const r = await call<{ items: ContactItem[]; inbound: boolean }>("GET", `/api/ops/contact${only ? "?waiting=1" : ""}`); setItems(r.ok ? r.data.items : []); if (r.ok) setInbound(r.data.inbound); };
  useEffect(() => { load(); }, [only]);
  useEffect(() => { loadSigs(); }, []);
  return (
    <section class="card" data-testid="ops-messages">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <h2 style="margin:0">Messages</h2>
        <span style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn small" onClick={() => setComposing(!composing)} aria-expanded={composing} data-testid="ops-compose-toggle">New email</button>
          <button class="btn small ghost" onClick={() => setManaging(!managing)} aria-expanded={managing} data-testid="ops-signatures-toggle">Signatures</button>
        </span>
      </div>
      <p class="small muted">From the Message us page{inbound ? " and email to hello@yourquarter.co.uk" : ""}. Replies are sent from hello@yourquarter.co.uk. Deleted automatically 180 days after the last message.{!inbound && " Email to hello@ isn't being received yet: see docs/OPS.md."}</p>
      {composing && <ComposeEmail call={call} sigs={sigs} onSent={() => { setComposing(false); setOnly(false); load(); }} />}
      {managing && <SignatureManager call={call} sigs={sigs} onChanged={loadSigs} />}
      <label><input type="checkbox" checked={only} onChange={(e) => setOnly((e.target as HTMLInputElement).checked)} /> Only ones waiting for a reply</label>
      {!items ? <p>Loading…</p> : !items.length ? <p class="muted">Nothing here.</p> : items.map((i) => <MessageCard key={i.id} item={i} call={call} sigs={sigs} onChanged={load} />)}
    </section>
  );
}

/** Write a new email to one person, from hello@. A reply from them joins the same conversation. For one-to-one messages, not bulk mail. */
function ComposeEmail({ call, sigs, onSent }: { call: Call; sigs: SigFull[]; onSent: () => void }) {
  const [to, setTo] = useState(""), [subject, setSubject] = useState(""), [text, setText] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const [sigId, setSigId] = useState<string | null | undefined>(undefined);
  const chosen = sigId === undefined ? sigs.find((x) => x.isDefault)?.id ?? "" : sigId ?? "";
  const picked = sigs.find((x) => x.id === chosen);
  const send = async () => {
    setBusy(true); setMsg("");
    const r = await call("POST", "/api/ops/contact/new", { to, subject, message: text, signatureId: chosen || null });
    setBusy(false);
    if (r.ok) onSent(); else setMsg(r.data.message ?? "Couldn't send.");
  };
  return (
    <div class="card" style="margin:10px 0" data-testid="ops-compose">
      <h3 style="margin-top:0">New email</h3>
      <p class="small muted">Sent from hello@yourquarter.co.uk to one person. If they reply, it appears here as a conversation. Please use it for one-to-one messages, not mailing lists.</p>
      <label class="small">To<input type="email" style="width:100%" maxLength={254} value={to} onInput={(e) => setTo((e.target as HTMLInputElement).value)} data-testid="ops-compose-to" autocomplete="off" /></label>
      <label class="small">Subject<input type="text" style="width:100%" maxLength={150} value={subject} onInput={(e) => setSubject((e.target as HTMLInputElement).value)} data-testid="ops-compose-subject" /></label>
      <label class="small">Message<textarea rows={6} style="width:100%" maxLength={6000} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} data-testid="ops-compose-body" /></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0">
        <label class="small">Signature{" "}
          <select value={chosen} onChange={(e) => setSigId((e.target as HTMLSelectElement).value || null)} aria-label="Signature">
            <option value="">None</option>
            {sigs.map((x) => <option key={x.id} value={x.id}>{x.name}{x.isDefault ? " (default)" : ""}</option>)}
          </select>
        </label>
        <button class="btn small primary" disabled={busy || !to.trim() || subject.trim().length < 2 || text.trim().length < 2} onClick={send} data-testid="ops-compose-send">Send email</button>
        {msg && <span role="alert"> {msg}</span>}
      </div>
      {picked && <details><summary class="small muted">Signature preview</summary><SignaturePreview html={picked.html} /></details>}
    </div>
  );
}

function MessageCard({ item, call, sigs, onChanged }: { item: ContactItem; call: Call; sigs: SigFull[]; onChanged: () => void }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sigId, setSigId] = useState<string | null | undefined>(undefined); // undefined: not chosen yet, so the default is used
  const chosen = sigId === undefined ? sigs.find((x) => x.isDefault)?.id ?? "" : sigId ?? "";
  const picked = sigs.find((x) => x.id === chosen);
  const send = async () => {
    setBusy(true); setMsg("");
    const r = await call("POST", "/api/ops/contact/reply", { id: item.id, message: text, signatureId: chosen || null });
    setBusy(false);
    if (r.ok) { setText(""); onChanged(); } else setMsg(r.data.message ?? "Couldn't send.");
  };
  const remove = async () => { if (confirm("Delete this conversation for good?")) { await call("POST", "/api/ops/contact/delete", { id: item.id }); onChanged(); } };
  const unverified = item.source === "email" && item.auth && !/dmarc=pass/.test(item.auth);
  const bubble = (who: string, at: string, body: string, mine: boolean, key?: string) => (
    <blockquote key={key} style={`margin:8px 0;padding-left:12px;border-left:3px solid ${mine ? "#2f3a73" : "#ccc"}`}><span class="small muted">{who} · {at.slice(0, 16).replace("T", " ")}</span><br /><span style="white-space:pre-wrap">{body}</span></blockquote>
  );
  return (
    <article class="card" style="margin:12px 0" data-testid="ops-message">
      <p class="small muted">{item.at.slice(0, 16).replace("T", " ")} · {item.source === "email" ? "email" : item.source === "sent" ? "sent by you" : "form"}{item.source === "form" ? ` · ${item.topic}` : ""} · {item.name ? `${item.name} · ` : ""}{item.email}{item.waiting ? " · waiting for a reply" : ""}</p>
      {item.subject && <p><strong>{item.subject}</strong></p>}
      {unverified && <p role="note" class="small" style="color:#b42318">The sender couldn't be verified ({item.auth}). It may not really be from this address, so don't act on it without checking.</p>}
      {item.source === "sent" ? bubble("You", item.at, item.message, true) : <p style="white-space:pre-wrap">{item.message}</p>}
      {item.replies.map((r, n) => bubble(r.direction === "in" ? item.email : "You", r.at, r.message, r.direction === "out", String(n)))}
      <textarea rows={3} style="width:100%" value={text} maxLength={6000} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} aria-label="Your reply" placeholder="Write a reply. It's emailed to them from hello@yourquarter.co.uk." />
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0">
        <label class="small">Signature{" "}
          <select value={chosen} onChange={(e) => setSigId((e.target as HTMLSelectElement).value || null)} aria-label="Signature" data-testid="ops-message-signature">
            <option value="">None</option>
            {sigs.map((x) => <option key={x.id} value={x.id}>{x.name}{x.isDefault ? " (default)" : ""}</option>)}
          </select>
        </label>
        <button class="btn small primary" disabled={busy || text.trim().length < 2} onClick={send} data-testid="ops-message-reply">Send reply</button>
        <button class="btn small ghost" onClick={remove}>Delete</button>
        {msg && <span role="alert"> {msg}</span>}
      </div>
      {picked && <details><summary class="small muted">Signature preview</summary><SignaturePreview html={picked.html} /></details>}
    </article>
  );
}

/** Add, edit, choose a default and delete signatures. The HTML is cleaned by the server; the preview is of the cleaned result. */
function SignatureManager({ call, sigs, onChanged }: { call: Call; sigs: SigFull[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<{ id?: string; name: string; html: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(async () => { const r = await call<{ html: string }>("POST", "/api/ops/signatures/preview", { html: editing.html }); setPreview(r.ok ? r.data.html : ""); setNote(r.ok ? "" : r.data.message ?? ""); }, 350);
    return () => clearTimeout(t);
  }, [editing?.html]);
  const save = async (makeDefault = false) => {
    if (!editing) return;
    const r = await call("POST", "/api/ops/signatures", { id: editing.id, name: editing.name, html: editing.html, makeDefault });
    if (r.ok) { setEditing(null); setNote(""); onChanged(); } else setNote(r.data.message ?? "Couldn't save.");
  };
  const act = async (path: string, body: unknown) => { const r = await call("POST", path, body); if (!r.ok) setNote(r.data.message ?? "Couldn't do that."); onChanged(); };
  return (
    <div class="card" style="margin:10px 0" data-testid="ops-signatures">
      <h3 style="margin-top:0">Signatures</h3>
      {!editing && <>
        {!sigs.length && <p class="muted small">None yet. Add one, then choose it under any reply.</p>}
        {sigs.map((x) => (
          <div key={x.id} style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0">
            <strong>{x.name}</strong>{x.isDefault && <span class="small muted">default</span>}
            <button class="btn small ghost" onClick={() => { setEditing({ id: x.id, name: x.name, html: x.html }); setPreview(x.html); }}>Edit</button>
            {!x.isDefault && <button class="btn small ghost" onClick={() => act("/api/ops/signatures/default", { id: x.id })}>Make default</button>}
            <button class="btn small ghost" onClick={() => { if (confirm(`Delete the signature "${x.name}"?`)) act("/api/ops/signatures/delete", { id: x.id }); }}>Delete</button>
          </div>
        ))}
        {sigs.some((x) => x.isDefault) && <button class="btn small ghost" onClick={() => act("/api/ops/signatures/default", { id: null })}>No default</button>}{" "}
        <button class="btn small" onClick={() => { setEditing({ name: "", html: "" }); setPreview(""); setNote(""); }} data-testid="ops-signature-new">Add a signature</button>
      </>}
      {editing && <>
        <label class="small">Name<input type="text" style="width:100%" maxLength={60} value={editing.name} onInput={(e) => setEditing({ ...editing, name: (e.target as HTMLInputElement).value })} data-testid="ops-signature-name" /></label>
        <label class="small">HTML<textarea rows={8} style="width:100%;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace" value={editing.html} spellcheck={false} maxLength={40000} onInput={(e) => setEditing({ ...editing, html: (e.target as HTMLTextAreaElement).value })} data-testid="ops-signature-html" placeholder="Paste your signature's HTML here" /></label>
        <p class="small muted">Scripts, forms, frames and anything that loads from a non-https address are removed when it's saved. This is what will be sent:</p>
        <SignaturePreview html={preview} />
        {note && <p role="alert" class="small">{note}</p>}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <button class="btn small primary" onClick={() => save(false)} disabled={!editing.name.trim() || !editing.html.trim()} data-testid="ops-signature-save">Save</button>
          <button class="btn small" onClick={() => save(true)} disabled={!editing.name.trim() || !editing.html.trim()}>Save as default</button>
          <button class="btn small ghost" onClick={() => { setEditing(null); setNote(""); }}>Cancel</button>
        </div>
      </>}
      {!editing && note && <p role="alert" class="small">{note}</p>}
    </div>
  );
}

function Numbers({ call }: { call: Call }) {
  const [s, setS] = useState<Record<string, any> | null>(null);
  useEffect(() => { call<Record<string, any>>("GET", "/api/ops/stats").then((r) => setS(r.ok ? r.data : {})); }, []);
  if (!s) return <p>Loading…</p>;
  const row = (k: string, v: unknown) => <tr key={k}><th scope="row" style="text-align:left;padding-right:16px">{k}</th><td>{String(v)}</td></tr>;
  return (
    <section class="card" data-testid="ops-numbers"><h2>Numbers</h2>
      {s.parents && <table><tbody>
        {row("Parents", s.parents.total)}{row("New in 7 days", s.parents.newLast7)}{row("New in 30 days", s.parents.newLast30)}
        {row("Learners", s.learners.total)}{row("Active in 7 days", s.learners.activeLast7)}{row("Active in 30 days", s.learners.activeLast30)}
        {row("Trials ending in 7 days", s.subscriptions.trialsEndingIn7Days)}{row("Cancelling", s.subscriptions.cancellingAtPeriodEnd)}
        {Object.entries(s.subscriptions.byStatus as Record<string, number>).map(([k, v]) => row(`Subscriptions: ${k}`, v))}
        {row("Feedback in 7 days", s.feedback.last7)}
      </tbody></table>}
    </section>
  );
}

function Lookup({ call }: { call: Call }) {
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<{ email: string; account: Record<string, any> } | null>(null);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e: Event) => {
    e.preventDefault(); setMsg(""); setFound(null); setConfirm("");
    const r = await call<{ account: Record<string, any> | null }>("GET", `/api/ops/account?email=${encodeURIComponent(email)}`);
    if (!r.ok) setMsg(r.data.message ?? "Couldn't look that up.");
    else if (!r.data.account) setMsg("No quarter account for that address.");
    else setFound({ email: email.trim().toLowerCase(), account: r.data.account });
  };
  const phrase = found ? `delete ${found.email}` : "";
  const remove = async () => {
    if (!found || confirm !== phrase) return;
    setBusy(true);
    const r = await call("POST", "/api/ops/account/delete", { email: found.email, confirm });
    setBusy(false);
    if (r.ok) { setFound(null); setConfirm(""); setMsg("That account and everything under it has been deleted, and the parent has been emailed."); }
    else setMsg(r.data.message ?? "It couldn't be deleted.");
  };
  const a = found?.account;
  return (
    <section class="card"><h2>Account lookup</h2>
      <form onSubmit={go}><input type="email" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} aria-label="Parent's email address" /> <button class="btn primary">Look up</button></form>
      <p class="small muted">Shows account facts only: never a child's name, answers or progress. Each lookup is written to the audit log.</p>
      {msg && <p role="status" data-testid="ops-msg">{msg}</p>}
      {a && <>
        <pre data-testid="ops-account" style="white-space:pre-wrap">{JSON.stringify(a, null, 2)}</pre>
        <div class="card" style="border:2px solid #b3261e;margin-top:12px" data-testid="ops-delete">
          <h3>Delete this account</h3>
          <p>This permanently deletes the parent's account, their learners' progress, their feedback and their subscription, and removes their sign-in. It can't be undone. Use it when they've asked and can't do it themselves in the Parents' area.</p>
          <label>To confirm, type <b>{phrase}</b><br /><input style="width:100%" value={confirm} onInput={(e) => setConfirm((e.target as HTMLInputElement).value)} autoComplete="off" spellcheck={false} data-testid="ops-delete-confirm" /></label>
          <p><button class="btn" style="border-color:#b3261e;color:#b3261e" disabled={busy || confirm !== phrase} onClick={remove} data-testid="ops-delete-go">Delete this account for good</button></p>
        </div>
      </>}
    </section>
  );
}

function Audit({ call }: { call: Call }) {
  const [items, setItems] = useState<{ at: string; actor: string; action: string; target: string }[] | null>(null);
  useEffect(() => { call<{ items: { at: string; actor: string; action: string; target: string }[] }>("GET", "/api/ops/audit").then((r) => setItems(r.ok ? r.data.items : [])); }, []);
  return (
    <section class="card"><h2>Audit log</h2>
      {!items ? <p>Loading…</p> : <table><tbody>{items.map((i, n) => <tr key={n}><td>{i.at.slice(0, 16).replace("T", " ")}</td><td>{i.actor}</td><td>{i.action}</td><td>{i.target}</td></tr>)}</tbody></table>}
    </section>
  );
}
