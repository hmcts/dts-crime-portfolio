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

const sanityClientMock = vi.hoisted((): {
  client: FakeClient;
  transaction: FakeTransaction;
} => {
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

import { GET, POST } from "@/app/api/portfolios/reporting-cuts/route";

function makeRequest(body?: unknown): Request {
  return new Request("http://localhost/api/portfolios/reporting-cuts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("GET /api/portfolios/reporting-cuts", () => {
  beforeEach(() => {
    resolveUserMock.mockReset();
    sanityClientMock.client.fetch.mockReset();
    sanityClientMock.client.transaction.mockClear();
    sanityClientMock.transaction.patch.mockClear();
    sanityClientMock.transaction.create.mockClear();
    sanityClientMock.transaction.commit.mockClear();
  });

  it("returns 401 when unauthenticated", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "unauthorized",
      reason: "missing-header",
    });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
  });

  it("returns the list newest first wrapped in a `cuts` envelope when authorised", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce([
      {
        _id: "cut-2",
        name: "Q2",
        note: null,
        createdAt: "2026-04-01T00:00:00Z",
        createdBy: "admin@hmcts.net",
      },
    ]);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      cuts: [
        {
          id: "cut-2",
          name: "Q2",
          note: null,
          createdAt: "2026-04-01T00:00:00Z",
          createdBy: "admin@hmcts.net",
        },
      ],
    });
  });
});

describe("POST /api/portfolios/reporting-cuts", () => {
  beforeEach(() => {
    resolveUserMock.mockReset();
    sanityClientMock.client.fetch.mockReset();
    sanityClientMock.client.transaction.mockClear();
    sanityClientMock.transaction.patch.mockClear();
    sanityClientMock.transaction.create.mockClear();
    sanityClientMock.transaction.commit.mockClear();
  });

  it("returns 401 when unauthenticated", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "unauthorized",
      reason: "missing-header",
    });
    const response = await POST(makeRequest({ name: "test" }));
    expect(response.status).toBe(401);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 403 when authorised but not admin", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    const response = await POST(makeRequest({ name: "test" }));
    expect(response.status).toBe(403);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when name is missing", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("serialises portfolio with resolved reference text and writes the snapshot via commitWithChangeLog", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "admin@hmcts.net",
      isAdmin: true,
      editableProjects: [],
    });

    // First fetch is the SNAPSHOT_QUERY for the portfolio.
    sanityClientMock.client.fetch.mockResolvedValueOnce([
      {
        _id: "p1",
        name: "Project One",
        description: "desc",
        projectStage: "pilot",
        group: "Group A",
        directorate: "Directorate Alpha",
        businessAreas: ["Area 1", "Area 2"],
        deliveryOwner: { name: "Alice", email: "alice@hmcts.net" },
        additionalDeliveryOwners: null,
        businessLead: null,
        legalLead: null,
        capability: "Cap One",
        additionalCapabilities: null,
        actionPlanLinks: [{ actionNo: "1.1", name: "Do thing" }],
        governanceTier: 2,
        governanceBody: "Board",
        riskRegister: "yes",
        dpiaInPlace: "complete",
        actsInPlace: "in-progress",
        mojEthicsFrameworkUse: "yes",
        githubUrl: null,
        lastUpdatedAt: "2026-04-01T12:00:00Z",
      },
    ]);

    const response = await POST(
      makeRequest({ name: "April snapshot", note: "End of Q1" }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBeGreaterThan(0);
    expect(typeof body.createdAt).toBe("string");

    // Two creates happened on the transaction: one for the reportingCut
    // document itself, and one for the matching ChangeLog row. Order is
    // mutations-first then ChangeLog rows.
    expect(sanityClientMock.transaction.commit).toHaveBeenCalledOnce();
    expect(sanityClientMock.transaction.create).toHaveBeenCalledTimes(2);

    const cutDoc = sanityClientMock.transaction.create.mock.calls[0]![0] as {
      _id: string;
      _type: string;
      name: string;
      note: string;
      createdAt: string;
      createdBy: string;
      snapshot: string;
    };
    expect(cutDoc._type).toBe("reportingCut");
    expect(cutDoc._id).toBe(body.id);
    expect(cutDoc.name).toBe("April snapshot");
    expect(cutDoc.note).toBe("End of Q1");
    expect(cutDoc.createdBy).toBe("admin@hmcts.net");

    // Snapshot should contain resolved reference TEXT, not raw _ref ids.
    const parsed = JSON.parse(cutDoc.snapshot) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      _id: "p1",
      name: "Project One",
      group: "Group A",
      directorate: "Directorate Alpha",
      businessAreas: ["Area 1", "Area 2"],
      deliveryOwner: { name: "Alice", email: "alice@hmcts.net" },
      capability: "Cap One",
    });
    // Spot-check no `_ref` survived.
    expect(JSON.stringify(parsed)).not.toMatch(/_ref/);

    const changeLogRow = sanityClientMock.transaction.create.mock.calls[1]![0] as {
      _type: string;
      documentId: string;
      documentType: string;
      field: string;
      userEmail: string;
    };
    expect(changeLogRow._type).toBe("changeLog");
    expect(changeLogRow.documentType).toBe("reportingCut");
    expect(changeLogRow.documentId).toBe(body.id);
    expect(changeLogRow.field).toBe("snapshot");
    expect(changeLogRow.userEmail).toBe("admin@hmcts.net");
  });
});
