import type { AuthProvider } from "./auth";
import type { Db } from "./db";
import type { Repo } from "./db/repo";
import type { Gateway } from "./billing";
import type { Mailer } from "./mail";
import { OpsAccess, actorOf } from "./ops-access";
import { EMAIL, addContactReply, contactForReply, contactList, deleteContact, startConversation } from "./contact";
import type { Counters } from "./counters";
import { cleanSignatureHtml } from "./signature-html";
import { MAX_SIGNATURES, deleteSignature, getSignature, listSignatures, saveSignature, setDefaultSignature } from "./signatures";
import { accountByClerkId, addReply, audit, auditLog, feedbackById, feedbackList, stats } from "./ops";

/**
 * The team's ops page API (/api/ops/...). Every route needs the parent sign-in AND the allow-list AND the emailed code (see ops-access.ts).
 * Anyone else gets the same plain "not found", so the page doesn't announce itself. Every view and every reply is written to the audit log.
 */
export interface OpsDeps { /** limits on what one admin can do per hour */ counters?: Counters; /** whether email to hello@ is being received (the Resend webhook is set up) */ inboundOn?: boolean; db: Db; auth: AuthProvider; mailer: Mailer; access: OpsAccess; appUrl?: string; repo?: Repo; billing?: Gateway }
export interface OpsRequest { method: string; path: string; query: URLSearchParams; token: string | null; session?: string; body?: unknown }
export interface OpsResponse { status: number; body: unknown }

export const isOpsRoute = (path: string) => path.startsWith("/api/ops/");
const NOT_FOUND: OpsResponse = { status: 404, body: { error: "not-found" } };
const ok = (body: unknown): OpsResponse => ({ status: 200, body });
const TOO_MANY: OpsResponse = { status: 429, body: { error: "slow-down", message: "That's a lot in a short time. Please wait a little." } };
/** Counts one action by this admin and says whether they're still within the hourly limit (no limit when there's nowhere to count). */
async function withinLimit(d: OpsDeps, userId: string, what: string, perHour: number): Promise<boolean> {
  return !d.counters || (await d.counters.hit(`ops:${what}:${userId}`, 3_600_000)) <= perHour;
}
const bad = (message: string): OpsResponse => ({ status: 400, body: { error: "bad-request", message } });

export async function handleOpsApi(req: OpsRequest, d: OpsDeps): Promise<OpsResponse> {
  const who = await d.auth.authenticate(req.token);
  if (!who) return NOT_FOUND;
  const actor = actorOf(who.userId);
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (req.path === "/api/ops/code" && req.method === "POST") {
    const out = await d.access.sendCode(who.userId);
    if (out === "not-admin") { await audit(d.db, actor, "denied", "code"); return NOT_FOUND; }
    if (out === "too-soon") return { status: 429, body: { error: "too-soon", message: "Please wait a moment before asking for another code." } };
    if (out === "mail-failed") return { status: 502, body: { error: "mail-failed", message: `The code email couldn't be sent (${d.access.lastMailError || "no reason given"}). The sending address may not be verified in Resend yet: see docs/OPS.md.` } };
    await audit(d.db, actor, "code-sent", "-");
    return ok({ sent: true });
  }
  if (req.path === "/api/ops/verify" && req.method === "POST") {
    if (!(await d.access.isAdmin(who.userId))) return NOT_FOUND;
    const out = d.access.verify(who.userId, typeof body.code === "string" ? body.code : "");
    if (!out.ok) {
      await audit(d.db, actor, "sign-in-failed", out.reason);
      return { status: 401, body: { error: out.reason, message: out.reason === "locked" ? "Too many tries. Ask for a new code." : out.reason === "no-code" ? "That code has expired. Ask for a new one." : "That isn't the right code." } };
    }
    await audit(d.db, actor, "sign-in", "-");
    return ok({ session: out.session, expiresAt: out.expiresAt });
  }

  // everything below needs the full proof
  if (!(await d.access.sessionOk(who.userId, req.session))) return NOT_FOUND;

  if (req.path === "/api/ops/stats" && req.method === "GET") return ok(await stats(d.db));

  if (req.path === "/api/ops/feedback" && req.method === "GET") {
    const days = Number(req.query.get("days")) || undefined;
    const rows = await feedbackList(d.db, { days, category: req.query.get("category") || undefined, replyable: req.query.get("replyable") === "1", limit: 200 });
    const unreplied = req.query.get("unreplied") === "1";
    await audit(d.db, actor, "feedback-view", "-");
    return ok({ items: rows.filter((r) => !unreplied || (r.mayReply && !r.replies.length)).map(({ clerkUserId: _omit, ...r }) => r) });
  }

  if (req.path === "/api/ops/feedback/reply" && req.method === "POST") {
    const id = typeof body.id === "string" ? body.id : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (message.length < 5 || message.length > 4000) return bad("Write a reply between 5 and 4000 characters.");
    const fb = await feedbackById(d.db, id);
    if (!fb) return NOT_FOUND;
    if (!fb.mayReply) return bad("This parent didn't tick “you may reply”, so there's no reply to send.");
    const to = await d.auth.emailOf?.(fb.clerkUserId);
    if (!to) return { status: 409, body: { error: "no-address", message: "There's no email address for this parent any more." } };
    const quoted = fb.message.split("\n").map((l) => `> ${l}`).join("\n");
    const html = `<p style="font:16px/1.5 system-ui,sans-serif;white-space:pre-wrap">${esc(message)}</p><blockquote style="margin:16px 0;padding:8px 14px;border-left:3px solid #ddd;color:#555;font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap">${esc(fb.message)}</blockquote><p style="font:13px system-ui,sans-serif;color:#666">You're getting this because you said we could reply to your feedback on quarter. Just reply to this email if you'd like to say more.</p>`;
    const sent = await d.mailer.send({ to, subject: "Re: your feedback on quarter", text: `${message}\n\n---\nYour feedback:\n${quoted}\n\nYou're getting this because you said we could reply to your feedback on quarter. Just reply to this email if you'd like to say more.`, html });
    if (!sent.ok) return { status: 502, body: { error: "mail-failed", message: "The reply couldn't be sent. Nothing was recorded; try again." } };
    await addReply(d.db, fb.id, actor, message);
    await audit(d.db, actor, "feedback-reply", fb.id);
    return ok({ sent: true });
  }

  // Conversations with parents: the Message us form and email to hello@. A reply goes to the address on the conversation.
  if (req.path === "/api/ops/contact" && req.method === "GET") {
    await audit(d.db, actor, "contact-view", "-");
    return ok({ items: await contactList(d.db, { waiting: req.query.get("waiting") === "1" }), inbound: !!d.inboundOn, signatures: (await listSignatures(d.db)).map(({ id, name, isDefault }) => ({ id, name, isDefault })) });
  }
  if (req.path === "/api/ops/contact/reply" && req.method === "POST") {
    if (!(await withinLimit(d, who.userId, "reply", 60))) return TOO_MANY;
    const id = typeof body.id === "string" ? body.id : "";
    const message = typeof body.message === "string" ? body.message.replace(/\r\n/g, "\n").trim() : "";
    if (message.length < 2 || message.length > 6000) return bad("Write a reply between 2 and 6000 characters.");
    const c = await contactForReply(d.db, id);
    if (!c) return NOT_FOUND;
    let sig: { html: string; text: string } | null = null;
    if (body.signatureId !== undefined && body.signatureId !== null && body.signatureId !== "") {
      sig = await getSignature(d.db, body.signatureId);
      if (!sig) return bad("That signature no longer exists.");
    }
    const subject = `Re: ${(c.subject ?? "your message to quarter").replace(/^(re:\s*)+/i, "").replace(/[\r\n]+/g, " ").slice(0, 200)}`;
    const quoted = c.lastMessage.split("\n").map((l) => `> ${l}`).join("\n");
    const note = "You're getting this because you got in touch with quarter. Just reply to this email if you'd like to say more.";
    const html = `<div style="font:16px/1.5 system-ui,sans-serif;white-space:pre-wrap">${esc(message)}</div>${sig ? `<div style="margin-top:16px">${sig.html}</div>` : ""}<blockquote style="margin:16px 0;padding:8px 14px;border-left:3px solid #ddd;color:#555;font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap">${esc(c.lastMessage)}</blockquote><p style="font:13px system-ui,sans-serif;color:#666">${esc(note)}</p>`;
    const text = `${message}${sig ? `\n\n${sig.text}` : ""}\n\n---\nYou wrote:\n${quoted}\n\n${note}`;
    const threadHeaders = c.lastMessageId && /^<[^<>\s]{3,300}>$/.test(c.lastMessageId) ? { "In-Reply-To": c.lastMessageId, References: c.lastMessageId } : undefined;
    const sent = await d.mailer.send({ to: c.email, subject, text, html, headers: threadHeaders });
    if (!sent.ok) return { status: 502, body: { error: "mail-failed", message: "The reply couldn't be sent. Nothing was recorded; try again." } };
    await addContactReply(d.db, c.id, actor, message);
    await audit(d.db, actor, "contact-reply", c.id);
    return ok({ sent: true });
  }
  // A new email from the team to one person (not a reply). One address only, never our own domain, rate limited, audit-logged without the address.
  if (req.path === "/api/ops/contact/new" && req.method === "POST") {
    if (!(await withinLimit(d, who.userId, "newmail", 30))) return TOO_MANY;
    const to = typeof body.to === "string" ? body.to.trim().toLowerCase() : "";
    const subject = typeof body.subject === "string" ? body.subject.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim() : "";
    const message = typeof body.message === "string" ? body.message.replace(/\r\n/g, "\n").trim() : "";
    if (to.length > 254 || !EMAIL.test(to)) return bad("Enter one email address to send to.");
    if (/@(?:[a-z0-9-]+\.)*yourquarter\.co\.uk$/.test(to)) return bad("That's one of our own addresses. Write to someone outside quarter.");
    if (subject.length < 2 || subject.length > 150) return bad("Give it a subject of 2 to 150 characters.");
    if (message.length < 2 || message.length > 6000) return bad("Write a message of 2 to 6000 characters.");
    let sig: { html: string; text: string } | null = null;
    if (body.signatureId !== undefined && body.signatureId !== null && body.signatureId !== "") {
      sig = await getSignature(d.db, body.signatureId);
      if (!sig) return bad("That signature no longer exists.");
    }
    const html = `<div style="font:16px/1.5 system-ui,sans-serif;white-space:pre-wrap">${esc(message)}</div>${sig ? `<div style="margin-top:16px">${sig.html}</div>` : ""}`;
    const sent = await d.mailer.send({ to, subject, text: `${message}${sig ? `\n\n${sig.text}` : ""}`, html });
    if (!sent.ok) return { status: 502, body: { error: "mail-failed", message: "The email couldn't be sent. Nothing was recorded; try again." } };
    const id = await startConversation(d.db, { to, subject, text: message });
    await audit(d.db, actor, "contact-new", id);
    return ok({ sent: true, id });
  }
  if (req.path === "/api/ops/contact/delete" && req.method === "POST") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!(await deleteContact(d.db, id))) return NOT_FOUND;
    await audit(d.db, actor, "contact-delete", id);
    return ok({ deleted: true });
  }

  // Signatures for replies. HTML is cleaned on the server (signature-html.ts); the preview endpoint shows exactly what would be saved and sent.
  if (req.path === "/api/ops/signatures" && req.method === "GET") return ok({ items: await listSignatures(d.db), max: MAX_SIGNATURES });
  if (req.path === "/api/ops/signatures/preview" && req.method === "POST") {
    if (!(await withinLimit(d, who.userId, "sigpreview", 300))) return TOO_MANY;
    const clean = cleanSignatureHtml(typeof body.html === "string" ? body.html : "");
    return clean.ok ? ok({ html: clean.html, text: clean.text }) : bad(clean.error);
  }
  if (req.path === "/api/ops/signatures" && req.method === "POST") {
    if (!(await withinLimit(d, who.userId, "sigwrite", 60))) return TOO_MANY;
    const out = await saveSignature(d.db, actor, body);
    if (!out.ok) return bad(out.error);
    await audit(d.db, actor, body.id ? "signature-edit" : "signature-add", out.id);
    return ok({ id: out.id });
  }
  if (req.path === "/api/ops/signatures/default" && req.method === "POST") {
    if (!(await withinLimit(d, who.userId, "sigwrite", 60))) return TOO_MANY;
    if (!(await setDefaultSignature(d.db, body.id ?? null))) return NOT_FOUND;
    await audit(d.db, actor, "signature-default", typeof body.id === "string" ? body.id : "none");
    return ok({ done: true });
  }
  if (req.path === "/api/ops/signatures/delete" && req.method === "POST") {
    if (!(await withinLimit(d, who.userId, "sigwrite", 60))) return TOO_MANY;
    if (!(await deleteSignature(d.db, body.id))) return NOT_FOUND;
    await audit(d.db, actor, "signature-delete", String(body.id));
    return ok({ deleted: true });
  }

  if (req.path === "/api/ops/account" && req.method === "GET") {
    const email = (req.query.get("email") ?? "").trim().toLowerCase();
    if (!/^[^\s@]{1,64}@[^\s@]{1,255}$/.test(email)) return bad("Enter an email address.");
    const id = await d.auth.idByEmail?.(email);
    const account = id ? await accountByClerkId(d.db, id) : null;
    await audit(d.db, actor, "account", account?.parentId ?? "not-found");
    return ok({ account });
  }

  // Deleting an account for someone who can't sign in to do it themselves. The same steps as the parent's own button: cancel the subscription
  // first (and stop if that fails, so nobody is billed for something deleted), then the data, then the sign-in identity. Typed confirmation, audit-logged.
  if (req.path === "/api/ops/account/delete" && req.method === "POST") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]{1,64}@[^\s@]{1,255}$/.test(email)) return bad("Enter the parent's email address.");
    if (body.confirm !== `delete ${email}`) return bad(`To confirm, type exactly: delete ${email}`);
    if (!d.repo) return { status: 503, body: { error: "unavailable", message: "Deleting isn't available on this server." } };
    const id = await d.auth.idByEmail?.(email);
    const account = id ? await accountByClerkId(d.db, id) : null;
    if (!id || !account) { await audit(d.db, actor, "account-delete-miss", "not-found"); return { status: 404, body: { error: "not-found", message: "No quarter account for that address." } }; }
    const stripeId = account.subscription?.stripeCustomerId;
    if (stripeId && d.billing) {
      try { await d.billing.deleteCustomer(stripeId); } catch { return { status: 502, body: { error: "billing-error", message: "The subscription couldn't be cancelled, so nothing was deleted. Try again." } }; }
    }
    await audit(d.db, actor, "account-delete", account.parentId);   // written first: the record has to outlive the account
    await d.repo.deleteParent(account.parentId);
    await d.auth.deleteUser?.(id).catch(() => undefined);
    // best effort: tell them it has been done
    await d.mailer.send({ to: email, subject: "Your quarter account has been deleted", text: "As you asked, your quarter account and everything saved under it has been deleted. If you didn't ask for this, please reply to this email straight away.\n\nquarter", html: "<p style=\"font:16px/1.5 system-ui,sans-serif\">As you asked, your quarter account and everything saved under it has been deleted.</p><p style=\"font:14px/1.5 system-ui,sans-serif;color:#555\">If you didn't ask for this, please reply to this email straight away.</p>" }).catch(() => undefined);
    return ok({ deleted: true });
  }

  if (req.path === "/api/ops/audit" && req.method === "GET") return ok({ items: await auditLog(d.db, 100) });

  return NOT_FOUND;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
