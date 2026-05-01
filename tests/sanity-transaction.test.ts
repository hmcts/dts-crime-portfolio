import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { commitWithChangeLog } from "@/lib/sanity/transaction";

interface FakeTransaction {
  patch: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
}

function makeFakeClient() {
  const transaction: FakeTransaction = {
    patch: vi.fn(function (this: FakeTransaction) {
      return this;
    }),
    create: vi.fn(function (this: FakeTransaction) {
      return this;
    }),
    commit: vi.fn(async () => ({ documentIds: ["chg-1"] })),
  };
  const client = {
    transaction: vi.fn(() => transaction),
  };
  return { client, transaction };
}

describe("commitWithChangeLog", () => {
  it("appends one changeLog row per field change with the resolver email and a timestamp", async () => {
    const { client, transaction } = makeFakeClient();
    const before = Date.now();

    await commitWithChangeLog({
      mutations: (tx) => tx.patch("project-1", { set: { description: "after" } }),
      changes: [
        {
          documentId: "project-1",
          documentType: "project",
          field: "description",
          before: "before",
          after: "after",
        },
      ],
      userEmail: "editor@hmcts.net",
      client: client as unknown as Parameters<typeof commitWithChangeLog>[0]["client"],
    });

    expect(client.transaction).toHaveBeenCalledOnce();
    expect(transaction.patch).toHaveBeenCalledOnce();
    expect(transaction.create).toHaveBeenCalledOnce();
    expect(transaction.commit).toHaveBeenCalledOnce();

    const created = transaction.create.mock.calls[0]![0];
    expect(created._type).toBe("changeLog");
    expect(created.documentId).toBe("project-1");
    expect(created.documentType).toBe("project");
    expect(created.field).toBe("description");
    expect(created.userEmail).toBe("editor@hmcts.net");
    expect(JSON.parse(created.before)).toBe("before");
    expect(JSON.parse(created.after)).toBe("after");
    const tsMs = new Date(created.timestamp).getTime();
    expect(tsMs).toBeGreaterThanOrEqual(before);
    expect(tsMs).toBeLessThanOrEqual(Date.now());
  });

  it("writes one changeLog row per field for multi-field saves", async () => {
    const { client, transaction } = makeFakeClient();

    await commitWithChangeLog({
      mutations: (tx) => tx.patch("p", { set: { description: "x", governanceTier: 2 } }),
      changes: [
        { documentId: "p", documentType: "project", field: "description", before: "y", after: "x" },
        { documentId: "p", documentType: "project", field: "governanceTier", before: 1, after: 2 },
      ],
      userEmail: "editor@hmcts.net",
      client: client as unknown as Parameters<typeof commitWithChangeLog>[0]["client"],
    });

    expect(transaction.create).toHaveBeenCalledTimes(2);
    expect(transaction.commit).toHaveBeenCalledOnce();
  });

  it("uses the userEmail argument, ignoring any user-supplied value on a change object", async () => {
    const { client, transaction } = makeFakeClient();

    await commitWithChangeLog({
      mutations: () => undefined as unknown as ReturnType<Parameters<typeof commitWithChangeLog>[0]["mutations"]>,
      changes: [
        {
          documentId: "p",
          documentType: "project",
          field: "description",
          before: "y",
          after: "x",
          // @ts-expect-error — proving extra props are ignored, not forwarded
          userEmail: "spoofed@evil.example",
        },
      ],
      userEmail: "editor@hmcts.net",
      client: client as unknown as Parameters<typeof commitWithChangeLog>[0]["client"],
    });

    const created = transaction.create.mock.calls[0]![0];
    expect(created.userEmail).toBe("editor@hmcts.net");
  });

  it("does not commit if a mutation throws synchronously", async () => {
    const { client, transaction } = makeFakeClient();

    await expect(
      commitWithChangeLog({
        mutations: () => {
          throw new Error("schema rejected");
        },
        changes: [],
        userEmail: "editor@hmcts.net",
        client: client as unknown as Parameters<typeof commitWithChangeLog>[0]["client"],
      }),
    ).rejects.toThrow("schema rejected");

    expect(transaction.commit).not.toHaveBeenCalled();
  });
});
