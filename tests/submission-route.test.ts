import { beforeEach, describe, expect, it, vi } from "vitest";

import { TIERING_QUESTIONS } from "@/lib/tiering/calculator";

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

import { POST } from "@/app/api/portfolios/submit/route";

function fullTiering(answers: Record<string, 1 | 2 | 3>) {
  const out: Record<string, 1 | 2 | 3> = {};
  for (const key of TIERING_QUESTIONS) out[key] = answers[key] ?? 1;
  return out;
}

function makeBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "AI Triage",
    description: "Triage tooling.",
    projectStage: "pilot",
    group: { id: "group-1" },
    directorate: { id: "dir-1" },
    businessAreaIds: ["ba-1"],
    deliveryOwner: { id: "person-1" },
    businessLeadId: "person-2",
    legalLeadId: "person-3",
    capability: { id: "cap-1" },
    additionalCapabilityIds: [],
    actionPlanLinkIds: ["action-1"],
    tieringAssessment: fullTiering({}),
    declaredOverallTier: 1,
    surveyDetails: { containsPii: false },
    ...overrides,
  };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/portfolios/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/portfolios/submit", () => {
  beforeEach(() => {
    resolveUserMock.mockReset();
    sanityClientMock.client.transaction.mockClear();
    sanityClientMock.transaction.create.mockClear();
    sanityClientMock.transaction.patch.mockClear();
    sanityClientMock.transaction.commit.mockClear();
  });

  it("returns 401 when the resolver short-circuits as unauthorized", async () => {
    resolveUserMock.mockResolvedValue({ kind: "unauthorized", reason: "missing-header" });
    const response = await POST(makeRequest(makeBody()));
    expect(response.status).toBe(401);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when the body is invalid JSON", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    const response = await new Request("http://localhost/api/portfolios/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const result = await POST(response);
    expect(result.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when declaredOverallTier disagrees with the recomputed tier", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    const response = await POST(
      makeRequest(
        makeBody({
          tieringAssessment: fullTiering({ dataStorage: 3 }),
          declaredOverallTier: 1,
        }),
      ),
    );
    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Tier mismatch");
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("creates the project and writes a ChangeLog row per top-level field", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    const response = await POST(makeRequest(makeBody()));
    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok: boolean; projectId: string };
    expect(json.ok).toBe(true);
    expect(typeof json.projectId).toBe("string");
    expect(json.projectId.length).toBeGreaterThan(0);

    expect(sanityClientMock.transaction.commit).toHaveBeenCalledOnce();

    const createCalls = sanityClientMock.transaction.create.mock.calls;
    // First create call is the new project, then ChangeLog rows.
    type CreatedProject = { _type: string; _id: string; name: string; governanceTier: 1 | 2 | 3 };
    const projectCall = createCalls.find(
      (call) => (call as [{ _type: string }])[0]._type === "project",
    );
    expect(projectCall).toBeDefined();
    const project = projectCall![0] as CreatedProject;
    expect(project._id).toBe(json.projectId);
    expect(project.governanceTier).toBe(1);

    type ChangeRow = { _type: string; documentId: string; documentType: string; field: string; userEmail: string };
    const changeRows = createCalls
      .map((call) => (call as [ChangeRow])[0])
      .filter((doc) => doc._type === "changeLog");
    // At minimum: name, description, projectStage, group, directorate,
    // businessAreas, deliveryOwner, businessLead, legalLead, capability,
    // actionPlanLinks, tieringAssessment, governanceTier, surveyDetails,
    // lastUpdatedAt = 15 fields (no updates / additionalCapabilities).
    expect(changeRows.length).toBeGreaterThanOrEqual(13);
    for (const row of changeRows) {
      expect(row.documentType).toBe("project");
      expect(row.documentId).toBe(json.projectId);
      expect(row.userEmail).toBe("viewer@hmcts.net");
    }
    const fields = changeRows.map((row) => row.field);
    expect(fields).toContain("name");
    expect(fields).toContain("governanceTier");
    expect(fields).toContain("tieringAssessment");
    expect(fields).toContain("lastUpdatedAt");
  });

  it("inline-creates new entities with pendingReview=true in the same transaction", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    const response = await POST(
      makeRequest(
        makeBody({
          group: { newName: "Brand New Group" },
          capability: { newName: "Brand New Capability" },
          deliveryOwner: { newPerson: { name: "Jane Doe", email: "jane@hmcts.net" } },
        }),
      ),
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok: boolean; projectId: string };
    expect(json.ok).toBe(true);

    expect(sanityClientMock.transaction.commit).toHaveBeenCalledOnce();

    type Created = { _type: string; name?: string; pendingReview?: boolean; group?: { _ref: string }; _id: string };
    const calls = sanityClientMock.transaction.create.mock.calls.map(
      (call) => (call as [Created])[0],
    );

    const newGroup = calls.find((doc) => doc._type === "group");
    const newCapability = calls.find((doc) => doc._type === "capability");
    const newPerson = calls.find((doc) => doc._type === "person");

    expect(newGroup?.name).toBe("Brand New Group");
    expect(newGroup?.pendingReview).toBe(true);
    expect(newCapability?.name).toBe("Brand New Capability");
    expect(newCapability?.pendingReview).toBe(true);
    expect(newPerson?.name).toBe("Jane Doe");
    expect(newPerson?.pendingReview).toBe(true);

    type ProjectCreated = {
      _type: string;
      group: { _ref: string };
      capability: { _ref: string };
      deliveryOwner: { _ref: string };
    };
    const project = calls.find((doc) => doc._type === "project") as ProjectCreated | undefined;
    expect(project).toBeDefined();
    expect(project!.group._ref).toBe(newGroup!._id);
    expect(project!.capability._ref).toBe(newCapability!._id);
    expect(project!.deliveryOwner._ref).toBe(newPerson!._id);
  });

  it("ignores any client-supplied userEmail and uses the resolver email on ChangeLog rows", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    const response = await POST(
      makeRequest({ ...makeBody(), userEmail: "spoofed@evil.example" }),
    );
    expect(response.status).toBe(200);
    type ChangeRow = { _type: string; userEmail: string };
    const changeRows = sanityClientMock.transaction.create.mock.calls
      .map((call) => (call as [ChangeRow])[0])
      .filter((doc) => doc._type === "changeLog");
    for (const row of changeRows) {
      expect(row.userEmail).toBe("viewer@hmcts.net");
      expect(row.userEmail).not.toBe("spoofed@evil.example");
    }
  });
});
