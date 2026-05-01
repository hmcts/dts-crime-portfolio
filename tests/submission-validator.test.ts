import { describe, expect, it } from "vitest";

import { validateSubmission } from "@/lib/submission/validator";
import { TIERING_QUESTIONS } from "@/lib/tiering/calculator";

function fullTiering(answers: Record<string, 1 | 2 | 3>): Record<string, 1 | 2 | 3> {
  const out: Record<string, 1 | 2 | 3> = {};
  for (const key of TIERING_QUESTIONS) {
    out[key] = answers[key] ?? 1;
  }
  return out;
}

function baseBody(overrides: Record<string, unknown> = {}) {
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
    surveyDetails: { containsPii: false, supplier: "GDS" },
    ...overrides,
  };
}

describe("validateSubmission", () => {
  it("accepts a fully-formed body and returns the recomputed tier", () => {
    const result = validateSubmission(baseBody());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.computedTier).toBe(1);
    expect(result.body.name).toBe("AI Triage");
    expect(result.body.businessAreaIds).toEqual(["ba-1"]);
  });

  it("recomputes the tier as the maximum across all answers", () => {
    const result = validateSubmission(
      baseBody({
        tieringAssessment: fullTiering({ dataStorage: 3, reach: 2 }),
        declaredOverallTier: 3,
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.computedTier).toBe(3);
  });

  it("rejects when declaredOverallTier disagrees with the recomputed tier", () => {
    const result = validateSubmission(
      baseBody({
        tieringAssessment: fullTiering({ dataStorage: 3 }),
        declaredOverallTier: 1,
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Tier mismatch");
    expect(result.details).toBeDefined();
    expect(result.details?.declaredOverallTier).toMatch(/recomputed/);
  });

  it("rejects when fewer than 10 questions are answered", () => {
    const partial = fullTiering({});
    delete (partial as Record<string, unknown>).reach;
    const result = validateSubmission(baseBody({ tieringAssessment: partial }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.details?.tieringAssessment).toMatch(/10 questions/);
  });

  it("rejects an answer outside Tier 1/2/3", () => {
    const tiering = fullTiering({});
    (tiering as Record<string, unknown>).reach = 4;
    const result = validateSubmission(baseBody({ tieringAssessment: tiering }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.details?.["tieringAssessment.reach"]).toBeDefined();
  });

  it("rejects an unknown projectStage", () => {
    const result = validateSubmission(baseBody({ projectStage: "lift-off" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.details?.projectStage).toBeDefined();
  });

  it("requires a non-empty name", () => {
    const result = validateSubmission(baseBody({ name: "  " }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.details?.name).toBe("Required");
  });

  it("accepts inline-create RefSelections via newName", () => {
    const result = validateSubmission(
      baseBody({
        group: { newName: "Brand New Group" },
        capability: { newName: "Brand New Capability" },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.group).toEqual({ newName: "Brand New Group" });
    expect(result.body.capability).toEqual({ newName: "Brand New Capability" });
  });

  it("accepts inline-create person via newPerson", () => {
    const result = validateSubmission(
      baseBody({
        deliveryOwner: { newPerson: { name: "Jane Doe", email: "jane@hmcts.net" } },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.deliveryOwner).toEqual({
      newPerson: { name: "Jane Doe", email: "jane@hmcts.net" },
    });
  });

  it("rejects a newPerson with an invalid email", () => {
    const result = validateSubmission(
      baseBody({
        deliveryOwner: { newPerson: { name: "Jane Doe", email: "not-an-email" } },
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.details?.["deliveryOwner.newPerson.email"]).toBeDefined();
  });

  it("rejects a RefSelection that has neither id nor newName", () => {
    const result = validateSubmission(baseBody({ group: {} }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.details?.group).toBeDefined();
  });

  it("treats empty optional id strings as absent", () => {
    const result = validateSubmission(baseBody({ businessLeadId: "", legalLeadId: "" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.businessLeadId).toBeUndefined();
    expect(result.body.legalLeadId).toBeUndefined();
  });
});
