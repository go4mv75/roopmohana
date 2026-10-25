/** Applies SQL migrations in ./drizzle. Run during deploy if SKIP_AUTO_MIGRATE=1. */
import { createDb } from "../src/db/client";

createDb()
  .then(() => {
    console.log("Migrations applied.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
