import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Standalone migration runner. Applies every pending migration in
 * `drizzle/migrations/` against `DATABASE_URL`, then exits. Used by:
 *
 * - `pnpm db:migrate` (local dev)
 * - The `seed-demo` GitHub Action (preview migration before seed)
 * - Render's pre-deploy hook (production migration before traffic)
 *
 * Migrations are idempotent — running twice is a no-op for already-
 * applied versions, so the runner is safe to invoke from multiple
 * places.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL must be set to run migrations.");
    process.exit(1);
  }

  const sql = postgres(url, {
    ssl: url.includes("localhost") ? false : "require",
    max: 1,
  });
  const db = drizzle(sql);

  console.log("Applying migrations from drizzle/migrations …");
  await migrate(db, { migrationsFolder: "drizzle/migrations" });
  console.log("Migrations applied.");
  await sql.end({ timeout: 5 });
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
