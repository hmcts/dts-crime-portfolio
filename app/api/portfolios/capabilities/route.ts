import { NextResponse } from "next/server";

import { resolveUser } from "@/lib/auth/resolver";
import { fetchCapabilitiesOnly } from "@/lib/portfolio/referenceData";

export const dynamic = "force-dynamic";

/**
 * GET /api/portfolios/capabilities
 * Lightweight convenience endpoint that returns only the capabilities
 * array, in the same shape as the `capabilities` key of the full
 * reference-data response. Spec: openspec/specs/reference-data/spec.md.
 */
export async function GET() {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }
  const capabilities = await fetchCapabilitiesOnly();
  return NextResponse.json({ capabilities });
}
