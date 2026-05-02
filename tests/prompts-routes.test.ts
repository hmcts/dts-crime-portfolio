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

import { POST as createPromptRoute } from "@/app/api/prompts/route";
import { POST as upvotePromptRoute } from "@/app/api/prompts/[id]/upvote/route";
import { POST as commentPromptRoute } from "@/app/api/prompts/[id]/comments/route";
import { POST as commentUpvoteRoute } from "@/app/api/prompts/[id]/comments/[commentKey]/upvote/route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface CommentUpvoteRouteContext {
  params: Promise<{ id: string; commentKey: string }>;
}

function makeJsonRequest(url: string, body: unknown, method = "POST"): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeIdContext(id: string): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function makeCommentContext(id: string, commentKey: string): CommentUpvoteRouteContext {
  return { params: Promise.resolve({ id, commentKey }) };
}

function resetMocks() {
  resolveUserMock.mockReset();
  sanityClientMock.client.fetch.mockReset();
  sanityClientMock.client.transaction.mockClear();
  sanityClientMock.transaction.patch.mockClear();
  sanityClientMock.transaction.create.mockClear();
  sanityClientMock.transaction.commit.mockClear();
}

interface ChangeLogRow {
  _type: string;
  documentId: string;
  documentType: string;
  field: string;
  before: string;
  after: string;
  userEmail: string;
  timestamp: string;
}

function changeLogRows(): ChangeLogRow[] {
  return sanityClientMock.transaction.create.mock.calls
    .map((call) => (call as [unknown])[0] as { _type?: string } & Record<string, unknown>)
    .filter((doc) => doc._type === "changeLog") as unknown as ChangeLogRow[];
}

describe("POST /api/prompts", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns 401 when the resolver short-circuits as unauthorized", async () => {
    resolveUserMock.mockResolvedValue({ kind: "unauthorized", reason: "missing-header" });

    const response = await createPromptRoute(
      makeJsonRequest("http://localhost/api/prompts", { title: "x", body: "y" }),
    );

    expect(response.status).toBe(401);
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when the title is missing", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });

    const response = await createPromptRoute(
      makeJsonRequest("http://localhost/api/prompts", { body: "Hello" }),
    );

    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when the body is missing", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });

    const response = await createPromptRoute(
      makeJsonRequest("http://localhost/api/prompts", { title: "Hello" }),
    );

    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("creates a prompt with an existing person reference and writes a ChangeLog row", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "person-1",
      name: "Viewer",
    });

    const response = await createPromptRoute(
      makeJsonRequest("http://localhost/api/prompts", {
        title: "Great prompt",
        summary: "Useful",
        body: "Do the thing",
        tool: "copilot",
        tags: ["#HR", "#Tech", "not-a-real-tag"],
      }),
    );

    expect(response.status).toBe(201);
    const json = (await response.json()) as { id: string };
    expect(typeof json.id).toBe("string");

    expect(sanityClientMock.transaction.commit).toHaveBeenCalledOnce();
    // No inline person create needed when one exists.
    const createdDocs = sanityClientMock.transaction.create.mock.calls.map(
      (call) => (call as [{ _type: string }])[0],
    );
    const personCreates = createdDocs.filter((doc) => doc._type === "person");
    expect(personCreates).toHaveLength(0);

    const promptCreates = createdDocs.filter((doc) => doc._type === "prompt");
    expect(promptCreates).toHaveLength(1);
    const prompt = promptCreates[0] as unknown as {
      title: string;
      tool: string;
      tags: string[];
      author: { _ref: string };
      createdAt: string;
    };
    expect(prompt.title).toBe("Great prompt");
    expect(prompt.tool).toBe("copilot");
    expect(prompt.tags).toEqual(["#HR", "#Tech"]);
    expect(prompt.author._ref).toBe("person-1");
    expect(typeof prompt.createdAt).toBe("string");

    const logs = changeLogRows();
    expect(logs).toHaveLength(1);
    expect(logs[0]!.documentType).toBe("prompt");
    expect(logs[0]!.userEmail).toBe("viewer@hmcts.net");
  });

  it("creates an inline pendingReview Person when none exists", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "newcomer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce(null);

    const response = await createPromptRoute(
      makeJsonRequest("http://localhost/api/prompts", {
        title: "T",
        body: "B",
        tool: "claude",
        tags: [],
      }),
    );

    expect(response.status).toBe(201);
    const createdDocs = sanityClientMock.transaction.create.mock.calls.map(
      (call) => (call as [{ _type: string }])[0],
    );
    const personCreates = createdDocs.filter(
      (doc): doc is { _type: "person"; _id: string; pendingReview: boolean; email: string } =>
        doc._type === "person",
    );
    expect(personCreates).toHaveLength(1);
    expect(personCreates[0]!.pendingReview).toBe(true);
    expect(personCreates[0]!.email).toBe("newcomer@hmcts.net");

    const promptCreates = createdDocs.filter(
      (doc): doc is { _type: "prompt"; author: { _ref: string } } => doc._type === "prompt",
    );
    expect(promptCreates).toHaveLength(1);
    expect(promptCreates[0]!.author._ref).toBe(personCreates[0]!._id);
  });

  it("ignores a userEmail field smuggled in via the body and uses the resolver email", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({ _id: "person-1", name: "V" });

    const response = await createPromptRoute(
      makeJsonRequest("http://localhost/api/prompts", {
        title: "T",
        body: "B",
        tool: "copilot",
        userEmail: "spoofed@evil.example",
      }),
    );

    expect(response.status).toBe(201);
    const log = changeLogRows()[0]!;
    expect(log.userEmail).toBe("viewer@hmcts.net");
  });

  it("returns 400 when the tool is not in the enum", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });

    const response = await createPromptRoute(
      makeJsonRequest("http://localhost/api/prompts", {
        title: "T",
        body: "B",
        tool: "bard",
      }),
    );

    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });
});

describe("POST /api/prompts/[id]/upvote", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns 401 when the resolver short-circuits as unauthorized", async () => {
    resolveUserMock.mockResolvedValue({ kind: "unauthorized", reason: "missing-header" });

    const response = await upvotePromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/upvote", {}),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(401);
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 404 when the prompt does not exist", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce(null);

    const response = await upvotePromptRoute(
      makeJsonRequest("http://localhost/api/prompts/missing/upvote", {}),
      makeIdContext("missing"),
    );

    expect(response.status).toBe(404);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("appends an upvote on first POST and writes one ChangeLog row with documentType=prompt", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      upvotes: [],
    });

    const response = await upvotePromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/upvote", {}),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1, hasUpvote: true });

    expect(sanityClientMock.transaction.patch).toHaveBeenCalledOnce();
    const patchCall = sanityClientMock.transaction.patch.mock.calls[0] as [
      string,
      { set: { upvotes: Array<{ userEmail: string }> } },
    ];
    expect(patchCall[0]).toBe("p1");
    expect(patchCall[1].set.upvotes).toHaveLength(1);
    expect(patchCall[1].set.upvotes[0]!.userEmail).toBe("viewer@hmcts.net");

    const logs = changeLogRows();
    expect(logs).toHaveLength(1);
    expect(logs[0]!.documentId).toBe("p1");
    expect(logs[0]!.documentType).toBe("prompt");
    expect(logs[0]!.field).toBe("upvotes");
    expect(logs[0]!.userEmail).toBe("viewer@hmcts.net");
  });

  it("toggles off — removes the entry when the same user POSTs a second time", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      upvotes: [
        { _key: "k1", userEmail: "viewer@hmcts.net", createdAt: "2025-01-01T00:00:00Z" },
        { _key: "k2", userEmail: "other@hmcts.net", createdAt: "2025-01-02T00:00:00Z" },
      ],
    });

    const response = await upvotePromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/upvote", {}),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1, hasUpvote: false });

    const patchCall = sanityClientMock.transaction.patch.mock.calls[0] as [
      string,
      { set: { upvotes: Array<{ userEmail: string }> } },
    ];
    expect(patchCall[1].set.upvotes).toHaveLength(1);
    expect(patchCall[1].set.upvotes[0]!.userEmail).toBe("other@hmcts.net");
  });

  it("is idempotent — toggling on then off leaves the array as it started", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    // First call: empty -> add
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      upvotes: [],
    });
    const first = await upvotePromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/upvote", {}),
      makeIdContext("p1"),
    );
    expect(first.status).toBe(200);
    expect((await first.json()).count).toBe(1);

    // Second call: now contains the user -> remove
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      upvotes: [
        { _key: "k1", userEmail: "viewer@hmcts.net", createdAt: "2025-01-01T00:00:00Z" },
      ],
    });
    const second = await upvotePromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/upvote", {}),
      makeIdContext("p1"),
    );
    expect(second.status).toBe(200);
    expect((await second.json()).count).toBe(0);

    // Each call writes exactly one ChangeLog row.
    expect(sanityClientMock.transaction.commit).toHaveBeenCalledTimes(2);
  });
});

describe("POST /api/prompts/[id]/comments", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns 401 when the resolver short-circuits as unauthorized", async () => {
    resolveUserMock.mockResolvedValue({ kind: "unauthorized", reason: "missing-header" });

    const response = await commentPromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/comments", { body: "Hi" }),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(401);
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when the comment body is missing", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });

    const response = await commentPromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/comments", {}),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 400 when the comment body is whitespace only", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });

    const response = await commentPromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/comments", { body: "   \n  " }),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 404 when the prompt does not exist", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce(null);

    const response = await commentPromptRoute(
      makeJsonRequest("http://localhost/api/prompts/missing/comments", { body: "Hi" }),
      makeIdContext("missing"),
    );

    expect(response.status).toBe(404);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("appends a comment and writes one ChangeLog row with documentType=prompt and resolver email", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      comments: [
        { _key: "k0", userEmail: "old@hmcts.net", body: "first", createdAt: "2025-01-01T00:00:00Z" },
      ],
    });

    const response = await commentPromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/comments", { body: "Looks good!" }),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      count: number;
      comment: { _key: string; body: string; createdAt: string; parentKey: string | null };
    };
    expect(json.count).toBe(2);
    expect(json.comment.body).toBe("Looks good!");
    expect(json.comment.parentKey).toBeNull();
    expect(typeof json.comment._key).toBe("string");
    // The response shape MUST NOT carry the author's email back to the
    // client — the listing surface keeps that strictly server-side.
    expect(json.comment).not.toHaveProperty("userEmail");

    expect(sanityClientMock.transaction.patch).toHaveBeenCalledOnce();
    const patchCall = sanityClientMock.transaction.patch.mock.calls[0] as [
      string,
      {
        setIfMissing: { comments: unknown[] };
        insert: { after: string; items: Array<{ userEmail: string; body: string }> };
      },
    ];
    expect(patchCall[0]).toBe("p1");
    expect(patchCall[1].insert.items).toHaveLength(1);
    expect(patchCall[1].insert.items[0]!.userEmail).toBe("viewer@hmcts.net");
    expect(patchCall[1].insert.items[0]!.body).toBe("Looks good!");

    const logs = changeLogRows();
    expect(logs).toHaveLength(1);
    expect(logs[0]!.documentId).toBe("p1");
    expect(logs[0]!.documentType).toBe("prompt");
    expect(logs[0]!.field).toBe("comments");
    expect(logs[0]!.userEmail).toBe("viewer@hmcts.net");
  });

  it("ignores a userEmail field smuggled in via the body and uses the resolver email", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      comments: [],
    });

    const response = await commentPromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/comments", {
        body: "Hi",
        userEmail: "spoofed@evil.example",
      }),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(200);
    const patchCall = sanityClientMock.transaction.patch.mock.calls[0] as [
      string,
      { insert: { items: Array<{ userEmail: string }> } },
    ];
    expect(patchCall[1].insert.items[0]!.userEmail).toBe("viewer@hmcts.net");
    expect(patchCall[1].insert.items[0]!.userEmail).not.toBe("spoofed@evil.example");

    const log = changeLogRows()[0]!;
    expect(log.userEmail).toBe("viewer@hmcts.net");
  });

  it("appends a reply when parentKey matches an existing top-level comment", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      comments: [
        {
          _key: "kparent",
          userEmail: "old@hmcts.net",
          body: "Top-level",
          createdAt: "2025-01-01T00:00:00Z",
        },
      ],
    });

    const response = await commentPromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/comments", {
        body: "Replying inline",
        parentKey: "kparent",
      }),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      count: number;
      comment: { _key: string; body: string; parentKey: string | null };
    };
    expect(json.count).toBe(2);
    expect(json.comment.parentKey).toBe("kparent");

    const patchCall = sanityClientMock.transaction.patch.mock.calls[0] as [
      string,
      { insert: { items: Array<{ parentKey?: string; body: string }> } },
    ];
    expect(patchCall[1].insert.items[0]!.parentKey).toBe("kparent");
    expect(patchCall[1].insert.items[0]!.body).toBe("Replying inline");
  });

  it("returns 400 when parentKey does not match any existing comment", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      comments: [
        { _key: "k0", userEmail: "old@hmcts.net", body: "x", createdAt: "2025-01-01T00:00:00Z" },
      ],
    });

    const response = await commentPromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/comments", {
        body: "Replying to nothing",
        parentKey: "does-not-exist",
      }),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("rejects a reply-of-a-reply with 400 (single nesting level only)", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      comments: [
        { _key: "ktop", userEmail: "a@hmcts.net", body: "top", createdAt: "2025-01-01T00:00:00Z" },
        {
          _key: "kreply",
          userEmail: "b@hmcts.net",
          body: "reply",
          createdAt: "2025-01-02T00:00:00Z",
          parentKey: "ktop",
        },
      ],
    });

    const response = await commentPromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/comments", {
        body: "deep",
        parentKey: "kreply",
      }),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(400);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("treats an empty-string parentKey as absent (top-level comment)", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      comments: [],
    });

    const response = await commentPromptRoute(
      makeJsonRequest("http://localhost/api/prompts/p1/comments", {
        body: "Hello",
        parentKey: "",
      }),
      makeIdContext("p1"),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as { comment: { parentKey: string | null } };
    expect(json.comment.parentKey).toBeNull();
  });
});

describe("POST /api/prompts/[id]/comments/[commentKey]/upvote", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns 401 when the resolver short-circuits as unauthorized", async () => {
    resolveUserMock.mockResolvedValue({ kind: "unauthorized", reason: "missing-header" });

    const response = await commentUpvoteRoute(
      new Request("http://localhost/api/prompts/p1/comments/k1/upvote", { method: "POST" }),
      makeCommentContext("p1", "k1"),
    );

    expect(response.status).toBe(401);
    expect(sanityClientMock.client.fetch).not.toHaveBeenCalled();
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 404 when the prompt does not exist", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce(null);

    const response = await commentUpvoteRoute(
      new Request("http://localhost/api/prompts/missing/comments/k1/upvote", { method: "POST" }),
      makeCommentContext("missing", "k1"),
    );

    expect(response.status).toBe(404);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("returns 404 when the commentKey does not exist on the prompt", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      comments: [
        { _key: "k0", userEmail: "x@hmcts.net", body: "x", createdAt: "2025-01-01T00:00:00Z" },
      ],
    });

    const response = await commentUpvoteRoute(
      new Request("http://localhost/api/prompts/p1/comments/missing/upvote", { method: "POST" }),
      makeCommentContext("p1", "missing"),
    );

    expect(response.status).toBe(404);
    expect(sanityClientMock.transaction.commit).not.toHaveBeenCalled();
  });

  it("appends an upvote on first POST and writes one ChangeLog row scoped to the comment", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      comments: [
        {
          _key: "k0",
          userEmail: "author@hmcts.net",
          body: "looks great",
          createdAt: "2025-01-01T00:00:00Z",
        },
      ],
    });

    const response = await commentUpvoteRoute(
      new Request("http://localhost/api/prompts/p1/comments/k0/upvote", { method: "POST" }),
      makeCommentContext("p1", "k0"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1, hasUpvote: true });

    const patchCall = sanityClientMock.transaction.patch.mock.calls[0] as [
      string,
      { set: { comments: Array<{ _key: string; upvotes?: Array<{ userEmail: string }> }> } },
    ];
    expect(patchCall[0]).toBe("p1");
    const target = patchCall[1].set.comments.find((entry) => entry._key === "k0")!;
    expect(target.upvotes).toHaveLength(1);
    expect(target.upvotes![0]!.userEmail).toBe("viewer@hmcts.net");

    const logs = changeLogRows();
    expect(logs).toHaveLength(1);
    expect(logs[0]!.documentId).toBe("p1");
    expect(logs[0]!.documentType).toBe("prompt");
    expect(logs[0]!.field).toContain("k0");
    expect(logs[0]!.userEmail).toBe("viewer@hmcts.net");
  });

  it("toggles off when the same user POSTs a second time (idempotent)", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      comments: [
        {
          _key: "k0",
          userEmail: "author@hmcts.net",
          body: "x",
          createdAt: "2025-01-01T00:00:00Z",
          upvotes: [
            { _key: "u1", userEmail: "viewer@hmcts.net", createdAt: "2025-01-02T00:00:00Z" },
            { _key: "u2", userEmail: "other@hmcts.net", createdAt: "2025-01-03T00:00:00Z" },
          ],
        },
      ],
    });

    const response = await commentUpvoteRoute(
      new Request("http://localhost/api/prompts/p1/comments/k0/upvote", { method: "POST" }),
      makeCommentContext("p1", "k0"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1, hasUpvote: false });

    const patchCall = sanityClientMock.transaction.patch.mock.calls[0] as [
      string,
      { set: { comments: Array<{ _key: string; upvotes?: Array<{ userEmail: string }> }> } },
    ];
    const target = patchCall[1].set.comments.find((entry) => entry._key === "k0")!;
    expect(target.upvotes).toHaveLength(1);
    expect(target.upvotes![0]!.userEmail).toBe("other@hmcts.net");
  });

  it("leaves sibling comments untouched on the patched array", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "viewer@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });
    sanityClientMock.client.fetch.mockResolvedValueOnce({
      _id: "p1",
      comments: [
        {
          _key: "k0",
          userEmail: "author@hmcts.net",
          body: "first",
          createdAt: "2025-01-01T00:00:00Z",
        },
        {
          _key: "k1",
          userEmail: "other@hmcts.net",
          body: "second",
          createdAt: "2025-01-02T00:00:00Z",
        },
      ],
    });

    const response = await commentUpvoteRoute(
      new Request("http://localhost/api/prompts/p1/comments/k1/upvote", { method: "POST" }),
      makeCommentContext("p1", "k1"),
    );

    expect(response.status).toBe(200);
    const patchCall = sanityClientMock.transaction.patch.mock.calls[0] as [
      string,
      {
        set: {
          comments: Array<{
            _key: string;
            upvotes?: Array<{ userEmail: string }>;
            body: string;
          }>;
        };
      },
    ];
    const k0 = patchCall[1].set.comments.find((entry) => entry._key === "k0")!;
    const k1 = patchCall[1].set.comments.find((entry) => entry._key === "k1")!;
    // The untargeted comment is preserved verbatim — including no
    // accidental `upvotes` populated by the route.
    expect(k0.body).toBe("first");
    expect(k0.upvotes).toBeUndefined();
    // The target comment has the new upvote.
    expect(k1.upvotes).toHaveLength(1);
    expect(k1.upvotes![0]!.userEmail).toBe("viewer@hmcts.net");
  });
});
