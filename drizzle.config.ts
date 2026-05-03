import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config. Migrations live in `drizzle/migrations/` and are
 * checked into git so they're applied identically in CI, on Render, and
 * locally. `pnpm db:generate` writes new migration SQL after a schema
 * change; `pnpm db:migrate` applies pending migrations against the
 * current `DATABASE_URL`.
 */
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://crime:crime@localhost:5432/crime",
  },
  verbose: true,
  strict: true,
});
