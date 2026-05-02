/**
 * Pure helpers for the sidebar's persisted-preference logic. Lifted
 * out of the React provider so we can unit-test the storage parsing
 * and the breakpoint defaulting in isolation, without spinning up a
 * DOM or a React tree. The provider itself just composes these and
 * the matchMedia listener.
 */

export const SIDEBAR_STORAGE_KEY = "sidebar-open";

/**
 * Parse a localStorage value into a boolean preference, returning
 * `null` for "no stored preference" so the caller can fall back to the
 * breakpoint default. Anything other than the strings "true" / "false"
 * — including null, undefined, the empty string, legacy values — is
 * treated as "no preference" rather than throwing or coercing.
 */
export function parseStoredPreference(raw: string | null | undefined): boolean | null {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

/**
 * Resolve the initial `isOpen` value.
 *
 *  - If the user has a stored preference, that wins.
 *  - Otherwise, default to open on `lg`+ (≥1024px) and closed below.
 *
 * The caller is responsible for evaluating `matchMedia('(min-width:
 * 1024px)').matches` and passing it in; this keeps the helper pure.
 */
export function resolveInitialOpen({
  stored,
  isLargeViewport,
}: {
  stored: boolean | null;
  isLargeViewport: boolean;
}): boolean {
  if (stored !== null) return stored;
  return isLargeViewport;
}

/** Encode a boolean preference for localStorage. */
export function encodePreference(value: boolean): string {
  return value ? "true" : "false";
}
