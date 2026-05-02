import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  deserialiseSnapshot,
  serializePortfolioForSnapshot,
  SNAPSHOT_QUERY,
} from "@/lib/reporting-cuts/serialize";

describe("serializePortfolioForSnapshot", () => {
  it("queries with the resolved-reference SNAPSHOT_QUERY and returns the JSON-encoded list", async () => {
    const fetchMock = vi.fn().mockResolvedValue([
      {
        _id: "p1",
        name: "Project One",
        description: "desc",
        projectStage: "pilot",
        group: "Group A",
        directorate: "Directorate Alpha",
        businessAreas: ["BA1"],
        deliveryOwner: { name: "Alice", email: "alice@x" },
        capability: "Cap",
      },
    ]);
    const client = { fetch: fetchMock } as unknown as Parameters<
      typeof serializePortfolioForSnapshot
    >[0];

    const json = await serializePortfolioForSnapshot(client);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]![0]).toBe(SNAPSHOT_QUERY);

    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].group).toBe("Group A");
    expect(parsed[0].deliveryOwner).toEqual({ name: "Alice", email: "alice@x" });
    // No raw _ref in the output.
    expect(json).not.toMatch(/_ref/);
  });

  it("treats null/missing query results as an empty array", async () => {
    const fetchMock = vi.fn().mockResolvedValue(null);
    const client = { fetch: fetchMock } as unknown as Parameters<
      typeof serializePortfolioForSnapshot
    >[0];
    const json = await serializePortfolioForSnapshot(client);
    expect(json).toBe("[]");
  });
});

describe("deserialiseSnapshot", () => {
  it("round-trips through JSON", () => {
    const json = JSON.stringify([{ _id: "p1", name: "x" }]);
    expect(deserialiseSnapshot(json)).toEqual([{ _id: "p1", name: "x" }]);
  });

  it("returns an empty array for empty input", () => {
    expect(deserialiseSnapshot("")).toEqual([]);
  });

  it("returns an empty array for non-array JSON", () => {
    expect(deserialiseSnapshot("{}")).toEqual([]);
  });
});
