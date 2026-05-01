import "server-only";

import { headers } from "next/headers";

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * Project-scoped editor allowlist. Stub returning an empty array — the real
 * lookup will query Sanity once the editor allowlist schema lands. Until
 * then, only Admins can mutate project documents (and Admins do not need
 * this list).
 */
async function fetchEditableProjects(_email: string): Promise<string[]> {
  return [];
}
