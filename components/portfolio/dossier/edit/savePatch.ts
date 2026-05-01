"use client";

/**
 * Tiny client-side wrapper around `PATCH /api/portfolios/[id]`. Returns the
 * server's JSON response on 2xx, or throws an Error whose `.message` is the
 * server-provided `error` string (or a generic fallback). The caller handles
 * UI state (busy indicator, error banner, router.refresh()).
 *
 * Spec: openspec/specs/edit-studio/spec.md.
 */
export async function savePatch(
  projectId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(`/api/portfolios/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `Save failed (${response.status})`;
    try {
      const json = (await response.json()) as { error?: string };
      if (typeof json.error === "string" && json.error.length > 0) {
        message = json.error;
      }
    } catch {
      // ignore — fall back to status code
    }
    throw new Error(message);
  }
}
