import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isInAdminAllowlist, isValidEmail, resolveUser } from "@/lib/auth/resolver";

const headersMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({ headers: () => Promise.resolve(headersMock) }));
vi.mock("server-only", () => ({}));

describe("isValidEmail", () => {
  it.each([
    ["alice@hmcts.net", true],
    ["a@b.co", true],
    ["", false],
    ["alice", false],
    ["alice@hmcts", false],
    ["alice @hmcts.net", false],
    ["alice@hmcts .net", false],
  ])("validates %s -> %s", (input, expected) => {
    expect(isValidEmail(input)).toBe(expected);
  });
});

describe("isInAdminAllowlist", () => {
  const originalEnv = process.env.ADMIN_ALLOWLIST;

  afterEach(() => {
    process.env.ADMIN_ALLOWLIST = originalEnv;
  });

  it("returns false when the env var is unset", () => {
    delete process.env.ADMIN_ALLOWLIST;
    expect(isInAdminAllowlist("alice@hmcts.net")).toBe(false);
  });

  it("returns true for an email present in a comma-separated list", () => {
    process.env.ADMIN_ALLOWLIST = "alice@hmcts.net,bob@hmcts.net";
    expect(isInAdminAllowlist("bob@hmcts.net")).toBe(true);
  });

  it("returns true for an email present in a whitespace-separated list", () => {
    process.env.ADMIN_ALLOWLIST = "alice@hmcts.net   bob@hmcts.net";
    expect(isInAdminAllowlist("alice@hmcts.net")).toBe(true);
  });

  it("matches case-insensitively", () => {
    process.env.ADMIN_ALLOWLIST = "Alice@HMCTS.net";
    expect(isInAdminAllowlist("alice@hmcts.net")).toBe(true);
  });

  it("ignores empty entries", () => {
    process.env.ADMIN_ALLOWLIST = ",,alice@hmcts.net,,";
    expect(isInAdminAllowlist("alice@hmcts.net")).toBe(true);
  });
});

describe("resolveUser", () => {
  const originalEnv = process.env.ADMIN_ALLOWLIST;

  beforeEach(() => {
    headersMock.get.mockReset();
    process.env.ADMIN_ALLOWLIST = "admin@hmcts.net";
  });

  afterEach(() => {
    process.env.ADMIN_ALLOWLIST = originalEnv;
  });

  it("returns missing-header when the request has no x-user-email", async () => {
    headersMock.get.mockReturnValue(null);
    const result = await resolveUser();
    expect(result).toEqual({ kind: "unauthorized", reason: "missing-header" });
  });

  it("returns invalid-email for a syntactically broken value", async () => {
    headersMock.get.mockReturnValue("not-an-email");
    const result = await resolveUser();
    expect(result).toEqual({ kind: "unauthorized", reason: "invalid-email" });
  });

  it("authorises a non-admin user with no editable projects", async () => {
    headersMock.get.mockReturnValue("viewer@hmcts.net");
    const result = await resolveUser();
    expect(result).toEqual({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
  });

  it("authorises an admin and returns isAdmin=true", async () => {
    headersMock.get.mockReturnValue("admin@hmcts.net");
    const result = await resolveUser();
    expect(result).toEqual({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });
  });

  it("normalises the email to lowercase before checking the admin list", async () => {
    headersMock.get.mockReturnValue("ADMIN@HMCTS.NET");
    const result = await resolveUser();
    expect(result).toEqual({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });
  });
});
