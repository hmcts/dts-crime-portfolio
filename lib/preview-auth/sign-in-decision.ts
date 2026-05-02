import { isValidEmail } from "@/lib/auth/resolver";

import { isAllowedPreviewAuthDomain } from "./email-domain";

/**
 * Pure decision function for the preview-auth sign-in server action.
 * Given the raw form payload (already-string-coerced), returns a tagged
 * outcome describing what the action should do. Keeping this pure makes
 * it directly unit-testable without spinning up a Next.js request.
 *
 * Spec: openspec/changes/add-preview-auth/specs/preview-auth/spec.md
 * (Email-entry page; Domain restriction on the sign-in surface).
 */
export type SignInDecision =
  | { kind: "accept"; email: string; next: string }
  | { kind: "reject-format"; rawEmail: string; next: string }
  | { kind: "reject-domain"; rawEmail: string; next: string };

export function decideSignInAction(input: {
  rawEmailField: unknown;
  rawNextField: unknown;
}): SignInDecision {
  const rawEmail = String(input.rawEmailField ?? "").trim();
  const next = sanitiseNext(String(input.rawNextField ?? "/"));
  if (!isValidEmail(rawEmail)) {
    return { kind: "reject-format", rawEmail, next };
  }
  if (!isAllowedPreviewAuthDomain(rawEmail)) {
    return { kind: "reject-domain", rawEmail, next };
  }
  return { kind: "accept", email: rawEmail.toLowerCase(), next };
}

export function sanitiseNext(value: string): string {
  // Only allow same-origin paths; never honour a fully qualified URL.
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}
