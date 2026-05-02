import "server-only";

import { NextResponse } from "next/server";
import type { PortableTextBlock } from "@portabletext/types";

import { resolveUser } from "@/lib/auth/resolver";
import { getSanityClient } from "@/lib/sanity/client";
import {
  commitWithChangeLog,
  type FieldChange,
} from "@/lib/sanity/transaction";
import { validateSubmission } from "@/lib/submission/validator";
import type {
  PersonRefSelection,
  RefSelection,
  SubmissionRequestBody,
} from "@/lib/submission/types";

export const dynamic = "force-dynamic";

interface SanityRef {
  _type: "reference";
  _ref: string;
  _key?: string;
}

interface InlineCreate {
  _id: string;
  _type: string;
  [field: string]: unknown;
}

function newId(): string {
  return crypto.randomUUID();
}

function refKey(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function ref(id: string, withKey = false): SanityRef {
  return withKey
    ? { _type: "reference", _ref: id, _key: refKey() }
    : { _type: "reference", _ref: id };
}

/**
 * POST /api/portfolios/submit
 *
 * Public submission endpoint that creates a project document, plus any
 * inline-created reference entities (group, directorate, person,
 * capability) marked `pendingReview: true`, in a single Sanity transaction
 * alongside one ChangeLog row per top-level field on the new project.
 *
 * The server SHALL recompute the overall governance tier from the
 * submitted assessment and reject any mismatch with `declaredOverallTier`.
 *
 * Spec: openspec/specs/project-submission/spec.md,
 * openspec/specs/access-control/spec.md,
 * openspec/specs/change-tracking/spec.md.
 */
export async function POST(request: Request): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validateSubmission(raw);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.details ? { details: result.details } : {}) },
      { status: 400 },
    );
  }

  const { body, computedTier } = result;
  const projectId = newId();

  const inlineCreates: InlineCreate[] = [];

  // Resolve a (possibly inline) RefSelection to a Sanity reference _ref id,
  // queuing a `pendingReview: true` create when newName was supplied.
  function resolveRef(
    selection: RefSelection,
    type: string,
    extraFields?: Record<string, unknown>,
  ): string {
    if ("id" in selection) return selection.id;
    const id = newId();
    inlineCreates.push({
      _id: id,
      _type: type,
      name: selection.newName,
      pendingReview: true,
      ...(extraFields ?? {}),
    });
    return id;
  }

  function resolvePersonRef(selection: PersonRefSelection): string {
    if ("id" in selection) return selection.id;
    const id = newId();
    inlineCreates.push({
      _id: id,
      _type: "person",
      name: selection.newPerson.name,
      email: selection.newPerson.email,
      pendingReview: true,
    });
    return id;
  }

  // Group must be resolved before directorate so an inline directorate can
  // point to either an existing group or a freshly-created one.
  const groupId = resolveRef(body.group, "group");
  const directorateId = resolveRef(body.directorate, "directorate", {
    group: ref(groupId),
  });
  const deliveryOwnerId = resolvePersonRef(body.deliveryOwner);
  const capabilityId = resolveRef(body.capability, "capability");

  const projectDoc = buildProjectDoc(body, {
    projectId,
    groupId,
    directorateId,
    deliveryOwnerId,
    capabilityId,
    computedTier,
    authorEmail: user.email,
  });

  const changes = buildChangeLogChanges(projectDoc, projectId);

  const client = getSanityClient();

  try {
    await commitWithChangeLog({
      mutations: (transaction) => {
        for (const create of inlineCreates) {
          transaction.create(create as Parameters<typeof transaction.create>[0]);
        }
        transaction.create(projectDoc as Parameters<typeof transaction.create>[0]);
      },
      changes,
      userEmail: user.email,
      client,
    });
  } catch (cause) {
    return NextResponse.json(
      {
        error: "Failed to persist submission",
        details: { cause: cause instanceof Error ? cause.message : String(cause) },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, projectId });
}

interface ProjectDocArgs {
  projectId: string;
  groupId: string;
  directorateId: string;
  deliveryOwnerId: string;
  capabilityId: string;
  computedTier: 1 | 2 | 3;
  authorEmail: string;
}

interface BuiltProjectDoc {
  _id: string;
  _type: "project";
  name: string;
  description?: string;
  projectStage: string;
  group: SanityRef;
  directorate: SanityRef;
  businessAreas: SanityRef[];
  deliveryOwner: SanityRef;
  businessLead?: SanityRef;
  legalLead?: SanityRef;
  capability: SanityRef;
  additionalCapabilities: SanityRef[];
  actionPlanLinks: SanityRef[];
  tieringAssessment: Record<string, number>;
  governanceTier: 1 | 2 | 3;
  surveyDetails?: SubmissionRequestBody["surveyDetails"];
  updates: Array<{
    _key: string;
    _type: "projectUpdate";
    title: string;
    body: PortableTextBlock[];
    authorEmail: string;
    timestamp: string;
  }>;
  lastUpdatedAt: string;
}

function buildProjectDoc(
  body: SubmissionRequestBody,
  args: ProjectDocArgs,
): BuiltProjectDoc {
  const now = new Date().toISOString();

  const updates: BuiltProjectDoc["updates"] = [];
  if (body.firstUpdate && body.firstUpdate.title.length > 0) {
    updates.push({
      _key: refKey(),
      _type: "projectUpdate",
      title: body.firstUpdate.title,
      body: [
        {
          _type: "block",
          _key: refKey(),
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: refKey(),
              text: body.firstUpdate.body,
              marks: [],
            },
          ],
        } as unknown as PortableTextBlock,
      ],
      authorEmail: args.authorEmail,
      timestamp: now,
    });
  }

  return {
    _id: args.projectId,
    _type: "project",
    name: body.name,
    ...(body.description ? { description: body.description } : {}),
    projectStage: body.projectStage,
    group: ref(args.groupId),
    directorate: ref(args.directorateId),
    businessAreas: body.businessAreaIds.map((id) => ref(id, true)),
    deliveryOwner: ref(args.deliveryOwnerId),
    ...(body.businessLeadId ? { businessLead: ref(body.businessLeadId) } : {}),
    ...(body.legalLeadId ? { legalLead: ref(body.legalLeadId) } : {}),
    capability: ref(args.capabilityId),
    additionalCapabilities: body.additionalCapabilityIds.map((id) => ref(id, true)),
    actionPlanLinks: body.actionPlanLinkIds.map((id) => ref(id, true)),
    tieringAssessment: { ...body.tieringAssessment } as Record<string, number>,
    governanceTier: args.computedTier,
    ...(body.surveyDetails ? { surveyDetails: body.surveyDetails } : {}),
    updates,
    lastUpdatedAt: now,
  };
}

/**
 * Emit one ChangeLog row per top-level field present on the new project
 * document. `before` is `null` because the project did not exist before
 * this transaction.
 */
function buildChangeLogChanges(
  projectDoc: BuiltProjectDoc,
  projectId: string,
): FieldChange[] {
  const fields: Array<keyof BuiltProjectDoc> = [
    "name",
    "description",
    "projectStage",
    "group",
    "directorate",
    "businessAreas",
    "deliveryOwner",
    "businessLead",
    "legalLead",
    "capability",
    "additionalCapabilities",
    "actionPlanLinks",
    "tieringAssessment",
    "governanceTier",
    "surveyDetails",
    "updates",
    "lastUpdatedAt",
  ];

  const changes: FieldChange[] = [];
  for (const field of fields) {
    const after = projectDoc[field];
    if (after === undefined) continue;
    if (Array.isArray(after) && after.length === 0) continue;
    changes.push({
      documentId: projectId,
      documentType: "project",
      field: field as string,
      before: null,
      after,
    });
  }
  return changes;
}
