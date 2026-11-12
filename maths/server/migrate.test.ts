import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { connectMemory, migrate, type Db } from "./db";

let db: Db;
beforeAll(async () => { db = await connectMemory(); });

describe("migrations", () => {
  it("can run again over a database that already has the tables (Replit may create them first when publishing)", async () => {
    await migrate(db);
    await db.execute(sql`DELETE FROM schema_migrations`); // as if the tables exist but the app hasn't recorded the migrations
    const ran = await migrate(db);
    expect(ran.length).toBeGreaterThanOrEqual(4);
  });
});
