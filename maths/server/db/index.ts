import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export { schema };

const MIGRATIONS = fileURLToPath(new URL("./migrations/", import.meta.url));

/** The real database, from DATABASE_URL (Replit sets this when Postgres is added). */
export async function connect(url = process.env.DATABASE_URL): Promise<Db> {
  if (!url) throw new Error("DATABASE_URL is not set.");
  const { default: pg } = await import("pg");
  // Replit's managed Postgres needs TLS; a local one usually does not.
  const ssl = /sslmode=disable|localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false };
  const pool = new pg.Pool({ connectionString: url, ssl, max: 8 });
  return drizzlePg(pool, { schema }) as unknown as Db;
}

/** An in-process Postgres (WASM) for tests and local development with no server. Not for production. */
export async function connectMemory(): Promise<Db> {
  const [{ PGlite }, { drizzle }] = await Promise.all([import("@electric-sql/pglite"), import("drizzle-orm/pglite")]);
  return drizzle(new PGlite(), { schema }) as unknown as Db;
}

/** Applies each migrations/*.sql once, in name order, and remembers which it has run. Safe to call on every start. */
export async function migrate(db: Db): Promise<string[]> {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set(((await db.execute(sql`SELECT name FROM schema_migrations`)) as unknown as { rows: { name: string }[] }).rows.map((r) => r.name));
  const ran: string[] = [];
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    const statements = readFileSync(MIGRATIONS + file, "utf8").split(/^--> split\s*$/m).map((s) => s.trim()).filter(Boolean);
    await db.transaction(async (tx) => {
      for (const statement of statements) await tx.execute(sql.raw(statement));
      await tx.execute(sql`INSERT INTO schema_migrations (name) VALUES (${file})`);
    });
    ran.push(file);
  }
  return ran;
}
