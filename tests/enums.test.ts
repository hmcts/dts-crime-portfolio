import { describe, expect, it } from "vitest";
import { STAGES, STAGE_LABELS, STAGE_PILL_CLASSES, isStage } from "@/lib/enums/stage";
import { TIERS, TIER_LABELS, isTier, tierLabel } from "@/lib/enums/tier";
import {
  PROGRESS_STATUSES,
  PROGRESS_STATUS_PILL_CLASSES,
  isProgressStatus,
} from "@/lib/enums/progress-status";

describe("Stage enum", () => {
  it("contains every stage from the spec in order", () => {
    expect(STAGES).toEqual(["idea", "scan", "pilot", "scale", "stalled", "sunset"]);
  });

  it("has a label and pill class pair for every stage", () => {
    for (const stage of STAGES) {
      expect(STAGE_LABELS[stage]).toBeTruthy();
      expect(STAGE_PILL_CLASSES[stage].bg).toBeTruthy();
      expect(STAGE_PILL_CLASSES[stage].fg).toBeTruthy();
    }
  });

  it("isStage narrows correctly", () => {
    expect(isStage("pilot")).toBe(true);
    expect(isStage("PILOT")).toBe(false);
    expect(isStage("invented")).toBe(false);
    expect(isStage(undefined)).toBe(false);
  });
});

describe("Tier enum", () => {
  it("contains tiers 1-3", () => {
    expect(TIERS).toEqual([1, 2, 3]);
  });

  it("isTier narrows correctly", () => {
    expect(isTier(1)).toBe(true);
    expect(isTier(2)).toBe(true);
    expect(isTier(3)).toBe(true);
    expect(isTier(0)).toBe(false);
    expect(isTier(4)).toBe(false);
    expect(isTier("1")).toBe(false);
  });

  it("tierLabel returns 'To be completed' when tier is null/undefined", () => {
    expect(tierLabel(null)).toBe("To be completed");
    expect(tierLabel(undefined)).toBe("To be completed");
  });

  it("tierLabel returns the spec-defined label otherwise", () => {
    expect(tierLabel(1)).toBe(TIER_LABELS[1]);
    expect(tierLabel(2)).toBe("Tier 2");
    expect(tierLabel(3)).toBe("Tier 3");
  });
});

describe("ProgressStatus enum", () => {
  it("contains the four spec statuses in order", () => {
    expect(PROGRESS_STATUSES).toEqual([
      "Completed",
      "Significant progress",
      "Some progress",
      "Gap / More work needed",
    ]);
  });

  it("has pill classes for every status", () => {
    for (const status of PROGRESS_STATUSES) {
      expect(PROGRESS_STATUS_PILL_CLASSES[status].bg).toBeTruthy();
      expect(PROGRESS_STATUS_PILL_CLASSES[status].fg).toBeTruthy();
    }
  });

  it("isProgressStatus narrows correctly", () => {
    expect(isProgressStatus("Completed")).toBe(true);
    expect(isProgressStatus("completed")).toBe(false);
    expect(isProgressStatus("Almost done")).toBe(false);
  });
});
