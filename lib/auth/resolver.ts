import "server-only";

import { headers } from "next/headers";

import { getSanityClient } from "@/lib/sanity/client";

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

const EDITOR_ACCESS_QUERY = /* groq */ `
  *[_type == "editorAccess" && email == $email][0].projects[]._ref
`;

/**
 * Project-scoped editor allowlist. Queries the `editorAccess` Sanity
 * document for the calling email and returns the list of project IDs they
 * can mutate. No caching — this runs once per resolver call (i.e. once per
 * request).
 *
 * Spec: openspec/specs/access-control/spec.md (Three-role model, Editor on
 * a specific project).
 */
export async function fetchEditableProjects(email: string): Promise<string[]> {
  const client = getSanityClient();
  const refs = await client.fetch<string[] | null>(EDITOR_ACCESS_QUERY, { email });
  if (!Array.isArray(refs)) return [];
  return refs.filter((value): value is string => typeof value === "string");
}
