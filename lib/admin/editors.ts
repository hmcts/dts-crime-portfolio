import "server-only";

import { desc } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { editorAllowlist } from "@/lib/db/schema";

/**
 * Public read shape for the editor allowlist surface. The page renders
 * this directly; the API GET /api/admin/editors returns the same shape
 * so the client component can swap server-rendered initial data for a
 * fresh fetch after a mutation.
 */
export interface EditorAllowlistEntry {
  id: string;
  email: string;
  projectId: string;
  grantedBy: string;
  grantedAt: string; // ISO
}

export async function listEditorAllowlist(): Promise<EditorAllowlistEntry[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(editorAllowlist)
    .orderBy(desc(editorAllowlist.grantedAt));
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    projectId: row.projectId,
    grantedBy: row.grantedBy,
    grantedAt: row.grantedAt.toISOString(),
  }));
}
