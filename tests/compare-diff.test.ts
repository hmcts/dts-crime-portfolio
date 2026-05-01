import { describe, expect, it } from "vitest";

import {
  diffFromChangeLog,
  diffSnapshotAgainstCurrent,
  type ChangeLogRow,
} from "@/lib/compare/diff";
import type { SerialisedProject } from "@/lib/reporting-cuts/serialize";

function row(partial: Partial<ChangeLogRow>): ChangeLogRow {
  return {
    documentId: "p1",
    documentType: "project",
    field: "description",
    before: null,
    after: null,
    userEmail: "editor@hmcts.net",
    timestamp: "2026-02-01T00:00:00Z",
    ...partial,
  };
}

const baseProject = (over: Partial<SerialisedProject>): SerialisedProject => ({
  _id: "p1",
  name: "Project One",
  description: null,
  projectStage: null,
  group: null,
  directorate: null,
  businessAreas: null,
  deliveryOwner: null,
  additionalDeliveryOwners: null,
  businessLead: null,
  legalLead: null,
  capability: null,
  additionalCapabilities: null,
  actionPlanLinks: null,
  governanceTier: null,
  governanceBody: null,
  riskRegister: null,
  dpiaInPlace: null,
  actsInPlace: null,
  mojEthicsFrameworkUse: null,
  githubUrl: null,
  lastUpdatedAt: null,
  ...over,
});

describe("diffFromChangeLog", () => {
  it("collapses multiple changes to the same field into one before/after pair", () => {
    const rows: ChangeLogRow[] = [
      row({
        field: "governanceTier",
        before: JSON.stringify(1),
        after: JSON.stringify(2),
        timestamp: "2026-02-01T00:00:00Z",
      }),
      row({
        field: "governanceTier",
        before: JSON.stringify(2),
        after: JSON.stringify(3),
        timestamp: "2026-03-01T00:00:00Z",
      }),
    ];
    const names = new Map([["p1", "Project One"]]);
    const result = diffFromChangeLog(rows, names);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.changed).toEqual([
      {
        projectId: "p1",
        projectName: "Project One",
        fields: [{ field: "governanceTier", before: 1, after: 3 }],
      },
    ]);
  });

  it("treats _created rows as added and _deleted rows as removed", () => {
    const rows: ChangeLogRow[] = [
      row({
        documentId: "p2",
        field: "_created",
        before: null,
        after: null,
        timestamp: "2026-02-15T00:00:00Z",
      }),
      row({
        documentId: "p3",
        field: "_deleted",
        before: null,
        after: null,
        timestamp: "2026-02-20T00:00:00Z",
      }),
    ];
    const names = new Map([
      ["p2", "Project Two"],
      ["p3", "Project Three"],
    ]);
    const result = diffFromChangeLog(rows, names);
    expect(result.added).toEqual([
      { projectId: "p2", projectName: "Project Two" },
    ]);
    expect(result.removed).toEqual([
      { projectId: "p3", projectName: "Project Three" },
    ]);
    expect(result.changed).toEqual([]);
  });

  it("does not include changed fields for documents that were created or deleted in the window", () => {
    const rows: ChangeLogRow[] = [
      row({
        documentId: "p2",
        field: "_created",
        timestamp: "2026-02-01T00:00:00Z",
      }),
      row({
        documentId: "p2",
        field: "description",
        before: JSON.stringify(null),
        after: JSON.stringify("hello"),
        timestamp: "2026-02-02T00:00:00Z",
      }),
    ];
    const result = diffFromChangeLog(rows, new Map([["p2", "Project Two"]]));
    expect(result.added).toEqual([
      { projectId: "p2", projectName: "Project Two" },
    ]);
    expect(result.changed).toEqual([]);
  });

  it("omits fields where the start and end values are equal", () => {
    const rows: ChangeLogRow[] = [
      row({
        field: "description",
        before: JSON.stringify("a"),
        after: JSON.stringify("b"),
        timestamp: "2026-02-01T00:00:00Z",
      }),
      row({
        field: "description",
        before: JSON.stringify("b"),
        after: JSON.stringify("a"),
        timestamp: "2026-02-10T00:00:00Z",
      }),
    ];
    const result = diffFromChangeLog(rows, new Map([["p1", "Project One"]]));
    expect(result.changed).toEqual([]);
  });
});

describe("diffSnapshotAgainstCurrent", () => {
  it("identifies added, removed, and field-level changes", () => {
    const snapshot: SerialisedProject[] = [
      baseProject({ _id: "p1", name: "Project One", description: "old" }),
      baseProject({ _id: "p2", name: "Project Two" }),
    ];
    const current: SerialisedProject[] = [
      baseProject({ _id: "p1", name: "Project One", description: "new" }),
      baseProject({ _id: "p3", name: "Project Three" }),
    ];

    const result = diffSnapshotAgainstCurrent(snapshot, current);
    expect(result.added).toEqual([
      { projectId: "p3", projectName: "Project Three" },
    ]);
    expect(result.removed).toEqual([
      { projectId: "p2", projectName: "Project Two" },
    ]);
    expect(result.changed).toEqual([
      {
        projectId: "p1",
        projectName: "Project One",
        fields: [{ field: "description", before: "old", after: "new" }],
      },
    ]);
  });

  it("uses snapshot text as before and current text as after for renamed references", () => {
    const snapshot: SerialisedProject[] = [
      baseProject({
        _id: "p1",
        deliveryOwner: { name: "Alice Smith", email: "a@x" },
      }),
    ];
    const current: SerialisedProject[] = [
      baseProject({
        _id: "p1",
        deliveryOwner: { name: "Alice Jones", email: "a@x" },
      }),
    ];
    const result = diffSnapshotAgainstCurrent(snapshot, current);
    expect(result.changed).toEqual([
      {
        projectId: "p1",
        projectName: "Project One",
        fields: [
          {
            field: "deliveryOwner",
            before: { name: "Alice Smith", email: "a@x" },
            after: { name: "Alice Jones", email: "a@x" },
          },
        ],
      },
    ]);
  });

  it("returns empty arrays when nothing differs", () => {
    const snapshot: SerialisedProject[] = [baseProject({ _id: "p1" })];
    const current: SerialisedProject[] = [baseProject({ _id: "p1" })];
    const result = diffSnapshotAgainstCurrent(snapshot, current);
    expect(result).toEqual({ added: [], removed: [], changed: [] });
  });
});
