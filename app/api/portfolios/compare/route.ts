import "server-only";

import { NextResponse } from "next/server";

import { resolveUser } from "@/lib/auth/resolver";
import { withRequestLogging } from "@/lib/logging/withLogging";
import { getSanityClient } from "@/lib/sanity/client";
import {
  diffFromChangeLog,
  diffSnapshotAgainstCurrent,
  type ChangeLogRow,
  type CompareResult,
} from "@/lib/compare/diff";
import {
  deserialiseSnapshot,
  SNAPSHOT_QUERY,
  type SerialisedProject,
} from "@/lib/reporting-cuts/serialize";

export const dynamic = "force-dynamic";

const CHANGELOG_RANGE_QUERY = /* groq */ `
  *[_type == "changeLog"
    && documentType == "project"
    && timestamp >= $from
    && timestamp <= $to
  ] | order(timestamp asc) {
    documentId,
    documentType,
    field,
    before,
    after,
    userEmail,
    timestamp
  }
`;

const PROJECT_NAMES_QUERY = /* groq */ `
  *[_type == "project"]{ _id, name }
`;

interface ReportingCutSnapshotRow {
  _id: string;
  snapshot: string;
}

const REPORTING_CUT_QUERY = /* groq */ `
  *[_type == "reportingCut" && _id == $id][0]{ _id, snapshot }
`;

/**
 * GET /api/portfolios/compare?from=&to=
 * GET /api/portfolios/compare?reportingCut=<id>
 *
 * Returns `{ added, removed, changed }`. For date-range mode the diff is
 * derived from ChangeLog rows in the window — no historic Sanity revisions
 * are queried. For snapshot mode, the saved snapshot is deserialised and
 * compared against the current portfolio (snapshot value = `before`,
 * current value = `after`).
 *
 * Spec: openspec/specs/compare-mode/spec.md, openspec/specs/change-tracking/spec.md.
 */
async function handleGet(request: Request): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const reportingCutId = url.searchParams.get("reportingCut");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const client = getSanityClient();

  if (reportingCutId) {
    const cut = await client.fetch<ReportingCutSnapshotRow | null>(
      REPORTING_CUT_QUERY,
      { id: reportingCutId },
    );
    if (!cut) {
      return NextResponse.json(
        { error: "Reporting cut not found" },
        { status: 404 },
      );
    }
    const snapshot = deserialiseSnapshot(cut.snapshot);
    const current = await client.fetch<SerialisedProject[]>(SNAPSHOT_QUERY);
    const result: CompareResult = diffSnapshotAgainstCurrent(
      snapshot,
      current ?? [],
    );
    return NextResponse.json(result);
  }

  if (!from || !to) {
    return NextResponse.json(
      {
        error:
          "Provide either ?reportingCut=<id> or both ?from=YYYY-MM-DD&to=YYYY-MM-DD",
      },
      { status: 400 },
    );
  }

  const fromIso = normaliseDate(from, "start");
  const toIso = normaliseDate(to, "end");
  if (!fromIso || !toIso) {
    return NextResponse.json(
      { error: "from and to must be ISO dates (YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  if (fromIso === toIso || from === to) {
    return NextResponse.json({
      added: [],
      removed: [],
      changed: [],
    } satisfies CompareResult);
  }

  const [rows, projects] = await Promise.all([
    client.fetch<ChangeLogRow[]>(CHANGELOG_RANGE_QUERY, {
      from: fromIso,
      to: toIso,
    }),
    client.fetch<{ _id: string; name: string }[]>(PROJECT_NAMES_QUERY),
  ]);

  const projectNames = new Map<string, string>();
  for (const p of projects ?? []) projectNames.set(p._id, p.name);

  const result = diffFromChangeLog(rows ?? [], projectNames);
  return NextResponse.json(result);
}

export const GET = withRequestLogging(handleGet);

function normaliseDate(input: string, edge: "start" | "end"): string | null {
  // Accept either a bare YYYY-MM-DD or a full ISO timestamp. Bare dates are
  // expanded to start- or end-of-day UTC depending on the edge.
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return edge === "start"
      ? `${input}T00:00:00.000Z`
      : `${input}T23:59:59.999Z`;
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}
