import { describe, expect, it } from "vitest";

import {
  ALLOWED_PREVIEW_AUTH_DOMAINS,
  formatAllowedDomainsForCopy,
  isAllowedPreviewAuthDomain,
} from "@/lib/preview-auth/email-domain";

describe("ALLOWED_PREVIEW_AUTH_DOMAINS", () => {
  it("contains exactly the two HMCTS / MoJ domains the spec calls out", () => {
    expect([...ALLOWED_PREVIEW_AUTH_DOMAINS]).toEqual(["hmcts.net", "justice.gov.uk"]);
  });
});

describe("isAllowedPreviewAuthDomain", () => {
  it.each([
    ["alice@hmcts.net", true, "hmcts.net accepted"],
    ["bob@justice.gov.uk", true, "justice.gov.uk accepted"],
    ["ALICE@HMCTS.NET", true, "fully upper-case accepted"],
    ["Alice@HMCTS.net", true, "mixed-case domain accepted"],
    ["alice@Justice.Gov.UK", true, "mixed-case justice.gov.uk accepted"],
  ])("%s -> %s (%s)", (input, expected) => {
    expect(isAllowedPreviewAuthDomain(input)).toBe(expected);
  });

  it("trims leading and trailing whitespace before checking", () => {
    expect(isAllowedPreviewAuthDomain("  alice@hmcts.net  ")).toBe(true);
    expect(isAllowedPreviewAuthDomain("\talice@justice.gov.uk\n")).toBe(true);
  });

  it.each([
    ["alice@hmcts.com", "wrong TLD"],
    ["alice@hmcts.net.example.com", "domain has trailing extra labels"],
    ["alice@justice.gov.uk.evil.com", "subdomain attack"],
    ["alice@sub.hmcts.net", "subdomain of allowed domain rejected"],
    ["alice@hmcts-net", "hyphen substituted for dot"],
    ["alice@hmctsnet", "no dot at all"],
    ["alice@hmcts.net.", "trailing dot rejected"],
  ])("rejects %s (%s)", (input) => {
    expect(isAllowedPreviewAuthDomain(input)).toBe(false);
  });

  it.each([
    ["", "empty string"],
    ["alice", "no @"],
    ["alice@", "trailing @"],
    ["@hmcts.net", "leading @"],
    ["alice@@hmcts.net", "double @"],
    ["alice@hmcts.net@evil.com", "second @"],
  ])("rejects %s (%s)", (input) => {
    expect(isAllowedPreviewAuthDomain(input)).toBe(false);
  });

  it("rejects null and undefined defensively", () => {
    expect(isAllowedPreviewAuthDomain(null)).toBe(false);
    expect(isAllowedPreviewAuthDomain(undefined)).toBe(false);
  });

  it("rejects non-string inputs (defensive)", () => {
    // @ts-expect-error testing runtime defence
    expect(isAllowedPreviewAuthDomain(42)).toBe(false);
    // @ts-expect-error testing runtime defence
    expect(isAllowedPreviewAuthDomain({})).toBe(false);
  });
});

describe("formatAllowedDomainsForCopy", () => {
  it("formats the domains for user copy with @ prefix", () => {
    expect(formatAllowedDomainsForCopy()).toBe("@hmcts.net or @justice.gov.uk");
  });
});
