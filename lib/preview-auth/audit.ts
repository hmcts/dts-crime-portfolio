import "server-only";

import { getSanityClient } from "@/lib/sanity/client";

/**
 * Record a preview-auth sign-in. First sign-in for an email creates a
 * `previewSession` document; repeat sign-ins update `lastSeenAt` on the
 * existing one. Spec: openspec/specs/preview-auth/spec.md
 * (Audit of preview identity).
 */
export async function recordPreviewSession(email: string): Promise<void> {
  const client = getSanityClient();
  const now = new Date().toISOString();

  const existing = await client.fetch<{ _id: string } | null>(
    `*[_type == "previewSession" && email == $email][0]{ _id }`,
    { email },
  );

  if (existing) {
    await client.patch(existing._id).set({ lastSeenAt: now }).commit({ visibility: "async" });
  } else {
    await client.create({
      _type: "previewSession",
      email,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }
}
