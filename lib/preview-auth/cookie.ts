/**
 * Edge-runtime-safe HMAC-SHA256 cookie sign/verify for the preview-auth
 * middleware. Uses Web Crypto (`crypto.subtle`) so it works in middleware
 * (Edge runtime) and in API routes (Node runtime) alike.
 *
 * Spec: openspec/specs/preview-auth/spec.md.
 */

export const COOKIE_NAME = "previewAuth";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface PreviewAuthCookieOptions {
  name: typeof COOKIE_NAME;
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}

export const PREVIEW_AUTH_COOKIE_OPTIONS: PreviewAuthCookieOptions = {
  name: COOKIE_NAME,
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
};

interface Payload {
  email: string;
  iat: number;
}

export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" | "error" };

export async function signCookieValue(email: string, secret?: string): Promise<string> {
  const usedSecret = secret ?? readSecret();
  const payload: Payload = {
    email: email.toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
  };
  const payloadB64 = base64urlEncodeString(JSON.stringify(payload));
  const sig = await hmacSign(usedSecret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifyCookieValue(value: string, secret?: string): Promise<VerifyResult> {
  try {
    const usedSecret = secret ?? readSecret();
    const dotIndex = value.indexOf(".");
    if (dotIndex < 0) return { ok: false, reason: "malformed" };
    const payloadB64 = value.slice(0, dotIndex);
    const sig = value.slice(dotIndex + 1);
    if (!payloadB64 || !sig) return { ok: false, reason: "malformed" };

    const expected = await hmacSign(usedSecret, payloadB64);
    if (!constantTimeEqual(sig, expected)) return { ok: false, reason: "bad-signature" };

    let payload: Payload;
    try {
      payload = JSON.parse(base64urlDecodeString(payloadB64)) as Payload;
    } catch {
      return { ok: false, reason: "malformed" };
    }
    if (typeof payload.email !== "string" || typeof payload.iat !== "number") {
      return { ok: false, reason: "malformed" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - payload.iat > COOKIE_MAX_AGE_SECONDS) return { ok: false, reason: "expired" };
    if (now - payload.iat < -60) return { ok: false, reason: "malformed" }; // future-dated

    return { ok: true, email: payload.email };
  } catch {
    return { ok: false, reason: "error" };
  }
}

function readSecret(): string {
  const secret = process.env.PREVIEW_AUTH_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("PREVIEW_AUTH_COOKIE_SECRET must be set and at least 32 characters");
  }
  return secret;
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64urlEncodeBytes(new Uint8Array(signature));
}

function base64urlEncodeString(input: string): string {
  return base64urlEncodeBytes(new TextEncoder().encode(input));
}

function base64urlDecodeString(input: string): string {
  return new TextDecoder().decode(base64urlDecodeBytes(input));
}

function base64urlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecodeBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
