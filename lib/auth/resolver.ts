import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { getDb } from "@/lib/db/client";
import { editorAllowlist } from "@/lib/db/schema";

export type UserContext =
  | { kind: "unauthorized"; reason: UnauthorizedReason }
  | {
      kind: "authorized";
      email: string;
      isAdmin: boolean;
      editableProjects: string[];
    };

export type UnauthorizedReason = "missing-header" | "invalid-email";

/**
 * Resolve the calling user from the `x-user-email` header injected by the
 * upstream auth proxy (production) or the preview-auth middleware
 * (non-production). Every API route's first executable line should be a
 * call to this resolver — see CLAUDE.md.
 *
 * Spec: openspec/specs/access-control/spec.md.
 */
export async function resolveUser(): Promise<UserContext> {
  const requestHeaders = await headers();
  const rawHeader = requestHeaders.get("x-user-email");

  if (!rawHeader) {
    return { kind: "unauthorized", reason: "missing-header" };
  }

  const email = rawHeader.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { kind: "unauthorized", reason: "invalid-email" };
  }

  const isAdmin = isInAdminAllowlist(email);
  const editableProjects = isAdmin ? [] : await fetchEditableProjects(email);

  return { kind: "authorized", email, isAdmin, editableProjects };
}

// Non-ambiguous email shape. The previous form `^[^\s@]+@[^\s@]+\.[^\s@]+$`
// allowed `.` inside the second `[^\s@]+`, which made the split between the
// second and third segments ambiguous and produced polynomial backtracking
// on inputs like `!@!.!.!.` (CodeQL js/redos). Excluding `.` from the
// per-label segments makes each label greedy-consume up to the next `.`
// with no overlap; the regex is linear-time. Same accept/reject semantics
// for real emails. The submission validator at `lib/submission/validator.ts`
// uses the same pattern — keep them in sync.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

/**
 * Admin allowlist sourced from the `ADMIN_ALLOWLIST` env var: comma- or
 * whitespace-separated emails. Lower-cased for comparison.
 */
export function isInAdminAllowlist(email: string): boolean {
  const raw = process.env.ADMIN_ALLOWLIST ?? "";
  const allowlist = raw
    .split(/[\s,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email);
}

/**
 * Project-scoped editor allowlist. Reads the `editor_allowlist` Postgres
 * table for the calling email and returns the list of project IDs they
 * can mutate. The earlier model queried a Sanity `editorAccess` document
 * via GROQ; the table swap is invisible to callers — same return shape,
 * same ordering guarantees (none — callers don't depend on order).
 *
 * Spec: openspec/specs/access-control/spec.md (Three-role model, Editor
 * on a specific project) and decisions/2026-05-03-editor-allowlist-claude-design-brief.md.
 */
export async function fetchEditableProjects(email: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ projectId: editorAllowlist.projectId })
    .from(editorAllowlist)
    .where(eq(editorAllowlist.email, email));
  return rows.map((row) => row.projectId);
}
