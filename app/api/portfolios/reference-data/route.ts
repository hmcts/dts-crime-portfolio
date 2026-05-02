import { NextResponse } from "next/server";

import { resolveUser } from "@/lib/auth/resolver";
import { withRequestLogging } from "@/lib/logging/withLogging";
import {
  fetchReferenceData,
  ReferenceDataFetchError,
} from "@/lib/portfolio/referenceData";

export const dynamic = "force-dynamic";

/**
 * GET /api/portfolios/reference-data
 * Spec: openspec/specs/reference-data/spec.md.
 */
async function handleGet(request: Request) {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const requestedPending = url.searchParams.get("includePending") === "1";
  const includePending = requestedPending && user.isAdmin;

  try {
    const data = await fetchReferenceData({ includePending });
    return NextResponse.json(data);
  } catch (cause) {
    if (cause instanceof ReferenceDataFetchError) {
      return NextResponse.json(
        { error: "Reference data unavailable", failedCategory: cause.category },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Reference data unavailable", failedCategory: "unknown" },
      { status: 502 },
    );
  }
}

export const GET = withRequestLogging(handleGet);
