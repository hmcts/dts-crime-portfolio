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

import { PATCH } from "@/app/api/portfolios/[id]/route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/portfolios/project-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeContext(id: string): RouteContext {
  return { params: Promise.resolve({ id }) };
}

const ADMIN = {
  kind: "authorized" as const,
  email: "admin@hmcts.net",
  isAdmin: true,
  editableProjects: [] as string[],
};
const EDITOR_FOR_PROJECT_1 = {
  kind: "authorized" as const,
  email: "editor@hmcts.net",
  isAdmin: false,
  editableProjects: ["project-1"],
};
const EDITOR_FOR_OTHER_PROJECT = {
  kind: "authorized" as const,
  email: "editor@hmcts.net",
  isAdmin: false,
  editableProjects: ["project-other"],
};

describe("PATCH /api/portfolios/[id]", () => {
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
    const response = await PATCH(
      makeRequest({ description: "x" }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(401);
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 403 when the user is an Editor for a different project", async () => {
    resolveUserMock.mockResolvedValue(EDITOR_FOR_OTHER_PROJECT);
    const response = await PATCH(
      makeRequest({ description: "x" }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(403);
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when an enum field has an invalid value", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    const response = await PATCH(
      makeRequest({ riskRegister: "definitely-not-a-value" }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when the body has no editable fields", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    const response = await PATCH(makeRequest({}), makeContext("project-1"));
    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when description is the wrong type", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    const response = await PATCH(
      makeRequest({ description: 42 }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 when no project exists with that id", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    sanityClientMock.client.fetch.mockResolvedValueOnce(null);
    const response = await PATCH(
      makeRequest({ description: "x" }),
      makeContext("ghost-project"),
    );
    expect(response.status).toBe(404);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("allows an Admin to edit any project and writes one ChangeLog row per modified field", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "project-1",
      description: "old description",
      governanceBody: "old body",
      riskRegister: "no",
      dpiaInPlace: null,
      actsInPlace: null,
      mojEthicsFrameworkUse: null,
      githubUrl: null,
    });

    const response = await PATCH(
      makeRequest({
        description: "new description",
        governanceBody: "old body", // unchanged — no row
        riskRegister: "yes",
      }),
      makeContext("project-1"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(sanityClientMock.transaction.patch).toHaveBeenCalledTimes(1);
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
      expect(row.documentId).toBe("project-1");
      expect(row.documentType).toBe("project");
      expect(row.userEmail).toBe("admin@hmcts.net");
    }
    const fields = created.map((row) => row.field).sort();
    expect(fields).toEqual(["description", "riskRegister"]);

    const desc = created.find((row) => row.field === "description")!;
    expect(JSON.parse(desc.before)).toBe("old description");
    expect(JSON.parse(desc.after)).toBe("new description");

    const risk = created.find((row) => row.field === "riskRegister")!;
    expect(JSON.parse(risk.before)).toBe("no");
    expect(JSON.parse(risk.after)).toBe("yes");

    // Every patch call should be against project-1 — confirms the set
    // payload includes lastUpdatedAt (we rely on the whole-set patch shape).
    const patchCall = sanityClientMock.transaction.patch.mock.calls[0]!;
    expect(patchCall[0]).toBe("project-1");
    const setPayload = patchCall[1] as { set: Record<string, unknown> };
    expect(setPayload.set.description).toBe("new description");
    expect(setPayload.set.riskRegister).toBe("yes");
    expect(typeof setPayload.set.lastUpdatedAt).toBe("string");
  });

  it("allows an Editor for this project to save", async () => {
    resolveUserMock.mockResolvedValue(EDITOR_FOR_PROJECT_1);
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "project-1",
      description: "old",
      governanceBody: null,
      riskRegister: null,
      dpiaInPlace: null,
      actsInPlace: null,
      mojEthicsFrameworkUse: null,
      githubUrl: null,
    });

    const response = await PATCH(
      makeRequest({ description: "new" }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(200);
    expect(sanityClientMock.transaction.create).toHaveBeenCalledTimes(1);
    const createdRow = sanityClientMock.transaction.create.mock.calls[0]![0] as {
      userEmail: string;
    };
    expect(createdRow.userEmail).toBe("editor@hmcts.net");
  });

  it("appends a new update wrapped as Portable Text with server-side _key, timestamp, and authorEmail", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "project-1",
      description: null,
      governanceBody: null,
      riskRegister: null,
      dpiaInPlace: null,
      actsInPlace: null,
      mojEthicsFrameworkUse: null,
      githubUrl: null,
    });

    const before = Date.now();

    const response = await PATCH(
      makeRequest({
        addUpdate: {
          title: "Pilot complete",
          bodyText: "We finished the pilot.",
        },
      }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(200);

    expect(sanityClientMock.transaction.create).toHaveBeenCalledTimes(1);
    const updatesRow = sanityClientMock.transaction.create.mock.calls[0]![0] as {
      field: string;
      after: string;
    };
    expect(updatesRow.field).toBe("updates");
    const after = JSON.parse(updatesRow.after) as {
      _key: string;
      _type: string;
      title: string;
      authorEmail: string;
      timestamp: string;
      body: Array<{ _type: string; children: Array<{ text: string }> }>;
    };
    expect(after._type).toBe("projectUpdate");
    expect(typeof after._key).toBe("string");
    expect(after._key.length).toBeGreaterThan(0);
    expect(after.title).toBe("Pilot complete");
    expect(after.authorEmail).toBe("admin@hmcts.net");
    const tsMs = new Date(after.timestamp).getTime();
    expect(tsMs).toBeGreaterThanOrEqual(before);
    expect(tsMs).toBeLessThanOrEqual(Date.now());
    expect(after.body[0]!._type).toBe("block");
    expect(after.body[0]!.children[0]!.text).toBe("We finished the pilot.");

    // Two patch calls: one for the field set, one for the array append.
    expect(sanityClientMock.transaction.patch).toHaveBeenCalledTimes(2);
  });

  it("ignores a userEmail field smuggled in via the body and uses the resolver email", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "project-1",
      description: "old",
      governanceBody: null,
      riskRegister: null,
      dpiaInPlace: null,
      actsInPlace: null,
      mojEthicsFrameworkUse: null,
      githubUrl: null,
    });

    const response = await PATCH(
      makeRequest({
        description: "new",
        userEmail: "spoofed@evil.example",
      }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(200);
    const created = sanityClientMock.transaction.create.mock.calls[0]![0] as {
      userEmail: string;
    };
    expect(created.userEmail).toBe("admin@hmcts.net");
    expect(created.userEmail).not.toBe("spoofed@evil.example");
  });

  it("does not write any ChangeLog row when supplied values match the current state", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "project-1",
      description: "same",
      governanceBody: null,
      riskRegister: null,
      dpiaInPlace: null,
      actsInPlace: null,
      mojEthicsFrameworkUse: null,
      githubUrl: null,
    });

    const response = await PATCH(
      makeRequest({ description: "same" }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(200);
    expect(sanityClientMock.transaction.create).not.toHaveBeenCalled();
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when projectStage is invalid", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    const response = await PATCH(
      makeRequest({ projectStage: "moonshot" }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when name is an empty string", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    const response = await PATCH(
      makeRequest({ name: "   " }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when an array reference is malformed", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    const response = await PATCH(
      makeRequest({ businessAreaIds: ["a", 42, "b"] }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(400);
  });

  it("logs a single-reference change and writes a typed reference object", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "project-1",
      name: "P",
      description: null,
      projectStage: "pilot",
      groupRef: null,
      directorateRef: null,
      businessAreaRefs: null,
      deliveryOwnerRef: "person-old",
      businessLeadRef: null,
      legalLeadRef: null,
      capabilityRef: null,
      additionalCapabilityRefs: null,
      actionPlanLinkRefs: null,
      governanceBody: null,
      riskRegister: null,
      dpiaInPlace: null,
      actsInPlace: null,
      mojEthicsFrameworkUse: null,
      githubUrl: null,
    });

    const response = await PATCH(
      makeRequest({ deliveryOwnerId: "person-new" }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(200);

    const patchCall = sanityClientMock.transaction.patch.mock.calls[0]!;
    const setPayload = patchCall[1] as { set: Record<string, unknown> };
    expect(setPayload.set.deliveryOwner).toEqual({
      _type: "reference",
      _ref: "person-new",
    });

    expect(sanityClientMock.transaction.create).toHaveBeenCalledTimes(1);
    const created = sanityClientMock.transaction.create.mock.calls[0]![0] as {
      field: string;
      before: string;
      after: string;
    };
    expect(created.field).toBe("deliveryOwner");
    expect(JSON.parse(created.before)).toBe("person-old");
    expect(JSON.parse(created.after)).toBe("person-new");
  });

  it("unsets a single reference when null is supplied", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "project-1",
      name: "P",
      description: null,
      projectStage: "pilot",
      groupRef: null,
      directorateRef: null,
      businessAreaRefs: null,
      deliveryOwnerRef: "person-old",
      businessLeadRef: null,
      legalLeadRef: null,
      capabilityRef: null,
      additionalCapabilityRefs: null,
      actionPlanLinkRefs: null,
      governanceBody: null,
      riskRegister: null,
      dpiaInPlace: null,
      actsInPlace: null,
      mojEthicsFrameworkUse: null,
      githubUrl: null,
    });

    const response = await PATCH(
      makeRequest({ deliveryOwnerId: null }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(200);
    // The unset is issued as a separate patch call.
    expect(sanityClientMock.transaction.patch).toHaveBeenCalledTimes(2);
    const unsetCall = sanityClientMock.transaction.patch.mock.calls[1]!;
    expect(unsetCall[1]).toEqual({ unset: ["deliveryOwner"] });
  });

  it("replaces an array reference and logs the field once", async () => {
    resolveUserMock.mockResolvedValue(ADMIN);
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "project-1",
      name: "P",
      description: null,
      projectStage: "pilot",
      groupRef: null,
      directorateRef: null,
      businessAreaRefs: ["area-1"],
      deliveryOwnerRef: null,
      businessLeadRef: null,
      legalLeadRef: null,
      capabilityRef: null,
      additionalCapabilityRefs: null,
      actionPlanLinkRefs: null,
      governanceBody: null,
      riskRegister: null,
      dpiaInPlace: null,
      actsInPlace: null,
      mojEthicsFrameworkUse: null,
      githubUrl: null,
    });

    const response = await PATCH(
      makeRequest({ businessAreaIds: ["area-1", "area-2"] }),
      makeContext("project-1"),
    );
    expect(response.status).toBe(200);

    const patchCall = sanityClientMock.transaction.patch.mock.calls[0]!;
    const setPayload = patchCall[1] as { set: Record<string, unknown> };
    const next = setPayload.set.businessAreas as Array<{
      _type: string;
      _ref: string;
      _key: string;
    }>;
    expect(next).toHaveLength(2);
    expect(next[0]!._type).toBe("reference");
    expect(next[0]!._ref).toBe("area-1");
    expect(typeof next[0]!._key).toBe("string");
    expect(next[1]!._ref).toBe("area-2");

    expect(sanityClientMock.transaction.create).toHaveBeenCalledTimes(1);
    const created = sanityClientMock.transaction.create.mock.calls[0]![0] as {
      field: string;
    };
    expect(created.field).toBe("businessAreas");
  });
});
