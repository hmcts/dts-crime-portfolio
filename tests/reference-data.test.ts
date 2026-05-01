import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  fetchCapabilitiesOnly,
  fetchReferenceData,
  ReferenceDataFetchError,
} from "@/lib/portfolio/referenceData";

interface FakeClient {
  fetch: ReturnType<typeof vi.fn>;
}

type RefOpts = NonNullable<Parameters<typeof fetchReferenceData>[0]>;
type CapOpts = NonNullable<Parameters<typeof fetchCapabilitiesOnly>[0]>;

function refOpts(client: FakeClient, extra: Partial<RefOpts> = {}): RefOpts {
  return { ...extra, client: client as unknown as RefOpts["client"] };
}

function capOpts(client: FakeClient): CapOpts {
  return { client: client as unknown as CapOpts["client"] };
}

function makeClient(returns: Record<string, unknown[]> = {}): FakeClient {
  return {
    fetch: vi.fn(async (query: string) => {
      const match = Object.entries(returns).find(([key]) => query.includes(key));
      return match ? match[1] : [];
    }),
  };
}

describe("fetchReferenceData", () => {
  it("returns empty arrays for every category when Sanity has nothing", async () => {
    const client = makeClient();
    const data = await fetchReferenceData(refOpts(client));
    expect(data).toEqual({
      groups: [],
      directorates: [],
      businessAreas: [],
      people: [],
      capabilities: [],
      actions: [],
    });
  });

  it("excludes pendingReview by default and includes the filter in every user-creatable query", async () => {
    const client = makeClient();
    await fetchReferenceData(refOpts(client));
    const queries = client.fetch.mock.calls.map(([q]) => q as string);
    const userCreatable = queries.filter(
      (q) =>
        q.includes('_type == "group"') ||
        q.includes('_type == "directorate"') ||
        q.includes('_type == "businessArea"') ||
        q.includes('_type == "person"') ||
        q.includes('_type == "capability"'),
    );
    expect(userCreatable).toHaveLength(5);
    for (const q of userCreatable) {
      expect(q).toMatch(/pendingReview != true/);
    }
    const actionQuery = queries.find((q) => q.includes('_type == "action"'));
    expect(actionQuery).toBeDefined();
    expect(actionQuery!).not.toMatch(/pendingReview/);
  });

  it("omits the pendingReview filter when includePending is true", async () => {
    const client = makeClient();
    await fetchReferenceData(refOpts(client, { includePending: true }));
    const queries = client.fetch.mock.calls.map(([q]) => q as string);
    for (const q of queries) {
      expect(q).not.toMatch(/pendingReview != true/);
    }
  });

  it("issues fetches in parallel, not sequentially", async () => {
    const order: string[] = [];
    const client: FakeClient = {
      fetch: vi.fn(async (query: string) => {
        const label = (query.match(/_type == "(\w+)"/) || ["", "?"])[1];
        order.push(`start:${label}`);
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push(`end:${label}`);
        return [];
      }),
    };
    await fetchReferenceData(refOpts(client));
    const starts = order.filter((entry) => entry.startsWith("start:"));
    expect(starts).toHaveLength(6);
    const lastStartIndex = order.lastIndexOf(starts[5]!);
    const firstEndIndex = order.findIndex((entry) => entry.startsWith("end:"));
    expect(firstEndIndex).toBeGreaterThan(lastStartIndex);
  });

  it("wraps a sub-fetch failure in ReferenceDataFetchError with the category name", async () => {
    const client: FakeClient = {
      fetch: vi.fn(async (query: string) => {
        if (query.includes('_type == "person"')) {
          throw new Error("network down");
        }
        return [];
      }),
    };
    const opts = refOpts(client);
    await expect(fetchReferenceData(opts)).rejects.toThrow(ReferenceDataFetchError);

    try {
      await fetchReferenceData(opts);
    } catch (caught) {
      expect(caught).toBeInstanceOf(ReferenceDataFetchError);
      const error = caught as ReferenceDataFetchError;
      expect(error.category).toBe("people");
      expect(error.message).toContain("network down");
    }
  });
});

describe("fetchCapabilitiesOnly", () => {
  it("excludes pendingReview and orders by name", async () => {
    const client: FakeClient = {
      fetch: vi.fn(async () => [{ _id: "c1", name: "General Purpose LLM" }]),
    };
    const result = await fetchCapabilitiesOnly(capOpts(client));
    expect(result).toEqual([{ _id: "c1", name: "General Purpose LLM" }]);
    const query = client.fetch.mock.calls[0]![0] as string;
    expect(query).toMatch(/_type == "capability"/);
    expect(query).toMatch(/pendingReview != true/);
    expect(query).toMatch(/order\(name asc\)/);
  });
});
