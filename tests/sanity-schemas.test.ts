import { describe, expect, it } from "vitest";
import { schemaTypes } from "@/sanity/schemas";
import { TIERING_QUESTIONS } from "@/lib/tiering/calculator";
import { FAQ_SECTIONS } from "@/sanity/schemas/documents/faq";

describe("Sanity schema registry", () => {
  it("registers every expected document and embedded object", () => {
    const names = schemaTypes.map((schema) => schema.name).sort();
    expect(names).toEqual([
      "action",
      "businessArea",
      "capability",
      "changeLog",
      "directorate",
      "event",
      "faq",
      "group",
      "learningItem",
      "person",
      "previewSession",
      "project",
      "projectUpdate",
      "prompt",
      "promptComment",
      "promptUpvote",
      "reminderSend",
      "reportingCut",
      "surveyDetails",
      "tieringAssessment",
      "tooltipExplainer",
    ]);
  });

  it("classifies every type as document or object", () => {
    for (const schema of schemaTypes) {
      expect(["document", "object"]).toContain(schema.type);
    }
  });
});

describe("Tiering assessment schema", () => {
  it("has one field per tiering calculator question, in the same order", () => {
    const tiering = schemaTypes.find((schema) => schema.name === "tieringAssessment");
    expect(tiering).toBeDefined();
    const fields = (tiering as { fields?: { name: string }[] }).fields ?? [];
    expect(fields.map((f) => f.name)).toEqual([...TIERING_QUESTIONS]);
  });
});

describe("FAQ schema", () => {
  it("exposes the ten spec-defined sections in order", () => {
    expect(FAQ_SECTIONS).toEqual([
      "1. Getting started",
      "2. Using AI tools effectively",
      "3. Acceptable use",
      "4. Context and knowledge",
      "5. Data security and privacy",
      "6. Copyright",
      "7. Ethics and public service values",
      "8. Environment",
      "9. Workforce and responsibility",
      "10. Overall AI strategy and portfolio",
    ]);
  });
});
