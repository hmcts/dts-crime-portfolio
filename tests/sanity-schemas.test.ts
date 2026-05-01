import { describe, expect, it } from "vitest";
import { schemaTypes } from "@/sanity/schemas";

describe("Sanity schema registry", () => {
  it("exposes the seven core document types", () => {
    const names = schemaTypes.map((schema) => schema.name).sort();
    expect(names).toEqual([
      "action",
      "businessArea",
      "capability",
      "changeLog",
      "directorate",
      "group",
      "person",
    ]);
  });

  it("registers every type as a document", () => {
    for (const schema of schemaTypes) {
      expect(schema.type).toBe("document");
    }
  });
});
