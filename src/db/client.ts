import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzlePg<typeof schema>>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/**
 * DATABASE_URL set  -> real Postgres (Neon, Supabase, RDS, local docker...).
 * DATABASE_URL unset -> embedded PGlite in ./.data (local development only).
 *
 * Migrations are applied on first connection so a fresh deploy just works.
 */
export async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const max = Number(process.env.DATABASE_POOL_SIZE ?? 5);
    const client = postgres(url, { max, prepare: false });
    const db = drizzlePg(client, { schema });
    if (process.env.SKIP_AUTO_MIGRATE !== "1") {
      await migratePg(db, { migrationsFolder: MIGRATIONS });
    }
    return db;
  }

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_EMBEDDED_DB !== "1") {
    throw new Error("DATABASE_URL is required in production.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { mkdirSync } = await import("node:fs");
  const dir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  // Both drivers expose the same query builder surface for our usage.
  return db as unknown as Db;
}
