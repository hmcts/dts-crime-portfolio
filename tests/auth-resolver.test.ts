import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({ headers: () => Promise.resolve(headersMock) }));
vi.mock("server-only", () => ({}));

// Drizzle mock — `db.select(...).from(...).where(...)` resolves to the
// canned rows the test installs via `dbRowsMock.set()`. Same shape as
// the actual Drizzle chain so the resolver code under test isn't aware
// it's mocked.
const dbRowsMock = vi.hoisted(() => {
  let rows: Array<{ projectId: string }> = [];
  const select = vi.fn(() => ({
    from: () => ({
      where: () => Promise.resolve(rows),
    }),
  }));
  return {
    select,
    set(next: Array<{ projectId: string }>) {
      rows = next;
    },
    reset() {
      rows = [];
      select.mockClear();
    },
  };
});
vi.mock("@/lib/db/client", () => ({
  getDb: () => ({ select: dbRowsMock.select }),
}));

import {
  fetchEditableProjects,
  isInAdminAllowlist,
  isValidEmail,
  resolveUser,
} from "@/lib/auth/resolver";

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
    dbRowsMock.reset();
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
    dbRowsMock.set([]);
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
    // Admin path bypasses the Postgres lookup entirely.
    expect(dbRowsMock.select).not.toHaveBeenCalled();
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

  it("returns the editable projects from the Postgres allowlist for a non-admin", async () => {
    headersMock.get.mockReturnValue("editor@hmcts.net");
    dbRowsMock.set([{ projectId: "project-1" }, { projectId: "project-2" }]);
    const result = await resolveUser();
    expect(result).toEqual({
      kind: "authorized",
      email: "editor@hmcts.net",
      isAdmin: false,
      editableProjects: ["project-1", "project-2"],
    });
    expect(dbRowsMock.select).toHaveBeenCalledOnce();
  });

  it("uses the lower-cased email when querying the Postgres allowlist", async () => {
    headersMock.get.mockReturnValue("Editor@HMCTS.net");
    dbRowsMock.set([{ projectId: "project-9" }]);
    const result = await resolveUser();
    expect(result.kind).toBe("authorized");
    if (result.kind === "authorized") {
      expect(result.email).toBe("editor@hmcts.net");
      expect(result.editableProjects).toEqual(["project-9"]);
    }
  });
});

describe("fetchEditableProjects", () => {
  beforeEach(() => {
    dbRowsMock.reset();
  });

  it("returns the project ids from the Postgres allowlist", async () => {
    dbRowsMock.set([{ projectId: "project-a" }, { projectId: "project-b" }]);
    const result = await fetchEditableProjects("editor@hmcts.net");
    expect(result).toEqual(["project-a", "project-b"]);
  });

  it("returns an empty array when the email has no rows", async () => {
    dbRowsMock.set([]);
    const result = await fetchEditableProjects("nobody@hmcts.net");
    expect(result).toEqual([]);
  });
});
