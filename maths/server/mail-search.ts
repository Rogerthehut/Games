import { asc, desc, inArray } from "drizzle-orm";
import type { Db } from "./db";
import { schema } from "./db";
import { refOf } from "./ticket";
import type { Folder, MailItem } from "./mailbox";

/**
 * Search across every folder of the ops mailbox, forgiving of typing mistakes: not case or accent sensitive, finds the start of a word,
 * part of a word, and words with a letter wrong, missing, extra or swapped ("recieve" finds "receive", "Jhon" finds "John"). Every word you
 * type has to be found somewhere in the message (names and addresses, subject, the text of the whole thread, the reference number), and
 * results are ranked by where the words were found. It works on the mailbox in memory, which is plenty for the size of a support inbox.
 */
export const normalise = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (s: string) => normalise(s).match(/[a-z0-9]+/g) ?? [];

/** Edit distance where swapping two neighbouring letters counts as one change; gives up (returns max + 1) once it can't come in under max. */
export function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = [], prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  let before = prev2, row = prev;
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(row[j] + 1, cur[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, before[j - 2] + 1);
      cur[j] = d; if (d < best) best = d;
    }
    if (best > max) return max + 1;
    before = row; row = cur;
  }
  return row[b.length];
}

/** How well one typed word matches some text: 1 exact word, .85 the start of a word, .7 inside a word, then lower for a word that is a typo away. 0 if it doesn't. */
export function wordScore(q: string, tokens: string[], norm: string): { score: number; match: string | null } {
  if (tokens.includes(q)) return { score: 1, match: q };
  let best: { score: number; match: string | null } = { score: 0, match: null };
  const consider = (score: number, match: string) => { if (score > best.score) best = { score, match }; };
  if (q.length >= 2) { const t = tokens.find((x) => x.startsWith(q)); if (t) consider(0.85, t); }
  if (q.length >= 3 && norm.includes(q)) consider(0.7, tokens.find((x) => x.includes(q)) ?? q);
  if (q.length >= 4) {
    const max = q.length >= 8 ? 2 : 1;
    for (const t of tokens) {
      if (Math.abs(t.length - q.length) <= max) { const d = distance(q, t, max); if (d <= max) consider(0.6 - 0.1 * d, t); }
      if (t.length > q.length) { const d = distance(q, t.slice(0, q.length), max); if (d <= max) consider(0.45 - 0.05 * d, t); } // typed so far, with a slip
    }
  }
  return best;
}

export interface SearchDoc extends MailItem { folder: Folder; ref: string | null; fields: { ref: string; who: string; subject: string; body: string } }
export interface SearchHit extends MailItem { folder: Folder; snippet: string; marks: string[]; score: number }
const WEIGHT = { ref: 10, who: 6, subject: 5, body: 3 } as const;

export function searchDocs(docs: SearchDoc[], query: string, limit = 60): SearchHit[] {
  const q = normalise(query.slice(0, 80)).trim();
  const refQuery = /^([qf])-?(\d{3,9})$/.exec(q);
  const terms = refQuery ? [refQuery[2]] : [...new Set(words(q).filter((w) => w.length >= 2))].slice(0, 8);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  for (const d of docs) {
    const ready = (Object.keys(d.fields) as (keyof typeof d.fields)[]).map((k) => ({ k, tokens: words(d.fields[k]), norm: normalise(d.fields[k]) }));
    let total = 0; const marks: string[] = []; let bodyMatch: string | null = null; let ok = true;
    for (const t of terms) {
      let best = 0, match: string | null = null, where: keyof typeof WEIGHT = "body";
      for (const f of ready) {
        if (refQuery && f.k !== "ref") continue;
        const r = wordScore(t, f.tokens, f.norm), v = ((refQuery || /^\d+$/.test(t)) && r.score < 0.85 ? 0 : r.score) * WEIGHT[f.k]; // ticket numbers never match "nearly"
        if (v > best) { best = v; match = r.match; where = f.k; }
      }
      if (refQuery && d.ref && refQuery[1] !== d.ref[0].toLowerCase()) best = 0; // Q-1042 is not F-1042
      if (best <= 0) { ok = false; break; }
      total += best; if (match) { marks.push(match); if (where === "body") bodyMatch = match; }
    }
    if (!ok) continue;
    const body = d.fields.body, at = bodyMatch ? normalise(body).indexOf(bodyMatch) : -1;
    const snippet = at >= 0 ? `${at > 50 ? "…" : ""}${body.slice(Math.max(0, at - 50), at + 110).replace(/\s+/g, " ").trim()}${body.length > at + 110 ? "…" : ""}` : d.preview;
    const { fields: _f, ...item } = d;
    hits.push({ ...item, snippet, marks: [...new Set(marks)].slice(0, 8), score: Math.round(total * 100) / 100 });
  }
  return hits.sort((a, b) => b.score - a.score || b.at.localeCompare(a.at)).slice(0, limit);
}

const snip = (t: string, n = 140) => t.replace(/\s+/g, " ").trim().slice(0, n);
/** Every message, feedback, draft and queued email in the mailbox as something searchable, each filed under the one folder it mainly lives in. */
export async function buildCorpus(db: Db): Promise<SearchDoc[]> {
  const docs: SearchDoc[] = [];
  const rows = await db.select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.updatedAt)).limit(1500);
  const ids = rows.map((r) => r.id);
  const replies = ids.length ? await db.select().from(schema.contactReplies).where(inArray(schema.contactReplies.contactId, ids)).orderBy(asc(schema.contactReplies.at)) : [];
  for (const r of rows) {
    const thread = replies.filter((x) => x.contactId === r.id), ref = refOf("contact", r.ticket);
    const folder: Folder = r.deletedAt ? "trash" : r.source === "form" ? "messages" : r.source === "email" || thread.some((x) => x.direction === "in") ? "inbox" : "sent";
    const body = [r.message, ...thread.map((x) => x.message)].join("\n").slice(0, 20_000), last = thread[thread.length - 1];
    docs.push({ kind: "contact", id: r.id, ref, who: r.name || r.email, subject: r.subject || r.topic, preview: snip(last ? last.message : r.message), at: r.updatedAt.toISOString(), unread: r.unread, pinned: r.pinned, flagged: r.flagged, direction: last ? (last.direction === "in" ? "in" : "out") : r.source === "sent" ? "out" : "in", folder,
      fields: { ref: ref ?? "", who: `${r.name ?? ""} ${r.email} ${thread.map((x) => x.fromEmail ?? "").join(" ")}`, subject: r.subject ?? r.topic, body } });
  }
  const fb = await db.select().from(schema.feedback).orderBy(desc(schema.feedback.createdAt)).limit(500);
  const fids = fb.map((r) => r.id);
  const freplies = fids.length ? await db.select().from(schema.feedbackReplies).where(inArray(schema.feedbackReplies.feedbackId, fids)) : [];
  for (const r of fb) {
    const ref = refOf("feedback", r.ticket), body = [r.message, ...freplies.filter((x) => x.feedbackId === r.id).map((x) => x.message)].join("\n").slice(0, 20_000);
    docs.push({ kind: "feedback", id: r.id, ref, who: "Signed-in parent", subject: `${r.category}${r.context ? ` ${r.context}` : ""}`, preview: snip(r.message), at: r.createdAt.toISOString(), unread: r.unread, pinned: r.pinned, flagged: r.flagged, direction: "in", folder: r.deletedAt ? "trash" : "feedback",
      fields: { ref: ref ?? "", who: "signed-in parent", subject: `${r.category} ${r.context ?? ""}`, body } });
  }
  for (const d of await db.select().from(schema.opsDrafts).orderBy(desc(schema.opsDrafts.updatedAt)).limit(100))
    docs.push({ kind: "draft", id: d.id, ref: null, who: d.toEmail ? `To ${d.toEmail}` : "Draft", subject: d.subject || "(no subject)", preview: snip(d.body), at: d.updatedAt.toISOString(), unread: false, direction: null, draftKind: d.kind, conversationId: d.conversationId, folder: "drafts", fields: { ref: "", who: d.toEmail ?? "", subject: d.subject ?? "", body: d.body } });
  for (const o of await db.select().from(schema.opsOutbox).orderBy(desc(schema.opsOutbox.createdAt)).limit(100))
    docs.push({ kind: "outbox", id: o.id, ref: refOf("contact", o.ticket), who: `To ${o.toEmail}`, subject: o.subject, preview: snip(o.body), at: o.createdAt.toISOString(), unread: false, direction: "out", status: o.status, folder: "outbox", fields: { ref: refOf("contact", o.ticket) ?? "", who: o.toEmail, subject: o.subject, body: o.body } });
  return docs;
}
export async function searchMail(db: Db, query: string): Promise<SearchHit[]> { return searchDocs(await buildCorpus(db), query); }
