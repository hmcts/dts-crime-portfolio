import "server-only";

import { NextResponse } from "next/server";

import { resolveUser } from "@/lib/auth/resolver";
import { withRequestLogging } from "@/lib/logging/withLogging";
import { getSanityClient } from "@/lib/sanity/client";
import { commitWithChangeLog } from "@/lib/sanity/transaction";
import { serializePortfolioForSnapshot } from "@/lib/reporting-cuts/serialize";

export const dynamic = "force-dynamic";

interface ReportingCutListItem {
  _id: string;
  name: string;
  note: string | null;
  createdAt: string | null;
  createdBy: string | null;
}

const LIST_QUERY = /* groq */ `
  *[_type == "reportingCut"] | order(createdAt desc) {
    _id,
    name,
    note,
    createdAt,
    createdBy
  }
`;

/**
 * GET /api/portfolios/reporting-cuts — list all snapshots, newest first.
 * Any authenticated user (Viewer, Editor, Admin) may list.
 *
 * POST /api/portfolios/reporting-cuts — Admin-only. Captures a snapshot of
 * the current portfolio with all reference text resolved inline. The
 * snapshot creation is committed with a single ChangeLog row so the audit
 * log shows who triggered it.
 *
 * Spec: openspec/specs/compare-mode/spec.md (Reporting cut management,
 * Snapshots capture resolved text), openspec/specs/change-tracking/spec.md.
 */
async function handleGet(_request: Request): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }

  const client = getSanityClient();
  const rows = await client.fetch<ReportingCutListItem[]>(LIST_QUERY);
  const cuts = (rows ?? []).map((row) => ({
    id: row._id,
    name: row.name,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    note: row.note,
  }));
  return NextResponse.json({ cuts });
}

async function handlePost(request: Request): Promise<Response> {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, note } = body as { name?: unknown; note?: unknown };
  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json(
      { error: "Body must include a non-empty `name`" },
      { status: 400 },
    );
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json(
      { error: "`note` must be a string when provided" },
      { status: 400 },
    );
  }

  const trimmedName = name.trim();
  const trimmedNote = typeof note === "string" ? note : "";

  const client = getSanityClient();
  const snapshot = await serializePortfolioForSnapshot(client);
  const createdAt = new Date().toISOString();
  const newId = `reportingCut-${createdAt.replace(/[^0-9]/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  await commitWithChangeLog({
    mutations: (transaction) =>
      transaction.create({
        _id: newId,
        _type: "reportingCut",
        name: trimmedName,
        note: trimmedNote,
        createdAt,
        createdBy: user.email,
        snapshot,
      }),
    changes: [
      {
        documentId: newId,
        documentType: "reportingCut",
        field: "snapshot",
        before: null,
        after: { name: trimmedName, createdAt },
      },
    ],
    userEmail: user.email,
    client,
  });

  return NextResponse.json({ id: newId, createdAt }, { status: 201 });
}

export const GET = withRequestLogging(handleGet);
export const POST = withRequestLogging(handlePost);
