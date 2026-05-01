import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  groupActionsByStrand,
  summariseByStrand,
} from "@/lib/actionPlan/list";
import type { ActionListItem, Strand } from "@/lib/actionPlan/types";
import type { ProgressStatus } from "@/lib/enums/progress-status";

function action(input: {
  actionNo: string;
  strand: Strand;
  progressStatus: ProgressStatus;
  name?: string;
}): ActionListItem {
  return {
    _id: `id-${input.actionNo}`,
    actionNo: input.actionNo,
    name: input.name ?? input.actionNo,
    strand: input.strand,
    progressStatus: input.progressStatus,
    priority: null,
    publishedStrategyUrl: null,
    linkedProjectsCount: 0,
  };
}

describe("summariseByStrand", () => {
  it("returns three summaries in canonical strand order", () => {
    const summaries = summariseByStrand([]);
    expect(summaries.map((s) => s.strand)).toEqual([
      "1. Foundations",
      "2. Embed",
      "3. People & Partners",
    ]);
    for (const summary of summaries) {
      expect(summary.total).toBe(0);
      for (const status of Object.values(summary.counts)) {
        expect(status).toBe(0);
      }
    }
  });

  it("counts actions by strand and progress status", () => {
    const actions: ActionListItem[] = [
      action({ actionNo: "1.1", strand: "1. Foundations", progressStatus: "Completed" }),
      action({ actionNo: "1.2", strand: "1. Foundations", progressStatus: "Some progress" }),
      action({
        actionNo: "1.3",
        strand: "1. Foundations",
        progressStatus: "Gap / More work needed",
      }),
      action({
        actionNo: "2.1",
        strand: "2. Embed",
        progressStatus: "Significant progress",
      }),
    ];
    const summaries = summariseByStrand(actions);
    const foundations = summaries.find((s) => s.strand === "1. Foundations")!;
    expect(foundations.total).toBe(3);
    expect(foundations.counts.Completed).toBe(1);
    expect(foundations.counts["Some progress"]).toBe(1);
    expect(foundations.counts["Gap / More work needed"]).toBe(1);
    expect(foundations.counts["Significant progress"]).toBe(0);

    const embed = summaries.find((s) => s.strand === "2. Embed")!;
    expect(embed.total).toBe(1);
    expect(embed.counts["Significant progress"]).toBe(1);

    const people = summaries.find((s) => s.strand === "3. People & Partners")!;
    expect(people.total).toBe(0);
  });
});

describe("groupActionsByStrand", () => {
  it("places each action under its strand and preserves order", () => {
    const actions: ActionListItem[] = [
      action({ actionNo: "1.1", strand: "1. Foundations", progressStatus: "Completed" }),
      action({ actionNo: "2.1", strand: "2. Embed", progressStatus: "Some progress" }),
      action({ actionNo: "1.2", strand: "1. Foundations", progressStatus: "Some progress" }),
    ];
    const grouped = groupActionsByStrand(actions);
    expect(grouped["1. Foundations"].map((a) => a.actionNo)).toEqual(["1.1", "1.2"]);
    expect(grouped["2. Embed"].map((a) => a.actionNo)).toEqual(["2.1"]);
    expect(grouped["3. People & Partners"]).toEqual([]);
  });
});
