/**
 * Compliance briefing entry point. The briefing is generated server-side
 * (the route resolves the user, fetches every project, and streams a
 * `.docx` attachment) — so the UI affordance is just a normal link with
 * `download` to trigger the browser's attachment handling.
 *
 * Not marked "use client" — it's a stateless link, safe to server-render.
 */
export function ExportComplianceLink() {
  return (
    <a
      href="/api/portfolios/exports/compliance-briefing"
      // The route already sends Content-Disposition: attachment, so the
      // `download` attribute here is a hint, not load-bearing.
      download
      className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
    >
      Compliance briefing
    </a>
  );
}
