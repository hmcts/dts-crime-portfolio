import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { writeChangeLog } from "@/lib/audit/changelog";
import { isValidEmail, resolveUser } from "@/lib/auth/resolver";
import { listEditorAllowlist } from "@/lib/admin/editors";
import { getDb } from "@/lib/db/client";
import { editorAllowlist } from "@/lib/db/schema";
import { withRequestLogging } from "@/lib/logging/withLogging";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/editors  — list every (email, projectId) mapping.
 * POST /api/admin/editors  — create a new mapping; body { email, projectId }.
 *
 * Both routes are Admin-only. Identity comes from the auth resolver
 * (header-based); body-supplied admin claims are never trusted. Every
 * successful POST writes a ChangeLog row to Sanity (non-fatal).
 *
 * Spec: openspec/specs/access-control/spec.md (Admin) and
 * decisions/2026-05-03-editor-allowlist-claude-design-brief.md.
 */
async function handleGet(): Promise<Response> {
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
  const entries = await listEditorAllowlist();
  return NextResponse.json({ entries });
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

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { email: rawEmail, projectId: rawProjectId } = parsed as {
    email?: unknown;
    projectId?: unknown;
  };
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const projectId = typeof rawProjectId === "string" ? rawProjectId.trim() : "";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 },
    );
  }
  if (!projectId) {
    return NextResponse.json({ error: "Choose a project" }, { status: 400 });
  }

  const db = getDb();

  const [existing] = await db
    .select({ id: editorAllowlist.id })
    .from(editorAllowlist)
    .where(
      and(
        eq(editorAllowlist.email, email),
        eq(editorAllowlist.projectId, projectId),
      ),
    )
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "This editor already has access to this project" },
      { status: 409 },
    );
  }

  const id = randomUUID();
  const grantedAt = new Date();
  await db.insert(editorAllowlist).values({
    id,
    email,
    projectId,
    grantedBy: user.email,
    grantedAt,
  });

  await writeChangeLog(
    [
      {
        documentId: id,
        documentType: "editorAllowlist",
        field: "_created",
        before: null,
        after: { email, projectId, grantedBy: user.email },
      },
    ],
    user.email,
  );

  return NextResponse.json(
    {
      entry: {
        id,
        email,
        projectId,
        grantedBy: user.email,
        grantedAt: grantedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}

export const GET = withRequestLogging(handleGet);
export const POST = withRequestLogging(handlePost);
