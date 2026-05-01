/**
 * localStorage-backed analytics consent store.
 *
 * Spec: openspec/specs/analytics/spec.md (Consent gate before any analytics
 * load, Self-service opt-out inside the portal).
 *
 * Persistence shape:
 *   {
 *     value: "granted" | "declined",
 *     decidedAt: <unix-ms>,
 *     expiresAt: <unix-ms>,   // 12 months after `decidedAt`
 *   }
 *
 * The stored object expires after 12 months; reads after that look like
 * "no decision" so the banner reappears for explicit re-consent.
 *
 * The same value is mirrored to a same-site cookie (`analyticsConsent`)
 * so the server-side ingest proxy can drop unconsented requests without
 * needing to read localStorage. The cookie matches the localStorage value
 * but uses a 12-month Max-Age.
 */

export type ConsentValue = "granted" | "declined";

export const CONSENT_STORAGE_KEY = "analyticsConsent";
export const CONSENT_COOKIE_NAME = "analyticsConsent";
export const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 12 months in ms
export const CONSENT_TTL_SECONDS = Math.floor(CONSENT_TTL_MS / 1000);

interface ConsentRecord {
  value: ConsentValue;
  decidedAt: number;
  expiresAt: number;
}

function getStorage(): Storage | null {
  if (typeof globalThis === "undefined") return null;
  const candidate = (globalThis as { localStorage?: Storage }).localStorage;
  return candidate ?? null;
}

/**
 * Read the current consent state from localStorage. Returns `null` when
 * no decision has been made (or the previous decision has expired); in
 * either case the banner SHOULD render.
 */
export function readConsent(now: number = Date.now()): ConsentValue | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(CONSENT_STORAGE_KEY);
  if (!raw) return null;

  // Backwards-compatible read: an early prototype stored just the bare
  // string, so fall back to that when JSON parsing fails.
  if (raw === "granted" || raw === "declined") return raw;

  let record: ConsentRecord;
  try {
    record = JSON.parse(raw) as ConsentRecord;
  } catch {
    return null;
  }

  if (record.value !== "granted" && record.value !== "declined") return null;
  if (typeof record.expiresAt !== "number") return record.value;
  if (record.expiresAt < now) return null;
  return record.value;
}

/**
 * Persist a consent decision. Writes both localStorage AND a same-site
 * cookie so the same-origin ingest proxy can gate forwarding.
 */
export function writeConsent(value: ConsentValue, now: number = Date.now()): void {
  const storage = getStorage();
  if (storage) {
    const record: ConsentRecord = {
      value,
      decidedAt: now,
      expiresAt: now + CONSENT_TTL_MS,
    };
    storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  }
  writeConsentCookie(value);
}

/**
 * Browser-only: set the analyticsConsent cookie matching localStorage
 * with a 12-month Max-Age. The proxy reads this cookie to decide whether
 * to forward to PostHog.
 */
export function writeConsentCookie(value: ConsentValue): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE_NAME}=${value}` +
    `; Max-Age=${CONSENT_TTL_SECONDS}` +
    `; Path=/` +
    `; SameSite=Lax` +
    secure;
}

/**
 * Clear any stored decision, forcing the banner to re-prompt. Called from
 * the /profile self-service control when the user toggles analytics off
 * AFTER a decline (so they can re-accept later) — and as a defensive
 * cleanup if the cookie store gets out of sync.
 */
export function clearConsent(): void {
  const storage = getStorage();
  if (storage) storage.removeItem(CONSENT_STORAGE_KEY);
  if (typeof document !== "undefined") {
    document.cookie = `${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}

/**
 * Server-side: parse a `Cookie:` header and return the consent cookie's
 * value. Used by the ingest proxy. Returns `null` for no/invalid cookie.
 */
export function readConsentFromCookieHeader(cookieHeader: string | null): ConsentValue | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (name !== CONSENT_COOKIE_NAME) continue;
    const value = part.slice(eq + 1).trim();
    if (value === "granted" || value === "declined") return value;
    return null;
  }
  return null;
}
