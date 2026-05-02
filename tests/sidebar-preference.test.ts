import { describe, expect, it } from "vitest";

import {
  encodePreference,
  parseStoredPreference,
  resolveInitialOpen,
  SIDEBAR_STORAGE_KEY,
} from "@/lib/shell/sidebar-preference";

/**
 * Companion unit test to the two sidebar e2e regressions. The helpers
 * encode the rules called out in the brief: stored preference wins over
 * the breakpoint default; only "true" / "false" are recognised; the
 * default opens on `lg`+ (≥1024px) and closes below.
 */
describe("sidebar preference helpers", () => {
  it("uses the stable localStorage key 'sidebar-open'", () => {
    // The key is part of the contract — Playwright tests set the same
    // value to drive the persisted-preference scenarios. Don't rename
    // it without updating both layers.
    expect(SIDEBAR_STORAGE_KEY).toBe("sidebar-open");
  });

  describe("parseStoredPreference", () => {
    it("returns true for 'true' and false for 'false'", () => {
      expect(parseStoredPreference("true")).toBe(true);
      expect(parseStoredPreference("false")).toBe(false);
    });

    it("returns null for any other value, signalling 'no preference'", () => {
      expect(parseStoredPreference(null)).toBeNull();
      expect(parseStoredPreference(undefined)).toBeNull();
      expect(parseStoredPreference("")).toBeNull();
      expect(parseStoredPreference("1")).toBeNull();
      expect(parseStoredPreference("yes")).toBeNull();
      expect(parseStoredPreference("TRUE")).toBeNull();
    });
  });

  describe("resolveInitialOpen", () => {
    it("returns the stored preference verbatim when present, regardless of viewport", () => {
      // A user who explicitly closed the sidebar on a wide screen
      // expects it to stay closed on the next visit.
      expect(resolveInitialOpen({ stored: false, isLargeViewport: true })).toBe(false);
      // The inverse: a user who opened the sidebar on a narrow screen
      // expects it to stay open on the next visit, even if the
      // breakpoint default would close it.
      expect(resolveInitialOpen({ stored: true, isLargeViewport: false })).toBe(true);
    });

    it("falls back to the breakpoint default when no preference is stored", () => {
      expect(resolveInitialOpen({ stored: null, isLargeViewport: true })).toBe(true);
      expect(resolveInitialOpen({ stored: null, isLargeViewport: false })).toBe(false);
    });
  });

  describe("encodePreference", () => {
    it("round-trips through parseStoredPreference", () => {
      expect(parseStoredPreference(encodePreference(true))).toBe(true);
      expect(parseStoredPreference(encodePreference(false))).toBe(false);
    });
  });
});
