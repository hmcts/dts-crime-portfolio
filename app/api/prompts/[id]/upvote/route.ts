import "server-only";

import { NextResponse } from "next/server";

import { resolveUser } from "@/lib/auth/resolver";
import { getSanityClient } from "@/lib/sanity/client";
import {
  commitWithChangeLog,
  type FieldChange,
} from "@/lib/sanity/transaction";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpvoteEntry {
  _key: string;
  userEmail: string;
  createdAt: string;
}

interface PromptForUpvote {
  _id: string;
  upvotes: UpvoteEntry[] | null;
}

const PROMPT_FOR_UPVOTE_QUERY = /* groq */ `
  *[_type == "prompt" && _id == $id][0] {
    _id,
    upvotes
  }
`;

/**
 * POST /api/prompts/[id]/upvote
 *
 * Idempotent toggle. If the caller's email is already in the prompt's
 * upvotes array, it is removed. Otherwise a fresh entry is appended. Every
 * write produces one ChangeLog row recording the before/after upvote
 * arrays, with the resolver-supplied email.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Idempotent upvotes),
 * openspec/specs/change-tracking/spec.md.
 */
export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  const client = getSanityClient();
  const prompt = await client.fetch<PromptForUpvote | null>(PROMPT_FOR_UPVOTE_QUERY, {
    id,
  });
  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  const before: UpvoteEntry[] = Array.isArray(prompt.upvotes) ? prompt.upvotes : [];
  const alreadyUpvoted = before.some((entry) => entry.userEmail === user.email);
  const after: UpvoteEntry[] = alreadyUpvoted
    ? before.filter((entry) => entry.userEmail !== user.email)
    : [
        ...before,
        {
          _key: crypto.randomUUID(),
          userEmail: user.email,
          createdAt: new Date().toISOString(),
        },
      ];

  const changes: FieldChange[] = [
    {
      documentId: prompt._id,
      documentType: "prompt",
      field: "upvotes",
      before,
      after,
    },
  ];

  await commitWithChangeLog({
    mutations: (transaction) => transaction.patch(prompt._id, { set: { upvotes: after } }),
    changes,
    userEmail: user.email,
    client,
  });

  return NextResponse.json({ ok: true, upvoteCount: after.length });
}
