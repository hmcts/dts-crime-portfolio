import { NextResponse } from "next/server";
import { Packer } from "docx";

import { resolveUser } from "@/lib/auth/resolver";
import {
  buildComplianceBriefing,
  type ComplianceProject,
} from "@/lib/exports/complianceBriefing";
import { getSanityClient } from "@/lib/sanity/client";

export const dynamic = "force-dynamic";

const COMPLIANCE_QUERY = /* groq */ `
  *[_type == "project"] | order(name asc) {
    _id,
    name,
    "deliveryOwner": deliveryOwner->{ name, email },
    governanceTier,
    dpiaInPlace,
    actsInPlace,
    mojEthicsFrameworkUse
  }
`;

/**
 * GET /api/portfolios/exports/compliance-briefing
 * Spec: openspec/specs/exports/spec.md (Compliance briefing — server-side).
 *
 * Server-side because the briefing needs full audit context — every
 * project, including ones the caller may not see in their filtered list.
 * All other portfolio exports run client-side from already-fetched data.
 */
export async function GET() {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }

  try {
    const client = getSanityClient();
    const projects = await client.fetch<ComplianceProject[]>(COMPLIANCE_QUERY);
    const doc = buildComplianceBriefing(projects ?? []);
    const buffer = await Packer.toBuffer(doc);
    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": `attachment; filename="compliance-briefing-${today}.docx"`,
      },
    });
  } catch (error) {
    // TODO observability: emit a structured log event once the logger lands
    // in the parallel branch.
    console.error("compliance-briefing failed", error);
    return NextResponse.json(
      { error: "compliance_briefing_failed" },
      { status: 500 },
    );
  }
}
