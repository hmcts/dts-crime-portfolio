import "server-only";

import { createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { writeChangeLog } from "@/lib/audit/changelog";
import { resolveUser } from "@/lib/auth/resolver";
import { getDb } from "@/lib/db/client";
import { promptUpvotes, prompts as promptsTable } from "@/lib/db/schema";
import { withRequestLogging } from "@/lib/logging/withLogging";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/prompts/[id]/upvote
 *
 * Idempotent toggle backed by the `prompt_upvotes` Postgres table.
 * (prompt_id, user_email) is the composite primary key so duplicate
 * inserts collide at the DB level — the toggle here flips between
 * insert and delete based on whether the row already exists.
 *
 * One ChangeLog row is written to Sanity after a successful toggle so
 * the audit trail still lives in one place. Email is hashed in the
 * audit body to keep cleartext addresses out of the log.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Idempotent upvotes),
 * openspec/specs/change-tracking/spec.md.
 */
async function handlePost(_request: Request, context: RouteContext): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const db = getDb();

  const [prompt] = await db
    .select({ id: promptsTable.id })
    .from(promptsTable)
    .where(eq(promptsTable.id, id))
    .limit(1);
  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(promptUpvotes)
    .where(
      and(
        eq(promptUpvotes.promptId, id),
        eq(promptUpvotes.userEmail, user.email),
      ),
    )
    .limit(1);
  const alreadyUpvoted = !!existing;

  if (alreadyUpvoted) {
    await db
      .delete(promptUpvotes)
      .where(
        and(
          eq(promptUpvotes.promptId, id),
          eq(promptUpvotes.userEmail, user.email),
        ),
      );
  } else {
    await db.insert(promptUpvotes).values({
      promptId: id,
      userEmail: user.email,
      createdAt: new Date(),
    });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(promptUpvotes)
    .where(eq(promptUpvotes.promptId, id));

  const userKey = createHash("sha256").update(user.email).digest("hex").slice(0, 16);
  await writeChangeLog(
    [
      {
        documentId: id,
        documentType: "prompt",
        field: "upvotes",
        before: { user: userKey, voted: alreadyUpvoted },
        after: { user: userKey, voted: !alreadyUpvoted, count },
      },
    ],
    user.email,
  );

  return NextResponse.json({ count, voted: !alreadyUpvoted });
}

export const POST = withRequestLogging(handlePost);
