import { asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "./db";
import { schema } from "./db";
import { cleanSignatureHtml } from "./signature-html";

/** The signatures the team can put under a reply. Always cleaned by cleanSignatureHtml before they are saved. See docs/OPS.md. */
export const MAX_SIGNATURES = 10;
export interface SignatureRow { id: string; name: string; html: string; isDefault: boolean; updatedAt: string }
const row = (r: typeof schema.opsSignatures.$inferSelect): SignatureRow => ({ id: r.id, name: r.name, html: r.html, isDefault: r.isDefault, updatedAt: r.updatedAt.toISOString() });
const isId = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

export async function listSignatures(db: Db): Promise<SignatureRow[]> {
  return (await db.select().from(schema.opsSignatures).orderBy(desc(schema.opsSignatures.isDefault), asc(schema.opsSignatures.name))).map(row);
}
export async function getSignature(db: Db, id: unknown): Promise<{ html: string; text: string } | null> {
  if (!isId(id)) return null;
  const [r] = await db.select().from(schema.opsSignatures).where(eq(schema.opsSignatures.id, id));
  return r ? { html: r.html, text: r.textVersion } : null;
}

export type SaveOutcome = { ok: true; id: string } | { ok: false; error: string };
/** Creates a signature, or replaces the one with `id`. */
export async function saveSignature(db: Db, actor: string, input: { id?: unknown; name?: unknown; html?: unknown; makeDefault?: unknown }): Promise<SaveOutcome> {
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 1 || name.length > 60) return { ok: false, error: "Give the signature a name (up to 60 characters)." };
  const clean = cleanSignatureHtml(typeof input.html === "string" ? input.html : "");
  if (!clean.ok) return clean;
  return db.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.opsSignatures);
    const existing = input.id !== undefined && input.id !== null;
    if (existing && !isId(input.id)) return { ok: false as const, error: "No such signature." };
    if (!existing && n >= MAX_SIGNATURES) return { ok: false as const, error: `You can keep up to ${MAX_SIGNATURES} signatures. Delete one first.` };
    const makeDefault = input.makeDefault === true || (!existing && n === 0);
    if (makeDefault) await tx.update(schema.opsSignatures).set({ isDefault: false });
    if (existing) {
      const out = await tx.update(schema.opsSignatures).set({ name, html: clean.html, textVersion: clean.text, updatedAt: new Date(), actor: actor.slice(0, 80), ...(makeDefault ? { isDefault: true } : {}) }).where(eq(schema.opsSignatures.id, input.id as string)).returning({ id: schema.opsSignatures.id });
      return out.length ? { ok: true as const, id: out[0].id } : { ok: false as const, error: "No such signature." };
    }
    const [created] = await tx.insert(schema.opsSignatures).values({ name, html: clean.html, textVersion: clean.text, isDefault: makeDefault, actor: actor.slice(0, 80) }).returning({ id: schema.opsSignatures.id });
    return { ok: true as const, id: created.id };
  });
}
/** Makes one signature the default, or (with null) none. */
export async function setDefaultSignature(db: Db, id: unknown): Promise<boolean> {
  if (id !== null && !isId(id)) return false;
  return db.transaction(async (tx) => {
    await tx.update(schema.opsSignatures).set({ isDefault: false });
    if (id === null) return true;
    return (await tx.update(schema.opsSignatures).set({ isDefault: true }).where(eq(schema.opsSignatures.id, id)).returning({ id: schema.opsSignatures.id })).length > 0;
  });
}
export async function deleteSignature(db: Db, id: unknown): Promise<boolean> {
  if (!isId(id)) return false;
  return (await db.delete(schema.opsSignatures).where(eq(schema.opsSignatures.id, id)).returning({ id: schema.opsSignatures.id })).length > 0;
}
