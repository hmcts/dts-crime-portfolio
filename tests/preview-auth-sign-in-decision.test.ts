import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decideSignInAction, sanitiseNext } from "@/lib/preview-auth/sign-in-decision";

describe("decideSignInAction", () => {
  it("accepts a valid hmcts.net email and lower-cases it for the cookie payload", () => {
    const out = decideSignInAction({
      rawEmailField: "Alice@HMCTS.net",
      rawNextField: "/portfolio",
    });
    expect(out).toEqual({ kind: "accept", email: "alice@hmcts.net", next: "/portfolio" });
  });

  it("accepts a justice.gov.uk email", () => {
    const out = decideSignInAction({ rawEmailField: "bob@justice.gov.uk", rawNextField: "/" });
    expect(out).toEqual({ kind: "accept", email: "bob@justice.gov.uk", next: "/" });
  });

  it("trims whitespace before validating", () => {
    const out = decideSignInAction({
      rawEmailField: "  alice@hmcts.net  ",
      rawNextField: "/portfolio",
    });
    expect(out).toMatchObject({ kind: "accept", email: "alice@hmcts.net" });
  });

  it("returns reject-format for an empty submission", () => {
    const out = decideSignInAction({ rawEmailField: "", rawNextField: "/" });
    expect(out).toEqual({ kind: "reject-format", rawEmail: "", next: "/" });
  });

  it("returns reject-format for a value that fails basic email shape", () => {
    const out = decideSignInAction({ rawEmailField: "not-an-email", rawNextField: "/" });
    expect(out.kind).toBe("reject-format");
  });

  it("returns reject-domain for a syntactically valid but disallowed domain", () => {
    const out = decideSignInAction({
      rawEmailField: "tester@example.com",
      rawNextField: "/portfolio",
    });
    expect(out).toEqual({
      kind: "reject-domain",
      rawEmail: "tester@example.com",
      next: "/portfolio",
    });
  });

  it("returns reject-domain for confusable subdomain attacks", () => {
    expect(
      decideSignInAction({
        rawEmailField: "tester@hmcts.net.example.com",
        rawNextField: "/",
      }).kind,
    ).toBe("reject-domain");
    expect(
      decideSignInAction({
        rawEmailField: "tester@justice.gov.uk.evil.com",
        rawNextField: "/",
      }).kind,
    ).toBe("reject-domain");
  });

  it("preserves the raw (untrimmed?) value the user submitted in the rejection so we can echo it back", () => {
    const out = decideSignInAction({
      rawEmailField: "  attacker@evil.com  ",
      rawNextField: "/portfolio",
    });
    expect(out).toMatchObject({ kind: "reject-domain", rawEmail: "attacker@evil.com" });
  });

  it("coerces nullish fields safely", () => {
    const out = decideSignInAction({ rawEmailField: null, rawNextField: undefined });
    expect(out).toEqual({ kind: "reject-format", rawEmail: "", next: "/" });
  });
});

describe("sanitiseNext", () => {
  it.each([
    ["/portfolio", "/portfolio"],
    ["/", "/"],
    ["//evil.com", "/"],
    ["https://evil.com", "/"],
    ["javascript:alert(1)", "/"],
    ["", "/"],
  ])("%s -> %s", (input, expected) => {
    expect(sanitiseNext(input)).toBe(expected);
  });
});
