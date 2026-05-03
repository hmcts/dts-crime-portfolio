/**
 * Seed the Postgres editor allowlist with a small set of demo
 * (email, projectId) mappings. Used by:
 *
 * - Local dev: `pnpm seed:editors` after `docker compose up -d` and
 *   `pnpm db:migrate`.
 * - GitHub Actions `seed-demo` workflow: runs after the Sanity seed
 *   so the preview environment's `/admin/editors` surface has rows
 *   to display when an admin first lands on it.
 *
 * Idempotent: the script wipes the table and re-inserts a fixed set
 * of rows. Deterministic ids would also work; the wipe keeps the
 * seed authoritative and prevents drift.
 *
 * Spec: openspec/specs/access-control/spec.md (Editor on a specific
 * project) and decisions/2026-05-03-editor-allowlist-claude-design-brief.md.
 */

import { createHash } from "node:crypto";

import { closeDb, getDb } from "@/lib/db/client";
import { editorAllowlist } from "@/lib/db/schema";

interface SeedEntry {
  email: string;
  projectId: string;
  daysAgo: number;
}

// Editors are a small set of fictional staff (mirroring the prompts
// commenter pool so the demo is self-consistent). Project IDs match
// the `demo-project-…` ids minted by `scripts/seed-demo.ts`.
const SEEDS: SeedEntry[] = [
  { email: "alice.owner1@hmcts.net", projectId: "demo-project-bundle-triage", daysAgo: 12 },
  { email: "alice.owner1@hmcts.net", projectId: "demo-project-jury-notice", daysAgo: 5 },
  { email: "cara.lead2@justice.gov.uk", projectId: "demo-project-bundle-triage", daysAgo: 8 },
  { email: "cara.lead2@justice.gov.uk", projectId: "demo-project-cracked-trial", daysAgo: 30 },
  { email: "fern.product3@hmcts.net", projectId: "demo-project-listings-forecast", daysAgo: 15 },
  { email: "harry.risk5@hmcts.net", projectId: "demo-project-listings-forecast", daysAgo: 2 },
  { email: "gita.portfolio4@justice.gov.uk", projectId: "demo-project-disclosure-routing", daysAgo: 20 },
  { email: "yvonne.lynn2@justice.gov.uk", projectId: "demo-project-witness-anomalies", daysAgo: 60 },
];

// The "granted by" admin is a stable demo email; in production this is
// the resolver-supplied caller. For seed data we use a single fixture
// admin so the audit trail looks coherent.
const SEED_GRANTED_BY = "demo-admin@hmcts.net";

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

function daysAgoIso(daysAgoCount: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgoCount);
  d.setUTCHours(9, 0, 0, 0);
  return d;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL must be set. Local: docker compose up -d && export " +
        "DATABASE_URL=postgres://crime:crime@localhost:5432/crime",
    );
    process.exit(1);
  }
  const db = getDb();

  console.log(`Wiping editor_allowlist and reseeding ${SEEDS.length} rows…`);
  await db.delete(editorAllowlist);

  for (const seed of SEEDS) {
    const id = hashId(`editor:${seed.email}:${seed.projectId}`);
    await db.insert(editorAllowlist).values({
      id,
      email: seed.email,
      projectId: seed.projectId,
      grantedBy: SEED_GRANTED_BY,
      grantedAt: daysAgoIso(seed.daysAgo),
    });
    console.log(`  ✓ ${seed.email} → ${seed.projectId}`);
  }

  console.log("Done.");
  await closeDb();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await closeDb();
  process.exit(1);
});
