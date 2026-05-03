import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { writeChangeLog } from "@/lib/audit/changelog";
import { resolveUser } from "@/lib/auth/resolver";
import { getDb } from "@/lib/db/client";
import { editorAllowlist } from "@/lib/db/schema";
import { withRequestLogging } from "@/lib/logging/withLogging";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/editors/[id]
 *
 * Remove a single (email, projectId) mapping. Admin-only. Writes one
 * ChangeLog row recording the removed mapping for audit.
 */
async function handleDelete(_request: Request, context: RouteContext): Promise<Response> {
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
  const { id } = await context.params;
  const db = getDb();

  const [existing] = await db
    .select()
    .from(editorAllowlist)
    .where(eq(editorAllowlist.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
  }

  await db.delete(editorAllowlist).where(eq(editorAllowlist.id, id));

  await writeChangeLog(
    [
      {
        documentId: id,
        documentType: "editorAllowlist",
        field: "_deleted",
        before: {
          email: existing.email,
          projectId: existing.projectId,
          grantedBy: existing.grantedBy,
        },
        after: null,
      },
    ],
    user.email,
  );

  return NextResponse.json({ ok: true });
}

export const DELETE = withRequestLogging(handleDelete);
