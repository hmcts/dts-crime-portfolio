import { describe, expect, it } from "vitest";
import { schemaTypes } from "@/sanity/schemas";
import { TIERING_QUESTIONS } from "@/lib/tiering/calculator";

describe("Sanity schema registry", () => {
  it("registers every expected document and embedded object", () => {
    const names = schemaTypes.map((schema) => schema.name).sort();
    expect(names).toEqual([
      "action",
      "businessArea",
      "capability",
      "changeLog",
      "directorate",
      "editorAccess",
      "event",
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

