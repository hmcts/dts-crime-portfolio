import "server-only";

/**
 * Server-side stable user identification for analytics.
 *
 * Spec: openspec/specs/analytics/spec.md (User identification by stable
 * hash). The portal SHALL identify the user to PostHog with
 * `userId = sha256(email + serverPepper)`. The raw email SHALL NEVER be
 * sent to PostHog or to any browser bundle.
 *
 * The pepper is read from `ANALYTICS_USER_ID_PEPPER` (32+ hex chars).
 * Hashing happens server-side; the client receives the pre-hashed
 * `userId` via the page's initial render.
 */

const PEPPER_ENV_VAR = "ANALYTICS_USER_ID_PEPPER";

export class AnalyticsPepperMissingError extends Error {
  constructor() {
    super(
      `${PEPPER_ENV_VAR} must be set (32+ hex chars) to compute a stable analytics userId`,
    );
    this.name = "AnalyticsPepperMissingError";
  }
}

function readPepper(): string {
  const raw = process.env[PEPPER_ENV_VAR];
  if (!raw || raw.length < 32) throw new AnalyticsPepperMissingError();
  return raw;
}

/**
 * Compute the stable analytics userId for an email. Lower-cases the
 * email first so casing differences don't fork the identity.
 *
 * @param email Lower-cased email of the resolved user.
 * @param pepperOverride Test-only override for `ANALYTICS_USER_ID_PEPPER`.
 * @returns 64-char lowercase hex SHA-256 digest.
 */
export async function computeAnalyticsUserId(
  email: string,
  pepperOverride?: string,
): Promise<string> {
  const pepper = pepperOverride ?? readPepper();
  const data = new TextEncoder().encode(email.toLowerCase() + pepper);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    const hex = b.toString(16);
    out += hex.length === 1 ? "0" + hex : hex;
  }
  return out;
}
