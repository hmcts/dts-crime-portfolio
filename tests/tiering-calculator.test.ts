import { describe, expect, it } from "vitest";
import { answeredCount, calculateTier } from "@/lib/tiering/calculator";

describe("calculateTier", () => {
  it("returns null when no questions are answered", () => {
    expect(calculateTier({})).toBeNull();
  });

  it("returns 1 when every answered question maps to tier 1", () => {
    expect(
      calculateTier({
        natureOfApplication: 1,
        reach: 1,
        thirdPartyInvolvement: 1,
      }),
    ).toBe(1);
  });

  it("returns 2 when at least one answer is tier 2 and none are tier 3", () => {
    expect(
      calculateTier({
        natureOfApplication: 1,
        reach: 2,
        thirdPartyInvolvement: 1,
      }),
    ).toBe(2);
  });

  it("returns 3 if any answer is tier 3, regardless of others", () => {
    expect(
      calculateTier({
        natureOfApplication: 1,
        typeOfData: 3,
        reach: 2,
      }),
    ).toBe(3);
  });

  it("returns the max across all 10 questions when fully answered", () => {
    expect(
      calculateTier({
        natureOfApplication: 1,
        reach: 1,
        thirdPartyInvolvement: 2,
        ownership: 1,
        publicTrustImplications: 2,
        legalRegulatoryImplications: 1,
        technicalComplexity: 1,
        automatedDecisionMaking: 1,
        typeOfData: 2,
        dataStorage: 1,
      }),
    ).toBe(2);
  });
});

describe("answeredCount", () => {
  it("returns 0 for empty answers", () => {
    expect(answeredCount({})).toBe(0);
  });

  it("counts only answers with valid tier values", () => {
    expect(
      answeredCount({
        natureOfApplication: 1,
        reach: 3,
        thirdPartyInvolvement: undefined,
      }),
    ).toBe(2);
  });
});
