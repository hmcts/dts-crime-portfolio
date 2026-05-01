import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  COOKIE_MAX_AGE_SECONDS,
  signCookieValue,
  verifyCookieValue,
} from "@/lib/preview-auth/cookie";

const SECRET = "a".repeat(64);

describe("preview-auth cookie", () => {
  it("signs and verifies a round-trip for a valid email", async () => {
    const cookie = await signCookieValue("alice@hmcts.net", SECRET);
    const result = await verifyCookieValue(cookie, SECRET);
    expect(result).toEqual({ ok: true, email: "alice@hmcts.net" });
  });

  it("lower-cases the stored email regardless of input casing", async () => {
    const cookie = await signCookieValue("ALICE@HMCTS.NET", SECRET);
    const result = await verifyCookieValue(cookie, SECRET);
    expect(result).toEqual({ ok: true, email: "alice@hmcts.net" });
  });

  it("rejects a tampered payload", async () => {
    const cookie = await signCookieValue("alice@hmcts.net", SECRET);
    const [payload, sig] = cookie.split(".");
    const tampered = `${payload}A.${sig}`;
    const result = await verifyCookieValue(tampered, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad-signature");
  });

  it("rejects a tampered signature", async () => {
    const cookie = await signCookieValue("alice@hmcts.net", SECRET);
    const [payload, sig] = cookie.split(".");
    const flippedSig = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    const tampered = `${payload}.${flippedSig}`;
    const result = await verifyCookieValue(tampered, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad-signature");
  });

  it("rejects a malformed cookie value", async () => {
    const result = await verifyCookieValue("not-a-cookie", SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed");
  });

  it("rejects a cookie signed with a different secret", async () => {
    const cookie = await signCookieValue("alice@hmcts.net", SECRET);
    const result = await verifyCookieValue(cookie, "b".repeat(64));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad-signature");
  });

  describe("expiry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("accepts a cookie one second before max-age", async () => {
      vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));
      const cookie = await signCookieValue("alice@hmcts.net", SECRET);
      vi.setSystemTime(new Date(Date.now() + (COOKIE_MAX_AGE_SECONDS - 1) * 1000));
      const result = await verifyCookieValue(cookie, SECRET);
      expect(result.ok).toBe(true);
    });

    it("rejects a cookie one second past max-age", async () => {
      vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));
      const cookie = await signCookieValue("alice@hmcts.net", SECRET);
      vi.setSystemTime(new Date(Date.now() + (COOKIE_MAX_AGE_SECONDS + 1) * 1000));
      const result = await verifyCookieValue(cookie, SECRET);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("expired");
    });
  });
});
