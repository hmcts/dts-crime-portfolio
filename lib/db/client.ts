// Intentionally not importing "server-only" here so the same client can
// be used by Node scripts (seed, migration runner) and the Next.js
// runtime. Server-only enforcement for the prompts surface lives on the
// callers (`lib/prompts/list.ts`, the API routes), which keep the
// "server-only" marker.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Lazy Drizzle client. We construct the postgres-js connection on first
 * use rather than at module import so that:
 *
 * 1. Local dev with `pnpm build` doesn't fail when DATABASE_URL is
 *    unset — Next.js evaluates server modules during build and an
 *    eager connection would error out.
 * 2. Tests can swap in a different connection string via env without
 *    fighting an already-initialised pool.
 *
 * The pool is a module-level singleton once created so callers share
 * connections.
 */
let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Local dev: `docker compose up -d` then " +
        "`export DATABASE_URL=postgres://crime:crime@localhost:5432/crime`. " +
        "CI: provided by the postgres service container. Render: provided " +
        "by the managed Postgres database.",
    );
  }
  return url;
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (_db) return _db;
  _client = postgres(databaseUrl(), {
    // Render's free Postgres requires SSL. Local dev does not. Toggle
    // automatically based on the connection string — we're permissive
    // on the local side and strict on remote.
    ssl: process.env.DATABASE_URL?.includes("localhost") ? false : "require",
    max: 10,
  });
  _db = drizzle(_client, { schema });
  return _db;
}

/**
 * Used by tests / scripts that want to release the pool. Production
 * code never calls this — the pool lives for the process lifetime.
 */
export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.end({ timeout: 5 });
    _client = null;
    _db = null;
  }
}

export { schema };
