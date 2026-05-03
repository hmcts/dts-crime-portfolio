import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { writeChangeLog } from "@/lib/audit/changelog";
import { resolveUser } from "@/lib/auth/resolver";
import { getDb } from "@/lib/db/client";
import { prompts as promptsTable } from "@/lib/db/schema";
import { withRequestLogging } from "@/lib/logging/withLogging";
import {
  PROMPT_TAGS,
  PROMPT_TOOLS,
  type PromptTag,
  type PromptTool,
} from "@/lib/prompts/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/prompts
 *
 * Create a new prompt row in Postgres. Author email always comes from
 * the auth resolver — body-supplied emails are never trusted. Author
 * `name` and `seed` are denormalised on the row (name defaults to the
 * email's local part; the contributor can edit it later if/when we
 * ship a profile-name endpoint).
 *
 * One ChangeLog row is written to Sanity post-insert recording the
 * creation event with the author's hashed email.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Prompt creation),
 * openspec/specs/access-control/spec.md, openspec/specs/change-tracking/spec.md.
 */
async function handlePost(request: Request): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
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

  const {
    title: rawTitle,
    summary: rawSummary,
    body: rawBody,
    tool: rawTool,
    tags: rawTags,
  } = parsed as {
    title?: unknown;
    summary?: unknown;
    body?: unknown;
    tool?: unknown;
    tags?: unknown;
  };

  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
  const promptBody = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!promptBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }
  const summary =
    typeof rawSummary === "string" && rawSummary.trim().length > 0
      ? rawSummary.trim()
      : null;
  if (
    typeof rawTool !== "string" ||
    !(PROMPT_TOOLS as readonly string[]).includes(rawTool)
  ) {
    return NextResponse.json(
      { error: "tool must be one of: " + PROMPT_TOOLS.join(", ") },
      { status: 400 },
    );
  }
  const tool: PromptTool = rawTool as PromptTool;
  const tags: PromptTag[] = Array.isArray(rawTags)
    ? rawTags.filter(
        (tag): tag is PromptTag =>
          typeof tag === "string" && (PROMPT_TAGS as readonly string[]).includes(tag),
      )
    : [];

  const promptId = `prompt.${randomUUID()}`;
  const createdAt = new Date();
  const authorSeed = createHash("sha256")
    .update(user.email)
    .digest("hex")
    .slice(0, 16);

  const db = getDb();
  await db.insert(promptsTable).values({
    id: promptId,
    title,
    summary,
    body: promptBody,
    tool,
    tags,
    authorEmail: user.email,
    authorName: user.email.split("@")[0] ?? null,
    authorSeed,
    createdAt,
  });

  const userKey = createHash("sha256").update(user.email).digest("hex").slice(0, 16);
  await writeChangeLog(
    [
      {
        documentId: promptId,
        documentType: "prompt",
        field: "_created",
        before: null,
        after: { user: userKey, title, tool, tags },
      },
    ],
    user.email,
  );

  return NextResponse.json({ id: promptId }, { status: 201 });
}

export const POST = withRequestLogging(handlePost);
