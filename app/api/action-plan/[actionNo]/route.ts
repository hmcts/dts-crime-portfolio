import "server-only";

import { NextResponse } from "next/server";
import type { PortableTextBlock } from "@portabletext/types";

import { resolveUser } from "@/lib/auth/resolver";
import { getSanityClient } from "@/lib/sanity/client";
import {
  commitWithChangeLog,
  type FieldChange,
} from "@/lib/sanity/transaction";
import {
  PROGRESS_STATUSES,
  type ProgressStatus,
  isProgressStatus,
} from "@/lib/enums/progress-status";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ actionNo: string }>;
}

interface ActionForPatch {
  _id: string;
  progressStatus: ProgressStatus | null;
  summaryOfProgress: PortableTextBlock[] | null;
}

const ACTION_FOR_PATCH_QUERY = /* groq */ `
  *[_type == "action" && actionNo == $actionNo][0] {
    _id,
    progressStatus,
    summaryOfProgress
  }
`;

/**
 * PATCH /api/action-plan/[actionNo]
 *
 * Admin-only endpoint that updates an Action's `progressStatus` and/or
 * `summaryOfProgress`. Every successful mutation writes one ChangeLog row
 * per modified field via `commitWithChangeLog`. The author email always
 * comes from the auth resolver (`x-user-email`), never from the request
 * body.
 *
 * Spec: openspec/specs/action-plan-tracking/spec.md (Admin progress editing),
 * openspec/specs/access-control/spec.md, openspec/specs/change-tracking/spec.md.
 */
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { actionNo } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { progressStatus, summaryText } = body as {
    progressStatus?: unknown;
    summaryText?: unknown;
  };

  const hasProgressStatus = progressStatus !== undefined;
  const hasSummaryText = summaryText !== undefined;

  if (!hasProgressStatus && !hasSummaryText) {
    return NextResponse.json(
      { error: "Body must include progressStatus or summaryText" },
      { status: 400 },
    );
  }

  if (hasProgressStatus && !isProgressStatus(progressStatus)) {
    return NextResponse.json(
      {
        error: "Invalid progressStatus",
        allowed: PROGRESS_STATUSES,
      },
      { status: 400 },
    );
  }

  if (hasSummaryText && typeof summaryText !== "string") {
    return NextResponse.json(
      { error: "summaryText must be a string" },
      { status: 400 },
    );
  }

  const client = getSanityClient();
  const action = await client.fetch<ActionForPatch | null>(ACTION_FOR_PATCH_QUERY, {
    actionNo,
  });
  if (!action) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  const setPatch: Record<string, unknown> = {};
  const changes: FieldChange[] = [];

  if (hasProgressStatus) {
    const next = progressStatus as ProgressStatus;
    if (next !== action.progressStatus) {
      setPatch.progressStatus = next;
      changes.push({
        documentId: action._id,
        documentType: "action",
        field: "progressStatus",
        before: action.progressStatus,
        after: next,
      });
    }
  }

  if (hasSummaryText) {
    const rawText = summaryText as string;
    const nextSummary: PortableTextBlock[] = [
      {
        _type: "block",
        _key: crypto.randomUUID(),
        style: "normal",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: crypto.randomUUID(),
            text: rawText,
            marks: [],
          },
        ],
      } as unknown as PortableTextBlock,
    ];
    setPatch.summaryOfProgress = nextSummary;
    changes.push({
      documentId: action._id,
      documentType: "action",
      field: "summaryOfProgress",
      before: action.summaryOfProgress,
      after: nextSummary,
    });
  }

  if (changes.length === 0) {
    // Nothing to do — supplied values matched the current state.
    return NextResponse.json({ ok: true });
  }

  await commitWithChangeLog({
    mutations: (transaction) => transaction.patch(action._id, { set: setPatch }),
    changes,
    userEmail: user.email,
    client,
  });

  return NextResponse.json({ ok: true });
}
