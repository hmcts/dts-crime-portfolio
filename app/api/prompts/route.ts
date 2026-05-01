import "server-only";

import { NextResponse } from "next/server";

import { resolveUser } from "@/lib/auth/resolver";
import { getSanityClient } from "@/lib/sanity/client";
import {
  commitWithChangeLog,
  type FieldChange,
} from "@/lib/sanity/transaction";
import {
  PROMPT_TAGS,
  PROMPT_TOOLS,
  type PromptTag,
  type PromptTool,
} from "@/lib/prompts/types";

export const dynamic = "force-dynamic";

interface PersonLookup {
  _id: string;
  name: string | null;
}

const PERSON_BY_EMAIL_QUERY = /* groq */ `
  *[_type == "person" && email == $email][0]{ _id, name }
`;

/**
 * POST /api/prompts
 *
 * Creates a new prompt document. The author Person is resolved by the
 * caller's email; if no Person exists yet, one is created inline in the
 * same transaction with `pendingReview: true`. Every successful write also
 * appends one ChangeLog row for the prompt's creation, recording the
 * resolver-supplied email — body-supplied emails are never trusted.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Prompt creation),
 * openspec/specs/access-control/spec.md, openspec/specs/change-tracking/spec.md.
 */
export async function POST(request: Request): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
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

  const {
    title: rawTitle,
    summary: rawSummary,
    body: rawBody,
    tool: rawTool,
    tags: rawTags,
  } = body as {
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

  const client = getSanityClient();
  const existingPerson = await client.fetch<PersonLookup | null>(
    PERSON_BY_EMAIL_QUERY,
    { email: user.email },
  );

  const personId = existingPerson?._id ?? `person.${crypto.randomUUID()}`;
  const promptId = `prompt.${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  const promptDoc = {
    _id: promptId,
    _type: "prompt",
    title,
    summary,
    body: promptBody,
    tool,
    tags,
    author: { _type: "reference", _ref: personId },
    createdAt,
    upvotes: [],
    comments: [],
  };

  const changes: FieldChange[] = [
    {
      documentId: promptId,
      documentType: "prompt",
      field: "_created",
      before: null,
      after: { title, tool, tags },
    },
  ];

  await commitWithChangeLog({
    mutations: (transaction) => {
      if (!existingPerson) {
        transaction.create({
          _id: personId,
          _type: "person",
          name: user.email,
          email: user.email,
          pendingReview: true,
        });
      }
      transaction.create(promptDoc);
    },
    changes,
    userEmail: user.email,
    client,
  });

  return NextResponse.json({ id: promptId }, { status: 201 });
}
