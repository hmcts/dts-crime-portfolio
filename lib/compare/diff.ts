/**
 * Pure diff helpers for the compare endpoint. All Sanity I/O happens in the
 * route; these functions only operate on already-fetched data so they are
 * trivially testable.
 *
 * Spec: openspec/specs/compare-mode/spec.md (Compare endpoint, ChangeLog-
 * derived diff for date ranges, Snapshots capture resolved text).
 */
import type { SerialisedProject } from "@/lib/reporting-cuts/serialize";

export interface FieldDiff {
  field: string;
  before: unknown;
  after: unknown;
}

export interface ChangedEntry {
  projectId: string;
  projectName: string;
  fields: FieldDiff[];
}

export interface AddedRemovedEntry {
  projectId: string;
  projectName: string;
}

export interface CompareResult {
  added: AddedRemovedEntry[];
  removed: AddedRemovedEntry[];
  changed: ChangedEntry[];
}

/** Single ChangeLog row — `before`/`after` are JSON-encoded strings. */
export interface ChangeLogRow {
  documentId: string;
  documentType: string;
  field: string;
  before: string | null;
  after: string | null;
  userEmail: string;
  timestamp: string;
}

/**
 * Build the `added`/`removed`/`changed` shape from a list of ChangeLog rows
 * spanning [from, to]. `projectNames` maps the current project id to its
 * latest known name so the response carries readable labels.
 *
 * Project creation is detected by a row with `field === "_created"` and
 * deletion by `field === "_deleted"`. Other rows are treated as field-level
 * mutations and collapsed per (documentId, field) — earliest `before`,
 * latest `after`. No-op pairs (before === after) are omitted.
 */
export function diffFromChangeLog(
  rows: ChangeLogRow[],
  projectNames: Map<string, string>,
): CompareResult {
  const sorted = [...rows].sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
  );

  const created = new Set<string>();
  const deleted = new Set<string>();

  // Per (docId, field): first `before` value (earliest in the window) and
  // last `after` value (latest in the window).
  const firstBefore = new Map<string, unknown>();
  const lastAfter = new Map<string, unknown>();

  for (const row of sorted) {
    if (row.documentType !== "project") continue;
    if (row.field === "_created") {
      created.add(row.documentId);
      continue;
    }
    if (row.field === "_deleted") {
      deleted.add(row.documentId);
      continue;
    }
    const key = `${row.documentId}::${row.field}`;
    if (!firstBefore.has(key)) {
      firstBefore.set(key, decode(row.before));
    }
    lastAfter.set(key, decode(row.after));
  }

  const added: AddedRemovedEntry[] = [];
  const removed: AddedRemovedEntry[] = [];
  for (const id of created) {
    if (deleted.has(id)) continue; // created and removed within window — net no-op
    added.push({ projectId: id, projectName: projectNames.get(id) ?? id });
  }
  for (const id of deleted) {
    if (created.has(id)) continue;
    removed.push({ projectId: id, projectName: projectNames.get(id) ?? id });
  }

  // Group field diffs by document, skipping documents that were created
  // or removed in the window — those go in added/removed instead.
  const changedByDoc = new Map<string, FieldDiff[]>();
  for (const [key, before] of firstBefore.entries()) {
    const sep = key.indexOf("::");
    const docId = key.slice(0, sep);
    const field = key.slice(sep + 2);
    if (created.has(docId) || deleted.has(docId)) continue;
    const after = lastAfter.get(key);
    if (deepEqual(before, after)) continue;
    if (!changedByDoc.has(docId)) changedByDoc.set(docId, []);
    changedByDoc.get(docId)!.push({ field, before, after });
  }

  const changed: ChangedEntry[] = [];
  for (const [docId, fields] of changedByDoc.entries()) {
    fields.sort((a, b) => a.field.localeCompare(b.field));
    changed.push({
      projectId: docId,
      projectName: projectNames.get(docId) ?? docId,
      fields,
    });
  }
  changed.sort((a, b) => a.projectName.localeCompare(b.projectName));
  added.sort((a, b) => a.projectName.localeCompare(b.projectName));
  removed.sort((a, b) => a.projectName.localeCompare(b.projectName));

  return { added, removed, changed };
}

/**
 * Diff a saved snapshot against the current portfolio. `before` is the
 * snapshot value, `after` is the current value. Identifies added projects
 * (in current but not snapshot), removed (in snapshot but not current), and
 * field-level diffs for projects in both.
 */
export function diffSnapshotAgainstCurrent(
  snapshot: SerialisedProject[],
  current: SerialisedProject[],
): CompareResult {
  const snapById = new Map<string, SerialisedProject>();
  const curById = new Map<string, SerialisedProject>();
  for (const p of snapshot) snapById.set(p._id, p);
  for (const p of current) curById.set(p._id, p);

  const added: AddedRemovedEntry[] = [];
  const removed: AddedRemovedEntry[] = [];
  const changed: ChangedEntry[] = [];

  for (const [id, cur] of curById.entries()) {
    if (!snapById.has(id)) {
      added.push({ projectId: id, projectName: cur.name });
    }
  }
  for (const [id, snap] of snapById.entries()) {
    if (!curById.has(id)) {
      removed.push({ projectId: id, projectName: snap.name });
    }
  }

  for (const [id, cur] of curById.entries()) {
    const snap = snapById.get(id);
    if (!snap) continue;
    const fields = diffProjectFields(snap, cur);
    if (fields.length > 0) {
      changed.push({ projectId: id, projectName: cur.name, fields });
    }
  }

  added.sort((a, b) => a.projectName.localeCompare(b.projectName));
  removed.sort((a, b) => a.projectName.localeCompare(b.projectName));
  changed.sort((a, b) => a.projectName.localeCompare(b.projectName));
  return { added, removed, changed };
}

const FIELDS_TO_COMPARE: ReadonlyArray<keyof SerialisedProject> = [
  "name",
  "description",
  "projectStage",
  "group",
  "directorate",
  "businessAreas",
  "deliveryOwner",
  "additionalDeliveryOwners",
  "businessLead",
  "legalLead",
  "capability",
  "additionalCapabilities",
  "actionPlanLinks",
  "governanceTier",
  "governanceBody",
  "riskRegister",
  "dpiaInPlace",
  "actsInPlace",
  "mojEthicsFrameworkUse",
  "githubUrl",
];

function diffProjectFields(
  before: SerialisedProject,
  after: SerialisedProject,
): FieldDiff[] {
  const out: FieldDiff[] = [];
  for (const field of FIELDS_TO_COMPARE) {
    const b = before[field] ?? null;
    const a = after[field] ?? null;
    if (!deepEqual(b, a)) {
      out.push({ field, before: b, after: a });
    }
  }
  return out;
}

function decode(value: string | null): unknown {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const k of keys) {
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}
