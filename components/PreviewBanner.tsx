import { headers } from "next/headers";

import { isPreviewEnvironment } from "@/lib/preview-auth/environment";

/**
 * Persistent banner shown above all content in non-production
 * environments. Shows the signed-in email (read from the same
 * `x-user-email` header that downstream code consumes) and a Sign out
 * button posting to /preview-auth/sign-out.
 *
 * Note: the new AppHeader (in `(app)/layout.tsx`) also renders a Sign
 * out button. Both are wired to the same POST handler. Tests should
 * scope by region — the PreviewBanner's sign-out lives inside the
 * banner div labelled "Preview environment".
 *
 * Spec: openspec/specs/preview-auth/spec.md (Visual preview banner).
 */
export async function PreviewBanner() {
  if (!isPreviewEnvironment()) return null;

  const requestHeaders = await headers();
  const email = requestHeaders.get("x-user-email");

  return (
    <div
      data-testid="preview-banner"
      className="flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900"
    >
      <span>
        <strong className="font-semibold">Preview environment</strong> — not production. Test
        data only.
      </span>
      <span className="flex items-center gap-3">
        {email && <span className="text-amber-800/80">{email}</span>}
        <form action="/preview-auth/sign-out" method="post">
          <button
            type="submit"
            className="rounded-md border border-amber-400 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50"
          >
            Sign out
          </button>
        </form>
      </span>
    </div>
  );
}
