import "server-only";
import * as schema from "./schema";
import { createDb, type Db } from "./client";

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { __rmDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__rmDb ??= createDb();
  return globalForDb.__rmDb;
}

export { schema };
