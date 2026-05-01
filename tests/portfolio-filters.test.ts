import { describe, expect, it } from "vitest";

import {
  emptyPortfolioFilters,
  isPortfolioFiltersEmpty,
  parsePortfolioFilters,
  portfolioFiltersToQueryParams,
} from "@/lib/portfolio/filters";

describe("emptyPortfolioFilters", () => {
  it("returns a fresh empty filter shape", () => {
    expect(emptyPortfolioFilters()).toEqual({
      stages: [],
      groupIds: [],
      directorateIds: [],
      businessAreaIds: [],
      ownerIds: [],
      capabilityIds: [],
      tiers: [],
      actionIds: [],
      search: "",
    });
  });

  it("isPortfolioFiltersEmpty agrees", () => {
    expect(isPortfolioFiltersEmpty(emptyPortfolioFilters())).toBe(true);
  });
});

describe("parsePortfolioFilters", () => {
  it("returns an empty filter shape when no params are supplied", () => {
    expect(parsePortfolioFilters({})).toEqual(emptyPortfolioFilters());
  });

  it("parses comma-separated multi-values for each multi-select", () => {
    const filters = parsePortfolioFilters({
      stage: "pilot,scale",
      group: "g1,g2",
      directorate: "d1",
      businessArea: "ba1,ba2",
      owner: "person-1",
      capability: "cap-1",
      tier: "1,3",
      action: "act-1",
    });
    expect(filters.stages).toEqual(["pilot", "scale"]);
    expect(filters.groupIds).toEqual(["g1", "g2"]);
    expect(filters.directorateIds).toEqual(["d1"]);
    expect(filters.businessAreaIds).toEqual(["ba1", "ba2"]);
    expect(filters.ownerIds).toEqual(["person-1"]);
    expect(filters.capabilityIds).toEqual(["cap-1"]);
    expect(filters.tiers).toEqual([1, 3]);
    expect(filters.actionIds).toEqual(["act-1"]);
  });

  it("parses repeated string array params (?stage=pilot&stage=scale)", () => {
    const filters = parsePortfolioFilters({ stage: ["pilot", "scale"] });
    expect(filters.stages).toEqual(["pilot", "scale"]);
  });

  it("ignores unknown stage values", () => {
    const filters = parsePortfolioFilters({ stage: "pilot,invented" });
    expect(filters.stages).toEqual(["pilot"]);
  });

  it("ignores out-of-range tier values", () => {
    const filters = parsePortfolioFilters({ tier: "0,1,4,3" });
    expect(filters.tiers).toEqual([1, 3]);
  });

  it("trims whitespace and ignores empty entries", () => {
    const filters = parsePortfolioFilters({ group: " g1 ,, g2 ,  " });
    expect(filters.groupIds).toEqual(["g1", "g2"]);
  });

  it("parses search query and trims", () => {
    expect(parsePortfolioFilters({ q: "  authentication  " }).search).toBe("authentication");
    expect(parsePortfolioFilters({ q: ["primary", "secondary"] }).search).toBe("primary");
    expect(parsePortfolioFilters({}).search).toBe("");
  });
});

describe("isPortfolioFiltersEmpty", () => {
  it("returns false when any list filter has a value", () => {
    const filters = { ...emptyPortfolioFilters(), stages: ["pilot"] as const };
    expect(isPortfolioFiltersEmpty({ ...filters, stages: [...filters.stages] })).toBe(false);
  });

  it("returns false when search is non-empty", () => {
    expect(isPortfolioFiltersEmpty({ ...emptyPortfolioFilters(), search: "x" })).toBe(false);
  });
});

describe("portfolioFiltersToQueryParams", () => {
  it("maps every filter array onto the GROQ params and produces an empty search token when no search", () => {
    const filters = emptyPortfolioFilters();
    expect(portfolioFiltersToQueryParams(filters)).toEqual({
      stages: [],
      groupIds: [],
      directorateIds: [],
      businessAreaIds: [],
      ownerIds: [],
      capabilityIds: [],
      tiers: [],
      actionIds: [],
      search: "",
      searchToken: "",
    });
  });

  it("appends a wildcard to the search token so GROQ match prefix-matches", () => {
    const params = portfolioFiltersToQueryParams({
      ...emptyPortfolioFilters(),
      search: "auth",
    });
    expect(params.searchToken).toBe("auth*");
    expect(params.search).toBe("auth");
  });
});
