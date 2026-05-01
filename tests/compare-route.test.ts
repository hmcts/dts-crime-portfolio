import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const resolveUserMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/resolver", () => ({
  resolveUser: resolveUserMock,
}));

interface FakeClient {
  fetch: ReturnType<typeof vi.fn>;
}

const sanityClientMock = vi.hoisted((): { client: FakeClient } => ({
  client: { fetch: vi.fn() },
}));
vi.mock("@/lib/sanity/client", () => ({
  getSanityClient: () => sanityClientMock.client,
}));

import { GET } from "@/app/api/portfolios/compare/route";

function makeRequest(query: string): Request {
  return new Request(`http://localhost/api/portfolios/compare${query}`);
}

describe("GET /api/portfolios/compare", () => {
  beforeEach(() => {
    resolveUserMock.mockReset();
    sanityClientMock.client.fetch.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "unauthorized",
      reason: "missing-header",
    });
    const response = await GET(makeRequest("?from=2026-01-01&to=2026-04-01"));
    expect(response.status).toBe(401);
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
  });

  it("returns empty arrays when from equals to", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    const response = await GET(makeRequest("?from=2026-04-01&to=2026-04-01"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ added: [], removed: [], changed: [] });
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when neither reportingCut nor from/to are provided", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    const response = await GET(makeRequest(""));
    expect(response.status).toBe(400);
  });

  it("derives the date-range diff from changeLog rows only (added, removed, changed)", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });

    // First call: changeLog rows
    sanityClientMock.client.fetch.mockResolvedValueOnce([
      {
        documentId: "p-new",
        documentType: "project",
        field: "_created",
        before: null,
        after: null,
        userEmail: "admin@hmcts.net",
        timestamp: "2026-02-15T00:00:00Z",
      },
      {
        documentId: "p-old",
        documentType: "project",
        field: "_deleted",
        before: null,
        after: null,
        userEmail: "admin@hmcts.net",
        timestamp: "2026-02-20T00:00:00Z",
      },
      {
        documentId: "p-mod",
        documentType: "project",
        field: "governanceTier",
        before: JSON.stringify(1),
        after: JSON.stringify(2),
        userEmail: "admin@hmcts.net",
        timestamp: "2026-02-25T00:00:00Z",
      },
      {
        documentId: "p-mod",
        documentType: "project",
        field: "governanceTier",
        before: JSON.stringify(2),
        after: JSON.stringify(3),
        userEmail: "admin@hmcts.net",
        timestamp: "2026-03-25T00:00:00Z",
      },
    ]);
    // Second call: project name lookup
    sanityClientMock.client.fetch.mockResolvedValueOnce([
      { _id: "p-new", name: "New Project" },
      { _id: "p-old", name: "Old Project" },
      { _id: "p-mod", name: "Mod Project" },
    ]);

    const response = await GET(makeRequest("?from=2026-01-01&to=2026-04-01"));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.added).toEqual([
      { projectId: "p-new", projectName: "New Project" },
    ]);
    expect(body.removed).toEqual([
      { projectId: "p-old", projectName: "Old Project" },
    ]);
    expect(body.changed).toEqual([
      {
        projectId: "p-mod",
        projectName: "Mod Project",
        fields: [{ field: "governanceTier", before: 1, after: 3 }],
      },
    ]);
  });

  it("diffs against a saved snapshot when ?reportingCut=<id> is supplied", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });

    const snapshotJson = JSON.stringify([
      {
        _id: "p1",
        name: "Project One",
        description: null,
        projectStage: null,
        group: "Group A",
        directorate: null,
        businessAreas: null,
        deliveryOwner: { name: "Alice Smith", email: "alice@x" },
        additionalDeliveryOwners: null,
        businessLead: null,
        legalLead: null,
        capability: null,
        additionalCapabilities: null,
        actionPlanLinks: null,
        governanceTier: null,
        governanceBody: null,
        riskRegister: null,
        dpiaInPlace: null,
        actsInPlace: null,
        mojEthicsFrameworkUse: null,
        githubUrl: null,
        lastUpdatedAt: null,
      },
    ]);

    // First call: REPORTING_CUT_QUERY
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "cut-1",
      snapshot: snapshotJson,
    });
    // Second call: SNAPSHOT_QUERY for current portfolio
    sanityClientMock.client.fetch.mockResolvedValueOnce([
      {
        _id: "p1",
        name: "Project One",
        description: null,
        projectStage: null,
        group: "Group A",
        directorate: null,
        businessAreas: null,
        deliveryOwner: { name: "Alice Jones", email: "alice@x" },
        additionalDeliveryOwners: null,
        businessLead: null,
        legalLead: null,
        capability: null,
        additionalCapabilities: null,
        actionPlanLinks: null,
        governanceTier: null,
        governanceBody: null,
        riskRegister: null,
        dpiaInPlace: null,
        actsInPlace: null,
        mojEthicsFrameworkUse: null,
        githubUrl: null,
        lastUpdatedAt: null,
      },
    ]);

    const response = await GET(makeRequest("?reportingCut=cut-1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.added).toEqual([]);
    expect(body.removed).toEqual([]);
    expect(body.changed).toEqual([
      {
        projectId: "p1",
        projectName: "Project One",
        fields: [
          {
            field: "deliveryOwner",
            before: { name: "Alice Smith", email: "alice@x" },
            after: { name: "Alice Jones", email: "alice@x" },
          },
        ],
      },
    ]);
  });

  it("returns 404 when the requested reporting cut id does not exist", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce(null);
    const response = await GET(makeRequest("?reportingCut=missing"));
    expect(response.status).toBe(404);
  });
});
