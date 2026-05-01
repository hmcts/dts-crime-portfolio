import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseGalaxyUrl } from "@/lib/galaxy/url";

describe("parseGalaxyUrl", () => {
  it("defaults the lens to capability when missing or unknown", () => {
    expect(parseGalaxyUrl({}).lens).toBe("capability");
    expect(parseGalaxyUrl({ lens: "garbage" }).lens).toBe("capability");
  });

  it("accepts each known lens", () => {
    expect(parseGalaxyUrl({ lens: "stage" }).lens).toBe("stage");
    expect(parseGalaxyUrl({ lens: "business-area" }).lens).toBe("business-area");
    expect(parseGalaxyUrl({ lens: "delivery-area" }).lens).toBe("delivery-area");
    expect(parseGalaxyUrl({ lens: "governance" }).lens).toBe("governance");
  });

  it("parses comma-separated overlays into the canonical order", () => {
    expect(
      parseGalaxyUrl({ overlay: "no-update-30d,compliance-gaps" }).overlays,
    ).toEqual(["compliance-gaps", "no-update-30d"]);
  });

  it("ignores unknown overlay tokens", () => {
    expect(parseGalaxyUrl({ overlay: "compliance-gaps,bogus" }).overlays).toEqual([
      "compliance-gaps",
    ]);
  });

  it("dedupes repeated overlay values", () => {
    expect(
      parseGalaxyUrl({ overlay: ["compliance-gaps", "compliance-gaps,updated-7d"] })
        .overlays,
    ).toEqual(["compliance-gaps", "updated-7d"]);
  });

  it("trims search and reads shared filter params", () => {
    const state = parseGalaxyUrl({
      q: "  voice  ",
      stage: "pilot,scale",
      capability: "cap-1",
      businessArea: ["ba-1", "ba-2"],
      directorate: "dir-1",
    });
    expect(state.search).toBe("voice");
    expect(state.stages).toEqual(["pilot", "scale"]);
    expect(state.capabilityIds).toEqual(["cap-1"]);
    expect(state.businessAreaIds.sort()).toEqual(["ba-1", "ba-2"]);
    expect(state.directorateIds).toEqual(["dir-1"]);
  });

  it("drops invalid stage values", () => {
    const state = parseGalaxyUrl({ stage: "pilot,bogus" });
    expect(state.stages).toEqual(["pilot"]);
  });
});
