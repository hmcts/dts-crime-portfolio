import "server-only";

import { NextResponse } from "next/server";
import type { PortableTextBlock } from "@portabletext/types";

import { resolveUser } from "@/lib/auth/resolver";
import { STAGES, isStage, type Stage } from "@/lib/enums/stage";
import { getSanityClient } from "@/lib/sanity/client";
import {
  commitWithChangeLog,
  type FieldChange,
} from "@/lib/sanity/transaction";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface SanityRef {
  _ref: string;
  _type: "reference";
  _key?: string;
}

interface ProjectForPatch {
  _id: string;
  name: string | null;
  description: string | null;
  projectStage: Stage | null;
  groupRef: string | null;
  directorateRef: string | null;
  businessAreaRefs: string[] | null;
  deliveryOwnerRef: string | null;
  businessLeadRef: string | null;
  legalLeadRef: string | null;
  capabilityRef: string | null;
  additionalCapabilityRefs: string[] | null;
  actionPlanLinkRefs: string[] | null;
  governanceBody: string | null;
  riskRegister: string | null;
  dpiaInPlace: string | null;
  actsInPlace: string | null;
  mojEthicsFrameworkUse: string | null;
  githubUrl: string | null;
}

const PROJECT_FOR_PATCH_QUERY = /* groq */ `
  *[_type == "project" && _id == $id][0] {
    _id,
    name,
    description,
    projectStage,
    "groupRef": group._ref,
    "directorateRef": directorate._ref,
    "businessAreaRefs": businessAreas[]._ref,
    "deliveryOwnerRef": deliveryOwner._ref,
    "businessLeadRef": businessLead._ref,
    "legalLeadRef": legalLead._ref,
    "capabilityRef": capability._ref,
    "additionalCapabilityRefs": additionalCapabilities[]._ref,
    "actionPlanLinkRefs": actionPlanLinks[]._ref,
    governanceBody,
    riskRegister,
    dpiaInPlace,
    actsInPlace,
    mojEthicsFrameworkUse,
    githubUrl
  }
`;

const RISK_REGISTER_VALUES = ["yes", "no", "unknown"] as const;
const ASSURANCE_STATUS_VALUES = [
  "complete",
  "in-progress",
  "not-required",
  "missing",
] as const;
const ETHICS_FRAMEWORK_VALUES = ["yes", "no", "in-progress", "unknown"] as const;

type RiskRegisterValue = (typeof RISK_REGISTER_VALUES)[number];
type AssuranceStatusValue = (typeof ASSURANCE_STATUS_VALUES)[number];
type EthicsFrameworkValue = (typeof ETHICS_FRAMEWORK_VALUES)[number];

interface AddUpdateInput {
  title: string;
  bodyText: string;
}

interface PatchBody {
  name?: string;
  description?: string | null;
  projectStage?: Stage;
  groupId?: string | null;
  directorateId?: string | null;
  businessAreaIds?: string[];
  deliveryOwnerId?: string | null;
  businessLeadId?: string | null;
  legalLeadId?: string | null;
  capabilityId?: string | null;
  additionalCapabilityIds?: string[];
  actionPlanLinkIds?: string[];
  governanceBody?: string | null;
  riskRegister?: RiskRegisterValue | null;
  dpiaInPlace?: AssuranceStatusValue | null;
  actsInPlace?: AssuranceStatusValue | null;
  mojEthicsFrameworkUse?: EthicsFrameworkValue | null;
  githubUrl?: string | null;
  addUpdate?: AddUpdateInput;
}

const STRING_OR_NULL_FIELDS = ["description", "governanceBody", "githubUrl"] as const;

const ENUM_FIELDS: Array<
  | { name: "riskRegister"; values: typeof RISK_REGISTER_VALUES }
  | { name: "dpiaInPlace"; values: typeof ASSURANCE_STATUS_VALUES }
  | { name: "actsInPlace"; values: typeof ASSURANCE_STATUS_VALUES }
  | { name: "mojEthicsFrameworkUse"; values: typeof ETHICS_FRAMEWORK_VALUES }
> = [
  { name: "riskRegister", values: RISK_REGISTER_VALUES },
  { name: "dpiaInPlace", values: ASSURANCE_STATUS_VALUES },
  { name: "actsInPlace", values: ASSURANCE_STATUS_VALUES },
  { name: "mojEthicsFrameworkUse", values: ETHICS_FRAMEWORK_VALUES },
];

interface SingleRefField {
  bodyKey:
    | "groupId"
    | "directorateId"
    | "deliveryOwnerId"
    | "businessLeadId"
    | "legalLeadId"
    | "capabilityId";
  fieldName:
    | "group"
    | "directorate"
    | "deliveryOwner"
    | "businessLead"
    | "legalLead"
    | "capability";
  currentKey:
    | "groupRef"
    | "directorateRef"
    | "deliveryOwnerRef"
    | "businessLeadRef"
    | "legalLeadRef"
    | "capabilityRef";
}

const SINGLE_REF_FIELDS: SingleRefField[] = [
  { bodyKey: "groupId", fieldName: "group", currentKey: "groupRef" },
  { bodyKey: "directorateId", fieldName: "directorate", currentKey: "directorateRef" },
  { bodyKey: "deliveryOwnerId", fieldName: "deliveryOwner", currentKey: "deliveryOwnerRef" },
  { bodyKey: "businessLeadId", fieldName: "businessLead", currentKey: "businessLeadRef" },
  { bodyKey: "legalLeadId", fieldName: "legalLead", currentKey: "legalLeadRef" },
  { bodyKey: "capabilityId", fieldName: "capability", currentKey: "capabilityRef" },
];

interface ArrayRefField {
  bodyKey: "businessAreaIds" | "additionalCapabilityIds" | "actionPlanLinkIds";
  fieldName: "businessAreas" | "additionalCapabilities" | "actionPlanLinks";
  currentKey: "businessAreaRefs" | "additionalCapabilityRefs" | "actionPlanLinkRefs";
}

const ARRAY_REF_FIELDS: ArrayRefField[] = [
  { bodyKey: "businessAreaIds", fieldName: "businessAreas", currentKey: "businessAreaRefs" },
  {
    bodyKey: "additionalCapabilityIds",
    fieldName: "additionalCapabilities",
    currentKey: "additionalCapabilityRefs",
  },
  { bodyKey: "actionPlanLinkIds", fieldName: "actionPlanLinks", currentKey: "actionPlanLinkRefs" },
];

/**
 * PATCH /api/portfolios/[id]
 *
 * Inline-edit endpoint for the project dossier. Accepts a subset of the
 * editable project fields and an optional `addUpdate` payload that appends
 * a new entry to the `updates` array. Authorisation: Admin OR Editor for
 * this specific project. Every successful save writes one ChangeLog row
 * per modified field via `commitWithChangeLog`, sets `lastUpdatedAt` to the
 * server clock, and ignores any client-supplied `userEmail`.
 *
 * Spec: openspec/specs/edit-studio/spec.md, openspec/specs/access-control/spec.md
 * (Editor on a specific project), openspec/specs/change-tracking/spec.md.
 */
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!user.isAdmin && !user.editableProjects.includes(id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const validation = validateBody(raw as Record<string, unknown>);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const body = validation.body;

  if (!hasAnyEdit(body)) {
    return NextResponse.json(
      { error: "Body must include at least one editable field or addUpdate" },
      { status: 400 },
    );
  }

  const client = getSanityClient();
  const project = await client.fetch<ProjectForPatch | null>(PROJECT_FOR_PATCH_QUERY, {
    id,
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const setPatch: Record<string, unknown> = {};
  const unsetFields: string[] = [];
  const changes: FieldChange[] = [];

  // name (required, non-null string)
  if (body.name !== undefined) {
    const next = body.name;
    const current = project.name ?? null;
    if (next !== current) {
      setPatch.name = next;
      changes.push({
        documentId: project._id,
        documentType: "project",
        field: "name",
        before: current,
        after: next,
      });
    }
  }

  // projectStage
  if (body.projectStage !== undefined) {
    const next = body.projectStage;
    const current = project.projectStage ?? null;
    if (next !== current) {
      setPatch.projectStage = next;
      changes.push({
        documentId: project._id,
        documentType: "project",
        field: "projectStage",
        before: current,
        after: next,
      });
    }
  }

  for (const fieldName of STRING_OR_NULL_FIELDS) {
    if (body[fieldName] !== undefined) {
      const next = body[fieldName] ?? null;
      const current = project[fieldName] ?? null;
      if (next !== current) {
        setPatch[fieldName] = next;
        changes.push({
          documentId: project._id,
          documentType: "project",
          field: fieldName,
          before: current,
          after: next,
        });
      }
    }
  }

  for (const enumField of ENUM_FIELDS) {
    if (body[enumField.name] !== undefined) {
      const next = body[enumField.name] ?? null;
      const current = (project[enumField.name] ?? null) as string | null;
      if (next !== current) {
        setPatch[enumField.name] = next;
        changes.push({
          documentId: project._id,
          documentType: "project",
          field: enumField.name,
          before: current,
          after: next,
        });
      }
    }
  }

  // Single references — set to a reference object or unset when null/empty.
  for (const ref of SINGLE_REF_FIELDS) {
    const supplied = body[ref.bodyKey];
    if (supplied !== undefined) {
      const next = supplied && supplied.length > 0 ? supplied : null;
      const current = project[ref.currentKey] ?? null;
      if (next !== current) {
        if (next === null) {
          unsetFields.push(ref.fieldName);
        } else {
          setPatch[ref.fieldName] = { _type: "reference", _ref: next } satisfies SanityRef;
        }
        changes.push({
          documentId: project._id,
          documentType: "project",
          field: ref.fieldName,
          before: current,
          after: next,
        });
      }
    }
  }

  // Array references — full replacement when present.
  for (const ref of ARRAY_REF_FIELDS) {
    const supplied = body[ref.bodyKey];
    if (supplied !== undefined) {
      const next = supplied;
      const current = project[ref.currentKey] ?? [];
      if (!arraysEqual(next, current)) {
        setPatch[ref.fieldName] = next.map((id) => ({
          _type: "reference",
          _ref: id,
          _key: crypto.randomUUID(),
        } satisfies SanityRef));
        changes.push({
          documentId: project._id,
          documentType: "project",
          field: ref.fieldName,
          before: current,
          after: next,
        });
      }
    }
  }

  const timestamp = new Date().toISOString();
  let appendedUpdate: ProjectUpdateEntry | null = null;
  if (body.addUpdate) {
    appendedUpdate = buildUpdateEntry(body.addUpdate, user.email, timestamp);
    changes.push({
      documentId: project._id,
      documentType: "project",
      field: "updates",
      before: null,
      after: appendedUpdate,
    });
  }

  if (changes.length === 0) {
    // Supplied values matched the current state and no update was appended.
    return NextResponse.json({ ok: true });
  }

  // Always bump lastUpdatedAt on a successful save. Not mirrored as a
  // ChangeLog row because the spec marks it as automatic, non-editable.
  setPatch.lastUpdatedAt = timestamp;

  await commitWithChangeLog({
    mutations: (transaction) => {
      let tx = transaction.patch(project._id, { set: setPatch });
      if (unsetFields.length > 0) {
        tx = tx.patch(project._id, { unset: unsetFields });
      }
      if (appendedUpdate) {
        tx = tx.patch(project._id, (patch) =>
          patch.setIfMissing({ updates: [] }).append("updates", [appendedUpdate]),
        );
      }
      return tx;
    },
    changes,
    userEmail: user.email,
    client,
  });

  return NextResponse.json({ ok: true });
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function hasAnyEdit(body: PatchBody): boolean {
  if (body.addUpdate) return true;
  if (body.name !== undefined) return true;
  if (body.projectStage !== undefined) return true;
  for (const field of STRING_OR_NULL_FIELDS) {
    if (body[field] !== undefined) return true;
  }
  for (const field of ENUM_FIELDS) {
    if (body[field.name] !== undefined) return true;
  }
  for (const ref of SINGLE_REF_FIELDS) {
    if (body[ref.bodyKey] !== undefined) return true;
  }
  for (const ref of ARRAY_REF_FIELDS) {
    if (body[ref.bodyKey] !== undefined) return true;
  }
  return false;
}

type ValidationResult = { body: PatchBody } | { error: string };

function validateBody(raw: Record<string, unknown>): ValidationResult {
  const out: PatchBody = {};

  if ("name" in raw) {
    const value = raw.name;
    if (typeof value !== "string" || value.trim().length === 0) {
      return { error: "name must be a non-empty string" };
    }
    out.name = value;
  }

  if ("projectStage" in raw) {
    const value = raw.projectStage;
    if (!isStage(value)) {
      return { error: `projectStage must be one of ${STAGES.join(", ")}` };
    }
    out.projectStage = value;
  }

  for (const fieldName of STRING_OR_NULL_FIELDS) {
    if (fieldName in raw) {
      const value = raw[fieldName];
      if (value !== null && typeof value !== "string") {
        return { error: `${fieldName} must be a string or null` };
      }
      out[fieldName] = value as string | null;
    }
  }

  for (const enumField of ENUM_FIELDS) {
    if (enumField.name in raw) {
      const value = raw[enumField.name];
      if (value === null) {
        out[enumField.name] = null;
      } else if (typeof value === "string" && (enumField.values as readonly string[]).includes(value)) {
        // Type-safe assignment — value is a member of the enum.
        switch (enumField.name) {
          case "riskRegister":
            out.riskRegister = value as RiskRegisterValue;
            break;
          case "dpiaInPlace":
            out.dpiaInPlace = value as AssuranceStatusValue;
            break;
          case "actsInPlace":
            out.actsInPlace = value as AssuranceStatusValue;
            break;
          case "mojEthicsFrameworkUse":
            out.mojEthicsFrameworkUse = value as EthicsFrameworkValue;
            break;
        }
      } else {
        return {
          error: `${enumField.name} must be one of ${enumField.values.join(", ")} or null`,
        };
      }
    }
  }

  for (const ref of SINGLE_REF_FIELDS) {
    if (ref.bodyKey in raw) {
      const value = raw[ref.bodyKey];
      if (value !== null && typeof value !== "string") {
        return { error: `${ref.bodyKey} must be a string or null` };
      }
      out[ref.bodyKey] = (value as string | null) ?? null;
    }
  }

  for (const ref of ARRAY_REF_FIELDS) {
    if (ref.bodyKey in raw) {
      const value = raw[ref.bodyKey];
      if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
        return { error: `${ref.bodyKey} must be an array of strings` };
      }
      out[ref.bodyKey] = value as string[];
    }
  }

  if ("addUpdate" in raw) {
    const value = raw.addUpdate;
    if (!value || typeof value !== "object") {
      return { error: "addUpdate must be an object" };
    }
    const update = value as { title?: unknown; bodyText?: unknown };
    if (typeof update.title !== "string" || update.title.trim().length === 0) {
      return { error: "addUpdate.title must be a non-empty string" };
    }
    if (typeof update.bodyText !== "string") {
      return { error: "addUpdate.bodyText must be a string" };
    }
    out.addUpdate = { title: update.title, bodyText: update.bodyText };
  }

  return { body: out };
}

interface ProjectUpdateEntry {
  _key: string;
  _type: "projectUpdate";
  title: string;
  body: PortableTextBlock[];
  authorEmail: string;
  timestamp: string;
}

function buildUpdateEntry(
  input: AddUpdateInput,
  authorEmail: string,
  timestamp: string,
): ProjectUpdateEntry {
  const block: PortableTextBlock = {
    _type: "block",
    _key: crypto.randomUUID(),
    style: "normal",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: crypto.randomUUID(),
        text: input.bodyText,
        marks: [],
      },
    ],
  } as unknown as PortableTextBlock;
  return {
    _key: crypto.randomUUID(),
    _type: "projectUpdate",
    title: input.title,
    body: [block],
    authorEmail,
    timestamp,
  };
}
