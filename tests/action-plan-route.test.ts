import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const resolveUserMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/resolver", () => ({
  resolveUser: resolveUserMock,
}));

interface FakeTransaction {
  patch: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
}

interface FakeClient {
  fetch: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
}

const sanityClientMock = vi.hoisted((): { client: FakeClient; transaction: FakeTransaction } => {
  const transaction: FakeTransaction = {
    patch: vi.fn(function (this: FakeTransaction) {
      return this;
    }),
    create: vi.fn(function (this: FakeTransaction) {
      return this;
    }),
    commit: vi.fn(async () => ({ documentIds: ["chg-1"] })),
  };
  const client: FakeClient = {
    fetch: vi.fn(),
    transaction: vi.fn(() => transaction),
  };
  return { client, transaction };
});
vi.mock("@/lib/sanity/client", () => ({
  getSanityClient: () => sanityClientMock.client,
}));

import { PATCH } from "@/app/api/action-plan/[actionNo]/route";

interface RouteContext {
  params: Promise<{ actionNo: string }>;
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/action-plan/2.6", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeContext(actionNo: string): RouteContext {
  return { params: Promise.resolve({ actionNo }) };
}

describe("PATCH /api/action-plan/[actionNo]", () => {
  beforeEach(() => {
    resolveUserMock.mockReset();
    sanityClientMock.client.fetch.mockReset();
    sanityClientMock.client.transaction.mockClear();
    sanityClientMock.transaction.patch.mockClear();
    sanityClientMock.transaction.create.mockClear();
    sanityClientMock.transaction.commit.mockClear();
  });

  it("returns 401 when the resolver short-circuits as unauthorized", async () => {
    resolveUserMock.mockResolvedValue({ kind: "unauthorized", reason: "missing-header" });
    const response = await PATCH(makeRequest({ progressStatus: "Completed" }), makeContext("2.6"));
    expect(response.status).toBe(401);
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 403 when the user is authorized but not an admin", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    const response = await PATCH(makeRequest({ progressStatus: "Completed" }), makeContext("2.6"));
    expect(response.status).toBe(403);
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when the body has an invalid progressStatus", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });
    const response = await PATCH(
      makeRequest({ progressStatus: "Definitely-not-a-status" }),
      makeContext("2.6"),
    );
    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when neither progressStatus nor summaryText is supplied", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });
    const response = await PATCH(makeRequest({}), makeContext("2.6"));
    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 404 when no action exists with that actionNo", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce(null);
    const response = await PATCH(
      makeRequest({ progressStatus: "Completed" }),
      makeContext("9.9"),
    );
    expect(response.status).toBe(404);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("writes one ChangeLog row per modified field with documentType=action and resolver email", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "action-2-6",
      progressStatus: "Some progress",
      summaryOfProgress: [
        {
          _type: "block",
          _key: "old",
          style: "normal",
          markDefs: [],
          children: [{ _type: "span", _key: "s1", text: "Old summary", marks: [] }],
        },
      ],
    });

    const response = await PATCH(
      makeRequest({ progressStatus: "Completed", summaryText: "New summary" }),
      makeContext("2.6"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(sanityClientMock.transaction.patch).toHaveBeenCalledOnce();
    expect(sanityClientMock.transaction.commit).toHaveBeenCalledOnce();

    expect(sanityClientMock.transaction.create).toHaveBeenCalledTimes(2);
    type Row = {
      _type: string;
      documentId: string;
      documentType: string;
      field: string;
      before: string;
      after: string;
      userEmail: string;
      timestamp: string;
    };
    const created = sanityClientMock.transaction.create.mock.calls.map(
      (call) => (call as [Row])[0],
    );
    for (const row of created) {
      expect(row._type).toBe("changeLog");
      expect(row.documentId).toBe("action-2-6");
      expect(row.documentType).toBe("action");
      expect(row.userEmail).toBe("admin@hmcts.net");
      expect(typeof row.timestamp).toBe("string");
    }
    const fields = created.map((row) => row.field).sort();
    expect(fields).toEqual(["progressStatus", "summaryOfProgress"]);

    const status = created.find((row) => row.field === "progressStatus")!;
    expect(JSON.parse(status.before)).toBe("Some progress");
    expect(JSON.parse(status.after)).toBe("Completed");

    const summary = created.find((row) => row.field === "summaryOfProgress")!;
    const beforeSummary = JSON.parse(summary.before);
    const afterSummary = JSON.parse(summary.after);
    expect(Array.isArray(beforeSummary)).toBe(true);
    expect(Array.isArray(afterSummary)).toBe(true);
    expect(afterSummary[0]._type).toBe("block");
    expect(afterSummary[0].children[0].text).toBe("New summary");
  });

  it("logs only the field that actually changed when only one is supplied", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "action-1-1",
      progressStatus: "Some progress",
      summaryOfProgress: null,
    });

    const response = await PATCH(
      makeRequest({ progressStatus: "Completed" }),
      makeContext("1.1"),
    );

    expect(response.status).toBe(200);
    expect(sanityClientMock.transaction.create).toHaveBeenCalledOnce();
    const createdCall = sanityClientMock.transaction.create.mock.calls[0] as [
      { field: string; documentType: string },
    ];
    expect(createdCall[0].field).toBe("progressStatus");
    expect(createdCall[0].documentType).toBe("action");
  });

  it("ignores a userEmail field smuggled in via the body and uses the resolver email", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "action-3-1",
      progressStatus: "Some progress",
      summaryOfProgress: null,
    });

    const response = await PATCH(
      makeRequest({
        progressStatus: "Completed",
        userEmail: "spoofed@evil.example",
      }),
      makeContext("3.1"),
    );

    expect(response.status).toBe(200);
    const spoofCall = sanityClientMock.transaction.create.mock.calls[0] as [
      { userEmail: string },
    ];
    expect(spoofCall[0].userEmail).toBe("admin@hmcts.net");
    expect(spoofCall[0].userEmail).not.toBe("spoofed@evil.example");
  });

  it("does not write a ChangeLog row when the supplied value equals the current value", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "action-1-1",
      progressStatus: "Completed",
      summaryOfProgress: null,
    });

    const response = await PATCH(
      makeRequest({ progressStatus: "Completed" }),
      makeContext("1.1"),
    );

    expect(response.status).toBe(200);
    expect(sanityClientMock.transaction.create).not.toHaveBeenCalled();
  });
});
